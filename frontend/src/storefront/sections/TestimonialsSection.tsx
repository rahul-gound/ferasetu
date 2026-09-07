import React from 'react';
import { Star, CheckCircle } from 'lucide-react';
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

  const defaultTestimonials: TestimonialItem[] = [
    {
      name: 'Pooja S.',
      location: 'Ahmedabad',
      quote: 'Exceptional quality and prompt WhatsApp dispatch updates. Received exactly as photographed.',
      rating: 5,
    },
    {
      name: 'Vikram Mehta',
      location: 'Pune',
      quote: 'Reliable Cash on Delivery delivery. Product finish exceeded expectations for this price point.',
      rating: 5,
    },
    {
      name: 'Ananya Roy',
      location: 'Kolkata',
      quote: 'Honest local merchant. Very responsive communication and careful packaging.',
      rating: 5,
    },
  ];

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
          {defaultTestimonials.map((t, idx) => (
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
                <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                  <CheckCircle size={12} /> Verified Buyer
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
