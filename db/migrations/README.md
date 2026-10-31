# MandiLink Database Migrations

Execution order:
1. `0001_initial_schema.sql` — Schema definition for core entities: `neighborhood`, `agent`, `store`, `grade`, `listing`, `trade`, `offer`, `message`, `request_key`. Hand-tuned foreign key constraints, checks on coordinates (Multan boundaries: 29.5-30.8 N, 71.0-72.0 E), integer paisa money units, and integer grams quantity.
2. `0002_constraints_and_indexes.sql` — Indexes for performance (`idx_listing_open_produce_expiry`, `idx_message_feed`, `idx_trade_store_listing`), integrity trigger ensuring `accepted_offer_id` belongs strictly to the parent trade, listing inventory protection trigger, and Row-Level Security (RLS) policies for Supabase Postgres.
3. `0003_seed_multan_fixtures.sql` — Deterministic seed data reproducing the exact Friday acceptance test scenario in Multan (Gulgasht Corner Store, Chenab Community Garden, Grade A fresh lot of 30 kg tomatoes at PKR 120/kg).
4. `0004_extend_grade_and_trade.sql` — Extends `grade` (produce, locale, latency_ms, provider_request_id), `trade` (delivery_date with backfill), and `store` (external_key mapping for Snowflake sync).

## Running Migrations
```bash
# Using psql or Supabase CLI:
psql $DATABASE_URL -f db/migrations/0001_initial_schema.sql
psql $DATABASE_URL -f db/migrations/0002_constraints_and_indexes.sql
psql $DATABASE_URL -f db/migrations/0003_seed_multan_fixtures.sql
psql $DATABASE_URL -f db/migrations/0004_extend_grade_and_trade.sql
```
