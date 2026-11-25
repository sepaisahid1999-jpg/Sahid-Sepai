import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  Loader2,
  MessageSquareText,
  RotateCcw,
  Send,
  X,
} from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import { PLACEHOLDER_PRODUCTS } from '../lib/previewPlaceholders';
import { subscribePublicProducts } from '../services/firestoreService';
import type { PublicProduct } from '../types';

type ChatRoleId = 'product_advisor' | 'bulk_quote_helper' | 'logistics_desk';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  roleId: ChatRoleId;
  timestamp: string;
}

const ROLE_OPTIONS: Array<{
  id: ChatRoleId;
  label: string;
  subtitle: string;
  starterPrompts: string[];
}> = [
  {
    id: 'product_advisor',
    label: 'Product & GSM Advisor',
    subtitle: 'Raw jute grades, hessian GSM, B-Twill sacks & twine specs',
    starterPrompts: [
      'Which jute product is best for 50 kg agricultural grain packing?',
      'Explain the difference between TD-3 Tossa raw jute and hessian burlap rolls.',
    ],
  },
  {
    id: 'bulk_quote_helper',
    label: 'Bulk Order & MOQ Planner',
    subtitle: 'Minimum order quantities, unit conversions & quote prep',
    starterPrompts: [
      'Help me prepare a bulk requirement list for 2 metric tons of raw jute plus twine.',
      'What are the standard MOQs across your available jute categories?',
    ],
  },
  {
    id: 'logistics_desk',
    label: 'Trade & Dispatch Coordinator',
    subtitle: 'INR billing workflow, dispatch norms & trade desk contact',
    starterPrompts: [
      'How do bulk INR quotations and West Bengal mill dispatches work?',
      'What details should I include before requesting a quote on WhatsApp?',
    ],
  },
];

export function WholesaleChatWidget() {
  const location = useLocation();
  const { settings, cmsConfig } = useCompany();

  const isRestrictedRoute =
    location.pathname.startsWith('/admin') || location.pathname.startsWith('/viewer');

  const [isOpen, setIsOpen] = useState(false);
  const [roleId, setRoleId] = useState<ChatRoleId>('product_advisor');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicProducts, setPublicProducts] = useState<PublicProduct[]>([]);

  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Lazy-subscribe to public products once opened so catalog context stays live without unnecessary overhead
  useEffect(() => {
    if (!isOpen || isRestrictedRoute) return;
    const unsub = subscribePublicProducts((items) => {
      setPublicProducts(items);
    });
    return () => unsub();
  }, [isOpen, isRestrictedRoute]);

  useEffect(() => {
    if (isOpen) {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, sending, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  const activeRole = useMemo(
    () => ROLE_OPTIONS.find((r) => r.id === roleId) || ROLE_OPTIONS[0],
    [roleId]
  );

  const catalogForContext = useMemo(() => {
    const source = publicProducts.length > 0 ? publicProducts : PLACEHOLDER_PRODUCTS;
    return source.slice(0, 25).map((p) => ({
      name: p.name,
      sku: p.sku,
      categoryName: p.categoryName,
      unit: p.unit,
      minOrderQty: p.minOrderQty,
      showStockPublicly: p.showStockPublicly,
      publicAvailableStock: p.showStockPublicly ? p.publicAvailableStock : undefined,
    }));
  }, [publicProducts]);

  if (isRestrictedRoute) {
    return null;
  }

  const primaryColor = cmsConfig.design.primaryColor || '#14452F';
  const surfaceColor = cmsConfig.design.surfaceColor || '#F6F8F7';
  const displayFont = `'${cmsConfig.design.displayFont || 'Fraunces'}', Georgia, serif`;

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || sending) return;

    setError(null);
    const nowTime = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role: 'user',
      text: trimmed,
      roleId,
      timestamp: nowTime,
    };

    const historyForApi = messages.map((m) => ({
      role: m.role,
      text: m.text,
    }));

    setMessages((prev) => [...prev, userMsg]);
    setDraft('');
    setSending(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: historyForApi,
          roleId,
          publicContext: {
            companyName: settings.companyName,
            currencyCode: cmsConfig.general.currencyCode || 'INR',
            currencySymbol: cmsConfig.general.currencySymbol || '₹',
            address: settings.address,
            email: settings.email,
            contactNumbers: settings.contactNumbers,
            products: catalogForContext,
          },
        }),
      });

      const payload = (await response.json()) as { reply?: string; error?: string };

      if (!response.ok || !payload.reply) {
        throw new Error(payload.error || 'Unable to get a response from the assistant.');
      }

      const modelMsg: ChatMessage = {
        id: `model-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role: 'model',
        text: payload.reply,
        roleId,
        timestamp: new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      setMessages((prev) => [...prev, modelMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect to the trade assistant.');
    } finally {
      setSending(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(draft);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(draft);
    }
  };

  return (
    <>
      {!isOpen && (
        <div className="fixed bottom-5 right-5 z-40">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center gap-2.5 min-h-[44px] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white rounded-lg shadow-lg transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#14452F]"
            style={{ backgroundColor: primaryColor }}
            aria-label="Open Wholesale Trade Assistant"
          >
            <MessageSquareText className="w-4 h-4 shrink-0" />
            <span>Trade Assistant</span>
          </button>
        </div>
      )}

      {isOpen && (
        <aside
          aria-label="Wholesale Trade Assistant Chat"
          className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[400px] h-[min(580px,80vh)] z-50 bg-white border border-slate-300 rounded-xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div
            className="px-4 py-3 text-white flex items-start justify-between gap-3 shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <MessageSquareText className="w-4 h-4 shrink-0" />
                <h2 className="text-sm font-semibold truncate" style={{ fontFamily: displayFont }}>
                  {settings.companyName} Assistant
                </h2>
              </div>
              <p className="text-[11px] text-white/85 truncate mt-0.5">{activeRole.subtitle}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setMessages([]);
                    setError(null);
                  }}
                  title="Clear conversation history"
                  className="p-1.5 rounded-lg text-white/85 hover:text-white hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label="Clear conversation history"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-white/85 hover:text-white hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Close Trade Assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Role Selector */}
          <div
            className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0"
            style={{ backgroundColor: surfaceColor }}
          >
            <label
              htmlFor="wholesale-chat-role"
              className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 shrink-0"
            >
              Assistant Role
            </label>
            <select
              id="wholesale-chat-role"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value as ChatRoleId)}
              className="flex-1 min-w-0 px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#14452F]/25"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Scrollable Conversation Thread */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-white"
            role="log"
            aria-live="polite"
          >
            {messages.length === 0 ? (
              <div className="space-y-4 py-2">
                <div
                  className="p-3.5 rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed"
                  style={{ backgroundColor: surfaceColor }}
                >
                  <p className="font-semibold text-slate-900 mb-1">
                    Active Role: {activeRole.label}
                  </p>
                  <p>
                    Ask about wholesale jute grades, GSM specifications, Minimum Order Quantities,
                    or preparing a bulk enquiry for {settings.companyName}. Conversation history
                    stays active across turns.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Suggested Prompts
                  </p>
                  {activeRole.starterPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void sendMessage(prompt)}
                      className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-[#14452F]/50 hover:bg-[#F6F8F7] text-xs text-slate-700 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[86%] px-3.5 py-2.5 rounded-lg text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? 'text-white'
                          : 'bg-[#F6F8F7] text-slate-900 border border-slate-200'
                      }`}
                      style={isUser ? { backgroundColor: primaryColor } : undefined}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-0.5 tabular-nums">
                      {isUser ? 'You' : activeRole.label} · {msg.timestamp}
                    </span>
                  </div>
                );
              })
            )}

            {sending && (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#14452F]" />
                <span>Preparing wholesale guidance...</span>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div ref={threadEndRef} />
          </div>

          {/* Input Bar & Trade Desk Link */}
          <form
            onSubmit={handleFormSubmit}
            className="p-3 border-t border-slate-200 bg-[#F8FAF9] space-y-2 shrink-0"
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={2}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
                placeholder="Ask about jute grades, GSM, MOQs, or bulk quotes..."
                className="flex-1 min-w-0 px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#14452F]/25 focus:border-[#14452F] disabled:opacity-60"
                aria-label="Message to Trade Assistant"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="inline-flex items-center justify-center min-h-[40px] min-w-[40px] px-3 py-2 text-white rounded-lg disabled:opacity-45 transition-opacity hover:opacity-90 shrink-0"
                style={{ backgroundColor: primaryColor }}
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 px-0.5">
              <span>Press Enter to send</span>
              <div className="flex items-center gap-3">
                <Link
                  to="/products"
                  onClick={() => setIsOpen(false)}
                  className="hover:underline font-medium"
                  style={{ color: primaryColor }}
                >
                  Catalogue
                </Link>
                <Link
                  to="/contact"
                  onClick={() => setIsOpen(false)}
                  className="hover:underline font-medium"
                  style={{ color: primaryColor }}
                >
                  Request WhatsApp Quote
                </Link>
              </div>
            </div>
          </form>
        </aside>
      )}
    </>
  );
}
