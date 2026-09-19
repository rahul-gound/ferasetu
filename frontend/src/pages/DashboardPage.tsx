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
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  ShoppingBag,
  Package,
  Coins,
  ArrowRight,
  Download,
  Users,
  Target,
  Sparkles,
  Calendar,
  ChevronDown,
  CreditCard,
  Share2,
  Plus,
  AlertCircle,
  Copy,
  ExternalLink,
  Store,
  Check,
  BarChart3,
  Zap,
  Globe,
  MessageSquareText,
  Eye,
  X,
  Radio,
  QrCode,
  ShieldCheck,
  Clock,
  Printer,
  FileText,
  ArrowUpRight,
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
  last_clicked_at?: string;
  location?: string;
}

interface RecentClickItem {
  id: string;
  product_id: string;
  product_name: string;
  price: number;
  image_url?: string;
  clicked_at: string;
  location?: string;
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
    delivery_type?: string;
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
  recent_clicks?: RecentClickItem[];
}

function generateSparkline(
  values: number[],
  width = 120,
  height = 32
): { path: string; areaPath: string; endX: number; endY: number } | null {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
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
  const areaPath = `${path} L${last.x.toFixed(1)},${height} L0,${height} Z`;

  return { path, areaPath, endX: last.x, endY: last.y };
}

function SparklineOrPlaceholder({
  sparkline,
  strokeColor,
  fillColor,
  isEmpty,
  gradientId,
}: {
  sparkline: ReturnType<typeof generateSparkline>;
  strokeColor: string;
  fillColor: string;
  isEmpty: boolean;
  gradientId: string;
}) {
  if (isEmpty || !sparkline) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-[10px] font-medium text-slate-400">Collecting data…</span>
      </div>
    );
  }
  return (
    <svg
      viewBox="0 0 120 32"
      className="w-full h-full overflow-visible"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillColor} stopOpacity={0.25} />
          <stop offset="100%" stopColor={fillColor} stopOpacity={0.0} />
        </linearGradient>
      </defs>
      <path d={sparkline.areaPath} fill={`url(#${gradientId})`} />
      <path d={sparkline.path} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={sparkline.endX} cy={sparkline.endY} r="3" fill={strokeColor} stroke="#FFFFFF" strokeWidth="1.5" />
    </svg>
  );
}

function TrendBadge({ change, label = 'vs last 7d' }: { change: number; label?: string }) {
  if (change === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
        <span className="text-slate-400">—</span>
        <span>0% {label}</span>
      </span>
    );
  }
  const positive = change > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
        positive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-rose-50 text-rose-700 border border-rose-200/60'
      }`}
    >
      {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      <span>{positive ? `+${change}%` : `${change}%`}</span>
      <span className="font-normal opacity-75">{label}</span>
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
  const [inspectingProduct, setInspectingProduct] = useState<any>(null);
  const [clicksViewMode, setClicksViewMode] = useState<'top' | 'live'>('top');
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d');
  const [showQrModal, setShowQrModal] = useState(false);

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

  // Average Order Value (AOV)
  const averageOrderValue = useMemo(() => {
    if (totalOrders === 0) return 0;
    return Math.round(totalRevenue / totalOrders);
  }, [totalRevenue, totalOrders]);

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

  const planDisplayName = useMemo(() => {
    const p = (user?.plan || 'free').toLowerCase();
    if (p === 'pro') return 'Pro Plan';
    if (p === 'business') return 'Business Plan';
    if (p === 'starter') return 'Starter Plan';
    return 'Free Plan';
  }, [user?.plan]);

  // Real 7-day or 30-day trend data
  const trendDaysData = useMemo(() => {
    const daysCount = timeRange === '30d' ? 30 : 7;
    const now = new Date();
    const days = [];
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const ymd = d.toISOString().slice(0, 10);
      const dayOrders = orders.filter(o => (o.created_at || '').startsWith(ymd));
      const dayRev = dayOrders
        .filter(o => o.status !== 'cancelled')
        .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      days.push({ date: dateLabel, ymd, revenue: dayRev, orders: dayOrders.length });
    }
    if (timeRange === '7d' && dashboardData?.revenue_chart && dashboardData.revenue_chart.length > 0) {
      return dashboardData.revenue_chart.map((pt, idx) => ({
        date: pt.date || days[idx]?.date || '',
        ymd: days[idx]?.ymd || '',
        revenue: pt.revenue ?? 0,
        orders: pt.orders ?? days[idx]?.orders ?? 0,
      }));
    }
    return days;
  }, [dashboardData, orders, timeRange]);

  // Sparklines
  const revenueSparkline = useMemo(
    () => generateSparkline(trendDaysData.map(d => d.revenue)),
    [trendDaysData]
  );
  const ordersSparkline = useMemo(
    () => generateSparkline(trendDaysData.map(d => d.orders)),
    [trendDaysData]
  );
  const aovSparkline = useMemo(
    () => generateSparkline(trendDaysData.map(d => (d.orders > 0 ? Math.round(d.revenue / d.orders) : 0))),
    [trendDaysData]
  );
  const conversionSparkline = useMemo(
    () => generateSparkline(trendDaysData.map(d => (d.orders > 0 ? conversionRate : 0))),
    [trendDaysData, conversionRate]
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
      return [{ name: 'No Orders', value: 1, percentage: 0, color: '#E2E8F0' }];
    }
    return [
      { name: 'Delivered', value: statusCounts.delivered, percentage: Number(((statusCounts.delivered / totalOrders) * 100).toFixed(1)), color: '#10B981' },
      { name: 'Processing', value: statusCounts.processing, percentage: Number(((statusCounts.processing / totalOrders) * 100).toFixed(1)), color: '#2563EB' },
      { name: 'Shipped', value: statusCounts.shipped, percentage: Number(((statusCounts.shipped / totalOrders) * 100).toFixed(1)), color: '#F59E0B' },
      { name: 'Cancelled', value: statusCounts.cancelled, percentage: Number(((statusCounts.cancelled / totalOrders) * 100).toFixed(1)), color: '#EF4444' },
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
      delivery_type: o.delivery_type || 'delivery',
    }));
  }, [dashboardData, orders]);

  // AI Credits
  const aiCreditsBalance = user?.ai_credits_balance ?? 20;
  const aiCreditsLimit = user?.ai_credits_monthly_limit ?? (
    user?.plan === 'pro' ? 1000 : user?.plan === 'business' ? 200 : 20
  );
  const aiCreditsUsed = user?.ai_credits_used_month ?? Math.max(0, aiCreditsLimit - aiCreditsBalance);
  const aiCreditsPercent = Math.min(100, Math.max(0, Math.round((aiCreditsUsed / Math.max(1, aiCreditsLimit)) * 100)));

  // Date range display
  const dateRangeText = useMemo(() => {
    if (trendDaysData.length === 0) return 'Last 7 days';
    const first = trendDaysData[0].date;
    const last = trendDaysData[trendDaysData.length - 1].date;
    return `${first} – ${last}, ${new Date().getFullYear()}`;
  }, [trendDaysData]);

  // Chart max values
  const maxChartRevenue = useMemo(() => {
    const m = Math.max(...trendDaysData.map(d => d.revenue));
    return m > 0 ? Math.ceil(m * 1.2) : 1000;
  }, [trendDaysData]);

  const maxChartOrders = useMemo(() => {
    const m = Math.max(...trendDaysData.map(d => d.orders));
    return m > 0 ? Math.ceil(m * 1.2) : 10;
  }, [trendDaysData]);

  // Smart attention alerts
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
        ['Metric', 'Value', 'Trend vs Previous Period'],
        ['Total Revenue', `${config.symbol}${totalRevenue.toLocaleString()}`, `${revenueChange}%`],
        ['Total Orders', `${totalOrders}`, `${ordersChange}%`],
        ['Average Order Value (AOV)', `${config.symbol}${averageOrderValue.toLocaleString()}`, '—'],
        ['Total Customers', `${totalCustomers}`, `${customersChange}%`],
        ['Conversion Rate', `${conversionRate}%`, `${conversionChange}%`],
        [],
        [`Daily Breakdown`, `Revenue (${config.currency})`, 'Orders'],
        ...trendDaysData.map(d => [d.date, d.revenue, d.orders]),
        [],
        ['Top Selling Product', `Price (${config.currency})`, 'Units Sold'],
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
      a.download = `FeraSetu_Performance_Report_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Performance report downloaded');
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
      toast.success('Storefront link copied to clipboard');
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      toast.error('Failed to copy link.');
    }
  };

  const handleShareStoreWhatsApp = () => {
    const text = encodeURIComponent(
      `🛍️ Welcome to our official store!\nBrowse our full catalog and place orders directly:\n👉 ${storeUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const statusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Delivered', dot: 'bg-emerald-500' };
      case 'shipped':
      case 'out_for_delivery':
        return { bg: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Out for Delivery', dot: 'bg-blue-500' };
      case 'processing':
      case 'preparing':
      case 'confirmed':
        return { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Processing', dot: 'bg-amber-500' };
      case 'cancelled':
        return { bg: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Cancelled', dot: 'bg-rose-500' };
      default:
        return { bg: 'bg-slate-50 text-slate-700 border-slate-200', label: status || 'Pending', dot: 'bg-slate-400' };
    }
  };

  return (
    <div className="pb-12 max-w-[1400px] mx-auto space-y-6 text-slate-900 font-sans">
      {/* ── Trial & Lifecycle Alerts ── */}
      {market !== 'IN' && subscription.isTrialing && !subscription.isEndingSoon && (
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 p-4 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/15 shrink-0 backdrop-blur-xs">
              <Sparkles size={18} className="text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 font-bold text-sm">
                <span>14-Day Free Trial: {subscription.trialDaysRemaining} {subscription.trialDaysRemaining === 1 ? 'day' : 'days'} left</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">Active</span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">Full access to Business features. Select a plan to ensure uninterrupted operations.</p>
            </div>
          </div>
          <Link to="/upgrade" className="shrink-0 px-4 py-2 rounded-xl bg-white text-blue-700 font-bold text-xs hover:bg-blue-50 transition-all shadow-sm">
            View Plans
          </Link>
        </div>
      )}

      {/* ── Executive Workspace Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {greeting}, {firstName}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
              <ShieldCheck size={13} className="text-blue-600" />
              {planDisplayName}
            </span>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            Live business performance, real-time footfall, and order pipeline.
          </p>
        </div>

        {/* Action controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* 7d / 30d Toggle */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80">
            <button
              type="button"
              onClick={() => setTimeRange('7d')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeRange === '7d' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('30d')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeRange === '30d' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 Days
            </button>
          </div>

          {/* Export Report */}
          <button
            type="button"
            onClick={handleDownloadReport}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 bg-white border border-slate-200/90 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
          >
            <Download size={14} className="text-slate-500" />
            <span>{downloading ? 'Generating…' : 'Export CSV'}</span>
          </button>

          {/* Primary Action */}
          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all hover:-translate-y-0.5"
          >
            <Plus size={15} />
            <span>Add Product</span>
          </Link>
        </div>
      </div>

      {/* ── Storefront Deployment Control Hub ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:border-slate-300 transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Left: Domain & Status */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shrink-0 shadow-xs">
              <Store size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Storefront Deployed
                </span>
                <span className="text-[11px] text-slate-500 font-medium">• 0% Commission</span>
                <span className="text-[11px] text-slate-500 font-medium">• Direct UPI Active</span>
              </div>
              <p className="text-sm sm:text-base font-bold text-slate-900 truncate font-mono tracking-tight">
                {storeUrl}
              </p>
            </div>
          </div>

          {/* Right: Quick Deployment Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyStoreLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            >
              {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
            </button>

            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-colors"
            >
              <ExternalLink size={14} />
              <span>Preview Store</span>
            </a>

            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            >
              <QrCode size={14} />
              <span>Counter QR</span>
            </button>

            <button
              type="button"
              onClick={handleShareStoreWhatsApp}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              <Share2 size={14} />
              <span>Share on WhatsApp</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Onboarding Progress Widget ── */}
      <OnboardingProgress
        shopCreated={true}
        hasProducts={products.length > 0}
        hasOrders={orders.length > 0}
        storePublished={!!(user?.subdomain || user?.organization?.store_slug)}
        storeSlug={user?.organization?.store_slug || user?.subdomain}
        storeUrl={user?.organization?.store_url || (user?.subdomain ? `https://${user.subdomain}.ferasetu.com` : undefined)}
      />

      {/* ── Executive 5-Pillar KPI Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1: Total Revenue */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between min-h-[170px]">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Net Revenue</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CreditCard size={15} />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {config.symbol}{totalRevenue.toLocaleString(config.market === 'IN' ? 'en-IN' : 'en-US')}
            </h3>
          </div>
          <div className="space-y-2 pt-2">
            <TrendBadge change={revenueChange} />
            <div className="h-7 w-full">
              <SparklineOrPlaceholder
                sparkline={revenueSparkline}
                strokeColor="#10B981"
                fillColor="#10B981"
                isEmpty={noOrdersYet}
                gradientId="sparklineRev"
              />
            </div>
          </div>
        </div>

        {/* Metric 2: Orders Volume */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between min-h-[170px]">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Orders Volume</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShoppingBag size={15} />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {totalOrders}
            </h3>
          </div>
          <div className="space-y-2 pt-2">
            <TrendBadge change={ordersChange} />
            <div className="h-7 w-full">
              <SparklineOrPlaceholder
                sparkline={ordersSparkline}
                strokeColor="#2563EB"
                fillColor="#2563EB"
                isEmpty={noOrdersYet}
                gradientId="sparklineOrd"
              />
            </div>
          </div>
        </div>

        {/* Metric 3: Average Order Value (AOV) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between min-h-[170px]">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Avg. Order Value (AOV)</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Target size={15} />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {config.symbol}{averageOrderValue.toLocaleString()}
            </h3>
          </div>
          <div className="space-y-2 pt-2">
            <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
              Basket size health
            </span>
            <div className="h-7 w-full">
              <SparklineOrPlaceholder
                sparkline={aovSparkline}
                strokeColor="#F59E0B"
                fillColor="#F59E0B"
                isEmpty={noOrdersYet}
                gradientId="sparklineAov"
              />
            </div>
          </div>
        </div>

        {/* Metric 4: Store Visitors / Footfall */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between min-h-[170px]">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Store Footfall</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Globe size={15} />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {dashboardData?.visitors?.total_visitors || 0}
            </h3>
          </div>
          <div className="space-y-2 pt-2">
            <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
              {dashboardData?.visitors?.unique_sessions || 0} unique sessions
            </span>
            <div className="h-7 w-full">
              <SparklineOrPlaceholder
                sparkline={revenueSparkline}
                strokeColor="#6366F1"
                fillColor="#6366F1"
                isEmpty={!dashboardData?.visitors?.total_visitors}
                gradientId="sparklineVis"
              />
            </div>
          </div>
        </div>

        {/* Metric 5: Conversion Rate */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between min-h-[170px]">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Conversion Rate</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <PercentIcon size={15} />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {conversionRate}%
            </h3>
          </div>
          <div className="space-y-2 pt-2">
            <TrendBadge change={conversionChange} />
            <div className="h-7 w-full">
              <SparklineOrPlaceholder
                sparkline={conversionSparkline}
                strokeColor="#2563EB"
                fillColor="#2563EB"
                isEmpty={noOrdersYet}
                gradientId="sparklineConv"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Performance Analytics & Charts Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Sales & Orders Overview (7/12) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between min-h-[360px]">
          <div>
            <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <BarChart3 size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Revenue & Order Trends</h2>
                  <p className="text-xs text-slate-500">{dateRangeText}</p>
                </div>
              </div>

              {/* Legends */}
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="inline-flex items-center gap-1.5 text-blue-600">
                  <span className="w-2.5 h-1 rounded-full bg-blue-600" /> Revenue ({config.symbol})
                </span>
                <span className="inline-flex items-center gap-1.5 text-emerald-600">
                  <span className="w-2.5 h-1 rounded-full bg-emerald-500" /> Orders
                </span>
              </div>
            </div>

            <div className="w-full min-w-0" style={{ minHeight: 250 }}>
              <Suspense
                fallback={
                  <div className="w-full h-full bg-slate-50/70 rounded-xl animate-pulse flex items-center justify-center text-xs font-semibold text-slate-400" style={{ minHeight: 250 }}>
                    Loading analytics data…
                  </div>
                }
              >
                <SalesOverviewChart
                  data={trendDaysData}
                  maxRevenue={maxChartRevenue}
                  maxOrders={maxChartOrders}
                  symbol={config.symbol}
                />
              </Suspense>
            </div>
          </div>
        </div>

        {/* Top Products Leaderboard (3/12) */}
        <div className="lg:col-span-3 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[360px]">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">Top Products</h2>
              </div>
              <Link to="/products" className="text-xs font-bold text-blue-600 hover:text-blue-700">
                View All
              </Link>
            </div>

            {topProducts.length > 0 ? (
              <div className="space-y-3">
                {topProducts.map((prod, idx) => (
                  <div key={prod.id} className="flex items-center gap-3 group">
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${
                      idx === 0 ? 'bg-amber-100 text-amber-800' : idx === 1 ? 'bg-slate-100 text-slate-700' : 'text-slate-400'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                      {prod.image_url ? (
                        <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package size={15} className="text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                        {prod.name}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {config.symbol}{prod.price.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-emerald-600 font-mono">{prod.sold_count}</span>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">sold</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-8 text-slate-500">
                <Package size={28} className="mb-2 text-slate-300" />
                <p className="text-xs font-bold text-slate-800">No product sales yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5 max-w-[170px]">Items will rank automatically as customers place orders.</p>
                <Link
                  to="/products"
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs hover:bg-blue-100 transition-colors"
                >
                  <Plus size={12} /> Add Items
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Order Status Donut (2/12) */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[360px]">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShoppingBag size={16} className="text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Fulfillment Status</h2>
            </div>

            <div className="relative flex items-center justify-center my-2" style={{ height: 150 }}>
              <Suspense fallback={<div className="w-full h-full bg-slate-50 rounded-xl animate-pulse" />}>
                <OrderStatusPieChart donutData={donutData} totalOrders={totalOrders} />
              </Suspense>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-900 font-mono">{totalOrders}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
              </div>
            </div>

            <div className="space-y-1.5 mt-3 pt-3 border-t border-slate-100 text-xs">
              {[
                { label: 'Delivered', count: statusCounts.delivered, color: '#10B981' },
                { label: 'Processing', count: statusCounts.processing, color: '#2563EB' },
                { label: 'Shipped', count: statusCounts.shipped, color: '#F59E0B' },
                { label: 'Cancelled', count: statusCounts.cancelled, color: '#EF4444' },
              ].map(s => (
                <div key={s.label} className="flex justify-between items-center text-[11px]">
                  <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {s.count} <span className="font-normal text-slate-400 text-[10px]">({totalOrders > 0 ? Math.round((s.count / totalOrders) * 100) : 0}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Smart Needs Attention Bar (Conditional Alerts) ── */}
      {hasAttentionItems && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertCircle size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-950 uppercase tracking-wider">Action Items Detected</p>
                <p className="text-xs text-amber-800">You have pending workflows that require attention:</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {pendingCount > 0 && (
                <Link
                  to="/orders"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-amber-300 text-xs font-bold text-amber-900 hover:bg-amber-100/60 shadow-xs transition-colors"
                >
                  <ShoppingCart size={13} className="text-amber-600" />
                  <span>{pendingCount} order{pendingCount > 1 ? 's' : ''} awaiting dispatch</span>
                  <ArrowRight size={12} />
                </Link>
              )}
              {lowStockProducts.length > 0 && (
                <Link
                  to="/products"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-rose-300 text-xs font-bold text-rose-900 hover:bg-rose-50 shadow-xs transition-colors"
                >
                  <Package size={13} className="text-rose-600" />
                  <span>{lowStockProducts.length} product{lowStockProducts.length > 1 ? 's' : ''} low on stock (≤3)</span>
                  <ArrowRight size={12} />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Live Shopper Intelligence & Clickstream ("What Customers Are Doing") ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Footfall & Geography (4/12) */}
        <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[320px]">
          <div>
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">Footfall & Geography</h2>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Live Traffic
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/70 mb-4">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Views</p>
                <p className="text-lg font-black text-slate-900 font-mono">{dashboardData?.visitors?.total_visitors || 0}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Unique Shoppers</p>
                <p className="text-lg font-black text-blue-600 font-mono">{dashboardData?.visitors?.unique_sessions || 0}</p>
              </div>
            </div>

            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">Top Locations</h3>
            {dashboardData?.visitors?.geography && dashboardData.visitors.geography.length > 0 ? (
              <div className="space-y-2.5">
                {dashboardData.visitors.geography.slice(0, 4).map((geo, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-800">
                      <span className="truncate">{geo.city ? `${geo.city}, ${geo.region || geo.country || ''}` : geo.location || 'Local / Direct'}</span>
                      <span className="text-slate-500 font-mono text-[11px]">{geo.count} ({geo.percentage}%)</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.min(100, Math.max(8, geo.percentage))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs">
                <Globe size={24} className="mx-auto mb-1.5 opacity-40" />
                <p className="font-semibold text-slate-700">No geo locations recorded</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Footfall will be visualized as shoppers browse your store.</p>
              </div>
            )}
          </div>
        </div>

        {/* Customer Product Clicks Feed (4/12) */}
        <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[320px]">
          <div>
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500" />
                <h2 className="text-sm font-bold text-slate-900">Shopper Intent (Clicks)</h2>
              </div>
              {/* Segmented Control */}
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setClicksViewMode('top')}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                    clicksViewMode === 'top' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Top
                </button>
                <button
                  type="button"
                  onClick={() => setClicksViewMode('live')}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all flex items-center gap-1 ${
                    clicksViewMode === 'live' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                </button>
              </div>
            </div>

            {clicksViewMode === 'top' ? (
              dashboardData?.most_viewed_products && dashboardData.most_viewed_products.length > 0 ? (
                <div className="space-y-2">
                  {dashboardData.most_viewed_products.slice(0, 4).map((prod, idx) => (
                    <div
                      key={prod.id || idx}
                      onClick={() => setInspectingProduct(prod)}
                      className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-blue-50/60 border border-transparent hover:border-blue-100 transition-all cursor-pointer group"
                    >
                      <span className="text-[10px] font-bold text-slate-400 w-4 text-center">{idx + 1}</span>
                      <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                        {prod.image_url ? (
                          <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={14} className="text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                          {prod.name}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">{config.symbol}{Number(prod.price || 0).toLocaleString()}</p>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-2">
                        <div>
                          <p className="text-xs font-bold text-blue-600 font-mono">{prod.views} clicks</p>
                          <p className="text-[9px] text-slate-400">{prod.unique_viewers || prod.views} shoppers</p>
                        </div>
                        <span className="p-1 rounded-lg bg-white border border-slate-200 text-slate-500 group-hover:text-blue-600 shadow-2xs">
                          <Eye size={12} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 text-xs">
                  <Package size={24} className="mx-auto mb-1.5 opacity-40" />
                  <p className="font-semibold text-slate-700">No clicks recorded yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Customer taps will populate here as they view items.</p>
                </div>
              )
            ) : (
              dashboardData?.recent_clicks && dashboardData.recent_clicks.length > 0 ? (
                <div className="space-y-2">
                  {dashboardData.recent_clicks.slice(0, 4).map((clk, idx) => (
                    <div
                      key={clk.id || idx}
                      onClick={() => setInspectingProduct(clk)}
                      className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-emerald-50/60 border border-transparent hover:border-emerald-100 transition-all cursor-pointer group"
                    >
                      <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                        {clk.image_url ? (
                          <img src={clk.image_url} alt={clk.product_name} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={14} className="text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                          {clk.product_name}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {clk.location ? `${clk.location} • ` : ''}{config.symbol}{Number(clk.price || 0).toLocaleString()}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Tap
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 text-xs">
                  <Radio size={24} className="mx-auto mb-1.5 text-emerald-500 opacity-50" />
                  <p className="font-semibold text-slate-700">No live clickstream yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Realtime product interactions stream here automatically.</p>
                </div>
              )
            )}
          </div>
        </div>

        {/* Most Purchased (What They Bought) (4/12) */}
        <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[320px]">
          <div>
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag size={16} className="text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">Highest Converting Items</h2>
              </div>
              <Link to="/orders" className="text-xs font-bold text-blue-600 hover:text-blue-700">Orders</Link>
            </div>

            {dashboardData?.most_purchased_products && dashboardData.most_purchased_products.length > 0 ? (
              <div className="space-y-2.5">
                {dashboardData.most_purchased_products.slice(0, 4).map((prod: any, idx: number) => (
                  <div key={prod.id || idx} className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-50">
                    <span className="text-[10px] font-bold text-slate-400 w-4 text-center">{idx + 1}</span>
                    <div className="w-8 h-8 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                      {prod.image_url ? (
                        <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package size={14} className="text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{prod.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{config.symbol}{Number(prod.revenue || 0).toLocaleString()} revenue</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-emerald-600 font-mono">{prod.units_sold || 0} sold</p>
                      <p className="text-[9px] text-slate-400">{prod.orders_count || 1} orders</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs">
                <ShoppingBag size={24} className="mx-auto mb-1.5 opacity-40" />
                <p className="font-semibold text-slate-700">No completed sales yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Purchases will be cataloged and ranked by units sold.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SaaS Table: Recent Orders Pipeline + FeraSetu AI Copilot Hub ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Recent Orders SaaS Table (7/12) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between min-h-[340px]">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <ShoppingCart size={16} className="text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">Recent Customer Orders</h2>
              </div>
              <Link to="/orders" className="text-xs font-bold text-blue-600 hover:text-blue-700">
                View All Orders →
              </Link>
            </div>

            {recentOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      <th className="pb-2.5 font-bold">Order ID</th>
                      <th className="pb-2.5 font-bold">Customer</th>
                      <th className="pb-2.5 font-bold text-right">Amount</th>
                      <th className="pb-2.5 font-bold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentOrders.map((order) => {
                      const badge = statusBadge(order.status);
                      return (
                        <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 font-mono font-bold text-slate-900">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </td>
                          <td className="py-3 text-slate-700 font-medium">
                            <span className="block font-bold text-slate-900 truncate max-w-[160px]">{order.customer_name}</span>
                            <span className="text-[10px] text-slate-400 capitalize">{order.delivery_type || 'Delivery'}</span>
                          </td>
                          <td className="py-3 text-right font-mono font-bold text-slate-900">
                            {config.symbol}{order.total.toLocaleString()}
                          </td>
                          <td className="py-3 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                              {badge.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-10 text-center text-slate-500">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                  <ShoppingCart size={20} />
                </div>
                <p className="text-xs font-bold text-slate-900">No orders received yet</p>
                <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs mx-auto">
                  Share your store link on WhatsApp to receive your first direct order.
                </p>
                <button
                  type="button"
                  onClick={handleShareStoreWhatsApp}
                  className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <Share2 size={13} /> Share Store Link
                </button>
              </div>
            )}
          </div>
        </div>

        {/* FeraSetu AI Copilot & Operations Hub (5/12) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          
          {/* AI Assistant Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">FeraSetu AI Copilot</h2>
              </div>
              <Link
                to="/ferasetu-ai"
                className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors"
              >
                Open Copilot
              </Link>
            </div>

            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              Your AI merchant copilot analyzes live sales, suggests promotions, and drafts WhatsApp broadcast messages.
            </p>

            <div className="space-y-1.5">
              {[
                'Which products are low on stock?',
                'Draft a festive promo message for WhatsApp',
                'Analyze my top selling product trends',
              ].map((q, i) => (
                <Link
                  to={`/ferasetu-ai?q=${encodeURIComponent(q)}`}
                  key={i}
                  className="flex justify-between items-center p-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700 transition-all group"
                >
                  <span className="truncate">{q}</span>
                  <ArrowRight size={13} className="text-slate-400 group-hover:text-blue-600 shrink-0 ml-2" />
                </Link>
              ))}
            </div>
          </div>

          {/* AI Credits & Quick Launch Bar */}
          <div className="grid sm:grid-cols-2 gap-4">
            
            {/* Credit Gauge */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">AI Credits</span>
                <Link to="/ai-credits" className="text-[11px] font-bold text-blue-600 hover:underline">Details</Link>
              </div>
              <p className="text-lg font-black text-slate-900 font-mono mb-2">
                {aiCreditsBalance} <span className="text-xs font-semibold text-slate-500">Credits</span>
              </p>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${aiCreditsPercent}%`,
                    background: aiCreditsPercent > 80 ? '#EF4444' : aiCreditsPercent > 60 ? '#F59E0B' : '#2563EB',
                  }}
                />
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Used: {aiCreditsUsed} of {aiCreditsLimit}</p>
            </div>

            {/* Quick Actions Shortcuts */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Quick Actions</span>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/products"
                  className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold border border-slate-200/80 transition-colors"
                >
                  <Plus size={13} className="text-blue-600 shrink-0" />
                  <span>Product</span>
                </Link>
                <Link
                  to="/orders"
                  className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold border border-slate-200/80 transition-colors"
                >
                  <ShoppingCart size={13} className="text-emerald-600 shrink-0" />
                  <span>Orders</span>
                </Link>
                <Link
                  to="/website-builder"
                  className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold border border-slate-200/80 transition-colors"
                >
                  <Globe size={13} className="text-indigo-600 shrink-0" />
                  <span>Storefront</span>
                </Link>
                <Link
                  to="/pro-studio"
                  className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold border border-slate-200/80 transition-colors"
                >
                  <Sparkles size={13} className="text-amber-500 shrink-0" />
                  <span>Pro Studio</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Product Inspection Modal (Clean Glass & Analytics) ── */}
      {inspectingProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setInspectingProduct(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Shopper Intent Inspection</h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingProduct(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex gap-4 items-start">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                  {inspectingProduct.image_url ? (
                    <img
                      src={inspectingProduct.image_url}
                      alt={inspectingProduct.name || inspectingProduct.product_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package size={28} className="text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-bold text-slate-900 leading-snug truncate">
                    {inspectingProduct.name || inspectingProduct.product_name || 'Product'}
                  </h4>
                  <p className="text-base font-black text-blue-600 font-mono mt-0.5">
                    {config.symbol}{Number(inspectingProduct.price || 0).toLocaleString()}
                  </p>
                  {inspectingProduct.location && (
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <Globe size={12} className="text-blue-600" />
                      Shopper from: <span className="font-semibold text-slate-800">{inspectingProduct.location}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Clicks</p>
                  <p className="text-base font-black text-slate-900 font-mono">
                    {inspectingProduct.views ?? 1}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Unique Shoppers</p>
                  <p className="text-base font-black text-blue-600 font-mono">
                    {inspectingProduct.unique_viewers ?? 1}
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                {storeUrl && (
                  <a
                    href={`${storeUrl}?product=${inspectingProduct.product_id || inspectingProduct.id || ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                  >
                    <ExternalLink size={13} /> View on Storefront
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setInspectingProduct(null);
                    navigate('/products');
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Edit in Catalog
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Counter QR Code Modal (Physical Counter Display) ── */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 text-center p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700">Dukaan Counter QR</span>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col items-center">
              {/* Simulated Counter QR */}
              <div className="w-48 h-48 bg-white p-3 rounded-2xl border-2 border-slate-900 shadow-sm flex flex-col items-center justify-center relative">
                <QrCode size={150} className="text-slate-950" />
                <span className="text-[10px] font-black text-blue-600 mt-1 uppercase tracking-widest">
                  FERASETU STORE
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900 mt-3">{user?.business_name || 'My Store'}</p>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate max-w-[240px]">{storeUrl}</p>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Place this QR code on your store checkout counter. Customers can scan to browse products and order directly on WhatsApp.
            </p>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Printer size={14} /> Print Counter Display
              </button>
              <button
                type="button"
                onClick={handleCopyStoreLink}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PercentIcon({ size = 16 }: { size?: number }) {
  return (
    <span style={{ fontSize: size, fontWeight: 900, lineHeight: 1 }}>%</span>
  );
}
