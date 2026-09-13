/**
 * FAQSection — Reusable FAQ for landing page and pricing page.
 *
 * Answers real shopkeeper objections with factual answers.
 * No invented claims. No marketing fluff.
 */
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface FAQItem {
  question: string;
  answer: string;
}

export const LANDING_FAQS: FAQItem[] = [
  {
    question: 'Do I need any technical knowledge to use FeraSetu?',
    answer:
      'No. If you can use WhatsApp, you can use FeraSetu. You add products with photos and prices from your phone, share your store link, and manage orders from your dashboard. No coding, no server setup, nothing technical.',
  },
  {
    question: 'How does a customer place an order?',
    answer:
      'Customers open your store link, browse your products, add items to a cart, and complete the order via WhatsApp. They can also pay directly via UPI (Google Pay, PhonePe, Paytm, BHIM) or cards. The order appears in your dashboard immediately.',
  },
  {
    question: 'Is there any commission on my sales?',
    answer:
      'None. We charge a flat monthly fee. When a customer pays ₹1,000 or $100, you keep 100% of it. Zero percentage cut, ever.',
  },
  {
    question: 'What is FeraSetu AI and how does it help my shop?',
    answer:
      'FeraSetu AI is an AI assistant that knows your actual shop data — your products, inventory, and orders. You can use it to clean product photos to white studio backgrounds, write festive WhatsApp broadcasts, and monitor low stock before you run out.',
  },
  {
    question: 'Can I try FeraSetu before paying?',
    answer:
      'Yes. In India, our Free plan is completely free forever for up to 25 products with no credit card required. In US and Europe, we provide a 14-day free trial with full business features and zero transaction fees.',
  },
  {
    question: 'What is your cancellation and refund policy?',
    answer:
      'Subscriptions are strictly non-refundable. You can cancel your subscription at any time with 1 click from your billing settings to prevent future renewals. We do not offer prorated refunds or money-back guarantees. Instead, we eliminate risk before you pay through our permanent Free plan in India and our 14-day zero-risk trial in US/EU so you can test everything before paying.',
  },
  {
    question: 'Does FeraSetu hold or delay my customer payments?',
    answer:
      'Never. All customer payments flow directly into your own bank account via UPI, Cashfree, or Stripe. FeraSetu never holds, escrows, or delays your payouts.',
  },
  {
    question: 'Can I export my data if I decide to leave?',
    answer:
      'Yes. You have 100% data ownership. You can export your complete product catalog, images, customer phone numbers, and order histories to CSV with 1 click at any time.',
  },
];

interface FAQSectionProps {
  faqs?: FAQItem[];
  title?: string;
  subtitle?: string;
  dark?: boolean;
}

export default function FAQSection({
  faqs = LANDING_FAQS,
  title = 'Questions shopkeepers ask',
  subtitle = "Honest answers. No marketing language.",
  dark = false,
}: FAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <section
      className={`py-20 md:py-24 ${dark ? 'bg-slate-900' : 'bg-slate-50 border-t border-slate-200/60'}`}
      aria-label="Frequently asked questions"
    >
      <div className="max-w-[800px] mx-auto px-6">
        <div className="text-center mb-12">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 ${
            dark
              ? 'bg-blue-900/60 border border-blue-700 text-blue-300'
              : 'bg-blue-50 border border-blue-100 text-blue-700'
          }`}>
            FAQ
          </div>
          <h2 className={`text-3xl md:text-4xl font-extrabold tracking-tight mb-3 ${dark ? 'text-white' : 'text-slate-900'}`}>
            {title}
          </h2>
          <p className={`text-base leading-relaxed ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
            {subtitle}
          </p>
        </div>

        <div className="space-y-3" role="list">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                className={`rounded-2xl border transition-all duration-200 ${
                  dark
                    ? isOpen ? 'border-blue-700 bg-slate-800' : 'border-slate-700 bg-slate-800/60'
                    : isOpen ? 'border-blue-200 bg-white shadow-sm' : 'border-slate-200 bg-white'
                }`}
                role="listitem"
              >
                <button
                  onClick={() => toggle(i)}
                  aria-expanded={isOpen}
                  className={`w-full text-left px-6 py-5 flex items-start justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-2xl ${
                    dark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  <span className="font-bold text-base leading-snug">{faq.question}</span>
                  <ChevronDown
                    size={18}
                    className={`flex-shrink-0 mt-0.5 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    } ${dark ? 'text-slate-400' : 'text-slate-400'}`}
                    aria-hidden="true"
                  />
                </button>

                {isOpen && (
                  <div className={`px-6 pb-5 text-sm leading-relaxed font-medium ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
