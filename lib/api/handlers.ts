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
  saveBytes: boolean = false
) {
  // Authenticate grower
  const actor = sandboxRepository.getCurrentUserAgent();
  if (actor.role !== 'grower' && actor.id !== actorId) {
    // Check if actor is grower
    return { status: 403, body: makeError('FORBIDDEN', 'Only authenticated growers can submit lots for grading') };
  }

  const locale = localeStr === 'ur-PK' ? 'ur-PK' : 'en-PK';

  try {
    const { gradeImageWithGemma } = await import('../providers/gemmaGrade.ts');
    const result = await gradeImageWithGemma(imageBuffer, locale, saveBytes);

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
      body: makeSuccess(result.output, result.sanitizedReceipt.receiptStatus.toLowerCase() as any),
    };
  } catch (err: any) {
    const msg = err.message || '';
    if (msg.includes('INVALID_INPUT')) {
      return { status: 400, body: makeError('INVALID_INPUT', msg.replace('INVALID_INPUT: ', '')) };
    }
    return { status: 500, body: makeError('DEPENDENCY_UNAVAILABLE', msg) };
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
  if (!tradeResult.trade || !tradeResult.listing) {
    return { status: 404, body: makeError('NOT_FOUND', 'Trade or listing not found') };
  }

  const isBuyer = tradeResult.store && tradeResult.store.buyerId === actorId;
  const isGrower = tradeResult.listing && tradeResult.listing.growerId === actorId;
  if (!isBuyer && !isGrower) {
    return { status: 403, body: makeError('FORBIDDEN', 'Only trade participants can request AI bargaining assist') };
  }

  const intent = ['draft', 'counter', 'explain'].includes(body.intent) ? body.intent : 'draft';
  const locale = body.locale === 'ur-PK' ? 'ur-PK' : 'en-PK';
  const instruction = typeof body.instruction === 'string' ? body.instruction : 'Offer terms';

  try {
    const { generateBargainingAssistance } = await import('../providers/bargainingAssist.ts');
    const result = await generateBargainingAssistance(
      { intent, locale, instruction },
      {
        trade: tradeResult.trade,
        listing: tradeResult.listing,
        role: isBuyer ? 'buyer' : 'grower',
        recentMessages: tradeResult.messages.slice(-5).map((m) => ({
          senderRole: m.senderRole,
          body: m.body,
        })),
      }
    );

    return {
      status: 200,
      body: makeSuccess(result),
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
