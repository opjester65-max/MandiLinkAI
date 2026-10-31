-- Snowflake CoCo Data Queries: Urban Food Desert Deficit Predictor
-- Targets: Multan neighborhoods (Gulgasht, Shah Rukn-e-Alam, Bohar Gate, etc.)

-- 1. Daily Food Desert Inflow Deficit Calculation
-- Projects daily demand based on household demographic density and historical retail restocking intervals.
WITH neighborhood_demand AS (
  SELECT 
    cp.neighborhood_slug,
    cp.neighborhood_name,
    cp.produce_type,
    cp.day_of_week,
    -- Estimated daily retail consumption per 1000 households (kg)
    ROUND(SUM(cp.household_count * cp.daily_consumption_kg_per_hh), 2) AS estimated_demand_kg
  FROM MULTAN_FOOD_CENSUS.ANALYTICS.CONSUMER_PURCHASING_PROFILES cp
  GROUP BY 1, 2, 3, 4
),
commercial_inflow AS (
  SELECT 
    ci.neighborhood_slug,
    ci.produce_type,
    ci.day_of_week,
    -- Commercial wholesalers refuse smaller daily drops; delivery clusters mainly on Tuesdays
    COALESCE(SUM(ci.wholesale_delivered_kg), 0) AS planned_supply_kg
  FROM MULTAN_FOOD_CENSUS.ANALYTICS.COMMERCIAL_DELIVERIES ci
  GROUP BY 1, 2, 3, 4
)
SELECT 
  d.neighborhood_slug,
  d.neighborhood_name,
  d.produce_type,
  d.day_of_week,
  d.estimated_demand_kg,
  COALESCE(s.planned_supply_kg, 0) AS planned_supply_kg,
  GREATEST(d.estimated_demand_kg - COALESCE(s.planned_supply_kg, 0), 0) AS food_deficit_kg,
  CASE 
    WHEN GREATEST(d.estimated_demand_kg - COALESCE(s.planned_supply_kg, 0), 0) >= 20.0 THEN 'CRITICAL_SHORTAGE'
    WHEN GREATEST(d.estimated_demand_kg - COALESCE(s.planned_supply_kg, 0), 0) > 5.0 THEN 'MODERATE_SHORTAGE'
    ELSE 'BALANCED'
  END AS desert_risk_tier
FROM neighborhood_demand d
LEFT JOIN commercial_inflow s 
  ON d.neighborhood_slug = s.neighborhood_slug 
  AND d.produce_type = s.produce_type 
  AND d.day_of_week = s.day_of_week
ORDER BY food_deficit_kg DESC;
