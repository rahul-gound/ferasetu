import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Lock, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

interface AnalyticsData {
  revenue_chart: { date: string; revenue: number; orders: number }[];
  category_breakdown: { name: string; value: number; revenue: number }[];
  summary: {
    total_revenue: number;
    total_orders: number;
    avg_order_value: number;
    top_product: string;
    conversion_rate: number;
  };
}

interface PredictionData {
  next_week_revenue: number;
  next_month_revenue: number;
  trend: 'up' | 'down' | 'stable';
  recommendations: string[];
  confidence: number;
}

const PIE_COLORS = ['#FF6B35', '#004E89', '#1A936F', '#F59E0B', '#8B5CF6', '#EC4899'];

const PERIODS = [
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
  { label: '1 Year', value: '1y' },
];

function Shimmer({ h = '200px' }: { h?: string }) {
  return (
    <div style={{
      height: h, borderRadius: '10px',
      background: 'linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)',
      backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
    }} />
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card" style={{ padding: '20px' }}>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '8px' }}>{label}</div>
      <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text)' }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{sub}</div>}
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
      const [dashboard, sales] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get(`/analytics/sales?period=${period}`)
      ]);
      return {
        summary: dashboard.data.summary,
        revenueChart: dashboard.data.revenueChart,
        topProducts: dashboard.data.topProducts,
        sales: sales.data.sales,
        categoryBreakdown: sales.data.categoryBreakdown
      };
    },
    retry: 1,
  });

  const { data: prediction, isLoading: predLoading } = useQuery<PredictionData>({
    queryKey: ['analytics-predict'],
    queryFn: async () => (await api.get('/analytics/predict')).data,
    enabled: user?.plan === 'premium',
    retry: 1,
  });

  if (error) toast.error('Failed to load analytics');

  const summary = data?.summary;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)' }}>{translate('analytics')}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Track your store performance
          </p>
        </div>

        {/* Period selector */}
        <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: '10px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              style={{
                padding: '8px 16px', border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: '13px',
                background: period === p.value ? 'var(--primary)' : 'transparent',
                color: period === p.value ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {isLoading ? (
          [1, 2, 3, 4].map(i => <Shimmer key={i} h="90px" />)
        ) : (
          <>
            <StatCard label="Total Revenue" value={`₹${(summary?.total_revenue || 0).toLocaleString('en-IN')}`} />
            <StatCard label="Total Orders" value={String(summary?.total_orders || 0)} />
            <StatCard label="Avg. Order Value" value={`₹${(summary?.avg_order_value || 0).toLocaleString('en-IN')}`} />
            <StatCard label="Top Product" value={summary?.top_product || '—'} sub="Best seller" />
          </>
        )}
      </div>

      {/* Revenue Bar Chart */}
      <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', color: 'var(--text)' }}>
          Revenue Over Time
        </h2>
        {isLoading ? <Shimmer h="260px" /> : (
          data?.revenue_chart && data.revenue_chart.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.revenue_chart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => `₹${v}`} />
                <Tooltip
                  formatter={(v: unknown) => [`₹${(v as number).toLocaleString('en-IN')}`, 'Revenue']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px' }}
                />
                <Bar dataKey="revenue" fill="#FF6B35" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              No revenue data for this period
            </div>
          )
        )}
      </div>

      {/* Orders Line Chart + Category Pie */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Orders trend */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', color: 'var(--text)' }}>
            Orders Trend
          </h2>
          {isLoading ? <Shimmer h="220px" /> : (
            data?.revenue_chart && data.revenue_chart.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.revenue_chart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px' }} />
                  <Line
                    type="monotone" dataKey="orders" stroke="#004E89" strokeWidth={2.5}
                    dot={false} activeDot={{ r: 5, fill: '#004E89' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No order data
              </div>
            )
          )}
        </div>

        {/* Category breakdown */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', color: 'var(--text)' }}>
            Sales by Category
          </h2>
          {isLoading ? <Shimmer h="220px" /> : (
            data?.category_breakdown && data.category_breakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data.category_breakdown}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={85}
                    paddingAngle={3} dataKey="value"
                  >
                    {data.category_breakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: unknown) => [v as number, 'Units']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px' }}
                  />
                  <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No category data
              </div>
            )
          )}
        </div>
      </div>

      {/* AI Predictions (Premium) */}
      {user?.plan === 'premium' ? (
        <div className="card" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(139,92,246,0.05), rgba(255,107,53,0.05))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Sparkles size={20} color="#8B5CF6" />
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>AI Sales Predictions</h2>
            <span style={{
              padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
              background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', color: '#fff',
            }}>
              Sarvam 105B
            </span>
          </div>

          {predLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {[1, 2, 3].map(i => <Shimmer key={i} h="100px" />)}
            </div>
          ) : prediction ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div style={{ background: 'var(--surface)', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Next Week Revenue</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', marginTop: '6px' }}>
                    ₹{prediction.next_week_revenue.toLocaleString('en-IN')}
                  </div>
                </div>
                <div style={{ background: 'var(--surface)', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Next Month Revenue</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', marginTop: '6px' }}>
                    ₹{prediction.next_month_revenue.toLocaleString('en-IN')}
                  </div>
                </div>
                <div style={{ background: 'var(--surface)', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Trend</div>
                  <div style={{
                    fontSize: '20px', fontWeight: 800, marginTop: '6px',
                    color: prediction.trend === 'up' ? '#10B981' : prediction.trend === 'down' ? '#EF4444' : '#F59E0B',
                  }}>
                    {prediction.trend === 'up' ? '📈 Rising' : prediction.trend === 'down' ? '📉 Declining' : '➡️ Stable'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {prediction.confidence}% confidence
                  </div>
                </div>
              </div>

              {prediction.recommendations?.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>
                    AI Recommendations
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {prediction.recommendations.map((rec, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'flex-start', gap: '10px',
                        padding: '12px', background: 'var(--surface)', borderRadius: '8px',
                        fontSize: '14px', color: 'var(--text)',
                      }}>
                        <TrendingUp size={16} color="#8B5CF6" style={{ flexShrink: 0, marginTop: '1px' }} />
                        {rec}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
              <Sparkles size={32} style={{ marginBottom: '10px', opacity: 0.4 }} />
              <p>Not enough data for predictions yet. Keep selling!</p>
            </div>
          )}
        </div>
      ) : (
        /* Free tier - locked predictions */
        <div className="card" style={{
          padding: '40px', textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(139,92,246,0.05), rgba(255,107,53,0.05))',
          border: '2px dashed rgba(139,92,246,0.3)',
        }}>
          <Lock size={36} color="#8B5CF6" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
            AI Sales Predictions
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px', maxWidth: '400px', margin: '0 auto 20px' }}>
            Upgrade to Premium to unlock AI-powered sales predictions, revenue forecasts, and smart recommendations powered by Sarvam 105B.
          </p>
          <a href="#" style={{
            display: 'inline-block', padding: '12px 28px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
            color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '14px',
          }}>
            Upgrade to Premium →
          </a>
        </div>
      )}

      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </div>
  );
}
