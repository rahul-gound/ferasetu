/**
 * FinalCTA — Consistent final call-to-action section for marketing pages.
 *
 * AIDA: ACTION phase. Strong but ethical — no fake urgency, no fake scarcity.
 * Purple Cow messaging: "Your shop already exists. Give it an online front door."
 *
 * Psychology:
 * - Orange CTA button = energy, action, warmth
 * - Blue-to-orange gradient = trust → action progression
 * - Trust items reinforce zero-risk message
 * - Summary of all benefits = closing argument
 */
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';

interface FinalCTAProps {
  title?: string;
  subtitle?: string;
  primaryText?: string;
  primaryHref?: string;
  secondaryText?: string;
  secondaryHref?: string;
  trustItems?: string[];
  dark?: boolean;
}

const DEFAULT_TRUST_ITEMS = [
  '₹0 to start',
  'No credit card',
  'No commissions',
  'Ready in minutes',
];

export default function FinalCTA({
  title = 'Your shop is already real.\nNow give it an online front door.',
  subtitle = 'Start free today. No setup fee, no commitment, no commission on any sale.',
  primaryText = 'Start Free Store (₹0)',
  primaryHref = '/register',
  secondaryText = 'See pricing',
  secondaryHref = '/pricing',
  trustItems = DEFAULT_TRUST_ITEMS,
  dark = false,
}: FinalCTAProps) {
  const { getLocalizedLink } = useLanguage();
  const { user, register } = useAuth();

  const titleLines = title.split('\n');

  return (
    <section
      className={`py-20 md:py-28 relative overflow-hidden ${dark ? 'bg-blue-950' : 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800'}`}
      aria-label="Get started with FeraSetu"
    >
      {/* Subtle decorative orange accent stripe at top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-400" />

      {/* Decorative circles */}
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-orange-400/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto px-6 text-center relative z-10">
        <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-[1.1] mb-5">
          {titleLines.map((line, i) => (
            <span key={i}>
              {line}
              {i < titleLines.length - 1 && <br />}
            </span>
          ))}
        </h2>

        <p className={`text-lg mb-8 leading-relaxed ${dark ? 'text-blue-200' : 'text-blue-100'}`}>
          {subtitle}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
          {user ? (
            <Link
              to="/dashboard"
              className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-base shadow-xl flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 bg-orange-500 text-white shadow-orange-900/40 hover:bg-orange-600"
            >
              Go to Dashboard
              <ArrowRight size={16} />
            </Link>
          ) : primaryHref === '/register' ? (
            <button
              type="button"
              onClick={() => register()}
              className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-base shadow-xl flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 cursor-pointer bg-orange-500 text-white shadow-orange-900/40 hover:bg-orange-600"
            >
              {primaryText}
              <ArrowRight size={16} />
            </button>
          ) : (
            <Link
              to={getLocalizedLink(primaryHref)}
              className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-base shadow-xl flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 bg-orange-500 text-white shadow-orange-900/40 hover:bg-orange-600"
            >
              {primaryText}
              <ArrowRight size={16} />
            </Link>
          )}

          {secondaryText && (
            <Link
              to={getLocalizedLink(secondaryHref)}
              className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-base transition-all flex items-center justify-center text-white/80 hover:text-white border border-white/30 hover:border-white/60 hover:bg-white/10"
            >
              {secondaryText}
            </Link>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {trustItems.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-100">
              <CheckCircle2 size={13} className="text-orange-300" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
