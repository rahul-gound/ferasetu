import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area, AreaChart,
  PieChart, Pie, Cell,
} from 'recharts';
import { 
  TrendingUp, ShoppingCart, Package, Coins,
  ArrowRight, Download, 
  Users, Target, Sparkles, ShieldCheck, Calendar,
  ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { exportMerchantData } from '../utils/dataExporter';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

interface DashboardData {
  stats?: {
    total_revenue?: number;
    total_orders?: number;
    total_customers?: number;
    conversion_rate?: number;
    pending_orders?: number;
    low_stock_count?: number;
    revenue_change?: number;
    orders_change?: number;
    customers_change?: number;
    conversion_change?: number;
  };
  revenue_chart?: { date: string; revenue: number; orders?: number }[];
  recent_orders?: {
    id: string;
    customer_name: string;
    total: number;
    status: string;
    created_at: string;
    items_count?: number;
  }[];
  top_products?: {
    id: string;
    name: string;
    price: number;
    sold_count: number;
    images?: string[];
  }[];
}

const STATUS_COLORS: Record<string, { color: string; bg: string; label: string }> = {
  delivered:        { color: '#10B981', bg: '#D1FAE5', label: 'Delivered' },
  processing:       { color: '#3B82F6', bg: '#EFF6FF', label: 'Processing' },
  preparing:        { color: '#3B82F6', bg: '#EFF6FF', label: 'Processing' },
  shipped:          { color: '#F59E0B', bg: '#FEF3C7', label: 'Shipped' },
  out_for_delivery: { color: '#F59E0B', bg: '#FEF3C7', label: 'Shipped' },
  pending:          { color: '#F59E0B', bg: '#FEF3C7', label: 'Pending' },
  cancelled:        { color: '#EF4444', bg: '#FEE2E2', label: 'Cancelled' },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { translate } = useLanguage();
  const [exporting, setExporting] = useState(false);
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

  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      try {
        const res = await api.get('/analytics/dashboard');
        return res.data;
      } catch {
        return null as any;
      }
    },
    retry: 1,
  });

  const { data: ordersData, isLoading: isOrdersLoading } = useQuery<{ orders: any[] }>({
    queryKey: ['orders-list'],
    queryFn: async () => {
      try {
        const res = await api.get('/orders');
        return res.data;
      } catch {
        return { orders: [] };
      }
    },
  });

  const { data: productsData, isLoading: isProductsLoading } = useQuery<{ products: any[] }>({
    queryKey: ['products-list'],
    queryFn: async () => {
      try {
        const res = await api.get('/products');
        return res.data;
      } catch {
        return { products: [] };
      }
    },
  });

  const isLoading = isDashboardLoading || isOrdersLoading || isProductsLoading;

  const orders = useMemo(() => ordersData?.orders ?? [], [ordersData]);
  const products = useMemo(() => productsData?.products ?? [], [productsData]);

  // Compute 100% genuine statistics (never fake)
  const realTotalOrders = dashboardData?.stats?.total_orders ?? orders.length;
  const realTotalRevenue = dashboardData?.stats?.total_revenue ?? orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  
  const realTotalCustomers = useMemo(() => {
    if (dashboardData?.stats?.total_customers !== undefined) {
      return dashboardData.stats.total_customers;
    }
    const set = new Set<string>();
    orders.forEach(o => {
      if (o.customer_name?.trim()) set.add(o.customer_name.trim());
    });
    return set.size;
  }, [dashboardData, orders]);

  const realConversionRate = useMemo(() => {
    if (dashboardData?.stats?.conversion_rate !== undefined) {
      return dashboardData.stats.conversion_rate;
    }
    const delivered = orders.filter(o => o.status === 'delivered').length;
    return realTotalOrders > 0 ? Number(((delivered / realTotalOrders) * 100).toFixed(2)) : 0;
  }, [dashboardData, orders, realTotalOrders]);

  const revenueChange = dashboardData?.stats?.revenue_change ?? 0;
  const ordersChange = dashboardData?.stats?.orders_change ?? 0;
  const customersChange = dashboardData?.stats?.customers_change ?? 0;
  const conversionChange = dashboardData?.stats?.conversion_change ?? 0;

  const firstName = user?.name ? user.name.split(' ')[0] : (user?.business_name || 'Arjun');

  // 7-Day Chart Data with real dates
  const chartData = useMemo(() => {
    const now = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const ymd = d.toISOString().slice(0, 10);
      
      const dayOrders = orders.filter(o => (o.created_at || '').startsWith(ymd));
      const dayRev = dayOrders
        .filter(o => o.status !== 'cancelled')
        .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

      days.push({
        date: dateLabel,
        revenue: dayRev,
        orders: dayOrders.length
      });
    }

    if (dashboardData?.revenue_chart && dashboardData.revenue_chart.length > 0) {
      return dashboardData.revenue_chart.map((pt, idx) => ({
        date: pt.date || days[idx]?.date || '',
        revenue: pt.revenue ?? 0,
        orders: pt.orders ?? days[idx]?.orders ?? 0
      }));
    }

    return days;
  }, [dashboardData, orders]);

  // Real Top Selling Products from Catalog & Orders
  const topProducts = useMemo(() => {
    if (dashboardData?.top_products && dashboardData.top_products.length > 0) {
      return dashboardData.top_products;
    }

    const salesMap: Record<string, number> = {};
    orders.forEach(o => {
      (o.items || []).forEach((it: any) => {
        const name = it?.name || it?.product_name;
        if (name) {
          salesMap[name] = (salesMap[name] || 0) + (Number(it?.quantity || it?.qty) || 1);
        }
      });
    });

    return products.slice(0, 5).map(p => ({
      id: p.id,
      name: p.name,
      price: Number(p.price) || 0,
      sold_count: salesMap[p.name] || 0,
      images: p.images || (p.image_url ? [p.image_url] : [])
    })).sort((a, b) => b.sold_count - a.sold_count);
  }, [dashboardData, orders, products]);

  // Order Status Counts for Donut Chart
  const statusCounts = useMemo(() => {
    const counts = {
      delivered: 0,
      processing: 0,
      shipped: 0,
      cancelled: 0,
    };
    orders.forEach(o => {
      const s = (o.status || '').toLowerCase();
      if (s === 'delivered') counts.delivered++;
      else if (s === 'processing' || s === 'preparing') counts.processing++;
      else if (s === 'shipped' || s === 'out_for_delivery') counts.shipped++;
      else if (s === 'cancelled') counts.cancelled++;
      else counts.processing++;
    });
    return counts;
  }, [orders]);

  const donutData = useMemo(() => {
    if (realTotalOrders === 0) {
      return [{ name: 'No Orders', value: 1, color: '#E2E8F0' }];
    }
    const slices = [
      { name: 'Delivered', value: statusCounts.delivered, color: '#10B981' },
      { name: 'Processing', value: statusCounts.processing, color: '#3B82F6' },
      { name: 'Shipped', value: statusCounts.shipped, color: '#F59E0B' },
      { name: 'Cancelled', value: statusCounts.cancelled, color: '#EF4444' },
    ];
    return slices.filter(s => s.value > 0);
  }, [realTotalOrders, statusCounts]);

  const recentOrders = useMemo(() => {
    if (dashboardData?.recent_orders && dashboardData.recent_orders.length > 0) {
      return dashboardData.recent_orders;
    }
    return orders.slice(0, 5).map(o => ({
      id: o.id,
      customer_name: o.customer_name || 'Guest',
      total: Number(o.total) || 0,
      status: o.status || 'pending',
      created_at: o.created_at,
      items_count: Array.isArray(o.items) ? o.items.length : 0
    }));
  }, [dashboardData, orders]);

  const aiCreditsBalance = user?.ai_credits_balance ?? 120;
  const aiCreditsLimit = user?.ai_credits_monthly_limit ?? 200;
  const aiCreditsUsed = user?.ai_credits_used_month ?? (aiCreditsLimit - aiCreditsBalance);
  const aiCreditsPercent = Math.min(100, Math.max(5, Math.round((aiCreditsUsed / Math.max(1, aiCreditsLimit)) * 100)));

  return (
    <div className="pb-12 max-w-7xl mx-auto space-y-6">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl md:text-[28px] font-extrabold text-gray-900 tracking-tight mb-1 font-outfit">
            {greeting}, {firstName}! <span className="inline-block hover:animate-wiggle cursor-default">👋</span>
          </h1>
          <p className="text-sm font-medium text-gray-500">
            Here's what's happening with your business today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-xl shadow-sm text-sm font-bold text-gray-700 cursor-pointer hover:bg-gray-50">
            <Calendar size={16} className="text-gray-400" />
            {(() => {
              const now = new Date();
              const weekAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
              const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              return `${fmt(weekAgo)} – ${fmt(now)}, ${now.getFullYear()}`;
            })()}
            <ChevronDown size={14} className="text-gray-400 ml-1" />
          </div>
          <button
            onClick={handleExportData}
            disabled={exporting}
            className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-xl shadow-sm text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <Download size={16} className="text-gray-400" />
            <span>Download Report</span>
          </button>
        </div>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Revenue */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
          <div className="flex items-start gap-4 mb-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0 border border-emerald-100/80">
              <span className="font-extrabold text-lg">₹</span>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Revenue</p>
              <h3 className="text-2xl font-black text-gray-900">
                ₹{isLoading ? '...' : realTotalRevenue.toLocaleString('en-IN')}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
            <TrendingUp size={14} /> 
            <span>{revenueChange > 0 ? `+${revenueChange}%` : `${revenueChange}%`} <span className="text-gray-400 font-medium">vs last 7 days</span></span>
          </div>
          <div className="h-9 mt-3 relative opacity-80">
            <svg viewBox="0 0 100 30" className="w-full h-full stroke-emerald-500 fill-transparent" preserveAspectRatio="none">
              <path d="M0,25 L20,20 L40,25 L60,12 L80,15 L100,5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="100" cy="5" r="3" className="fill-emerald-500" />
            </svg>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
          <div className="flex items-start gap-4 mb-3">
            <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0 border border-purple-100/80">
              <ShoppingCart size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Orders</p>
              <h3 className="text-2xl font-black text-gray-900">
                {isLoading ? '...' : realTotalOrders}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
            <TrendingUp size={14} /> 
            <span>{ordersChange > 0 ? `+${ordersChange}%` : `${ordersChange}%`} <span className="text-gray-400 font-medium">vs last 7 days</span></span>
          </div>
          <div className="h-9 mt-3 relative opacity-80">
            <svg viewBox="0 0 100 30" className="w-full h-full stroke-purple-500 fill-transparent" preserveAspectRatio="none">
              <path d="M0,25 L20,22 L40,15 L60,18 L80,6 L100,8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="100" cy="8" r="3" className="fill-purple-500" />
            </svg>
          </div>
        </div>

        {/* Total Customers */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
          <div className="flex items-start gap-4 mb-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0 border border-blue-100/80">
              <Users size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Customers</p>
              <h3 className="text-2xl font-black text-gray-900">
                {isLoading ? '...' : realTotalCustomers}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
            <TrendingUp size={14} /> 
            <span>{customersChange > 0 ? `+${customersChange}%` : `${customersChange}%`} <span className="text-gray-400 font-medium">vs last 7 days</span></span>
          </div>
          <div className="h-9 mt-3 relative opacity-80">
            <svg viewBox="0 0 100 30" className="w-full h-full stroke-blue-500 fill-transparent" preserveAspectRatio="none">
              <path d="M0,28 L20,25 L40,20 L60,22 L80,10 L100,5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="100" cy="5" r="3" className="fill-blue-500" />
            </svg>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
          <div className="flex items-start gap-4 mb-3">
            <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 flex-shrink-0 border border-orange-100/80">
              <Target size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Conversion Rate</p>
              <h3 className="text-2xl font-black text-gray-900">
                {isLoading ? '...' : `${realConversionRate}%`}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
            <TrendingUp size={14} /> 
            <span>{conversionChange > 0 ? `+${conversionChange}%` : `${conversionChange}%`} <span className="text-gray-400 font-medium">vs last 7 days</span></span>
          </div>
          <div className="h-9 mt-3 relative opacity-80">
            <svg viewBox="0 0 100 30" className="w-full h-full stroke-orange-500 fill-transparent" preserveAspectRatio="none">
              <path d="M0,25 L20,28 L40,20 L60,15 L80,10 L100,5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="100" cy="5" r="3" className="fill-orange-500" />
            </svg>
          </div>
        </div>
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Sales Overview Dual Chart */}
        <div className="lg:col-span-6 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-gray-900">Sales Overview</h2>
            <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
              <span className="flex items-center gap-1.5 text-blue-600">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Revenue (₹)
              </span>
              <span className="flex items-center gap-1.5 text-blue-300">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-300"></span> Orders
              </span>
              <div className="flex items-center gap-1.5 border border-gray-200 px-2.5 py-1 rounded-lg text-gray-700 bg-white ml-2 text-xs font-semibold">
                Last 7 Days <ChevronDown size={12} />
              </div>
            </div>
          </div>
          
          <div className="h-64 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0052FF" stopOpacity={0.12}/>
                    <stop offset="95%" stopColor="#0052FF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} dy={8} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} tickFormatter={(val) => val >= 1000 ? `₹${Math.round(val/1000)}K` : `₹${val}`} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  formatter={(value: any, name: any) => [name === 'revenue' ? `₹${value.toLocaleString('en-IN')}` : value, name === 'revenue' ? 'Revenue' : 'Orders']}
                />
                <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#0052FF" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
                <Area yAxisId="right" type="monotone" dataKey="orders" stroke="#93C5FD" strokeWidth={2.5} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="lg:col-span-3 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-base font-bold text-gray-900">Top Selling Products</h2>
            <Link to="/products" className="text-xs font-bold text-blue-600 hover:text-blue-700">View All</Link>
          </div>
          
          <div className="flex flex-col gap-3.5 flex-1">
            {topProducts.slice(0, 5).map((prod: any, i: number) => (
              <div key={prod.id || i} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center border border-slate-100 flex-shrink-0">
                  {prod.images?.[0] ? (
                    <img src={prod.images[0]} alt={prod.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package size={18} className="text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">{prod.name}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-gray-900">₹{prod.price?.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase mt-0.5 inline-block">
                    {prod.sold_count} sold
                  </p>
                </div>
              </div>
            ))}
            {topProducts.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                <Package size={28} className="text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-700 mb-1">No products added yet</p>
                <Link to="/products" className="text-xs font-bold text-blue-600 hover:underline">
                  + Add product
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Order Status Donut Chart */}
        <div className="lg:col-span-3 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col">
          <h2 className="text-base font-bold text-gray-900 mb-3">Order Status</h2>
          
          <div className="h-40 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={donutData.length > 1 ? 4 : 0}
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
              <span className="text-2xl font-black text-gray-900">{realTotalOrders}</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Total Orders</span>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2 font-semibold text-gray-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Delivered
              </div>
              <div className="font-bold text-gray-900">
                {statusCounts.delivered} <span className="text-gray-400 font-normal">({realTotalOrders > 0 ? Math.round((statusCounts.delivered / realTotalOrders) * 100) : 0}%)</span>
              </div>
            </div>
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2 font-semibold text-gray-600">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Processing
              </div>
              <div className="font-bold text-gray-900">
                {statusCounts.processing} <span className="text-gray-400 font-normal">({realTotalOrders > 0 ? Math.round((statusCounts.processing / realTotalOrders) * 100) : 0}%)</span>
              </div>
            </div>
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2 font-semibold text-gray-600">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Shipped
              </div>
              <div className="font-bold text-gray-900">
                {statusCounts.shipped} <span className="text-gray-400 font-normal">({realTotalOrders > 0 ? Math.round((statusCounts.shipped / realTotalOrders) * 100) : 0}%)</span>
              </div>
            </div>
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2 font-semibold text-gray-600">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                Cancelled
              </div>
              <div className="font-bold text-gray-900">
                {statusCounts.cancelled} <span className="text-gray-400 font-normal">({realTotalOrders > 0 ? Math.round((statusCounts.cancelled / realTotalOrders) * 100) : 0}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Recent Orders */}
        <div className="lg:col-span-5 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-base font-bold text-gray-900">Recent Orders</h2>
            <Link to="/orders" className="text-xs font-bold text-blue-600 hover:text-blue-700">View All</Link>
          </div>
          
          <div className="flex flex-col gap-2 flex-1">
            {recentOrders.slice(0, 5).map((order: any) => {
              const statusCfg = STATUS_COLORS[order.status] || { color: '#6B7280', bg: '#F3F4F6', label: order.status };
              return (
                <div key={order.id} className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                      <Package size={17} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">#ORD{order.id.slice(0, 5).toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-gray-600 truncate max-w-[110px]">
                    {order.customer_name}
                  </div>
                  <div className="text-xs font-bold text-gray-900">
                    ₹{order.total?.toLocaleString('en-IN')}
                  </div>
                  <div>
                    <span 
                      className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide capitalize"
                      style={{ color: statusCfg.color, backgroundColor: statusCfg.bg }}
                    >
                      {statusCfg.label}
                    </span>
                  </div>
                </div>
              );
            })}
            {recentOrders.length === 0 && (
              <div className="py-8 text-center flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
                  <ShoppingCart size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-700 mb-0.5">No orders yet</p>
                  <p className="text-[11px] text-gray-400 font-medium max-w-[200px] mx-auto leading-relaxed">
                    Share your store link on WhatsApp to start receiving orders.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI Assistant */}
        <div className="lg:col-span-4 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-gray-900">AI Assistant</h2>
            <Link to="/ai-assistant" className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100/80">
              New Chat
            </Link>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 p-4 rounded-xl border border-blue-100/80 mb-4 flex items-center gap-3">
            <Sparkles className="text-[#0052FF] shrink-0" size={22} />
            <p className="text-xs font-bold text-[#0052FF] leading-relaxed">
              Hi {firstName}! How can I help you grow your business today?
            </p>
          </div>

          <div className="flex flex-col gap-2 flex-1 justify-end">
            {[
              'Which product is selling most?',
              'How can I increase my sales?',
              'Show low stock products'
            ].map((q, i) => (
              <Link
                to={`/ai-assistant?q=${encodeURIComponent(q)}`}
                key={i}
                className="flex justify-between items-center p-3 border border-gray-100 rounded-xl text-xs font-bold text-gray-600 hover:border-blue-200 hover:bg-blue-50 transition-colors group"
              >
                <span>{q}</span>
                <ArrowRight size={14} className="text-gray-300 group-hover:text-blue-500 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </div>

        {/* AI Credits */}
        <div className="lg:col-span-3 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-gray-900">AI Credits</h2>
            <Link to="/ai-credits" className="text-xs font-bold text-blue-600 hover:text-blue-700">View Details</Link>
          </div>
          
          <div className="bg-slate-50/80 rounded-xl border border-slate-100 p-4 mb-4 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-[#0052FF] text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/20">
              <Coins size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Available Credits</p>
              <p className="text-lg font-black text-gray-900">{aiCreditsBalance} Credits</p>
              <p className="text-[10px] font-semibold text-slate-400">Valid till: {new Date(Date.now() + 30 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-[#0052FF] h-full rounded-full transition-all" style={{ width: `${aiCreditsPercent}%` }}></div>
            </div>
            <div className="flex justify-between text-[11px] font-bold text-gray-500 mt-2">
              <span>Used: {aiCreditsUsed} Credits</span>
              <span className="text-gray-900">Total: {aiCreditsLimit} Credits</span>
            </div>
          </div>

          <Link
            to="/ai-credits"
            className="w-full py-2.5 bg-[#0052FF] hover:bg-blue-600 text-white text-xs font-bold rounded-xl text-center shadow-md shadow-blue-500/20 transition-colors block mt-auto"
          >
            Buy More Credits
          </Link>
        </div>
      </div>

      {/* Security Banner Footer */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-100/80 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-[#0052FF] rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-md shadow-blue-500/20">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-gray-900">Your Business is Secure with FeraSetu</h3>
            <p className="text-xs font-medium text-gray-600">We protect your data with enterprise-grade security and 24/7 monitoring.</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-[#0052FF] shadow-sm hover:bg-gray-50 flex-shrink-0 cursor-pointer">
          <span>Learn More</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Footer Copy */}
      <div className="flex flex-col sm:flex-row justify-between items-center text-[11px] font-bold text-gray-400 pt-3">
        <p>© 2025 FeraSetu. All rights reserved.</p>
        <p>Made with ❤️ in India 🇮🇳</p>
      </div>

    </div>
  );
}
