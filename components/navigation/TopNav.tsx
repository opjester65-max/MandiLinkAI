import React from 'react';
import { Store, Sprout, Handshake, ShieldCheck, RefreshCw, UserCheck, Sparkles } from 'lucide-react';
import { SourceBadge } from '../shared/SourceBadge';
import { Agent } from '../../lib/contracts';

interface TopNavProps {
  currentTab: 'market' | 'grow' | 'trades' | 'proof';
  onSelectTab: (tab: 'market' | 'grow' | 'trades' | 'proof') => void;
  mode: 'sandbox' | 'live';
  onToggleMode: (newMode: 'sandbox' | 'live') => void;
  currentUser: Agent;
  onSwitchUser: () => void;
  onResetSandbox?: () => void;
  onOpenArchitectureSpecs: () => void;
  activeTradeCount?: number;
}

export function TopNav({
  currentTab,
  onSelectTab,
  mode,
  onToggleMode,
  currentUser,
  onSwitchUser,
  onResetSandbox,
  onOpenArchitectureSpecs,
  activeTradeCount = 0,
}: TopNavProps) {
  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 border-b border-stone-200/90 shadow-2xs backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
          {/* Logo, Mode Indicator & Reset */}
          <div className="flex items-center gap-2 w-full xl:w-auto justify-between shrink-0">
            <button
              type="button"
              onClick={() => onSelectTab('market')}
              className="flex items-center gap-2.5 text-left group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded-xl p-1 -ml-1 min-w-0 min-h-[44px]"
            >
              <img
                src="/favicon.svg"
                alt="MandiLink AI 3D crate logo"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl shadow-xs group-hover:scale-105 transition-transform shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-stone-900 tracking-tight text-base sm:text-lg whitespace-nowrap">
                    MandiLink AI
                  </span>
                  <span className="text-[11px] text-stone-500 font-medium hidden sm:inline whitespace-nowrap">
                    · Multan
                  </span>
                </div>
                <p className="text-[11px] text-stone-600 leading-none truncate">
                  Hyperlocal Surplus Produce Exchange
                </p>
              </div>
            </button>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onToggleMode(mode === 'sandbox' ? 'live' : 'sandbox')}
                className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded-full shrink-0 min-h-[44px] sm:min-h-[36px] inline-flex items-center"
                title="Toggle between Practice Market Sandbox and Live Workspace"
              >
                <SourceBadge source={mode === 'sandbox' ? 'sandbox' : 'live'} />
              </button>

              {mode === 'sandbox' && onResetSandbox && (
                <button
                  type="button"
                  onClick={onResetSandbox}
                  title="Reset practice market to clean initial Friday scenario"
                  aria-label="Reset practice market"
                  className="min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-stone-200/70 rounded-lg transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Wrapped Navigation Tabs & Actions — Zero Horizontal Scrollbar at 390px, 768px & 1280px */}
          <nav
            className="flex flex-wrap items-center gap-1.5 w-full xl:w-auto xl:justify-end"
            aria-label="Main Navigation"
          >
            <button
              type="button"
              onClick={() => onSelectTab('market')}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] sm:min-h-[40px] rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                currentTab === 'market'
                  ? 'bg-stone-900 text-[#FAF7F2]'
                  : 'text-stone-700 hover:bg-stone-200/70'
              }`}
            >
              <Store className="w-3.5 h-3.5 shrink-0" />
              <span>Market Board</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('grow')}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] sm:min-h-[40px] rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                currentTab === 'grow'
                  ? 'bg-emerald-800 text-white'
                  : 'text-stone-700 hover:bg-stone-200/70'
              }`}
            >
              <Sprout className="w-3.5 h-3.5 shrink-0" />
              <span>Grower Desk</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('trades')}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] sm:min-h-[40px] rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                currentTab === 'trades'
                  ? 'bg-purple-900 text-white'
                  : 'text-stone-700 hover:bg-stone-200/70'
              }`}
            >
              <Handshake className="w-3.5 h-3.5 shrink-0" />
              <span>Trade Room</span>
              {activeTradeCount > 0 && (
                <span className="w-4 h-4 text-[10px] rounded-full bg-amber-500 text-stone-900 font-bold tabular-nums flex items-center justify-center">
                  {activeTradeCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('proof')}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] sm:min-h-[40px] rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                currentTab === 'proof'
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-700 hover:bg-stone-200/70'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Evidence Desk</span>
            </button>

            <button
              type="button"
              onClick={onOpenArchitectureSpecs}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] sm:min-h-[40px] rounded-full text-xs font-bold bg-stone-900 text-[#FAF7F2] hover:bg-stone-800 border border-stone-700 shadow-2xs transition-all whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
              title="Inspect Gemini 2.5 Flash prompts, JSON schemas, and live session telemetry"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>Gemini &amp; AI Studio Specs</span>
            </button>

            <button
              type="button"
              onClick={onSwitchUser}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] sm:min-h-[40px] rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
              title="Click to toggle between Tariq Mehmood (Buyer) and Bibi Fatima (Grower)"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>
                {currentUser.displayName} ({currentUser.role})
              </span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
