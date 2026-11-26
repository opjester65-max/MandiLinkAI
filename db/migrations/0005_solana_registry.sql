-- Migration 0005: Solana Devnet Agent Registry, Wallet Verification & Trade Feedback
-- Dialect: PostgreSQL (Supabase compatible)
-- Enforces: Devnet only, domain-bound challenge, no self-feedback, participant validation, delivered trade check, offchain customer privacy (opaque payload digest).

-- 1. Wallet Challenge: Single-use domain-bound challenge before wallet binding
CREATE TABLE IF NOT EXISTS wallet_challenge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agent(id) ON DELETE CASCADE,
  wallet_pubkey TEXT NOT NULL,
  nonce_hash CHAR(64) NOT NULL UNIQUE,
  domain TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_challenge_lookup
  ON wallet_challenge(agent_id, wallet_pubkey, expires_at)
  WHERE used_at IS NULL;

-- 2. Registry Identity: Devnet onchain registered agent metadata and PDA identity
CREATE TABLE IF NOT EXISTS registry_identity (
  agent_id UUID PRIMARY KEY REFERENCES agent(id) ON DELETE CASCADE,
  cluster TEXT NOT NULL DEFAULT 'devnet' CHECK (cluster = 'devnet'),
  program_id TEXT NOT NULL,
  asset_id TEXT NOT NULL UNIQUE,
  wallet_pubkey TEXT NOT NULL,
  metadata_uri TEXT NOT NULL,
  registration_sig TEXT NOT NULL UNIQUE,
  confirmed_slot BIGINT NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Feedback: Onchain trade reputation feedback with strict constraints
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES trade(id) ON DELETE RESTRICT,
  author_id UUID NOT NULL REFERENCES agent(id) ON DELETE RESTRICT,
  subject_id UUID NOT NULL REFERENCES agent(id) ON DELETE RESTRICT,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  tag TEXT NOT NULL CHECK (tag IN ('on_time', 'as_described', 'communication')),
  payload_digest CHAR(64) NOT NULL,
  signature TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'prepared' CHECK (status IN ('prepared', 'submitted', 'confirmed', 'failed')),
  confirmed_slot BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_feedback_trade_author UNIQUE(trade_id, author_id),
  CONSTRAINT check_no_self_feedback CHECK (author_id <> subject_id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_subject_status
  ON feedback(subject_id, status);

-- 4. Chain Intent: Pre-authorization & non-replay of onchain agent transactions
CREATE TABLE IF NOT EXISTS chain_intent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES agent(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('register', 'feedback')),
  intent_hash CHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'prepared' CHECK (status IN ('prepared', 'submitted', 'confirmed', 'failed')),
  signature TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chain_intent_hash
  ON chain_intent(intent_hash, actor_id);

-- 5. Trigger to enforce participant membership and delivered status for trade feedback
CREATE OR REPLACE FUNCTION validate_feedback_eligibility()
RETURNS TRIGGER AS $$
DECLARE
  v_trade_status TEXT;
  v_grower_id UUID;
  v_buyer_id UUID;
BEGIN
  SELECT t.status, l.grower_id, s.buyer_id
    INTO v_trade_status, v_grower_id, v_buyer_id
    FROM trade t
    JOIN listing l ON t.listing_id = l.id
    JOIN store s ON t.store_id = s.id
   WHERE t.id = NEW.trade_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trade % not found for feedback', NEW.trade_id;
  END IF;

  IF v_trade_status <> 'delivered' THEN
    RAISE EXCEPTION 'Feedback can only be submitted for delivered trades. Current status: %', v_trade_status;
  END IF;

  -- Verify author is either buyer or grower of this trade
  IF NEW.author_id <> v_buyer_id AND NEW.author_id <> v_grower_id THEN
    RAISE EXCEPTION 'Author % is not a participant in trade %', NEW.author_id, NEW.trade_id;
  END IF;

  -- Verify subject is the opposing participant
  IF NEW.author_id = v_buyer_id AND NEW.subject_id <> v_grower_id THEN
    RAISE EXCEPTION 'Buyer author must give feedback to grower % (got %)', v_grower_id, NEW.subject_id;
  END IF;

  IF NEW.author_id = v_grower_id AND NEW.subject_id <> v_buyer_id THEN
    RAISE EXCEPTION 'Grower author must give feedback to buyer % (got %)', v_buyer_id, NEW.subject_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_feedback_eligibility ON feedback;
CREATE TRIGGER trg_validate_feedback_eligibility
  BEFORE INSERT ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION validate_feedback_eligibility();
