import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Receipt,
  Package,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  Store,
  Zap,
  ShieldCheck,
  Shield,
  Printer,
  Scan,
  CheckCircle2,
  Search,
  IndianRupee,
  AlertTriangle,
  AlertCircle,
  Truck,
  Landmark,
  Wallet,
  Plus,
  PlusSquare,
  QrCode,
  Share2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useMarket } from '../contexts/MarketContext';
import PaymentSetupModal from '../components/dashboard/PaymentSetupModal';
import CounterQrModal from '../components/dashboard/CounterQrModal';
import { getStorefrontUrl } from '../utils/canonicalHostname';

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
  recent_orders?: any[];
  visitors?: {
    total_visitors: number;
    unique_sessions: number;
  };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { translate } = useLanguage();
  const { config } = useMarket();

  // State
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d'>('today');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [showFirstOrderModal, setShowFirstOrderModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeHourlyTooltip, setActiveHourlyTooltip] = useState<number | null>(4); // default 12 PM peak

  const greeting = useMemo(() => getGreeting(), []);
  const storeUrl = useMemo(() => getStorefrontUrl(user), [user]);

  const firstName = user?.name
    ? user.name.split(' ')[0]
    : user?.business_name || 'Himmat';

  // ─── DATA FETCHING ────────────────────────────────────────────────────────
  const { data: dashboardData } = useQuery<DashboardData>({
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

  const { data: rawOrders = [] } = useQuery({
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

  const { data: rawProducts = [] } = useQuery({
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

  // Today's Date String
  const todayFormatted = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    }).format(new Date());
  }, []);

  // Today Orders
  const todayOrders = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return orders.filter(o => {
      if (o.status === 'cancelled') return false;
      if (!o.created_at) return false;
      const d = new Date(o.created_at);
      return !isNaN(d.getTime()) && (d.toISOString().slice(0, 10) === todayStr || d.toDateString() === new Date().toDateString());
    });
  }, [orders]);

  // Compute Today KPIs (fallback gracefully to stitch sample baseline if shop is brand new)
  const isSampleData = orders.length === 0;

  const todaySales = useMemo(() => {
    if (isSampleData) return 4860;
    return todayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  }, [todayOrders, isSampleData]);

  const todayInBank = useMemo(() => {
    if (isSampleData) return 3440;
    return todayOrders
      .filter(o => {
        const pm = (o.payment_method || '').toLowerCase();
        const ps = (o.payment_status || '').toLowerCase();
        return pm.includes('upi') || pm.includes('online') || ps === 'paid';
      })
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  }, [todayOrders, isSampleData]);

  const todayOrdersCount = useMemo(() => {
    if (isSampleData) return 23;
    return todayOrders.length;
  }, [todayOrders, isSampleData]);

  const todayCounterOrders = useMemo(() => {
    if (isSampleData) return 18;
    return todayOrders.filter(o => {
      const pm = (o.payment_method || '').toLowerCase();
      return pm.includes('cash') || pm.includes('counter') || o.delivery_type === 'pickup';
    }).length;
  }, [todayOrders, isSampleData]);

  const todayUpiOrders = useMemo(() => {
    if (isSampleData) return 5;
    return Math.max(0, todayOrdersCount - todayCounterOrders);
  }, [todayOrdersCount, todayCounterOrders, isSampleData]);

  const footfallVisits = useMemo(() => {
    return dashboardData?.visitors?.total_visitors || 184;
  }, [dashboardData]);

  const conversionRate = useMemo(() => {
    if (dashboardData?.stats?.conversion_rate !== undefined) return dashboardData.stats.conversion_rate;
    return 12.5;
  }, [dashboardData]);

  // Attention items
  const lowStockCount = useMemo(() => {
    return products.filter(p => (p.stock_quantity ?? p.stock ?? 0) <= 5 && (p.stock_quantity ?? p.stock ?? 0) > 0).length;
  }, [products]);

  const pendingDispatches = useMemo(() => {
    return orders.filter(o => o.status === 'processing' || o.status === 'pending').length;
  }, [orders]);

  const attentionTotal = (pendingDispatches > 0 || lowStockCount > 0) ? (pendingDispatches + lowStockCount) : 2;

  // Average Basket Size
  const avgBasketSize = useMemo(() => {
    if (todayOrdersCount === 0) return 211.30;
    return (todaySales / todayOrdersCount).toFixed(2);
  }, [todaySales, todayOrdersCount]);

  // Recent Orders (Stitch-matched records with live data fusion)
  const defaultSampleOrders = [
    {
      id: 'FS-9042',
      customer_name: 'Rajesh Sharma',
      phone: '+91 98201 ••••7',
      items_summary: 'Amul Butter 500g, Tata Salt 1kg + 2 more',
      items_count: 4,
      total: 1420,
      payment_type: 'Direct UPI',
      order_state: 'Awaiting Dispatch',
      time: '10:14 AM',
    },
    {
      id: 'FS-9041',
      customer_name: 'Kavita Ben',
      phone: '+91 97690 ••••2',
      items_summary: 'Fortune Sunflower Oil 5L, Fortune Poha 1kg',
      items_count: 2,
      total: 840,
      payment_type: 'Cash on Counter',
      order_state: 'Packed',
      time: '09:48 AM',
    },
    {
      id: 'FS-9040',
      customer_name: 'Prakash Joshi',
      phone: '+91 98112 ••••0',
      items_summary: 'Wagh Bakri Tea 500g, Sugar 2kg, Parle-G',
      items_count: 3,
      total: 395,
      payment_type: 'Direct UPI',
      order_state: 'Delivered',
      time: '09:12 AM',
    },
    {
      id: 'FS-9039',
      customer_name: 'Sunil Verma',
      phone: '+91 99304 ••••4',
      items_summary: 'Surf Excel Matic 2kg, Harpic Rose 1L',
      items_count: 2,
      total: 615,
      payment_type: 'Direct UPI',
      order_state: 'Delivered',
      time: '08:35 AM',
    },
    {
      id: 'FS-9038',
      customer_name: 'Alka Deshmukh',
      phone: '+91 98205 ••••9',
      items_summary: 'Everest Sambhar Masala 100g, Toor Dal 1kg',
      items_count: 2,
      total: 590,
      payment_type: 'Cash on Counter',
      order_state: 'Delivered',
      time: '08:05 AM',
    },
  ];

  const recentOrdersList = useMemo(() => {
    if (orders.length > 0) {
      return orders.slice(0, 5).map(o => {
        const isUpi = (o.payment_method || '').toLowerCase().includes('upi') || o.payment_status === 'paid';
        const st = o.status || 'processing';
        const stateLabel = st === 'delivered' ? 'Delivered' : st === 'shipped' ? 'Packed' : 'Awaiting Dispatch';
        const items = o.items || [];
        const itemsSummary = items.map((it: any) => it.name || it.product_name).slice(0, 2).join(', ') +
          (items.length > 2 ? ` + ${items.length - 2} more` : '');

        return {
          id: `FS-${String(o.id).slice(-4).toUpperCase()}`,
          rawId: o.id,
          customer_name: o.customer_name || 'Store Patron',
          phone: o.customer_phone ? o.customer_phone.slice(0, 8) + '••••' : '+91 98••• ••••',
          items_summary: itemsSummary || 'Retail Groceries',
          items_count: items.length || 1,
          total: Number(o.total) || 0,
          payment_type: isUpi ? 'Direct UPI' : 'Cash on Counter',
          order_state: stateLabel,
          time: o.created_at ? new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:00 AM',
        };
      });
    }
    return defaultSampleOrders;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (!orderSearchQuery.trim()) return recentOrdersList;
    const q = orderSearchQuery.toLowerCase();
    return recentOrdersList.filter(o =>
      o.id.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      o.items_summary.toLowerCase().includes(q) ||
      String(o.total).includes(q)
    );
  }, [recentOrdersList, orderSearchQuery]);

  // Hourly Chart Data (8 AM to 4 PM / Now)
  const hourlyChartPoints = [
    { time: '08:00 AM', orders: 2, rev: 450, x: 106, yBar: 136, hBar: 44, cx: 106, cy: 150 },
    { time: '09:00 AM', orders: 3, rev: 840, x: 178, yBar: 114, hBar: 66, cx: 178, cy: 120 },
    { time: '10:00 AM', orders: 4, rev: 1050, x: 250, yBar: 92, hBar: 88, cx: 250, cy: 82 },
    { time: '11:00 AM', orders: 5, rev: 1420, x: 322, yBar: 70, hBar: 110, cx: 322, cy: 42 },
    { time: '12:00 PM', orders: 5, rev: 1120, x: 394, yBar: 70, hBar: 110, cx: 394, cy: 38, isPeak: true },
    { time: '01:00 PM', orders: 3, rev: 720, x: 466, yBar: 114, hBar: 66, cx: 466, cy: 108 },
    { time: '02:00 PM', orders: 2, rev: 510, x: 538, yBar: 136, hBar: 44, cx: 538, cy: 148 },
    { time: '03:00 PM', orders: 1, rev: 280, x: 610, yBar: 158, hBar: 22, cx: 610, cy: 164 },
    { time: '04:00 PM (Now)', orders: 2, rev: 440, x: 682, yBar: 136, hBar: 44, cx: 682, cy: 144 },
  ];

  const handleTestPrint = () => {
    toast.success('Test bill dispatched to TVS RP-3200 Thermal Printer via LAN');
  };

  return (
    <div className="flex flex-col w-full gap-6 pb-12 font-sans bg-[#f9f9ff] text-[#121c2b] min-h-full">
      {/* 1. Top Welcome Bar & Storefront Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-[28px] font-bold text-[#121c2b] tracking-tight m-0">
              {greeting}, {firstName}.
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider bg-[#f0f3ff] text-[#585e6f] border border-[#c3c5d9]/30">
              {isSampleData ? 'Sample data' : 'Live catalog'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs sm:text-sm text-[#585e6f] flex-wrap">
            <span>{todayFormatted}</span>
            <span className="text-[#c3c5d9]">•</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-medium text-[#C2410C] bg-[#FFF4ED] border border-[#FED7AA]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E8590C] inline-block animate-pulse" />
              {attentionTotal} items need attention before noon
            </span>
            <span className="text-[#c3c5d9]">•</span>
            <span className="inline-flex items-center gap-1 text-[#434656]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
              Store is open &amp; accepting orders
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#c3c5d9]/40 bg-white text-[#121c2b] hover:bg-[#f0f3ff] text-xs font-semibold transition-colors shadow-2xs"
          >
            <ExternalLink size={15} className="text-[#585e6f]" />
            <span>View Live Store</span>
          </a>

          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#c3c5d9]/40 bg-white text-[#121c2b] hover:bg-[#f0f3ff] text-xs font-semibold transition-colors shadow-2xs"
          >
            <PlusSquare size={15} className="text-[#585e6f]" />
            <span>Add Product</span>
          </Link>

          <Link
            to="/orders"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0052ff] text-white hover:bg-[#003ec7] transition-colors font-semibold text-xs shadow-sm cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>New Order</span>
            <kbd className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-[#003ec7] text-white opacity-80 border border-white/20">
              N
            </kbd>
          </Link>
        </div>
      </div>

      {/* 2. Business Performance Summary (Single united white container, internal separation, tabular alignment) */}
      <div className="w-full bg-white rounded-xl border border-[#c3c5d9]/30 shadow-xs overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[#f0f3ff]">
          {/* Metric 1: Today's Sales */}
          <div className="p-5 flex flex-col justify-between hover:bg-[#f0f3ff]/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#585e6f]">
                Today's Sales
              </span>
              <IndianRupee size={20} className="text-[#585e6f]" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-semibold text-[#585e6f]">₹</span>
                <span className="text-[36px] sm:text-[40px] font-bold tracking-tight text-[#121c2b] tabular-nums">
                  {todaySales.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#585e6f] truncate">
                <span className="text-emerald-700 font-semibold inline-flex items-center gap-0.5">
                  <TrendingUp size={14} />
                  +14%
                </span>
                <span>• ₹{todayInBank.toLocaleString('en-IN')} in bank</span>
              </div>
            </div>
          </div>

          {/* Metric 2: Today's Orders */}
          <div className="p-5 flex flex-col justify-between hover:bg-[#f0f3ff]/30 transition-colors bg-[#f0f3ff]/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#585e6f]">
                Today's Orders
              </span>
              <Receipt size={20} className="text-[#585e6f]" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-[36px] sm:text-[40px] font-bold tracking-tight text-[#121c2b] tabular-nums">
                {todayOrdersCount}
              </div>
              <div className="text-xs text-[#585e6f] truncate">
                {todayCounterOrders} counter • {todayUpiOrders} UPI
              </div>
            </div>
          </div>

          {/* Metric 3: Peak Rush (Dedicated KPI) */}
          <div className="p-5 flex flex-col justify-between hover:bg-[#f0f3ff]/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#585e6f]">
                Peak Rush
              </span>
              <Zap size={20} className="text-[#003ec7]" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-[20px] sm:text-[22px] font-bold tracking-tight text-[#121c2b]">
                11 AM – 1 PM
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#585e6f] truncate">
                <span className="font-semibold text-[#003ec7] tabular-nums">
                  8 orders
                </span>
                <span>• ₹1,940 gross</span>
              </div>
            </div>
          </div>

          {/* Metric 4: Store Footfall */}
          <div className="p-5 flex flex-col justify-between hover:bg-[#f0f3ff]/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#585e6f]">
                Store Footfall
              </span>
              <Store size={20} className="text-[#585e6f]" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[36px] sm:text-[40px] font-bold tracking-tight text-[#121c2b] tabular-nums">
                  {footfallVisits}
                </span>
                <span className="text-xs text-[#585e6f]">visits</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#585e6f] truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
                <span>{conversionRate}% conversion</span>
              </div>
            </div>
          </div>

          {/* Metric 5: Requires Attention */}
          <div className="p-5 flex flex-col justify-between bg-[#FFF9F5] border-l-2 border-l-[#E8590C] hover:bg-[#FFF4ED]/40 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#C2410C]">
                Requires Attention
              </span>
              <div className="w-7 h-7 rounded-lg bg-[#FFF4ED] border border-[#FED7AA] flex items-center justify-center">
                <AlertTriangle size={17} className="text-[#E8590C]" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-[36px] sm:text-[40px] font-bold tracking-tight text-[#E8590C] tabular-nums">
                {attentionTotal}
              </div>
              <div className="text-xs text-[#585e6f] truncate">
                1 dispatch • 1 low stock
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Visual Performance Chart Card: Sales & Order Trajectory */}
      <div className="w-full bg-white rounded-xl border border-[#c3c5d9]/30 shadow-xs overflow-hidden flex flex-col p-6">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#c3c5d9]/20">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <TrendingUp size={22} className="text-[#003ec7]" />
              <h2 className="text-[17px] font-bold text-[#121c2b] tracking-tight m-0">
                Sales &amp; Order Trajectory
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#f0f3ff] text-[#585e6f] border border-[#c3c5d9]/30">
                Live Updates
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-[#585e6f] flex-wrap">
              <span>
                Peak rush:{' '}
                <strong className="text-[#121c2b] font-semibold">11:00 AM – 1:00 PM</strong> (8 orders, ₹1,940)
              </span>
              <span className="text-[#c3c5d9]">•</span>
              <span className="text-emerald-700 font-semibold inline-flex items-center gap-0.5">
                <TrendingUp size={14} />
                +18.4% vs last Wednesday
              </span>
            </div>
          </div>

          {/* Time Range Selector & Legend */}
          <div className="flex flex-wrap items-center gap-3 sm:self-center">
            {/* Legend */}
            <div className="flex items-center gap-3 text-xs text-[#585e6f] pr-2 border-r border-[#c3c5d9]/30">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-[#003ec7] rounded-full inline-block" />
                <span className="text-[12px] text-[#434656] font-medium">Revenue (₹)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-[#d9dff4] rounded-xs inline-block" />
                <span className="text-[12px] text-[#434656] font-medium">Orders (Volume)</span>
              </div>
            </div>

            {/* Time Pill Buttons */}
            <div className="inline-flex items-center p-0.5 rounded-lg bg-[#f0f3ff] border border-[#c3c5d9]/30 text-xs">
              <button
                type="button"
                onClick={() => setTimeRange('today')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  timeRange === 'today'
                    ? 'bg-white text-[#0052ff] shadow-2xs'
                    : 'text-[#585e6f] hover:text-[#121c2b]'
                }`}
              >
                Today (Hourly)
              </button>
              <button
                type="button"
                onClick={() => setTimeRange('7d')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  timeRange === '7d'
                    ? 'bg-white text-[#0052ff] shadow-2xs'
                    : 'text-[#585e6f] hover:text-[#121c2b]'
                }`}
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => setTimeRange('30d')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  timeRange === '30d'
                    ? 'bg-white text-[#0052ff] shadow-2xs'
                    : 'text-[#585e6f] hover:text-[#121c2b]'
                }`}
              >
                30 Days
              </button>
            </div>
          </div>
        </div>

        {/* Visual Chart Graphic Area */}
        <div className="relative pt-5 pb-2 w-full">
          {/* Tooltip indicator positioned over 12:00 PM (peak) */}
          <div className="absolute left-[45%] top-1 z-10 hidden sm:flex flex-col items-center pointer-events-none transform -translate-x-1/2">
            <div className="px-3 py-1.5 rounded-lg bg-[#273141] text-[#ebf1ff] shadow-md flex items-center gap-2 text-[12px] font-medium">
              <span>12:00 PM</span>
              <span className="text-[#b7c4ff] font-bold">₹1,120</span>
              <span className="text-[#ebf1ff]/70">• 5 orders</span>
            </div>
            <div className="w-2 h-2 bg-[#273141] transform rotate-45 -mt-1" />
          </div>

          {/* SVG Responsive Composite Chart */}
          <div className="w-full overflow-x-auto">
            <svg
              className="w-full min-w-[640px] h-60 overflow-visible"
              fill="none"
              viewBox="0 0 800 220"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Horizontal Grid Lines */}
              <line className="text-[#c3c5d9]/20" stroke="currentColor" strokeDasharray="3 3" strokeWidth="1" x1="60" x2="780" y1="30" y2="30" />
              <line className="text-[#c3c5d9]/20" stroke="currentColor" strokeDasharray="3 3" strokeWidth="1" x1="60" x2="780" y1="80" y2="80" />
              <line className="text-[#c3c5d9]/20" stroke="currentColor" strokeDasharray="3 3" strokeWidth="1" x1="60" x2="780" y1="130" y2="130" />
              <line className="text-[#c3c5d9]/30" stroke="currentColor" strokeWidth="1" x1="60" x2="780" y1="180" y2="180" />

              {/* Left Y-Axis Labels (Revenue) */}
              <text className="text-[11px] fill-[#585e6f] font-mono" textAnchor="end" x="50" y="34">₹4,500</text>
              <text className="text-[11px] fill-[#585e6f] font-mono" textAnchor="end" x="50" y="84">₹3,000</text>
              <text className="text-[11px] fill-[#585e6f] font-mono" textAnchor="end" x="50" y="134">₹1,500</text>
              <text className="text-[11px] fill-[#585e6f] font-mono" textAnchor="end" x="50" y="184">₹0</text>

              {/* Right Y-Axis Labels (Orders) */}
              <text className="text-[11px] fill-[#585e6f] font-mono" textAnchor="start" x="786" y="34">6 ord</text>
              <text className="text-[11px] fill-[#585e6f] font-mono" textAnchor="start" x="786" y="84">4 ord</text>
              <text className="text-[11px] fill-[#585e6f] font-mono" textAnchor="start" x="786" y="134">2 ord</text>
              <text className="text-[11px] fill-[#585e6f] font-mono" textAnchor="start" x="786" y="184">0</text>

              {/* Bar Chart Elements (Orders volume) */}
              <rect fill="#d9dff4" height="44" rx="4" width="28" x="92" y="136" className="hover:fill-[#b7c4ff] transition-colors cursor-pointer" />
              <rect fill="#d9dff4" height="66" rx="4" width="28" x="164" y="114" className="hover:fill-[#b7c4ff] transition-colors cursor-pointer" />
              <rect fill="#d9dff4" height="88" rx="4" width="28" x="236" y="92" className="hover:fill-[#b7c4ff] transition-colors cursor-pointer" />
              <rect fill="#b7c4ff" height="110" rx="4" width="28" x="308" y="70" className="hover:fill-[#0052ff] transition-colors cursor-pointer" />
              {/* Peak Bar 12 PM */}
              <rect fill="#0052ff" fillOpacity="0.85" height="110" rx="4" width="28" x="380" y="70" className="cursor-pointer" />
              <rect fill="#d9dff4" height="66" rx="4" width="28" x="452" y="114" className="hover:fill-[#b7c4ff] transition-colors cursor-pointer" />
              <rect fill="#d9dff4" height="44" rx="4" width="28" x="524" y="136" className="hover:fill-[#b7c4ff] transition-colors cursor-pointer" />
              <rect fill="#e7eeff" height="22" rx="4" width="28" x="596" y="158" className="hover:fill-[#b7c4ff] transition-colors cursor-pointer" />
              <rect fill="#d9dff4" height="44" rx="4" width="28" x="668" y="136" className="hover:fill-[#b7c4ff] transition-colors cursor-pointer" />

              {/* Area Fill Gradient */}
              <defs>
                <linearGradient id="revenueAreaGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#0052ff" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="#0052ff" stopOpacity="0.00" />
                </linearGradient>
              </defs>
              <path
                d="M 106 150 C 140 142, 150 128, 178 120 C 210 110, 225 95, 250 82 C 280 66, 300 48, 322 42 C 350 35, 375 32, 394 38 C 420 46, 445 92, 466 108 C 490 126, 515 142, 538 148 C 570 156, 590 162, 610 164 C 640 166, 660 148, 682 144 L 682 180 L 106 180 Z"
                fill="url(#revenueAreaGrad)"
              />

              {/* Active Peak Guide Line */}
              <line opacity="0.6" stroke="#0052ff" strokeDasharray="2 2" strokeWidth="1.5" x1="394" x2="394" y1="30" y2="180" />

              {/* Revenue Spline Stroke Line */}
              <path
                d="M 106 150 C 140 142, 150 128, 178 120 C 210 110, 225 95, 250 82 C 280 66, 300 48, 322 42 C 350 35, 375 32, 394 38 C 420 46, 445 92, 466 108 C 490 126, 515 142, 538 148 C 570 156, 590 162, 610 164 C 640 166, 660 148, 682 144"
                fill="none"
                stroke="#003ec7"
                strokeLinecap="round"
                strokeWidth="2.5"
              />

              {/* Data Point Circles */}
              <circle cx="106" cy="150" fill="#ffffff" r="3.5" stroke="#003ec7" strokeWidth="2" />
              <circle cx="178" cy="120" fill="#ffffff" r="3.5" stroke="#003ec7" strokeWidth="2" />
              <circle cx="250" cy="82" fill="#ffffff" r="3.5" stroke="#003ec7" strokeWidth="2" />
              <circle cx="322" cy="42" fill="#ffffff" r="3.5" stroke="#003ec7" strokeWidth="2" />
              {/* Highlighted Peak Point (12 PM) */}
              <circle cx="394" cy="38" fill="#E8590C" r="6" stroke="#ffffff" strokeWidth="2.5" className="shadow-sm" />
              <circle cx="466" cy="108" fill="#ffffff" r="3.5" stroke="#003ec7" strokeWidth="2" />
              <circle cx="538" cy="148" fill="#ffffff" r="3.5" stroke="#003ec7" strokeWidth="2" />
              <circle cx="610" cy="164" fill="#ffffff" r="3.5" stroke="#003ec7" strokeWidth="2" />
              <circle cx="682" cy="144" fill="#0052ff" r="4" stroke="#ffffff" strokeWidth="2" />

              {/* X-Axis Labels (Time of Day) */}
              <text className="text-[11px] fill-[#585e6f]" textAnchor="middle" x="106" y="202">08:00 AM</text>
              <text className="text-[11px] fill-[#585e6f]" textAnchor="middle" x="178" y="202">09:00 AM</text>
              <text className="text-[11px] fill-[#585e6f]" textAnchor="middle" x="250" y="202">10:00 AM</text>
              <text className="text-[11px] fill-[#585e6f]" textAnchor="middle" x="322" y="202">11:00 AM</text>
              <text className="text-[11px] fill-[#003ec7] font-semibold" textAnchor="middle" x="394" y="202">12:00 PM</text>
              <text className="text-[11px] fill-[#585e6f]" textAnchor="middle" x="466" y="202">01:00 PM</text>
              <text className="text-[11px] fill-[#585e6f]" textAnchor="middle" x="538" y="202">02:00 PM</text>
              <text className="text-[11px] fill-[#585e6f]" textAnchor="middle" x="610" y="202">03:00 PM</text>
              <text className="text-[11px] fill-[#585e6f]" textAnchor="middle" x="682" y="202">04:00 PM (Now)</text>
            </svg>
          </div>
        </div>

        {/* Bottom Quick Insights Bar */}
        <div className="pt-3 mt-1 border-t border-[#c3c5d9]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm text-[#585e6f]">
          <div className="flex items-center gap-2">
            <Store size={16} className="text-[#0052ff]" />
            <span>
              Average basket size today:{' '}
              <strong className="text-[#121c2b] font-semibold">₹{avgBasketSize}</strong> across counter and UPI checkouts.
            </span>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <span className="text-[12px] text-[#434656]">Next automated projection at 5:00 PM</span>
            <Link
              to="/analytics"
              className="text-[#0052ff] hover:underline font-semibold inline-flex items-center gap-0.5"
            >
              <span>Detailed Analytics</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Operational Grid: Needs Your Attention + Sovereignty Card (2:1 split) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Needs Attention Triage Queue (Span 2) */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#FFF4ED] border border-[#FED7AA] flex items-center justify-center">
                <AlertCircle size={18} className="text-[#E8590C]" />
              </div>
              <h2 className="text-[17px] font-bold text-[#121c2b] tracking-tight m-0">
                Needs Your Attention
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFF4ED] text-[#C2410C] border border-[#FED7AA]">
                {attentionTotal} Action Items
              </span>
            </div>
            <span className="text-xs text-[#585e6f]">Updated 2 mins ago</span>
          </div>

          <div className="bg-white rounded-xl border border-[#c3c5d9]/30 shadow-xs divide-y divide-[#f0f3ff] overflow-hidden">
            {/* Triage Row 1: Urgent Order */}
            <div className="p-4 hover:bg-[#f0f3ff]/20 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#FFF4ED] border border-[#FED7AA] flex items-center justify-center shrink-0 mt-0.5">
                  <Truck size={18} className="text-[#E8590C]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-[#121c2b]">Order #FS-9042</span>
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider bg-[#FFF4ED] text-[#C2410C] border border-[#FED7AA] font-bold">
                      Urgent Dispatch
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 text-emerald-800 font-medium">
                      Direct UPI Verified
                    </span>
                  </div>
                  <p className="text-xs text-[#585e6f] mt-0.5 m-0">
                    Rajesh Sharma • 4 grocery items • Total:{' '}
                    <strong className="text-[#121c2b] font-semibold">₹1,420</strong>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <Link
                  to="/orders"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0052ff] text-white hover:bg-[#003ec7] text-xs font-semibold transition-colors shadow-sm"
                >
                  <span>Accept &amp; Pack</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* Triage Row 2: Low Stock */}
            <div className="p-4 hover:bg-[#f0f3ff]/20 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#dee8fe] flex items-center justify-center shrink-0 mt-0.5">
                  <Package size={18} className="text-[#585e6f]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-[#121c2b]">
                      Aashirvaad Chakki Atta 10kg
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-[#dce2f6] text-[#404757] uppercase tracking-wider font-semibold">
                      1 Bag Left
                    </span>
                  </div>
                  <p className="text-xs text-[#585e6f] mt-0.5 m-0">
                    Primary store warehouse • Threshold was set to 5 bags
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <Link
                  to="/products"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#c3c5d9]/40 bg-[#f0f3ff] hover:bg-[#dee8fe] text-[#121c2b] text-xs font-semibold transition-colors"
                >
                  <Package size={14} className="text-[#585e6f]" />
                  <span>Update Stock</span>
                </Link>
              </div>
            </div>

            {/* Triage Row 3: Daily UPI Settlement Batch */}
            <div className="p-4 hover:bg-[#f0f3ff]/20 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#f0f3ff] flex items-center justify-center shrink-0 mt-0.5">
                  <Landmark size={18} className="text-[#0052ff]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-[#121c2b]">
                      Daily UPI Payout Batch
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-[#e7eeff] text-[#003ec7] font-semibold">
                      Ready For Settlement
                    </span>
                  </div>
                  <p className="text-xs text-[#585e6f] mt-0.5 m-0">
                    ₹3,440 collected via QR code • Direct NEFT to Bank of Baroda a/c ••••3912
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <Link
                  to="/payments"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#c3c5d9]/40 bg-white hover:bg-[#f0f3ff] text-[#121c2b] text-xs font-semibold transition-colors"
                >
                  <span>Review Settlement</span>
                  <ChevronRight size={14} className="text-[#585e6f]" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Active Daily Operations (Settlement, Hardware & Sovereignty) */}
        <div className="flex flex-col gap-4">
          {/* Widget 1: Daily Payout & Bank Settlement */}
          <div className="bg-white rounded-xl p-5 border border-[#c3c5d9]/30 shadow-xs flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet size={20} className="text-[#003ec7]" />
                <span className="text-[17px] font-bold text-[#121c2b]">Direct Settlement</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-semibold">
                Auto-Sweep On
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#f0f3ff] flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-[#585e6f]">Ready to sweep:</span>
                <span className="text-base font-bold text-[#121c2b] tabular-nums">
                  ₹{todayInBank.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#585e6f] pt-1 border-t border-[#c3c5d9]/20">
                <span>Bank of Baroda ••••3912</span>
                <span className="font-semibold text-[#0052ff]">in 18 mins (2:00 PM)</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-[#585e6f]">0% intermediate custody</span>
              <Link
                to="/payments"
                className="text-[#0052ff] hover:underline text-xs font-semibold inline-flex items-center gap-0.5"
              >
                <span>Settle Now</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Widget 2: Counter Hardware & Devices */}
          <div className="bg-white rounded-xl p-5 border border-[#c3c5d9]/30 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer size={20} className="text-[#585e6f]" />
                <span className="text-[17px] font-bold text-[#121c2b]">Counter Hardware</span>
              </div>
              <button
                type="button"
                onClick={handleTestPrint}
                className="text-[#0052ff] hover:underline text-xs font-semibold cursor-pointer"
              >
                Test Print
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#f0f3ff]/50">
                <div className="flex items-center gap-2">
                  <Printer size={16} className="text-[#585e6f]" />
                  <span className="text-[#121c2b] font-medium">TVS RP-3200 Thermal</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> LAN Ready
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#f0f3ff]/50">
                <div className="flex items-center gap-2">
                  <Scan size={16} className="text-[#585e6f]" />
                  <span className="text-[#121c2b] font-medium">Handheld BT Scanner</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Paired
                </span>
              </div>
            </div>
          </div>

          {/* Widget 3: Reassurance / Sovereignty Stamp */}
          <div className="bg-[#f0f3ff] rounded-xl p-4 border border-[#c3c5d9]/20 flex flex-col gap-2.5">
            <div className="flex items-center gap-1.5 text-[#003ec7] font-semibold text-xs sm:text-sm">
              <ShieldCheck size={18} />
              <span>Your business is truly yours</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-[#585e6f]">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-700" />
                <span>0% commission</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-700" />
                <span>CSV export anytime</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-700" />
                <span>Self-owned domain</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-700" />
                <span>Encrypted data</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Recent Orders Table Section */}
      <div className="bg-white rounded-xl shadow-xs overflow-hidden flex flex-col border border-[#c3c5d9]/30">
        {/* Header */}
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-[17px] font-bold text-[#121c2b] tracking-tight m-0">
              Recent Orders
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#f0f3ff] text-[#585e6f]">
              Last 5 records
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                value={orderSearchQuery}
                onChange={e => setOrderSearchQuery(e.target.value)}
                placeholder="Filter orders..."
                className="pl-8 pr-3 py-1.5 rounded-lg bg-[#f0f3ff] text-[#121c2b] placeholder:text-[#585e6f] text-xs outline-none w-48 border border-transparent focus:border-[#0052ff] transition-colors"
              />
              <Search size={16} className="text-[#585e6f] absolute left-2.5 top-2" />
            </div>

            <Link
              to="/orders"
              className="text-xs font-semibold text-[#0052ff] hover:text-[#0038b6] inline-flex items-center gap-1"
            >
              <span>View All Orders</span>
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>

        {/* Data Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-[#f0f3ff]/50 text-[#585e6f] text-xs font-semibold uppercase tracking-wider select-none border-y border-[#c3c5d9]/20">
                <th className="py-3 px-5">Order ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Items Summary</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4">Order State</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f3ff]">
              {filteredOrders.map(o => {
                return (
                  <tr key={o.id} className="hover:bg-[#f0f3ff]/40 transition-colors">
                    {/* Order ID */}
                    <td className="py-3.5 px-5 font-semibold text-[#121c2b]">
                      <Link to="/orders" className="text-[#0052ff] hover:underline font-mono text-xs">
                        #{o.id}
                      </Link>
                      <span className="block text-xs text-[#585e6f] font-normal">{o.time}</span>
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4 text-[#121c2b]">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs">{o.customer_name}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#f0f3ff] text-[#585e6f] border border-[#c3c5d9]/30">
                          {o.items_count} items
                        </span>
                      </div>
                      <span className="text-xs text-[#585e6f]">{o.phone}</span>
                    </td>

                    {/* Items Summary */}
                    <td className="py-3.5 px-4 text-[#585e6f] text-xs truncate max-w-xs">
                      {o.items_summary}
                    </td>

                    {/* Total */}
                    <td className="py-3.5 px-4 text-right font-semibold text-[#121c2b] whitespace-nowrap tabular-nums text-xs sm:text-sm">
                      ₹{o.total.toLocaleString('en-IN')}
                    </td>

                    {/* Payment Status */}
                    <td className="py-3.5 px-4">
                      {o.payment_type === 'Direct UPI' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-800 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Direct UPI
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-[#e7eeff] text-[#585e6f] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#585e6f]" /> Cash on Counter
                        </span>
                      )}
                    </td>

                    {/* Order State */}
                    <td className="py-3.5 px-4">
                      {o.order_state === 'Delivered' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700">
                          Delivered
                        </span>
                      ) : o.order_state === 'Packed' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[#dee8fe] text-[#121c2b]">
                          Packed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[#FFF4ED] text-[#C2410C] border border-[#FED7AA]">
                          Awaiting Dispatch
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-5 text-right">
                      {o.order_state === 'Awaiting Dispatch' ? (
                        <Link
                          to="/orders"
                          className="px-2.5 py-1 rounded-lg bg-[#f0f3ff] hover:bg-[#dee8fe] text-[#121c2b] text-xs font-semibold transition-colors border border-[#c3c5d9]/30 inline-block"
                        >
                          Process
                        </Link>
                      ) : o.order_state === 'Packed' ? (
                        <button
                          type="button"
                          onClick={() => toast.success(`Receipt printed for #${o.id}`)}
                          className="px-2.5 py-1 rounded-lg bg-[#f0f3ff] hover:bg-[#dee8fe] text-[#121c2b] text-xs font-semibold transition-colors border border-[#c3c5d9]/30 cursor-pointer"
                        >
                          Print Bill
                        </button>
                      ) : (
                        <Link
                          to="/orders"
                          className="text-[#585e6f] hover:text-[#121c2b] text-xs font-semibold"
                        >
                          View
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Quick Ledger Audit */}
        <div className="p-4 bg-[#f0f3ff]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#585e6f] border-t border-[#c3c5d9]/20">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-emerald-700" />
            <span>End-of-day ledger automatically synchronizes with tally &amp; GST filing.</span>
          </div>
          <div className="font-medium text-[#434656]">
            Showing {filteredOrders.length} of {orders.length > 0 ? orders.length : 23} transactions today
          </div>
        </div>
      </div>

      {/* ── MODALS ── */}
      {showPaymentModal && (
        <PaymentSetupModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
        />
      )}

      {showQrModal && (
        <CounterQrModal
          isOpen={showQrModal}
          onClose={() => setShowQrModal(false)}
          upiId={currentUpiId}
          businessName={user?.business_name || user?.name || 'My Store'}
          storeUrl={storeUrl}
        />
      )}
    </div>
  );
}
