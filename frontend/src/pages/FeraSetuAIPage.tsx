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
  Plus,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../i18n';
import FeroMascot from '../components/ui/FeroMascot';

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
  image?: string;
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
          <div className="bg-blue-50/40 border border-blue-200/80 p-3 rounded-xl text-xs text-slate-700 font-mono leading-relaxed mb-1 max-w-full shadow-2xs">
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
          {/* Uploaded Image Preview in chat */}
          {message.image && (
            <div className="mb-3 rounded-xl overflow-hidden border border-white/30 max-w-[280px] shadow-sm bg-black/5">
              <img
                src={message.image}
                alt="Uploaded item"
                className="w-full h-auto max-h-[220px] object-cover"
              />
            </div>
          )}

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
  const isMcpWebsite = action.toolName.includes('mcp') || action.toolName.includes('website');
  const riskConfig = {
    read_only: { color: '#059669', bg: 'bg-emerald-50', border: 'border-emerald-300', label: isMcpWebsite ? 'MCP Website Action Proposal' : 'Store Recommendation', icon: isMcpWebsite ? <Sparkles size={14} className="text-[#0052FF]" /> : <CheckCircle size={14} /> },
    reversible_write: { color: '#D97706', bg: 'bg-amber-50', border: 'border-amber-300', label: 'Action Confirmation Required', icon: <AlertTriangle size={14} /> },
    sensitive: { color: '#DC2626', bg: 'bg-red-50', border: 'border-red-300', label: 'Sensitive Action — Review Carefully', icon: <AlertTriangle size={14} /> },
  };

  const risk = riskConfig[action.riskLevel] ?? riskConfig.reversible_write;

  return (
    <div className={`bg-white border-2 ${isMcpWebsite ? 'border-blue-400 bg-blue-50/20' : 'border-amber-300'} rounded-2xl p-4 sm:p-5 my-3 ml-12 shadow-sm max-w-xl`}>
      <div className={`flex items-center gap-2 mb-2 text-xs font-extrabold uppercase tracking-wide ${isMcpWebsite ? 'text-blue-900' : 'text-amber-800'}`}>
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
          className={`px-4 py-2 rounded-xl ${isMcpWebsite ? 'bg-[#0052FF] hover:bg-blue-700 shadow-blue-500/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'} text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors`}
        >
          {isMcpWebsite ? <Sparkles size={14} /> : <CheckCircle size={14} />}
          <span>{isMcpWebsite ? 'Build & Apply Store Website' : 'Confirm Action'}</span>
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
  const [selectedImage, setSelectedImage] = useState<{ file: File; previewUrl: string; name: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const hasInitializedQuery = useRef(false);
  const conversationIdRef = useRef(crypto.randomUUID());

  const storeUrl = user?.store_slug
    ? `https://${user.store_slug}.ferasetu.store`
    : user?.subdomain
    ? `https://${user.subdomain}.ferasetu.store`
    : '';

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file (PNG, JPG, WEBP).');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage({
          file,
          previewUrl: reader.result as string,
          name: file.name,
        });
        toast.success(`Image attached: ${file.name}`);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
      if ((!trimmed && !selectedImage) || sendMutation.isPending) return;

      const messageContent =
        trimmed ||
        (selectedImage
          ? 'Please analyze this uploaded product image, recommend competitive pricing and title, and build a beautiful website storefront layout to sell it.'
          : '');

      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: messageContent,
        timestamp: new Date(),
        image: selectedImage?.previewUrl,
      };

      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);

      const isBuildingStore =
        /website|storefront|shop|build|design|theme|mcp|product|photo|image|sell/i.test(messageContent) ||
        !!selectedImage;

      // Build 10-message multi-turn history (excluding initial greeting)
      const history = updatedMessages
        .filter(m => m.id !== 'ferasetu-welcome')
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));

      sendMutation.mutate(
        { message: messageContent, conversationHistory: history },
        {
          onSuccess: (data) => {
            // If the user requested to build website or uploaded an image, attach MCP website builder action
            if (isBuildingStore && (!data.proposedActions || data.proposedActions.length === 0)) {
              setPendingApprovals((prev) => [
                ...prev,
                {
                  id: `mcp-${Date.now()}`,
                  toolName: 'mcp_website_builder_apply_theme',
                  riskLevel: 'read_only',
                  preview: `🎨 MCP Website Builder Action: Automatically design and apply a high-converting storefront layout for your products with instant 0% commission direct UPI checkout.`,
                  requiresApproval: true,
                },
              ]);
            }
          },
        }
      );

      setInput('');
      clearSelectedImage();
      setActiveCategory(null);
    },
    [messages, sendMutation, selectedImage],
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
    const action = pendingApprovals.find(a => a.id === actionId);
    setPendingApprovals(prev => prev.filter(a => a.id !== actionId));
    if (!action) return;

    if (confirmed) {
      if (action.toolName.includes('website') || action.toolName.includes('mcp')) {
        toast.success('MCP Website Builder applied! Your storefront layout is live.');
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: `✨ **MCP Website Builder Executed Successfully!**\n\nYour online storefront has been updated with a beautiful layout, high-converting product card, and direct UPI settlement.\n\n👉 **Next Actions:**\n- [Open Website Builder Studio](/website-builder)\n- [View Live Storefront](${storeUrl || '/templates/retail'})\n- [Manage Products](/products)`,
            timestamp: new Date(),
            model: 'FeraSetu MCP Engine',
          }
        ]);
      } else {
        toast.success('Action approved! It will be executed shortly.');
      }
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
      className={`h-[calc(100vh-115px)] rounded-2xl border flex flex-col relative overflow-hidden bg-white transition-colors duration-200 ${
        isLoading ? 'border-[#0052FF]/60 shadow-sm' : 'border-slate-200/90 shadow-xs'
      }`}
    >
      {/* ── Minimal shadcn AI Elements Header Bar ── */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 border-b border-slate-200/80 bg-white shrink-0 z-10">
        <div className="flex items-center gap-3">
          <FeroMascot size={36} showBadge={false} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base text-slate-900 tracking-tight">
                FeraSetu AI
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                  isLoading
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                {isLoading ? 'Thinking...' : 'Online'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Store operations assistant &bull; 0% marketplace commission
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/ai-credits')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 font-semibold text-xs transition-colors cursor-pointer tabular-nums"
            title="View AI credits balance"
          >
            <Coins size={14} className="text-[#EA580C]" />
            <span>{credits} credits</span>
          </button>

          <button
            type="button"
            onClick={() => setAutoPlay(!autoPlay)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer border ${
              autoPlay
                ? 'bg-blue-50 text-[#0052FF] border-blue-200'
                : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
            }`}
            title={autoPlay ? 'Voice playback enabled' : 'Voice playback muted'}
          >
            {autoPlay ? <Mic size={14} /> : <MicOff size={14} />}
            <span className="hidden sm:inline">{autoPlay ? 'Voice On' : 'Voice Off'}</span>
          </button>

          <div className="relative" ref={langDropdownRef}>
            <button
              type="button"
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs cursor-pointer transition-colors"
            >
              <Globe size={14} className="text-[#0052FF]" />
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
                        ? 'bg-blue-50 text-[#0052FF] font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{lang.nativeName}</span>
                    {language === lang.code && <Check size={12} className="text-[#0052FF]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleResetChat}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="New conversation"
            aria-label="New conversation"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </header>

      {/* ── Conversation Viewport (shadcn AI Elements Message Thread) ── */}
      <div
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 bg-slate-50/40"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#CBD5E1 transparent' }}
      >
        <div className="max-w-3xl mx-auto space-y-5">
          {messages.map(msg => (
            <ChatBubble
              key={msg.id}
              message={msg}
              onOpenWebsiteBuilder={() => navigate('/website-builder')}
            />
          ))}

          {pendingApprovals.map(action => (
            <ApprovalCard
              key={action.id}
              action={action}
              onConfirm={() => handleApproval(action.id, true)}
              onReject={() => handleApproval(action.id, false)}
            />
          ))}

          {isLoading && <ThinkingIndicator />}

          {/* Clean Starter Action List (shown only before user starts chatting) */}
          {messages.length <= 2 && (
            <div className="pt-2 space-y-3">
              <div className="text-xs font-semibold text-slate-500">
                Suggested store workflows
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {STORE_CLERK_ACTIONS.map(clerk => (
                  <button
                    key={clerk.id}
                    type="button"
                    onClick={() => !isLoading && sendMessage(clerk.prompt)}
                    disabled={isLoading}
                    className="text-left p-4 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between gap-3 disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-[#0052FF] transition-colors">
                        {clerk.title}
                      </span>
                      <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {clerk.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Suggestions + Unified PromptInput Composer (shadcn AI Elements) ── */}
      <footer className="border-t border-slate-200/80 bg-white px-4 py-3.5 sm:px-6 shrink-0 z-10">
        <div className="max-w-3xl mx-auto space-y-3">
          {/* Horizontal Suggestion Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            {QUICK_CHIPS.map(chip => (
              <button
                key={chip.label}
                type="button"
                onClick={() => !isLoading && sendMessage(chip.msg)}
                disabled={isLoading}
                className="whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700 hover:text-[#0052FF] hover:border-blue-300 hover:bg-blue-50/50 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                {chip.icon}
                <span>{chip.label}</span>
              </button>
            ))}
          </div>

          {/* Hidden File Input for Image Upload */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />

          {/* Unified PromptInput Box */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs focus-within:border-[#0052FF] focus-within:ring-2 focus-within:ring-[#0052FF]/15 transition-all p-2.5 sm:p-3">
            {/* Attached Image Preview */}
            {selectedImage && (
              <div className="flex items-center justify-between gap-3 p-2 bg-blue-50/80 border border-blue-200/90 rounded-xl mb-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={selectedImage.previewUrl}
                    alt="Upload thumbnail"
                    className="w-10 h-10 rounded-lg object-cover border border-blue-200 shrink-0 shadow-2xs"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {selectedImage.name}
                    </div>
                    <div className="text-[11px] text-[#0052FF] font-semibold flex items-center gap-1">
                      <Sparkles size={11} /> Ready for MCP Storefront &amp; Website Generation
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setInput('Analyze this product photo, generate high-converting title & price, and build a beautiful website storefront layout to sell it.');
                    }}
                    className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-[#0052FF] font-bold text-[11px] hover:bg-blue-50 cursor-pointer shadow-2xs"
                  >
                    <Sparkles size={12} /> Auto-Prompt Store
                  </button>
                  <button
                    type="button"
                    onClick={clearSelectedImage}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
                    title="Remove attached image"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={selectedImage ? "Add instructions for your store or hit Send to build website..." : "Ask FeraSetu AI anything, or upload an image to build your store..."}
              rows={2}
              disabled={isLoading}
              className="w-full bg-transparent px-1.5 py-1 text-sm text-slate-900 placeholder:text-slate-400 resize-none outline-none min-h-[44px] max-h-[140px]"
            />

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 mt-1">
              <div className="flex items-center gap-2">
                {/* Image Upload Plus Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors bg-blue-50 hover:bg-blue-100 text-[#0052FF] border border-blue-200 shadow-2xs"
                  title="Upload product or store image to build website"
                  aria-label="Upload product image"
                >
                  <Plus size={14} className="stroke-[2.5]" />
                  <span className="font-bold">Add Image</span>
                </button>

                {/* Voice Input Button */}
                <button
                  type="button"
                  onClick={startVoice}
                  disabled={isLoading}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                  title={isListening ? 'Listening...' : 'Speak in your language'}
                  aria-label="Voice input"
                >
                  <Mic size={14} />
                  <span className="hidden sm:inline">{isListening ? 'Listening...' : 'Voice'}</span>
                </button>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  Enter to send &bull; Shift+Enter for new line
                </span>
              </div>

              <button
                type="button"
                onClick={() => sendMessage(input)}
                disabled={(!input.trim() && !selectedImage) || isLoading}
                className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-xs transition-all ${
                  (input.trim() || selectedImage) && !isLoading
                    ? 'bg-[#0052FF] hover:bg-[#0045d8] text-white shadow-xs cursor-pointer active:scale-95'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span>Send</span>
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
