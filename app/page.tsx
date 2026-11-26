'use client';

import React, { useState, useEffect } from 'react';
import { DaySelector } from '../components/market/DaySelector';
import { ShortageCard } from '../components/market/ShortageCard';
import { SupplyMap } from '../components/market/SupplyMap';
import { MatchList } from '../components/market/MatchList';
import { EvidenceStrip } from '../components/market/EvidenceStrip';
import { StrategistCard } from '../components/market/StrategistCard';
import { DeficitGap, Listing, ProduceCode, SupplyMatch } from '../lib/contracts';
import { sandboxRepository } from '../lib/repositories/marketRepository';
import { matchSupplyWithDeficits } from '../lib/matching';

export default function MarketBoardPage({
  onNavigateTab,
  onOpenTrade,
  tourHighlightSignal = 0,
}: {
  onNavigateTab?: (tab: 'market' | 'grow' | 'trades' | 'proof') => void;
  onOpenTrade?: (tradeId: string) => void;
  tourHighlightSignal?: number;
}) {
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-31');
  const [selectedProduce, setSelectedProduce] = useState<ProduceCode>('tomato');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [highlightShortage, setHighlightShortage] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [produceCounts, setProduceCounts] = useState<Record<ProduceCode, number>>({
    tomato: 1,
    spinach: 1,
    guava: 1,
  });

  const [marketData, setMarketData] = useState<{
    listings: Listing[];
    gaps: DeficitGap[];
    matches: SupplyMatch[];
  }>({
    listings: [],
    gaps: [],
    matches: [],
  });

  const refreshData = () => {
    const data = sandboxRepository.getMarketData(selectedProduce, selectedDate);
    const matches = matchSupplyWithDeficits(data.listings, data.gaps);
    setMarketData({
      listings: data.listings,
      gaps: data.gaps,
      matches,
    });
    setProduceCounts({
      tomato: sandboxRepository.getMarketData('tomato', selectedDate).listings.length,
      spinach: sandboxRepository.getMarketData('spinach', selectedDate).listings.length,
      guava: sandboxRepository.getMarketData('guava', selectedDate).listings.length,
    });
    if (matches.length > 0 && (!selectedMatchId || !matches.some((m) => m.id === selectedMatchId))) {
      setSelectedMatchId(matches[0].id);
    }
    setIsLoaded(true);
  };

  useEffect(() => {
    refreshData();
  }, [selectedDate, selectedProduce]);

  useEffect(() => {
    if (tourHighlightSignal > 0) {
      setSelectedDate('2026-10-31');
      setSelectedProduce('tomato');
      setHighlightShortage(true);
      const scrollTimer = setTimeout(() => {
        document
          .getElementById('tour-target-deficit')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 80);
      const highlightTimer = setTimeout(() => setHighlightShortage(false), 2600);
      return () => {
        clearTimeout(scrollTimer);
        clearTimeout(highlightTimer);
      };
    }
  }, [tourHighlightSignal]);

  const handleStartTrade = (listingId: string, storeId: string) => {
    const currentUser = sandboxRepository.getCurrentUserAgent();
    const { tradeId } = sandboxRepository.createTrade(listingId, storeId, currentUser.id);
    if (onOpenTrade) {
      onOpenTrade(tradeId);
    } else if (onNavigateTab) {
      onNavigateTab('trades');
    }
  };

  const currentGap =
    marketData.gaps.find((g) => g.produce === selectedProduce) || marketData.gaps[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-[11px] font-medium text-stone-600">
          Sample marketplace data — Multan weekday food-desert demonstration; switch to Grower Desk or Trade Room to test live workflows.
        </p>
      </div>

      {/* 1. Day & Commodity Selector */}
      <DaySelector
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        selectedProduce={selectedProduce}
        onSelectProduce={setSelectedProduce}
        produceCounts={produceCounts}
      />

      {!isLoaded ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-pulse" aria-busy="true">
          <div className="lg:col-span-5 space-y-4">
            <div className="h-64 rounded-xl bg-stone-200/70" />
            <div className="h-28 rounded-xl bg-stone-200/70" />
            <div className="h-36 rounded-xl bg-stone-200/70" />
          </div>
          <div className="lg:col-span-7 space-y-4">
            <div className="h-96 rounded-xl bg-stone-200/70" />
            <div className="h-24 rounded-xl bg-stone-200/70" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Shortage & Match List Column */}
          <div className="lg:col-span-5 space-y-5 flex flex-col order-1 lg:order-1">
            {/* 2. Shortage Card (10-second Judge Diagnostic) */}
            <div id="tour-target-deficit">
              {currentGap ? (
                <ShortageCard
                  gap={currentGap}
                  isHighlighted={highlightShortage}
                  onSelectAction={() => {
                    if (marketData.matches[0]) {
                      handleStartTrade(marketData.matches[0].listing.id, currentGap.storeId);
                    }
                  }}
                />
              ) : (
                <div className="bg-white rounded-xl border border-stone-200 p-5 text-sm text-stone-600">
                  No shortage forecast recorded for this produce and date.
                </div>
              )}
            </div>

            {/* Gemini Supply Chain Strategist Insight Card */}
            <StrategistCard
              selectedDate={selectedDate}
              selectedProduce={selectedProduce}
              gaps={marketData.gaps}
              matches={marketData.matches}
            />

            {/* 4. Match List (Keyboard accessible equivalent) */}
            <MatchList
              matches={marketData.matches}
              selectedMatchId={selectedMatchId}
              onSelectMatch={setSelectedMatchId}
              onStartTrade={handleStartTrade}
            />
          </div>

          {/* Spatial Supply Map Column */}
          <div className="lg:col-span-7 order-2 lg:order-2 flex flex-col gap-5">
            {/* 3. Supply Map */}
            <SupplyMap
              gaps={marketData.gaps}
              listings={marketData.listings}
              matches={marketData.matches}
              selectedMatchId={selectedMatchId}
              onSelectMatch={setSelectedMatchId}
            />

            {/* 5. Evidence Strip */}
            <EvidenceStrip onOpenProof={() => onNavigateTab && onNavigateTab('proof')} />
          </div>
        </div>
      )}
    </div>
  );
}
