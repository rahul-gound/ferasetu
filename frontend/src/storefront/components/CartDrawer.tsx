import React, { useState } from 'react';
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  MessageCircle,
  Truck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useStorefront } from '../runtime/StorefrontProvider';
import { formatPrice, sanitizeText } from '../utilities/formatting';
import { handleImageFallback, getProductPlaceholderSvg } from '../utilities/imageFallback';
import { resolveMediaUrl } from '../../utils/media';

const FREE_SHIPPING_THRESHOLD = 499;

export default function CartDrawer() {
  const {
    cart,
    isCartOpen,
    closeCart,
    updateCartQuantity,
    removeFromCart,
    cartSubtotal,
    cartCount,
    isSubmittingOrder,
    submitOrder,
    orderSuccess,
    clearOrderSuccess,
    openWhatsAppCartOrder,
  } = useStorefront();

  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'checkout'>('cart');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    deliveryAddress: '',
    deliveryType: 'delivery' as 'delivery' | 'pickup',
    paymentMethod: 'offline' as 'offline' | 'online',
    notes: '',
  });

  if (!isCartOpen) return null;

  const freeShippingProgress = Math.min(100, Math.round((cartSubtotal / FREE_SHIPPING_THRESHOLD) * 100));
  const amountNeeded = Math.max(0, FREE_SHIPPING_THRESHOLD - cartSubtotal);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.customerName.trim()) {
      setErrorMessage('Please enter your full name');
      return;
    }

    if (!formData.customerPhone.trim() || formData.customerPhone.replace(/\D/g, '').length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number');
      return;
    }

    if (formData.deliveryType === 'delivery' && !formData.deliveryAddress.trim()) {
      setErrorMessage('Please enter your complete delivery address');
      return;
    }

    const success = await submitOrder(formData);
    if (!success) {
      setErrorMessage('Failed to place order with store. Please check details or try WhatsApp ordering.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex justify-end bg-black/50 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Cart"
      onClick={closeCart}
    >
      <div
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col overflow-hidden border-l border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
              <ShoppingBag size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Your Shopping Bag</h2>
              <span className="text-xs text-slate-500 font-medium">
                {cartCount} item{cartCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={closeCart}
            className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
            aria-label="Close cart"
          >
            <X size={18} />
          </button>
        </div>

        {/* Order Success State */}
        {orderSuccess ? (
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center overflow-y-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-1">Order Placed Successfully!</h3>
            <p className="text-xs text-slate-500 mb-6">
              Your order has been recorded in the merchant&apos;s system.
            </p>

            <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-4 text-left mb-6 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Order ID:</span>
                <span className="font-mono font-bold text-slate-900">{orderSuccess.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice Number:</span>
                <span className="font-mono font-bold text-slate-900">{orderSuccess.invoice}</span>
              </div>
              {orderSuccess.deliveryCode && orderSuccess.deliveryCode !== 'N/A' && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Delivery Security Code:</span>
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    {orderSuccess.deliveryCode}
                  </span>
                </div>
              )}
              {orderSuccess.paymentOtp && orderSuccess.paymentOtp !== 'N/A' && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Verification OTP:</span>
                  <span className="font-mono font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                    {orderSuccess.paymentOtp}
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                clearOrderSuccess();
                setCheckoutStep('cart');
                closeCart();
              }}
              className="w-full py-3 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-black transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        ) : cart.length === 0 ? (
          /* Empty Cart State */
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
              <ShoppingBag size={32} />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">Your bag is empty</h3>
            <p className="text-xs text-slate-500 mb-6 max-w-xs">
              Explore our curated selection and find something you love.
            </p>
            <button
              type="button"
              onClick={closeCart}
              className="px-6 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-full hover:bg-black transition-colors"
            >
              Explore Products
            </button>
          </div>
        ) : checkoutStep === 'cart' ? (
          /* Cart View */
          <>
            {/* Free Shipping Progress Indicator */}
            <div className="bg-emerald-50/70 border-b border-emerald-100 px-4 py-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-900 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Truck size={14} className="text-emerald-700" />
                  {amountNeeded > 0 ? (
                    <>Add {formatPrice(amountNeeded)} more for Free Shipping</>
                  ) : (
                    <>You&apos;ve unlocked Free Delivery! 🎉</>
                  )}
                </span>
                <span className="text-[11px] font-bold">{freeShippingProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-emerald-200/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                  style={{ width: `${freeShippingProgress}%` }}
                />
              </div>
            </div>

            {/* Line Items List */}
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
              {cart.map((item) => {
                const itemPrice = item.sale_price ?? item.price;
                const itemKey = item.cart_key || (item.variant_id ? `${item.id}__${item.variant_id}` : item.id);
                return (
                  <div key={itemKey} className="py-3.5 flex gap-3 first:pt-0 last:pb-0">
                    <div className="w-16 h-16 rounded-md bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
                      <img
                        src={resolveMediaUrl((item as any).media_key || item.image_url) || getProductPlaceholderSvg(item.name)}
                        alt={item.name}
                        onError={(e) => handleImageFallback(e, item.name)}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 line-clamp-1">
                            {sanitizeText(item.name)}
                          </h4>
                          {item.variant_title && (
                            <span className="inline-block mt-0.5 text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {item.variant_title}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(itemKey)}
                          className="text-slate-400 hover:text-red-600 p-0.5 transition-colors"
                          aria-label="Remove item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        {/* Quantity Controls */}
                        <div className="flex items-center border border-slate-200 rounded bg-white">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(itemKey, -1)}
                            className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 text-xs"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-slate-800">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(itemKey, 1)}
                            className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 text-xs"
                          >
                            <Plus size={11} />
                          </button>
                        </div>

                        {/* Price */}
                        <span className="text-xs font-black text-slate-900">
                          {formatPrice(itemPrice * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Summary & Triggers */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-sm font-bold text-slate-900">
                <span>Subtotal</span>
                <span>{formatPrice(cartSubtotal)}</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Taxes and shipping calculated at final confirmation.
              </p>

              <button
                type="button"
                onClick={() => setCheckoutStep('checkout')}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-[var(--theme-radius-button)] bg-[var(--theme-color-primary)] text-white font-bold text-sm hover:bg-[var(--theme-color-primary-hover)] shadow-md transition-all"
              >
                Proceed to Checkout <ArrowRight size={15} />
              </button>

              <button
                type="button"
                onClick={() => openWhatsAppCartOrder()}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-[var(--theme-radius-button)] border border-emerald-600 text-emerald-700 bg-white hover:bg-emerald-50 font-bold text-xs transition-colors"
              >
                <MessageCircle size={15} className="text-emerald-600" />
                Quick Checkout on WhatsApp
              </button>
            </div>
          </>
        ) : (
          /* Checkout Form View */
          <form onSubmit={handleCheckoutSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCheckoutStep('cart')}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
              >
                ← Back to Cart
              </button>
              <span className="text-xs font-bold text-slate-800">
                Total: {formatPrice(cartSubtotal)}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {errorMessage && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded text-xs font-medium flex items-center gap-2">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="e.g. Ramesh Patel"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Mobile Number (for delivery OTP) *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  placeholder="10-digit mobile number"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Delivery Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, deliveryType: 'delivery' })}
                    className={`py-2 px-3 rounded text-xs font-bold border transition-colors ${
                      formData.deliveryType === 'delivery'
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    Home Delivery
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, deliveryType: 'pickup' })}
                    className={`py-2 px-3 rounded text-xs font-bold border transition-colors ${
                      formData.deliveryType === 'pickup'
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    Store Pickup
                  </button>
                </div>
              </div>

              {formData.deliveryType === 'delivery' && (
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Delivery Address *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={formData.deliveryAddress}
                    onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                    placeholder="House/Shop no., Street, Area, City, PIN code"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-slate-900 focus:outline-none resize-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Payment Method
                </label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-800 flex items-center justify-between">
                  <span>Cash on Delivery / UPI on Delivery</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                    Safe &amp; Verified
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Special Instructions
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Ring bell, deliver after 4 PM"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button
                type="submit"
                disabled={isSubmittingOrder}
                className="w-full py-3 px-4 rounded-[var(--theme-radius-button)] bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmittingOrder ? 'Placing Order…' : `Confirm Order (${formatPrice(cartSubtotal)})`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
