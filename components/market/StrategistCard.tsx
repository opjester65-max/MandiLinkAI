import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, RefreshCw, Sparkles, AlertTriangle } from 'lucide-react';
import { DeficitGap, ProduceCode, SupplyMatch, TokenUsage } from '../../lib/contracts';
import { SourceBadge } from '../shared/SourceBadge';
import { recordLiveGeminiTelemetry } from '../../lib/telemetry/sessionTelemetry';

interface StrategistCardProps {
  selectedDate: string;
  selectedProduce: ProduceCode;
  gaps: DeficitGap[];
  matches: SupplyMatch[];
}

interface StrategyState {
  recommendation: string;
  modelId: string;
  executionMode: 'Live Gemini API' | 'Simulated (No API Key)';
  latencyMs?: number;
  tokenUsage?: TokenUsage;
  generatedAt: string;
}

function buildLocalFallbackStrategy(
  selectedDate: string,
  selectedProduce: ProduceCode,
  gaps: DeficitGap[],
  matches: SupplyMatch[]
): StrategyState {
  const gap = gaps.find((g) => g.produce === selectedProduce) || gaps[0];
  const topMatch = matches[0];

  if (!gap || !topMatch) {
    return {
      recommendation: `No immediate ${selectedProduce} deficit detected for ${selectedDate}. Continue monitoring nearby Chenab grower harvests before scheduling dispatches.`,
      modelId: 'gemini-2.5-flash',
      executionMode: 'Simulated (No API Key)',
      latencyMs: 0,
      generatedAt: new Date().toISOString(),
    };
  }

  const availableKg = Math.round(topMatch.listing.availableG / 1000);
  const dispatchKg = Math.min(gap.gapKg, availableKg);
  const askPkr = Math.round(topMatch.listing.askPaisaKg / 100);
  const targetPkr = Math.max(50, askPkr - 10);

  return {
    recommendation: `Prioritize ${dispatchKg} kg of ${topMatch.listing.produce} from ${topMatch.listing.growerName || 'Bibi Fatima · Chenab Community Garden'} (${topMatch.distanceKm.toFixed(1)} km away) to ${gap.storeName} to resolve ${Math.round((dispatchKg / Math.max(1, gap.gapKg)) * 100)}% of the ${gap.gapKg} kg ${gap.dayOfWeek} shortfall. Negotiate near PKR ${targetPkr}/kg for direct afternoon pickup and keep ${Math.max(0, availableKg - dispatchKg)} kg open for neighboring corner stores.`,
    modelId: 'gemini-2.5-flash',
    executionMode: 'Simulated (No API Key)',
    latencyMs: 0,
    generatedAt: new Date().toISOString(),
  };
}

export function StrategistCard({
  selectedDate,
  selectedProduce,
  gaps,
  matches,
}: StrategistCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [strategyError, setStrategyError] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<StrategyState>(() =>
    buildLocalFallbackStrategy(selectedDate, selectedProduce, gaps, matches)
  );

  const fetchStrategy = useCallback(async () => {
    setIsLoading(true);
    setStrategyError(null);
    try {
      const res = await fetch('/api/market/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          produce: selectedProduce,
          gaps,
          matches,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.data?.recommendation) {
          const data: StrategyState = {
            ...json.data,
            executionMode:
              json.data.executionMode === 'Live Gemini API'
                ? 'Live Gemini API'
                : 'Simulated (No API Key)',
          };
          setStrategy(data);
          recordLiveGeminiTelemetry('strategy', data);
          return;
        }
      }
      setStrategy(buildLocalFallbackStrategy(selectedDate, selectedProduce, gaps, matches));
    } catch {
      setStrategyError('Could not reach strategy API; displaying simulated deterministic recommendation.');
      setStrategy(buildLocalFallbackStrategy(selectedDate, selectedProduce, gaps, matches));
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, selectedProduce, gaps, matches]);

  useEffect(() => {
    fetchStrategy();
  }, [selectedDate, selectedProduce, gaps.length, matches.length]);

  const isLive = strategy.executionMode === 'Live Gemini API';

  return (
    <section
      aria-label="Gemini Supply Chain Strategist"
      className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 bg-stone-50/80 border-b border-stone-200/80">
        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="flex items-center gap-2 text-left min-w-0 min-h-[40px] cursor-pointer focus-visible:ring-2 focus-visible:ring-stone-900 rounded-md px-1"
          aria-expanded={!isCollapsed}
        >
          <Sparkles className="w-4 h-4 text-emerald-800 shrink-0" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-xs font-bold text-stone-900">
                Gemini Supply Chain Strategist
              </h3>
              <SourceBadge source={isLive ? 'live' : 'simulated'} />
            </div>
            <p className="text-[11px] text-stone-600 truncate tabular-nums">
              {strategy.modelId} · {strategy.executionMode}
              {isLive && typeof strategy.latencyMs === 'number'
                ? ` · ${strategy.latencyMs} ms`
                : ''}
              {isLive && strategy.tokenUsage?.totalTokens
                ? ` · ${strategy.tokenUsage.totalTokens} tokens`
                : ''}
            </p>
          </div>
          {isCollapsed ? (
            <ChevronDown className="w-4 h-4 text-stone-500 shrink-0 ml-1" />
          ) : (
            <ChevronUp className="w-4 h-4 text-stone-500 shrink-0 ml-1" />
          )}
        </button>

        <button
          type="button"
          onClick={fetchStrategy}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 min-h-[44px] sm:min-h-[36px] rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-[11px] font-semibold text-stone-800 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0 focus-visible:ring-2 focus-visible:ring-stone-900"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Synthesizing...' : 'Refresh AI Strategy'}</span>
        </button>
      </div>

      {!isCollapsed && (
        <div className="p-4 space-y-2">
          {strategyError && (
            <div
              role="alert"
              className="flex items-center gap-1.5 text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-700" />
              <span>{strategyError}</span>
            </div>
          )}
          {isLoading ? (
            <div className="space-y-2 animate-pulse" aria-busy="true" aria-label="Generating strategy">
              <div className="h-3 bg-stone-200 rounded w-11/12" />
              <div className="h-3 bg-stone-200 rounded w-4/5" />
            </div>
          ) : (
            <p className="text-xs text-stone-800 leading-relaxed">
              {strategy.recommendation}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
