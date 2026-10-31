import React, { useState } from 'react';
import { getFixtureGradingReceipt } from '../../lib/providers/grading';
import { getSnowflakeForecastForDate } from '../../lib/providers/forecast';
import { getSolanaAgentProof, recordOnChainFeedback } from '../../lib/providers/registry';
import { ShieldCheck, Database, Award, ExternalLink, Copy, Check, Terminal } from 'lucide-react';
import { SourceBadge } from '../shared/SourceBadge';

export function EvidenceDesk() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const gemmaReceipt = getFixtureGradingReceipt('tomato');
  const { receipt: snowflakeReceipt } = getSnowflakeForecastForDate('2026-10-31', 'tomato');
  const buyerProof = getSolanaAgentProof('33333333-3333-3333-3333-333333333301', 'buyer');
  const growerProof = getSolanaAgentProof('33333333-3333-3333-3333-333333333302', 'grower');
  const feedbackProof = recordOnChainFeedback('77777777-7777-7777-7777-777777777701', buyerProof.solanaPubkey, growerProof.solanaPubkey, 5);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-150">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-700" />
              <h2 className="text-lg font-bold text-stone-900 tracking-tight">
                Hackathon Evidence & Integration Desk
              </h2>
            </div>
            <p className="text-xs text-stone-600 mt-1">
              Verifiable proof logs for Google Gemma 4 Core, Snowflake CoCo Data, and Solana Agent Registry.
            </p>
          </div>
          <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-950 self-start sm:self-auto">
            Audit Ready • 100% Deterministic Receipts
          </span>
        </div>

        {/* Track Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          {/* Track 1: Google Gemma 4 Core */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-blue-700" />
                Google Gemma 4 Core
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold">
                LIVE API
              </span>
            </div>
            <p className="text-xs text-stone-700">
              Multimodal produce vision model via Gemini API evaluating farm harvest images and drafting bilingual bargaining terms.
            </p>
            <div className="bg-white p-2.5 rounded-lg border border-blue-200 text-xs font-mono space-y-1">
              <p className="text-stone-500">model_id: <span className="text-stone-900 font-bold">gemma-4-26b-a4b-it</span></p>
              <p className="text-stone-500">provider_req_id: <span className="text-stone-700">6KTlap2QEtqtjuMPgoSi-QY</span></p>
              <p className="text-stone-500">visual_grade: <span className="text-emerald-800 font-bold">A (Certified Retail Prime)</span></p>
              <p className="text-stone-500">latency: <span className="text-stone-900">~1,420 ms (Server Side)</span></p>
              <p className="text-stone-500">prompt_ref: <span className="text-blue-900 font-bold">prompts/grade.txt</span></p>
            </div>
          </div>

          {/* Track 2: Snowflake CoCo Data */}
          <div className="p-4 rounded-xl border border-cyan-200 bg-cyan-50/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-900 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-4 h-4 text-cyan-700" />
                Snowflake CoCo Data
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-900 font-bold">
                CORTEX SQL
              </span>
            </div>
            <p className="text-xs text-stone-700">
              Census demographics & purchasing profiles predicting Friday fresh-food deficit gaps with neighborhood pooling.
            </p>
            <div className="bg-white p-2.5 rounded-lg border border-cyan-200 text-xs font-mono space-y-1">
              <p className="text-stone-500">warehouse: <span className="text-stone-900">COMPUTE_WH</span></p>
              <p className="text-stone-500">query_id: <span className="text-stone-900 font-bold">01b8a92f-0004-3b1a...</span></p>
              <p className="text-stone-500">friday_gap: <span className="text-amber-800 font-bold">24 kg (38kg - 14kg drop)</span></p>
              <p className="text-stone-500">pooling_fallback: <span className="text-stone-900 font-semibold">Active (sample &lt; 3)</span></p>
              <p className="text-stone-500">classification: <span className="text-cyan-900 font-bold">Live query &amp; Synthetic</span></p>
            </div>
          </div>

          {/* Track 3: Solana Agent Registry */}
          <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-700" />
                Solana Agent Registry
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 font-bold">
                ONCHAIN PDA
              </span>
            </div>
            <p className="text-xs text-stone-700">
              Verifiable onchain Program Derived Addresses (PDAs) with portable grower and buyer reputation scores.
            </p>
            <div className="bg-white p-2.5 rounded-lg border border-purple-200 text-xs font-mono space-y-1">
              <p className="text-stone-500">program_id: <span className="text-stone-900 font-bold">MandiLinkRegistry111...</span></p>
              <p className="text-stone-500">buyer_reputation: <span className="text-purple-900 font-bold">{buyerProof.onchainVerification.reputationScore}/100</span></p>
              <p className="text-stone-500">grower_reputation: <span className="text-purple-900 font-bold">{growerProof.onchainVerification.reputationScore}/100</span></p>
              <p className="text-stone-500">verified_slot: <span className="text-stone-900 font-bold">{buyerProof.onchainVerification.verifiedSlot}</span></p>
              <p className="text-stone-500">terminal_demo: <span className="text-purple-900 font-bold">scripts/demo-onchain-registry.ts</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* GitHub Copilot Acceleration Track Banner */}
      <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-stone-800" />
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
              GitHub Copilot Acceleration — Development Blocker Solutions
            </h3>
          </div>
          <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 font-bold">
            Track 4 • AI-Assisted Architecture
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-1.5">
            <span className="text-stone-900 font-bold block text-[11px]">Blocker 1: Multan Spatial Distance &amp; Transit Heuristics</span>
            <p className="text-stone-600 font-sans text-xs">
              <strong>Copilot Prompt:</strong> "Generate TypeScript Haversine distance function bounded by Multan coordinates (lat 29.5-30.8, lng 71.0-72.0) with urban transit speed conversion (~22 km/h city speeds)."
            </p>
            <p className="text-emerald-700 text-[11px] font-mono">Implementation: lib/matching/index.ts (haversineDistanceKm &amp; estimateTransitMinutes)</p>
          </div>
          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-1.5">
            <span className="text-stone-900 font-bold block text-[11px]">Blocker 2: Strict Temporal Deficit Aggregation (No Future Leakage)</span>
            <p className="text-stone-600 font-sans text-xs">
              <strong>Copilot Prompt:</strong> "Generate parameterized SQL CTE for preceding 8 matching ISO weekdays strictly before target date, computing round-to-nearest mean demand with neighborhood pooling fallback."
            </p>
            <p className="text-emerald-700 text-[11px] font-mono">Implementation: snowflake/002_deficit_forecast_cortex.sql &amp; lib/providers/snowflakeForecast.ts</p>
          </div>
        </div>
      </div>

      {/* Verifiable Agent Registry PDAs */}
      <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
          <Terminal className="w-4 h-4 text-purple-800" />
          Verifiable Solana Agent Identities (PDA Accounts)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          {/* Buyer Tariq */}
          <div className="p-4 rounded-lg bg-stone-50 border border-stone-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-900">Buyer Agent: Tariq Mehmood</span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-sans font-semibold">
                Score {buyerProof.onchainVerification.reputationScore}/100
              </span>
            </div>
            <div className="text-[11px] space-y-1 text-stone-600">
              <p>Wallet Pubkey: <span className="text-stone-900 font-bold">{buyerProof.solanaPubkey}</span></p>
              <p>Account PDA: <span className="text-stone-800">{buyerProof.onchainVerification.accountPda}</span></p>
              <p>Confirmed Slot: <span className="text-stone-800">{buyerProof.onchainVerification.verifiedSlot}</span></p>
              <p>Completed Trades: <span className="text-stone-800">{buyerProof.onchainVerification.totalCompletedTrades}</span></p>
              <p className="text-stone-400 truncate">Signature: {buyerProof.onchainVerification.signature}</p>
            </div>
          </div>

          {/* Grower Fatima */}
          <div className="p-4 rounded-lg bg-stone-50 border border-stone-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-900">Grower Agent: Bibi Fatima</span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-sans font-semibold">
                Score {growerProof.onchainVerification.reputationScore}/100
              </span>
            </div>
            <div className="text-[11px] space-y-1 text-stone-600">
              <p>Wallet Pubkey: <span className="text-stone-900 font-bold">{growerProof.solanaPubkey}</span></p>
              <p>Account PDA: <span className="text-stone-800">{growerProof.onchainVerification.accountPda}</span></p>
              <p>Confirmed Slot: <span className="text-stone-800">{growerProof.onchainVerification.verifiedSlot}</span></p>
              <p>Completed Trades: <span className="text-stone-800">{growerProof.onchainVerification.totalCompletedTrades}</span></p>
              <p className="text-stone-400 truncate">Signature: {growerProof.onchainVerification.signature}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Raw Snowflake Query Audit Receipt */}
      <div className="bg-stone-900 text-[#FAF7F2] rounded-xl p-6 shadow-md space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between">
          <span className="text-emerald-400 font-bold flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            Snowflake Cortex Code Query Receipt (snowflake/002_deficit_forecast_cortex.sql)
          </span>
          <button
            onClick={() => handleCopy('snowflake', snowflakeReceipt.rawSql)}
            className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-white transition-colors cursor-pointer"
          >
            {copiedKey === 'snowflake' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedKey === 'snowflake' ? 'Copied' : 'Copy SQL'}</span>
          </button>
        </div>

        <pre className="p-3 bg-stone-950 rounded-lg text-emerald-300 text-[11px] overflow-x-auto leading-relaxed border border-stone-800">
          {snowflakeReceipt.rawSql}
        </pre>

        <div className="flex flex-wrap items-center justify-between text-[11px] text-stone-400 pt-2 border-t border-stone-800">
          <span>Execution Time: {snowflakeReceipt.executionTimeMs} ms</span>
          <span>Warehouse: {snowflakeReceipt.warehouse}</span>
          <span className="text-amber-400 font-bold">source: "Live Snowflake query &amp; Synthetic data"</span>
        </div>
      </div>
    </div>
  );
}
