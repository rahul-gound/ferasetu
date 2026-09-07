// =============================================================================
// FeraSetu AI — Unified Shopkeeper Copilot & Operations Manager
// Combines live store context, multi-turn memory, action approval cards,
// voice output (TTS), voice input (STT), chain-of-thought reasoning inspection,
// 6 Indian SMB business categories, and direct website builder integration.
// =============================================================================

import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Send, Mic, MicOff, Bot, User, ChevronRight,
  TrendingUp, Package, Users, Sparkles, Zap, BarChart3,
  Store, ShoppingCart, MessageSquare, FileText, RefreshCw,
  CheckCircle, XCircle, AlertTriangle, Globe, Loader2,
  BrainCircuit, ClipboardList, Coins, ChevronDown
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../i18n';
import AIWorkflowStrip from '../components/marketing/AIWorkflowStrip';

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
  actions: Array<{ label: string; msg: string; icon: ReactNode }>;
}

// ---------------------------------------------------------------------------
// Quick Action Chips & 6 SMB Categories
// ---------------------------------------------------------------------------

const QUICK_CHIPS = [
  { label: 'Build website', msg: 'Help me build my online store website', icon: <Store size={14} /> },
  { label: 'Add products', msg: 'How do I add products to my store?', icon: <Package size={14} /> },
  { label: 'Manage orders', msg: 'Show me my pending orders and how to fulfill them', icon: <ClipboardList size={14} /> },
  { label: 'Analyze sales', msg: 'Analyze my sales and give recommendations', icon: <TrendingUp size={14} /> },
];

const CATEGORIES: Category[] = [
  {
    key: 'sell_more',
    label: 'Sell More',
    icon: <TrendingUp size={16} />,
    color: '#10B981',
    actions: [
      { label: 'Sales tips for this week', msg: 'Give me 3 practical tips to increase my sales this week', icon: <TrendingUp size={13} /> },
      { label: 'Create a festival offer', msg: 'Create a festival discount campaign for my top-selling products', icon: <Sparkles size={13} /> },
      { label: 'Why did sales drop?', msg: 'My sales have decreased recently. Why might that be and what should I do?', icon: <BarChart3 size={13} /> },
    ],
  },
  {
    key: 'manage_shop',
    label: 'Manage Shop',
    icon: <Store size={16} />,
    color: '#6366F1',
    actions: [
      { label: 'Which products are low stock?', msg: 'Which of my products are running low on stock and need restocking?', icon: <AlertTriangle size={13} /> },
      { label: 'Help me price my products', msg: 'How should I price my products competitively for Indian buyers?', icon: <Package size={13} /> },
      { label: 'Manage my pending orders', msg: 'Show me my pending orders and what I should do with them', icon: <ShoppingCart size={13} /> },
    ],
  },
  {
    key: 'customers',
    label: 'Customers',
    icon: <Users size={16} />,
    color: '#F59E0B',
    actions: [
      { label: 'Write a customer reply', msg: 'Help me write a polite and professional reply to a customer complaint', icon: <MessageSquare size={13} /> },
      { label: 'WhatsApp promotion', msg: 'Write a friendly WhatsApp promotional message to send to my customers', icon: <MessageSquare size={13} /> },
      { label: 'Thank you message', msg: 'Create a warm thank you message for my repeat customers', icon: <CheckCircle size={13} /> },
    ],
  },
  {
    key: 'create',
    label: 'Create',
    icon: <FileText size={16} />,
    color: '#EC4899',
    actions: [
      { label: 'Write product description', msg: 'Write an attractive and honest product description for my best product', icon: <FileText size={13} /> },
      { label: 'Translate to Hindi', msg: 'Translate my latest product description into clear Hindi', icon: <Globe size={13} /> },
      { label: 'Instagram post', msg: 'Create an Instagram post to promote my best product today', icon: <Sparkles size={13} /> },
    ],
  },
  {
    key: 'automate',
    label: 'Automate',
    icon: <Zap size={16} />,
    color: '#8B5CF6',
    actions: [
      { label: 'Auto thank you after delivery', msg: 'Set up an automation to thank customers automatically after their order is delivered', icon: <Zap size={13} /> },
      { label: 'Low stock alert', msg: 'Create an alert notification when any product goes below 5 units in stock', icon: <AlertTriangle size={13} /> },
      { label: 'Weekly business report', msg: 'Set up a weekly business summary report every Monday morning', icon: <RefreshCw size={13} /> },
    ],
  },
  {
    key: 'insights',
    label: 'Insights',
    icon: <BarChart3 size={16} />,
    color: '#14B8A6',
    actions: [
      { label: "Today's sales summary", msg: "What is today's revenue and how does it compare to yesterday?", icon: <TrendingUp size={13} /> },
      { label: 'Weekly performance', msg: "Give me a plain language summary of this week's business performance", icon: <BarChart3 size={13} /> },
      { label: 'What should I do today?', msg: 'What are the top 3 things I should focus on for my business today?', icon: <CheckCircle size={13} /> },
    ],
  },
];

const WELCOME_MESSAGE: Message = {
  id: 'ferasetu-welcome',
  role: 'assistant',
  content: '**Namaste! 🙏 I\'m FeraSetu AI, your personal business assistant.**\n\nI can help you:\n- **Sell more** with smart, store-specific recommendations\n- **Build & edit your website** in seconds\n- **Track low stock & orders** automatically\n- **Write customer messages & product descriptions** in your language\n\nTap a quick suggestion below or ask me anything!',
  timestamp: new Date(),
  model: 'sarvam-m',
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
                <strong key={j} style={{ fontWeight: 700 }}>
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

function ChatBubble({ message, onOpenWebsiteBuilder }: { message: Message; onOpenWebsiteBuilder: () => void }) {
  const isUser = message.role === 'user';
  const [showThoughts, setShowThoughts] = useState(false);

  // Extract reasoning thought
  const thoughtMatch = message.content.match(/<think>([\s\S]*?)<\/think>/);
  const thoughts = thoughtMatch ? thoughtMatch[1].trim() : null;

  // Detect website builder onboarding triggers
  const isWebsiteOnboarding =
    !isUser &&
    (message.content.toLowerCase().includes('designed your website') ||
      message.content.toLowerCase().includes('website builder') ||
      message.content.toLowerCase().includes('online store website'));

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        gap: 12,
        marginBottom: 20,
        alignItems: 'flex-start',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          flexShrink: 0,
          background: isUser
            ? 'linear-gradient(135deg, #FF6B35, #FF8F5E)'
            : 'linear-gradient(135deg, #1E293B, #0F172A)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isUser ? '0 4px 12px rgba(255,107,53,0.3)' : '0 4px 12px rgba(0,0,0,0.3)',
          border: isUser ? '2px solid rgba(255,107,53,0.2)' : '2px solid rgba(255,255,255,0.08)',
        }}
      >
        {isUser ? <User size={16} color="#fff" /> : <Bot size={16} color="#FF6B35" />}
      </div>

      <div
        style={{
          maxWidth: '82%',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          alignItems: isUser ? 'flex-end' : 'flex-start',
        }}
      >
        {/* Meta / Model tag & Reasoning toggle */}
        {!isUser && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span
              style={{
                fontSize: 10,
                color: '#94A3B8',
                fontWeight: 700,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
              }}
            >
              FeraSetu AI {message.model ? `· ${message.model}` : ''}
            </span>

            {thoughts && (
              <button
                type="button"
                onClick={() => setShowThoughts(!showThoughts)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#818CF8',
                  fontSize: 10,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: 0,
                }}
              >
                <BrainCircuit size={12} /> {showThoughts ? 'HIDE REASONING' : 'VIEW REASONING'}
              </button>
            )}
          </div>
        )}

        {/* Expandable Reasoning Thoughts */}
        {showThoughts && thoughts && (
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderLeft: '4px solid #6366F1',
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: 12,
              color: '#CBD5E1',
              fontStyle: 'italic',
              marginBottom: 4,
              lineHeight: 1.5,
              maxWidth: '100%',
            }}
          >
            {thoughts}
          </div>
        )}

        {/* Message Bubble */}
        <div
          style={{
            padding: '13px 17px',
            borderRadius: isUser ? '20px 4px 20px 20px' : '4px 20px 20px 20px',
            background: isUser
              ? 'linear-gradient(135deg, #FF6B35, #FF7A45)'
              : 'rgba(20, 32, 60, 0.85)',
            color: '#F1F5F9',
            border: isUser ? 'none' : '1px solid rgba(255,255,255,0.08)',
            fontSize: 14,
            lineHeight: 1.65,
            backdropFilter: 'blur(12px)',
            boxShadow: isUser ? '0 4px 20px rgba(255,107,53,0.15)' : '0 4px 20px rgba(0,0,0,0.25)',
            wordBreak: 'break-word',
          }}
        >
          {formatMessage(message.content)}

          {/* Direct CTA button to Website Builder */}
          {isWebsiteOnboarding && (
            <button
              type="button"
              onClick={onOpenWebsiteBuilder}
              style={{
                marginTop: 12,
                width: '100%',
                padding: '9px 14px',
                background: 'linear-gradient(135deg, #FF6B35, #FF8F5E)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 2px 10px rgba(255,107,53,0.25)',
              }}
            >
              <Globe size={15} /> Open Website Builder
            </button>
          )}
        </div>

        <span style={{ fontSize: 10, color: '#94A3B8' }}>
          {new Date(message.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'flex-start' }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          flexShrink: 0,
          background: 'linear-gradient(135deg, #1A2744, #0F172A)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}
      >
        <Bot size={16} color="#FF6B35" />
      </div>
      <div
        style={{
          padding: '12px 18px',
          background: 'rgba(20, 32, 60, 0.85)',
          borderRadius: '4px 20px 20px 20px',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        }}
      >
        <Loader2 size={15} color="#FF6B35" className="animate-spin" />
        <span style={{ fontSize: 13, color: '#94A3B8', fontWeight: 600, fontStyle: 'italic' }}>
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
    read_only: { color: '#10B981', label: 'Auto-execute', icon: <CheckCircle size={12} /> },
    reversible_write: { color: '#F59E0B', label: 'Confirm Action', icon: <AlertTriangle size={12} /> },
    sensitive: { color: '#EF4444', label: 'Approval Required', icon: <AlertTriangle size={12} /> },
  };

  const risk = riskConfig[action.riskLevel] ?? riskConfig.reversible_write;

  return (
    <div
      style={{
        background: 'rgba(15, 23, 42, 0.95)',
        border: `1px solid ${risk.color}40`,
        borderLeft: `4px solid ${risk.color}`,
        borderRadius: 12,
        padding: '15px 18px',
        margin: '4px 0 16px 48px',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: risk.color,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}
      >
        {risk.icon} {risk.label}
      </div>
      <div style={{ fontSize: 13, color: '#CBD5E1', lineHeight: 1.55, marginBottom: 12 }}>
        {action.preview}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          id={`approve-action-${action.id}`}
          onClick={onConfirm}
          style={{
            padding: '7px 18px',
            borderRadius: 8,
            background: '#10B981',
            border: 'none',
            color: '#fff',
            fontWeight: 700,
            fontSize: 12,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <CheckCircle size={13} /> Confirm
        </button>
        <button
          type="button"
          id={`reject-action-${action.id}`}
          onClick={onReject}
          style={{
            padding: '7px 18px',
            borderRadius: 8,
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.25)',
            color: '#EF4444',
            fontWeight: 700,
            fontSize: 12,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <XCircle size={13} /> Cancel
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
  const [autoPlay, setAutoPlay] = useState(true);
  const [langOpen, setLangOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null);
  const [showCategories, setShowCategories] = useState(true);
  const [pendingApprovals, setPendingApprovals] = useState<ProposedAction[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasInitializedQuery = useRef(false);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        model: data.model || 'sarvam-m',
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
        toast.error('AI credits exhausted. Please buy more credits to continue.');
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
    recognition.onerror = () => {
      setIsListening(false);
      toast.error('Voice input failed. Please try typing instead.');
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

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === language);
  const activeCategoryData = CATEGORIES.find(c => c.key === activeCategory);
  const isLoading = sendMutation.isPending;
  const credits = user?.ai_credits_balance ?? 0;

  return (
    <div
      id="ferasetu-ai-page"
      className="h-[calc(100vh-120px)] rounded-2xl overflow-hidden border border-slate-800 shadow-xl flex flex-col relative"
      style={{
        background: 'linear-gradient(180deg, #060818 0%, #0B1120 100%)',
      }}
    >
      {/* Ambient background glow */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: -150,
          right: -150,
          width: 500,
          height: 500,
          background: 'radial-gradient(circle, rgba(255,107,53,0.08) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Top Header Bar ─────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-center justify-between gap-3 p-3 sm:px-5 sm:py-3 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl shrink-0 z-10">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #FF6B35, #E55A2B)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(255,107,53,0.35)',
            }}
          >
            <Sparkles size={20} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 16, color: '#F8FAFC', letterSpacing: '-0.3px' }}>
                FeraSetu AI
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: 'rgba(16,185,129,0.15)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  color: '#10B981',
                  borderRadius: 20,
                  padding: '1px 8px',
                }}
              >
                LIVE · COPILOT
              </span>
            </div>
            <p className="hidden sm:block" style={{ margin: 0, fontSize: 11, color: '#94A3B8' }}>
              Your store operations copilot & retail growth advisor
            </p>
          </div>
        </div>

        {/* Header Action Tools */}
        <div className="flex items-center gap-2">
          {/* AI Credits Button */}
          <button
            type="button"
            onClick={() => navigate('/ai-credits')}
            style={{
              background: 'rgba(255,107,53,0.12)',
              border: '1px solid rgba(255,107,53,0.3)',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 700,
              color: '#FF8F5E',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
            title="Buy or view AI credits"
          >
            <Coins size={14} />
            <span>{credits} credits</span>
          </button>

          {/* Voice Output Toggle */}
          <button
            type="button"
            onClick={() => setAutoPlay(!autoPlay)}
            style={{
              background: autoPlay ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)',
              border: autoPlay ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 700,
              color: autoPlay ? '#A5B4FC' : '#94A3B8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
            title={autoPlay ? 'Voice playback enabled (will read aloud)' : 'Voice playback disabled (silent)'}
          >
            {autoPlay ? <Mic size={14} /> : <MicOff size={14} />}
            <span className="hidden sm:inline">{autoPlay ? 'Voice On' : 'Voice Off'}</span>
          </button>

          {/* Language Selector Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setLangOpen(!langOpen)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                color: '#CBD5E1',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Globe size={14} />
              <span>{currentLang?.nativeName || 'Language'}</span>
              <ChevronDown size={12} />
            </button>

            {langOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '110%',
                  background: '#0F172A',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10,
                  padding: 4,
                  minWidth: 150,
                  zIndex: 50,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                }}
              >
                {SUPPORTED_LANGUAGES.slice(0, 8).map(lang => (
                  <button
                    type="button"
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setLangOpen(false);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 12px',
                      background: language === lang.code ? 'rgba(255,107,53,0.15)' : 'transparent',
                      color: language === lang.code ? '#FF8F5E' : '#CBD5E1',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'block',
                    }}
                  >
                    {lang.nativeName}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Messages Scroll Area ───────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-4 md:px-6 py-4"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.15) transparent' }}
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
                className="whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-800/80 border border-slate-700/80 text-slate-300 hover:text-white hover:border-blue-400 hover:bg-slate-700/80 transition-all cursor-pointer shrink-0 disabled:opacity-50"
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

          {/* Thinking / Processing state */}
          {isLoading && <ThinkingIndicator />}

          {/* 6 Category Prompts Drawer (displayed initially or expandable) */}
          {showCategories && messages.length <= 2 && (
            <div className="mt-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Explore Shop Capabilities
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setActiveCategory(activeCategory === cat.key ? null : cat.key)}
                    style={{
                      background: activeCategory === cat.key ? `${cat.color}20` : 'rgba(15, 23, 42, 0.7)',
                      borderColor: activeCategory === cat.key ? cat.color : 'rgba(255,255,255,0.08)',
                    }}
                    className="p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 hover:border-slate-500 transition-all cursor-pointer text-center group"
                  >
                    <div style={{ color: cat.color }}>{cat.icon}</div>
                    <span className="text-xs font-bold text-slate-200 group-hover:text-white">
                      {cat.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Sub-actions drawer */}
              {activeCategoryData && (
                <div className="mt-3 p-3.5 bg-slate-900/90 border border-slate-700/80 rounded-xl flex flex-wrap gap-2">
                  {activeCategoryData.actions.map((act, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => sendMessage(act.msg)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-all cursor-pointer border border-slate-700"
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

      {/* ── Input Bar ─────────────────────────────────────────────────── */}
      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(6, 8, 24, 0.95)',
          backdropFilter: 'blur(20px)',
          padding: '12px 16px',
          zIndex: 10,
        }}
      >
        <div className="max-w-4xl mx-auto flex items-end gap-2">
          {/* Voice Input Button */}
          <button
            type="button"
            onClick={startVoice}
            disabled={isLoading}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: isListening ? '#EF4444' : 'rgba(255,255,255,0.07)',
              border: isListening ? 'none' : '1px solid rgba(255,255,255,0.1)',
              color: isListening ? '#fff' : '#CBD5E1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.2s',
            }}
            title={isListening ? 'Listening...' : 'Speak in your language'}
          >
            <Mic size={18} />
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
            style={{
              flex: 1,
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12,
              padding: '11px 16px',
              color: '#F8FAFC',
              fontSize: 14,
              resize: 'none',
              outline: 'none',
              minHeight: 44,
              maxHeight: 120,
              lineHeight: 1.4,
            }}
          />

          {/* Send Button */}
          <button
            type="button"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background:
                input.trim() && !isLoading
                  ? 'linear-gradient(135deg, #FF6B35, #E55A2B)'
                  : 'rgba(255,255,255,0.05)',
              border: 'none',
              color: input.trim() && !isLoading ? '#fff' : '#64748B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
              flexShrink: 0,
              boxShadow: input.trim() && !isLoading ? '0 4px 14px rgba(255,107,53,0.3)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
