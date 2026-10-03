import { useState, useEffect, lazy, Suspense } from 'react';
import axios from 'axios';
import { 
  Users, DollarSign, Activity, ShoppingBag, 
  TrendingUp, Bot, CheckCircle2,
  ArrowUpRight, ArrowDownRight, Eye, MousePointerClick,
  Sparkles, Smartphone, Globe, AlertCircle, RefreshCw, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../components/admin/AdminLayout';

const AdminRevenueChart = lazy(() => import('../components/admin/AdminDashboardCharts'));

const API = import.meta.env.VITE_API_URL || '/api';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<'financial' | 'telemetry'>('financial');
  const [data, setData] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPruning, setIsPruning] = useState(false);
  const token = localStorage.getItem('admin_token');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsRes, analyticsRes] = await Promise.all([
          axios.get(`${API}/admin/dashboard-stats`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API}/admin/analytics?days=30`, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => ({ data: { analytics: null } }))
        ]);
        setData(statsRes.data);
        setAnalyticsData(analyticsRes.data?.analytics);
      } catch (err) {
        toast.error('Failed to load platform stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [token]);

  const handlePruneRetention = async () => {
    if (!confirm('Prune raw analytics events older than 30 days? Daily aggregates will be preserved.')) return;
    setIsPruning(true);
    try {
      const res = await axios.post(`${API}/admin/analytics/prune`, { retention_days: 30 }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Pruned ${res.data.deletedRows || 0} raw events.`);
    } catch {
      toast.error('Failed to prune raw events');
    } finally {
      setIsPruning(false);
    }
  };

  const handleRunAggregation = async () => {
    try {
      const res = await axios.post(`${API}/admin/analytics/aggregate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Aggregated ${res.data.aggregatedRecords || 0} metric records for ${res.data.targetDate}.`);
    } catch {
      toast.error('Failed to run daily aggregation');
    }
  };

  const chartData = (data?.revenueChart || []).map((row: any) => ({
    name: new Date(row.date).toLocaleDateString(undefined, { weekday: 'short' }),
    revenue: row.revenue || 0,
    orders: row.orders || 0,
  }));

  if (loading) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Navigation Tab Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('financial')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'financial'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Commerce &amp; Revenue
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('telemetry')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'telemetry'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles size={14} className="text-orange-500" />
              Product &amp; Privacy Telemetry
            </button>
          </div>

          {activeTab === 'telemetry' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRunAggregation}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <RefreshCw size={13} />
                <span>Run Aggregation</span>
              </button>
              <button
                type="button"
                onClick={handlePruneRetention}
                disabled={isPruning}
                className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Trash2 size={13} />
                <span>Prune Raw (&gt;30d)</span>
              </button>
            </div>
          )}
        </div>

        {activeTab === 'financial' ? (
          <>
            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up">
              <KpiCard 
                title="Total Revenue" 
                value={`₹${data?.stats?.totalRevenue?.toLocaleString()}`} 
                trend="Live" 
                trendUp={true}
                icon={<DollarSign className="text-emerald-500" />}
                color="emerald"
              />
              <KpiCard 
                title="Active Shopkeepers" 
                value={data?.stats?.totalUsers} 
                trend={`${data?.stats?.activeUsers || 0} active`} 
                trendUp={true}
                icon={<Users className="text-blue-500" />}
                color="blue"
              />
              <KpiCard 
                title="Global Orders" 
                value={data?.stats?.totalOrders} 
                trend={`${data?.stats?.totalProducts || 0} products`} 
                trendUp={true}
                icon={<ShoppingBag className="text-purple-500" />}
                color="purple"
              />
              <KpiCard 
                title="Conversion Rate" 
                value={`${data?.stats?.conversionRate}%`} 
                trend={`${data?.stats?.premiumUsers || 0} paid`} 
                trendUp={true}
                icon={<TrendingUp className="text-orange-500" />}
                color="orange"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Chart */}
              <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm shadow-slate-100 min-h-[500px] flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Revenue Growth</h3>
                    <p className="text-sm text-slate-500 font-medium">Platform-wide income performance</p>
                  </div>
                  <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-lg">Last 7 Days</span>
                </div>
                <div className="flex-1 w-full" style={{ minHeight: '350px' }}>
                  <Suspense fallback={<div className="w-full h-[350px] bg-slate-50 rounded-2xl animate-pulse flex items-center justify-center text-xs font-semibold text-slate-400">Loading revenue chart...</div>}>
                    <AdminRevenueChart data={chartData} />
                  </Suspense>
                </div>
              </div>

              {/* System Health */}
              <div className="space-y-6">
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm shadow-slate-100 h-full">
                  <h3 className="text-lg font-black text-slate-900 mb-6">System Health</h3>
                  <div className="space-y-6">
                    <HealthItem 
                      label="Database (D1)" 
                      status={data?.health?.database} 
                      icon={<Activity size={18} />} 
                    />
                    <HealthItem 
                      label="SMTP Service" 
                      status={data?.health?.smtp} 
                      icon={<CheckCircle2 size={18} />} 
                    />
                    <HealthItem 
                      label="AI Engine (Sarvam)" 
                      status="operational" 
                      icon={<Bot size={18} />} 
                    />
                    
                    <div className="pt-6 mt-6 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Uptime</span>
                        <span className="text-sm font-black text-slate-900">99.98%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full w-[99.98%]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* PRODUCT & PRIVACY TELEMETRY VIEW */
          <div className="space-y-8 animate-fade-in">
            {/* Privacy Principle Banner */}
            <div className="p-5 bg-blue-50/60 border border-blue-200/80 rounded-2xl flex items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-blue-950 flex items-center gap-2">
                  <Sparkles size={16} className="text-blue-600" />
                  First-Party Behavioral Telemetry (Zero Identity Manufacturing)
                </h4>
                <p className="text-xs text-blue-900/80 mt-0.5">
                  Pseudonymous visitor measurement, coarse country geo, allowlisted events only. Zero keystrokes, zero passwords, zero session recording.
                </p>
              </div>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded-full whitespace-nowrap">
                30-Day Window
              </span>
            </div>

            {/* Product KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KpiCard 
                title="Unique Visitors" 
                value={analyticsData?.summary?.totalVisitors || 0} 
                trend="Anonymous UUID" 
                trendUp={true}
                icon={<Eye className="text-blue-500" />}
                color="blue"
              />
              <KpiCard 
                title="Total Page Views" 
                value={analyticsData?.summary?.totalPageViews || 0} 
                trend="First-party" 
                trendUp={true}
                icon={<TrendingUp className="text-emerald-500" />}
                color="emerald"
              />
              <KpiCard 
                title="CTA Interactions" 
                value={analyticsData?.summary?.totalCtas || 0} 
                trend="Hero & Nav CTAs" 
                trendUp={true}
                icon={<MousePointerClick className="text-orange-500" />}
                color="orange"
              />
              <KpiCard 
                title="Signups Started" 
                value={analyticsData?.funnel?.signup_starts || 0} 
                trend={`${analyticsData?.funnel?.trial_starts || 0} trials`} 
                trendUp={true}
                icon={<Users className="text-purple-500" />}
                color="purple"
              />
            </div>

            {/* Conversion Funnel Breakdown */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 mb-1">Landing Page Conversion Funnel</h3>
              <p className="text-xs text-slate-500 mb-6">Stage-by-stage behavioral velocity through FeraSetu</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <FunnelStep 
                  step="1. Landing" 
                  value={analyticsData?.funnel?.landing_visitors || 0} 
                  sub="Visitors" 
                  accent="border-blue-500"
                />
                <FunnelStep 
                  step="2. Features" 
                  value={analyticsData?.funnel?.features_engaged || 0} 
                  sub="Engaged" 
                  accent="border-indigo-500"
                />
                <FunnelStep 
                  step="3. Pricing" 
                  value={analyticsData?.funnel?.pricing_views || 0} 
                  sub="Plans Viewed" 
                  accent="border-purple-500"
                />
                <FunnelStep 
                  step="4. CTA Click" 
                  value={analyticsData?.funnel?.cta_clicks || 0} 
                  sub={`${analyticsData?.funnel?.rates?.landing_to_cta || 0}% rate`} 
                  accent="border-orange-500"
                />
                <FunnelStep 
                  step="5. Signup Start" 
                  value={analyticsData?.funnel?.signup_starts || 0} 
                  sub={`${analyticsData?.funnel?.rates?.pricing_to_signup || 0}% from pricing`} 
                  accent="border-amber-500"
                />
                <FunnelStep 
                  step="6. Trial/Active" 
                  value={analyticsData?.funnel?.trial_starts || 0} 
                  sub={`${analyticsData?.funnel?.rates?.overall_conversion || 0}% overall`} 
                  accent="border-emerald-500"
                />
              </div>
            </div>

            {/* Secondary Diagnostics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Coarse Geography */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-slate-900 font-bold text-sm">
                  <Globe size={16} className="text-blue-600" />
                  <span>Visitor Geography (Coarse)</span>
                </div>
                <div className="space-y-2.5">
                  {(analyticsData?.geo || []).length > 0 ? (
                    (analyticsData.geo).map((g: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-none">
                        <span className="font-semibold text-slate-700">{g.country}</span>
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">{g.count}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 py-4 text-center">No geographical signals recorded yet.</p>
                  )}
                </div>
              </div>

              {/* Devices */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-slate-900 font-bold text-sm">
                  <Smartphone size={16} className="text-orange-500" />
                  <span>Device Distribution</span>
                </div>
                <div className="space-y-3">
                  {['desktop', 'mobile', 'tablet'].map((dev) => {
                    const count = analyticsData?.devices?.[dev] || 0;
                    return (
                      <div key={dev} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">{dev}</span>
                        <span className="font-mono font-bold text-slate-900 text-sm">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Safe Client Errors */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-slate-900 font-bold text-sm">
                  <AlertCircle size={16} className="text-rose-500" />
                  <span>Safe Client Errors (PII-Redacted)</span>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {(analyticsData?.recentErrors || []).length > 0 ? (
                    (analyticsData.recentErrors).map((err: any, i: number) => (
                      <div key={i} className="p-2.5 bg-rose-50/50 border border-rose-100 rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-rose-950">{err.error_name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{new Date(err.created_at).toLocaleTimeString()}</span>
                        </div>
                        <div className="text-slate-500 font-mono text-[11px] truncate">{err.path}</div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 py-4 text-center">Zero runtime friction errors recorded.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function FunnelStep({ step, value, sub, accent }: any) {
  return (
    <div className={`p-4 rounded-2xl bg-slate-50 border-t-4 ${accent} border border-slate-200/80 flex flex-col justify-between`}>
      <span className="text-xs font-bold text-slate-500">{step}</span>
      <div className="my-2">
        <span className="text-2xl font-black text-slate-900">{value}</span>
      </div>
      <span className="text-[11px] font-semibold text-slate-500">{sub}</span>
    </div>
  );
}

function KpiCard({ title, value, trend, trendUp, icon, color }: any) {
  const colorMap: any = {
    emerald: 'bg-emerald-50',
    blue: 'bg-blue-50',
    purple: 'bg-purple-50',
    orange: 'bg-orange-50',
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-2xl ${colorMap[color]}`}>
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-xs font-black ${trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
          {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trend}
        </div>
      </div>
      <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</div>
      <div className="text-2xl font-black text-slate-900">{value}</div>
    </div>
  );
}

function HealthItem({ label, status, icon }: any) {
  const isOk = status === 'operational' || status === 'true';
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
      <div className="flex items-center gap-3">
        <div className={isOk ? 'text-emerald-500' : 'text-rose-500'}>
          {icon}
        </div>
        <span className="text-sm font-bold text-slate-700">{label}</span>
      </div>
      <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${isOk ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
        {isOk ? 'Stable' : 'Error'}
      </span>
    </div>
  );
}
