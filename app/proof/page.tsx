'use client';

import React from 'react';
import { EvidenceDesk } from '../../components/proof/EvidenceDesk';
import { ArrowLeft } from 'lucide-react';

export default function EvidenceDeskPage({
  onBackToMarket,
  tourHighlightSignal = 0,
}: {
  onBackToMarket?: () => void;
  tourHighlightSignal?: number;
}) {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToMarket}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700 hover:text-stone-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Market Board</span>
        </button>
      </div>

      <EvidenceDesk tourHighlightSignal={tourHighlightSignal} />
    </div>
  );
}
