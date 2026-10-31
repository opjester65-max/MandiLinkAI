import { executeDeficitForecast } from '../lib/providers/snowflakeForecast.ts';

async function runDemoForecast() {
  console.log('====================================================');
  console.log('   MANDILINK DEMO: SNOWFLAKE CORTEX DEFICIT FORECAST');
  console.log('====================================================\n');

  const targetDate = '2026-10-31'; // Friday
  const produce = 'tomato';

  console.log(`Target Date: ${targetDate} (Friday, Asia/Karachi)`);
  console.log(`Produce:     ${produce}\n`);

  try {
    const result = await executeDeficitForecast(targetDate, produce);

    console.log('Query ID:              ', result.queryId);
    console.log('Queried At:            ', result.queriedAt);
    console.log('Source Classification: ', result.sourceClassification);
    console.log('\n--- STORE FORECAST RESULTS TABLE ---');
    console.table(
      result.rows.map((r) => ({
        Store: r.displayName || r.storeKey,
        'Expected Demand (g)': r.expectedG !== null ? `${r.expectedG} g` : 'UNKNOWN',
        'Planned Supply (g)': r.plannedG !== null ? `${r.plannedG} g` : 'UNKNOWN',
        'Baseline Gap (g)': r.baselineGapG !== null ? `${r.baselineGapG} g` : 'UNKNOWN',
        'MandiLink Committed': `${r.committedG} g`,
        'Remaining Gap': r.remainingGapG !== null ? `${r.remainingGapG / 1000} kg` : 'UNKNOWN',
        Sample: `${r.sampleN} days`,
        Basis: r.basis,
        'Gap / 1000 HH': r.kgGapPer1000Households !== null ? `${r.kgGapPer1000Households} kg` : 'N/A',
      }))
    );

    // Verify Friday scenario:
    const gulgasht = result.rows.find((r) => r.storeKey === 'GULGASHT_STORE_001');
    if (!gulgasht) throw new Error('Gulgasht Corner Store missing in forecast');

    if (gulgasht.expectedG !== 38000) {
      throw new Error(`Expected 38,000 g demand for Gulgasht, got ${gulgasht.expectedG} g`);
    }
    if (gulgasht.plannedG !== 14000) {
      throw new Error(`Expected 14,000 g planned supply for Gulgasht, got ${gulgasht.plannedG} g`);
    }
    if (gulgasht.baselineGapG !== 24000) {
      throw new Error(`Expected 24,000 g baseline gap for Gulgasht, got ${gulgasht.baselineGapG} g`);
    }
    console.log('\n✓ Friday Hand Calculation Verification: PASSED (38 kg demand - 14 kg supply = 24 kg gap)');

    // Verify Missing-History Case:
    const newStore = result.rows.find((r) => r.storeKey === 'NEW_STORE_NO_HISTORY_003');
    if (!newStore) throw new Error('New Store missing in forecast');
    if (newStore.basis !== 'neighborhood_pooled') {
      throw new Error(`Expected basis 'neighborhood_pooled' for new store, got ${newStore.basis}`);
    }
    console.log('✓ Missing-History Case Verification:   PASSED (pooled to neighborhood average, basis = neighborhood_pooled)');

    console.log('\n====================================================');
    console.log('   DEMO-FORECAST ADAPTER EXECUTED SUCCESSFULLY      ');
    console.log('====================================================');
  } catch (err: any) {
    console.error('Demo forecast error:', err.message);
    process.exit(1);
  }
}

runDemoForecast();
