import { useState } from 'react';
import { MessageSquare, Bug, Lightbulb, HelpCircle, Phone, X, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

type FeedbackType = 'bug' | 'feature' | 'confused' | 'call' | 'setup';

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'type' | 'form'>('type');
  const [type, setFeedbackType] = useState<FeedbackType | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const options: { id: FeedbackType; icon: any; label: string; color: string }[] = [
    { id: 'bug',      icon: Bug,          label: 'Report a Bug',         color: '#EF4444' },
    { id: 'feature',  icon: Lightbulb,    label: 'Feature Request',      color: '#8B5CF6' },
    { id: 'confused', icon: HelpCircle,   label: 'Something is confusing',color: '#F59E0B' },
    { id: 'call',     icon: Phone,        label: 'Product feedback call', color: '#10B981' },
    { id: 'setup',    icon: MessageSquare,label: 'Help me set up shop',   color: '#3B82F6' },
  ];

  const handleSubmit = async () => {
    if (!message.trim()) return toast.error('Please enter a message');
    setSubmitting(true);
    try {
      await api.post('/survey/feedback', { type, feedback: message });
      toast.success('Thank you! Your feedback helps us build a better FeraSetu.');
      setIsOpen(false);
      reset();
    } catch {
      toast.error('Failed to send feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep('type');
    setFeedbackType(null);
    setMessage('');
  };

  const openWhatsApp = () => {
    window.open('https://wa.me/919876543210?text=Hi FeraSetu Team, I need help with...', '_blank');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 999,
          width: 56, height: 56, borderRadius: 20, background: '#ff6b35',
          color: '#fff', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(255,107,53,0.4)',
          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1) rotate(0deg)')}
      >
        <MessageSquare size={24} />
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
      width: 320, background: '#0f1422', borderRadius: 28,
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
      overflow: 'hidden', animation: 'fadeUp 0.3s ease-out'
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .feedback-opt:hover { background: rgba(255,255,255,0.04) !important; }
      `}</style>
      
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0, color: '#fff', fontSize: 16, fontWeight: 800 }}>Feedback</h4>
        <button onClick={() => { setIsOpen(false); reset(); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}><X size={18} /></button>
      </div>

      <div style={{ padding: 12 }}>
        {step === 'type' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {options.map(opt => (
              <button
                key={opt.id}
                className="feedback-opt"
                onClick={() => { setFeedbackType(opt.id); setStep('form'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                  padding: '12px 14px', borderRadius: 16, border: 'none',
                  background: 'none', cursor: 'pointer', transition: 'all 0.2s',
                  textAlign: 'left'
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 10, background: `${opt.color}15`, color: opt.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <opt.icon size={18} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{opt.label}</span>
              </button>
            ))}
            <div style={{ margin: '12px 0', height: 1, background: 'rgba(255,255,255,0.05)' }} />
            <button
              onClick={openWhatsApp}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                padding: '12px 14px', borderRadius: 16, border: 'none',
                background: 'rgba(37,211,102,0.1)', color: '#25D366', cursor: 'pointer',
              }}
            >
              <Phone size={18} />
              <span style={{ fontSize: 13, fontWeight: 800 }}>Chat on WhatsApp</span>
            </button>
          </div>
        ) : (
          <div style={{ padding: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <button onClick={() => setStep('type')} style={{ background: 'none', border: 'none', color: '#ff6b35', fontSize: 12, fontWeight: 800, cursor: 'pointer', padding: 0 }}>← Back</button>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>{type}</span>
            </div>
            <textarea
              autoFocus
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Tell us more..."
              style={{
                width: '100%', height: 120, background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16,
                padding: 14, color: '#fff', fontSize: 14, resize: 'none', outline: 'none'
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                width: '100%', marginTop: 12, padding: '12px', borderRadius: 16,
                background: '#ff6b35', color: '#fff', border: 'none',
                fontWeight: 800, fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}
            >
              {submitting ? 'Sending...' : <><Send size={16} /> Send Feedback</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
