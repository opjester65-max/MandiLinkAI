import React, { useState } from 'react';
import { Camera, Upload, Sparkles, CheckCircle2 } from 'lucide-react';
import { gradeProduceFileWithGemini, GradingReceipt } from '../../lib/providers/grading';
import sampleTomatoImg from '../../src/assets/images/sample_multan_tomatoes_1795725445397.jpg';
import sampleSpinachImg from '../../src/assets/images/sample_fresh_spinach_1795725446042.jpg';
import sampleGuavaImg from '../../src/assets/images/sample_blemished_guava_1795725446060.jpg';

interface PhotoIntakeProps {
  produce: string;
  onGradeComplete: (receipt: GradingReceipt, previewUrl?: string | null) => void;
  onAnalyzingChange?: (analyzing: boolean) => void;
  tourHighlightSignal?: number;
}

const SAMPLE_FARM_PHOTOS = [
  {
    id: 'tomatoes',
    label: 'Ripe Multan Tomatoes',
    sublabel: 'Expected Grade A · PKR 120/kg',
    filename: 'sample_multan_tomatoes.jpg',
    url: sampleTomatoImg,
  },
  {
    id: 'spinach',
    label: 'Fresh Leafy Spinach',
    sublabel: 'Expected Grade A · PKR 90/kg',
    filename: 'sample_fresh_spinach.jpg',
    url: sampleSpinachImg,
  },
  {
    id: 'guava',
    label: 'Blemished Guava Crate',
    sublabel: 'Expected Grade B · PKR 110/kg',
    filename: 'sample_blemished_guava.jpg',
    url: sampleGuavaImg,
  },
];

export function PhotoIntake({
  produce,
  onGradeComplete,
  onAnalyzingChange,
  tourHighlightSignal = 0,
}: PhotoIntakeProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeSampleId, setActiveSampleId] = useState<string | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [locale, setLocale] = useState<'en-PK' | 'ur-PK'>('en-PK');
  const [isHighlighted, setIsHighlighted] = useState(false);

  const updateAnalyzing = (next: boolean) => {
    setIsAnalyzing(next);
    onAnalyzingChange?.(next);
  };

  React.useEffect(() => {
    if (tourHighlightSignal <= 0) return;
    let cancelled = false;
    const defaultSample = SAMPLE_FARM_PHOTOS[0];
    setSelectedPreview(defaultSample.url);
    setActiveSampleId(defaultSample.id);
    setIsHighlighted(true);
    const timer = setTimeout(() => setIsHighlighted(false), 2600);

    fetch(defaultSample.url)
      .then((res) => res.blob())
      .then((blob) => {
        if (!cancelled) {
          setSelectedFile(
            new File([blob], defaultSample.filename, { type: blob.type || 'image/jpeg' })
          );
        }
      })
      .catch(() => {
        // Sample URL remains ready for click
      });

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tourHighlightSignal]);

  const handleAnalyzeSample = async (sample: (typeof SAMPLE_FARM_PHOTOS)[number]) => {
    setSelectedPreview(sample.url);
    setActiveSampleId(sample.id);
    updateAnalyzing(true);
    try {
      const response = await fetch(sample.url);
      const blob = await response.blob();
      const file = new File([blob], sample.filename, { type: blob.type || 'image/jpeg' });
      setSelectedFile(file);
      const receipt = await gradeProduceFileWithGemini(file, locale);
      onGradeComplete(receipt, sample.url);
    } finally {
      updateAnalyzing(false);
    }
  };

  const handleRunCurrentAnalysis = async () => {
    if (selectedFile) {
      updateAnalyzing(true);
      try {
        const receipt = await gradeProduceFileWithGemini(selectedFile, locale);
        onGradeComplete(receipt, selectedPreview);
      } finally {
        updateAnalyzing(false);
      }
      return;
    }

    const defaultSample =
      SAMPLE_FARM_PHOTOS.find((s) => s.id.includes(produce)) || SAMPLE_FARM_PHOTOS[0];
    await handleAnalyzeSample(defaultSample);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setActiveSampleId(null);
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    updateAnalyzing(true);
    try {
      const receipt = await gradeProduceFileWithGemini(file, locale);
      onGradeComplete(receipt, URL.createObjectURL(file));
    } finally {
      updateAnalyzing(false);
    }
  };

  return (
    <div
      className={`bg-white rounded-xl border p-5 shadow-xs transition-all duration-200 ${
        isHighlighted
          ? 'border-emerald-700 ring-2 ring-emerald-600/40 judge-highlight-ring'
          : 'border-stone-200'
      }`}
    >
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-stone-200">
        <div>
          <h3 className="text-sm font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <Camera className="w-4 h-4 text-emerald-800" />
            <span>Multimodal Produce Vision Grader</span>
          </h3>
          <p className="text-xs text-stone-600 mt-0.5">
            Powered by Google Gemini 2.5 Flash (@google/genai)
          </p>
        </div>
        <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg text-[11px]">
          <button
            type="button"
            onClick={() => setLocale('en-PK')}
            className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              locale === 'en-PK' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLocale('ur-PK')}
            className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              locale === 'ur-PK' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
            }`}
          >
            اردو
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {/* Upload & One-Click Sample Farm Photos Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-stretch">
          {/* File Upload Dropzone */}
          <div className="sm:col-span-6 border-2 border-dashed border-stone-200 rounded-xl p-4 text-center hover:border-emerald-700 transition-colors bg-stone-50/50 flex flex-col justify-between">
            {selectedPreview ? (
              <div className="space-y-2">
                <img
                  src={selectedPreview}
                  alt="Selected produce lot"
                  referrerPolicy="no-referrer"
                  className="w-full h-28 object-cover rounded-lg border border-stone-200"
                />
                <p className="text-[11px] text-stone-600 font-medium truncate">
                  {selectedFile?.name || 'Selected harvest photo'}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 py-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-stone-800">Upload harvest photo</p>
                <p className="text-[11px] text-stone-500">JPEG, PNG, WebP up to 3 MiB</p>
              </div>
            )}

            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800 text-white text-xs font-medium hover:bg-emerald-900 transition-colors cursor-pointer whitespace-nowrap">
                <Camera className="w-3.5 h-3.5" />
                <span>Choose File</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleRunCurrentAnalysis}
                disabled={isAnalyzing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{isAnalyzing ? 'Grading...' : 'Grade Photo'}</span>
              </button>
            </div>
          </div>

          {/* 3 One-Click Sample Farm Photo Buttons */}
          <div className="sm:col-span-6 flex flex-col justify-between space-y-2">
            <span className="text-[11px] font-semibold text-stone-600">
              Sample Farm Photo (1-Click Vision Test)
            </span>
            <div className="space-y-2 flex-1 flex flex-col justify-between">
              {SAMPLE_FARM_PHOTOS.map((sample) => {
                const isSelected = activeSampleId === sample.id;
                return (
                  <button
                    key={sample.id}
                    type="button"
                    disabled={isAnalyzing}
                    onClick={() => handleAnalyzeSample(sample)}
                    className={`w-full flex items-center gap-2.5 p-2 rounded-lg border text-left transition-colors cursor-pointer disabled:opacity-60 ${
                      isSelected
                        ? 'border-emerald-700 bg-emerald-50/70'
                        : 'border-stone-200 bg-white hover:bg-stone-50'
                    }`}
                  >
                    <img
                      src={sample.url}
                      alt={sample.label}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 object-cover rounded-md shrink-0 border border-stone-200"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-stone-900 truncate">{sample.label}</p>
                      <p className="text-[11px] text-stone-500 truncate">{sample.sublabel}</p>
                    </div>
                    {isSelected && !isAnalyzing && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
