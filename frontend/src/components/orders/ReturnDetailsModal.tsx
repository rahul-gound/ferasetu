import { useState } from 'react';
import {
  X,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Ban,
  Truck,
  Store,
  DollarSign,
  Package,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface OrderItem {
  product_id?: string;
  productId?: string;
  name?: string;
  product_name?: string;
  quantity: number;
  price: number;
  is_returnable?: boolean;
  non_returnable?: boolean;
}

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  delivery_type: 'delivery' | 'pickup';
  delivery_fee?: number;
  delivery_fee_minor?: number;
  total: number;
  return_status?: string;
  return_reason?: string;
  items?: OrderItem[];
}

interface ReturnDetailsModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReturnDetailsModal({
  isOpen,
  order,
  onClose,
  onSuccess,
}: ReturnDetailsModalProps) {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If initiating a new return
  const [newReturnReason, setNewReturnReason] = useState('');

  if (!isOpen || !order) return null;

  const deliveryFee =
    order.delivery_fee !== undefined
      ? Number(order.delivery_fee)
      : order.delivery_fee_minor
      ? order.delivery_fee_minor / 100
      : order.delivery_type === 'delivery'
      ? 50
      : 0;

  const isDelivery = order.delivery_type === 'delivery';
  const deliveryCourierLoss = isDelivery ? deliveryFee : 0;
  const isReturnRequested = order.return_status === 'requested';
  const isAlreadyProcessed = ['approved', 'rejected'].includes(order.return_status || '');

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await api.post(`/orders/${order.id}/return/approve`, {
        notes: 'Merchant accepted and approved return request',
      });
      toast.success('Return request approved successfully.');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to approve return');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!rejectReason.trim()) {
      toast.error('Please enter a reason for rejecting the return');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/orders/${order.id}/return/reject`, {
        reason: rejectReason.trim(),
      });
      toast.success('Return request rejected.');
      setShowRejectForm(false);
      setRejectReason('');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reject return');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInitiateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post(`/orders/${order.id}/return`, {
        reason: newReturnReason.trim() || 'Merchant recorded return request',
      });
      toast.success('Return request recorded.');
      setNewReturnReason('');
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to record return');
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
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-amber-500/10 via-rose-500/5 to-transparent flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center">
              <RotateCcw size={20} strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900">Order Return Review</h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                    order.return_status === 'requested'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : order.return_status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : order.return_status === 'rejected'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {order.return_status || 'New Return'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Order #{order.id.slice(-8).toUpperCase()} · {order.customer_name}
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Reason Card */}
          {order.return_reason && (
            <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <RotateCcw size={13} />
                <span>Return Reason</span>
              </div>
              <p className="text-xs font-semibold text-slate-800">{order.return_reason}</p>
            </div>
          )}

          {/* Delivery Man Loss Breakdown (Core Requirement) */}
          <div className="p-4 bg-gradient-to-br from-rose-50/90 to-amber-50/60 border-2 border-rose-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-extrabold text-rose-950 uppercase tracking-wider">
                <AlertTriangle size={15} className="text-rose-600 flex-shrink-0" />
                <span>Delivery Partner Operational Loss</span>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  isDelivery ? 'bg-cyan-100 text-cyan-800' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {isDelivery ? <Truck size={12} /> : <Store size={12} />}
                {isDelivery ? '🛵 Delivery Man Used' : '🏪 Store Pickup'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-white/90 rounded-lg border border-rose-100 shadow-2xs">
                <div className="text-[11px] text-slate-500 font-medium">Delivery Transit Fee</div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">
                  ₹{deliveryFee.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Paid to delivery courier</div>
              </div>

              <div className="p-3 bg-rose-100/60 rounded-lg border border-rose-300/80 shadow-2xs">
                <div className="text-[11px] text-rose-800 font-bold">Unrecoverable Loss</div>
                <div className="text-base font-black text-rose-700 mt-0.5">
                  ₹{deliveryCourierLoss.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-rose-600 font-medium mt-0.5">
                  {isDelivery ? 'Direct merchant loss' : 'Zero courier loss'}
                </div>
              </div>
            </div>

            <div className="text-xs text-rose-900 font-medium leading-relaxed bg-white/80 p-3 rounded-lg border border-rose-100">
              {isDelivery ? (
                <>
                  <span className="font-bold">⚠️ Total Loss Notice:</span> Because you dispatched a
                  delivery person for this order, the{' '}
                  <span className="font-extrabold text-rose-700">₹{deliveryFee}</span> delivery fee
                  is non-refundable by the delivery partner. If this return is approved, you incur this
                  as an unrecoverable operational transit loss.
                </>
              ) : (
                <>
                  <span className="font-bold">✅ Zero Delivery Loss:</span> The customer chose store
                  pickup. No delivery courier was dispatched, so you incur ₹0 transit fee loss.
                </>
              )}
            </div>
          </div>

          {/* Items in Order */}
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
              <span>Order Items ({order.items?.length || 0})</span>
              <span className="text-[11px] font-normal text-slate-400">Review return eligibility</span>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
              {(order.items || []).map((it, idx) => {
                const isNonReturnable =
                  it.is_returnable === false ||
                  it.non_returnable === true ||
                  (it.name || '').toLowerCase().includes('non-returnable');

                return (
                  <div key={idx} className="p-3 bg-white flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{it.name || it.product_name}</span>
                        {isNonReturnable && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-extrabold rounded-full border border-amber-200">
                            🚫 Non-returnable
                          </span>
                        )}
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        Qty: {it.quantity} × ₹{it.price.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="font-extrabold text-slate-900">
                      ₹{(it.quantity * it.price).toLocaleString('en-IN')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Initiate Return Form (if not yet requested) */}
          {!isReturnRequested && !isAlreadyProcessed && (
            <form onSubmit={handleInitiateReturn} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-800">Record a Return for this Order</div>
              <textarea
                rows={2}
                value={newReturnReason}
                onChange={(e) => setNewReturnReason(e.target.value)}
                placeholder="Reason for return (e.g. customer brought back defective unit)..."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                {isSubmitting ? 'Recording...' : 'Record Return Request'}
              </button>
            </form>
          )}

          {/* Reject Form Modal Overlay / Inline */}
          {showRejectForm && (
            <form onSubmit={handleReject} className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-3 animate-in fade-in">
              <div className="font-extrabold text-xs text-rose-900">
                Reject Return Request with Reason:
              </div>
              <textarea
                rows={2}
                autoFocus
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection (e.g. item opened, non-returnable product, return policy expired)..."
                className="w-full text-xs p-2.5 rounded-lg border border-rose-300 bg-white outline-none focus:ring-2 focus:ring-rose-500 text-slate-900"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !rejectReason.trim()}
                  className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'Rejecting...' : 'Confirm Return Rejection'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRejectForm(false)}
                  className="py-2 px-3 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  Back
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 flex-shrink-0">
          {isReturnRequested && !showRejectForm ? (
            <>
              <button
                type="button"
                onClick={() => setShowRejectForm(true)}
                className="py-2.5 px-4 bg-white hover:bg-rose-50 text-rose-700 border-2 border-rose-300 hover:border-rose-400 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Ban size={15} />
                <span>Reject Return</span>
              </button>

              <button
                type="button"
                onClick={handleApprove}
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-extrabold text-xs rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 size={16} />
                <span>{isSubmitting ? 'Approving...' : 'Approve Return & Restock'}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
