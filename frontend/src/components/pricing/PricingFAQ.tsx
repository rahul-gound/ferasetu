import { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { useMarket } from '../../contexts/MarketContext';

interface FAQItem {
  question: string;
  answer: string;
}

interface PricingFAQProps {
  className?: string;
}

export default function PricingFAQ({ className = '' }: PricingFAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { market, config } = useMarket();

  const isIndia = market === 'IN';

  const faqItems: FAQItem[] = useMemo(() => {
    return [
      {
        question: 'Do I need technical or coding knowledge?',
        answer: 'No. FeraSetu is built for independent shopkeepers and small businesses, not software developers. Adding products, setting prices, managing customer orders, and sharing your store link is fast, intuitive, and mobile-friendly — no coding or design skills required.',
      },
      {
        question: isIndia ? 'Can I start without paying?' : 'How does the 14-day free trial work?',
        answer: isIndia
          ? 'Yes. In India, the Free plan costs ₹0/month forever with no credit card required. You can add up to 25 products, accept direct WhatsApp and online orders, and manage inventory. Upgrade to Business (₹399/mo) whenever your catalog expands.'
          : `You receive a full-featured ${config.trialDays}-day free trial with access to all Business features. Explore the store builder, product manager, and built-in AI assistant with zero risk. No surprise charges ever.`,
      },
      {
        question: isIndia ? 'What happens if I stay on the free plan?' : 'What happens when my 14-day trial expires?',
        answer: isIndia
          ? 'Nothing changes without your action. Your store stays up, your products stay browsable, and orders continue to function within free limits. We never charge without your explicit confirmation.'
          : `Trust-First Billing: We never surprise-charge you at the end of your trial. If you do not activate a paid subscription (${config.symbol}${config.plans.business.monthly}/month for Business), your account, products, and configurations remain safely preserved. You can activate a subscription at any time to resume paid functionality.`,
      },
      {
        question: 'Can I cancel my subscription anytime?',
        answer: 'Yes. There are zero contracts or lock-in penalties. You can cancel directly from your account settings at any time to stop future renewals. Note that all subscription purchases are strictly non-refundable (no partial refunds or prorated credits), but your paid access remains active until your current prepaid billing cycle concludes.',
      },
      {
        question: 'What is your refund policy?',
        answer: 'All subscriptions, plan fees, and AI credit purchases are strictly non-refundable once billed. We do not provide money-back guarantees, cash refunds, or prorated credits for unused days or features. You can cancel anytime to prevent future renewal charges.',
      },
      {
        question: 'Can I use a custom domain?',
        answer: 'Yes. Every store automatically gets a clean FeraSetu storefront link. Connecting your own custom domain (e.g., yourstore.com) is supported on all paid plans.',
      },
      {
        question: 'How does FeraSetu AI help my business?',
        answer: 'FeraSetu AI is your built-in business copilot. It uses your actual catalog and sales data to draft product descriptions, suggest restocks, forecast sales trends, and create promotional campaigns. It never invents generic numbers.',
      },
      {
        question: 'Can I export my store data?',
        answer: 'Yes. You can export your product catalog and order history at any time. Your business data belongs completely to you.',
      },
    ];
  }, [isIndia, config]);

  const toggle = (i: number) => setOpenIndex(prev => prev === i ? null : i);

  return (
    <section
      aria-label="Frequently asked questions"
      className={className}
    >
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <p style={{
          display: 'inline-block', fontSize: 12, fontWeight: 800,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: '#2563EB', marginBottom: 12,
          background: 'rgba(37,99,235,0.08)', padding: '4px 12px', borderRadius: 999,
        }}>
          FAQ
        </p>
        <h2 style={{
          fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900,
          letterSpacing: '-0.03em', color: '#0f172a', margin: '0 0 12px',
        }}>
          Frequently Asked Questions
        </h2>
        <p style={{ color: '#64748b', fontSize: 16, fontWeight: 500, maxWidth: 500, margin: '0 auto' }}>
          Honest answers about plans, billing, and store management.
        </p>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {faqItems.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={item.question}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                background: isOpen ? '#f8fafc' : '#fff',
                transition: 'background 0.2s ease',
                overflow: 'hidden',
              }}
            >
              <button
                type="button"
                onClick={() => toggle(index)}
                aria-expanded={isOpen}
                style={{
                  width: '100%', padding: '20px 24px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                  background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  {item.question}
                </span>
                <ChevronDown
                  size={18}
                  color="#64748b"
                  style={{
                    flexShrink: 0,
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                    transition: 'transform 0.2s ease',
                  }}
                  aria-hidden="true"
                />
              </button>
              {isOpen && (
                <div style={{ padding: '0 24px 20px', color: '#475569', fontSize: 14, lineHeight: 1.7, fontWeight: 500 }}>
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
