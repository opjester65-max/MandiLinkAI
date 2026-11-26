import { sandboxRepository } from '../repositories/marketRepository';
import { matchSupplyWithDeficits } from '../matching';

const TELEMETRY_STORAGE_KEY = 'mandilink_session_telemetry_v1';

export interface SessionTelemetry {
  visionGradesRun: number;
  aiCounteroffersDrafted: number;
  kgDeficitMatched: number;
}

interface StoredCounters {
  visionGradesRun: number;
  aiCounteroffersDrafted: number;
}

const DEFAULT_COUNTERS: StoredCounters = {
  visionGradesRun: 1, // Seeded verified Chenab harvest receipt
  aiCounteroffersDrafted: 0,
};

const listeners = new Set<() => void>();

function readCounters(): StoredCounters {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_COUNTERS };
  }
  try {
    const raw = localStorage.getItem(TELEMETRY_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_COUNTERS };
    const parsed = JSON.parse(raw);
    return {
      visionGradesRun:
        typeof parsed.visionGradesRun === 'number' && parsed.visionGradesRun >= 1
          ? parsed.visionGradesRun
          : DEFAULT_COUNTERS.visionGradesRun,
      aiCounteroffersDrafted:
        typeof parsed.aiCounteroffersDrafted === 'number' && parsed.aiCounteroffersDrafted >= 0
          ? parsed.aiCounteroffersDrafted
          : DEFAULT_COUNTERS.aiCounteroffersDrafted,
    };
  } catch {
    return { ...DEFAULT_COUNTERS };
  }
}

function writeCounters(counters: StoredCounters): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(counters));
    } catch {
      // ignore storage quota failures
    }
  }
  listeners.forEach((fn) => fn());
}

export function getSessionTelemetry(): SessionTelemetry {
  const counters = readCounters();
  const market = sandboxRepository.getMarketData('tomato', '2026-10-31');
  const matches = matchSupplyWithDeficits(market.listings, market.gaps);
  const fridayMatchableKg = matches.reduce((sum, m) => sum + (m.fulfillableG || 0) / 1000, 0);
  const committedAndDeliveredKg = market.gaps
    .filter((g) => g.produce === 'tomato')
    .reduce((sum, g) => sum + g.committedInboundKg + g.deliveredSupplyKg, 0);

  return {
    visionGradesRun: counters.visionGradesRun,
    aiCounteroffersDrafted: counters.aiCounteroffersDrafted,
    kgDeficitMatched: Math.round((fridayMatchableKg + committedAndDeliveredKg) * 10) / 10,
  };
}

export function recordVisionGradeTelemetry(): void {
  const current = readCounters();
  writeCounters({
    ...current,
    visionGradesRun: current.visionGradesRun + 1,
  });
}

export function recordCounterofferTelemetry(): void {
  const current = readCounters();
  writeCounters({
    ...current,
    aiCounteroffersDrafted: current.aiCounteroffersDrafted + 1,
  });
}

export function resetSessionTelemetry(): void {
  writeCounters({ ...DEFAULT_COUNTERS });
}

export function subscribeSessionTelemetry(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
