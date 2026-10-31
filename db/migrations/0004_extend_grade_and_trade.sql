-- Migration 0004: Extend Grade and Trade entities, external keys, and delivery date
-- Dialect: PostgreSQL

-- 1. Extend store with external_key for stable external mappings with Snowflake
ALTER TABLE store
  ADD COLUMN IF NOT EXISTS external_key TEXT UNIQUE;

UPDATE store 
SET external_key = 'GULGASHT_STORE_001' 
WHERE id = '44444444-4444-4444-4444-444444444401';

UPDATE store 
SET external_key = 'BOHAR_MART_002' 
WHERE id = '44444444-4444-4444-4444-444444444402';

-- 2. Extend grade with produce, locale, latency_ms and provider_request_id
ALTER TABLE grade
  ADD COLUMN IF NOT EXISTS produce TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'en-PK',
  ADD COLUMN IF NOT EXISTS latency_ms INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provider_request_id TEXT;

-- Update existing grade record
UPDATE grade
SET produce = 'tomato',
    locale = 'en-PK',
    latency_ms = 450,
    provider_request_id = 'fixture-seed-grade-001'
WHERE id = '55555555-5555-5555-5555-555555555501';

-- 3. Extend trade with delivery_date
ALTER TABLE trade
  ADD COLUMN IF NOT EXISTS delivery_date DATE NOT NULL DEFAULT '2026-10-31';

-- Ensure backfilled trades have delivery_date populated
UPDATE trade
SET delivery_date = '2026-10-31'
WHERE delivery_date IS NULL;
