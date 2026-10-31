import React from 'react';
import { ArrowRight, Sparkles, ShieldCheck, Zap, Star, ShoppingBag, Heart, ExternalLink } from 'lucide-react';
import { useStorefront } from '../runtime/StorefrontProvider';
import { sanitizeText } from '../utilities/formatting';
import SpotlightCard from '../../components/ui/SpotlightCard';

interface BentoCardItem {
  id: string;
  badge?: string;
  title: string;
  description: string;
  iconName?: string;
  imageUrl?: string;
  imageShape?: 'rounded' | 'squircle' | 'sharp' | 'pill' | 'circle';
  ctaText?: string;
  ctaHref?: string;
  colSpan?: 1 | 2;
  highlight?: boolean;
}

interface BentoGridSectionProps {
  config?: Record<string, unknown>;
  variant?: string;
}

export default function BentoGridSection({
  config = {},
}: BentoGridSectionProps) {
  const { shopName, products, openProductModal } = useStorefront();

  const eyebrow = sanitizeText((config.eyebrow as string) || 'CURATED SHOWCASE');
  const headline = sanitizeText((config.headline as string) || `${shopName} Collection & Standards`);
  const subheadline = sanitizeText(
    (config.subheadline as string) ||
      'Engineered for quality, verified for transparency. Explore standout items and guarantees.'
  );

  const rawCards = (config.cards as BentoCardItem[]) || [
    {
      id: 'card-1',
      badge: 'Bestseller',
      title: 'Flagship Handcrafted Quality',
      description: 'Zero assembly-line shortcuts. Crafted and checked in our local workshop.',
      imageUrl: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=800&q=80',
      imageShape: 'squircle',
      ctaText: 'Explore Item',
      colSpan: 2,
      highlight: true,
    },
    {
      id: 'card-2',
      badge: 'Zero Commission',
      title: '100% Direct Value',
      description: 'You buy straight from the shopkeeper. No middlemen cuts or hidden surcharges.',
      ctaText: 'Learn More',
      colSpan: 1,
    },
    {
      id: 'card-3',
      badge: 'Fast Dispatch',
      title: 'Same-Day Packaging',
      description: 'Swift parcel handoff and live WhatsApp tracking updates for complete peace of mind.',
      ctaText: 'View Delivery',
      colSpan: 1,
    },
    {
      id: 'card-4',
      badge: 'Verified Merchant',
      title: 'Authenticity Guarantee',
      description: 'Every product comes with our verified shopkeeper seal and direct customer support.',
      imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&q=80',
      imageShape: 'rounded',
      ctaText: 'Shop Catalog',
      colSpan: 2,
    },
  ];

  const getShapeClass = (shape?: string) => {
    switch (shape) {
      case 'sharp':
        return 'shape-sharp';
      case 'squircle':
        return 'shape-squircle';
      case 'pill':
        return 'shape-pill';
      case 'circle':
        return 'shape-circle';
      default:
        return 'shape-rounded';
    }
  };

  return (
    <section className="py-12 sm:py-20 px-4 sm:px-6 bg-slate-50/60 dark:bg-slate-900/30 border-b border-slate-200/80">
      <div className="max-w-[var(--theme-max-width)] mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          {eyebrow && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200/80 mb-3 shadow-2xs">
              <Sparkles size={13} className="text-orange-600" />
              {eyebrow}
            </span>
          )}
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-3">
            {headline}
          </h2>
          {subheadline && (
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              {subheadline}
            </p>
          )}
        </div>

        {/* Bento Grid layout with React Bits SpotlightCard integration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {rawCards.map((card, i) => {
            const isSpan2 = card.colSpan === 2;
            return (
              <div
                key={card.id || i}
                className={isSpan2 ? 'md:col-span-2' : 'md:col-span-1'}
              >
                <SpotlightCard
                  spotlightColor="rgba(234, 88, 12, 0.12)"
                  spotlightSize={320}
                  className={`h-full p-6 sm:p-8 flex flex-col justify-between rounded-2xl border transition-all duration-300 hover:shadow-lg ${
                    card.highlight
                      ? 'border-orange-200/90 bg-gradient-to-br from-white via-orange-50/30 to-amber-50/40 shadow-xs'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Top row: Badge & Micro-icon */}
                    <div className="flex items-center justify-between gap-2">
                      {card.badge && (
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200/70 shadow-2xs">
                          {card.badge}
                        </span>
                      )}
                      <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-xs">
                        #{i + 1}
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mb-1.5">
                        {card.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {card.description}
                      </p>
                    </div>

                    {/* Optional Image with Custom Shape Framing */}
                    {card.imageUrl && (
                      <div className="mt-4 overflow-hidden shadow-xs border border-slate-200/60 max-h-56">
                        <img
                          src={card.imageUrl}
                          alt={card.title}
                          className={`w-full h-44 object-cover hover:scale-105 transition-transform duration-500 ${getShapeClass(
                            card.imageShape
                          )}`}
                          loading="lazy"
                        />
                      </div>
                    )}
                  </div>

                  {/* Bottom Action CTA */}
                  {card.ctaText && (
                    <div className="pt-6 mt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1.5 transition-colors">
                        <span>{card.ctaText}</span>
                        <ArrowRight size={14} />
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">FeraSetu Verified</span>
                    </div>
                  )}
                </SpotlightCard>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
