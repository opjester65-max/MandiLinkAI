import React, { useEffect, useState } from 'react';
import {
  X,
  Sparkles,
  Camera,
  Languages,
  TrendingUp,
  Copy,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { SessionTelemetry } from '../../lib/telemetry/sessionTelemetry';
import { SourceBadge } from './SourceBadge';
import gradePromptRaw from '../../prompts/grade.txt?raw';
import {
  GEMINI_MODEL_ID,
  buildVisionPrompt,
  VISION_RESPONSE_SCHEMA_SPEC,
  buildBargainingPrompt,
  BARGAINING_RESPONSE_SCHEMA_SPEC,
  buildStrategistPrompt,
  STRATEGIST_RESPONSE_SCHEMA_SPEC,
} from '../../lib/providers/aiSpecs';

interface GeminiArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: SessionTelemetry;
}

type SpecTab = 'vision' | 'bargaining' | 'strategist';

const LIVE_VISION_PROMPT = buildVisionPrompt('en-PK', gradePromptRaw.trim());
const LIVE_VISION_SCHEMA = JSON.stringify(VISION_RESPONSE_SCHEMA_SPEC, null, 2);

const LIVE_BARGAINING_SPEC = `${buildBargainingPrompt({
  role: 'buyer',
  produce: 'tomato',
  availableKg: 30,
  askPkrKg: 120,
  intent: 'counter',
  locale: 'ur-PK',
  recentConversation: 'Sample preview context',
  cleanInstruction: 'Propose 20 kg at PKR 112/kg',
})}

// Response Schema & Guardrail imported from lib/providers/aiSpecs.ts:
${JSON.stringify(BARGAINING_RESPONSE_SCHEMA_SPEC, null, 2)}`;

const LIVE_STRATEGIST_SPEC = `${buildStrategistPrompt({
  date: '2026-10-31',
  produce: 'tomato',
  gapSummary: 'Gulgasht Corner Store: 24kg deficit (38kg demand - 14kg planned)',
  matchSummary: 'Bibi Fatima · Chenab Community Garden: 30kg available @ PKR 120/kg (3.4km away)',
})}

// Response Schema imported from lib/providers/aiSpecs.ts:
${JSON.stringify(STRATEGIST_RESPONSE_SCHEMA_SPEC, null, 2)}`;

export function GeminiArchitectureModal({
  isOpen,
  onClose,
  telemetry,
}: GeminiArchitectureModalProps) {
  const [activeTab, setActiveTab] = useState<SpecTab>('vision');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const hasLiveCalls = telemetry.totalLiveCalls > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-950/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gemini-arch-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl border border-stone-200 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#FAF7F2] border-b border-stone-200 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-stone-900 text-amber-300 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2
                id="gemini-arch-modal-title"
                className="text-base sm:text-lg font-bold text-stone-900 tracking-tight"
              >
                Built with Google AI Studio &amp; {GEMINI_MODEL_ID}
              </h2>
              <SourceBadge source={hasLiveCalls ? 'live' : 'simulated'} />
            </div>
            <p className="text-xs text-stone-600 mt-1">
              Prompts &amp; schemas imported directly from{' '}
              <code className="font-mono text-[11px] bg-stone-200/70 px-1.5 py-0.5 rounded text-stone-900">
                prompts/grade.txt
              </code>{' '}
              and{' '}
              <code className="font-mono text-[11px] bg-stone-200/70 px-1.5 py-0.5 rounded text-stone-900">
                lib/providers/aiSpecs.ts
              </code>
              .
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Gemini & AI Studio Specs modal"
            className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-200/70 transition-colors cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-stone-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Live Session Telemetry Counters */}
          <section aria-label="Live Session Telemetry">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-stone-900 tracking-tight">
                  Live Gemini API Session Telemetry
                </h3>
                <SourceBadge source={hasLiveCalls ? 'live' : 'simulated'} />
              </div>
              <span className="text-[11px] text-stone-600">
                Counts ONLY real <code className="font-mono">Live Gemini API</code> responses (starts at 0; simulated fallbacks excluded)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-xs font-medium text-stone-600 block">
                  Live Vision Grades
                </span>
                <span className="text-2xl font-mono font-bold tabular-nums text-stone-900 mt-1 block">
                  {telemetry.visionGradesRun}
                </span>
                <span className="text-[11px] text-stone-500 mt-0.5 block">
                  Real API photo gradings
                </span>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-xs font-medium text-stone-600 block">
                  Live Copilot &amp; Strategy
                </span>
                <span className="text-2xl font-mono font-bold tabular-nums text-stone-900 mt-1 block">
                  {telemetry.aiCounteroffersDrafted + telemetry.strategyCallsRun}
                </span>
                <span className="text-[11px] text-stone-500 mt-0.5 block tabular-nums">
                  {telemetry.aiCounteroffersDrafted} bargain · {telemetry.strategyCallsRun} strategy
                </span>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-xs font-medium text-stone-600 block">
                  Measured Latency
                </span>
                <span className="text-2xl font-mono font-bold tabular-nums text-stone-900 mt-1 block">
                  {telemetry.lastLatencyMs !== null ? `${telemetry.lastLatencyMs} ms` : '—'}
                </span>
                <span className="text-[11px] text-stone-500 mt-0.5 block tabular-nums">
                  {telemetry.avgLatencyMs !== null
                    ? `Session avg: ${telemetry.avgLatencyMs} ms`
                    : 'No live calls this session'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
                <span className="text-xs font-medium text-emerald-950 block">
                  Real Token Usage
                </span>
                <span className="text-2xl font-mono font-bold tabular-nums text-emerald-950 mt-1 block">
                  {telemetry.totalTokens.toLocaleString()}
                </span>
                <span className="text-[11px] text-emerald-900 mt-0.5 block tabular-nums">
                  {telemetry.totalPromptTokens.toLocaleString()} in · {telemetry.totalOutputTokens.toLocaleString()} out
                </span>
              </div>
            </div>
          </section>

          {/* 3-Pillar AI Studio Build Architecture */}
          <section aria-label="AI Studio Build Architecture">
            <h3 className="text-xs font-bold text-stone-900 tracking-tight mb-2.5">
              How Google AI Studio Build Mode &amp; {GEMINI_MODEL_ID} Power MandiLink AI
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-stone-200 bg-white space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-900">
                  <Camera className="w-4 h-4 text-emerald-800 shrink-0" />
                  <span>1. Multimodal Vision Grader</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Validates magic bytes (max 3 MiB), hashes SHA-256, discards raw bytes, and enforces strict JSON grading with non-produce &amp; blur safety blocking.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-stone-200 bg-white space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-900">
                  <Languages className="w-4 h-4 text-blue-800 shrink-0" />
                  <span>2. Bilingual Mandi Copilot</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Drafts natural English &amp; Pakistani Urdu (اردو) counteroffers grounded in store deficit math, gated by explicit human confirmation.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-stone-200 bg-white space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-900">
                  <TrendingUp className="w-4 h-4 text-purple-800 shrink-0" />
                  <span>3. Supply Chain Strategist</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Synthesizes simulated weekday deficit projections with Haversine grower proximity into 2-sentence dispatch guidance.
                </p>
              </div>
            </div>
          </section>

          {/* Interactive Prompt & JSON Schema Viewer */}
          <section aria-label="Prompts and JSON Schema Enforcement" className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-stone-900 tracking-tight">
                Live Source Prompts &amp; JSON Schema Specs
              </h3>

              <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg bg-stone-100 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('vision')}
                  className={`px-3 min-h-[38px] rounded-md text-xs font-semibold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-stone-900 ${
                    activeTab === 'vision'
                      ? 'bg-white text-stone-900 shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Vision Prompt &amp; Schema
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('bargaining')}
                  className={`px-3 min-h-[38px] rounded-md text-xs font-semibold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-stone-900 ${
                    activeTab === 'bargaining'
                      ? 'bg-white text-stone-900 shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Bilingual EN/Urdu Copilot
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('strategist')}
                  className={`px-3 min-h-[38px] rounded-md text-xs font-semibold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-stone-900 ${
                    activeTab === 'strategist'
                      ? 'bg-white text-stone-900 shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Dispatch Strategist
                </button>
              </div>
            </div>

            {activeTab === 'vision' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="bg-stone-950 text-stone-100 rounded-xl p-4 border border-stone-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono font-semibold text-emerald-400">
                      prompts/grade.txt + aiSpecs.ts · System Instruction
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy('vision-prompt', LIVE_VISION_PROMPT)}
                      className="inline-flex items-center gap-1 min-h-[32px] px-2 rounded text-stone-300 hover:text-white cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-400"
                    >
                      {copiedKey === 'vision-prompt' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedKey === 'vision-prompt' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="font-mono text-[11px] leading-relaxed text-stone-200 whitespace-pre-wrap overflow-x-auto">
                    {LIVE_VISION_PROMPT}
                  </pre>
                </div>

                <div className="bg-stone-950 text-stone-100 rounded-xl p-4 border border-stone-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono font-semibold text-amber-300">
                      lib/providers/aiSpecs.ts · VISION_RESPONSE_SCHEMA_SPEC
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy('vision-schema', LIVE_VISION_SCHEMA)}
                      className="inline-flex items-center gap-1 min-h-[32px] px-2 rounded text-stone-300 hover:text-white cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-300"
                    >
                      {copiedKey === 'vision-schema' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedKey === 'vision-schema' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="font-mono text-[11px] leading-relaxed text-emerald-300 overflow-x-auto">
                    {LIVE_VISION_SCHEMA}
                  </pre>
                </div>
              </div>
            )}

            {activeTab === 'bargaining' && (
              <div className="bg-stone-950 text-stone-100 rounded-xl p-4 border border-stone-800 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono font-semibold text-blue-300">
                    lib/providers/aiSpecs.ts · buildBargainingPrompt &amp; Schema
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy('bargaining-spec', LIVE_BARGAINING_SPEC)}
                    className="inline-flex items-center gap-1 min-h-[32px] px-2 rounded text-stone-300 hover:text-white cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-300"
                  >
                    {copiedKey === 'bargaining-spec' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedKey === 'bargaining-spec' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="font-mono text-[11px] leading-relaxed text-stone-200 whitespace-pre-wrap overflow-x-auto">
                  {LIVE_BARGAINING_SPEC}
                </pre>
              </div>
            )}

            {activeTab === 'strategist' && (
              <div className="bg-stone-950 text-stone-100 rounded-xl p-4 border border-stone-800 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono font-semibold text-purple-300">
                    lib/providers/aiSpecs.ts · buildStrategistPrompt &amp; Schema
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy('strategist-spec', LIVE_STRATEGIST_SPEC)}
                    className="inline-flex items-center gap-1 min-h-[32px] px-2 rounded text-stone-300 hover:text-white cursor-pointer focus-visible:ring-2 focus-visible:ring-purple-300"
                  >
                    {copiedKey === 'strategist-spec' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedKey === 'strategist-spec' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="font-mono text-[11px] leading-relaxed text-stone-200 whitespace-pre-wrap overflow-x-auto">
                  {LIVE_STRATEGIST_SPEC}
                </pre>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-stone-600">
            <ShieldCheck className="w-4 h-4 text-emerald-800 shrink-0" />
            <span>
              Server-side @google/genai SDK when GEMINI_API_KEY is valid; clearly labeled Simulated (No API Key) otherwise.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 min-h-[44px] sm:min-h-[38px] rounded-lg bg-stone-900 text-white font-semibold text-xs hover:bg-stone-800 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-stone-900"
          >
            Close Specs
          </button>
        </div>
      </div>
    </div>
  );
}
