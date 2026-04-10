import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ShoppingCart, X, Package, Phone, MapPin, ChevronDown } from 'lucide-react';
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

export default function OrdersPage() {
  const { translate } = useLanguage();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: async () => (await api.get('/orders')).data,
  });

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

  const handleStatusChange = (id: string, status: string) => {
    setUpdatingId(id);
    updateMutation.mutate({ id, status });
  };

  const filtered = activeTab === 'all'
    ? orders
    : orders.filter(o => o.status === activeTab);

  return (
    <div>
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
                  {['Customer', 'Phone', 'Items', 'Total', 'Type', 'Status', 'Date', 'Update'].map(h => (
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

      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </div>
  );
}
