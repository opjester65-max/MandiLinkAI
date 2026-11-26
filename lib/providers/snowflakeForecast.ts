import { ForecastBasis, ForecastResponse, ForecastRow, ProduceCode } from '../contracts';
import { sandboxRepository } from '../repositories/marketRepository';

interface CacheEntry {
  response: ForecastResponse;
  expiresAt: number;
}

const FORECAST_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export interface HistoricalPurchaseRecord {
  storeKey: string;
  produce: string;
  marketDate: string; // YYYY-MM-DD
  soldG: number;
  unfilledRequestG: number;
  observed: boolean;
}

export interface SupplyPlanRecord {
  storeKey: string;
  produce: string;
  marketDate: string;
  plannedG: number;
}

// Deterministic seed historical data matching Snowflake tables in snowflake/001_schema.sql
export const SEED_PURCHASE_HISTORY: HistoricalPurchaseRecord[] = [
  // 8 preceding matching Fridays for Gulgasht Corner Store (Target Friday: 2026-10-31)
  // All have daily demand = 38,000 g (38 kg)
  { storeKey: 'GULGASHT_STORE_001', produce: 'tomato', marketDate: '2026-09-05', soldG: 26000, unfilledRequestG: 12000, observed: true },
  { storeKey: 'GULGASHT_STORE_001', produce: 'tomato', marketDate: '2026-09-12', soldG: 28000, unfilledRequestG: 10000, observed: true },
  { storeKey: 'GULGASHT_STORE_001', produce: 'tomato', marketDate: '2026-09-19', soldG: 25000, unfilledRequestG: 13000, observed: true },
  { storeKey: 'GULGASHT_STORE_001', produce: 'tomato', marketDate: '2026-09-26', soldG: 30000, unfilledRequestG: 8000, observed: true },
  { storeKey: 'GULGASHT_STORE_001', produce: 'tomato', marketDate: '2026-10-03', soldG: 27000, unfilledRequestG: 11000, observed: true },
  { storeKey: 'GULGASHT_STORE_001', produce: 'tomato', marketDate: '2026-10-10', soldG: 29000, unfilledRequestG: 9000, observed: true },
  { storeKey: 'GULGASHT_STORE_001', produce: 'tomato', marketDate: '2026-10-17', soldG: 24000, unfilledRequestG: 14000, observed: true },
  { storeKey: 'GULGASHT_STORE_001', produce: 'tomato', marketDate: '2026-10-24', soldG: 31000, unfilledRequestG: 7000, observed: true },

  // Non-matching weekdays (Wednesdays & Thursdays) to verify ISO weekday filtering
  { storeKey: 'GULGASHT_STORE_001', produce: 'tomato', marketDate: '2026-10-22', soldG: 15000, unfilledRequestG: 2000, observed: true },
  { storeKey: 'GULGASHT_STORE_001', produce: 'tomato', marketDate: '2026-10-23', soldG: 18000, unfilledRequestG: 3000, observed: true },

  // Bohar Gate store history (5 observations for tomato)
  { storeKey: 'BOHAR_MART_002', produce: 'tomato', marketDate: '2026-09-26', soldG: 18000, unfilledRequestG: 4000, observed: true },
  { storeKey: 'BOHAR_MART_002', produce: 'tomato', marketDate: '2026-10-03', soldG: 19000, unfilledRequestG: 3000, observed: true },
  { storeKey: 'BOHAR_MART_002', produce: 'tomato', marketDate: '2026-10-10', soldG: 20000, unfilledRequestG: 2000, observed: true },
  { storeKey: 'BOHAR_MART_002', produce: 'tomato', marketDate: '2026-10-17', soldG: 18000, unfilledRequestG: 4000, observed: true },
  { storeKey: 'BOHAR_MART_002', produce: 'tomato', marketDate: '2026-10-24', soldG: 20000, unfilledRequestG: 3000, observed: true },
];

export const SEED_SUPPLY_PLANS: SupplyPlanRecord[] = [
  { storeKey: 'GULGASHT_STORE_001', produce: 'tomato', marketDate: '2026-10-31', plannedG: 14000 },
  { storeKey: 'BOHAR_MART_002', produce: 'tomato', marketDate: '2026-10-31', plannedG: 10000 },
  { storeKey: 'GULGASHT_STORE_001', produce: 'spinach', marketDate: '2026-10-31', plannedG: 8000 },
  { storeKey: 'GULGASHT_STORE_001', produce: 'guava', marketDate: '2026-10-31', plannedG: 12000 },
];

export const NEIGHBORHOOD_HOUSEHOLDS: Record<string, number> = {
  gulgasht: 8400,
  'shah-rukne-alam': 11200,
  'bohar-gate': 6300,
  'chenab-belt': 2100,
};

/**
 * Executes weekday deficit forecast conforming exactly to Snowflake Cortex Code logic
 */
export async function executeDeficitForecast(
  targetDateStr: string,
  produce: ProduceCode
): Promise<ForecastResponse> {
  const cacheKey = `${targetDateStr}_${produce}`;
  const now = Date.now();
  const cached = FORECAST_CACHE.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    // Return cached entry with cachedAt preserved, without relabeling as fresh
    return cached.response;
  }

  const queriedAt = new Date().toISOString();
  const targetDate = new Date(targetDateStr);
  const targetIsoDow = targetDate.getUTCDay() === 0 ? 7 : targetDate.getUTCDay();

  // Stores in scope
  const stores = [
    {
      storeKey: 'GULGASHT_STORE_001',
      neighborhoodKey: 'gulgasht',
      displayName: 'Gulgasht Corner Store',
    },
    {
      storeKey: 'BOHAR_MART_002',
      neighborhoodKey: 'bohar-gate',
      displayName: 'Bohar Gate Daily Mart',
    },
    {
      storeKey: 'NEW_STORE_NO_HISTORY_003',
      neighborhoodKey: 'gulgasht',
      displayName: 'Al-Madina Mini Mart (New Store)',
    },
  ];

  // Fetch current market trades from sandbox/memory to subtract MandiLink allocations
  const marketTrades = sandboxRepository.getMarketData(produce, targetDateStr).trades;

  const rows: ForecastRow[] = [];

  for (const store of stores) {
    // 1. Filter matching historical days: strictly before targetDate (no future leakage) & same ISO weekday
    const matchingHistorical = SEED_PURCHASE_HISTORY.filter((p) => {
      if (p.storeKey !== store.storeKey || p.produce !== produce || !p.observed) return false;
      const d = new Date(p.marketDate);
      const isoDow = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
      return p.marketDate < targetDateStr && isoDow === targetIsoDow;
    })
      .sort((a, b) => b.marketDate.localeCompare(a.marketDate))
      .slice(0, 8); // Previous eight matching weekdays

    let expectedG: number | null = null;
    let sampleN = matchingHistorical.length;
    let basis: ForecastBasis = 'insufficient_data';

    if (sampleN >= 3) {
      const sum = matchingHistorical.reduce((acc, curr) => acc + (curr.soldG + curr.unfilledRequestG), 0);
      expectedG = Math.round(sum / sampleN);
      basis = 'store_history';
    } else {
      // Fallback: pooled observed same-weekday demand in the same neighborhood
      const pooledMatching = SEED_PURCHASE_HISTORY.filter((p) => {
        if (p.produce !== produce || !p.observed) return false;
        const d = new Date(p.marketDate);
        const isoDow = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
        return p.marketDate < targetDateStr && isoDow === targetIsoDow;
      }).slice(0, 8);

      if (pooledMatching.length >= 3) {
        const pooledSum = pooledMatching.reduce((acc, curr) => acc + (curr.soldG + curr.unfilledRequestG), 0);
        expectedG = Math.round(pooledSum / pooledMatching.length);
        sampleN = pooledMatching.length;
        basis = 'neighborhood_pooled';
      } else {
        expectedG = null;
        basis = 'insufficient_data';
      }
    }

    // Planned supply from commercial drops (excludes MandiLink)
    const plan = SEED_SUPPLY_PLANS.find(
      (sp) => sp.storeKey === store.storeKey && sp.produce === produce && sp.marketDate === targetDateStr
    );
    const plannedG = plan ? plan.plannedG : null;

    // Baseline gap = max(expectedG - plannedG, 0)
    let baselineGapG: number | null = null;
    if (expectedG !== null && plannedG !== null) {
      baselineGapG = Math.max(0, expectedG - plannedG);
    }

    // Calculate MandiLink committed (agreed) & delivered allocations for this store, produce and date
    let committedG = 0;
    let deliveredG = 0;

    for (const trade of marketTrades) {
      // Gulgasht store check
      const isTargetStore =
        (store.storeKey === 'GULGASHT_STORE_001' && trade.storeId.includes('44444444')) ||
        trade.storeId === store.storeKey;

      if (isTargetStore && (trade.deliveryDate === targetDateStr || !trade.deliveryDate)) {
        const acceptedOffer = trade.acceptedOffer;
        const allocatedG = acceptedOffer ? acceptedOffer.qtyG : 0;
        if (trade.status === 'agreed') {
          committedG += allocatedG;
        } else if (trade.status === 'delivered') {
          deliveredG += allocatedG;
        }
      }
    }

    // Remaining gap = max(baselineGapG - committedG - deliveredG, 0)
    let remainingGapG: number | null = null;
    if (baselineGapG !== null) {
      remainingGapG = Math.max(0, baselineGapG - committedG - deliveredG);
    }

    const households = NEIGHBORHOOD_HOUSEHOLDS[store.neighborhoodKey] || null;
    let kgGapPer1000Households: number | null = null;
    if (households && baselineGapG !== null) {
      kgGapPer1000Households = Math.round(((baselineGapG / 1000) / (households / 1000)) * 100) / 100;
    }

    rows.push({
      storeKey: store.storeKey,
      neighborhoodKey: store.neighborhoodKey,
      displayName: store.displayName,
      expectedG,
      plannedG,
      baselineGapG,
      committedG,
      deliveredG,
      remainingGapG,
      sampleN,
      basis,
      households,
      kgGapPer1000Households,
      dataClass: 'SYNTHETIC_DATA',
    });
  }

  const response: ForecastResponse = {
    rows,
    queryId: `sim-sf-cortex-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    queriedAt,
    cachedAt: null,
    sourceClassification: 'Simulated (Snowflake SQL Model & Synthetic Data)',
  };

  // Cache for TTL
  FORECAST_CACHE.set(cacheKey, {
    response: { ...response, cachedAt: queriedAt },
    expiresAt: now + CACHE_TTL_MS,
  });

  return response;
}
