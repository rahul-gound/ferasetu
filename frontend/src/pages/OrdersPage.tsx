import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ShoppingCart, X, Package, Phone, MapPin, ChevronDown, CheckCircle, ShieldCheck, Printer, Clock } from 'lucide-react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

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

function InvoiceModal({ order, onClose, onPaymentUpdate, onVerifyOtp }: {
  order: Order;
  onClose: () => void;
  onPaymentUpdate: (id: string, status: string) => void;
  onVerifyOtp: (id: string, otp: string) => void;
}) {
  const [otpValue, setOtpValue] = useState('');
  const invoiceNum = `INV-${order.id.slice(-8).toUpperCase()}`;
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

        <div style={{ padding: '28px 32px' }}>
          {/* Handshake Panel */}
          {order.payment_status !== 'paid' && (
            <div style={{ background: '#FFF7ED', border: '2px solid #FFEDD5', borderRadius: '14px', padding: '20px', marginBottom: '24px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <ShieldCheck size={20} color="#FF6B35" />
                  <span style={{ fontWeight: 800, fontSize: '15px', color: '#9A3412' }}>Secure Payment Verification</span>
               </div>
               <p style={{ fontSize: '13px', color: '#C2410C', marginBottom: '16px' }}>
                  Please ask the customer for the <b>{order.delivery_type === 'delivery' ? 'Security Code' : 'Payment OTP'}</b> to confirm this transaction.
               </p>
               <div style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    placeholder="Enter Code/OTP" 
                    value={otpValue}
                    onChange={e => setOtpValue(e.target.value.toUpperCase())}
                    style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #FFD8A8', fontWeight: 700, fontSize: '16px', outline: 'none' }}
                  />
                  <button 
                    onClick={() => onVerifyOtp(order.id, otpValue)}
                    style={{ background: '#FF6B35', color: '#fff', border: 'none', padding: '0 20px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Verify & Pay
                  </button>
               </div>
            </div>
          )}

          {/* Shop & Customer info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '8px' }}>From</div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#1E293B' }}>Fera Shop Partner</div>
              <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', lineHeight: 1.5 }}>
                 Merchant ID: {order.id.slice(0,8)}
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
              <span>₹{order.total.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#64748B' }}>
              <span>Delivery Fee</span>
              <span>{order.delivery_type === 'pickup' ? 'Free' : '₹30'}</span>
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
      return res.data.orders || res.data;
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
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)' }}>{translate('orders')}</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
          {orders.length} total orders
        </p>
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
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <ShoppingCart size={48} style={{ marginBottom: '12px', opacity: 0.3 }} />
            <p style={{ fontSize: '16px', fontWeight: 600 }}>No orders found</p>
            <p style={{ fontSize: '14px', marginTop: '4px' }}>
              {activeTab === 'all' ? 'Orders will appear here when customers place them.' : `No ${STATUS_LABELS[activeTab].toLowerCase()} orders.`}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
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
                         {selectedOrder.notes.match(/Code: ([A-Z0-9]+)/)?.[1] || '---'}
                       </div>
                    </div>
                    <div style={{ borderLeft: '1px solid #E2E8F0', paddingLeft: '12px' }}>
                       <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 800 }}>Payment OTP</div>
                       <div style={{ fontSize: '20px', fontWeight: 900, color: '#1E293B', letterSpacing: '1px' }}>
                         {selectedOrder.notes.match(/OTP: ([0-9]+)/)?.[1] || '---'}
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
        />
      )}
    </div>
  );
}
