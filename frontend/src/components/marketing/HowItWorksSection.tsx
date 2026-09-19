/**
 * HowItWorksSection — 3-step workflow demonstrating the FeraSetu mechanism.
 *
 * Purple Cow moment: Shows the real yourshop.ferasetu.com URL pattern.
 * Psychology: Chunking (3 steps), specificity, time indicators reduce friction.
 * Reused on the landing page and any other public page needing this explanation.
 */
import { ArrowRight, Package, Share2, ShoppingCart, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';

const STEPS = [
  {
    number: '01',
    icon: <Package size={24} />,
    title: 'Add your products',
    desc: 'Upload product photos, set prices and stock from your phone. No technical skill needed — just your catalog.',
    time: '~ 5 min setup',
    color: 'bg-blue-600',
    lightBg: 'bg-blue-50',
    lightText: 'text-blue-600',
    borderColor: 'border-blue-100',
    numberBg: 'bg-blue-50 text-blue-200',
  },
  {
    number: '02',
    icon: <Share2 size={24} />,
    title: 'Share your store link',
    desc: 'You get a permanent store link — yourshop.ferasetu.com. Share it on WhatsApp, Instagram, or print a QR code for your shop counter.',
    time: 'Share in seconds',
    color: 'bg-blue-600',
    lightBg: 'bg-blue-50',
    lightText: 'text-blue-600',
    borderColor: 'border-blue-100',
    numberBg: 'bg-blue-50 text-blue-200',
  },
  {
    number: '03',
    icon: <ShoppingCart size={24} />,
    title: 'Receive orders & payments',
    desc: 'Customers browse, pick items, and pay via UPI. Orders land in your dashboard. You fulfill — no middleman, no commission.',
    time: 'Earn every day',
    color: 'bg-orange-500',
    lightBg: 'bg-orange-50',
    lightText: 'text-orange-600',
    borderColor: 'border-orange-100',
    numberBg: 'bg-orange-50 text-orange-200',
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
      className="py-20 md:py-24 bg-white border-t border-slate-100"
      aria-label="How FeraSetu works"
    >
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4">
            🚀 How It Works
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-blue-950 tracking-tight mb-4">
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
            <ArrowRight size={20} className="text-blue-200" />
            <ArrowRight size={20} className="text-orange-300" />
          </div>

          {STEPS.map((step, i) => (
            <div
              key={i}
              className={`relative bg-white rounded-2xl border ${step.borderColor} p-7 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300`}
            >
              {/* Step number */}
              <span className={`absolute top-5 right-5 text-xs font-black tracking-widest ${step.numberBg}`}>
                {step.number}
              </span>

              {/* Time badge */}
              <div className={`inline-flex items-center gap-1 text-[10px] font-bold ${step.lightText} bg-opacity-80 mb-4 px-2 py-0.5 rounded-full border ${step.borderColor}`}>
                <Clock size={10} />
                {step.time}
              </div>

              {/* Icon */}
              <div className={`w-12 h-12 ${step.lightBg} ${step.lightText} rounded-xl flex items-center justify-center mb-4 border ${step.borderColor}`}>
                {step.icon}
              </div>

              <h3 className="text-lg font-bold text-blue-950 mb-2">{step.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{step.desc}</p>

              {/* Step 2: Show the actual URL pattern */}
              {i === 1 && (
                <div className="mt-4 inline-flex items-center gap-2 bg-blue-950 text-white px-3 py-1.5 rounded-lg text-xs font-mono">
                  <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
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
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-orange-500 text-white font-bold text-base shadow-lg shadow-orange-500/25 hover:bg-orange-600 transition-all hover:-translate-y-0.5 cursor-pointer"
              >
                {ctaText}
                <ArrowRight size={16} />
              </button>
            ) : (
              <Link
                to={getLocalizedLink(ctaLink)}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-orange-500 text-white font-bold text-base shadow-lg shadow-orange-500/25 hover:bg-orange-600 transition-all hover:-translate-y-0.5"
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
