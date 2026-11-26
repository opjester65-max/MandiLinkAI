/**
 * MandiLink Inventory Fixtures
 * Repeatable fictional Multan grower surplus and store inventory with stable IDs.
 *
 * Requirements:
 * - Integer grams (e.g. 30,000 g for 30 kg)
 * - Integer PKR paisa/kg (e.g. 12,000 paisa for PKR 120.00/kg)
 * - Standard 30 kg tomato surplus lot (Bibi Fatima, Chenab Greenbelt)
 * - Standard Friday 24 kg shortage (Tariq Mehmood, Gulgasht Corner Store: 38 kg demand - 14 kg supply = 24 kg deficit)
 * - Deterministic allocation logic with regression test verification:
 *   Allocating 20,000 g (20 kg) leaves exactly 10,000 g (10 kg) inventory and 4,000 g (4 kg) unmet deficit.
 */

export interface InventoryLot {
  id: string;
  growerId: string;
  growerName: string;
  produce: 'tomato' | 'spinach' | 'guava';
  totalG: number;
  availableG: number;
  reservedG: number;
  deliveredG: number;
  askPaisaKg: number;
  harvestDate: string;
  pickupUntil: string;
}

export interface StoreDeficitInventory {
  storeId: string;
  buyerId: string;
  storeName: string;
  produce: 'tomato' | 'spinach' | 'guava';
  targetDate: string;
  dayOfWeek: string;
  baselineDemandG: number;
  predictedSupplyG: number;
  netDeficitG: number;
  fulfilledG: number;
  remainingDeficitG: number;
}

export const INVENTORY_FIXTURE_IDS = {
  growerFatima: '33333333-3333-3333-3333-333333333302',
  buyerTariq: '33333333-3333-3333-3333-333333333301',
  storeGulgasht: '44444444-4444-4444-4444-444444444401',
  lotChenabTomato30Kg: '66666666-6666-6666-6666-666666666601',
  shortageFridayTomato24Kg: '99999999-9999-9999-9999-999999999901',
};

/**
 * Standard 30 kg tomato lot in Chenab River Urban Greenbelt
 */
export function createStandardTomatoLot(): InventoryLot {
  return {
    id: INVENTORY_FIXTURE_IDS.lotChenabTomato30Kg,
    growerId: INVENTORY_FIXTURE_IDS.growerFatima,
    growerName: 'Bibi Fatima (Chenab Community Garden)',
    produce: 'tomato',
    totalG: 30000,      // 30 kg lot
    availableG: 30000,  // Initially 30,000 g available
    reservedG: 0,
    deliveredG: 0,
    askPaisaKg: 12000,  // PKR 120 / kg (12,000 paisa)
    harvestDate: '2026-10-30T06:00:00.000Z',
    pickupUntil: '2026-10-31T18:00:00.000Z',
  };
}

/**
 * Standard Friday 24 kg tomato shortage for Gulgasht Corner Store
 * Hand-calculation / Cortex proof:
 * Baseline Friday Demand: 38 kg (38,000 g)
 * Scheduled Delivery / Available Supply: 14 kg (14,000 g)
 * Net Deficit: 24 kg (24,000 g)
 */
export function createStandardFridayDeficit(): StoreDeficitInventory {
  return {
    storeId: INVENTORY_FIXTURE_IDS.storeGulgasht,
    buyerId: INVENTORY_FIXTURE_IDS.buyerTariq,
    storeName: 'Gulgasht Corner Store',
    produce: 'tomato',
    targetDate: '2026-10-31', // Post-Friday weekend market morning
    dayOfWeek: 'Friday',
    baselineDemandG: 38000,
    predictedSupplyG: 14000,
    netDeficitG: 24000, // 24 kg
    fulfilledG: 0,
    remainingDeficitG: 24000,
  };
}

/**
 * Allocates trade quantity in grams from an inventory lot to a store deficit.
 * Strict non-negative integer gram arithmetic.
 * Returns the updated lot state, updated deficit state, and agreed total in PKR paisa.
 */
export function allocateInventoryToDeficit(
  lot: InventoryLot,
  deficit: StoreDeficitInventory,
  quantityG: number,
  agreedPricePaisaKg: number
): {
  updatedLot: InventoryLot;
  updatedDeficit: StoreDeficitInventory;
  allocatedG: number;
  totalCostPaisa: number;
} {
  if (quantityG <= 0 || !Number.isInteger(quantityG)) {
    throw new RangeError(`Allocated quantity must be a positive integer in grams: ${quantityG}`);
  }
  if (quantityG > lot.availableG) {
    throw new Error(
      `Insufficient lot inventory: requested ${quantityG}g but only ${lot.availableG}g available`
    );
  }

  // Integer cost calculation: (quantityG * agreedPricePaisaKg) / 1000
  const totalCostPaisa = Math.round((quantityG * agreedPricePaisaKg) / 1000);

  const updatedLot: InventoryLot = {
    ...lot,
    availableG: lot.availableG - quantityG,
    reservedG: lot.reservedG + quantityG,
  };

  const updatedDeficit: StoreDeficitInventory = {
    ...deficit,
    fulfilledG: deficit.fulfilledG + quantityG,
    remainingDeficitG: Math.max(0, deficit.netDeficitG - (deficit.fulfilledG + quantityG)),
  };

  return {
    updatedLot,
    updatedDeficit,
    allocatedG: quantityG,
    totalCostPaisa,
  };
}
