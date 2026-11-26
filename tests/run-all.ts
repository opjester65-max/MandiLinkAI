import { runTradeArithmeticTests } from './trade_arithmetic.test.ts';
import { runDuplicateAcceptanceTests } from './duplicate_acceptance.test.ts';
import { runUnauthorizedReadsTests } from './unauthorized_reads.test.ts';
import { runExitGateTests } from './exit_gate.test.ts';
import { runDistanceTests } from './distance.test.ts';
import { runInventoryTests } from './inventory.test.ts';
import { runImportDataTests } from './import-data.test.ts';

async function main() {
  console.log('====================================================');
  console.log('   MANDILINK TEST SUITE (MULTAN SURPLUS MARKET)    ');
  console.log('====================================================\n');

  try {
    runTradeArithmeticTests();
    runDuplicateAcceptanceTests();
    await runUnauthorizedReadsTests();

    console.log('\n--- Spatial Matching & Distance Tests (Target 1) ---');
    const distRes = runDistanceTests();
    distRes.forEach((r) => {
      if (!r.passed) throw new Error(`Distance Test Failed: ${r.name} - ${r.error}`);
      console.log(`  ✓ ${r.name}`);
    });

    console.log('\n--- Inventory & Shortage Allocation Tests (Target 2) ---');
    const invRes = runInventoryTests();
    invRes.forEach((r) => {
      if (!r.passed) throw new Error(`Inventory Test Failed: ${r.name} - ${r.error}`);
      console.log(`  ✓ ${r.name}`);
    });

    console.log('\n--- Snowflake Data Import & Idempotency Tests (Target 3) ---');
    const impRes = runImportDataTests();
    impRes.forEach((r) => {
      if (!r.passed) throw new Error(`Import Test Failed: ${r.name} - ${r.error}`);
      console.log(`  ✓ ${r.name}`);
    });

    await runExitGateTests();

    console.log('====================================================');
    console.log('   ALL ACCEPTANCE, AUDIT & EXIT GATE TESTS PASSED   ');
    console.log('====================================================');
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ TEST RUNNER FAILURE:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
