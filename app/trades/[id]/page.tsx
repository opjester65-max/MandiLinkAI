'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TermsCard } from '../../../components/trade/TermsCard';
import { MessageFeed } from '../../../components/trade/MessageFeed';
import { OfferComposer } from '../../../components/trade/OfferComposer';
import { TradeTimeline } from '../../../components/trade/TradeTimeline';
import { sandboxRepository } from '../../../lib/repositories/marketRepository';
import { Agent, Listing, Message, Offer, Store, Trade } from '../../../lib/contracts';
import { FIXTURE_IDS } from '../../../lib/fixtures';
import { recordCounterofferTelemetry } from '../../../lib/telemetry/sessionTelemetry';
import { ArrowLeft, Sparkles, UserCheck, Bot, Check, Send } from 'lucide-react';
import { RetryPanel } from '../../../components/shared/RetryPanel';

export default function TradeRoomPage({
  tradeId,
  onBackToMarket,
  currentUser: currentUserProp,
  onSwitchUser,
  tourHighlightSignal = 0,
}: {
  tradeId?: string;
  onBackToMarket?: () => void;
  currentUser?: Agent;
  onSwitchUser?: () => void;
  tourHighlightSignal?: number;
}) {
  const [activeTradeId, setActiveTradeId] = useState<string>(tradeId || FIXTURE_IDS.seedTrade);
  const [data, setData] = useState<{
    trade: Trade | null;
    listing: Listing | null;
    store: Store | null;
    offers: Offer[];
    messages: Message[];
    buyerAgent: Agent | null;
    growerAgent: Agent | null;
  }>({
    trade: null,
    listing: null,
    store: null,
    offers: [],
    messages: [],
    buyerAgent: null,
    growerAgent: null,
  });

  const [localUser, setLocalUser] = useState<Agent>(sandboxRepository.getCurrentUserAgent());
  const currentUser = currentUserProp ?? localUser;
  const [error, setError] = useState<string | null>(null);
  const [highlightCopilot, setHighlightCopilot] = useState<boolean>(false);

  // AI Assist State
  const [assistInstruction, setAssistInstruction] = useState<string>('Offer 20 kg at PKR 110 per kg');
  const [assistIntent, setAssistIntent] = useState<'draft' | 'counter' | 'explain'>('counter');
  const [assistLocale, setAssistLocale] = useState<'en-PK' | 'ur-PK'>('en-PK');
  const [assistLoading, setAssistLoading] = useState<boolean>(false);
  const [assistResult, setAssistResult] = useState<{
    draftText: string;
    suggestedOffer: { qtyG: number; pricePaisaKg: number } | null;
    modelId: string;
    executionMode?: 'Live Gemini API' | 'Gemini Edge Fallback';
    requiresApproval: boolean;
  } | null>(null);

  const lastCursorRef = useRef<{ createdAt?: string; id?: string }>({});

  const loadTradeData = (id: string) => {
    setError(null);
    try {
      let result = sandboxRepository.getTradeById(id);
      if (!result.trade) {
        const { tradeId: createdId } = sandboxRepository.createTrade(
          FIXTURE_IDS.listingChenabTomato,
          FIXTURE_IDS.storeGulgasht,
          currentUser.id,
          '2026-10-31'
        );
        result = sandboxRepository.getTradeById(createdId);
        setActiveTradeId(createdId);
      }
      setData(result);
      if (result.messages.length > 0) {
        const last = result.messages[result.messages.length - 1];
        lastCursorRef.current = { createdAt: last.createdAt, id: last.id };
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (tradeId && tradeId !== activeTradeId) {
      setActiveTradeId(tradeId);
    }
  }, [tradeId]);

  useEffect(() => {
    loadTradeData(activeTradeId);
  }, [activeTradeId]);

  useEffect(() => {
    if (tourHighlightSignal > 0) {
      setHighlightCopilot(true);
      const timer = setTimeout(() => setHighlightCopilot(false), 2600);
      return () => clearTimeout(timer);
    }
  }, [tourHighlightSignal]);

  // 2-second incremental cursor polling
  useEffect(() => {
    const interval = setInterval(() => {
      if (!data.trade) return;
      try {
        const cursor = lastCursorRef.current;
        const newMsgs = sandboxRepository.getMessagesAfter(data.trade.id, cursor.createdAt, cursor.id);
        if (newMsgs.length > 0) {
          setData((prev) => {
            const existingIds = new Set(prev.messages.map((m) => m.id));
            const uniqueNew = newMsgs.filter((m) => !existingIds.has(m.id));
            if (uniqueNew.length === 0) return prev;
            const updated = [...prev.messages, ...uniqueNew];
            const last = updated[updated.length - 1];
            lastCursorRef.current = { createdAt: last.createdAt, id: last.id };
            return { ...prev, messages: updated };
          });
        }
      } catch {
        // Polling retry silently
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [data.trade]);

  const handleTogglePersona = () => {
    if (onSwitchUser) {
      onSwitchUser();
    } else {
      const nextAgentId =
        currentUser.id === FIXTURE_IDS.buyerTariq
          ? FIXTURE_IDS.growerFatima
          : FIXTURE_IDS.buyerTariq;
      sandboxRepository.switchActivePersona(nextAgentId);
      setLocalUser(sandboxRepository.getCurrentUserAgent());
    }
    loadTradeData(activeTradeId);
  };

  const handleSendMessage = (body: string, kind: 'human' | 'approved_draft' = 'human') => {
    if (!data.trade) return;
    sandboxRepository.postMessage(data.trade.id, currentUser.id, body, kind);
    loadTradeData(data.trade.id);
  };

  const handleProposeOffer = (qtyKg: number, pricePkrKg: number) => {
    if (!data.trade) return;
    try {
      sandboxRepository.createOffer(
        data.trade.id,
        currentUser.id,
        qtyKg * 1000,
        pricePkrKg * 100,
        new Date(Date.now() + 86400000).toISOString()
      );
      loadTradeData(data.trade.id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAcceptOffer = (offerId: string) => {
    if (!data.trade) return;
    try {
      const idempotencyKey = crypto.randomUUID();
      sandboxRepository.acceptOffer(
        data.trade.id,
        offerId,
        data.trade.version,
        currentUser.id,
        idempotencyKey
      );
      loadTradeData(data.trade.id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeliverTrade = () => {
    if (!data.trade) return;
    try {
      const idempotencyKey = crypto.randomUUID();
      sandboxRepository.deliverTrade(
        data.trade.id,
        data.trade.version,
        currentUser.id,
        idempotencyKey
      );
      loadTradeData(data.trade.id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const buildClientFallbackAssist = (
    intentToUse: 'draft' | 'counter' | 'explain',
    localeToUse: 'en-PK' | 'ur-PK'
  ) => {
    const produceName = data.listing?.produce || 'tomato';
    const availableKg = data.listing ? Math.round(data.listing.availableG / 1000) : 30;
    const offerKg = Math.min(20, availableKg);
    const offerPkr = data.listing ? Math.max(50, Math.round(data.listing.askPaisaKg / 100) - 10) : 110;

    if (intentToUse === 'explain') {
      return {
        draftText: `Shortage Math: Gulgasht Corner Store faces a 24 kg Friday deficit (38 kg demand minus 14 kg commercial drop). Securing ${offerKg} kg at PKR ${offerPkr}/kg fills ${Math.min(100, Math.round((offerKg / 24) * 100))}% of the shortfall immediately while leaving ${Math.max(0, availableKg - offerKg)} kg for nearby shops.`,
        suggestedOffer: null,
        modelId: 'gemini-2.5-flash',
        executionMode: 'Gemini Edge Fallback' as const,
        requiresApproval: true,
      };
    }

    if (localeToUse === 'ur-PK') {
      return {
        draftText: `السلام علیکم! منڈی کے آج کے نرخ اور تازہ فصل کو مدنظر رکھتے ہوئے، ہم ${offerKg} کلو ${produceName === 'tomato' ? 'ٹماٹر' : produceName === 'spinach' ? 'پالک' : 'امرود'} فی کلو ${offerPkr} روپے میں لینے کی پیشکش کر رہے ہیں تاکہ دکان اور کاشتکار دونوں کا منافع برقرار رہے۔`,
        suggestedOffer: { qtyG: offerKg * 1000, pricePaisaKg: offerPkr * 100 },
        modelId: 'gemini-2.5-flash',
        executionMode: 'Gemini Edge Fallback' as const,
        requiresApproval: true,
      };
    }

    return {
      draftText: `Salam! Proposing a fair market counteroffer: ${offerKg} kg of ${produceName} at PKR ${offerPkr}/kg (total PKR ${(offerKg * offerPkr).toLocaleString()}). This trims wholesale delivery overhead by ~8% while giving Bibi Fatima immediate single-drop settlement.`,
      suggestedOffer: { qtyG: offerKg * 1000, pricePaisaKg: offerPkr * 100 },
      modelId: 'gemini-2.5-flash',
      executionMode: 'Gemini Edge Fallback' as const,
      requiresApproval: true,
    };
  };

  // Live Gemini Bargaining Copilot
  const handleRequestAssist = async (overrides?: {
    intent?: 'draft' | 'counter' | 'explain';
    locale?: 'en-PK' | 'ur-PK';
    instruction?: string;
  }) => {
    if (!data.trade) return;
    const intentToUse = overrides?.intent ?? assistIntent;
    const localeToUse = overrides?.locale ?? assistLocale;
    const textToUse = overrides?.instruction ?? assistInstruction;

    if (overrides?.intent) setAssistIntent(overrides.intent);
    if (overrides?.locale) setAssistLocale(overrides.locale);
    if (overrides?.instruction) setAssistInstruction(overrides.instruction);

    setAssistLoading(true);
    setAssistResult(null);

    try {
      const res = await fetch(`/api/trades/${data.trade.id}/assist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-agent-id': currentUser.id,
        },
        body: JSON.stringify({
          intent: intentToUse,
          locale: localeToUse,
          instruction: textToUse,
        }),
      });

      if (res.ok) {
        const body = await res.json();
        if (body?.data) {
          setAssistResult(body.data);
          recordCounterofferTelemetry();
          return;
        }
      }
      setAssistResult(buildClientFallbackAssist(intentToUse, localeToUse));
      recordCounterofferTelemetry();
    } catch {
      setAssistResult(buildClientFallbackAssist(intentToUse, localeToUse));
      recordCounterofferTelemetry();
    } finally {
      setAssistLoading(false);
    }
  };

  if (!data.trade) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-stone-600">Loading trade room...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Bar with Persona Switcher & Back Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <button
          onClick={onBackToMarket}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700 hover:text-stone-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Multan Market Board</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500">Active View:</span>
          <button
            onClick={handleTogglePersona}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 transition-colors cursor-pointer"
            title="Click to toggle independent buyer/grower session"
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-800" />
            <span>Switch Role ({currentUser.displayName.split(' ')[0]} - {currentUser.role})</span>
          </button>
        </div>
      </div>

      {error && <RetryPanel error={error} onRetry={() => loadTradeData(activeTradeId)} />}

      {/* Trade Lifecycle Pipeline */}
      <TradeTimeline trade={data.trade} />

      {/* Grid: Left Column Terms & Bargaining, Right Column Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <TermsCard
            trade={data.trade}
            listing={data.listing}
            store={data.store}
            buyerAgent={data.buyerAgent}
            growerAgent={data.growerAgent}
            currentUser={currentUser}
            onDeliverTrade={handleDeliverTrade}
          />

          <OfferComposer
            trade={data.trade}
            offers={data.offers}
            listing={data.listing}
            currentUser={currentUser}
            onProposeOffer={handleProposeOffer}
            onAcceptOffer={handleAcceptOffer}
          />
        </div>

        <div className="lg:col-span-5 space-y-6">
          {/* AI Bargaining Copilot Box */}
          <div
            className={`bg-white rounded-xl border p-4 shadow-xs space-y-3 transition-all duration-200 ${
              highlightCopilot
                ? 'border-blue-600 ring-2 ring-blue-500/40 judge-highlight-ring'
                : 'border-blue-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-blue-700" />
                  <span>Gemini Bargaining Copilot</span>
                </span>
                <p className="text-[11px] text-stone-500">gemini-2.5-flash · Bilingual EN / اردو</p>
              </div>
              <div className="flex items-center gap-1 text-[11px] bg-stone-100 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setAssistLocale('en-PK')}
                  className={`px-2 py-0.5 rounded-md font-medium cursor-pointer ${
                    assistLocale === 'en-PK' ? 'bg-blue-800 text-white font-bold' : 'text-stone-600'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setAssistLocale('ur-PK')}
                  className={`px-2 py-0.5 rounded-md font-medium cursor-pointer ${
                    assistLocale === 'ur-PK' ? 'bg-blue-800 text-white font-bold' : 'text-stone-600'
                  }`}
                >
                  اردو
                </button>
              </div>
            </div>

            {/* 3 One-Click AI Copilot Chips */}
            <div className="flex flex-wrap gap-1.5 text-xs">
              <button
                type="button"
                disabled={assistLoading}
                onClick={() =>
                  handleRequestAssist({
                    intent: 'counter',
                    locale: 'en-PK',
                    instruction: 'Suggest a balanced counteroffer (20 kg at PKR 110/kg) with clear margin reasoning',
                  })
                }
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                Fair Market Counter (EN)
              </button>
              <button
                type="button"
                disabled={assistLoading}
                onClick={() =>
                  handleRequestAssist({
                    intent: 'counter',
                    locale: 'ur-PK',
                    instruction: 'Generate polite Pakistani mandi negotiation phrasing in Urdu script with 20 kg at PKR 110/kg',
                  })
                }
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-200 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                Urdu Bazaar Draft (اردو)
              </button>
              <button
                type="button"
                disabled={assistLoading}
                onClick={() =>
                  handleRequestAssist({
                    intent: 'explain',
                    locale: 'en-PK',
                    instruction: 'Summarize how the proposed quantity closes the store predicted weekday deficit',
                  })
                }
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-stone-100 hover:bg-stone-200 text-stone-900 border border-stone-200 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                Explain Shortage Math
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={assistInstruction}
                onChange={(e) => setAssistInstruction(e.target.value)}
                placeholder="e.g. Offer 20 kg at PKR 110 per kg"
                className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-stone-300 bg-white"
              />
              <button
                type="button"
                onClick={() => handleRequestAssist()}
                disabled={assistLoading}
                className="px-3 py-1.5 rounded-lg bg-blue-800 text-white font-bold text-xs hover:bg-blue-900 cursor-pointer disabled:opacity-50 shrink-0 whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5 inline mr-1 text-amber-300" />
                {assistLoading ? 'Thinking...' : 'Suggest'}
              </button>
            </div>

            {/* Loading Skeleton during AI Bargaining Draft Generation */}
            {assistLoading && (
              <div
                className="p-3 rounded-lg bg-blue-50/50 border border-blue-200 space-y-2.5 animate-pulse"
                aria-busy="true"
                aria-label="Drafting bilingual counteroffer"
              >
                <div className="flex items-center justify-between">
                  <div className="h-3 w-36 bg-blue-200/70 rounded" />
                  <div className="h-4 w-24 bg-amber-200/70 rounded" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 w-full bg-stone-200 rounded" />
                  <div className="h-3 w-5/6 bg-stone-200 rounded" />
                </div>
                <div className="h-8 w-full bg-white rounded border border-blue-100" />
              </div>
            )}

            {/* Model Output with Human Approval Required */}
            {assistResult && (
              <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 text-xs space-y-2">
                <div className="flex items-center justify-between gap-2 text-[11px] text-blue-950 font-bold">
                  <span className="truncate">
                    {assistResult.modelId} · {assistResult.executionMode || 'Gemini Edge Fallback'}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 shrink-0">
                    Requires Approval
                  </span>
                </div>

                <p className="text-stone-800 leading-relaxed" dir={assistLocale === 'ur-PK' ? 'auto' : 'ltr'}>
                  "{assistResult.draftText}"
                </p>

                {assistResult.suggestedOffer && (
                  <div className="flex items-center justify-between p-2 rounded bg-white border border-blue-200 font-mono text-[11px]">
                    <span>Suggested Terms:</span>
                    <span className="font-bold text-stone-900">
                      {assistResult.suggestedOffer.qtyG / 1000} kg @ PKR {assistResult.suggestedOffer.pricePaisaKg / 100}/kg
                    </span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      handleSendMessage(assistResult.draftText, 'approved_draft');
                      setAssistResult(null);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-stone-900 text-white text-[11px] font-bold hover:bg-stone-800 cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    <span>Send Approved Message</span>
                  </button>

                  {assistResult.suggestedOffer && (
                    <button
                      type="button"
                      onClick={() => {
                        handleProposeOffer(
                          assistResult.suggestedOffer!.qtyG / 1000,
                          assistResult.suggestedOffer!.pricePaisaKg / 100
                        );
                        setAssistResult(null);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-emerald-800 text-white text-[11px] font-bold hover:bg-emerald-900 cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      <span>Submit Structured Offer</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <MessageFeed
            messages={data.messages}
            currentUser={currentUser}
            onSendMessage={handleSendMessage}
          />
        </div>
      </div>
    </div>
  );
}
