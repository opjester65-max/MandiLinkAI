import {
  Agent,
  DeficitGap,
  Listing,
  Message,
  Offer,
  Store,
  Trade,
  calculateTotalPaisa,
  paisaToPkr,
} from '../contracts';
import {
  FIXTURE_IDS,
  INITIAL_AGENTS,
  INITIAL_DEFICIT_GAPS,
  INITIAL_GRADES,
  INITIAL_LISTINGS,
  INITIAL_NEIGHBORHOODS,
  INITIAL_STORES,
} from '../fixtures';

export interface MarketState {
  mode: 'sandbox' | 'live';
  agents: Agent[];
  stores: Store[];
  listings: Listing[];
  trades: Trade[];
  offers: Offer[];
  messages: Message[];
  grades: any[];
  idempotencyKeys: Record<string, { requestHash: string; response: any }>;
  currentUserAgentId: string; // Active persona in sandbox ('buyerTariq' or 'growerFatima')
}

const STORAGE_KEY = 'mandilink_sandbox_state_v1';

export function getInitialState(): MarketState {
  return {
    mode: 'sandbox',
    agents: JSON.parse(JSON.stringify(INITIAL_AGENTS)),
    stores: JSON.parse(JSON.stringify(INITIAL_STORES)),
    listings: JSON.parse(JSON.stringify(INITIAL_LISTINGS)),
    trades: [],
    offers: [],
    messages: [],
    grades: [
      {
        id: FIXTURE_IDS.gradeChenabTomato,
        growerId: FIXTURE_IDS.growerFatima,
        imageSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        modelId: 'gemini-2.5-flash',
        produce: 'tomato',
        locale: 'en-PK',
        visualGrade: 'A',
        observations: ['Firmness: prime turgor', 'Color: 94% deep red', 'Skin: intact, no bruises'],
        description: 'Harvested at dawn along Chenab River greenbelt. Certified Grade A vine tomatoes.',
        reviewRequired: false,
        latencyMs: 0,
        providerRequestId: 'fixture_seed_001',
        createdAt: '2026-10-31T05:30:00.000Z',
      },
    ],
    idempotencyKeys: {},
    currentUserAgentId: FIXTURE_IDS.buyerTariq,
  };
}

class SandboxRepository {
  private memoryState: MarketState = getInitialState();

  private getState(): MarketState {
    if (typeof window === 'undefined') {
      return this.memoryState;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      this.memoryState = initial;
      return initial;
    }
    try {
      const parsed = JSON.parse(raw);
      this.memoryState = parsed;
      return parsed;
    } catch {
      const initial = getInitialState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      this.memoryState = initial;
      return initial;
    }
  }

  private saveState(state: MarketState): void {
    this.memoryState = state;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }

  public reset(): MarketState {
    const fresh = getInitialState();
    this.saveState(fresh);
    return fresh;
  }

  public switchActivePersona(agentId: string): void {
    const state = this.getState();
    state.currentUserAgentId = agentId;
    this.saveState(state);
  }

  public getCurrentUserAgent(): Agent {
    const state = this.getState();
    const agent = state.agents.find((a) => a.id === state.currentUserAgentId);
    return agent || state.agents[0];
  }

  public getAgentById(agentId: string): Agent | null {
    const state = this.getState();
    return state.agents.find((a) => a.id === agentId) || null;
  }

  public getMarketData(produce: string = 'tomato', date: string = '2026-10-31') {
    const state = this.getState();
    const filteredListings = state.listings.filter(
      (l) => l.produce === produce && (l.status === 'open' || l.availableG > 0)
    );

    // Compute live gap based on trades and listings
    // Start with baseline Friday scenario
    const baseGaps: DeficitGap[] = INITIAL_DEFICIT_GAPS.map((baseGap) => {
      if (baseGap.produce !== produce) return baseGap;

      // Calculate committed inbound (agreed trades) and delivered supply (delivered trades)
      let committedInboundG = 0;
      let deliveredSupplyG = 0;

      for (const t of state.trades) {
        if (t.storeId === baseGap.storeId) {
          const listing = state.listings.find((l) => l.id === t.listingId);
          if (listing && listing.produce === baseGap.produce) {
            const acceptedOffer = state.offers.find((o) => o.id === t.acceptedOfferId);
            const allocatedG = acceptedOffer ? acceptedOffer.qtyG : 0;
            if (t.status === 'agreed') {
              committedInboundG += allocatedG;
            } else if (t.status === 'delivered') {
              deliveredSupplyG += allocatedG;
            }
          }
        }
      }

      const committedInboundKg = committedInboundG / 1000;
      const deliveredKg = deliveredSupplyG / 1000;
      // Formula: Demand - (Planned + Inbound + Delivered)
      const totalFulfilled = baseGap.plannedSupplyKg + committedInboundKg + deliveredKg;
      const outstandingGapKg = Math.max(0, Math.round((baseGap.estimatedDemandKg - totalFulfilled) * 10) / 10);

      const riskTier =
        outstandingGapKg >= 20 ? 'CRITICAL_SHORTAGE' : outstandingGapKg > 5 ? 'MODERATE_SHORTAGE' : 'BALANCED';

      return {
        ...baseGap,
        committedInboundKg,
        deliveredSupplyKg: deliveredKg,
        gapKg: outstandingGapKg,
        riskTier,
      };
    });

    return {
      listings: filteredListings,
      gaps: baseGaps,
      trades: state.trades,
    };
  }

  public getTradeById(tradeId: string): {
    trade: Trade | null;
    listing: Listing | null;
    store: Store | null;
    offers: Offer[];
    messages: Message[];
    buyerAgent: Agent | null;
    growerAgent: Agent | null;
  } {
    const state = this.getState();
    const trade = state.trades.find((t) => t.id === tradeId) || null;
    if (!trade) {
      return {
        trade: null,
        listing: null,
        store: null,
        offers: [],
        messages: [],
        buyerAgent: null,
        growerAgent: null,
      };
    }

    const listing = state.listings.find((l) => l.id === trade.listingId) || null;
    const store = state.stores.find((s) => s.id === trade.storeId) || null;
    const offers = state.offers
      .filter((o) => o.tradeId === tradeId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const messages = state.messages
      .filter((m) => m.tradeId === tradeId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const buyerAgent = store ? state.agents.find((a) => a.id === store.buyerId) || null : null;
    const growerAgent = listing ? state.agents.find((a) => a.id === listing.growerId) || null : null;

    return {
      trade,
      listing,
      store,
      offers,
      messages,
      buyerAgent,
      growerAgent,
    };
  }

  public createListing(
    params: {
      gradeId?: string | null;
      produce: 'tomato' | 'spinach' | 'guava';
      description: string;
      availableG: number;
      askPaisaKg: number;
      pickupLat: number;
      pickupLng: number;
      pickupUntil: string;
    },
    growerAgentId: string
  ): { listingId: string; version: number } {
    const state = this.getState();
    const grower = state.agents.find((a) => a.id === growerAgentId);

    const newListing: Listing = {
      id: crypto.randomUUID(),
      growerId: growerAgentId,
      gradeId: params.gradeId || null,
      produce: params.produce,
      description: params.description,
      availableG: params.availableG,
      askPaisaKg: params.askPaisaKg,
      pickupLat: params.pickupLat,
      pickupLng: params.pickupLng,
      pickupUntil: params.pickupUntil,
      status: 'open',
      version: 1,
      growerName: grower ? grower.displayName : 'Local Grower',
    };

    state.listings.unshift(newListing);
    this.saveState(state);
    return { listingId: newListing.id, version: 1 };
  }

  public saveGrade(grade: any): void {
    const state = this.getState();
    state.grades = state.grades || [];
    state.grades.unshift(grade);
    this.saveState(state);
  }

  public getGradeById(gradeId: string): any | null {
    const state = this.getState();
    return (state.grades || []).find((g: any) => g.id === gradeId) || null;
  }

  public createTrade(
    listingId: string,
    storeId: string,
    initiatorAgentId: string,
    deliveryDate: string = '2026-10-31'
  ): { tradeId: string; status: 'negotiating'; deliveryDate: string } {
    const state = this.getState();

    // Check if an active negotiating trade already exists for this store & listing
    const existing = state.trades.find(
      (t) => t.listingId === listingId && t.storeId === storeId && t.status === 'negotiating'
    );
    if (existing) {
      return {
        tradeId: existing.id,
        status: existing.status as 'negotiating',
        deliveryDate: existing.deliveryDate || deliveryDate,
      };
    }

    const tradeId = crypto.randomUUID();
    const newTrade: Trade = {
      id: tradeId,
      listingId,
      storeId,
      status: 'negotiating',
      deliveryDate,
      acceptedOfferId: null,
      deliveredAt: null,
      version: 1,
      createdAt: new Date().toISOString(),
    };

    state.trades.unshift(newTrade);

    // Initial system greeting message
    const msgId = crypto.randomUUID();
    state.messages.push({
      id: msgId,
      tradeId,
      senderId: initiatorAgentId,
      body: 'Salam! Trade room opened. Propose quantity and price to lock in allocation.',
      kind: 'human',
      createdAt: new Date().toISOString(),
    });

    this.saveState(state);
    return { tradeId, status: 'negotiating', deliveryDate };
  }

  public getMessagesAfter(
    tradeId: string,
    afterCreatedAt?: string,
    afterId?: string
  ): Message[] {
    const state = this.getState();
    const tradeMsgs = state.messages.filter((m) => m.tradeId === tradeId);

    if (afterId) {
      const idx = tradeMsgs.findIndex((m) => m.id === afterId);
      if (idx !== -1) {
        return tradeMsgs.slice(idx + 1);
      }
    }

    if (afterCreatedAt) {
      const afterTime = new Date(afterCreatedAt).getTime();
      return tradeMsgs.filter((m) => new Date(m.createdAt).getTime() > afterTime);
    }

    return tradeMsgs;
  }

  public postMessage(
    tradeId: string,
    senderId: string,
    body: string,
    kind: 'human' | 'approved_draft' = 'human'
  ): { messageId: string; createdAt: string } {
    const state = this.getState();
    const trade = state.trades.find((t) => t.id === tradeId);
    if (!trade) throw new Error('Trade not found');

    const msgId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const sender = state.agents.find((a) => a.id === senderId);

    state.messages.push({
      id: msgId,
      tradeId,
      senderId,
      body,
      kind,
      createdAt,
      senderName: sender?.displayName,
      senderRole: sender?.role,
    });

    this.saveState(state);
    return { messageId: msgId, createdAt };
  }

  public createOffer(
    tradeId: string,
    makerId: string,
    qtyG: number,
    pricePaisaKg: number,
    expiresAt: string
  ): { offerId: string; totalPaisa: number } {
    const state = this.getState();
    const trade = state.trades.find((t) => t.id === tradeId);
    if (!trade) throw new Error('Trade not found');
    if (trade.status !== 'negotiating') {
      throw new Error(`Cannot propose offer in ${trade.status} trade`);
    }

    const listing = state.listings.find((l) => l.id === trade.listingId);
    if (!listing) throw new Error('Listing not found');
    if (qtyG > listing.availableG) {
      throw new Error(`Requested ${qtyG / 1000} kg exceeds current available ${listing.availableG / 1000} kg`);
    }

    const offerId = crypto.randomUUID();
    const totalPaisa = calculateTotalPaisa(qtyG, pricePaisaKg);
    const createdAt = new Date().toISOString();
    const maker = state.agents.find((a) => a.id === makerId);

    const offer: Offer = {
      id: offerId,
      tradeId,
      makerId,
      qtyG,
      pricePaisaKg,
      expiresAt,
      createdAt,
      totalPaisa,
      makerRole: maker?.role,
      makerName: maker?.displayName,
    };

    state.offers.unshift(offer);

    // Auto append notification message in feed
    const msgId = crypto.randomUUID();
    state.messages.push({
      id: msgId,
      tradeId,
      senderId: makerId,
      body: `Proposed offer: ${qtyG / 1000} kg @ PKR ${pricePaisaKg / 100}/kg (Total: PKR ${(totalPaisa / 100).toLocaleString()})`,
      kind: 'human',
      createdAt,
    });

    this.saveState(state);
    return { offerId, totalPaisa };
  }

  /**
   * Acceptance transaction:
   * - Enforces Idempotency-Key
   * - Locks listing & trade
   * - Checks remaining stock, ownership, offer expiry, listing expiry and version
   * - Decrements inventory once
   * - Replay with same key & body returns cached response; changed body returns 409
   * - Concurrent accepts must never oversell
   */
  public acceptOffer(
    tradeId: string,
    offerId: string,
    expectedVersion: number,
    actorId: string,
    idempotencyKey?: string,
    requestHash?: string
  ): { tradeId: string; status: 'agreed'; allocatedG: number; totalPaisa: number; version: number } {
    const state = this.getState();

    // Idempotency check
    if (idempotencyKey) {
      const existingKey = state.idempotencyKeys[idempotencyKey];
      if (existingKey) {
        if (requestHash && existingKey.requestHash !== requestHash) {
          throw new Error('CONFLICT: Idempotency-Key reused with different request payload');
        }
        return existingKey.response;
      }
    }

    const trade = state.trades.find((t) => t.id === tradeId);
    if (!trade) throw new Error('NOT_FOUND: Trade not found');
    if (trade.status !== 'negotiating') {
      throw new Error(`CONFLICT: Trade is already ${trade.status}`);
    }
    if (trade.version !== expectedVersion) {
      throw new Error(`CONFLICT: Version mismatch. Expected ${expectedVersion}, got ${trade.version}`);
    }

    const offer = state.offers.find((o) => o.id === offerId && o.tradeId === tradeId);
    if (!offer) throw new Error('NOT_FOUND: Offer not found in this trade');

    // Rule: Only the opposite party accepts an unexpired offer
    if (offer.makerId === actorId) {
      throw new Error('FORBIDDEN: You cannot accept your own proposed offer. Must be accepted by the counterparty.');
    }

    // Check expiry
    if (new Date(offer.expiresAt).getTime() < Date.now()) {
      throw new Error('UNUSABLE_CONTENT: Offer has expired');
    }

    const listing = state.listings.find((l) => l.id === trade.listingId);
    if (!listing) throw new Error('NOT_FOUND: Associated listing not found');

    if (new Date(listing.pickupUntil).getTime() < Date.now()) {
      throw new Error('UNUSABLE_CONTENT: Listing pickup time has expired');
    }

    if (offer.qtyG > listing.availableG) {
      throw new Error(`CONFLICT: Insufficient stock. Available: ${listing.availableG}g, Requested: ${offer.qtyG}g`);
    }

    // Deduct inventory atomically
    listing.availableG -= offer.qtyG;
    listing.version += 1;
    if (listing.availableG === 0) {
      listing.status = 'closed'; // Zero remaining inventory closes listing
    }

    // Update trade
    trade.status = 'agreed';
    trade.acceptedOfferId = offer.id;
    trade.version += 1;

    const totalPaisa = calculateTotalPaisa(offer.qtyG, offer.pricePaisaKg);

    // Auto post confirmation message
    const msgId = crypto.randomUUID();
    state.messages.push({
      id: msgId,
      tradeId,
      senderId: actorId,
      body: `Deal agreed! Locked ${offer.qtyG / 1000} kg @ PKR ${offer.pricePaisaKg / 100}/kg. Total: PKR ${(totalPaisa / 100).toLocaleString()}. Committed for pickup.`,
      kind: 'human',
      createdAt: new Date().toISOString(),
    });

    const response = {
      tradeId: trade.id,
      status: 'agreed' as const,
      allocatedG: offer.qtyG,
      totalPaisa,
      version: trade.version,
    };

    if (idempotencyKey) {
      state.idempotencyKeys[idempotencyKey] = {
        requestHash: requestHash || 'hash',
        response,
      };
    }

    this.saveState(state);
    return response;
  }

  /**
   * Delivery confirmation:
   * Only the receiving buyer marks delivery.
   */
  public deliverTrade(
    tradeId: string,
    expectedVersion: number,
    actorId: string,
    idempotencyKey?: string,
    requestHash?: string
  ): { tradeId: string; status: 'delivered'; deliveredAt: string; version: number } {
    const state = this.getState();

    if (idempotencyKey) {
      const existingKey = state.idempotencyKeys[idempotencyKey];
      if (existingKey) {
        if (requestHash && existingKey.requestHash !== requestHash) {
          throw new Error('CONFLICT: Idempotency-Key reused with different request payload');
        }
        return existingKey.response;
      }
    }

    const trade = state.trades.find((t) => t.id === tradeId);
    if (!trade) throw new Error('NOT_FOUND: Trade not found');
    if (trade.status !== 'agreed') {
      throw new Error(`CONFLICT: Trade must be in 'agreed' state to mark delivered (current: ${trade.status})`);
    }
    if (trade.version !== expectedVersion) {
      throw new Error(`CONFLICT: Version mismatch. Expected ${expectedVersion}, got ${trade.version}`);
    }

    const store = state.stores.find((s) => s.id === trade.storeId);
    if (!store) throw new Error('NOT_FOUND: Store not found');
    if (store.buyerId !== actorId) {
      throw new Error('FORBIDDEN: Only the receiving buyer store owner can confirm physical delivery');
    }

    const deliveredAt = new Date().toISOString();
    trade.status = 'delivered';
    trade.deliveredAt = deliveredAt;
    trade.version += 1;

    // Post delivery celebration message
    const msgId = crypto.randomUUID();
    state.messages.push({
      id: msgId,
      tradeId,
      senderId: actorId,
      body: `Delivery received and verified! Produce stocked on corner store shelf. Onchain reputation score updated.`,
      kind: 'human',
      createdAt: deliveredAt,
    });

    const response = {
      tradeId: trade.id,
      status: 'delivered' as const,
      deliveredAt,
      version: trade.version,
    };

    if (idempotencyKey) {
      state.idempotencyKeys[idempotencyKey] = {
        requestHash: requestHash || 'hash',
        response,
      };
    }

    this.saveState(state);
    return response;
  }
}

export const sandboxRepository = new SandboxRepository();
