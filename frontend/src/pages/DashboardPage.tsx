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
  ChevronDown, CreditCard, Share2, Plus, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useMarket } from '../contexts/MarketContext';
import OnboardingProgress from '../components/ui/OnboardingProgress';

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
  }[];
  top_products?: {
    id: string;
    name: string;
    price: number;
    sold_count: number;
    image_url?: string;
  }[];
}

// Generate smooth SVG curve from actual data points
function generateSparkline(values: number[], width = 120, height = 28) {
  if (!values || values.length === 0) {
    const y = height - 6;
    return { path: `M0,${y} L${width},${y}`, endX: width, endY: y };
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  
  if (range === 0) {
    const y = height - 8;
    return { path: `M0,${y} L${width},${y}`, endX: width, endY: y };
  }

  const step = width / Math.max(1, values.length - 1);
  const points = values.map((v, i) => {
    const x = i * step;
    const y = height - 4 - ((v - min) / range) * (height - 8);
    return { x, y };
  });

  const path = points.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    const prev = arr[i - 1];
    const cx = ((prev.x + pt.x) / 2).toFixed(1);
    return `${acc} C${cx},${prev.y.toFixed(1)} ${cx},${pt.y.toFixed(1)} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
  }, '');

  const last = points[points.length - 1];
  return { path, endX: last.x, endY: last.y };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { translate } = useLanguage();
  const { config, subscription } = useMarket();
  const [downloading, setDownloading] = useState(false);
  const greeting = useMemo(() => getGreeting(), []);

  // Fetch real analytics from backend
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard-analytics'],
    queryFn: async () => {
      try {
        const res = await api.get('/analytics/dashboard');
        return res.data;
      } catch {
        return null;
      }
    },
    retry: 1,
  });

  // Fetch real orders list - unified queryKey ['orders']
  const { data: rawOrders, isLoading: isOrdersLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      try {
        const res = await api.get('/orders');
        return res.data.orders || res.data || [];
      } catch {
        return [];
      }
    },
  });

  // Fetch real products catalog - unified queryKey ['products']
  const { data: rawProducts, isLoading: isProductsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      try {
        const res = await api.get('/products');
        return res.data.products || res.data || [];
      } catch {
        return [];
      }
    },
  });

  const orders: any[] = useMemo(() => {
    if (Array.isArray(rawOrders)) return rawOrders;
    if (rawOrders && Array.isArray((rawOrders as any).orders)) return (rawOrders as any).orders;
    return [];
  }, [rawOrders]);

  const products: any[] = useMemo(() => {
    if (Array.isArray(rawProducts)) return rawProducts;
    if (rawProducts && Array.isArray((rawProducts as any).products)) return (rawProducts as any).products;
    return [];
  }, [rawProducts]);

  // Compute 100% REAL genuine statistics from actual merchant orders
  const totalOrders = dashboardData?.stats?.total_orders ?? orders.length;

  const totalRevenue = useMemo(() => {
    if (dashboardData?.stats?.total_revenue !== undefined) {
      return dashboardData.stats.total_revenue;
    }
    return orders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  }, [dashboardData, orders]);

  const totalCustomers = useMemo(() => {
    if (dashboardData?.stats?.total_customers !== undefined) {
      return dashboardData.stats.total_customers;
    }
    const customerSet = new Set<string>();
    orders.forEach(o => {
      const c = o.customer_name || o.customer_phone || o.phone;
      if (c && c.trim()) customerSet.add(c.trim());
    });
    return customerSet.size;
  }, [dashboardData, orders]);

  const conversionRate = useMemo(() => {
    if (dashboardData?.stats?.conversion_rate !== undefined) {
      return dashboardData.stats.conversion_rate;
    }
    if (totalOrders === 0) return 0;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    return Number(((delivered / totalOrders) * 100).toFixed(2));
  }, [dashboardData, orders, totalOrders]);

  const revenueChange = dashboardData?.stats?.revenue_change ?? 0;
  const ordersChange = dashboardData?.stats?.orders_change ?? 0;
  const customersChange = dashboardData?.stats?.customers_change ?? 0;
  const conversionChange = dashboardData?.stats?.conversion_change ?? 0;

  const firstName = user?.name ? user.name.split(' ')[0] : (user?.business_name || 'Merchant');

  // Compute real 7-day trend series based on actual orders
  const last7DaysData = useMemo(() => {
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
        ymd,
        revenue: dayRev,
        orders: dayOrders.length
      });
    }

    if (dashboardData?.revenue_chart && dashboardData.revenue_chart.length > 0) {
      return dashboardData.revenue_chart.map((pt, idx) => ({
        date: pt.date || days[idx]?.date || '',
        ymd: days[idx]?.ymd || '',
        revenue: pt.revenue ?? 0,
        orders: pt.orders ?? days[idx]?.orders ?? 0
      }));
    }

    return days;
  }, [dashboardData, orders]);

  // Dynamic sparklines generated strictly from actual 7-day values
  const revenueSparkline = useMemo(() => {
    const revs = last7DaysData.map(d => d.revenue);
    return generateSparkline(revs);
  }, [last7DaysData]);

  const ordersSparkline = useMemo(() => {
    const ords = last7DaysData.map(d => d.orders);
    return generateSparkline(ords);
  }, [last7DaysData]);

  const customersSparkline = useMemo(() => {
    const custs = last7DaysData.map(d => Math.min(d.orders, totalCustomers));
    return generateSparkline(custs);
  }, [last7DaysData, totalCustomers]);

  const conversionSparkline = useMemo(() => {
    const convs = last7DaysData.map(d => (d.orders > 0 ? conversionRate : 0));
    return generateSparkline(convs);
  }, [last7DaysData, conversionRate]);

  // Compute real top selling products from actual catalog and order item frequencies
  const topProducts = useMemo(() => {
    if (dashboardData?.top_products && dashboardData.top_products.length > 0) {
      return dashboardData.top_products;
    }

    const salesMap: Record<string, number> = {};
    orders.forEach(o => {
      (o.items || []).forEach((it: any) => {
        const name = it?.name || it?.product_name || it?.title;
        const qty = Number(it?.quantity || it?.qty) || 1;
        if (name) {
          salesMap[name] = (salesMap[name] || 0) + qty;
        }
      });
    });

    if (products.length > 0) {
      return products
        .map(p => ({
          id: p.id,
          name: p.name,
          price: Number(p.price) || 0,
          sold_count: salesMap[p.name] || 0,
          image_url: p.images?.[0] || p.image_url || ''
        }))
        .sort((a, b) => b.sold_count - a.sold_count)
        .slice(0, 5);
    }

    return [];
  }, [dashboardData, orders, products]);

  // Real Order Status Breakdown
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
    if (totalOrders === 0) {
      return [{ name: 'No Orders', value: 1, percentage: 0, color: '#E2E8F0' }];
    }
    const slices = [
      { name: 'Delivered', value: statusCounts.delivered, percentage: Number(((statusCounts.delivered / totalOrders) * 100).toFixed(1)), color: '#10B981' },
      { name: 'Processing', value: statusCounts.processing, percentage: Number(((statusCounts.processing / totalOrders) * 100).toFixed(1)), color: '#0052FF' },
      { name: 'Shipped', value: statusCounts.shipped, percentage: Number(((statusCounts.shipped / totalOrders) * 100).toFixed(1)), color: '#F59E0B' },
      { name: 'Cancelled', value: statusCounts.cancelled, percentage: Number(((statusCounts.cancelled / totalOrders) * 100).toFixed(1)), color: '#EF4444' },
    ];
    return slices;
  }, [totalOrders, statusCounts]);

  // Real Recent Orders
  const recentOrders = useMemo(() => {
    if (dashboardData?.recent_orders && dashboardData.recent_orders.length > 0) {
      return dashboardData.recent_orders;
    }
    return orders.slice(0, 5).map(o => ({
      id: String(o.id || ''),
      customer_name: o.customer_name || o.customer_phone || 'Customer',
      total: Number(o.total) || 0,
      status: o.status || 'pending',
      created_at: o.created_at || ''
    }));
  }, [dashboardData, orders]);

  // Real AI Credits
  const aiCreditsBalance = user?.ai_credits_balance ?? 20;
  const aiCreditsLimit = user?.ai_credits_monthly_limit ?? (user?.plan === 'pro' ? 200 : user?.plan === 'business' ? 500 : 20);
  const aiCreditsUsed = user?.ai_credits_used_month ?? Math.max(0, aiCreditsLimit - aiCreditsBalance);
  const aiCreditsPercent = Math.min(100, Math.max(0, Math.round((aiCreditsUsed / Math.max(1, aiCreditsLimit)) * 100)));

  // Date range display text
  const dateRangeText = useMemo(() => {
    if (last7DaysData.length === 0) return 'Last 7 Days';
    const first = last7DaysData[0].date;
    const last = last7DaysData[last7DaysData.length - 1].date;
    return `${first} – ${last}, ${new Date().getFullYear()}`;
  }, [last7DaysData]);

  // Handle genuine CSV export
  const handleDownloadReport = () => {
    setDownloading(true);
    try {
      const csvRows = [
        ['FeraSetu Store Performance Report'],
        ['Generated At', new Date().toLocaleString()],
        ['Store Name', user?.business_name || user?.name || 'My Store'],
        ['Period', dateRangeText],
        [],
        ['Metric', 'Value', 'Trend vs Last 7 Days'],
        ['Total Revenue', `${config.symbol}${totalRevenue.toLocaleString()}`, `${revenueChange}%`],
        ['Total Orders', `${totalOrders}`, `${ordersChange}%`],
        ['Total Customers', `${totalCustomers}`, `${customersChange}%`],
        ['Conversion Rate', `${conversionRate}%`, `${conversionChange}%`],
        [],
        ['Daily Breakdown (Last 7 Days)', `Revenue (${config.currency})`, 'Orders'],
        ...last7DaysData.map(d => [d.date, d.revenue, d.orders]),
        [],
        ['Catalog Products', `Price (${config.currency})`, 'Units Sold'],
        ...topProducts.map(p => [p.name, p.price, p.sold_count]),
        [],
        ['Recent Orders', 'Customer', 'Amount (INR)', 'Status'],
        ...recentOrders.map(o => [`#${o.id}`, o.customer_name, o.total, o.status])
      ];

      const csvContent = csvRows.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `FeraSetu_Performance_Report_${new Date().toISOString().slice(0, 10)}.csv`);
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

  const handleShareStoreWhatsApp = () => {
    const storeUrl = user?.subdomain ? `https://${user.subdomain}.ferasetu.shop` : 'https://ferasetu.com';
    const text = encodeURIComponent(`Check out our online store catalog and place orders directly: ${storeUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const maxChartRevenue = useMemo(() => {
    const m = Math.max(...last7DaysData.map(d => d.revenue));
    return m > 0 ? Math.ceil(m * 1.2) : 1000;
  }, [last7DaysData]);

  const maxChartOrders = useMemo(() => {
    const m = Math.max(...last7DaysData.map(d => d.orders));
    return m > 0 ? Math.ceil(m * 1.2) : 10;
  }, [last7DaysData]);

  return (
    <div className="pb-10 max-w-[1380px] mx-auto space-y-6">
      
      {/* Active Trial (> 3 days remaining) */}
      {subscription.isTrialing && !subscription.isEndingSoon && (
        <div className="rounded-2xl bg-blue-600 border border-blue-700 p-4 sm:p-5 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-md shrink-0">
              <Sparkles size={20} className="text-orange-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 font-extrabold text-sm sm:text-base">
                <span>14-Day Free Trial: {subscription.trialDaysRemaining} {subscription.trialDaysRemaining === 1 ? 'day' : 'days'} remaining</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-orange-500 text-[10px] font-black uppercase tracking-wider text-white">
                  Active
                </span>
              </div>
              <p className="text-xs sm:text-sm text-blue-100 mt-0.5">
                You have full access to Business capabilities. Choose a plan to ensure continuous storefront operations.
              </p>
            </div>
          </div>
          <Link
            to="/upgrade"
            className="shrink-0 px-4 py-2 rounded-xl bg-white text-blue-700 font-bold text-xs shadow hover:bg-blue-50 transition-all"
          >
            View Plans
          </Link>
        </div>
      )}

      {/* Trial Ending Soon (<= 3 days remaining) */}
      {subscription.isTrialing && subscription.isEndingSoon && (
        <div className="rounded-2xl bg-orange-50 border-2 border-orange-500 p-4 sm:p-5 text-slate-900 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-100 text-orange-600 shrink-0">
              <AlertCircle size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 font-extrabold text-sm sm:text-base text-slate-900">
                <span>Free Trial Ending Soon: {subscription.trialDaysRemaining} {subscription.trialDaysRemaining === 1 ? 'day' : 'days'} remaining</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-orange-600 text-[10px] font-black uppercase tracking-wider text-white animate-pulse">
                  Ending Soon
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Upgrade now to ensure your storefront and ordering features continue without interruption.
              </p>
            </div>
          </div>
          <Link
            to="/upgrade"
            className="shrink-0 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow transition-all"
          >
            Upgrade Now
          </Link>
        </div>
      )}

      {/* Expired Trial Notification */}
      {subscription.isTrialExpired && (
        <div className="rounded-2xl bg-white border-2 border-orange-500 p-4 sm:p-5 text-slate-900 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-100 text-orange-600 shrink-0">
              <AlertCircle size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 font-extrabold text-sm sm:text-base text-slate-900">
                <span>Trial Expired</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-900 text-[10px] font-black uppercase tracking-wider text-white">
                  Action Required
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Your 14-day free trial has expired. Your catalog and data are safe. Upgrade to a paid plan to reactivate continuous storefront operations.
              </p>
            </div>
          </div>
          <Link
            to="/upgrade"
            className="shrink-0 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow hover:bg-blue-700 transition-all"
          >
            Select Plan to Reactivate
          </Link>
        </div>
      )}

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
            <span>{dateRangeText}</span>
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

      {/* Onboarding Checklist for setup and new stores */}
      <OnboardingProgress
        shopCreated={true}
        hasProducts={products.length > 0}
        hasOrders={orders.length > 0}
        storePublished={!!user?.subdomain}
      />

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
                {config.symbol}{totalRevenue.toLocaleString(config.market === 'IN' ? 'en-IN' : 'en-US')}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
            <TrendingUp size={13} />
            <span>{revenueChange >= 0 ? `↗ +${revenueChange}%` : `↘ ${revenueChange}%`}</span>
            <span className="text-slate-400 font-medium text-[11px]">vs last 7 days</span>
          </div>
          <div className="h-9 mt-2.5 relative">
            <svg viewBox="0 0 120 28" className="w-full h-full stroke-emerald-500 fill-transparent overflow-visible" preserveAspectRatio="none">
              <path d={revenueSparkline.path} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx={revenueSparkline.endX} cy={revenueSparkline.endY} r="3.5" className="fill-emerald-500" />
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
            <span>{ordersChange >= 0 ? `↗ +${ordersChange}%` : `↘ ${ordersChange}%`}</span>
            <span className="text-slate-400 font-medium text-[11px]">vs last 7 days</span>
          </div>
          <div className="h-9 mt-2.5 relative">
            <svg viewBox="0 0 120 28" className="w-full h-full stroke-purple-500 fill-transparent overflow-visible" preserveAspectRatio="none">
              <path d={ordersSparkline.path} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx={ordersSparkline.endX} cy={ordersSparkline.endY} r="3.5" className="fill-purple-500" />
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
            <span>{customersChange >= 0 ? `↗ +${customersChange}%` : `↘ ${customersChange}%`}</span>
            <span className="text-slate-400 font-medium text-[11px]">vs last 7 days</span>
          </div>
          <div className="h-9 mt-2.5 relative">
            <svg viewBox="0 0 120 28" className="w-full h-full stroke-[#0052FF] fill-transparent overflow-visible" preserveAspectRatio="none">
              <path d={customersSparkline.path} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx={customersSparkline.endX} cy={customersSparkline.endY} r="3.5" className="fill-[#0052FF]" />
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
            <span>{conversionChange >= 0 ? `↗ +${conversionChange}%` : `↘ ${conversionChange}%`}</span>
            <span className="text-slate-400 font-medium text-[11px]">vs last 7 days</span>
          </div>
          <div className="h-9 mt-2.5 relative">
            <svg viewBox="0 0 120 28" className="w-full h-full stroke-orange-500 fill-transparent overflow-visible" preserveAspectRatio="none">
              <path d={conversionSparkline.path} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx={conversionSparkline.endX} cy={conversionSparkline.endY} r="3.5" className="fill-orange-500" />
            </svg>
          </div>
        </div>
      </div>

      {/* Middle Row: Sales Overview, Top Selling Products, Order Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Sales Overview (col-span-6) */}
        <div className="lg:col-span-6 bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between min-h-[340px]">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
            <h2 className="text-base font-bold text-slate-900">Sales Overview</h2>
            <div className="flex items-center gap-3.5 text-xs font-bold text-slate-500">
              <span className="flex items-center gap-1.5 text-[#0052FF]">
                <span className="w-2.5 h-0.5 rounded-full bg-[#0052FF]"></span> Revenue ({config.symbol})
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
              <AreaChart data={last7DaysData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  domain={[0, maxChartRevenue]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  tickFormatter={(val) => val >= 1000 ? `${config.symbol}${Math.round(val / 1000)}K` : `${config.symbol}${val}`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, maxChartOrders]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  formatter={(value: any, name: any) => [
                    name === 'revenue' ? `${config.symbol}${Number(value).toLocaleString()}` : value,
                    name === 'revenue' ? 'Revenue' : 'Orders'
                  ]}
                />
                <Area
                  isAnimationActive={false}
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
                  isAnimationActive={false}
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
        <div className="lg:col-span-3 bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between min-h-[340px]">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-bold text-slate-900">Top Selling Products</h2>
            <Link to="/products" className="text-xs font-bold text-[#0052FF] hover:underline">View All</Link>
          </div>
          
          {topProducts.length > 0 ? (
            <div className="flex flex-col gap-3 my-auto">
              {topProducts.map((prod) => (
                <div key={prod.id} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                    {prod.image_url ? (
                      <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package size={18} className="text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{prod.name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-slate-900">{config.symbol}{prod.price.toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-emerald-600">
                      {prod.sold_count} sold
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6 px-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0052FF] mb-2 shadow-sm">
                <Package size={20} />
              </div>
              <p className="text-xs font-bold text-slate-800 mb-0.5">No products added yet</p>
              <p className="text-[11px] text-slate-400 font-medium mb-3 max-w-[180px]">
                Add your items to start receiving customer orders.
              </p>
              <Link
                to="/products"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0052FF] hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
              >
                <Plus size={13} />
                <span>Add Product</span>
              </Link>
            </div>
          )}
        </div>

        {/* Order Status Donut (col-span-3) */}
        <div className="lg:col-span-3 bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between min-h-[340px]">
          <h2 className="text-base font-bold text-slate-900 mb-1">Order Status</h2>
          
          <div className="h-40 relative flex items-center justify-center my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  isAnimationActive={false}
                  data={donutData}
                  innerRadius={50}
                  outerRadius={68}
                  paddingAngle={totalOrders > 0 ? 3 : 0}
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
              <span className="text-2xl font-black text-slate-900">{totalOrders}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Orders</span>
            </div>
          </div>

          <div className="mt-2 flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2 font-semibold text-slate-600">
                <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                Delivered
              </div>
              <div className="font-bold text-slate-900">
                {statusCounts.delivered} <span className="text-slate-400 font-normal">({totalOrders > 0 ? Math.round((statusCounts.delivered / totalOrders) * 100) : 0}%)</span>
              </div>
            </div>
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2 font-semibold text-slate-600">
                <span className="w-2 h-2 rounded-full bg-[#0052FF]"></span>
                Processing
              </div>
              <div className="font-bold text-slate-900">
                {statusCounts.processing} <span className="text-slate-400 font-normal">({totalOrders > 0 ? Math.round((statusCounts.processing / totalOrders) * 100) : 0}%)</span>
              </div>
            </div>
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2 font-semibold text-slate-600">
                <span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span>
                Shipped
              </div>
              <div className="font-bold text-slate-900">
                {statusCounts.shipped} <span className="text-slate-400 font-normal">({totalOrders > 0 ? Math.round((statusCounts.shipped / totalOrders) * 100) : 0}%)</span>
              </div>
            </div>
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2 font-semibold text-slate-600">
                <span className="w-2 h-2 rounded-full bg-[#EF4444]"></span>
                Cancelled
              </div>
              <div className="font-bold text-slate-900">
                {statusCounts.cancelled} <span className="text-slate-400 font-normal">({totalOrders > 0 ? Math.round((statusCounts.cancelled / totalOrders) * 100) : 0}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Orders, FeraSetu AI, AI Credits */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Recent Orders (col-span-5) */}
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between min-h-[330px]">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-bold text-slate-900">Recent Orders</h2>
            <Link to="/orders" className="text-xs font-bold text-[#0052FF] hover:underline">View All</Link>
          </div>
          
          {recentOrders.length > 0 ? (
            <div className="flex flex-col gap-2 my-auto">
              {recentOrders.map((order) => {
                const statusBadge = 
                  order.status === 'delivered' ? { bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'Delivered' } :
                  order.status === 'shipped' ? { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Shipped' } :
                  order.status === 'processing' ? { bg: 'bg-amber-50', text: 'text-amber-600', label: 'Processing' } :
                  { bg: 'bg-red-50', text: 'text-red-600', label: order.status || 'Pending' };

                return (
                  <div key={order.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                        <Package size={15} />
                      </div>
                      <p className="text-xs font-bold text-slate-900">#{order.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <div className="text-xs font-semibold text-slate-600 truncate max-w-[110px]">
                      {order.customer_name}
                    </div>
                    <div className="text-xs font-bold text-slate-900">
                      {config.symbol}{order.total.toLocaleString()}
                    </div>
                    <div>
                      <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold capitalize ${statusBadge.bg} ${statusBadge.text}`}>
                        {statusBadge.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6 px-4">
              <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-2 shadow-sm">
                <ShoppingCart size={20} />
              </div>
              <p className="text-xs font-bold text-slate-800 mb-0.5">No orders received yet</p>
              <p className="text-[11px] text-slate-400 font-medium mb-3 max-w-[210px]">
                Share your store link on WhatsApp to start receiving orders.
              </p>
              <button
                onClick={handleShareStoreWhatsApp}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                <Share2 size={13} />
                <span>Share Store Link</span>
              </button>
            </div>
          )}
        </div>

        {/* FeraSetu AI (col-span-4) */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between min-h-[330px]">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-bold text-slate-900">FeraSetu AI</h2>
            <Link
              to="/ferasetu-ai"
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
                to={`/ferasetu-ai?q=${encodeURIComponent(q)}`}
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
        <div className="lg:col-span-3 bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between min-h-[330px]">
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
              <p className="text-lg font-black text-slate-900 leading-tight">{aiCreditsBalance} Credits</p>
              <p className="text-[10px] font-semibold text-slate-400">Valid till: {new Date(Date.now() + 30 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1.5">
              <span>Used: {aiCreditsUsed} Credits</span>
              <span className="text-slate-900">Total: {aiCreditsLimit} Credits</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-[#0052FF] h-full rounded-full transition-all" style={{ width: `${aiCreditsPercent}%` }}></div>
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
        <p>© {new Date().getFullYear()} FeraSetu. All rights reserved.</p>
        <p>Made with ❤️ in India 🇮🇳</p>
      </div>

    </div>
  );
}
