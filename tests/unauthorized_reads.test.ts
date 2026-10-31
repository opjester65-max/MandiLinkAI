import { handleGetTrade } from '../lib/api/handlers.ts';
import { FIXTURE_IDS } from '../lib/fixtures/index.ts';
import { sandboxRepository } from '../lib/repositories/marketRepository.ts';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

export async function runUnauthorizedReadsTests() {
  console.log('--- Running Authorization & Access Control Tests ---');

  sandboxRepository.reset();

  // Create a trade between Gulgasht Corner Store (Tariq Mehmood) and Chenab Garden (Bibi Fatima)
  const { tradeId } = sandboxRepository.createTrade(
    FIXTURE_IDS.listingChenabTomato,
    FIXTURE_IDS.storeGulgasht,
    FIXTURE_IDS.buyerTariq
  );

  // Propose an offer from buyer Tariq
  const { offerId } = sandboxRepository.createOffer(
    tradeId,
    FIXTURE_IDS.buyerTariq,
    20000,
    11000,
    new Date(Date.now() + 86400000).toISOString()
  );

  // Test 1: Third party agent (e.g. random buyer Bilal) tries to read Tariq & Fatima's private bargaining room
  const outsiderAgentId = '33333333-3333-3333-3333-333333333399';
  const unauthorizedRead = await handleGetTrade(tradeId, outsiderAgentId);

  assert(
    unauthorizedRead.status === 403,
    `Expected status 403 FORBIDDEN for unauthorized outsider, got ${unauthorizedRead.status}`
  );
  assert(
    (unauthorizedRead.body as any).error?.code === 'FORBIDDEN',
    'Error code must be FORBIDDEN'
  );
  console.log('✓ Unauthorized outsider prevented from reading trade bargaining room (403 FORBIDDEN)');

  // Test 2: Legitimate participant (buyer Tariq) reading trade succeeds
  const authorizedBuyerRead = await handleGetTrade(tradeId, FIXTURE_IDS.buyerTariq);
  assert(
    authorizedBuyerRead.status === 200,
    `Expected 200 OK for authorized buyer, got ${authorizedBuyerRead.status}`
  );
  console.log('✓ Legitimate buyer can read bargaining room');

  // Test 3: Legitimate seller (grower Fatima) reading trade succeeds
  const authorizedGrowerRead = await handleGetTrade(tradeId, FIXTURE_IDS.growerFatima);
  assert(
    authorizedGrowerRead.status === 200,
    `Expected 200 OK for authorized grower, got ${authorizedGrowerRead.status}`
  );
  console.log('✓ Legitimate grower can read bargaining room');

  // Test 4: Maker cannot accept their own proposed offer (must be opposite party)
  let selfAcceptBlocked = false;
  try {
    sandboxRepository.acceptOffer(
      tradeId,
      offerId,
      1,
      FIXTURE_IDS.buyerTariq // Tariq made the offer, tries to accept his own offer!
    );
  } catch (err: any) {
    if (err.message.includes('FORBIDDEN') || err.message.includes('counterparty')) {
      selfAcceptBlocked = true;
    }
  }
  assert(selfAcceptBlocked, 'Maker must be blocked from accepting their own offer');
  console.log('✓ Self-acceptance strictly blocked: only counterparty can accept offer');

  console.log('✓ All Authorization & Access Control Tests Passed Successfully!\n');
}
