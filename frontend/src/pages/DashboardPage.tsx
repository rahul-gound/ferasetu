import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, ShoppingCart, Clock, AlertTriangle, Plus, Bot, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

interface DashboardData {
  stats: {
    total_revenue: number;
    total_orders: number;
    pending_orders: number;
    low_stock_count: number;
    revenue_change: number;
    orders_change: number;
  };
  revenue_chart: { date: string; revenue: number }[];
  recent_orders: {
    id: string;
    customer_name: string;
    total: number;
    status: string;
    created_at: string;
    items_count: number;
  }[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  confirmed: '#3B82F6',
  preparing: '#8B5CF6',
  out_for_delivery: '#06B6D4',
  delivered: '#10B981',
  cancelled: '#EF4444',
};

function Shimmer({ w = '100%', h = '20px', r = '6px' }: { w?: string; h?: string; r?: string }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  );
}

function StatCard({
  label, value, icon, color, change, loading,
}: {
  label: string; value: string; icon: React.ReactNode;
  color: string; change?: number; loading: boolean;
}) {
  return (
    <div className="card" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: 0, right: 0, width: '80px', height: '80px',
        borderRadius: '0 12px 0 80px', opacity: 0.08, background: color,
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: color,
        }}>
          {icon}
        </div>
      </div>
      {loading ? (
        <Shimmer h="32px" w="60%" />
      ) : (
        <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{value}</div>
      )}
      {change !== undefined && !loading && (
        <div style={{
          marginTop: '8px', fontSize: '12px',
          color: change >= 0 ? '#10B981' : '#EF4444',
          fontWeight: 600,
        }}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% vs last month
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { translate } = useLanguage();

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get('/analytics/dashboard');
      return res.data;
    },
    retry: 1,
  });

  if (error) {
    toast.error('Failed to load dashboard data');
  }

  const stats = data?.stats;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)' }}>
          Good morning, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '14px' }}>
          Here's what's happening with your store today
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px', marginBottom: '28px',
      }}>
        <StatCard
          label={translate('totalRevenue')}
          value={stats ? `₹${stats.total_revenue.toLocaleString('en-IN')}` : '—'}
          icon={<TrendingUp size={18} />}
          color="#FF6B35"
          change={stats?.revenue_change}
          loading={isLoading}
        />
        <StatCard
          label={translate('totalOrders')}
          value={stats ? String(stats.total_orders) : '—'}
          icon={<ShoppingCart size={18} />}
          color="#004E89"
          change={stats?.orders_change}
          loading={isLoading}
        />
        <StatCard
          label={translate('pendingOrders')}
          value={stats ? String(stats.pending_orders) : '—'}
          icon={<Clock size={18} />}
          color="#F59E0B"
          loading={isLoading}
        />
        <StatCard
          label={translate('lowStock')}
          value={stats ? String(stats.low_stock_count) : '—'}
          icon={<AlertTriangle size={18} />}
          color="#EF4444"
          loading={isLoading}
        />
      </div>

      {/* Charts + Orders Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px', marginBottom: '28px' }}>
        {/* Revenue Chart */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', color: 'var(--text)' }}>
            Revenue (Last 30 Days)
          </h2>
          {isLoading ? (
            <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shimmer h="220px" />
            </div>
          ) : data?.revenue_chart && data.revenue_chart.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.revenue_chart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => `₹${v}`} />
                <Tooltip
                  formatter={(v: unknown) => [`₹${(v as number).toLocaleString('en-IN')}`, 'Revenue']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px' }}
                />
                <Line
                  type="monotone" dataKey="revenue" stroke="#FF6B35" strokeWidth={2.5}
                  dot={false} activeDot={{ r: 5, fill: '#FF6B35' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{
              height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)', fontSize: '14px',
            }}>
              No revenue data yet
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', color: 'var(--text)' }}>
            Quick Actions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: translate('addProduct'), icon: <Plus size={18} />, to: '/products', color: '#FF6B35', bg: 'rgba(255,107,53,0.1)' },
              { label: 'New Order', icon: <ShoppingCart size={18} />, to: '/orders', color: '#004E89', bg: 'rgba(0,78,137,0.1)' },
              { label: translate('aiAssistant'), icon: <Bot size={18} />, to: '/ai-assistant', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
              { label: translate('analytics'), icon: <TrendingUp size={18} />, to: '/analytics', color: '#1A936F', bg: 'rgba(26,147,111,0.1)' },
            ].map(action => (
              <Link
                key={action.label}
                to={action.to}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 16px', borderRadius: '10px',
                  background: action.bg, textDecoration: 'none',
                  color: action.color, fontWeight: 600, fontSize: '14px',
                  transition: 'transform 0.15s',
                }}
              >
                {action.icon}
                {action.label}
              </Link>
            ))}
          </div>

          {/* Plan upgrade notice */}
          {user?.plan === 'free' && (
            <div style={{
              marginTop: '20px', padding: '14px', borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(255,107,53,0.1), rgba(0,78,137,0.1))',
              border: '1px solid rgba(255,107,53,0.2)',
            }}>
              <p style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 600, marginBottom: '6px' }}>
                ⭐ Upgrade to Premium
              </p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                Unlimited products, custom domain & AI predictions
              </p>
              <Link
                to="/upgrade"
                style={{
                  display: 'block', textAlign: 'center',
                  padding: '8px', borderRadius: '8px',
                  background: 'linear-gradient(135deg, #FF6B35, #e55a24)',
                  color: '#fff', textDecoration: 'none',
                  fontSize: '12px', fontWeight: 700,
                }}
              >
                Upgrade for ₹499/mo →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>Recent Orders</h2>
          <Link to="/orders" style={{ fontSize: '13px', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
            {translate('viewAll')} →
          </Link>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3].map(i => <Shimmer key={i} h="48px" />)}
          </div>
        ) : data?.recent_orders && data.recent_orders.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Customer', 'Items', 'Total', 'Status', 'Date'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '8px 12px',
                      fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recent_orders.slice(0, 5).map(order => (
                  <tr key={order.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 12px', fontWeight: 500, color: 'var(--text)' }}>
                      {order.customer_name}
                    </td>
                    <td style={{ padding: '12px 12px', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Package size={13} /> {order.items_count}
                      </span>
                    </td>
                    <td style={{ padding: '12px 12px', fontWeight: 600, color: 'var(--text)' }}>
                      ₹{order.total.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 12px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                        background: `${STATUS_COLORS[order.status] || '#888'}20`,
                        color: STATUS_COLORS[order.status] || '#888',
                      }}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 12px', color: 'var(--text-muted)', fontSize: '12px' }}>
                      {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{
            textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '14px',
          }}>
            <ShoppingCart size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
            <p>No orders yet. Share your store link to get your first order!</p>
          </div>
        )}
      </div>

      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </div>
  );
}
