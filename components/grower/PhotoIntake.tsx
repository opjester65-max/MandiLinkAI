import React, { useState } from 'react';
import { Camera, Upload, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  gradeProduceFileWithGemini,
  GradingReceipt,
  MAX_IMAGE_UPLOAD_BYTES,
} from '../../lib/providers/grading';
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
  const [uploadError, setUploadError] = useState<string | null>(null);

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
    setUploadError(null);
    setIsHighlighted(true);
    const scrollTimer = setTimeout(() => {
      document
        .getElementById('tour-target-vision')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
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
      clearTimeout(scrollTimer);
      clearTimeout(timer);
    };
  }, [tourHighlightSignal]);

  const handleAnalyzeSample = async (sample: (typeof SAMPLE_FARM_PHOTOS)[number]) => {
    setUploadError(null);
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
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to inspect sample photo. Please retry.');
    } finally {
      updateAnalyzing(false);
    }
  };

  const handleRunCurrentAnalysis = async () => {
    setUploadError(null);
    if (selectedFile) {
      if (selectedFile.size > MAX_IMAGE_UPLOAD_BYTES) {
        setUploadError('Image exceeds the 3 MiB limit. Choose a smaller JPEG, PNG, or WebP photo.');
        return;
      }
      updateAnalyzing(true);
      try {
        const receipt = await gradeProduceFileWithGemini(selectedFile, locale);
        onGradeComplete(receipt, selectedPreview);
      } catch (err: any) {
        setUploadError(err?.message || 'Unable to grade photo. Check format and size (<= 3 MiB).');
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
    e.target.value = '';
    if (!file) return;

    setUploadError(null);
    setActiveSampleId(null);

    if (file.size <= 0) {
      setUploadError('Uploaded file is empty (0 bytes). Please choose a valid image.');
      return;
    }

    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setUploadError(`Image is ${sizeMb} MiB, exceeding the 3.00 MiB upload limit.`);
      return;
    }

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
    } catch (err: any) {
      setUploadError(err?.message || 'Image rejected. Ensure it is a valid JPEG, PNG, or WebP under 3 MiB.');
    } finally {
      updateAnalyzing(false);
    }
  };

  return (
    <div
      id="tour-target-vision"
      className={`bg-white rounded-xl border p-5 shadow-xs transition-all duration-200 ${
        isHighlighted
          ? 'border-emerald-700 ring-2 ring-emerald-600/40 judge-highlight-ring'
          : 'border-stone-200'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-200">
        <div>
          <h3 className="text-sm font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <Camera className="w-4 h-4 text-emerald-800 shrink-0" />
            <span>Multimodal Produce Vision Grader</span>
          </h3>
          <p className="text-xs text-stone-600 mt-0.5">
            Powered by Google Gemini 2.5 Flash (@google/genai)
          </p>
        </div>
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setLocale('en-PK')}
            aria-pressed={locale === 'en-PK'}
            className={`px-3 min-h-[36px] rounded-md font-medium transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-stone-900 ${
              locale === 'en-PK' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLocale('ur-PK')}
            aria-pressed={locale === 'ur-PK'}
            lang="ur"
            dir="rtl"
            className={`px-3 min-h-[36px] rounded-md font-medium transition-colors cursor-pointer font-urdu focus-visible:ring-2 focus-visible:ring-stone-900 ${
              locale === 'ur-PK' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
            }`}
          >
            اردو
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {uploadError && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-red-50 border border-red-300 text-red-900 text-xs flex items-start gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Upload / Grading Error: </span>
              <span>{uploadError}</span>
            </div>
          </div>
        )}

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
                <p className="text-[11px] text-stone-500 tabular-nums">JPEG, PNG, WebP up to 3 MiB</p>
              </div>
            )}

            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-3 min-h-[44px] sm:min-h-[38px] rounded-lg bg-emerald-800 text-white text-xs font-medium hover:bg-emerald-900 transition-colors cursor-pointer whitespace-nowrap focus-within:ring-2 focus-within:ring-emerald-700">
                <Camera className="w-3.5 h-3.5" />
                <span>Choose File</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileUpload}
                  className="sr-only"
                />
              </label>

              <button
                type="button"
                onClick={handleRunCurrentAnalysis}
                disabled={isAnalyzing}
                className="inline-flex items-center gap-1.5 px-3 min-h-[44px] sm:min-h-[38px] rounded-lg bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-stone-900"
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
                    className={`w-full min-h-[54px] flex items-center gap-2.5 p-2 rounded-lg border text-left transition-colors cursor-pointer disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-emerald-700 ${
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
                      <p className="text-[11px] text-stone-500 truncate tabular-nums">{sample.sublabel}</p>
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
