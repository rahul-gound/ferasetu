import React from 'react';
import { Truck, ShieldCheck, MessageCircle, RotateCcw, Award, HeartHandshake, Sparkles } from 'lucide-react';
import type { TrustStripVariant } from '../theme/themeTypes';
import { sanitizeText } from '../utilities/formatting';

interface TrustStripSectionProps {
  config?: Record<string, unknown>;
  variant?: TrustStripVariant | string;
}

export default function TrustStripSection({
  config = {},
  variant = 'commerce-badges',
}: TrustStripSectionProps) {
  // ─────────────────────────────────────────────────────────────
  // 1. LUXURY GUARANTEE VARIANT (Atelier)
  // ─────────────────────────────────────────────────────────────
  if (variant === 'luxury-guarantee') {
    const items = [
      {
        icon: <Award size={20} className="text-[#D4AF37]" />,
        title: sanitizeText((config.badge1Title as string) || 'Bespoke Craftsmanship'),
        subtitle: sanitizeText((config.badge1Subtitle as string) || 'Masterfully composed materials'),
      },
      {
        icon: <Sparkles size={20} className="text-[#D4AF37]" />,
        title: sanitizeText((config.badge2Title as string) || 'Archival Packaging'),
        subtitle: sanitizeText((config.badge2Subtitle as string) || 'Presented in signature branded boxes'),
      },
      {
        icon: <ShieldCheck size={20} className="text-[#D4AF37]" />,
        title: sanitizeText((config.badge3Title as string) || 'Insured Direct Transit'),
        subtitle: sanitizeText((config.badge3Subtitle as string) || 'Tamper-evident sealed delivery'),
      },
    ];

    return (
      <section className="py-8 sm:py-12 px-4 sm:px-6 bg-[#FDFCF7] border-b border-[#E8E4DC]">
        <div className="max-w-[var(--theme-max-width)] mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          {items.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center p-4">
              <div className="mb-3">{item.icon}</div>
              <h3
                className="text-sm font-medium tracking-wider uppercase text-[#121212] mb-1"
                style={{ fontFamily: 'var(--theme-font-heading)' }}
              >
                {item.title}
              </h3>
              <p className="text-xs text-[#666666] max-w-xs">{item.subtitle}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. ARTISAN VALUES VARIANT (Artisan)
  // ─────────────────────────────────────────────────────────────
  if (variant === 'artisan-values') {
    const items = [
      {
        icon: <HeartHandshake size={20} className="text-[#C25E3E]" />,
        title: sanitizeText((config.badge1Title as string) || 'Direct from Maker'),
        subtitle: sanitizeText((config.badge1Subtitle as string) || 'Fair wages without intermediaries'),
      },
      {
        icon: <Award size={20} className="text-[#C25E3E]" />,
        title: sanitizeText((config.badge2Title as string) || 'Small Batch Creation'),
        subtitle: sanitizeText((config.badge2Subtitle as string) || 'Made with unhurried devotion to quality'),
      },
      {
        icon: <ShieldCheck size={20} className="text-[#C25E3E]" />,
        title: sanitizeText((config.badge3Title as string) || 'Honest Materials'),
        subtitle: sanitizeText((config.badge3Subtitle as string) || 'Authentic regional ingredients & craft'),
      },
    ];

    return (
      <section className="py-8 sm:py-12 px-4 sm:px-6 bg-[#FBF8F3] border-b border-[#E7DFD5]">
        <div className="max-w-[var(--theme-max-width)] mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          {items.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center p-4">
              <div className="mb-3">{item.icon}</div>
              <h3
                className="text-sm font-bold text-[#2C221E] mb-1"
                style={{ fontFamily: 'var(--theme-font-heading)' }}
              >
                {item.title}
              </h3>
              <p className="text-xs text-[#6D5B52] max-w-xs">{item.subtitle}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 3. COMMERCE BADGES (Market & Bold)
  // ─────────────────────────────────────────────────────────────
  const commerceItems = [
    {
      icon: <Truck size={20} className="text-emerald-600" />,
      title: sanitizeText((config.badge1Title as string) || 'Cash on Delivery'),
      subtitle: sanitizeText((config.badge1Subtitle as string) || 'Pay at your doorstep'),
    },
    {
      icon: <ShieldCheck size={20} className="text-emerald-600" />,
      title: sanitizeText((config.badge2Title as string) || 'Direct Dispatch'),
      subtitle: sanitizeText((config.badge2Subtitle as string) || 'From verified local shop'),
    },
    {
      icon: <MessageCircle size={20} className="text-emerald-600" />,
      title: sanitizeText((config.badge3Title as string) || 'WhatsApp Support'),
      subtitle: sanitizeText((config.badge3Subtitle as string) || 'Instant order updates & chat'),
    },
    {
      icon: <RotateCcw size={20} className="text-emerald-600" />,
      title: sanitizeText((config.badge4Title as string) || 'Easy Verification'),
      subtitle: sanitizeText((config.badge4Subtitle as string) || 'Hassle-free order exchange'),
    },
  ];

  return (
    <section className="py-6 sm:py-8 px-4 sm:px-6 bg-[var(--theme-color-surface)] border-b border-[var(--theme-color-border)]">
      <div className="max-w-[var(--theme-max-width)] mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {commerceItems.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3 p-2.5">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
              {item.icon}
            </div>
            <div>
              <h3 className="text-xs font-bold text-[var(--theme-color-text)]">
                {item.title}
              </h3>
              <p className="text-[11px] text-[var(--theme-color-text-muted)] line-clamp-1">
                {item.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
