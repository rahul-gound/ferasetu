import { useState } from 'react';
import { X, Key, ShieldCheck, Truck, Store, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  delivery_type: 'delivery' | 'pickup';
  delivery_code?: string;
  notes?: string;
  total: number;
}

interface EnterDeliveryCodeModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EnterDeliveryCodeModal({
  isOpen,
  order,
  onClose,
  onSuccess,
}: EnterDeliveryCodeModalProps) {
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !order) return null;

  // Extract possible code from order notes or field for convenient shopkeeper autofill
  const detectedCode = (
    order.delivery_code ||
    (typeof order.notes === 'string' ? order.notes.match(/Code:\s*([A-Z0-9]+)/i)?.[1] : null) ||
    (typeof order.notes === 'string' ? order.notes.match(/OTP:\s*([0-9]+)/i)?.[1] : null) ||
    ''
  ).trim();

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      toast.error('Please enter the delivery verification code');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/orders/${order.id}/verify-otp`, {
        otp: cleanCode,
        code: cleanCode,
      });
      toast.success('Delivery Verified! Order marked as Delivered.');
      setCode('');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invalid delivery code. Please check with customer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center">
              <Key size={20} strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Enter Delivery Code</h3>
              <p className="text-xs text-slate-500 font-medium">
                Verify customer handshake to complete delivery
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Order Summary Pill */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
            <div>
              <div className="font-bold text-slate-900">{order.customer_name}</div>
              <div className="text-slate-500 mt-0.5">{order.customer_phone}</div>
            </div>
            <div className="text-right">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[11px] ${
                  order.delivery_type === 'delivery'
                    ? 'bg-cyan-100/70 text-cyan-800'
                    : 'bg-emerald-100/70 text-emerald-800'
                }`}
              >
                {order.delivery_type === 'delivery' ? (
                  <>
                    <Truck size={12} /> Home Delivery
                  </>
                ) : (
                  <>
                    <Store size={12} /> Store Pickup
                  </>
                )}
              </span>
              <div className="font-extrabold text-slate-900 mt-1">
                ₹{order.total.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Explanation */}
          <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Customer Handshake Verification:</span> Ask the customer
              for the {order.delivery_type === 'delivery' ? 'security code' : 'pick-up OTP'} sent to
              them upon order confirmation.
            </div>
          </div>

          {/* Code Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Customer Code / OTP
            </label>
            <input
              type="text"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. 4B82 or 782190"
              maxLength={12}
              className="w-full text-center text-2xl font-mono font-black tracking-widest py-3 px-4 rounded-xl border-2 border-slate-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none uppercase transition-all bg-white text-slate-900 placeholder:text-slate-300 placeholder:font-normal placeholder:text-base placeholder:tracking-normal"
            />
            {detectedCode && (
              <div className="flex items-center justify-between text-[11px] pt-1 px-1">
                <span className="text-slate-500">Customer Code on Order:</span>
                <button
                  type="button"
                  onClick={() => setCode(detectedCode)}
                  className="font-bold font-mono text-amber-700 hover:text-amber-900 underline cursor-pointer"
                >
                  {detectedCode} (Click to autofill)
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !code.trim()}
              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-extrabold text-sm rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span>Verifying...</span>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>Verify Code & Mark Delivered</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
