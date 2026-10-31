import { DeficitGap, ProduceCode } from '../contracts';
import { INITIAL_DEFICIT_GAPS } from '../fixtures';

export interface ForecastReceipt {
  provider: 'Snowflake CoCo Analytics Engine';
  warehouse: string;
  queryId: string;
  receiptStatus: 'Live' | 'Fixture';
  executionTimeMs: number;
  censusTractsAnalyzed: number;
  rawSql: string;
}

export function getSnowflakeForecastForDate(
  date: string,
  produce: ProduceCode
): { gaps: DeficitGap[]; receipt: ForecastReceipt } {
  // Filter or scale gaps by date and produce
  const matching = INITIAL_DEFICIT_GAPS.filter((g) => g.produce === produce);
  const gaps = matching.length > 0 ? matching : INITIAL_DEFICIT_GAPS;

  const receipt: ForecastReceipt = {
    provider: 'Snowflake CoCo Analytics Engine',
    warehouse: 'MULTAN_URBAN_COMPUTE_WH',
    queryId: `sf-coco-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    receiptStatus: 'Fixture',
    executionTimeMs: 42,
    censusTractsAnalyzed: 18,
    rawSql: `SELECT neighborhood, estimated_demand_kg, commercial_delivered_kg, gap_kg FROM MULTAN_FOOD_CENSUS.ANALYTICS.DEFICIT_PREDICTIONS WHERE market_date = '${date}' AND produce_type = '${produce}';`,
  };

  return { gaps, receipt };
}
