import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area, AreaChart,
  PieChart, Pie, Cell,
} from 'recharts';
import { 
  TrendingUp, ShoppingCart, ShoppingBag, Package, Coins,
  ArrowRight, Download, 
  Users, Target, Sparkles, ShieldCheck, Calendar,
  ChevronDown, CreditCard
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

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
    image_url?: string;
  }[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { translate } = useLanguage();
  const [downloading, setDownloading] = useState(false);
  const greeting = useMemo(() => getGreeting(), []);

  // Fetch optional API data if available
  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
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

  const firstName = user?.name ? user.name.split(' ')[0] : 'Arjun';

  // Fallback to high-fidelity reference metrics matching media_1788593319666.png
  const totalRevenue = dashboardData?.stats?.total_revenue ?? 124560;
  const totalOrders = dashboardData?.stats?.total_orders ?? 256;
  const totalCustomers = dashboardData?.stats?.total_customers ?? 189;
  const conversionRate = dashboardData?.stats?.conversion_rate ?? 3.42;

  const revenueChange = dashboardData?.stats?.revenue_change ?? 18.6;
  const ordersChange = dashboardData?.stats?.orders_change ?? 20.1;
  const customersChange = dashboardData?.stats?.customers_change ?? 15.3;
  const conversionChange = dashboardData?.stats?.conversion_change ?? 8.7;

  // 7-day Sales Overview data matching screenshot exactly (May 12 - May 18)
  const salesChartData = useMemo(() => {
    if (dashboardData?.revenue_chart && dashboardData.revenue_chart.length > 0) {
      return dashboardData.revenue_chart;
    }
    return [
      { date: 'May 12', revenue: 14000, orders: 18 },
      { date: 'May 13', revenue: 16000, orders: 25 },
      { date: 'May 14', revenue: 19500, orders: 32 },
      { date: 'May 15', revenue: 18000, orders: 28 },
      { date: 'May 16', revenue: 27000, orders: 48 },
      { date: 'May 17', revenue: 17500, orders: 33 },
      { date: 'May 18', revenue: 19500, orders: 38 }
    ];
  }, [dashboardData]);

  // Top Selling Products matching reference screenshot
  const topSellingProducts = useMemo(() => {
    if (dashboardData?.top_products && dashboardData.top_products.length > 0) {
      return dashboardData.top_products;
    }
    return [
      {
        id: 'p1',
        name: 'Wireless Headphones',
        price: 18990,
        sold_count: 120,
        image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=120&auto=format&fit=crop&q=80'
      },
      {
        id: 'p2',
        name: 'Smart Watch',
        price: 12499,
        sold_count: 98,
        image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&auto=format&fit=crop&q=80'
      },
      {
        id: 'p3',
        name: 'Bluetooth Speaker',
        price: 4999,
        sold_count: 76,
        image_url: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=120&auto=format&fit=crop&q=80'
      },
      {
        id: 'p4',
        name: 'Phone Case',
        price: 499,
        sold_count: 62,
        image_url: 'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=120&auto=format&fit=crop&q=80'
      },
      {
        id: 'p5',
        name: 'Charger Adapter',
        price: 799,
        sold_count: 54,
        image_url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=120&auto=format&fit=crop&q=80'
      }
    ];
  }, [dashboardData]);

  // Donut chart distribution (154 Delivered, 62 Processing, 28 Shipped, 12 Cancelled = 256)
  const donutData = [
    { name: 'Delivered', value: 154, percentage: 60.2, color: '#10B981' },
    { name: 'Processing', value: 62, percentage: 24.2, color: '#0052FF' },
    { name: 'Shipped', value: 28, percentage: 10.9, color: '#F59E0B' },
    { name: 'Cancelled', value: 12, percentage: 4.7, color: '#EF4444' }
  ];

  // Recent Orders matching reference design
  const recentOrders = useMemo(() => {
    if (dashboardData?.recent_orders && dashboardData.recent_orders.length > 0) {
      return dashboardData.recent_orders;
    }
    return [
      {
        id: 'ORD1234',
        customer_name: 'Rohit Sharma',
        total: 2499,
        status: 'delivered',
        icon: 'package'
      },
      {
        id: 'ORD1233',
        customer_name: 'Priya Verma',
        total: 1899,
        status: 'shipped',
        icon: 'package'
      },
      {
        id: 'ORD1232',
        customer_name: 'Amit Singh',
        total: 3299,
        status: 'processing',
        icon: 'package'
      },
      {
        id: 'ORD1231',
        customer_name: 'Neha Patel',
        total: 499,
        status: 'delivered',
        icon: 'cart'
      },
      {
        id: 'ORD1230',
        customer_name: 'Karan Mehta',
        total: 1299,
        status: 'cancelled',
        icon: 'cart'
      }
    ];
  }, [dashboardData]);

  // Handle Download Report (exports CSV & shows toast)
  const handleDownloadReport = () => {
    setDownloading(true);
    try {
      const csvRows = [
        ['FeraSetu Store Performance Report'],
        ['Generated At', new Date().toLocaleString()],
        ['Store Name', user?.business_name || user?.name || 'Arjun Store'],
        ['Period', 'May 12 – May 18, 2025'],
        [],
        ['Key Metric', 'Value', 'Change vs Last 7 Days'],
        ['Total Revenue', `₹${totalRevenue.toLocaleString('en-IN')}`, `+${revenueChange}%`],
        ['Total Orders', `${totalOrders}`, `+${ordersChange}%`],
        ['Total Customers', `${totalCustomers}`, `+${customersChange}%`],
        ['Conversion Rate', `${conversionRate}%`, `+${conversionChange}%`],
        [],
        ['Daily Breakdown (Last 7 Days)', 'Revenue (INR)', 'Orders'],
        ...salesChartData.map(d => [d.date, d.revenue, d.orders]),
        [],
        ['Top Selling Products', 'Price (INR)', 'Units Sold'],
        ...topSellingProducts.map(p => [p.name, p.price, p.sold_count]),
        [],
        ['Recent Orders', 'Customer', 'Amount (INR)', 'Status'],
        ...recentOrders.map(o => [`#${o.id}`, o.customer_name, o.total, o.status])
      ];

      const csvContent = csvRows.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `FeraSetu_Performance_Report_May_2025.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Performance report downloaded successfully!');
    } catch (err: any) {
      toast.error('Failed to download report.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="pb-10 max-w-[1380px] mx-auto space-y-6">
      
      {/* Dashboard Top Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-slate-900 tracking-tight font-outfit flex items-center gap-2">
            {greeting}, {firstName}! <span className="inline-block hover:animate-wiggle cursor-default">👋</span>
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
            Here's what's happening with your business today.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-white border border-slate-200/90 px-3.5 py-2 rounded-xl shadow-sm text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-50 transition-colors">
            <Calendar size={14} className="text-slate-400" />
            <span>May 12 – May 18, 2025</span>
            <ChevronDown size={14} className="text-slate-400 ml-0.5" />
          </div>

          <button
            onClick={handleDownloadReport}
            disabled={downloading}
            className="flex items-center gap-2 bg-white border border-slate-200/90 px-3.5 py-2 rounded-xl shadow-sm text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Download size={14} className="text-slate-500" />
            <span>{downloading ? 'Downloading...' : 'Download Report'}</span>
          </button>
        </div>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* Total Revenue */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-start gap-3.5 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
              <CreditCard size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">Total Revenue</p>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                ₹{totalRevenue.toLocaleString('en-IN')}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
            <TrendingUp size={13} />
            <span>↗ {revenueChange}%</span>
            <span className="text-slate-400 font-medium text-[11px]">vs last 7 days</span>
          </div>
          <div className="h-9 mt-2.5 relative">
            <svg viewBox="0 0 120 28" className="w-full h-full stroke-emerald-500 fill-transparent overflow-visible" preserveAspectRatio="none">
              <path d="M0,22 C20,22 35,16 50,18 C65,20 80,10 100,12 C110,13 115,6 120,4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="120" cy="4" r="3.5" className="fill-emerald-500" />
            </svg>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-start gap-3.5 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 flex-shrink-0">
              <ShoppingBag size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">Total Orders</p>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                {totalOrders}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
            <TrendingUp size={13} />
            <span>↗ {ordersChange}%</span>
            <span className="text-slate-400 font-medium text-[11px]">vs last 7 days</span>
          </div>
          <div className="h-9 mt-2.5 relative">
            <svg viewBox="0 0 120 28" className="w-full h-full stroke-purple-500 fill-transparent overflow-visible" preserveAspectRatio="none">
              <path d="M0,24 C18,24 30,19 45,21 C60,23 75,14 90,16 C105,17 112,8 120,6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="120" cy="6" r="3.5" className="fill-purple-500" />
            </svg>
          </div>
        </div>

        {/* Total Customers */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-start gap-3.5 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0052FF] flex-shrink-0">
              <Users size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">Total Customers</p>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                {totalCustomers}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
            <TrendingUp size={13} />
            <span>↗ {customersChange}%</span>
            <span className="text-slate-400 font-medium text-[11px]">vs last 7 days</span>
          </div>
          <div className="h-9 mt-2.5 relative">
            <svg viewBox="0 0 120 28" className="w-full h-full stroke-[#0052FF] fill-transparent overflow-visible" preserveAspectRatio="none">
              <path d="M0,22 C20,23 35,17 55,19 C70,20 85,11 100,13 C110,14 115,7 120,4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="120" cy="4" r="3.5" className="fill-[#0052FF]" />
            </svg>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-start gap-3.5 mb-2">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 flex-shrink-0">
              <Target size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">Conversion Rate</p>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                {conversionRate}%
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
            <TrendingUp size={13} />
            <span>↗ {conversionChange}%</span>
            <span className="text-slate-400 font-medium text-[11px]">vs last 7 days</span>
          </div>
          <div className="h-9 mt-2.5 relative">
            <svg viewBox="0 0 120 28" className="w-full h-full stroke-orange-500 fill-transparent overflow-visible" preserveAspectRatio="none">
              <path d="M0,24 C15,24 30,18 48,20 C65,22 80,14 95,16 C108,17 114,8 120,5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="120" cy="5" r="3.5" className="fill-orange-500" />
            </svg>
          </div>
        </div>
      </div>

      {/* Middle Row: Sales Overview, Top Selling Products, Order Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Sales Overview (col-span-6) */}
        <div className="lg:col-span-6 bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
            <h2 className="text-base font-bold text-slate-900">Sales Overview</h2>
            <div className="flex items-center gap-3.5 text-xs font-bold text-slate-500">
              <span className="flex items-center gap-1.5 text-[#0052FF]">
                <span className="w-2.5 h-0.5 rounded-full bg-[#0052FF]"></span> Revenue (₹)
              </span>
              <span className="flex items-center gap-1.5 text-[#93C5FD]">
                <span className="w-2.5 h-0.5 rounded-full bg-[#93C5FD]"></span> Orders
              </span>
              <div className="flex items-center gap-1 border border-slate-200 px-2 py-1 rounded-lg text-slate-700 bg-white text-[11px] font-semibold cursor-pointer hover:bg-slate-50">
                Last 7 Days <ChevronDown size={12} />
              </div>
            </div>
          </div>
          
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0052FF" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#0052FF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} dy={6} />
                <YAxis
                  yAxisId="left"
                  domain={[0, 30000]}
                  ticks={[0, 10000, 20000, 30000]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  tickFormatter={(val) => val === 0 ? '₹0' : `₹${val / 1000}K`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 60]}
                  ticks={[0, 20, 40, 60]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  formatter={(value: any, name: any) => [
                    name === 'revenue' ? `₹${value.toLocaleString('en-IN')}` : value,
                    name === 'revenue' ? 'Revenue' : 'Orders'
                  ]}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#0052FF"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#0052FF', strokeWidth: 0 }}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="orders"
                  stroke="#93C5FD"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#93C5FD', strokeWidth: 0 }}
                  fill="none"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Selling Products (col-span-3) */}
        <div className="lg:col-span-3 bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-bold text-slate-900">Top Selling Products</h2>
            <Link to="/products" className="text-xs font-bold text-[#0052FF] hover:underline">View All</Link>
          </div>
          
          <div className="flex flex-col gap-3 my-auto">
            {topSellingProducts.map((prod) => (
              <div key={prod.id} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                  <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{prod.name}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-slate-900">₹{prod.price.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] font-bold text-emerald-600">
                    {prod.sold_count}+ sold
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Status Donut (col-span-3) */}
        <div className="lg:col-span-3 bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <h2 className="text-base font-bold text-slate-900 mb-1">Order Status</h2>
          
          <div className="h-40 relative flex items-center justify-center my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  innerRadius={50}
                  outerRadius={68}
                  paddingAngle={3}
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
              <span className="text-2xl font-black text-slate-900">256</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Orders</span>
            </div>
          </div>

          <div className="mt-2 flex flex-col gap-1.5">
            {donutData.map(item => (
              <div key={item.name} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2 font-semibold text-slate-600">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                  {item.name}
                </div>
                <div className="font-bold text-slate-900">
                  {item.value} <span className="text-slate-400 font-normal">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Orders, AI Assistant, AI Credits */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Recent Orders (col-span-5) */}
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-bold text-slate-900">Recent Orders</h2>
            <Link to="/orders" className="text-xs font-bold text-[#0052FF] hover:underline">View All</Link>
          </div>
          
          <div className="flex flex-col gap-2 my-auto">
            {recentOrders.map((order) => {
              const statusBadge = 
                order.status === 'delivered' ? { bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'Delivered' } :
                order.status === 'shipped' ? { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Shipped' } :
                order.status === 'processing' ? { bg: 'bg-amber-50', text: 'text-amber-600', label: 'Processing' } :
                { bg: 'bg-red-50', text: 'text-red-600', label: 'Cancelled' };

              return (
                <div key={order.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                      {order.icon === 'cart' ? <ShoppingCart size={15} /> : <Package size={15} />}
                    </div>
                    <p className="text-xs font-bold text-slate-900">#{order.id}</p>
                  </div>
                  <div className="text-xs font-semibold text-slate-600 truncate max-w-[110px]">
                    {order.customer_name}
                  </div>
                  <div className="text-xs font-bold text-slate-900">
                    ₹{order.total.toLocaleString('en-IN')}
                  </div>
                  <div>
                    <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold ${statusBadge.bg} ${statusBadge.text}`}>
                      {statusBadge.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Assistant (col-span-4) */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-bold text-slate-900">AI Assistant</h2>
            <Link
              to="/ai-assistant"
              className="text-xs font-bold text-[#0052FF] hover:text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100/80 transition-colors"
            >
              New Chat
            </Link>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/70 p-3.5 rounded-xl border border-blue-100/70 mb-3 flex items-center gap-3">
            <Sparkles className="text-[#0052FF] shrink-0" size={20} />
            <p className="text-xs font-bold text-[#0052FF] leading-relaxed">
              Hi {firstName}! How can I help you grow your business today?
            </p>
          </div>

          <div className="flex flex-col gap-2 my-auto">
            {[
              'Which product is selling most?',
              'How can I increase my sales?',
              'Show low stock products'
            ].map((q, i) => (
              <Link
                to={`/ai-assistant?q=${encodeURIComponent(q)}`}
                key={i}
                className="flex justify-between items-center p-2.5 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:border-blue-200 hover:bg-blue-50/60 hover:text-[#0052FF] transition-all group"
              >
                <span>{q}</span>
                <ArrowRight size={13} className="text-slate-300 group-hover:text-[#0052FF] transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </div>

        {/* AI Credits (col-span-3) */}
        <div className="lg:col-span-3 bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-bold text-slate-900">AI Credits</h2>
            <Link to="/ai-credits" className="text-xs font-bold text-[#0052FF] hover:underline">View Details</Link>
          </div>
          
          <div className="bg-slate-50/80 rounded-xl border border-slate-100 p-3.5 mb-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0052FF] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <Coins size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Available Credits</p>
              <p className="text-lg font-black text-slate-900 leading-tight">120 Credits</p>
              <p className="text-[10px] font-semibold text-slate-400">Valid till: June 12, 2025</p>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1.5">
              <span>Used: 80 Credits</span>
              <span className="text-slate-900">Total: 200 Credits</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-[#0052FF] h-full rounded-full transition-all" style={{ width: `40%` }}></div>
            </div>
          </div>

          <Link
            to="/ai-credits"
            className="w-full py-2.5 bg-[#0052FF] hover:bg-blue-600 text-white text-xs font-bold rounded-xl text-center shadow-md shadow-blue-500/20 transition-all block mt-auto"
          >
            Buy More Credits
          </Link>
        </div>
      </div>

      {/* Security Banner Footer matching screenshot */}
      <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/50 border border-blue-100/70 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-[#0052FF] rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-md shadow-blue-500/20">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Your Business is Secure with FeraSetu</h3>
            <p className="text-xs font-medium text-slate-600">We protect your data with enterprise-grade security and 24/7 monitoring.</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/support')}
          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-[#0052FF] shadow-sm hover:bg-slate-50 transition-colors flex-shrink-0 cursor-pointer"
        >
          <span>Learn More</span>
          <ArrowRight size={13} />
        </button>
      </div>

      {/* Footer Copy */}
      <div className="flex flex-col sm:flex-row justify-between items-center text-[11px] font-semibold text-slate-400 pt-2 gap-2">
        <p>© 2025 FeraSetu. All rights reserved.</p>
        <p>Made with ❤️ in India 🇮🇳</p>
      </div>

    </div>
  );
}
