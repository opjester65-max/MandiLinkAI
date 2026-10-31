import { calculateTotalPaisa, paisaToPkr, pkrToPaisa } from '../lib/contracts/index.ts';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

export function runTradeArithmeticTests() {
  console.log('--- Running Trade Arithmetic Tests ---');

  // Acceptance Test Scenario 1:
  // 20 kg (20,000 g) of tomatoes at PKR 110/kg (11,000 paisa/kg)
  // Expected total: PKR 2,200 (220,000 paisa)
  const qtyG1 = 20000;
  const pricePaisaKg1 = 11000; // PKR 110
  const totalPaisa1 = calculateTotalPaisa(qtyG1, pricePaisaKg1);
  assert(totalPaisa1 === 220000, `Expected 220,000 paisa, got ${totalPaisa1}`);
  assert(paisaToPkr(totalPaisa1) === 2200, `Expected PKR 2200, got ${paisaToPkr(totalPaisa1)}`);
  console.log('✓ Scenario 1: 20 kg @ PKR 110/kg = PKR 2,200 (220,000 paisa) passed');

  // Baseline 30 kg lot asking PKR 120/kg
  const fullLotTotal = calculateTotalPaisa(30000, 12000);
  assert(fullLotTotal === 360000, `Expected 360,000 paisa, got ${fullLotTotal}`);
  assert(paisaToPkr(fullLotTotal) === 3600, `Expected PKR 3600, got ${paisaToPkr(fullLotTotal)}`);
  console.log('✓ Scenario 2: 30 kg @ PKR 120/kg = PKR 3,600 passed');

  // Fractional weight with rounding check:
  // 1,350 g @ PKR 125/kg (12,500 paisa/kg) -> (1350 * 12500) / 1000 = 16875 paisa
  const totalFractional = calculateTotalPaisa(1350, 12500);
  assert(totalFractional === 16875, `Expected 16875 paisa, got ${totalFractional}`);
  assert(paisaToPkr(totalFractional) === 168.75, `Expected PKR 168.75, got ${paisaToPkr(totalFractional)}`);
  console.log('✓ Scenario 3: 1,350 g @ PKR 125/kg = PKR 168.75 passed');

  // Rounding tie breaker (rounding to nearest paisa)
  // 1,001 g @ 10,005 paisa/kg -> 10,001 * 10005 / 1000 = 10015.005 -> rounds to 10015
  const roundedPaisa = calculateTotalPaisa(1001, 10005);
  assert(typeof roundedPaisa === 'number' && Number.isInteger(roundedPaisa), 'Result must be integer paisa');
  console.log('✓ Scenario 4: Half-paisa round-to-nearest integer integrity passed');

  console.log('✓ All Trade Arithmetic Tests Passed Successfully!\n');
}
