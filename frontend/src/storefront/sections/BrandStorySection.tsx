import React from 'react';
import { sanitizeText } from '../utilities/formatting';

interface BrandStorySectionProps {
  config?: Record<string, unknown>;
  variant?: string;
}

export default function BrandStorySection({
  config = {},
  variant = 'split-right-image',
}: BrandStorySectionProps) {
  const eyebrow = sanitizeText((config.eyebrow as string) || 'OUR ORIGIN');
  const title = sanitizeText((config.title as string) || 'Building with Honest Hands & Enduring Values');
  const body = sanitizeText(
    (config.body as string) ||
      'Founded to bring authentic craftsmanship directly to our community without compromises or corporate shortcuts. Every offering in our catalog reflects dedicated curation, local integrity, and a commitment to long-term trust.'
  );
  const quote = sanitizeText((config.quote as string) || '');
  const author = sanitizeText((config.author as string) || '');
  const imageUrl = (config.imageUrl as string) || '';

  // ─────────────────────────────────────────────────────────────
  // 1. QUOTE CENTER VARIANT (Atelier)
  // ─────────────────────────────────────────────────────────────
  if (variant === 'quote-center' || quote) {
    return (
      <section id="story" className="py-16 sm:py-24 px-4 sm:px-6 bg-[#FDFCF7] border-b border-[#E8E4DC]">
        <div className="max-w-3xl mx-auto text-center">
          <blockquote
            className="text-xl sm:text-3xl font-normal text-[#121212] leading-relaxed mb-6 italic"
            style={{ fontFamily: 'var(--theme-font-heading)' }}
          >
            {quote || `“${body}”`}
          </blockquote>
          {author && (
            <cite className="text-xs uppercase tracking-widest font-semibold text-[#8C8C8C] not-italic block">
              — {author}
            </cite>
          )}
        </div>
      </section>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. HERITAGE STORY VARIANT (Artisan)
  // ─────────────────────────────────────────────────────────────
  if (variant === 'heritage-story') {
    return (
      <section id="story" className="py-14 sm:py-20 px-4 sm:px-6 bg-[#F5EFE6] border-b border-[#E7DFD5]">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#A64B2F] block mb-3">
            {eyebrow}
          </span>
          <h2
            className="text-2xl sm:text-4xl font-semibold text-[#2C221E] leading-tight mb-6"
            style={{ fontFamily: 'var(--theme-font-heading)' }}
          >
            {title}
          </h2>
          <p className="text-sm sm:text-base text-[#6D5B52] leading-relaxed max-w-2xl mx-auto">
            {body}
          </p>
        </div>
      </section>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 3. SPLIT STORY (Bold & Commerce)
  // ─────────────────────────────────────────────────────────────
  return (
    <section id="story" className="py-14 sm:py-20 px-4 sm:px-6 bg-[var(--theme-color-surface)] border-b border-[var(--theme-color-border)]">
      <div className="max-w-[var(--theme-max-width)] mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
        <div className="md:col-span-7">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--theme-color-accent)] block mb-2">
            {eyebrow}
          </span>
          <h2
            className="text-2xl sm:text-4xl font-extrabold text-[var(--theme-color-text)] tracking-tight leading-tight mb-4"
            style={{ fontFamily: 'var(--theme-font-heading)' }}
          >
            {title}
          </h2>
          <p className="text-sm sm:text-base text-[var(--theme-color-text-muted)] leading-relaxed">
            {body}
          </p>
        </div>

        <div className="md:col-span-5 flex justify-center">
          <div className="w-full aspect-[4/3] rounded-[var(--theme-radius-card)] bg-slate-100 border border-[var(--theme-color-border)] flex items-center justify-center text-center p-6 text-slate-400">
            {imageUrl ? (
              <img src={imageUrl} alt={title} className="w-full h-full object-cover rounded-[var(--theme-radius-card)]" />
            ) : (
              <div className="space-y-2">
                <span className="text-4xl block">🏪</span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Verified Local Merchant
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
