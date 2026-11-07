import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  ShieldAlert,
  Award,
  Users,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Phone,
  MessageCircle,
  X,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Info,
  Sparkles,
  Ban,
  Package
} from 'lucide-react';

export interface OrderIntelligence {
  id: string;
  customer_name: string;
  customer_phone: string;
  total: number;
  order_cost?: number;
  gross_profit?: number;
  margin_percent?: number;
  is_profitable?: boolean;
  is_loss?: boolean;
  status: string;
  payment_status?: string;
  created_at: string;
  risk_score: number;
  risk_level: 'safe' | 'medium' | 'high';
  risk_flags: string[];
  items_count?: number;
  units_count?: number;
}

export interface CustomerIntelligence {
  id: string;
  name: string;
  phone: string;
  total_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  total_spent: number;
  total_profit: number;
  average_order_value: number;
  cancellation_rate: number;
  is_profitable: boolean;
  is_loss: boolean;
  ai_risk: 'safe' | 'suspicious';
  risk_flags: string[];
  last_order_at?: string;
}

export interface IntelligenceSummary {
  total_orders: number;
  total_revenue: number;
  total_estimated_profit: number;
  overall_margin_percent: number;
  total_cancelled_orders: number;
  total_cancelled_value: number;
  top_buyer: CustomerIntelligence | null;
  profitable_customers_count: number;
  loss_customers_count: number;
  suspicious_orders_count: number;
}

export interface IntelligenceData {
  summary: IntelligenceSummary;
  top_buyers: CustomerIntelligence[];
  profitable_customers: CustomerIntelligence[];
  loss_customers: CustomerIntelligence[];
  profitable_orders: OrderIntelligence[];
  loss_orders: OrderIntelligence[];
  suspicious_orders: OrderIntelligence[];
}

/**
 * Client-side calculation fallback when offline or before backend responds.
 */
export function computeOrderIntelligence(orders: any[], products: any[] = []): IntelligenceData {
  const productCostMap: Record<string, number> = {};
  for (const p of products) {
    if (p.cost_price != null) {
      productCostMap[p.id] = Number(p.cost_price);
    } else if (p.cost_price_minor != null) {
      productCostMap[p.id] = p.cost_price_minor / 100;
    }
  }

  const customerMap = new Map<string, CustomerIntelligence>();
  let totalRevenue = 0;
  let totalCost = 0;
  let totalGrossProfit = 0;
  let totalCancelledCount = 0;
  let totalCancelledValue = 0;

  const analyzedOrders: OrderIntelligence[] = [];

  for (const ord of orders) {
    let items: any[] = [];
    if (Array.isArray(ord.items)) {
      items = ord.items;
    } else if (typeof ord.items === 'string') {
      try { items = JSON.parse(ord.items); } catch { items = []; }
    }

    const orderTotal = Number(ord.total) || 0;
    const isCancelled = ord.status === 'cancelled';
    let orderCost = 0;
    let totalUnits = 0;

    for (const it of items) {
      const pId = it.productId || it.product_id;
      const qty = Math.max(1, Math.trunc(Number(it.quantity || it.qty || 1)));
      totalUnits += qty;
      const unitCost = productCostMap[pId] ?? (it.cost_price != null ? Number(it.cost_price) : (Number(it.price || 0) * 0.65));
      orderCost += unitCost * qty;
    }

    const orderProfit = Math.round((orderTotal - orderCost) * 100) / 100;
    const marginPercent = orderTotal > 0 ? Math.round((orderProfit / orderTotal) * 100) : 0;
    const isLoss = isCancelled || orderProfit <= 0;

    if (!isCancelled) {
      totalRevenue += orderTotal;
      totalCost += orderCost;
      totalGrossProfit += orderProfit;
    } else {
      totalCancelledCount++;
      totalCancelledValue += orderTotal;
    }

    // AI Risk Detection Heuristics
    const riskFlags: string[] = [];
    let riskScore = 10;

    const phoneDigits = (ord.customer_phone || '').replace(/\D/g, '');
    if (phoneDigits) {
      if (/^(\d)\1{6,}$/.test(phoneDigits)) {
        riskFlags.push('Suspicious phone number pattern (repeated identical digits)');
        riskScore += 45;
      }
      if (phoneDigits.length < 10) {
        riskFlags.push('Incomplete phone number (<10 digits)');
        riskScore += 25;
      }
    }

    if (totalUnits >= 15) {
      riskFlags.push(`Abnormally high cart volume (${totalUnits} total units)`);
      riskScore += 30;
    }

    if (ord.delivery_type === 'delivery' && ord.payment_status === 'unpaid' && orderTotal >= 5000) {
      riskFlags.push('High-value Cash on Delivery (> ₹5,000) without advance payment');
      riskScore += 35;
    }

    if (orderProfit < 0 && !isCancelled) {
      riskFlags.push(`Negative profit margin: store loses ₹${Math.abs(orderProfit)} on this transaction`);
      riskScore += 25;
    }

    const addr = (ord.delivery_address || ord.customer_address || '').toLowerCase().trim();
    if (addr && (addr.includes('test') || addr === 'asdf' || addr === 'xyz' || addr.length < 5)) {
      riskFlags.push('Placeholder or incomplete delivery address');
      riskScore += 30;
    }

    const riskLevel: 'safe' | 'medium' | 'high' = riskScore >= 60 ? 'high' : (riskScore >= 35 ? 'medium' : 'safe');

    analyzedOrders.push({
      id: ord.id,
      customer_name: ord.customer_name || 'Customer',
      customer_phone: ord.customer_phone || '',
      total: orderTotal,
      order_cost: Math.round(orderCost * 100) / 100,
      gross_profit: orderProfit,
      margin_percent: marginPercent,
      is_profitable: !isCancelled && orderProfit > 0,
      is_loss: isLoss,
      status: ord.status || 'pending',
      payment_status: ord.payment_status || 'unpaid',
      created_at: ord.created_at || new Date().toISOString(),
      risk_score: Math.min(100, riskScore),
      risk_level: riskLevel,
      risk_flags: riskFlags,
      items_count: items.length,
      units_count: totalUnits
    });

    const custKey = ord.customer_id || phoneDigits || ord.customer_name || 'unknown';
    let c = customerMap.get(custKey);
    if (!c) {
      c = {
        id: ord.customer_id || `cust_${custKey}`,
        name: ord.customer_name || 'Customer',
        phone: ord.customer_phone || '',
        total_orders: 0,
        completed_orders: 0,
        cancelled_orders: 0,
        total_spent: 0,
        total_profit: 0,
        average_order_value: 0,
        cancellation_rate: 0,
        is_profitable: true,
        is_loss: false,
        ai_risk: 'safe',
        risk_flags: [],
        last_order_at: ord.created_at
      };
      customerMap.set(custKey, c);
    }

    c.total_orders++;
    if (isCancelled) {
      c.cancelled_orders++;
    } else {
      c.completed_orders++;
      c.total_spent += orderTotal;
      c.total_profit += orderProfit;
    }
  }

  const customersList = Array.from(customerMap.values()).map(c => {
    const cancelRate = c.total_orders > 0 ? (c.cancelled_orders / c.total_orders) : 0;
    const isSuspicious = c.cancelled_orders >= 2 && cancelRate >= 0.5;
    const riskFlags: string[] = [];
    if (isSuspicious) {
      riskFlags.push(`High cancellation history (${Math.round(cancelRate * 100)}% orders cancelled)`);
    }

    return {
      ...c,
      total_spent: Math.round(c.total_spent * 100) / 100,
      total_profit: Math.round(c.total_profit * 100) / 100,
      average_order_value: c.completed_orders > 0 ? Math.round(c.total_spent / c.completed_orders) : 0,
      cancellation_rate: Math.round(cancelRate * 100),
      is_profitable: c.total_profit > 0,
      is_loss: isSuspicious || c.total_profit <= 0,
      ai_risk: (isSuspicious ? 'suspicious' : 'safe') as 'safe' | 'suspicious',
      risk_flags: riskFlags
    };
  });

  const topBuyers = [...customersList].sort((a, b) => b.total_spent - a.total_spent).slice(0, 10);
  const profitableCustomers = [...customersList].filter(c => c.is_profitable).sort((a, b) => b.total_profit - a.total_profit).slice(0, 10);
  const lossCustomers = [...customersList].filter(c => c.is_loss).sort((a, b) => a.total_profit - b.total_profit);

  const profitableOrders = analyzedOrders.filter(o => o.is_profitable).sort((a, b) => (b.gross_profit || 0) - (a.gross_profit || 0)).slice(0, 10);
  const lossOrders = analyzedOrders.filter(o => o.is_loss).sort((a, b) => (a.gross_profit || 0) - (b.gross_profit || 0)).slice(0, 10);
  const suspiciousOrders = analyzedOrders.filter(o => o.risk_level === 'high' || o.risk_level === 'medium').sort((a, b) => b.risk_score - a.risk_score);

  const overallMargin = totalRevenue > 0 ? Math.round((totalGrossProfit / totalRevenue) * 100) : 0;

  return {
    summary: {
      total_orders: orders.length,
      total_revenue: Math.round(totalRevenue * 100) / 100,
      total_estimated_profit: Math.round(totalGrossProfit * 100) / 100,
      overall_margin_percent: overallMargin,
      total_cancelled_orders: totalCancelledCount,
      total_cancelled_value: Math.round(totalCancelledValue * 100) / 100,
      top_buyer: topBuyers.length > 0 && topBuyers[0].total_spent > 0 ? topBuyers[0] : null,
      profitable_customers_count: profitableCustomers.length,
      loss_customers_count: lossCustomers.length,
      suspicious_orders_count: suspiciousOrders.length
    },
    top_buyers: topBuyers,
    profitable_customers: profitableCustomers,
    loss_customers: lossCustomers,
    profitable_orders: profitableOrders,
    loss_orders: lossOrders,
    suspicious_orders: suspiciousOrders
  };
}

export type SmartFilterType = 'all' | 'highest_buyers' | 'profitable' | 'loss' | 'suspicious';

interface OrderIntelligenceRadarProps {
  intelligence?: IntelligenceData | null;
  activeSmartFilter: SmartFilterType;
  onSelectSmartFilter: (filter: SmartFilterType) => void;
  onInspectOrderRisk?: (order: OrderIntelligence) => void;
  onOpenTopBuyersModal?: () => void;
  merchantStoreName?: string;
}

export function OrderIntelligenceRadar({
  intelligence,
  activeSmartFilter,
  onSelectSmartFilter,
  onInspectOrderRisk,
  onOpenTopBuyersModal,
  merchantStoreName = 'Our Store'
}: OrderIntelligenceRadarProps) {
  if (!intelligence || intelligence.summary.total_orders === 0) {
    return null;
  }

  const { summary, top_buyers, suspicious_orders, loss_orders, profitable_orders } = intelligence;
  const topBuyer = summary.top_buyer;
  const isSuspiciousActive = activeSmartFilter === 'suspicious';
  const isLossActive = activeSmartFilter === 'loss';
  const isProfitableActive = activeSmartFilter === 'profitable';
  const isHighestBuyersActive = activeSmartFilter === 'highest_buyers';

  return (
    <div className="mb-6 space-y-3">
      {/* Smart Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <Sparkles size={14} className="text-blue-600" />
          <span>FeraSetu AI Intelligence Radar</span>
          <span className="text-[11px] font-medium text-slate-500">• 0% Commission Analytics</span>
        </div>

        {activeSmartFilter !== 'all' && (
          <button
            type="button"
            onClick={() => onSelectSmartFilter('all')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
          >
            Reset to All Orders
          </button>
        )}
      </div>

      {/* 4 Responsive Radar Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* CARD 1: Highest Buyer / VIP Customer */}
        <div
          onClick={() => {
            if (onOpenTopBuyersModal) {
              onOpenTopBuyersModal();
            } else {
              onSelectSmartFilter(isHighestBuyersActive ? 'all' : 'highest_buyers');
            }
          }}
          className={`relative p-4 rounded-2xl border transition-all cursor-pointer bg-white hover:shadow-md ${
            isHighestBuyersActive
              ? 'ring-2 ring-amber-500 border-amber-300 bg-amber-50/30'
              : 'border-slate-200/90 hover:border-amber-300'
          }`}
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Top Spender (LTV)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100/80 text-amber-700 flex items-center justify-center">
              <Award size={18} strokeWidth={1.75} />
            </div>
          </div>

          <div className="mt-2.5">
            {topBuyer ? (
              <>
                <div className="text-base font-extrabold text-slate-900 truncate" title={topBuyer.name}>
                  {topBuyer.name}
                </div>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-lg font-black text-amber-700">
                    ₹{topBuyer.total_spent.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    ({topBuyer.completed_orders} orders)
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600 font-semibold pt-2 border-t border-slate-100">
                  <span>AOV: ₹{topBuyer.average_order_value.toLocaleString('en-IN')}</span>
                  <span className="text-amber-700 hover:underline flex items-center gap-0.5">
                    View Spenders <ChevronRight size={12} />
                  </span>
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-500 italic py-2">
                Awaiting first repeat customer orders
              </div>
            )}
          </div>
        </div>

        {/* CARD 2: Store Profitability & Margins */}
        <div
          onClick={() => onSelectSmartFilter(isProfitableActive ? 'all' : 'profitable')}
          className={`relative p-4 rounded-2xl border transition-all cursor-pointer bg-white hover:shadow-md ${
            isProfitableActive
              ? 'ring-2 ring-emerald-600 border-emerald-300 bg-emerald-50/30'
              : 'border-slate-200/90 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Store Profit</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center">
              <TrendingUp size={18} strokeWidth={1.75} />
            </div>
          </div>

          <div className="mt-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-emerald-700">
                +₹{summary.total_estimated_profit.toLocaleString('en-IN')}
              </span>
              <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                {summary.overall_margin_percent}% margin
              </span>
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Revenue: ₹{summary.total_revenue.toLocaleString('en-IN')}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600 font-semibold pt-2 border-t border-slate-100">
              <span>{summary.profitable_customers_count} profitable buyers</span>
              <span className="text-emerald-700 hover:underline flex items-center gap-0.5">
                {isProfitableActive ? 'Showing Profitable' : 'Filter Orders'} <ChevronRight size={12} />
              </span>
            </div>
          </div>
        </div>

        {/* CARD 3: Loss & Cancellation Alerts */}
        <div
          onClick={() => onSelectSmartFilter(isLossActive ? 'all' : 'loss')}
          className={`relative p-4 rounded-2xl border transition-all cursor-pointer bg-white hover:shadow-md ${
            isLossActive
              ? 'ring-2 ring-rose-500 border-rose-300 bg-rose-50/30'
              : 'border-slate-200/90 hover:border-rose-300'
          }`}
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loss & Cancellations</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100/80 text-rose-700 flex items-center justify-center">
              <AlertTriangle size={18} strokeWidth={1.75} />
            </div>
          </div>

          <div className="mt-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-lg font-black ${summary.total_cancelled_value > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
                ₹{summary.total_cancelled_value.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                lost in voided sales
              </span>
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              {summary.total_cancelled_orders} orders cancelled or below cost
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600 font-semibold pt-2 border-t border-slate-100">
              <span className={summary.total_cancelled_orders > 0 ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                {summary.total_cancelled_orders > 0 ? 'Review & prevent' : 'Zero losses'}
              </span>
              <span className="text-rose-700 hover:underline flex items-center gap-0.5">
                {isLossActive ? 'Showing Loss' : 'Filter Loss'} <ChevronRight size={12} />
              </span>
            </div>
          </div>
        </div>

        {/* CARD 4: AI Suspicious Order Radar */}
        <div
          onClick={() => {
            if (suspicious_orders.length > 0 && onInspectOrderRisk) {
              onInspectOrderRisk(suspicious_orders[0]);
            } else {
              onSelectSmartFilter(isSuspiciousActive ? 'all' : 'suspicious');
            }
          }}
          className={`relative p-4 rounded-2xl border transition-all cursor-pointer bg-white hover:shadow-md ${
            isSuspiciousActive
              ? 'ring-2 ring-amber-600 border-amber-300 bg-amber-50/40'
              : suspicious_orders.length > 0
              ? 'border-amber-300/80 hover:border-amber-400 bg-gradient-to-br from-white to-amber-50/20'
              : 'border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">AI Risk Radar</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              suspicious_orders.length > 0
                ? 'bg-amber-100 text-amber-700 animate-pulse'
                : 'bg-emerald-100/80 text-emerald-700'
            }`}>
              {suspicious_orders.length > 0 ? (
                <ShieldAlert size={18} strokeWidth={1.75} />
              ) : (
                <CheckCircle2 size={18} strokeWidth={1.75} />
              )}
            </div>
          </div>

          <div className="mt-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-lg font-black ${suspicious_orders.length > 0 ? 'text-amber-800' : 'text-emerald-700'}`}>
                {suspicious_orders.length}
              </span>
              <span className="text-xs font-bold text-slate-600">
                {suspicious_orders.length === 1 ? 'order flagged' : 'orders flagged'}
              </span>
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1 truncate">
              {suspicious_orders.length > 0
                ? (suspicious_orders[0].risk_flags[0] || 'Unverified COD or repeated digits')
                : 'All incoming customer orders verified safe'}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] font-semibold pt-2 border-t border-slate-100">
              <span className={suspicious_orders.length > 0 ? 'text-amber-800 font-bold' : 'text-emerald-700'}>
                {suspicious_orders.length > 0 ? 'Action Recommended' : 'Safe to Dispatch'}
              </span>
              <span className="text-blue-600 hover:underline flex items-center gap-0.5">
                Inspect AI <ChevronRight size={12} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Modal to display detailed AI Risk Assessment for a flagged order with actionable merchant steps.
 */
export function AiRiskModal({
  order,
  onClose,
  onCancelOrder,
  merchantStoreName = 'Our Store'
}: {
  order: OrderIntelligence | null;
  onClose: () => void;
  onCancelOrder?: (orderId: string, reason: string) => void;
  merchantStoreName?: string;
}) {
  if (!order) return null;

  const isHighRisk = order.risk_score >= 60;
  const isMediumRisk = order.risk_score >= 35 && order.risk_score < 60;
  const cleanPhone = (order.customer_phone || '').replace(/\D/g, '');

  const handleOpenWhatsAppVerification = () => {
    const text = encodeURIComponent(
      `Hello ${order.customer_name}! This is ${merchantStoreName}. We have received your order #${order.id.slice(-6)} for ₹${order.total.toLocaleString('en-IN')}. Could you please confirm your delivery address so we can pack your items? Thank you!`
    );
    window.open(`https://wa.me/91${cleanPhone}?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden text-left">
        {/* Header */}
        <div className={`p-5 flex items-center justify-between border-b ${
          isHighRisk ? 'bg-rose-50/80 border-rose-200' : 'bg-amber-50/80 border-amber-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs ${
              isHighRisk ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
            }`}>
              <ShieldAlert size={20} strokeWidth={2} />
            </div>
            <div>
              <div className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span>Fera AI Risk Assessment</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  isHighRisk ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  Risk Score: {order.risk_score}/100
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Order #{order.id.slice(-8)} • Customer: {order.customer_name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Order Snapshot */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold">Customer Contact:</span>
              <span className="font-extrabold text-slate-900">{order.customer_phone || 'None'}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold">Order Total & Status:</span>
              <span className="font-black text-slate-900">
                ₹{order.total.toLocaleString('en-IN')} ({order.payment_status === 'paid' ? '💳 Paid' : '💸 Unpaid COD'})
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold">Store Profit Margin:</span>
              <span className={`font-bold ${order.gross_profit != null && order.gross_profit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {order.gross_profit != null ? `₹${order.gross_profit} (${order.margin_percent}%)` : 'Calculating...'}
              </span>
            </div>
          </div>

          {/* Triggered AI Risk Signals */}
          <div>
            <div className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <AlertTriangle size={14} className={isHighRisk ? 'text-rose-600' : 'text-amber-600'} />
              <span>Triggered AI Risk Signals ({order.risk_flags.length})</span>
            </div>
            <div className="space-y-2">
              {order.risk_flags.length > 0 ? (
                order.risk_flags.map((flag, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-rose-50/60 border border-rose-200/80 text-xs font-semibold text-rose-900 flex items-start gap-2.5"
                  >
                    <span className="text-rose-500 font-black">•</span>
                    <span>{flag}</span>
                  </div>
                ))
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-600 font-medium">
                  Standard safety checks completed. No abnormal signals detected.
                </div>
              )}
            </div>
          </div>

          {/* Actionable Shopkeeper Recommendations */}
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80">
            <div className="text-xs font-black text-blue-900 mb-1.5 flex items-center gap-1.5">
              <Sparkles size={14} className="text-blue-700" />
              <span>Recommended Action for Merchant:</span>
            </div>
            <ul className="text-xs text-blue-800 space-y-1.5 font-medium list-disc pl-4">
              <li>Send a WhatsApp confirmation message to confirm customer's intent before packing.</li>
              <li>For orders over ₹5,000 COD, ask for a small ₹50 - ₹100 advance UPI token to prevent fake dispatches.</li>
              <li>If the phone number is non-responsive or unreachable after 2 calls, safely cancel the order.</li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleOpenWhatsAppVerification}
            disabled={!cleanPhone}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <MessageCircle size={15} />
            <span>Verify via WhatsApp</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {onCancelOrder && (
              <button
                type="button"
                onClick={() => {
                  onCancelOrder(order.id, 'AI Risk: Unverified or fraudulent order');
                  onClose();
                }}
                className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel Fake Order
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Modal to display ranked Top Spenders / VIP Customers with 1-click WhatsApp VIP rewards.
 */
export function TopBuyersModal({
  customers,
  onClose,
  merchantStoreName = 'Our Store'
}: {
  customers: CustomerIntelligence[];
  onClose: () => void;
  merchantStoreName?: string;
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    const q = searchTerm.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [customers, searchTerm]);

  const handleSendVipOffer = (cust: CustomerIntelligence) => {
    const cleanPhone = (cust.phone || '').replace(/\D/g, '');
    const text = encodeURIComponent(
      `Hello ${cust.name}! 🌟 You are one of our most valued VIP customers at ${merchantStoreName} with ₹${cust.total_spent.toLocaleString('en-IN')} in total shopping! As a token of our appreciation, please enjoy special personalized service on your next order. Thank you for your continued trust!`
    );
    window.open(`https://wa.me/91${cleanPhone}?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden text-left flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 flex items-center justify-between border-b border-slate-200 bg-amber-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Award size={22} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                Top Spenders & VIP Customer Leaderboard
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Track customer lifetime spend (LTV), order frequency, and store profit contribution
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search top buyers by name or phone number..."
            className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Customer List */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No customer records matching your search.
            </div>
          ) : (
            filtered.map((cust, idx) => (
              <div
                key={cust.id}
                className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/20 transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                    idx === 0
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : idx === 1
                      ? 'bg-slate-100 text-slate-700 border border-slate-300'
                      : idx === 2
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-slate-50 text-slate-500'
                  }`}>
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                      <span>{cust.name}</span>
                      {idx === 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800">
                          👑 Top Spender
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Phone size={11} /> {cust.phone || 'No phone'}
                      </span>
                      <span>•</span>
                      <span>{cust.completed_orders} completed orders</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-base font-black text-slate-900">
                      ₹{cust.total_spent.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[11px] font-bold text-emerald-700">
                      +₹{cust.total_profit.toLocaleString('en-IN')} store profit
                    </div>
                  </div>

                  {cust.phone && (
                    <button
                      type="button"
                      onClick={() => handleSendVipOffer(cust)}
                      className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
                      title="Send VIP thank-you & discount message on WhatsApp"
                    >
                      <MessageCircle size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Showing top {filtered.length} customers ranked by direct lifetime spending
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
