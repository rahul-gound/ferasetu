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
      className="py-20 md:py-28 bg-white border-b border-slate-200 relative overflow-hidden"
      aria-label="Meet Fero, Autonomous AI Shopkeeper Agent"
    >
      {/* Subtle Background Ambience */}
      <div className="absolute top-10 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 relative z-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-14 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold mb-4 shadow-sm border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span className="font-mono text-[11px] font-bold text-[#F59E0B] uppercase tracking-wider">
              AUTONOMOUS AI SHOPKEEPER AGENT
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.12] mb-5">
            Meet Fero.<br />
            <span className="text-[#0052FF]">The AI agent that monitors your shop.</span>
          </h2>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-2xl mx-auto">
            FeraSetu is your independent 0% commission storefront. Fero is the intelligent AI co-pilot who watches over it. Fero monitors your stock, audits bank deposits, and delivers clear suggestions so your shop runs smoothly.
          </p>
        </div>

        {/* 2-Column Main Showcase Card */}
        <div className="rounded-3xl border border-slate-200/90 bg-slate-50/50 p-6 sm:p-10 lg:p-12 shadow-xl shadow-slate-900/5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Column 1: Fero Portrait with Live Tablet HUD (Col 1-5) */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="relative w-full max-w-[360px] group">
                
                {/* Subtle Amber/Blue Radial Aura */}
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-[#0052FF]/20 via-[#F59E0B]/25 to-[#10B981]/20 blur-md opacity-75 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Portrait Card */}
                <div className="relative rounded-2xl overflow-hidden border-2 border-[#F59E0B]/70 bg-white shadow-2xl">
                  <picture>
                    <source srcSet="/pictures/fero-mascot.webp" type="image/webp" />
                    <img
                      src="/pictures/fero-mascot.jpg"
                      alt="Fero — Autonomous AI shopkeeper agent holding tablet"
                      className="w-full h-auto object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                  </picture>

                  {/* Fero's Live Tablet Screen Overlay */}
                  <div className="absolute bottom-3 left-3 right-3 p-3.5 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700/80 text-white shadow-xl">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-mono font-bold text-[#F59E0B] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
                        Fero Active Monitor
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono text-[10px] font-bold">
                        14 Products Synced
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-snug font-sans">
                      "I verified 14 UPI orders settled directly to your bank account with ₹0 platform cut. Cold-pressed oil needs restock."
                    </p>
                  </div>

                  {/* Corner Badge */}
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-[#10B981] text-white text-[10px] font-mono font-black shadow-md border border-white flex items-center gap-1">
                    <ShieldCheck size={12} />
                    <span>0% COMMISSION AUDIT</span>
                  </div>
                </div>
              </div>

              {/* Character Role Tag */}
              <div className="mt-4 text-center">
                <span className="font-bold text-base text-slate-900 block">Fero</span>
                <span className="text-xs text-slate-500">Autonomous Store AI Agent · FeraSetu</span>
              </div>
            </div>

            {/* Column 2: Fero's Interactive Monitor Feed & Suggestions (Col 6-12) */}
            <div className="lg:col-span-7 flex flex-col justify-between">
              
              <div className="mb-5">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Fero's Real-Time Shop Monitor
                  </h3>
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                    Live Store Telemetry
                  </span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed font-normal">
                  Fero watches your store telemetry in real time. Click a channel below to see how Fero alerts and advises you.
                </p>
              </div>

              {/* Generative Interactive Monitor Channel Tabs */}
              <div className="flex flex-wrap gap-2 mb-4 p-1 rounded-xl bg-slate-200/70 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab('feed')}
                  className={`flex-1 min-h-[38px] px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'feed'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Bell size={13} className={activeTab === 'feed' ? 'text-[#0052FF]' : ''} />
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
                  <Package size={13} className={activeTab === 'inventory' ? 'text-amber-600' : ''} />
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
                  <Building2 size={13} className={activeTab === 'settlement' ? 'text-emerald-600' : ''} />
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
                  <TrendingUp size={13} className={activeTab === 'suggestions' ? 'text-purple-600' : ''} />
                  <span>Store Advice</span>
                </button>
              </div>

              {/* Feed Card List */}
              <div className="space-y-3 mb-6 min-h-[220px]">
                {alerts[activeTab].map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all text-left"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        {item.type === 'inventory' ? (
                          <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                            <AlertTriangle size={13} />
                          </div>
                        ) : item.type === 'settlement' ? (
                          <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                            <CheckCircle2 size={13} />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center shrink-0">
                            <Sparkles size={13} />
                          </div>
                        )}
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900">{item.title}</h4>
                      </div>

                      {item.highlight && (
                        <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                          {item.highlight}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed font-normal ml-8 mb-2">
                      {item.detail}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono ml-8 pt-1 border-t border-slate-100">
                      <span>{item.time}</span>
                      {item.actionLabel && (
                        <span className="text-[#0052FF] font-bold font-sans hover:underline cursor-pointer flex items-center gap-1">
                          {item.actionLabel}
                          <ChevronRight size={11} />
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
