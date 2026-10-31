import React from 'react';
import { ShieldCheck, Database, Award, ArrowUpRight } from 'lucide-react';
import { SourceBadge } from '../shared/SourceBadge';

interface EvidenceStripProps {
  onOpenProof: () => void;
}

export function EvidenceStrip({ onOpenProof }: EvidenceStripProps) {
  return (
    <div className="bg-[#FAF7F2] rounded-xl border border-stone-200/90 p-4 shadow-2xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-800" />
          <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
            Verified Hackathon Evidence Strip
          </span>
          <span className="text-xs text-stone-500 hidden md:inline">
            • Audit trail receipts & cryptographic proofs
          </span>
        </div>

        <button
          onClick={onOpenProof}
          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:text-emerald-950 transition-colors cursor-pointer"
        >
          <span>View Full Receipts & Raw Logs</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
        {/* Track 1: Gemma */}
        <div className="bg-white p-2.5 rounded-lg border border-stone-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">🔬</span>
            <div>
              <p className="font-bold text-stone-900">Gemma 4 Vision</p>
              <p className="text-[11px] text-stone-500">Quality Grade A Certified</p>
            </div>
          </div>
          <SourceBadge source="fixture" />
        </div>

        {/* Track 2: Snowflake */}
        <div className="bg-white p-2.5 rounded-lg border border-stone-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">❄️</span>
            <div>
              <p className="font-bold text-stone-900">Snowflake CoCo</p>
              <p className="text-[11px] text-stone-500">18 Census Tracts Analyzed</p>
            </div>
          </div>
          <SourceBadge source="fixture" />
        </div>

        {/* Track 3: Solana */}
        <div className="bg-white p-2.5 rounded-lg border border-stone-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">⛓️</span>
            <div>
              <p className="font-bold text-stone-900">Solana Agent Registry</p>
              <p className="text-[11px] text-stone-500">Dual Verified PDA Identities</p>
            </div>
          </div>
          <SourceBadge source="fixture" />
        </div>
      </div>
    </div>
  );
}
