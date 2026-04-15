import { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Send, Mic, MicOff, Bot, User, Globe, ChevronDown, Sparkles, RotateCcw } from 'lucide-react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../utils/languages';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
}

const QUICK_CHIPS = [
  { label: '🌐 Build my website', msg: 'Help me build my online store website' },
  { label: '📦 Add products', msg: 'How do I add products to my store?' },
  { label: '📋 View orders', msg: 'Show me how to manage my orders' },
  { label: '📊 Analyze sales', msg: 'Analyze my sales and give recommendations' },
];

function formatContent(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
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

  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap: '10px', marginBottom: '16px', alignItems: 'flex-start',
    }}>
      {/* Avatar */}
      <div style={{
        width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
        background: isUser ? 'var(--primary)' : 'linear-gradient(135deg, #004E89, #0070c0)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isUser ? <User size={16} color="#fff" /> : <Bot size={16} color="#fff" />}
      </div>

      <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        {/* Model tag for AI */}
        {!isUser && message.model && (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={10} /> {message.model}
          </span>
        )}

        {/* Bubble */}
        <div style={{
          padding: '12px 16px', borderRadius: isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
          background: isUser ? 'var(--primary)' : 'var(--surface)',
          color: isUser ? '#fff' : 'var(--text)',
          border: isUser ? 'none' : '1px solid var(--border)',
          fontSize: '14px', lineHeight: 1.6,
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
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

        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {message.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'flex-start' }}>
      <div style={{
        width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #004E89, #0070c0)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Bot size={16} color="#fff" />
      </div>
      <div style={{
        padding: '14px 18px', background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '4px 18px 18px 18px', display: 'flex', gap: '4px', alignItems: 'center',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-muted)',
            animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

interface ISpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
}

interface ISpeechRecognitionEvent {
  results: { 0: { transcript: string } }[];
}

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}

export default function AIAssistantPage() {
  const { language, setLanguage, translate } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: '**Namaste! 🙏 I\'m Fera AI, your smart shopkeeper assistant.**\n\nI can help you:\n- **Build your website** in seconds\n- **Manage products** and inventory\n- **Analyze your sales** and suggest improvements\n- **Answer questions** about running your store\n\nTry asking me something in your language!',
      timestamp: new Date(),
      model: 'Sarvam 30B',
    },
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const speakText = async (text: string, lang: string) => {
    if (!text) return;
    setIsSpeaking(true);
    try {
      const res = await api.post('/voice/text-to-speech', { text, language: lang });
      if (res.data.audio) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        const audio = new Audio(`data:audio/wav;base64,${res.data.audio}`);
        audioRef.current = audio;
        audio.onended = () => setIsSpeaking(false);
        audio.play();
      }
    } catch (err) {
      console.error('TTS failed:', err);
      setIsSpeaking(false);
    }
  };

  const sendMutation = useMutation({
    mutationFn: async (payload: { message: string; language: string }) => {
      const res = await api.post('/ai/chat', payload);
      return res.data as { content: string; model: string };
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
        model: data.model || 'Sarvam 30B',
      }]);
      
      if (autoPlay) {
        // Remove markdown formatting for better TTS
        const cleanText = data.content.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/#/g, '');
        speakText(cleanText, language);
      }

      // Check if this response contains a website configuration
      const hasJson = data.content.includes('[') || data.content.includes('{');
      if (hasJson && (data.content.toLowerCase().includes('website') || data.content.toLowerCase().includes('section'))) {
        try {
          const jsonMatch = data.content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || data.content.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
            const newSections = Array.isArray(parsed) ? parsed : (parsed.sections || []);
            if (newSections.length > 0) {
              // Store in session storage for the Website Builder to pick up
              sessionStorage.setItem('pending_ai_sections', JSON.stringify(newSections));
              
              // Add a system message to the chat so the user can't miss it
              setTimeout(() => {
                setMessages(prev => [...prev, {
                  id: 'onboarding-' + Date.now(),
                  role: 'assistant',
                  content: '✨ **I have designed your website!** Click the button below to see it and publish it.',
                  timestamp: new Date(),
                  model: 'System'
                }]);
              }, 1000);

              toast(
                (t) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '18px' }}>✨</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>Website Ready!</div>
                      <button 
                        onClick={() => {
                          toast.dismiss(t.id);
                          window.location.href = '/website-builder';
                        }}
                        style={{ 
                          background: 'var(--primary)', color: '#fff', border: 'none', 
                          padding: '4px 10px', borderRadius: '4px', marginTop: '6px',
                          fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                        }}
                      >
                        Go to Builder →
                      </button>
                    </div>
                  </div>
                ),
                { duration: 8000, position: 'bottom-center' }
              );
            }
          }
        } catch (e) {
          // Ignore parsing errors here
        }
      }
    },
    onError: () => {
      toast.error('Failed to get AI response. Please try again.');
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        model: 'Sarvam 30B',
      }]);
    },
  });

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
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
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      toast.error('Voice input not supported in this browser. Try Chrome.');
      return;
    }

    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = language === 'hi' ? 'hi-IN' : language === 'ta' ? 'ta-IN' : language === 'te' ? 'te-IN' : 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      toast.error('Voice recognition failed');
    };
    recognition.onresult = (event: ISpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setTimeout(() => sendMessage(transcript), 300);
    };

    recognition.start();
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const handleVoice = () => {
    if (isListening) stopVoice();
    else startVoice();
  };

  const clearChat = () => {
    setMessages([{
      id: '0',
      role: 'assistant',
      content: '**Chat cleared!** How can I help you today?',
      timestamp: new Date(),
      model: 'Sarvam 30B',
    }]);
  };

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === language);
  const isTyping = sendMutation.isPending;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 108px)', maxWidth: '900px', margin: '0 auto' }}>
      {/* Chat Header */}
      <div className="card" style={{
        padding: '16px 20px', marginBottom: '0',
        borderRadius: '12px 12px 0 0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #004E89, #FF6B35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Bot size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '15px' }}>Fera AI Assistant</div>
            <div style={{ fontSize: '12px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
              Online · Powered by Sarvam AI
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Model indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '4px 12px', borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(0,78,137,0.1))',
            border: '1px solid rgba(139,92,246,0.2)',
            fontSize: '12px', fontWeight: 600, color: '#7C3AED',
          }}>
            <Sparkles size={12} className={isSpeaking ? 'pulse-icon' : ''} />
            {isSpeaking ? 'Speaking...' : 'Sarvam 30B'}
          </div>

          {/* Auto-play toggle */}
          <button
            onClick={() => setAutoPlay(!autoPlay)}
            title="Toggle Auto-play Voice"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: '8px',
              border: '1px solid var(--border)', 
              background: autoPlay ? 'rgba(16,185,129,0.1)' : 'var(--bg)',
              cursor: 'pointer', fontSize: '13px', 
              color: autoPlay ? '#10B981' : 'var(--text-muted)',
            }}
          >
            {autoPlay ? <Mic size={14} /> : <MicOff size={14} />}
            Voice: {autoPlay ? 'On' : 'Off'}
          </button>

          {/* Language selector */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setLangOpen(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', borderRadius: '8px',
                border: '1px solid var(--border)', background: 'var(--bg)',
                cursor: 'pointer', fontSize: '13px', color: 'var(--text)',
              }}
            >
              <Globe size={14} /> {currentLang?.nativeName} <ChevronDown size={12} />
            </button>
            {langOpen && (
              <div style={{
                position: 'absolute', top: '36px', right: 0,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                zIndex: 100, width: '200px', maxHeight: '280px', overflowY: 'auto',
              }}>
                {SUPPORTED_LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => { setLanguage(lang.code); setLangOpen(false); }}
                    style={{
                      display: 'flex', justifyContent: 'space-between', width: '100%',
                      padding: '9px 14px', border: 'none', cursor: 'pointer', fontSize: '13px',
                      background: lang.code === language ? 'rgba(255,107,53,0.1)' : 'none',
                      color: lang.code === language ? 'var(--primary)' : 'var(--text)',
                    }}
                  >
                    <span>{lang.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{lang.nativeName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Clear chat */}
          <button
            onClick={clearChat}
            title="Clear chat"
            style={{
              background: 'none', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '7px', cursor: 'pointer',
              color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
            }}
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '20px',
        background: 'var(--bg)', border: '1px solid var(--border)',
        borderTop: 'none', borderBottom: 'none',
      }}>
        {messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick chips */}
      <div style={{
        padding: '10px 16px', background: 'var(--surface)',
        borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)',
        display: 'flex', gap: '8px', overflowX: 'auto',
      }}>
        {QUICK_CHIPS.map(chip => (
          <button
            key={chip.label}
            onClick={() => sendMessage(chip.msg)}
            disabled={isTyping}
            style={{
              padding: '6px 14px', borderRadius: '20px', border: '1px solid var(--border)',
              background: 'var(--bg)', cursor: 'pointer', fontSize: '13px',
              color: 'var(--text)', whiteSpace: 'nowrap', fontWeight: 500,
              opacity: isTyping ? 0.5 : 1, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!isTyping) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,107,53,0.1)'; }}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg)'}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div style={{
        padding: '14px 16px', background: 'var(--surface)',
        border: '1px solid var(--border)', borderRadius: '0 0 12px 12px',
        display: 'flex', gap: '10px', alignItems: 'flex-end',
      }}>
        {/* Voice button */}
        <button
          onClick={handleVoice}
          title={isListening ? translate('listen') : 'Voice input'}
          style={{
            width: '42px', height: '42px', borderRadius: '50%',
            background: isListening ? '#EF4444' : 'var(--bg)',
            border: `2px solid ${isListening ? '#EF4444' : 'var(--border)'}`,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isListening ? '#fff' : 'var(--text-muted)', flexShrink: 0,
            animation: isListening ? 'pulse 1s infinite' : 'none',
            transition: 'all 0.2s',
          }}
        >
          {isListening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        {/* Text input */}
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? translate('listen') : translate('typeMessage')}
          disabled={isTyping}
          rows={1}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: '10px',
            border: '1px solid var(--border)', background: 'var(--bg)',
            color: 'var(--text)', fontSize: '14px', resize: 'none',
            outline: 'none', fontFamily: 'inherit', lineHeight: 1.5,
            maxHeight: '120px', overflowY: 'auto',
            opacity: isTyping ? 0.7 : 1,
          }}
          onInput={e => {
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 120) + 'px';
          }}
        />

        {/* Send button */}
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isTyping}
          style={{
            width: '42px', height: '42px', borderRadius: '50%', border: 'none',
            background: input.trim() && !isTyping ? 'var(--primary)' : 'var(--border)',
            cursor: input.trim() && !isTyping ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: input.trim() && !isTyping ? '#fff' : 'var(--text-muted)',
            flexShrink: 0, transition: 'all 0.15s',
          }}
        >
          <Send size={18} />
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-8px); }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
        }
        @keyframes pulse-icon {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.7; }
        }
        .pulse-icon {
          animation: pulse-icon 1s infinite;
        }
      `}</style>
    </div>
  );
}
