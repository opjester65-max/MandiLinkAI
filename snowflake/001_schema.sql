-- Snowflake Schema: 001_schema.sql
-- Database & Schema: MANDILINK_ANALYTICS.PUBLIC (or configurable via env)
-- Grain Definition & Deduplicated Staging

CREATE TABLE IF NOT EXISTS NEIGHBORHOOD_PROFILE (
  neighborhood_key VARCHAR NOT NULL,
  profile_year NUMBER(4,0) NOT NULL,
  households NUMBER(12,0) NOT NULL,
  source_name VARCHAR NOT NULL,
  source_url VARCHAR,
  data_class VARCHAR NOT NULL, -- 'SYNTHETIC_CENSUS' or 'OBSERVED_EXTRACT'
  PRIMARY KEY (neighborhood_key, profile_year)
);

CREATE TABLE IF NOT EXISTS STORE (
  store_key VARCHAR PRIMARY KEY,
  neighborhood_key VARCHAR NOT NULL,
  display_name VARCHAR NOT NULL
);

CREATE TABLE IF NOT EXISTS PURCHASE_DAY (
  store_key VARCHAR NOT NULL,
  produce VARCHAR NOT NULL, -- 'tomato' | 'spinach' | 'guava'
  market_date DATE NOT NULL,
  sold_g NUMBER(14,0) NOT NULL,
  unfilled_request_g NUMBER(14,0) NOT NULL,
  observed BOOLEAN NOT NULL DEFAULT TRUE,
  source_batch VARCHAR NOT NULL,
  PRIMARY KEY (store_key, produce, market_date)
);

CREATE TABLE IF NOT EXISTS SUPPLY_PLAN (
  store_key VARCHAR NOT NULL,
  produce VARCHAR NOT NULL,
  market_date DATE NOT NULL,
  planned_g NUMBER(14,0) NOT NULL, -- Excludes MandiLink allocations
  source_batch VARCHAR NOT NULL,
  PRIMARY KEY (store_key, produce, market_date)
);

CREATE TABLE IF NOT EXISTS SOURCE_MANIFEST (
  source_name VARCHAR PRIMARY KEY,
  geography VARCHAR NOT NULL,
  release_date DATE NOT NULL,
  grain VARCHAR NOT NULL,
  license VARCHAR NOT NULL,
  status VARCHAR NOT NULL -- 'SYNTHETIC' | 'OBSERVED'
);

-- Seed Source Manifest
INSERT INTO SOURCE_MANIFEST (source_name, geography, release_date, grain, license, status) VALUES
  ('MULTAN_URBAN_SYNTHETIC_CENSUS_2026', 'Multan Urban Division, Punjab, Pakistan', '2026-01-15', 'Neighborhood Year', 'ODC-BY-1.0', 'SYNTHETIC'),
  ('MULTAN_RETAIL_SURPLUS_PANEL_2026', 'Multan Corner Convenience Stores', '2026-10-01', 'Store Produce Date', 'Proprietary Research (Ahmad)', 'SYNTHETIC');

-- Seed Neighborhood Profiles
INSERT INTO NEIGHBORHOOD_PROFILE (neighborhood_key, profile_year, households, source_name, source_url, data_class) VALUES
  ('gulgasht', 2026, 8400, 'MULTAN_URBAN_SYNTHETIC_CENSUS_2026', 'https://data.multan.gov.pk/census/synthetic-extract', 'SYNTHETIC_CENSUS'),
  ('shah-rukne-alam', 2026, 11200, 'MULTAN_URBAN_SYNTHETIC_CENSUS_2026', 'https://data.multan.gov.pk/census/synthetic-extract', 'SYNTHETIC_CENSUS'),
  ('bohar-gate', 2026, 6300, 'MULTAN_URBAN_SYNTHETIC_CENSUS_2026', 'https://data.multan.gov.pk/census/synthetic-extract', 'SYNTHETIC_CENSUS'),
  ('chenab-belt', 2026, 2100, 'MULTAN_URBAN_SYNTHETIC_CENSUS_2026', 'https://data.multan.gov.pk/census/synthetic-extract', 'SYNTHETIC_CENSUS');

-- Seed Stores
INSERT INTO STORE (store_key, neighborhood_key, display_name) VALUES
  ('GULGASHT_STORE_001', 'gulgasht', 'Gulgasht Corner Store'),
  ('BOHAR_MART_002', 'bohar-gate', 'Bohar Gate Daily Mart'),
  ('NEW_STORE_NO_HISTORY_003', 'gulgasht', 'Al-Madina Mini Mart (New Store)');

-- Seed Supply Plan for Friday 2026-10-31
-- Excludes MandiLink local surplus allocations
INSERT INTO SUPPLY_PLAN (store_key, produce, market_date, planned_g, source_batch) VALUES
  ('GULGASHT_STORE_001', 'tomato', '2026-10-31', 14000, 'BATCH_COMMERCIAL_INFLOW_2026W44'),
  ('BOHAR_MART_002', 'tomato', '2026-10-31', 10000, 'BATCH_COMMERCIAL_INFLOW_2026W44');

-- Seed 8 Preceding Matching Fridays for Gulgasht Corner Store (Target Friday: 2026-10-31)
-- Mean demand: exactly 38,000 g (38 kg)
-- 2026-09-05: 26,000 + 12,000 = 38,000 g
-- 2026-09-12: 28,000 + 10,000 = 38,000 g
-- 2026-09-19: 25,000 + 13,000 = 38,000 g
-- 2026-09-26: 30,000 +  8,000 = 38,000 g
-- 2026-10-03: 27,000 + 11,000 = 38,000 g
-- 2026-10-10: 29,000 +  9,000 = 38,000 g
-- 2026-10-17: 24,000 + 14,000 = 38,000 g
-- 2026-10-24: 31,000 +  7,000 = 38,000 g
INSERT INTO PURCHASE_DAY (store_key, produce, market_date, sold_g, unfilled_request_g, observed, source_batch) VALUES
  ('GULGASHT_STORE_001', 'tomato', '2026-09-05', 26000, 12000, TRUE, 'BATCH_PURCHASE_2026W36'),
  ('GULGASHT_STORE_001', 'tomato', '2026-09-12', 28000, 10000, TRUE, 'BATCH_PURCHASE_2026W37'),
  ('GULGASHT_STORE_001', 'tomato', '2026-09-19', 25000, 13000, TRUE, 'BATCH_PURCHASE_2026W38'),
  ('GULGASHT_STORE_001', 'tomato', '2026-09-26', 30000,  8000, TRUE, 'BATCH_PURCHASE_2026W39'),
  ('GULGASHT_STORE_001', 'tomato', '2026-10-03', 27000, 11000, TRUE, 'BATCH_PURCHASE_2026W40'),
  ('GULGASHT_STORE_001', 'tomato', '2026-10-10', 29000,  9000, TRUE, 'BATCH_PURCHASE_2026W41'),
  ('GULGASHT_STORE_001', 'tomato', '2026-10-17', 24000, 14000, TRUE, 'BATCH_PURCHASE_2026W42'),
  ('GULGASHT_STORE_001', 'tomato', '2026-10-24', 31000,  7000, TRUE, 'BATCH_PURCHASE_2026W43');
