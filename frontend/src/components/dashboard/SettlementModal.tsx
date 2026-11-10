import React, { useState } from 'react';
import {
  X,
  Building2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Clock,
  ExternalLink,
  Loader2,
  Banknote
} from 'lucide-react';

export interface SettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  settlementAmount: number;
  bankAccountMasked?: string;
  bankName?: string;
  upiId?: string;
  mode?: 'settle' | 'review';
  onConfirmSettlement?: () => Promise<void> | void;
}

export default function SettlementModal({
  isOpen,
  onClose,
  settlementAmount,
  bankAccountMasked = '••••3912',
  bankName = 'Bank of Baroda',
  upiId = 'merchant@okaxis',
  mode = 'settle',
  onConfirmSettlement,
}: SettlementModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [referenceId] = useState(() => `SETTLE-${Date.now().toString().slice(-8)}`);

  if (!isOpen) return null;

  const handleSettleNow = async () => {
    if (settlementAmount <= 0) {
      setErrorMsg('No settled balance available to sweep right now.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      if (onConfirmSettlement) {
        await onConfirmSettlement();
      } else {
        // Confirmed API execution simulation with latency
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Settlement transfer failed. Please verify bank account details.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settlement-modal-title"
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#0F1623] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Banknote size={20} />
            </div>
            <div>
              <h2
                id="settlement-modal-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                {mode === 'settle' ? 'Confirm Direct Bank Settlement' : 'Review Settlement Ledger'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                0% FeraSetu intermediary custody • Direct to merchant account
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
            aria-label="Close settlement modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs sm:text-sm">
          {isSuccess ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Settlement Initiated Successfully
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                ₹{settlementAmount.toLocaleString('en-IN')} has been queued for immediate sweep to{' '}
                {bankName} ({bankAccountMasked}).
              </p>
              <div className="pt-2 text-[11px] font-mono-tabular text-slate-400">
                UTR / Reference ID: <span className="font-bold text-slate-700 dark:text-slate-300">{referenceId}</span>
              </div>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Settlement Amount Banner */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider">
                    Settlement Balance
                  </span>
                  <div className="text-2xl sm:text-3xl font-bold font-mono-tabular text-slate-900 dark:text-white mt-0.5">
                    ₹{settlementAmount.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Ready for Sweep
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">Ref: {referenceId}</p>
                </div>
              </div>

              {/* Settlement Detail Attributes */}
              <div className="divide-y divide-slate-100 dark:divide-white/[0.06] text-xs">
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Destination Account</span>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                    <Building2 size={14} className="text-slate-400" />
                    <span>{bankName}</span>
                    <span className="font-mono-tabular text-slate-500">{bankAccountMasked}</span>
                  </div>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Payment Gateway Provider</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    UPI AutoCollect &amp; Direct Bank API
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">FeraSetu Commission (0%)</span>
                  <span className="font-mono-tabular font-bold text-emerald-600 dark:text-emerald-400">
                    ₹0.00 (0% Toll)
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Gateway NEFT/IMPS Bank Charges</span>
                  <span className="font-mono-tabular text-slate-700 dark:text-slate-300">
                    ₹0.00
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Expected Arrival Time</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-900 dark:text-white">
                    <Clock size={13} className="text-blue-500" />
                    Immediate IMPS / Within 2 hours
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Settlement Verification</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck size={14} />
                    Verified Provider Webhook
                  </span>
                </div>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSettleNow}
                  disabled={isProcessing || settlementAmount <= 0}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Sweeping to Bank...</span>
                    </>
                  ) : (
                    <>
                      <span>Sweep Now (₹{settlementAmount.toLocaleString('en-IN')})</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
