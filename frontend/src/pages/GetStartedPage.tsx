import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowRight, ChevronRight, Sparkles, MessageCircle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

interface Question {
  id: string;
  questionKey: string;
  placeholderKey: string;
  key: keyof PersonalizationData;
}

interface PersonalizationData {
  business_name: string;
  business_type: string;
  business_description: string;
  target_audience: string;
  main_products: string;
  preferred_language: string;
  phone?: string;
}

const QUESTIONS: Question[] = [
  {
    id: '1',
    questionKey: 'businessName',
    placeholderKey: 'businessNamePlaceholder',
    key: 'business_name',
  },
  {
    id: '2',
    questionKey: 'businessType',
    placeholderKey: 'businessTypePlaceholder',
    key: 'business_type',
  },
  {
    id: '3',
    questionKey: 'description',
    placeholderKey: 'descriptionPlaceholder',
    key: 'business_description',
  },
  {
    id: '4',
    questionKey: 'targetAudience',
    placeholderKey: 'targetAudiencePlaceholder',
    key: 'target_audience',
  },
  {
    id: '5',
    questionKey: 'mainProducts',
    placeholderKey: 'mainProductsPlaceholder',
    key: 'main_products',
  },
  {
    id: '6',
    questionKey: 'preferredLanguage',
    placeholderKey: 'preferredLanguagePlaceholder',
    key: 'preferred_language',
  },
];

export default function GetStartedPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, updateUser } = useAuth();
  const { translate } = useLanguage();
  
  const SETUP_STEPS = [
    { icon: '📝', title: translate('addFirstProduct'), desc: 'Upload a product with name, price, and image' },
    { icon: '🌐', title: translate('chooseTemplate'), desc: 'Pick from 8+ professional templates' },
    { icon: '✨', title: translate('personalizeStore'), desc: 'Add your branding and description' },
    { icon: '🚀', title: translate('goLive'), desc: 'Publish your website and share with customers' },
  ];
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<PersonalizationData>({
    business_name: user?.business_name || '',
    business_type: '',
    business_description: '',
    target_audience: '',
    main_products: '',
    preferred_language: user?.preferred_language || 'en',
  });
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiMessages, setAiMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setData(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    const currentQuestion = QUESTIONS[currentStep];
    const fieldValue = data[currentQuestion.key];

    if (!fieldValue || !fieldValue.trim()) {
      toast.error(translate('Please answer this question'));
      return;
    }

    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.put('/auth/profile', {
        business_name: data.business_name,
        preferredLanguage: data.preferred_language,
      });
      return data;
    },
    onSuccess: async () => {
      toast.success(translate('profileUpdated'));
      updateUser({
        business_name: data.business_name,
        preferred_language: data.preferred_language,
      });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      setTimeout(() => navigate('/dashboard'), 1000);
    },
    onError: () => {
      toast.error(translate('profileSaveFailed'));
    },
  });

  const handleFinish = () => {
    saveMutation.mutate();
  };

  const sendAIMessage = async () => {
    if (!aiInput.trim()) return;

    const userMsg = aiInput;
    setAiInput('');
    setAiMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setAiLoading(true);

    try {
      const res = await api.post('/ai/chat', {
        message: userMsg,
        language: data.preferred_language,
      });
      setAiMessages(prev => [...prev, { role: 'assistant', content: res.data.content }]);
    } catch {
      toast.error('Failed to get response');
    } finally {
      setAiLoading(false);
    }
  };

  const currentQuestion = QUESTIONS[currentStep];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .slide-in { animation: slideIn 0.3s ease-out; }
        .pulse-dot { animation: pulse 2s infinite; }
      `}</style>

      <div style={{
        background: '#fff',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        maxWidth: '900px',
        width: '100%',
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 0,
      }}>
        {/* Left Panel - Content */}
        <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {/* Header */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
              <Sparkles size={32} color="#667eea" />
              <div>
                <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1F2937', margin: 0 }}>{translate('welcome')}</h1>
                <p style={{ fontSize: '13px', color: '#6B7280', margin: '4px 0 0 0' }}>Let's get your store ready</p>
              </div>
            </div>

            {/* Progress */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                {QUESTIONS.map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      height: '4px',
                      flex: 1,
                      background: idx <= currentStep ? '#667eea' : '#E5E7EB',
                      borderRadius: '2px',
                      transition: 'all 0.3s',
                    }}
                  />
                ))}
              </div>
              <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
                Question {currentStep + 1} of {QUESTIONS.length}
              </p>
            </div>
          </div>

          {!showAIAssistant ? (
            <>
              {/* Question */}
              <div className="slide-in" style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1F2937', marginBottom: '16px' }}>
                  {translate(currentQuestion.questionKey)}
                </h2>
                <input
                  type="text"
                  name={currentQuestion.key}
                  value={data[currentQuestion.key]}
                  onChange={handleInputChange}
                  placeholder={translate(currentQuestion.placeholderKey)}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '10px',
                    fontSize: '15px',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = '#667eea'}
                  onBlur={e => e.currentTarget.style.borderColor = '#E5E7EB'}
                  onKeyPress={e => e.key === 'Enter' && handleNext()}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={currentStep === QUESTIONS.length - 1 ? handleFinish : handleNext}
                  disabled={saveMutation.isPending}
                  style={{
                    flex: 1,
                    padding: '14px 20px',
                    background: '#667eea',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: saveMutation.isPending ? 0.7 : 1,
                  }}
                >
                  {currentStep === QUESTIONS.length - 1 ? (
                    <>
                      {saveMutation.isPending ? 'Saving...' : translate('finish')} <ArrowRight size={18} />
                    </>
                  ) : (
                    <>
                      {translate('next')} <ChevronRight size={18} />
                    </>
                  )}
                </button>
                <button
                  onClick={handleSkip}
                  style={{
                    padding: '14px 20px',
                    background: '#F3F4F6',
                    color: '#6B7280',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {translate('skip')}
                </button>
                <button
                  onClick={() => setShowAIAssistant(true)}
                  style={{
                    padding: '14px 20px',
                    background: '#F3F4F6',
                    color: '#6B7280',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  title="Ask AI Assistant for help"
                >
                  <MessageCircle size={18} />
                </button>
              </div>
            </>
          ) : (
            <>
              {/* AI Assistant Chat */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                gap: '12px',
              }}>
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  paddingBottom: '12px',
                }}>
                  {aiMessages.length === 0 && (
                    <div style={{ color: '#9CA3AF', fontSize: '14px', textAlign: 'center', paddingTop: '20px' }}>
                      💬 Ask me anything about your store setup!
                    </div>
                  )}
                  {aiMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '70%',
                          padding: '12px 16px',
                          borderRadius: msg.role === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                          background: msg.role === 'user' ? '#667eea' : '#F3F4F6',
                          color: msg.role === 'user' ? '#fff' : '#1F2937',
                          fontSize: '14px',
                          lineHeight: 1.5,
                        }}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {aiLoading && (
                    <div style={{ display: 'flex', gap: '6px', paddingTop: '12px' }}>
                      <span className="pulse-dot" style={{ width: '8px', height: '8px', background: '#667eea', borderRadius: '50%' }} />
                      <span className="pulse-dot" style={{ width: '8px', height: '8px', background: '#667eea', borderRadius: '50%', animationDelay: '0.2s' }} />
                      <span className="pulse-dot" style={{ width: '8px', height: '8px', background: '#667eea', borderRadius: '50%', animationDelay: '0.4s' }} />
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={aiInput}
                    onChange={e => setAiInput(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && sendAIMessage()}
                    placeholder="Ask a question..."
                    disabled={aiLoading}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      border: '2px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    onClick={sendAIMessage}
                    disabled={aiLoading || !aiInput.trim()}
                    style={{
                      padding: '10px 14px',
                      background: '#667eea',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: aiLoading ? 'not-allowed' : 'pointer',
                      opacity: aiLoading ? 0.5 : 1,
                    }}
                  >
                    Send
                  </button>
                  <button
                    onClick={() => setShowAIAssistant(false)}
                    style={{
                      padding: '10px 14px',
                      background: '#F3F4F6',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    Back
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Panel - Info */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
          padding: '40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', margin: 0 }}>🚀 Next Steps</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {SETUP_STEPS.map((step, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '16px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{step.icon}</div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 600 }}>{step.title}</h4>
                  <p style={{ margin: 0, fontSize: '13px', opacity: 0.9 }}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Benefits */}
          <div style={{ paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
            <p style={{ fontSize: '12px', opacity: 0.8, margin: '16px 0 12px 0' }}>✨ Why Fera?</p>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', opacity: 0.9 }}>
              <li>Free for first 7 days</li>
              <li>No coding needed</li>
              <li>Multi-language support</li>
              <li>AI-powered features</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Mobile Responsive */}
      <style>{`
        @media (max-width: 768px) {
          [data-gs-container] {
            grid-template-columns: 1fr !important;
            max-width: 100% !important;
          }
          [data-gs-right] {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
