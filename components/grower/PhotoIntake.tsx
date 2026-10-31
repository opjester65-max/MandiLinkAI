import React, { useState } from 'react';
import { Camera, Upload, Sparkles, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { gradeProduceImageWithAi, GradingReceipt } from '../../lib/providers/grading';

interface PhotoIntakeProps {
  produce: string;
  onGradeComplete: (receipt: any, previewUrl?: string | null) => void;
}

export function PhotoIntake({ produce, onGradeComplete }: PhotoIntakeProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);

  // Sample produce images presets for quick instant demonstration
  const samplePresets = [
    {
      id: 'fresh-tomatoes',
      label: 'Chenab Dawn Vine Harvest (Fresh Grade A)',
      url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80',
      isProduce: true,
    },
    {
      id: 'ripe-tomatoes-crate',
      label: 'Local Crates Vine Lot',
      url: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=600&auto=format&fit=crop&q=80',
      isProduce: true,
    },
    {
      id: 'non-produce-test',
      label: 'Non-Produce Scene (Safety Filter Test)',
      url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&auto=format&fit=crop&q=80',
      isProduce: false,
    },
  ];

  const handleRunAnalysis = async (imageUrl?: string) => {
    setIsAnalyzing(true);
    try {
      const receipt = await gradeProduceImageWithAi('image/jpeg', 'sample_base64_data', produce);
      onGradeComplete(receipt, imageUrl || selectedPreview);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        setSelectedPreview(base64);
        setIsAnalyzing(true);
        try {
          const receipt = await gradeProduceImageWithAi(file.type, base64, produce);
          onGradeComplete(receipt);
        } finally {
          setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-stone-150">
        <div>
          <h3 className="text-sm font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <Camera className="w-4 h-4 text-emerald-800" />
            Produce Photo Intake & AI Vision Grading
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Powered by Google Gemma 4 Core / Gemini 2.5 Vision
          </p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-semibold border border-blue-200">
          Track 1: AI Inspector
        </span>
      </div>

      <div className="mt-4 space-y-4">
        {/* Upload Zone */}
        <div className="border-2 border-dashed border-stone-200 rounded-xl p-6 text-center hover:border-emerald-700 transition-colors bg-stone-50/50">
          {selectedPreview ? (
            <div className="space-y-3">
              <img
                src={selectedPreview}
                alt="Selected produce lot"
                className="w-48 h-32 object-cover rounded-lg mx-auto shadow-xs border border-stone-200"
              />
              <p className="text-xs text-stone-600 font-medium">Selected harvest image</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-stone-800">
                Upload harvest batch photo or drag & drop
              </p>
              <p className="text-[11px] text-stone-500">Supports JPG, PNG up to 10MB</p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800 text-white text-xs font-medium hover:bg-emerald-900 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-700">
              <Camera className="w-3.5 h-3.5" />
              <span>Choose Photo File</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              onClick={() => handleRunAnalysis()}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{isAnalyzing ? 'Analyzing via Gemma AI...' : 'Run Vision Inspection'}</span>
            </button>
          </div>
        </div>

        {/* Quick Demo Presets */}
        <div>
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-2">
            Or test with verified Multan harvest samples:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {samplePresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
                  setSelectedPreview(preset.url);
                  handleRunAnalysis(preset.url);
                }}
                className="flex items-center gap-2.5 p-2 rounded-lg border border-stone-200 text-left hover:bg-stone-50 transition-colors cursor-pointer text-xs"
              >
                <img
                  src={preset.url}
                  alt={preset.label}
                  className="w-10 h-10 object-cover rounded-md shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-stone-800 truncate">{preset.label}</p>
                  <p className="text-[10px] text-emerald-800 font-medium">Click to grade lot</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
