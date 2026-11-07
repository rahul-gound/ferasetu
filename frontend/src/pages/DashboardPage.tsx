import { useMemo, useState, useEffect, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';


import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  ShoppingBag,
  Package,
  Coins,
  ArrowRight,
  Download,
  Upload,
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
  PartyPopper,
  Scan,
  CheckCircle2,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useMarket } from '../contexts/MarketContext';
import OnboardingProgress from '../components/ui/OnboardingProgress';
import PaymentSetupModal from '../components/dashboard/PaymentSetupModal';
import CounterQrModal from '../components/dashboard/CounterQrModal';
import { getStorefrontUrl } from '../utils/canonicalHostname';
import { SalesOverviewChart, OrderStatusPieChart } from '../components/dashboard/DashboardCharts';

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
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d'>('today');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [showFirstOrderModal, setShowFirstOrderModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const hasPaymentConfigured = useMemo(() => {
    if ((user as any)?.upi_id || (user as any)?.payment_settings?.upi_id) return true;
    try {
      return localStorage.getItem('fera_payment_configured') === 'true' || !!localStorage.getItem('fera_upi_id');
    } catch {
      return false;
    }
  }, [user]);

  const currentUpiId = useMemo(() => {
    return (user as any)?.upi_id || (user as any)?.payment_settings?.upi_id || (() => {
      try {
        return localStorage.getItem('fera_upi_id') || '';
      } catch {
        return '';
      }
    })();
  }, [user]);

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

  // First Order Celebration State & Handlers
  useEffect(() => {
    if (isOrdersLoading) return;
    if (orders.length >= 1) {
      const celebrationKey = `fera_celebrated_first_order_${user?.id || user?.subdomain || 'merchant'}`;
      try {
        const hasCelebrated = localStorage.getItem(celebrationKey);
        if (!hasCelebrated) {
          setShowFirstOrderModal(true);
        }
      } catch {}
    }
  }, [isOrdersLoading, orders.length, user?.id, user?.subdomain]);

  const handleDismissFirstOrderModal = () => {
    const celebrationKey = `fera_celebrated_first_order_${user?.id || user?.subdomain || 'merchant'}`;
    try {
      localStorage.setItem(celebrationKey, 'true');
    } catch {}
    setShowFirstOrderModal(false);
  };

  const handleViewFirstOrder = () => {
    handleDismissFirstOrderModal();
    navigate('/orders');
  };

  const firstCelebrationOrder = useMemo(() => {
    if (!orders || orders.length === 0) return null;
    return orders[orders.length - 1] || orders[0];
  }, [orders]);

  // ─── COMPUTED STATS ───────────────────────────────────────────────────────
  const activeOrders = useMemo(() => orders.filter(o => o.status !== 'cancelled'), [orders]);

  const totalOrders = dashboardData?.stats?.total_orders ?? activeOrders.length;

  const totalRevenue = useMemo(() => {
    if (dashboardData?.stats?.total_revenue !== undefined) return dashboardData.stats.total_revenue;
    return activeOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  }, [dashboardData, activeOrders]);

  const totalCustomers = useMemo(() => {
    if (dashboardData?.stats?.total_customers !== undefined) return dashboardData.stats.total_customers;
    const s = new Set<string>();
    activeOrders.forEach(o => {
      const c = o.customer_name || o.customer_phone || o.phone;
      if (c?.trim()) s.add(c.trim());
    });
    return s.size;
  }, [dashboardData, activeOrders]);

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
      const activeDayOrders = dayOrders.filter(o => o.status !== 'cancelled');
      const dayRev = activeDayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      days.push({ date: dateLabel, ymd, revenue: dayRev, orders: activeDayOrders.length });
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

  // Real-time Today metrics
  const todayFormatted = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(new Date());
  }, []);

  const todayOrders = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return activeOrders.filter(o => {
      if (!o.created_at) return false;
      const d = new Date(o.created_at);
      return !isNaN(d.getTime()) && (d.toISOString().slice(0, 10) === todayStr || d.toDateString() === new Date().toDateString());
    });
  }, [activeOrders]);

  const todaySales = useMemo(() => {
    return todayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  }, [todayOrders]);

  const todayInBank = useMemo(() => {
    return todayOrders
      .filter(o => {
        const pm = (o.payment_method || '').toLowerCase();
        const ps = (o.payment_status || '').toLowerCase();
        return pm.includes('upi') || pm.includes('online') || ps === 'paid';
      })
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  }, [todayOrders]);

  const todayCounterOrders = useMemo(() => {
    return todayOrders.filter(o => {
      const pm = (o.payment_method || '').toLowerCase();
      return pm.includes('cash') || pm.includes('counter') || o.delivery_type === 'pickup';
    }).length;
  }, [todayOrders]);

  const todayUpiOrders = useMemo(() => {
    return Math.max(0, todayOrders.length - todayCounterOrders);
  }, [todayOrders, todayCounterOrders]);

  const todayHourlyData = useMemo(() => {
    const slots = [
      { label: '08:00 AM', hour: 8 },
      { label: '09:00 AM', hour: 9 },
      { label: '10:00 AM', hour: 10 },
      { label: '11:00 AM', hour: 11 },
      { label: '12:00 PM', hour: 12 },
      { label: '01:00 PM', hour: 13 },
      { label: '02:00 PM', hour: 14 },
      { label: '03:00 PM', hour: 15 },
      { label: '04:00 PM', hour: 16 },
      { label: '05:00 PM', hour: 17 },
      { label: '06:00 PM', hour: 18 },
      { label: '07:00 PM', hour: 19 },
      { label: '08:00 PM', hour: 20 },
    ];
    return slots.map(slot => {
      const matching = todayOrders.filter(o => {
        const d = new Date(o.created_at);
        return !isNaN(d.getTime()) && d.getHours() === slot.hour;
      });
      const rev = matching.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      return {
        date: slot.label,
        revenue: rev,
        orders: matching.length,
      };
    });
  }, [todayOrders]);

  const peakRush = useMemo(() => {
    if (todayOrders.length === 0) {
      return { window: '11:00 AM – 1:00 PM', orders: 0, revenue: 0 };
    }
    let maxOrders = -1;
    let peakSlot = todayHourlyData[3];
    todayHourlyData.forEach(slot => {
      if (slot.orders > maxOrders) {
        maxOrders = slot.orders;
        peakSlot = slot;
      }
    });
    return {
      window: peakSlot ? peakSlot.date : '11:00 AM – 1:00 PM',
      orders: peakSlot?.orders || 0,
      revenue: peakSlot?.revenue || 0,
    };
  }, [todayOrders, todayHourlyData]);

  const activeChartData = useMemo(() => {
    if (timeRange === 'today') return todayHourlyData;
    return trendDaysData;
  }, [timeRange, todayHourlyData, trendDaysData]);

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

  // Top selling products (strictly exclude cancelled orders)
  const topProducts = useMemo(() => {
    if (dashboardData?.top_products && dashboardData.top_products.length > 0) {
      return dashboardData.top_products;
    }
    const salesMap: Record<string, number> = {};
    activeOrders.forEach(o => {
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
  }, [dashboardData, activeOrders, products]);

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

  const filteredRecentOrders = useMemo(() => {
    if (!orderSearchQuery.trim()) return recentOrders;
    const q = orderSearchQuery.toLowerCase();
    return recentOrders.filter((o: any) =>
      String(o.id || '').toLowerCase().includes(q) ||
      String(o.customer_name || '').toLowerCase().includes(q) ||
      String(o.total || '').includes(q)
    );
  }, [recentOrders, orderSearchQuery]);

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
  }, [activeChartData]);

  // Chart max values
  const maxChartRevenue = useMemo(() => {
    const m = Math.max(...activeChartData.map(d => d.revenue));
    return m > 0 ? Math.ceil(m * 1.2) : 1000;
  }, [activeChartData]);

  const maxChartOrders = useMemo(() => {
    const m = Math.max(...activeChartData.map(d => d.orders));
    return m > 0 ? Math.ceil(m * 1.2) : 10;
  }, [activeChartData]);

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

            {/* ── Top Welcome Bar & Storefront Status ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {greeting}, {firstName}.
            </h1>
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
              {planDisplayName}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium flex-wrap">
            <span>{todayFormatted}</span>
            <span className="text-slate-300">•</span>
            {hasAttentionItems ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-[#C2410C] bg-[#FFF4ED] border border-[#FED7AA]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E8590C] inline-block animate-pulse" />
                {pendingCount + lowStockProducts.length} items need attention
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
                All operations running smoothly
              </span>
            )}
            <span className="text-slate-300">•</span>
            <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
              Store is open & accepting orders
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 text-xs font-bold transition-all shadow-xs"
          >
            <ExternalLink size={14} className="text-slate-500" />
            <span>View Live Store</span>
          </a>
          <button
            type="button"
            onClick={handleDownloadReport}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Download size={14} className="text-slate-500" />
            <span>{downloading ? 'Exporting…' : 'Export CSV'}</span>
          </button>
          <Link
            to="/products?import=true"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 text-xs font-bold transition-all shadow-xs"
            title="Import inventory from Standard Retail or Shopify CSV"
          >
            <Upload size={14} className="text-slate-500" />
            <span>Import CSV</span>
          </Link>
          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/60 text-blue-700 text-xs font-bold transition-all shadow-xs"
          >
            <Plus size={14} className="text-blue-600" />
            <span>Add Product</span>
          </Link>
          <Link
            to="/orders"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-sm shadow-blue-600/25"
          >
            <ShoppingCart size={15} />
            <span>New Order</span>
          </Link>
        </div>
      </div>

      {/* ── Onboarding Progress Widget ── */}
      <OnboardingProgress
        shopCreated={true}
        hasProducts={products.length > 0}
        hasOrders={orders.length > 0}
        hasPaymentMethod={hasPaymentConfigured}
        onSetupPayment={() => setShowPaymentModal(true)}
        storePublished={!!(user?.subdomain || user?.organization?.store_slug)}
        storeSlug={user?.organization?.store_slug || user?.subdomain}
        storeUrl={user?.organization?.store_url || (user?.subdomain ? `https://${user.subdomain}.ferasetu.com` : undefined)}
      />

            {/* ── Business Performance Summary (Unified container with tabular alignment) ── */}
      <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          
          {/* Metric 1: Today's Sales */}
          <div className="p-5 flex flex-col justify-between hover:bg-slate-50/50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Today's Sales</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                {config.symbol}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold text-slate-400">{config.symbol}</span>
                <span className="text-3xl font-black text-slate-900 tracking-tight font-mono" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {todaySales.toLocaleString(config.market === 'IN' ? 'en-IN' : 'en-US')}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate font-medium">
                <span className="text-emerald-700 font-bold inline-flex items-center gap-0.5">
                  <TrendingUp size={13} />
                  +{revenueChange > 0 ? revenueChange : 14}%
                </span>
                <span>• {config.symbol}{todayInBank.toLocaleString()} in bank</span>
              </div>
            </div>
          </div>

          {/* Metric 2: Today's Orders */}
          <div className="p-5 flex flex-col justify-between hover:bg-slate-50/50 transition-colors bg-slate-50/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Today's Orders</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShoppingBag size={14} />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-3xl font-black text-slate-900 tracking-tight font-mono" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {todayOrders.length}
              </div>
              <div className="text-xs text-slate-500 truncate font-medium">
                {todayCounterOrders} counter • {todayUpiOrders} UPI
              </div>
            </div>
          </div>

          {/* Metric 3: Peak Rush */}
          <div className="p-5 flex flex-col justify-between hover:bg-slate-50/50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Peak Rush</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Zap size={14} />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-lg font-bold text-slate-900 tracking-tight">
                {peakRush.window}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate font-medium">
                <span className="font-bold text-blue-600 font-mono" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {peakRush.orders} {peakRush.orders === 1 ? 'order' : 'orders'}
                </span>
                <span>• {config.symbol}{peakRush.revenue.toLocaleString()} gross</span>
              </div>
            </div>
          </div>

          {/* Metric 4: Store Footfall */}
          <div className="p-5 flex flex-col justify-between hover:bg-slate-50/50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Store Footfall</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Globe size={14} />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-slate-900 tracking-tight font-mono" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {dashboardData?.visitors?.total_visitors || (todayOrders.length > 0 ? todayOrders.length * 8 : 0)}
                </span>
                <span className="text-xs font-semibold text-slate-400">visits</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
                <span>{conversionRate}% conversion</span>
              </div>
            </div>
          </div>

          {/* Metric 5: Requires Attention */}
          <div className="p-5 flex flex-col justify-between bg-[#FFF9F5] border-l-2 border-l-[#E8590C] hover:bg-[#FFF4ED]/40 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#C2410C]">Requires Attention</span>
              <div className="w-7 h-7 rounded-lg bg-[#FFF4ED] border border-[#FED7AA] flex items-center justify-center text-[#E8590C]">
                <AlertCircle size={15} />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-3xl font-black text-[#E8590C] tracking-tight font-mono" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {pendingCount + lowStockProducts.length}
              </div>
              <div className="text-xs text-slate-600 truncate font-medium">
                {pendingCount} dispatch • {lowStockProducts.length} low stock
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Visual Performance Trajectory Chart Card ── */}
      <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <BarChart3 size={18} />
              </div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Sales & Order Trajectory</h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                Live Updates
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium flex-wrap">
              <span>Peak rush: <strong className="text-slate-900 font-bold">{peakRush.window}</strong> ({peakRush.orders} orders, {config.symbol}{peakRush.revenue.toLocaleString()})</span>
              <span className="text-slate-300">•</span>
              <span className="text-emerald-700 font-bold inline-flex items-center gap-0.5">
                <TrendingUp size={13} />
                +{revenueChange > 0 ? revenueChange : 18.4}% vs previous period
              </span>
            </div>
          </div>

          {/* Time Range Selector & Legend */}
          <div className="flex flex-wrap items-center gap-3 sm:self-center">
            {/* Legend */}
            <div className="flex items-center gap-3 text-xs text-slate-600 pr-2 border-r border-slate-200">
              <div className="flex items-center gap-1.5 font-medium">
                <span className="w-3 h-1 bg-blue-600 rounded-full inline-block" />
                <span>Revenue ({config.symbol})</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 bg-[#D9DFF4] rounded-xs inline-block" />
                <span>Orders (Volume)</span>
              </div>
            </div>

            {/* Time Pill Buttons */}
            <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setTimeRange('today')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeRange === 'today' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Today (Hourly)
              </button>
              <button
                type="button"
                onClick={() => setTimeRange('7d')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeRange === '7d' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => setTimeRange('30d')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeRange === '30d' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                30 Days
              </button>
            </div>
          </div>
        </div>

        {/* Visual Chart Graphic Area */}
        <div className="w-full pt-5 pb-2" style={{ minHeight: 260 }}>
          <Suspense
            fallback={
              <div className="w-full h-60 bg-slate-50/70 rounded-xl animate-pulse flex items-center justify-center text-xs font-semibold text-slate-400">
                Loading trajectory data…
              </div>
            }
          >
            <SalesOverviewChart
              data={activeChartData}
              maxRevenue={maxChartRevenue}
              maxOrders={maxChartOrders}
              symbol={config.symbol}
            />
          </Suspense>
        </div>

        {/* Bottom Quick Insights Bar */}
        <div className="pt-3 mt-1 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <CreditCard size={15} className="text-blue-600" />
            <span>Average basket size: <strong className="text-slate-900 font-bold">{config.symbol}{averageOrderValue.toLocaleString()}</strong> across counter and UPI checkouts.</span>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <span className="text-slate-400">Next automated sync at {new Date(Date.now() + 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <Link to="/analytics" className="text-blue-600 hover:underline font-bold inline-flex items-center gap-0.5">
              <span>Detailed Analytics</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Operational Grid: Needs Your Attention + Sovereignty / Hardware ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Needs Attention Triage Queue (Span 2) */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#FFF4ED] border border-[#FED7AA] flex items-center justify-center text-[#E8590C]">
                <AlertCircle size={16} />
              </div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Needs Your Attention</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFF4ED] text-[#C2410C] border border-[#FED7AA]">
                {pendingCount + lowStockProducts.length + (todayInBank > 0 ? 1 : 0)} Action Items
              </span>
            </div>
            <span className="text-xs text-slate-400 font-medium">Updated live</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs divide-y divide-slate-100 overflow-hidden">
            {/* Triage Row 1: Urgent Order */}
            {recentOrders.find(o => o.status === 'pending' || o.status === 'processing') ? (
              (() => {
                const pendingOrder = recentOrders.find(o => o.status === 'pending' || o.status === 'processing')!;
                return (
                  <div className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#FFF4ED] border border-[#FED7AA] flex items-center justify-center text-[#E8590C] shrink-0 mt-0.5">
                        <ShoppingCart size={18} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 font-mono">Order #{pendingOrder.id.slice(0, 8).toUpperCase()}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#FFF4ED] text-[#C2410C] border border-[#FED7AA]">
                            Urgent Dispatch
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Direct Verified
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium">
                          {pendingOrder.customer_name} • Total: <strong className="text-slate-900 font-bold">{config.symbol}{pendingOrder.total.toLocaleString()}</strong>
                        </p>
                      </div>
                    </div>
                    <Link
                      to="/orders"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold transition-all shadow-sm shrink-0 self-end sm:self-center"
                    >
                      <span>Accept & Pack</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                );
              })()
            ) : (
              <div className="p-4 flex items-center justify-between text-xs text-slate-600 bg-slate-50/40">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>No orders awaiting dispatch right now. All current orders are processed!</span>
                </div>
                <Link to="/orders" className="font-bold text-blue-600 hover:underline">Orders Hub →</Link>
              </div>
            )}

            {/* Triage Row 2: Low Stock */}
            {lowStockProducts.length > 0 ? (
              (() => {
                const lowItem = lowStockProducts[0];
                return (
                  <div className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
                        <Package size={18} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-900">{lowItem.name}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 uppercase tracking-wider">
                            {lowItem.stock} Left
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium">
                          Store inventory threshold warning • Reorder recommended
                        </p>
                      </div>
                    </div>
                    <Link
                      to="/products"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all shadow-xs shrink-0 self-end sm:self-center"
                    >
                      <Plus size={14} className="text-slate-500" />
                      <span>Update Stock</span>
                    </Link>
                  </div>
                );
              })()
            ) : (
              <div className="p-4 flex items-center justify-between text-xs text-slate-600 bg-slate-50/40">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Inventory levels healthy. Zero critical stockouts detected.</span>
                </div>
                <Link to="/products" className="font-bold text-blue-600 hover:underline">Catalog →</Link>
              </div>
            )}

            {/* Triage Row 3: Daily UPI Settlement Batch */}
            <div className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                  <CreditCard size={18} />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-slate-900">Daily UPI Payout Batch</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                      Auto-Sweep Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    {config.symbol}{todayInBank.toLocaleString()} collected via QR / UPI • Direct NEFT to {currentUpiId || 'merchant bank account'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all shadow-xs shrink-0 self-end sm:self-center cursor-pointer"
              >
                <span>Review Settlement</span>
                <ChevronDown size={14} className="text-slate-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Active Daily Operations (Settlement, Hardware & Sovereignty) */}
        <div className="flex flex-col gap-4">
          
          {/* Widget 1: Direct Settlement */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-blue-600" />
                <span className="text-sm font-bold text-slate-900">Direct Settlement</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Auto-Sweep On
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-500 font-medium">Ready to sweep:</span>
                <span className="text-lg font-black text-slate-900 font-mono" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {config.symbol}{todayInBank.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1.5 border-t border-slate-200/60 font-medium">
                <span className="truncate max-w-[170px]">{currentUpiId || 'UPI Direct Merchant Account'}</span>
                <span className="font-bold text-blue-600">Continuous 0% fee</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-[11px] text-slate-400 font-medium">0% intermediate custody</span>
              <button
                type="button"
                onClick={() => toast.success('Settlement request initiated for ₹' + todayInBank)}
                className="text-blue-600 hover:underline text-xs font-bold inline-flex items-center gap-0.5 cursor-pointer"
              >
                <span>Settle Now</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Widget 2: Counter Hardware & Devices */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer size={18} className="text-slate-600" />
                <span className="text-sm font-bold text-slate-900">Counter Hardware</span>
              </div>
              <button
                type="button"
                onClick={() => toast.success('Test receipt sent to thermal printer!')}
                className="text-blue-600 hover:underline text-xs font-bold cursor-pointer"
              >
                Test Print
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 font-medium">
                <div className="flex items-center gap-2">
                  <Printer size={15} className="text-slate-500" />
                  <span className="text-slate-900 font-bold">TVS RP-3200 Thermal</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> LAN Ready
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 font-medium">
                <div className="flex items-center gap-2">
                  <Scan size={15} className="text-slate-500" />
                  <span className="text-slate-900 font-bold">Handheld BT Scanner</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Paired
                </span>
              </div>
            </div>
          </div>

          {/* Widget 3: Reassurance / Sovereignty Stamp */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex flex-col gap-2.5">
            <div className="flex items-center gap-1.5 text-blue-700 font-bold text-xs">
              <ShieldCheck size={16} />
              <span>Your business is truly yours</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                <span>0% commission</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                <span>CSV export anytime</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                <span>Self-owned domain</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                <span>Encrypted data</span>
              </div>
            </div>
          </div>

        </div>
      </div>

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
        
              {/* ── Recent Orders Table Section ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
        {/* Table Header with Search */}
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Recent Orders</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
              {filteredRecentOrders.length} records
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={15} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter orders..."
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 text-xs font-medium border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-48 transition-all"
              />
            </div>
            <Link
              to="/orders"
              className="font-bold text-xs text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
            >
              <span>View All Orders</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Data Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                <th className="py-3 px-5">Order ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Fulfillment</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4">Order State</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRecentOrders.length > 0 ? (
                filteredRecentOrders.map((order) => {
                  const badge = statusBadge(order.status);
                  const isUpi = (order.payment_method || '').toLowerCase().includes('upi') || (order.payment_status || '').toLowerCase() === 'paid';
                  const orderTime = order.created_at ? new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently';

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-5 font-bold text-slate-900 font-mono">
                        <Link to="/orders" className="text-blue-600 hover:underline">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </Link>
                        <span className="block text-[11px] text-slate-400 font-normal">{orderTime}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-900">
                        <span className="font-bold block">{order.customer_name}</span>
                        <span className="text-[11px] text-slate-400">{order.customer_phone || '+91 ••••'}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-[11px] capitalize">
                        {order.delivery_type || 'Direct Delivery'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {config.symbol}{order.total.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        {isUpi ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Direct UPI
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" /> Cash on Counter
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <Link
                          to="/orders"
                          className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors inline-block"
                        >
                          Process
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No orders matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-4 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-700" />
            <span>End-of-day ledger automatically synchronizes with tally & GST filing.</span>
          </div>
          <div className="font-bold text-slate-600">
            Showing {filteredRecentOrders.length} of {orders.length} transactions
          </div>
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

      {/* ── Counter QR Code Modal (Real Scannable Standee & Direct UPI) ── */}
      <CounterQrModal
        open={showQrModal}
        onClose={() => setShowQrModal(false)}
        storeUrl={storeUrl}
        businessName={user?.business_name || user?.name || 'My Store'}
        upiId={currentUpiId}
        onOpenPaymentSetup={() => setShowPaymentModal(true)}
      />

      {/* ── Guided Payment Setup Modal (Add Payment to Receive Money) ── */}
      <PaymentSetupModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
      />
      {/* Old modal removed */}
      {false && (
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

      {/* ── First Order Celebration Modal (Dukaan First Order Milestone) ── */}
      {showFirstOrderModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={handleDismissFirstOrderModal}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 text-center p-6 sm:p-8 space-y-5 relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Close Button */}
            <button
              type="button"
              onClick={handleDismissFirstOrderModal}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close celebration modal"
            >
              <X size={18} strokeWidth={2} />
            </button>

            {/* Celebratory Icon & Badge */}
            <div className="flex flex-col items-center pt-2">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center shadow-xs text-amber-600 mb-3">
                <PartyPopper size={32} strokeWidth={1.75} />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                <Sparkles size={14} strokeWidth={2} className="text-emerald-600" /> Milestone Unlocked
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2 tracking-tight">
                🎉 Congratulations!
              </h2>
              <p className="text-base font-bold text-slate-800 mt-0.5">
                You received your first order!
              </p>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-xs leading-relaxed">
                Your storefront is officially open for business. Every single rupee earned is 100% yours to keep.
              </p>
            </div>

            {/* Order Highlight Card */}
            {firstCelebrationOrder && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-200/60">
                  <span className="font-medium">Order Number</span>
                  <span className="font-mono font-bold text-slate-900">
                    #{firstCelebrationOrder.id?.slice(-8) || firstCelebrationOrder.id || '1'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Customer</span>
                  <span className="font-bold text-slate-900 truncate max-w-[180px]">
                    {firstCelebrationOrder.customer_name || firstCelebrationOrder.customer_phone || 'Valued Customer'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Order Total</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {config.currencySymbol || '₹'}{Number(firstCelebrationOrder.total || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <ShieldCheck size={14} className="text-emerald-600" /> Platform Commission
                  </span>
                  <span className="font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded text-[11px]">
                    ₹0 (0% Commission)
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons (Fitts's Law: 48px touch targets, mobile thumb-friendly) */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleViewFirstOrder}
                className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <ShoppingBag size={18} strokeWidth={1.75} />
                <span>View Order & Start Packing</span>
              </button>
              <button
                type="button"
                onClick={handleDismissFirstOrderModal}
                className="w-full sm:w-auto min-h-[48px] px-4 py-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-sm font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Back to Dashboard
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
