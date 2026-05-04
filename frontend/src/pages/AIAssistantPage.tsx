import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Send, Mic, MicOff, Bot, User, Globe, BrainCircuit, Store, Package, ClipboardList, TrendingUp } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../utils/languages';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
  isThinking?: boolean;
}

const QUICK_CHIPS = [
  { label: 'Build website', msg: 'Help me build my online store website', icon: <Store size={15} /> },
  { label: 'Add products', msg: 'How do I add products to my store?', icon: <Package size={15} /> },
  { label: 'Manage orders', msg: 'Show me how to manage my orders', icon: <ClipboardList size={15} /> },
  { label: 'Analyze sales', msg: 'Analyze my sales and give recommendations', icon: <TrendingUp size={15} /> },
];

function formatContent(text: string): ReactNode {
  const displayContent = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  const parts = displayContent.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const isWebsiteOnboarding = message.content.includes('designed your website');
  const [showThoughts, setShowThoughts] = useState(false);
  
  const thoughtMatch = message.content.match(/<think>([\s\S]*?)<\/think>/);
  const thoughts = thoughtMatch ? thoughtMatch[1].trim() : null;

  return (
    <div className="animate-fade-up" style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap: '10px', marginBottom: '16px', alignItems: 'flex-start',
    }}>
      {/* Avatar */}
      <div style={{
        width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
        background: isUser ? 'var(--primary)' : 'linear-gradient(135deg, #1E293B, #0F172A)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: isUser ? '0 4px 12px rgba(255,107,53,0.2)' : '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        {isUser ? <User size={16} color="#fff" /> : <Bot size={16} color="#FF6B35" />}
      </div>

      <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        {/* Model tag for AI */}
        {!isUser && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {message.model && (
              <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                 {message.model}
              </span>
            )}
            {thoughts && (
               <button 
                 onClick={() => setShowThoughts(!showThoughts)}
                 style={{ background: 'none', border: 'none', color: '#6366F1', fontSize: '10px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
               >
                 <BrainCircuit size={12} /> {showThoughts ? 'HIDE REASONING' : 'VIEW REASONING'}
               </button>
            )}
          </div>
        )}

        {/* Thoughts / Reasoning UI */}
        {showThoughts && thoughts && (
           <div style={{ 
             background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '12px 16px', borderRadius: '12px', 
             fontSize: '12px', color: '#64748B', fontStyle: 'italic', marginBottom: '8px', borderLeft: '4px solid #6366F1',
             lineHeight: 1.5
           }}>
              {thoughts}
           </div>
        )}

        {/* Bubble */}
        <div style={{
          padding: '14px 18px', borderRadius: isUser ? '20px 4px 20px 20px' : '4px 20px 20px 20px',
          background: isUser ? 'var(--primary)' : 'var(--surface)',
          color: isUser ? '#fff' : 'var(--text)',
          border: isUser ? 'none' : '1px solid var(--border)',
          fontSize: '14px', lineHeight: 1.6,
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          position: 'relative'
        }}>
          {formatContent(message.content)}
          
          {isWebsiteOnboarding && (
            <button 
              onClick={() => window.location.href = '/website-builder'}
              style={{
                marginTop: '12px', width: '100%', padding: '10px',
                background: 'var(--primary)', color: '#fff', border: 'none',
                borderRadius: '8px', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              <Globe size={16} /> Open Website Builder
            </button>
          )}
        </div>

        <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600 }}>
          {message.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

function TypingIndicator({ isThinking }: { isThinking?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'flex-start' }}>
      <div style={{
        width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
        background: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Bot size={16} color="#FF6B35" />
      </div>
      <div style={{
        padding: '14px 18px', background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '4px 20px 20px 20px', display: 'flex', gap: '12px', alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        {isThinking ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6366F1' }}>
             <BrainCircuit size={16} className="animate-spin-slow" />
             <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.5px' }}>THINKING...</span>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '4px' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: '6px', height: '6px', borderRadius: '50%', background: '#CBD5E1',
                animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AIAssistantPage() {
  const { user, updateUser } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: '**Namaste! 🙏 I\'m Fera AI, your smart shopkeeper assistant.**\n\nI can help you:\n- **Build your website** in seconds\n- **Manage products** and apply discounts\n- **Analyze your sales** and suggest improvements\n- **Answer questions** about running your store\n\nTry asking me something in your language!',
      timestamp: new Date(),
      model: 'sarvam-m',
    },
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [langOpen, setLangOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const speakText = async (text: string, lang: string) => {
    if (!text) return;
    try {
      const res = await api.post('/voice/text-to-speech', { text, language: lang });
      const data = res.data as { audio: string | null };
      if (data.audio) {
        if (audioRef.current) audioRef.current.pause();
        const audio = new Audio(`data:audio/wav;base64,${data.audio}`);
        audioRef.current = audio;
        audio.play();
      }
    } catch (err) {
      console.error('TTS failed:', err);
    }
  };

  const sendMutation = useMutation({
    mutationFn: async (payload: { message: string; language: string }) => {
      // Simulate real thinking for complex tasks
      setIsThinking(true);
      const res = await api.post('/ai/chat', payload);
      const data = res.data as { content: string; model: string; aiCreditsBalance?: number };
      
      // If response has <think> tag, wait at least 3-4 seconds to show "Thinking"
      if (data.content.includes('<think>')) {
        await new Promise(r => setTimeout(r, 4000));
      }
      
      return data;
    },
    onSuccess: (data) => {
      setIsThinking(false);
      if (typeof data.aiCreditsBalance === 'number') {
        updateUser({ ai_credits_balance: data.aiCreditsBalance } as any);
      }
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
        model: data.model || 'sarvam-m',
      }]);
      
      if (autoPlay) {
        const cleanText = data.content.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/#/g, '');
        speakText(cleanText, language);
      }
    },
    onError: (err: any) => {
      setIsThinking(false);
      toast.error(err.response?.status === 402 ? 'AI credits finished. Buy credits to continue.' : 'Failed to get AI response');
    },
  });

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: trimmed, timestamp: new Date() }]);
    setInput('');
    sendMutation.mutate({ message: trimmed, language });
  }, [language, sendMutation]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return toast.error('Voice not supported');
    const recognition = new SR();
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setTimeout(() => sendMessage(transcript), 300);
    };
    recognition.start();
  };

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === language);
  const isLoading = sendMutation.isPending || isThinking;

  const handleChipClick = (msg: string) => {
    if (!isLoading) {
      sendMessage(msg);
    }
  };

  const handleSend = () => {
    if (!isLoading && input.trim()) {
      sendMessage(input);
    }
  };

  const changeLanguage = (langCode: string) => {
    setLanguage(langCode);
    setLangOpen(false);
  };

  return (
    <div className="ai-workspace">
      <aside className="ai-command-panel">
        <div className="ai-command-hero">
          <div className="ai-command-icon"><Bot size={24} /></div>
          <div>
            <p>Fera AI</p>
            <h1>Business Command Center</h1>
          </div>
        </div>

        <div className="ai-command-copy">
          Ask for store setup, product changes, order workflows, sales advice, and customer-facing content in your language.
        </div>

        <div className="ai-command-cards">
          <div><strong>Live mode</strong><span>Ready to assist</span></div>
          <div><strong>{currentLang?.nativeName || 'English'}</strong><span>Selected language</span></div>
          <div><strong>{messages.length}</strong><span>Messages in session</span></div>
        </div>
      </aside>

      <section className="chat-container-wrapper ai-chat-shell">
        <div className="chat-header">
          <div className="ai-info-meta">
            <div className="ai-avatar">
              <Bot size={20} color="#FF6B35" />
            </div>
            <div>
              <div className="ai-name">Fera AI Assistant</div>
              <div className="ai-status">ONLINE · SHOPKEEPER COPILOT</div>
            </div>
          </div>
          <div className="header-actions">
            <button onClick={() => window.location.href = '/ai-credits'} className="action-btn active" title="Buy AI credits">
              {user?.ai_credits_balance ?? 0} credits
            </button>
            <button 
              onClick={() => setAutoPlay(!autoPlay)} 
              className={`action-btn ${autoPlay ? 'active' : ''}`}
              title={autoPlay ? 'Voice on' : 'Voice off'}
            >
              {autoPlay ? <Mic size={14} /> : <MicOff size={14} />}
              Voice
            </button>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setLangOpen(!langOpen)} className="action-btn">
                <Globe size={14} /> {currentLang?.nativeName}
              </button>
              {langOpen && (
                <div className="lang-dropdown">
                  {SUPPORTED_LANGUAGES.slice(0, 6).map(lang => (
                    <div 
                      key={lang.code}
                      className={`lang-option ${language === lang.code ? 'active' : ''}`}
                      onClick={() => changeLanguage(lang.code)}
                    >
                      {lang.nativeName}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="messages-scroll-area">
          <div className="messages-inner">
            {messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
            {isLoading && <TypingIndicator isThinking={isThinking} />}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="chat-input-section">
          <div className="quick-chips-area">
            {QUICK_CHIPS.map(chip => (
              <button 
                key={chip.label} 
                onClick={() => handleChipClick(chip.msg)} 
                className="chip-btn"
                disabled={isLoading}
              >
                {chip.icon}{chip.label}
              </button>
            ))}
          </div>
          <div className="input-bar">
            <button 
              onClick={startVoice} 
              className={`voice-btn ${isListening ? 'active' : ''}`}
              disabled={isLoading}
            >
              <Mic size={18} />
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Fera to add products, improve your store, or analyze sales..."
              rows={1}
              className="chat-textarea"
              disabled={isLoading}
            />
            <button 
              onClick={handleSend} 
              className={`send-btn ${input.trim() && !isLoading ? 'ready' : ''}`}
              disabled={!input.trim() || isLoading}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
