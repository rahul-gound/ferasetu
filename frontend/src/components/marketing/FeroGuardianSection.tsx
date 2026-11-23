import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Package,
  Building2,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Store,
  ChevronRight,
  ExternalLink,
  Lock
} from 'lucide-react';

interface FeroAgentMonitorProps {
  onStart: () => void;
  market?: string;
}

type MonitorTab = 'feed' | 'inventory' | 'settlement' | 'suggestions';

interface AlertItem {
  id: string;
  type: 'inventory' | 'settlement' | 'suggestion';
  title: string;
  detail: string;
  actionLabel?: string;
  time: string;
  highlight?: string;
  badge?: string;
}

/**
 * Fero — The Autonomous Store Intelligence & Security Co-pilot of FeraSetu.
 * Embedded directly in every merchant store: continuously monitoring stock levels,
 * auditing direct bank deposits, verifying 0% commission, and surfacing real shop actions.
 */
export default function FeroGuardianSection({ onStart, market = 'IN' }: FeroAgentMonitorProps) {
  const isIndia = market === 'IN';
  const currency = isIndia ? '₹' : '$';
  const [activeTab, setActiveTab] = useState<MonitorTab>('feed');

  const alerts: Record<MonitorTab, AlertItem[]> = {
    feed: [
      {
        id: '1',
        type: 'settlement',
        title: 'Direct Bank Settlement Verified',
        detail: `Order #FS-9422 (${currency}${isIndia ? '1,450.00' : '45.00'}) deposited directly via UPI into HDFC A/C ••4102. FeraSetu fee: ${currency}0.00 (0.0%).`,
        time: 'Just now',
        highlight: '100% Kept',
        badge: 'SETTLED',
      },
      {
        id: '2',
        type: 'inventory',
        title: 'Low Stock Early Warning',
        detail: 'Cold-Pressed Mustard Oil (1L) is down to 3 units. At current velocity (1.8 units/day), stock runs out before Friday evening.',
        actionLabel: 'Draft Supplier PO (12 units)',
        time: '14 mins ago',
        highlight: 'Stock Risk',
        badge: 'INVENTORY',
      },
      {
        id: '3',
        type: 'suggestion',
        title: 'Repeat Customer Retention',
        detail: 'Customer Ananya S. completed her 3rd order this month (Lifetime spend: ₹3,840). 1-click WhatsApp loyalty receipt ready.',
        actionLabel: 'Open WhatsApp Draft',
        time: '42 mins ago',
        highlight: 'Repeat Buyer',
        badge: 'CUSTOMER',
      },
    ],
    inventory: [
      {
        id: 'inv-1',
        type: 'inventory',
        title: 'Lakadong Turmeric (250g)',
        detail: 'Sales velocity up 2.4x this week. Remaining stock: 5 units. Recommended reorder quantity: 20 units.',
        actionLabel: 'Mark Restocked',
        time: 'Active Alert',
        highlight: 'High Demand',
        badge: 'REORDER',
      },
      {
        id: 'inv-2',
        type: 'inventory',
        title: 'Cold-Pressed Mustard Oil (1L)',
        detail: 'Down to 3 units. Shelves projected to run dry in 48 hours based on weekday grocery order traffic.',
        actionLabel: 'Draft Supplier PO',
        time: 'Critical Alert',
        highlight: 'Low Stock',
        badge: 'URGENT',
      },
    ],
    settlement: [
      {
        id: 'set-1',
        type: 'settlement',
        title: 'Batch Settlement Reconciliation',
        detail: `Today's 14 customer payments totaling ${currency}${isIndia ? '14,250.00' : '420.00'} deposited directly into your bank. Zero escrow holds, zero marketplace deductions.`,
        time: 'Today · Reconciled',
        highlight: '100% Retained',
        badge: 'RECONCILED',
      },
      {
        id: 'set-2',
        type: 'settlement',
        title: 'Payment Gateway Direct Sweep',
        detail: 'Instant settlement webhook responding in 142ms. Direct conduit to merchant bank account active and healthy.',
        time: 'Continuous Health Check',
        highlight: 'Zero Escrow',
        badge: 'CONDUIT ACTIVE',
      },
    ],
    suggestions: [
      {
        id: 'sug-1',
        type: 'suggestion',
        title: 'Morning Essentials Combo Opportunity',
        detail: '8 shoppers bought filter coffee powder without chicory. Bundling them at a 10% combo discount raises basket size by 22%.',
        actionLabel: 'Create 1-Click Combo',
        time: 'Action Ready',
        highlight: '+22% Basket',
        badge: 'PROMOTION',
      },
      {
        id: 'sug-2',
        type: 'suggestion',
        title: 'Lapsed Customer Reactivation',
        detail: '11 regular buyers have not placed an order in 21 days. A quick WhatsApp greeting with fresh arrivals recovers 38% of visits.',
        actionLabel: 'Review Customer List',
        time: 'Customer Care',
        highlight: 'Retention',
        badge: 'LOYALTY',
      },
    ],
  };

  return (
    <section
      id="fero-agent"
      className="py-20 md:py-28 bg-white border-b border-slate-200 relative overflow-hidden scroll-mt-24"
      aria-label="Fero Autonomous Store Intelligence"
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 relative z-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.12] mb-4">
            Meet Fero. Built-in store intelligence that protects your margin.
          </h2>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-2xl mx-auto">
            FeraSetu is your independent 0% commission storefront. Fero is the intelligent operations co-pilot built inside: monitoring stock levels, verifying direct bank deposits, and surfacing clear merchant actions.
          </p>
        </div>

        {/* 2-Column Main Showcase Console */}
        <div className="rounded-3xl border border-slate-200/90 bg-slate-50/70 p-6 sm:p-8 lg:p-10 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* ======================================================== */}
            {/* COLUMN 1: Real Merchant Operations Terminal (Col 1-5)    */}
            {/* ======================================================== */}
            <div className="lg:col-span-5 flex flex-col space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
                
                {/* Store Profile Bar */}
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs">
                      <Store size={19} className="text-[#0052FF]" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <span>Sharma General Store</span>
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        sharma.ferasetu.com · Karol Bagh
                      </div>
                    </div>
                  </div>
                  
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Terminal
                  </span>
                </div>

                {/* Direct Bank Settlement Ledger */}
                <div className="rounded-xl border border-slate-150 bg-slate-50 p-4 mb-4 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <Building2 size={14} className="text-emerald-600" />
                      Direct Bank Settlement
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-200">
                      100% Kept
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
                        {currency}{isIndia ? '14,250.00' : '420.00'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Direct to HDFC Bank A/C ••4102 via UPI
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-emerald-700">
                        {currency}0.00 Platform Fee
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Zero toll deducted
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-600">
                    <span>Marketplace commission saved today:</span>
                    <span className="font-bold text-[#EA580C] tabular-nums">
                      +{currency}{isIndia ? '2,565.00' : '75.60'}
                    </span>
                  </div>
                </div>

                {/* Inventory & Delivery Security Metrics */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-xl border border-slate-100 bg-white">
                    <div className="text-[11px] font-medium text-slate-500 mb-1 flex items-center gap-1">
                      <Package size={13} className="text-blue-600" />
                      <span>Monitored Catalog</span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 tabular-nums">
                      14 SKUs Live
                    </div>
                    <div className="text-[10px] text-amber-700 font-medium mt-0.5">
                      1 item near threshold
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-100 bg-white">
                    <div className="text-[11px] font-medium text-slate-500 mb-1 flex items-center gap-1">
                      <ShieldCheck size={13} className="text-emerald-600" />
                      <span>Handshake OTP</span>
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      Verified Orders
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Zero unverified returns
                    </div>
                  </div>
                </div>

                {/* System Audit Heartbeat */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <RefreshCw size={13} className="text-slate-400" />
                    <span>Auto-syncs every 60 seconds</span>
                  </span>
                  <span className="font-medium text-slate-700 flex items-center gap-1">
                    <Lock size={12} className="text-emerald-600" />
                    <span>Direct merchant settlement</span>
                  </span>
                </div>

              </div>

              {/* Sub-label */}
              <div className="text-center">
                <span className="text-xs font-semibold text-slate-700">Fero Operations Terminal</span>
                <span className="text-xs text-slate-400 ml-1.5">· Built into every FeraSetu store</span>
              </div>
            </div>

            {/* ======================================================== */}
            {/* COLUMN 2: Interactive Real Operations Ledger (Col 6-12)  */}
            {/* ======================================================== */}
            <div className="lg:col-span-7 flex flex-col justify-between">
              
              <div className="mb-5">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    Live Store Operations Ledger
                  </h3>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    Real-Time Feed
                  </span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed font-normal">
                  Continuous audit stream across customer payments, inventory reorder points, and repeat merchant actions.
                </p>
              </div>

              {/* Segmented Channel Navigation */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-4 p-1.5 rounded-full bg-slate-200/80 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('feed')}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-full transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.985] active:translate-y-0.5 ${
                    activeTab === 'feed'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Bell size={14} className={activeTab === 'feed' ? 'text-[#0052FF]' : ''} />
                  <span>All Events</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('settlement')}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-full transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.985] active:translate-y-0.5 ${
                    activeTab === 'settlement'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building2 size={14} className={activeTab === 'settlement' ? 'text-emerald-600' : ''} />
                  <span>Settlements</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('inventory')}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-full transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.985] active:translate-y-0.5 ${
                    activeTab === 'inventory'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Package size={14} className={activeTab === 'inventory' ? 'text-amber-600' : ''} />
                  <span>Stock Radar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('suggestions')}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-full transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.985] active:translate-y-0.5 ${
                    activeTab === 'suggestions'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <TrendingUp size={14} className={activeTab === 'suggestions' ? 'text-[#EA580C]' : ''} />
                  <span>Store Actions</span>
                </button>
              </div>

              {/* Feed Card List */}
              <div className="space-y-3 mb-6 min-h-[220px]">
                {alerts[activeTab].map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all text-left"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2.5">
                        {item.type === 'inventory' ? (
                          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                            <AlertTriangle size={15} />
                          </div>
                        ) : item.type === 'settlement' ? (
                          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                            <CheckCircle2 size={15} />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-orange-50 text-[#EA580C] border border-orange-200 flex items-center justify-center shrink-0">
                            <Sparkles size={15} />
                          </div>
                        )}
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900">{item.title}</h4>
                      </div>

                      {item.highlight && (
                        <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200 shrink-0">
                          {item.highlight}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed font-normal ml-9 mb-2.5">
                      {item.detail}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium ml-9 pt-2 border-t border-slate-100">
                      <span>{item.time}</span>
                      {item.actionLabel && (
                        <span className="text-[#0052FF] font-semibold hover:underline cursor-pointer flex items-center gap-1">
                          {item.actionLabel}
                          <ChevronRight size={13} />
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Strip with Premium Pill CTA */}
              <div className="pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-600 font-medium flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Included with every FeraSetu store · 0% commission</span>
                </div>

                <button
                  type="button"
                  onClick={onStart}
                  className="group w-full sm:w-auto min-h-[48px] px-8 py-3.5 rounded-full bg-[#EA580C] hover:bg-[#C2410C] active:bg-[#9A3412] text-white font-semibold text-sm transition-all duration-200 shadow-md shadow-orange-500/25 hover:shadow-orange-500/35 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Start free with Fero</span>
                  <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
                </button>
              </div>

            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
