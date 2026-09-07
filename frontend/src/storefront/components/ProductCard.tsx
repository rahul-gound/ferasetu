import React, { useState } from 'react';
import { ShoppingBag, Eye, MessageCircle, ArrowRight } from 'lucide-react';
import type { ShopProduct } from '../../types/template';
import type { CardVariant } from '../theme/themeTypes';
import { useStorefront } from '../runtime/StorefrontProvider';
import { formatPrice, calculateDiscount, sanitizeText } from '../utilities/formatting';
import { handleImageFallback, getProductPlaceholderSvg } from '../utilities/imageFallback';

interface ProductCardProps {
  product: ShopProduct;
  variant?: CardVariant;
  showStock?: boolean;
}

export default function ProductCard({
  product,
  variant = 'clean',
  showStock = true,
}: ProductCardProps) {
  const { addToCart, openProductModal, openWhatsAppInquiry } = useStorefront();
  const [isHovered, setIsHovered] = useState(false);

  const price = product.price;
  const salePrice = product.sale_price;
  const hasSale = salePrice != null && salePrice > 0 && salePrice < price;
  const discount = calculateDiscount(price, salePrice);
  const isOutOfStock = product.stock_quantity <= 0;
  const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= 3;
  const effectivePrice = hasSale ? salePrice! : price;

  const title = sanitizeText(product.name);
  const category = sanitizeText(product.category || 'General');

  // ─────────────────────────────────────────────────────────────
  // 1. EDITORIAL VARIANT (Atelier: Luxury, 3:4 portrait, minimalist)
  // ─────────────────────────────────────────────────────────────
  if (variant === 'editorial') {
    return (
      <div
        role="group"
        aria-label={title}
        className="group relative flex flex-col cursor-pointer transition-all duration-300"
        onClick={() => openProductModal(product)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className="relative w-full overflow-hidden bg-[#F7F5F0] border border-[var(--theme-color-border-subtle)]"
          style={{ aspectRatio: '3/4', borderRadius: 'var(--theme-radius-card)' }}
        >
          <img
            src={product.image_url || getProductPlaceholderSvg(product.name, '#121212')}
            alt={title}
            loading="lazy"
            onError={(e) => handleImageFallback(e, product.name)}
            className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
          />

          {isOutOfStock && (
            <div className="absolute top-3 left-3 bg-[#121212] text-[#FDFCF7] px-2.5 py-1 text-[10px] tracking-wider uppercase font-medium">
              Archive Only
            </div>
          )}

          {/* Subtle Quick View Overlay */}
          <div
            className={`absolute inset-0 bg-black/20 flex items-center justify-center gap-2 transition-opacity duration-300 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openProductModal(product);
              }}
              className="bg-white/95 text-[#121212] hover:bg-white text-xs px-4 py-2.5 tracking-wider uppercase font-medium shadow-md transition-all transform translate-y-1 group-hover:translate-y-0"
            >
              View Piece
            </button>
          </div>
        </div>

        <div className="pt-4 flex flex-col">
          <div className="text-[11px] tracking-widest text-[var(--theme-color-text-subtle)] uppercase mb-1">
            {category}
          </div>
          <h3
            className="text-[15px] font-normal text-[var(--theme-color-text)] tracking-tight leading-snug line-clamp-1 mb-1.5"
            style={{ fontFamily: 'var(--theme-font-heading)' }}
          >
            {title}
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-[15px] font-medium text-[var(--theme-color-text)] tracking-tight">
              {formatPrice(effectivePrice)}
            </span>
            {hasSale && (
              <span className="text-xs text-[var(--theme-color-text-subtle)] line-through">
                {formatPrice(price)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. MONO VARIANT (Mono: Swiss minimal, 0px radius, 1px rules)
  // ─────────────────────────────────────────────────────────────
  if (variant === 'mono') {
    return (
      <div
        role="group"
        aria-label={title}
        className="group relative flex flex-col bg-white border border-[var(--theme-color-border)] p-4 transition-colors duration-150 hover:border-black cursor-pointer"
        onClick={() => openProductModal(product)}
      >
        <div
          className="relative w-full overflow-hidden bg-[#FAFAFA] border-b border-[var(--theme-color-border)] mb-4"
          style={{ aspectRatio: '1/1' }}
        >
          <img
            src={product.image_url || getProductPlaceholderSvg(product.name, '#000000')}
            alt={title}
            loading="lazy"
            onError={(e) => handleImageFallback(e, product.name)}
            className="w-full h-full object-contain p-4 transition-transform duration-200 group-hover:scale-105"
          />
          {hasSale && (
            <div className="absolute top-2 left-2 bg-black text-white px-2 py-0.5 text-[11px] font-mono tracking-tight">
              -{discount}%
            </div>
          )}
        </div>

        <div className="flex justify-between items-baseline text-xs text-[var(--theme-color-text-muted)] font-mono uppercase mb-1">
          <span>{category}</span>
          <span>{isOutOfStock ? 'OUT OF STOCK' : `STK: ${product.stock_quantity}`}</span>
        </div>

        <h3 className="text-sm font-semibold text-black tracking-tight line-clamp-1 mb-2">
          {title}
        </h3>

        <div className="mt-auto flex items-center justify-between pt-2 border-t border-[var(--theme-color-border-subtle)]">
          <span className="text-sm font-bold font-mono text-black">
            {formatPrice(effectivePrice)}
          </span>
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={(e) => {
              e.stopPropagation();
              addToCart(product);
            }}
            className="text-xs uppercase font-mono px-3 py-1 bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors"
          >
            {isOutOfStock ? 'Sold' : '+ Cart'}
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 3. BOLD VARIANT (Bold: D2C contemporary, 12px radius, pill CTAs)
  // ─────────────────────────────────────────────────────────────
  if (variant === 'bold') {
    return (
      <div
        role="group"
        aria-label={title}
        className="group relative flex flex-col bg-white rounded-[var(--theme-radius-card)] overflow-hidden border border-[var(--theme-color-border)] shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer"
        onClick={() => openProductModal(product)}
      >
        <div
          className="relative w-full overflow-hidden bg-gray-50"
          style={{ aspectRatio: '4/5' }}
        >
          <img
            src={product.image_url || getProductPlaceholderSvg(product.name, '#2563EB')}
            alt={title}
            loading="lazy"
            onError={(e) => handleImageFallback(e, product.name)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
            {hasSale && (
              <span className="bg-[#F43F5E] text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                Save {discount}%
              </span>
            )}
            {isOutOfStock && (
              <span className="bg-gray-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                Sold Out
              </span>
            )}
          </div>

          {/* Slide-up Cart Action */}
          <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-2 group-hover:translate-y-0">
            <button
              type="button"
              disabled={isOutOfStock}
              onClick={(e) => {
                e.stopPropagation();
                addToCart(product);
              }}
              className="w-full bg-[var(--theme-color-primary)] text-white hover:bg-[var(--theme-color-primary-hover)] font-bold text-xs py-2.5 px-4 rounded-full shadow-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <ShoppingBag size={14} /> Add to Bag
            </button>
          </div>
        </div>

        <div className="p-4 flex flex-col flex-1">
          <span className="text-[11px] font-bold text-[var(--theme-color-accent)] uppercase tracking-wider mb-1">
            {category}
          </span>
          <h3 className="text-[15px] font-bold text-gray-900 line-clamp-1 mb-2 tracking-tight">
            {title}
          </h3>

          <div className="mt-auto flex items-baseline gap-2">
            <span className="text-lg font-black text-gray-900">
              {formatPrice(effectivePrice)}
            </span>
            {hasSale && (
              <span className="text-xs text-gray-400 line-through font-semibold">
                {formatPrice(price)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 4. ARTISAN VARIANT (Artisan: Craft, heritage, tactile warmth)
  // ─────────────────────────────────────────────────────────────
  if (variant === 'artisan') {
    return (
      <div
        role="group"
        aria-label={title}
        className="group relative flex flex-col bg-[#FDFCF9] rounded-[var(--theme-radius-card)] overflow-hidden border border-[#E7DFD5] shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
        onClick={() => openProductModal(product)}
      >
        <div
          className="relative w-full overflow-hidden bg-[#F5EFE6]"
          style={{ aspectRatio: '4/5' }}
        >
          <img
            src={product.image_url || getProductPlaceholderSvg(product.name, '#C25E3E')}
            alt={title}
            loading="lazy"
            onError={(e) => handleImageFallback(e, product.name)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
            <span className="bg-[#C25E3E] text-white text-[10px] font-medium px-2 py-0.5 rounded tracking-wide uppercase">
              Handcrafted
            </span>
            {hasSale && (
              <span className="bg-white/90 text-[#2C221E] text-[10px] font-bold px-2 py-0.5 rounded">
                {discount}% Off
              </span>
            )}
          </div>
        </div>

        <div className="p-4 flex flex-col flex-1">
          <div className="text-[11px] font-medium text-[#A64B2F] tracking-wide uppercase mb-1">
            {category}
          </div>
          <h3
            className="text-[16px] font-semibold text-[#2C221E] line-clamp-1 mb-2"
            style={{ fontFamily: 'var(--theme-font-heading)' }}
          >
            {title}
          </h3>

          <div className="mt-auto pt-2 flex items-center justify-between border-t border-[#EFE8DF]">
            <div className="flex items-baseline gap-2">
              <span className="text-base font-bold text-[#2C221E]">
                {formatPrice(effectivePrice)}
              </span>
              {hasSale && (
                <span className="text-xs text-[#9E8A80] line-through">
                  {formatPrice(price)}
                </span>
              )}
            </div>

            <button
              type="button"
              disabled={isOutOfStock}
              onClick={(e) => {
                e.stopPropagation();
                addToCart(product);
              }}
              className="text-xs font-semibold px-3 py-1.5 bg-[#C25E3E] text-white hover:bg-[#A64B2F] rounded transition-colors disabled:opacity-50"
            >
              {isOutOfStock ? 'Sold' : 'Select'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 5. CLEAN VARIANT (Market: Standard high-converting Indian retail)
  // ─────────────────────────────────────────────────────────────
  return (
    <div
      role="group"
      aria-label={title}
      className="group relative flex flex-col bg-white rounded-[var(--theme-radius-card)] overflow-hidden border border-[var(--theme-color-border)] shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer"
      onClick={() => openProductModal(product)}
    >
      <div
        className="relative w-full overflow-hidden bg-slate-50 border-b border-slate-100"
        style={{ aspectRatio: '1/1' }}
      >
        <img
          src={product.image_url || getProductPlaceholderSvg(product.name, '#0F172A')}
          alt={title}
          loading="lazy"
          onError={(e) => handleImageFallback(e, product.name)}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Discount Badge */}
        {hasSale && (
          <div className="absolute top-2.5 left-2.5 bg-red-600 text-white font-black text-[11px] px-2 py-0.5 rounded shadow-sm">
            {discount}% OFF
          </div>
        )}

        {/* Stock Badge */}
        {showStock && (
          <div className="absolute top-2.5 right-2.5">
            {isOutOfStock ? (
              <span className="bg-slate-700 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                Out of Stock
              </span>
            ) : isLowStock ? (
              <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded">
                Only {product.stock_quantity} Left
              </span>
            ) : null}
          </div>
        )}
      </div>

      <div className="p-3.5 flex flex-col flex-1">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
          {category}
        </div>
        <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug mb-2 min-h-[38px]">
          {title}
        </h3>

        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-lg font-black text-slate-900">
            {formatPrice(effectivePrice)}
          </span>
          {hasSale && (
            <span className="text-xs text-slate-400 line-through font-semibold">
              {formatPrice(price)}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-auto grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={(e) => {
              e.stopPropagation();
              addToCart(product);
            }}
            className="flex items-center justify-center gap-1.5 text-xs font-bold py-2 px-3 rounded bg-[var(--theme-color-primary)] text-white hover:bg-[var(--theme-color-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingBag size={13} /> Cart
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openWhatsAppInquiry(product);
            }}
            className="flex items-center justify-center gap-1.5 text-xs font-bold py-2 px-2 rounded border border-emerald-600 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/70 transition-colors"
          >
            <MessageCircle size={13} className="text-emerald-600" /> WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
