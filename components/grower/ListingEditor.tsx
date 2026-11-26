import React, { useState } from 'react';
import { ProduceCode } from '../../lib/contracts';
import { GradingReceipt } from '../../lib/providers/grading';
import { Sprout, Check, AlertTriangle } from 'lucide-react';

interface ListingEditorProps {
  initialProduce: ProduceCode;
  gradeReceipt: GradingReceipt | null;
  confirmedDescription?: string;
  onPublish: (params: {
    produce: ProduceCode;
    description: string;
    availableKg: number;
    askPkrKg: number;
    pickupLat: number;
    pickupLng: number;
    pickupUntil: string;
    gradeId?: string | null;
  }) => void;
  isPublishing?: boolean;
}

const URDU_REGEX = /[\u0600-\u06FF]/;

export function ListingEditor({
  initialProduce,
  gradeReceipt,
  confirmedDescription,
  onPublish,
  isPublishing = false,
}: ListingEditorProps) {
  const [produce, setProduce] = useState<ProduceCode>(initialProduce);
  const [availableKg, setAvailableKg] = useState<number>(30); // 30 kg lot
  const [askPkrKg, setAskPkrKg] = useState<number>(120); // PKR 120/kg
  const [description, setDescription] = useState<string>(
    gradeReceipt?.description ||
      'Morning-picked vine-ripened tomatoes, Grade A certified by local visual inspection. Available for afternoon dispatch.'
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  React.useEffect(() => {
    if (gradeReceipt) {
      if (
        gradeReceipt.produce === 'tomato' ||
        gradeReceipt.produce === 'spinach' ||
        gradeReceipt.produce === 'guava'
      ) {
        setProduce(gradeReceipt.produce);
      }
      if (gradeReceipt.description) {
        setDescription(confirmedDescription || gradeReceipt.description);
      }
      if (gradeReceipt.suggestedPricePaisaKg) {
        setAskPkrKg(Math.round(gradeReceipt.suggestedPricePaisaKg / 100));
      }
    }
  }, [gradeReceipt, confirmedDescription]);

  // Multan coordinates (Chenab Greenbelt)
  const [pickupLat] = useState<number>(30.2455);
  const [pickupLng] = useState<number>(71.4718);
  const [pickupHours, setPickupHours] = useState<number>(24);

  const totalLotPkr = availableKg * askPkrKg;
  const descHasUrdu = URDU_REGEX.test(description);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (!Number.isFinite(availableKg) || availableKg <= 0 || availableKg > 1000) {
      setValidationError('Enter a valid quantity between 1 and 1,000 kg.');
      return;
    }
    if (!Number.isFinite(askPkrKg) || askPkrKg < 10 || askPkrKg > 5000) {
      setValidationError('Enter a valid asking price between PKR 10 and PKR 5,000 per kg.');
      return;
    }
    if (description.trim().length < 5) {
      setValidationError('Batch description must be at least 5 characters.');
      return;
    }
    const pickupUntil = new Date(Date.now() + pickupHours * 3600000).toISOString();
    onPublish({
      produce,
      description: description.trim(),
      availableKg,
      askPkrKg,
      pickupLat,
      pickupLng,
      pickupUntil,
      gradeId: gradeReceipt?.gradeId || (gradeReceipt ? '55555555-5555-5555-5555-555555555501' : null),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-150">
        <div>
          <h3 className="text-sm font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <Sprout className="w-4 h-4 text-emerald-800" />
            <span>Publish Surplus Produce Listing</span>
          </h3>
          <p className="text-xs text-stone-600 mt-0.5">Bibi Fatima · Chenab Community Garden</p>
        </div>
        <span className="text-xs font-mono font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded">
          Idempotent UUID Header Enforced
        </span>
      </div>

      {validationError && (
        <div
          role="alert"
          className="p-2.5 rounded-lg bg-red-50 border border-red-300 text-red-900 text-xs flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Produce Code */}
        <div>
          <label className="text-xs font-bold text-stone-700 block mb-1">Produce Commodity</label>
          <select
            value={produce}
            onChange={(e) => setProduce(e.target.value as ProduceCode)}
            className="w-full min-h-[44px] px-3 py-2 text-xs rounded-lg border border-stone-300 bg-white font-medium focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            <option value="tomato">Tomatoes (Tamatar) — High perishable</option>
            <option value="spinach">Spinach (Palak) — Fast wilting</option>
            <option value="guava">Guava (Amrood) — Local seasonal</option>
          </select>
        </div>

        {/* Available Quantity */}
        <div>
          <label className="text-xs font-bold text-stone-700 block mb-1">
            Available Surplus Quantity (kg)
          </label>
          <div className="relative">
            <input
              type="number"
              min="1"
              max="1000"
              value={availableKg}
              onChange={(e) => setAvailableKg(Math.max(1, parseInt(e.target.value || '1', 10)))}
              className="w-full min-h-[44px] px-3 py-2 text-xs font-mono tabular-nums font-bold rounded-lg border border-stone-300 bg-white focus-visible:ring-2 focus-visible:ring-emerald-700"
            />
            <span className="absolute right-3 top-3 text-xs text-stone-500 font-medium tabular-nums">
              kg ({(availableKg * 1000).toLocaleString()} g)
            </span>
          </div>
        </div>

        {/* Ask Price per kg */}
        <div>
          <label className="text-xs font-bold text-stone-700 block mb-1">
            Ask Price (PKR / kg)
          </label>
          <div className="relative">
            <input
              type="number"
              min="10"
              max="5000"
              value={askPkrKg}
              onChange={(e) => setAskPkrKg(Math.max(1, parseInt(e.target.value || '1', 10)))}
              className="w-full min-h-[44px] px-3 py-2 text-xs font-mono tabular-nums font-bold rounded-lg border border-stone-300 bg-white focus-visible:ring-2 focus-visible:ring-emerald-700"
            />
            <span className="absolute right-3 top-3 text-xs text-stone-500 font-medium tabular-nums">
              paisa: {(askPkrKg * 100).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Pickup Window */}
        <div>
          <label className="text-xs font-bold text-stone-700 block mb-1">
            Pickup Availability Window
          </label>
          <select
            value={pickupHours}
            onChange={(e) => setPickupHours(parseInt(e.target.value, 10))}
            className="w-full min-h-[44px] px-3 py-2 text-xs rounded-lg border border-stone-300 bg-white font-medium focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            <option value="6">Next 6 hours (Urgent dispatch)</option>
            <option value="12">Next 12 hours (Today's market)</option>
            <option value="24">Next 24 hours (Friday lot)</option>
            <option value="48">Next 48 hours</option>
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="text-xs font-bold text-stone-700 block mb-1">Batch Description</label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          dir={descHasUrdu ? 'rtl' : 'ltr'}
          lang={descHasUrdu ? 'ur' : 'en'}
          className={`w-full px-3 py-2 text-xs rounded-lg border border-stone-300 bg-white text-stone-800 focus-visible:ring-2 focus-visible:ring-emerald-700 ${
            descHasUrdu ? 'font-urdu text-sm leading-relaxed' : ''
          }`}
        />
      </div>

      {/* Financial Preview Box */}
      <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-200 flex items-center justify-between text-xs tabular-nums">
        <div>
          <span className="text-emerald-900 font-bold block">Estimated Lot Value</span>
          <span className="text-stone-600 text-[11px]">
            {availableKg} kg @ PKR {askPkrKg}/kg (rounded to nearest paisa)
          </span>
        </div>
        <div className="text-right">
          <span className="text-base font-mono font-black text-emerald-900">
            PKR {totalLotPkr.toLocaleString()}
          </span>
          <span className="block text-[10px] text-emerald-700 font-mono">
            ({(totalLotPkr * 100).toLocaleString()} paisa)
          </span>
        </div>
      </div>

      {/* One Obvious Next Action */}
      <button
        type="submit"
        disabled={isPublishing}
        className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-800 text-white font-bold text-xs hover:bg-emerald-900 transition-colors cursor-pointer disabled:opacity-50 shadow-xs focus-visible:ring-2 focus-visible:ring-emerald-700"
      >
        <Check className="w-4 h-4" />
        <span>{isPublishing ? 'Publishing to Market...' : 'Publish Listing to Multan Market'}</span>
      </button>
    </form>
  );
}
