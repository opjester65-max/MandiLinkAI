import React from 'react';
import { Agent, Listing, Store, Trade } from '../../lib/contracts';
import { Money } from '../shared/Money';
import { Quantity } from '../shared/Quantity';
import { ShieldCheck, Truck, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface TermsCardProps {
  trade: Trade;
  listing: Listing | null;
  store: Store | null;
  buyerAgent: Agent | null;
  growerAgent: Agent | null;
  currentUser: Agent;
  onDeliverTrade: () => void;
  isDelivering?: boolean;
}

export function TermsCard({
  trade,
  listing,
  store,
  buyerAgent,
  growerAgent,
  currentUser,
  onDeliverTrade,
  isDelivering = false,
}: TermsCardProps) {
  const isAgreed = trade.status === 'agreed';
  const isDelivered = trade.status === 'delivered';
  const isBuyer = currentUser.role === 'buyer' && currentUser.id === store?.buyerId;

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-4">
      {/* Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-150">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isDelivered ? 'bg-emerald-600' : isAgreed ? 'bg-purple-600' : 'bg-amber-500 animate-pulse'
            }`}
          />
          <h2 className="text-base font-bold text-stone-900 tracking-tight">
            Trade Room #{trade.id.substring(0, 8)}
          </h2>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              isDelivered
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : isAgreed
                ? 'bg-purple-100 text-purple-900 border border-purple-300'
                : 'bg-amber-100 text-amber-900 border border-amber-300'
            }`}
          >
            {trade.status}
          </span>
        </div>

        <span className="text-xs font-mono text-stone-500">Version: {trade.version}</span>
      </div>

      {/* Participants & Core Commodity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
          <span className="text-[10px] text-stone-500 font-bold uppercase block">Buyer Store</span>
          <p className="font-bold text-stone-900 text-sm mt-0.5">{store?.name || 'Gulgasht Corner Store'}</p>
          <p className="text-stone-600 text-[11px] mt-0.5">Operator: {buyerAgent?.displayName || 'Tariq Mehmood'}</p>
        </div>

        <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
          <span className="text-[10px] text-stone-500 font-bold uppercase block">Seller Grower</span>
          <p className="font-bold text-stone-900 text-sm mt-0.5">
            {listing?.growerName || `${growerAgent?.displayName || 'Bibi Fatima'} · Chenab Community Garden`}
          </p>
          <p className="text-stone-600 text-[11px] mt-0.5">Commodity: {listing?.produce?.toUpperCase()} • Fresh Lot</p>
        </div>
      </div>

      {/* Agreed Allocation Details */}
      {(isAgreed || isDelivered) && trade.acceptedOffer && (
        <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-purple-800" />
              Locked Allocation Terms
            </span>
            <span className="text-xs font-mono font-bold text-purple-800">Agreed Contract</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-purple-200/60 tabular-nums">
            <div>
              <span className="text-[10px] text-purple-700 font-bold uppercase block">Quantity</span>
              <Quantity grams={trade.acceptedOffer.qtyG} className="text-base text-purple-950 font-black block mt-0.5" />
            </div>
            <div>
              <span className="text-[10px] text-purple-700 font-bold uppercase block">Agreed Price</span>
              <Money paisa={trade.acceptedOffer.pricePaisaKg} perKg className="text-base text-purple-950 font-black block mt-0.5" />
            </div>
            <div>
              <span className="text-[10px] text-purple-700 font-bold uppercase block">Total Payable</span>
              <Money paisa={trade.acceptedOffer.totalPaisa || 0} className="text-base text-purple-950 font-black block mt-0.5" />
            </div>
          </div>
        </div>
      )}

      {/* Delivery Confirmation Button (Only receiving buyer marks delivery) */}
      {isAgreed && (
        <div className="pt-2">
          {isBuyer ? (
            <button
              type="button"
              onClick={onDeliverTrade}
              disabled={isDelivering}
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-emerald-800 text-white font-bold text-xs hover:bg-emerald-900 transition-colors cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isDelivering ? 'Recording Delivery...' : 'Confirm Produce Physical Delivery (Tariq Mehmood)'}</span>
            </button>
          ) : (
            <div className="p-3 rounded-lg bg-stone-100 text-stone-700 text-xs flex items-center gap-2">
              <Clock className="w-4 h-4 text-stone-500 shrink-0" />
              <span>Awaiting receiving buyer (Tariq Mehmood) to verify physical delivery on corner store shelf.</span>
            </div>
          )}
        </div>
      )}

      {isDelivered && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span className="font-semibold">
            Delivered & verified! Delivered at {trade.deliveredAt ? new Date(trade.deliveredAt).toLocaleTimeString() : 'now'}.
          </span>
        </div>
      )}
    </div>
  );
}
