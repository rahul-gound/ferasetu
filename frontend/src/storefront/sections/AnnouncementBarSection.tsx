import React from 'react';
import type { AnnouncementVariant } from '../theme/themeTypes';
import { sanitizeText } from '../utilities/formatting';

interface AnnouncementBarSectionProps {
  config?: Record<string, unknown>;
  variant?: AnnouncementVariant | string;
}

export default function AnnouncementBarSection({
  config = {},
  variant = 'ticker',
}: AnnouncementBarSectionProps) {
  const text = sanitizeText(
    (config.text as string) ||
      'Complimentary nationwide dispatch on orders above ₹499 • Verified local store'
  );

  const bgColor = (config.bgColor as string) || 'var(--theme-color-primary)';
  const textColor = (config.textColor as string) || '#FFFFFF';

  if (variant === 'static-center') {
    return (
      <div
        className="w-full py-2 px-4 text-center text-xs tracking-wide font-medium border-b border-black/10"
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        <span>{text}</span>
      </div>
    );
  }

  if (variant === 'split-promos') {
    return (
      <div
        className="w-full py-2 px-6 flex items-center justify-between text-xs tracking-wide font-medium border-b border-black/10"
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        <span className="hidden sm:inline">⚡ Same-day dispatch available</span>
        <span className="text-center flex-1 sm:flex-initial font-semibold">{text}</span>
        <span className="hidden sm:inline">100% Verified Quality</span>
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div
        className="w-full py-1.5 px-4 text-center text-[11px] tracking-widest uppercase font-semibold border-b border-black/5"
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        <span>{text}</span>
      </div>
    );
  }

  // Default 'ticker'
  return (
    <div
      className="w-full overflow-hidden whitespace-nowrap py-2 border-b border-black/10 flex items-center relative"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <style>{`
        @keyframes feraTicker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .fera-marquee-track {
          display: inline-flex;
          white-space: nowrap;
          animation: feraTicker 22s linear infinite;
        }
        .fera-marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className="fera-marquee-track text-xs font-semibold tracking-wide">
        <span className="inline-block px-8">{text}</span>
        <span className="inline-block px-8">✦</span>
        <span className="inline-block px-8">{text}</span>
        <span className="inline-block px-8">✦</span>
        <span className="inline-block px-8">{text}</span>
        <span className="inline-block px-8">✦</span>
        <span className="inline-block px-8">{text}</span>
        <span className="inline-block px-8">✦</span>
      </div>
    </div>
  );
}
