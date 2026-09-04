/**
 * HowItWorksSection — 3-step workflow demonstrating the FeraSetu mechanism.
 *
 * Purple Cow moment: Shows the real yourshop.ferasetu.com URL pattern.
 * Reused on the landing page and any other public page needing this explanation.
 */
import { ArrowRight, Package, Share2, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';

const STEPS = [
  {
    number: '01',
    icon: <Package size={24} />,
    title: 'Add your products',
    desc: 'Upload product photos, set prices and stock from your phone. No technical skill needed — just your catalog.',
    color: 'bg-blue-600',
    lightBg: 'bg-blue-50',
    lightText: 'text-blue-600',
  },
  {
    number: '02',
    icon: <Share2 size={24} />,
    title: 'Share your store link',
    desc: 'You get a permanent store link — yourshop.ferasetu.com. Share it on WhatsApp, Instagram, or print a QR code for your shop counter.',
    color: 'bg-blue-600',
    lightBg: 'bg-blue-50',
    lightText: 'text-blue-600',
  },
  {
    number: '03',
    icon: <ShoppingCart size={24} />,
    title: 'Receive orders & payments',
    desc: 'Customers browse, pick items, and pay via UPI. Orders land in your dashboard. You fulfill — no middleman, no commission.',
    color: 'bg-blue-600',
    lightBg: 'bg-blue-50',
    lightText: 'text-blue-600',
  },
];

interface HowItWorksSectionProps {
  showCTA?: boolean;
  ctaLink?: string;
  ctaText?: string;
}

export default function HowItWorksSection({
  showCTA = true,
  ctaLink = '/register',
  ctaText = 'Start Free — ₹0',
}: HowItWorksSectionProps) {
  const { getLocalizedLink } = useLanguage();
  const { register } = useAuth();

  return (
    <section
      id="how-it-works"
      className="py-20 md:py-24 bg-white"
      aria-label="How FeraSetu works"
    >
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4">
            How It Works
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            From physical shop to online store in three steps
          </h2>
          <p className="text-lg text-slate-600 leading-relaxed">
            No website development. No complicated setup. Just your products, your link, and your customers.
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8 mb-14 relative">
          {/* Connecting arrows (desktop only) */}
          <div className="hidden md:flex absolute top-14 left-[33%] right-[33%] items-center justify-between pointer-events-none z-10 px-4">
            <ArrowRight size={20} className="text-slate-300" />
            <ArrowRight size={20} className="text-slate-300" />
          </div>

          {STEPS.map((step, i) => (
            <div
              key={i}
              className="relative bg-white rounded-2xl border border-slate-100 p-7 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300"
            >
              {/* Step number */}
              <span className="absolute top-5 right-5 text-xs font-black text-slate-200 tracking-widest">
                {step.number}
              </span>

              {/* Icon */}
              <div className={`w-12 h-12 ${step.lightBg} ${step.lightText} rounded-xl flex items-center justify-center mb-5 border border-blue-100`}>
                {step.icon}
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{step.desc}</p>

              {/* Step 2: Show the actual URL pattern */}
              {i === 1 && (
                <div className="mt-4 inline-flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                  yourshop.ferasetu.com
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        {showCTA && (
          <div className="text-center">
            {ctaLink === '/register' ? (
              <button
                type="button"
                onClick={() => register()}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-blue-600 text-white font-bold text-base shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-all hover:-translate-y-0.5 cursor-pointer"
              >
                {ctaText}
                <ArrowRight size={16} />
              </button>
            ) : (
              <Link
                to={getLocalizedLink(ctaLink)}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-blue-600 text-white font-bold text-base shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-all hover:-translate-y-0.5"
              >
                {ctaText}
                <ArrowRight size={16} />
              </Link>
            )}
            <p className="text-xs text-slate-500 font-medium mt-3">
              No credit card · No technical setup · No commissions
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
