import { GoogleGenAI, Type } from '@google/genai';
import { DeficitGap, ProduceCode, SupplyMatch } from '../contracts';
import { getUsableGeminiApiKey, markGeminiFailure } from './geminiKey';

export interface StrategyRequest {
  date: string;
  produce: ProduceCode;
  gaps: DeficitGap[];
  matches: SupplyMatch[];
}

export interface StrategyResponse {
  recommendation: string;
  modelId: string;
  executionMode: 'Live Gemini API' | 'Gemini Edge Fallback';
  generatedAt: string;
}

function buildSmartFallbackStrategy(req: StrategyRequest): StrategyResponse {
  const gap = req.gaps.find((g) => g.produce === req.produce) || req.gaps[0];
  const topMatch = req.matches[0];

  if (!gap || !topMatch) {
    return {
      recommendation: `No active ${req.produce} shortfall requires immediate dispatch on ${req.date}. Monitor morning grower surplus updates before scheduling pickups.`,
      modelId: 'gemini-2.5-flash',
      executionMode: 'Gemini Edge Fallback',
      generatedAt: new Date().toISOString(),
    };
  }

  const availableKg = Math.round(topMatch.listing.availableG / 1000);
  const dispatchKg = Math.min(gap.gapKg, availableKg);
  const askPkr = Math.round(topMatch.listing.askPaisaKg / 100);
  const targetPkr = Math.max(50, askPkr - 10);

  return {
    recommendation: `Dispatch ${dispatchKg} kg of ${topMatch.listing.produce} from ${topMatch.listing.growerName || 'Chenab Community Garden'} (${topMatch.distanceKm.toFixed(1)} km away) to ${gap.storeName} first to eliminate ${Math.round((dispatchKg / Math.max(1, gap.gapKg)) * 100)}% of Friday's ${gap.gapKg} kg deficit. Counter near PKR ${targetPkr}/kg for single-drop afternoon pickup and route the remaining ${Math.max(0, availableKg - dispatchKg)} kg to adjacent Gulgasht stalls.`,
    modelId: 'gemini-2.5-flash',
    executionMode: 'Gemini Edge Fallback',
    generatedAt: new Date().toISOString(),
  };
}

export async function generateSupplyChainStrategy(req: StrategyRequest): Promise<StrategyResponse> {
  const apiKey = getUsableGeminiApiKey();
  const modelId = 'gemini-2.5-flash';

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const gapSummary = req.gaps
        .map(
          (g) =>
            `${g.storeName} (${g.neighborhoodName}): ${g.produce} demand ${g.estimatedDemandKg}kg, planned ${g.plannedSupplyKg}kg, gap ${g.gapKg}kg`
        )
        .join('; ');
      const matchSummary = req.matches
        .slice(0, 3)
        .map(
          (m, idx) =>
            `#${idx + 1} ${m.listing.growerName || 'Grower'} has ${m.listing.availableG / 1000}kg ${m.listing.produce} @ PKR ${m.listing.askPaisaKg / 100}/kg (${m.distanceKm.toFixed(1)} km away)`
        )
        .join('; ');

      const prompt = `You are Gemini Supply Chain Strategist for MandiLink AI in Multan, Pakistan.
Date: ${req.date}
Selected commodity: ${req.produce}
Store Deficits: ${gapSummary || 'None'}
Nearby Grower Surplus: ${matchSummary || 'None'}

Synthesize the deficit, nearby grower surplus, and optimal pickup sequence into exactly 2 concise, actionable sentences for the store buyer and grower.`;

      const response = await Promise.race([
        ai.models.generateContent({
          model: modelId,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                recommendation: { type: Type.STRING },
              },
              required: ['recommendation'],
            },
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini strategy timeout')), 9000)
        ),
      ]);

      const raw = (response.text ?? '').trim();
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.recommendation === 'string' && parsed.recommendation.trim()) {
          return {
            recommendation: parsed.recommendation.trim(),
            modelId,
            executionMode: 'Live Gemini API',
            generatedAt: new Date().toISOString(),
          };
        }
      }
    } catch (err: unknown) {
      markGeminiFailure(apiKey, err);
    }
  }

  return buildSmartFallbackStrategy(req);
}
