import React from 'react';
import { ArrowRight, MessageCircle, ShoppingBag, User, Package, ExternalLink } from 'lucide-react';
import { useStorefront } from '../runtime/StorefrontProvider';
import { sanitizeText, formatWhatsAppPhone } from '../utilities/formatting';

interface ImageBannerSectionProps {
  config?: Record<string, unknown>;
  variant?: string;
}

export default function ImageBannerSection({
  config = {},
}: ImageBannerSectionProps) {
  const { shopName, shopPhone, openCart, openCustomerAuth } = useStorefront();

  const imageUrl = (config.imageUrl as string) || (config.image as string) || 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=1600&q=80';
  const headline = sanitizeText((config.headline as string) || (config.title as string) || '');
  const subheadline = sanitizeText((config.subheadline as string) || (config.subtitle as string) || '');
  const ctaText = sanitizeText((config.ctaText as string) || '');
  const clickAction = (config.clickAction as string) || (config.action as string) || 'scroll'; // 'whatsapp' | 'cart' | 'signup' | 'track' | 'scroll' | 'link'
  const ctaHref = (config.ctaHref as string) || (config.link as string) || '#products';
  const overlayDarkness = (config.overlayDarkness as string) || 'medium'; // 'none' | 'subtle' | 'medium' | 'dark'
  const heightStyle = (config.height as string) || 'medium'; // 'small' (260px) | 'medium' (420px) | 'large' (560px) | 'auto'
  const textAlign = (config.textAlign as string) || 'center'; // 'left' | 'center' | 'right'

  const heightClass =
    heightStyle === 'small'
      ? 'min-h-[240px] sm:min-h-[300px]'
      : heightStyle === 'large'
      ? 'min-h-[480px] sm:min-h-[600px]'
      : 'min-h-[360px] sm:min-h-[440px]';

  const overlayBg =
    overlayDarkness === 'none'
      ? 'bg-transparent'
      : overlayDarkness === 'subtle'
      ? 'bg-black/25'
      : overlayDarkness === 'dark'
      ? 'bg-black/70'
      : 'bg-black/45';

  const alignClass =
    textAlign === 'left'
      ? 'items-start text-left'
      : textAlign === 'right'
      ? 'items-end text-right'
      : 'items-center text-center';

  const handleAction = (e: React.MouseEvent) => {
    if (clickAction === 'whatsapp') {
      e.preventDefault();
      const phone = formatWhatsAppPhone(shopPhone);
      if (phone) {
        const text = `Namaste ${shopName}!\n\nI saw your store banner and would like to inquire about products.`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
      } else {
        alert('Merchant WhatsApp contact is being configured.');
      }
    } else if (clickAction === 'cart') {
      e.preventDefault();
      openCart();
    } else if (clickAction === 'signup') {
      e.preventDefault();
      openCustomerAuth('register');
    } else if (clickAction === 'track') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('fera-open-track-order'));
    } else if (clickAction === 'scroll') {
      if (ctaHref.startsWith('#')) {
        const target = document.querySelector(ctaHref);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  };

  const getActionIcon = () => {
    switch (clickAction) {
      case 'whatsapp':
        return <MessageCircle size={16} className="text-emerald-400" />;
      case 'cart':
        return <ShoppingBag size={16} />;
      case 'signup':
        return <User size={16} />;
      case 'track':
        return <Package size={16} />;
      case 'link':
        return <ExternalLink size={16} />;
      default:
        return <ArrowRight size={16} />;
    }
  };

  return (
    <section className="relative w-full overflow-hidden my-4 sm:my-8 px-3 sm:px-6">
      <div
        className={`relative w-full max-w-[var(--theme-max-width)] mx-auto rounded-3xl overflow-hidden shadow-lg border border-slate-200/80 ${heightClass} flex flex-col justify-center`}
      >
        {/* Background Image */}
        <img
          src={imageUrl}
          alt={headline || 'Store Banner'}
          className="absolute inset-0 w-full h-full object-cover object-center transform hover:scale-102 transition-transform duration-700 ease-out"
          loading="lazy"
        />

        {/* Gradient Overlay */}
        <div className={`absolute inset-0 ${overlayBg} backdrop-blur-[0.5px] transition-all`} />

        {/* Content Box */}
        {(headline || subheadline || ctaText) && (
          <div className={`relative z-10 p-6 sm:p-12 md:p-16 flex flex-col ${alignClass} max-w-3xl mx-auto w-full`}>
            {headline && (
              <h2
                className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-md mb-3"
                style={{ fontFamily: 'var(--theme-font-heading)' }}
              >
                {headline}
              </h2>
            )}

            {subheadline && (
              <p className="text-sm sm:text-base md:text-lg text-white/90 font-medium max-w-xl leading-relaxed drop-shadow-xs mb-6">
                {subheadline}
              </p>
            )}

            {ctaText && (
              <a
                href={ctaHref}
                onClick={handleAction}
                className="inline-flex items-center gap-2.5 px-6 sm:px-8 py-3 sm:py-3.5 bg-white text-slate-900 hover:bg-slate-100 rounded-full font-bold text-xs sm:text-sm tracking-wide shadow-xl active:scale-95 transition-all duration-200 cursor-pointer"
              >
                <span>{ctaText}</span>
                {getActionIcon()}
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
