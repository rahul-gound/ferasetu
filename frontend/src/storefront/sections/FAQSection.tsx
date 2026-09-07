import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { sanitizeText } from '../utilities/formatting';

interface FAQItem {
  q: string;
  a: string;
}

interface FAQSectionProps {
  config?: Record<string, unknown>;
  variant?: string;
}

export default function FAQSection({
  config = {},
  variant = 'accordion',
}: FAQSectionProps) {
  const title = sanitizeText((config.title as string) || 'Frequently Asked Questions');

  const faqs: FAQItem[] = [
    {
      q: 'How does Cash on Delivery work?',
      a: 'You can choose Cash on Delivery at checkout. When our courier partner arrives at your address, inspect the tamper-evident package and hand over cash or scan the courier UPI QR code.',
    },
    {
      q: 'How quickly will my order be dispatched?',
      a: 'Most orders are packed and dispatched within 24 to 48 hours directly from our store. You will receive live SMS and WhatsApp status updates with your tracking ID.',
    },
    {
      q: 'Can I order or ask questions directly on WhatsApp?',
      a: 'Yes! Every product has an "Inquiry on WhatsApp" button, and you can also send your entire cart directly to our merchant number via WhatsApp for personal assistance.',
    },
    {
      q: 'What is the return and replacement policy?',
      a: 'We offer a straightforward 7-day return/exchange window for defective or mismatched items. Simply reach out via WhatsApp with your order number for immediate resolution.',
    },
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-12 sm:py-16 px-4 sm:px-6 bg-[var(--theme-color-surface)] border-b border-[var(--theme-color-border)]">
      <div className="max-w-2xl mx-auto">
        <h2
          className="text-2xl sm:text-3xl font-bold text-[var(--theme-color-text)] text-center mb-8"
          style={{ fontFamily: 'var(--theme-font-heading)' }}
        >
          {title}
        </h2>

        <div className="divide-y divide-[var(--theme-color-border)] border-y border-[var(--theme-color-border)]">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className="py-4">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between text-left font-bold text-sm text-[var(--theme-color-text)] focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    size={16}
                    className={`text-[var(--theme-color-text-muted)] transition-transform duration-200 ${
                      isOpen ? 'transform rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="text-xs sm:text-sm text-[var(--theme-color-text-muted)] leading-relaxed mt-2.5 animate-fadeIn">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
