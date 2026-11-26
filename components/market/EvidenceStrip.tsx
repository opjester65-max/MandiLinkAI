import React from 'react';
import { ShieldCheck, ArrowUpRight } from 'lucide-react';
import { SourceBadge } from '../shared/SourceBadge';
import { getSessionTelemetry } from '../../lib/telemetry/sessionTelemetry';

interface EvidenceStripProps {
  onOpenProof: () => void;
}

export function EvidenceStrip({ onOpenProof }: EvidenceStripProps) {
  const telemetry = getSessionTelemetry();
  const hasLiveGemini = telemetry.totalLiveCalls > 0;

  return (
    <div className="bg-[#FAF7F2] rounded-xl border border-stone-200/90 p-4 shadow-2xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-800 shrink-0" />
          <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
            Verified Evidence &amp; Model Status
          </span>
          <span className="text-xs text-stone-600 hidden md:inline">
            • Strict Live vs Simulated disclosure
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenProof}
          className="inline-flex items-center gap-1 min-h-[40px] px-2 text-xs font-semibold text-emerald-800 hover:text-emerald-950 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-700 rounded-md"
        >
          <span>View Full Receipts &amp; Raw Logs</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
        {/* Track 1: Gemini 2.5 Flash */}
        <div className="bg-white p-2.5 rounded-lg border border-stone-200 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0">🔬</span>
            <div className="min-w-0">
              <p className="font-bold text-stone-900 truncate">Gemini 2.5 Flash</p>
              <p className="text-[11px] text-stone-600 truncate tabular-nums">
                {hasLiveGemini
                  ? `${telemetry.totalLiveCalls} live API call${telemetry.totalLiveCalls === 1 ? '' : 's'}`
                  : 'Offline / Simulated fallback'}
              </p>
            </div>
          </div>
          <SourceBadge source={hasLiveGemini ? 'live' : 'simulated'} />
        </div>

        {/* Track 2: Snowflake */}
        <div className="bg-white p-2.5 rounded-lg border border-stone-200 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0">❄️</span>
            <div className="min-w-0">
              <p className="font-bold text-stone-900 truncate">Snowflake Forecast</p>
              <p className="text-[11px] text-stone-600 truncate">Synthetic 18-tract dataset</p>
            </div>
          </div>
          <SourceBadge source="simulated" />
        </div>

        {/* Track 3: Solana */}
        <div className="bg-white p-2.5 rounded-lg border border-stone-200 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0">⛓️</span>
            <div className="min-w-0">
              <p className="font-bold text-stone-900 truncate">Solana Agent PDAs</p>
              <p className="text-[11px] text-stone-600 truncate">Deterministic local registry</p>
            </div>
          </div>
          <SourceBadge source="simulated" />
        </div>
      </div>
    </div>
  );
}
