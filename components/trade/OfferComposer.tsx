import React, { useState } from 'react';
import { Agent, Listing, Offer, Trade, calculateTotalPaisa, paisaToPkr, pkrToPaisa } from '../../lib/contracts';
import { Money } from '../shared/Money';
import { Quantity } from '../shared/Quantity';
import { Check, Handshake, AlertTriangle, Sparkles, Clock, ShieldCheck } from 'lucide-react';

interface OfferComposerProps {
  trade: Trade;
  offers: Offer[];
  listing: Listing | null;
  currentUser: Agent;
  onProposeOffer: (qtyKg: number, pricePkrKg: number) => void;
  onAcceptOffer: (offerId: string) => void;
  isProposing?: boolean;
  isAccepting?: boolean;
}

export function OfferComposer({
  trade,
  offers,
  listing,
  currentUser,
  onProposeOffer,
  onAcceptOffer,
  isProposing = false,
  isAccepting = false,
}: OfferComposerProps) {
  // Default values primed for the Multan acceptance test scenario: 20 kg @ PKR 110/kg
  const [qtyKg, setQtyKg] = useState<number>(20);
  const [pricePkrKg, setPricePkrKg] = useState<number>(110);

  const availableKg = listing ? listing.availableG / 1000 : 30;
  const isNegotiating = trade.status === 'negotiating';

  // Calculate live total using exact BigInt paisa arithmetic
  const qtyG = Math.round(qtyKg * 1000);
  const pricePaisa = pkrToPaisa(pricePkrKg);
  const totalPaisa = calculateTotalPaisa(qtyG, pricePaisa);
  const totalPkr = paisaToPkr(totalPaisa);

  const handlePropose = (e: React.FormEvent) => {
    e.preventDefault();
    if (qtyKg <= 0 || pricePkrKg <= 0) return;
    onProposeOffer(qtyKg, pricePkrKg);
  };

  const handleLoadFridayAcceptanceScenario = () => {
    setQtyKg(20);
    setPricePkrKg(110);
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-150">
        <div>
          <h3 className="text-sm font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <Handshake className="w-4 h-4 text-emerald-800" />
            Bargaining & Offer Management
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Remaining Lot: <Quantity grams={listing?.availableG || 0} className="font-bold text-emerald-800" />
          </p>
        </div>

        {isNegotiating && (
          <button
            type="button"
            onClick={handleLoadFridayAcceptanceScenario}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300 transition-colors cursor-pointer"
            title="Load Hackathon Scenario: 20 kg @ PKR 110/kg"
          >
            <Sparkles className="w-3 h-3 text-amber-700" />
            Scenario: 20kg @ PKR 110
          </button>
        )}
      </div>

      {/* Propose Counter Offer Form */}
      {isNegotiating ? (
        <form onSubmit={handlePropose} className="space-y-3 bg-stone-50 p-4 rounded-xl border border-stone-200">
          <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
            Propose Terms ({currentUser.displayName.split(' ')[0]} - {currentUser.role})
          </span>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                Quantity (kg)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max={availableKg}
                  value={qtyKg}
                  onChange={(e) => setQtyKg(Math.max(1, parseInt(e.target.value || '1', 10)))}
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-stone-300 bg-white focus-visible:ring-2 focus-visible:ring-emerald-700"
                />
                <span className="absolute right-2.5 top-1.5 text-xs text-stone-400">kg</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                Price (PKR / kg)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={pricePkrKg}
                  onChange={(e) => setPricePkrKg(Math.max(1, parseInt(e.target.value || '1', 10)))}
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-stone-300 bg-white focus-visible:ring-2 focus-visible:ring-emerald-700"
                />
                <span className="absolute right-2.5 top-1.5 text-xs text-stone-400">PKR</span>
              </div>
            </div>
          </div>

          {/* Computed Financial Summary */}
          <div className="flex items-center justify-between text-xs pt-1 px-1">
            <span className="text-stone-600">
              Calculated Total: <span className="font-mono font-bold text-stone-900">PKR {totalPkr.toLocaleString()}</span>
            </span>
            <span className="text-[10px] text-stone-500 font-mono">
              ({totalPaisa.toLocaleString()} paisa exact)
            </span>
          </div>

          <button
            type="submit"
            disabled={isProposing || (listing ? qtyG > listing.availableG : false)}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-stone-900 text-white font-bold text-xs hover:bg-stone-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            <span>{isProposing ? 'Submitting Offer...' : 'Send Offer Proposal'}</span>
          </button>
        </form>
      ) : (
        <div className="p-3 rounded-lg bg-stone-100 text-stone-600 text-xs">
          Negotiation concluded. Trade is currently in <strong>{trade.status}</strong> status.
        </div>
      )}

      {/* Offers List & Counterparty Acceptance */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
          Proposed Terms Log ({offers.length})
        </span>

        {offers.length === 0 ? (
          <p className="text-xs text-stone-400 text-center py-4">No offers proposed yet.</p>
        ) : (
          offers.map((offer) => {
            const isMaker = offer.makerId === currentUser.id;
            const canAccept = !isMaker && isNegotiating;

            return (
              <div
                key={offer.id}
                className="p-3 rounded-xl border border-stone-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-900">
                      {offer.qtyG / 1000} kg @ PKR {offer.pricePaisaKg / 100}/kg
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                        isMaker ? 'bg-stone-100 text-stone-700' : 'bg-purple-100 text-purple-900 font-semibold'
                      }`}
                    >
                      Proposed by {isMaker ? 'You' : offer.makerName || 'Counterparty'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-stone-500 mt-1">
                    <span>
                      Total: <strong className="text-stone-900">PKR {paisaToPkr(offer.totalPaisa || 0).toLocaleString()}</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Expires: {new Date(offer.expiresAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {/* Accept Action */}
                {isNegotiating && (
                  <div className="shrink-0">
                    {canAccept ? (
                      <button
                        onClick={() => onAcceptOffer(offer.id)}
                        disabled={isAccepting}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800 text-white font-bold text-xs hover:bg-emerald-900 transition-colors cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isAccepting ? 'Locking Deal...' : 'Accept Terms & Lock Inventory'}</span>
                      </button>
                    ) : isMaker ? (
                      <span className="text-[11px] text-stone-500 italic">
                        Awaiting counterparty to accept
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
