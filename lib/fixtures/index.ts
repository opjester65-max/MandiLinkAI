import {
  Agent,
  DeficitGap,
  Grade,
  Listing,
  Message,
  Neighborhood,
  Offer,
  Store,
  Trade,
  calculateTotalPaisa,
} from '../contracts';

export const FIXTURE_IDS = {
  neighborhoodGulgasht: '11111111-1111-1111-1111-111111111101',
  neighborhoodShahRukn: '11111111-1111-1111-1111-111111111102',
  neighborhoodBoharGate: '11111111-1111-1111-1111-111111111103',
  neighborhoodCantt: '11111111-1111-1111-1111-111111111104',
  neighborhoodChenab: '11111111-1111-1111-1111-111111111105',

  buyerTariq: '33333333-3333-3333-3333-333333333301',
  growerFatima: '33333333-3333-3333-3333-333333333302',

  storeGulgasht: '44444444-4444-4444-4444-444444444401',

  gradeChenabTomato: '55555555-5555-5555-5555-555555555501',
  listingChenabTomato: '66666666-6666-6666-6666-666666666601',

  seedTrade: '77777777-7777-7777-7777-777777777701',
  seedOffer: '88888888-8888-8888-8888-888888888801',
};

export const INITIAL_NEIGHBORHOODS: Neighborhood[] = [
  {
    id: FIXTURE_IDS.neighborhoodGulgasht,
    slug: 'gulgasht',
    name: 'Gulgasht Colony',
    lat: 30.2244,
    lng: 71.4920,
  },
  {
    id: FIXTURE_IDS.neighborhoodShahRukn,
    slug: 'shah-rukne-alam',
    name: 'Shah Rukn-e-Alam Colony',
    lat: 30.1925,
    lng: 71.5034,
  },
  {
    id: FIXTURE_IDS.neighborhoodBoharGate,
    slug: 'bohar-gate',
    name: 'Bohar Gate Walled City',
    lat: 30.1970,
    lng: 71.4725,
  },
  {
    id: FIXTURE_IDS.neighborhoodCantt,
    slug: 'multan-cantt',
    name: 'Multan Cantt Commercial',
    lat: 30.1830,
    lng: 71.4420,
  },
  {
    id: FIXTURE_IDS.neighborhoodChenab,
    slug: 'chenab-belt',
    name: 'Chenab River Urban Greenbelt',
    lat: 30.2450,
    lng: 71.4720,
  },
];

export const INITIAL_AGENTS: Agent[] = [
  {
    id: FIXTURE_IDS.buyerTariq,
    userId: '22222222-2222-2222-2222-222222222201',
    role: 'buyer',
    displayName: 'Tariq Mehmood (Corner Store Operator)',
    neighborhoodId: FIXTURE_IDS.neighborhoodGulgasht,
    walletPubkey: 'B1uY3r7ariqGu1gashtMultanSo1anaPubk3y1111',
    reputationScore: 94,
  },
  {
    id: FIXTURE_IDS.growerFatima,
    userId: '22222222-2222-2222-2222-222222222202',
    role: 'grower',
    displayName: 'Bibi Fatima (Chenab Community Garden)',
    neighborhoodId: FIXTURE_IDS.neighborhoodChenab,
    walletPubkey: 'Gr0w3rFatimaCh3nabMultanSo1anaPubk3y2222',
    reputationScore: 98,
  },
];

export const INITIAL_STORES: Store[] = [
  {
    id: FIXTURE_IDS.storeGulgasht,
    buyerId: FIXTURE_IDS.buyerTariq,
    neighborhoodId: FIXTURE_IDS.neighborhoodGulgasht,
    name: 'Gulgasht Corner Store',
    lat: 30.2251,
    lng: 71.4935,
  },
];

export const INITIAL_GRADES: Grade[] = [
  {
    id: FIXTURE_IDS.gradeChenabTomato,
    growerId: FIXTURE_IDS.growerFatima,
    imageSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    modelId: 'gemma-4-26b-a4b-it',
    produce: 'tomato',
    locale: 'en-PK',
    visualGrade: 'A',
    observations: [
      'Uniform red skin with firm calyx and zero superficial bruising',
      'Consistent diameter matching Grade A produce shelf standards',
      'No fungal blemishes or skin splits observed in harvest lot'
    ],
    description: 'Harvested at dawn along Chenab River greenbelt. Certified Grade A vine tomatoes with uniform firmness and high sugar content.',
    reviewRequired: false,
    latencyMs: 1420,
    providerRequestId: '6KTlap2QEtqtjuMPgoSi-QY',
    createdAt: '2026-10-31T05:30:00.000Z',
  },
];

export const INITIAL_LISTINGS: Listing[] = [
  {
    id: FIXTURE_IDS.listingChenabTomato,
    growerId: FIXTURE_IDS.growerFatima,
    gradeId: FIXTURE_IDS.gradeChenabTomato,
    produce: 'tomato',
    description: 'Vine-ripened organic tomatoes picked early morning from Chenab Community Garden. High firmness, Grade A certified.',
    availableG: 30000, // 30 kg lot
    askPaisaKg: 12000, // PKR 120/kg
    pickupLat: 30.2455,
    pickupLng: 71.4718,
    pickupUntil: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
    status: 'open',
    version: 1,
    growerName: 'Chenab Community Garden (Bibi Fatima)',
  },
  {
    id: '66666666-6666-6666-6666-666666666602',
    growerId: FIXTURE_IDS.growerFatima,
    gradeId: null,
    produce: 'spinach',
    description: 'Crisp green deshi palak freshly cut, zero pesticide residue.',
    availableG: 18000, // 18 kg
    askPaisaKg: 9000, // PKR 90/kg
    pickupLat: 30.2455,
    pickupLng: 71.4718,
    pickupUntil: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
    status: 'open',
    version: 1,
    growerName: 'Chenab Community Garden (Bibi Fatima)',
  },
  {
    id: '66666666-6666-6666-6666-666666666603',
    growerId: FIXTURE_IDS.growerFatima,
    gradeId: null,
    produce: 'guava',
    description: 'Fragrant sweet white guavas (amrood) harvested from local orchard trees.',
    availableG: 25000, // 25 kg
    askPaisaKg: 14000, // PKR 140/kg
    pickupLat: 30.2420,
    pickupLng: 71.4760,
    pickupUntil: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    status: 'open',
    version: 1,
    growerName: 'Chenab Community Garden (Bibi Fatima)',
  },
];

// Friday scenario baseline forecast:
// Estimated demand: 38 kg, planned supply: 14 kg, initial gap: 24 kg
export const INITIAL_DEFICIT_GAPS: DeficitGap[] = [
  {
    neighborhoodId: FIXTURE_IDS.neighborhoodGulgasht,
    neighborhoodName: 'Gulgasht Colony',
    storeId: FIXTURE_IDS.storeGulgasht,
    storeName: 'Gulgasht Corner Store',
    produce: 'tomato',
    date: '2026-10-31',
    dayOfWeek: 'Friday',
    estimatedDemandKg: 38,
    plannedSupplyKg: 14,
    committedInboundKg: 0,
    deliveredSupplyKg: 0,
    gapKg: 24, // 38 - 14 = 24
    riskTier: 'CRITICAL_SHORTAGE',
    snowflakeReceipt: 'Fixture',
  },
  {
    neighborhoodId: FIXTURE_IDS.neighborhoodGulgasht,
    neighborhoodName: 'Gulgasht Colony',
    storeId: FIXTURE_IDS.storeGulgasht,
    storeName: 'Gulgasht Corner Store',
    produce: 'spinach',
    date: '2026-10-31',
    dayOfWeek: 'Friday',
    estimatedDemandKg: 20,
    plannedSupplyKg: 8,
    committedInboundKg: 0,
    deliveredSupplyKg: 0,
    gapKg: 12,
    riskTier: 'MODERATE_SHORTAGE',
    snowflakeReceipt: 'Fixture',
  },
  {
    neighborhoodId: FIXTURE_IDS.neighborhoodShahRukn,
    neighborhoodName: 'Shah Rukn-e-Alam Colony',
    storeId: '44444444-4444-4444-4444-444444444402',
    storeName: 'Shah Rukn General Store',
    produce: 'guava',
    date: '2026-10-31',
    dayOfWeek: 'Friday',
    estimatedDemandKg: 30,
    plannedSupplyKg: 12,
    committedInboundKg: 0,
    deliveredSupplyKg: 0,
    gapKg: 18,
    riskTier: 'MODERATE_SHORTAGE',
    snowflakeReceipt: 'Fixture',
  },
];

export const INITIAL_TRADES: Trade[] = [];
export const INITIAL_OFFERS: Offer[] = [];
export const INITIAL_MESSAGES: Message[] = [];
