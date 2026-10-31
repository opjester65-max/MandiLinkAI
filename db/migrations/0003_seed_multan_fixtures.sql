-- Migration 0003: Seed Multan Neighborhoods, Agents, Stores & Acceptance Test Fixtures
-- Dialect: PostgreSQL

-- 1. Neighborhoods in Multan
INSERT INTO neighborhood (id, slug, name, lat, lng) VALUES
  ('11111111-1111-1111-1111-111111111101', 'gulgasht', 'Gulgasht Colony', 30.2244, 71.4920),
  ('11111111-1111-1111-1111-111111111102', 'shah-rukne-alam', 'Shah Rukn-e-Alam Colony', 30.1925, 71.5034),
  ('11111111-1111-1111-1111-111111111103', 'bohar-gate', 'Bohar Gate Walled City', 30.1970, 71.4725),
  ('11111111-1111-1111-1111-111111111104', 'multan-cantt', 'Multan Cantt Commercial', 30.1830, 71.4420),
  ('11111111-1111-1111-1111-111111111105', 'chenab-belt', 'Chenab River Urban Greenbelt', 30.2450, 71.4720)
ON CONFLICT (id) DO NOTHING;

-- 2. Mock auth users for deterministic seeding
INSERT INTO auth.users (id, email) VALUES
  ('22222222-2222-2222-2222-222222222201', 'tariq.buyer@multan-stores.pk'),
  ('22222222-2222-2222-2222-222222222202', 'fatima.grower@chenab-community.pk'),
  ('22222222-2222-2222-2222-222222222203', 'bilal.buyer@bohar-mart.pk')
ON CONFLICT (id) DO NOTHING;

-- 3. Agents
INSERT INTO agent (id, user_id, role, display_name, neighborhood_id, wallet_pubkey) VALUES
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', 'buyer', 'Tariq Mehmood', '11111111-1111-1111-1111-111111111101', 'B1uY3r7ariqGu1gashtMultanSo1anaPubk3y1111'),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222202', 'grower', 'Chenab Community Garden (Bibi Fatima)', '11111111-1111-1111-1111-111111111105', 'Gr0w3rFatimaCh3nabMultanSo1anaPubk3y2222'),
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222203', 'buyer', 'Bilal Qureshi', '11111111-1111-1111-1111-111111111103', 'B1uY3rBi1a1B0harGateMultanSo1anaPubk3y333')
ON CONFLICT (id) DO NOTHING;

-- 4. Stores
INSERT INTO store (id, buyer_id, neighborhood_id, name, lat, lng) VALUES
  ('44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111101', 'Gulgasht Corner Store', 30.2251, 71.4935),
  ('44444444-4444-4444-4444-444444444402', '33333333-3333-3333-3333-333333333303', '11111111-1111-1111-1111-111111111103', 'Bohar Gate Daily Mart', 30.1975, 71.4730)
ON CONFLICT (id) DO NOTHING;

-- 5. AI Vision Grade for Chenab Fresh Lot
INSERT INTO grade (id, grower_id, image_sha256, model_id, visual_grade, observations, description, review_required, created_at) VALUES
  ('55555555-5555-5555-5555-555555555501', '33333333-3333-3333-3333-333333333302', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'gemma-4-multan-vision-v1', 'A', '{"firmness": "firm", "color_ripeness": "deep red 92%", "blemishes": "under 3%", "shelf_life_days": 4}'::jsonb, 'Harvested at dawn from organic beds. Uniform size, high firmness, ideal for same-day retail sale.', false, NOW() - INTERVAL '2 hours')
ON CONFLICT (id) DO NOTHING;

-- 6. Open Listing: 30 kg lot asking PKR 120/kg (12000 paisa)
INSERT INTO listing (id, grower_id, grade_id, produce, description, available_g, ask_paisa_kg, pickup_lat, pickup_lng, pickup_until, status, version) VALUES
  ('66666666-6666-6666-6666-666666666601', '33333333-3333-3333-3333-333333333302', '55555555-5555-5555-5555-555555555501', 'tomato', 'Morning-picked vine-ripened tomatoes, Grade A certified by local Gemma visual inspection. Available for afternoon dispatch.', 30000, 12000, 30.2455, 71.4718, NOW() + INTERVAL '24 hours', 'open', 1)
ON CONFLICT (id) DO NOTHING;
