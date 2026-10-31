import { VisualGrade } from '../contracts';

export interface GradingReceipt {
  modelId: string;
  visualGrade: VisualGrade;
  confidence: number;
  observations: {
    firmness: string;
    colorUniformity: string;
    skinIntegrity: string;
    estimatedShelfLifeHours: number;
    blemishPercentage: number;
  };
  description: string;
  reviewRequired: boolean;
  receiptStatus: 'Live' | 'Fixture';
  timestamp: string;
}

export async function gradeProduceImageWithAi(
  imageMimeType: string,
  imageBase64: string,
  suggestedProduce: string
): Promise<GradingReceipt> {
  // If running in browser or offline, fallback cleanly to standard fixture receipt
  try {
    const res = await fetch('/api/providers/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mimeType: imageMimeType,
        imageBase64,
        produce: suggestedProduce,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.data) {
        return data.data;
      }
    }
  } catch (err) {
    // Fall back to fixture provider
  }

  return getFixtureGradingReceipt(suggestedProduce);
}

export function getFixtureGradingReceipt(produce: string = 'tomato'): GradingReceipt {
  return {
    modelId: 'google-gemma-4-multan-vision',
    visualGrade: 'A',
    confidence: 0.96,
    observations: {
      firmness: 'Firm to touch, ideal turgor pressure',
      colorUniformity: '94% saturated red skin, no green shoulders',
      skinIntegrity: 'No mechanical damage or puncture wounds',
      estimatedShelfLifeHours: 96,
      blemishPercentage: 2.1,
    },
    description: `Farm-fresh ${produce} lot harvested at morning coolness. High pulp density and clean skin qualify this for Grade A premium corner store distribution.`,
    reviewRequired: false,
    receiptStatus: 'Fixture',
    timestamp: new Date().toISOString(),
  };
}
