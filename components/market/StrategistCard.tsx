import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, RefreshCw, Sparkles } from 'lucide-react';
import { DeficitGap, ProduceCode, SupplyMatch } from '../../lib/contracts';

interface StrategistCardProps {
  selectedDate: string;
  selectedProduce: ProduceCode;
  gaps: DeficitGap[];
  matches: SupplyMatch[];
}

interface StrategyState {
  recommendation: string;
  modelId: string;
  executionMode: 'Live Gemini API' | 'Gemini Edge Fallback';
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
      executionMode: 'Gemini Edge Fallback',
      generatedAt: new Date().toISOString(),
    };
  }

  const availableKg = Math.round(topMatch.listing.availableG / 1000);
  const dispatchKg = Math.min(gap.gapKg, availableKg);
  const askPkr = Math.round(topMatch.listing.askPaisaKg / 100);
  const targetPkr = Math.max(50, askPkr - 10);

  return {
    recommendation: `Prioritize ${dispatchKg} kg of ${topMatch.listing.produce} from ${topMatch.listing.growerName || 'Chenab Community Garden'} (${topMatch.distanceKm.toFixed(1)} km away) to ${gap.storeName} to resolve ${Math.round((dispatchKg / Math.max(1, gap.gapKg)) * 100)}% of the ${gap.gapKg} kg ${gap.dayOfWeek} shortfall. Negotiate near PKR ${targetPkr}/kg for direct afternoon pickup and keep ${Math.max(0, availableKg - dispatchKg)} kg open for neighboring corner stores.`,
    modelId: 'gemini-2.5-flash',
    executionMode: 'Gemini Edge Fallback',
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
  const [strategy, setStrategy] = useState<StrategyState>(() =>
    buildLocalFallbackStrategy(selectedDate, selectedProduce, gaps, matches)
  );

  const fetchStrategy = useCallback(async () => {
    setIsLoading(true);
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
          setStrategy(json.data);
          return;
        }
      }
      setStrategy(buildLocalFallbackStrategy(selectedDate, selectedProduce, gaps, matches));
    } catch {
      setStrategy(buildLocalFallbackStrategy(selectedDate, selectedProduce, gaps, matches));
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, selectedProduce, gaps, matches]);

  useEffect(() => {
    fetchStrategy();
  }, [selectedDate, selectedProduce, gaps.length, matches.length]);

  return (
    <section
      aria-label="Gemini Supply Chain Strategist"
      className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="px-4 py-3 flex items-center justify-between gap-2 bg-stone-50/80 border-b border-stone-200/80">
        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="flex items-center gap-2 text-left min-w-0 cursor-pointer focus-visible:outline-stone-900"
          aria-expanded={!isCollapsed}
        >
          <Sparkles className="w-4 h-4 text-emerald-800 shrink-0" />
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-stone-900 truncate">
              Gemini Supply Chain Strategist
            </h3>
            <p className="text-[11px] text-stone-500 truncate tabular-nums">
              {strategy.modelId} · {strategy.executionMode}
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
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-[11px] font-semibold text-stone-800 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Synthesizing...' : 'Refresh AI Strategy'}</span>
        </button>
      </div>

      {!isCollapsed && (
        <div className="p-4">
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
