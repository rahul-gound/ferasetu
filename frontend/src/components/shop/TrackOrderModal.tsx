import { useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import { X, Search, Phone, Clock, Truck, MapPin, FileText, Download } from 'lucide-react';
import InvoiceDocumentModal from '../orders/InvoiceDocumentModal';

const API = import.meta.env.VITE_API_URL || '/api';

interface TrackOrderModalProps {
  shopId: string;
  onClose: () => void;
}

export default function TrackOrderModal({ shopId, onClose }: TrackOrderModalProps) {
  const [phone, setPhone] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [viewingInvoiceOrder, setViewingInvoiceOrder] = useState<any>(null);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    setLoading(true);
    try {
      const res = await axios.get(`${API}/orders/public/track`, {
        params: { phone, shopId }
      });
      setOrders(res.data.orders);
      setSearched(true);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div style={{
        background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '500px',
        maxHeight: '85vh', overflowY: 'auto', position: 'relative',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'slideUp 0.3s ease'
      }}>
        <style>{`@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '20px', right: '20px', background: '#f1f5f9', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer', zIndex: 10 }}
        >
          <X size={20} />
        </button>

        <div style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>Track Your Order</h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>Enter your phone number to see your recent orders and codes.</p>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Phone size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#94a3b8' }} />
              <input
                required
                type="tel"
                placeholder="Enter Phone Number"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '14px', border: '2px solid #e2e8f0', fontSize: '15px', outline: 'none' }}
              />
            </div>
            <button 
              disabled={loading}
              style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '0 20px', borderRadius: '14px', fontWeight: 700, cursor: 'pointer' }}
            >
              {loading ? '...' : <Search size={20} />}
            </button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {loading ? (
              <p style={{ textAlign: 'center', color: '#94a3b8' }}>Fetching your orders...</p>
            ) : searched && orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                 <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
                 <p style={{ fontWeight: 600, color: '#0f172a' }}>No orders found for this number.</p>
                 <p style={{ fontSize: '13px', color: '#64748b' }}>Check the number or place a new order.</p>
              </div>
            ) : orders.map(order => {
              const isEligibleForCancel = ['pending', 'confirmed'].includes(order.status) && order.cancellation_status !== 'cancelled';
              const isCancelled = order.status === 'cancelled' || order.cancellation_status === 'cancelled';

              return (
                <div key={order.id} style={{ padding: '20px', borderRadius: '18px', border: '1px solid #f1f5f9', background: '#fcfcfd' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                     <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                          {order.invoice_number || `#${order.id.slice(-6).toUpperCase()}`}
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>₹{order.total?.toLocaleString('en-IN')}</div>
                     </div>
                     <span style={{ 
                        background: order.status === 'delivered' ? '#f0fdf4' : isCancelled ? '#fef2f2' : '#fff7ed', 
                        color: order.status === 'delivered' ? '#16a34a' : isCancelled ? '#dc2626' : '#c2410c',
                        padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase'
                     }}>
                        {order.status}
                     </span>
                  </div>

                  {isCancelled && (
                    <div style={{ padding: '8px 12px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fee2e2', marginBottom: '12px', fontSize: '12px', color: '#b91c1c' }}>
                      <span style={{ fontWeight: 700 }}>Cancelled:</span> {order.cancellation_reason || 'Order cancelled'}
                    </div>
                  )}

                  {order.refunded_amount_minor > 0 && (
                    <div style={{ padding: '8px 12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #dcfce7', marginBottom: '12px', fontSize: '12px', color: '#15803d', fontWeight: 700 }}>
                      Refund: ₹{(order.refunded_amount_minor / 100).toLocaleString('en-IN')}
                    </div>
                  )}

                  {!isCancelled && order.status !== 'delivered' && (
                    <div style={{ background: '#fff', padding: '12px', borderRadius: '12px', border: '1px solid #f1f5f9', marginBottom: '12px' }}>
                       {order.delivery_type === 'delivery' ? (
                          <div>
                             <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Delivery Security Code</div>
                             <div style={{ fontSize: '18px', fontWeight: 900, color: '#FF6B35', letterSpacing: '1px' }}>
                               {order.delivery_code || (typeof order.notes === 'string' ? order.notes.match(/Code:\s*([A-Z0-9]+)/i)?.[1] : null) || '---'}
                             </div>
                          </div>
                       ) : (
                          <div>
                             <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Pick-up OTP</div>
                             <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', letterSpacing: '1px' }}>
                               {(typeof order.notes === 'string' ? order.notes.match(/OTP:\s*([0-9]+)/i)?.[1] : null) || order.delivery_code || '---'}
                             </div>
                          </div>
                       )}
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {order.delivery_type === 'delivery' ? <Truck size={14} /> : <MapPin size={14} />}
                        {order.delivery_type || 'standard'}
                     </div>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={14} /> {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN') : 'Recent'}
                     </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setViewingInvoiceOrder(order)}
                      style={{
                        padding: '8px 12px', borderRadius: '10px',
                        background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe',
                        fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                      }}
                    >
                      <FileText size={14} />
                      <span>View Invoice</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const token = order.tracking_token || '';
                        window.open(`${API}/orders/public/${order.id}/invoice/pdf?token=${encodeURIComponent(token)}`, '_blank');
                      }}
                      style={{
                        flex: 1, padding: '8px 12px', borderRadius: '10px',
                        background: '#0f172a', color: '#fff', border: 'none',
                        fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                      }}
                    >
                      <Download size={14} />
                      <span>Download PDF</span>
                    </button>

                    {isEligibleForCancel && (
                      <button
                        type="button"
                        onClick={async () => {
                          const reason = window.prompt('Please enter the reason for cancellation:');
                          if (!reason) return;
                          try {
                            await axios.post(`${API}/orders/public/${order.id}/cancel`, {
                              token: order.tracking_token,
                              reason,
                            });
                            alert('Order cancelled successfully.');
                            // Trigger refresh by re-submitting phone query
                            const res = await axios.get(`${API}/orders/public/track`, { params: { phone, shopId } });
                            setOrders(res.data.orders);
                          } catch (err: any) {
                            alert(err.response?.data?.error || 'Failed to cancel order');
                          }
                        }}
                        style={{
                          padding: '8px 12px', borderRadius: '10px',
                          background: '#fff', color: '#dc2626', border: '1px solid #fca5a5',
                          fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {viewingInvoiceOrder && (
        <InvoiceDocumentModal
          order={viewingInvoiceOrder}
          onClose={() => setViewingInvoiceOrder(null)}
          isCustomerView={true}
          trackingToken={viewingInvoiceOrder.tracking_token}
        />
      )}
    </div>
  );
}
