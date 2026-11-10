// =============================================================================
// FeraSetu AI — Unified Shopkeeper Copilot & Operations Manager
// Modern, friendly, white-blue-orange design for the Global Shopkeeper.
// Combines live store context, multi-turn memory, action approval cards,
// voice input/output, reasoning inspection, 6 SMB categories, and 1-click store clerks.
// =============================================================================

import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Send,
  Mic,
  MicOff,
  Bot,
  User,
  ChevronRight,
  TrendingUp,
  Package,
  Users,
  Sparkles,
  Zap,
  BarChart3,
  Store,
  ShoppingCart,
  MessageSquare,
  FileText,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Globe,
  Loader2,
  BrainCircuit,
  ClipboardList,
  Coins,
  ChevronDown,
  Copy,
  Check,
  RotateCcw,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../i18n';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
  skillsUsed?: string[];
  proposedActions?: ProposedAction[];
  isThinking?: boolean;
}

interface ProposedAction {
  id: string;
  toolName: string;
  riskLevel: 'read_only' | 'reversible_write' | 'sensitive';
  preview: string;
  requiresApproval: boolean;
}

type CategoryKey = 'sell_more' | 'manage_shop' | 'customers' | 'create' | 'automate' | 'insights';

interface Category {
  key: CategoryKey;
  label: string;
  icon: ReactNode;
  color: string;
  bgLight: string;
  borderLight: string;
  actions: Array<{ label: string; msg: string; icon: ReactNode }>;
}

// ---------------------------------------------------------------------------
// Quick Action Chips & 6 SMB Categories
// ---------------------------------------------------------------------------

const QUICK_CHIPS = [
  { label: 'Build online store', msg: 'Help me build my online store website', icon: <Store size={15} className="text-blue-600" /> },
  { label: 'Check low stock', msg: 'Which of my products are running low on stock?', icon: <AlertTriangle size={15} className="text-amber-500" /> },
  { label: 'Draft WhatsApp promo', msg: 'Write a friendly WhatsApp promotional message to send to my customers', icon: <MessageSquare size={15} className="text-emerald-600" /> },
  { label: 'Today\'s sales summary', msg: 'What is today\'s sales revenue and how does it compare to yesterday?', icon: <TrendingUp size={15} className="text-orange-500" /> },
  { label: 'Write product description', msg: 'Write an attractive and honest product description for my best product', icon: <FileText size={15} className="text-blue-600" /> },
];

const CATEGORIES: Category[] = [
  {
    key: 'sell_more',
    label: 'Sell More',
    icon: <TrendingUp size={16} />,
    color: '#059669', // Emerald
    bgLight: '#ECFDF5',
    borderLight: '#A7F3D0',
    actions: [
      { label: 'Sales tips for this week', msg: 'Give me 3 practical tips to increase my sales this week', icon: <TrendingUp size={14} /> },
      { label: 'Create a festival offer', msg: 'Create a festival discount campaign for my top-selling products', icon: <Sparkles size={14} /> },
      { label: 'Why did sales drop?', msg: 'My sales have decreased recently. Why might that be and what should I do?', icon: <BarChart3 size={14} /> },
    ],
  },
  {
    key: 'manage_shop',
    label: 'Manage Shop',
    icon: <Store size={16} />,
    color: '#2563EB', // Blue
    bgLight: '#EFF6FF',
    borderLight: '#BFDBFE',
    actions: [
      { label: 'Which products are low stock?', msg: 'Which of my products are running low on stock and need restocking?', icon: <AlertTriangle size={14} /> },
      { label: 'Help me price my products', msg: 'How should I price my products competitively for Indian buyers?', icon: <Package size={14} /> },
      { label: 'Manage my pending orders', msg: 'Show me my pending orders and what I should do with them', icon: <ShoppingCart size={14} /> },
    ],
  },
  {
    key: 'customers',
    label: 'Customers',
    icon: <Users size={16} />,
    color: '#EA580C', // Orange
    bgLight: '#FFF7ED',
    borderLight: '#FED7AA',
    actions: [
      { label: 'Write a customer reply', msg: 'Help me write a polite and professional reply to a customer complaint', icon: <MessageSquare size={14} /> },
      { label: 'WhatsApp promotion', msg: 'Write a friendly WhatsApp promotional message to send to my customers', icon: <MessageSquare size={14} /> },
      { label: 'Thank you message', msg: 'Create a warm thank you message for my repeat customers', icon: <CheckCircle size={14} /> },
    ],
  },
  {
    key: 'create',
    label: 'Create Copy',
    icon: <FileText size={16} />,
    color: '#4F46E5', // Indigo
    bgLight: '#EEF2FF',
    borderLight: '#C7D2FE',
    actions: [
      { label: 'Write product description', msg: 'Write an attractive and honest product description for my best product', icon: <FileText size={14} /> },
      { label: 'Translate to Hindi', msg: 'Translate my latest product description into clear Hindi', icon: <Globe size={14} /> },
      { label: 'Instagram post', msg: 'Create an Instagram post to promote my best product today', icon: <Sparkles size={14} /> },
    ],
  },
  {
    key: 'automate',
    label: 'Automate',
    icon: <Zap size={16} />,
    color: '#D97706', // Amber
    bgLight: '#FFFBEB',
    borderLight: '#FDE68A',
    actions: [
      { label: 'Auto thank you after delivery', msg: 'Set up an automation to thank customers automatically after their order is delivered', icon: <Zap size={14} /> },
      { label: 'Low stock alert', msg: 'Create an alert notification when any product goes below 5 units in stock', icon: <AlertTriangle size={14} /> },
      { label: 'Weekly business report', msg: 'Set up a weekly business summary report every Monday morning', icon: <RefreshCw size={14} /> },
    ],
  },
  {
    key: 'insights',
    label: 'Insights',
    icon: <BarChart3 size={16} />,
    color: '#0891B2', // Cyan
    bgLight: '#ECFEFF',
    borderLight: '#A5F3FC',
    actions: [
      { label: 'Today\'s sales summary', msg: 'What is today\'s revenue and how does it compare to yesterday?', icon: <TrendingUp size={14} /> },
      { label: 'Weekly performance', msg: 'Give me a plain language summary of this week\'s business performance', icon: <BarChart3 size={14} /> },
      { label: 'What should I do today?', msg: 'What are the top 3 things I should focus on for my business today?', icon: <CheckCircle size={14} /> },
    ],
  },
];

interface StoreClerkAction {
  id: string;
  title: string;
  tag: string;
  tagColor: string;
  icon: ReactNode;
  iconBg: string;
  borderClass: string;
  hoverClass: string;
  description: string;
  actionText: string;
  btnClass: string;
  prompt: string;
}

const STORE_CLERK_ACTIONS: StoreClerkAction[] = [
  {
    id: 'inventory_watchdog',
    title: 'Inventory Watchdog',
    tag: 'Stock Safety',
    tagColor: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: <AlertTriangle size={18} className="text-amber-600" />,
    iconBg: 'bg-amber-50 border-amber-200',
    borderClass: 'border-amber-200/90',
    hoverClass: 'hover:border-amber-400 hover:shadow-md',
    description: 'Audit store stock, highlight items running low, and suggest restock counts so you never miss a sale.',
    actionText: 'Run Stock Audit',
    btnClass: 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/20',
    prompt: 'Act as my Inventory Watchdog. Audit my current catalog stock, detect items running low on stock or out of stock, and calculate recommended restock quantities so I don\'t lose sales.',
  },
  {
    id: 'whatsapp_promo',
    title: 'WhatsApp Promo Writer',
    tag: 'Festive & Broadcasts',
    tagColor: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: <Sparkles size={18} className="text-[#FF6B35]" />,
    iconBg: 'bg-orange-50 border-orange-200',
    borderClass: 'border-orange-200/90',
    hoverClass: 'hover:border-orange-400 hover:shadow-md',
    description: 'Draft seasonal and festive discount broadcasts to share directly on customer WhatsApp groups.',
    actionText: 'Draft WhatsApp Broadcast',
    btnClass: 'bg-[#FF6B35] hover:bg-orange-600 text-white shadow-sm shadow-orange-500/25',
    prompt: 'Act as my WhatsApp Promo Writer. Draft 2 promotional broadcasts for my local customers with festival discounts and emojis that I can copy into WhatsApp customer groups today.',
  },
  {
    id: 'description_generator',
    title: 'Catalog Studio Helper',
    tag: 'Storefront Descriptions',
    tagColor: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: <FileText size={18} className="text-blue-600" />,
    iconBg: 'bg-blue-50 border-blue-200',
    borderClass: 'border-blue-200/90',
    hoverClass: 'hover:border-blue-400 hover:shadow-md',
    description: 'Write clear product titles, bullet points, and descriptions in simple Hindi and English.',
    actionText: 'Generate Product Copy',
    btnClass: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20',
    prompt: 'Act as my Catalog Studio Clerk. Help me write clear and honest product descriptions with key benefits and specifications in simple English and Hindi for my store items.',
  },
];

const WELCOME_MESSAGE: Message = {
  id: 'ferasetu-welcome',
  role: 'assistant',
  content: '**Namaste! 🙏 I am FeraSetu AI, your personal store assistant.**\n\nI help Indian and global merchants:\n- **Sell more** with direct store recommendations\n- **Build & update your website** with zero technical hassle\n- **Check low stock & orders** automatically\n- **Write customer messages & product descriptions** in your language\n\nPick a quick action below or ask me any question about your store!',
  timestamp: new Date(),
  model: 'fera-ai',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMessage(text: string): ReactNode {
  // Strip think tags from reasoning models
  const clean = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  const lines = clean.split('\n');

  return (
    <>
      {lines.map((line, i) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <span key={i}>
            {parts.map((part, j) =>
              part.startsWith('**') && part.endsWith('**') ? (
                <strong key={j} className="font-bold text-slate-900">
                  {part.slice(2, -2)}
                </strong>
              ) : (
                <span key={j}>{part}</span>
              )
            )}
            {i < lines.length - 1 && <br />}
          </span>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function ChatBubble({
  message,
  onOpenWebsiteBuilder,
}: {
  message: Message;
  onOpenWebsiteBuilder: () => void;
}) {
  const isUser = message.role === 'user';
  const [showThoughts, setShowThoughts] = useState(false);
  const [copied, setCopied] = useState(false);

  // Extract reasoning thought
  const contentStr = typeof message?.content === 'string' ? message.content : '';
  const thoughtMatch = contentStr.match(/<think>([\s\S]*?)<\/think>/);
  const thoughts = thoughtMatch ? thoughtMatch[1].trim() : null;

  // Clean text for copying
  const plainText = contentStr
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(plainText);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Detect website builder onboarding triggers
  const isWebsiteOnboarding =
    !isUser &&
    (contentStr.toLowerCase().includes('designed your website') ||
      contentStr.toLowerCase().includes('website builder') ||
      contentStr.toLowerCase().includes('online store website'));

  return (
    <div
      className={`flex gap-3 mb-5 items-start ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      } animate-fade-in`}
    >
      {/* Avatar */}
      <div
        className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center shadow-sm ${
          isUser
            ? 'bg-gradient-to-br from-[#FF6B35] to-orange-500 text-white shadow-orange-500/20'
            : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-blue-500/20'
        }`}
      >
        {isUser ? <User size={18} strokeWidth={2} /> : <Bot size={18} strokeWidth={2} />}
      </div>

      <div
        className={`max-w-[85%] sm:max-w-[78%] flex flex-col gap-1.5 ${
          isUser ? 'items-end' : 'items-start'
        }`}
      >
        {/* Meta / Model tag & Reasoning toggle */}
        {!isUser && (
          <div className="flex items-center gap-2 px-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
              <span>FeraSetu AI</span>
              {message.model && (
                <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-blue-200">
                  {message.model}
                </span>
              )}
            </span>

            {thoughts && (
              <button
                type="button"
                onClick={() => setShowThoughts(!showThoughts)}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <BrainCircuit size={12} />
                <span>{showThoughts ? 'Hide Reasoning' : 'View Reasoning'}</span>
              </button>
            )}
          </div>
        )}

        {/* Expandable Reasoning Thoughts */}
        {showThoughts && thoughts && (
          <div className="bg-slate-50 border border-slate-200 border-l-4 border-l-blue-500 p-3 rounded-xl text-xs text-slate-700 font-mono leading-relaxed mb-1 max-w-full">
            <div className="font-bold text-slate-900 mb-1 flex items-center gap-1">
              <BrainCircuit size={13} className="text-blue-600" />
              Reasoning Process:
            </div>
            {thoughts}
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`relative p-4 sm:p-5 rounded-2xl text-sm leading-relaxed break-words shadow-sm transition-all group ${
            isUser
              ? 'bg-gradient-to-br from-[#FF6B35] to-orange-500 text-white rounded-tr-xs shadow-orange-500/15'
              : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs hover:border-slate-300'
          }`}
        >
          <div className={isUser ? 'text-white' : 'text-slate-800 font-normal'}>
            {formatMessage(message.content)}
          </div>

          {/* Assistant Action Bar (Copy message & Direct CTA) */}
          {!isUser && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                title="Copy text to clipboard"
              >
                {copied ? (
                  <>
                    <Check size={13} className="text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copy</span>
                  </>
                )}
              </button>

              {/* Direct CTA button to Website Builder */}
              {isWebsiteOnboarding && (
                <button
                  type="button"
                  onClick={onOpenWebsiteBuilder}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm shadow-blue-600/20 cursor-pointer transition-colors"
                >
                  <Globe size={14} />
                  <span>Open Website Builder</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-[11px] font-medium text-slate-400 px-1">
          {new Date(message.timestamp).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex gap-3 mb-5 items-start animate-fade-in">
      <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/20">
        <Bot size={18} strokeWidth={2} />
      </div>
      <div className="p-3.5 px-4 bg-white border border-blue-200/90 rounded-2xl rounded-tl-xs shadow-sm flex items-center gap-2.5">
        <Loader2 size={16} className="text-blue-600 animate-spin" />
        <span className="text-xs font-semibold text-slate-700">
          FeraSetu AI is analyzing your shop...
        </span>
      </div>
    </div>
  );
}

function ApprovalCard({
  action,
  onConfirm,
  onReject,
}: {
  action: ProposedAction;
  onConfirm: () => void;
  onReject: () => void;
}) {
  const riskConfig = {
    read_only: { color: '#059669', bg: 'bg-emerald-50', border: 'border-emerald-300', label: 'Store Recommendation', icon: <CheckCircle size={14} /> },
    reversible_write: { color: '#D97706', bg: 'bg-amber-50', border: 'border-amber-300', label: 'Action Confirmation Required', icon: <AlertTriangle size={14} /> },
    sensitive: { color: '#DC2626', bg: 'bg-red-50', border: 'border-red-300', label: 'Sensitive Action — Review Carefully', icon: <AlertTriangle size={14} /> },
  };

  const risk = riskConfig[action.riskLevel] ?? riskConfig.reversible_write;

  return (
    <div className="bg-white border-2 border-amber-300 rounded-2xl p-4 sm:p-5 my-3 ml-12 shadow-sm max-w-xl">
      <div className="flex items-center gap-2 mb-2 text-xs font-extrabold uppercase tracking-wide text-amber-800">
        {risk.icon}
        <span>{risk.label}</span>
      </div>
      <div className="text-sm text-slate-800 font-medium leading-relaxed mb-4">
        {action.preview}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          id={`approve-action-${action.id}`}
          onClick={onConfirm}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer transition-colors"
        >
          <CheckCircle size={14} /> Confirm Action
        </button>
        <button
          type="button"
          id={`reject-action-${action.id}`}
          onClick={onReject}
          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 border border-slate-300 cursor-pointer transition-colors"
        >
          <XCircle size={14} /> Cancel
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main FeraSetuAIPage Component
// ---------------------------------------------------------------------------

export default function FeraSetuAIPage() {
  const { user, updateUser } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false); // default off to prevent unexpected audio
  const [langOpen, setLangOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null);
  const [showCategories, setShowCategories] = useState(true);
  const [pendingApprovals, setPendingApprovals] = useState<ProposedAction[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const hasInitializedQuery = useRef(false);
  const conversationIdRef = useRef(crypto.randomUUID());

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Click outside to close language dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Text-To-Speech (audio playback)
  const speakText = async (text: string, lang: string) => {
    if (!text) return;
    try {
      const res = await api.post('/voice/text-to-speech', { text, language: lang });
      const data = res.data as { audio: string | null };
      if (data.audio) {
        if (audioRef.current) audioRef.current.pause();
        const audio = new Audio(`data:audio/wav;base64,${data.audio}`);
        audioRef.current = audio;
        audio.play().catch(e => console.warn('Audio play prevented:', e));
      }
    } catch (err) {
      console.warn('TTS playback not available:', err);
    }
  };

  // Chat Mutation with multi-turn history + fallback
  const sendMutation = useMutation({
    mutationFn: async (payload: {
      message: string;
      conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
    }) => {
      const lang = language || user?.preferred_language || 'en';

      // Try v1 edge orchestrator first
      try {
        const res = await api.post('/v1/ai/chat', {
          message: payload.message,
          language: lang,
          conversationId: conversationIdRef.current,
          conversationHistory: payload.conversationHistory,
        });
        return res.data as {
          content: string;
          model: string;
          skillsUsed?: string[];
          hasProposedActions?: boolean;
          proposedActions?: ProposedAction[];
          aiCreditsBalance?: number;
        };
      } catch {
        // Fall back to the legacy /ai/chat endpoint
        const res = await api.post('/ai/chat', {
          message: payload.message,
          language: lang,
          conversationId: conversationIdRef.current,
        });
        return res.data as {
          content: string;
          model: string;
          skillsUsed?: string[];
          hasProposedActions?: boolean;
          proposedActions?: ProposedAction[];
          aiCreditsBalance?: number;
        };
      }
    },
    onSuccess: (data) => {
      if (typeof data.aiCreditsBalance === 'number') {
        updateUser({ ai_credits_balance: data.aiCreditsBalance });
      }

      const assistantMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
        model: data.model || 'fera-ai',
        skillsUsed: data.skillsUsed,
        proposedActions: data.proposedActions,
      };

      setMessages(prev => [...prev, assistantMsg]);
      setShowCategories(false);

      const approvals = (data.proposedActions ?? []).filter(a => a.requiresApproval);
      if (approvals.length > 0) {
        setPendingApprovals(prev => [...prev, ...approvals]);
      }

      // Read aloud via TTS if AutoPlay is enabled
      if (autoPlay) {
        const cleanForAudio = data.content
          .replace(/<think>[\s\S]*?<\/think>/g, '')
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .replace(/#/g, '')
          .trim();
        speakText(cleanForAudio, language || 'en');
      }
    },
    onError: (err: { response?: { status?: number } }) => {
      const status = err?.response?.status;
      if (status === 402) {
        toast.error('AI credits exhausted. Please buy extra credits to continue.');
      } else if (status === 429) {
        toast.error('Please wait a moment before sending another message.');
      } else if (status === 401) {
        toast.error('Session expired. Please log in again.');
      } else {
        toast.error('Could not get a response from FeraSetu AI. Please try again.');
      }
    },
  });

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sendMutation.isPending) return;

      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      };

      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);

      // Build 10-message multi-turn history (excluding initial greeting)
      const history = updatedMessages
        .filter(m => m.id !== 'ferasetu-welcome')
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));

      sendMutation.mutate({ message: trimmed, conversationHistory: history });
      setInput('');
      setActiveCategory(null);
    },
    [messages, sendMutation],
  );

  // Handle ?q= query param from dashboard
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && !hasInitializedQuery.current) {
      hasInitializedQuery.current = true;
      sendMessage(q);
    }
  }, [searchParams, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Speech-To-Text (Voice input)
  const startVoice = () => {
    const SR =
      (window as typeof window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
      (window as typeof window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;

    if (!SR) {
      toast.error('Voice input is not supported on this browser. Please type your message.');
      return;
    }

    const recognition = new SR();
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setTimeout(() => sendMessage(transcript), 300);
    };
    recognition.onerror = (e: any) => {
      setIsListening(false);
      if (e?.error === 'not-allowed') {
        toast.error('Microphone permission is required for voice input.');
      } else {
        toast.error('Voice input is unavailable. You can type the instruction instead.');
      }
    };
    recognition.start();
  };

  const handleApproval = (actionId: string, confirmed: boolean) => {
    setPendingApprovals(prev => prev.filter(a => a.id !== actionId));
    const action = pendingApprovals.find(a => a.id === actionId);
    if (!action) return;

    if (confirmed) {
      toast.success('Action approved! It will be executed shortly.');
    } else {
      toast('Action cancelled.', { icon: '✋' });
    }
  };

  const handleResetChat = () => {
    setMessages([WELCOME_MESSAGE]);
    setShowCategories(true);
    setActiveCategory(null);
    setPendingApprovals([]);
    toast.success('Started a fresh conversation');
  };

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === language);
  const activeCategoryData = CATEGORIES.find(c => c.key === activeCategory);
  const isLoading = sendMutation.isPending;
  const credits = user?.ai_credits_balance ?? 20;

  return (
    <div
      id="ferasetu-ai-page"
      className="h-[calc(100vh-115px)] rounded-2xl border border-slate-200/90 shadow-sm flex flex-col relative overflow-hidden bg-white"
    >
      {/* Ambient background tints — warm orange & trustworthy blue */}
      <div
        aria-hidden
        className="absolute top-0 right-0 w-96 h-96 bg-radial from-blue-100/40 via-blue-50/10 to-transparent pointer-events-none -z-0"
      />
      <div
        aria-hidden
        className="absolute bottom-16 left-0 w-96 h-96 bg-radial from-orange-100/30 via-orange-50/10 to-transparent pointer-events-none -z-0"
      />

      {/* ── Top Header Bar (White with Blue & Orange Accents) ──────────────── */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 border-b border-slate-200/90 bg-white/95 backdrop-blur-md shrink-0 z-10">
        {/* Left: Brand & Status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-[#FF6B35] to-amber-500 flex items-center justify-center shadow-md shadow-orange-500/25 text-white">
            <Sparkles size={20} strokeWidth={2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
                FeraSetu AI
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ONLINE
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Store operations copilot &bull; 0% marketplace commission
            </p>
          </div>
        </div>

        {/* Right: Actions & Tools */}
        <div className="flex items-center gap-2">
          {/* AI Credits Pill */}
          <button
            type="button"
            onClick={() => navigate('/ai-credits')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200/80 font-bold text-xs transition-colors cursor-pointer"
            title="Buy or view your AI credits balance"
          >
            <Coins size={14} className="text-orange-600" />
            <span>{credits} credits</span>
          </button>

          {/* Voice Output Toggle */}
          <button
            type="button"
            onClick={() => setAutoPlay(!autoPlay)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
              autoPlay
                ? 'bg-blue-50 text-blue-700 border border-blue-300'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
            title={autoPlay ? 'Voice playback enabled (will read aloud)' : 'Voice playback disabled (silent)'}
          >
            {autoPlay ? <Mic size={14} className="text-blue-600" /> : <MicOff size={14} />}
            <span className="hidden sm:inline">{autoPlay ? 'Voice On' : 'Voice Off'}</span>
          </button>

          {/* Language Selector Dropdown */}
          <div className="relative" ref={langDropdownRef}>
            <button
              type="button"
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/90 font-semibold text-xs cursor-pointer transition-colors"
            >
              <Globe size={14} className="text-blue-600" />
              <span>{currentLang?.nativeName || 'English'}</span>
              <ChevronDown size={12} className="text-slate-400" />
            </button>

            {langOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl bg-white border border-slate-200 shadow-xl py-1.5 z-50">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Select Language
                </div>
                {SUPPORTED_LANGUAGES.slice(0, 8).map(lang => (
                  <button
                    type="button"
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setLangOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                      language === lang.code
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{lang.nativeName}</span>
                    {language === lang.code && <Check size={12} className="text-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reset Conversation Button */}
          <button
            type="button"
            onClick={handleResetChat}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Start a fresh conversation"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </header>

      {/* ── Sub-header Trust Reassurance Strip ─────────────────────────────── */}
      <div className="bg-gradient-to-r from-blue-50/70 via-white to-orange-50/70 border-b border-slate-100 px-4 py-1.5 flex items-center justify-between text-[11px] text-slate-600 font-medium shrink-0">
        <div className="flex items-center gap-1.5 text-blue-700">
          <ShieldCheck size={13} className="text-blue-600" />
          <span className="font-semibold">0% Marketplace Commission</span>
          <span className="text-slate-400">&bull;</span>
          <span className="text-slate-600 hidden sm:inline">Your customer data is 100% private</span>
        </div>
        <div className="text-slate-500 font-semibold hidden md:block">
          Direct sales &bull; No middlemen &bull; Instant WhatsApp order sync
        </div>
      </div>

      {/* ── Messages & Content Scroll Area ──────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-4 md:px-6 py-5 bg-[#F8FAFC]/60"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#CBD5E1 transparent' }}
      >
        <div className="max-w-4xl mx-auto">
          {/* Quick Action Chips Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
            {QUICK_CHIPS.map(chip => (
              <button
                key={chip.label}
                type="button"
                onClick={() => !isLoading && sendMessage(chip.msg)}
                disabled={isLoading}
                className="whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:text-blue-700 hover:border-blue-300 hover:bg-blue-50/60 shadow-2xs transition-all cursor-pointer shrink-0 disabled:opacity-50"
              >
                {chip.icon}
                <span>{chip.label}</span>
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          {messages.map(msg => (
            <ChatBubble
              key={msg.id}
              message={msg}
              onOpenWebsiteBuilder={() => navigate('/website-builder')}
            />
          ))}

          {/* Pending Action Approval Cards */}
          {pendingApprovals.map(action => (
            <ApprovalCard
              key={action.id}
              action={action}
              onConfirm={() => handleApproval(action.id, true)}
              onReject={() => handleApproval(action.id, false)}
            />
          ))}

          {/* Thinking / Processing State */}
          {isLoading && <ThinkingIndicator />}

          {/* 3 Concrete Store Clerk Action Cards (Tangible Retail Tasks) */}
          {messages.length <= 2 && (
            <div className="mt-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#FF6B35]" />
                  1-Click Store Clerk Assistants
                </span>
                <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                  Real retail actions &bull; No complex prompts
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {STORE_CLERK_ACTIONS.map(clerk => (
                  <div
                    key={clerk.id}
                    className={`p-4 rounded-2xl bg-white border ${clerk.borderClass} ${clerk.hoverClass} shadow-2xs flex flex-col justify-between transition-all group`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${clerk.tagColor}`}
                        >
                          {clerk.tag}
                        </span>
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${clerk.iconBg}`}
                        >
                          {clerk.icon}
                        </div>
                      </div>
                      <h4 className="text-sm font-extrabold text-slate-900 mb-1.5 leading-snug">
                        {clerk.title}
                      </h4>
                      <p className="text-xs text-slate-600 font-normal leading-relaxed mb-4">
                        {clerk.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => !isLoading && sendMessage(clerk.prompt)}
                      disabled={isLoading}
                      className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all ${clerk.btnClass}`}
                    >
                      <span>{clerk.actionText}</span>
                      <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6 Category Prompts Drawer */}
          {showCategories && messages.length <= 2 && (
            <div className="mt-4 mb-6">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Explore Store Operations
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {CATEGORIES.map(cat => {
                  const isSelected = activeCategory === cat.key;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setActiveCategory(isSelected ? null : cat.key)}
                      style={{
                        backgroundColor: isSelected ? cat.bgLight : '#FFFFFF',
                        borderColor: isSelected ? cat.color : '#E2E8F0',
                      }}
                      className="p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer text-center group"
                    >
                      <div style={{ color: cat.color }}>{cat.icon}</div>
                      <span
                        className={`text-xs font-bold ${
                          isSelected ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'
                        }`}
                      >
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Sub-actions drawer */}
              {activeCategoryData && (
                <div
                  style={{
                    backgroundColor: activeCategoryData.bgLight,
                    borderColor: activeCategoryData.borderLight,
                  }}
                  className="mt-3 p-3.5 border rounded-2xl flex flex-wrap gap-2 animate-fade-in"
                >
                  {activeCategoryData.actions.map((act, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => sendMessage(act.msg)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white text-xs font-semibold text-slate-800 hover:text-blue-700 hover:border-blue-300 shadow-2xs border border-slate-200 transition-all cursor-pointer"
                    >
                      <span style={{ color: activeCategoryData.color }}>{act.icon}</span>
                      <span>{act.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Bottom Input Console (White Surface with Blue & Orange Accents) ── */}
      <footer className="border-t border-slate-200/90 bg-white/95 backdrop-blur-xl p-3 sm:p-4 z-10 shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-2">
            {/* Voice Input Button */}
            <button
              type="button"
              onClick={startVoice}
              disabled={isLoading}
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/30'
                  : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
              }`}
              title={isListening ? 'Listening... Speak now' : 'Speak in your language (Hindi / English)'}
            >
              <Mic size={18} strokeWidth={2} />
            </button>

            {/* Text Area */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask FeraSetu AI to build website, manage stock, create offers, or analyze sales..."
              rows={1}
              disabled={isLoading}
              className="flex-1 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 font-medium resize-none outline-none min-h-[44px] max-h-[120px] transition-all"
            />

            {/* Send Button (Vibrant FeraSetu Orange Gradient) */}
            <button
              type="button"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className={`h-11 px-4 sm:px-5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shrink-0 transition-all ${
                input.trim() && !isLoading
                  ? 'bg-gradient-to-r from-orange-500 via-[#FF6B35] to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md shadow-orange-500/25 cursor-pointer active:scale-95'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
            >
              <span>Send</span>
              <Send size={15} />
            </button>
          </div>

          {/* Micro-trust note */}
          <div className="mt-2 text-center text-[10px] text-slate-400 font-medium">
            Press <kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[9px] text-slate-600">Enter</kbd> to send, <kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[9px] text-slate-600">Shift + Enter</kbd> for new line &bull; Built with pride for independent merchants
          </div>
        </div>
      </footer>
    </div>
  );
}
