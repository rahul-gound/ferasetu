import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CreditCard,
  QrCode,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Smartphone,
  Banknote,
  Store,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { isValidUpiId, buildUpiUri } from '../../utils/qrCodeGenerator';
import QrCodeView from '../common/QrCodeView';

interface PaymentSetupModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

type GuideApp = 'gpay' | 'phonepe' | 'paytm' | 'bhim';

export default function PaymentSetupModal({
  open,
  onClose,
  onSaved,
}: PaymentSetupModalProps) {
  const { user, updateUser } = useAuth();

  // Load existing UPI or payment settings
  const existingUpi =
    (user as any)?.upi_id ||
    (user as any)?.payment_settings?.upi_id ||
    (() => {
      try {
        return localStorage.getItem('fera_upi_id') || '';
      } catch {
        return '';
      }
    })();

  const existingCod = (() => {
    try {
      const stored = localStorage.getItem('fera_accept_cod');
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  })();

  const [upiId, setUpiId] = useState<string>(existingUpi);
  const [payeeName, setPayeeName] = useState<string>(
    user?.business_name || user?.name || 'My Store'
  );
  const [acceptCod, setAcceptCod] = useState<boolean>(existingCod);
  const [showHelper, setShowHelper] = useState<boolean>(!existingUpi);
  const [activeGuideApp, setActiveGuideApp] = useState<GuideApp>('gpay');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [touched, setTouched] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      if (existingUpi) {
        setUpiId(existingUpi);
      }
      setPayeeName(user?.business_name || user?.name || 'My Store');
    }
  }, [open, existingUpi, user]);

  if (!open) return null;

  const cleanUpi = upiId.trim();
  const isUpiValid = cleanUpi.length === 0 || isValidUpiId(cleanUpi);
  const canSave = cleanUpi.length > 0 ? isValidUpiId(cleanUpi) : acceptCod;

  // Real UPI URI for QR generation
  const realUpiUri = cleanUpi && isValidUpiId(cleanUpi)
    ? buildUpiUri({
        upiId: cleanUpi,
        payeeName: payeeName || 'My Store',
        note: `Payment to ${payeeName || 'Store'}`,
      })
    : '';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    if (cleanUpi.length > 0 && !isValidUpiId(cleanUpi)) {
      toast.error('Please enter a valid UPI ID (e.g. yourname@okhdfcbank or 9876543210@paytm)');
      return;
    }

    if (!cleanUpi && !acceptCod) {
      toast.error('Please add either a UPI ID or enable Cash on Delivery so customers can pay you.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Save locally in localStorage for resilient immediate hydration
      localStorage.setItem('fera_payment_configured', 'true');
      if (cleanUpi) {
        localStorage.setItem('fera_upi_id', cleanUpi);
      }
      localStorage.setItem('fera_accept_cod', String(acceptCod));

      // 2. Sync to auth context and backend profile
      updateUser({
        ...(cleanUpi ? { upi_id: cleanUpi } : {}),
        payment_settings: {
          upi_id: cleanUpi || undefined,
          payee_name: payeeName,
          accept_cod: acceptCod,
          accept_upi: Boolean(cleanUpi),
        },
      } as any);

      toast.success('Payment method active! You are ready to receive direct customer money.');
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('[PaymentSetupModal] Failed to save payment settings:', err);
      toast.error('Could not save payment settings. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
              <Banknote size={20} strokeWidth={2} />
            </div>
            <div>
              <h2 id="payment-modal-title" className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                Add Payment to Receive Money
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                0% platform commission &bull; 100% direct to your bank account
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

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-5">
          {/* Trust Banner */}
          <div className="rounded-2xl bg-emerald-50/80 border border-emerald-200/80 p-3.5 flex items-start gap-3">
            <ShieldCheck size={20} className="text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 leading-relaxed">
              <span className="font-bold">Zero Platform Commission: </span>
              Customers pay directly to your own UPI ID or in cash. FeraSetu does not hold your funds or take any percentage cut.
            </div>
          </div>

          {/* Section 1: UPI ID Setup */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="upi-id-input" className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                Your UPI ID (VPA)
              </label>
              <button
                type="button"
                onClick={() => setShowHelper(!showHelper)}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
              >
                <HelpCircle size={13} />
                <span>{showHelper ? 'Hide guide' : 'Where to find UPI ID?'}</span>
                {showHelper ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>

            {/* Helper Walkthrough Box */}
            {showHelper && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                  <Smartphone size={14} className="text-blue-600" />
                  <span>Select your daily payment app to see how to copy your UPI ID:</span>
                </div>

                {/* App selector pills */}
                <div className="grid grid-cols-4 gap-1.5">
                  {(['gpay', 'phonepe', 'paytm', 'bhim'] as GuideApp[]).map((app) => (
                    <button
                      key={app}
                      type="button"
                      onClick={() => setActiveGuideApp(app)}
                      className={`px-2 py-1.5 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
                        activeGuideApp === app
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {app === 'gpay' && 'Google Pay'}
                      {app === 'phonepe' && 'PhonePe'}
                      {app === 'paytm' && 'Paytm'}
                      {app === 'bhim' && 'BHIM / Bank'}
                    </button>
                  ))}
                </div>

                {/* Step-by-step guidance */}
                <div className="bg-white rounded-xl p-3 border border-slate-200/80 text-xs text-slate-700 space-y-1.5">
                  {activeGuideApp === 'gpay' && (
                    <>
                      <p className="font-semibold text-slate-900">How to find in Google Pay (GPay):</p>
                      <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px]">
                        <li>Open the <strong>Google Pay</strong> app on your mobile phone.</li>
                        <li>Tap your <strong>Profile picture</strong> in the top-right corner.</li>
                        <li>Your UPI ID is shown right below your name (e.g. <span className="font-mono font-bold text-slate-800">yourname@okhdfcbank</span>).</li>
                        <li>Tap the copy button and paste it below.</li>
                      </ol>
                    </>
                  )}
                  {activeGuideApp === 'phonepe' && (
                    <>
                      <p className="font-semibold text-slate-900">How to find in PhonePe:</p>
                      <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px]">
                        <li>Open <strong>PhonePe</strong> on your phone.</li>
                        <li>Tap your <strong>Profile photo</strong> in the top-left corner.</li>
                        <li>Under payment settings, tap <strong>UPI IDs / Bank Accounts</strong>.</li>
                        <li>Copy your primary UPI ID (e.g. <span className="font-mono font-bold text-slate-800">9876543210@ybl</span>).</li>
                      </ol>
                    </>
                  )}
                  {activeGuideApp === 'paytm' && (
                    <>
                      <p className="font-semibold text-slate-900">How to find in Paytm:</p>
                      <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px]">
                        <li>Open the <strong>Paytm</strong> app.</li>
                        <li>Tap your <strong>Profile avatar</strong> on the top-left.</li>
                        <li>Your UPI ID is displayed prominently under your QR code (e.g. <span className="font-mono font-bold text-slate-800">yourmobile@paytm</span>).</li>
                        <li>Tap to copy and paste it into the field below.</li>
                      </ol>
                    </>
                  )}
                  {activeGuideApp === 'bhim' && (
                    <>
                      <p className="font-semibold text-slate-900">How to find in BHIM or Bank App (HDFC, SBI, ICICI, etc.):</p>
                      <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px]">
                        <li>Open your banking or <strong>BHIM</strong> app.</li>
                        <li>Navigate to the <strong>UPI / Payments</strong> section.</li>
                        <li>Look for <strong>My UPI ID / VPA</strong> and copy the address.</li>
                      </ol>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Input & Validation */}
            <div className="relative">
              <input
                id="upi-id-input"
                type="text"
                value={upiId}
                onChange={(e) => {
                  setUpiId(e.target.value);
                  setTouched(true);
                }}
                placeholder="e.g. shopname@okhdfcbank or 9876543210@paytm"
                className={`w-full px-4 py-3 rounded-xl border text-sm font-mono tracking-tight transition-all outline-none ${
                  touched && cleanUpi.length > 0 && !isValidUpiId(cleanUpi)
                    ? 'border-rose-400 bg-rose-50/30 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
                    : cleanUpi && isValidUpiId(cleanUpi)
                    ? 'border-emerald-400 bg-emerald-50/20 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                }`}
              />
              {cleanUpi && isValidUpiId(cleanUpi) && (
                <div className="absolute right-3 top-3.5 text-emerald-600 flex items-center gap-1 text-xs font-bold">
                  <CheckCircle2 size={16} />
                  <span>Valid UPI</span>
                </div>
              )}
            </div>

            {touched && cleanUpi.length > 0 && !isValidUpiId(cleanUpi) && (
              <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
                <AlertCircle size={13} />
                Please enter a valid format with "@" (e.g. name@bank or phone@paytm)
              </p>
            )}
          </div>

          {/* Section 2: Payee / Store Display Name */}
          <div className="space-y-1.5">
            <label htmlFor="payee-name-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Payee / Shop Name (Displayed to customers during scan)
            </label>
            <input
              id="payee-name-input"
              type="text"
              value={payeeName}
              onChange={(e) => setPayeeName(e.target.value)}
              placeholder="e.g. Gupta General Store"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>

          {/* Section 3: Live Real QR Preview */}
          {realUpiUri ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
              <div className="shrink-0 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                <QrCodeView
                  value={realUpiUri}
                  size={140}
                  level="M"
                  margin={2}
                  centerBadgeText={payeeName}
                />
              </div>
              <div className="space-y-1.5 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                  <Sparkles size={12} className="text-emerald-600" />
                  Live Real QR Active
                </div>
                <p className="text-xs font-bold text-slate-900">
                  Scan this live QR code with any UPI app right now!
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Open Google Pay, PhonePe, or Paytm on your phone and test scan this screen. It will open directly with your name and UPI address!
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-4 text-center">
              <QrCode size={28} className="mx-auto text-slate-400 mb-1" />
              <p className="text-xs text-slate-500 font-medium">
                Type your UPI ID above to generate your real, scannable counter QR code.
              </p>
            </div>
          )}

          {/* Section 4: Cash on Delivery Toggle */}
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-slate-200/80 cursor-pointer transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <Store size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Allow Cash on Delivery (COD) & Counter Pay</p>
                  <p className="text-[11px] text-slate-500">Customers can order online and pay cash upon delivery or pickup</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={acceptCod}
                onChange={(e) => setAcceptCod(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
            </label>
          </div>

          {/* Action Buttons (Fitts's Law: 48px touch ergonomics) */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !canSave}
              className="flex-1 min-h-[48px] inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-bold rounded-xl shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              <span>{isSubmitting ? 'Saving…' : 'Save & Activate Direct Payments'}</span>
              <ArrowRight size={15} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="sm:w-auto min-h-[48px] px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
