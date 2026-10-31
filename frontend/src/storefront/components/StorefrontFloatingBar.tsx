import React from 'react';
import { ShoppingBag, ArrowRight, MessageCircle } from 'lucide-react';
import { useStorefront } from '../runtime/StorefrontProvider';
import { formatPrice } from '../utilities/formatting';

/**
 * StorefrontFloatingBar:
 * Shopify & Quick-Commerce inspired persistent bottom conversion bar.
 *
 * Cognitive & Ergonomic Invariants:
 * - Fitts's Law: Anchored in the mobile bottom thumb zone (min-h-[48px]).
 * - Hick's Law: 1 clear primary action ('View Bag & Checkout') with direct price visibility.
 * - Loss Aversion: Shopper immediately sees their cart value and item count.
 * - Doherty Threshold: Instant hardware-accelerated slide-up transition (<300ms).
 */
export default function StorefrontFloatingBar() {
  const {
    cartCount,
    cartSubtotal,
    openCart,
    openWhatsAppCartOrder,
    shopPhone,
  } = useStorefront();

  if (cartCount === 0) return null;

  return (
    <div
      role="region"
      aria-label="Active Cart Summary"
      className="fixed bottom-4 left-3 right-3 sm:left-6 sm:right-6 md:left-auto md:right-8 md:bottom-8 z-40 max-w-md ml-auto animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto"
    >
      <div className="bg-slate-900/95 text-white backdrop-blur-md rounded-2xl p-3 sm:p-3.5 shadow-2xl border border-white/10 flex items-center justify-between gap-3 transition-transform active:scale-[0.99]">
        {/* Left: Cart Info & Subtotal */}
        <div
          onClick={openCart}
          className="flex items-center gap-3 cursor-pointer select-none group"
        >
          <div className="relative p-2.5 rounded-xl bg-white/10 text-white group-hover:bg-white/20 transition-colors">
            <ShoppingBag size={20} className="text-white" />
            <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-sm">
              {cartCount}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-slate-300 tracking-wide uppercase">
              Cart Total
            </span>
            <span className="text-base sm:text-lg font-black text-white tracking-tight leading-tight">
              {formatPrice(cartSubtotal)}
            </span>
          </div>
        </div>

        {/* Right: Checkout Buttons */}
        <div className="flex items-center gap-2">
          {shopPhone && (
            <button
              type="button"
              onClick={openWhatsAppCartOrder}
              aria-label="Order on WhatsApp"
              title="Order on WhatsApp"
              className="min-h-[46px] min-w-[46px] p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-all active:scale-95 shadow-md"
            >
              <MessageCircle size={20} />
            </button>
          )}

          <button
            type="button"
            onClick={openCart}
            className="min-h-[46px] px-4 sm:px-5 py-2.5 rounded-xl bg-[var(--theme-color-primary,#2563EB)] text-white hover:opacity-95 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
          >
            <span>Checkout</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
