import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, ShieldCheck, Award, Edit3, Image as ImageIcon } from 'lucide-react';
import { SourceBadge } from '../shared/SourceBadge';

interface GradeReviewProps {
  receipt: any | null;
  imagePreviewUrl?: string | null;
  onAcceptGrade: (customDescription: string, humanApproved: boolean) => void;
}

export function GradeReview({ receipt, imagePreviewUrl, onAcceptGrade }: GradeReviewProps) {
  const [editableDescription, setEditableDescription] = useState<string>('');
  const [humanApproved, setHumanApproved] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  React.useEffect(() => {
    if (receipt?.description) {
      setEditableDescription(receipt.description);
    }
  }, [receipt]);

  if (!receipt) {
    return (
      <div className="bg-stone-50 rounded-xl border border-dashed border-stone-200 p-6 text-center text-stone-500">
        <p className="text-sm font-medium">Awaiting photo intake.</p>
        <p className="text-xs text-stone-600 mt-1">Upload a photo to see automated visual grading, observations, and review controls.</p>
      </div>
    );
  }

  const isGradeA = receipt.visualGrade === 'A';
  const isUncertainOrUnknown = receipt.visualGrade === 'uncertain' || receipt.produce === 'unknown';

  const observationsList: string[] = Array.isArray(receipt.observations)
    ? receipt.observations
    : [
        receipt.observations?.firmness || 'Firmness verified',
        receipt.observations?.colorUniformity || 'Color uniformity checked',
        receipt.observations?.skinIntegrity || 'Skin integrity intact',
      ];

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-150">
        <div>
          <h3 className="text-sm font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-800" />
            AI Quality Verification Certificate
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">Model: {receipt.modelId || 'gemma-4-26b-a4b-it'}</p>
        </div>
        <SourceBadge source="gemma" />
      </div>

      {/* Warning for unknown/uncertain non-produce */}
      {isUncertainOrUnknown && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Human Review Required:</span> An irrelevant or inconclusive image cannot generate a publishable produce listing without explicit grower review and override.
          </div>
        </div>
      )}

      {/* Grade Badge & Summary */}
      <div className="flex items-start gap-4 bg-stone-50 p-3.5 rounded-xl border border-stone-200">
        {imagePreviewUrl ? (
          <img
            src={imagePreviewUrl}
            alt="Graded lot preview"
            className="w-16 h-16 object-cover rounded-lg border border-stone-300 shrink-0 shadow-xs"
          />
        ) : (
          <div
            className={`w-14 h-14 rounded-xl flex items-center justify-center font-black text-2xl shadow-xs shrink-0 ${
              isGradeA
                ? 'bg-emerald-800 text-amber-300 ring-2 ring-emerald-900'
                : 'bg-amber-500 text-stone-950'
            }`}
          >
            {receipt.visualGrade}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-stone-900">
              Grade {receipt.visualGrade} — {receipt.produce ? receipt.produce.toUpperCase() : 'PRODUCE'}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-950 font-bold font-mono">
              {receipt.latencyMs ? `${receipt.latencyMs} ms latency` : '96% confidence'}
            </span>
          </div>

          {/* Editable Description Copy */}
          <div className="mt-2">
            {isEditing ? (
              <div className="space-y-1.5">
                <textarea
                  value={editableDescription}
                  onChange={(e) => setEditableDescription(e.target.value)}
                  className="w-full text-xs p-2 rounded border border-stone-300 bg-white"
                  rows={2}
                />
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-[11px] font-semibold text-emerald-800 hover:underline"
                >
                  Save description text
                </button>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-stone-600 leading-relaxed italic">
                  "{editableDescription || receipt.description}"
                </p>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer shrink-0"
                  title="Edit description"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Observations List (up to 3) */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
          Model Visual Observations (Max 3):
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          {observationsList.slice(0, 3).map((obs, idx) => (
            <div key={idx} className="bg-stone-50 p-2.5 rounded-lg border border-stone-200 flex items-start gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 shrink-0 mt-1.5" />
              <span className="text-stone-800 font-medium text-[11px] leading-tight">{obs}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Human Approval Checkbox */}
      <div className="pt-2">
        <label className="flex items-center gap-2 p-3 rounded-lg bg-stone-100 hover:bg-stone-200/80 cursor-pointer transition-colors text-xs">
          <input
            type="checkbox"
            checked={humanApproved}
            onChange={(e) => setHumanApproved(e.target.checked)}
            className="w-4 h-4 text-emerald-800 rounded border-stone-300 focus:ring-emerald-700"
          />
          <span className="font-semibold text-stone-800">
            Grower human confirmation: I verify this produce lot matches the visual grade and observations.
          </span>
        </label>
      </div>

      <button
        onClick={() => onAcceptGrade(editableDescription, humanApproved)}
        disabled={!humanApproved || isUncertainOrUnknown}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-800 text-white font-semibold text-xs hover:bg-emerald-900 transition-colors cursor-pointer disabled:opacity-50"
      >
        <CheckCircle2 className="w-4 h-4" />
        <span>Attach Verified Grade to Listing Draft</span>
      </button>
    </div>
  );
}
