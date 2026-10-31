'use client';

import React, { useState } from 'react';
import { PhotoIntake } from '../../components/grower/PhotoIntake';
import { GradeReview } from '../../components/grower/GradeReview';
import { ListingEditor } from '../../components/grower/ListingEditor';
import { GradingReceipt } from '../../lib/providers/grading';
import { ProduceCode } from '../../lib/contracts';
import { sandboxRepository } from '../../lib/repositories/marketRepository';
import { FIXTURE_IDS } from '../../lib/fixtures';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export default function GrowerDeskPage({
  onNavigateTab,
}: {
  onNavigateTab?: (tab: 'market' | 'grow' | 'trades' | 'proof') => void;
}) {
  const [selectedProduce, setSelectedProduce] = useState<ProduceCode>('tomato');
  const [gradeReceipt, setGradeReceipt] = useState<any | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [confirmedDescription, setConfirmedDescription] = useState<string>('');
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

  const handleGradeComplete = (receipt: any, previewUrl?: string | null) => {
    setGradeReceipt(receipt);
    if (previewUrl) {
      setImagePreviewUrl(previewUrl);
    }
  };

  const handleAcceptGrade = (customDescription: string, humanApproved: boolean) => {
    if (customDescription) {
      setConfirmedDescription(customDescription);
    }
  };

  const handlePublishListing = (params: {
    produce: ProduceCode;
    description: string;
    availableKg: number;
    askPkrKg: number;
    pickupLat: number;
    pickupLng: number;
    pickupUntil: string;
    gradeId?: string | null;
  }) => {
    const growerAgentId = FIXTURE_IDS.growerFatima;
    const result = sandboxRepository.createListing(
      {
        produce: params.produce,
        description: params.description,
        availableG: params.availableKg * 1000,
        askPaisaKg: params.askPkrKg * 100,
        pickupLat: params.pickupLat,
        pickupLng: params.pickupLng,
        pickupUntil: params.pickupUntil,
        gradeId: params.gradeId,
      },
      growerAgentId
    );

    setPublishSuccess(`Listing published with ID #${result.listingId.substring(0, 8)}! Available for store buyers.`);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-stone-900 tracking-tight">
            Grower Surplus Desk (Chenab Community Garden)
          </h2>
          <p className="text-xs text-stone-600 mt-0.5">
            Turn perishable harvest into verified retail supply in 3 steps: Snap photo, review AI visual grade, publish lot.
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-950 font-semibold self-start sm:self-auto">
          Seller Agent Mode (Bibi Fatima)
        </span>
      </div>

      {publishSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            <span className="font-bold">{publishSuccess}</span>
          </div>
          <button
            onClick={() => onNavigateTab && onNavigateTab('market')}
            className="px-3 py-1.5 rounded-lg bg-emerald-800 text-white font-semibold flex items-center gap-1 hover:bg-emerald-900 transition-colors cursor-pointer"
          >
            <span>View on Market Board</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: Photo Intake */}
        <div className="space-y-6">
          <PhotoIntake produce={selectedProduce} onGradeComplete={handleGradeComplete} />
          {/* Step 2: Grade Review */}
          <GradeReview
            receipt={gradeReceipt}
            imagePreviewUrl={imagePreviewUrl}
            onAcceptGrade={handleAcceptGrade}
          />
        </div>

        {/* Step 3: Listing Editor */}
        <div>
          <ListingEditor
            initialProduce={selectedProduce}
            gradeReceipt={gradeReceipt}
            onPublish={handlePublishListing}
          />
        </div>
      </div>
    </div>
  );
}
