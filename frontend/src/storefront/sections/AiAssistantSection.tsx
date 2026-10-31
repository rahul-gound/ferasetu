import React, { useState } from 'react';
import { Bot, Sparkles, Send, Trash2, CheckCircle2, MessageSquare, ArrowRight, CornerDownLeft, ShieldCheck } from 'lucide-react';
import { useStorefront } from '../runtime/StorefrontProvider';

export interface AiAssistantSectionProps {
  id?: string;
  config?: {
    title?: string;
    subtitle?: string;
    welcomeMessage?: string;
    badgeText?: string;
    suggestions?: string[];
    accentColor?: string;
    showRemoveButton?: boolean;
  };
  variant?: string;
  onRemove?: () => void;
  isPreview?: boolean;
}

export default function AiAssistantSection({
  id,
  config = {},
  variant = 'clean',
  onRemove,
  isPreview = false,
}: AiAssistantSectionProps) {
  const { shopName, products = [] } = useStorefront();

  const title = config.title || `${shopName || 'Store'} AI Shopping Concierge`;
  const subtitle = config.subtitle || 'Ask questions about products, availability, discounts, or delivery in natural language.';
  const badgeText = config.badgeText || 'Instant AI Help';
  const suggestions = config.suggestions || [
    "🔥 What are your bestsellers?",
    "💰 Any special deals or discounts today?",
    "🚚 What are your delivery & shipping options?",
    "✨ Recommend a popular item"
  ];

  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string; time: string }>>([
    {
      sender: 'assistant',
      text: config.welcomeMessage || `Namaste! Welcome to ${shopName || 'our shop'}. How can I assist your shopping today?`,
      time: 'Just now'
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSend = (textToSend?: string) => {
    const q = (textToSend || inputQuery).trim();
    if (!q) return;

    const userMsg = { sender: 'user' as const, text: q, time: 'Just now' };
    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsTyping(true);

    // Simulate smart AI response referencing store catalog
    setTimeout(() => {
      let reply = '';
      const lower = q.toLowerCase();

      if (lower.includes('bestseller') || lower.includes('trending') || lower.includes('popular')) {
        const top = products.slice(0, 2).map(p => p.name).join(' and ');
        reply = top
          ? `Our most sought-after picks right now are ${top}. Both are in high demand and ready for immediate dispatch!`
          : `Customers love our freshly updated collections! Check out the featured items right above.`;
      } else if (lower.includes('deal') || lower.includes('discount') || lower.includes('offer')) {
        const onSale = products.find(p => p.sale_price && p.sale_price < p.price);
        reply = onSale
          ? `Great news! ${onSale.name} is currently on sale for ₹${onSale.sale_price} (original ₹${onSale.price}).`
          : `We offer direct merchant pricing with 0% middleman markups! What category would you like to explore?`;
      } else if (lower.includes('shipping') || lower.includes('delivery')) {
        reply = `We pack orders securely with prompt direct dispatch and instant WhatsApp order tracking.`;
      } else {
        reply = `Thanks for asking! I'm your ${shopName || 'dukaan'} assistant. You can add any item to cart or connect directly with the shop owner on WhatsApp anytime!`;
      }

      setMessages(prev => [...prev, { sender: 'assistant', text: reply, time: 'Just now' }]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <section 
      id={id}
      className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12"
      aria-label="AI Shopping Assistant"
    >
      <div className="relative rounded-3xl border border-orange-200/80 bg-gradient-to-b from-orange-50/70 via-white to-slate-50/60 p-6 sm:p-8 md:p-10 shadow-sm overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-200/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-200/20 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header with "Remove from Section" Button */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 border-b border-orange-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-700 text-xs font-black uppercase tracking-wider mb-2">
              <Sparkles size={14} className="text-orange-600" />
              <span>{badgeText}</span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              {title}
            </h2>
            <p className="text-xs sm:text-sm font-medium text-slate-600 mt-1 max-w-2xl">
              {subtitle}
            </p>
          </div>

          {/* Remove From Section Button — always available for merchant builder control */}
          <div className="flex items-center gap-2 shrink-0">
            {confirmDelete ? (
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 p-1.5 rounded-2xl animate-fade-in">
                <span className="text-xs font-bold text-rose-800 px-2">Remove AI Section?</span>
                <button
                  type="button"
                  onClick={() => {
                    if (onRemove) onRemove();
                  }}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Yes, Remove
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold transition-all border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (onRemove) {
                    setConfirmDelete(true);
                  } else {
                    // Try finding parent container remove event
                    const customEvent = new CustomEvent('fera-remove-section', { detail: { id, type: 'ai-assistant' } });
                    window.dispatchEvent(customEvent);
                    setConfirmDelete(true);
                  }
                }}
                className="group inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-700 text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                title="Remove this AI section from the storefront template"
              >
                <Trash2 size={14} className="text-slate-400 group-hover:text-rose-600 transition-colors" />
                <span>Remove from Section</span>
              </button>
            )}
          </div>
        </div>

        {/* Interactive Chat Window */}
        <div className="relative z-10 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Chat Transcript */}
          <div className="lg:col-span-2 flex flex-col h-[340px] bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.sender === 'assistant' && (
                    <div className="w-7 h-7 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Bot size={15} />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-medium leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-slate-900 text-white rounded-tr-xs'
                        : 'bg-slate-100 text-slate-800 rounded-tl-xs border border-slate-200/60'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold pl-10">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>Thinking...</span>
                </div>
              )}
            </div>

            {/* Chat Input Bar */}
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="p-3 bg-slate-50 border-t border-slate-200/80 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask about products, sizes, discounts..."
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || isTyping}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <span>Ask</span>
                <Send size={13} />
              </button>
            </form>
          </div>

          {/* Right Col: Quick Suggestion Chips & Guarantee */}
          <div className="flex flex-col justify-between gap-4 bg-orange-50/50 rounded-2xl p-5 border border-orange-100">
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
                <MessageSquare size={13} className="text-orange-600" />
                <span>Popular Questions</span>
              </div>
              <div className="flex flex-col gap-2">
                {suggestions.map((suggestion, sIdx) => (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => handleSend(suggestion)}
                    className="text-left text-xs font-semibold text-slate-700 bg-white hover:bg-orange-100/70 border border-slate-200/80 hover:border-orange-300 p-2.5 rounded-xl transition-all shadow-2xs hover:shadow-xs flex items-center justify-between group cursor-pointer"
                  >
                    <span>{suggestion}</span>
                    <ArrowRight size={13} className="text-slate-400 group-hover:text-orange-600 transition-colors shrink-0 ml-1" />
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-orange-200/60 flex items-center gap-2 text-[11px] text-slate-500 font-medium">
              <ShieldCheck size={15} className="text-emerald-600 shrink-0" />
              <span>Direct merchant answers with zero spam &amp; 0% commission.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
