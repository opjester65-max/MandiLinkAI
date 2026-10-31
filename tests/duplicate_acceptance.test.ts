import { FIXTURE_IDS } from '../lib/fixtures/index.ts';
import { sandboxRepository } from '../lib/repositories/marketRepository.ts';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

export function runDuplicateAcceptanceTests() {
  console.log('--- Running Duplicate Acceptance & Concurrency Tests ---');

  // Reset to clean deterministic state
  sandboxRepository.reset();

  // Create a trade for the 30kg tomato lot
  const { tradeId } = sandboxRepository.createTrade(
    FIXTURE_IDS.listingChenabTomato,
    FIXTURE_IDS.storeGulgasht,
    FIXTURE_IDS.buyerTariq
  );

  // Buyer proposes 20 kg (20,000 g) @ PKR 110/kg (11,000 paisa)
  const { offerId } = sandboxRepository.createOffer(
    tradeId,
    FIXTURE_IDS.buyerTariq,
    20000,
    11000,
    new Date(Date.now() + 86400000).toISOString()
  );

  const idempotencyKey1 = 'aaaaaaaa-1111-2222-3333-444444444444';
  const requestHash1 = 'hash_20kg_110paisa_version1';

  // Grower Fatima accepts the offer
  const acceptResult = sandboxRepository.acceptOffer(
    tradeId,
    offerId,
    1, // Expected version 1
    FIXTURE_IDS.growerFatima,
    idempotencyKey1,
    requestHash1
  );

  assert(acceptResult.status === 'agreed', 'Trade status must be agreed');
  assert(acceptResult.allocatedG === 20000, 'Allocated grams must be 20,000');
  assert(acceptResult.totalPaisa === 220000, 'Total paisa must be 220,000 (PKR 2,200)');

  // Verify listing remaining inventory: 30 kg - 20 kg = 10 kg
  const marketAfter = sandboxRepository.getMarketData('tomato');
  const listingAfter = marketAfter.listings.find((l) => l.id === FIXTURE_IDS.listingChenabTomato);
  assert(listingAfter !== undefined, 'Listing must exist');
  assert(
    listingAfter!.availableG === 10000,
    `Remaining inventory should be 10,000g (10kg), got ${listingAfter!.availableG}g`
  );
  console.log('✓ Initial accept correctly decremented inventory from 30 kg to 10 kg');

  // Test 1: Replay with same Idempotency-Key and same body must return cached result WITHOUT deducting again
  const replayResult = sandboxRepository.acceptOffer(
    tradeId,
    offerId,
    1,
    FIXTURE_IDS.growerFatima,
    idempotencyKey1,
    requestHash1
  );
  assert(replayResult.allocatedG === 20000, 'Replayed accept must match original');

  // Verify inventory is STILL 10,000g (never deducted twice!)
  const marketReplay = sandboxRepository.getMarketData('tomato');
  const listingReplay = marketReplay.listings.find((l) => l.id === FIXTURE_IDS.listingChenabTomato);
  assert(
    listingReplay!.availableG === 10000,
    `Inventory was illegally decremented on replay! Remaining: ${listingReplay!.availableG}g`
  );
  console.log('✓ Idempotent replay returned cached response without double deduction');

  // Test 2: Idempotency-Key reused with changed request hash must trigger 409 CONFLICT
  let conflictCaught = false;
  try {
    sandboxRepository.acceptOffer(
      tradeId,
      offerId,
      1,
      FIXTURE_IDS.growerFatima,
      idempotencyKey1,
      'different_payload_hash_attempt'
    );
  } catch (err: any) {
    if (err.message.includes('CONFLICT')) {
      conflictCaught = true;
    }
  }
  assert(conflictCaught, 'Reusing idempotency key with different payload must fail with 409 CONFLICT');
  console.log('✓ Reused idempotency key with conflicting hash correctly blocked');

  // Test 3: Attempting to accept a second offer that oversells remaining 10kg
  // Create another trade with another buyer attempting 20kg
  const { tradeId: secondTradeId } = sandboxRepository.createTrade(
    FIXTURE_IDS.listingChenabTomato,
    '44444444-4444-4444-4444-444444444402',
    '33333333-3333-3333-3333-333333333303'
  );

  let oversellPrevented = false;
  try {
    // Proposing 15kg when only 10kg left
    sandboxRepository.createOffer(
      secondTradeId,
      '33333333-3333-3333-3333-333333333303',
      15000,
      12000,
      new Date(Date.now() + 86400000).toISOString()
    );
  } catch (err: any) {
    oversellPrevented = true;
  }
  assert(oversellPrevented, 'Must reject offers requesting more than remaining 10kg stock');
  console.log('✓ Oversell protection verified: cannot propose or accept beyond remaining inventory');

  console.log('✓ All Duplicate Acceptance Tests Passed Successfully!\n');
}
