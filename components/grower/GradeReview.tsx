import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, Award, Edit3 } from 'lucide-react';
import { GradingReceipt } from '../../lib/providers/grading';
import { SourceBadge } from '../shared/SourceBadge';

interface GradeReviewProps {
  receipt: GradingReceipt | any | null;
  imagePreviewUrl?: string | null;
  isAnalyzing?: boolean;
  onAcceptGrade: (customDescription: string, humanApproved: boolean) => void;
}

const URDU_REGEX = /[\u0600-\u06FF]/;

export function GradeReview({
  receipt,
  imagePreviewUrl,
  isAnalyzing = false,
  onAcceptGrade,
}: GradeReviewProps) {
  const [editableDescription, setEditableDescription] = useState<string>('');
  const [humanApproved, setHumanApproved] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  React.useEffect(() => {
    if (receipt?.description) {
      setEditableDescription(receipt.description);
      setHumanApproved(false);
    }
  }, [receipt]);

  if (isAnalyzing) {
    return (
      <div
        className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-4 animate-pulse"
        aria-busy="true"
        aria-label="Running Gemini 2.5 Flash Vision Grading"
      >
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-stone-200">
          <div className="space-y-1.5">
            <div className="h-4 w-48 bg-stone-200 rounded" />
            <div className="h-3 w-40 bg-stone-100 rounded" />
          </div>
          <div className="h-6 w-20 bg-stone-200 rounded-lg" />
        </div>
        <div className="flex items-start gap-4 bg-stone-50 p-3.5 rounded-xl border border-stone-200">
          <div className="w-16 h-16 bg-stone-200 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 bg-stone-200 rounded" />
            <div className="h-3 w-full bg-stone-200 rounded" />
            <div className="h-3 w-4/5 bg-stone-100 rounded" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 w-36 bg-stone-200 rounded" />
          <div className="h-8 w-full bg-stone-100 rounded-lg" />
          <div className="h-8 w-full bg-stone-100 rounded-lg" />
          <div className="h-8 w-full bg-stone-100 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="bg-stone-50 rounded-xl border border-dashed border-stone-200 p-6 text-center text-stone-500">
        <p className="text-sm font-medium">Awaiting photo intake.</p>
        <p className="text-xs text-stone-600 mt-1">
          Upload a photo or click a Sample Farm Photo above to run Gemini 2.5 Flash quality grading.
        </p>
      </div>
    );
  }

  const isGradeA = receipt.visualGrade === 'A';
  const isUncertainOrUnknown = receipt.visualGrade === 'uncertain' || receipt.produce === 'unknown';
  const confidenceScore = receipt.confidenceScore ?? 0;
  const executionMode =
    receipt.executionMode === 'Live Gemini API'
      ? 'Live Gemini API'
      : 'Simulated (No API Key)';
  const isLive = executionMode === 'Live Gemini API';
  const suggestedPkr = receipt.suggestedPricePaisaKg
    ? Math.round(receipt.suggestedPricePaisaKg / 100)
    : null;

  const observationsList: string[] = Array.isArray(receipt.observations)
    ? receipt.observations
    : [
        receipt.observations?.firmness || 'Firmness verified',
        receipt.observations?.colorUniformity || 'Color uniformity checked',
        receipt.observations?.skinIntegrity || 'Skin integrity intact',
      ];

  const descHasUrdu = URDU_REGEX.test(editableDescription || receipt.description || '');

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-200">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-stone-900 tracking-tight flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-800 shrink-0" />
              <span>AI Quality Verification Certificate</span>
            </h3>
            <SourceBadge source={isLive ? 'live' : 'simulated'} />
          </div>
          <p className="text-xs text-stone-600 mt-0.5 tabular-nums">
            {receipt.modelId || 'gemini-2.5-flash'} · {executionMode}
            {isLive && typeof receipt.latencyMs === 'number' ? ` · ${receipt.latencyMs} ms` : ''}
            {isLive && receipt.tokenUsage?.totalTokens
              ? ` · ${receipt.tokenUsage.totalTokens} tokens`
              : ''}
          </p>
        </div>
        <div
          className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold tabular-nums ${
            isGradeA
              ? 'bg-emerald-100 text-emerald-950'
              : 'bg-amber-100 text-amber-950'
          }`}
        >
          Grade {receipt.visualGrade}
        </div>
      </div>

      {/* Warning for blurry or unknown/uncertain non-produce */}
      {isUncertainOrUnknown && (
        <div
          role="alert"
          className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-2"
        >
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Human Review Required: </span>
            A blurry, inconclusive, or non-produce photo is blocked from auto-publishing a listing. Retake a clear produce crate photo above.
          </div>
        </div>
      )}

      {/* Grade Summary */}
      <div className="flex items-start gap-4 bg-stone-50 p-3.5 rounded-xl border border-stone-200">
        {imagePreviewUrl ? (
          <img
            src={imagePreviewUrl}
            alt="Graded lot preview"
            referrerPolicy="no-referrer"
            className="w-16 h-16 object-cover rounded-lg border border-stone-300 shrink-0"
          />
        ) : (
          <div
            className={`w-14 h-14 rounded-xl flex items-center justify-center font-black text-2xl shrink-0 ${
              isGradeA ? 'bg-emerald-800 text-amber-300' : 'bg-amber-500 text-stone-950'
            }`}
          >
            {receipt.visualGrade}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap text-xs text-stone-600 tabular-nums">
            <span className="text-sm font-bold text-stone-900 capitalize">
              {receipt.produce || 'Produce'} · Grade {receipt.visualGrade}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono font-semibold text-emerald-900">
              {confidenceScore}% confidence
            </span>
            {suggestedPkr !== null && suggestedPkr > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono font-semibold text-stone-900">
                  Suggested PKR {suggestedPkr}/kg
                </span>
              </>
            )}
          </div>

          {/* Editable Description Copy */}
          <div className="mt-2">
            {isEditing ? (
              <div className="space-y-1.5">
                <textarea
                  value={editableDescription}
                  onChange={(e) => setEditableDescription(e.target.value)}
                  dir={descHasUrdu ? 'rtl' : 'ltr'}
                  lang={descHasUrdu ? 'ur' : 'en'}
                  className={`w-full text-xs p-2 rounded border border-stone-300 bg-white focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                    descHasUrdu ? 'font-urdu leading-relaxed' : ''
                  }`}
                  rows={2}
                />
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="min-h-[36px] px-2 text-xs font-semibold text-emerald-800 hover:underline cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-700 rounded"
                >
                  Save description text
                </button>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <p
                  dir={descHasUrdu ? 'rtl' : 'ltr'}
                  lang={descHasUrdu ? 'ur' : 'en'}
                  className={`text-xs text-stone-700 leading-relaxed flex-1 ${
                    descHasUrdu ? 'font-urdu text-sm leading-loose' : 'italic'
                  }`}
                >
                  "{editableDescription || receipt.description}"
                </p>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  aria-label="Edit lot description"
                  className="min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-md text-stone-500 hover:text-stone-900 hover:bg-stone-200/70 cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-stone-900"
                  title="Edit description"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Observations List (3 concise visual bullets) */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold text-stone-600 block">
          Visual Observations (Gemini 2.5 Flash)
        </span>
        <ul className="space-y-1.5 text-xs">
          {observationsList.slice(0, 3).map((obs, idx) => {
            const obsIsUrdu = URDU_REGEX.test(obs);
            return (
              <li
                key={idx}
                dir={obsIsUrdu ? 'rtl' : 'ltr'}
                lang={obsIsUrdu ? 'ur' : 'en'}
                className={`bg-stone-50 px-3 py-2 rounded-lg border border-stone-200 text-stone-800 font-medium leading-snug ${
                  obsIsUrdu ? 'font-urdu text-sm leading-relaxed' : 'text-[11px]'
                }`}
              >
                {obsIsUrdu ? obs : `${idx + 1}. ${obs}`}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Human Approval Checkbox */}
      <div className="pt-1">
        <label className="min-h-[44px] flex items-center gap-2.5 p-3 rounded-lg bg-stone-100 hover:bg-stone-200/80 cursor-pointer transition-colors text-xs focus-within:ring-2 focus-within:ring-emerald-700">
          <input
            type="checkbox"
            checked={humanApproved}
            onChange={(e) => setHumanApproved(e.target.checked)}
            className="w-4 h-4 text-emerald-800 rounded border-stone-300 focus:ring-emerald-700 shrink-0"
          />
          <span className="font-semibold text-stone-800">
            Grower confirmation: I verify this harvest crate matches the Gemini grade and observations.
          </span>
        </label>
      </div>

      <button
        type="button"
        onClick={() => onAcceptGrade(editableDescription, humanApproved)}
        disabled={!humanApproved || isUncertainOrUnknown}
        className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-800 text-white font-semibold text-xs hover:bg-emerald-900 transition-colors cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-700"
      >
        <CheckCircle2 className="w-4 h-4" />
        <span>Apply Verified Grade to Listing Draft</span>
      </button>
    </div>
  );
}
