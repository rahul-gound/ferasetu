/**
 * FAQSection — Reusable FAQ for landing page and pricing page.
 *
 * Answers real shopkeeper objections with factual answers.
 * No invented claims. No marketing fluff.
 *
 * Psychology:
 * - Objection handling (removes buying barriers)
 * - Transparency builds trust
 * - Open state uses blue-50 background for positive association
 */
import { useState } from 'react';
import { HelpCircle, Plus } from 'lucide-react';

export interface FAQItem {
  question: string;
  answer: string;
}

export const LANDING_FAQS: FAQItem[] = [
  {
    question: 'Do I need technical skills or a developer to use FeraSetu?',
    answer:
      'No. FeraSetu is designed for real merchants. You can add products with photos and prices directly from your phone, share your store link, and manage incoming orders from a clean dashboard without writing any code.',
  },
  {
    question: 'How does an order reach me from the customer?',
    answer:
      'A customer opens your custom store URL (e.g. yourshop.ferasetu.com), selects products into a cart, and submits their order. You receive an organized order in your dashboard with item details, delivery choice, and customer contact information.',
  },
  {
    question: 'Does FeraSetu charge a commission on my sales?',
    answer:
      'FeraSetu charges 0% platform commission on your sales. We charge a predictable subscription fee. Your chosen third-party payment gateway (such as Cashfree or Stripe) charges their standard processing fees directly.',
  },
  {
    question: 'Does FeraSetu operate delivery riders, vehicles, or warehouses?',
    answer:
      'No. FeraSetu is the digital workflow and coordination platform. We do not own delivery fleets or warehouses. You fulfill orders using your own store staff, local delivery riders, in-store pickup, or your chosen third-party courier. FeraSetu provides the status workflow and secure OTP handshake to confirm handoff.',
  },
  {
    question: 'How do payments reach my bank account?',
    answer:
      'Customer payments flow directly through your configured payment provider (Cashfree in India for instant UPI, cards, and netbanking, or Stripe internationally). Funds settle straight into your business bank account. FeraSetu never holds your money in an escrow pool.',
  },
  {
    question: 'Can I try FeraSetu before committing to a paid plan?',
    answer:
      'Yes. We provide a 14-day free trial so you can set up your store, test the ordering workflow, and explore FeraSetu with no credit card required to start. In India, a free entry tier is also available to help small merchants get started.',
  },
  {
    question: 'Can I export my customer and catalog data if I ever leave?',
    answer:
      'Yes. Your business is yours. You have complete data ownership and can export your entire product catalog, customer contact list, and order history to CSV at any time with a single click.',
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
  title = 'Questions merchants ask',
  subtitle = 'Honest answers with complete operational clarity.',
  dark = false,
}: FAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <section
      className={`py-20 md:py-24 ${dark ? 'bg-slate-900 border-t border-slate-800' : 'bg-slate-50/70 border-t border-slate-200'}`}
      aria-label="Frequently asked questions"
    >
      <div className="max-w-[800px] mx-auto px-6">
        <div className="text-center mb-12">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4 border ${
              dark
                ? 'bg-slate-800 border-slate-700 text-blue-300'
                : 'bg-white border-slate-200 text-slate-700 shadow-sm'
            }`}
          >
            <HelpCircle size={13} className="text-blue-600" aria-hidden="true" />
            <span>Frequently Asked Questions</span>
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
                className={`rounded-xl border transition-all duration-200 ${
                  dark
                    ? isOpen
                      ? 'border-blue-500/60 bg-slate-800/90 shadow-sm'
                      : 'border-slate-800 bg-slate-800/40 hover:border-slate-700'
                    : isOpen
                    ? 'border-blue-300 bg-white shadow-sm ring-1 ring-blue-500/10'
                    : 'border-slate-200 bg-white hover:border-slate-300 shadow-[0_1px_2px_rgba(0,0,0,0.03)]'
                }`}
                role="listitem"
              >
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  aria-expanded={isOpen}
                  className={`w-full text-left px-5 sm:px-6 py-4 sm:py-4.5 flex items-center justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl cursor-pointer ${
                    dark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  <span className="font-bold text-sm sm:text-base leading-snug">{faq.question}</span>
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-200 ${
                      isOpen
                        ? 'bg-blue-600 border-blue-600 text-white rotate-45'
                        : dark
                        ? 'bg-slate-700 border-slate-600 text-slate-300'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    <Plus size={15} aria-hidden="true" />
                  </div>
                </button>

                {isOpen && (
                  <div
                    className={`px-5 sm:px-6 pb-5 pt-1 text-sm leading-relaxed border-t ${
                      dark
                        ? 'text-slate-300 border-slate-700/60'
                        : 'text-slate-600 border-slate-100'
                    }`}
                  >
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
