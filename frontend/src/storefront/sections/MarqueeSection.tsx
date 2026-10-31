import React from 'react';
import { ShieldCheck, Truck, Sparkles, CheckCircle2, Heart, Award, Zap } from 'lucide-react';
import { sanitizeText } from '../utilities/formatting';

interface MarqueeSectionProps {
  config?: Record<string, unknown>;
  variant?: string;
}

export default function MarqueeSection({
  config = {},
}: MarqueeSectionProps) {
  const speed = (config.speed as string) || 'normal'; // 'fast' | 'normal' | 'slow'
  const items = (config.items as string[]) || [
    '✨ 0% Marketplace Commission — 100% Direct Merchant Support',
    '📦 Doorstep Delivery & Verified Local Packaging',
    '💬 Direct WhatsApp Ordering with Cash on Delivery',
    '🌿 Authentic Regional Quality & Fresh Supply Guarantee',
    '🛡️ 100% Verified Independent Shopkeeper on FeraSetu',
    '⚡ Instant UPI & Seamless Contactless Fulfillment',
  ];

  return (
    <section className="py-4 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white overflow-hidden select-none shadow-xs">
      <div className="flex overflow-hidden">
        <div className="animate-fera-marquee flex items-center gap-8 py-1 whitespace-nowrap">
          {items.map((item, idx) => (
            <div key={`m1-${idx}`} className="flex items-center gap-4 text-xs sm:text-sm font-bold tracking-wide">
              <span>{sanitizeText(item)}</span>
              <span className="text-white/40">✦</span>
            </div>
          ))}
          {/* Duplicate set for seamless continuous loop */}
          {items.map((item, idx) => (
            <div key={`m2-${idx}`} className="flex items-center gap-4 text-xs sm:text-sm font-bold tracking-wide">
              <span>{sanitizeText(item)}</span>
              <span className="text-white/40">✦</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
