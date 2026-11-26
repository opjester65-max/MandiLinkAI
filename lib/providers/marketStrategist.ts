import { GoogleGenAI, Type } from '@google/genai';
import { DeficitGap, ExecutionMode, ProduceCode, SupplyMatch, TokenUsage } from '../contracts';
import { getUsableGeminiApiKey, markGeminiFailure } from './geminiKey';
import { GEMINI_MODEL_ID, buildStrategistPrompt } from './aiSpecs';

export interface StrategyRequest {
  date: string;
  produce: ProduceCode;
  gaps: DeficitGap[];
  matches: SupplyMatch[];
}

export interface StrategyResponse {
  recommendation: string;
  modelId: string;
  executionMode: ExecutionMode;
  latencyMs: number;
  tokenUsage: TokenUsage | null;
  generatedAt: string;
}

function buildSmartFallbackStrategy(req: StrategyRequest, startTime: number): StrategyResponse {
  const gap = req.gaps.find((g) => g.produce === req.produce) || req.gaps[0];
  const topMatch = req.matches.find((m) => m && m.listing && typeof m.listing.availableG === 'number');

  if (!gap || !topMatch) {
    return {
      recommendation: `No active ${req.produce} shortfall requires immediate dispatch on ${req.date}. Monitor morning grower surplus updates before scheduling pickups.`,
      modelId: GEMINI_MODEL_ID,
      executionMode: 'Simulated (No API Key)',
      latencyMs: Math.max(1, Date.now() - startTime),
      tokenUsage: null,
      generatedAt: new Date().toISOString(),
    };
  }

  const availableKg = Math.round(topMatch.listing.availableG / 1000);
  const dispatchKg = Math.min(gap.gapKg, availableKg);
  const askPkr = Math.round(topMatch.listing.askPaisaKg / 100);
  const targetPkr = Math.max(50, askPkr - 10);

  return {
    recommendation: `Dispatch ${dispatchKg} kg of ${topMatch.listing.produce} from ${topMatch.listing.growerName || 'Bibi Fatima · Chenab Community Garden'} (${topMatch.distanceKm.toFixed(1)} km away) to ${gap.storeName} first to eliminate ${Math.round((dispatchKg / Math.max(1, gap.gapKg)) * 100)}% of Friday's ${gap.gapKg} kg deficit. Counter near PKR ${targetPkr}/kg for single-drop afternoon pickup and route the remaining ${Math.max(0, availableKg - dispatchKg)} kg to adjacent Gulgasht stalls.`,
    modelId: GEMINI_MODEL_ID,
    executionMode: 'Simulated (No API Key)',
    latencyMs: Math.max(1, Date.now() - startTime),
    tokenUsage: null,
    generatedAt: new Date().toISOString(),
  };
}

export async function generateSupplyChainStrategy(req: StrategyRequest): Promise<StrategyResponse> {
  const startTime = Date.now();
  const apiKey = getUsableGeminiApiKey();
  const modelId = GEMINI_MODEL_ID;

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
            `#${idx + 1} ${m.listing.growerName || 'Bibi Fatima'} has ${m.listing.availableG / 1000}kg ${m.listing.produce} @ PKR ${m.listing.askPaisaKg / 100}/kg (${m.distanceKm.toFixed(1)} km away)`
        )
        .join('; ');

      const prompt = buildStrategistPrompt({
        date: req.date,
        produce: req.produce,
        gapSummary,
        matchSummary,
      });

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
          const usage = (response as any).usageMetadata;
          const tokenUsage: TokenUsage | null = usage
            ? {
                promptTokens: usage.promptTokenCount ?? 0,
                outputTokens: usage.candidatesTokenCount ?? 0,
                totalTokens:
                  usage.totalTokenCount ?? (usage.promptTokenCount ?? 0) + (usage.candidatesTokenCount ?? 0),
              }
            : null;
          return {
            recommendation: parsed.recommendation.trim(),
            modelId: (response as any).modelVersion || modelId,
            executionMode: 'Live Gemini API',
            latencyMs: Math.max(1, Date.now() - startTime),
            tokenUsage,
            generatedAt: new Date().toISOString(),
          };
        }
      }
    } catch (err: unknown) {
      markGeminiFailure(apiKey, err);
    }
  }

  return buildSmartFallbackStrategy(req, startTime);
}
