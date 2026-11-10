import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Zap,
  Plus,
  FileText,
  Send,
  Sparkles,
  ShieldCheck,
  Check,
  X,
  ExternalLink,
  Sun,
  Moon,
  Coffee,
  Package,
  Share2,
  Store,
  RotateCcw,
  ShoppingBag,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface RealOrderItem {
  product_id?: string;
  productId?: string;
  product_name?: string;
  name?: string;
  quantity: number;
  price: number;
}

export interface RealOrder {
  id: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  items?: RealOrderItem[];
  items_count?: number;
  total?: number;
  status: string;
  payment_status?: string;
  payment_method?: string;
  delivery_type?: 'delivery' | 'pickup';
  invoice_number?: string;
  created_at: string;
  updated_at?: string;
}

export interface RealProduct {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  category?: string;
  is_active?: boolean | number;
}

export interface OperationsDashboardProps {
  orders: RealOrder[];
  products: RealProduct[];
  dashboardData?: any;
  user?: any;
  storeUrl?: string;
  merchantName?: string;
  storeName?: string;
  isLoading?: boolean;
  onOpenNewOrderModal?: () => void;
  onOpenInvoiceModal?: () => void;
  onOpenQrModal?: () => void;
  onUpdateOrderStatus?: (orderId: string, newStatus: string) => Promise<void> | void;
  onUpdatePaymentStatus?: (orderId: string, newPaymentStatus: string) => Promise<void> | void;
}

// ============================================================================
// HELPER UTILITIES
// ============================================================================

function formatInr(num: number): string {
  return '₹' + Math.round(num).toLocaleString('en-IN');
}

function timeAgo(dateString: string): string {
  if (!dateString) return 'Just now';
  const now = Date.now();
  const date = new Date(dateString).getTime();
  if (isNaN(date)) return 'Recently';

  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function isToday(dateString: string): boolean {
  if (!dateString) return false;
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return false;
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function OperationsDashboard({
  orders = [],
  products = [],
  dashboardData,
  user,
  storeUrl = '',
  merchantName = 'Merchant',
  storeName = 'My Store',
  isLoading = false,
  onOpenNewOrderModal,
  onOpenInvoiceModal,
  onOpenQrModal,
  onUpdateOrderStatus,
  onUpdatePaymentStatus,
}: OperationsDashboardProps) {
  // ── States ────────────────────────────────────────────────────────────────
  const [localOrders, setLocalOrders] = useState<RealOrder[]>(orders);
  const [activeTab, setActiveTab] = useState<'all' | 'needs_packing' | 'pay_later' | 'settled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d'>('today');
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isAllCaughtUpManualPreview, setIsAllCaughtUpManualPreview] = useState<boolean>(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);
  const [commandSearch, setCommandSearch] = useState<string>('');
  const [activeCommandIndex, setActiveCommandIndex] = useState<number>(0);
  const [inspectedOrder, setInspectedOrder] = useState<RealOrder | null>(null);

  // Sync prop changes
  useEffect(() => {
    setLocalOrders(orders);
  }, [orders]);

  // Optimistic Undo Toast State
  const [toastNotification, setToastNotification] = useState<{
    id: string;
    message: string;
    undoAction?: () => void;
  } | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string, undoAction?: () => void) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    const id = Math.random().toString(36).substring(2, 9);
    setToastNotification({ id, message, undoAction });
    toastTimerRef.current = setTimeout(() => {
      setToastNotification(null);
    }, 4500);
  }, []);

  // ── Keyboard Shortcuts (⌘K, C, I, Esc) ────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      if (e.key === 'Escape') {
        if (commandPaletteOpen) {
          e.preventDefault();
          setCommandPaletteOpen(false);
        } else if (inspectedOrder) {
          e.preventDefault();
          setInspectedOrder(null);
        }
        return;
      }

      if (!isInput && !commandPaletteOpen && !inspectedOrder) {
        if (e.key.toLowerCase() === 'c') {
          e.preventDefault();
          onOpenNewOrderModal?.();
        } else if (e.key.toLowerCase() === 'i') {
          e.preventDefault();
          onOpenInvoiceModal?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, inspectedOrder, onOpenNewOrderModal, onOpenInvoiceModal]);

  // ── REAL METRICS COMPUTATION (ZERO FAKE NUMBERS) ──────────────────────────

  // Today's real orders
  const todayOrders = useMemo(() => {
    return localOrders.filter((o) => {
      if (o.status === 'cancelled') return false;
      return isToday(o.created_at);
    });
  }, [localOrders]);

  // Real collected revenue
  const totalCollectedToday = useMemo(() => {
    return todayOrders.reduce((sum, o) => {
      const isPaid = (o.payment_status || '').toLowerCase() === 'paid';
      const isDelivered = (o.status || '').toLowerCase() === 'delivered';
      const isOnline = (o.payment_method || '').toLowerCase().includes('upi') ||
                       (o.payment_method || '').toLowerCase().includes('online');
      if (isPaid || isDelivered || isOnline) {
        return sum + (Number(o.total) || 0);
      }
      return sum;
    }, 0);
  }, [todayOrders]);

  // Real Needs Packing queue
  const needsPackingOrders = useMemo(() => {
    return localOrders.filter((o) => {
      const s = (o.status || '').toLowerCase();
      return (s === 'pending' || s === 'confirmed' || s === 'preparing') && s !== 'cancelled';
    });
  }, [localOrders]);

  // Real Khata / Pay-Later pending dues
  const payLaterOrders = useMemo(() => {
    return localOrders.filter((o) => {
      if (o.status === 'cancelled') return false;
      const pm = (o.payment_method || '').toLowerCase();
      const ps = (o.payment_status || '').toLowerCase();
      return pm.includes('khata') || pm.includes('credit') || pm.includes('pay_later') || ps === 'pending';
    });
  }, [localOrders]);

  const totalCreditDue = useMemo(() => {
    return payLaterOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  }, [payLaterOrders]);

  // Real Settled orders
  const settledOrders = useMemo(() => {
    return localOrders.filter((o) => {
      const ps = (o.payment_status || '').toLowerCase();
      const s = (o.status || '').toLowerCase();
      return ps === 'paid' || s === 'delivered';
    });
  }, [localOrders]);

  // Real Low Stock items from catalog
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => Number(p.stock_quantity) <= 5 && p.stock_quantity !== undefined);
  }, [products]);

  // Real Dynamic Hourly Pulse from actual orders
  const hourlyPulseData = useMemo(() => {
    // Slices for today
    const slots = [
      { label: '08:00', startH: 6, endH: 9 },
      { label: '10:00', startH: 9, endH: 11 },
      { label: '12:00', startH: 11, endH: 13 },
      { label: '14:00', startH: 13, endH: 15 },
      { label: '16:00', startH: 15, endH: 17 },
      { label: '18:00', startH: 17, endH: 19 },
      { label: '20:00', startH: 19, endH: 22 },
    ];

    return slots.map((slot) => {
      let settled = 0;
      let pending = 0;
      let count = 0;

      todayOrders.forEach((o) => {
        const d = new Date(o.created_at);
        const h = d.getHours();
        if (h >= slot.startH && h < slot.endH) {
          count++;
          const amt = Number(o.total) || 0;
          const isPaid = (o.payment_status || '').toLowerCase() === 'paid' ||
                         (o.status || '').toLowerCase() === 'delivered';
          if (isPaid) {
            settled += amt;
          } else {
            pending += amt;
          }
        }
      });

      return {
        slot: slot.label,
        settledAmount: settled,
        pendingAmount: pending,
        orderCount: count,
      };
    });
  }, [todayOrders]);

  const maxChartVal = useMemo(() => {
    const maxVal = Math.max(
      ...hourlyPulseData.map((d) => d.settledAmount + d.pendingAmount),
      1000
    );
    return maxVal;
  }, [hourlyPulseData]);

  // ── Tab Filtering ─────────────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    if (isAllCaughtUpManualPreview) return [];

    let list = localOrders;
    if (activeTab === 'needs_packing') {
      list = needsPackingOrders;
    } else if (activeTab === 'pay_later') {
      list = payLaterOrders;
    } else if (activeTab === 'settled') {
      list = settledOrders;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((o) => {
        const idMatch = (o.id || '').toLowerCase().includes(q) || (o.invoice_number || '').toLowerCase().includes(q);
        const nameMatch = (o.customer_name || '').toLowerCase().includes(q);
        const phoneMatch = (o.customer_phone || '').toLowerCase().includes(q);
        const itemMatch = (o.items || []).some((i) =>
          ((i.product_name || i.name || '')).toLowerCase().includes(q)
        );
        return idMatch || nameMatch || phoneMatch || itemMatch;
      });
    }

    return list;
  }, [localOrders, activeTab, searchQuery, isAllCaughtUpManualPreview, needsPackingOrders, payLaterOrders, settledOrders]);

  // ── Real Optimistic Actions ───────────────────────────────────────────────
  const handleMarkSettled = async (order: RealOrder, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const prevOrder = { ...order };

    // Optimistic UI state (<50ms)
    setLocalOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, payment_status: 'paid', status: 'delivered' } : o))
    );

    showToast(`Marked #${order.id.slice(0, 8)} (${order.customer_name || 'Customer'}) settled`, () => {
      // Revert if undone
      setLocalOrders((prev) =>
        prev.map((o) => (o.id === order.id ? prevOrder : o))
      );
      onUpdatePaymentStatus?.(order.id, prevOrder.payment_status || 'pending');
    });

    try {
      if (onUpdatePaymentStatus) {
        await onUpdatePaymentStatus(order.id, 'paid');
      }
    } catch {
      // Revert on server error
      setLocalOrders((prev) =>
        prev.map((o) => (o.id === order.id ? prevOrder : o))
      );
      showToast(`Failed to update #${order.id.slice(0, 8)} on server`);
    }
  };

  const handlePackOrder = async (order: RealOrder, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const prevOrder = { ...order };

    setLocalOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, status: 'preparing' } : o))
    );

    showToast(`Order #${order.id.slice(0, 8)} packed and ready`, () => {
      setLocalOrders((prev) =>
        prev.map((o) => (o.id === order.id ? prevOrder : o))
      );
      onUpdateOrderStatus?.(order.id, prevOrder.status || 'pending');
    });

    try {
      if (onUpdateOrderStatus) {
        await onUpdateOrderStatus(order.id, 'preparing');
      }
    } catch {
      setLocalOrders((prev) =>
        prev.map((o) => (o.id === order.id ? prevOrder : o))
      );
      showToast(`Failed to update status on server`);
    }
  };

  const handleNudgeWhatsApp = (order: RealOrder, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const phone = (order.customer_phone || '').replace(/\D/g, '');
    const amt = formatInr(Number(order.total) || 0);
    const text = encodeURIComponent(
      `Namaste ${order.customer_name || 'ji'}, here is a gentle reminder regarding your order bill of ${amt} from ${storeName}. You can pay directly via UPI: ${user?.upi_id || 'our counter'}. Dhanyawad!`
    );

    if (phone) {
      window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${text}`, '_blank');
      showToast(`WhatsApp payment note opened for ${order.customer_name || phone}`);
    } else {
      showToast(`No customer phone number recorded on order #${order.id.slice(0, 8)}`);
    }
  };

  const handleSendReceipt = (order: RealOrder, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const phone = (order.customer_phone || '').replace(/\D/g, '');
    const amt = formatInr(Number(order.total) || 0);
    const itemsText = (order.items || [])
      .map((i) => `${i.product_name || i.name} (x${i.quantity})`)
      .join(', ');
    const text = encodeURIComponent(
      `Namaste ${order.customer_name || 'ji'}, here is your receipt from ${storeName} for ${amt}: ${itemsText}. Thank you for shopping with us!`
    );

    if (phone) {
      window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${text}`, '_blank');
      showToast(`WhatsApp receipt opened for ${order.customer_name || phone}`);
    } else {
      showToast(`Digital receipt ready for order #${order.id.slice(0, 8)}`);
    }
  };

  // ── Command Palette Items ─────────────────────────────────────────────────
  const commandItems = useMemo(() => {
    const list = [
      {
        id: 'cmd-new-order',
        title: 'Create In-Store Quick Order',
        subtitle: 'Record instant counter sale with UPI or Cash',
        category: 'Quick Actions',
        shortcut: 'C',
        action: () => onOpenNewOrderModal?.(),
      },
      {
        id: 'cmd-invoice',
        title: 'Generate GST Tax Invoice',
        subtitle: 'Print or share 1-click compliant bill',
        category: 'Quick Actions',
        shortcut: 'I',
        action: () => onOpenInvoiceModal?.(),
      },
      {
        id: 'cmd-qr',
        title: 'Show Countertop QR Standee',
        subtitle: 'Instant scannable 0% commission UPI code',
        category: 'Storefront',
        shortcut: 'Q',
        action: () => onOpenQrModal?.(),
      },
      {
        id: 'cmd-toggle-dark',
        title: isDarkMode ? 'Switch to Daylight Mode' : 'Switch to Obsidian Ink Mode',
        subtitle: 'Tactile daylight paper vs deep ink theme',
        category: 'Preferences',
        shortcut: 'D',
        action: () => setIsDarkMode((prev) => !prev),
      },
      {
        id: 'cmd-toggle-calm',
        title: isAllCaughtUpManualPreview ? 'Show Active Orders' : 'Preview Calm Empty State',
        subtitle: 'Celebrate completion of all queues',
        category: 'Views',
        shortcut: 'V',
        action: () => setIsAllCaughtUpManualPreview((prev) => !prev),
      },
    ];

    if (!commandSearch.trim()) return list;
    const q = commandSearch.toLowerCase().trim();
    return list.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [commandSearch, isDarkMode, isAllCaughtUpManualPreview, onOpenNewOrderModal, onOpenInvoiceModal, onOpenQrModal]);

  return (
    <div
      className={`min-h-screen transition-colors duration-200 select-none ${
        isDarkMode
          ? 'bg-[#090D16] text-[#F1F5F9]'
          : 'bg-[#F8FAFC] text-[#0F172A]'
      }`}
      style={{
        fontFamily: "'Geist', 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        letterSpacing: '-0.01em',
      }}
    >
      {/* ── STYLE TOKENS INJECTION ──────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600&family=Geist:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');

        .font-display {
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          letter-spacing: -0.03em;
        }
        .font-mono-tabular {
          font-family: 'JetBrains Mono', 'Geist Mono', monospace;
          font-variant-numeric: tabular-nums;
        }
        .btn-tactile-primary {
          background-color: #0052FF;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 1px 2px rgba(0, 82, 255, 0.2);
          transition: transform 120ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 120ms ease;
        }
        .btn-tactile-primary:hover {
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 4px 12px rgba(0, 82, 255, 0.28);
        }
        .btn-tactile-primary:active {
          transform: scale(0.98);
        }
        .btn-tactile-ghost {
          transition: transform 120ms cubic-bezier(0.22, 1, 0.36, 1), background-color 120ms ease;
        }
        .btn-tactile-ghost:active {
          transform: scale(0.98);
        }
      `}</style>

      {/* ── WORKSPACE WRAPPER ───────────────────────────────────────────────── */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ================================================================== */}
        {/* ZONE A: CO-PILOT BRIEFING BAR (REAL DATA ONLY)                     */}
        {/* ================================================================== */}
        <header
          className={`rounded-xl border p-4 sm:p-5 transition-all ${
            isDarkMode
              ? 'bg-[#0F1623] border-white/[0.07]'
              : 'bg-white border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)]'
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Left: Context-Aware Briefing from Real Numbers */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Storefront Connected
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-mono-tabular">
                  • 0% FeraSetu Commission
                </span>
                {storeUrl && (
                  <a
                    href={storeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <span>View Store</span>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>

              <h1 className="text-lg sm:text-xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
                {getGreeting()}, {merchantName}.{' '}
                <span className="font-normal text-slate-600 dark:text-slate-300">
                  {todayOrders.length > 0 ? (
                    <>
                      Your store has{' '}
                      <span className="font-semibold text-slate-900 dark:text-white font-mono-tabular">
                        {formatInr(totalCollectedToday)}
                      </span>{' '}
                      collected across {todayOrders.length} orders today. Just{' '}
                      <span className="font-semibold text-amber-600 dark:text-amber-400 font-mono-tabular">
                        {payLaterOrders.length} khata dues
                      </span>{' '}
                      and{' '}
                      <span className="font-semibold text-amber-600 dark:text-amber-400 font-mono-tabular">
                        {needsPackingOrders.length} orders to pack
                      </span>{' '}
                      need a quick look.
                    </>
                  ) : (
                    <>
                      Your store counter is ready. You have{' '}
                      <span className="font-semibold text-slate-900 dark:text-white font-mono-tabular">
                        {products.length} active products
                      </span>{' '}
                      in stock. No orders placed yet today.
                    </>
                  )}
                </span>
              </h1>
            </div>

            {/* Right: Tactile Command Palette Trigger & Power Actions */}
            <div className="flex items-center flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => setCommandPaletteOpen(true)}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all group ${
                  isDarkMode
                    ? 'bg-[#141E2F] border-white/10 text-slate-300 hover:border-white/20 hover:text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`}
                title="Open Command Palette (⌘K)"
              >
                <Search size={14} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
                <span className="hidden sm:inline">Search orders, press</span>
                <span className="sm:hidden">Search</span>
                <kbd
                  className={`px-1.5 py-0.5 rounded text-[11px] font-mono-tabular font-semibold border shadow-sm ${
                    isDarkMode
                      ? 'bg-[#0F1623] border-white/10 text-slate-300'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  ⌘K
                </kbd>
              </button>

              {/* Quick Action: New Order */}
              <button
                type="button"
                onClick={() => onOpenNewOrderModal?.()}
                className="btn-tactile-primary flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer"
                title="Create Manual Order (Key: C)"
              >
                <Plus size={14} />
                <span>New Order</span>
                <kbd className="hidden sm:inline-block px-1 py-0.2 text-[10px] bg-white/20 rounded font-mono-tabular">
                  C
                </kbd>
              </button>

              {/* Quick Action: GST Quick Invoice */}
              <button
                type="button"
                onClick={() => onOpenInvoiceModal?.()}
                className={`btn-tactile-ghost flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                  isDarkMode
                    ? 'bg-transparent border-white/10 text-slate-200 hover:bg-white/5'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
                title="Quick Invoice (Key: I)"
              >
                <FileText size={14} className="text-slate-500" />
                <span>Invoice</span>
                <kbd className="hidden sm:inline-block px-1 py-0.2 text-[10px] bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded font-mono-tabular">
                  I
                </kbd>
              </button>

              {/* Daylight / Obsidian Theme Switcher */}
              <button
                type="button"
                onClick={() => setIsDarkMode((prev) => !prev)}
                className={`p-1.5 rounded-lg border transition-colors ${
                  isDarkMode
                    ? 'bg-[#141E2F] border-white/10 text-amber-400 hover:text-amber-300'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
                title={isDarkMode ? 'Switch to Daylight Paper' : 'Switch to Deep Ink'}
              >
                {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            </div>
          </div>
        </header>

        {/* ================================================================== */}
        {/* ZONE B: ASYMMETRIC FINANCIAL PULSE (60% / 40% SPLIT)               */}
        {/* ================================================================== */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* ────────────────────────────────────────────────────────────────── */}
          {/* LEFT 60%: Real Net Cash Flow & Live Settlement Pulse               */}
          {/* ────────────────────────────────────────────────────────────────── */}
          <div
            className={`lg:col-span-7 xl:col-span-7 rounded-xl border p-5 flex flex-col justify-between transition-all ${
              isDarkMode
                ? 'bg-[#0F1623] border-white/[0.07]'
                : 'bg-white border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)]'
            }`}
          >
            {/* Header + Time Scrubber */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-white/[0.06]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">
                    Net Cash Flow &amp; Settlement Pulse
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    Direct-to-Bank (0% Toll)
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-3">
                  <div className="text-3xl sm:text-4xl font-bold font-display tracking-tight text-slate-900 dark:text-white font-mono-tabular">
                    {timeRange === 'today'
                      ? formatInr(totalCollectedToday)
                      : formatInr(
                          localOrders.reduce((s, o) => s + (Number(o.total) || 0), 0)
                        )}
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {todayOrders.length} orders recorded today
                  </span>
                </div>
              </div>

              {/* Time Scrubber */}
              <div
                className={`inline-flex p-1 rounded-lg border text-xs font-medium self-start sm:self-auto ${
                  isDarkMode
                    ? 'bg-[#141E2F] border-white/10'
                    : 'bg-slate-100 border-slate-200'
                }`}
              >
                {(['today', '7d', '30d'] as const).map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 rounded-md transition-all font-semibold ${
                      timeRange === range
                        ? isDarkMode
                          ? 'bg-[#0F1623] text-white shadow-sm'
                          : 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {range === 'today' ? 'Today' : range === '7d' ? '7 Days' : '30 Days'}
                  </button>
                ))}
              </div>
            </div>

            {/* High-Precision Dynamic Pulse Chart */}
            <div className="pt-5 pb-3">
              <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 mb-2">
                <span>Real hourly sales distribution (settled vs pending)</span>
                <span className="font-mono-tabular">
                  {selectedBarIndex !== null && hourlyPulseData[selectedBarIndex] ? (
                    <>
                      Slot:{' '}
                      <strong className="text-slate-700 dark:text-slate-200">
                        {hourlyPulseData[selectedBarIndex].slot}
                      </strong>
                    </>
                  ) : (
                    'Hover bar to inspect'
                  )}
                </span>
              </div>

              {/* Chart Grid with Hairline Dividers */}
              <div className="h-44 flex items-end gap-2 sm:gap-3 pt-6 pb-2 border-b border-slate-100 dark:border-white/[0.06] relative">
                {hourlyPulseData.map((pulse, idx) => {
                  const isHovered = selectedBarIndex === idx;
                  const total = pulse.settledAmount + pulse.pendingAmount;
                  const heightPercent = total > 0 ? Math.max(12, Math.round((total / maxChartVal) * 100)) : 4;
                  const settledPercent = total > 0 ? Math.round((pulse.settledAmount / total) * 100) : 100;

                  return (
                    <div
                      key={pulse.slot}
                      onMouseEnter={() => setSelectedBarIndex(idx)}
                      onMouseLeave={() => setSelectedBarIndex(null)}
                      className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer relative"
                    >
                      {/* Tooltip on hover */}
                      {isHovered && (
                        <div
                          className={`absolute -top-16 z-20 px-2.5 py-1.5 rounded-lg border text-[11px] font-mono-tabular shadow-lg whitespace-nowrap pointer-events-none transition-all ${
                            isDarkMode
                              ? 'bg-[#1A253A] border-white/10 text-white'
                              : 'bg-slate-900 text-white border-slate-800'
                          }`}
                        >
                          <div className="font-semibold text-emerald-400">
                            Settled: {formatInr(pulse.settledAmount)}
                          </div>
                          {pulse.pendingAmount > 0 && (
                            <div className="text-amber-400">
                              Khata / Due: {formatInr(pulse.pendingAmount)}
                            </div>
                          )}
                          <div className="text-slate-300 text-[10px]">
                            {pulse.orderCount} orders • {pulse.slot}
                          </div>
                        </div>
                      )}

                      {/* Stacked Bar */}
                      <div
                        className={`w-full max-w-[42px] rounded-t transition-all duration-150 overflow-hidden flex flex-col justify-end ${
                          isHovered
                            ? 'ring-2 ring-blue-500/50 scale-[1.02]'
                            : 'opacity-85 hover:opacity-100'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      >
                        {pulse.pendingAmount > 0 && (
                          <div
                            style={{ height: `${100 - settledPercent}%` }}
                            className="w-full bg-amber-500/80"
                          />
                        )}
                        <div
                          style={{ height: `${settledPercent}%` }}
                          className={`w-full ${
                            total === 0
                              ? 'bg-slate-200 dark:bg-slate-800'
                              : isHovered
                              ? 'bg-[#0052FF]'
                              : 'bg-[#0052FF]/85 dark:bg-[#0052FF]/70'
                          }`}
                        />
                      </div>

                      <span className="text-[11px] font-mono-tabular mt-2 text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                        {pulse.slot}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Real Ledger Summary Row */}
            <div className="pt-3 grid grid-cols-3 gap-2 text-xs">
              <div className="space-y-0.5">
                <span className="text-slate-400 dark:text-slate-500">Settled to Bank</span>
                <p className="font-semibold font-mono-tabular text-slate-900 dark:text-white">
                  {formatInr(totalCollectedToday)}
                </p>
              </div>
              <div className="space-y-0.5 border-l border-slate-100 dark:border-white/[0.06] pl-3">
                <span className="text-slate-400 dark:text-slate-500">Khata Balance Due</span>
                <p className="font-semibold font-mono-tabular text-amber-600 dark:text-amber-400">
                  {formatInr(totalCreditDue)}
                </p>
              </div>
              <div className="space-y-0.5 border-l border-slate-100 dark:border-white/[0.06] pl-3">
                <span className="text-slate-400 dark:text-slate-500">Active Products</span>
                <p className="font-semibold font-mono-tabular text-slate-900 dark:text-white">
                  {products.length} registered
                </p>
              </div>
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* RIGHT 40%: Real Actionable Triage Stack with Hairlines             */}
          {/* ────────────────────────────────────────────────────────────────── */}
          <div
            className={`lg:col-span-5 xl:col-span-5 rounded-xl border flex flex-col justify-between overflow-hidden transition-all ${
              isDarkMode
                ? 'bg-[#0F1623] border-white/[0.07]'
                : 'bg-white border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)]'
            }`}
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Decisions To Make Right Now
                </h3>
              </div>
              <span className="text-[11px] font-mono-tabular text-slate-400">
                {payLaterOrders.length + (lowStockProducts.length > 0 ? 1 : 0) + (needsPackingOrders.length > 0 ? 1 : 0)} Signals
              </span>
            </div>

            {/* Operational Strip 1: Real Pay-Later / Credit Dues */}
            <div className="p-4 border-b border-slate-100 dark:border-white/[0.06] hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600 dark:text-amber-400">
                      <Clock size={16} />
                    </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {payLaterOrders.length > 0
                        ? `${formatInr(totalCreditDue)} due from ${payLaterOrders.length} customer${payLaterOrders.length > 1 ? 's' : ''}`
                        : 'No pending khata balance'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {payLaterOrders.length > 0
                      ? payLaterOrders
                          .slice(0, 3)
                          .map((o) => `${o.customer_name || 'Customer'} (${formatInr(Number(o.total) || 0)})`)
                          .join(' • ')
                      : 'All accounts and invoices are settled in full.'}
                  </p>
                </div>

                {payLaterOrders.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => handleNudgeWhatsApp(payLaterOrders[0], e)}
                    className="btn-tactile-ghost px-2.5 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap bg-amber-50 dark:bg-[#1A253A] border-amber-200 dark:border-white/10 text-amber-800 dark:text-amber-400 hover:bg-amber-100 cursor-pointer"
                  >
                    Nudge on WhatsApp →
                  </button>
                )}
              </div>
            </div>

            {/* Operational Strip 2: Real Inventory Watch */}
            <div className="p-4 border-b border-slate-100 dark:border-white/[0.06] hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600 dark:text-amber-400">
                      <AlertTriangle size={16} />
                    </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {lowStockProducts.length > 0
                        ? `${lowStockProducts.length} items low on stock (≤5 units)`
                        : 'Inventory healthy (no low stock items)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {lowStockProducts.length > 0
                      ? lowStockProducts
                          .slice(0, 2)
                          .map((p) => `${p.name} (${p.stock_quantity} left)`)
                          .join(' • ')
                      : 'All tracked items have sufficient stock units.'}
                  </p>
                </div>

                <Link
                  to="/products"
                  className={`btn-tactile-ghost px-2.5 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap ${
                    isDarkMode
                      ? 'bg-[#1A253A] border-white/10 text-slate-200 hover:border-white/25'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Manage Stock →
                </Link>
              </div>
            </div>

            {/* Operational Strip 3: Real Packing Queue Signal */}
            <div className="p-4 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600 dark:text-blue-400">
                      <Zap size={16} />
                    </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {needsPackingOrders.length > 0
                        ? `${needsPackingOrders.length} order${needsPackingOrders.length > 1 ? 's' : ''} awaiting packing`
                        : 'Packing queue is clear'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {needsPackingOrders.length > 0
                      ? 'Pack and prepare items for direct delivery or counter pickup.'
                      : 'Zero orders waiting in the preparation line.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('needs_packing')}
                  className={`btn-tactile-ghost px-2.5 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap ${
                    activeTab === 'needs_packing'
                      ? 'bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400'
                      : isDarkMode
                      ? 'bg-transparent border-white/10 text-slate-300 hover:bg-white/5'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Filter Queue ({needsPackingOrders.length}) →
                </button>
              </div>
            </div>

            {/* Zero Platform Commission Guarantee */}
            <div
              className={`px-4 py-2.5 border-t text-[11px] flex items-center justify-between ${
                isDarkMode
                  ? 'bg-[#141E2F]/60 border-white/[0.06] text-slate-400'
                  : 'bg-slate-50/80 border-slate-100 text-slate-500'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-emerald-500" />
                0% FeraSetu Commission on every transaction
              </span>
              <span className="font-mono-tabular font-medium text-slate-700 dark:text-slate-300">
                100% Direct
              </span>
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* ZONE C: LIVE OPERATIONAL WORKBENCH (REAL ORDERS TABLE)             */}
        {/* ================================================================== */}
        <section
          className={`rounded-xl border overflow-hidden transition-all ${
            isDarkMode
              ? 'bg-[#0F1623] border-white/[0.07]'
              : 'bg-white border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)]'
          }`}
        >
          {/* Table Header Control Bar */}
          <div className="p-4 border-b border-slate-100 dark:border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Filter Tabs with Real Counts */}
            <div className="flex items-center flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('all');
                  setIsAllCaughtUpManualPreview(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'all' && !isAllCaughtUpManualPreview
                    ? isDarkMode
                      ? 'bg-white/10 text-white shadow-sm'
                      : 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>All Orders</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono-tabular ${
                    activeTab === 'all' && !isAllCaughtUpManualPreview
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {localOrders.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('needs_packing');
                  setIsAllCaughtUpManualPreview(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'needs_packing' && !isAllCaughtUpManualPreview
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Needs Packing</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono-tabular ${
                    activeTab === 'needs_packing' && !isAllCaughtUpManualPreview
                      ? 'bg-black/20 text-black'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {needsPackingOrders.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('pay_later');
                  setIsAllCaughtUpManualPreview(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'pay_later' && !isAllCaughtUpManualPreview
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Pay-Later Dues</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono-tabular ${
                    activeTab === 'pay_later' && !isAllCaughtUpManualPreview
                      ? 'bg-white/20 text-white'
                      : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                  }`}
                >
                  {payLaterOrders.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('settled');
                  setIsAllCaughtUpManualPreview(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'settled' && !isAllCaughtUpManualPreview
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Settled</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono-tabular ${
                    activeTab === 'settled' && !isAllCaughtUpManualPreview
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {settledOrders.length}
                </span>
              </button>
            </div>

            {/* Real Search Bar */}
            <div className="relative min-w-[240px]">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search real orders, customer, item..."
                className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-xs border transition-all outline-none ${
                  isDarkMode
                    ? 'bg-[#141E2F] border-white/10 text-white placeholder-slate-500 focus:border-blue-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* AUTHENTIC EMPTY STATE (ZERO FAKE DATA)                             */}
          {/* ────────────────────────────────────────────────────────────────── */}
          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center max-w-md mx-auto space-y-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${
                  isDarkMode ? 'bg-[#141E2F] text-amber-400' : 'bg-amber-50 text-amber-600'
                }`}
              >
                ☕
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold font-display text-slate-900 dark:text-white">
                  {localOrders.length === 0
                    ? `Counter is ready, ${merchantName}.`
                    : `No orders in ${activeTab.replace('_', ' ')}.`}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {localOrders.length === 0
                    ? `Your catalog has ${products.length} products. Create your first manual order at the counter or share your storefront link to start receiving customer orders.`
                    : 'All items in this queue are cleared. Select "All Orders" to view your full transaction history.'}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2 flex-wrap justify-center">
                <button
                  type="button"
                  onClick={() => onOpenNewOrderModal?.()}
                  className="btn-tactile-primary px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer"
                >
                  Create In-Store Order (C)
                </button>
                {storeUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(storeUrl);
                      showToast('Storefront link copied to clipboard');
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 ${
                      isDarkMode
                        ? 'border-white/10 text-slate-300 hover:bg-white/5'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Share2 size={13} />
                    <span>Copy Store Link</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* ────────────────────────────────────────────────────────────────── */
            /* REAL ORDERS TABLE WITH HOVER CHOREOGRAPHY                          */
            /* ────────────────────────────────────────────────────────────────── */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr
                    className={`border-b text-[11px] uppercase tracking-wider font-semibold ${
                      isDarkMode
                        ? 'border-white/[0.06] bg-[#141E2F]/40 text-slate-400'
                        : 'border-slate-100 bg-slate-50/70 text-slate-500'
                    }`}
                  >
                    <th className="py-3 px-4">Order ID &amp; Time</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Items</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Quick Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                  {filteredOrders.map((order) => {
                    const items = order.items || [];
                    const itemsSummary = items
                      .map((i) => `${i.product_name || i.name} ×${i.quantity}`)
                      .join(', ');
                    const totalAmt = Number(order.total) || 0;
                    const isPaid = (order.payment_status || '').toLowerCase() === 'paid';
                    const isDelivered = (order.status || '').toLowerCase() === 'delivered';
                    const isPendingPrep = (order.status || '').toLowerCase() === 'pending' ||
                                          (order.status || '').toLowerCase() === 'confirmed';

                    return (
                      <tr
                        key={order.id}
                        onClick={() => setInspectedOrder(order)}
                        className={`group cursor-pointer transition-colors ${
                          isDarkMode
                            ? 'hover:bg-[#152033]'
                            : 'hover:bg-slate-50/90'
                        }`}
                      >
                        {/* Order ID & Real Timestamp */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold font-mono-tabular text-slate-900 dark:text-white">
                            #{order.id.slice(0, 8)}
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono-tabular">
                            {timeAgo(order.created_at)}
                          </span>
                        </td>

                        {/* Real Customer Name & Phone */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {order.customer_name || 'Counter Customer'}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono-tabular">
                            {order.customer_phone || (order.delivery_type === 'pickup' ? 'Counter Pickup' : 'Direct Order')}
                          </div>
                        </td>

                        {/* Real Line Items */}
                        <td className="py-3.5 px-4 max-w-[240px]">
                          <div className="text-slate-700 dark:text-slate-300 truncate" title={itemsSummary}>
                            {itemsSummary || 'Standard order items'}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono-tabular">
                            {items.length} item{items.length !== 1 ? 's' : ''}
                          </div>
                        </td>

                        {/* Real Total & Channel */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-bold font-mono-tabular text-slate-900 dark:text-white">
                            {formatInr(totalAmt)}
                          </div>
                          <div className="text-[10px] font-mono-tabular text-slate-400">
                            {order.payment_method ? order.payment_method.toUpperCase() : 'UPI / CASH'}
                          </div>
                        </td>

                        {/* Real Status Badge with 6px Dot */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isPaid || isDelivered ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Settled / Paid
                            </span>
                          ) : isPendingPrep ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Needs Packing
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                              {order.status || 'Pending'}
                            </span>
                          )}
                        </td>

                        {/* Hover Choreography (Instant Fitts Actions) */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {order.customer_phone && (
                              <button
                                type="button"
                                onClick={(e) => handleSendReceipt(order, e)}
                                className={`p-1.5 rounded-md border text-slate-500 hover:text-slate-900 dark:hover:text-white transition-opacity ${
                                  isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-100'
                                } opacity-80 group-hover:opacity-100`}
                                title="Send WhatsApp receipt"
                              >
                                <Send size={13} />
                              </button>
                            )}

                            {isPendingPrep ? (
                              <button
                                type="button"
                                onClick={(e) => handlePackOrder(order, e)}
                                className="btn-tactile-primary px-2.5 py-1 rounded-md text-[11px] font-semibold text-white flex items-center gap-1"
                                title="Pack order"
                              >
                                <Check size={12} />
                                <span>Pack</span>
                              </button>
                            ) : !isPaid ? (
                              <button
                                type="button"
                                onClick={(e) => handleMarkSettled(order, e)}
                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-sm transition-transform active:scale-95"
                                title="Mark settled"
                              >
                                <Check size={12} />
                                <span>Mark Settled</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInspectedOrder(order);
                                }}
                                className={`px-2 py-1 rounded-md text-[11px] font-medium border text-slate-500 hover:text-slate-900 dark:hover:text-white ${
                                  isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                View
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer */}
          <div
            className={`p-3.5 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 ${
              isDarkMode ? 'bg-[#141E2F]/40 border-white/[0.06]' : 'bg-slate-50/60 border-slate-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>Real-time live ledger directly connected to FeraSetu merchant backend.</span>
            </div>
            <div className="font-mono-tabular">
              Showing {filteredOrders.length} of {localOrders.length} live records
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* ZONE D: REAL INSIDER METRIC & QUICK LAUNCHPAD                      */}
        {/* ================================================================== */}
        <section
          className={`rounded-xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
            isDarkMode
              ? 'bg-[#0F1623] border-white/[0.07]'
              : 'bg-white border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)]'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 mt-0.5">
              <Sparkles size={18} />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                FeraSetu Direct Commerce Ledger
              </h4>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-snug">
                <strong>0% commission platform policy.</strong> All payments go directly to your linked UPI bank account without intermediary holding or per-transaction platform deductions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <Link
              to="/orders"
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                isDarkMode
                  ? 'border-white/10 text-slate-300 hover:bg-white/5'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Full Orders Ledger
            </Link>
            <button
              type="button"
              onClick={() => onOpenNewOrderModal?.()}
              className="btn-tactile-primary px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
            >
              New Order (C)
            </button>
          </div>
        </section>

      </div>

      {/* ==================================================================== */}
      {/* COMMAND PALETTE (⌘K / Ctrl+K)                                        */}
      {/* ==================================================================== */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-100">
          <div
            className={`w-full max-w-xl rounded-xl border shadow-2xl overflow-hidden transition-all ${
              isDarkMode ? 'bg-[#0F1623] border-white/15' : 'bg-white border-slate-200'
            }`}
          >
            <div className="p-3.5 border-b border-slate-100 dark:border-white/10 flex items-center gap-3">
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                autoFocus
                value={commandSearch}
                onChange={(e) => setCommandSearch(e.target.value)}
                placeholder="Type an action or search..."
                className="w-full bg-transparent text-sm outline-none placeholder-slate-400 text-slate-900 dark:text-white"
              />
              <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono-tabular border bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-white/10">
                ESC
              </kbd>
            </div>

            <div className="max-h-[340px] overflow-y-auto p-2 space-y-1">
              {commandItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No actions found for &ldquo;{commandSearch}&rdquo;
                </div>
              ) : (
                commandItems.map((cmd, idx) => (
                  <button
                    key={cmd.id}
                    type="button"
                    onClick={() => {
                      cmd.action();
                      setCommandPaletteOpen(false);
                    }}
                    onMouseEnter={() => setActiveCommandIndex(idx)}
                    className={`w-full px-3 py-2.5 rounded-lg text-left flex items-center justify-between transition-colors ${
                      activeCommandIndex === idx
                        ? isDarkMode
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-50 text-blue-950'
                        : isDarkMode
                        ? 'text-slate-300 hover:bg-white/5'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold">{cmd.title}</div>
                      <div
                        className={`text-[11px] ${
                          activeCommandIndex === idx
                            ? isDarkMode
                              ? 'text-blue-100'
                              : 'text-blue-700'
                            : 'text-slate-400'
                        }`}
                      >
                        {cmd.subtitle}
                      </div>
                    </div>

                    {cmd.shortcut && (
                      <kbd
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono-tabular border ${
                          activeCommandIndex === idx
                            ? isDarkMode
                              ? 'bg-blue-700 border-blue-500 text-white'
                              : 'bg-blue-100 border-blue-200 text-blue-800'
                            : 'bg-slate-100 dark:bg-white/10 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* REAL ORDER INSPECTION DRAWER                                         */}
      {/* ==================================================================== */}
      {inspectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-sm animate-in fade-in duration-100">
          <div
            className={`w-full max-w-md h-full border-l p-6 flex flex-col justify-between overflow-y-auto shadow-2xl transition-all ${
              isDarkMode ? 'bg-[#0F1623] border-white/15' : 'bg-white border-slate-200'
            }`}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
                <div>
                  <div className="text-xs text-slate-400 font-mono-tabular">Order Details</div>
                  <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white">
                    #{inspectedOrder.id.slice(0, 8)}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectedOrder(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Customer Information */}
              <div
                className={`p-3.5 rounded-lg border ${
                  isDarkMode ? 'bg-[#141E2F] border-white/10' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  {inspectedOrder.customer_name || 'Counter Customer'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
                  {inspectedOrder.customer_phone || 'No phone recorded'}
                </div>
                {inspectedOrder.customer_address && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {inspectedOrder.customer_address}
                  </div>
                )}
              </div>

              {/* Line Items */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Purchased Items ({(inspectedOrder.items || []).length})
                </div>
                <div className="divide-y divide-slate-100 dark:divide-white/10 text-xs">
                  {(inspectedOrder.items || []).map((item, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {item.product_name || item.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono-tabular">
                          {item.quantity} × {formatInr(Number(item.price) || 0)}
                        </div>
                      </div>
                      <div className="font-semibold font-mono-tabular text-slate-900 dark:text-white">
                        {formatInr((Number(item.quantity) || 1) * (Number(item.price) || 0))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="pt-2 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-sm font-bold">
                <span>Total Amount</span>
                <span className="font-mono-tabular text-slate-900 dark:text-white text-base">
                  {formatInr(Number(inspectedOrder.total) || 0)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-6 border-t border-slate-100 dark:border-white/10 space-y-2">
              {(inspectedOrder.status === 'pending' || inspectedOrder.status === 'confirmed') && (
                <button
                  type="button"
                  onClick={() => {
                    handlePackOrder(inspectedOrder);
                    setInspectedOrder(null);
                  }}
                  className="w-full btn-tactile-primary py-2 rounded-lg text-xs font-semibold text-white cursor-pointer"
                >
                  Pack Order
                </button>
              )}

              {inspectedOrder.payment_status !== 'paid' && (
                <button
                  type="button"
                  onClick={() => {
                    handleMarkSettled(inspectedOrder);
                    setInspectedOrder(null);
                  }}
                  className="w-full py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                >
                  Mark Settled
                </button>
              )}

              {inspectedOrder.customer_phone && (
                <button
                  type="button"
                  onClick={() => {
                    handleSendReceipt(inspectedOrder);
                    setInspectedOrder(null);
                  }}
                  className={`w-full py-2 rounded-lg text-xs font-semibold border ${
                    isDarkMode
                      ? 'border-white/10 text-slate-200 hover:bg-white/5'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Send WhatsApp Receipt
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* OPTIMISTIC INSTANT CONFIRMATION PILL WITH UNDO (<50ms FEEDBACK)      */}
      {/* ==================================================================== */}
      {toastNotification && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl border text-xs shadow-xl animate-in slide-in-from-bottom-3 duration-150 ${
            isDarkMode
              ? 'bg-[#141E2F] border-white/15 text-slate-100'
              : 'bg-slate-900 border-slate-800 text-white'
          }`}
        >
          <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
          <span className="font-medium">{toastNotification.message}</span>

          {toastNotification.undoAction && (
            <button
              type="button"
              onClick={() => {
                toastNotification.undoAction?.();
                setToastNotification(null);
              }}
              className="ml-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
            >
              Undo
            </button>
          )}

          <button
            type="button"
            onClick={() => setToastNotification(null)}
            className="text-slate-400 hover:text-white ml-1"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
