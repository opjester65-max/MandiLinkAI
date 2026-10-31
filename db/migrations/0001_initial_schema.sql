-- Migration 0001: Initial Core Schema for MandiLink
-- Dialect: PostgreSQL (Supabase compatible)
-- Timezone assumption: Timestamps in UTC, market dates projected in Asia/Karachi

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Mock or reference auth.users for Supabase environment
CREATE SCHEMA IF NOT EXISTS auth;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'auth' AND tablename = 'users') THEN
    CREATE TABLE auth.users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- 1. Neighborhood
CREATE TABLE IF NOT EXISTS neighborhood (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  CONSTRAINT check_neighborhood_coords CHECK (lat BETWEEN 29.5 AND 30.8 AND lng BETWEEN 71.0 AND 72.0)
);

-- 2. Agent
CREATE TABLE IF NOT EXISTS agent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE RESTRICT,
  role TEXT NOT NULL,
  display_name TEXT NOT NULL,
  neighborhood_id UUID NOT NULL REFERENCES neighborhood(id) ON DELETE RESTRICT,
  wallet_pubkey TEXT UNIQUE,
  CONSTRAINT check_agent_role CHECK (role IN ('grower', 'buyer'))
);

-- 3. Store
CREATE TABLE IF NOT EXISTS store (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES agent(id) ON DELETE RESTRICT,
  neighborhood_id UUID NOT NULL REFERENCES neighborhood(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  CONSTRAINT check_store_coords CHECK (lat BETWEEN 29.5 AND 30.8 AND lng BETWEEN 71.0 AND 72.0)
);

-- 4. Grade (AI Quality Assessment)
CREATE TABLE IF NOT EXISTS grade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grower_id UUID NOT NULL REFERENCES agent(id) ON DELETE RESTRICT,
  image_sha256 CHAR(64) NOT NULL,
  model_id TEXT NOT NULL,
  visual_grade TEXT NOT NULL,
  observations JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT NOT NULL,
  review_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_visual_grade CHECK (visual_grade IN ('A', 'B', 'C', 'uncertain'))
);

-- 5. Listing
CREATE TABLE IF NOT EXISTS listing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grower_id UUID NOT NULL REFERENCES agent(id) ON DELETE RESTRICT,
  grade_id UUID REFERENCES grade(id) ON DELETE SET NULL,
  produce TEXT NOT NULL,
  description TEXT NOT NULL,
  available_g INTEGER NOT NULL,
  ask_paisa_kg INTEGER NOT NULL,
  pickup_lat DOUBLE PRECISION NOT NULL,
  pickup_lng DOUBLE PRECISION NOT NULL,
  pickup_until TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT check_produce_code CHECK (produce IN ('tomato', 'spinach', 'guava')),
  CONSTRAINT check_listing_status CHECK (status IN ('draft', 'open', 'closed')),
  CONSTRAINT check_listing_quantities CHECK (available_g >= 0),
  CONSTRAINT check_listing_ask_price CHECK (ask_paisa_kg > 0),
  CONSTRAINT check_pickup_coords CHECK (pickup_lat BETWEEN 29.5 AND 30.8 AND pickup_lng BETWEEN 71.0 AND 72.0)
);

-- 6. Trade (Pre-declaration without accepted_offer_id FK yet)
CREATE TABLE IF NOT EXISTS trade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listing(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL REFERENCES store(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'negotiating',
  accepted_offer_id UUID,
  delivered_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_trade_status CHECK (status IN ('negotiating', 'agreed', 'delivered', 'cancelled'))
);

-- 7. Offer
CREATE TABLE IF NOT EXISTS offer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES trade(id) ON DELETE CASCADE,
  maker_id UUID NOT NULL REFERENCES agent(id) ON DELETE RESTRICT,
  qty_g INTEGER NOT NULL,
  price_paisa_kg INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_offer_qty CHECK (qty_g > 0),
  CONSTRAINT check_offer_price CHECK (price_paisa_kg > 0),
  CONSTRAINT check_offer_expiry CHECK (expires_at > created_at)
);

-- Circular FK: accepted_offer_id -> offer(id)
ALTER TABLE trade
  ADD CONSTRAINT fk_trade_accepted_offer
  FOREIGN KEY (accepted_offer_id)
  REFERENCES offer(id)
  ON DELETE RESTRICT;

-- 8. Message
CREATE TABLE IF NOT EXISTS message (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES trade(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES agent(id) ON DELETE RESTRICT,
  body TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'human',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_message_kind CHECK (kind IN ('human', 'approved_draft'))
);

-- 9. Request Key (Idempotency storage)
CREATE TABLE IF NOT EXISTS request_key (
  actor_id UUID NOT NULL REFERENCES agent(id) ON DELETE CASCADE,
  key UUID NOT NULL,
  operation TEXT NOT NULL,
  request_hash CHAR(64) NOT NULL,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (actor_id, key)
);
