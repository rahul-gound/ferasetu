import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ShoppingCart, X, Package, Phone, MapPin, ChevronDown, ShieldCheck, Printer, Clock,
  Download, Share2, Copy, Check, ExternalLink, Sparkles
} from 'lucide-react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import ActionableEmptyState from '../components/ui/ActionableEmptyState';
import { getStorefrontUrl } from '../utils/canonicalHostname';

interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address?: string;
  items: OrderItem[];
  items_count: number;
  total: number;
  delivery_type: 'delivery' | 'pickup';
  status: string;
  payment_status?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

const ALL_STATUSES = ['all', 'pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:          { bg: 'rgba(245,158,11,0.15)',  color: '#D97706' },
  confirmed:        { bg: 'rgba(59,130,246,0.15)',  color: '#2563EB' },
  preparing:        { bg: 'rgba(139,92,246,0.15)',  color: '#7C3AED' },
  out_for_delivery: { bg: 'rgba(6,182,212,0.15)',   color: '#0891B2' },
  delivered:        { bg: 'rgba(16,185,129,0.15)',  color: '#059669' },
  cancelled:        { bg: 'rgba(239,68,68,0.15)',   color: '#DC2626' },
};

const STATUS_LABELS: Record<string, string> = {
  all: 'All', pending: 'Pending', confirmed: 'Confirmed',
  preparing: 'Preparing', out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered', cancelled: 'Cancelled',
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
  const [otpValue, setOtpValue] = useState('');
  const invoiceNum = order.invoice_number || `INV-${order.id.slice(-8).toUpperCase()}`;
  const invoiceDate = new Date(order.created_at).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  return (
    <div className="no-print" style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '620px',
        maxHeight: '92vh', overflowY: 'auto', color: '#1E293B',
      }}>
        {/* Invoice header */}
        <div style={{
          background: 'linear-gradient(135deg, #FF6B35, #004E89)',
          borderRadius: '16px 16px 0 0', padding: '28px 32px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#fff', letterSpacing: '0.05em' }}>
              TAX INVOICE
            </div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', marginTop: '6px' }}>
              {invoiceNum} · {invoiceDate}
            </div>
          </div>
          <button
            onClick={onClose}
            className="no-print"
            style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer',
              color: '#fff', borderRadius: '8px', padding: '8px',
              display: 'flex', alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 sm:p-7">
          {/* Handshake Panel */}
          {order.payment_status !== 'paid' && (
            <div style={{ background: '#FFF7ED', border: '2px solid #FFEDD5', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <ShieldCheck size={20} color="#FF6B35" />
                  <span style={{ fontWeight: 800, fontSize: '15px', color: '#9A3412' }}>Secure Payment Verification</span>
               </div>
               <p style={{ fontSize: '13px', color: '#C2410C', marginBottom: '14px' }}>
                  Please ask the customer for the <b>{order.delivery_type === 'delivery' ? 'Security Code' : 'Payment OTP'}</b> to confirm this transaction.
               </p>
               <div className="flex flex-col sm:flex-row gap-2.5">
                  <input 
                    placeholder="Enter Code/OTP" 
                    value={otpValue}
                    onChange={e => setOtpValue(e.target.value.toUpperCase())}
                    className="flex-1 p-3 rounded-xl border border-amber-200 font-bold text-base outline-none bg-white"
                  />
                  <button 
                    onClick={() => onVerifyOtp(order.id, otpValue)}
                    className="bg-[#FF6B35] text-white border-0 py-3 px-5 rounded-xl font-bold cursor-pointer hover:bg-orange-600 transition-colors"
                  >
                    Verify & Pay
                  </button>
               </div>
            </div>
          )}

          {/* Shop & Customer info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '8px' }}>From</div>
              {merchantLogo && (
                <img src={merchantLogo} alt={merchantName || 'Store'} className="h-8 w-auto object-contain mb-2" />
              )}
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#1E293B' }}>{merchantName || 'Store'}</div>
              <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', lineHeight: 1.5 }}>
                 Store Order: #{order.id.slice(0, 8).toUpperCase()}
              </div>
            </div>
            <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '8px' }}>Bill To</div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#1E293B' }}>{order.customer_name}</div>
              <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', lineHeight: 1.5 }}>
                {order.customer_phone}
                {order.customer_address && <><br />{order.customer_address}</>}
              </div>
            </div>
          </div>

          {/* Items table */}
          <div style={{ marginBottom: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#F1F5F9', borderRadius: '6px' }}>
                  {['Product', 'Qty', 'Unit Price', 'Total'].map(h => (
                    <th key={h} style={{
                      padding: '10px 12px', textAlign: h === 'Product' ? 'left' : 'right',
                      fontSize: '12px', fontWeight: 700, color: '#64748B',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px', fontWeight: 500 }}>{item.product_name}</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#64748B' }}>{item.quantity}</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#64748B' }}>₹{item.price.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>₹{(item.quantity * item.price).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div style={{
            background: '#F8FAFC', borderRadius: '10px', padding: '16px',
            marginBottom: '20px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#64748B' }}>
              <span>Subtotal</span>
              <span>₹{(order.subtotal || Math.max(0, order.total - (order.delivery_fee ?? (order.delivery_type === 'delivery' ? 30 : 0)))).toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#64748B' }}>
              <span>Delivery Fee</span>
              <span>{order.delivery_type === 'pickup' ? 'Free' : `₹${order.delivery_fee ?? 30}`}</span>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', paddingTop: '12px',
              borderTop: '2px solid #E2E8F0', fontWeight: 800, fontSize: '18px',
            }}>
              <span>Grand Total</span>
              <span style={{ color: '#FF6B35' }}>₹{order.total.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Payment status */}
          <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Payment Status:</span>
            <PaymentBadge status={order.payment_status} />
          </div>

          {/* Action buttons */}
          <div className="no-print" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {order.payment_status !== 'paid' && (
              <button
                className="btn btn-secondary"
                onClick={() => onPaymentUpdate(order.id, 'pay_later')}
                style={{ flex: 1, minWidth: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Clock size={16} /> Pay Later
              </button>
            )}
            <button
              className="btn btn-secondary"
              onClick={() => window.print()}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Printer size={16} /> Print Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
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

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await api.get('/orders');
      const data = res.data;
      return Array.isArray(data) ? data : (data?.orders || []);
    },
  });

  const otpMutation = useMutation({
    mutationFn: ({ id, otp }: { id: string; otp: string }) =>
      api.post(`/orders/${id}/verify-otp`, { otp }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('OTP Verified! Payment Confirmed.');
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

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/orders/${id}/status`, { status }),
    onSuccess: () => {
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
      toast.success('Payment status updated!');
    },
    onError: () => toast.error('Failed to update payment status'),
  });

  const handleStatusChange = (id: string, status: string) => {
    setUpdatingId(id);
    updateMutation.mutate({ id, status });
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
          const count = status === 'all' ? orders.length : orders.filter(o => o.status === status).length;
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
                    <div className="relative flex-1">
                      <select
                        value={order.status}
                        disabled={updatingId === order.id}
                        onChange={e => handleStatusChange(order.id, e.target.value)}
                        className="w-full text-xs font-semibold py-1.5 pl-2.5 pr-7 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                      >
                        {Object.entries(STATUS_LABELS).filter(([k]) => k !== 'all').map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                    </div>

                    <button
                      type="button"
                      onClick={() => setInvoiceOrder(order)}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      🧾 Invoice
                    </button>
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
                        <StatusBadge status={order.status} />
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
                        <div style={{ position: 'relative' }}>
                          <select
                            value={order.status}
                            disabled={updatingId === order.id}
                            onChange={e => handleStatusChange(order.id, e.target.value)}
                            onClick={e => e.stopPropagation()}
                            style={{
                              padding: '6px 28px 6px 10px', borderRadius: '6px', fontSize: '12px',
                              border: '1px solid var(--border)', background: 'var(--bg)',
                              color: 'var(--text)', cursor: 'pointer', appearance: 'none',
                              opacity: updatingId === order.id ? 0.5 : 1,
                            }}
                          >
                            {Object.entries(STATUS_LABELS).filter(([k]) => k !== 'all').map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                          <ChevronDown size={12} style={{
                            position: 'absolute', right: '6px', top: '50%',
                            transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)',
                          }} />
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <button
                          className="btn btn-secondary"
                          onClick={e => { e.stopPropagation(); setInvoiceOrder(order); }}
                          style={{ fontSize: '12px', padding: '5px 10px', whiteSpace: 'nowrap' }}
                        >
                          🧾 Invoice
                        </button>
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
            background: 'var(--surface)', borderRadius: '16px', width: '100%', maxWidth: '520px',
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
              <div style={{ marginBottom: '20px' }}>
                <StatusBadge status={selectedOrder.status} />
                <span style={{ marginLeft: '10px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  {new Date(selectedOrder.created_at).toLocaleString('en-IN')}
                </span>
              </div>

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
                      <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>{item.product_name}</div>
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
              <div style={{ marginTop: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
                  Update Status
                </label>
                <select
                  value={selectedOrder.status}
                  onChange={e => {
                    handleStatusChange(selectedOrder.id, e.target.value);
                    setSelectedOrder({ ...selectedOrder, status: e.target.value });
                  }}
                  className="input"
                  style={{ width: '100%' }}
                >
                  {Object.entries(STATUS_LABELS).filter(([k]) => k !== 'all').map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
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
    </div>
  );
}
