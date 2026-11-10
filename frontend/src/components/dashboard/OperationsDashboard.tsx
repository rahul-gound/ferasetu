// =============================================================================
// FeraSetu Operations Dashboard — Production Operations Workbench
// Zero-Slop, Deeply Human B2B SaaS Dashboard for the Global Shopkeeper.
// 100% Grounded in Live Store API Data (Zero Fake Metrics).
// Built to ex-Linear / Stripe / Apple Human Interface Design principles.
// =============================================================================

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
  Download,
  Filter,
  Eye,
  CreditCard,
  Truck,
  ArrowRight
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
  onOpenInvoiceModal?: (order?: RealOrder) => void;
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

  // Reset selected bar when time range switches
  useEffect(() => {
    setSelectedBarIndex(null);
  }, [timeRange]);

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

  // ── Keyboard Shortcuts (⌘K, C, I, Q, Esc) ─────────────────────────────────
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
        } else if (selectedBarIndex !== null) {
          e.preventDefault();
          setSelectedBarIndex(null);
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
        } else if (e.key.toLowerCase() === 'q') {
          e.preventDefault();
          onOpenQrModal?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, inspectedOrder, selectedBarIndex, onOpenNewOrderModal, onOpenInvoiceModal, onOpenQrModal]);

  // ── REAL METRICS COMPUTATION (ZERO FAKE NUMBERS) ──────────────────────────

  // Today's real orders
  const todayOrders = useMemo(() => {
    return localOrders.filter((o) => {
      if (o.status === 'cancelled') return false;
      return isToday(o.created_at);
    });
  }, [localOrders]);

  // Real collected revenue today
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

  // ── MULTI-TIMEFRAME DYNAMIC GRAPH ENGINE (ZERO FAKE DATA) ─────────────────
  const { chartSlots, rangeSettledTotal, rangePendingTotal, rangeOrdersCount } = useMemo(() => {
    const now = new Date();

    if (timeRange === 'today') {
      const slots = [
        { label: '08:00', startH: 6, endH: 9, fullLabel: 'Morning (06:00 - 09:00)' },
        { label: '10:00', startH: 9, endH: 11, fullLabel: 'Late Morning (09:00 - 11:00)' },
        { label: '12:00', startH: 11, endH: 13, fullLabel: 'Midday Rush (11:00 - 13:00)' },
        { label: '14:00', startH: 13, endH: 15, fullLabel: 'Afternoon (13:00 - 15:00)' },
        { label: '16:00', startH: 15, endH: 17, fullLabel: 'Evening Tea (15:00 - 17:00)' },
        { label: '18:00', startH: 17, endH: 19, fullLabel: 'Peak Rush (17:00 - 19:00)' },
        { label: '20:00', startH: 19, endH: 24, fullLabel: 'Night Counter (19:00 - 23:59)' },
      ];

      let rangeSettled = 0;
      let rangePending = 0;
      let rangeCount = 0;

      const result = slots.map((slot) => {
        let settled = 0;
        let pending = 0;
        const matchingOrderIds: string[] = [];

        todayOrders.forEach((o) => {
          const d = new Date(o.created_at);
          const h = d.getHours();
          if (h >= slot.startH && h < slot.endH) {
            matchingOrderIds.push(o.id);
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

        rangeSettled += settled;
        rangePending += pending;
        rangeCount += matchingOrderIds.length;

        return {
          slot: slot.label,
          fullLabel: slot.fullLabel,
          settledAmount: settled,
          pendingAmount: pending,
          orderCount: matchingOrderIds.length,
          orderIds: matchingOrderIds,
        };
      });

      return {
        chartSlots: result,
        rangeSettledTotal: rangeSettled,
        rangePendingTotal: rangePending,
        rangeOrdersCount: rangeCount,
      };
    }

    if (timeRange === '7d') {
      // 7 calendar days ending today
      const daySlots: Array<{ label: string; fullLabel: string; dStart: number; dEnd: number }> = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const dStart = d.getTime();
        const dEnd = dStart + 24 * 60 * 60 * 1000;
        const isCurrentDay = i === 0;
        const label = isCurrentDay ? 'Today' : i === 1 ? 'Y\'day' : dayNames[d.getDay()];
        const fullLabel = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', weekday: 'short' });
        daySlots.push({ label, fullLabel, dStart, dEnd });
      }

      let rangeSettled = 0;
      let rangePending = 0;
      let rangeCount = 0;

      const result = daySlots.map((slot) => {
        let settled = 0;
        let pending = 0;
        const matchingOrderIds: string[] = [];

        localOrders.forEach((o) => {
          if (o.status === 'cancelled') return;
          const orderTime = new Date(o.created_at).getTime();
          if (orderTime >= slot.dStart && orderTime < slot.dEnd) {
            matchingOrderIds.push(o.id);
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

        rangeSettled += settled;
        rangePending += pending;
        rangeCount += matchingOrderIds.length;

        return {
          slot: slot.label,
          fullLabel: slot.fullLabel,
          settledAmount: settled,
          pendingAmount: pending,
          orderCount: matchingOrderIds.length,
          orderIds: matchingOrderIds,
        };
      });

      return {
        chartSlots: result,
        rangeSettledTotal: rangeSettled,
        rangePendingTotal: rangePending,
        rangeOrdersCount: rangeCount,
      };
    }

    // timeRange === '30d' (5 interval buckets)
    const intervalSlots = [
      { label: 'Wk -4', daysAgoStart: 30, daysAgoEnd: 24, fullLabel: '24 to 30 days ago' },
      { label: 'Wk -3', daysAgoStart: 24, daysAgoEnd: 18, fullLabel: '18 to 24 days ago' },
      { label: 'Wk -2', daysAgoStart: 18, daysAgoEnd: 12, fullLabel: '12 to 18 days ago' },
      { label: 'Wk -1', daysAgoStart: 12, daysAgoEnd: 6, fullLabel: '6 to 12 days ago' },
      { label: 'Past 6D', daysAgoStart: 6, daysAgoEnd: 1, fullLabel: '1 to 6 days ago' },
      { label: 'Today', daysAgoStart: 1, daysAgoEnd: 0, fullLabel: 'Today' },
    ];

    let rangeSettled = 0;
    let rangePending = 0;
    let rangeCount = 0;

    const result = intervalSlots.map((slot) => {
      const startMs = now.getTime() - slot.daysAgoStart * 24 * 60 * 60 * 1000;
      const endMs = now.getTime() - slot.daysAgoEnd * 24 * 60 * 60 * 1000;
      let settled = 0;
      let pending = 0;
      const matchingOrderIds: string[] = [];

      localOrders.forEach((o) => {
        if (o.status === 'cancelled') return;
        const orderTime = new Date(o.created_at).getTime();
        if (slot.daysAgoEnd === 0) {
          if (isToday(o.created_at)) {
            matchingOrderIds.push(o.id);
            const amt = Number(o.total) || 0;
            const isPaid = (o.payment_status || '').toLowerCase() === 'paid' ||
                           (o.status || '').toLowerCase() === 'delivered';
            if (isPaid) settled += amt; else pending += amt;
          }
        } else if (orderTime >= startMs && orderTime < endMs) {
          matchingOrderIds.push(o.id);
          const amt = Number(o.total) || 0;
          const isPaid = (o.payment_status || '').toLowerCase() === 'paid' ||
                         (o.status || '').toLowerCase() === 'delivered';
          if (isPaid) settled += amt; else pending += amt;
        }
      });

      rangeSettled += settled;
      rangePending += pending;
      rangeCount += matchingOrderIds.length;

      return {
        slot: slot.label,
        fullLabel: slot.fullLabel,
        settledAmount: settled,
        pendingAmount: pending,
        orderCount: matchingOrderIds.length,
        orderIds: matchingOrderIds,
      };
    });

    return {
      chartSlots: result,
      rangeSettledTotal: rangeSettled,
      rangePendingTotal: rangePending,
      rangeOrdersCount: rangeCount,
    };
  }, [timeRange, todayOrders, localOrders]);

  const maxChartVal = useMemo(() => {
    const maxVal = Math.max(
      ...chartSlots.map((d) => d.settledAmount + d.pendingAmount),
      500
    );
    return maxVal;
  }, [chartSlots]);

  // Selected bar slot helper
  const selectedSlot = useMemo(() => {
    if (selectedBarIndex === null || !chartSlots[selectedBarIndex]) return null;
    return chartSlots[selectedBarIndex];
  }, [selectedBarIndex, chartSlots]);

  // ── Tab & Bar Slot Filtering ──────────────────────────────────────────────
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

    // If a bar in the chart is selected, filter to that slot's orders!
    if (selectedSlot && selectedSlot.orderIds.length > 0) {
      const allowedIds = new Set(selectedSlot.orderIds);
      list = list.filter((o) => allowedIds.has(o.id));
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
  }, [localOrders, activeTab, searchQuery, isAllCaughtUpManualPreview, needsPackingOrders, payLaterOrders, settledOrders, selectedSlot]);

  // ── Real Optimistic Actions ───────────────────────────────────────────────

  const handleMarkSettled = async (order: RealOrder, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const prevOrder = { ...order };
    const optimisticOrder: RealOrder = {
      ...order,
      payment_status: 'paid',
      status: order.status === 'delivered' ? 'delivered' : 'confirmed',
    };

    setLocalOrders((prev) =>
      prev.map((o) => (o.id === order.id ? optimisticOrder : o))
    );

    showToast(`Marked #${order.id.slice(0, 8)} as settled`, () => {
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
      setLocalOrders((prev) =>
        prev.map((o) => (o.id === order.id ? prevOrder : o))
      );
      showToast(`Failed to update payment on server`);
    }
  };

  const handlePackOrder = async (order: RealOrder, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const prevOrder = { ...order };
    const nextStatus = order.status === 'preparing' ? 'delivered' : 'preparing';
    const optimisticOrder: RealOrder = {
      ...order,
      status: nextStatus,
    };

    setLocalOrders((prev) =>
      prev.map((o) => (o.id === order.id ? optimisticOrder : o))
    );

    showToast(
      nextStatus === 'delivered'
        ? `Order #${order.id.slice(0, 8)} marked as delivered`
        : `Order #${order.id.slice(0, 8)} packed and ready`,
      () => {
        setLocalOrders((prev) =>
          prev.map((o) => (o.id === order.id ? prevOrder : o))
        );
        onUpdateOrderStatus?.(order.id, prevOrder.status || 'pending');
      }
    );

    try {
      if (onUpdateOrderStatus) {
        await onUpdateOrderStatus(order.id, nextStatus);
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

  const handleExportCsv = () => {
    if (filteredOrders.length === 0) {
      showToast('No orders to export in current view');
      return;
    }
    const headers = ['Order ID', 'Created At', 'Customer Name', 'Phone', 'Items', 'Total', 'Status', 'Payment Status', 'Payment Method'];
    const rows = filteredOrders.map((o) => [
      `"${o.id}"`,
      `"${o.created_at}"`,
      `"${o.customer_name || 'Counter Customer'}"`,
      `"${o.customer_phone || ''}"`,
      `"${(o.items || []).map((i) => `${i.product_name || i.name} (x${i.quantity})`).join('; ')}"`,
      `"${o.total || 0}"`,
      `"${o.status}"`,
      `"${o.payment_status || 'pending'}"`,
      `"${o.payment_method || 'upi'}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ferasetu-orders-ledger-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filteredOrders.length} orders to CSV`);
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
        id: 'cmd-export',
        title: 'Export Orders Ledger CSV',
        subtitle: 'Download spreadsheet of all orders',
        category: 'Data',
        shortcut: 'E',
        action: handleExportCsv,
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
      className={`min-h-screen transition-colors duration-200 ${
        isDarkMode ? 'dark bg-[#090D16] text-[#E2E8F0]' : 'bg-[#F8FAFC] text-[#0F172A]'
      }`}
    >
      {/* ── Main Container ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ================================================================== */}
        {/* ZONE A: CO-PILOT MORNING/EVENING BRIEFING BAR                      */}
        {/* ================================================================== */}
        <header
          className={`rounded-xl border p-4 sm:p-5 transition-all ${
            isDarkMode
              ? 'bg-[#0F1623] border-white/[0.07] shadow-[0_2px_8px_rgba(0,0,0,0.4)]'
              : 'bg-white border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)]'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left: Warm Contextual Greeting */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Store Operations Live
                </span>
                <span className="text-xs text-slate-300 dark:text-slate-700">•</span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {storeName}
                </span>
              </div>

              <h1 className="text-lg sm:text-xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
                {getGreeting()}, {merchantName}.{' '}
                <span className="font-normal text-slate-600 dark:text-slate-300">
                  {todayOrders.length > 0 ? (
                    <>
                      Store is humming—<strong className="font-semibold text-slate-900 dark:text-white font-mono-tabular">{formatInr(totalCollectedToday)}</strong> collected across{' '}
                      <strong className="font-semibold text-slate-900 dark:text-white font-mono-tabular">{todayOrders.length}</strong> orders today.
                    </>
                  ) : (
                    <>Ready for today's sales. Counter is open and UPI QR is active.</>
                  )}
                </span>
              </h1>

              {/* Status Pills */}
              <div className="flex items-center flex-wrap gap-2 pt-1 text-xs text-slate-500 dark:text-slate-400">
                {payLaterOrders.length > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium">
                    <Clock size={12} />
                    <strong className="font-mono-tabular">{payLaterOrders.length}</strong> khata dues to nudge
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium">
                    <CheckCircle2 size={12} />
                    Zero credit dues
                  </span>
                )}

                {lowStockProducts.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium">
                    <AlertTriangle size={12} />
                    <strong className="font-mono-tabular">{lowStockProducts.length}</strong> low stock items
                  </span>
                )}

                {needsPackingOrders.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 font-medium">
                    <Zap size={12} />
                    <strong className="font-mono-tabular">{needsPackingOrders.length}</strong> awaiting packing
                  </span>
                )}
              </div>
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
                <span>Tax Invoice</span>
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
          {/* LEFT 60%: Real Net Cash Flow & Dynamic Settlement Pulse Chart      */}
          {/* ────────────────────────────────────────────────────────────────── */}
          <div
            className={`lg:col-span-7 xl:col-span-7 rounded-xl border p-5 flex flex-col justify-between transition-all ${
              isDarkMode
                ? 'bg-[#0F1623] border-white/[0.07]'
                : 'bg-white border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)]'
            }`}
          >
            {/* Header + Dynamic Time Scrubber */}
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
                    {formatInr(rangeSettledTotal)}
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {rangeOrdersCount} orders in {timeRange === 'today' ? 'today' : timeRange === '7d' ? 'last 7 days' : 'last 30 days'}
                    {rangePendingTotal > 0 && ` • ${formatInr(rangePendingTotal)} pending dues`}
                  </span>
                </div>
              </div>

              {/* Time Scrubber (Today / 7D / 30D) */}
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
                    className={`px-3 py-1 rounded-md transition-all font-semibold cursor-pointer ${
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

            {/* Dynamic Pulse Chart Bars */}
            <div className="pt-5 pb-3">
              <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 mb-2">
                <span>
                  {timeRange === 'today'
                    ? 'Hourly sales & settlements (06:00 - 24:00)'
                    : timeRange === '7d'
                    ? 'Daily sales distribution (last 7 calendar days)'
                    : 'Interval breakdown (last 30 days)'}
                </span>
                <span className="font-mono-tabular">
                  {selectedSlot ? (
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">
                      Selected: {selectedSlot.fullLabel || selectedSlot.slot} ({selectedSlot.orderCount} orders)
                    </span>
                  ) : (
                    'Click bar to filter table • Hover to inspect'
                  )}
                </span>
              </div>

              {/* Chart Grid with Hairline Dividers */}
              <div className="h-44 flex items-end gap-2 sm:gap-3 pt-6 pb-2 border-b border-slate-100 dark:border-white/[0.06] relative">
                {chartSlots.map((pulse, idx) => {
                  const isHovered = selectedBarIndex === idx;
                  const total = pulse.settledAmount + pulse.pendingAmount;
                  const heightPercent = total > 0 ? Math.max(12, Math.round((total / maxChartVal) * 100)) : 4;
                  const settledPercent = total > 0 ? Math.round((pulse.settledAmount / total) * 100) : 100;

                  return (
                    <div
                      key={pulse.slot + idx}
                      onClick={() => {
                        setSelectedBarIndex(selectedBarIndex === idx ? null : idx);
                      }}
                      onMouseEnter={() => {
                        if (selectedBarIndex === null) {
                          // only temporary hover if nothing selected
                        }
                      }}
                      className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer relative"
                    >
                      {/* Tooltip on hover/active */}
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
                            {pulse.orderCount} orders • {pulse.fullLabel || pulse.slot}
                          </div>
                        </div>
                      )}

                      {/* Stacked Bar with tactile transition */}
                      <div
                        className={`w-full max-w-[42px] rounded-t transition-all duration-150 overflow-hidden flex flex-col justify-end ${
                          isHovered
                            ? 'ring-2 ring-blue-500 scale-[1.04]'
                            : 'opacity-85 hover:opacity-100'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      >
                        {pulse.pendingAmount > 0 && (
                          <div
                            style={{ height: `${100 - settledPercent}%` }}
                            className="w-full bg-amber-500/80"
                            title={`Pending: ${formatInr(pulse.pendingAmount)}`}
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

                      <span
                        className={`text-[11px] font-mono-tabular mt-2 transition-colors ${
                          isHovered
                            ? 'font-bold text-blue-600 dark:text-blue-400'
                            : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white'
                        }`}
                      >
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
                <span className="text-slate-400 dark:text-slate-500">
                  {timeRange === 'today' ? "Today's Settled" : 'Period Settled'}
                </span>
                <p className="font-semibold font-mono-tabular text-slate-900 dark:text-white">
                  {formatInr(rangeSettledTotal)}
                </p>
              </div>
              <div className="space-y-0.5 border-l border-slate-100 dark:border-white/[0.06] pl-3">
                <span className="text-slate-400 dark:text-slate-500">Khata Pending</span>
                <p className="font-semibold font-mono-tabular text-amber-600 dark:text-amber-400">
                  {formatInr(rangePendingTotal)}
                </p>
              </div>
              <div className="space-y-0.5 border-l border-slate-100 dark:border-white/[0.06] pl-3">
                <span className="text-slate-400 dark:text-slate-500">Total Orders</span>
                <p className="font-semibold font-mono-tabular text-slate-900 dark:text-white">
                  {rangeOrdersCount} recorded
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
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600 dark:text-amber-400 shrink-0">
                      <Clock size={16} />
                    </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {payLaterOrders.length > 0
                        ? `${formatInr(totalCreditDue)} due from ${payLaterOrders.length} customer${payLaterOrders.length > 1 ? 's' : ''}`
                        : 'No pending khata balance'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {payLaterOrders.length > 0
                      ? payLaterOrders
                          .slice(0, 3)
                          .map((o) => `${o.customer_name || 'Customer'} (${formatInr(Number(o.total) || 0)})`)
                          .join(' • ')
                      : 'All customer accounts are settled in full.'}
                  </p>
                </div>

                {payLaterOrders.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => handleNudgeWhatsApp(payLaterOrders[0], e)}
                    className="btn-tactile-ghost px-2.5 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap bg-amber-50 dark:bg-[#1A253A] border-amber-200 dark:border-white/10 text-amber-800 dark:text-amber-400 hover:bg-amber-100 cursor-pointer shrink-0"
                  >
                    Nudge on WhatsApp →
                  </button>
                )}
              </div>
            </div>

            {/* Operational Strip 2: Real Inventory Watch */}
            <div className="p-4 border-b border-slate-100 dark:border-white/[0.06] hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600 dark:text-amber-400 shrink-0">
                      <AlertTriangle size={16} />
                    </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {lowStockProducts.length > 0
                        ? `${lowStockProducts.length} items low on stock (≤5 units)`
                        : 'Inventory healthy (no low stock)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
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
                  className={`btn-tactile-ghost px-2.5 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap shrink-0 ${
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
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600 dark:text-blue-400 shrink-0">
                      <Zap size={16} />
                    </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {needsPackingOrders.length > 0
                        ? `${needsPackingOrders.length} order${needsPackingOrders.length > 1 ? 's' : ''} awaiting packing`
                        : 'Packing queue is clear'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {needsPackingOrders.length > 0
                      ? 'Pack and prepare items for direct delivery or counter pickup.'
                      : 'Zero orders waiting in the preparation line.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('needs_packing')}
                  className={`btn-tactile-ghost px-2.5 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap shrink-0 cursor-pointer ${
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
          {/* Active Slot Filter Banner (if bar was clicked) */}
          {selectedSlot && (
            <div className="px-4 py-2 bg-blue-50/90 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-900/50 flex items-center justify-between text-xs text-blue-900 dark:text-blue-200">
              <div className="flex items-center gap-2">
                <Filter size={13} className="text-blue-600" />
                <span>
                  Filtering by graph slot: <strong>{selectedSlot.fullLabel || selectedSlot.slot}</strong> ({selectedSlot.orderCount} matching orders)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBarIndex(null)}
                className="text-blue-600 hover:text-blue-800 dark:hover:text-blue-100 font-semibold underline cursor-pointer"
              >
                Clear Graph Filter ✕
              </button>
            </div>
          )}

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
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
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
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
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
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
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
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
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

            {/* Right Controls: Search + CSV Export */}
            <div className="flex items-center gap-2">
              <div className="relative min-w-[200px] sm:min-w-[240px]">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search orders, phone, item..."
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

              <button
                type="button"
                onClick={handleExportCsv}
                className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isDarkMode
                    ? 'border-white/10 text-slate-300 hover:bg-white/5'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
                title="Download CSV of current table rows"
              >
                <Download size={13} />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
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
                  {selectedSlot
                    ? `No orders in ${selectedSlot.fullLabel || selectedSlot.slot}`
                    : searchQuery
                    ? 'No matching orders found'
                    : activeTab === 'needs_packing'
                    ? 'All orders are packed and shipped'
                    : activeTab === 'pay_later'
                    ? 'Zero pending khata accounts'
                    : 'All caught up—no orders in this queue'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {selectedSlot ? (
                    <button
                      type="button"
                      onClick={() => setSelectedBarIndex(null)}
                      className="text-blue-600 font-semibold underline cursor-pointer"
                    >
                      Clear graph filter to view all orders
                    </button>
                  ) : searchQuery ? (
                    'Try searching with a different customer name, phone number, or product item.'
                  ) : (
                    'Your counter is clear. Record instant walk-in orders or share your direct UPI storefront link with customers.'
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => onOpenNewOrderModal?.()}
                  className="btn-tactile-primary px-3 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer"
                >
                  + Create Quick Order
                </button>
                {storeUrl && (
                  <a
                    href={storeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`btn-tactile-ghost px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 ${
                      isDarkMode
                        ? 'border-white/10 text-slate-300 hover:bg-white/5'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>View Storefront</span>
                    <ExternalLink size={12} />
                  </a>
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
                                } opacity-80 group-hover:opacity-100 cursor-pointer`}
                                title="Send WhatsApp receipt"
                              >
                                <Send size={13} />
                              </button>
                            )}

                            {isPendingPrep ? (
                              <button
                                type="button"
                                onClick={(e) => handlePackOrder(order, e)}
                                className="btn-tactile-primary px-2.5 py-1 rounded-md text-[11px] font-semibold text-white flex items-center gap-1 cursor-pointer"
                                title="Pack order"
                              >
                                <Check size={12} />
                                <span>Pack &amp; Ship</span>
                              </button>
                            ) : !isPaid ? (
                              <button
                                type="button"
                                onClick={(e) => handleMarkSettled(order, e)}
                                className="btn-tactile-primary px-2.5 py-1 rounded-md text-[11px] font-semibold text-white flex items-center gap-1 cursor-pointer"
                                title="Mark as Paid"
                              >
                                <Check size={12} />
                                <span>Mark Settled</span>
                              </button>
                            ) : null}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenInvoiceModal?.(order);
                              }}
                              className={`p-1.5 rounded-md border text-slate-500 hover:text-slate-900 dark:hover:text-white transition-opacity cursor-pointer ${
                                isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-100'
                              } opacity-80 group-hover:opacity-100`}
                              title="Tax Invoice"
                            >
                              <FileText size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectedOrder(order);
                              }}
                              className={`p-1.5 rounded-md border text-slate-500 hover:text-slate-900 dark:hover:text-white transition-opacity cursor-pointer ${
                                isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-100'
                              } opacity-80 group-hover:opacity-100`}
                              title="View details"
                            >
                              <Eye size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ================================================================== */}
        {/* ZONE D: RELATIONAL "INSIDER" CELEBRATORY EMPTY STATE               */}
        {/* ================================================================== */}
        {isAllCaughtUpManualPreview && (
          <div className="p-8 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 text-center space-y-3">
            <div className="inline-flex p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-base font-bold text-emerald-950 dark:text-emerald-200 font-display">
              You are completely caught up!
            </h3>
            <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 max-w-md mx-auto">
              Every customer invoice is settled, the packing line is clear, and stock registers are accurate. Enjoy your evening—FeraSetu continues taking direct orders 24/7.
            </p>
            <button
              type="button"
              onClick={() => setIsAllCaughtUpManualPreview(false)}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 underline cursor-pointer"
            >
              Return to Live Workbench
            </button>
          </div>
        )}

      </div>

      {/* ==================================================================== */}
      {/* COMMAND PALETTE MODAL (⌘K)                                           */}
      {/* ==================================================================== */}
      {commandPaletteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/40 backdrop-blur-xs"
          onClick={() => setCommandPaletteOpen(false)}
        >
          <div
            className={`w-full max-w-xl rounded-xl border shadow-2xl overflow-hidden transition-all ${
              isDarkMode
                ? 'bg-[#0F1623] border-white/10 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input Header */}
            <div className="p-3 border-b border-slate-100 dark:border-white/[0.06] flex items-center gap-2.5">
              <Search size={16} className="text-slate-400" />
              <input
                autoFocus
                type="text"
                value={commandSearch}
                onChange={(e) => setCommandSearch(e.target.value)}
                placeholder="Type a command, search orders, or jump to view..."
                className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
              />
              <span className="text-[10px] font-mono-tabular px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-500">
                Esc
              </span>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {commandItems.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No commands match your query.
                </div>
              ) : (
                commandItems.map((cmd) => (
                  <button
                    key={cmd.id}
                    type="button"
                    onClick={() => {
                      cmd.action();
                      setCommandPaletteOpen(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer ${
                      isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{cmd.title}</div>
                      <div className="text-[11px] text-slate-400">{cmd.subtitle}</div>
                    </div>
                    {cmd.shortcut && (
                      <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono-tabular bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10">
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
      {/* INSPECT ORDER SLIDE-OVER DRAWER                                      */}
      {/* ==================================================================== */}
      {inspectedOrder && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs"
          onClick={() => setInspectedOrder(null)}
        >
          <div
            className={`w-full max-w-md h-full flex flex-col justify-between p-6 shadow-2xl transition-all ${
              isDarkMode
                ? 'bg-[#0F1623] border-l border-white/10 text-white'
                : 'bg-white border-l border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.06]">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Order Details
                </span>
                <h3 className="text-base font-bold font-mono-tabular">
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

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
              {/* Customer Info */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.03] space-y-1">
                <div className="font-semibold text-sm">
                  {inspectedOrder.customer_name || 'Counter Walk-in Customer'}
                </div>
                <div className="text-slate-500 font-mono-tabular">
                  {inspectedOrder.customer_phone || 'No phone number recorded'}
                </div>
                {inspectedOrder.customer_address && (
                  <div className="text-slate-500 pt-1 border-t border-slate-200/50 dark:border-white/5">
                    {inspectedOrder.customer_address}
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[11px]">
                  Ordered Items ({inspectedOrder.items?.length || 0})
                </span>
                <div className="divide-y divide-slate-100 dark:divide-white/5">
                  {(inspectedOrder.items || []).map((item, idx) => (
                    <div key={idx} className="py-2 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {item.product_name || item.name || 'Product'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono-tabular">
                          Qty: {item.quantity} × {formatInr(item.price)}
                        </div>
                      </div>
                      <div className="font-bold font-mono-tabular">
                        {formatInr(item.quantity * item.price)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.03] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Status:</span>
                  <span className="font-semibold uppercase">{inspectedOrder.payment_status || 'Pending'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Method:</span>
                  <span className="font-semibold uppercase">{inspectedOrder.payment_method || 'UPI / Cash'}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200/50 dark:border-white/5 text-sm font-bold">
                  <span>Grand Total:</span>
                  <span className="font-mono-tabular">{formatInr(Number(inspectedOrder.total) || 0)}</span>
                </div>
              </div>
            </div>

            {/* Footer Quick Triggers */}
            <div className="pt-4 border-t border-slate-100 dark:border-white/[0.06] flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onOpenInvoiceModal?.(inspectedOrder);
                  setInspectedOrder(null);
                }}
                className="flex-1 py-2 rounded-lg btn-tactile-ghost border border-slate-200 dark:border-white/10 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileText size={14} />
                <span>GST Tax Invoice</span>
              </button>

              <button
                type="button"
                onClick={() => handleMarkSettled(inspectedOrder)}
                className="flex-1 py-2 rounded-lg btn-tactile-primary text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check size={14} />
                <span>Mark Settled</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* OPTIMISTIC CONFIRMATION TOAST WITH UNDO (DOHERTY THRESHOLD <50MS)     */}
      {/* ==================================================================== */}
      {toastNotification && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 text-white shadow-2xl border border-slate-800 text-xs animate-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{toastNotification.message}</span>
          </div>

          {toastNotification.undoAction && (
            <button
              type="button"
              onClick={() => {
                toastNotification.undoAction?.();
                setToastNotification(null);
              }}
              className="px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-white font-semibold text-[11px] transition-colors cursor-pointer"
            >
              Undo
            </button>
          )}

          <button
            type="button"
            onClick={() => setToastNotification(null)}
            className="text-slate-400 hover:text-white"
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
