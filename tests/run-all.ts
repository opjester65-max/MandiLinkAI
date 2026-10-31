import { runTradeArithmeticTests } from './trade_arithmetic.test.ts';
import { runDuplicateAcceptanceTests } from './duplicate_acceptance.test.ts';
import { runUnauthorizedReadsTests } from './unauthorized_reads.test.ts';
import { runExitGateTests } from './exit_gate.test.ts';

async function main() {
  console.log('====================================================');
  console.log('   MANDILINK TEST SUITE (MULTAN SURPLUS MARKET)    ');
  console.log('====================================================\n');

  try {
    runTradeArithmeticTests();
    runDuplicateAcceptanceTests();
    await runUnauthorizedReadsTests();
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
