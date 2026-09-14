import { useState, useEffect, lazy, Suspense, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

const RevenueAreaChart = lazy(() => import('../components/analytics/AnalyticsCharts').then(m => ({ default: m.RevenueAreaChart })));
const OrdersBarChart = lazy(() => import('../components/analytics/AnalyticsCharts').then(m => ({ default: m.OrdersBarChart })));
const CategoryPieChart = lazy(() => import('../components/analytics/AnalyticsCharts').then(m => ({ default: m.CategoryPieChart })));
import { 
  TrendingUp, Lock, Sparkles, ArrowUpRight, ArrowDownRight, 
  ShoppingBag, DollarSign, Package, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import ActionableEmptyState from '../components/ui/ActionableEmptyState';

interface AnalyticsData {
  revenue_chart: { date: string; revenue: number; orders: number }[];
  categoryBreakdown: { name: string; value: number; revenue: number }[];
  summary: {
    total_revenue: number;
    total_orders: number;
    pending_orders: number;
    low_stock_count: number;
    revenue_change: number;
    orders_change: number;
    avg_order_value: number;
  };
}

interface PredictionData {
  next_week_revenue: number;
  next_month_revenue: number;
  trend: 'up' | 'down' | 'stable';
  recommendations: string[];
  confidence: number;
}

const PIE_COLORS = ['#0052FF', '#3B82F6', '#60A5FA', '#93C5FD', '#10B981', '#F59E0B'];

const PERIODS = [
  { label: '1 Hour', value: '1h' },
  { label: '24 Hours', value: '24h' },
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
];

function Shimmer({ h = '100px' }: { h?: string }) {
  return (
    <div style={{
      height: h, width: '100%', borderRadius: '16px',
      background: 'linear-gradient(90deg,#f8fafc 25%,#f1f5f9 50%,#f8fafc 75%)',
      backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
    }} />
  );
}

function StatCard({ label, value, sub, change, icon, delay = '0s' }: { label: string; value: string; sub?: string; change?: number; icon: ReactNode; delay?: string }) {
  const isPositive = (change || 0) >= 0;
  return (
    <div className="analytics-stat-card animate-fade-up" style={{ animationDelay: delay }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div className="analytics-stat-icon">{icon}</div>
        {change !== undefined && (
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '8px',
            background: isPositive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            color: isPositive ? '#10B981' : '#EF4444',
            fontSize: '12px', fontWeight: 700
          }}>
            {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', fontWeight: 500 }}>{sub}</div>}
    </div>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { translate } = useLanguage();
  const [period, setPeriod] = useState('30d');

  const { data, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ['analytics', period],
    queryFn: async () => {
      const [dashRes, salesRes] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get(`/analytics/sales?period=${period}`)
      ]);
      return {
        summary: dashRes.data.stats,
        revenue_chart: salesRes.data.sales || [],
        categoryBreakdown: salesRes.data.categoryBreakdown || [],
      };
    },
    retry: 1,
  });

  const { data: prediction, isLoading: predLoading } = useQuery<PredictionData>({
    queryKey: ['analytics-predict'],
    queryFn: async () => (await api.get('/analytics/predict')).data,
    enabled: Boolean(user?.plan && ['premium', 'pro', 'business', 'growth', 'standard', 'scale'].includes(user.plan.toLowerCase())),
    retry: 1,
  });

  useEffect(() => {
    if (error) toast.error('Failed to load analytics data');
  }, [error]);

  const summary = data?.summary;
  const revenueData = data?.revenue_chart || [];
  const categoryData = data?.categoryBreakdown || [];

  return (
    <div className="analytics-page">
      
      {/* Page Header */}
      <div className="analytics-hero">
        <div>
          <div className="analytics-eyebrow"><TrendingUp size={16} /> {translate('analytics.title')}</div>
          <h1>{translate('analytics.title')}</h1>
          <p>{translate('analytics.description')}</p>
        </div>

        {/* Period Switcher */}
        <div className="analytics-periods">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              style={{
                padding: '8px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: 700, transition: 'all 0.2s',
                background: period === p.value ? '#fff' : 'transparent',
                color: period === p.value ? '#0F172A' : '#CBD5E1'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Metrics */}
      <div className="analytics-grid" style={{ marginBottom: '32px' }}>
        {isLoading ? (
          [1,2,3,4].map(i => <Shimmer key={i} h="120px" />)
        ) : (
          <>
            <StatCard label="Net Revenue" value={`₹${(summary?.total_revenue || 0).toLocaleString('en-IN')}`} change={summary?.revenue_change} sub="Processed earnings" icon={<DollarSign size={20} />} delay="0s" />
            <StatCard label="Total Orders" value={String(summary?.total_orders || 0)} change={summary?.orders_change} sub="Successful checkouts" icon={<ShoppingBag size={20} />} delay="0.1s" />
            <StatCard label="Avg. Order Value" value={`₹${(summary?.avg_order_value || 0).toLocaleString('en-IN')}`} sub="Revenue per customer" icon={<TrendingUp size={20} />} delay="0.2s" />
            <StatCard label="Low Stock" value={String(summary?.low_stock_count || 0)} sub="Products needing attention" icon={<Package size={20} />} delay="0.3s" />
          </>
        )}
      </div>

      {/* Charts Row 1: Main Revenue Area Chart */}
       <div className="analytics-chart-card animate-fade-up" style={{ animationDelay: '0.4s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
           <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1E293B' }}>Revenue Performance</h2>
              <p style={{ fontSize: '13px', color: '#64748B' }}>Daily commercial throughput</p>
           </div>
           <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#0052FF' }}>
                 <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0052FF' }} /> Revenue
              </div>
           </div>
        </div>

        <div style={{ height: '350px', width: '100%', minWidth: 0 }}>
            {isLoading ? (
              <Shimmer h="300px" />
            ) : revenueData.length === 0 ? (
              <div className="py-8 flex items-center justify-center h-full">
                <ActionableEmptyState
                  icon={<TrendingUp size={24} />}
                  title="No revenue data yet"
                  description="Your store is ready. Share your store link with customers to start generating revenue and tracking trends."
                  actionLabel="Manage Products"
                  actionHref="/products"
                  expectedOutcome="Revenue graphs will display daily sales trends automatically."
                />
              </div>
            ) : (
              <Suspense fallback={<Shimmer h="300px" />}>
                <RevenueAreaChart data={revenueData} />
              </Suspense>
            )}
         </div>
      </div>

      {/* Charts Row 2: Orders Bar & Category Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8">
         {/* Orders Distribution */}
          <div className="analytics-chart-card animate-fade-up" style={{ animationDelay: '0.5s' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1E293B', marginBottom: '24px' }}>Order Volume</h2>
            <div style={{ height: '350px', width: '100%', minWidth: 0 }}>
                {isLoading ? (
                  <Shimmer h="250px" />
                ) : revenueData.length === 0 ? (
                  <div className="py-6 flex items-center justify-center h-full">
                    <ActionableEmptyState
                      icon={<ShoppingBag size={24} />}
                      title="No order volume yet"
                      description="Once customers place orders, your order volume breakdown will appear here."
                      actionLabel="View Orders"
                      actionHref="/orders"
                      expectedOutcome="Track fulfillment volume over time."
                    />
                  </div>
                ) : (
                  <Suspense fallback={<Shimmer h="250px" />}>
                    <OrdersBarChart data={revenueData} />
                  </Suspense>
               )}
            </div>
         </div>

         {/* Category Breakdown */}
          <div className="analytics-chart-card animate-fade-up" style={{ animationDelay: '0.6s' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1E293B', marginBottom: '24px' }}>Inventory Value</h2>
            <div style={{ height: '350px', width: '100%', minWidth: 0 }}>
                {isLoading ? (
                  <Shimmer h="250px" />
                ) : categoryData.length === 0 ? (
                  <div className="py-6 flex items-center justify-center h-full">
                    <ActionableEmptyState
                      icon={<Package size={24} />}
                      title="No inventory categories"
                      description="Add products and categorize them to see inventory distribution and category performance."
                      actionLabel="Add Products"
                      actionHref="/products"
                      expectedOutcome="Category breakdown will visualize product distribution."
                    />
                  </div>
                ) : (
                  <Suspense fallback={<Shimmer h="250px" />}>
                    <CategoryPieChart data={categoryData} colors={PIE_COLORS} />
                  </Suspense>
               )}
            </div>
         </div>
      </div>

      {/* Premium AI Intelligence */}
      <div style={{ marginTop: '40px' }}>
        {(user?.plan === 'premium' || user?.plan === 'pro' || user?.plan === 'business' || user?.plan === 'standard') ? (
           <div className="card animate-fade-up" style={{ 
             animationDelay: '0.7s', 
             background: 'linear-gradient(135deg, #1E293B, #0F172A)', 
             color: '#fff', padding: '40px' 
           }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                 <div style={{ width: '48px', height: '48px', background: 'rgba(0,82,255,0.15)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0052FF' }}>
                    <Sparkles size={24} />
                 </div>
                 <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Predictive Commercial Intelligence</h2>
                    <p style={{ color: '#94A3B8', fontSize: '14px' }}>Powered by Sarvam 105B Core</p>
                 </div>
              </div>

              {predLoading ? <Shimmer h="150px" /> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '32px' }}>
                   <div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Projected Weekly Run-rate</div>
                      <div style={{ fontSize: '32px', fontWeight: 900, color: '#0052FF' }}>₹{(prediction?.next_week_revenue || 0).toLocaleString()}</div>
                      <div style={{ fontSize: '13px', color: '#10B981', marginTop: '8px', fontWeight: 700 }}>Confidence Score: {prediction?.confidence || 85}%</div>
                   </div>
                   <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '16px' }}>AI Strategic Recommendations</h4>
                      <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px', listStyle: 'none', padding: 0 }}>
                         {(prediction?.recommendations || ['Increase stock of top items', 'Launch weekend promotion', 'Analyze category trends']).slice(0, 3).map((rec, i) => (
                           <li key={i} style={{ display: 'flex', gap: '10px', fontSize: '13px', color: '#CBD5E1', lineHeight: 1.5 }}>
                              <CheckCircle size={16} color="#0052FF" style={{ flexShrink: 0 }} /> {rec}
                           </li>
                         ))}
                      </ul>
                   </div>
                </div>
              )}
           </div>
        ) : (
           <div className="card animate-fade-up" style={{ 
             animationDelay: '0.7s', textAlign: 'center', padding: '60px 40px',
             background: 'linear-gradient(135deg, rgba(0,82,255,0.02), rgba(0,78,137,0.02))',
             border: '2px dashed #E2E8F0'
           }}>
              <div style={{ width: '64px', height: '64px', background: '#F8FAFC', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: '#94A3B8' }}>
                 <Lock size={32} />
              </div>
              <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#1E293B', marginBottom: '12px' }}>Unlock Commercial Predictions</h3>
              <p style={{ color: '#64748B', maxWidth: '500px', margin: '0 auto 32px', lineHeight: 1.6 }}>
                 Get high-accuracy revenue forecasts and strategic inventory recommendations powered by FeraSetu's advanced AI models.
              </p>
              <Link to="/upgrade" className="btn btn-primary" style={{ padding: '16px 40px', fontSize: '16px' }}>
                 Upgrade to Business or Pro
              </Link>
           </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @media (max-width: 1024px) {
          main { padding: 20px !important; }
          .analytics-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 640px) {
          .analytics-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
