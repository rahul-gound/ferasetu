// =============================================================================
// FeraSetu AI — Contextual Assistant Panel (Dockable Left/Right)
// Inspired by Stitch Screens 1 & 8 (Minimal Premium UI Redesign)
// Zero-slop, human-centered co-pilot for the Global Shopkeeper.
// Communicates with Cloudflare Worker cluster at /api/v1/ai/chat.
// =============================================================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  X,
  Send,
  RotateCcw,
  ArrowLeftRight,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  Bot,
  User,
  Zap,
  HelpCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAiAssistant, DockSide } from '../../contexts/AiAssistantContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  codeSnippet?: string;
  steps?: string[];
}

interface ContextPromptChip {
  label: string;
  prompt: string;
}

export default function ContextualAiAssistantPanel() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { isOpen, dockSide, initialPrompt, contextHint, closeAssistant, toggleDockSide } = useAiAssistant();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversationIdRef = useRef<string>(() => {
    try {
      return crypto.randomUUID();
    } catch {
      return `conv-${Date.now()}`;
    }
  });

  // Determine current page context title and tailored chips
  const pageContext = useMemo(() => {
    const path = location.pathname;
    const storeName = user?.business_name || user?.name || 'My Store';

    if (path.startsWith('/domains')) {
      return {
        title: 'Domains & DNS',
        badge: 'DNS Active',
        greeting: `Namaste ${storeName}. I'm actively monitoring your domain records and SSL certificates. How can I assist with your custom domain?`,
        chips: [
          { label: 'Fix CNAME Record', prompt: 'How do I point my custom domain CNAME to shops.ferasetu.store?' },
          { label: 'Check SSL Status', prompt: 'How long does Cloudflare edge SSL issuance take for my store?' },
          { label: 'GoDaddy / Namecheap Steps', prompt: 'Give me step-by-step instructions for GoDaddy DNS setup.' },
        ],
      };
    }

    if (path.startsWith('/payments')) {
      return {
        title: 'Payments & Settlements',
        badge: '0% Commission',
        greeting: `Namaste ${storeName}. Your payments studio is running with 0% marketplace commission. UPI, QR, and bank settlements are live.`,
        chips: [
          { label: 'Explain 0% Commission', prompt: 'How does FeraSetu ensure 0% commission on direct UPI orders?' },
          { label: 'Daily Settlement Timeline', prompt: 'When do UPI and card payments settle into my bank account?' },
          { label: 'Setup Soundbox / QR', prompt: 'How do I link a counter QR code or audio soundbox?' },
        ],
      };
    }

    if (path.startsWith('/inventory') || path.startsWith('/products')) {
      return {
        title: 'Inventory & Stock Studio',
        badge: 'Live Stock',
        greeting: `Namaste ${storeName}. I'm tracking your stock levels across counter and warehouse. What would you like to update or audit?`,
        chips: [
          { label: 'Identify Low Stock', prompt: 'Which products are running low on stock and need restock?' },
          { label: 'Create Stock Transfer', prompt: 'How do I transfer stock between store locations?' },
          { label: 'Add Bulk Products', prompt: 'Can I upload my inventory in bulk via CSV or Excel?' },
        ],
      };
    }

    if (path.startsWith('/community')) {
      return {
        title: 'Merchant Knowledge Hub',
        badge: '48+ Regions',
        greeting: `Welcome to the Merchant Community. Thousands of independent grocers and store owners share operational playbooks here.`,
        chips: [
          { label: 'Best Thermal Printer', prompt: 'What is the most reliable Bluetooth thermal printer for grocery receipts?' },
          { label: 'Handling Pay-Later Khata', prompt: 'How do experienced merchants politely nudge customers for khata credit dues?' },
          { label: 'WhatsApp Marketing Tips', prompt: 'What are proven WhatsApp broadcast tactics for festival sales?' },
        ],
      };
    }

    if (path.startsWith('/integrations')) {
      return {
        title: 'Operations & Integrations',
        badge: 'Connected Hub',
        greeting: `Namaste ${storeName}. All your connected tools including WhatsApp, Shiprocket, payment gateways, and accounting are managed here.`,
        chips: [
          { label: 'Connect WhatsApp Bot', prompt: 'How do I link WhatsApp Baileys for automatic order alerts?' },
          { label: 'Shiprocket Sync', prompt: 'How does automated courier dispatch work with Shiprocket?' },
          { label: 'Tally Prime Export', prompt: 'Can I export daily sales into Tally Prime format?' },
        ],
      };
    }

    // Default: Dashboard / General Store
    return {
      title: 'Store Operations Co-pilot',
      badge: 'Fera AI',
      greeting: `Namaste ${storeName}. Your daily operations co-pilot is ready. Ask me anything about orders, customer khata, or store growth.`,
      chips: [
        { label: 'Draft WhatsApp Nudge', prompt: 'Draft a polite, friendly WhatsApp payment reminder for a regular customer.' },
        { label: 'Today\'s Cash Flow Summary', prompt: 'How do I calculate today\'s net collected revenue versus pay-later dues?' },
        { label: 'Create Discount Coupon', prompt: 'How do I create a 10% weekend festival discount code?' },
      ],
    };
  }, [location.pathname, user?.business_name, user?.name]);

  // Set initial greeting when first opened or when location changes
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: pageContext.greeting,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [pageContext.greeting, messages.length]);

  // Handle incoming initial prompt from context trigger
  useEffect(() => {
    if (initialPrompt && isOpen) {
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt, isOpen]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend ?? input).trim();
    if (!query || loading) return;

    setInput('');
    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    const historyPayload = messages
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      let assistantReply = '';
      try {
        const res = await api.post('/v1/ai/chat', {
          message: query,
          language: language || 'en',
          conversationId: conversationIdRef.current,
          conversationHistory: [...historyPayload, { role: 'user', content: query }],
          context: {
            page: location.pathname,
            storeName: user?.business_name || 'My Store',
          },
        });
        assistantReply = res.data?.content || res.data?.reply || '';
      } catch {
        const fallbackRes = await api.post('/ai/chat', {
          message: query,
          language: language || 'en',
          conversationId: conversationIdRef.current,
        });
        assistantReply = fallbackRes.data?.content || fallbackRes.data?.reply || '';
      }

      if (!assistantReply) {
        assistantReply = `I have received your request regarding ${pageContext.title}. For immediate assistance, our team and community are also ready to support you.`;
      }

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: assistantReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: "I'm having a brief connection delay reaching our AI backend. Please retry in a few moments, or check your internet connection.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearSession = () => {
    conversationIdRef.current = `conv-${Date.now()}`;
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: pageContext.greeting,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    toast.success('Started a fresh co-pilot session');
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs md:hidden"
        onClick={closeAssistant}
      />

      {/* Main Docked/Floating Assistant Panel */}
      <aside
        aria-label="FeraSetu AI Assistant"
        className={`fixed top-0 bottom-0 z-50 flex flex-col w-[380px] max-w-[92vw] bg-white border-slate-200/90 shadow-2xl transition-all duration-300 ease-in-out ${
          dockSide === 'left'
            ? 'left-0 border-r md:left-[80px] lg:left-[256px]'
            : 'right-0 border-l'
        }`}
      >
        {/* Panel Header */}
        <div className="h-16 px-4 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs shadow-blue-600/30">
              <Sparkles size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 text-[14px] tracking-tight">FeraSetu AI</span>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200/80 leading-none">
                  BETA
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate">
                Helping with {pageContext.title}
              </p>
            </div>
          </div>

          {/* Action Header Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleClearSession}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Reset conversation"
              aria-label="Reset conversation"
            >
              <RotateCcw size={15} />
            </button>
            <button
              type="button"
              onClick={toggleDockSide}
              className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
              title={`Dock to ${dockSide === 'left' ? 'Right' : 'Left'}`}
              aria-label={`Dock to ${dockSide === 'left' ? 'Right' : 'Left'}`}
            >
              <ArrowLeftRight size={15} />
            </button>
            <button
              type="button"
              onClick={closeAssistant}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Close co-pilot panel (Esc)"
              aria-label="Close assistant"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Live Context Strip */}
        <div className="px-4 py-2 border-b border-amber-200/50 bg-amber-50/60 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <p className="text-[11px] font-semibold text-amber-950 truncate">
              {contextHint ? contextHint : `Context: ${pageContext.title}`}
            </p>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100/90 text-amber-800 border border-amber-200/80 shrink-0">
            {pageContext.badge}
          </span>
        </div>

        {/* Chat Stream */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 items-start ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={13} />
                  </div>
                )}

                <div className={`space-y-1.5 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`p-3.5 rounded-2xl text-[13px] leading-relaxed shadow-2xs ${
                      isUser
                        ? 'bg-[#0052FF] text-white rounded-tr-xs'
                        : 'bg-white text-slate-900 border border-slate-200/80 rounded-tl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>

                    {/* Step-by-step or Action Pill */}
                    {!isUser && (
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1 font-medium text-blue-600">
                          <ShieldCheck size={12} />
                          FeraSetu Guard
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(msg.content, msg.id)}
                          className="hover:text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                          title="Copy reply"
                        >
                          {copiedIndex === msg.id ? (
                            <>
                              <Check size={11} className="text-emerald-600" />
                              <span className="text-emerald-600 font-bold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={11} />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className={`text-[10px] text-slate-400 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
                    {msg.timestamp}
                  </div>
                </div>

                {isUser && (
                  <div className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <User size={13} />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-2.5 items-start">
              <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={13} />
              </div>
              <div className="bg-white border border-slate-200/80 p-3 rounded-2xl rounded-tl-xs shadow-2xs">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]" />
                  <span className="ml-1 text-[11px] font-medium text-slate-400">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tailored Suggestion Chips */}
        <div className="px-4 py-2 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
          {pageContext.chips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(chip.prompt)}
              className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200/80 hover:border-blue-200 text-slate-700 hover:text-[#0052FF] text-[11px] font-medium transition-colors cursor-pointer text-left"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Input & Dispatch Footer */}
        <div className="p-3.5 bg-white border-t border-slate-200/80 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="relative flex items-end gap-2 bg-slate-50 rounded-xl p-1.5 border border-slate-200/90 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all"
          >
            <textarea
              ref={inputRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Ask Fera AI about ${pageContext.title.toLowerCase()}...`}
              className="flex-1 bg-transparent border-none outline-none resize-none text-[13px] text-slate-900 placeholder:text-slate-400 px-2 py-1 leading-normal"
            />

            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="h-9 w-9 rounded-lg bg-[#0052FF] hover:bg-blue-600 disabled:bg-slate-200 disabled:text-slate-400 text-white flex items-center justify-center shrink-0 transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed shadow-xs"
              title="Send prompt"
              aria-label="Send message"
            >
              <Send size={15} />
            </button>
          </form>

          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 px-1">
            <span className="font-mono">Enter ↵ to send • Shift+Enter newline</span>
            <span className="font-medium text-slate-500">0% Commission Co-pilot</span>
          </div>
        </div>
      </aside>
    </>
  );
}
