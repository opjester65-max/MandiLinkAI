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
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Logo, Mode Indicator & Specs Action on mobile */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-between">
            <button
              type="button"
              onClick={() => onSelectTab('market')}
              className="flex items-center gap-2.5 text-left group cursor-pointer focus-visible:outline-stone-900 min-w-0"
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

            {/* Mode Indicator & Reset */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onToggleMode(mode === 'sandbox' ? 'live' : 'sandbox')}
                className="cursor-pointer focus-visible:ring-2 focus-visible:ring-stone-800 rounded-full shrink-0"
                title="Click to toggle between Practice Sandbox and Live Workspace"
              >
                <SourceBadge source={mode === 'sandbox' ? 'sandbox' : 'live'} />
              </button>

              {mode === 'sandbox' && onResetSandbox && (
                <button
                  type="button"
                  onClick={onResetSandbox}
                  title="Reset practice market to clean initial Friday scenario"
                  aria-label="Reset practice market"
                  className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-200/70 rounded-md transition-colors cursor-pointer shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Navigation Tabs & Gemini Specs + Persona */}
          <nav
            className="flex items-center gap-1.5 w-full lg:w-auto overflow-x-auto pb-0.5 lg:pb-0"
            aria-label="Main Navigation"
          >
            <button
              type="button"
              onClick={() => onSelectTab('market')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                currentTab === 'market'
                  ? 'bg-stone-900 text-[#FAF7F2]'
                  : 'text-stone-700 hover:bg-stone-200/60'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Market Board</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('grow')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                currentTab === 'grow'
                  ? 'bg-emerald-800 text-white'
                  : 'text-stone-700 hover:bg-stone-200/60'
              }`}
            >
              <Sprout className="w-3.5 h-3.5" />
              <span>Grower Desk</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('trades')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer relative ${
                currentTab === 'trades'
                  ? 'bg-purple-900 text-white'
                  : 'text-stone-700 hover:bg-stone-200/60'
              }`}
            >
              <Handshake className="w-3.5 h-3.5" />
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                currentTab === 'proof'
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-700 hover:bg-stone-200/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Evidence Desk</span>
            </button>

            {/* Prominent Gemini & AI Studio Specs Pill */}
            <button
              type="button"
              onClick={onOpenArchitectureSpecs}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-stone-900 text-[#FAF7F2] hover:bg-stone-800 border border-stone-700 shadow-2xs transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-700"
              title="Inspect Gemini 2.5 Flash prompts, JSON schemas, and live session telemetry"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>Gemini &amp; AI Studio Specs</span>
            </button>

            {/* Persona Switcher */}
            <button
              type="button"
              onClick={onSwitchUser}
              className="ml-auto lg:ml-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Click to toggle between Tariq (Buyer) and Fatima (Grower)"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="truncate max-w-[120px]">
                {currentUser.displayName.split(' ')[0]} ({currentUser.role})
              </span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
