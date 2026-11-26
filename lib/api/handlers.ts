import crypto from 'node:crypto';
import {
  AcceptOfferRequestSchema,
  ApiErrorResponse,
  ApiSuccessResponse,
  CreateListingRequestSchema,
  CreateMessageRequestSchema,
  CreateOfferRequestSchema,
  CreateTradeRequestSchema,
  DeliverTradeRequestSchema,
  ProduceCodeSchema,
  calculateTotalPaisa,
} from '../contracts';
import { matchSupplyWithDeficits } from '../matching';
import { checkLiveDatabaseCredentials } from '../repositories/livePostgresRepository';
import { sandboxRepository } from '../repositories/marketRepository';

export function makeSuccess<T>(data: T, source: 'sandbox' | 'database' | 'fixture' | 'live' = 'sandbox'): ApiSuccessResponse<T> {
  return {
    data,
    meta: {
      source,
      requestId: crypto.randomUUID(),
    },
  };
}

export function makeError(
  code: ApiErrorResponse['error']['code'],
  message: string,
  retryable: boolean = false
): ApiErrorResponse {
  return {
    error: {
      code,
      message,
      retryable,
    },
    requestId: crypto.randomUUID(),
  };
}

export async function handleGetMarket(query: { date?: string; produce?: string; mode?: string }) {
  const mode = query.mode === 'live' ? 'live' : 'sandbox';
  if (mode === 'live') {
    const creds = checkLiveDatabaseCredentials();
    if (!creds.isConfigured) {
      return { status: 503, body: makeError('MISSING_SUPABASE_OR_POSTGRES_CREDENTIALS', creds.error!.message) };
    }
  }

  const produce = query.produce && ['tomato', 'spinach', 'guava'].includes(query.produce)
    ? (query.produce as any)
    : 'tomato';
  const date = query.date || '2026-10-31';

  const marketData = sandboxRepository.getMarketData(produce, date);
  const matches = matchSupplyWithDeficits(marketData.listings, marketData.gaps);

  return {
    status: 200,
    body: makeSuccess({
      gaps: marketData.gaps,
      listings: marketData.listings,
      matches,
    }),
  };
}

export async function handleCreateListing(body: any, actorId: string, idempotencyKey?: string) {
  if (!idempotencyKey) {
    return { status: 400, body: makeError('INVALID_INPUT', 'Missing Idempotency-Key header') };
  }
  const parsed = CreateListingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return { status: 400, body: makeError('INVALID_INPUT', parsed.error.message) };
  }

  try {
    const result = sandboxRepository.createListing(parsed.data, actorId);
    return { status: 201, body: makeSuccess(result) };
  } catch (err: any) {
    return { status: 500, body: makeError('DEPENDENCY_UNAVAILABLE', err.message) };
  }
}

export async function handleCreateTrade(body: any, actorId: string, idempotencyKey?: string) {
  if (!idempotencyKey) {
    return { status: 400, body: makeError('INVALID_INPUT', 'Missing Idempotency-Key header') };
  }
  const parsed = CreateTradeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return { status: 400, body: makeError('INVALID_INPUT', parsed.error.message) };
  }

  try {
    const result = sandboxRepository.createTrade(parsed.data.listingId, parsed.data.storeId, actorId);
    return { status: 201, body: makeSuccess(result) };
  } catch (err: any) {
    return { status: 500, body: makeError('DEPENDENCY_UNAVAILABLE', err.message) };
  }
}

export async function handleGetTrade(tradeId: string, actorId?: string) {
  const result = sandboxRepository.getTradeById(tradeId);
  if (!result.trade) {
    return { status: 404, body: makeError('NOT_FOUND', `Trade ${tradeId} not found`) };
  }

  // Authorization check: Only participants can read bargaining room in live mode
  const isParticipant =
    !actorId ||
    (result.buyerAgent && result.buyerAgent.id === actorId) ||
    (result.growerAgent && result.growerAgent.id === actorId);

  if (!isParticipant) {
    return { status: 403, body: makeError('FORBIDDEN', 'Only trade participants can read their bargaining room') };
  }

  const allowedActions = [];
  if (result.trade.status === 'negotiating') {
    allowedActions.push('PROPOSE_OFFER', 'POST_MESSAGE', 'ACCEPT_OFFER', 'CANCEL');
  } else if (result.trade.status === 'agreed') {
    allowedActions.push('POST_MESSAGE', 'DELIVER');
  }

  return {
    status: 200,
    body: makeSuccess({
      ...result,
      allowedActions,
    }),
  };
}

export async function handlePostMessage(tradeId: string, body: any, actorId: string) {
  const parsed = CreateMessageRequestSchema.safeParse(body);
  if (!parsed.success) {
    return { status: 400, body: makeError('INVALID_INPUT', parsed.error.message) };
  }

  try {
    const result = sandboxRepository.postMessage(tradeId, actorId, parsed.data.body, parsed.data.kind);
    return { status: 201, body: makeSuccess(result) };
  } catch (err: any) {
    return { status: 404, body: makeError('NOT_FOUND', err.message) };
  }
}

export async function handleCreateOffer(
  tradeId: string,
  body: any,
  actorId: string,
  idempotencyKey?: string
) {
  if (!idempotencyKey) {
    return { status: 400, body: makeError('INVALID_INPUT', 'Missing Idempotency-Key header') };
  }
  const parsed = CreateOfferRequestSchema.safeParse(body);
  if (!parsed.success) {
    return { status: 400, body: makeError('INVALID_INPUT', parsed.error.message) };
  }

  try {
    const result = sandboxRepository.createOffer(
      tradeId,
      actorId,
      parsed.data.qtyG,
      parsed.data.pricePaisaKg,
      parsed.data.expiresAt
    );
    return { status: 201, body: makeSuccess(result) };
  } catch (err: any) {
    return { status: 409, body: makeError('CONFLICT', err.message) };
  }
}

export async function handleAcceptOffer(
  tradeId: string,
  body: any,
  actorId: string,
  idempotencyKey?: string,
  requestHash?: string
) {
  if (!idempotencyKey) {
    return { status: 400, body: makeError('INVALID_INPUT', 'Missing Idempotency-Key header') };
  }
  const parsed = AcceptOfferRequestSchema.safeParse(body);
  if (!parsed.success) {
    return { status: 400, body: makeError('INVALID_INPUT', parsed.error.message) };
  }

  try {
    const result = sandboxRepository.acceptOffer(
      tradeId,
      parsed.data.offerId,
      parsed.data.expectedVersion,
      actorId,
      idempotencyKey,
      requestHash
    );
    return { status: 200, body: makeSuccess(result) };
  } catch (err: any) {
    const msg = err.message || '';
    if (msg.includes('FORBIDDEN')) return { status: 403, body: makeError('FORBIDDEN', msg) };
    if (msg.includes('NOT_FOUND')) return { status: 404, body: makeError('NOT_FOUND', msg) };
    if (msg.includes('UNUSABLE_CONTENT')) return { status: 422, body: makeError('UNUSABLE_CONTENT', msg) };
    return { status: 409, body: makeError('CONFLICT', msg) };
  }
}

export async function handleDeliverTrade(
  tradeId: string,
  body: any,
  actorId: string,
  idempotencyKey?: string,
  requestHash?: string
) {
  if (!idempotencyKey) {
    return { status: 400, body: makeError('INVALID_INPUT', 'Missing Idempotency-Key header') };
  }
  const parsed = DeliverTradeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return { status: 400, body: makeError('INVALID_INPUT', parsed.error.message) };
  }

  try {
    const result = sandboxRepository.deliverTrade(
      tradeId,
      parsed.data.expectedVersion,
      actorId,
      idempotencyKey,
      requestHash
    );
    return { status: 200, body: makeSuccess(result) };
  } catch (err: any) {
    const msg = err.message || '';
    if (msg.includes('FORBIDDEN')) return { status: 403, body: makeError('FORBIDDEN', msg) };
    if (msg.includes('NOT_FOUND')) return { status: 404, body: makeError('NOT_FOUND', msg) };
    return { status: 409, body: makeError('CONFLICT', msg) };
  }
}

export async function handleGradeUpload(
  imageBuffer: Buffer,
  localeStr: string = 'en-PK',
  actorId: string,
  saveBytes: boolean = false,
  filenameHint?: string
) {
  // Authenticate grower against repository agents (not just current default persona)
  const actor = sandboxRepository.getAgentById(actorId);
  if (!actor || actor.role !== 'grower') {
    return { status: 403, body: makeError('FORBIDDEN', 'Only authenticated growers can submit lots for grading') };
  }

  const locale = localeStr === 'ur-PK' ? 'ur-PK' : 'en-PK';

  try {
    const { gradeImageWithGemma } = await import('../providers/gemmaGrade.ts');
    const result = await gradeImageWithGemma(imageBuffer, locale, saveBytes, filenameHint);

    // Save grade record
    sandboxRepository.saveGrade({
      ...result.output,
      id: result.output.gradeId,
      growerId: actorId,
      imageSha256: result.imageSha256,
      modelId: result.respondingModel,
      locale,
      createdAt: new Date().toISOString(),
      providerRequestId: result.providerRequestId,
    });

    return {
      status: 200,
      body: makeSuccess(
        result.output,
        result.sanitizedReceipt.receiptStatus === 'Live Gemini API' ? 'live' : 'sandbox'
      ),
    };
  } catch (err: any) {
    const msg = err.message || '';
    if (msg.includes('INVALID_INPUT')) {
      return { status: 400, body: makeError('INVALID_INPUT', msg.replace('INVALID_INPUT: ', '')) };
    }
    return { status: 500, body: makeError('DEPENDENCY_UNAVAILABLE', msg) };
  }
}

export async function handleMarketStrategy(body: any) {
  const date = typeof body?.date === 'string' ? body.date : '2026-10-31';
  const produce =
    body?.produce && ['tomato', 'spinach', 'guava'].includes(body.produce) ? body.produce : 'tomato';

  try {
    const market = sandboxRepository.getMarketData(produce, date);
    const { matchSupplyWithDeficits } = await import('../matching/index.ts');
    const matches = matchSupplyWithDeficits(market.listings, market.gaps);
    const { generateSupplyChainStrategy } = await import('../providers/marketStrategist.ts');
    const strategy = await generateSupplyChainStrategy({
      date,
      produce,
      gaps: Array.isArray(body?.gaps) && body.gaps.length > 0 ? body.gaps : market.gaps,
      matches:
        Array.isArray(body?.matches) &&
        body.matches.length > 0 &&
        body.matches.every((m: any) => m && m.listing && typeof m.listing.availableG === 'number')
          ? body.matches
          : matches,
    });
    return {
      status: 200,
      body: makeSuccess(strategy, strategy.executionMode === 'Live Gemini API' ? 'live' : 'sandbox'),
    };
  } catch (err: any) {
    return { status: 500, body: makeError('DEPENDENCY_UNAVAILABLE', err.message) };
  }
}

export async function handleGetForecast(query: { date?: string; produce?: string }) {
  const produce = query.produce && ['tomato', 'spinach', 'guava'].includes(query.produce)
    ? (query.produce as any)
    : 'tomato';
  const date = query.date || '2026-10-31';

  try {
    const { executeDeficitForecast } = await import('../providers/snowflakeForecast.ts');
    const forecast = await executeDeficitForecast(date, produce);
    return {
      status: 200,
      body: makeSuccess(forecast, 'database'),
    };
  } catch (err: any) {
    return { status: 500, body: makeError('DEPENDENCY_UNAVAILABLE', err.message) };
  }
}

export async function handleTradeAssist(tradeId: string, body: any, actorId: string) {
  const tradeResult = sandboxRepository.getTradeById(tradeId);
  const sandboxCtx = body?.sandboxContext;

  let resolvedTrade = tradeResult.trade;
  let resolvedListing = tradeResult.listing;
  let role: 'buyer' | 'grower' | null = null;
  let recentMessages = tradeResult.messages;

  if (resolvedTrade && resolvedListing) {
    const isBuyer = tradeResult.store && tradeResult.store.buyerId === actorId;
    const isGrower = resolvedListing.growerId === actorId;
    if (!isBuyer && !isGrower) {
      return { status: 403, body: makeError('FORBIDDEN', 'Only trade participants can request AI bargaining assist') };
    }
    role = isBuyer ? 'buyer' : 'grower';
  } else if (sandboxCtx && typeof sandboxCtx === 'object') {
    const knownActor = sandboxRepository.getAgentById(actorId);
    if (!knownActor) {
      return { status: 403, body: makeError('FORBIDDEN', 'Only trade participants can request AI bargaining assist') };
    }
    const produce = ['tomato', 'spinach', 'guava'].includes(sandboxCtx.produce)
      ? sandboxCtx.produce
      : 'tomato';
    const availableG =
      typeof sandboxCtx.availableG === 'number' && sandboxCtx.availableG > 0
        ? Math.round(sandboxCtx.availableG)
        : 30000;
    const askPaisaKg =
      typeof sandboxCtx.askPaisaKg === 'number' && sandboxCtx.askPaisaKg > 0
        ? Math.round(sandboxCtx.askPaisaKg)
        : 12000;

    role = knownActor.role === 'grower' ? 'grower' : 'buyer';
    resolvedTrade = {
      id: tradeId,
      listingId: typeof sandboxCtx.listingId === 'string' ? sandboxCtx.listingId : '66666666-6666-6666-6666-666666666601',
      storeId: '44444444-4444-4444-4444-444444444401',
      status: 'negotiating',
      deliveryDate: '2026-10-31',
      acceptedOfferId: null,
      deliveredAt: null,
      version: 1,
      createdAt: new Date().toISOString(),
    };
    resolvedListing = {
      id: resolvedTrade.listingId,
      growerId: '33333333-3333-3333-3333-333333333302',
      produce,
      description: `Fresh ${produce} harvest`,
      availableG,
      askPaisaKg,
      pickupLat: 30.2455,
      pickupLng: 71.4718,
      pickupUntil: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
      status: 'open',
      version: 1,
      growerName: 'Bibi Fatima · Chenab Community Garden',
    };
    recentMessages = Array.isArray(sandboxCtx.recentMessages) ? sandboxCtx.recentMessages : [];
  } else {
    return { status: 404, body: makeError('NOT_FOUND', 'Trade or listing not found') };
  }

  const intent = ['draft', 'counter', 'explain'].includes(body.intent) ? body.intent : 'draft';
  const locale = body.locale === 'ur-PK' ? 'ur-PK' : 'en-PK';
  const instruction = typeof body.instruction === 'string' ? body.instruction : 'Offer terms';

  try {
    const { generateBargainingAssistance } = await import('../providers/bargainingAssist.ts');
    const result = await generateBargainingAssistance(
      { intent, locale, instruction },
      {
        trade: resolvedTrade,
        listing: resolvedListing,
        role: role!,
        recentMessages: recentMessages.slice(-5).map((m: any) => ({
          senderRole: m.senderRole,
          body: String(m.body || ''),
        })),
      }
    );

    return {
      status: 200,
      body: makeSuccess(result, result.executionMode === 'Live Gemini API' ? 'live' : 'sandbox'),
    };
  } catch (err: any) {
    return { status: 500, body: makeError('DEPENDENCY_UNAVAILABLE', err.message) };
  }
}

export async function handleGetTradeMessages(
  tradeId: string,
  afterCreatedAt?: string,
  afterId?: string,
  actorId?: string
) {
  const tradeResult = sandboxRepository.getTradeById(tradeId);
  if (!tradeResult.trade) {
    return { status: 404, body: makeError('NOT_FOUND', 'Trade not found') };
  }

  const isParticipant =
    !actorId ||
    (tradeResult.buyerAgent && tradeResult.buyerAgent.id === actorId) ||
    (tradeResult.growerAgent && tradeResult.growerAgent.id === actorId);

  if (!isParticipant) {
    return { status: 403, body: makeError('FORBIDDEN', 'Only trade participants can read messages') };
  }

  const messages = sandboxRepository.getMessagesAfter(tradeId, afterCreatedAt, afterId);
  return {
    status: 200,
    body: makeSuccess({ messages }),
  };
}

export async function handleWalletChallenge(body: any) {
  if (!body.agentId || !body.walletPubkey || !body.domain) {
    return { status: 400, body: makeError('INVALID_INPUT', 'agentId, walletPubkey, and domain are required') };
  }
  try {
    const { createWalletChallenge } = await import('../providers/solanaRegistry.ts');
    const challenge = createWalletChallenge(body.agentId, body.walletPubkey, body.domain);
    return { status: 200, body: makeSuccess(challenge) };
  } catch (err: any) {
    return { status: 400, body: makeError('INVALID_INPUT', err.message) };
  }
}

export async function handleWalletVerify(body: any) {
  if (!body.nonce || !body.signature || !body.walletPubkey) {
    return { status: 400, body: makeError('INVALID_INPUT', 'nonce, signature, and walletPubkey are required') };
  }
  try {
    const { verifyWalletChallenge } = await import('../providers/solanaRegistry.ts');
    const result = verifyWalletChallenge(body.nonce, body.signature, body.walletPubkey);
    return { status: 200, body: makeSuccess(result) };
  } catch (err: any) {
    return { status: 400, body: makeError('INVALID_INPUT', err.message) };
  }
}

export async function handleAgentProof(agentId: string) {
  try {
    const { getAgentReputationProof } = await import('../providers/solanaRegistry.ts');
    const proof = getAgentReputationProof(agentId);
    return { status: 200, body: makeSuccess(proof) };
  } catch (err: any) {
    return { status: 404, body: makeError('NOT_FOUND', err.message) };
  }
}

export async function handleAgentMetadata(agentId: string) {
  try {
    const { getAgentReputationProof } = await import('../providers/solanaRegistry.ts');
    const proof = getAgentReputationProof(agentId);
    const metadata = {
      standard: 'QuantuLabs-8004-v1',
      agentId: proof.agentId,
      name: proof.displayName,
      role: proof.role,
      pubkey: proof.walletPubkey,
      accountPda: proof.accountPda,
      reputationScore: proof.reputationScore,
      cluster: 'devnet',
      serviceEndpoints: {
        market: '/api/market',
        trades: '/api/trades',
        proof: `/api/agents/${agentId}/proof`,
      },
    };
    return { status: 200, body: metadata };
  } catch (err: any) {
    return { status: 404, body: makeError('NOT_FOUND', err.message) };
  }
}

export async function handleRegistryPrepare(body: any, actorId: string) {
  const { action, payload } = body;
  if (!action || !['register', 'feedback'].includes(action)) {
    return { status: 400, body: makeError('INVALID_INPUT', 'action must be "register" or "feedback"') };
  }

  try {
    const { deriveAgentPda, deriveFeedbackPda, SOLANA_CONFIG } = await import('../providers/solanaRegistry.ts');
    const intentId = crypto.randomUUID();

    if (action === 'register') {
      const { walletPubkey } = payload || {};
      if (!walletPubkey) {
        return { status: 400, body: makeError('INVALID_INPUT', 'Missing walletPubkey in registration payload') };
      }
      const { pda } = deriveAgentPda(walletPubkey);
      const intentHash = crypto.createHash('sha256').update(`${actorId}:${walletPubkey}:${pda}`).digest('hex');
      return {
        status: 200,
        body: makeSuccess({
          intentId,
          action,
          actorId,
          targetPda: pda,
          programId: SOLANA_CONFIG.programId,
          cluster: SOLANA_CONFIG.cluster,
          intentHash,
          instruction: 'RegisterAgentIdentity',
          message: `Confirm registration for agent ${actorId} on Solana Devnet`,
        }),
      };
    } else {
      // Feedback
      const { tradeId, rating, tag, subjectId } = payload || {};
      if (!tradeId || !rating || !tag || !subjectId) {
        return { status: 400, body: makeError('INVALID_INPUT', 'tradeId, subjectId, rating, and tag required') };
      }
      const { pda } = deriveFeedbackPda(tradeId);
      const intentHash = crypto.createHash('sha256').update(`${tradeId}:${actorId}:${subjectId}:${rating}`).digest('hex');
      return {
        status: 200,
        body: makeSuccess({
          intentId,
          action,
          actorId,
          targetPda: pda,
          programId: SOLANA_CONFIG.programId,
          cluster: SOLANA_CONFIG.cluster,
          intentHash,
          instruction: 'RecordTradeFeedback',
          message: `Record ${rating}-star feedback for trade ${tradeId} on Solana Devnet`,
        }),
      };
    }
  } catch (err: any) {
    return { status: 500, body: makeError('DEPENDENCY_UNAVAILABLE', err.message) };
  }
}

export async function handleRegistryConfirm(body: any, _actorId: string) {
  const { intentId, signature, action, payload } = body;
  if (!intentId || !signature) {
    return { status: 400, body: makeError('INVALID_INPUT', 'intentId and signature required') };
  }

  try {
    const { submitTradeFeedback, registerAgentIdentity } = await import('../providers/solanaRegistry.ts');
    if (action === 'feedback') {
      const fb = submitTradeFeedback(
        payload.tradeId,
        payload.authorId,
        payload.subjectId,
        payload.rating,
        payload.tag,
        signature
      );
      return { status: 200, body: makeSuccess(fb) };
    } else if (action === 'register') {
      const reg = registerAgentIdentity(
        payload.agentId,
        payload.walletPubkey,
        payload.role,
        payload.displayName,
        signature
      );
      return { status: 200, body: makeSuccess(reg) };
    }
    return { status: 200, body: makeSuccess({ confirmed: true, intentId, signature }) };
  } catch (err: any) {
    return { status: 400, body: makeError('INVALID_INPUT', err.message) };
  }
}

