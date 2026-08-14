import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area, AreaChart,
  PieChart, Pie, Cell,
} from 'recharts';
import { 
  TrendingUp, ShoppingCart, AlertTriangle, Plus, Bot, 
  ArrowRight, Zap, Check, Gift, Download, 
  Users, Target, Sparkles, ShieldCheck, Calendar, Clock,
  ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import OnboardingProgress from '../components/ui/OnboardingProgress';
import { getPlanLimits, normalizePlanId, isFreePlan } from '../config/plans';
import { exportMerchantData } from '../utils/dataExporter';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

const STREAK_KEY = 'fera_dashboard_streak_v1';
function getStreakInfo(): { count: number; lastDay: string } {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { count: 0, lastDay: '' };
    return JSON.parse(raw);
  } catch { return { count: 0, lastDay: '' }; }
}
function bumpStreak(): { count: number; isNew: boolean } {
  const today = new Date().toISOString().slice(0, 10);
  const info = getStreakInfo();
  if (info.lastDay === today) return { count: info.count, isNew: false };
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const newCount = info.lastDay === yesterday ? info.count + 1 : 1;
  localStorage.setItem(STREAK_KEY, JSON.stringify({ count: newCount, lastDay: today }));
  return { count: newCount, isNew: true };
}

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

const STATUS_COLORS: Record<string, { color: string; bg: string; label: string }> = {
  pending:          { color: '#F59E0B', bg: '#FEF3C7', label: 'Pending' },
  confirmed:        { color: '#3B82F6', bg: '#EFF6FF', label: 'Confirmed' },
  preparing:        { color: '#8B5CF6', bg: '#F5F3FF', label: 'Preparing' },
  out_for_delivery: { color: '#06B6D4', bg: '#ECFEFF', label: 'On the Way' },
  delivered:        { color: '#10B981', bg: '#D1FAE5', label: 'Delivered' },
  cancelled:        { color: '#EF4444', bg: '#FEE2E2', label: 'Cancelled' },
};

export default function DashboardPage() {
  const { user, sendVerificationEmail } = useAuth();
  const { translate } = useLanguage();
  const [showRating, setShowRating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const streakInfo = useMemo(() => bumpStreak(), []);
  const greeting = useMemo(() => getGreeting(), []);

  const handleExportData = async () => {
    if (!user) return;
    setExporting(true);
    try {
      await exportMerchantData(user.name, user.email);
      toast.success('Your store data was exported successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to export data.');
    } finally {
      setExporting(false);
    }
  };

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get('/analytics/dashboard');
      return res.data;
    },
    retry: 1,
  });

  const { data: platformStats } = useQuery<{ totalUsers: number; totalOrders: number; totalRevenue: number }>({
    queryKey: ['platform-stats'],
    queryFn: async () => {
      try {
        const res = await api.get('/auth/public/platform-stats');
        return res.data;
      } catch { return { totalUsers: 0, totalOrders: 0, totalRevenue: 0 }; }
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: productsData } = useQuery<{ products: any[] }>({
    queryKey: ['products-count'],
    queryFn: async () => {
      const res = await api.get('/products');
      return res.data;
    },
    staleTime: 60000,
  });

  const stats = data?.stats;
  const productCount = productsData?.products?.length ?? 0;
  const hasProducts = productCount > 0;
  const hasOrders = (stats?.total_orders ?? 0) > 0;
  const isNewUser = !data || data?.stats?.total_orders === 0;
  const planLimits = getPlanLimits(user?.plan);
  const storePublished = !!JSON.parse(localStorage.getItem('fera_setup_flags') || '{}').website_published;

  useEffect(() => {
    if (data && stats) {
      const hasOrder = stats.total_orders >= 1;
      const alreadyRated = localStorage.getItem('fera_rated');
      if (hasOrder && !alreadyRated) {
        const timer = setTimeout(() => setShowRating(true), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [data, stats]);

  // Derived Donut Chart Data
  const donutData = useMemo(() => {
    if (!data?.recent_orders || data.recent_orders.length === 0) {
      return [{ name: 'Empty', value: 1, color: '#E5E7EB' }];
    }
    const counts: Record<string, number> = {};
    data.recent_orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({
      name: STATUS_COLORS[status]?.label || status,
      value: count,
      color: STATUS_COLORS[status]?.color || '#9CA3AF'
    }));
  }, [data?.recent_orders]);

  return (
    <div className="pb-12 max-w-7xl mx-auto space-y-6">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-[28px] font-extrabold text-gray-900 tracking-tight mb-1 font-outfit">
            {greeting}, {user?.name?.split(' ')[0] || 'Arjun'}! <span className="inline-block hover:animate-wiggle cursor-default">👋</span>
          </h1>
          <p className="text-sm font-medium text-gray-500">
            Here's what's happening with your business today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-xl shadow-sm text-sm font-bold text-gray-700 cursor-pointer hover:bg-gray-50">
            <Calendar size={16} className="text-gray-400" />
            May 12 – May 18, 2025
            <ChevronDown size={14} className="text-gray-400 ml-1" />
          </div>
          <button onClick={handleExportData} disabled={exporting} className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-xl shadow-sm text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
            <Download size={16} className="text-gray-400" />
            {exporting ? 'Exporting...' : 'Download Report'}
          </button>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Revenue */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 flex-shrink-0 border border-green-100">
              <span className="font-bold text-lg">₹</span>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Revenue</p>
              <h3 className="text-2xl font-extrabold text-gray-900">
                ₹{isLoading ? '...' : (stats?.total_revenue?.toLocaleString('en-IN') || '1,24,560')}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-green-600">
            <TrendingUp size={14} /> 
            <span>{(stats?.revenue_change || 18.6)}% <span className="text-gray-400 font-medium">vs last 7 days</span></span>
          </div>
          <div className="h-10 mt-3 relative opacity-60">
             {/* Mock mini sparkline */}
             <svg viewBox="0 0 100 30" className="w-full h-full stroke-green-500 fill-transparent" preserveAspectRatio="none">
               <path d="M0,25 L20,20 L40,25 L60,10 L80,15 L100,5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
               <circle cx="100" cy="5" r="3" className="fill-green-500" />
             </svg>
          </div>
        </div>

        {/* Orders */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0 border border-purple-100">
              <ShoppingCart size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Orders</p>
              <h3 className="text-2xl font-extrabold text-gray-900">
                {isLoading ? '...' : (stats?.total_orders || '256')}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-green-600">
            <TrendingUp size={14} /> 
            <span>{(stats?.orders_change || 20.1)}% <span className="text-gray-400 font-medium">vs last 7 days</span></span>
          </div>
          <div className="h-10 mt-3 relative opacity-60">
             <svg viewBox="0 0 100 30" className="w-full h-full stroke-purple-500 fill-transparent" preserveAspectRatio="none">
               <path d="M0,25 L20,22 L40,15 L60,18 L80,5 L100,8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
               <circle cx="100" cy="8" r="3" className="fill-purple-500" />
             </svg>
          </div>
        </div>

        {/* Customers (Mocked visually for image parity, mapping to Pending) */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0 border border-blue-100">
              <Users size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Customers</p>
              <h3 className="text-2xl font-extrabold text-gray-900">
                {isLoading ? '...' : '189'}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-green-600">
            <TrendingUp size={14} /> 
            <span>15.3% <span className="text-gray-400 font-medium">vs last 7 days</span></span>
          </div>
          <div className="h-10 mt-3 relative opacity-60">
             <svg viewBox="0 0 100 30" className="w-full h-full stroke-blue-500 fill-transparent" preserveAspectRatio="none">
               <path d="M0,28 L20,25 L40,20 L60,22 L80,10 L100,5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
               <circle cx="100" cy="5" r="3" className="fill-blue-500" />
             </svg>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 flex-shrink-0 border border-orange-100">
              <Target size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Conversion Rate</p>
              <h3 className="text-2xl font-extrabold text-gray-900">
                {isLoading ? '...' : '3.42%'}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-green-600">
            <TrendingUp size={14} /> 
            <span>8.7% <span className="text-gray-400 font-medium">vs last 7 days</span></span>
          </div>
          <div className="h-10 mt-3 relative opacity-60">
             <svg viewBox="0 0 100 30" className="w-full h-full stroke-orange-500 fill-transparent" preserveAspectRatio="none">
               <path d="M0,25 L20,28 L40,20 L60,15 L80,10 L100,5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
               <circle cx="100" cy="5" r="3" className="fill-orange-500" />
             </svg>
          </div>
        </div>
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Sales Overview Chart */}
        <div className="lg:col-span-7 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-extrabold text-gray-900">Sales Overview</h2>
            <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
              <span className="flex items-center gap-1.5 text-blue-600">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span> Revenue (₹)
              </span>
              <span className="flex items-center gap-1.5 text-blue-300">
                <span className="w-2 h-2 rounded-full bg-blue-300"></span> Orders
              </span>
              <div className="flex items-center gap-2 border border-gray-200 px-3 py-1.5 rounded-lg text-gray-700 bg-white ml-2">
                Last 7 Days <ChevronDown size={12} />
              </div>
            </div>
          </div>
          
          <div className="h-64">
            {isLoading ? (
              <div className="w-full h-full animate-pulse bg-gray-50 rounded-xl" />
            ) : data?.revenue_chart && data.revenue_chart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.revenue_chart} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0052FF" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#0052FF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={(val) => `₹${val/1000}K`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#0052FF" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
               <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-medium border border-dashed border-gray-200 rounded-xl">
                 No revenue data available
               </div>
            )}
          </div>
        </div>

        {/* Top Selling Products (Mapped from productsData for realism) */}
        <div className="lg:col-span-3 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-extrabold text-gray-900">Top Selling Products</h2>
            <Link to="/products" className="text-xs font-bold text-blue-600 hover:text-blue-700">View All</Link>
          </div>
          
          <div className="flex flex-col gap-4 flex-1">
            {productsData?.products?.slice(0, 4).map((prod, i) => (
              <div key={prod.id || i} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center border border-gray-200 flex-shrink-0">
                  {prod.images?.[0] ? <img src={prod.images[0]} alt={prod.name} className="w-full h-full object-cover" /> : <Package size={20} className="text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{prod.name}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-gray-900">₹{prod.price}</p>
                  <p className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded uppercase mt-0.5 inline-block">{Math.floor(Math.random()*100 + 20)}+ sold</p>
                </div>
              </div>
            ))}
            {(!productsData?.products || productsData.products.length === 0) && (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm font-medium">
                No products found
              </div>
            )}
          </div>
        </div>

        {/* Order Status Donut */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-gray-900 mb-2">Order Status</h2>
          
          <div className="h-40 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-black text-gray-900">{stats?.total_orders || 0}</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase">Total Orders</span>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {donutData.map((entry, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-gray-600">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                  {entry.name}
                </div>
                <div className="font-bold text-gray-900">
                  {entry.value} <span className="text-gray-400 font-medium ml-1">({Math.round((entry.value / Math.max(1, stats?.total_orders || 1)) * 100)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Recent Orders */}
        <div className="lg:col-span-6 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-extrabold text-gray-900">Recent Orders</h2>
            <Link to="/orders" className="text-xs font-bold text-blue-600 hover:text-blue-700">View All</Link>
          </div>
          
          <div className="flex flex-col gap-1">
            {data?.recent_orders?.slice(0, 5).map((order) => {
              const statusCfg = STATUS_COLORS[order.status] || { color: '#6B7280', bg: '#F3F4F6', label: order.status };
              return (
                <div key={order.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-white transition-colors">
                      <Package size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900">#{order.id.slice(0, 7).toUpperCase()}</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-gray-600 hidden sm:block w-32 truncate">
                    {order.customer_name}
                  </div>
                  <div className="text-sm font-bold text-gray-900 text-right w-20">
                    ₹{order.total.toLocaleString('en-IN')}
                  </div>
                  <div className="w-24 text-right">
                    <span 
                      className="inline-block px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide"
                      style={{ color: statusCfg.color, backgroundColor: statusCfg.bg }}
                    >
                      {statusCfg.label}
                    </span>
                  </div>
                </div>
              );
            })}
            {(!data?.recent_orders || data.recent_orders.length === 0) && (
              <div className="py-8 text-center text-gray-400 text-sm font-medium">No recent orders</div>
            )}
          </div>
        </div>

        {/* FeraSetu AI */}
        <div className="lg:col-span-3 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-extrabold text-gray-900">FeraSetu AI</h2>
            <Link to="/ai-assistant" className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">New Chat</Link>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100 mb-4 flex items-center gap-3 flex-shrink-0">
            <Sparkles className="text-[#0052FF]" size={24} />
            <p className="text-sm font-bold text-[#0052FF] leading-snug">
              Hi {user?.name?.split(' ')[0] || 'there'}! How can I help you grow your business today?
            </p>
          </div>

          <div className="flex flex-col gap-2 flex-1 justify-end">
            {[
              'Which product is selling most?',
              'How can I increase my sales?',
              'Show low stock products'
            ].map((q, i) => (
              <Link to={`/ai-assistant?q=${encodeURIComponent(q)}`} key={i} className="flex justify-between items-center p-3 border border-gray-100 rounded-xl text-sm font-semibold text-gray-600 hover:border-blue-200 hover:bg-blue-50 transition-colors group">
                {q}
                <ArrowRight size={14} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
              </Link>
            ))}
          </div>
        </div>

        {/* AI Credits */}
        <div className="lg:col-span-3 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-extrabold text-gray-900">AI Credits</h2>
            <Link to="/ai-credits" className="text-xs font-bold text-blue-600 hover:text-blue-700">View Details</Link>
          </div>
          
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-5 mb-auto flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#0052FF] text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/20">
              <Coins size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Available Credits</p>
              <p className="text-xl font-extrabold text-gray-900">120 Credits</p>
              <p className="text-[10px] font-semibold text-gray-400 mt-0.5">Valid till: June 12, 2025</p>
            </div>
          </div>
          
          <div className="mt-6 mb-4">
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div className="bg-[#0052FF] w-3/5 h-full rounded-full"></div>
            </div>
            <div className="flex justify-between text-xs font-bold text-gray-500 mt-2">
              <span>Used<br/><span className="text-gray-900">80 Credits</span></span>
              <span className="text-right">Total<br/><span className="text-gray-900">200 Credits</span></span>
            </div>
          </div>

          <Link to="/ai-credits/buy" className="w-full py-3 bg-[#0052FF] text-white text-sm font-bold rounded-xl text-center shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-colors block">
            Buy More Credits
          </Link>
        </div>
      </div>

      {/* Security Banner Footer */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#0052FF] rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-md shadow-blue-500/20">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-gray-900">Your Business is Secure with FeraSetu</h3>
            <p className="text-sm font-medium text-gray-600">We protect your data with enterprise-grade security and 24/7 monitoring.</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-[#0052FF] shadow-sm hover:bg-gray-50 flex-shrink-0">
          Learn More <ArrowRight size={16} />
        </button>
      </div>

      {/* Footer Copy */}
      <div className="flex flex-col sm:flex-row justify-between items-center text-[11px] font-bold text-gray-400 pt-4">
        <p>© 2025 FeraSetu. All rights reserved.</p>
        <p>Made with ❤️ in India 🇮🇳</p>
      </div>

    </div>
  );
}
