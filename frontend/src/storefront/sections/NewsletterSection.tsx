import React, { useState } from 'react';
import { Mail, CheckCircle2 } from 'lucide-react';
import { sanitizeText } from '../utilities/formatting';

interface NewsletterSectionProps {
  config?: Record<string, unknown>;
  variant?: string;
}

export default function NewsletterSection({
  config = {},
  variant = 'minimal',
}: NewsletterSectionProps) {
  const title = sanitizeText((config.title as string) || 'Stay in the Loop');
  const subtitle = sanitizeText(
    (config.subtitle as string) || 'Subscribe for new drop announcements, seasonal sales, and store events.'
  );

  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
    }
  };

  return (
    <section className="py-12 sm:py-16 px-4 sm:px-6 bg-[var(--theme-color-bg)] border-b border-[var(--theme-color-border)]">
      <div className="max-w-xl mx-auto text-center">
        <h2
          className="text-2xl sm:text-3xl font-bold text-[var(--theme-color-text)] tracking-tight mb-2"
          style={{ fontFamily: 'var(--theme-font-heading)' }}
        >
          {title}
        </h2>
        <p className="text-xs sm:text-sm text-[var(--theme-color-text-muted)] mb-6">
          {subtitle}
        </p>

        {subscribed ? (
          <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold animate-fadeIn">
            <CheckCircle2 size={16} className="text-emerald-600" />
            Thank you for subscribing! You will receive our next dispatch.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address..."
              className="flex-1 px-4 py-2.5 text-xs bg-[var(--theme-color-surface)] border border-[var(--theme-color-border)] rounded-[var(--theme-radius-input)] text-[var(--theme-color-text)] focus:outline-none focus:border-black"
            />
            <button
              type="submit"
              className="px-6 py-2.5 bg-[var(--theme-color-primary)] text-white hover:bg-[var(--theme-color-primary-hover)] text-xs font-bold rounded-[var(--theme-radius-button)] transition-colors shadow-sm"
            >
              Subscribe
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
