import React from 'react';
import { ArrowRight, ShoppingBag, ShieldCheck, Truck, Sparkles } from 'lucide-react';
import type { HeroVariant } from '../theme/themeTypes';
import { useStorefront } from '../runtime/StorefrontProvider';
import { sanitizeText } from '../utilities/formatting';
import { resolveMediaUrl } from '../../utils/media';

interface HeroSectionProps {
  config?: Record<string, unknown>;
  variant?: HeroVariant | string;
}

export default function HeroSection({
  config = {},
  variant = 'commerce-banner',
}: HeroSectionProps) {
  const { shopName, products, openProductModal } = useStorefront();

  const eyebrow = sanitizeText((config.eyebrow as string) || 'DIRECT STORE');
  const headline = sanitizeText((config.headline as string) || `Welcome to ${shopName}`);
  const subheadline = sanitizeText(
    (config.subheadline as string) ||
      'Explore authentic, verified merchandise directly from our local storefront with doorstep delivery.'
  );
  const ctaText = sanitizeText((config.ctaText as string) || 'Browse Products');
  const ctaHref = (config.ctaHref as string) || '#products';
  const imageUrl = (config.imageUrl as string) || '';

  // Featured flagship product for product-focused hero
  const featuredProduct = products[0] || null;

  // ─────────────────────────────────────────────────────────────
  // 1. EDITORIAL HERO (Atelier: Quiet luxury, generous whitespace)
  // ─────────────────────────────────────────────────────────────
  if (variant === 'editorial') {
    return (
      <section className="relative py-16 sm:py-24 px-4 sm:px-8 bg-[#FDFCF7] border-b border-[#E8E4DC] overflow-hidden">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          {eyebrow && (
            <span className="text-xs tracking-[0.25em] uppercase font-semibold text-[#8C8C8C] mb-4">
              {eyebrow}
            </span>
          )}
          <h1
            className="text-3xl sm:text-5xl md:text-6xl font-normal text-[#121212] tracking-tight leading-[1.1] mb-6 max-w-3xl"
            style={{ fontFamily: 'var(--theme-font-heading)' }}
          >
            {headline}
          </h1>
          <p className="text-sm sm:text-base text-[#666666] max-w-xl leading-relaxed mb-8 font-normal">
            {subheadline}
          </p>
          <a
            href={ctaHref}
            className="inline-flex items-center gap-3 px-8 py-3.5 bg-[#121212] text-[#FDFCF7] hover:bg-[#2A2A2A] text-xs uppercase tracking-widest font-medium shadow-sm transition-all"
          >
            <span>{ctaText}</span>
            <ArrowRight size={14} />
          </a>
        </div>
      </section>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. MINIMAL HERO (Mono: Swiss typographic statement, zero clutter)
  // ─────────────────────────────────────────────────────────────
  if (variant === 'minimal') {
    return (
      <section className="py-12 sm:py-20 px-4 sm:px-6 bg-white border-b border-[var(--theme-color-border)]">
        <div className="max-w-[var(--theme-max-width)] mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-8">
            <span className="font-mono text-xs text-neutral-500 uppercase tracking-tight block mb-2">
              {eyebrow}
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tighter text-black leading-none mb-4">
              {headline}
            </h1>
            <p className="text-sm font-mono text-neutral-600 max-w-lg leading-relaxed mb-6">
              {subheadline}
            </p>
            <a
              href={ctaHref}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white font-mono text-xs uppercase font-bold hover:bg-neutral-800 transition-colors"
            >
              <span>{ctaText}</span>
              <span>[→]</span>
            </a>
          </div>
          <div className="md:col-span-4 border-l border-[var(--theme-color-border)] pl-6 hidden md:block">
            <div className="space-y-4 text-xs font-mono text-neutral-500">
              <div>
                <span className="block text-black font-bold mb-1">LOCAL DISPATCH</span>
                <span>Verified shopkeeper storefront operating with direct order fulfillment.</span>
              </div>
              <div>
                <span className="block text-black font-bold mb-1">TRANSACTION INTEGRITY</span>
                <span>Direct Cash on Delivery or contactless UPI verification at delivery.</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 3. PRODUCT-FOCUSED HERO (Bold: Contemporary consumer showcase)
  // ─────────────────────────────────────────────────────────────
  if (variant === 'product-focused') {
    return (
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-gradient-to-b from-gray-50 to-white border-b border-gray-200">
        <div className="max-w-[var(--theme-max-width)] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-extrabold text-xs tracking-wider uppercase mb-4">
              <Sparkles size={13} />
              {eyebrow}
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-gray-950 tracking-tight leading-tight mb-4">
              {headline}
            </h1>
            <p className="text-sm sm:text-base text-gray-600 font-medium leading-relaxed mb-8 max-w-lg">
              {subheadline}
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href={ctaHref}
                className="px-8 py-3.5 rounded-full bg-[var(--theme-color-primary)] text-white font-bold text-sm hover:bg-[var(--theme-color-primary-hover)] shadow-md transition-all flex items-center gap-2"
              >
                <span>{ctaText}</span>
                <ArrowRight size={16} />
              </a>
              {featuredProduct && (
                <button
                  type="button"
                  onClick={() => openProductModal(featuredProduct)}
                  className="px-6 py-3.5 rounded-full border border-gray-300 text-gray-800 font-bold text-sm hover:bg-gray-100 transition-colors"
                >
                  Featured Highlight
                </button>
              )}
            </div>
          </div>

          {/* Right Product Card Spotlight */}
          {featuredProduct && (
            <div className="relative flex justify-center">
              <div
                onClick={() => openProductModal(featuredProduct)}
                className="w-full max-w-sm bg-white rounded-2xl p-5 border border-gray-200 shadow-xl cursor-pointer hover:shadow-2xl transition-all duration-300 group"
              >
                <div className="w-full aspect-square rounded-xl bg-gray-100 overflow-hidden mb-4 relative">
                  <img
                    src={resolveMediaUrl(featuredProduct.media_key || featuredProduct.image_url) || resolveMediaUrl(imageUrl)}
                    alt={featuredProduct.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3 bg-black/80 text-white text-xs font-black px-2.5 py-1 rounded-full">
                    Trending
                  </div>
                </div>
                <h3 className="text-base font-bold text-gray-900 line-clamp-1 mb-1">
                  {featuredProduct.name}
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black text-gray-950">
                    ₹{(featuredProduct.sale_price || featuredProduct.price).toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs font-bold text-blue-600 group-hover:underline">
                    Quick View →
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 4. ARTISAN STORY HERO (Artisan: Workshop warmth & heritage badge)
  // ─────────────────────────────────────────────────────────────
  if (variant === 'artisan-story') {
    return (
      <section className="py-14 sm:py-20 px-4 sm:px-6 bg-[#FBF8F3] border-b border-[#E7DFD5]">
        <div className="max-w-[var(--theme-max-width)] mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#EFE8DF] text-[#A64B2F] text-xs font-medium uppercase tracking-wider mb-4">
              <span>🌾</span>
              <span>{eyebrow}</span>
            </div>
            <h1
              className="text-3xl sm:text-4xl md:text-5xl font-semibold text-[#2C221E] leading-tight mb-4"
              style={{ fontFamily: 'var(--theme-font-heading)' }}
            >
              {headline}
            </h1>
            <p className="text-sm sm:text-base text-[#6D5B52] leading-relaxed mb-6 max-w-xl">
              {subheadline}
            </p>
            <a
              href={ctaHref}
              className="inline-flex items-center gap-2 px-6 py-3 rounded bg-[#C25E3E] text-white hover:bg-[#A64B2F] font-semibold text-sm shadow-sm transition-colors"
            >
              <span>{ctaText}</span>
              <ArrowRight size={15} />
            </a>
          </div>

          <div className="md:col-span-5 flex justify-center">
            <div className="p-6 bg-white rounded-lg border border-[#E7DFD5] shadow-md max-w-xs text-center">
              <div className="w-16 h-16 rounded-full bg-[#F5EFE6] text-[#C25E3E] flex items-center justify-center text-2xl mx-auto mb-3">
                🪵
              </div>
              <h4
                className="text-base font-bold text-[#2C221E] mb-1"
                style={{ fontFamily: 'var(--theme-font-heading)' }}
              >
                Direct from the Workshop
              </h4>
              <p className="text-xs text-[#6D5B52] leading-relaxed">
                Every piece is shaped by hand using traditional regional methods and plastic-free packaging.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 5. COMMERCE BANNER HERO (Market: High utility, trust & conversion)
  // ─────────────────────────────────────────────────────────────
  return (
    <section className="py-10 sm:py-14 px-3 sm:px-6 bg-slate-900 text-white border-b border-slate-800">
      <div className="max-w-[var(--theme-max-width)] mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex-1 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {eyebrow}
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-3">
            {headline}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6 max-w-xl">
            {subheadline}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={ctaHref}
              className="px-6 py-2.5 rounded-md bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 shadow-md transition-colors flex items-center gap-2"
            >
              <ShoppingBag size={14} />
              <span>{ctaText}</span>
            </a>
            <span className="text-xs text-slate-400">
              ⚡ Cash on Delivery &amp; WhatsApp Available
            </span>
          </div>
        </div>

        {/* Quick Trust Highlights box */}
        <div className="w-full md:w-auto bg-slate-800/80 border border-slate-700 rounded-lg p-4 sm:p-5 flex flex-col gap-3 min-w-[260px]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Truck size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Direct Local Delivery</div>
              <div className="text-[11px] text-slate-400">Doorstep drop &amp; OTP verification</div>
            </div>
          </div>
          <div className="flex items-center gap-3 border-t border-slate-700/60 pt-3">
            <div className="w-8 h-8 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Genuine Local Retailer</div>
              <div className="text-[11px] text-slate-400">Verified shopkeeper on FeraSetu</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
