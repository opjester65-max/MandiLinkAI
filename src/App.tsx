/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TopNav } from '../components/navigation/TopNav';
import MarketBoardPage from '../app/page';
import GrowerDeskPage from '../app/grow/page';
import TradeRoomPage from '../app/trades/[id]/page';
import EvidenceDeskPage from '../app/proof/page';
import { sandboxRepository } from '../lib/repositories/marketRepository';
import { Agent } from '../lib/contracts';
import { FIXTURE_IDS } from '../lib/fixtures';
import { RetryPanel } from '../components/shared/RetryPanel';
import { checkLiveDatabaseCredentials } from '../lib/repositories/livePostgresRepository';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'market' | 'grow' | 'trades' | 'proof'>('market');
  const [activeTradeId, setActiveTradeId] = useState<string | undefined>(undefined);
  const [mode, setMode] = useState<'sandbox' | 'live'>('sandbox');
  const [currentUser, setCurrentUser] = useState<Agent>(sandboxRepository.getCurrentUserAgent());
  const [liveError, setLiveError] = useState<any | null>(null);

  // Sync current user persona
  const handleSwitchUser = () => {
    const nextAgentId =
      currentUser.id === FIXTURE_IDS.buyerTariq
        ? FIXTURE_IDS.growerFatima
        : FIXTURE_IDS.buyerTariq;
    sandboxRepository.switchActivePersona(nextAgentId);
    setCurrentUser(sandboxRepository.getCurrentUserAgent());
  };

  const handleToggleMode = (newMode: 'sandbox' | 'live') => {
    setMode(newMode);
    if (newMode === 'live') {
      const creds = checkLiveDatabaseCredentials();
      if (!creds.isConfigured) {
        setLiveError(creds.error);
      } else {
        setLiveError(null);
      }
    } else {
      setLiveError(null);
    }
  };

  const handleResetSandbox = () => {
    sandboxRepository.reset();
    setCurrentUser(sandboxRepository.getCurrentUserAgent());
    setActiveTradeId(undefined);
    // Reload active view
    window.location.reload();
  };

  const handleOpenTrade = (tradeId: string) => {
    setActiveTradeId(tradeId);
    setCurrentTab('trades');
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1A1E19] flex flex-col font-sans antialiased selection:bg-emerald-200">
      {/* Top Global Navigation */}
      <TopNav
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'trades') {
            setActiveTradeId(undefined);
          }
        }}
        mode={mode}
        onToggleMode={handleToggleMode}
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        onResetSandbox={handleResetSandbox}
        activeTradeCount={sandboxRepository.getMarketData('tomato').trades.length}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {mode === 'live' && liveError ? (
          <div className="max-w-3xl mx-auto py-8">
            <RetryPanel
              error={liveError}
              onRetry={() => handleToggleMode('live')}
              onSwitchToSandbox={() => handleToggleMode('sandbox')}
            />
          </div>
        ) : (
          <>
            {currentTab === 'market' && (
              <MarketBoardPage
                onNavigateTab={(tab) => setCurrentTab(tab)}
                onOpenTrade={handleOpenTrade}
              />
            )}

            {currentTab === 'grow' && (
              <GrowerDeskPage
                onNavigateTab={(tab) => setCurrentTab(tab)}
              />
            )}

            {currentTab === 'trades' && (
              <TradeRoomPage
                tradeId={activeTradeId}
                onBackToMarket={() => setCurrentTab('market')}
              />
            )}

            {currentTab === 'proof' && (
              <EvidenceDeskPage
                onBackToMarket={() => setCurrentTab('market')}
              />
            )}
          </>
        )}
      </main>

      {/* Footer Audit Bar */}
      <footer className="border-t border-stone-200/80 bg-stone-100/60 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-700">MandiLink Multan v1.0.0</span>
            <span>•</span>
            <span>Urban Food Desert Logistics Matchmaker</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentTab('proof')}
              className="hover:text-stone-900 transition-colors cursor-pointer underline"
            >
              Audit Receipts & Proofs
            </button>
            <span>•</span>
            <span>License: MIT (Ahmad)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
