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
    if (matches.length > 0 && (!selectedMatchId || !matches.some((m) => m.id === selectedMatchId))) {
      setSelectedMatchId(matches[0].id);
    }
  };

  useEffect(() => {
    refreshData();
  }, [selectedDate, selectedProduce]);

  useEffect(() => {
    if (tourHighlightSignal > 0) {
      setSelectedDate('2026-10-31');
      setSelectedProduce('tomato');
      setHighlightShortage(true);
      const timer = setTimeout(() => setHighlightShortage(false), 2600);
      return () => clearTimeout(timer);
    }
  }, [tourHighlightSignal]);

  const produceCounts = {
    tomato: 1,
    spinach: 1,
    guava: 1,
  };

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
    <div className="space-y-6">
      {/* 1. Day & Commodity Selector */}
      <DaySelector
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        selectedProduce={selectedProduce}
        onSelectProduce={setSelectedProduce}
        produceCounts={produceCounts}
      />

      {/* Mobile-first Layout:
          At 390px, Shortage and Matches are above the Map as required */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Shortage & Match List Column */}
        <div className="lg:col-span-5 space-y-5 flex flex-col order-1 lg:order-1">
          {/* 2. Shortage Card (10-second Judge Diagnostic) */}
          {currentGap && (
            <ShortageCard
              gap={currentGap}
              isHighlighted={highlightShortage}
              onSelectAction={() => {
                if (marketData.matches[0]) {
                  handleStartTrade(marketData.matches[0].listing.id, currentGap.storeId);
                }
              }}
            />
          )}

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
    </div>
  );
}
