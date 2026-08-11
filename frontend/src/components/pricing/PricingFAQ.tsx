import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'Do I need technical knowledge?',
    answer: 'No. FeraSetu is built for shopkeepers, not developers. If you can use WhatsApp, you can use FeraSetu. Adding products, managing orders, and sharing your store link is fast and simple — no coding, no design skills.',
  },
  {
    question: 'Can I continue using WhatsApp?',
    answer: 'Absolutely. FeraSetu works with WhatsApp, not against it. Your store has a shareable link you can send on WhatsApp. Customers can browse and place orders, and you get a notification. You can still chat on WhatsApp — FeraSetu just organises the orders for you.',
  },
  {
    question: 'Do I need a domain or website?',
    answer: 'No. You get a free store link (yourshop.ferasetu.com) from day one. Custom domain support is coming soon for Growth and Pro plans. Most shopkeepers start with the free link and upgrade later.',
  },
  {
    question: 'Can I start without paying?',
    answer: 'Yes. The Free plan costs nothing — no credit card required. You can add up to 25 products, manage orders, and share your store. When your shop grows and you need more, Growth is ₹299/month.',
  },
  {
    question: 'What happens after the free plan?',
    answer: 'Nothing changes without you taking action. Your store stays up, your products stay visible, and your orders continue to work. When you need more than 25 products or want advanced analytics, you upgrade at ₹299/month. We\'ll always tell you before charging anything.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes. No contracts, no penalties. You can cancel from your account settings whenever you like. If you cancel a paid plan, you keep access until the end of your billing period. Your data remains yours.',
  },
  {
    question: 'Can I export my data?',
    answer: 'Yes. You can export your product list and order history. Your data is yours — we don\'t hold it hostage. You can always contact support to get a full export.',
  },
  {
    question: 'How does Fera AI help me?',
    answer: 'Fera AI is your business assistant. You can ask it things like "Which products are selling best?", "Help me write a product description", "What should I restock?", or "Create a WhatsApp promotion message". It uses your actual shop data — it never makes up numbers.',
  },
  {
    question: 'What happens to my store if I don\'t upgrade?',
    answer: 'If you\'re on the Free plan and don\'t upgrade, your store keeps working with all features available in the Free plan. You won\'t lose your products or orders. You just won\'t be able to add more than 25 products or access advanced analytics until you upgrade.',
  },
];

interface PricingFAQProps {
  className?: string;
}

export default function PricingFAQ({ className = '' }: PricingFAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => setOpenIndex(prev => prev === i ? null : i);

  return (
    <section
      aria-label="Frequently asked questions"
      className={className}
      style={{ maxWidth: 760, margin: '0 auto' }}
    >
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <p style={{
          display: 'inline-block', fontSize: 12, fontWeight: 800,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: '#FF6B35', marginBottom: 12,
          background: 'rgba(255,107,53,0.08)', padding: '4px 12px', borderRadius: 999,
        }}>
          Questions & Answers
        </p>
        <h2 style={{
          fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, color: '#0f172a',
          letterSpacing: '-0.03em', margin: '0 0 12px', lineHeight: 1.1,
        }}>
          Honest answers to real questions
        </h2>
        <p style={{ color: '#64748b', fontSize: 16, fontWeight: 500, margin: 0 }}>
          No marketing speak. We'll tell you exactly how it works.
        </p>
      </div>

      <dl>
        {FAQ_ITEMS.map((item, i) => (
          <div
            key={i}
            style={{
              borderBottom: '1px solid #f1f5f9',
              overflow: 'hidden',
            }}
          >
            <dt>
              <button
                id={`faq-q-${i}`}
                aria-expanded={openIndex === i}
                aria-controls={`faq-a-${i}`}
                onClick={() => toggle(i)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '18px 0', border: 'none', background: 'none',
                  textAlign: 'left', cursor: 'pointer', gap: 16,
                }}
              >
                <span style={{
                  fontSize: 15, fontWeight: 700, color: '#0f172a', lineHeight: 1.4,
                }}>
                  {item.question}
                </span>
                <ChevronDown
                  size={18}
                  color="#94a3b8"
                  aria-hidden="true"
                  style={{
                    flexShrink: 0,
                    transition: 'transform 0.25s ease',
                    transform: openIndex === i ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </button>
            </dt>
            <dd
              id={`faq-a-${i}`}
              role="region"
              aria-labelledby={`faq-q-${i}`}
              style={{
                maxHeight: openIndex === i ? 400 : 0,
                overflow: 'hidden',
                transition: 'max-height 0.3s ease',
                margin: 0,
              }}
            >
              <p style={{
                fontSize: 14, color: '#475569', lineHeight: 1.75,
                padding: '0 0 18px', margin: 0, fontWeight: 500,
              }}>
                {item.answer}
              </p>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
