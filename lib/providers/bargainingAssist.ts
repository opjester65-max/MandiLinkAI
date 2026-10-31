import { AssistIntent, AssistRequest, AssistResponse, Listing, Trade, calculateTotalPaisa } from '../contracts';

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
  // Extract kg: e.g. "20 kg", "20kg", "20 kilos"
  const kgMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilos|kilogram|کلو)/i);
  // Extract price: e.g. "110 per kg", "PKR 110", "110/kg", "110 روپے"
  const priceMatch = text.match(/(?:pkr|rs|روپے)?\s*(\d+(?:\.\d+)?)\s*(?:\/|\s*per|\s*فی)?\s*(?:kg|kilo|کلو)?/i);

  if (kgMatch) {
    const parsedKg = parseFloat(kgMatch[1]);
    const qtyG = Math.round(parsedKg * 1000);
    if (qtyG <= 0 || qtyG > availableG) {
      return null;
    }

    // Try extracting price from secondary numbers
    const numbers = text.match(/\b\d+\b/g);
    let pricePaisaKg = 11000; // Default PKR 110/kg
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

export async function generateBargainingAssistance(
  req: AssistRequest,
  context: AssistContext
): Promise<AssistResponse> {
  const { intent, locale, instruction } = req;
  const { listing, role, recentMessages } = context;

  // Sanitize instruction: treat as untrusted input
  const cleanInstruction = instruction.slice(0, 300).replace(/[<>{}]/g, '');

  const availableKg = listing.availableG / 1000;
  const askPkrKg = listing.askPaisaKg / 100;

  // Attempt to extract structured offer terms
  const extracted = extractOfferTermsFromText(cleanInstruction, listing.availableG);

  let draftText = '';
  const modelId = process.env.GEMMA_MODEL || 'gemma-4-26b-a4b-it';

  const isUrdu = locale === 'ur-PK';

  if (intent === 'counter' || extracted) {
    const offerKg = extracted ? extracted.qtyG / 1000 : 20;
    const offerPkr = extracted ? extracted.pricePaisaKg / 100 : 110;

    if (isUrdu) {
      draftText = `سلام! میں ${offerKg} کلو ٹماٹر فی کلو ${offerPkr} روپے کے حساب سے خریدنے کی پیشکش کرتا ہوں۔`;
    } else {
      draftText = `Salam! Proposing counter-terms: ${offerKg} kg of Grade A ${listing.produce} at PKR ${offerPkr}/kg for scheduled pickup.`;
    }
  } else if (intent === 'explain') {
    if (isUrdu) {
      draftText = `اس لاٹ کی کل مقدار ${availableKg} کلو ہے، اور ریٹیل کے لیے گریڈ A معیار تصدیق شدہ ہے۔`;
    } else {
      draftText = `This lot has ${availableKg} kg available harvested at morning coolness with verified Grade A firmness. Commercial ask is PKR ${askPkrKg}/kg.`;
    }
  } else {
    // Draft greeting / inquiry
    if (isUrdu) {
      draftText = `سلام! کیا ہم آج کی ڈلیوری کے لیے مقدار اور مناسب قیمت طے کر سکتے ہیں؟`;
    } else {
      draftText = `Salam! Ready to coordinate today's harvest allocation for corner store stocking. What quantity do you need?`;
    }
  }

  return {
    draftText,
    suggestedOffer: extracted,
    modelId,
    requiresApproval: true,
  };
}
