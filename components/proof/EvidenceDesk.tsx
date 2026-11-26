import React, { useState } from 'react';
import { getFixtureGradingReceipt } from '../../lib/providers/grading';
import { getSnowflakeForecastForDate } from '../../lib/providers/forecast';
import { getSolanaAgentProof, recordOnChainFeedback } from '../../lib/providers/registry';
import {
  getSessionTelemetry,
  resetSessionTelemetry,
} from '../../lib/telemetry/sessionTelemetry';
import { sandboxRepository } from '../../lib/repositories/marketRepository';
import { GEMINI_MODEL_ID } from '../../lib/providers/aiSpecs';
import {
  ShieldCheck,
  Database,
  Award,
  Copy,
  Check,
  Terminal,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { SourceBadge } from '../shared/SourceBadge';

export function EvidenceDesk({ tourHighlightSignal = 0 }: { tourHighlightSignal?: number }) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [isHighlighted, setIsHighlighted] = useState<boolean>(false);

  React.useEffect(() => {
    if (tourHighlightSignal > 0) {
      setIsHighlighted(true);
      const scrollTimer = setTimeout(() => {
        document
          .getElementById('tour-target-proof')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 80);
      const timer = setTimeout(() => setIsHighlighted(false), 2600);
      return () => {
        clearTimeout(scrollTimer);
        clearTimeout(timer);
      };
    }
  }, [tourHighlightSignal]);

  const { snowflakeReceipt, buyerProof, growerProof } = React.useMemo(() => {
    getFixtureGradingReceipt('tomato');
    const sf = getSnowflakeForecastForDate('2026-10-31', 'tomato');
    const buyer = getSolanaAgentProof('33333333-3333-3333-3333-333333333301', 'buyer');
    const grower = getSolanaAgentProof('33333333-3333-3333-3333-333333333302', 'grower');
    recordOnChainFeedback(
      '77777777-7777-7777-7777-777777777701',
      buyer.solanaPubkey,
      grower.solanaPubkey,
      5
    );
    return {
      snowflakeReceipt: sf.receipt,
      buyerProof: buyer,
      growerProof: grower,
    };
  }, []);

  const telemetry = getSessionTelemetry();
  const hasLiveGeminiCalls = telemetry.totalLiveCalls > 0;

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleResetPracticeMarket = () => {
    sandboxRepository.reset();
    resetSessionTelemetry();
    setResetMessage(
      'Practice market and live API telemetry reset cleanly to deterministic Multan sample fixtures.'
    );
    setTimeout(() => setResetMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div
        id="tour-target-proof"
        className={`bg-white rounded-xl border p-5 sm:p-6 shadow-xs transition-all duration-200 ${
          isHighlighted
            ? 'border-emerald-700 ring-2 ring-emerald-600/40 judge-highlight-ring'
            : 'border-stone-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-150">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-700 shrink-0" />
              <h2 className="text-lg font-bold text-stone-900 tracking-tight">
                Hackathon Evidence &amp; Integration Desk
              </h2>
            </div>
            <p className="text-xs text-stone-600 mt-1">
              Honest Live vs Recorded vs Simulated provenance across all integrations. Nothing simulated claims to be live.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleResetPracticeMarket}
              className="flex items-center gap-1.5 px-3 min-h-[44px] sm:min-h-[38px] rounded-lg border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-semibold transition cursor-pointer focus-visible:ring-2 focus-visible:ring-stone-900"
            >
              <RotateCcw className="w-3.5 h-3.5 text-stone-600" />
              <span>Reset Practice Market</span>
            </button>
          </div>
        </div>

        {resetMessage && (
          <div
            role="status"
            className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2 font-medium"
          >
            <Check className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{resetMessage}</span>
          </div>
        )}

        {/* 4 Integration Cards with Strict Live / Recorded / Simulated Badges */}
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Integration Status &amp; Provenance Cards
            </h3>
            <span className="text-[11px] text-stone-600">
              Every card badged strictly as Live, Recorded, or Simulated
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CARD 1: Gemini 2.5 Flash */}
            <div
              className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${
                hasLiveGeminiCalls
                  ? 'border-emerald-300 bg-emerald-50/40'
                  : 'border-amber-300 bg-amber-50/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <SourceBadge source={hasLiveGeminiCalls ? 'live' : 'simulated'} />
                </div>
                <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Google {GEMINI_MODEL_ID}</span>
                </h4>
                <p className="text-[11px] text-stone-600 mt-1">
                  Server-side @google/genai pipeline for multimodal crate grading, EN/Urdu bargaining, and strategy synthesis.
                </p>
                <div className="mt-2.5 bg-white p-2 rounded border border-stone-200 text-[10px] font-mono tabular-nums space-y-0.5">
                  <p className="text-stone-600">
                    model: <span className="text-stone-900 font-bold">{GEMINI_MODEL_ID}</span>
                  </p>
                  <p className="text-stone-600">
                    live_calls:{' '}
                    <span className="text-stone-900 font-bold">{telemetry.totalLiveCalls}</span>
                  </p>
                  <p className="text-stone-600">
                    last_latency:{' '}
                    <span className="text-stone-900 font-bold">
                      {telemetry.lastLatencyMs !== null ? `${telemetry.lastLatencyMs} ms` : '—'}
                    </span>
                  </p>
                  <p className="text-stone-600">
                    tokens_used:{' '}
                    <span className="text-stone-900 font-bold">
                      {telemetry.totalTokens.toLocaleString()}
                    </span>
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-stone-200/80 text-[10px] text-stone-700 font-medium">
                {hasLiveGeminiCalls
                  ? 'Provenance: Real server-side @google/genai network calls observed in this session'
                  : 'Provenance: Simulated offline fallback active until a valid GEMINI_API_KEY completes a call'}
              </div>
            </div>

            {/* CARD 2: Snowflake CoCo */}
            <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/40 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <SourceBadge source="simulated" />
                </div>
                <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>Snowflake CoCo Forecast</span>
                </h4>
                <p className="text-[11px] text-stone-600 mt-1">
                  Local deterministic forecast model mirroring the 8-preceding-weekday SQL query on synthetic Multan census tracts.
                </p>
                <div className="mt-2.5 bg-white p-2 rounded border border-amber-200 text-[10px] font-mono tabular-nums space-y-0.5">
                  <p className="text-stone-600">
                    query_id:{' '}
                    <span className="text-stone-900 font-bold truncate block">
                      {snowflakeReceipt.queryId}
                    </span>
                  </p>
                  <p className="text-stone-600">
                    deficit: <span className="text-amber-800 font-bold">24 kg (Friday gap)</span>
                  </p>
                  <p className="text-stone-600">
                    method: <span className="text-stone-900 font-semibold">8 preceding Fridays</span>
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-amber-200 text-[10px] text-amber-950 font-medium">
                Provenance: Simulated (Snowflake SQL Model &amp; Synthetic Data)
              </div>
            </div>

            {/* CARD 3: Solana Registry */}
            <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/40 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <SourceBadge source="simulated" />
                </div>
                <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0" />
                  <span>Solana Agent Registry</span>
                </h4>
                <p className="text-[11px] text-stone-600 mt-1">
                  QuantuLabs 8004 identity &amp; 20x rating model computed locally in browser memory (no Solana RPC broadcast).
                </p>
                <div className="mt-2.5 bg-white p-2 rounded border border-amber-200 text-[10px] font-mono tabular-nums space-y-0.5">
                  <p className="text-stone-600">
                    grower_score:{' '}
                    <span className="text-purple-900 font-bold">
                      {growerProof.onchainVerification.reputationScore}/100
                    </span>
                  </p>
                  <p className="text-stone-600">
                    buyer_score:{' '}
                    <span className="text-purple-900 font-bold">
                      {buyerProof.onchainVerification.reputationScore}/100
                    </span>
                  </p>
                  <p className="text-stone-600">
                    transport: <span className="text-stone-900 font-semibold">Local Deterministic</span>
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-amber-200 text-[10px] text-amber-950 font-medium">
                Provenance: Simulated local PDAs &amp; deterministic reputation math
              </div>
            </div>

            {/* CARD 4: Postgres / Supabase */}
            <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/40 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <SourceBadge source="simulated" />
                </div>
                <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Live Postgres / Supabase</span>
                </h4>
                <p className="text-[11px] text-stone-600 mt-1">
                  Optional external DB credentials omitted in demo mode; Practice Market uses isolated local storage cleanly.
                </p>
                <div className="mt-2.5 bg-white p-2 rounded border border-amber-200 text-[10px] font-mono space-y-0.5">
                  <p className="text-stone-600">
                    status: <span className="text-amber-800 font-bold">Not Configured</span>
                  </p>
                  <p className="text-stone-600">
                    sandbox: <span className="text-emerald-800 font-bold">Isolated &amp; Active</span>
                  </p>
                  <p className="text-stone-600">
                    circuit_breaker: <span className="text-stone-900 font-semibold">Typed 503 Guard</span>
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-amber-200 text-[10px] text-amber-950 font-medium">
                Provenance: Simulated in-browser practice store
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recorded Repository Implementation & Verification Section */}
      <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-150">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-stone-800 shrink-0" />
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
              Repository Verification Modules
            </h3>
          </div>
          <SourceBadge source="recorded" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          {/* Target 1: Spatial Distance */}
          <div className="p-3.5 bg-stone-50 rounded-lg border border-stone-200 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-stone-900 font-bold text-[11px]">
                lib/matching/distance.ts
              </span>
              <SourceBadge source="recorded" />
            </div>
            <p className="text-stone-600 font-sans text-xs">
              Pure Haversine km calculation, explicit (0, 0) coordinate validation, and dashed map connector geometry without fake driving times.
            </p>
            <div className="text-[10px] text-blue-900 font-bold pt-1 border-t border-stone-200">
              Suite: tests/distance.test.ts
            </div>
          </div>

          {/* Target 2: Inventory Fixtures */}
          <div className="p-3.5 bg-stone-50 rounded-lg border border-stone-200 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-stone-900 font-bold text-[11px]">
                lib/fixtures/inventory.ts
              </span>
              <SourceBadge source="recorded" />
            </div>
            <p className="text-stone-600 font-sans text-xs">
              Strict integer grams and PKR paisa/kg pricing preventing float drift; 20 kg match leaves 10 kg on grower lot and 4 kg unmet store gap.
            </p>
            <div className="text-[10px] text-blue-900 font-bold pt-1 border-t border-stone-200">
              Suite: tests/inventory.test.ts
            </div>
          </div>

          {/* Target 3: Snowflake ETL Import */}
          <div className="p-3.5 bg-stone-50 rounded-lg border border-stone-200 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-stone-900 font-bold text-[11px]">
                scripts/import-local-data.ts
              </span>
              <SourceBadge source="recorded" />
            </div>
            <p className="text-stone-600 font-sans text-xs">
              Idempotent census ingestion across 4 table grains preserving observed zeros without double-counting historical store demand.
            </p>
            <div className="text-[10px] text-blue-900 font-bold pt-1 border-t border-stone-200">
              Suite: tests/import-data.test.ts
            </div>
          </div>
        </div>
      </div>

      {/* Deterministic Solana Agent Identity Previews (No fake explorer URLs) */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-150">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-purple-800 shrink-0" />
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
              QuantuLabs 8004 Agent Identity Registry (Local Simulation)
            </h3>
          </div>
          <SourceBadge source="simulated" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          {/* Buyer Tariq */}
          <div className="p-4 rounded-lg bg-stone-50 border border-stone-200 space-y-2 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-stone-900">Buyer Agent: Tariq Mehmood</span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-sans font-semibold tabular-nums">
                Score {buyerProof.onchainVerification.reputationScore}/100
              </span>
            </div>
            <div className="text-[11px] space-y-1 text-stone-600 tabular-nums">
              <p className="break-all">
                Wallet Pubkey:{' '}
                <span className="text-stone-900 font-bold">{buyerProof.solanaPubkey}</span>
              </p>
              <p className="break-all">
                Simulated Account PDA:{' '}
                <span className="text-stone-800">{buyerProof.onchainVerification.accountPda}</span>
              </p>
              <p>
                Simulated Slot:{' '}
                <span className="text-stone-800">{buyerProof.onchainVerification.verifiedSlot}</span>
              </p>
              <p>
                Completed Trades:{' '}
                <span className="text-stone-800">
                  {buyerProof.onchainVerification.totalCompletedTrades}
                </span>
              </p>
              <p className="text-[10px] font-sans text-amber-900 pt-1">
                Simulated local PDA — not broadcast to Solana Devnet RPC.
              </p>
            </div>
          </div>

          {/* Grower Bibi Fatima */}
          <div className="p-4 rounded-lg bg-stone-50 border border-stone-200 space-y-2 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-stone-900">Grower Agent: Bibi Fatima</span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-sans font-semibold tabular-nums">
                Score {growerProof.onchainVerification.reputationScore}/100
              </span>
            </div>
            <div className="text-[11px] space-y-1 text-stone-600 tabular-nums">
              <p className="break-all">
                Wallet Pubkey:{' '}
                <span className="text-stone-900 font-bold">{growerProof.solanaPubkey}</span>
              </p>
              <p className="break-all">
                Simulated Account PDA:{' '}
                <span className="text-stone-800">{growerProof.onchainVerification.accountPda}</span>
              </p>
              <p>
                Simulated Slot:{' '}
                <span className="text-stone-800">{growerProof.onchainVerification.verifiedSlot}</span>
              </p>
              <p>
                Completed Trades:{' '}
                <span className="text-stone-800">
                  {growerProof.onchainVerification.totalCompletedTrades}
                </span>
              </p>
              <p className="text-[10px] font-sans text-amber-900 pt-1">
                Simulated local PDA — not broadcast to Solana Devnet RPC.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Simulated Snowflake Query Audit Receipt */}
      <div className="bg-stone-900 text-[#FAF7F2] rounded-xl p-6 shadow-md space-y-3 font-mono text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-emerald-400 font-bold flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Snowflake Deficit Forecast SQL Reference (snowflake/002_deficit_forecast_cortex.sql)</span>
            </span>
            <SourceBadge source="simulated" />
          </div>
          <button
            type="button"
            onClick={() => handleCopy('snowflake', snowflakeReceipt.rawSql)}
            className="flex items-center gap-1 min-h-[36px] px-2 rounded text-[11px] text-stone-300 hover:text-white transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            {copiedKey === 'snowflake' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedKey === 'snowflake' ? 'Copied' : 'Copy SQL'}</span>
          </button>
        </div>

        <pre className="p-3 bg-stone-950 rounded-lg text-emerald-300 text-[11px] overflow-x-auto leading-relaxed border border-stone-800">
          {snowflakeReceipt.rawSql}
        </pre>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-400 pt-2 border-t border-stone-800 tabular-nums">
          <span>Simulated Duration: {snowflakeReceipt.executionTimeMs} ms</span>
          <span>Warehouse Reference: {snowflakeReceipt.warehouse}</span>
          <span className="text-amber-300 font-bold">
            Source: {snowflakeReceipt.receiptStatus === 'Live' ? 'Live Snowflake Network' : 'Simulated (Snowflake SQL Model & Synthetic Data)'}
          </span>
        </div>
      </div>
    </div>
  );
}
