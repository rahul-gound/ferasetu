import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, ArrowLeft, Ban, X, Loader2 } from 'lucide-react';

export interface CancelOrderTarget {
  id: string;
  customer_name?: string;
  customer_phone?: string;
  total?: number;
  currency?: string;
  items_count?: number;
  items?: any[];
}

interface CancelConfirmationModalProps {
  isOpen: boolean;
  order: CancelOrderTarget | null;
  onClose: () => void;
  onProceed: (reason?: string) => Promise<void> | void;
  isSubmitting?: boolean;
}

export default function CancelConfirmationModal({
  isOpen,
  order,
  onClose,
  onProceed,
  isSubmitting = false,
}: CancelConfirmationModalProps) {
  const [reason, setReason] = useState('');
  const backButtonRef = useRef<HTMLButtonElement>(null);

  // Focus the safe "Back" button upon opening to prevent accidental Enter confirmation
  useEffect(() => {
    if (isOpen) {
      setReason('');
      const timer = setTimeout(() => {
        backButtonRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !order) return null;

  const orderShortId = order.id ? `#${order.id.slice(-8).toUpperCase()}` : '';
  const totalDisplay = order.total !== undefined ? `₹${order.total.toLocaleString('en-IN')}` : null;
  const itemCount = order.items_count || order.items?.length || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    onProceed(reason.trim());
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-order-modal-title"
      aria-describedby="cancel-order-modal-description"
      className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} strokeWidth={1.75} />
            </div>
            <div>
              <h2
                id="cancel-order-modal-title"
                className="text-base font-bold text-slate-900 leading-tight"
              >
                Cancel Order
              </h2>
              <p className="text-xs font-mono text-slate-500 mt-0.5">
                {orderShortId} {order.customer_name ? `• ${order.customer_name}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
            aria-label="Close"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Prominent Irreversible Warning Banner */}
          <div className="p-4 rounded-xl bg-red-50 border border-red-200/80">
            <div className="flex items-start gap-2.5">
              <Ban size={18} strokeWidth={1.75} className="text-red-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p
                  id="cancel-order-modal-description"
                  className="text-sm font-extrabold text-red-900"
                >
                  Once this order is cancelled, this action is irreversible.
                </p>
                <p className="text-xs text-red-700 leading-relaxed">
                  This order cannot be reopened once cancelled. The customer will be informed and the items will not be delivered.
                </p>
              </div>
            </div>
          </div>

          {/* Order Summary Metadata */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider block">
                Customer
              </span>
              <span className="font-bold text-slate-800 truncate block mt-0.5">
                {order.customer_name || 'Guest'}
              </span>
              {order.customer_phone && (
                <span className="text-slate-500 font-mono text-[11px] block mt-0.5">
                  {order.customer_phone}
                </span>
              )}
            </div>
            <div className="text-right">
              <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider block">
                Order Value
              </span>
              {totalDisplay && (
                <span className="font-extrabold text-slate-900 text-sm block mt-0.5">
                  {totalDisplay}
                </span>
              )}
              <span className="text-slate-500 text-[11px] block mt-0.5">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
            </div>
          </div>

          {/* Optional Cancellation Reason */}
          <div>
            <label
              htmlFor="cancellation-reason"
              className="block text-xs font-bold text-slate-700 mb-1.5"
            >
              Reason for cancellation <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              id="cancellation-reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
              placeholder="e.g., Customer requested cancellation, out of stock"
              className="w-full px-3.5 py-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors disabled:bg-slate-100 disabled:opacity-60"
            />
          </div>

          {/* Action Buttons: "Back" & "Proceed" */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-center gap-2.5 sm:gap-3">
            {/* Back Option */}
            <button
              ref={backButtonRef}
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:flex-1 min-h-[48px] px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <ArrowLeft size={18} strokeWidth={1.75} />
              <span>Back</span>
            </button>

            {/* Proceed Option */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:flex-1 min-h-[48px] px-4 py-2.5 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} strokeWidth={1.75} className="animate-spin" />
                  <span>Cancelling...</span>
                </>
              ) : (
                <>
                  <Ban size={18} strokeWidth={1.75} />
                  <span>Proceed</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
