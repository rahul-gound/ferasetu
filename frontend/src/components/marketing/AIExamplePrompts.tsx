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
    category: 'Catalog & Photos',
    icon: <Sparkles size={16} />,
    tag: '1-Click Photo Studio',
    title: 'Studio Photo Cleaner',
    prompt: 'Clean up this product picture and make the background pure studio white.',
    response:
      'Isolated product foreground, removed kitchen shadows, centered product on pure white #FFFFFF with soft ground contact shadow. Catalog image optimized and saved to your store.',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    timeSaved: '₹500 / photoshoot',
  },
  {
    category: 'Marketing',
    icon: <MessageSquare size={16} />,
    tag: 'WhatsApp Broadcast',
    title: 'Festive Promo Generator',
    prompt: 'Write a high-converting festive offer broadcast for our top customers.',
    response:
      '🪔 Exclusive Festive Offer from Sharma Kirana! Get 15% off premium sweets, dry fruits, and festive hampers. Order directly on our store: sharmakirana.ferasetu.com/diwali — Free instant delivery above ₹499. Valid till Sunday!',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-100',
    timeSaved: '15 mins drafting',
  },
  {
    category: 'Inventory',
    icon: <Package size={16} />,
    tag: 'Watchdog & Forecast',
    title: 'Proactive Restock Alert',
    prompt: 'Which products are at risk of stocking out before this weekend?',
    response:
      '⚠️ Alert: Fortune Mustard Oil (2 units left, sold 18 last weekend) and Tata Salt (4 units left). Reorder at least 25 units from your distributor today to prevent stockouts.',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    timeSaved: 'Zero stockout loss',
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
