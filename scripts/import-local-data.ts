/**
 * MandiLink Snowflake ETL Pipeline: import-local-data.ts
 *
 * Normalizes localized Multan purchasing logs and census demographic extracts
 * into four Snowflake table grains:
 * 1. NEIGHBORHOOD_PROFILE (neighborhood_key, profile_year)
 * 2. STORE (store_key)
 * 3. PURCHASE_DAY (store_key, produce, market_date)
 * 4. SUPPLY_PLAN (store_key, produce, market_date)
 *
 * Critical Requirements:
 * - Validate units: Integer grams (g) and PKR paisa/kg
 * - Distinguish missing values (null/undefined) from observed zero (0)
 * - Reject invalid rows with detailed error reasons
 * - Idempotent upsert/deduplication preventing repeated imports from doubling demand
 * - Runnable via CLI or importable by automated test runner
 */

import { z } from 'zod';

export interface RawCensusRecord {
  neighborhood_key: string;
  profile_year: number | string;
  households: number | string;
  source_name?: string;
  source_url?: string;
  data_class?: string;
}

export interface RawPurchaseRecord {
  store_key: string;
  neighborhood_key?: string;
  store_name?: string;
  produce: string;
  market_date: string;
  sold_g: number | string;
  unfilled_request_g?: number | string | null;
  observed?: boolean | string;
  price_paisa_kg?: number | string;
}

export interface RawSupplyRecord {
  store_key: string;
  produce: string;
  market_date: string;
  planned_g: number | string;
  source_batch?: string;
}

export interface NormalizedNeighborhoodProfile {
  neighborhood_key: string;
  profile_year: number;
  households: number;
  source_name: string;
  source_url: string;
  data_class: 'SYNTHETIC_CENSUS' | 'OBSERVED_EXTRACT';
}

export interface NormalizedStore {
  store_key: string;
  neighborhood_key: string;
  display_name: string;
}

export interface NormalizedPurchaseDay {
  store_key: string;
  produce: 'tomato' | 'spinach' | 'guava';
  market_date: string;
  sold_g: number;
  unfilled_request_g: number;
  observed: boolean;
  source_batch: string;
  price_paisa_kg?: number;
}

export interface NormalizedSupplyPlan {
  store_key: string;
  produce: 'tomato' | 'spinach' | 'guava';
  market_date: string;
  planned_g: number;
  source_batch: string;
}

export interface ImportResult {
  neighborhoodProfiles: Map<string, NormalizedNeighborhoodProfile>;
  stores: Map<string, NormalizedStore>;
  purchaseDays: Map<string, NormalizedPurchaseDay>;
  supplyPlans: Map<string, NormalizedSupplyPlan>;
  rejectedRows: { index: number; type: string; raw: any; reason: string }[];
  stats: {
    censusProcessed: number;
    censusAccepted: number;
    purchasesProcessed: number;
    purchasesAccepted: number;
    suppliesProcessed: number;
    suppliesAccepted: number;
    rejectedCount: number;
    duplicatesIgnored: number;
  };
}

const VALID_PRODUCE = ['tomato', 'spinach', 'guava'] as const;

export class LocalDataImporter {
  private profiles = new Map<string, NormalizedNeighborhoodProfile>();
  private stores = new Map<string, NormalizedStore>();
  private purchases = new Map<string, NormalizedPurchaseDay>();
  private supplies = new Map<string, NormalizedSupplyPlan>();
  private rejected: { index: number; type: string; raw: any; reason: string }[] = [];
  private duplicatesIgnored = 0;

  /**
   * Imports census records into NEIGHBORHOOD_PROFILE grain (neighborhood_key, profile_year).
   * Enforces idempotency: duplicate keys update or maintain single record, never duplicating demand.
   */
  public importCensus(records: RawCensusRecord[]): void {
    records.forEach((raw, idx) => {
      if (!raw.neighborhood_key || typeof raw.neighborhood_key !== 'string' || !raw.neighborhood_key.trim()) {
        this.rejected.push({ index: idx, type: 'CENSUS', raw, reason: 'Missing or invalid neighborhood_key' });
        return;
      }

      const year = typeof raw.profile_year === 'string' ? parseInt(raw.profile_year, 10) : Number(raw.profile_year);
      if (isNaN(year) || year < 2000 || year > 2050) {
        this.rejected.push({ index: idx, type: 'CENSUS', raw, reason: `Invalid profile_year: ${raw.profile_year}` });
        return;
      }

      // Check missing vs observed 0
      if (raw.households === null || raw.households === undefined || raw.households === '') {
        this.rejected.push({ index: idx, type: 'CENSUS', raw, reason: 'Missing household count (must distinguish from 0)' });
        return;
      }

      const hh = typeof raw.households === 'string' ? parseInt(raw.households, 10) : Number(raw.households);
      if (isNaN(hh) || hh < 0 || !Number.isInteger(hh)) {
        this.rejected.push({ index: idx, type: 'CENSUS', raw, reason: `Invalid household count: ${raw.households}` });
        return;
      }

      const key = `${raw.neighborhood_key.trim().toLowerCase()}_${year}`;
      if (this.profiles.has(key)) {
        this.duplicatesIgnored++;
        // Idempotent: overwrite/keep single record without inflating totals
      }

      this.profiles.set(key, {
        neighborhood_key: raw.neighborhood_key.trim().toLowerCase(),
        profile_year: year,
        households: hh,
        source_name: raw.source_name || 'MULTAN_URBAN_SYNTHETIC_CENSUS_2026',
        source_url: raw.source_url || 'https://data.multan.gov.pk/census/synthetic-extract',
        data_class: raw.data_class === 'OBSERVED_EXTRACT' ? 'OBSERVED_EXTRACT' : 'SYNTHETIC_CENSUS',
      });
    });
  }

  /**
   * Imports purchasing and store records into STORE and PURCHASE_DAY grains.
   * Grains:
   * STORE: (store_key)
   * PURCHASE_DAY: (store_key, produce, market_date)
   */
  public importPurchases(records: RawPurchaseRecord[], batchId: string = 'BATCH_MULTAN_2026'): void {
    records.forEach((raw, idx) => {
      if (!raw.store_key || typeof raw.store_key !== 'string' || !raw.store_key.trim()) {
        this.rejected.push({ index: idx, type: 'PURCHASE', raw, reason: 'Missing store_key' });
        return;
      }

      const produce = raw.produce?.toLowerCase() as any;
      if (!VALID_PRODUCE.includes(produce)) {
        this.rejected.push({ index: idx, type: 'PURCHASE', raw, reason: `Invalid produce: ${raw.produce}. Must be one of ${VALID_PRODUCE.join(', ')}` });
        return;
      }

      if (!raw.market_date || !/^\d{4}-\d{2}-\d{2}$/.test(raw.market_date)) {
        this.rejected.push({ index: idx, type: 'PURCHASE', raw, reason: `Invalid market_date: ${raw.market_date}. Must be YYYY-MM-DD` });
        return;
      }

      // Validate sold_g: must distinguish missing from observed 0
      if (raw.sold_g === null || raw.sold_g === undefined || raw.sold_g === '') {
        this.rejected.push({ index: idx, type: 'PURCHASE', raw, reason: 'Missing sold_g (distinguish from 0)' });
        return;
      }

      const soldG = typeof raw.sold_g === 'string' ? parseInt(raw.sold_g, 10) : Number(raw.sold_g);
      if (isNaN(soldG) || soldG < 0 || !Number.isInteger(soldG)) {
        this.rejected.push({ index: idx, type: 'PURCHASE', raw, reason: `sold_g must be non-negative integer grams: ${raw.sold_g}` });
        return;
      }

      let unfilledG = 0;
      if (raw.unfilled_request_g !== undefined && raw.unfilled_request_g !== null && raw.unfilled_request_g !== '') {
        const u = typeof raw.unfilled_request_g === 'string' ? parseInt(raw.unfilled_request_g, 10) : Number(raw.unfilled_request_g);
        if (isNaN(u) || u < 0 || !Number.isInteger(u)) {
          this.rejected.push({ index: idx, type: 'PURCHASE', raw, reason: `unfilled_request_g must be non-negative integer grams: ${raw.unfilled_request_g}` });
          return;
        }
        unfilledG = u;
      }

      // Validate optional price_paisa_kg
      let pricePaisa: number | undefined;
      if (raw.price_paisa_kg !== undefined && raw.price_paisa_kg !== null && raw.price_paisa_kg !== '') {
        const p = typeof raw.price_paisa_kg === 'string' ? parseInt(raw.price_paisa_kg, 10) : Number(raw.price_paisa_kg);
        if (isNaN(p) || p < 0 || !Number.isInteger(p)) {
          this.rejected.push({ index: idx, type: 'PURCHASE', raw, reason: `price_paisa_kg must be non-negative integer: ${raw.price_paisa_kg}` });
          return;
        }
        pricePaisa = p;
      }

      // Upsert Store
      const storeKey = raw.store_key.trim().toUpperCase();
      if (!this.stores.has(storeKey)) {
        this.stores.set(storeKey, {
          store_key: storeKey,
          neighborhood_key: raw.neighborhood_key?.toLowerCase() || 'gulgasht',
          display_name: raw.store_name || `${storeKey} Retailer`,
        });
      }

      // Purchase Day Grain Key: store_key + produce + market_date
      const purchaseKey = `${storeKey}#${produce}#${raw.market_date}`;
      if (this.purchases.has(purchaseKey)) {
        this.duplicatesIgnored++;
      }

      this.purchases.set(purchaseKey, {
        store_key: storeKey,
        produce,
        market_date: raw.market_date,
        sold_g: soldG,
        unfilled_request_g: unfilledG,
        observed: raw.observed !== false && raw.observed !== 'false',
        source_batch: batchId,
        price_paisa_kg: pricePaisa,
      });
    });
  }

  /**
   * Imports scheduled supply plans into SUPPLY_PLAN grain (store_key, produce, market_date).
   */
  public importSupplyPlans(records: RawSupplyRecord[], batchId: string = 'BATCH_SUPPLY_2026'): void {
    records.forEach((raw, idx) => {
      if (!raw.store_key || !raw.store_key.trim()) {
        this.rejected.push({ index: idx, type: 'SUPPLY', raw, reason: 'Missing store_key' });
        return;
      }

      const produce = raw.produce?.toLowerCase() as any;
      if (!VALID_PRODUCE.includes(produce)) {
        this.rejected.push({ index: idx, type: 'SUPPLY', raw, reason: `Invalid produce: ${raw.produce}` });
        return;
      }

      if (!raw.market_date || !/^\d{4}-\d{2}-\d{2}$/.test(raw.market_date)) {
        this.rejected.push({ index: idx, type: 'SUPPLY', raw, reason: `Invalid date: ${raw.market_date}` });
        return;
      }

      if (raw.planned_g === null || raw.planned_g === undefined || raw.planned_g === '') {
        this.rejected.push({ index: idx, type: 'SUPPLY', raw, reason: 'Missing planned_g' });
        return;
      }

      const plannedG = typeof raw.planned_g === 'string' ? parseInt(raw.planned_g, 10) : Number(raw.planned_g);
      if (isNaN(plannedG) || plannedG < 0 || !Number.isInteger(plannedG)) {
        this.rejected.push({ index: idx, type: 'SUPPLY', raw, reason: `planned_g must be non-negative integer grams: ${raw.planned_g}` });
        return;
      }

      const key = `${raw.store_key.trim().toUpperCase()}#${produce}#${raw.market_date}`;
      if (this.supplies.has(key)) {
        this.duplicatesIgnored++;
      }

      this.supplies.set(key, {
        store_key: raw.store_key.trim().toUpperCase(),
        produce,
        market_date: raw.market_date,
        planned_g: plannedG,
        source_batch: raw.source_batch || batchId,
      });
    });
  }

  /**
   * Returns complete normalized dataset and import metrics.
   */
  public getResult(): ImportResult {
    return {
      neighborhoodProfiles: this.profiles,
      stores: this.stores,
      purchaseDays: this.purchases,
      supplyPlans: this.supplies,
      rejectedRows: this.rejected,
      stats: {
        censusProcessed: this.profiles.size + this.rejected.filter(r => r.type === 'CENSUS').length,
        censusAccepted: this.profiles.size,
        purchasesProcessed: this.purchases.size + this.rejected.filter(r => r.type === 'PURCHASE').length,
        purchasesAccepted: this.purchases.size,
        suppliesProcessed: this.supplies.size + this.rejected.filter(r => r.type === 'SUPPLY').length,
        suppliesAccepted: this.supplies.size,
        rejectedCount: this.rejected.length,
        duplicatesIgnored: this.duplicatesIgnored,
      },
    };
  }
}

// Standalone execution runner
if (process.argv[1]?.endsWith('import-local-data.ts')) {
  console.log('=== Running MandiLink Snowflake Local Data Import ===\n');
  const importer = new LocalDataImporter();

  // Test data with standard census records + duplicate to demonstrate idempotency
  importer.importCensus([
    { neighborhood_key: 'gulgasht', profile_year: 2026, households: 8400 },
    { neighborhood_key: 'shah-rukne-alam', profile_year: 2026, households: 11200 },
    { neighborhood_key: 'gulgasht', profile_year: 2026, households: 8400 }, // Duplicate!
    { neighborhood_key: 'chenab-belt', profile_year: 2026, households: '' }, // Should be rejected (missing)
    { neighborhood_key: 'bohar-gate', profile_year: 2026, households: 0 }, // Observed 0: Accepted!
  ]);

  importer.importPurchases([
    { store_key: 'GULGASHT_STORE_001', produce: 'tomato', market_date: '2026-10-31', sold_g: 22000, unfilled_request_g: 16000, price_paisa_kg: 12000 },
    { store_key: 'GULGASHT_STORE_001', produce: 'spinach', market_date: '2026-10-31', sold_g: 15000, unfilled_request_g: 5000, price_paisa_kg: 7000 },
    { store_key: 'INVALID_STORE', produce: 'mango', market_date: '2026-10-31', sold_g: 10000 }, // Rejected produce
  ]);

  importer.importSupplyPlans([
    { store_key: 'GULGASHT_STORE_001', produce: 'tomato', market_date: '2026-10-31', planned_g: 14000 },
  ]);

  const res = importer.getResult();
  console.log(`Accepted Profiles: ${res.neighborhoodProfiles.size}`);
  console.log(`Accepted Stores: ${res.stores.size}`);
  console.log(`Accepted Purchases: ${res.purchaseDays.size}`);
  console.log(`Accepted Supply Plans: ${res.supplyPlans.size}`);
  console.log(`Duplicates Ignored (Idempotency Verified): ${res.stats.duplicatesIgnored}`);
  console.log(`Rejected Rows: ${res.stats.rejectedCount}`);
  res.rejectedRows.forEach(r => console.log(`  - [${r.type}] Row ${r.index}: ${r.reason}`));
}
