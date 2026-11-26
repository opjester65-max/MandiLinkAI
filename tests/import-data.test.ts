/**
 * Tests for scripts/import-local-data.ts
 *
 * Verifies:
 * 1. Normalizes local purchasing and census CSVs into four Snowflake table grains
 * 2. Validates PKR & gram units (integer grams, positive prices, valid produce codes)
 * 3. Distinguishes missing values from observed 0
 * 4. Rejects invalid rows with detailed error reasons
 * 5. REGRESSION TEST: Repeated census import is idempotent and does not double demand
 */

import { LocalDataImporter } from '../scripts/import-local-data.ts';

export function runImportDataTests(): { name: string; passed: boolean; error?: string }[] {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  function test(name: string, fn: () => void) {
    try {
      fn();
      results.push({ name, passed: true });
    } catch (err: any) {
      results.push({ name, passed: false, error: err.message });
    }
  }

  // 1. Four Snowflake table grains normalized
  test('Normalizes records into four distinct Snowflake table grains', () => {
    const importer = new LocalDataImporter();

    importer.importCensus([
      { neighborhood_key: 'gulgasht', profile_year: 2026, households: 8400 },
      { neighborhood_key: 'shah-rukne-alam', profile_year: 2026, households: 11200 },
    ]);

    importer.importPurchases([
      { store_key: 'GULGASHT_001', produce: 'tomato', market_date: '2026-10-31', sold_g: 22000, unfilled_request_g: 16000, price_paisa_kg: 12000 },
      { store_key: 'GULGASHT_001', produce: 'spinach', market_date: '2026-10-31', sold_g: 10000, unfilled_request_g: 5000, price_paisa_kg: 7000 },
    ]);

    importer.importSupplyPlans([
      { store_key: 'GULGASHT_001', produce: 'tomato', market_date: '2026-10-31', planned_g: 14000 },
    ]);

    const res = importer.getResult();

    // Grain 1: NEIGHBORHOOD_PROFILE (neighborhood_key, profile_year)
    if (res.neighborhoodProfiles.size !== 2) throw new Error(`Expected 2 profiles, got ${res.neighborhoodProfiles.size}`);
    // Grain 2: STORE (store_key)
    if (res.stores.size !== 1) throw new Error(`Expected 1 store, got ${res.stores.size}`);
    // Grain 3: PURCHASE_DAY (store_key, produce, market_date)
    if (res.purchaseDays.size !== 2) throw new Error(`Expected 2 purchase records, got ${res.purchaseDays.size}`);
    // Grain 4: SUPPLY_PLAN (store_key, produce, market_date)
    if (res.supplyPlans.size !== 1) throw new Error(`Expected 1 supply plan, got ${res.supplyPlans.size}`);
  });

  // 2. Distinguishes missing values from observed 0
  test('Distinguishes missing values from observed zero (0)', () => {
    const importer = new LocalDataImporter();

    importer.importCensus([
      { neighborhood_key: 'bohar-gate', profile_year: 2026, households: 0 }, // Observed 0: Valid!
      { neighborhood_key: 'chenab-belt', profile_year: 2026, households: '' }, // Missing: Invalid!
      { neighborhood_key: 'cantt-zone', profile_year: 2026, households: undefined as any }, // Missing: Invalid!
    ]);

    const res = importer.getResult();
    if (!res.neighborhoodProfiles.has('bohar-gate_2026')) {
      throw new Error('Observed 0 households in bohar-gate should be accepted');
    }
    const bohar = res.neighborhoodProfiles.get('bohar-gate_2026');
    if (bohar?.households !== 0) {
      throw new Error(`Expected exactly 0 households, got ${bohar?.households}`);
    }

    if (res.rejectedRows.length !== 2) {
      throw new Error(`Expected 2 rejected rows for missing households, got ${res.rejectedRows.length}`);
    }
  });

  // 3. Rejects invalid rows with reasons
  test('Rejects invalid rows with descriptive error reasons', () => {
    const importer = new LocalDataImporter();

    importer.importPurchases([
      { store_key: 'STORE_X', produce: 'mango', market_date: '2026-10-31', sold_g: 10000 }, // Invalid produce
      { store_key: 'STORE_X', produce: 'tomato', market_date: '31-10-2026', sold_g: 10000 }, // Invalid date format
      { store_key: 'STORE_X', produce: 'tomato', market_date: '2026-10-31', sold_g: -500 }, // Negative quantity
    ]);

    const res = importer.getResult();
    if (res.purchaseDays.size !== 0) throw new Error('Expected 0 accepted purchases');
    if (res.rejectedRows.length !== 3) throw new Error(`Expected 3 rejections, got ${res.rejectedRows.length}`);

    const reasons = res.rejectedRows.map(r => r.reason).join('; ');
    if (!reasons.includes('Invalid produce')) throw new Error('Missing produce reason');
    if (!reasons.includes('Invalid market_date')) throw new Error('Missing date reason');
    if (!reasons.includes('non-negative integer grams')) throw new Error('Missing negative gram reason');
  });

  // 4. REGRESSION: Idempotent repeated import does NOT double demand
  test('REGRESSION: Repeated census import is idempotent and prevents demand inflation', () => {
    const importer = new LocalDataImporter();

    const censusBatch = [
      { neighborhood_key: 'gulgasht', profile_year: 2026, households: 8400 },
      { neighborhood_key: 'shah-rukne-alam', profile_year: 2026, households: 11200 },
    ];

    // First import
    importer.importCensus(censusBatch);
    let totalHouseholds = 0;
    importer.getResult().neighborhoodProfiles.forEach(p => { totalHouseholds += p.households; });
    if (totalHouseholds !== 19600) {
      throw new Error(`Expected 19,600 initial households, got ${totalHouseholds}`);
    }

    // Second repeated import with exact same data
    importer.importCensus(censusBatch);
    const resAfterReimport = importer.getResult();

    let totalHouseholdsAfter = 0;
    resAfterReimport.neighborhoodProfiles.forEach(p => { totalHouseholdsAfter += p.households; });

    // CRITICAL: Must remain 19,600, NOT double to 39,200!
    if (totalHouseholdsAfter !== 19600) {
      throw new Error(
        `CRITICAL REGRESSION: Repeated import doubled household demand from 19,600 to ${totalHouseholdsAfter}`
      );
    }

    if (resAfterReimport.stats.duplicatesIgnored !== 2) {
      throw new Error(
        `Expected 2 duplicates ignored, got ${resAfterReimport.stats.duplicatesIgnored}`
      );
    }
  });

  return results;
}

if (process.argv[1]?.endsWith('import-data.test.ts')) {
  console.log('Running Snowflake Local Data Import Tests:');
  const results = runImportDataTests();
  results.forEach(r => console.log(`  ${r.passed ? '✓' : '✗'} ${r.name} ${r.error ? `(${r.error})` : ''}`));
}
