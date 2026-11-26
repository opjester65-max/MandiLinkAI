import { TokenUsage } from '../contracts';

const TELEMETRY_STORAGE_KEY = 'mandilink_session_telemetry_v2';

export interface SessionTelemetry {
  visionGradesRun: number;
  aiCounteroffersDrafted: number;
  strategyCallsRun: number;
  totalLiveCalls: number;
  lastLatencyMs: number | null;
  avgLatencyMs: number | null;
  totalPromptTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  lastCallAt: string | null;
}

interface StoredCounters {
  visionGradesRun: number;
  aiCounteroffersDrafted: number;
  strategyCallsRun: number;
  totalLatencyMs: number;
  lastLatencyMs: number | null;
  totalPromptTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  lastCallAt: string | null;
}

const DEFAULT_COUNTERS: StoredCounters = {
  visionGradesRun: 0,
  aiCounteroffersDrafted: 0,
  strategyCallsRun: 0,
  totalLatencyMs: 0,
  lastLatencyMs: null,
  totalPromptTokens: 0,
  totalOutputTokens: 0,
  totalTokens: 0,
  lastCallAt: null,
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
        typeof parsed.visionGradesRun === 'number' && parsed.visionGradesRun >= 0
          ? parsed.visionGradesRun
          : 0,
      aiCounteroffersDrafted:
        typeof parsed.aiCounteroffersDrafted === 'number' && parsed.aiCounteroffersDrafted >= 0
          ? parsed.aiCounteroffersDrafted
          : 0,
      strategyCallsRun:
        typeof parsed.strategyCallsRun === 'number' && parsed.strategyCallsRun >= 0
          ? parsed.strategyCallsRun
          : 0,
      totalLatencyMs:
        typeof parsed.totalLatencyMs === 'number' && parsed.totalLatencyMs >= 0
          ? parsed.totalLatencyMs
          : 0,
      lastLatencyMs:
        typeof parsed.lastLatencyMs === 'number' && parsed.lastLatencyMs >= 0
          ? parsed.lastLatencyMs
          : null,
      totalPromptTokens:
        typeof parsed.totalPromptTokens === 'number' && parsed.totalPromptTokens >= 0
          ? parsed.totalPromptTokens
          : 0,
      totalOutputTokens:
        typeof parsed.totalOutputTokens === 'number' && parsed.totalOutputTokens >= 0
          ? parsed.totalOutputTokens
          : 0,
      totalTokens:
        typeof parsed.totalTokens === 'number' && parsed.totalTokens >= 0
          ? parsed.totalTokens
          : 0,
      lastCallAt: typeof parsed.lastCallAt === 'string' ? parsed.lastCallAt : null,
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
  const totalLiveCalls =
    counters.visionGradesRun + counters.aiCounteroffersDrafted + counters.strategyCallsRun;

  return {
    visionGradesRun: counters.visionGradesRun,
    aiCounteroffersDrafted: counters.aiCounteroffersDrafted,
    strategyCallsRun: counters.strategyCallsRun,
    totalLiveCalls,
    lastLatencyMs: counters.lastLatencyMs,
    avgLatencyMs:
      totalLiveCalls > 0 ? Math.round(counters.totalLatencyMs / totalLiveCalls) : null,
    totalPromptTokens: counters.totalPromptTokens,
    totalOutputTokens: counters.totalOutputTokens,
    totalTokens: counters.totalTokens,
    lastCallAt: counters.lastCallAt,
  };
}

/**
 * Records telemetry ONLY when an actual live Gemini API call executed (`executionMode === 'Live Gemini API'`).
 * Simulated / offline calls never increment live counters or fabricate token/latency metrics.
 */
export function recordLiveGeminiTelemetry(
  kind: 'vision' | 'bargaining' | 'strategy',
  params: {
    executionMode?: string;
    latencyMs?: number;
    tokenUsage?: TokenUsage | null;
  }
): void {
  if (params.executionMode !== 'Live Gemini API') {
    return;
  }

  const current = readCounters();
  const latency =
    typeof params.latencyMs === 'number' && Number.isFinite(params.latencyMs) && params.latencyMs >= 0
      ? Math.round(params.latencyMs)
      : 0;
  const promptTokens = params.tokenUsage?.promptTokens ?? 0;
  const outputTokens = params.tokenUsage?.outputTokens ?? 0;
  const totalTokens = params.tokenUsage?.totalTokens ?? promptTokens + outputTokens;

  writeCounters({
    visionGradesRun: current.visionGradesRun + (kind === 'vision' ? 1 : 0),
    aiCounteroffersDrafted: current.aiCounteroffersDrafted + (kind === 'bargaining' ? 1 : 0),
    strategyCallsRun: current.strategyCallsRun + (kind === 'strategy' ? 1 : 0),
    totalLatencyMs: current.totalLatencyMs + latency,
    lastLatencyMs: latency,
    totalPromptTokens: current.totalPromptTokens + promptTokens,
    totalOutputTokens: current.totalOutputTokens + outputTokens,
    totalTokens: current.totalTokens + totalTokens,
    lastCallAt: new Date().toISOString(),
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
