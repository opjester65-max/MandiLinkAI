'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TermsCard } from '../../../components/trade/TermsCard';
import { MessageFeed } from '../../../components/trade/MessageFeed';
import { OfferComposer } from '../../../components/trade/OfferComposer';
import { TradeTimeline } from '../../../components/trade/TradeTimeline';
import { sandboxRepository } from '../../../lib/repositories/marketRepository';
import { Agent, Listing, Message, Offer, Store, Trade } from '../../../lib/contracts';
import { FIXTURE_IDS } from '../../../lib/fixtures';
import { ArrowLeft, Sparkles, UserCheck, Bot, Check, Send } from 'lucide-react';
import { RetryPanel } from '../../../components/shared/RetryPanel';

export default function TradeRoomPage({
  tradeId,
  onBackToMarket,
}: {
  tradeId?: string;
  onBackToMarket?: () => void;
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

  const [currentUser, setCurrentUser] = useState<Agent>(sandboxRepository.getCurrentUserAgent());
  const [error, setError] = useState<string | null>(null);

  // AI Assist State
  const [assistInstruction, setAssistInstruction] = useState<string>('Offer 20 kg at PKR 110 per kg');
  const [assistIntent, setAssistIntent] = useState<'draft' | 'counter' | 'explain'>('counter');
  const [assistLocale, setAssistLocale] = useState<'en-PK' | 'ur-PK'>('en-PK');
  const [assistLoading, setAssistLoading] = useState<boolean>(false);
  const [assistResult, setAssistResult] = useState<{
    draftText: string;
    suggestedOffer: { qtyG: number; pricePaisaKg: number } | null;
    modelId: string;
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
    loadTradeData(activeTradeId);
  }, [activeTradeId]);

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
    const nextAgentId =
      currentUser.id === FIXTURE_IDS.buyerTariq
        ? FIXTURE_IDS.growerFatima
        : FIXTURE_IDS.buyerTariq;
    sandboxRepository.switchActivePersona(nextAgentId);
    setCurrentUser(sandboxRepository.getCurrentUserAgent());
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

  // Live Gemma Bargaining Assist
  const handleRequestAssist = async (instructionText?: string) => {
    if (!data.trade) return;
    setAssistLoading(true);
    setAssistResult(null);

    const textToUse = instructionText || assistInstruction;

    try {
      const res = await fetch(`/api/trades/${data.trade.id}/assist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-agent-id': currentUser.id,
        },
        body: JSON.stringify({
          intent: assistIntent,
          locale: assistLocale,
          instruction: textToUse,
        }),
      });

      if (res.ok) {
        const body = await res.json();
        if (body?.data) {
          setAssistResult(body.data);
        }
      } else {
        // Local fallback
        const { generateBargainingAssistance } = await import('../../../lib/providers/bargainingAssist.ts');
        const fallbackRes = await generateBargainingAssistance(
          { intent: assistIntent, locale: assistLocale, instruction: textToUse },
          {
            trade: data.trade,
            listing: data.listing!,
            role: currentUser.role,
            recentMessages: data.messages.slice(-5).map((m) => ({
              senderRole: m.senderRole,
              body: m.body,
            })),
          }
        );
        setAssistResult(fallbackRes);
      }
    } catch {
      // Fallback
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
          {/* AI Bargaining Assistant Box */}
          <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-blue-700" />
                Gemma Bargaining Assistant
              </span>
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setAssistLocale('en-PK')}
                  className={`px-2 py-0.5 rounded font-mono ${
                    assistLocale === 'en-PK' ? 'bg-blue-800 text-white font-bold' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setAssistLocale('ur-PK')}
                  className={`px-2 py-0.5 rounded font-mono ${
                    assistLocale === 'ur-PK' ? 'bg-blue-800 text-white font-bold' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  اردو
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setAssistIntent('counter')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                  assistIntent === 'counter' ? 'bg-blue-100 text-blue-900 border border-blue-300' : 'bg-stone-100 text-stone-600'
                }`}
              >
                Counter Offer
              </button>
              <button
                type="button"
                onClick={() => setAssistIntent('draft')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                  assistIntent === 'draft' ? 'bg-blue-100 text-blue-900 border border-blue-300' : 'bg-stone-100 text-stone-600'
                }`}
              >
                Greeting / Chat
              </button>
              <button
                type="button"
                onClick={() => setAssistIntent('explain')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                  assistIntent === 'explain' ? 'bg-blue-100 text-blue-900 border border-blue-300' : 'bg-stone-100 text-stone-600'
                }`}
              >
                Explain Lot
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
                className="px-3 py-1.5 rounded-lg bg-blue-800 text-white font-bold text-xs hover:bg-blue-900 cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 inline mr-1 text-amber-300" />
                {assistLoading ? 'Thinking...' : 'Suggest'}
              </button>
            </div>

            {/* Model Output with Human Approval Required */}
            {assistResult && (
              <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 text-xs space-y-2">
                <div className="flex items-center justify-between text-[11px] text-blue-950 font-bold">
                  <span>Model Suggestion ({assistResult.modelId}):</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-200 text-amber-900">Requires Approval</span>
                </div>

                <p className="text-stone-800 italic leading-relaxed">
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
