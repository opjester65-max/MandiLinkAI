import React from 'react';
import { ProduceCode } from '../../lib/contracts';
import { Calendar, Apple } from 'lucide-react';

interface DaySelectorProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  selectedProduce: ProduceCode;
  onSelectProduce: (produce: ProduceCode) => void;
  produceCounts: Record<ProduceCode, number>;
}

export function DaySelector({
  selectedDate,
  onSelectDate,
  selectedProduce,
  onSelectProduce,
  produceCounts,
}: DaySelectorProps) {
  const days = [
    { date: '2026-10-31', label: 'Friday (Acceptance Baseline)', tag: 'Active Market' },
    { date: '2026-11-01', label: 'Saturday', tag: 'Weekend Restock' },
    { date: '2026-11-02', label: 'Sunday', tag: 'Direct Drop' },
  ];

  const produceList: { code: ProduceCode; label: string; icon: string }[] = [
    { code: 'tomato', label: 'Tomatoes (Tamatar)', icon: '🍅' },
    { code: 'spinach', label: 'Spinach (Palak)', icon: '🥬' },
    { code: 'guava', label: 'Guava (Amrood)', icon: '🍐' },
  ];

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Date Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1 shrink-0">
            <Calendar className="w-3.5 h-3.5 text-stone-500" />
            Market Date:
          </span>
          {days.map((d) => (
            <button
              key={d.date}
              onClick={() => onSelectDate(d.date)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-stone-900 ${
                selectedDate === d.date
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {d.label}
              {d.tag && (
                <span
                  className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded ${
                    selectedDate === d.date ? 'bg-amber-400 text-stone-900 font-bold' : 'text-stone-500'
                  }`}
                >
                  {d.tag}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Produce Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1 shrink-0">
            <Apple className="w-3.5 h-3.5 text-stone-500" />
            Produce:
          </span>
          {produceList.map((p) => {
            const count = produceCounts[p.code] || 0;
            const isSelected = selectedProduce === p.code;
            return (
              <button
                key={p.code}
                onClick={() => onSelectProduce(p.code)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                  isSelected
                    ? 'bg-emerald-800 text-white shadow-xs ring-1 ring-emerald-900'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-emerald-950 text-emerald-200' : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  {count} lots
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
