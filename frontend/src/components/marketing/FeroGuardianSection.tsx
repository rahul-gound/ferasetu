import React, { useState, useEffect } from 'react';
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
  Lock,
  QrCode
} from 'lucide-react';
import { StripeLogo, PayPalLogo, RazorpayLogo, UpiLogo } from '../integrations/IntegrationLogos';

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

interface PaymentProvider {
  id: string;
  name: string;
  subtitle: string;
  icon: React.ReactNode;
  tag: string;
}

function AdyenLogoIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <rect width="24" height="24" rx="6" fill="#0ABF53" />
      <path d="M12 6L6 18H9.5L10.7 15.3H13.3L14.5 18H18L12 6ZM11.3 13.8L12 11.2L12.7 13.8H11.3Z" fill="#FFFFFF" />
    </svg>
  );
}

function WorldlineLogoIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <rect width="24" height="24" rx="6" fill="#002D62" />
      <path d="M6 8L8.5 16L11 9L13.5 16L16 8" stroke="#00A3E0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MollieLogoIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <rect width="24" height="24" rx="6" fill="#1A1A1A" />
      <path d="M7 16V10C7 8.5 8 7.5 9.5 7.5C11 7.5 12 8.5 12 10V16M12 10C12 8.5 13 7.5 14.5 7.5C16 7.5 17 8.5 17 10V16" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Fero — The Autonomous Store Intelligence & Security Co-pilot of FeraSetu.
 * Embedded directly in every merchant store: continuously monitoring stock levels,
 * auditing direct bank deposits, verifying 0% commission, and surfacing real shop actions.
 */
export default function FeroGuardianSection({ onStart, market = 'IN' }: FeroAgentMonitorProps) {
  const isIndia = market === 'IN';
  const isEU = market === 'EU';
  const currency = isIndia ? '₹' : isEU ? '€' : '$';
  const [activeTab, setActiveTab] = useState<MonitorTab>('feed');

  // Regional Payment Providers
  const euProviders: PaymentProvider[] = [
    { id: 'stripe', name: 'Stripe', subtitle: 'Instant SEPA & Card Settlements', icon: <StripeLogo size={24} />, tag: 'Direct Conduit' },
    { id: 'adyen', name: 'Adyen', subtitle: 'Pan-European Gateway & Clearing', icon: <AdyenLogoIcon />, tag: 'Direct Conduit' },
    { id: 'paypal', name: 'PayPal', subtitle: 'One-Touch Global Checkout', icon: <PayPalLogo size={24} />, tag: 'Direct Conduit' },
    { id: 'worldline', name: 'Worldline', subtitle: 'European Omnichannel Processing', icon: <WorldlineLogoIcon />, tag: 'Direct Conduit' },
    { id: 'mollie', name: 'Mollie', subtitle: 'iDEAL, Bancontact & Cards', icon: <MollieLogoIcon />, tag: 'Direct Conduit' },
  ];

  const globalProviders: PaymentProvider[] = [
    { id: 'stripe', name: 'Stripe', subtitle: 'Multi-Currency Direct Clearing', icon: <StripeLogo size={24} />, tag: 'Direct Conduit' },
    { id: 'paypal', name: 'PayPal', subtitle: '200+ Countries Global Settlement', icon: <PayPalLogo size={24} />, tag: 'Direct Conduit' },
  ];

  const indiaProviders: PaymentProvider[] = [
    { id: 'upi', name: 'Direct Bank UPI & QR', subtitle: '0% Platform Fee · Direct to A/C', icon: <UpiLogo size={24} />, tag: 'Default Native' },
    { id: 'razorpay', name: 'Razorpay Integration', subtitle: 'Cards, Netbanking & EMI Conduits', icon: <RazorpayLogo size={24} />, tag: 'Optional Gateway' },
  ];

  const activeProviderList = isIndia ? indiaProviders : isEU ? euProviders : globalProviders;
  const [providerIndex, setProviderIndex] = useState(0);

  // Cycle active provider every 1.5 seconds (1500ms) with smooth animation
  useEffect(() => {
    const timer = setInterval(() => {
      setProviderIndex((prev) => (prev + 1) % activeProviderList.length);
    }, 1500);
    return () => clearInterval(timer);
  }, [activeProviderList.length]);

  const currentProvider = activeProviderList[providerIndex] || activeProviderList[0];

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

          {/* Regional Header Subtitle with Active Provider Callout */}
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-2xl mx-auto">
            {isIndia ? (
              <>
                FeraSetu connects your shop directly with <strong>Direct Bank Deposit via instant UPI & QR</strong> by default, keeping 100% in your hands with zero platform cuts. If you wish, connect Razorpay for additional channels. Built inside is <strong>Fero</strong> — monitoring stock and settlement 24/7.
              </>
            ) : isEU ? (
              <>
                FeraSetu is your independent 0% commission storefront. You can integrate supported European payment providers including{' '}
                <span className="inline-flex items-center gap-1 font-bold text-slate-900 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  {currentProvider.name}
                </span>{' '}
                directly into your merchant bank with zero intermediary tolls.
              </>
            ) : (
              <>
                FeraSetu is your independent 0% commission storefront. You can integrate supported global payment providers including{' '}
                <span className="inline-flex items-center gap-1 font-bold text-slate-900 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  {currentProvider.name}
                </span>{' '}
                with 0% platform cut and direct account settlements.
              </>
            )}
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

                {/* Live Payment Provider Indicator (Cycles every 1.5s) */}
                <div className="rounded-xl border border-blue-150 bg-blue-50/60 p-3.5 mb-4 transition-all duration-300">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-blue-900 flex items-center gap-1.5">
                      <Building2 size={13} className="text-blue-600" />
                      {isIndia ? 'Direct Settlement Channel' : 'Integrated Payment Provider'}
                    </span>
                    <span className="text-[10px] font-bold text-blue-800 bg-blue-100/90 px-2 py-0.5 rounded-md border border-blue-200">
                      {currentProvider.tag}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-blue-100 shadow-2xs">
                    <div className="shrink-0">
                      {currentProvider.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{currentProvider.name}</span>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          0% Fee
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {currentProvider.subtitle}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Authentic Real Workbench UI Photo / Screenshot Container */}
                <div className="relative rounded-xl border border-slate-200 overflow-hidden mb-4 shadow-xs group">
                  <img
                    src="/hero/dashboard.webp"
                    alt="Real FeraSetu Merchant Counter Register & Settlement Workbench"
                    className="w-full h-auto object-cover transform transition-transform duration-500 group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                  {/* Subtle Gradient & Status Badges Overlaid on Real Screenshot */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent p-3 pt-6 text-white flex items-end justify-between">
                    <div>
                      <div className="text-[10px] font-mono text-emerald-300 uppercase tracking-wider font-bold flex items-center gap-1">
                        <CheckCircle2 size={11} />
                        100% Reconciled D1 Ledger
                      </div>
                      <div className="text-xs font-bold text-white mt-0.5">
                        {currency}{isIndia ? '14,250.00' : '420.00'} Direct Collected
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-[#EA580C] text-white px-2 py-0.5 rounded-md shadow-xs">
                      0% Commission
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
              <div role="tablist" aria-label="Event channels" className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-4 p-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'feed'}
                  onClick={() => setActiveTab('feed')}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'feed'
                      ? 'bg-white text-slate-900 shadow-xs font-bold border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <Bell size={14} className={activeTab === 'feed' ? 'text-[#0052FF]' : ''} />
                  <span>All Events</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'settlement'}
                  onClick={() => setActiveTab('settlement')}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'settlement'
                      ? 'bg-white text-slate-900 shadow-xs font-bold border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <Building2 size={14} className={activeTab === 'settlement' ? 'text-emerald-600' : ''} />
                  <span>Settlements</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'inventory'}
                  onClick={() => setActiveTab('inventory')}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'inventory'
                      ? 'bg-white text-slate-900 shadow-xs font-bold border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <Package size={14} className={activeTab === 'inventory' ? 'text-amber-600' : ''} />
                  <span>Stock Radar</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'suggestions'}
                  onClick={() => setActiveTab('suggestions')}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'suggestions'
                      ? 'bg-white text-slate-900 shadow-xs font-bold border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <TrendingUp size={14} className={activeTab === 'suggestions' ? 'text-[#EA580C]' : ''} />
                  <span>Store Actions</span>
                </button>
              </div>

              {/* Feed Card List */}
              <div key={activeTab} className="space-y-3 mb-6 min-h-[220px]">
                {alerts[activeTab].map((item, idx) => (
                  <div
                    key={item.id}
                    style={{ animationDelay: `${idx * 70}ms` }}
                    className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all text-left animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both"
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
