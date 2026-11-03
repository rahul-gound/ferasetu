import React, { useState } from 'react';
import {
  X,
  Printer,
  Download,
  Copy,
  Check,
  Store,
  QrCode,
  Banknote,
  ExternalLink,
  Sparkles,
  Settings,
  Share2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import QrCodeView from '../common/QrCodeView';
import { buildUpiUri, isValidUpiId } from '../../utils/qrCodeGenerator';

interface CounterQrModalProps {
  open: boolean;
  onClose: () => void;
  storeUrl: string;
  businessName: string;
  upiId?: string;
  onOpenPaymentSetup?: () => void;
}

type QrTab = 'store' | 'upi';

export default function CounterQrModal({
  open,
  onClose,
  storeUrl,
  businessName,
  upiId,
  onOpenPaymentSetup,
}: CounterQrModalProps) {
  const [activeTab, setActiveTab] = useState<QrTab>(upiId ? 'upi' : 'store');
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const cleanUpi = upiId?.trim() || '';
  const hasValidUpi = cleanUpi.length > 0 && isValidUpiId(cleanUpi);

  const realUpiUri = hasValidUpi
    ? buildUpiUri({
        upiId: cleanUpi,
        payeeName: businessName || 'My Store',
        note: `Payment to ${businessName || 'Store'}`,
      })
    : '';

  const activeValue = activeTab === 'store' ? storeUrl : realUpiUri || storeUrl;

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeValue);
      setCopied(true);
      toast.success(
        activeTab === 'store' ? 'Store link copied' : 'UPI address copied'
      );
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleShareWhatsApp = () => {
    const text =
      activeTab === 'store'
        ? encodeURIComponent(
            `🛍️ Welcome to *${businessName || 'our shop'}*!\nBrowse our full catalog and place orders directly:\n👉 ${storeUrl}`
          )
        : encodeURIComponent(
            `💸 Pay *${businessName || 'our shop'}* directly via UPI:\nUPI ID: *${cleanUpi}*\n👉 Scan our official counter QR code or pay to ${cleanUpi}`
          );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="counter-qr-title"
    >
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <QrCode size={18} strokeWidth={2} />
            </div>
            <div>
              <h2 id="counter-qr-title" className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                Dukaan Counter QR Standee
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Print or display at your shop checkout counter
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher: Storefront vs Direct UPI */}
        <div className="p-4 sm:px-6 pb-0">
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setActiveTab('store')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'store'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Store size={14} />
              <span>Catalog & Orders</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('upi')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'upi'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Banknote size={14} />
              <span>Direct UPI Payment</span>
            </button>
          </div>
        </div>

        {/* Standee Content Card */}
        <div className="p-5 sm:p-6 space-y-4 text-center">
          {activeTab === 'upi' && !hasValidUpi ? (
            /* Warning if UPI not yet configured */
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <Banknote size={24} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">UPI Not Configured Yet</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Add your UPI ID (Google Pay, PhonePe, Paytm, or bank) to generate a scannable payment QR code.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPaymentSetup?.();
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Settings size={14} />
                <span>Configure UPI ID Now</span>
              </button>
            </div>
          ) : (
            /* Real Printable Standee Preview */
            <div className="bg-gradient-to-b from-slate-50 to-white p-5 rounded-3xl border-2 border-slate-900 shadow-md space-y-3 printable-standee">
              {/* Standee Header */}
              <div className="border-b border-slate-200 pb-2.5">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-[10px] font-black uppercase tracking-wider mb-1">
                  <Sparkles size={11} className="text-orange-500" />
                  {activeTab === 'store' ? 'Official Online Store' : 'Direct 0% Commission UPI'}
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
                  {businessName || 'My Store'}
                </h3>
              </div>

              {/* Real Crisp QR Code */}
              <div className="flex justify-center py-1">
                <QrCodeView
                  value={activeValue}
                  size={190}
                  level="M"
                  margin={3}
                  fgColor="#0f172a"
                  bgColor="#ffffff"
                  centerBadgeText={businessName || 'FS'}
                  downloadable={false}
                />
              </div>

              {/* Standee Subtext & Scan instructions */}
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-900">
                  {activeTab === 'store'
                    ? 'Scan with any phone camera to browse & order'
                    : 'Scan with GPay, PhonePe, Paytm or BHIM'}
                </p>
                <p className="text-[11px] text-slate-500 font-mono truncate max-w-[260px] mx-auto">
                  {activeTab === 'store' ? storeUrl : cleanUpi}
                </p>
              </div>

              {/* Accepted payment strip */}
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-center gap-2 text-[10px] font-bold text-slate-600">
                <span>Google Pay</span>
                <span>&bull;</span>
                <span>PhonePe</span>
                <span>&bull;</span>
                <span>Paytm</span>
                <span>&bull;</span>
                <span>BHIM</span>
              </div>
            </div>
          )}

          {/* Helper caption */}
          <p className="text-xs text-slate-500 leading-relaxed">
            {activeTab === 'store'
              ? 'Place on counter or shipping boxes. Customers scan to browse items, see prices, and order on WhatsApp.'
              : 'Direct peer-to-peer settlement. Money lands immediately in your bank account with ₹0 fees.'}
          </p>

          {/* Action Controls (Fitts's Law 48px touch targets) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <button
              type="button"
              onClick={handlePrint}
              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              title="Print counter standee display"
            >
              <Printer size={14} />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              title="Copy URL or UPI address"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              title="Share on WhatsApp"
            >
              <Share2 size={14} />
              <span>Share</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPaymentSetup?.();
              }}
              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              title="Edit payment & UPI settings"
            >
              <Settings size={14} />
              <span>Edit UPI</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
