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
  ChevronRight
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
}

/**
 * Fero — The Autonomous AI Shopkeeper Agent of FeraSetu.
 * Associated with FeraSetu, Fero monitors the store 24/7,
 * audits settlements, watches stock, and delivers proactive advice.
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
        detail: `Order #FS-9421 (${currency}${isIndia ? '1,450' : '45'}) deposited directly into your bank via UPI. FeraSetu platform toll: ${currency}0.00.`,
        time: '2 mins ago',
        highlight: '100% Retained',
      },
      {
        id: '2',
        type: 'inventory',
        title: 'Low Stock Early Warning',
        detail: 'Cold-Pressed Mustard Oil is down to 3 units. At current order velocity, shelf will empty before Saturday.',
        actionLabel: 'Reorder 12 Units',
        time: '18 mins ago',
        highlight: 'Stock Risk',
      },
      {
        id: '3',
        type: 'suggestion',
        title: 'Repeat Customer Action',
        detail: 'Customer Ananya S. completed her 3rd order this month. Send a 1-tap WhatsApp appreciation note.',
        actionLabel: 'Open WhatsApp Draft',
        time: '1 hour ago',
        highlight: 'Growth Advice',
      },
    ],
    inventory: [
      {
        id: 'inv-1',
        type: 'inventory',
        title: 'Lakadong Turmeric (250g)',
        detail: 'Sales velocity up 2.4x this week. Remaining stock: 5 units. Recommended restock quantity: 20 units.',
        actionLabel: 'Mark Restocked',
        time: 'Active Alert',
        highlight: 'High Demand',
      },
      {
        id: 'inv-2',
        type: 'inventory',
        title: 'Cold-Pressed Mustard Oil (1L)',
        detail: 'Down to 3 units. Shelves projected to run dry in 48 hours based on weekday counter traffic.',
        actionLabel: 'Draft Supplier PO',
        time: 'Active Alert',
        highlight: 'Low Stock',
      },
    ],
    settlement: [
      {
        id: 'set-1',
        type: 'settlement',
        title: 'Batch Settlement Reconciliation',
        detail: `Today's 14 customer payments totaling ${currency}${isIndia ? '18,450' : '420'}.00 deposited directly. Zero platform escrow holds or hidden deductions detected.`,
        time: 'Today · Verified',
        highlight: '₹0 Platform Toll',
      },
      {
        id: 'set-2',
        type: 'settlement',
        title: 'Gateway Direct Conduit Status',
        detail: 'Instant settlement webhook responding in 142ms. Direct conduit to merchant bank active and healthy.',
        time: 'Continuous Health Check',
        highlight: 'Live Conduit',
      },
    ],
    suggestions: [
      {
        id: 'sug-1',
        type: 'suggestion',
        title: 'Morning Breakfast Bundle Opportunity',
        detail: '8 shoppers bought filter coffee powder without chicory. Bundling them at 10% combo discount can raise average ticket value.',
        actionLabel: 'Create 1-Click Bundle',
        time: 'Recommended Today',
        highlight: '+18% Margin',
      },
      {
        id: 'sug-2',
        type: 'suggestion',
        title: 'VIP Customer Loyalty Reach-Out',
        detail: '11 repeat buyers have not visited in 21 days. A quick WhatsApp greeting with new arrivals brings 40% back.',
        actionLabel: 'Review Customer Roster',
        time: 'Customer Care',
        highlight: 'Retention',
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
        <div className="max-w-3xl mx-auto text-center mb-14 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.12] mb-5">
            Meet Fero. Built-in store intelligence that protects your margin.
          </h2>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-2xl mx-auto">
            FeraSetu is your independent 0% commission storefront. Fero is the intelligent operations co-pilot built inside: monitoring stock levels, verifying direct bank deposits, and surfacing clear merchant actions.
          </p>
        </div>

        {/* 2-Column Main Showcase Card */}
        <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6 sm:p-10 lg:p-12 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Column 1: Store Telemetry & Operations Console (Col 1-5) */}
            <div className="lg:col-span-5 flex flex-col">
              <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
                
                {/* Console Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                      <Store size={18} className="text-blue-500" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">Store Telemetry Console</div>
                      <div className="text-[11px] text-slate-500 font-mono">sharma.ferasetu.com</div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active Monitor
                  </span>
                </div>

                {/* Real Operational Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-[11px] font-medium text-slate-500 mb-1">Bank Conduit</div>
                    <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 size={15} className="text-emerald-600" />
                      <span>Direct 100%</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">0% platform toll</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-[11px] font-medium text-slate-500 mb-1">Catalog Watch</div>
                    <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Package size={15} className="text-blue-600" />
                      <span>14 SKUs Synced</span>
                    </div>
                    <div className="text-[10px] text-amber-700 font-medium mt-0.5">1 low stock alert</div>
                  </div>
                </div>

                {/* Live Merchant Audit Briefing */}
                <div className="p-4 rounded-xl bg-slate-900 text-white shadow-xs">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-emerald-400" />
                      Automated Deposit Audit
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Real-time verification
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    "I verified 14 UPI customer orders deposited directly into your bank account. Total platform fee charged: ₹0.00. Cold-pressed mustard oil is running low — restock draft prepared."
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <RefreshCw size={12} className="text-slate-400" />
                    <span>Auto-syncs every 60 seconds</span>
                  </span>
                  <span className="font-medium text-slate-700">0% commission guarantee</span>
                </div>

              </div>

              {/* Character Role Tag */}
              <div className="mt-3 text-center">
                <span className="text-xs font-semibold text-slate-700">Fero Store Intelligence</span>
                <span className="text-xs text-slate-400 ml-1.5">· Built into every FeraSetu store</span>
              </div>
            </div>

            {/* Column 2: Fero's Interactive Monitor Feed & Suggestions (Col 6-12) */}
            <div className="lg:col-span-7 flex flex-col justify-between">
              
              <div className="mb-5">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    Live Store Telemetry
                  </h3>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    Real-Time Feed
                  </span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed font-normal">
                  Real-time monitoring across inventory, deposits, and repeat buyers.
                </p>
              </div>

              {/* Generative Interactive Monitor Channel Tabs */}
              <div className="flex flex-wrap gap-2 mb-4 p-1 rounded-xl bg-slate-200/70 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('feed')}
                  className={`flex-1 min-h-[38px] px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'feed'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Bell size={15} className={activeTab === 'feed' ? 'text-[#0052FF]' : ''} />
                  <span>Live Feed</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('inventory')}
                  className={`flex-1 min-h-[38px] px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'inventory'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Package size={15} className={activeTab === 'inventory' ? 'text-amber-600' : ''} />
                  <span>Stock Watch</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('settlement')}
                  className={`flex-1 min-h-[38px] px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'settlement'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building2 size={15} className={activeTab === 'settlement' ? 'text-emerald-600' : ''} />
                  <span>Payout Audit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('suggestions')}
                  className={`flex-1 min-h-[38px] px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'suggestions'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <TrendingUp size={15} className={activeTab === 'suggestions' ? 'text-purple-600' : ''} />
                  <span>Store Advice</span>
                </button>
              </div>

              {/* Feed Card List */}
              <div className="space-y-3 mb-6 min-h-[220px]">
                {alerts[activeTab].map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all text-left"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        {item.type === 'inventory' ? (
                          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                            <AlertTriangle size={15} />
                          </div>
                        ) : item.type === 'settlement' ? (
                          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                            <CheckCircle2 size={15} />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center shrink-0">
                            <Sparkles size={15} />
                          </div>
                        )}
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900">{item.title}</h4>
                      </div>

                      {item.highlight && (
                        <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                          {item.highlight}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed font-normal ml-9 mb-2">
                      {item.detail}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono ml-9 pt-1.5 border-t border-slate-100">
                      <span>{item.time}</span>
                      {item.actionLabel && (
                        <span className="text-[#0052FF] font-semibold font-sans hover:underline cursor-pointer flex items-center gap-1">
                          {item.actionLabel}
                          <ChevronRight size={13} />
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Strip */}
              <div className="pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-[#10B981]" />
                  <span>Included with every FeraSetu store · 0% commission</span>
                </div>

                <button
                  type="button"
                  onClick={onStart}
                  className="group w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-xl bg-[#0052FF] text-white font-bold text-sm hover:bg-[#0047E0] transition-all duration-150 hover:-translate-y-0.5 shadow-md shadow-[#0052FF]/20 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                >
                  <span>Start free with Fero</span>
                  <ArrowRight size={15} className="transition-transform duration-150 group-hover:translate-x-1" />
                </button>
              </div>

            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
