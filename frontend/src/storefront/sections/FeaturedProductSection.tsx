import React from 'react';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useStorefront } from '../runtime/StorefrontProvider';
import { formatPrice, calculateDiscount, sanitizeText } from '../utilities/formatting';
import { handleImageFallback, getProductPlaceholderSvg } from '../utilities/imageFallback';
import { resolveMediaUrl } from '../../utils/media';

interface FeaturedProductSectionProps {
  config?: Record<string, unknown>;
  variant?: string;
}

export default function FeaturedProductSection({
  config = {},
  variant = 'spotlight',
}: FeaturedProductSectionProps) {
  const { products, openProductModal, addToCart } = useStorefront();

  const eyebrow = sanitizeText((config.eyebrow as string) || 'FLAGSHIP SPOTLIGHT');
  const customTitle = sanitizeText((config.title as string) || '');

  // Select target product from config productId or fallback to first product
  const targetId = config.productId as string | undefined;
  const product = (targetId ? products.find((p) => p.id === targetId) : null) || products[0] || null;

  if (!product) return null;

  const price = product.price;
  const salePrice = product.sale_price;
  const hasSale = salePrice != null && salePrice > 0 && salePrice < price;
  const effectivePrice = hasSale ? salePrice! : price;
  const discount = calculateDiscount(price, salePrice);
  const title = customTitle || sanitizeText(product.name);

  return (
    <section className="py-12 sm:py-20 px-4 sm:px-6 bg-[var(--theme-color-surface)] border-b border-[var(--theme-color-border)]">
      <div className="max-w-[var(--theme-max-width)] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left media */}
        <div className="lg:col-span-6 flex justify-center">
          <div
            className="w-full max-w-md aspect-square bg-[var(--theme-color-bg)] rounded-[var(--theme-radius-card)] overflow-hidden border border-[var(--theme-color-border)] relative cursor-pointer group"
            onClick={() => openProductModal(product)}
          >
            <img
              src={resolveMediaUrl(product.media_key || product.image_url) || getProductPlaceholderSvg(product.name)}
              alt={title}
              onError={(e) => handleImageFallback(e, product.name)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {hasSale && (
              <div className="absolute top-4 left-4 bg-[var(--theme-color-badge-bg)] text-[var(--theme-color-badge-text)] text-xs font-black px-3 py-1 rounded-[var(--theme-radius-pill)]">
                {discount}% OFF
              </div>
            )}
          </div>
        </div>

        {/* Right details */}
        <div className="lg:col-span-6 flex flex-col items-start">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--theme-color-accent)] mb-2">
            {eyebrow}
          </span>
          <h2
            className="text-2xl sm:text-4xl font-bold text-[var(--theme-color-text)] leading-tight mb-4"
            style={{ fontFamily: 'var(--theme-font-heading)' }}
          >
            {title}
          </h2>
          {product.description && (
            <p className="text-sm text-[var(--theme-color-text-muted)] leading-relaxed mb-6 max-w-lg">
              {product.description}
            </p>
          )}

          <div className="flex items-baseline gap-3 mb-8">
            <span className="text-2xl sm:text-3xl font-black text-[var(--theme-color-text)]">
              {formatPrice(effectivePrice)}
            </span>
            {hasSale && (
              <span className="text-base text-[var(--theme-color-text-subtle)] line-through font-semibold">
                {formatPrice(price)}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => addToCart(product)}
              className="px-8 py-3.5 bg-[var(--theme-color-primary)] text-white hover:bg-[var(--theme-color-primary-hover)] font-bold text-xs uppercase tracking-wider rounded-[var(--theme-radius-button)] shadow-md transition-all flex items-center gap-2"
            >
              <ShoppingBag size={15} /> Add to Cart
            </button>
            <button
              type="button"
              onClick={() => openProductModal(product)}
              className="px-6 py-3.5 border border-[var(--theme-color-border)] text-[var(--theme-color-text)] hover:bg-slate-50 font-bold text-xs uppercase tracking-wider rounded-[var(--theme-radius-button)] transition-colors flex items-center gap-2"
            >
              View Details <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
