import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ShoppingCart, X, Package, Phone, MapPin, ChevronDown, ShieldCheck, Printer, Clock,
  Download, Share2, Copy, Check, ExternalLink, Sparkles, Mail, Ban, RotateCcw,
  DollarSign, FileText, AlertCircle, CheckCircle2, ArrowRight, Receipt, Plus, QrCode, Key
} from 'lucide-react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import ActionableEmptyState from '../components/ui/ActionableEmptyState';
import { getStorefrontUrl } from '../utils/canonicalHostname';
import InvoiceDocumentModal from '../components/orders/InvoiceDocumentModal';
import AddOrderModal from '../components/orders/AddOrderModal';
import CancelConfirmationModal from '../components/orders/CancelConfirmationModal';
import OrderPaymentQrModal from '../components/orders/OrderPaymentQrModal';
import EnterDeliveryCodeModal from '../components/orders/EnterDeliveryCodeModal';
import ReturnDetailsModal from '../components/orders/ReturnDetailsModal';
import posthog from '../lib/posthog';


interface OrderItem {
  product_id?: string;
  productId?: string;
  product_name?: string;
  name?: string;
  quantity: number;
  price: number;
  unitPriceMinor?: number;
  totalMinor?: number;
}

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_address?: string;
  items: OrderItem[];
  items_count: number;
  total: number;
  currency?: string;
  subtotal?: number;
  delivery_fee?: number;
  total_minor?: number;
  subtotal_minor?: number;
  delivery_fee_minor?: number;
  amount_paid_minor?: number;
  refunded_amount_minor?: number;
  refundable_amount_minor?: number;
  delivery_type: 'delivery' | 'pickup';
  status: string;
  payment_status?: string;
  payment_method?: string;
  provider_payment_id?: string;
  cancellation_status?: string;
  cancellation_reason?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  return_status?: string;
  invoice_number?: string;
  tracking_token?: string;
  delivery_code?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

async function downloadPdf(url: string, filename: string) {
  try {
    const res = await api.get(url, { responseType: 'blob' });
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
    toast.success('Downloaded PDF successfully');
  } catch (err) {
    toast.error('Failed to download PDF document');
  }
}

const ALL_STATUSES = ['all', 'pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled', 'returns'];

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:          { bg: 'rgba(245,158,11,0.15)',  color: '#D97706' },
  confirmed:        { bg: 'rgba(59,130,246,0.15)',  color: '#2563EB' },
  preparing:        { bg: 'rgba(139,92,246,0.15)',  color: '#7C3AED' },
  out_for_delivery: { bg: 'rgba(6,182,212,0.15)',   color: '#0891B2' },
  delivered:        { bg: 'rgba(16,185,129,0.15)',  color: '#059669' },
  cancelled:        { bg: 'rgba(239,68,68,0.15)',   color: '#DC2626' },
  returns:          { bg: 'rgba(245,158,11,0.2)',   color: '#B45309' },
};

const STATUS_LABELS: Record<string, string> = {
  all: 'All', pending: 'Pending', confirmed: 'Confirmed',
  preparing: 'Preparing', out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered', cancelled: 'Cancelled', returns: 'Returns',
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  paid:      { label: '💳 Paid',      bg: 'rgba(16,185,129,0.15)', color: '#059669' },
  unpaid:    { label: '💸 Unpaid',    bg: 'rgba(239,68,68,0.15)',  color: '#DC2626' },
  pay_later: { label: '⏳ Pay Later', bg: 'rgba(245,158,11,0.15)', color: '#D97706' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_COLORS[status] || { bg: '#f0f0f0', color: '#888' };
  return (
    <span style={{
      padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
      background: s.bg, color: s.color,
    }}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function PaymentBadge({ status }: { status?: string }) {
  const key = status || 'unpaid';
  const cfg = PAYMENT_STATUS_CONFIG[key] || PAYMENT_STATUS_CONFIG.unpaid;
  return (
    <span style={{
      padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
      background: cfg.bg, color: cfg.color,
    }}>
      {cfg.label}
    </span>
  );
}

function Shimmer() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{
          height: '56px', borderRadius: '8px',
          background: 'linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)',
          backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
        }} />
      ))}
    </div>
  );
}

function InvoiceModal({ order, onClose, onPaymentUpdate, onVerifyOtp, merchantName, merchantLogo }: {
  order: Order;
  onClose: () => void;
  onPaymentUpdate: (id: string, status: string) => void;
  onVerifyOtp: (id: string, otp: string) => void;
  merchantName?: string;
  merchantLogo?: string | null;
}) {
  return (
    <InvoiceDocumentModal
      order={order}
      onClose={onClose}
      onPaymentUpdate={onPaymentUpdate}
      onVerifyOtp={onVerifyOtp}
      merchantName={merchantName}
      merchantLogo={merchantLogo}
    />
  );
}

export default function OrdersPage() {
  const { user } = useAuth();
  const { translate } = useLanguage();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [qrModalOrder, setQrModalOrder] = useState<Order | null>(null);
  const [orderForDeliveryCode, setOrderForDeliveryCode] = useState<Order | null>(null);
  const [orderForReturnReview, setOrderForReturnReview] = useState<Order | null>(null);


  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await api.get('/orders');
      const data = res.data;
      return Array.isArray(data) ? data : (data?.orders || []);
    },
  });

  const { data: afterSales, refetch: refetchAfterSales } = useQuery({
    queryKey: ['order-after-sales', selectedOrder?.id],
    queryFn: async () => {
      if (!selectedOrder?.id) return null;
      const res = await api.get(`/orders/${selectedOrder.id}/after-sales`);
      return res.data;
    },
    enabled: !!selectedOrder?.id,
  });

  // After-sales modals state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<'original_payment_method' | 'upi' | 'bank_transfer' | 'cash'>('original_payment_method');
  const [isManualRefund, setIsManualRefund] = useState(false);
  const [manualReference, setManualReference] = useState('');

  const [showCreditNoteModal, setShowCreditNoteModal] = useState(false);
  const [creditNoteReason, setCreditNoteReason] = useState('');
  const [creditNoteAmount, setCreditNoteAmount] = useState('');

  const otpMutation = useMutation({
    mutationFn: ({ id, otp }: { id: string; otp: string }) =>
      api.post(`/orders/${id}/verify-otp`, { otp }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Delivery OTP Verified! Handshake Confirmed.');
      setInvoiceOrder(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Invalid OTP');
    },
  });

  const handleVerifyOtp = (id: string, otp: string) => {
    if (!otp.trim()) return toast.error('Please enter OTP');
    otpMutation.mutate({ id, otp });
  };

  const cancelOrderMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/orders/${id}/cancel`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      refetchAfterSales();
      toast.success('Order cancelled successfully.');
      setShowCancelModal(false);
      setCancelReason('');
      setOrderToCancel(null);
      setSelectedOrder(prev => prev ? { ...prev, status: 'cancelled', cancellation_status: 'cancelled' } : null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to cancel order');
    },
  });

  const refundOrderMutation = useMutation({
    mutationFn: (params: {
      id: string;
      amountMinor: number;
      reason: string;
      refundMethod: string;
      isManual: boolean;
      manualReference?: string;
    }) =>
      api.post(`/orders/${params.id}/refund`, {
        amountMinor: params.amountMinor,
        reason: params.reason,
        refundMethod: params.refundMethod,
        isManual: params.isManual,
        manualReference: params.manualReference,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      refetchAfterSales();
      toast.success(res.data?.message || 'Refund processed.');
      setShowRefundModal(false);
      setRefundAmount('');
      setRefundReason('');
      setManualReference('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to process refund');
    },
  });

  const creditNoteMutation = useMutation({
    mutationFn: ({ id, reason, items }: { id: string; reason: string; items: any[] }) =>
      api.post(`/orders/${id}/credit-notes`, { reason, items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      refetchAfterSales();
      toast.success('Credit note issued successfully.');
      setShowCreditNoteModal(false);
      setCreditNoteReason('');
      setCreditNoteAmount('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to issue credit note');
    },
  });

  const returnRejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/orders/${id}/return/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      refetchAfterSales();
      toast.success('Return request rejected.');
      setOrderForReturnReview(null);
      setSelectedOrder(prev => prev ? { ...prev, return_status: 'rejected' } : null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to reject return');
    },
  });

  const returnApproveMutation = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      api.post(`/orders/${id}/return/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      refetchAfterSales();
      toast.success('Return request approved.');
      setOrderForReturnReview(null);
      setSelectedOrder(prev => prev ? { ...prev, return_status: 'approved' } : null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to approve return');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/orders/${id}/status`, { status }),
    onSuccess: (_data, { status }) => {
      posthog.capture('order_status_updated', { status });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order status updated!');
      setUpdatingId(null);
    },
    onError: () => {
      toast.error('Failed to update status');
      setUpdatingId(null);
    },
  });

  const paymentMutation = useMutation({
    mutationFn: ({ id, payment_status }: { id: string; payment_status: string }) =>
      api.patch(`/orders/${id}/payment`, { payment_status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      refetchAfterSales();
      toast.success('Payment status updated!');
    },
    onError: () => toast.error('Failed to update payment status'),
  });

  const handleStatusChange = (order: Order, status: string) => {
    if (status === 'cancelled') {
      setOrderToCancel(order);
      return;
    }
    setUpdatingId(order.id);
    updateMutation.mutate({ id: order.id, status });
  };

  const handlePaymentUpdate = (id: string, payment_status: string) => {
    paymentMutation.mutate({ id, payment_status });
    if (invoiceOrder?.id === id) {
      setInvoiceOrder(prev => prev ? { ...prev, payment_status } : null);
    }
  };

  const [exportingCsv, setExportingCsv] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const storeUrl = getStorefrontUrl(user);

  const handleExportOrdersCsv = () => {
    if (orders.length === 0) {
      toast.error('No orders to export.');
      return;
    }
    setExportingCsv(true);
    try {
      const headers = [
        'Order ID',
        'Date',
        'Customer Name',
        'Phone',
        'Address',
        'Delivery Type',
        'Items Count',
        'Items Details',
        'Total Amount (INR)',
        'Order Status',
        'Payment Status',
        'Notes'
      ];
      const rows = orders.map(o => {
        const itemSummary = (o.items || [])
          .map((it: any) => `${it.product_name || it.name || 'Item'} (x${it.quantity})`)
          .join('; ');
        return [
          `"${o.id}"`,
          `"${new Date(o.created_at).toLocaleString('en-IN')}"`,
          `"${(o.customer_name || '').replace(/"/g, '""')}"`,
          `"${(o.customer_phone || '').replace(/"/g, '""')}"`,
          `"${(o.customer_address || '').replace(/"/g, '""')}"`,
          o.delivery_type || 'delivery',
          o.items_count || (o.items?.length || 0),
          `"${itemSummary.replace(/"/g, '""')}"`,
          o.total ?? 0,
          o.status || 'pending',
          o.payment_status || 'unpaid',
          `"${(o.notes || '').replace(/"/g, '""')}"`
        ];
      });
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `FeraSetu_Orders_Export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Orders & customer contacts exported! You have 100% data sovereignty.');
    } catch {
      toast.error('Failed to export orders.');
    } finally {
      setExportingCsv(false);
    }
  };

  const handleCopyStoreLink = async () => {
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopiedLink(true);
      toast.success('Store link copied!');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error('Failed to copy store link.');
    }
  };

  const handleShareWhatsAppStatus = () => {
    const text = encodeURIComponent(
      `🛍️ We are now accepting online orders directly! Tap our catalog link to order in seconds with direct delivery & easy UPI/Cash payment:\n👉 ${storeUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const filtered = activeTab === 'all'
    ? orders
    : activeTab === 'returns'
    ? orders.filter(o => o.return_status && o.return_status !== 'none')
    : orders.filter(o => o.status === activeTab);

  return (
    <div>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @media print { .no-print { display: none !important; } }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{translate('orders')}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {orders.length} total orders recorded • 100% direct merchant settlement
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAddOrderModal(true)}
            className="btn btn-primary inline-flex items-center gap-2 text-xs font-bold cursor-pointer shadow-sm hover:shadow"
            title="Create order for customer or generate a 1-click WhatsApp checkout link"
          >
            <Plus size={16} strokeWidth={2} />
            <span>Add Order</span>
          </button>
          <button
            type="button"
            onClick={handleExportOrdersCsv}
            disabled={exportingCsv || orders.length === 0}
            className="btn btn-secondary inline-flex items-center gap-2 text-xs font-bold cursor-pointer"
            title="Download CSV of all customer orders and contact numbers (Data Sovereignty Guarantee)"
          >
            <Download size={15} />
            <span>{exportingCsv ? 'Exporting...' : 'Export Orders (CSV)'}</span>
          </button>
        </div>
      </div>

      {/* Status tabs */}
      <div style={{
        display: 'flex', gap: '6px', marginBottom: '24px',
        overflowX: 'auto', paddingBottom: '4px',
      }}>
        {ALL_STATUSES.map(status => {
          const count = status === 'all'
            ? orders.length
            : status === 'returns'
            ? orders.filter(o => o.return_status && o.return_status !== 'none').length
            : orders.filter(o => o.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setActiveTab(status)}
              style={{
                padding: '8px 14px', borderRadius: '20px', cursor: 'pointer',
                fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap',
                background: activeTab === status ? 'var(--primary)' : 'var(--surface)',
                color: activeTab === status ? '#fff' : 'var(--text-muted)',
                border: activeTab === status ? '1px solid transparent' : '1px solid var(--border)',
                transition: 'all 0.15s',
              }}
            >
              {STATUS_LABELS[status]} {count > 0 && `(${count})`}
            </button>
          );
        })}
      </div>

      {/* Orders Table */}
      <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
        {isLoading ? (
          <Shimmer />
        ) : filtered.length === 0 ? (
          <div style={{ padding: '32px 16px' }}>
            {orders.length === 0 ? (
              <div className="py-8 px-4 max-w-2xl mx-auto text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <ShoppingCart size={32} />
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/70 text-emerald-800 text-xs font-black uppercase tracking-wider mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Order Book Ready
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2">
                  Your order book is ready. Share your store link on WhatsApp Status or customer groups to receive your first order!
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-lg mx-auto mb-6">
                  Small retailers get their first 5 customer orders within 24 hours by sharing their live catalog link directly to WhatsApp Status and local groups.
                </p>

                {/* 3 Step Guidance */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left mb-6">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="text-xs font-black text-[#0052FF] mb-1">1. Share Catalog</div>
                    <div className="text-xs font-bold text-slate-800">Post Link to WhatsApp</div>
                    <p className="text-[11px] text-slate-500 mt-1 m-0">Broadcast to your customer groups and WhatsApp Status.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="text-xs font-black text-[#0052FF] mb-1">2. Direct Order</div>
                    <div className="text-xs font-bold text-slate-800">Zero-Friction Checkout</div>
                    <p className="text-[11px] text-slate-500 mt-1 m-0">Customers browse items and submit orders in 1 tap.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="text-xs font-black text-[#0052FF] mb-1">3. Direct Money</div>
                    <div className="text-xs font-bold text-slate-800">100% Non-Custodial</div>
                    <p className="text-[11px] text-slate-500 mt-1 m-0">Collect via your own UPI or Cash. Zero commission taken.</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddOrderModal(true)}
                    className="w-full sm:w-auto px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus size={16} strokeWidth={2.5} />
                    <span>Create Order & WhatsApp Link</span>
                  </button>
                  {/* actionLabel="Share Store on WhatsApp" */}
                  <button
                    type="button"
                    onClick={handleShareWhatsAppStatus}
                    className="w-full sm:w-auto px-6 py-3 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs sm:text-sm font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Share2 size={16} />
                    <span>Share on WhatsApp Status</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyStoreLink}
                    className="w-full sm:w-auto px-5 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {copiedLink ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                    <span>{copiedLink ? 'Link Copied!' : 'Copy Store Link'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <ActionableEmptyState
                icon={<ShoppingCart size={28} />}
                title={`No ${STATUS_LABELS[activeTab]?.toLowerCase() || ''} orders`}
                description={`You currently have no orders in "${STATUS_LABELS[activeTab] || activeTab}" status.`}
                actionLabel="View All Orders"
                onAction={() => setActiveTab('all')}
                expectedOutcome="Switch back to see orders across all lifecycle stages."
              />
            )}
          </div>
        ) : (
          <>
            {/* Mobile Card View (visible on < md) */}
            <div className="md:hidden divide-y divide-slate-100">
              {filtered.map(order => (
                <div
                  key={order.id}
                  className="p-4 flex flex-col gap-3 bg-white hover:bg-slate-50/80 transition-colors cursor-pointer"
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{order.customer_name}</div>
                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                        <Phone size={11} />
                        <span>{order.customer_phone}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-slate-900 text-base">
                        ₹{order.total.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short'
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={order.status} />
                    {order.return_status === 'requested' && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setOrderForReturnReview(order); }}
                        className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw size={10} />
                        <span>Return Requested</span>
                      </button>
                    )}
                    {order.return_status === 'rejected' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">Return Rejected</span>
                    )}
                    {order.return_status === 'approved' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Return Approved</span>
                    )}
                    <PaymentBadge status={order.payment_status} />
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                      order.delivery_type === 'delivery'
                        ? 'bg-cyan-50 text-cyan-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {order.delivery_type === 'delivery' ? '🛵 Delivery' : '🏪 Pickup'}
                    </span>
                    <span className="text-xs text-slate-400 ml-auto flex items-center gap-1">
                      <Package size={12} />
                      {order.items_count || order.items?.length || 0} items
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-slate-50" onClick={e => e.stopPropagation()}>
                    {order.status === 'pending' ? (
                      <div className="flex items-center gap-2 flex-1">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(order, 'confirmed')}
                          disabled={updatingId === order.id}
                          className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Check size={14} strokeWidth={2.5} />
                          <span>Confirm</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrderToCancel(order)}
                          disabled={updatingId === order.id}
                          className="flex-1 py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Ban size={14} strokeWidth={2.5} />
                          <span>Cancel</span>
                        </button>
                      </div>
                    ) : order.status === 'delivered' ? (
                      <span className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <ShieldCheck size={14} className="text-emerald-600" />
                        <span>Delivered (Locked)</span>
                      </span>
                    ) : order.status === 'cancelled' ? (
                      <span className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <Ban size={14} className="text-rose-600" />
                        <span>Cancelled (Locked)</span>
                      </span>
                    ) : (
                      <div className="flex items-center gap-2 flex-1">
                        <button
                          type="button"
                          onClick={() => setOrderForDeliveryCode(order)}
                          className="py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          <Key size={13} strokeWidth={2.2} />
                          <span>Enter Code</span>
                        </button>
                        <div className="relative flex-1">
                          <select
                            value={order.status}
                            disabled={updatingId === order.id}
                            onChange={e => {
                              if (e.target.value === 'delivered') {
                                setOrderForDeliveryCode(order);
                              } else {
                                handleStatusChange(order, e.target.value);
                              }
                            }}
                            className="w-full text-xs font-semibold py-1.5 pl-2.5 pr-7 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                          >
                            <option value="confirmed">Confirmed</option>
                            <option value="preparing">Preparing</option>
                            <option value="out_for_delivery">Out for Delivery</option>
                            <option value="delivered">Delivered (Code)</option>
                          </select>
                          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                        </div>
                      </div>
                    )}

                    {order.status !== 'cancelled' ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => downloadPdf(`/orders/${order.id}/invoice/pdf`, `invoice-${order.invoice_number || order.id.slice(-8)}.pdf`)}
                          className="px-2 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                          title="Download Invoice PDF"
                        >
                          <Download size={13} />
                          <span>PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setQrModalOrder(order)}
                          className="px-2 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1"
                          title="Show Payment QR Code & Order Link"
                        >
                          <QrCode size={13} className={order.payment_status === 'paid' ? 'text-emerald-600' : 'text-orange-600'} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setInvoiceOrder(order)}
                          className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          🧾 Invoice
                        </button>
                      </div>
                    ) : (
                      <span className="px-2.5 py-1.5 text-[11px] font-medium text-slate-400 italic">
                        Voided
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (visible on >= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                    {['Customer', 'Phone', 'Items', 'Total', 'Type', 'Status', 'Payment', 'Date', 'Update', ''].map(h => (
                      <th key={h} style={{
                        padding: '12px 16px', textAlign: 'left',
                        fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(order => (
                    <tr
                      key={order.id}
                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg)'}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                    >
                      <td
                        style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text)' }}
                        onClick={() => setSelectedOrder(order)}
                      >
                        {order.customer_name}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={12} /> {order.customer_phone}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Package size={12} /> {order.items_count || order.items?.length || 0}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text)' }}>
                        ₹{order.total.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                          background: order.delivery_type === 'delivery' ? 'rgba(6,182,212,0.15)' : 'rgba(16,185,129,0.15)',
                          color: order.delivery_type === 'delivery' ? '#0891B2' : '#059669',
                        }}>
                          {order.delivery_type === 'delivery' ? '🛵 Delivery' : '🏪 Pickup'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <StatusBadge status={order.status} />
                          {order.return_status === 'requested' && (
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); setOrderForReturnReview(order); }}
                              style={{
                                padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 800,
                                background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d',
                                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px',
                                whiteSpace: 'nowrap',
                              }}
                              title="Return requested. Click to review loss and approve/reject."
                            >
                              <RotateCcw size={10} />
                              <span>Return Req</span>
                            </button>
                          )}
                          {order.return_status === 'rejected' && (
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#dc2626' }}>Return Rejected</span>
                          )}
                          {order.return_status === 'approved' && (
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#16a34a' }}>Return Approved</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <PaymentBadge status={order.payment_status} />
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                           day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {order.status === 'pending' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(order, 'confirmed')}
                              disabled={updatingId === order.id}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 800,
                                background: '#059669',
                                color: '#ffffff',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                              }}
                              title="Confirm Order"
                            >
                              <Check size={13} strokeWidth={2.5} />
                              <span>Confirm</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setOrderToCancel(order)}
                              disabled={updatingId === order.id}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 700,
                                background: '#fff',
                                color: '#dc2626',
                                border: '1px solid #fca5a5',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title="Cancel Order"
                            >
                              <Ban size={13} strokeWidth={2.5} />
                              <span>Cancel</span>
                            </button>
                          </div>
                        ) : order.status === 'delivered' ? (
                          <span
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 700,
                              background: '#ecfdf5',
                              color: '#059669',
                              border: '1px solid #a7f3d0',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              whiteSpace: 'nowrap',
                            }}
                            title="Order is delivered and finalized. Status cannot be modified."
                          >
                            <ShieldCheck size={14} className="text-emerald-600" />
                            <span>Delivered (Locked)</span>
                          </span>
                        ) : order.status === 'cancelled' ? (
                          <span
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 700,
                              background: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              whiteSpace: 'nowrap',
                            }}
                            title="Order is cancelled (Locked)"
                          >
                            <Ban size={14} className="text-rose-600" />
                            <span>Cancelled (Locked)</span>
                          </span>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setOrderForDeliveryCode(order)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 800,
                                background: '#d97706',
                                color: '#ffffff',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                              }}
                              title="Enter Customer Delivery Code / OTP to complete delivery"
                            >
                              <Key size={13} strokeWidth={2.2} />
                              <span>Enter Code</span>
                            </button>
                            <div style={{ position: 'relative' }}>
                              <select
                                value={order.status}
                                disabled={updatingId === order.id}
                                onChange={e => {
                                  if (e.target.value === 'delivered') {
                                    setOrderForDeliveryCode(order);
                                  } else {
                                    handleStatusChange(order, e.target.value);
                                  }
                                }}
                                style={{
                                  padding: '6px 24px 6px 8px', borderRadius: '6px', fontSize: '11px',
                                  border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)',
                                  cursor: 'pointer', appearance: 'none',
                                }}
                              >
                                <option value="confirmed">Confirmed</option>
                                <option value="preparing">Preparing</option>
                                <option value="out_for_delivery">Out for Delivery</option>
                                <option value="delivered">Delivered (Code)</option>
                              </select>
                              <ChevronDown size={11} style={{ position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
                            </div>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {order.status !== 'cancelled' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              className="btn btn-secondary"
                              onClick={e => {
                                e.stopPropagation();
                                downloadPdf(`/orders/${order.id}/invoice/pdf`, `invoice-${order.invoice_number || order.id.slice(-8)}.pdf`);
                              }}
                              style={{ fontSize: '12px', padding: '5px 8px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="Download Invoice PDF"
                            >
                              <Download size={12} />
                              <span>PDF</span>
                            </button>
                            <button
                              className="btn btn-secondary"
                              onClick={e => { e.stopPropagation(); setInvoiceOrder(order); }}
                              style={{ fontSize: '12px', padding: '5px 10px', whiteSpace: 'nowrap' }}
                              title="View Invoice Modal"
                            >
                              🧾 Invoice
                            </button>
                            <button
                              className="btn btn-secondary"
                              onClick={e => { e.stopPropagation(); setQrModalOrder(order); }}
                              style={{ fontSize: '12px', padding: '5px 8px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="Show Payment QR Code & Order Link"
                            >
                              <QrCode size={12} className={order.payment_status === 'paid' ? 'text-emerald-600' : 'text-orange-600'} />
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                            No Invoice
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: '16px', width: '100%', maxWidth: '680px',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            {/* Modal header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '20px 24px', borderBottom: '1px solid var(--border)',
            }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>Order Details</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>#{selectedOrder.id.slice(-8).toUpperCase()}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              {/* Status */}
              <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <StatusBadge status={selectedOrder.status} />
                  <PaymentBadge status={selectedOrder.payment_status} />
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {new Date(selectedOrder.created_at).toLocaleString('en-IN')}
                </span>
              </div>

              {/* Cancellation Banner */}
              {(selectedOrder.status === 'cancelled' || selectedOrder.cancellation_status === 'cancelled') && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '12px', color: '#991B1B' }}>
                  <div style={{ fontWeight: 800, marginBottom: '2px' }}>Order Cancelled by {selectedOrder.cancelled_by || 'merchant'}</div>
                  <div>Reason: {selectedOrder.cancellation_reason || 'Order cancelled'}</div>
                  {selectedOrder.cancelled_at && (
                    <div style={{ fontSize: '11px', color: '#B91C1C', marginTop: '4px' }}>
                      Cancelled on: {new Date(selectedOrder.cancelled_at).toLocaleString('en-IN')}
                    </div>
                  )}
                </div>
              )}

              {/* Return Request Banner & Delivery Loss Section */}
              {selectedOrder.return_status && selectedOrder.return_status !== 'none' && (
                <div style={{ background: '#FFFBEB', border: '2px solid #FCD34D', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 800, fontSize: '13px', color: '#92400E', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <RotateCcw size={16} />
                      <span>Return Status: <b style={{ textTransform: 'uppercase' }}>{selectedOrder.return_status}</b></span>
                    </div>
                    <span style={{
                      padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800,
                      background: selectedOrder.return_status === 'requested' ? '#FEF3C7' : selectedOrder.return_status === 'approved' ? '#DCFCE7' : '#FEE2E2',
                      color: selectedOrder.return_status === 'requested' ? '#B45309' : selectedOrder.return_status === 'approved' ? '#15803D' : '#B91C1C',
                    }}>
                      {selectedOrder.return_status}
                    </span>
                  </div>

                  {selectedOrder.return_reason && (
                    <div style={{ fontSize: '12px', color: '#78350F', marginBottom: '12px' }}>
                      <b>Reason:</b> {selectedOrder.return_reason}
                    </div>
                  )}

                  {/* Delivery Man Total Loss Breakdown */}
                  <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#991B1B', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Truck size={13} />
                      <span>Delivery Partner Operational Loss Analysis</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#7F1D1D', marginBottom: '4px' }}>
                      <span>Mode: {selectedOrder.delivery_type === 'delivery' ? '🛵 Delivery Partner Assigned' : '🏪 Store Pickup'}</span>
                      <span>Transit Courier Loss: <b>₹{selectedOrder.delivery_type === 'delivery' ? (selectedOrder.delivery_fee || 50).toLocaleString('en-IN') : 0}</b></span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#B91C1C', lineHeight: '1.4' }}>
                      {selectedOrder.delivery_type === 'delivery' ? (
                        <>⚠️ <b>Courier Fee Non-Refundable:</b> Because a delivery person was dispatched, the delivery transit fee of <b>₹{selectedOrder.delivery_fee || 50}</b> cannot be recovered from courier and represents a direct operational loss.</>
                      ) : (
                        <>✅ <b>Zero Courier Loss:</b> Customer used store pickup. No transit fees were lost.</>
                      )}
                    </div>
                  </div>

                  {/* Reject / Approve Buttons */}
                  {selectedOrder.return_status === 'requested' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setOrderForReturnReview(selectedOrder)}
                        style={{
                          flex: 1, padding: '8px', background: '#DC2626', color: '#fff',
                          border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                        }}
                      >
                        <Ban size={14} /> Reject Return
                      </button>
                      <button
                        type="button"
                        onClick={() => returnApproveMutation.mutate({ id: selectedOrder.id })}
                        disabled={returnApproveMutation.isPending}
                        style={{
                          flex: 1, padding: '8px', background: '#059669', color: '#fff',
                          border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                        }}
                      >
                        <Check size={14} /> Approve Return
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Financial Breakdown & Balances */}
              <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Financial Breakdown</span>
                  <span style={{ fontSize: '12px', color: '#334155' }}>Method: <b>{selectedOrder.payment_method || (selectedOrder.payment_status === 'paid' ? 'Online' : 'Offline/COD')}</b></span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ background: '#fff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Order Total</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#1E293B' }}>
                      ₹{(afterSales?.financials?.totalMinor ? afterSales.financials.totalMinor / 100 : selectedOrder.total).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div style={{ background: '#fff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Amount Paid</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#059669' }}>
                      ₹{((afterSales?.financials?.amountPaidMinor ?? (selectedOrder.payment_status === 'paid' ? (selectedOrder.total * 100) : 0)) / 100).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div style={{ background: '#fff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Refunded</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#DC2626' }}>
                      ₹{((afterSales?.financials?.refundedAmountMinor || 0) / 100).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div style={{ background: '#fff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Refundable</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#2563EB' }}>
                      ₹{((afterSales?.financials?.remainingRefundableMinor || 0) / 100).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {afterSales?.financials?.isUnpaidCod && (
                  <div style={{ padding: '8px 12px', background: '#FFFBEB', borderRadius: '8px', border: '1px solid #FEF3C7', fontSize: '12px', color: '#92400E', fontWeight: 600 }}>
                    ℹ️ No payment was collected — no refund is required.
                  </div>
                )}

                {afterSales?.refunds?.some((r: any) => r.is_manual) && (
                  <div style={{ marginTop: '8px', padding: '6px 10px', background: '#EFF6FF', borderRadius: '6px', fontSize: '11px', color: '#1D4ED8', fontWeight: 600, display: 'inline-block' }}>
                    Refund recorded manually (non-custodial settlement)
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {selectedOrder.status !== 'cancelled' ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setQrModalOrder(selectedOrder)}
                      style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#EA580C', color: '#FFF' }}
                    >
                      <QrCode size={14} /> Payment QR & Link
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setInvoiceOrder(selectedOrder)}
                      style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}
                    >
                      <Receipt size={14} /> View Invoice
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => downloadPdf(`/orders/${selectedOrder.id}/invoice/pdf`, `invoice-${selectedOrder.invoice_number || selectedOrder.id.slice(-8)}.pdf`)}
                      style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}
                    >
                      <Download size={14} /> Download Invoice (PDF)
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={async () => {
                        const targetEmail = window.prompt('Send invoice to email:', selectedOrder.customer_email || '');
                        if (!targetEmail) return;
                        try {
                          await api.post(`/orders/${selectedOrder.id}/invoice/send`, { email: targetEmail });
                          toast.success(`Invoice sent to ${targetEmail}`);
                        } catch (err: any) {
                          toast.error(err.response?.data?.error || 'Failed to send invoice');
                        }
                      }}
                      style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}
                    >
                      <Mail size={14} /> Email Invoice
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrderToCancel(selectedOrder)}
                      style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: '1px solid #FCA5A5', color: '#DC2626', background: '#FFF', cursor: 'pointer' }}
                    >
                      <Ban size={14} /> Cancel Order
                    </button>

                    {selectedOrder.status === 'delivered' && (
                      <button
                        type="button"
                        onClick={() => setOrderForReturnReview(selectedOrder)}
                        style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: '1px solid #FCD34D', color: '#B45309', background: '#FEF3C7', fontWeight: 700, cursor: 'pointer' }}
                      >
                        <RotateCcw size={14} /> {selectedOrder.return_status && selectedOrder.return_status !== 'none' ? 'Review Return Request' : 'Process / Record Return'}
                      </button>
                    )}

                    {['confirmed', 'preparing', 'out_for_delivery'].includes(selectedOrder.status) && (
                      <button
                        type="button"
                        onClick={() => setOrderForDeliveryCode(selectedOrder)}
                        style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: 'none', color: '#FFF', background: '#D97706', fontWeight: 800, cursor: 'pointer' }}
                      >
                        <Key size={14} /> Enter Delivery Code
                      </button>
                    )}
                  </>
                ) : (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', fontSize: '12px', color: '#991B1B', fontWeight: 600 }}>
                    ⛔ Order Cancelled — Invoices are voided and unavailable.
                  </div>
                )}

                {(afterSales?.financials?.remainingRefundableMinor || 0) > 0 && !afterSales?.financials?.isUnpaidCod && (
                  <button
                    type="button"
                    onClick={() => {
                      setRefundAmount(((afterSales.financials.remainingRefundableMinor || 0) / 100).toString());
                      setShowRefundModal(true);
                    }}
                    style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: '1px solid #93C5FD', color: '#1D4ED8', background: '#EFF6FF', fontWeight: 700, cursor: 'pointer' }}
                  >
                    <DollarSign size={14} /> Issue Refund
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowCreditNoteModal(true)}
                  style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', color: '#374151', background: '#F9FAFB', cursor: 'pointer' }}
                >
                  <FileText size={14} /> Issue Credit Note
                </button>
              </div>

              {/* Cancel Order Modal Form */}
              {showCancelModal && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: '#991B1B', marginBottom: '8px' }}>
                    Cancel Order #{selectedOrder.id.slice(-8).toUpperCase()}?
                  </div>
                  <p style={{ fontSize: '12px', color: '#7F1D1D', marginBottom: '10px' }}>
                    Cancelling will mark the order as cancelled and notify the customer. Invoices remain permanently archived.
                  </p>
                  <textarea
                    rows={2}
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    placeholder="Enter reason for cancellation..."
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #FCA5A5', fontSize: '13px', marginBottom: '10px' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => cancelOrderMutation.mutate({ id: selectedOrder.id, reason: cancelReason || 'Merchant cancelled order' })}
                      disabled={cancelOrderMutation.isPending}
                      style={{ flex: 1, padding: '8px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                    >
                      {cancelOrderMutation.isPending ? 'Cancelling...' : 'Confirm Order Cancellation'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCancelModal(false)}
                      className="btn btn-secondary"
                      style={{ padding: '8px 14px', fontSize: '13px' }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

              {/* Issue Refund Modal Form */}
              {showRefundModal && (
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: '#166534', marginBottom: '10px' }}>
                    Process Refund for Order #{selectedOrder.id.slice(-8).toUpperCase()}
                  </div>
                  <div style={{ fontSize: '12px', color: '#15803D', marginBottom: '12px' }}>
                    Maximum remaining refundable balance: <b>₹{((afterSales?.financials?.remainingRefundableMinor || 0) / 100).toLocaleString('en-IN')}</b>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>Refund Amount (INR ₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        max={(afterSales?.financials?.remainingRefundableMinor || 0) / 100}
                        value={refundAmount}
                        onChange={e => setRefundAmount(e.target.value)}
                        placeholder="e.g. 250.00"
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>Refund Method</label>
                      <select
                        value={refundMethod}
                        onChange={e => {
                          const m = e.target.value as any;
                          setRefundMethod(m);
                          setIsManualRefund(m !== 'original_payment_method');
                        }}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }}
                      >
                        {selectedOrder.payment_method === 'online' && (
                          <option value="original_payment_method">Original Payment Gateway (Razorpay/Cashfree)</option>
                        )}
                        <option value="upi">Manual UPI (Google Pay, PhonePe, Paytm)</option>
                        <option value="bank_transfer">Manual Bank Transfer (NEFT/IMPS)</option>
                        <option value="cash">Manual Cash Handshake</option>
                      </select>
                    </div>
                    {refundMethod !== 'original_payment_method' && (
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>Manual Reference / UTR (Optional)</label>
                        <input
                          type="text"
                          value={manualReference}
                          onChange={e => setManualReference(e.target.value)}
                          placeholder="e.g. UPI Ref # or Bank UTR"
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }}
                        />
                        <p style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                          ⚠️ FeraSetu records this payment adjustment authoritatively. Transfer funds separately via your UPI app or bank account.
                        </p>
                      </div>
                    )}
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>Reason</label>
                      <input
                        type="text"
                        value={refundReason}
                        onChange={e => setRefundReason(e.target.value)}
                        placeholder="e.g. Item defective, customer return, order cancelled"
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const amt = parseFloat(refundAmount);
                          if (!amt || amt <= 0) return toast.error('Please enter a valid refund amount');
                          const minor = Math.round(amt * 100);
                          refundOrderMutation.mutate({
                            id: selectedOrder.id,
                            amountMinor: minor,
                            reason: refundReason || 'Merchant issued refund',
                            refundMethod,
                            isManual: refundMethod !== 'original_payment_method',
                            manualReference,
                          });
                        }}
                        disabled={refundOrderMutation.isPending}
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '8px', fontSize: '13px' }}
                      >
                        {refundOrderMutation.isPending ? 'Processing...' : 'Confirm & Issue Refund'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRefundModal(false)}
                        className="btn btn-secondary"
                        style={{ padding: '8px 14px', fontSize: '13px' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Issue Credit Note Modal Form */}
              {showCreditNoteModal && (
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: '#1E293B', marginBottom: '8px' }}>
                    Issue Credit Note for Original Invoice
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '10px' }}>
                    Invoices are immutable. Issue a credit note to legally document price reductions, damaged goods, or partial adjustments.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>Reason for Credit Note</label>
                      <input
                        type="text"
                        value={creditNoteReason}
                        onChange={e => setCreditNoteReason(e.target.value)}
                        placeholder="e.g. Return of damaged item, goodwill discount"
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const items = (selectedOrder.items || []).map((it: any) => ({
                            name: it.product_name || it.name,
                            quantity: it.quantity,
                            unitPriceMinor: it.unitPriceMinor || Math.round((it.price || 0) * 100),
                            totalMinor: it.totalMinor || Math.round((it.price || 0) * (it.quantity || 1) * 100),
                            reason: creditNoteReason,
                          }));
                          creditNoteMutation.mutate({
                            id: selectedOrder.id,
                            reason: creditNoteReason || 'Goods returned / adjustment',
                            items,
                          });
                        }}
                        disabled={creditNoteMutation.isPending}
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '8px', fontSize: '13px' }}
                      >
                        {creditNoteMutation.isPending ? 'Issuing...' : 'Issue Credit Note (Full/Items)'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreditNoteModal(false)}
                        className="btn btn-secondary"
                        style={{ padding: '8px 14px', fontSize: '13px' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Refunds History List */}
              {afterSales?.refunds && afterSales.refunds.length > 0 && (
                <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '16px', marginBottom: '16px', border: '1px solid #E2E8F0' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '10px' }}>
                    Refund History ({afterSales.refunds.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {afterSales.refunds.map((ref: any) => (
                      <div key={ref.id} style={{ background: '#fff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, color: '#1E293B' }}>{ref.refund_number}</span>
                          <span style={{
                            padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase',
                            background: ref.status === 'completed' ? '#DCFCE7' : ref.status === 'failed' ? '#FEE2E2' : '#FEF3C7',
                            color: ref.status === 'completed' ? '#15803D' : ref.status === 'failed' ? '#B91C1C' : '#B45309'
                          }}>
                            {ref.status}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', color: '#64748B' }}>
                          <span>₹{(ref.amount_minor / 100).toLocaleString('en-IN')} · {ref.refund_method}</span>
                          <span>{new Date(ref.created_at).toLocaleDateString('en-IN')}</span>
                        </div>
                        {ref.manual_reference && (
                          <div style={{ fontSize: '11px', color: '#2563EB', marginTop: '2px' }}>
                            Ref: {ref.manual_reference}
                          </div>
                        )}
                        {ref.error_message && (
                          <div style={{ fontSize: '11px', color: '#DC2626', marginTop: '2px' }}>
                            Error: {ref.error_message}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Credit Notes History List */}
              {afterSales?.creditNotes && afterSales.creditNotes.length > 0 && (
                <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '16px', marginBottom: '16px', border: '1px solid #E2E8F0' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '10px' }}>
                    Credit Notes ({afterSales.creditNotes.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {afterSales.creditNotes.map((cn: any) => (
                      <div key={cn.id} style={{ background: '#fff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, color: '#1E293B' }}>{cn.credit_note_number}</span>
                          <button
                            type="button"
                            onClick={() => downloadPdf(`/orders/${selectedOrder.id}/credit-notes/${cn.id}/pdf`, `credit-note-${cn.credit_note_number}.pdf`)}
                            style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', fontWeight: 700, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Download size={12} /> PDF
                          </button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', color: '#64748B' }}>
                          <span>Credit: ₹{(cn.total_credit_minor / 100).toLocaleString('en-IN')}</span>
                          <span>{new Date(cn.issued_at || cn.created_at).toLocaleDateString('en-IN')}</span>
                        </div>
                        {cn.reason && (
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                            Reason: {cn.reason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Customer */}
              <div style={{
                background: 'var(--bg)', borderRadius: '10px', padding: '16px', marginBottom: '16px',
              }}>
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px' }}>CUSTOMER</h3>
                <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text)', marginBottom: '6px' }}>
                  {selectedOrder.customer_name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  <Phone size={13} /> {selectedOrder.customer_phone}
                </div>
                {selectedOrder.customer_address && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '14px', color: 'var(--text-muted)' }}>
                    <MapPin size={13} style={{ marginTop: '2px', flexShrink: 0 }} /> {selectedOrder.customer_address}
                  </div>
                )}
              </div>

              {/* Delivery type */}
              <div style={{ marginBottom: '16px' }}>
                <span style={{
                  padding: '4px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                  background: selectedOrder.delivery_type === 'delivery' ? 'rgba(6,182,212,0.15)' : 'rgba(16,185,129,0.15)',
                  color: selectedOrder.delivery_type === 'delivery' ? '#0891B2' : '#059669',
                }}>
                  {selectedOrder.delivery_type === 'delivery' ? '🛵 Home Delivery' : '🏪 Store Pickup'}
                </span>
              </div>

              {/* Delivery / Pickup Codes */}
              {selectedOrder.notes && selectedOrder.notes.includes('Code:') && (
                <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                        <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 800 }}>Delivery Code</div>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--primary)', letterSpacing: '1px' }}>
                          {selectedOrder.delivery_code || (typeof selectedOrder.notes === 'string' ? selectedOrder.notes.match(/Code:\s*([A-Z0-9]+)/i)?.[1] : null) || '---'}
                        </div>
                    </div>
                    <div style={{ borderLeft: '1px solid #E2E8F0', paddingLeft: '12px' }}>
                        <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 800 }}>Payment OTP</div>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: '#1E293B', letterSpacing: '1px' }}>
                          {(typeof selectedOrder.notes === 'string' ? selectedOrder.notes.match(/OTP:\s*([0-9]+)/i)?.[1] : null) || '---'}
                        </div>
                    </div>
                  </div>
                  <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '10px' }}>
                    Ask the customer for the <b>{selectedOrder.delivery_type === 'delivery' ? 'Security Code' : 'OTP'}</b> to verify the handshake.
                  </p>
                </div>
              )}

              {/* Items */}
              <div style={{ background: 'var(--bg)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px' }}>
                  ORDER ITEMS ({selectedOrder.items?.length || 0})
                </h3>
                {selectedOrder.items?.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '8px 0', borderBottom: i < selectedOrder.items.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>{item.product_name || item.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Qty: {item.quantity} × ₹{item.price.toLocaleString('en-IN')}</div>
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '14px' }}>
                      ₹{(item.quantity * item.price).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', marginTop: '12px',
                  paddingTop: '12px', borderTop: '2px solid var(--border)',
                }}>
                  <span style={{ fontWeight: 700, color: 'var(--text)' }}>Total</span>
                  <span style={{ fontWeight: 800, fontSize: '18px', color: 'var(--primary)' }}>
                    ₹{selectedOrder.total.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div style={{ background: 'rgba(245,158,11,0.1)', borderRadius: '10px', padding: '14px' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#D97706', marginBottom: '6px' }}>📝 CUSTOMER NOTES</h3>
                  <p style={{ fontSize: '14px', color: 'var(--text)' }}>{selectedOrder.notes}</p>
                </div>
              )}

              {/* Update status */}
              <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
                  Update Order
                </label>

                {selectedOrder.status === 'pending' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        handleStatusChange(selectedOrder, 'confirmed');
                        setSelectedOrder({ ...selectedOrder, status: 'confirmed' });
                      }}
                      className="btn"
                      style={{
                        minHeight: '48px',
                        background: '#10B981',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
                      }}
                    >
                      <CheckCircle2 size={18} /> Confirm Order
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderToCancel(selectedOrder)}
                      className="btn"
                      style={{
                        minHeight: '48px',
                        background: '#EF4444',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(239,68,68,0.25)',
                      }}
                    >
                      <X size={18} /> Cancel Order
                    </button>
                  </div>
                )}

                {(selectedOrder.status === 'confirmed' || selectedOrder.status === 'preparing' || selectedOrder.status === 'out_for_delivery') && (
                  <div style={{ marginBottom: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setOrderForDeliveryCode(selectedOrder)}
                      className="btn"
                      style={{
                        width: '100%',
                        minHeight: '48px',
                        background: '#4F46E5',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        borderRadius: '8px',
                        boxShadow: '0 2px 10px rgba(79,70,229,0.25)',
                      }}
                    >
                      <Key size={18} /> Enter Customer Code to Deliver
                    </button>
                  </div>
                )}

                {selectedOrder.status === 'delivered' ? (
                  <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#047857', fontWeight: 700, fontSize: '13px' }}>
                      <CheckCircle2 size={18} /> Order Delivered & Finalized
                    </div>
                    <p style={{ fontSize: '12px', color: '#065f46', marginTop: '4px' }}>
                      🔒 This order is delivered. The status is permanently locked and cannot be changed.
                    </p>
                    <button
                      type="button"
                      onClick={() => setInvoiceOrder(selectedOrder)}
                      className="btn"
                      style={{
                        width: '100%',
                        minHeight: '44px',
                        marginTop: '10px',
                        background: '#047857',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        borderRadius: '8px',
                      }}
                    >
                      <FileText size={16} /> Download Tax Invoice (PDF)
                    </button>
                  </div>
                ) : (
                  <>
                    <select
                      value={selectedOrder.status}
                      disabled={selectedOrder.status === 'cancelled' || selectedOrder.status === 'delivered'}
                      onChange={e => {
                        handleStatusChange(selectedOrder, e.target.value);
                        if (e.target.value !== 'cancelled') {
                          setSelectedOrder({ ...selectedOrder, status: e.target.value });
                        }
                      }}
                      className="input"
                      style={{
                        width: '100%',
                        background: selectedOrder.status === 'cancelled' ? '#f1f5f9' : undefined,
                        color: selectedOrder.status === 'cancelled' ? '#94a3b8' : undefined,
                        cursor: selectedOrder.status === 'cancelled' ? 'not-allowed' : undefined,
                      }}
                    >
                      {Object.entries(STATUS_LABELS).filter(([k]) => k !== 'all').map(([k, v]) => (
                        <option
                          key={k}
                          value={k}
                          disabled={
                            (selectedOrder.status === 'cancelled' && k !== 'cancelled') ||
                            (k === 'delivered' && selectedOrder.status !== 'delivered')
                          }
                        >
                          {selectedOrder.status === 'cancelled' && k === 'cancelled'
                            ? 'Cancelled (Locked — Irreversible)'
                            : k === 'delivered' && selectedOrder.status !== 'delivered'
                            ? 'Delivered (Requires Delivery Code)'
                            : v}
                        </option>
                      ))}
                    </select>
                    {selectedOrder.status === 'cancelled' && (
                      <p style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                        🔒 This order is cancelled and cannot be changed to other updates.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {invoiceOrder && (
        <InvoiceModal
          order={invoiceOrder}
          onClose={() => setInvoiceOrder(null)}
          onPaymentUpdate={handlePaymentUpdate}
          onVerifyOtp={handleVerifyOtp}
          merchantName={user?.business_name || user?.name || 'Store'}
          merchantLogo={(user as any)?.logo_url || null}
        />
      )}

      {/* Add Order / WhatsApp Checkout Link Modal */}
      <AddOrderModal
        isOpen={showAddOrderModal}
        onClose={() => setShowAddOrderModal(false)}
        user={user}
        onOrderCreated={() => queryClient.invalidateQueries({ queryKey: ['orders'] })}
      />

      {/* Cancel Order Irreversible Confirmation Modal */}
      <CancelConfirmationModal
        isOpen={!!orderToCancel}
        order={orderToCancel}
        onClose={() => setOrderToCancel(null)}
        onProceed={async (reason) => {
          if (!orderToCancel) return;
          await cancelOrderMutation.mutateAsync({
            id: orderToCancel.id,
            reason: reason || 'Merchant cancelled order',
          });
        }}
        isSubmitting={cancelOrderMutation.isPending}
      />

      {/* Order Payment QR & Link Modal */}
      <OrderPaymentQrModal
        isOpen={!!qrModalOrder}
        onClose={() => setQrModalOrder(null)}
        order={qrModalOrder}
        user={user}
        onPaymentConfirmed={(orderId) => {
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          if (selectedOrder?.id === orderId) {
            setSelectedOrder(prev => prev ? { ...prev, payment_status: 'paid', status: 'confirmed' } : null);
          }
          setQrModalOrder(prev => prev ? { ...prev, payment_status: 'paid', status: 'confirmed' } : null);
        }}
      />

      {/* Customer Delivery Code Modal */}
      <EnterDeliveryCodeModal
        isOpen={!!orderForDeliveryCode}
        order={orderForDeliveryCode as any}
        onClose={() => setOrderForDeliveryCode(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          if (selectedOrder && orderForDeliveryCode && selectedOrder.id === orderForDeliveryCode.id) {
            setSelectedOrder(prev => prev ? { ...prev, status: 'delivered', payment_status: 'paid' } : null);
          }
          setOrderForDeliveryCode(null);
        }}
      />

      {/* Return Request & Loss Analysis Modal */}
      <ReturnDetailsModal
        isOpen={!!orderForReturnReview}
        order={orderForReturnReview as any}
        onClose={() => setOrderForReturnReview(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          refetchAfterSales();
          setOrderForReturnReview(null);
        }}
      />
    </div>
  );
}

