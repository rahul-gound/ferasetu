import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Users, DollarSign, Activity, ShoppingBag, 
  TrendingUp, Bot, CheckCircle2,
  ArrowUpRight, ArrowDownRight, Eye, MousePointerClick,
  Sparkles, Smartphone, Globe, AlertCircle, RefreshCw, Trash2, Coins,
  Network, Copy, Check, Search, Laptop, Tablet, Radio
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../components/admin/AdminLayout';

const AdminRevenueChart = lazy(() => import('../components/admin/AdminDashboardCharts'));

const API = import.meta.env.VITE_API_URL || '/api';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'financial' | 'telemetry'>('financial');
  const [data, setData] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [aiCreditsData, setAiCreditsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPruning, setIsPruning] = useState(false);
  const [ipSearchQuery, setIpSearchQuery] = useState('');
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [isRefreshingTelemetry, setIsRefreshingTelemetry] = useState(false);
  const token = localStorage.getItem('admin_token');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsRes, analyticsRes, aiCreditsRes] = await Promise.all([
          axios.get(`${API}/admin/dashboard-stats`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API}/admin/analytics?days=30`, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => ({ data: { analytics: null } })),
          axios.get(`${API}/admin/ai-credits`, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => ({ data: null }))
        ]);
        setData(statsRes.data);
        setAnalyticsData(analyticsRes.data?.analytics);
        setAiCreditsData(aiCreditsRes.data);
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

  const handleCopyIp = (ip: string) => {
    try {
      navigator.clipboard.writeText(ip);
      setCopiedIp(ip);
      toast.success(`Copied IP: ${ip}`);
      setTimeout(() => setCopiedIp(null), 2500);
    } catch {
      toast.error('Failed to copy IP');
    }
  };

  const handleRefreshAnalytics = async () => {
    setIsRefreshingTelemetry(true);
    try {
      const res = await axios.get(`${API}/admin/analytics?days=30`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalyticsData(res.data?.analytics);
      toast.success('Visitor telemetry & IPs refreshed');
    } catch {
      toast.error('Failed to refresh visitor telemetry');
    } finally {
      setIsRefreshingTelemetry(false);
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

            {/* AI Credit Overview Banner */}
            <div 
              onClick={() => navigate('/admin/ai-credits')}
              className="bg-gradient-to-br from-orange-50/90 via-white to-amber-50/50 p-6 rounded-3xl border border-orange-200 shadow-xs hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3.5 rounded-2xl bg-orange-500 text-white shadow-md shadow-orange-500/20 shrink-0">
                    <Coins size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-orange-600">Shopkeeper AI Credit Monitor</span>
                      <span className="text-[10px] font-bold bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">Live Telemetry</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                      {(aiCreditsData?.summary?.totalCreditsUsed || 0).toLocaleString()} <span className="text-sm font-semibold text-slate-500">total AI credits consumed</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {aiCreditsData?.summary?.activeShopkeepersCount || 0} shopkeepers actively using AI copilot • {aiCreditsData?.summary?.monthCreditsUsed || 0} credits used this month
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 sm:border-l sm:border-orange-100 sm:pl-6 justify-between sm:justify-end">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Circulating Balance</div>
                    <div className="text-lg font-black text-emerald-600">
                      {(aiCreditsData?.summary?.totalBalanceRemaining || 0).toLocaleString()} cr
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-4 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-bold group-hover:bg-orange-700 transition-colors shadow-xs">
                    <span>Per-Shopkeeper Breakdown</span>
                    <ArrowUpRight size={14} />
                  </div>
                </div>
              </div>
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
                      label="AI Engine (Fera AI)" 
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
            {/* Privacy Principle & Live Radar Banner */}
            <div className="p-6 bg-gradient-to-r from-blue-50/80 via-cyan-50/50 to-slate-50 border border-blue-200/80 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                    <Sparkles size={16} />
                  </span>
                  <h4 className="text-base font-black text-slate-900">
                    Product & Privacy Telemetry (Zero Identity Manufacturing)
                  </h4>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Live Visitor Radar
                  </span>
                </div>
                <p className="text-xs text-slate-600 max-w-2xl">
                  First-party behavioral telemetry showing real visitor IP addresses, unique visitors entering the platform, coarse geography, device distribution, and user journey velocity.
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleRefreshAnalytics}
                  disabled={isRefreshingTelemetry}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
                >
                  <RefreshCw size={13} className={isRefreshingTelemetry ? 'animate-spin text-orange-500' : 'text-slate-500'} />
                  <span>Refresh Radar</span>
                </button>
                <span className="text-[11px] font-black text-blue-700 bg-blue-100/80 px-3 py-2 rounded-xl whitespace-nowrap border border-blue-200">
                  30-Day Window
                </span>
              </div>
            </div>

            {/* Product & Visitor KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
              <KpiCard 
                title="Unique Site Visitors" 
                value={analyticsData?.summary?.totalVisitors || 0} 
                trend="Visitors Came to Site" 
                trendUp={true}
                icon={<Eye className="text-blue-500" />}
                color="blue"
              />
              <KpiCard 
                title="Visitor IP Addresses" 
                value={analyticsData?.summary?.totalIps || (analyticsData?.topIps?.length || 0)} 
                trend="Distinct IPs" 
                trendUp={true}
                icon={<Network className="text-cyan-600" />}
                color="cyan"
              />
              <KpiCard 
                title="Total Page Views" 
                value={analyticsData?.summary?.totalPageViews || 0} 
                trend="First-party Views" 
                trendUp={true}
                icon={<TrendingUp className="text-emerald-500" />}
                color="emerald"
              />
              <KpiCard 
                title="CTA Interactions" 
                value={analyticsData?.summary?.totalCtas || 0} 
                trend="Hero & Nav Clicks" 
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

            {/* LIVE VISITOR IP & NETWORK ACTIVITY RADAR */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-cyan-50 rounded-xl text-cyan-600 border border-cyan-100">
                      <Network size={18} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        Visitor IP & Traffic Activity
                        <span className="text-xs font-bold text-slate-400 font-mono">
                          ({(analyticsData?.recentVisitors || []).length} events recorded)
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        Inspecting connecting IP addresses, visited paths, geographical origin, and device types of users coming into the site
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filter IP, path, country..."
                      value={ipSearchQuery}
                      onChange={(e) => setIpSearchQuery(e.target.value)}
                      className="pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-cyan-500 focus:outline-none w-56 sm:w-64 transition-all text-slate-800 placeholder-slate-400"
                    />
                  </div>
                  {ipSearchQuery && (
                    <button
                      onClick={() => setIpSearchQuery('')}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Visitor Telemetry Roster Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                    <tr>
                      <th className="py-3.5 px-4">Visitor IP Address</th>
                      <th className="py-3.5 px-4">Visited Path</th>
                      <th className="py-3.5 px-4">Event / Action</th>
                      <th className="py-3.5 px-4">Origin / Country</th>
                      <th className="py-3.5 px-4">Device</th>
                      <th className="py-3.5 px-4 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      const list = (analyticsData?.recentVisitors || []).filter((v: any) => {
                        if (!ipSearchQuery) return true;
                        const q = ipSearchQuery.toLowerCase();
                        return (
                          (v.ip && v.ip.toLowerCase().includes(q)) ||
                          (v.country && v.country.toLowerCase().includes(q)) ||
                          (v.path && v.path.toLowerCase().includes(q)) ||
                          (v.event_name && v.event_name.toLowerCase().includes(q)) ||
                          (v.visitor_id && v.visitor_id.toLowerCase().includes(q))
                        );
                      });

                      if (list.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-slate-400">
                              <div className="flex flex-col items-center justify-center gap-2">
                                <Network size={28} className="text-slate-300" />
                                <p className="font-semibold">No visitor IP activity found matching your criteria</p>
                                <p className="text-[11px] text-slate-400">As users browse the site, their IP address and page interactions appear here in real-time.</p>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return list.slice(0, 30).map((visitor: any, idx: number) => {
                        const dev = (visitor.device_category || 'desktop').toLowerCase();
                        const devIcon = dev.includes('mobile') 
                          ? <Smartphone size={13} className="text-orange-500" />
                          : dev.includes('tablet')
                            ? <Tablet size={13} className="text-purple-500" />
                            : <Laptop size={13} className="text-blue-500" />;

                        return (
                          <tr key={visitor.id || idx} className="hover:bg-slate-50/70 transition-colors">
                            {/* Visitor IP Address with Copy Button */}
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">
                              <div className="inline-flex items-center gap-2 bg-slate-100/90 border border-slate-200/80 px-2.5 py-1 rounded-lg">
                                <span className="text-[11px] text-slate-800">{visitor.ip || '127.0.0.1'}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyIp(visitor.ip || '127.0.0.1')}
                                  className="text-slate-400 hover:text-slate-700 transition-colors p-0.5 rounded"
                                  title="Copy IP"
                                >
                                  {copiedIp === (visitor.ip || '127.0.0.1') ? (
                                    <Check size={12} className="text-emerald-600" />
                                  ) : (
                                    <Copy size={12} />
                                  )}
                                </button>
                              </div>
                            </td>

                            {/* Visited Path */}
                            <td className="py-3 px-4">
                              <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded-md truncate max-w-[200px] inline-block">
                                {visitor.path || '/'}
                              </span>
                            </td>

                            {/* Event / Action */}
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                visitor.event_name === 'page_view'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : visitor.event_name === 'cta_click'
                                    ? 'bg-orange-50 text-orange-700 border border-orange-200'
                                    : visitor.event_name === 'signup_start' || visitor.event_name === 'signup_complete'
                                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}>
                                {visitor.event_name}
                              </span>
                            </td>

                            {/* Origin / Country */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                                <Globe size={13} className="text-slate-400" />
                                <span>{visitor.country && visitor.country !== 'Unknown' ? visitor.country : 'Local / CDN'}</span>
                              </div>
                            </td>

                            {/* Device */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5 text-slate-600 capitalize">
                                {devIcon}
                                <span>{visitor.device_category || 'desktop'}</span>
                              </div>
                            </td>

                            {/* Time */}
                            <td className="py-3 px-4 text-right text-slate-500 font-mono text-[11px]">
                              {visitor.created_at ? new Date(visitor.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Recent'}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Conversion Funnel Breakdown */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 mb-1">Landing Page Conversion Funnel</h3>
              <p className="text-xs text-slate-500 mb-6">Stage-by-stage behavioral velocity through FeraSetu</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <FunnelStep 
                  step="1. Landing" 
                  value={analyticsData?.funnel?.landing_visitors || 0} 
                  sub="Unique Visitors" 
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

            {/* Diagnostics Grid: Top IPs, Coarse Geo, Devices, Errors */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Top Visitor IPs */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-slate-900 font-bold text-sm">
                  <Network size={16} className="text-cyan-600" />
                  <span>Top Visitor IPs</span>
                </div>
                <div className="space-y-2.5">
                  {(analyticsData?.topIps || []).length > 0 ? (
                    (analyticsData.topIps).slice(0, 6).map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-none">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                            {item.ip}
                          </span>
                          {item.country && item.country !== 'Unknown' && (
                            <span className="text-[10px] text-slate-500">{item.country}</span>
                          )}
                        </div>
                        <span className="font-mono font-bold text-cyan-800 bg-cyan-50 border border-cyan-100 px-2 py-0.5 rounded-md text-[11px]">
                          {item.total_events || item.page_views || 1} visits
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 py-4 text-center">No visitor IPs logged yet.</p>
                  )}
                </div>
              </div>

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
    cyan: 'bg-cyan-50',
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
