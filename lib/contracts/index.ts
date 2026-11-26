import { z } from 'zod';

export const ProduceCodeSchema = z.enum(['tomato', 'spinach', 'guava']);
export type ProduceCode = z.infer<typeof ProduceCodeSchema>;

export const VisualGradeSchema = z.enum(['A', 'B', 'C', 'uncertain']);
export type VisualGrade = z.infer<typeof VisualGradeSchema>;

export const ListingStatusSchema = z.enum(['draft', 'open', 'closed']);
export type ListingStatus = z.infer<typeof ListingStatusSchema>;

export const TradeStatusSchema = z.enum(['negotiating', 'agreed', 'delivered', 'cancelled']);
export type TradeStatus = z.infer<typeof TradeStatusSchema>;

export const RoleSchema = z.enum(['grower', 'buyer']);
export type Role = z.infer<typeof RoleSchema>;

export const MessageKindSchema = z.enum(['human', 'approved_draft']);
export type MessageKind = z.infer<typeof MessageKindSchema>;

// Shared Envelopes
export interface ApiSuccessMeta {
  source: 'database' | 'sandbox' | 'fixture' | 'live';
  requestId: string;
}

export interface ApiSuccessResponse<T> {
  data: T;
  meta: ApiSuccessMeta;
}

export interface ApiErrorDetail {
  code:
    | 'INVALID_INPUT'
    | 'UNAUTHENTICATED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'CONFLICT'
    | 'UNUSABLE_CONTENT'
    | 'THROTTLED'
    | 'DEPENDENCY_UNAVAILABLE'
    | 'MISSING_SUPABASE_OR_POSTGRES_CREDENTIALS';
  message: string;
  retryable: boolean;
}

export interface ApiErrorResponse {
  error: ApiErrorDetail;
  requestId: string;
}

// Entity schemas
export const NeighborhoodSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  lat: z.number().min(29.5).max(30.8),
  lng: z.number().min(71.0).max(72.0),
});
export type Neighborhood = z.infer<typeof NeighborhoodSchema>;

export const AgentSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  role: RoleSchema,
  displayName: z.string().min(1),
  neighborhoodId: z.string().uuid(),
  walletPubkey: z.string().nullable().optional(),
  reputationScore: z.number().min(0).max(100).optional(),
});
export type Agent = z.infer<typeof AgentSchema>;

export const StoreSchema = z.object({
  id: z.string().uuid(),
  buyerId: z.string().uuid(),
  neighborhoodId: z.string().uuid(),
  name: z.string().min(1),
  lat: z.number().min(29.5).max(30.8),
  lng: z.number().min(71.0).max(72.0),
});
export type Store = z.infer<typeof StoreSchema>;


export const ListingSchema = z.object({
  id: z.string().uuid(),
  growerId: z.string().uuid(),
  gradeId: z.string().uuid().nullable().optional(),
  produce: ProduceCodeSchema,
  description: z.string().min(1),
  availableG: z.number().int().nonnegative(),
  askPaisaKg: z.number().int().positive(),
  pickupLat: z.number().min(29.5).max(30.8),
  pickupLng: z.number().min(71.0).max(72.0),
  pickupUntil: z.string().datetime(),
  status: ListingStatusSchema,
  version: z.number().int().positive().default(1),
  growerName: z.string().optional(),
});
export type Listing = z.infer<typeof ListingSchema>;

export const OfferSchema = z.object({
  id: z.string().uuid(),
  tradeId: z.string().uuid(),
  makerId: z.string().uuid(),
  qtyG: z.number().int().positive(),
  pricePaisaKg: z.number().int().positive(),
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  totalPaisa: z.number().int().nonnegative().optional(),
  makerRole: RoleSchema.optional(),
  makerName: z.string().optional(),
});
export type Offer = z.infer<typeof OfferSchema>;

export const MessageSchema = z.object({
  id: z.string().uuid(),
  tradeId: z.string().uuid(),
  senderId: z.string().uuid(),
  body: z.string().min(1),
  kind: MessageKindSchema,
  createdAt: z.string().datetime(),
  senderName: z.string().optional(),
  senderRole: RoleSchema.optional(),
});
export type Message = z.infer<typeof MessageSchema>;

export const GradeProduceCodeSchema = z.enum(['tomato', 'spinach', 'guava', 'unknown']);
export type GradeProduceCode = z.infer<typeof GradeProduceCodeSchema>;

export const LocaleCodeSchema = z.enum(['en-PK', 'ur-PK']);
export type LocaleCode = z.infer<typeof LocaleCodeSchema>;

export const AssistIntentSchema = z.enum(['draft', 'counter', 'explain']);
export type AssistIntent = z.infer<typeof AssistIntentSchema>;

export const ForecastBasisSchema = z.enum(['store_history', 'neighborhood_pooled', 'insufficient_data']);
export type ForecastBasis = z.infer<typeof ForecastBasisSchema>;

export const GradeOutputSchema = z.object({
  gradeId: z.string().uuid(),
  produce: GradeProduceCodeSchema,
  visualGrade: VisualGradeSchema,
  confidenceScore: z.number().int().min(0).max(100).optional(),
  observations: z.array(z.string()).max(3),
  description: z.string().max(250),
  suggestedPricePaisaKg: z.number().int().positive().optional(),
  reviewRequired: z.boolean(),
  modelId: z.string(),
  executionMode: z.enum(['Live Gemini API', 'Gemini Edge Fallback']).optional(),
  latencyMs: z.number().int().nonnegative(),
});
export type GradeOutput = z.infer<typeof GradeOutputSchema>;

export const AssistRequestSchema = z.object({
  intent: AssistIntentSchema,
  locale: LocaleCodeSchema.default('en-PK'),
  instruction: z.string().min(1).max(500),
});
export type AssistRequest = z.infer<typeof AssistRequestSchema>;

export const AssistResponseSchema = z.object({
  draftText: z.string(),
  suggestedOffer: z
    .object({
      qtyG: z.number().int().positive(),
      pricePaisaKg: z.number().int().positive(),
    })
    .nullable(),
  modelId: z.string(),
  executionMode: z.enum(['Live Gemini API', 'Gemini Edge Fallback']).optional(),
  requiresApproval: z.literal(true),
});
export type AssistResponse = z.infer<typeof AssistResponseSchema>;

export const ForecastRowSchema = z.object({
  storeKey: z.string(),
  neighborhoodKey: z.string(),
  displayName: z.string().optional(),
  expectedG: z.number().nullable(),
  plannedG: z.number().nullable(),
  baselineGapG: z.number().nullable(),
  committedG: z.number().default(0),
  deliveredG: z.number().default(0),
  remainingGapG: z.number().nullable(),
  sampleN: z.number().int().nonnegative(),
  basis: ForecastBasisSchema,
  households: z.number().nullable(),
  kgGapPer1000Households: z.number().nullable(),
  dataClass: z.string(),
});
export type ForecastRow = z.infer<typeof ForecastRowSchema>;

export const ForecastResponseSchema = z.object({
  rows: z.array(ForecastRowSchema),
  queryId: z.string(),
  queriedAt: z.string().datetime(),
  cachedAt: z.string().datetime().nullable(),
  sourceClassification: z.string().default('Live Snowflake query & Synthetic data'),
});
export type ForecastResponse = z.infer<typeof ForecastResponseSchema>;

export const GradeSchema = z.object({
  id: z.string().uuid(),
  growerId: z.string().uuid(),
  imageSha256: z.string().length(64),
  modelId: z.string().min(1),
  produce: GradeProduceCodeSchema.default('unknown'),
  locale: LocaleCodeSchema.default('en-PK'),
  visualGrade: VisualGradeSchema,
  observations: z.array(z.string()).default([]),
  description: z.string(),
  reviewRequired: z.boolean(),
  latencyMs: z.number().int().nonnegative().default(0),
  providerRequestId: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
});
export type Grade = z.infer<typeof GradeSchema>;

export const TradeSchema = z.object({
  id: z.string().uuid(),
  listingId: z.string().uuid(),
  storeId: z.string().uuid(),
  status: TradeStatusSchema,
  deliveryDate: z.string().default('2026-10-31'),
  acceptedOfferId: z.string().uuid().nullable().optional(),
  deliveredAt: z.string().datetime().nullable().optional(),
  version: z.number().int().positive().default(1),
  createdAt: z.string().datetime(),
  // Derived fields for UI hydration
  listing: ListingSchema.optional(),
  store: StoreSchema.optional(),
  acceptedOffer: OfferSchema.nullable().optional(),
});
export type Trade = z.infer<typeof TradeSchema>;

export const DeficitGapSchema = z.object({
  neighborhoodId: z.string().uuid(),
  neighborhoodName: z.string(),
  storeId: z.string().uuid(),
  storeName: z.string(),
  produce: ProduceCodeSchema,
  date: z.string(), // YYYY-MM-DD
  dayOfWeek: z.string(),
  estimatedDemandKg: z.number().nonnegative(),
  plannedSupplyKg: z.number().nonnegative(),
  committedInboundKg: z.number().nonnegative().default(0),
  deliveredSupplyKg: z.number().nonnegative().default(0),
  gapKg: z.number().nonnegative(),
  riskTier: z.enum(['CRITICAL_SHORTAGE', 'MODERATE_SHORTAGE', 'BALANCED']),
  snowflakeReceipt: z.string(),
});
export type DeficitGap = z.infer<typeof DeficitGapSchema>;

export const SupplyMatchSchema = z.object({
  id: z.string().uuid(),
  listingId: z.string().uuid(),
  listing: ListingSchema,
  gap: DeficitGapSchema,
  distanceKm: z.number(),
  estTransitMinutes: z.number(),
  matchScore: z.number().min(0).max(100),
  suggestedAction: z.string(),
});
export type SupplyMatch = z.infer<typeof SupplyMatchSchema>;

export const CreateListingRequestSchema = z.object({
  gradeId: z.string().uuid().nullable().optional(),
  produce: ProduceCodeSchema,
  description: z.string().min(1),
  availableG: z.number().int().positive(),
  askPaisaKg: z.number().int().positive(),
  pickupLat: z.number().min(29.5).max(30.8),
  pickupLng: z.number().min(71.0).max(72.0),
  pickupUntil: z.string().datetime(),
});

export const CreateTradeRequestSchema = z.object({
  listingId: z.string().uuid(),
  storeId: z.string().uuid(),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default('2026-10-31'),
});

export const CreateMessageRequestSchema = z.object({
  body: z.string().min(1),
  kind: MessageKindSchema.default('human'),
});

export const CreateOfferRequestSchema = z.object({
  qtyG: z.number().int().positive(),
  pricePaisaKg: z.number().int().positive(),
  expiresAt: z.string().datetime(),
});

export const AcceptOfferRequestSchema = z.object({
  offerId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
});

export const DeliverTradeRequestSchema = z.object({
  expectedVersion: z.number().int().positive(),
});

// Helper for Paisa <-> PKR
export function paisaToPkr(paisa: number): number {
  return paisa / 100;
}

export function pkrToPaisa(pkr: number): number {
  return Math.round(pkr * 100);
}

// Exact rounding helper using BigInt intermediate
export function calculateTotalPaisa(qtyG: number, pricePaisaKg: number): number {
  // Total = (qtyG * pricePaisaKg) / 1000 grams
  const bigQty = BigInt(Math.floor(qtyG));
  const bigPrice = BigInt(Math.floor(pricePaisaKg));
  const numerator = bigQty * bigPrice;
  // Divide by 1000 with round to nearest
  const quotient = numerator / 1000n;
  const remainder = numerator % 1000n;
  const rounded = remainder >= 500n ? quotient + 1n : quotient;
  return Number(rounded);
}
