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
  ShieldCheck,
  Clock,
  Mail,
  FileText,
  Download,
} from 'lucide-react';
import { useStorefront } from '../runtime/StorefrontProvider';
import { formatPrice, sanitizeText } from '../utilities/formatting';
import { handleImageFallback, getProductPlaceholderSvg } from '../utilities/imageFallback';
import { resolveMediaUrl } from '../../utils/media';
import InvoiceDocumentModal from '../../components/orders/InvoiceDocumentModal';

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
    shopName,
  } = useStorefront();

  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'checkout'>('cart');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

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

        {/* Order Confirmed State */}
        {orderSuccess ? (
          <div className="flex-1 p-5 sm:p-6 flex flex-col items-center justify-start text-center overflow-y-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 mt-2 shadow-inner">
              <CheckCircle2 size={38} />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-1 tracking-tight">Order Confirmed!</h3>
            <p className="text-xs text-slate-500 mb-4">
              Thank you! Your order has been securely placed with the store.
            </p>

            {/* Expected Next Step / Status Banner */}
            <div className="w-full bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2.5 mb-3 text-left flex items-start gap-2.5">
              <Clock size={16} className="text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                  Status: Pending Merchant Confirmation
                </div>
                <div className="text-[11px] text-amber-700 leading-snug">
                  The merchant has received your order and will prepare it shortly.
                </div>
              </div>
            </div>

            {/* OTP Security Notification Banner */}
            <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-3.5 mb-4 text-left flex items-start gap-2.5">
              <ShieldCheck size={18} className="text-blue-700 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-blue-900 mb-0.5">
                  Order Verification OTP Sent
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  {orderSuccess.customerEmail && !orderSuccess.customerEmail.includes('@customer.ferasetu.local') ? (
                    <>
                      A secret verification OTP has been emailed to <span className="font-semibold">{orderSuccess.customerEmail}</span>.
                    </>
                  ) : (
                    <>
                      A secret verification OTP has been emailed to your order contact address.
                    </>
                  )}{' '}
                  Please keep this OTP confidential and share it with the merchant or delivery executive <span className="font-semibold">ONLY</span> upon receiving your items.
                </p>
                {orderSuccess.emailStatus === 'QUOTA_EXHAUSTED' && (
                  <p className="text-[10px] text-amber-700 mt-1 font-medium">
                    (Notice: Direct merchant verification active. Your order is confirmed.)
                  </p>
                )}
              </div>
            </div>

            {/* Order Summary Card */}
            <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-left mb-5 space-y-2.5 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Order ID</span>
                <span className="font-mono font-bold text-slate-900">{orderSuccess.id}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Invoice Number</span>
                <span className="font-mono font-bold text-slate-900">{orderSuccess.invoice}</span>
              </div>
              {orderSuccess.deliveryCode && orderSuccess.deliveryCode !== 'N/A' && (
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Delivery Security Code</span>
                  <span className="font-mono font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-200">
                    {orderSuccess.deliveryCode}
                  </span>
                </div>
              )}
              {typeof orderSuccess.total === 'number' && (
                <div className="flex justify-between items-center pt-1 font-bold text-slate-900 text-sm">
                  <span>Total Amount</span>
                  <span>{formatPrice(orderSuccess.total)}</span>
                </div>
              )}
              {orderSuccess.deliveryAddress && (
                <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-700">Delivery Address: </span>
                  {orderSuccess.deliveryAddress}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 w-full mb-3">
              <button
                type="button"
                onClick={() => setShowInvoiceModal(true)}
                className="py-2.5 px-3 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <FileText size={15} />
                <span>View Invoice</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const token = orderSuccess.trackingToken || '';
                  const rawApi = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');
                  const apiBase = rawApi.endsWith('/api') ? rawApi : `${rawApi}/api`;
                  window.open(`${apiBase}/orders/public/${orderSuccess.id}/invoice/pdf?token=${encodeURIComponent(token)}`, '_blank');
                }}
                className="py-2.5 px-3 rounded-lg bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Download size={15} />
                <span>Download PDF</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                clearOrderSuccess();
                setCheckoutStep('cart');
                closeCart();
              }}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm rounded-lg transition-colors border border-slate-200"
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

      {showInvoiceModal && orderSuccess && (
        <InvoiceDocumentModal
          order={{
            id: orderSuccess.id,
            invoice_number: orderSuccess.invoice,
            customer_name: orderSuccess.customerName,
            customer_phone: orderSuccess.customerPhone,
            customer_email: orderSuccess.customerEmail,
            delivery_address: orderSuccess.deliveryAddress,
            delivery_type: orderSuccess.deliveryType,
            total: orderSuccess.total,
            subtotal: orderSuccess.subtotal,
            delivery_fee: orderSuccess.deliveryFee,
            items: orderSuccess.items,
            tracking_token: orderSuccess.trackingToken,
          }}
          onClose={() => setShowInvoiceModal(false)}
          isCustomerView={true}
          trackingToken={orderSuccess.trackingToken}
          merchantName={shopName}
        />
      )}
    </div>
  );
}
