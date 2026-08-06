// =============================================================================
// Fera AI — FeraAIPage
// The premium, mobile-first Fera AI assistant interface.
// One assistant. Many capabilities. Zero confusion.
// =============================================================================

import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Send, Mic, MicOff, Bot, User, ChevronRight,
  TrendingUp, Package, Users, Sparkles, Zap, BarChart3,
  Store, ShoppingCart, MessageSquare, FileText, RefreshCw,
  CheckCircle, XCircle, AlertTriangle, Globe, Loader2,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

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
}

interface ProposedAction {
  id: string;
  toolName: string;
  riskLevel: 'read_only' | 'reversible_write' | 'sensitive';
  preview: string;
  requiresApproval: boolean;
  input: Record<string, unknown>;
}

type CategoryKey = 'sell_more' | 'manage_shop' | 'customers' | 'create' | 'automate' | 'insights';

interface QuickAction {
  label: string;
  msg: string;
  icon: ReactNode;
}

interface Category {
  key: CategoryKey;
  label: string;
  icon: ReactNode;
  color: string;
  actions: QuickAction[];
}

// ---------------------------------------------------------------------------
// Categories & quick actions
// ---------------------------------------------------------------------------

const CATEGORIES: Category[] = [
  {
    key: 'sell_more',
    label: 'Sell More',
    icon: <TrendingUp size={18} />,
    color: '#10B981',
    actions: [
      { label: 'Sales tips for this week', msg: 'Give me 3 practical tips to increase my sales this week', icon: <TrendingUp size={14} /> },
      { label: 'Create a festival offer', msg: 'Create a festival discount campaign for my top-selling products', icon: <Sparkles size={14} /> },
      { label: 'Why did sales drop?', msg: 'My sales have decreased recently. Why might that be and what should I do?', icon: <BarChart3 size={14} /> },
    ],
  },
  {
    key: 'manage_shop',
    label: 'Manage Shop',
    icon: <Store size={18} />,
    color: '#6366F1',
    actions: [
      { label: 'Which products are low stock?', msg: 'Which of my products are running low on stock and need restocking?', icon: <AlertTriangle size={14} /> },
      { label: 'Help me price my products', msg: 'How should I price my products competitively for Indian buyers?', icon: <ShoppingCart size={14} /> },
      { label: 'Manage my pending orders', msg: 'Show me my pending orders and what I should do with them', icon: <Package size={14} /> },
    ],
  },
  {
    key: 'customers',
    label: 'Customers',
    icon: <Users size={18} />,
    color: '#F59E0B',
    actions: [
      { label: 'Write a customer reply', msg: 'Help me write a polite and professional reply to a customer complaint', icon: <MessageSquare size={14} /> },
      { label: 'WhatsApp promotion', msg: 'Write a friendly WhatsApp promotional message to send to my customers', icon: <MessageSquare size={14} /> },
      { label: 'Thank you message', msg: 'Create a warm thank you message for my repeat customers', icon: <CheckCircle size={14} /> },
    ],
  },
  {
    key: 'create',
    label: 'Create',
    icon: <FileText size={18} />,
    color: '#EC4899',
    actions: [
      { label: 'Write product description', msg: 'Write an attractive and honest product description for my best product', icon: <FileText size={14} /> },
      { label: 'Translate to Hindi', msg: 'Translate my latest product description into clear Hindi', icon: <Globe size={14} /> },
      { label: 'Instagram post', msg: 'Create an Instagram post to promote my best product today', icon: <Sparkles size={14} /> },
    ],
  },
  {
    key: 'automate',
    label: 'Automate',
    icon: <Zap size={18} />,
    color: '#8B5CF6',
    actions: [
      { label: 'Auto thank you after delivery', msg: 'Set up an automation to thank customers automatically after their order is delivered', icon: <Zap size={14} /> },
      { label: 'Low stock alert', msg: 'Create an alert notification when any product goes below 5 units in stock', icon: <AlertTriangle size={14} /> },
      { label: 'Weekly business report', msg: 'Set up a weekly business summary report every Monday morning', icon: <RefreshCw size={14} /> },
    ],
  },
  {
    key: 'insights',
    label: 'Insights',
    icon: <BarChart3 size={18} />,
    color: '#14B8A6',
    actions: [
      { label: "Today's sales summary", msg: "What is today's revenue and how does it compare to yesterday?", icon: <TrendingUp size={14} /> },
      { label: 'Weekly performance', msg: "Give me a plain language summary of this week's business performance", icon: <BarChart3 size={14} /> },
      { label: 'What should I do today?', msg: 'What are the top 3 things I should focus on for my business today?', icon: <CheckCircle size={14} /> },
    ],
  },
];

const WELCOME_MESSAGE: Message = {
  id: 'fera-welcome',
  role: 'assistant',
  content: '**Namaste! 🙏 I\'m Fera AI, your personal business assistant.**\n\nI help Indian shopkeepers like you:\n- **Sell more** with smart recommendations\n- **Save time** by automating repetitive work\n- **Understand** your business data simply\n- **Create** content in your language\n\nTap a category below or ask me anything!',
  timestamp: new Date(),
  model: 'sarvam-m',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMessage(text: string): ReactNode {
  // Remove think tags from reasoning models
  const clean = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  const lines = clean.split('\n');

  return (
    <>
      {lines.map((line, i) => {
        // Parse bold **text**
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <span key={i}>
            {parts.map((part, j) =>
              part.startsWith('**') && part.endsWith('**')
                ? <strong key={j} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>
                : <span key={j}>{part}</span>
            )}
            {i < lines.length - 1 && <br />}
          </span>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap: 10,
      marginBottom: 20,
      alignItems: 'flex-start',
    }}>
      {/* Avatar */}
      <div style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        flexShrink: 0,
        background: isUser
          ? 'linear-gradient(135deg, #FF6B35, #FF8F5E)'
          : 'linear-gradient(135deg, #1A2744, #0F172A)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: isUser ? '0 4px 12px rgba(255,107,53,0.3)' : '0 4px 12px rgba(0,0,0,0.4)',
        border: isUser ? '2px solid rgba(255,107,53,0.15)' : '2px solid rgba(255,255,255,0.06)',
      }}>
        {isUser ? <User size={16} color="#fff" /> : <Bot size={16} color="#FF6B35" />}
      </div>

      <div style={{
        maxWidth: '78%',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        alignItems: isUser ? 'flex-end' : 'flex-start',
      }}>
        {/* Attribution label */}
        {!isUser && (
          <span style={{
            fontSize: 10,
            color: '#374151',
            fontWeight: 700,
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
          }}>
            Fera AI
          </span>
        )}

        {/* Message bubble */}
        <div style={{
          padding: '13px 17px',
          borderRadius: isUser ? '20px 4px 20px 20px' : '4px 20px 20px 20px',
          background: isUser
            ? 'linear-gradient(135deg, #FF6B35, #FF7A45)'
            : 'rgba(20, 32, 60, 0.85)',
          color: '#F1F5F9',
          border: isUser ? 'none' : '1px solid rgba(255,255,255,0.07)',
          fontSize: 14,
          lineHeight: 1.65,
          backdropFilter: 'blur(12px)',
          boxShadow: isUser
            ? '0 4px 20px rgba(255,107,53,0.15)'
            : '0 4px 20px rgba(0,0,0,0.25)',
          wordBreak: 'break-word',
        }}>
          {formatMessage(message.content)}
        </div>

        <span style={{ fontSize: 10, color: '#1E293B' }}>
          {message.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'flex-start' }}>
      <div style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        flexShrink: 0,
        background: 'linear-gradient(135deg, #1A2744, #0F172A)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px solid rgba(255,255,255,0.06)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      }}>
        <Bot size={16} color="#FF6B35" />
      </div>
      <div style={{
        padding: '13px 18px',
        background: 'rgba(20, 32, 60, 0.85)',
        borderRadius: '4px 20px 20px 20px',
        border: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
      }}>
        <Loader2 size={15} color="#FF6B35" style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600, fontStyle: 'italic' }}>
          Thinking about your shop...
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
    <div style={{
      background: 'rgba(15, 23, 42, 0.9)',
      border: `1px solid ${risk.color}30`,
      borderLeft: `4px solid ${risk.color}`,
      borderRadius: 12,
      padding: '16px 18px',
      margin: '4px 0 16px 46px',
      backdropFilter: 'blur(10px)',
    }}>
      <div style={{
        fontSize: 11,
        color: risk.color,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.6px',
        marginBottom: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 5,
      }}>
        {risk.icon} {risk.label}
      </div>
      <div style={{ fontSize: 13, color: '#CBD5E1', lineHeight: 1.55, marginBottom: 14 }}>
        {action.preview}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
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
// Main page
// ---------------------------------------------------------------------------

export default function FeraAIPage() {
  const { user, updateUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null);
  const [showCategories, setShowCategories] = useState(true);
  const [pendingApprovals, setPendingApprovals] = useState<ProposedAction[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async (payload: {
      message: string;
      conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
    }) => {
      const lang = user?.preferred_language || 'en';

      // Try v1 endpoint first (new orchestrator)
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
        // Fall back to the existing /api/ai/chat endpoint
        const res = await api.post('/ai/chat', {
          message: payload.message,
          language: lang,
        });
        return res.data as {
          content: string;
          model: string;
          aiCreditsBalance?: number;
        };
      }
    },
    onSuccess: (data) => {
      // Update credit balance if returned
      if (typeof data.aiCreditsBalance === 'number') {
        updateUser({ ai_credits_balance: data.aiCreditsBalance } as Parameters<typeof updateUser>[0]);
      }

      const assistantMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
        model: data.model || 'sarvam-m',
        skillsUsed: (data as { skillsUsed?: string[] }).skillsUsed,
        proposedActions: (data as { proposedActions?: ProposedAction[] }).proposedActions,
      };
      setMessages(prev => [...prev, assistantMsg]);
      setShowCategories(false);

      // Queue any proposed actions needing approval
      const actions = (data as { proposedActions?: ProposedAction[] }).proposedActions ?? [];
      const needApproval = actions.filter(a => a.requiresApproval);
      if (needApproval.length > 0) {
        setPendingApprovals(prev => [...prev, ...needApproval]);
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
        toast.error('Could not get a response from Fera AI. Please try again.');
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

      setMessages(prev => {
        const updatedMessages = [...prev, userMsg];
        // Build conversation history for context (exclude welcome message)
        const history = updatedMessages
          .filter(m => m.id !== 'fera-welcome')
          .slice(-10)
          .map(m => ({ role: m.role, content: m.content }));
        sendMutation.mutate({ message: trimmed, conversationHistory: history });
        return updatedMessages;
      });

      setInput('');
      setActiveCategory(null);
    },
    [sendMutation],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const startVoice = () => {
    const SR = (window as typeof window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition
      || (window as typeof window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;

    if (!SR) {
      toast.error('Voice input is not supported on this browser. Please type your message.');
      return;
    }

    const recognition = new SR();
    recognition.lang = user?.preferred_language === 'hi' ? 'hi-IN' : 'en-IN';
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
      // TODO Phase 2: execute the action via /api/v1/ai/approvals/:id/confirm
    } else {
      toast('Action cancelled.', { icon: '✋' });
    }
  };

  const activeCategoryData = CATEGORIES.find(c => c.key === activeCategory);
  const isLoading = sendMutation.isPending;
  const credits = user?.ai_credits_balance ?? 0;

  return (
    <div
      id="fera-ai-page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 60px)',
        background: 'linear-gradient(180deg, #060818 0%, #080D1E 100%)',
        position: 'relative',
        overflow: 'hidden',
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
          background: 'radial-gradient(circle, rgba(255,107,53,0.05) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(6,8,24,0.85)',
          backdropFilter: 'blur(20px)',
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div
            aria-hidden
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #FF6B35, #FF8F5E)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 18px rgba(255,107,53,0.35)',
            }}
          >
            <Bot size={19} color="#fff" />
          </div>
          <div>
            <h1 style={{
              fontSize: 16,
              fontWeight: 800,
              color: '#F1F5F9',
              letterSpacing: '-0.3px',
              margin: 0,
              lineHeight: 1,
            }}>
              Fera AI
            </h1>
            <div style={{
              fontSize: 10,
              color: '#10B981',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              marginTop: 2,
            }}>
              <span style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: '#10B981',
                display: 'inline-block',
              }} />
              Online · Your Business Assistant
            </div>
          </div>
        </div>

        {/* Credits badge */}
        <button
          id="fera-ai-credits-btn"
          onClick={() => { window.location.href = '/ai-credits'; }}
          style={{
            padding: '5px 13px',
            borderRadius: 20,
            background: credits > 5 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${credits > 5 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
            color: credits > 5 ? '#10B981' : '#EF4444',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <Sparkles size={11} />
          {credits} credits
        </button>
      </header>

      {/* ── Messages area ───────────────────────────────────────────────── */}
      <div
        id="fera-ai-messages"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '18px 16px',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.08) transparent',
        }}
      >
        {/* Render messages */}
        {messages.map(msg => (
          <ChatBubble key={msg.id} message={msg} />
        ))}

        {/* Approval cards for pending actions */}
        {pendingApprovals.map(action => (
          <ApprovalCard
            key={action.id}
            action={action}
            onConfirm={() => handleApproval(action.id, true)}
            onReject={() => handleApproval(action.id, false)}
          />
        ))}

        {/* Thinking indicator */}
        {isLoading && <ThinkingIndicator />}

        {/* Category selector (shown on first load or when toggled) */}
        {showCategories && !isLoading && (
          <div style={{ marginTop: 8 }}>
            <p style={{
              fontSize: 11,
              color: '#334155',
              fontWeight: 600,
              textAlign: 'center',
              marginBottom: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
            }}>
              What can I help you with?
            </p>

            {/* 3-column category grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              marginBottom: 12,
            }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  id={`fera-category-${cat.key}`}
                  onClick={() => setActiveCategory(activeCategory === cat.key ? null : cat.key)}
                  style={{
                    padding: '11px 6px',
                    background: activeCategory === cat.key
                      ? `${cat.color}18`
                      : 'rgba(10, 18, 40, 0.7)',
                    border: `1px solid ${activeCategory === cat.key ? `${cat.color}35` : 'rgba(255,255,255,0.05)'}`,
                    borderRadius: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.2s ease',
                    color: activeCategory === cat.key ? cat.color : '#374151',
                  }}
                >
                  <span style={{ color: activeCategory === cat.key ? cat.color : '#4B5563' }}>
                    {cat.icon}
                  </span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                    lineHeight: 1,
                  }}>
                    {cat.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Quick actions for selected category */}
            {activeCategoryData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {activeCategoryData.actions.map(action => (
                  <button
                    key={action.label}
                    id={`fera-action-${action.label.replace(/\s+/g, '-').toLowerCase()}`}
                    onClick={() => sendMessage(action.msg)}
                    disabled={isLoading}
                    style={{
                      padding: '11px 14px',
                      background: 'rgba(10, 18, 40, 0.8)',
                      border: `1px solid ${activeCategoryData.color}18`,
                      borderRadius: 10,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      color: '#94A3B8',
                      fontSize: 13,
                      fontWeight: 500,
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <span style={{ color: activeCategoryData.color }}>{action.icon}</span>
                      {action.label}
                    </div>
                    <ChevronRight size={13} color="#1E293B" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ───────────────────────────────────────────────────── */}
      <footer style={{
        padding: '10px 14px 14px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(6,8,24,0.92)',
        backdropFilter: 'blur(20px)',
        flexShrink: 0,
      }}>
        {/* Show categories toggle (after first message) */}
        {!showCategories && (
          <button
            onClick={() => setShowCategories(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 11px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 20,
              cursor: 'pointer',
              color: '#374151',
              fontSize: 11,
              marginBottom: 9,
              fontWeight: 600,
            }}
          >
            <Sparkles size={11} /> Show what Fera AI can do
          </button>
        )}

        {/* Composer bar */}
        <div
          id="fera-input-bar"
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 7,
            background: 'rgba(12, 20, 44, 0.9)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16,
            padding: '7px 8px 7px 15px',
            transition: 'border-color 0.2s ease',
          }}
        >
          <textarea
            id="fera-message-input"
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Fera AI about your shop..."
            rows={1}
            disabled={isLoading}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#F1F5F9',
              fontSize: 14,
              lineHeight: 1.5,
              resize: 'none',
              maxHeight: 110,
              overflowY: 'auto',
              fontFamily: 'inherit',
              caretColor: '#FF6B35',
            }}
          />

          <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
            {/* Voice button */}
            <button
              id="fera-voice-btn"
              onClick={startVoice}
              disabled={isLoading}
              title={isListening ? 'Listening...' : 'Tap to speak'}
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: isListening ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isListening ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.07)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: isListening ? '#EF4444' : '#374151',
                transition: 'all 0.2s ease',
              }}
            >
              {isListening ? <MicOff size={15} /> : <Mic size={15} />}
            </button>

            {/* Send button */}
            <button
              id="fera-send-btn"
              onClick={() => sendMessage(input)}
              disabled={isLoading || !input.trim()}
              title="Send message"
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: input.trim() && !isLoading
                  ? 'linear-gradient(135deg, #FF6B35, #FF7A45)'
                  : 'rgba(255,255,255,0.03)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                boxShadow: input.trim() && !isLoading
                  ? '0 4px 14px rgba(255,107,53,0.35)'
                  : 'none',
                transition: 'all 0.2s ease',
                color: '#fff',
              }}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
