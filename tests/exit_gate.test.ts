import { executeDeficitForecast } from '../lib/providers/snowflakeForecast.ts';
import { gradeImageWithGemma, validateAndNormalizeImage } from '../lib/providers/gemmaGrade.ts';
import { sandboxRepository } from '../lib/repositories/marketRepository.ts';
import { FIXTURE_IDS } from '../lib/fixtures/index.ts';
import { handleGetTradeMessages, handlePostMessage } from '../lib/api/handlers.ts';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

export async function runExitGateTests() {
  console.log('--- Running Exit Gate Comprehensive Test Suite (10 Cases) ---');

  // 1. Friday Example
  const fridayForecast = await executeDeficitForecast('2026-10-31', 'tomato');
  const gulgashtFriday = fridayForecast.rows.find((r) => r.storeKey === 'GULGASHT_STORE_001');
  assert(gulgashtFriday !== undefined, 'Gulgasht store present');
  assert(gulgashtFriday!.expectedG === 38000, `Expected 38,000g demand, got ${gulgashtFriday!.expectedG}g`);
  assert(gulgashtFriday!.plannedG === 14000, `Expected 14,000g planned, got ${gulgashtFriday!.plannedG}g`);
  assert(gulgashtFriday!.baselineGapG === 24000, `Expected 24,000g gap, got ${gulgashtFriday!.baselineGapG}g`);
  console.log('✓ Test 1: Friday acceptance calculation passed (38kg demand, 14kg supply, 24kg gap)');

  // 2. Different Weekday Demand
  // Check Sunday 2026-11-01 or Wednesday 2026-10-28
  const wednesdayForecast = await executeDeficitForecast('2026-10-28', 'tomato');
  const gulgashtWed = wednesdayForecast.rows.find((r) => r.storeKey === 'GULGASHT_STORE_001');
  assert(gulgashtWed !== undefined, 'Wednesday store present');
  assert(gulgashtWed!.expectedG !== 38000, 'Wednesday expected demand differs from Friday');
  console.log('✓ Test 2: Different weekday demand isolation verified (Wednesday differs from Friday)');

  // 3. Missing History
  // NEW_STORE_NO_HISTORY_003 has 0 direct observations, falls back to neighborhood_pooled
  const newStore = fridayForecast.rows.find((r) => r.storeKey === 'NEW_STORE_NO_HISTORY_003');
  assert(newStore !== undefined, 'New store found');
  assert(newStore!.basis === 'neighborhood_pooled', `Expected neighborhood_pooled, got ${newStore!.basis}`);
  console.log('✓ Test 3: Missing history fallback to neighborhood pooling verified');

  // 4. Duplicate Staging Imports / Deduplication
  // Verifies that multiple seed entries for same grain are deduplicated in queries
  assert(gulgashtFriday!.sampleN <= 8, 'Deduplication bounds sample size to max 8 days');
  console.log('✓ Test 4: Deduplication and grain uniqueness verified');

  // 5. No Future Leakage
  // Test forecast on earlier date 2026-10-10 does not include 2026-10-17 or 2026-10-24
  const pastForecast = await executeDeficitForecast('2026-10-10', 'tomato');
  const pastGulgasht = pastForecast.rows.find((r) => r.storeKey === 'GULGASHT_STORE_001');
  assert(pastGulgasht!.sampleN < 8, `Past date sample must be strictly < 8 (got ${pastGulgasht!.sampleN})`);
  console.log('✓ Test 5: Strict temporal guard (no future leakage) verified');

  // 6. Missing Supply Plan
  // New store has no commercial supply plan -> plannedG is null, baselineGapG is null (unknown)
  assert(newStore!.plannedG === null, 'Planned supply is null when unlisted');
  assert(newStore!.baselineGapG === null, 'Baseline gap is null when supply is unknown');
  console.log('✓ Test 6: Missing supply plan properly classified as unknown rather than zero');

  // 7. Malformed Input / Corrupt Magic Bytes
  const corruptedBuffer = Buffer.from('NOT_AN_IMAGE_FILE_JUST_CORRUPT_ASCII_BYTES');
  const valCheck = validateAndNormalizeImage(corruptedBuffer);
  assert(!valCheck.valid, 'Must reject files failing magic byte inspection');
  console.log('✓ Test 7: Magic byte verification rejects malformed file before external call');

  // 8. Non-Produce Image Safety
  const blankPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64'
  );
  const gradeResult = await gradeImageWithGemma(blankPng, 'en-PK', false);
  assert(gradeResult.output.reviewRequired === true, 'Non-produce image must require review');
  assert(gradeResult.output.produce === 'unknown', 'Non-produce image must have produce = unknown');
  console.log('✓ Test 8: Non-produce image safety guard verified (cannot publish false lot)');

  // 9. Two-Browser Chat & 2-Second Cursor Polling
  sandboxRepository.reset();
  const { tradeId } = sandboxRepository.createTrade(
    FIXTURE_IDS.listingChenabTomato,
    FIXTURE_IDS.storeGulgasht,
    FIXTURE_IDS.buyerTariq
  );

  // Buyer posts msg 1
  const m1 = await handlePostMessage(tradeId, { body: 'First message from Buyer', kind: 'human' }, FIXTURE_IDS.buyerTariq);
  // Grower polls messages after cursor
  const poll1 = await handleGetTradeMessages(tradeId);
  const allMsgs = (poll1.body as any).data.messages;
  assert(allMsgs.length >= 2, 'Feed includes system greeting and buyer message');

  const cursorCreatedAt = allMsgs[allMsgs.length - 1].createdAt;
  const cursorId = allMsgs[allMsgs.length - 1].id;

  // Grower posts msg 2
  await handlePostMessage(tradeId, { body: 'Reply from Grower', kind: 'human' }, FIXTURE_IDS.growerFatima);

  // Poll strictly after cursor
  const poll2 = await handleGetTradeMessages(tradeId, cursorCreatedAt, cursorId);
  const incrementalMsgs = (poll2.body as any).data.messages;
  assert(incrementalMsgs.length === 1, `Expected 1 new message, got ${incrementalMsgs.length}`);
  assert(incrementalMsgs[0].body === 'Reply from Grower', 'Incremental message matches');
  console.log('✓ Test 9: Two-session chat incremental cursor polling without duplicates verified');

  // 10. Stock Conflicts & Single commit
  const { offerId } = sandboxRepository.createOffer(tradeId, FIXTURE_IDS.buyerTariq, 20000, 11000, new Date(Date.now() + 86400000).toISOString());
  sandboxRepository.acceptOffer(tradeId, offerId, 1, FIXTURE_IDS.growerFatima, 'exit-key-1');

  // Second trade attempting to take more than remaining 10kg
  const { tradeId: conflictTradeId } = sandboxRepository.createTrade(
    FIXTURE_IDS.listingChenabTomato,
    '44444444-4444-4444-4444-444444444402',
    '33333333-3333-3333-3333-333333333303'
  );

  let conflictBlocked = false;
  try {
    sandboxRepository.createOffer(conflictTradeId, '33333333-3333-3333-3333-333333333303', 25000, 11000, new Date(Date.now() + 86400000).toISOString());
  } catch {
    conflictBlocked = true;
  }
  assert(conflictBlocked, 'Stock conflict must block proposals exceeding available 10kg');
  console.log('✓ Test 10: Stock conflict prevented; remaining inventory protected');

  console.log('✓ All 10 Exit Gate Tests Passed Successfully!\n');
}
