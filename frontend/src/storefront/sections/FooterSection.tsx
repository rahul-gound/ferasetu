import React from 'react';
import { Phone, MapPin, Mail, MessageCircle } from 'lucide-react';
import type { FooterVariant } from '../theme/themeTypes';
import { useStorefront } from '../runtime/StorefrontProvider';
import { sanitizeText, formatWhatsAppPhone } from '../utilities/formatting';

interface FooterSectionProps {
  config?: Record<string, unknown>;
  variant?: FooterVariant | string;
}

export default function FooterSection({
  config = {},
  variant = 'commerce',
}: FooterSectionProps) {
  const { shopName, shopPhone, shopLogo } = useStorefront();

  const displayName = sanitizeText((config.shopName as string) || shopName);
  const tagline = sanitizeText(
    (config.tagline as string) || 'Your trusted neighborhood shop, powered by FeraSetu.'
  );

  const phone = (config.phone as string) || shopPhone || '';
  const waNumber = formatWhatsAppPhone(phone);
  const address = (config.address as string) || '';
  const email = (config.email as string) || '';

  const currentYear = new Date().getFullYear();

  // ─────────────────────────────────────────────────────────────
  // 1. EDITORIAL FOOTER (Atelier)
  // ─────────────────────────────────────────────────────────────
  if (variant === 'editorial') {
    return (
      <footer className="py-14 sm:py-20 px-4 sm:px-8 bg-[#121212] text-[#FDFCF7] border-t border-[#2A2A2A]">
        <div className="max-w-[var(--theme-max-width)] mx-auto grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-6">
            <h3
              className="text-2xl uppercase tracking-widest font-normal mb-3"
              style={{ fontFamily: 'var(--theme-font-heading)' }}
            >
              {displayName}
            </h3>
            <p className="text-xs text-[#8C8C8C] max-w-sm leading-relaxed mb-6 font-normal">
              {tagline}
            </p>
            {phone && (
              <a
                href={`https://wa.me/${waNumber}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs text-[#D4AF37] hover:underline"
              >
                <MessageCircle size={14} /> Client Consultation via WhatsApp
              </a>
            )}
          </div>

          <div className="md:col-span-3 text-xs tracking-wider space-y-2 text-[#8C8C8C]">
            <span className="block font-semibold uppercase text-white mb-3">Exhibitions</span>
            <div><a href="#products" className="hover:text-white">Full Catalog</a></div>
            <div><a href="#categories" className="hover:text-white">Selected Curations</a></div>
            <div><a href="#story" className="hover:text-white">The Atelier Manifesto</a></div>
          </div>

          <div className="md:col-span-3 text-xs tracking-wider space-y-2 text-[#8C8C8C]">
            <span className="block font-semibold uppercase text-white mb-3">Provenance</span>
            <div>Verified Local Merchant</div>
            <div>Insured Direct Dispatch</div>
            <div>FeraSetu Protected Storefront</div>
          </div>
        </div>

        <div className="max-w-[var(--theme-max-width)] mx-auto mt-12 pt-6 border-t border-[#2A2A2A] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#666666] gap-2">
          <span>&copy; {currentYear} {displayName}. All rights reserved.</span>
          <span>Powered by FeraSetu</span>
        </div>
      </footer>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. MINIMAL FOOTER (Mono)
  // ─────────────────────────────────────────────────────────────
  if (variant === 'minimal') {
    return (
      <footer className="py-8 px-4 sm:px-6 bg-white border-t border-[var(--theme-color-border)] text-xs font-mono">
        <div className="max-w-[var(--theme-max-width)] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="font-bold text-black uppercase">[{displayName}]</span>
            <span className="text-neutral-500 ml-3">{tagline}</span>
          </div>
          <div className="flex items-center gap-4 text-neutral-500">
            <a href="#products" className="hover:text-black">INDEX</a>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('fera-open-track-order'))}
              className="hover:text-black"
            >
              TRACK
            </button>
            <span>&copy; {currentYear}</span>
          </div>
        </div>
      </footer>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 3. ARTISAN FOOTER (Artisan)
  // ─────────────────────────────────────────────────────────────
  if (variant === 'artisan') {
    return (
      <footer className="py-12 sm:py-16 px-4 sm:px-6 bg-[#2C221E] text-[#FBF8F3] border-t border-[#42332D]">
        <div className="max-w-[var(--theme-max-width)] mx-auto grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-6">
            <h3
              className="text-xl sm:text-2xl font-semibold mb-2"
              style={{ fontFamily: 'var(--theme-font-heading)' }}
            >
              {displayName}
            </h3>
            <p className="text-xs text-[#9E8A80] max-w-sm leading-relaxed mb-4">
              {tagline}
            </p>
            {phone && (
              <a
                href={`https://wa.me/${waNumber}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#C25E3E] hover:underline"
              >
                <MessageCircle size={14} /> Talk to the Maker
              </a>
            )}
          </div>

          <div className="md:col-span-6 flex flex-col sm:flex-row gap-8 md:justify-end text-xs text-[#9E8A80]">
            <div>
              <span className="font-bold text-[#FBF8F3] block mb-2">Our Craft</span>
              <ul className="space-y-1">
                <li>Direct Fair Trade</li>
                <li>Plastic-Free Dispatch</li>
                <li>Small Batch Integrity</li>
              </ul>
            </div>
            <div>
              <span className="font-bold text-[#FBF8F3] block mb-2">Assistance</span>
              <ul className="space-y-1">
                <li><a href="#products" className="hover:text-white">Shop Catalog</a></li>
                <li><a href="#story" className="hover:text-white">Our Heritage</a></li>
                <li>
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('fera-open-track-order'))}
                    className="hover:text-white"
                  >
                    Track Dispatch
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="max-w-[var(--theme-max-width)] mx-auto mt-10 pt-6 border-t border-[#42332D] flex flex-col sm:flex-row items-center justify-between text-xs text-[#9E8A80] gap-2">
          <span>&copy; {currentYear} {displayName}. Crafted with care.</span>
          <span>Online storefront powered by FeraSetu</span>
        </div>
      </footer>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 4. COMMERCE FOOTER (Market & Bold)
  // ─────────────────────────────────────────────────────────────
  return (
    <footer className="py-12 sm:py-16 px-4 sm:px-6 bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-[var(--theme-max-width)] mx-auto grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-7 h-7 rounded bg-[var(--theme-color-primary)] text-white flex items-center justify-center text-xs font-black">
              🏪
            </span>
            <span className="font-extrabold text-lg text-white">{displayName}</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed max-w-sm mb-4">
            {tagline}
          </p>
          <div className="flex flex-col gap-1.5 text-xs text-slate-400">
            {phone && (
              <div className="flex items-center gap-2">
                <Phone size={13} className="text-emerald-400" />
                <span>{phone}</span>
              </div>
            )}
            {address && (
              <div className="flex items-center gap-2">
                <MapPin size={13} className="text-emerald-400" />
                <span>{address}</span>
              </div>
            )}
            {email && (
              <div className="flex items-center gap-2">
                <Mail size={13} className="text-emerald-400" />
                <span>{email}</span>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-3 text-xs space-y-2">
          <span className="font-bold text-white uppercase tracking-wider block mb-3">
            Quick Navigation
          </span>
          <div><a href="#products" className="text-slate-400 hover:text-white">All Products</a></div>
          <div><a href="#categories" className="text-slate-400 hover:text-white">Categories</a></div>
          <div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('fera-open-track-order'))}
              className="text-slate-400 hover:text-white"
            >
              Track Your Order
            </button>
          </div>
        </div>

        <div className="md:col-span-4 text-xs space-y-2">
          <span className="font-bold text-white uppercase tracking-wider block mb-3">
            Local Commerce Guarantee
          </span>
          <p className="text-slate-400 leading-relaxed">
            Direct orders fulfilled by your neighborhood retailer with Cash on Delivery and doorstep OTP verification.
          </p>
          {phone && (
            <div className="pt-2">
              <a
                href={`https://wa.me/${waNumber}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded font-bold hover:bg-emerald-600/30 transition-colors"
              >
                <MessageCircle size={14} /> WhatsApp Support
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-[var(--theme-max-width)] mx-auto mt-10 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <span>&copy; {currentYear} {displayName}. Verified merchant on FeraSetu.</span>
        <span>Secure Local E-Commerce</span>
      </div>
    </footer>
  );
}
