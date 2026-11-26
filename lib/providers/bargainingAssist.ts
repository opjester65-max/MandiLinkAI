import { GoogleGenAI, Type } from '@google/genai';
import { AssistRequest, AssistResponse, Listing, TokenUsage, Trade } from '../contracts';
import { getUsableGeminiApiKey, markGeminiFailure } from './geminiKey';
import { GEMINI_MODEL_ID, buildBargainingPrompt } from './aiSpecs';

export interface AssistContext {
  trade: Trade;
  listing: Listing;
  role: 'buyer' | 'grower';
  recentMessages: { senderRole?: string; body: string }[];
}

/**
 * Parses structured quantity (kg) and price (PKR/kg) from natural language instructions
 */
function extractOfferTermsFromText(text: string, availableG: number): { qtyG: number; pricePaisaKg: number } | null {
  const kgMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilos|kilogram|کلو)/i);
  if (kgMatch) {
    const parsedKg = parseFloat(kgMatch[1]);
    const qtyG = Math.round(parsedKg * 1000);
    if (qtyG <= 0 || qtyG > availableG) {
      return null;
    }

    const numbers = text.match(/\b\d+\b/g);
    let pricePaisaKg = 11000;
    if (numbers && numbers.length >= 2) {
      const candidatePrice = parseInt(numbers[1], 10);
      if (candidatePrice > 0 && candidatePrice < 2000) {
        pricePaisaKg = candidatePrice * 100;
      }
    }

    return { qtyG, pricePaisaKg };
  }

  return null;
}

function buildSmartFallbackAssistance(
  req: AssistRequest,
  context: AssistContext,
  startTime: number
): AssistResponse {
  const { intent, locale, instruction } = req;
  const { listing } = context;

  const cleanInstruction = instruction.slice(0, 300).replace(/[<>{}]/g, '');
  const availableKg = Math.round((listing.availableG / 1000) * 10) / 10;
  const askPkrKg = Math.round(listing.askPaisaKg / 100);
  const extracted = extractOfferTermsFromText(cleanInstruction, listing.availableG);

  const defaultCounterKg = Math.min(20, Math.max(5, Math.floor(availableKg)));
  const defaultCounterPkr = Math.max(50, askPkrKg - 10);

  const offerKg = extracted ? extracted.qtyG / 1000 : defaultCounterKg;
  const offerPkr = extracted ? extracted.pricePaisaKg / 100 : defaultCounterPkr;
  const isUrdu = locale === 'ur-PK' || /urdu|اردو/i.test(cleanInstruction);
  const isExplainShortage = intent === 'explain' || /shortage|deficit|math/i.test(cleanInstruction);

  let draftText = '';
  let suggestedOffer: { qtyG: number; pricePaisaKg: number } | null = extracted;

  if (isExplainShortage) {
    const deficitKg = 24;
    const pctCovered = Math.min(100, Math.round((offerKg / deficitKg) * 100));
    const remainingDeficit = Math.max(0, deficitKg - offerKg);
    if (isUrdu) {
      draftText = `مارکیٹ کا حساب: گلگشت اسٹور پر جمعہ کو 24 کلو کی کمی ہے (38 کلو طلب منفی 14 کلو سپلائی)۔ ${offerKg} کلو لاٹ سے ${pctCovered}% کمی پوری ہو جائے گی اور صرف ${remainingDeficit} کلو باقی رہ جائے گا۔`;
    } else {
      draftText = `Shortage Math: Gulgasht Corner Store projects a 24 kg Friday deficit (38 kg expected demand minus 14 kg commercial drop). Securing ${offerKg} kg at PKR ${offerPkr}/kg covers ${pctCovered}% of the shortfall immediately, leaving only ${remainingDeficit} kg unmet while preserving ${Math.max(0, availableKg - offerKg)} kg for nearby shops.`;
    }
    suggestedOffer = null;
  } else if (intent === 'counter' || extracted) {
    suggestedOffer = {
      qtyG: Math.round(offerKg * 1000),
      pricePaisaKg: Math.round(offerPaisaKgValue(offerPkr)),
    };
    if (isUrdu) {
      draftText = `السلام علیکم! منڈی کے آج کے نرخ اور صبح کی تازہ فصل کو مدنظر رکھتے ہوئے، ہم ${offerKg} کلو ${listing.produce === 'tomato' ? 'ٹماٹر' : listing.produce === 'spinach' ? 'پالک' : 'امرود'} فی کلو ${offerPkr} روپے میں لینے کی باہمی پیشکش کر رہے ہیں تاکہ دکان اور کاشتکار دونوں کا منافع برقرار رہے۔`;
    } else {
      draftText = `Salam! Proposing a fair market counteroffer: ${offerKg} kg of ${listing.produce} at PKR ${offerPkr}/kg (total PKR ${(offerKg * offerPkr).toLocaleString()}). This saves ~8% versus wholesale split delivery while guaranteeing Bibi Fatima fast single-drop cash settlement.`;
    }
  } else {
    if (isUrdu) {
      draftText = `السلام علیکم! آج کی تازہ سپلائی میں ${availableKg} کلو مقدار دستیاب ہے، ریٹ PKR ${askPkrKg}/kg ہے۔ براہ کرم مناسب مقدار بتائیں۔`;
    } else {
      draftText = `Salam! ${availableKg} kg of morning-harvested ${listing.produce} is ready for direct Multan pickup at PKR ${askPkrKg}/kg. Let us confirm your store quantity.`;
    }
    suggestedOffer = null;
  }

  return {
    draftText,
    suggestedOffer,
    modelId: GEMINI_MODEL_ID,
    executionMode: 'Simulated (No API Key)',
    latencyMs: Math.max(1, Date.now() - startTime),
    tokenUsage: null,
    requiresApproval: true,
  };
}

function offerPaisaKgValue(pkr: number): number {
  return Math.round(pkr * 100);
}

export async function generateBargainingAssistance(
  req: AssistRequest,
  context: AssistContext
): Promise<AssistResponse> {
  const startTime = Date.now();
  const { intent, locale, instruction } = req;
  const { listing, role, recentMessages } = context;

  const cleanInstruction = instruction.slice(0, 300).replace(/[<>{}]/g, '');
  const availableKg = listing.availableG / 1000;
  const askPkrKg = listing.askPaisaKg / 100;
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

      const prompt = buildBargainingPrompt({
        role,
        produce: listing.produce,
        availableKg,
        askPkrKg,
        intent,
        locale,
        recentConversation: recentMessages
          .map((m) => `${m.senderRole || 'user'}: ${m.body}`)
          .join(' | '),
        cleanInstruction,
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
                draftText: { type: Type.STRING },
                includeSuggestedOffer: { type: Type.BOOLEAN },
                qtyKg: { type: Type.NUMBER },
                pricePkrKg: { type: Type.INTEGER },
              },
              required: ['draftText', 'includeSuggestedOffer', 'qtyKg', 'pricePkrKg'],
            },
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini assist timeout')), 9000)
        ),
      ]);

      const raw = (response.text ?? '').trim();
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.draftText === 'string' && parsed.draftText.trim()) {
          const qtyG =
            parsed.includeSuggestedOffer && typeof parsed.qtyKg === 'number'
              ? Math.min(listing.availableG, Math.max(1000, Math.round(parsed.qtyKg * 1000)))
              : null;
          const pricePaisaKg =
            parsed.includeSuggestedOffer && typeof parsed.pricePkrKg === 'number' && parsed.pricePkrKg > 0
              ? Math.round(parsed.pricePkrKg * 100)
              : null;

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
            draftText: parsed.draftText.trim(),
            suggestedOffer: qtyG && pricePaisaKg ? { qtyG, pricePaisaKg } : null,
            modelId: (response as any).modelVersion || modelId,
            executionMode: 'Live Gemini API',
            latencyMs: Math.max(1, Date.now() - startTime),
            tokenUsage,
            requiresApproval: true,
          };
        }
      }
    } catch (err: unknown) {
      markGeminiFailure(apiKey, err);
    }
  }

  return buildSmartFallbackAssistance(req, context, startTime);
}
