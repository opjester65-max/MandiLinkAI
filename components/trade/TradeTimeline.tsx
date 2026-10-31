import React from 'react';
import { Trade } from '../../lib/contracts';
import { Check, Clock, Handshake, Truck, ShieldCheck } from 'lucide-react';

interface TradeTimelineProps {
  trade: Trade;
}

export function TradeTimeline({ trade }: TradeTimelineProps) {
  const steps = [
    {
      id: 'negotiating',
      title: 'Bargaining Opened',
      desc: 'Propose quantity & price',
      completed: true,
      current: trade.status === 'negotiating',
    },
    {
      id: 'agreed',
      title: 'Terms Agreed & Stock Locked',
      desc: 'Idempotent atomic inventory deduction',
      completed: trade.status === 'agreed' || trade.status === 'delivered',
      current: trade.status === 'agreed',
    },
    {
      id: 'delivered',
      title: 'Stocked on Shelf & On-Chain Feedback',
      desc: 'Buyer confirmed physical receipt',
      completed: trade.status === 'delivered',
      current: trade.status === 'delivered',
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
      <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-4">
        Trade Lifecycle Pipeline
      </h3>

      <div className="relative flex flex-col sm:flex-row items-start justify-between gap-4">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex-1 flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                step.completed
                  ? 'bg-emerald-800 text-white'
                  : 'bg-stone-200 text-stone-500'
              } ${step.current ? 'ring-4 ring-emerald-100' : ''}`}
            >
              {step.completed ? <Check className="w-4 h-4" /> : idx + 1}
            </div>

            <div>
              <p className="text-xs font-bold text-stone-900">{step.title}</p>
              <p className="text-[11px] text-stone-500 mt-0.5">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
