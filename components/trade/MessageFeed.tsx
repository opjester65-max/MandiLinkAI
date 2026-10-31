import React, { useState, useRef, useEffect } from 'react';
import { Agent, Message } from '../../lib/contracts';
import { Send, Bot, User, Sparkles } from 'lucide-react';

interface MessageFeedProps {
  messages: Message[];
  currentUser: Agent;
  onSendMessage: (body: string, kind?: 'human' | 'approved_draft') => void;
  isSending?: boolean;
}

export function MessageFeed({
  messages,
  currentUser,
  onSendMessage,
  isSending = false,
}: MessageFeedProps) {
  const [inputText, setInputText] = useState('');
  const feedEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim(), 'human');
    setInputText('');
  };

  const handleUseAiQuickReply = (suggestion: string) => {
    onSendMessage(suggestion, 'approved_draft');
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs flex flex-col h-[460px]">
      <div className="flex items-center justify-between pb-3 border-b border-stone-150">
        <div>
          <h3 className="text-sm font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <span>Bargaining & Coordination Feed</span>
          </h3>
          <p className="text-[11px] text-stone-500">Multan localized trade room</p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-600 font-mono">
          {messages.length} messages
        </span>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-stone-400 text-xs">
            No messages yet. Send a message to start bargaining.
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.senderId === currentUser.id;
            const isSystemOrBot = m.kind === 'approved_draft';

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-0.5 px-1">
                  <span className="text-[10px] font-bold text-stone-500">
                    {isMe ? 'You' : m.senderName || 'Counterparty'}
                  </span>
                  {m.kind === 'approved_draft' && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-blue-100 text-blue-900 font-semibold flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5 text-blue-700" /> AI Draft
                    </span>
                  )}
                  <span className="text-[9px] text-stone-400">
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-2xs ${
                    isMe
                      ? 'bg-emerald-800 text-white rounded-tr-none'
                      : 'bg-stone-100 text-stone-900 rounded-tl-none border border-stone-200'
                  }`}
                >
                  {m.body}
                </div>
              </div>
            );
          })
        )}
        <div ref={feedEndRef} />
      </div>

      {/* Quick AI Suggestions */}
      <div className="pt-2 border-t border-stone-150">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 text-[11px]">
          <span className="text-stone-500 font-semibold shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Quick:
          </span>
          <button
            type="button"
            onClick={() => handleUseAiQuickReply('Can you do 20 kg for pickup before 4 PM today?')}
            className="px-2.5 py-1 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium whitespace-nowrap cursor-pointer transition-colors"
          >
            "Can you do 20 kg before 4 PM?"
          </button>
          <button
            type="button"
            onClick={() => handleUseAiQuickReply('Produce is harvested fresh this morning, firmness is prime.')}
            className="px-2.5 py-1 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium whitespace-nowrap cursor-pointer transition-colors"
          >
            "Produce is harvested fresh..."
          </button>
        </div>

        {/* Text Input */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type message or counter-terms..."
            className="flex-1 px-3 py-2 text-xs rounded-lg border border-stone-300 bg-white focus-visible:ring-2 focus-visible:ring-emerald-700"
          />
          <button
            type="submit"
            disabled={isSending || !inputText.trim()}
            className="px-3.5 py-2 rounded-lg bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
