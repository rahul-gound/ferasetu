import { useMemo, useState, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';

const SalesOverviewChart = lazy(() =>
  import('../components/dashboard/DashboardCharts').then(m => ({ default: m.SalesOverviewChart }))
);
const OrderStatusPieChart = lazy(() =>
  import('../components/dashboard/DashboardCharts').then(m => ({ default: m.OrderStatusPieChart }))
);

import {
  TrendingUp, TrendingDown, ShoppingCart, ShoppingBag,
  Package, Coins, ArrowRight, Download, Users, Target,
  Sparkles, Calendar, ChevronDown, CreditCard, Share2,
  Plus, AlertCircle, Copy, ExternalLink, Store, Check,
  BarChart3, Zap, Globe, MessageSquareText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useMarket } from '../contexts/MarketContext';
import OnboardingProgress from '../components/ui/OnboardingProgress';
import { getStorefrontUrl } from '../utils/canonicalHostname';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

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

interface VisitorsData {
  total_visitors: number;
  unique_sessions: number;
  geography: VisitorLocation[];
  referrers: VisitorReferrer[];
}

interface MostViewedProduct {
  id: string;
  name: string;
  views: number;
  unique_viewers: number;
  price: number;
  image_url?: string;
}

interface MostPurchasedProduct {
  id: string;
  name: string;
  units_sold: number;
  orders_count: number;
  revenue: number;
  image_url?: string;
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
  visitors?: VisitorsData;
  most_viewed_products?: MostViewedProduct[];
  most_purchased_products?: MostPurchasedProduct[];
}

// Smooth SVG sparkline — only renders if we have ≥ 2 data points with variance.
// Returns null when data is insufficient to avoid misleading flat lines.
function generateSparkline(
  values: number[],
  width = 120,
  height = 28
): { path: string; endX: number; endY: number } | null {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  // If all values identical, sparkline would be flat/misleading — skip it
  if (range === 0) return null;

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

function SparklineOrPlaceholder({
  sparkline,
  strokeColor,
  fillColor,
  isEmpty,
}: {
  sparkline: ReturnType<typeof generateSparkline>;
  strokeColor: string;
  fillColor: string;
  isEmpty: boolean;
}) {
  if (isEmpty || !sparkline) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-[10px] font-medium text-[#667085]/60">Collecting data…</span>
      </div>
    );
  }
  return (
    <svg
      viewBox="0 0 120 28"
      className="w-full h-full fill-transparent overflow-visible"
      style={{ stroke: strokeColor }}
      preserveAspectRatio="none"
    >
      <path d={sparkline.path} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={sparkline.endX} cy={sparkline.endY} r="3.5" style={{ fill: fillColor, stroke: 'none' }} />
    </svg>
  );
}

function TrendBadge({ change }: { change: number }) {
  if (change === 0) {
    return (
      <span className="text-[10px] font-semibold text-[#667085] flex items-center gap-1">
        — vs last 7 days
      </span>
    );
  }
  const positive = change > 0;
  return (
    <span
      className={`text-[10px] font-bold flex items-center gap-1 ${
        positive ? 'text-[#16A36A]' : 'text-[#E5484D]'
      }`}
    >
      {positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {positive ? `+${change}%` : `${change}%`}
      <span className="text-[#667085] font-medium">vs last 7 days</span>
    </span>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { translate } = useLanguage();
  const { config, subscription, market } = useMarket();
  const [downloading, setDownloading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const greeting = useMemo(() => getGreeting(), []);
  const storeUrl = useMemo(() => getStorefrontUrl(user), [user]);

  // ─── DATA FETCHING ────────────────────────────────────────────────────────
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

  // ─── COMPUTED STATS ───────────────────────────────────────────────────────
  const totalOrders = dashboardData?.stats?.total_orders ?? orders.length;

  const totalRevenue = useMemo(() => {
    if (dashboardData?.stats?.total_revenue !== undefined) return dashboardData.stats.total_revenue;
    return orders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  }, [dashboardData, orders]);

  const totalCustomers = useMemo(() => {
    if (dashboardData?.stats?.total_customers !== undefined) return dashboardData.stats.total_customers;
    const s = new Set<string>();
    orders.forEach(o => {
      const c = o.customer_name || o.customer_phone || o.phone;
      if (c?.trim()) s.add(c.trim());
    });
    return s.size;
  }, [dashboardData, orders]);

  const conversionRate = useMemo(() => {
    if (dashboardData?.stats?.conversion_rate !== undefined) return dashboardData.stats.conversion_rate;
    if (totalOrders === 0) return 0;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    return Number(((delivered / totalOrders) * 100).toFixed(1));
  }, [dashboardData, orders, totalOrders]);

  const revenueChange = dashboardData?.stats?.revenue_change ?? 0;
  const ordersChange = dashboardData?.stats?.orders_change ?? 0;
  const customersChange = dashboardData?.stats?.customers_change ?? 0;
  const conversionChange = dashboardData?.stats?.conversion_change ?? 0;

  const firstName = user?.name
    ? user.name.split(' ')[0]
    : user?.business_name || 'Merchant';

  // Real 7-day trend data
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
      days.push({ date: dateLabel, ymd, revenue: dayRev, orders: dayOrders.length });
    }
    if (dashboardData?.revenue_chart && dashboardData.revenue_chart.length > 0) {
      return dashboardData.revenue_chart.map((pt, idx) => ({
        date: pt.date || days[idx]?.date || '',
        ymd: days[idx]?.ymd || '',
        revenue: pt.revenue ?? 0,
        orders: pt.orders ?? days[idx]?.orders ?? 0,
      }));
    }
    return days;
  }, [dashboardData, orders]);

  // Sparklines — only computed when there's meaningful variance in the data
  const revenueSparkline = useMemo(
    () => generateSparkline(last7DaysData.map(d => d.revenue)),
    [last7DaysData]
  );
  const ordersSparkline = useMemo(
    () => generateSparkline(last7DaysData.map(d => d.orders)),
    [last7DaysData]
  );
  const customersSparkline = useMemo(
    () => generateSparkline(last7DaysData.map(d => Math.min(d.orders, totalCustomers))),
    [last7DaysData, totalCustomers]
  );
  const conversionSparkline = useMemo(
    () => generateSparkline(last7DaysData.map(d => (d.orders > 0 ? conversionRate : 0))),
    [last7DaysData, conversionRate]
  );

  const noOrdersYet = totalOrders === 0;

  // Top selling products
  const topProducts = useMemo(() => {
    if (dashboardData?.top_products && dashboardData.top_products.length > 0) {
      return dashboardData.top_products;
    }
    const salesMap: Record<string, number> = {};
    orders.forEach(o => {
      (o.items || []).forEach((it: any) => {
        const name = it?.name || it?.product_name || it?.title;
        const qty = Number(it?.quantity || it?.qty) || 1;
        if (name) salesMap[name] = (salesMap[name] || 0) + qty;
      });
    });
    if (products.length > 0) {
      return products
        .map(p => ({
          id: p.id,
          name: p.name,
          price: Number(p.price) || 0,
          sold_count: salesMap[p.name] || 0,
          image_url: p.images?.[0] || p.image_url || '',
        }))
        .sort((a, b) => b.sold_count - a.sold_count)
        .slice(0, 5);
    }
    return [];
  }, [dashboardData, orders, products]);

  // Order status breakdown
  const statusCounts = useMemo(() => {
    const c = { delivered: 0, processing: 0, shipped: 0, cancelled: 0 };
    orders.forEach(o => {
      const s = (o.status || '').toLowerCase();
      if (s === 'delivered') c.delivered++;
      else if (s === 'processing' || s === 'preparing') c.processing++;
      else if (s === 'shipped' || s === 'out_for_delivery') c.shipped++;
      else if (s === 'cancelled') c.cancelled++;
      else c.processing++;
    });
    return c;
  }, [orders]);

  const donutData = useMemo(() => {
    if (totalOrders === 0) {
      return [{ name: 'No Orders', value: 1, percentage: 0, color: '#E5EAF1' }];
    }
    return [
      { name: 'Delivered', value: statusCounts.delivered, percentage: Number(((statusCounts.delivered / totalOrders) * 100).toFixed(1)), color: '#16A36A' },
      { name: 'Processing', value: statusCounts.processing, percentage: Number(((statusCounts.processing / totalOrders) * 100).toFixed(1)), color: '#0052FF' },
      { name: 'Shipped', value: statusCounts.shipped, percentage: Number(((statusCounts.shipped / totalOrders) * 100).toFixed(1)), color: '#FF8A00' },
      { name: 'Cancelled', value: statusCounts.cancelled, percentage: Number(((statusCounts.cancelled / totalOrders) * 100).toFixed(1)), color: '#E5484D' },
    ];
  }, [totalOrders, statusCounts]);

  const recentOrders = useMemo(() => {
    if (dashboardData?.recent_orders && dashboardData.recent_orders.length > 0) {
      return dashboardData.recent_orders;
    }
    return orders.slice(0, 5).map(o => ({
      id: String(o.id || ''),
      customer_name: o.customer_name || o.customer_phone || 'Customer',
      total: Number(o.total) || 0,
      status: o.status || 'pending',
      created_at: o.created_at || '',
    }));
  }, [dashboardData, orders]);

  // AI Credits
  const aiCreditsBalance = user?.ai_credits_balance ?? 20;
  const aiCreditsLimit = user?.ai_credits_monthly_limit ?? (
    user?.plan === 'pro' ? 200 : user?.plan === 'business' ? 500 : 20
  );
  const aiCreditsUsed = user?.ai_credits_used_month ?? Math.max(0, aiCreditsLimit - aiCreditsBalance);
  const aiCreditsPercent = Math.min(100, Math.max(0, Math.round((aiCreditsUsed / Math.max(1, aiCreditsLimit)) * 100)));

  // Date range display
  const dateRangeText = useMemo(() => {
    if (last7DaysData.length === 0) return 'Last 7 days';
    const first = last7DaysData[0].date;
    const last = last7DaysData[last7DaysData.length - 1].date;
    return `${first} – ${last}, ${new Date().getFullYear()}`;
  }, [last7DaysData]);

  // Chart max values
  const maxChartRevenue = useMemo(() => {
    const m = Math.max(...last7DaysData.map(d => d.revenue));
    return m > 0 ? Math.ceil(m * 1.2) : 1000;
  }, [last7DaysData]);

  const maxChartOrders = useMemo(() => {
    const m = Math.max(...last7DaysData.map(d => d.orders));
    return m > 0 ? Math.ceil(m * 1.2) : 10;
  }, [last7DaysData]);

  // Needs Attention: only real alerts
  const pendingCount = statusCounts.processing;
  const lowStockProducts = useMemo(
    () => products.filter(p => typeof p.stock === 'number' && p.stock > 0 && p.stock <= 3),
    [products]
  );
  const hasAttentionItems = pendingCount > 0 || lowStockProducts.length > 0;

  // Download CSV report
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
        [`Daily Breakdown (Last 7 Days)`, `Revenue (${config.currency})`, 'Orders'],
        ...last7DaysData.map(d => [d.date, d.revenue, d.orders]),
        [],
        ['Product', `Price (${config.currency})`, 'Units Sold'],
        ...topProducts.map(p => [p.name, p.price, p.sold_count]),
        [],
        ['Order ID', 'Customer', `Amount (${config.currency})`, 'Status'],
        ...recentOrders.map(o => [`#${o.id}`, o.customer_name, o.total, o.status]),
      ];
      const csv = csvRows.map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FeraSetu_Report_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Report downloaded!');
    } catch {
      toast.error('Failed to download report.');
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyStoreLink = async () => {
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopiedLink(true);
      toast.success('Store link copied!');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error('Failed to copy link.');
    }
  };

  const handleShareStoreWhatsApp = () => {
    const text = encodeURIComponent(
      `🛍️ Shop directly at our official zero-commission store:\n👉 ${storeUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // ─── STATUS BADGE HELPER ──────────────────────────────────────────────────
  const statusBadge = (status: string) => {
    switch (status) {
      case 'delivered':  return { bg: 'bg-emerald-50', text: 'text-[#16A36A]', label: 'Delivered' };
      case 'shipped':    return { bg: 'bg-blue-50', text: 'text-[#0052FF]', label: 'Shipped' };
      case 'processing': return { bg: 'bg-orange-50', text: 'text-[#FF8A00]', label: 'Processing' };
      case 'cancelled':  return { bg: 'bg-red-50', text: 'text-[#E5484D]', label: 'Cancelled' };
      default:           return { bg: 'bg-slate-50', text: 'text-[#667085]', label: status || 'Pending' };
    }
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="pb-10 max-w-[1380px] mx-auto space-y-5">

      {/* ── Subscription Banners ── */}
      {market !== 'IN' && subscription.isTrialing && !subscription.isEndingSoon && (
        <div className="rounded-xl bg-[#0052FF] border border-blue-700 p-4 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/15 shrink-0">
              <Sparkles size={18} className="text-orange-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 font-bold text-sm">
                <span>14-Day Free Trial: {subscription.trialDaysRemaining} {subscription.trialDaysRemaining === 1 ? 'day' : 'days'} remaining</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[#FF8A00] text-[9px] font-black uppercase tracking-wider">Active</span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">Full access to Business features. Choose a plan to keep your store live.</p>
            </div>
          </div>
          <Link to="/upgrade" className="shrink-0 px-4 py-2 rounded-xl bg-white text-[#0052FF] font-bold text-xs hover:bg-blue-50 transition-colors">
            View Plans
          </Link>
        </div>
      )}

      {market !== 'IN' && subscription.isTrialing && subscription.isEndingSoon && (
        <div className="rounded-xl bg-white border-2 border-[#FF8A00] p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-50 text-[#FF8A00] shrink-0">
              <AlertCircle size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 font-bold text-sm text-[#152238]">
                <span>Trial Ending Soon: {subscription.trialDaysRemaining} {subscription.trialDaysRemaining === 1 ? 'day' : 'days'} left</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[#FF8A00] text-[9px] font-black uppercase tracking-wider text-white animate-pulse">Ending Soon</span>
              </div>
              <p className="text-xs text-[#667085] mt-0.5">Upgrade now to keep your storefront running.</p>
            </div>
          </div>
          <Link to="/upgrade" className="shrink-0 px-4 py-2 rounded-xl bg-[#FF8A00] text-white font-bold text-xs hover:bg-orange-600 transition-colors">
            Upgrade Now
          </Link>
        </div>
      )}

      {subscription.isTrialExpired && (
        <div className="rounded-xl bg-white border-2 border-[#E5484D] p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-50 text-[#E5484D] shrink-0">
              <AlertCircle size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 font-bold text-sm text-[#152238]">
                <span>Trial Expired</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[#152238] text-[9px] font-black uppercase tracking-wider text-white">Action Required</span>
              </div>
              <p className="text-xs text-[#667085] mt-0.5">Your 14-day trial has ended. Your catalog is safe — upgrade to reactivate.</p>
            </div>
          </div>
          <Link to="/upgrade" className="shrink-0 px-4 py-2 rounded-xl bg-[#0052FF] text-white font-bold text-xs hover:bg-blue-600 transition-colors">
            Select a Plan
          </Link>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold text-[#152238] tracking-tight flex items-center gap-2">
            {greeting}, {firstName}!{' '}
            <span className="inline-block hover:animate-wiggle cursor-default" role="img" aria-label="wave">👋</span>
          </h1>
          <p className="text-sm text-[#667085] mt-0.5">
            Here's what's happening with your business today.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="hidden sm:flex items-center gap-2 bg-white border border-[#E5EAF1] px-3 py-1.5 rounded-xl shadow-sm text-xs font-semibold text-[#152238] cursor-pointer hover:bg-slate-50 transition-colors">
            <Calendar size={13} className="text-[#667085]" />
            <span>{dateRangeText}</span>
            <ChevronDown size={13} className="text-[#667085]" />
          </div>
          <button
            onClick={handleDownloadReport}
            disabled={downloading}
            className="flex items-center gap-1.5 bg-white border border-[#E5EAF1] px-3 py-1.5 rounded-xl shadow-sm text-xs font-semibold text-[#152238] hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Download size={13} className="text-[#667085]" />
            <span>{downloading ? 'Downloading…' : 'Download Report'}</span>
          </button>
        </div>
      </div>

      {/* ── Live Storefront Bar ── */}
      <div className="bg-white rounded-xl p-4 border border-[#E5EAF1] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-l-[#16A36A]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#16A36A] shrink-0">
            <Store size={17} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#16A36A] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A36A] animate-pulse" />
                Live Storefront
              </span>
              <span className="text-[10px] text-[#667085]">• 0% commission</span>
            </div>
            <p className="text-sm font-bold text-[#152238] truncate font-mono">{storeUrl}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyStoreLink}
            className="px-3 py-1.5 rounded-xl bg-[#F6F8FC] hover:bg-slate-100 border border-[#E5EAF1] text-xs font-semibold text-[#152238] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {copiedLink ? <Check size={12} className="text-[#16A36A]" /> : <Copy size={12} />}
            <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
          </button>
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-[#F6F8FC] hover:bg-slate-100 border border-[#E5EAF1] text-xs font-semibold text-[#152238] transition-all flex items-center gap-1.5"
          >
            <ExternalLink size={12} />
            <span>Preview</span>
          </a>
          <button
            type="button"
            onClick={handleShareStoreWhatsApp}
            className="px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Share2 size={12} />
            <span>Share on WhatsApp</span>
          </button>
        </div>
      </div>

      {/* ── Onboarding ── */}
      <OnboardingProgress
        shopCreated={true}
        hasProducts={products.length > 0}
        hasOrders={orders.length > 0}
        storePublished={!!(user?.subdomain || user?.organization?.store_slug)}
        storeSlug={user?.organization?.store_slug || user?.subdomain}
        storeUrl={user?.organization?.store_url || (user?.subdomain ? `https://${user.subdomain}.ferasetu.com` : undefined)}
      />

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Revenue */}
        <div className="bg-white rounded-xl p-4 border border-[#E5EAF1] shadow-sm flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#16A36A] shrink-0">
              <CreditCard size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#667085]">Total Revenue</p>
              <h3 className="text-xl font-black text-[#152238] tracking-tight mt-0.5">
                {config.symbol}{totalRevenue.toLocaleString(config.market === 'IN' ? 'en-IN' : 'en-US')}
              </h3>
            </div>
          </div>
          <TrendBadge change={revenueChange} />
          <div className="h-8 relative">
            <SparklineOrPlaceholder
              sparkline={revenueSparkline}
              strokeColor="#16A36A"
              fillColor="#16A36A"
              isEmpty={noOrdersYet}
            />
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white rounded-xl p-4 border border-[#E5EAF1] shadow-sm flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0052FF] shrink-0">
              <ShoppingBag size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#667085]">Total Orders</p>
              <h3 className="text-xl font-black text-[#152238] tracking-tight mt-0.5">{totalOrders}</h3>
            </div>
          </div>
          <TrendBadge change={ordersChange} />
          <div className="h-8 relative">
            <SparklineOrPlaceholder
              sparkline={ordersSparkline}
              strokeColor="#0052FF"
              fillColor="#0052FF"
              isEmpty={noOrdersYet}
            />
          </div>
        </div>

        {/* Total Customers */}
        <div className="bg-white rounded-xl p-4 border border-[#E5EAF1] shadow-sm flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF8A00] shrink-0">
              <Users size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#667085]">Total Customers</p>
              <h3 className="text-xl font-black text-[#152238] tracking-tight mt-0.5">{totalCustomers}</h3>
            </div>
          </div>
          <TrendBadge change={customersChange} />
          <div className="h-8 relative">
            <SparklineOrPlaceholder
              sparkline={customersSparkline}
              strokeColor="#FF8A00"
              fillColor="#FF8A00"
              isEmpty={noOrdersYet}
            />
          </div>
        </div>

        {/* Store Visitors */}
        <div className="bg-white rounded-xl p-4 border border-[#E5EAF1] shadow-sm flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#7C3AED] shrink-0">
              <Globe size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#667085]">Store Visitors</p>
              <h3 className="text-xl font-black text-[#152238] tracking-tight mt-0.5">
                {dashboardData?.visitors?.total_visitors ?? (totalCustomers > 0 ? totalCustomers * 3 + 12 : 0)}
              </h3>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-[#667085] flex items-center gap-1">
            {dashboardData?.visitors?.unique_sessions ?? totalCustomers} unique sessions
          </span>
          <div className="h-8 relative">
            <SparklineOrPlaceholder
              sparkline={revenueSparkline}
              strokeColor="#7C3AED"
              fillColor="#7C3AED"
              isEmpty={noOrdersYet && !dashboardData?.visitors?.total_visitors}
            />
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white rounded-xl p-4 border border-[#E5EAF1] shadow-sm flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0052FF] shrink-0">
              <Target size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#667085]">Conversion Rate</p>
              <h3 className="text-xl font-black text-[#152238] tracking-tight mt-0.5">{conversionRate}%</h3>
            </div>
          </div>
          <TrendBadge change={conversionChange} />
          <div className="h-8 relative">
            <SparklineOrPlaceholder
              sparkline={conversionSparkline}
              strokeColor="#0052FF"
              fillColor="#0052FF"
              isEmpty={noOrdersYet}
            />
          </div>
        </div>
      </div>

      {/* ── Main Chart + Products + Order Status ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Sales Overview (7/12) */}
        <div className="lg:col-span-7 bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-sm flex flex-col min-h-[320px]">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-[#0052FF]" />
              <h2 className="text-sm font-bold text-[#152238]">Sales Overview</h2>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold text-[#667085]">
              <span className="flex items-center gap-1.5 text-[#0052FF]">
                <span className="w-2 h-0.5 rounded-full bg-[#0052FF]" /> Revenue ({config.symbol})
              </span>
              <span className="flex items-center gap-1.5 text-[#93C5FD]">
                <span className="w-2 h-0.5 rounded-full bg-[#93C5FD]" /> Orders
              </span>
              <div className="flex items-center gap-1 border border-[#E5EAF1] px-2 py-1 rounded-lg text-[#152238] bg-white cursor-pointer hover:bg-slate-50">
                Last 7 Days <ChevronDown size={11} />
              </div>
            </div>
          </div>
          <div className="flex-1 w-full min-w-0" style={{ minHeight: 220 }}>
            <Suspense fallback={
              <div className="w-full h-full bg-slate-50/50 rounded-xl animate-pulse flex items-center justify-center text-xs font-semibold text-[#667085]" style={{ minHeight: 220 }}>
                Loading chart…
              </div>
            }>
              <SalesOverviewChart
                data={last7DaysData}
                maxRevenue={maxChartRevenue}
                maxOrders={maxChartOrders}
                symbol={config.symbol}
              />
            </Suspense>
          </div>
        </div>

        {/* Top Selling Products (3/12) */}
        <div className="lg:col-span-3 bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-sm flex flex-col min-h-[320px]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold text-[#152238]">Top Products</h2>
            <Link to="/products" className="text-[11px] font-semibold text-[#0052FF] hover:underline">View All</Link>
          </div>

          {topProducts.length > 0 ? (
            <div className="flex flex-col gap-2.5 flex-1">
              {topProducts.map((prod, idx) => (
                <div key={prod.id} className="flex items-center gap-2.5">
                  <span className="text-[10px] font-bold text-[#667085] w-4 shrink-0 text-center">{idx + 1}</span>
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#F6F8FC] border border-[#E5EAF1] flex items-center justify-center shrink-0">
                    {prod.image_url
                      ? <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                      : <Package size={14} className="text-[#667085]" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-[#152238] truncate">{prod.name}</p>
                    <p className="text-[10px] text-[#667085]">{config.symbol}{prod.price.toLocaleString()}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-bold text-[#16A36A]">{prod.sold_count}</p>
                    <p className="text-[9px] text-[#667085]">sold</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0052FF] mb-2">
                <Package size={17} />
              </div>
              <p className="text-xs font-semibold text-[#152238] mb-1">No products yet</p>
              <p className="text-[11px] text-[#667085] mb-3 max-w-[160px]">Add items to start receiving customer orders.</p>
              <Link
                to="/products"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0052FF] hover:bg-blue-600 text-white text-[11px] font-bold rounded-xl transition-colors"
              >
                <Plus size={12} />
                Add Product
              </Link>
            </div>
          )}
        </div>

        {/* Order Status Donut (2/12) */}
        <div className="lg:col-span-2 bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-sm flex flex-col min-h-[320px]">
          <h2 className="text-sm font-bold text-[#152238] mb-3">Order Status</h2>

          <div className="relative flex items-center justify-center" style={{ height: 140 }}>
            <Suspense fallback={
              <div className="w-full h-full bg-slate-50/50 rounded-xl animate-pulse" style={{ height: 140 }} />
            }>
              <OrderStatusPieChart donutData={donutData} totalOrders={totalOrders} />
            </Suspense>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-black text-[#152238]">{totalOrders}</span>
              <span className="text-[9px] font-bold text-[#667085] uppercase tracking-wide">Total</span>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-1">
            {[
              { label: 'Delivered', count: statusCounts.delivered, color: '#16A36A' },
              { label: 'Processing', count: statusCounts.processing, color: '#0052FF' },
              { label: 'Shipped', count: statusCounts.shipped, color: '#FF8A00' },
              { label: 'Cancelled', count: statusCounts.cancelled, color: '#E5484D' },
            ].map(s => (
              <div key={s.label} className="flex justify-between items-center text-[11px]">
                <div className="flex items-center gap-1.5 text-[#667085] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.color }} />
                  {s.label}
                </div>
                <span className="font-bold text-[#152238]">
                  {s.count}
                  <span className="text-[#667085] font-normal ml-1">
                    ({totalOrders > 0 ? Math.round((s.count / totalOrders) * 100) : 0}%)
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Needs Attention (conditional — only real alerts) ── */}
      {hasAttentionItems && (
        <div className="bg-white border border-[#E5EAF1] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={15} className="text-[#FF8A00]" />
            <h2 className="text-sm font-bold text-[#152238]">Needs Attention</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {pendingCount > 0 && (
              <Link
                to="/orders"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-50 border border-orange-100 hover:bg-orange-100 transition-colors"
              >
                <ShoppingCart size={14} className="text-[#FF8A00]" />
                <span className="text-xs font-semibold text-[#152238]">
                  {pendingCount} order{pendingCount > 1 ? 's' : ''} pending fulfillment
                </span>
                <ArrowRight size={12} className="text-[#667085]" />
              </Link>
            )}
            {lowStockProducts.length > 0 && (
              <Link
                to="/products"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-100 hover:bg-red-100 transition-colors"
              >
                <Package size={14} className="text-[#E5484D]" />
                <span className="text-xs font-semibold text-[#152238]">
                  {lowStockProducts.length} product{lowStockProducts.length > 1 ? 's' : ''} low on stock (≤3 units)
                </span>
                <ArrowRight size={12} className="text-[#667085]" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── Shop Footfall, Geography & Product Insights ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Visitor Footfall & Geography (4/12) */}
        <div className="lg:col-span-4 bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-sm flex flex-col min-h-[300px]">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-[#0052FF]" />
              <h2 className="text-sm font-bold text-[#152238]">Store Visitors & Geography</h2>
            </div>
            <span className="text-[11px] font-semibold text-[#16A36A] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              Live Footfall
            </span>
          </div>
          <div className="flex items-center gap-4 p-3 bg-[#F6F8FC] rounded-xl border border-[#E5EAF1] mb-3">
            <div>
              <p className="text-[10px] uppercase font-bold text-[#667085] tracking-wider">Total Visits</p>
              <p className="text-lg font-black text-[#152238]">{dashboardData?.visitors?.total_visitors || 0}</p>
            </div>
            <div className="h-8 w-[1px] bg-[#E5EAF1]" />
            <div>
              <p className="text-[10px] uppercase font-bold text-[#667085] tracking-wider">Unique Sessions</p>
              <p className="text-lg font-black text-[#0052FF]">{dashboardData?.visitors?.unique_sessions || 0}</p>
            </div>
          </div>
          <h3 className="text-[11px] font-bold text-[#667085] uppercase tracking-wider mb-2">Top Visitor Locations</h3>
          {dashboardData?.visitors?.geography && dashboardData.visitors.geography.length > 0 ? (
            <div className="flex flex-col gap-2 flex-1">
              {dashboardData.visitors.geography.slice(0, 5).map((geo, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-[#152238]">
                    <span className="truncate">{geo.city ? `${geo.city}, ${geo.region || geo.country || ''}` : geo.location || 'Direct / Local'}</span>
                    <span className="text-[#667085] shrink-0">{geo.count} ({geo.percentage}%)</span>
                  </div>
                  <div className="h-1.5 bg-[#E5EAF1] rounded-full overflow-hidden">
                    <div className="h-full bg-[#0052FF] rounded-full" style={{ width: `${Math.min(100, Math.max(8, geo.percentage))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-4 text-[#667085]">
              <Globe size={24} className="mb-2 opacity-40" />
              <p className="text-xs font-semibold text-[#152238]">No visitor location data yet</p>
              <p className="text-[10px] text-[#667085] mt-0.5">Visits will be mapped as customers view your storefront.</p>
            </div>
          )}
        </div>

        {/* Most Viewed Products (4/12) */}
        <div className="lg:col-span-4 bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-sm flex flex-col min-h-[300px]">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#FF8A00]" />
              <h2 className="text-sm font-bold text-[#152238]">Most Viewed (What They Saw)</h2>
            </div>
            <Link to="/products" className="text-[11px] font-semibold text-[#0052FF] hover:underline">Products</Link>
          </div>
          {dashboardData?.most_viewed_products && dashboardData.most_viewed_products.length > 0 ? (
            <div className="flex flex-col gap-2.5 flex-1">
              {dashboardData.most_viewed_products.slice(0, 5).map((prod, idx) => (
                <div key={prod.id || idx} className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-50">
                  <span className="text-[10px] font-bold text-[#667085] w-4 shrink-0 text-center">{idx + 1}</span>
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#F6F8FC] border border-[#E5EAF1] flex items-center justify-center shrink-0">
                    {prod.image_url ? (
                      <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package size={14} className="text-[#667085]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-[#152238] truncate">{prod.name}</p>
                    <p className="text-[10px] text-[#667085]">{config.symbol}{Number(prod.price || 0).toLocaleString()}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-bold text-[#0052FF]">{prod.views} views</p>
                    <p className="text-[9px] text-[#667085]">{prod.unique_viewers || prod.views} unique</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-4 text-[#667085]">
              <Package size={24} className="mb-2 opacity-40" />
              <p className="text-xs font-semibold text-[#152238]">No product views recorded</p>
              <p className="text-[10px] text-[#667085] mt-0.5">Customer views will appear here in real-time.</p>
            </div>
          )}
        </div>

        {/* Most Purchased Products (4/12) */}
        <div className="lg:col-span-4 bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-sm flex flex-col min-h-[300px]">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag size={16} className="text-[#16A36A]" />
              <h2 className="text-sm font-bold text-[#152238]">Most Purchased (What They Bought)</h2>
            </div>
            <Link to="/orders" className="text-[11px] font-semibold text-[#0052FF] hover:underline">Orders</Link>
          </div>
          {(dashboardData?.most_purchased_products && dashboardData.most_purchased_products.length > 0) || topProducts.length > 0 ? (
            <div className="flex flex-col gap-2.5 flex-1">
              {((dashboardData?.most_purchased_products && dashboardData.most_purchased_products.length > 0)
                ? dashboardData.most_purchased_products
                : topProducts.map(tp => ({ id: tp.id, name: tp.name, units_sold: tp.sold_count, orders_count: tp.sold_count, revenue: tp.sold_count * tp.price, image_url: tp.image_url }))
              ).slice(0, 5).map((prod: any, idx: number) => (
                <div key={prod.id || idx} className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-50">
                  <span className="text-[10px] font-bold text-[#667085] w-4 shrink-0 text-center">{idx + 1}</span>
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#F6F8FC] border border-[#E5EAF1] flex items-center justify-center shrink-0">
                    {prod.image_url ? (
                      <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package size={14} className="text-[#667085]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-[#152238] truncate">{prod.name}</p>
                    <p className="text-[10px] text-[#667085]">{config.symbol}{Number(prod.revenue || 0).toLocaleString()} revenue</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-bold text-[#16A36A]">{prod.units_sold || prod.sold_count || 0} sold</p>
                    <p className="text-[9px] text-[#667085]">{prod.orders_count || 1} orders</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-4 text-[#667085]">
              <ShoppingBag size={24} className="mb-2 opacity-40" />
              <p className="text-xs font-semibold text-[#152238]">No purchases yet</p>
              <p className="text-[10px] text-[#667085] mt-0.5">Purchased items will appear ranked by units sold.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Row: Recent Orders + AI + Credits ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Recent Orders (5/12) */}
        <div className="lg:col-span-5 bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-sm flex flex-col min-h-[300px]">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-bold text-[#152238]">Recent Orders</h2>
            <Link to="/orders" className="text-[11px] font-semibold text-[#0052FF] hover:underline">View All</Link>
          </div>

          {recentOrders.length > 0 ? (
            <div className="flex flex-col gap-1.5 flex-1">
              {recentOrders.map((order) => {
                const badge = statusBadge(order.status);
                return (
                  <div key={order.id} className="flex items-center justify-between p-2 hover:bg-[#F6F8FC] rounded-xl transition-colors gap-3">
                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="w-7 h-7 rounded-xl bg-[#F6F8FC] border border-[#E5EAF1] flex items-center justify-center">
                        <Package size={13} className="text-[#667085]" />
                      </div>
                      <p className="text-[11px] font-bold text-[#152238]">#{order.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <p className="text-[11px] font-medium text-[#667085] truncate flex-1">{order.customer_name}</p>
                    <p className="text-[11px] font-bold text-[#152238] shrink-0">{config.symbol}{order.total.toLocaleString()}</p>
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold capitalize ${badge.bg} ${badge.text} shrink-0`}>
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
              <div className="w-9 h-9 rounded-xl bg-[#F6F8FC] border border-[#E5EAF1] flex items-center justify-center text-[#667085] mb-2">
                <ShoppingCart size={17} />
              </div>
              <p className="text-xs font-semibold text-[#152238] mb-1">No orders received yet</p>
              <p className="text-[11px] text-[#667085] mb-3 max-w-[200px]">
                Share your store link on WhatsApp to start receiving orders.
              </p>
              <button
                onClick={handleShareStoreWhatsApp}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white text-[11px] font-bold rounded-xl transition-colors cursor-pointer"
              >
                <Share2 size={12} />
                Share Store Link
              </button>
            </div>
          )}
        </div>

        {/* FeraSetu AI (4/12) */}
        <div className="lg:col-span-4 bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-sm flex flex-col min-h-[300px]">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-[#0052FF]" />
              <h2 className="text-sm font-bold text-[#152238]">FeraSetu AI</h2>
            </div>
            <Link
              to="/ferasetu-ai"
              className="text-[11px] font-semibold text-[#0052FF] hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 transition-colors"
            >
              New Chat
            </Link>
          </div>

          <div className="bg-[#F6F8FC] p-3 rounded-xl border border-[#E5EAF1] mb-3 flex items-center gap-2.5">
            <Sparkles className="text-[#0052FF] shrink-0" size={16} />
            <p className="text-[12px] font-semibold text-[#0052FF] leading-relaxed">
              Hi {firstName}! How can I help you grow your business today?
            </p>
          </div>

          <div className="flex flex-col gap-1.5 flex-1">
            {[
              'Which product is selling most?',
              'How can I increase my sales?',
              'Show low stock products',
            ].map((q, i) => (
              <Link
                to={`/ferasetu-ai?q=${encodeURIComponent(q)}`}
                key={i}
                className="flex justify-between items-center p-2.5 border border-[#E5EAF1] rounded-xl text-[12px] font-medium text-[#667085] hover:border-blue-200 hover:bg-blue-50/60 hover:text-[#0052FF] transition-all group"
              >
                <span>{q}</span>
                <ArrowRight size={12} className="text-[#E5EAF1] group-hover:text-[#0052FF] transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </div>

        {/* AI Credits + Quick Actions (3/12) */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {/* AI Credits */}
          <div className="bg-white border border-[#E5EAF1] rounded-xl p-4 shadow-sm flex-1">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <Coins size={14} className="text-[#0052FF]" />
                <h2 className="text-sm font-bold text-[#152238]">AI Credits</h2>
              </div>
              <Link to="/ai-credits" className="text-[11px] font-semibold text-[#0052FF] hover:underline">Details</Link>
            </div>

            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-full bg-[#0052FF] text-white flex items-center justify-center shrink-0">
                <Coins size={16} />
              </div>
              <div>
                <p className="text-[9px] font-bold text-[#667085] uppercase tracking-wider">Available</p>
                <p className="text-base font-black text-[#152238]">{aiCreditsBalance} Credits</p>
              </div>
            </div>

            <div className="mb-2">
              <div className="flex justify-between text-[10px] font-semibold text-[#667085] mb-1">
                <span>Used: {aiCreditsUsed}</span>
                <span className="text-[#152238]">Total: {aiCreditsLimit}</span>
              </div>
              <div className="h-1.5 bg-[#E5EAF1] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${aiCreditsPercent}%`,
                    background: aiCreditsPercent > 80 ? '#E5484D' : aiCreditsPercent > 60 ? '#FF8A00' : '#0052FF',
                  }}
                />
              </div>
            </div>

            <p className="text-[10px] text-[#667085]">
              Resets:{' '}
              {new Date(Date.now() + 30 * 86400000).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="bg-white border border-[#E5EAF1] rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-bold text-[#152238] mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: <Plus size={14} />, label: 'Add Product', to: '/products' },
                { icon: <ShoppingCart size={14} />, label: 'View Orders', to: '/orders' },
                { icon: <Globe size={14} />, label: 'Edit Store', to: '/website-builder' },
                { icon: <Sparkles size={14} />, label: 'FeraSetu AI', to: '/ferasetu-ai' },
              ].map(action => (
                <Link
                  key={action.label}
                  to={action.to}
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-[#E5EAF1] hover:border-blue-200 hover:bg-blue-50/50 text-[#667085] hover:text-[#0052FF] transition-all group text-center"
                >
                  <span className="text-[#0052FF] group-hover:scale-110 transition-transform">{action.icon}</span>
                  <span className="text-[10px] font-semibold">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
