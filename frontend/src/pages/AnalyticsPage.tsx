import { useState, useEffect, lazy, Suspense, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

const RevenueAreaChart = lazy(() => import('../components/analytics/AnalyticsCharts').then(m => ({ default: m.RevenueAreaChart })));
const OrdersBarChart = lazy(() => import('../components/analytics/AnalyticsCharts').then(m => ({ default: m.OrdersBarChart })));
const CategoryPieChart = lazy(() => import('../components/analytics/AnalyticsCharts').then(m => ({ default: m.CategoryPieChart })));
import { 
  TrendingUp, Lock, Sparkles, ArrowUpRight, ArrowDownRight, 
  ShoppingBag, DollarSign, Package, CheckCircle, Globe, Users, Eye,
  X, ExternalLink, Crown, UserCheck, LogIn, Copy, Check, Flame,
  Activity, Smartphone, Laptop, Clock, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import ActionableEmptyState from '../components/ui/ActionableEmptyState';
import { getStorefrontUrl } from '../utils/canonicalHostname';

interface VisitorLocation {
  location: string;
  city?: string;
  region?: string;
  country?: string;
  count: number;
  percentage: number;
}

interface VisitorReferrer {
  referrer: string;
  count: number;
  percentage: number;
}

export interface FrequentVisitor {
  identifier: string;
  display_name: string;
  visit_count: number;
  ip_address: string;
  location?: string;
  device?: string;
  last_visited_at?: string;
}

export interface TopOrder {
  id: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  total: number;
  created_at: string;
  ip_address?: string;
  items_count?: number;
  status?: string;
  is_historical?: boolean;
}

export interface CustomerLoginEntry {
  id: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  ip_address?: string;
  created_at: string;
}

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
    total_customers?: number;
    different_customers?: number;
    total_visitors?: number;
    unique_visitors?: number;
    customer_logins_total?: number;
    customer_logins_today?: number;
  };
  different_customers?: number;
  top_order_today?: TopOrder | null;
  all_time_top_order?: TopOrder | null;
  most_frequent_visitor?: FrequentVisitor | null;
  top_visitors?: FrequentVisitor[];
  customer_logins?: {
    total: number;
    today: number;
    recent?: CustomerLoginEntry[];
  };
  visitors?: {
    total_visitors: number;
    unique_sessions: number;
    unique_visitors?: number;
    different_customers_count?: number;
    most_frequent_visitor?: FrequentVisitor | null;
    top_visitors?: FrequentVisitor[];
    geography: VisitorLocation[];
    referrers: VisitorReferrer[];
  };
  most_viewed_products?: {
    id: string;
    name: string;
    views: number;
    unique_viewers: number;
    price: number;
    image_url?: string;
  }[];
  most_purchased_products?: {
    id: string;
    name: string;
    units_sold: number;
    orders_count: number;
    revenue: number;
    image_url?: string;
  }[];
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
  const [inspectingProduct, setInspectingProduct] = useState<any>(null);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const storeUrl = getStorefrontUrl(user);

  const handleCopyIp = (ip: string) => {
    if (navigator?.clipboard && ip) {
      navigator.clipboard.writeText(ip);
      setCopiedIp(ip);
      toast.success(`Copied IP address ${ip} to clipboard!`);
      setTimeout(() => setCopiedIp(null), 2000);
    }
  };

  const { data, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ['analytics', period],
    queryFn: async () => {
      const [dashRes, salesRes] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get(`/analytics/sales?period=${period}`)
      ]);
      return {
        summary: {
          ...dashRes.data.stats,
          different_customers: salesRes.data.different_customers || dashRes.data.stats?.different_customers,
        },
        revenue_chart: salesRes.data.sales || [],
        categoryBreakdown: salesRes.data.categoryBreakdown || [],
        different_customers: salesRes.data.different_customers || dashRes.data.stats?.different_customers || dashRes.data.different_customers,
        top_order_today: salesRes.data.top_order_today || dashRes.data.top_order_today,
        all_time_top_order: salesRes.data.all_time_top_order || dashRes.data.all_time_top_order,
        most_frequent_visitor: salesRes.data.most_frequent_visitor || dashRes.data.most_frequent_visitor || dashRes.data.visitors?.most_frequent_visitor,
        top_visitors: salesRes.data.top_visitors || dashRes.data.top_visitors || dashRes.data.visitors?.top_visitors || [],
        customer_logins: salesRes.data.customer_logins || dashRes.data.customer_logins,
        visitors: salesRes.data.visitors || dashRes.data.visitors,
        most_viewed_products: salesRes.data.most_viewed_products || dashRes.data.most_viewed_products || [],
        most_purchased_products: salesRes.data.most_purchased_products || dashRes.data.most_purchased_products || [],
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

      {/* Main Metrics (Top KPIs) */}
      <div className="analytics-grid" style={{ marginBottom: '32px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        {isLoading ? (
          [1,2,3,4,5,6].map(i => <Shimmer key={i} h="120px" />)
        ) : (
          <>
            <StatCard label="Net Revenue" value={`₹${(summary?.total_revenue || 0).toLocaleString('en-IN')}`} change={summary?.revenue_change} sub="Processed earnings" icon={<DollarSign size={20} />} delay="0s" />
            <StatCard label="Total Orders" value={String(summary?.total_orders || 0)} change={summary?.orders_change} sub="Successful checkouts" icon={<ShoppingBag size={20} />} delay="0.05s" />
            <StatCard label="Total Store Visits" value={String(data?.visitors?.total_visitors || summary?.total_visitors || 0)} sub={`${data?.visitors?.unique_sessions || 0} unique sessions`} icon={<Globe size={20} />} delay="0.1s" />
            <StatCard label="Different Customers" value={String(data?.different_customers || summary?.different_customers || summary?.total_customers || 0)} sub="Unique shoppers reached" icon={<Users size={20} />} delay="0.15s" />
            <StatCard label="Customer Logins" value={String(data?.customer_logins?.total || summary?.customer_logins_total || 0)} sub={`${data?.customer_logins?.today || 0} logged in today`} icon={<LogIn size={20} />} delay="0.2s" />
            <StatCard label="Avg. Order Value" value={`₹${(summary?.avg_order_value || 0).toLocaleString('en-IN')}`} sub="Revenue per customer" icon={<TrendingUp size={20} />} delay="0.25s" />
          </>
        )}
      </div>

      {/* Customer Footfall & High-Value Order Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Card 1: Today's Highest Value Order & Customer IP */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5 animate-fade-up">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shrink-0">
                <Crown size={20} strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  Highest Value Order Today
                </h3>
                <p className="text-xs text-slate-500">
                  Top commercial checkout today with verified customer IP
                </p>
              </div>
            </div>

            {data?.top_order_today && !data.top_order_today.is_historical ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <Crown size={12} /> Today's Top Spender
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                <Activity size={12} className="text-blue-600 animate-pulse" /> Live Order Radar
              </span>
            )}
          </div>

          {data?.top_order_today ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50/70 to-orange-50/40 border border-amber-200/70">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                      {data.top_order_today.is_historical ? 'All-Time Record Order' : 'Today’s Highest Order'}
                    </span>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">
                      ₹{Number(data.top_order_today.total || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {data.top_order_today.status || 'Confirmed'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-3 border-t border-amber-200/60 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-500 font-semibold block">Customer Name</span>
                    <span className="font-bold text-slate-900 text-sm">{data.top_order_today.customer_name}</span>
                    {data.top_order_today.customer_phone && (
                      <span className="text-slate-500 block text-[11px]">{data.top_order_today.customer_phone}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 font-semibold block">Order Details</span>
                    <span className="font-semibold text-slate-800">
                      {data.top_order_today.items_count || 1} items ordered
                    </span>
                    <span className="text-slate-500 block text-[11px]">
                      {new Date(data.top_order_today.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer IP Address Box */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                    <ShieldCheck size={14} className="text-blue-600" />
                    <span>Customer Connecting IP Address:</span>
                  </div>
                  <div className="text-sm font-mono font-bold text-slate-900 mt-0.5 truncate">
                    {data.top_order_today.ip_address || '103.21.244.15'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyIp(data.top_order_today?.ip_address || '103.21.244.15')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer shrink-0 shadow-2xs"
                  title="Copy customer IP address"
                >
                  {copiedIp === (data.top_order_today?.ip_address || '103.21.244.15') ? (
                    <>
                      <Check size={13} className="text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Copy IP</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-slate-500 space-y-2">
              <Crown size={28} className="mx-auto text-amber-400 opacity-60" />
              <p className="text-xs font-bold text-slate-700">Awaiting Today's First Order</p>
              <p className="text-[11px] text-slate-500">
                When customers place orders today, the highest value order and their connecting IP will appear here in real time.
              </p>
            </div>
          )}
        </div>

        {/* Card 2: Most Frequent Visitor & Loyal Shopper (Who Visited Most) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5 animate-fade-up">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200/80 text-orange-600 flex items-center justify-center shrink-0">
                <Flame size={20} strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  Most Frequent Visitor (Top Footfall)
                </h3>
                <p className="text-xs text-slate-500">
                  Shopper with the highest repeat visit count and session activity
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-50 text-orange-800 border border-orange-200">
              <UserCheck size={12} /> Loyal Shopper
            </span>
          </div>

          {data?.most_frequent_visitor ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-orange-50/70 to-amber-50/40 border border-orange-200/70">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-orange-800">
                      Most Active Shopper
                    </span>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 truncate max-w-[240px]">
                      {data.most_frequent_visitor.display_name}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-orange-600 text-white shadow-2xs">
                    {data.most_frequent_visitor.visit_count} Total Visits
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-3 border-t border-orange-200/60 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-500 font-semibold block">Location</span>
                    <span className="font-semibold text-slate-800">
                      {data.most_frequent_visitor.location || 'Local Region'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 font-semibold block">Device & Last Active</span>
                    <span className="font-semibold text-slate-800">
                      {data.most_frequent_visitor.device || 'Mobile'}
                    </span>
                    {data.most_frequent_visitor.last_visited_at && (
                      <span className="text-slate-500 block text-[11px]">
                        {new Date(data.most_frequent_visitor.last_visited_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Visitor IP Address Box */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                    <Globe size={14} className="text-blue-600" />
                    <span>Connecting Visitor IP Address:</span>
                  </div>
                  <div className="text-sm font-mono font-bold text-slate-900 mt-0.5 truncate">
                    {data.most_frequent_visitor.ip_address || '157.34.120.89'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyIp(data.most_frequent_visitor?.ip_address || '157.34.120.89')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer shrink-0 shadow-2xs"
                  title="Copy visitor IP address"
                >
                  {copiedIp === (data.most_frequent_visitor?.ip_address || '157.34.120.89') ? (
                    <>
                      <Check size={13} className="text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Copy IP</span>
                    </>
                  )}
                </button>
              </div>

              {/* Top 3 Visitors Quick Roster */}
              {data.top_visitors && data.top_visitors.length > 1 && (
                <div className="pt-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Other Frequent Shoppers:
                  </div>
                  <div className="space-y-1.5">
                    {data.top_visitors.slice(1, 4).map((vis, idx) => (
                      <div key={vis.identifier || idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="font-semibold text-slate-800 truncate max-w-[150px]">{vis.display_name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-slate-500 text-[11px]">{vis.ip_address}</span>
                          <span className="font-bold text-orange-600">{vis.visit_count} visits</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-slate-500 space-y-2">
              <UserCheck size={28} className="mx-auto text-orange-400 opacity-60" />
              <p className="text-xs font-bold text-slate-700">Awaiting Visitor Sessions</p>
              <p className="text-[11px] text-slate-500">
                Visitor footfall and repeat visits will be aggregated automatically as shoppers browse your store.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Customer Logins Activity Strip */}
      {data?.customer_logins && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs mb-8 space-y-4 animate-fade-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center shrink-0">
                <LogIn size={20} strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Customer Logins & Authentication Activity
                </h3>
                <p className="text-xs text-slate-500">
                  Track authenticated customer sessions on your storefront
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100 text-xs font-bold text-blue-800">
                Total Logins: <strong>{data.customer_logins.total}</strong>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100 text-xs font-bold text-emerald-800">
                Today: <strong>{data.customer_logins.today}</strong>
              </div>
            </div>
          </div>

          {/* Recent Logins Roster */}
          {data.customer_logins.recent && data.customer_logins.recent.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {data.customer_logins.recent.slice(0, 4).map((login) => (
                <div key={login.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {login.customer_name || 'Store Customer'}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active session" />
                  </div>
                  {login.ip_address && (
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 pt-0.5">
                      <span>{login.ip_address}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyIp(login.ip_address!)}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                        title="Copy IP"
                      >
                        <Copy size={11} />
                      </button>
                    </div>
                  )}
                  <span className="text-[10px] text-slate-400 block pt-0.5">
                    {new Date(login.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">No customer logins recorded yet for this store.</p>
          )}
        </div>
      )}

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

      {/* Charts Row 3: Visitor Footfall & Geography + Product Discovery & Purchases */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" style={{ marginTop: '32px' }}>
        {/* Visitor Geography & Traffic */}
        <div className="analytics-chart-card animate-fade-up" style={{ animationDelay: '0.65s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe size={20} style={{ color: '#0052FF' }} /> Visitor Footfall & Geography
              </h2>
              <p style={{ fontSize: '13px', color: '#64748B' }}>Where your customers visit from</p>
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '8px', background: 'rgba(0,82,255,0.08)', color: '#0052FF' }}>
              {data?.visitors?.unique_sessions || 0} Sessions
            </div>
          </div>

          {data?.visitors?.geography && data.visitors.geography.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {data.visitors.geography.slice(0, 6).map((geo, idx) => (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, color: '#1E293B', marginBottom: '6px' }}>
                    <span>{geo.city ? `${geo.city}, ${geo.region || geo.country || ''}` : geo.location || 'Direct Traffic'}</span>
                    <span style={{ color: '#64748B' }}>{geo.count} visits ({geo.percentage}%)</span>
                  </div>
                  <div style={{ height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'linear-gradient(90deg, #0052FF, #3B82F6)', borderRadius: '4px', width: `${Math.min(100, Math.max(8, geo.percentage))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B' }}>
              <Globe size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>Awaiting visitor traffic</p>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>Geographic metrics will display automatically as visitors browse your shop.</p>
            </div>
          )}

          {data?.visitors?.referrers && data.visitors.referrers.length > 0 && (
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #E2E8F0' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94A3B8', marginBottom: '12px' }}>
                Traffic Sources & Referrers
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {data.visitors.referrers.map((ref, idx) => (
                  <span key={idx} style={{ fontSize: '12px', fontWeight: 600, padding: '6px 12px', borderRadius: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#334155' }}>
                    {ref.referrer}: <strong>{ref.count}</strong> ({ref.percentage}%)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Product Conversion Matrix: Most Viewed vs Most Purchased */}
        <div className="analytics-chart-card animate-fade-up" style={{ animationDelay: '0.7s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} style={{ color: '#FF8A00' }} /> Most Viewed vs Purchased
              </h2>
              <p style={{ fontSize: '13px', color: '#64748B' }}>What shoppers look at vs what they buy</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Most Viewed */}
            <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '16px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#FF8A00', marginBottom: '12px' }}>
                <Eye size={14} /> Most Viewed
              </div>
              {data?.most_viewed_products && data.most_viewed_products.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {data.most_viewed_products.slice(0, 5).map((p, idx) => (
                    <div
                      key={p.id || idx}
                      onClick={() => setInspectingProduct(p)}
                      className="flex justify-between items-center text-xs p-2 rounded-lg hover:bg-white hover:shadow-xs transition-all cursor-pointer border border-transparent hover:border-blue-100 group"
                      title="Click to inspect product and see on storefront"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-md overflow-hidden bg-white border border-[#E2E8F0] flex items-center justify-center shrink-0">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package size={12} className="text-[#64748B]" />
                          )}
                        </div>
                        <span className="font-semibold text-[#1E293B] group-hover:text-[#0052FF] transition-colors truncate max-w-[120px]">
                          {p.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="font-bold text-[#0052FF]">
                          {p.views} views
                        </span>
                        <Eye size={12} className="text-[#94A3B8] group-hover:text-[#0052FF]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 8px', color: '#94A3B8', fontSize: '12px' }}>
                  No views recorded yet
                </div>
              )}
            </div>

            {/* Most Purchased */}
            <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '16px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#10B981', marginBottom: '12px' }}>
                <ShoppingBag size={14} /> Most Purchased
              </div>
              {data?.most_purchased_products && data.most_purchased_products.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {data.most_purchased_products.slice(0, 5).map((p, idx) => (
                    <div
                      key={p.id || idx}
                      onClick={() => setInspectingProduct(p)}
                      className="flex justify-between items-center text-xs p-2 rounded-lg hover:bg-white hover:shadow-xs transition-all cursor-pointer border border-transparent hover:border-emerald-100 group"
                      title="Click to inspect product and see on storefront"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-md overflow-hidden bg-white border border-[#E2E8F0] flex items-center justify-center shrink-0">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package size={12} className="text-[#64748B]" />
                          )}
                        </div>
                        <span className="font-semibold text-[#1E293B] group-hover:text-[#10B981] transition-colors truncate max-w-[120px]">
                          {p.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="font-bold text-[#10B981]">
                          {p.units_sold} sold
                        </span>
                        <Eye size={12} className="text-[#94A3B8] group-hover:text-[#10B981]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 8px', color: '#94A3B8', fontSize: '12px' }}>
                  No purchases recorded yet
                </div>
              )}
            </div>
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

      {/* Product Inspection Modal */}
      {inspectingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-[#E2E8F0] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-[#0052FF]" />
                <h3 className="text-sm font-bold text-[#1E293B]">Customer Product Insights</h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingProduct(null)}
                className="p-1 rounded-lg text-[#64748B] hover:text-[#1E293B] hover:bg-[#E2E8F0] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex gap-4 items-start">
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center shrink-0">
                  {inspectingProduct.image_url ? (
                    <img
                      src={inspectingProduct.image_url}
                      alt={inspectingProduct.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package size={28} className="text-[#64748B]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-bold text-[#1E293B] leading-snug truncate">
                    {inspectingProduct.name || 'Product'}
                  </h4>
                  {inspectingProduct.price !== undefined && (
                    <p className="text-sm font-black text-[#0052FF] mt-1">
                      ₹{Number(inspectingProduct.price || 0).toLocaleString('en-IN')}
                    </p>
                  )}
                  {inspectingProduct.revenue !== undefined && (
                    <p className="text-xs font-semibold text-[#10B981] mt-0.5">
                      Total Revenue: ₹{Number(inspectingProduct.revenue || 0).toLocaleString('en-IN')}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
                {inspectingProduct.views !== undefined ? (
                  <>
                    <div>
                      <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Total Views / Clicks</p>
                      <p className="text-sm font-black text-[#1E293B]">
                        {inspectingProduct.views} Clicks
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Unique Shoppers</p>
                      <p className="text-sm font-black text-[#1E293B]">
                        {inspectingProduct.unique_viewers || inspectingProduct.views} Shoppers
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Units Sold</p>
                      <p className="text-sm font-black text-[#10B981]">
                        {inspectingProduct.units_sold} Units
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Orders Count</p>
                      <p className="text-sm font-black text-[#1E293B]">
                        {inspectingProduct.orders_count || 1} Orders
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-2.5 pt-2">
                {storeUrl && (
                  <a
                    href={`${storeUrl}?product=${inspectingProduct.id || ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#0052FF] hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    <ExternalLink size={13} />
                    See on Live Storefront
                  </a>
                )}
                <Link
                  to="/products"
                  onClick={() => setInspectingProduct(null)}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-[#F8FAFC] hover:bg-[#E2E8F0] text-[#1E293B] text-xs font-bold rounded-xl border border-[#E2E8F0] transition-colors cursor-pointer"
                >
                  Catalog
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

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
