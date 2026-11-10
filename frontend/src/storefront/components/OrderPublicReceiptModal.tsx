// =============================================================================
// FeraSetu Storefront — Public Order Receipt & Live Tracking Modal
// Triggered when buyer opens https://<store>.ferasetu.com?order=<orderId>
// Human-centered, high-trust receipt showing live order status, handshake PIN,
// itemized breakdown, scannable UPI QR standee, WhatsApp support, and Tax Invoice.
// =============================================================================

import React, { useState, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  Truck,
  Package,
  QrCode,
  Download,
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  ShieldCheck,
  Store,
  Phone,
  MapPin,
  AlertCircle,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStorefront } from '../runtime/StorefrontProvider';
import InvoiceDocumentModal, { type InvoiceModalOrder } from '../../components/orders/InvoiceDocumentModal';

export interface PublicOrderData {
  id: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  items?: Array<{
    name?: string;
    product_name?: string;
    quantity: number;
    price: number;
    image_url?: string;
  }>;
  total: number;
  status: string;
  payment_status?: string;
  payment_method?: string;
  delivery_type?: 'delivery' | 'pickup';
  delivery_code?: string;
  notes?: string;
  invoice_number?: string;
  created_at: string;
  tracking_token?: string;
}

interface OrderPublicReceiptModalProps {
  order: PublicOrderData;
  onClose: () => void;
  shopName: string;
  shopPhone?: string;
  shopLogo?: string;
}

function formatInr(num: number): string {
  return '₹' + Math.round(num).toLocaleString('en-IN');
}

export default function OrderPublicReceiptModal({
  order,
  onClose,
  shopName,
  shopPhone = '',
  shopLogo,
}: OrderPublicReceiptModalProps) {
  const { currencySymbol, currency } = useStorefront();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [showInvoiceDoc, setShowInvoiceDoc] = useState(false);

  const status = (order.status || 'pending').toLowerCase();
  const paymentStatus = (order.payment_status || 'pending').toLowerCase();
  const isPaid = paymentStatus === 'paid' || status === 'delivered';
  const isDelivered = status === 'delivered';
  const isCancelled = status === 'cancelled';
  const isPreparing = status === 'preparing' || status === 'confirmed';

  // Handshake code extraction
  const handshakeCode = useMemo(() => {
    if (order.delivery_code) return order.delivery_code;
    if (typeof order.notes === 'string') {
      const match = order.notes.match(/Code:\s*([A-Z0-9]+)/i);
      if (match && match[1]) return match[1];
    }
    return order.id.slice(0, 6).toUpperCase();
  }, [order.delivery_code, order.notes, order.id]);

  const copyHandshakeCode = () => {
    navigator.clipboard.writeText(handshakeCode);
    setCopiedCode(true);
    toast.success('Security PIN copied to clipboard');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyOrderId = () => {
    navigator.clipboard.writeText(order.id);
    setCopiedOrderId(true);
    toast.success('Order ID copied');
    setTimeout(() => setCopiedOrderId(false), 2000);
  };

  // WhatsApp Support URL
  const whatsappSupportUrl = useMemo(() => {
    const rawPhone = shopPhone.replace(/\D/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const msg = encodeURIComponent(
      `Namaste ${shopName}, I am inquiring about my Order #${order.id.slice(0, 8)} (${formatInr(order.total)}). Could you please share an update?`
    );
    return cleanPhone ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${msg}` : '';
  }, [shopPhone, shopName, order.id, order.total]);

  // Scannable UPI Payment URL & QR Standee
  const upiPaymentUri = useMemo(() => {
    const rawPhone = shopPhone.replace(/\D/g, '');
    const pa = `${rawPhone}@okaxis`; // default merchant VPA fallback
    const pn = encodeURIComponent(shopName);
    const am = order.total || 0;
    const tn = encodeURIComponent(`Order #${order.id.slice(0, 8)}`);
    return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}`;
  }, [shopPhone, shopName, order.id, order.total]);

  const upiQrImageUrl = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiPaymentUri)}`;
  }, [upiPaymentUri]);

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {shopLogo ? (
                <img
                  src={shopLogo}
                  alt={shopName}
                  className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-[#0052FF] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                  <Store size={18} />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                    {shopName}
                  </h3>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Verified Store
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono-tabular">
                  <span>Order #{order.id.slice(0, 8)}</span>
                  <button
                    type="button"
                    onClick={copyOrderId}
                    className="hover:text-slate-900 inline-flex items-center gap-0.5 cursor-pointer"
                    title="Copy full order ID"
                  >
                    {copiedOrderId ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              aria-label="Close receipt"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-5 max-h-[78vh] overflow-y-auto">
            {/* Status Highlight Banner */}
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                isDelivered
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : isCancelled
                  ? 'bg-rose-50 border-rose-200 text-rose-950'
                  : isPreparing
                  ? 'bg-blue-50 border-blue-200 text-blue-950'
                  : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isDelivered
                    ? 'bg-emerald-600 text-white'
                    : isCancelled
                    ? 'bg-rose-600 text-white'
                    : isPreparing
                    ? 'bg-blue-600 text-white'
                    : 'bg-amber-500 text-white'
                }`}
              >
                {isDelivered ? (
                  <CheckCircle2 size={18} />
                ) : isCancelled ? (
                  <AlertCircle size={18} />
                ) : isPreparing ? (
                  <Package size={18} />
                ) : (
                  <Clock size={18} />
                )}
              </div>

              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="font-bold text-sm sm:text-base capitalize">
                  {isDelivered
                    ? 'Order Delivered Successfully'
                    : isCancelled
                    ? 'Order Cancelled'
                    : isPreparing
                    ? 'Order Confirmed & Packing in Progress'
                    : 'Order Placed & Awaiting Store Confirmation'}
                </div>
                <p className="text-xs opacity-85 leading-relaxed">
                  {isDelivered
                    ? 'Your items have been delivered and verified. Thank you for supporting your local independent retailer!'
                    : isCancelled
                    ? 'This order has been cancelled. Any collected funds are refunded to original source.'
                    : isPreparing
                    ? 'The store is packing your items right now. Counter pickup or delivery will be completed shortly.'
                    : 'The store has received your order and will confirm stock momentarily.'}
                </p>
              </div>
            </div>

            {/* Delivery / Handshake PIN (FeraSetu Delivery Protocol) */}
            {!isDelivered && !isCancelled && (
              <div className="p-4 rounded-xl border border-orange-200 bg-orange-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-[11px] font-bold text-orange-950 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-orange-600" />
                    Delivery Handshake Security PIN
                  </div>
                  <p className="text-xs text-orange-800">
                    Share this code with the delivery partner or shop clerk only when receiving your package.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto bg-white px-3.5 py-2 rounded-xl border border-orange-200 shadow-2xs">
                  <span className="font-mono font-black text-xl text-orange-600 tracking-wider">
                    {handshakeCode}
                  </span>
                  <button
                    type="button"
                    onClick={copyHandshakeCode}
                    className="p-1 rounded text-orange-600 hover:text-orange-800 cursor-pointer"
                    title="Copy PIN"
                  >
                    {copiedCode ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            )}

            {/* Ordered Items Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span>Ordered Items</span>
                <span>{order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}</span>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100 text-xs">
                {(order.items || []).map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/50">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">
                        {item.product_name || item.name || 'Store Item'}
                      </div>
                      <div className="text-slate-400 font-mono-tabular text-[11px]">
                        Qty: {item.quantity} × {formatInr(item.price)}
                      </div>
                    </div>
                    <div className="font-bold text-slate-900 font-mono-tabular shrink-0">
                      {formatInr(item.quantity * item.price)}
                    </div>
                  </div>
                ))}

                {/* Total Row */}
                <div className="p-3.5 bg-slate-50 flex items-center justify-between font-bold text-sm text-slate-900">
                  <span>Grand Total</span>
                  <span className="font-mono-tabular text-base text-[#0052FF]">
                    {formatInr(order.total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Details & Direct UPI QR (if pending) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Payment Status
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    isPaid
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {isPaid ? (
                    <>
                      <CheckCircle2 size={12} className="text-emerald-600" />
                      Settled / Paid
                    </>
                  ) : (
                    <>
                      <Clock size={12} className="text-amber-600" />
                      Payment Pending ({formatInr(order.total)})
                    </>
                  )}
                </span>
              </div>

              {!isPaid && (
                <div className="pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row items-center gap-4">
                  <img
                    src={upiQrImageUrl}
                    alt="Scan UPI to Pay"
                    className="w-28 h-28 rounded-xl border border-slate-200 bg-white p-1 shadow-2xs shrink-0"
                  />
                  <div className="space-y-2 text-center sm:text-left flex-1">
                    <div className="text-xs font-semibold text-slate-900">
                      Scan or tap to complete payment with 0% platform commission
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Use GPay, PhonePe, Paytm, or BHIM. Payment goes 100% directly to {shopName}.
                    </p>
                    <a
                      href={upiPaymentUri}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0052FF] text-white text-xs font-bold shadow-xs hover:bg-blue-600 transition-colors"
                    >
                      <QrCode size={13} />
                      <span>Pay via UPI App</span>
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Customer & Delivery Address */}
            {(order.customer_name || order.customer_phone || order.customer_address) && (
              <div className="p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Customer &amp; Delivery Details
                </div>
                <div className="font-semibold text-slate-900">
                  {order.customer_name || 'Valued Customer'}
                  {order.customer_phone && <span className="text-slate-500 font-mono-tabular font-normal ml-2">({order.customer_phone})</span>}
                </div>
                {order.customer_address && (
                  <div className="text-slate-600 flex items-start gap-1.5">
                    <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                    <span>{order.customer_address}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Action Strip */}
          <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              {whatsappSupportUrl && (
                <a
                  href={whatsappSupportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-2xs"
                >
                  <MessageCircle size={14} />
                  <span>WhatsApp Store</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => setShowInvoiceDoc(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <FileText size={14} />
                <span>Tax Invoice PDF</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer ml-auto"
            >
              Back to Store
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Official Tax Invoice Document Modal */}
      {showInvoiceDoc && (
        <InvoiceDocumentModal
          order={order as unknown as InvoiceModalOrder}
          merchantName={shopName}
          onClose={() => setShowInvoiceDoc(false)}
        />
      )}
    </>
  );
}
