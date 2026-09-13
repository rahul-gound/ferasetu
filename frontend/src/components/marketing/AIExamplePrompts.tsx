/**
 * AIExamplePrompts — Shows 3 real FeraSetu AI use cases with example prompt/response pairs.
 *
 * Purple Cow moment: The AI section must feel distinctly FeraSetu — not a generic ChatGPT clone.
 * Shows only capabilities that actually exist in the product.
 *
 * Used on the landing page and as a primer in the FeraSetu AI page for first-time users.
 */
import { Sparkles, ArrowRight, TrendingUp, Package, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
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
    tag: 'Content',
    timeSaved: '10 mins',
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
  ctaText = 'Try FeraSetu AI Free',
}: AIExamplePromptsProps) {
  const { getLocalizedLink } = useLanguage();
  const { register } = useAuth();

  return (
    <section
      className="py-20 md:py-24 bg-slate-900 text-white"
      aria-label="FeraSetu AI examples"
      id="ferasetu-ai"
    >
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-900/60 border border-purple-700 text-purple-300 text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles size={12} />
            FeraSetu AI
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            AI that reduces work,{' '}
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              for your actual shop
            </span>
          </h2>
          <p className="text-slate-400 text-lg">
            Not generic chat. FeraSetu AI understands Indian retail — your local language, seasonal sales, inventory formulas, and WhatsApp messaging.
          </p>
        </div>

        {/* Workflow comparison */}
        <div className="mb-14">
          <AIWorkflowStrip />
        </div>

        {/* Interactive prompts grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {AI_EXAMPLES.map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 flex flex-col hover:border-slate-600 transition-colors"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-purple-400">
                  {item.icon}
                </div>
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                  {item.tag}
                </span>
              </div>

              {/* Shopkeeper prompt */}
              <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800 mb-4">
                <p className="text-xs text-slate-500 font-semibold mb-1 uppercase tracking-wider">
                  You type:
                </p>
                <p className="text-sm font-semibold text-slate-200 italic">
                  "{item.prompt}"
                </p>
              </div>

              {/* FeraSetu AI response preview */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-purple-400 font-semibold mb-1 uppercase tracking-wider">
                    FeraSetu AI does:
                  </p>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {item.response}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                  <span>Saves: <strong className="text-emerald-400">{item.timeSaved}</strong></span>
                  <span className="text-slate-500">Zero formula needed</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {showCTA && (
          <div className="text-center">
            {ctaHref === '/register' ? (
              <button
                type="button"
                onClick={() => register()}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-base shadow-xl shadow-blue-900/50 hover:from-blue-500 hover:to-purple-500 transition-all hover:-translate-y-0.5 cursor-pointer"
              >
                {ctaText}
                <ArrowRight size={15} />
              </button>
            ) : (
              <Link
                to={getLocalizedLink(ctaHref)}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-base shadow-xl shadow-blue-900/50 hover:from-blue-500 hover:to-purple-500 transition-all hover:-translate-y-0.5"
              >
                {ctaText}
                <ArrowRight size={15} />
              </Link>
            )}
            <p className="text-slate-500 text-xs font-medium mt-3">
              20 free AI queries on the Free plan · No credit card
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
