import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { TrendingUp, ShoppingCart, Clock, AlertTriangle, Plus, Bot, Package, ArrowRight, Zap } from 'lucide-react';
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

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  pending:          { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  label: 'Pending' },
  confirmed:        { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  label: 'Confirmed' },
  preparing:        { color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)',  label: 'Preparing' },
  out_for_delivery: { color: '#06B6D4', bg: 'rgba(6,182,212,0.12)',   label: 'On the Way' },
  delivered:        { color: '#10B981', bg: 'rgba(16,185,129,0.12)',  label: 'Delivered' },
  cancelled:        { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   label: 'Cancelled' },
};

function Shimmer({ w = '100%', h = '20px', r = '10px' }: { w?: string; h?: string; r?: string }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%)',
      backgroundSize: '200% 100%',
      animation: 'db-shimmer 1.4s infinite',
    }} />
  );
}

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  gradient: string;
  glowColor: string;
  change?: number;
  loading: boolean;
}

function StatCard({ label, value, icon, gradient, glowColor, change, loading }: StatCardProps) {
  return (
    <div style={{
      padding: '28px 28px 24px',
      borderRadius: 24,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      position: 'relative',
      overflow: 'hidden',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      cursor: 'default',
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px) scale(1.01)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 20px 60px ${glowColor}25`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0) scale(1)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}>

      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: -30, right: -30,
        width: 100, height: 100, borderRadius: '50%',
        background: glowColor, filter: 'blur(30px)', opacity: 0.4,
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 46, height: 46, borderRadius: 16,
          background: gradient,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff',
          boxShadow: `0 8px 24px ${glowColor}50`,
        }}>
          {icon}
        </div>
        {change !== undefined && !loading && (
          <div style={{
            fontSize: 12, fontWeight: 700,
            color: change >= 0 ? '#10B981' : '#EF4444',
            background: change >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${change >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
            padding: '3px 10px', borderRadius: 50,
          }}>
            {change >= 0 ? '+' : ''}{change}%
          </div>
        )}
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
          {label}
        </div>
        {loading ? (
          <Shimmer h="36px" w="55%" />
        ) : (
          <div style={{ fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1 }}>
            {value}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, sendVerificationEmail } = useAuth();
  const { translate } = useLanguage();
  const [showRating, setShowRating] = useState(false);
  const [showRating, setShowRating] = useState(false);

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get('/analytics/dashboard');
      return res.data;
    },
    retry: 1,
  });

  useEffect(() => {
    if (error) toast.error('Failed to load dashboard data');
  }, [error]);

  const stats = data?.stats;
  const isNewUser = !data || data?.stats?.total_orders === 0;

  // NPS/Rating logic: After first order, show rating popup
  useEffect(() => {
    if (data && stats) {
      const hasOrder = stats.total_orders >= 1;
      const alreadyRated = localStorage.getItem('fera_rated');
      if (hasOrder && !alreadyRated) {
        // Delay popup slightly for better UX
        const timer = setTimeout(() => setShowRating(true), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [data, stats]);

  // NPS/Rating logic: After first order, show rating popup
  useEffect(() => {
    if (data && stats) {
      const hasOrder = stats.total_orders >= 1;
      const alreadyRated = localStorage.getItem('fera_rated');
      if (hasOrder && !alreadyRated) {
        // Delay popup slightly for better UX
        const timer = setTimeout(() => setShowRating(true), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [data, stats]);

  return (
    <div style={{ paddingBottom: 40 }}>
      <style>{`
        @keyframes db-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes db-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,0.4)} 50%{box-shadow:0 0 0 6px rgba(16,185,129,0)} }

        .action-link {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 18px; border-radius: 16px;
          text-decoration: none; font-weight: 600; font-size: 14px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.03);
          color: rgba(255,255,255,0.7);
          transition: all 0.25s ease;
          position: relative; overflow: hidden;
        }
        .action-link:hover {
          background: rgba(255,255,255,0.07);
          border-color: rgba(255,255,255,0.12);
          color: #fff;
          transform: translateX(4px);
        }
        .action-link .arrow-icon {
          margin-left: auto;
          opacity: 0;
          transform: translateX(-6px);
          transition: all 0.25s ease;
        }
        .action-link:hover .arrow-icon {
          opacity: 1;
          transform: translateX(0);
        }

        .order-row {
          transition: background 0.2s ease;
          border-radius: 12px;
        }
        .order-row:hover {
          background: rgba(255,255,255,0.03);
        }

        @media (max-width: 1024px) {
          .db-main-grid { grid-template-columns: 1fr !important; }
          .hide-tablet { display: none !important; }
        }
        @media (max-width: 480px) {
          .db-stats-grid { grid-template-columns: 1fr !important; }
          .hide-mobile { display: none !important; }
        }
      `}</style>

      {/* Beta Promotion Banner */}
      {!isLoading && (
        <div style={{
          marginBottom: 20,
          padding: '12px 20px',
          borderRadius: 16,
          background: 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.2)',
          display: 'flex', alignItems: 'center', gap: 12
        }}>
          <Zap size={18} style={{ color: '#6366f1' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
            Beta: ₹299 plan is <span style={{ color: '#6366f1' }}>FREE</span> — please leave feedback!
          </span>
        </div>
      )}

      {/* NPS Popup */}
      {showRating && (
        <div style={{
          position: 'fixed', bottom: 30, right: 30, zIndex: 1000,
          width: 340, padding: 24, borderRadius: 28,
          background: '#161b33', border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
          animation: 'fadeUp 0.5s ease-out'
        }}>
          <h4 style={{ margin: '0 0 8px', color: '#fff', fontSize: 16, fontWeight: 800 }}>How's your experience?</h4>
          <p style={{ margin: '0 0 20px', color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 500 }}>Rate FeraSetu to help us improve.</p>
          
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[1, 2, 3, 4, 5].map(num => (
              <button
                key={num}
                onClick={() => {
                  toast.success('Thanks for your rating!');
                  localStorage.setItem('fera_rated', 'true');
                  setShowRating(false);
                }}
                style={{
                  flex: 1, height: 44, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.03)', color: '#fff', fontWeight: 800, cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#ff6b35')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
              >
                {num}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setShowRating(false)}
            style={{ width: '100%', padding: '10px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            Maybe later
          </button>
        </div>
      )}

      {/* Beta Promotion Banner */}
      {!isLoading && (
        <div style={{
          marginBottom: 20,
          padding: '12px 20px',
          borderRadius: 16,
          background: 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.2)',
          display: 'flex', alignItems: 'center', gap: 12
        }}>
          <Zap size={18} style={{ color: '#6366f1' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
            Beta: ₹299 plan is <span style={{ color: '#6366f1' }}>FREE</span> — please leave feedback!
          </span>
        </div>
      )}

      {/* NPS Popup */}
      {showRating && (
        <div style={{
          position: 'fixed', bottom: 30, right: 30, zIndex: 1000,
          width: 340, padding: 24, borderRadius: 28,
          background: '#161b33', border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
          animation: 'fadeUp 0.5s ease-out'
        }}>
          <h4 style={{ margin: '0 0 8px', color: '#fff', fontSize: 16, fontWeight: 800 }}>How's your experience?</h4>
          <p style={{ margin: '0 0 20px', color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 500 }}>Rate FeraSetu to help us improve.</p>
          
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[1, 2, 3, 4, 5].map(num => (
              <button
                key={num}
                onClick={() => {
                  toast.success('Thanks for your rating!');
                  localStorage.setItem('fera_rated', 'true');
                  setShowRating(false);
                }}
                style={{
                  flex: 1, height: 44, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.03)', color: '#fff', fontWeight: 800, cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#ff6b35')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
              >
                {num}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setShowRating(false)}
            style={{ width: '100%', padding: '10px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            Maybe later
          </button>
        </div>
      )}

      {/* Welcome Banner for new users */}
      {isNewUser && !isLoading && (
        <div style={{
          marginBottom: 28,
          padding: '24px 28px',
          borderRadius: 24,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(139,92,246,0.15) 100%)',
          border: '1px solid rgba(99,102,241,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(99,102,241,0.2)', filter: 'blur(30px)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: '#fff' }}>
              🎉 Welcome to FeraSetu, {user?.name}!
            </h3>
            <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
              Let's get your online store set up in just a few minutes
            </p>
          </div>
          <Link to="/get-started" style={{
            padding: '10px 22px', borderRadius: 50,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color: '#fff', textDecoration: 'none',
            fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap',
            boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
            transition: 'transform 0.2s', flexShrink: 0, position: 'relative', zIndex: 1,
          }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
            Get Started →
          </Link>
        </div>
      )}

      {/* Verification Banner */}
      {user && !user.is_verified && (
        <div style={{
          marginBottom: 28,
          padding: '20px 24px',
          borderRadius: 24,
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B' }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: '#fff' }}>Verify your email</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Please verify your email to secure your account and unlock all platform features.</p>
            </div>
          </div>
          <button
            onClick={() => {
              const promise = sendVerificationEmail();
              toast.promise(promise, {
                loading: 'Sending verification email...',
                success: 'Email sent! Check your inbox.',
                error: (err) => err?.response?.data?.message || 'Failed to send email',
              });
            }}
            style={{
              padding: '10px 20px', borderRadius: 14, background: '#F59E0B', color: '#000',
              border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: '0 8px 24px rgba(245,158,11,0.2)',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            Resend Email
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 30, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', marginBottom: 6 }}>
          Overview
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, fontWeight: 500 }}>
          Real-time performance metrics for <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>{user?.business_name || 'your store'}</span>.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="db-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 18, marginBottom: 28 }}>
        <StatCard
          label={translate('totalRevenue')}
          value={stats ? `₹${stats.total_revenue.toLocaleString('en-IN')}` : '—'}
          icon={<TrendingUp size={22} />}
          gradient="linear-gradient(135deg,#3B82F6,#6366f1)"
          glowColor="rgba(59,130,246,0.5)"
          change={stats?.revenue_change}
          loading={isLoading}
        />
        <StatCard
          label={translate('totalOrders')}
          value={stats ? String(stats.total_orders) : '—'}
          icon={<ShoppingCart size={22} />}
          gradient="linear-gradient(135deg,#8B5CF6,#a78bfa)"
          glowColor="rgba(139,92,246,0.5)"
          change={stats?.orders_change}
          loading={isLoading}
        />
        <StatCard
          label={translate('pendingOrders')}
          value={stats ? String(stats.pending_orders) : '—'}
          icon={<Clock size={22} />}
          gradient="linear-gradient(135deg,#F59E0B,#fbbf24)"
          glowColor="rgba(245,158,11,0.5)"
          loading={isLoading}
        />
        <StatCard
          label={translate('lowStock')}
          value={stats ? String(stats.low_stock_count) : '—'}
          icon={<AlertTriangle size={22} />}
          gradient="linear-gradient(135deg,#EF4444,#f87171)"
          glowColor="rgba(239,68,68,0.5)"
          loading={isLoading}
        />
      </div>

      {/* Platform Health */}
      {!isLoading && !error && (
        <div style={{
          marginBottom: 28, padding: '12px 20px', borderRadius: 14,
          background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', animation: 'db-pulse 2s infinite' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#34d399' }}>
            Your website is up and running. Synced with database.
          </span>
        </div>
      )}

      {/* Charts + Actions */}
      <div className="db-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 18, marginBottom: 18 }}>

        {/* Revenue Chart */}
        <div style={{
          padding: 28, borderRadius: 24,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 2 }}>Revenue Performance</h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>Last 30 days</p>
            </div>
            <div style={{
              fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '5px 12px', borderRadius: 50,
            }}>30D</div>
          </div>

          {isLoading ? (
            <Shimmer h="240px" r="16px" />
          ) : data?.revenue_chart && data.revenue_chart.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.revenue_chart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)' }} tickFormatter={v => `₹${v}`} />
                <Tooltip
                  cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                  contentStyle={{
                    borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(20px)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                    color: '#fff', fontSize: 13,
                  }}
                />
                <Area
                  isAnimationActive type="monotone" dataKey="revenue"
                  stroke="#3B82F6" strokeWidth={2.5}
                  fill="url(#revenueGrad)"
                  dot={false} activeDot={{ r: 6, fill: '#3B82F6', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{
              height: 240, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.25)', fontSize: 14, fontWeight: 600,
              border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 16,
            }}>
              <TrendingUp size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
              No performance data yet
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{
          padding: 28, borderRadius: 24,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 2 }}>Quick Actions</h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>Jump to key features</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            {[
              { label: translate('addProduct'), icon: <Plus size={18} />, to: '/products', color: '#ff6b35', glow: 'rgba(255,107,53,0.2)' },
              { label: 'Manage Orders', icon: <ShoppingCart size={18} />, to: '/orders', color: '#8B5CF6', glow: 'rgba(139,92,246,0.2)' },
              { label: translate('aiAssistant'), icon: <Bot size={18} />, to: '/ai-assistant', color: '#3B82F6', glow: 'rgba(59,130,246,0.2)' },
              { label: 'View Analytics', icon: <TrendingUp size={18} />, to: '/analytics', color: '#10B981', glow: 'rgba(16,185,129,0.2)' },
            ].map(action => (
              <Link key={action.label} to={action.to} className="action-link">
                <div style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  background: action.glow,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: action.color,
                }}>
                  {action.icon}
                </div>
                {action.label}
                <ArrowRight size={15} className="arrow-icon" style={{ color: action.color }} />
              </Link>
            ))}
          </div>

          {/* Upgrade notice */}
          {user?.plan === 'trial' && (
            <div style={{
              marginTop: 20, padding: '16px 18px', borderRadius: 18,
              background: 'linear-gradient(135deg,rgba(255,107,53,0.12),rgba(99,102,241,0.08))',
              border: '1px solid rgba(255,107,53,0.15)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Zap size={14} style={{ color: '#ff6b35' }} />
                <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>Scale Your Business</span>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 12, lineHeight: 1.5, fontWeight: 500 }}>
                Unlock AI predictions, Custom Domains & Unlimited Products
              </p>
              <Link to="/upgrade" style={{
                display: 'block', textAlign: 'center',
                padding: '9px', borderRadius: 12,
                background: 'linear-gradient(135deg,#ff6b35,#e55a24)',
                color: '#fff', textDecoration: 'none',
                fontSize: 13, fontWeight: 700,
                boxShadow: '0 6px 20px rgba(255,107,53,0.3)',
              }}>
                View Upgrade Plans →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div style={{
        padding: 28, borderRadius: 24,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 2 }}>Recent Orders</h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>Latest 5 transactions</p>
          </div>
          <Link to="/orders" style={{
            fontSize: 13, fontWeight: 700,
            color: '#ff6b35', textDecoration: 'none',
            padding: '6px 14px', borderRadius: 50,
            background: 'rgba(255,107,53,0.1)',
            border: '1px solid rgba(255,107,53,0.15)',
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,107,53,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,107,53,0.1)')}>
            {translate('viewAll')} →
          </Link>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map(i => <Shimmer key={i} h="52px" />)}
          </div>
        ) : data?.recent_orders && data.recent_orders.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
              <thead>
                <tr>
                  {['Customer', 'Items', 'Total', 'Status', 'Date'].map((h, i) => (
                    <th key={h} className={i === 1 ? 'hide-mobile' : i === 4 ? 'hide-tablet' : ''}
                      style={{ textAlign: 'left', padding: '8px 14px 16px', fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recent_orders.slice(0, 5).map(order => {
                  const sc = STATUS_CONFIG[order.status] || { color: '#888', bg: 'rgba(136,136,136,0.12)', label: order.status };
                  return (
                    <tr key={order.id} className="order-row">
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#fff', fontSize: 14 }}>
                        {order.customer_name}
                      </td>
                      <td className="hide-mobile" style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Package size={13} /> {order.items_count}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#fff', fontSize: 14 }}>
                        ₹{order.total.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '4px 12px', borderRadius: 50, fontSize: 12, fontWeight: 700,
                          background: sc.bg, color: sc.color, border: `1px solid ${sc.color}25`,
                          whiteSpace: 'nowrap',
                        }}>
                          {sc.label}
                        </span>
                      </td>
                      <td className="hide-tablet" style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: 600 }}>
                        {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{
            textAlign: 'center', padding: '56px 40px',
            color: 'rgba(255,255,255,0.2)', fontSize: 14, fontWeight: 600,
            border: '1px dashed rgba(255,255,255,0.07)', borderRadius: 18,
          }}>
            <ShoppingCart size={40} style={{ marginBottom: 14, opacity: 0.25 }} />
            <p style={{ margin: 0 }}>No orders yet. Share your store link to get your first order!</p>
          </div>
        )}
      </div>
    </div>
  );
}
