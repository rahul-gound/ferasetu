import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  QrCode,
  CheckCircle2,
  Copy,
  Check,
  Share2,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  Download,
  Store,
  DollarSign,
  AlertCircle,
  Smartphone,
  CheckCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import QrCodeView from '../common/QrCodeView';
import { buildUpiUri, isValidUpiId } from '../../utils/qrCodeGenerator';
import { getStorefrontUrl } from '../../utils/canonicalHostname';
import { useAuth } from '../../contexts/AuthContext';

export interface OrderPaymentTarget {
  id: string;
  customer_name?: string;
  customerName?: string;
  customer_phone?: string;
  customerPhone?: string;
  total?: number;
  total_minor?: number;
  currency?: string;
  payment_status?: string;
  paymentStatus?: string;
  status?: string;
  items?: any[];
  items_count?: number;
  invoice_number?: string;
  invoiceNumber?: string;
  delivery_type?: string;
  deliveryType?: string;
  notes?: string;
  created_at?: string;
}

interface OrderPaymentQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderPaymentTarget | null;
  user: any;
  onPaymentConfirmed?: (orderId: string) => void;
}

export default function OrderPaymentQrModal({
  isOpen,
  onClose,
  order,
  user,
  onPaymentConfirmed,
}: OrderPaymentQrModalProps) {
  const { updateUser } = useAuth();

  // Resolved payment state
  const [isPaid, setIsPaid] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Link & message copy state
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // QR Tab state: 'upi' | 'store'
  const [activeTab, setActiveTab] = useState<'upi' | 'store'>('upi');

  // Inline UPI configuration state (if merchant hasn't set one yet)
  const initialUpi = useMemo(() => {
    return (
      user?.upi_id ||
      user?.payment_settings?.upi_id ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('fera_upi_id') : '') ||
      ''
    );
  }, [user]);

  const [upiIdInput, setUpiIdInput] = useState(initialUpi);
  const [savedUpiId, setSavedUpiId] = useState(initialUpi);
  const [isEditingUpi, setIsEditingUpi] = useState(!initialUpi);

  // Sync internal state when order or modal opens
  useEffect(() => {
    if (order) {
      const currentPaid =
        order.payment_status === 'paid' ||
        order.paymentStatus === 'paid';
      setIsPaid(currentPaid);
    }
  }, [order, isOpen]);

  useEffect(() => {
    if (isOpen) {
      const currentUpi =
        user?.upi_id ||
        user?.payment_settings?.upi_id ||
        (typeof localStorage !== 'undefined' ? localStorage.getItem('fera_upi_id') : '') ||
        '';
      setSavedUpiId(currentUpi);
      setUpiIdInput(currentUpi);
      setIsEditingUpi(!currentUpi);
      setActiveTab(currentUpi ? 'upi' : 'store');
    }
  }, [isOpen, user]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isConfirming) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isConfirming, onClose]);

  if (!isOpen || !order) return null;

  const totalAmount = Number(order.total || (order.total_minor ? order.total_minor / 100 : 0));
  const orderShortId = order.id ? `#${order.id.slice(-8).toUpperCase()}` : '';
  const customerName = order.customer_name || order.customerName || 'Customer';
  const customerPhone = order.customer_phone || order.customerPhone || '';
  const storeName = user?.business_name || user?.name || 'Our Store';

  // Storefront Order Link
  const storeBaseUrl = getStorefrontUrl(user);
  const orderTrackingUrl = `${storeBaseUrl}?order=${order.id}`;

  // Build Real Scannable UPI URI with exact order amount
  const cleanUpi = savedUpiId.trim();
  const hasValidUpi = cleanUpi.length > 0 && isValidUpiId(cleanUpi);

  const realUpiUri = hasValidUpi
    ? buildUpiUri({
        upiId: cleanUpi,
        payeeName: storeName,
        amount: totalAmount > 0 ? totalAmount : undefined,
        note: `Order ${orderShortId} at ${storeName}`,
      })
    : '';

  // Active QR value
  const activeQrValue = activeTab === 'upi' && realUpiUri ? realUpiUri : orderTrackingUrl;

  // Save UPI ID handler
  const handleSaveUpiId = () => {
    const trimmed = upiIdInput.trim();
    if (!trimmed) {
      toast.error('Please enter your UPI ID (e.g. yourname@okhdfcbank or 9876543210@paytm)');
      return;
    }
    if (!isValidUpiId(trimmed)) {
      toast.error('Please enter a valid UPI ID (e.g. name@bank, phone@paytm)');
      return;
    }

    try {
      localStorage.setItem('fera_upi_id', trimmed);
      localStorage.setItem('fera_payment_configured', 'true');
      setSavedUpiId(trimmed);
      setIsEditingUpi(false);
      setActiveTab('upi');
      if (updateUser) {
        updateUser({
          ...(trimmed ? { upi_id: trimmed } : {}),
          payment_settings: {
            upi_id: trimmed,
            payee_name: storeName,
            accept_upi: true,
          },
        } as any);
      }
      toast.success('UPI ID saved! Dynamic payment QR generated.');
    } catch {
      toast.error('Could not save UPI ID');
    }
  };

  // Copy Store / Order Link
  const handleCopyOrderLink = async () => {
    try {
      await navigator.clipboard.writeText(orderTrackingUrl);
      setCopiedLink(true);
      toast.success('Order link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  // Copy UPI Address
  const handleCopyUpi = async () => {
    if (!cleanUpi) return;
    try {
      await navigator.clipboard.writeText(cleanUpi);
      setCopiedUpi(true);
      toast.success('UPI address copied!');
      setTimeout(() => setCopiedUpi(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  // Share order on WhatsApp
  const handleShareWhatsApp = () => {
    const message = `Namaste ${customerName}! 🛍️\nHere is your order *${orderShortId}* from *${storeName}*:\n💵 *Total: ₹${totalAmount.toLocaleString('en-IN')}*\n\n👉 *Review your order & track details here:*\n${orderTrackingUrl}\n\nThank you for shopping with us! 🙏`;

    const cleanPhone = customerPhone.replace(/\D/g, '');
    let targetUrl = '';
    if (cleanPhone) {
      const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      targetUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    } else {
      targetUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    }
    window.open(targetUrl, '_blank');
  };

  // Self Confirm Payment ("can confirm by itself")
  const handleConfirmPayment = async () => {
    setIsConfirming(true);
    try {
      // 1. Mark payment as paid
      await api.patch(`/orders/${order.id}/payment`, { payment_status: 'paid' });

      // 2. Also ensure status is confirmed if it was pending
      try {
        await api.patch(`/orders/${order.id}/status`, { status: 'confirmed' });
      } catch (err) {
        // Status may already be confirmed or handled
      }

      setIsPaid(true);
      toast.success(`Payment of ₹${totalAmount.toLocaleString('en-IN')} confirmed for Order ${orderShortId}!`);
      if (onPaymentConfirmed) {
        onPaymentConfirmed(order.id);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update payment status.');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1600] flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-qr-title"
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-xs">
              <QrCode size={20} strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="payment-qr-title" className="text-base font-bold text-slate-900">
                  Payment QR & Order Link
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                  {orderShortId}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Customer scans to pay via UPI or click order link
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Order Summary Strip */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 font-medium">
                Customer: <span className="font-bold text-slate-800">{customerName}</span>
                {customerPhone && <span className="text-slate-400 ml-1">({customerPhone})</span>}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {order.items_count || order.items?.length || 0} item(s) •{' '}
                {order.delivery_type === 'delivery' || order.deliveryType === 'delivery'
                  ? 'Delivery'
                  : 'Store Pickup'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                Total Payable
              </div>
              <div className="text-lg font-black text-slate-900">
                ₹{totalAmount.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Payment Status Ribbon */}
          {isPaid ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
                <span className="text-xs font-bold text-emerald-900">
                  Payment Confirmed (Paid via Cash / UPI)
                </span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Settled
              </span>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} className="text-amber-600 flex-shrink-0" />
                <span className="text-xs font-bold text-amber-900">
                  Payment Pending: ₹{totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Unpaid
              </span>
            </div>
          )}

          {/* QR Code Tabs (UPI Payment QR vs Store Link QR) */}
          <div className="space-y-3">
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('upi')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'upi'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone size={14} className={activeTab === 'upi' ? 'text-orange-600' : ''} />
                <span>UPI Payment QR (₹{totalAmount.toLocaleString('en-IN')})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('store')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'store'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Store size={14} className={activeTab === 'store' ? 'text-blue-600' : ''} />
                <span>Store Link QR</span>
              </button>
            </div>

            {/* UPI QR Mode */}
            {activeTab === 'upi' && (
              <div>
                {!hasValidUpi || isEditingUpi ? (
                  <div className="p-4 bg-orange-50/60 border border-orange-200 rounded-xl space-y-3">
                    <div className="flex items-start gap-2">
                      <Smartphone size={16} className="text-orange-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          Add Your UPI ID to Receive Direct Payments
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Payments go straight into your bank account. 0% platform commission.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={upiIdInput}
                        onChange={(e) => setUpiIdInput(e.target.value)}
                        placeholder="e.g. mobile@paytm or name@okaxis"
                        className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-orange-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleSaveUpiId}
                        className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                      >
                        Save & Show QR
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    {/* Live Scannable UPI QR */}
                    <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-200 mb-2">
                      <QrCodeView
                        value={realUpiUri}
                        size={180}
                        level="M"
                        centerBadgeText="₹"
                        downloadable={true}
                        downloadFileName={`payment-qr-${orderShortId.replace('#', '')}.png`}
                      />
                    </div>

                    {/* QR Details */}
                    <div className="text-center space-y-1">
                      <div className="text-xs font-extrabold text-slate-900">
                        Scan to Pay ₹{totalAmount.toLocaleString('en-IN')}
                      </div>
                      <div className="flex items-center justify-center gap-1.5 text-xs text-slate-600 font-mono">
                        <span>UPI: {cleanUpi}</span>
                        <button
                          type="button"
                          onClick={handleCopyUpi}
                          className="p-1 text-slate-400 hover:text-slate-800 rounded transition-colors"
                          title="Copy UPI ID"
                        >
                          {copiedUpi ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        Supported: Google Pay • PhonePe • Paytm • BHIM • Any UPI App
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEditingUpi(true)}
                        className="text-[10px] text-orange-600 hover:underline font-semibold mt-1 inline-block"
                      >
                        Change UPI ID
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Store Link QR Mode */}
            {activeTab === 'store' && (
              <div className="flex flex-col items-center p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-200 mb-2">
                  <QrCodeView
                    value={orderTrackingUrl}
                    size={180}
                    level="M"
                    centerBadgeText="FS"
                    downloadable={true}
                    downloadFileName={`store-order-${orderShortId.replace('#', '')}.png`}
                  />
                </div>
                <div className="text-center space-y-1">
                  <div className="text-xs font-extrabold text-slate-900">
                    Scan to Open Order & Storefront
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium max-w-xs truncate font-mono">
                    {orderTrackingUrl}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Order Link Sharing Box */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Share Order Link with Customer
            </span>
            <div className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 select-all overflow-hidden">
              <span className="truncate flex-1">{orderTrackingUrl}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyOrderLink}
                className="py-2 px-3 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copiedLink ? 'Copied Link!' : 'Copy Link'}</span>
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="py-2 px-3 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <MessageCircle size={14} />
                <span>Send on WhatsApp</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 space-y-2">
          {/* Direct Confirm Payment Button ("can confirm by itself") */}
          {!isPaid ? (
            <button
              type="button"
              onClick={handleConfirmPayment}
              disabled={isConfirming}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 size={18} strokeWidth={2.2} />
              <span>
                {isConfirming
                  ? 'Confirming Payment...'
                  : `Confirm Payment Received (Cash / UPI) — ₹${totalAmount.toLocaleString('en-IN')}`}
              </span>
            </button>
          ) : (
            <div className="w-full py-2.5 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs flex items-center justify-center gap-2">
              <CheckCheck size={16} className="text-emerald-600" />
              <span>Payment has been received and verified</span>
            </div>
          )}

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 px-4 rounded-xl border border-slate-300 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
