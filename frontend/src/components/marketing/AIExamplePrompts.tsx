/**
 * AIExamplePrompts — Shows 3 real Fera AI use cases with example prompt/response pairs.
 *
 * Purple Cow moment: The AI section must feel distinctly FeraSetu — not a generic ChatGPT clone.
 * Shows only capabilities that actually exist in the product.
 *
 * Used on the landing page and as a primer in the Fera AI page for first-time users.
 */
import { Sparkles, ArrowRight, TrendingUp, Package, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import AIWorkflowStrip from './AIWorkflowStrip';

export const AI_EXAMPLES = [
  {
    category: 'Inventory',
    icon: <Package size={16} />,
    prompt: 'Which products are running low on stock?',
    response:
      'Your top 3 low-stock items: Fortune Mustard Oil (2 left), Surf Excel 1kg (1 left), Parle-G 800g (out of stock). Recommend restocking before the weekend — these sold 40+ units last week.',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
  },
  {
    category: 'Sales',
    icon: <TrendingUp size={16} />,
    prompt: 'Why did my sales drop this week?',
    response:
      'This week\'s revenue is ₹12,400 vs ₹18,200 last week — a 31% drop. Main cause: 4 out-of-stock products reduced available catalog. Restocking those items should recover the lost order volume.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
  },
  {
    category: 'Content',
    icon: <MessageSquare size={16} />,
    prompt: 'Write a Diwali offer message for my customers',
    response:
      'Happy Diwali from Sharma Kirana! 🪔 This Diwali, order your pooja thali items, sweets, and dry fruits directly from our store: sharmakirana.ferasetu.com — Free delivery for orders above ₹500. Order by Nov 10! — Ramesh, Sharma Kirana',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-100',
  },
];

interface AIExamplePromptsProps {
  showCTA?: boolean;
  ctaHref?: string;
  ctaText?: string;
}

export default function AIExamplePrompts({
  showCTA = true,
  ctaHref = '/register',
  ctaText = 'Try Fera AI Free',
}: AIExamplePromptsProps) {
  const { getLocalizedLink } = useLanguage();

  return (
    <section
      className="py-20 md:py-24 bg-slate-900 text-white"
      aria-label="Fera AI examples"
      id="fera-ai"
    >
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-900/60 border border-purple-700 text-purple-300 text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles size={12} />
            Fera AI
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            AI that reduces work,{' '}
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              for your actual shop
            </span>
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed">
            Fera AI uses your products, orders, and inventory to suggest the next practical step — so you spend less time figuring out what to do.

          <div className='mt-10'>
            <AIWorkflowStrip />
          </div>
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {AI_EXAMPLES.map((ex, i) => (
            <div
              key={i}
              className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden hover:border-slate-600 transition-all duration-200"
            >
              {/* Prompt */}
              <div className="p-5 border-b border-slate-700">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${ex.bg} ${ex.color} text-xs font-bold mb-3 border ${ex.border}`}>
                  {ex.icon}
                  {ex.category}
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 flex-shrink-0 text-xs font-bold mt-0.5">
                    You
                  </div>
                  <p className="text-sm text-slate-200 font-semibold leading-relaxed">
                    "{ex.prompt}"
                  </p>
                </div>
              </div>

              {/* Response */}
              <div className="p-5">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Sparkles size={12} className="text-white" />
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed font-medium">
                    {ex.response}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {showCTA && (
          <div className="text-center">
            <Link
              to={getLocalizedLink(ctaHref)}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-base shadow-xl shadow-blue-900/50 hover:from-blue-500 hover:to-purple-500 transition-all hover:-translate-y-0.5"
            >
              {ctaText}
              <ArrowRight size={15} />
            </Link>
            <p className="text-slate-500 text-xs font-medium mt-3">
              20 free AI queries on the Free plan · No credit card
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
