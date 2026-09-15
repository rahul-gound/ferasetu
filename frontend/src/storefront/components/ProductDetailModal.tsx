import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Minus,
  ShoppingBag,
  MessageCircle,
  Truck,
  ShieldCheck,
  RotateCcw,
  Check,
} from 'lucide-react';
import { useStorefront } from '../runtime/StorefrontProvider';
import { formatPrice, calculateDiscount, sanitizeText } from '../utilities/formatting';
import { handleImageFallback, getProductPlaceholderSvg } from '../utilities/imageFallback';
import { resolveMediaUrl } from '../../utils/media';

export default function ProductDetailModal() {
  const {
    selectedProduct,
    closeProductModal,
    addToCart,
    openWhatsAppInquiry,
    products,
    openProductModal,
  } = useStorefront();

  const [quantity, setQuantity] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'description' | 'shipping' | 'returns'>('description');
  const [selectedOptionValues, setSelectedOptionValues] = useState<Record<string, string>>({});

  // Reset quantity and options when product changes
  useEffect(() => {
    setQuantity(1);
    setActiveTab('description');
    if (selectedProduct?.options && selectedProduct.options.length > 0) {
      const initial: Record<string, string> = {};
      for (const opt of selectedProduct.options) {
        if (opt.values && opt.values.length > 0) {
          initial[opt.name] = opt.values[0];
        }
      }
      setSelectedOptionValues(initial);
    } else {
      setSelectedOptionValues({});
    }
  }, [selectedProduct]);

  // Escape key closes modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeProductModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeProductModal]);

  // Related products from same category
  const relatedProducts = useMemo(() => {
    if (!selectedProduct) return [];
    return products
      .filter(
        (p) =>
          p.id !== selectedProduct.id &&
          p.is_active === 1 &&
          p.category &&
          selectedProduct.category &&
          p.category.toLowerCase() === selectedProduct.category.toLowerCase()
      )
      .slice(0, 4);
  }, [selectedProduct, products]);

  const activeVariant = useMemo(() => {
    if (!selectedProduct?.variants || selectedProduct.variants.length === 0) return null;
    return selectedProduct.variants.find((v) => {
      if (v.status && v.status !== 'active') return false;
      if (!v.option_values) return false;
      return Object.entries(selectedOptionValues).every(
        ([optName, optVal]) => (v.option_values?.[optName] || '').toLowerCase() === (optVal || '').toLowerCase()
      );
    }) || selectedProduct.variants[0];
  }, [selectedProduct, selectedOptionValues]);

  if (!selectedProduct) return null;

  const price = activeVariant ? activeVariant.price : selectedProduct.price;
  const salePrice = activeVariant ? (activeVariant.compare_at_price ?? undefined) : selectedProduct.sale_price;
  const hasSale = salePrice != null && salePrice > 0 && salePrice < price;
  const discount = calculateDiscount(price, salePrice);
  const isOutOfStock = selectedProduct.stock_quantity <= 0;
  const isLowStock = selectedProduct.stock_quantity > 0 && selectedProduct.stock_quantity <= 3;
  const effectivePrice = hasSale ? salePrice! : price;

  const title = sanitizeText(selectedProduct.name);
  const category = sanitizeText(selectedProduct.category || 'General');
  const description = sanitizeText(
    selectedProduct.description || 'Quality merchandise curated and verified by our merchant.'
  );

  const handleAddToCart = () => {
    addToCart(selectedProduct, quantity, activeVariant || undefined);
  };

  const handleBuyNow = () => {
    addToCart(selectedProduct, quantity, activeVariant || undefined);
    closeProductModal();
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={closeProductModal}
    >
      <div
        className="relative w-full max-w-4xl bg-white rounded-[var(--theme-radius-card)] shadow-2xl overflow-hidden my-auto border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={closeProductModal}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/90 hover:bg-slate-100 text-slate-700 flex items-center justify-center shadow-md transition-colors"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Left: Product Media Gallery */}
          <div className="p-6 md:p-8 bg-slate-50 flex flex-col justify-center items-center border-b md:border-b-0 md:border-r border-slate-100">
            <div
              className="relative w-full overflow-hidden rounded-[var(--theme-radius-md)] bg-white border border-slate-200 shadow-sm"
              style={{ aspectRatio: '1/1' }}
            >
              <img
                src={resolveMediaUrl(activeVariant?.media_key || activeVariant?.image_url) || resolveMediaUrl(selectedProduct.media_key || selectedProduct.image_url) || getProductPlaceholderSvg(selectedProduct.name)}
                alt={title}
                onError={(e) => handleImageFallback(e, selectedProduct.name)}
                className="w-full h-full object-contain p-4"
              />
              {hasSale && (
                <div className="absolute top-3 left-3 bg-red-600 text-white font-black text-xs px-2.5 py-1 rounded shadow-sm">
                  {discount}% OFF
                </div>
              )}
            </div>
          </div>

          {/* Right: Product Details & Purchase Actions */}
          <div className="p-6 md:p-8 flex flex-col max-h-[85vh] overflow-y-auto">
            {/* Category Breadcrumb */}
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Catalog &gt; {category}
            </div>

            {/* Product Title */}
            <h1
              className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight mb-3"
              style={{ fontFamily: 'var(--theme-font-heading)' }}
            >
              {title}
            </h1>

            {/* Pricing Section */}
            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {formatPrice(effectivePrice)}
              </span>
              {hasSale && (
                <>
                  <span className="text-base text-slate-400 line-through font-semibold">
                    {formatPrice(price)}
                  </span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Save {formatPrice(price - salePrice!)}
                  </span>
                </>
              )}
            </div>

            {/* Stock Level Status */}
            <div className="mb-6">
              {isOutOfStock ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-red-50 text-red-700 text-xs font-bold border border-red-200">
                  <span className="w-2 h-2 rounded-full bg-red-600" />
                  Currently Out of Stock
                </div>
              ) : isLowStock ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Only {selectedProduct.stock_quantity} remaining in stock
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  In Stock & Ready for Dispatch
                </div>
              )}
            </div>

            {/* Options / Variant Selectors */}
            {selectedProduct.options && selectedProduct.options.length > 0 && (
              <div className="mb-6 space-y-4">
                {selectedProduct.options.map((option) => (
                  <div key={option.id || option.name}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        {option.name}:
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {selectedOptionValues[option.name] || 'Select'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {option.values.map((val) => {
                        const isSelected = selectedOptionValues[option.name] === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setSelectedOptionValues((prev) => ({ ...prev, [option.name]: val }))}
                            className={`px-3 py-1.5 rounded text-xs font-bold transition-all border ${
                              isSelected
                                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-300 hover:border-slate-500'
                            }`}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quantity Selector */}
            {!isOutOfStock && (
              <div className="mb-6 flex items-center gap-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Quantity:
                </span>
                <div className="inline-flex items-center border border-slate-300 rounded-[var(--theme-radius-button)] bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="p-2 text-slate-600 hover:bg-slate-100 transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus size={15} />
                  </button>
                  <span className="w-12 text-center text-sm font-bold text-slate-800">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((q) =>
                        selectedProduct.stock_quantity > 0
                          ? Math.min(selectedProduct.stock_quantity, q + 1)
                          : q + 1
                      )
                    }
                    className="p-2 text-slate-600 hover:bg-slate-100 transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5 mb-6">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={handleAddToCart}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-[var(--theme-radius-button)] bg-[var(--theme-color-primary)] text-white font-bold text-sm hover:bg-[var(--theme-color-primary-hover)] shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingBag size={17} /> Add to Cart
                </button>
                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={handleBuyNow}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-[var(--theme-radius-button)] bg-slate-900 text-white font-bold text-sm hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Buy Now
                </button>
              </div>

              <button
                type="button"
                onClick={() => openWhatsAppInquiry(selectedProduct)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-[var(--theme-radius-button)] border-2 border-emerald-600 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/70 font-bold text-sm transition-colors"
              >
                <MessageCircle size={17} className="text-emerald-600" />
                Ask Question on WhatsApp
              </button>
            </div>

            {/* Information Tabs */}
            <div className="border-t border-slate-200 pt-4 mt-auto">
              <div className="flex gap-4 border-b border-slate-200 mb-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('description')}
                  className={`pb-2 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                    activeTab === 'description'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Description
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('shipping')}
                  className={`pb-2 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                    activeTab === 'shipping'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Shipping
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('returns')}
                  className={`pb-2 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                    activeTab === 'returns'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Returns
                </button>
              </div>

              <div className="text-sm text-slate-600 leading-relaxed min-h-[60px]">
                {activeTab === 'description' && (
                  <p>{description}</p>
                )}
                {activeTab === 'shipping' && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-slate-800 font-medium">
                      <Truck size={16} className="text-emerald-600" />
                      Dispatch within 24–48 hours across India.
                    </div>
                    <p className="text-xs text-slate-500">
                      Cash on Delivery and Prepaid options available at checkout. Tracking updates delivered directly to your contact number.
                    </p>
                  </div>
                )}
                {activeTab === 'returns' && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-slate-800 font-medium">
                      <RotateCcw size={16} className="text-blue-600" />
                      Hassle-free 7-day inspection and exchange.
                    </div>
                    <p className="text-xs text-slate-500">
                      In the rare event of transit damage or mismatch, simply contact the merchant via WhatsApp for an immediate resolution.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Related Products row */}
            {relatedProducts.length > 0 && (
              <div className="border-t border-slate-200 pt-5 mt-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  You Might Also Like
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  {relatedProducts.map((rel) => (
                    <div
                      key={rel.id}
                      onClick={() => openProductModal(rel)}
                      className="cursor-pointer group flex flex-col"
                    >
                      <div className="relative overflow-hidden rounded bg-slate-100 border border-slate-200 aspect-square mb-1">
                        <img
                          src={resolveMediaUrl(rel.media_key || rel.image_url) || getProductPlaceholderSvg(rel.name)}
                          alt={rel.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-800 line-clamp-1">
                        {rel.name}
                      </span>
                      <span className="text-[11px] font-bold text-slate-900">
                        {formatPrice(rel.sale_price || rel.price)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
