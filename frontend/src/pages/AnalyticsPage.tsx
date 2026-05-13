import { useState, useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, Lock, Sparkles, ArrowUpRight, ArrowDownRight, 
  ShoppingBag, DollarSign, Package, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

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

const PIE_COLORS = ['#FF6B35', '#004E89', '#1A936F', '#F59E0B', '#8B5CF6', '#EC4899'];

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
    enabled: user?.plan === 'premium' || user?.plan === 'pro',
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
          <div className="analytics-eyebrow"><TrendingUp size={16} /> Live Store Intelligence</div>
          <h1>Commerce Analytics</h1>
          <p>Track revenue, orders, inventory pressure, and AI-backed growth signals from one focused dashboard.</p>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#FF6B35' }}>
                 <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FF6B35' }} /> Revenue
              </div>
           </div>
        </div>

        <div style={{ height: '350px', width: '100%', minWidth: 0 }}>
            {isLoading ? <Shimmer h="300px" /> : revenueData.length === 0 ? <div className="analytics-empty">No revenue data yet. New orders will appear here.</div> : (
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={revenueData}>
                   <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#FF6B35" stopOpacity={0}/>
                      </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                   <XAxis 
                     dataKey="date" 
                     axisLine={false} tickLine={false} 
                     tick={{fill: '#94A3B8', fontSize: 11, fontWeight: 600}} 
                     dy={10} 
                   />
                   <YAxis 
                     axisLine={false} tickLine={false} 
                     tick={{fill: '#94A3B8', fontSize: 11, fontWeight: 600}} 
                     tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(1)+'k' : v}`}
                   />
                   <Tooltip 
                     contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 700 }}
                     formatter={(v: any) => [`₹${v.toLocaleString()}`, 'Revenue']}
                   />
                   <Area 
                     isAnimationActive={false}
                     type="monotone" 
                     dataKey="revenue" 
                     stroke="#FF6B35" 
                     strokeWidth={3} 
                     fillOpacity={1} 
                     fill="url(#colorRev)" 
                   />
                </AreaChart>
             </ResponsiveContainer>
           )}
        </div>
      </div>

      {/* Charts Row 2: Orders Bar & Category Pie */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '32px', flexWrap: 'wrap' }}>
         {/* Orders Distribution */}
          <div className="analytics-chart-card animate-fade-up" style={{ animationDelay: '0.5s' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1E293B', marginBottom: '24px' }}>Order Volume</h2>
            <div style={{ height: '350px', width: '100%', minWidth: 0 }}>
                {isLoading ? <Shimmer h="250px" /> : revenueData.length === 0 ? <div className="analytics-empty">No order volume yet.</div> : (
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={revenueData}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                       <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 11}} dy={10} />
                       <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 11}} />
                       <Tooltip 
                         contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                         cursor={{fill: '#F8FAFC'}}
                       />
                       <Bar isAnimationActive={false} dataKey="orders" fill="#004E89" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                 </ResponsiveContainer>
               )}
            </div>
         </div>

         {/* Category Breakdown */}
          <div className="analytics-chart-card animate-fade-up" style={{ animationDelay: '0.6s' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1E293B', marginBottom: '24px' }}>Inventory Value</h2>
            <div style={{ height: '350px', width: '100%', minWidth: 0 }}>
                {isLoading ? <Shimmer h="250px" /> : categoryData.length === 0 ? <div className="analytics-empty">Category sales will appear after products sell.</div> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                       <Pie
                         isAnimationActive={false}
                          data={categoryData}
                         cx="50%" cy="45%"
                         innerRadius={60}
                         outerRadius={90}
                         paddingAngle={5}
                         dataKey="revenue"
                       >
                          {categoryData.map((_entry, index) => (
                           <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                         ))}
                       </Pie>
                       <Tooltip 
                         contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                         formatter={(v: any) => [`₹${v.toLocaleString()}`, 'Revenue']}
                       />
                       <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 600 }} />
                    </PieChart>
                 </ResponsiveContainer>
               )}
            </div>
         </div>
      </div>

      {/* Premium AI Intelligence */}
      <div style={{ marginTop: '40px' }}>
        {(user?.plan === 'premium' || user?.plan === 'pro' || user?.plan === 'standard') ? (
           <div className="card animate-fade-up" style={{ 
             animationDelay: '0.7s', 
             background: 'linear-gradient(135deg, #1E293B, #0F172A)', 
             color: '#fff', padding: '40px' 
           }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                 <div style={{ width: '48px', height: '48px', background: 'rgba(255,107,53,0.15)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF6B35' }}>
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
                      <div style={{ fontSize: '32px', fontWeight: 900, color: '#FF6B35' }}>₹{(prediction?.next_week_revenue || 0).toLocaleString()}</div>
                      <div style={{ fontSize: '13px', color: '#10B981', marginTop: '8px', fontWeight: 700 }}>Confidence Score: {prediction?.confidence || 85}%</div>
                   </div>
                   <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '16px' }}>AI Strategic Recommendations</h4>
                      <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px', listStyle: 'none', padding: 0 }}>
                         {(prediction?.recommendations || ['Increase stock of top items', 'Launch weekend promotion', 'Analyze category trends']).slice(0, 3).map((rec, i) => (
                           <li key={i} style={{ display: 'flex', gap: '10px', fontSize: '13px', color: '#CBD5E1', lineHeight: 1.5 }}>
                              <CheckCircle size={16} color="#FF6B35" style={{ flexShrink: 0 }} /> {rec}
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
             background: 'linear-gradient(135deg, rgba(255,107,53,0.02), rgba(0,78,137,0.02))',
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
                 Upgrade to Standard or Pro
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
          div[style*="gridTemplateColumns: 1.2fr 0.8fr"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
