import { ApiErrorDetail } from '../contracts';

export class LiveConfigurationError extends Error {
  public detail: ApiErrorDetail;

  constructor(message: string) {
    super(message);
    this.name = 'LiveConfigurationError';
    this.detail = {
      code: 'MISSING_SUPABASE_OR_POSTGRES_CREDENTIALS',
      message,
      retryable: false,
    };
  }
}

export function checkLiveDatabaseCredentials(): { isConfigured: boolean; error?: ApiErrorDetail } {
  const hasSupabase =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasPg = Boolean(process.env.DATABASE_URL);

  if (!hasSupabase && !hasPg) {
    return {
      isConfigured: false,
      error: {
        code: 'MISSING_SUPABASE_OR_POSTGRES_CREDENTIALS',
        message:
          'Live database credentials (SUPABASE_URL / DATABASE_URL) are not set in the environment. The Public Practice Sandbox is active with isolated browser state and full verification capabilities.',
        retryable: false,
      },
    };
  }

  return { isConfigured: true };
}

/**
 * Parameterized SQL templates for live Vercel / Node handlers
 */
export const LIVE_SQL = {
  getOpenListings: `
    SELECT 
      l.id, l.grower_id AS "growerId", l.grade_id AS "gradeId", l.produce, 
      l.description, l.available_g AS "availableG", l.ask_paisa_kg AS "askPaisaKg",
      l.pickup_lat AS "pickupLat", l.pickup_lng AS "pickupLng", l.pickup_until AS "pickupUntil",
      l.status, l.version, a.display_name AS "growerName"
    FROM listing l
    JOIN agent a ON l.grower_id = a.id
    WHERE l.produce = $1 AND l.status = 'open' AND l.pickup_until > NOW()
    ORDER BY l.available_g DESC;
  `,

  getTradeById: `
    SELECT 
      t.id, t.listing_id AS "listingId", t.store_id AS "storeId", t.status, 
      t.accepted_offer_id AS "acceptedOfferId", t.delivered_at AS "deliveredAt", 
      t.version, t.created_at AS "createdAt"
    FROM trade t
    WHERE t.id = $1;
  `,

  lockListingAndTrade: `
    SELECT l.id, l.available_g, l.status, l.version
    FROM listing l
    WHERE l.id = $1
    FOR UPDATE;
  `,

  acceptOfferTransaction: `
    UPDATE listing 
    SET available_g = available_g - $1, 
        version = version + 1,
        status = CASE WHEN available_g - $1 = 0 THEN 'closed' ELSE status END
    WHERE id = $2 AND available_g >= $1 AND status = 'open';
  `,
};
