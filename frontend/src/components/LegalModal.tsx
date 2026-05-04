import { X } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'privacy' | 'terms';
}

export default function LegalModal({ isOpen, onClose, type }: LegalModalProps) {
  if (!isOpen) return null;

  const content = {
    terms: {
      title: 'Terms & Conditions',
      lastUpdated: 'April 2024',
      sections: [
        {
          h: '1. Acceptance of Terms',
          p: 'By creating an account on Fera Shopkeeper AI, you agree to comply with and be bound by these Terms and Conditions. Our platform is designed to help small businesses in India digitize their operations using AI.'
        },
        {
          h: '2. Use of AI Services',
          p: 'Our platform uses advanced AI models (including Sarvam AI) to generate website content and business insights. While we strive for accuracy, AI-generated content should be reviewed by you. Fera is not responsible for business decisions made based on AI suggestions.'
        },
        {
          h: '3. Subscription and Fees',
          p: 'We offer a 7-day free trial. After the trial period, premium features require a paid subscription. All fees are in INR and are inclusive of GST where applicable.'
        },
        {
          h: '4. User Content',
          p: 'You retain all rights to the product data, images, and business information you upload. By using Fera, you grant us a license to host and display this content to your customers.'
        },
        {
          h: '5. Account Security',
          p: 'You are responsible for maintaining the confidentiality of your login credentials and OTP codes. Notify us immediately of any unauthorized access.'
        }
      ]
    },
    privacy: {
      title: 'Privacy Policy',
      lastUpdated: 'April 2024',
      sections: [
        {
          h: '1. Data Collection',
          p: 'We collect information you provide directly (name, business name, phone, email) and data about your store transactions to provide analytics and AI-powered recommendations.'
        },
        {
          h: '2. How We Use Data',
          p: 'Your data is used to provide the Fera services, improve our AI models, and communicate important updates. We do not sell your personal information to third parties.'
        },
        {
          h: '3. Data Storage (India)',
          p: 'In compliance with Indian data regulations, we prioritize storing your business data on secure servers. We use industry-standard encryption for sensitive information.'
        },
        {
          h: '4. Third-Party Services',
          p: 'We work with partners like Sarvam AI for language processing and payment gateways for transactions. These partners only receive the data necessary to perform their specific functions.'
        },
        {
          h: '5. Your Rights',
          p: 'You have the right to access, update, or delete your business data at any time through your dashboard settings.'
        }
      ]
    }
  };

  const active = content[type];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', background: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: '#fff', width: '100%', maxWidth: '600px',
        maxHeight: '80vh', borderRadius: '24px', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
      }}>
        <div style={{
          padding: '24px', borderBottom: '1px solid #F1F5F9',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>{active.title}</h2>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0 0', fontWeight: 600 }}>Last Updated: {active.lastUpdated}</p>
          </div>
          <button onClick={onClose} style={{
            background: '#F8FAFC', border: 'none', padding: '8px', borderRadius: '12px',
            cursor: 'pointer', color: '#64748B'
          }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
          {active.sections.map((s, i) => (
            <div key={i} style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>{s.h}</h3>
              <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, margin: 0 }}>{s.p}</p>
            </div>
          ))}
          
          <div style={{
            padding: '20px', background: '#FFF7ED', borderRadius: '16px',
            border: '1px solid #FFEDD5', marginTop: '16px'
          }}>
            <p style={{ fontSize: '13px', color: '#9A3412', fontWeight: 600, margin: 0 }}>
              Questions? Contact us at support@fera.ai
            </p>
          </div>
        </div>

        <div style={{ padding: '20px 32px', borderTop: '1px solid #F1F5F9', textAlign: 'right' }}>
          <button onClick={onClose} className="btn btn-primary" style={{ minWidth: '120px' }}>
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
