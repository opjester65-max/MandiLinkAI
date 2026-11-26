/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TopNav } from '../components/navigation/TopNav';
import { JudgeQuickTour, JudgeTourStep } from '../components/navigation/JudgeQuickTour';
import { GeminiArchitectureModal } from '../components/shared/GeminiArchitectureModal';
import MarketBoardPage from '../app/page';
import GrowerDeskPage from '../app/grow/page';
import TradeRoomPage from '../app/trades/[id]/page';
import EvidenceDeskPage from '../app/proof/page';
import { sandboxRepository } from '../lib/repositories/marketRepository';
import { Agent } from '../lib/contracts';
import { FIXTURE_IDS } from '../lib/fixtures';
import { RetryPanel } from '../components/shared/RetryPanel';
import { checkLiveDatabaseCredentials } from '../lib/repositories/livePostgresRepository';
import {
  getSessionTelemetry,
  resetSessionTelemetry,
  subscribeSessionTelemetry,
  SessionTelemetry,
} from '../lib/telemetry/sessionTelemetry';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'market' | 'grow' | 'trades' | 'proof'>('market');
  const [activeTradeId, setActiveTradeId] = useState<string | undefined>(undefined);
  const [mode, setMode] = useState<'sandbox' | 'live'>('sandbox');
  const [currentUser, setCurrentUser] = useState<Agent>(sandboxRepository.getCurrentUserAgent());
  const [liveError, setLiveError] = useState<any | null>(null);

  // Judge Quick-Tour & Gemini Specs Modal state
  const [activeTourStep, setActiveTourStep] = useState<JudgeTourStep>(1);
  const [tourDismissed, setTourDismissed] = useState<boolean>(false);
  const [isSpecsModalOpen, setIsSpecsModalOpen] = useState<boolean>(false);
  const [marketHighlightSignal, setMarketHighlightSignal] = useState<number>(0);
  const [growHighlightSignal, setGrowHighlightSignal] = useState<number>(0);
  const [tradeHighlightSignal, setTradeHighlightSignal] = useState<number>(0);
  const [proofHighlightSignal, setProofHighlightSignal] = useState<number>(0);
  const [telemetry, setTelemetry] = useState<SessionTelemetry>(() => getSessionTelemetry());

  useEffect(() => {
    setTelemetry(getSessionTelemetry());
    return subscribeSessionTelemetry(() => {
      setTelemetry(getSessionTelemetry());
    });
  }, []);

  // Sync current user persona across all tabs
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
    resetSessionTelemetry();
    setCurrentUser(sandboxRepository.getCurrentUserAgent());
    setActiveTradeId(undefined);
    setTelemetry(getSessionTelemetry());
    window.location.reload();
  };

  const handleOpenTrade = (tradeId: string) => {
    setActiveTradeId(tradeId);
    setCurrentTab('trades');
    setActiveTourStep(3);
    setTelemetry(getSessionTelemetry());
  };

  const handleSelectTab = (tab: 'market' | 'grow' | 'trades' | 'proof') => {
    setCurrentTab(tab);
    if (tab === 'market') setActiveTourStep(1);
    if (tab === 'grow') setActiveTourStep(2);
    if (tab === 'trades') setActiveTourStep(3);
    if (tab === 'proof') setActiveTourStep(4);
    if (tab !== 'trades') {
      setActiveTradeId(undefined);
    }
    setTelemetry(getSessionTelemetry());
  };

  const handleSelectTourStep = (step: JudgeTourStep) => {
    setActiveTourStep(step);
    setTourDismissed(false);
    if (step === 1) {
      setCurrentTab('market');
      setMarketHighlightSignal((n) => n + 1);
    } else if (step === 2) {
      setCurrentTab('grow');
      setGrowHighlightSignal((n) => n + 1);
    } else if (step === 3) {
      const market = sandboxRepository.getMarketData('tomato', '2026-10-31');
      if (market.trades.length > 0) {
        setActiveTradeId(market.trades[0].id);
      } else {
        const { tradeId } = sandboxRepository.createTrade(
          FIXTURE_IDS.listingChenabTomato,
          FIXTURE_IDS.storeGulgasht,
          currentUser.id,
          '2026-10-31'
        );
        setActiveTradeId(tradeId);
      }
      setCurrentTab('trades');
      setTradeHighlightSignal((n) => n + 1);
    } else if (step === 4) {
      setCurrentTab('proof');
      setProofHighlightSignal((n) => n + 1);
    }
    setTelemetry(getSessionTelemetry());
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1A1E19] flex flex-col font-sans antialiased selection:bg-emerald-200 overflow-x-clip">
      {/* Top Global Navigation */}
      <TopNav
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        mode={mode}
        onToggleMode={handleToggleMode}
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        onResetSandbox={handleResetSandbox}
        onOpenArchitectureSpecs={() => {
          setTelemetry(getSessionTelemetry());
          setIsSpecsModalOpen(true);
        }}
        activeTradeCount={sandboxRepository.getMarketData('tomato').trades.length}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-5">
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
            {/* Guided Hackathon Judge Quick-Tour Bar */}
            <JudgeQuickTour
              activeStep={activeTourStep}
              isDismissed={tourDismissed}
              onSelectStep={handleSelectTourStep}
              onDismiss={() => setTourDismissed(true)}
              onRestore={() => setTourDismissed(false)}
            />

            {currentTab === 'market' && (
              <MarketBoardPage
                onNavigateTab={handleSelectTab}
                onOpenTrade={handleOpenTrade}
                tourHighlightSignal={marketHighlightSignal}
              />
            )}

            {currentTab === 'grow' && (
              <GrowerDeskPage
                onNavigateTab={handleSelectTab}
                tourHighlightSignal={growHighlightSignal}
                currentUser={currentUser}
              />
            )}

            {currentTab === 'trades' && (
              <TradeRoomPage
                tradeId={activeTradeId}
                onBackToMarket={() => handleSelectTab('market')}
                currentUser={currentUser}
                onSwitchUser={handleSwitchUser}
                tourHighlightSignal={tradeHighlightSignal}
              />
            )}

            {currentTab === 'proof' && (
              <EvidenceDeskPage
                onBackToMarket={() => handleSelectTab('market')}
                tourHighlightSignal={proofHighlightSignal}
              />
            )}
          </>
        )}
      </main>

      {/* Interactive Gemini & AI Studio Architecture Modal */}
      <GeminiArchitectureModal
        isOpen={isSpecsModalOpen}
        onClose={() => setIsSpecsModalOpen(false)}
        telemetry={telemetry}
      />

      {/* Footer Audit Bar */}
      <footer className="border-t border-stone-200/80 bg-stone-100/60 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-600">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-800">MandiLink AI · Multan</span>
            <span>·</span>
            <span>Urban Food Desert Logistics Matchmaker</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => handleSelectTab('proof')}
              className="min-h-[36px] px-2 hover:text-stone-900 transition-colors cursor-pointer underline focus-visible:ring-2 focus-visible:ring-stone-900 rounded"
            >
              Audit Receipts &amp; Proofs
            </button>
            <span>·</span>
            <span>License: MIT</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
