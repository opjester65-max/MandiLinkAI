import React from 'react';
import { X, Compass, ArrowUpRight, Play } from 'lucide-react';

export type JudgeTourStep = 1 | 2 | 3 | 4;

interface JudgeQuickTourProps {
  activeStep: JudgeTourStep;
  isDismissed: boolean;
  onSelectStep: (step: JudgeTourStep) => void;
  onDismiss: () => void;
  onRestore: () => void;
}

const TOUR_STEPS: {
  step: JudgeTourStep;
  label: string;
  hint: string;
}[] = [
  {
    step: 1,
    label: '1. Friday 24kg Deficit',
    hint: 'Gulgasht Corner Store shortfall on Multan grid',
  },
  {
    step: 2,
    label: '2. Gemini Vision Grade',
    hint: 'Sample produce intake ready for multimodal grading',
  },
  {
    step: 3,
    label: '3. AI Bilingual Bargain',
    hint: 'Active trade room with EN/Urdu Gemini copilot',
  },
  {
    step: 4,
    label: '4. Verifiable Proof',
    hint: 'Model telemetry, Snowflake SQL & Devnet receipts',
  },
];

export function JudgeQuickTour({
  activeStep,
  isDismissed,
  onSelectStep,
  onDismiss,
  onRestore,
}: JudgeQuickTourProps) {
  if (isDismissed) {
    return (
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={onRestore}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-700 transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
        >
          <Play className="w-3.5 h-3.5 text-emerald-700" />
          <span>Resume Hackathon Judge Quick-Tour (60s)</span>
        </button>
      </div>
    );
  }

  const currentStepInfo = TOUR_STEPS.find((s) => s.step === activeStep) || TOUR_STEPS[0];

  return (
    <section
      aria-label="Hackathon Judge Quick-Tour"
      className="mb-5 bg-white rounded-xl border border-stone-200/90 px-4 py-3 shadow-2xs transition-all duration-200"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Title & Active Hint */}
        <div className="flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-800 shrink-0" />
              <h2 className="text-xs font-bold text-stone-900 tracking-tight whitespace-nowrap">
                Hackathon Judge Quick-Tour (60s)
              </h2>
            </div>
            <p className="text-[11px] text-stone-600 mt-0.5 truncate max-w-[300px] sm:max-w-none">
              {currentStepInfo.hint}
            </p>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss Judge Quick-Tour"
            className="lg:hidden p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
            title="Dismiss tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Clickable Step Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 -mx-1 px-1">
          {TOUR_STEPS.map((item) => {
            const isActive = activeStep === item.step;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => onSelectStep(item.step)}
                aria-current={isActive ? 'step' : undefined}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                  isActive
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200/80 hover:text-stone-900'
                }`}
              >
                <span>{item.label}</span>
                <ArrowUpRight
                  className={`w-3 h-3 ${isActive ? 'text-emerald-200' : 'text-stone-400'}`}
                />
              </button>
            );
          })}

          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss Judge Quick-Tour"
            className="hidden lg:inline-flex p-1.5 ml-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
            title="Dismiss tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
