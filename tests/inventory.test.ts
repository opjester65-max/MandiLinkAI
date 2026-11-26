/**
 * Tests for lib/fixtures/inventory.ts
 *
 * Verifies:
 * 1. Repeatable fictional Multan grower and store inventory with stable IDs
 * 2. Integer grams and PKR paisa/kg validation
 * 3. 30 kg tomato lot (30,000 g)
 * 4. Friday 24 kg shortage (24,000 g)
 * 5. REGRESSION TEST: 20 kg allocation leaves exactly 10 kg inventory and 4 kg unmet deficit
 * 6. Integer cost math: 20 kg @ 120 PKR/kg = 240,000 paisa (PKR 2,400.00)
 */

import {
  createStandardTomatoLot,
  createStandardFridayDeficit,
  allocateInventoryToDeficit,
  INVENTORY_FIXTURE_IDS,
} from '../lib/fixtures/inventory.ts';

export function runInventoryTests(): { name: string; passed: boolean; error?: string }[] {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  function test(name: string, fn: () => void) {
    try {
      fn();
      results.push({ name, passed: true });
    } catch (err: any) {
      results.push({ name, passed: false, error: err.message });
    }
  }

  // 1. Stable fixture IDs
  test('Inventory fixtures contain repeatable stable UUIDs', () => {
    const lot = createStandardTomatoLot();
    const deficit = createStandardFridayDeficit();

    if (lot.id !== INVENTORY_FIXTURE_IDS.lotChenabTomato30Kg) {
      throw new Error(`Lot ID mismatch: ${lot.id}`);
    }
    if (deficit.storeId !== INVENTORY_FIXTURE_IDS.storeGulgasht) {
      throw new Error(`Store ID mismatch: ${deficit.storeId}`);
    }
  });

  // 2. Initial Quantities
  test('Initial surplus lot is exactly 30,000 grams @ 12,000 paisa/kg', () => {
    const lot = createStandardTomatoLot();
    if (lot.availableG !== 30000 || lot.totalG !== 30000) {
      throw new Error(`Expected 30,000g total and available, got ${lot.availableG}g`);
    }
    if (lot.askPaisaKg !== 12000) {
      throw new Error(`Expected 12,000 paisa/kg, got ${lot.askPaisaKg}`);
    }
    if (!Number.isInteger(lot.availableG) || !Number.isInteger(lot.askPaisaKg)) {
      throw new Error('Quantities and prices must be strict integers');
    }
  });

  // 3. Friday Deficit Numbers
  test('Friday shortage represents 24,000 grams net deficit (38kg demand - 14kg supply)', () => {
    const deficit = createStandardFridayDeficit();
    if (deficit.netDeficitG !== 24000) {
      throw new Error(`Expected net deficit 24,000g, got ${deficit.netDeficitG}g`);
    }
    if (deficit.baselineDemandG - deficit.predictedSupplyG !== 24000) {
      throw new Error('Demand minus supply must equal 24,000g');
    }
  });

  // 4. REGRESSION TEST: 20 kg allocation leaves 10 kg inventory & 4 kg unmet
  test('REGRESSION: 20 kg allocation leaves exactly 10 kg inventory and 4 kg unmet deficit', () => {
    const lot = createStandardTomatoLot();
    const deficit = createStandardFridayDeficit();

    // Allocate 20,000 grams (20 kg)
    const allocation = allocateInventoryToDeficit(lot, deficit, 20000, 12000);

    // Remaining lot inventory: 30,000g - 20,000g = 10,000g (10 kg)
    if (allocation.updatedLot.availableG !== 10000) {
      throw new Error(
        `Expected remaining lot inventory of 10,000g (10 kg), got ${allocation.updatedLot.availableG}g`
      );
    }
    if (allocation.updatedLot.reservedG !== 20000) {
      throw new Error(
        `Expected reserved lot inventory of 20,000g, got ${allocation.updatedLot.reservedG}g`
      );
    }

    // Remaining store deficit: 24,000g - 20,000g = 4,000g (4 kg unmet)
    if (allocation.updatedDeficit.remainingDeficitG !== 4000) {
      throw new Error(
        `Expected remaining store deficit of 4,000g (4 kg), got ${allocation.updatedDeficit.remainingDeficitG}g`
      );
    }
    if (allocation.updatedDeficit.fulfilledG !== 20000) {
      throw new Error(
        `Expected fulfilled deficit of 20,000g, got ${allocation.updatedDeficit.fulfilledG}g`
      );
    }

    // Total cost in paisa: (20,000g * 12,000 paisa/kg) / 1000 = 240,000 paisa (PKR 2,400.00)
    if (allocation.totalCostPaisa !== 240000) {
      throw new Error(`Expected total cost 240,000 paisa, got ${allocation.totalCostPaisa}`);
    }
  });

  // 5. Over-allocation error
  test('Rejects allocation exceeding available lot inventory', () => {
    const lot = createStandardTomatoLot();
    const deficit = createStandardFridayDeficit();

    let errorThrown = false;
    try {
      allocateInventoryToDeficit(lot, deficit, 35000, 12000);
    } catch (_e) {
      errorThrown = true;
    }
    if (!errorThrown) {
      throw new Error('Failed to reject allocation exceeding available grams');
    }
  });

  return results;
}

if (process.argv[1]?.endsWith('inventory.test.ts')) {
  console.log('Running Inventory Fixture Tests:');
  const results = runInventoryTests();
  results.forEach(r => console.log(`  ${r.passed ? '✓' : '✗'} ${r.name} ${r.error ? `(${r.error})` : ''}`));
}
