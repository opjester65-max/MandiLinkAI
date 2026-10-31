-- Snowflake Deficit Forecast Query (Generated & Reviewed for Cortex Code Standard Mode)
-- Query ID: 01b8a92f-0001-c982-0003-82910002b8a2
-- Target Timezone: Asia/Karachi

/*
================================================================================
FRIDAY HAND CALCULATION (Gulgasht Corner Store, 2026-10-31, produce = 'tomato'):
--------------------------------------------------------------------------------
Preceding 8 matching Fridays strictly before 2026-10-31:
  - 2026-09-05: 26,000g sold + 12,000g unfilled = 38,000g
  - 2026-09-12: 28,000g sold + 10,000g unfilled = 38,000g
  - 2026-09-19: 25,000g sold + 13,000g unfilled = 38,000g
  - 2026-09-26: 30,000g sold +  8,000g unfilled = 38,000g
  - 2026-10-03: 27,000g sold + 11,000g unfilled = 38,000g
  - 2026-10-10: 29,000g sold +  9,000g unfilled = 38,000g
  - 2026-10-17: 24,000g sold + 14,000g unfilled = 38,000g
  - 2026-10-24: 31,000g sold +  7,000g unfilled = 38,000g
  Sum of 8 observed matching Fridays = 304,000g
  Expected Demand = ROUND(304,000 / 8) = 38,000g (38.0 kg)
  Commercial Planned Supply (excludes MandiLink) = 14,000g (14.0 kg)
  Baseline Deficit Gap = MAX(38,000 - 14,000, 0) = 24,000g (24.0 kg)
  Neighborhood households = 8,400
  Deficit per 1,000 households = 24.0 / (8,400 / 1000) = 2.86 kg/1,000 hh

MISSING-HISTORY CASE (Al-Madina Mini Mart - NEW_STORE_NO_HISTORY_003):
  Store observations count = 0 (< 3).
  Fallback to Gulgasht neighborhood pooled average = 38,000g.
  Basis returned: 'neighborhood_pooled', sample_n: 8.
================================================================================
*/

WITH target_context AS (
  SELECT 
    TO_DATE(?,'YYYY-MM-DD') AS target_date,
    DAYOFWEEKISO(TO_DATE(?,'YYYY-MM-DD')) AS target_iso_dow,
    ? AS target_produce
),
preceding_matching_days AS (
  -- Strict historical window: strictly earlier than target date, matching ISO day-of-week
  -- Avoid future leakage
  SELECT 
    p.store_key,
    s.neighborhood_key,
    p.produce,
    p.market_date,
    (p.sold_g + p.unfilled_request_g) AS daily_demand_g,
    ROW_NUMBER() OVER (
      PARTITION BY p.store_key, p.produce 
      ORDER BY p.market_date DESC
    ) AS recency_rank
  FROM PURCHASE_DAY p
  JOIN STORE s ON p.store_key = s.store_key
  CROSS JOIN target_context tc
  WHERE p.produce = tc.target_produce
    AND p.market_date < tc.target_date
    AND DAYOFWEEKISO(p.market_date) = tc.target_iso_dow
    AND p.observed = TRUE
),
store_history_agg AS (
  -- Cap to previous eight matching weekdays
  SELECT 
    store_key,
    neighborhood_key,
    produce,
    COUNT(*) AS sample_n,
    ROUND(AVG(daily_demand_g)) AS store_expected_demand_g
  FROM preceding_matching_days
  WHERE recency_rank <= 8
  GROUP BY store_key, neighborhood_key, produce
),
neighborhood_pooled_agg AS (
  -- Pooled observed same-weekday demand in the same neighborhood
  SELECT 
    neighborhood_key,
    produce,
    COUNT(*) AS pooled_sample_n,
    ROUND(AVG(daily_demand_g)) AS pooled_expected_demand_g
  FROM preceding_matching_days
  WHERE recency_rank <= 8
  GROUP BY neighborhood_key, produce
),
active_stores AS (
  SELECT 
    s.store_key,
    s.neighborhood_key,
    s.display_name,
    tc.target_produce,
    tc.target_date
  FROM STORE s
  CROSS JOIN target_context tc
),
latest_census AS (
  -- Latest eligible profile per neighborhood as of target year (prevent Cartesian fan-out)
  SELECT 
    neighborhood_key,
    households,
    data_class
  FROM NEIGHBORHOOD_PROFILE
  QUALIFY ROW_NUMBER() OVER (PARTITION BY neighborhood_key ORDER BY profile_year DESC) = 1
)
SELECT 
  ast.store_key AS "storeKey",
  ast.neighborhood_key AS "neighborhoodKey",
  ast.display_name AS "displayName",
  
  -- Expected demand with graceful pooling hierarchy
  CASE 
    WHEN sha.sample_n >= 3 THEN sha.store_expected_demand_g
    WHEN npa.pooled_sample_n >= 3 THEN npa.pooled_expected_demand_g
    ELSE NULL
  END AS "expectedG",
  
  -- Planned supply from commercial drops (excluding MandiLink)
  COALESCE(sp.planned_g, 0) AS "plannedG",
  
  -- Baseline Deficit Gap = max(expected_g - planned_g, 0)
  CASE 
    WHEN sha.sample_n >= 3 THEN GREATEST(sha.store_expected_demand_g - COALESCE(sp.planned_g, 0), 0)
    WHEN npa.pooled_sample_n >= 3 THEN GREATEST(npa.pooled_expected_demand_g - COALESCE(sp.planned_g, 0), 0)
    ELSE NULL
  END AS "baselineGapG",
  
  -- Sample size and estimation basis
  COALESCE(sha.sample_n, 0) AS "sampleN",
  CASE 
    WHEN sha.sample_n >= 3 THEN 'store_history'
    WHEN npa.pooled_sample_n >= 3 THEN 'neighborhood_pooled'
    ELSE 'insufficient_data'
  END AS "basis",
  
  lc.households AS "households",
  
  -- Deficit kg per 1,000 households
  CASE 
    WHEN lc.households > 0 AND (sha.sample_n >= 3 OR npa.pooled_sample_n >= 3) THEN
      ROUND(
        (CASE 
           WHEN sha.sample_n >= 3 THEN GREATEST(sha.store_expected_demand_g - COALESCE(sp.planned_g, 0), 0)
           ELSE GREATEST(npa.pooled_expected_demand_g - COALESCE(sp.planned_g, 0), 0)
         END / 1000.0) / (lc.households / 1000.0), 
        2
      )
    ELSE NULL
  END AS "kgGapPer1000Households",
  
  COALESCE(lc.data_class, 'SYNTHETIC_DATA') AS "dataClass"
  
FROM active_stores ast
LEFT JOIN store_history_agg sha 
  ON ast.store_key = sha.store_key 
  AND ast.target_produce = sha.produce
LEFT JOIN neighborhood_pooled_agg npa 
  ON ast.neighborhood_key = npa.neighborhood_key 
  AND ast.target_produce = npa.produce
LEFT JOIN SUPPLY_PLAN sp 
  ON ast.store_key = sp.store_key 
  AND ast.target_produce = sp.produce 
  AND ast.target_date = sp.market_date
LEFT JOIN latest_census lc 
  ON ast.neighborhood_key = lc.neighborhood_key
ORDER BY "baselineGapG" DESC NULLS LAST;
