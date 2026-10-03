import React from 'react';
import { Star } from 'lucide-react';
import { sanitizeText } from '../utilities/formatting';

interface TestimonialItem {
  name: string;
  location: string;
  quote: string;
  rating: number;
}

interface TestimonialsSectionProps {
  config?: Record<string, unknown>;
  variant?: string;
}

export default function TestimonialsSection({
  config = {},
  variant = 'verified-buyer-feed',
}: TestimonialsSectionProps) {
  const title = sanitizeText((config.title as string) || 'Customer Experiences');

  const rawItems = Array.isArray(config.items)
    ? config.items
    : Array.isArray(config.testimonials)
      ? config.testimonials
      : [];

  const validTestimonials: TestimonialItem[] = rawItems
    .filter((item: any) => item && typeof item === 'object' && item.quote && item.name)
    .map((item: any) => ({
      name: sanitizeText(item.name || ''),
      location: sanitizeText(item.location || ''),
      quote: sanitizeText(item.quote || ''),
      rating: Math.min(Math.max(Number(item.rating) || 5, 1), 5),
    }));

  if (validTestimonials.length === 0) {
    return null;
  }

  return (
    <section className="py-12 sm:py-16 px-4 sm:px-6 bg-[var(--theme-color-bg)] border-b border-[var(--theme-color-border)]">
      <div className="max-w-[var(--theme-max-width)] mx-auto">
        <div className="text-center mb-10">
          <h2
            className="text-2xl sm:text-3xl font-bold text-[var(--theme-color-text)] tracking-tight"
            style={{ fontFamily: 'var(--theme-font-heading)' }}
          >
            {title}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {validTestimonials.map((t, idx) => (
            <div
              key={idx}
              className="p-6 bg-[var(--theme-color-surface)] rounded-[var(--theme-radius-card)] border border-[var(--theme-color-border)] shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-1 text-amber-500 mb-3">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} size={14} fill="currentColor" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-[var(--theme-color-text-muted)] leading-relaxed italic mb-4">
                  “{t.quote}”
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--theme-color-border-subtle)] text-xs">
                <span className="font-bold text-[var(--theme-color-text)]">{t.name}</span>
                {t.location ? (
                  <span className="text-[var(--theme-color-text-muted)]">
                    {t.location}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
