import React from 'react';
import { Store, Sprout, Handshake, ShieldCheck, RefreshCw, UserCheck } from 'lucide-react';
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
  activeTradeCount = 0,
}: TopNavProps) {
  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F2] border-b border-stone-200/90 shadow-2xs backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Logo and Tagline */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={() => onSelectTab('market')}
              className="flex items-center gap-2.5 text-left group cursor-pointer focus-visible:outline-stone-900"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-800 text-amber-300 flex items-center justify-center font-black text-lg shadow-sm group-hover:bg-emerald-900 transition-colors">
                M
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-stone-900 tracking-tight text-lg">MandiLink</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-950 font-medium">Multan</span>
                </div>
                <p className="text-[11px] text-stone-600 leading-none">Hyperlocal Surplus Produce Exchange</p>
              </div>
            </button>

            {/* Mode Indicator & Reset */}
            <div className="flex items-center gap-2 sm:ml-4">
              <button
                onClick={() => onToggleMode(mode === 'sandbox' ? 'live' : 'sandbox')}
                className="cursor-pointer focus-visible:ring-2 focus-visible:ring-stone-800 rounded-full"
                title="Click to toggle between Practice Sandbox and Live Workspace"
              >
                <SourceBadge source={mode === 'sandbox' ? 'sandbox' : 'live'} />
              </button>

              {mode === 'sandbox' && onResetSandbox && (
                <button
                  onClick={onResetSandbox}
                  title="Reset practice market to clean initial Friday scenario"
                  className="p-1 text-stone-500 hover:text-stone-900 hover:bg-stone-200/70 rounded-md transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0" aria-label="Main Navigation">
            <button
              onClick={() => onSelectTab('market')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                currentTab === 'market'
                  ? 'bg-stone-900 text-[#FAF7F2]'
                  : 'text-stone-700 hover:bg-stone-200/60'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              Market Board
            </button>

            <button
              onClick={() => onSelectTab('grow')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                currentTab === 'grow'
                  ? 'bg-emerald-800 text-white'
                  : 'text-stone-700 hover:bg-stone-200/60'
              }`}
            >
              <Sprout className="w-3.5 h-3.5" />
              Grower Desk
            </button>

            <button
              onClick={() => onSelectTab('trades')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer relative ${
                currentTab === 'trades'
                  ? 'bg-purple-900 text-white'
                  : 'text-stone-700 hover:bg-stone-200/60'
              }`}
            >
              <Handshake className="w-3.5 h-3.5" />
              Trade Room
              {activeTradeCount > 0 && (
                <span className="w-4 h-4 text-[10px] rounded-full bg-amber-500 text-stone-900 font-bold flex items-center justify-center">
                  {activeTradeCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('proof')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                currentTab === 'proof'
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-700 hover:bg-stone-200/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              Evidence Desk
            </button>

            {/* Persona Switcher */}
            <button
              onClick={onSwitchUser}
              className="ml-auto sm:ml-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 transition-colors cursor-pointer"
              title="Click to toggle between Tariq (Buyer) and Fatima (Grower)"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span className="truncate max-w-[120px]">{currentUser.displayName.split(' ')[0]} ({currentUser.role})</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
