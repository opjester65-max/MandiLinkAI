-- Migration 0002: Indexes, Constraints & Row Level Security (RLS)
-- Dialect: PostgreSQL

-- Indexes as specified in contract:
-- 1. Index open listings by produce and expiry
CREATE INDEX IF NOT EXISTS idx_listing_open_produce_expiry 
  ON listing (produce, pickup_until) 
  WHERE status = 'open';

-- 2. Index messages by (trade_id, created_at, id) for chronological feed pagination
CREATE INDEX IF NOT EXISTS idx_message_feed 
  ON message (trade_id, created_at ASC, id ASC);

-- 3. Index trades by store and listing
CREATE INDEX IF NOT EXISTS idx_trade_store_listing 
  ON trade (store_id, listing_id);

CREATE INDEX IF NOT EXISTS idx_trade_listing 
  ON trade (listing_id);

CREATE INDEX IF NOT EXISTS idx_offer_trade_created 
  ON offer (trade_id, created_at DESC);

-- Integrity trigger: Enforce that trade.accepted_offer_id belongs to the SAME trade
CREATE OR REPLACE FUNCTION verify_accepted_offer_trade()
RETURNS TRIGGER AS $$
DECLARE
  v_offer_trade_id UUID;
BEGIN
  IF NEW.accepted_offer_id IS NOT NULL THEN
    SELECT trade_id INTO v_offer_trade_id FROM offer WHERE id = NEW.accepted_offer_id;
    IF v_offer_trade_id IS NULL OR v_offer_trade_id <> NEW.id THEN
      RAISE EXCEPTION 'Accepted offer % does not belong to trade %', NEW.accepted_offer_id, NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_verify_accepted_offer ON trade;
CREATE TRIGGER trg_verify_accepted_offer
  BEFORE INSERT OR UPDATE OF accepted_offer_id ON trade
  FOR EACH ROW
  EXECUTE FUNCTION verify_accepted_offer_trade();

-- Invalidation protection: Block updates to listing quantity/status that would invalidate agreed trades
CREATE OR REPLACE FUNCTION protect_agreed_trade_listing()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM trade 
    WHERE listing_id = OLD.id 
      AND status = 'agreed'
  ) THEN
    IF NEW.status = 'draft' THEN
      RAISE EXCEPTION 'Cannot draft listing with active agreed trades';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_agreed_listing ON listing;
CREATE TRIGGER trg_protect_agreed_listing
  BEFORE UPDATE ON listing
  FOR EACH ROW
  EXECUTE FUNCTION protect_agreed_trade_listing();

-- Enable RLS on key tables
ALTER TABLE listing ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer ENABLE ROW LEVEL SECURITY;
ALTER TABLE message ENABLE ROW LEVEL SECURITY;

-- 1. Listings: anyone can view 'open' listings; growers can view/edit their own
CREATE POLICY listing_public_select ON listing
  FOR SELECT
  USING (status = 'open' OR grower_id IN (SELECT id FROM agent WHERE user_id = auth.uid()));

CREATE POLICY listing_grower_manage ON listing
  FOR ALL
  USING (grower_id IN (SELECT id FROM agent WHERE user_id = auth.uid() AND role = 'grower'));

-- 2. Trades: only buyer (store owner) or seller (listing grower) can view or modify
CREATE POLICY trade_participants_access ON trade
  FOR ALL
  USING (
    store_id IN (SELECT s.id FROM store s JOIN agent a ON s.buyer_id = a.id WHERE a.user_id = auth.uid())
    OR
    listing_id IN (SELECT l.id FROM listing l JOIN agent a ON l.grower_id = a.id WHERE a.user_id = auth.uid())
  );

-- 3. Messages & Offers: only trade participants can access
CREATE POLICY message_participants_access ON message
  FOR ALL
  USING (
    trade_id IN (
      SELECT t.id FROM trade t
      JOIN listing l ON t.listing_id = l.id
      JOIN store s ON t.store_id = s.id
      JOIN agent ab ON s.buyer_id = ab.id
      JOIN agent ag ON l.grower_id = ag.id
      WHERE ab.user_id = auth.uid() OR ag.user_id = auth.uid()
    )
  );

CREATE POLICY offer_participants_access ON offer
  FOR ALL
  USING (
    trade_id IN (
      SELECT t.id FROM trade t
      JOIN listing l ON t.listing_id = l.id
      JOIN store s ON t.store_id = s.id
      JOIN agent ab ON s.buyer_id = ab.id
      JOIN agent ag ON l.grower_id = ag.id
      WHERE ab.user_id = auth.uid() OR ag.user_id = auth.uid()
    )
  );
