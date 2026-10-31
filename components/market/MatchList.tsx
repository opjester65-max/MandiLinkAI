import React from 'react';
import { SupplyMatch } from '../../lib/contracts';
import { Money } from '../shared/Money';
import { Quantity } from '../shared/Quantity';
import { ArrowRight, Sparkles, Navigation, Clock, ShieldCheck } from 'lucide-react';

interface MatchListProps {
  matches: SupplyMatch[];
  selectedMatchId?: string | null;
  onSelectMatch: (matchId: string) => void;
  onStartTrade: (listingId: string, storeId: string) => void;
}

export function MatchList({
  matches,
  selectedMatchId,
  onSelectMatch,
  onStartTrade,
}: MatchListProps) {
  if (matches.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-stone-200 p-6 text-center text-stone-600">
        <p className="text-sm font-medium">No active grower matches available for this date and produce type.</p>
        <p className="text-xs text-stone-500 mt-1">Check another produce tab or switch to the Grower Desk to list new harvest.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-stone-900 tracking-tight flex items-center gap-2">
          <span>Hyperlocal Supply Matches</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-950 font-mono">
            {matches.length} available
          </span>
        </h3>
        <span className="text-xs text-stone-500">Sorted by proximity & coverage score</span>
      </div>

      <div className="space-y-2.5" role="list" aria-label="Available produce supply matches">
        {matches.map((match) => {
          const isSelected = match.id === selectedMatchId;
          const listing = match.listing;
          const gap = match.gap;

          return (
            <div
              key={match.id}
              role="listitem"
              onClick={() => onSelectMatch(match.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer focus-within:ring-2 focus-within:ring-stone-900 ${
                isSelected
                  ? 'bg-purple-50/40 border-[#4A154B] shadow-sm ring-1 ring-[#4A154B]'
                  : 'bg-white border-stone-200 hover:border-stone-300 hover:shadow-xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Left: Grower & Lot details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-stone-900 truncate">
                      {listing.growerName}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-700" />
                      Grade A Verified
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-950 font-mono font-bold">
                      {match.matchScore}% Match
                    </span>
                  </div>

                  <p className="text-xs text-stone-600 mt-1 line-clamp-1">
                    {listing.description}
                  </p>

                  {/* Quantitative Metrics Bar */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600 mt-2 font-medium">
                    <div className="flex items-center gap-1">
                      <span>Available:</span>
                      <Quantity grams={listing.availableG} className="text-emerald-800 font-bold" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span>Ask:</span>
                      <Money paisa={listing.askPaisaKg} perKg className="text-stone-900 font-bold" />
                    </div>
                    <div className="flex items-center gap-1">
                      <Navigation className="w-3.5 h-3.5 text-stone-500" />
                      <span>{match.distanceKm} km away</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-stone-500" />
                      <span>~{match.estTransitMinutes} min transit</span>
                    </div>
                  </div>
                </div>

                {/* Right: One Obvious Next Action */}
                <div className="sm:text-right shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartTrade(listing.id, gap.storeId);
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-800 text-white font-semibold text-xs hover:bg-emerald-900 transition-colors cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:ring-emerald-700"
                  >
                    <span>Start Bargaining</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <p className="text-[11px] text-stone-500 mt-1 hidden sm:block">
                    {match.suggestedAction}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
