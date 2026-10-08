import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import {
  Store,
  ShoppingCart,
  CreditCard,
  PackageCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  ShieldCheck,
  Building2,
  Globe,
  Users
} from 'lucide-react';
import { type MarketDemoConfig } from '../../config/marketDemo';

interface CompleteCircuitProps {
  demo: MarketDemoConfig;
  market: string;
}

interface CircuitStage {
  step: string;
  name: string;
  tagline: string;
  description: string;
  actor: 'Merchant' | 'Customer' | 'Payment Gateway' | 'Store Team';
  icon: typeof Store;
  keyAction: string;
}

const STAGES: CircuitStage[] = [
  {
    step: '01',
    name: 'Get Online',
    tagline: 'STOREFRONT & CATALOG',
    description: 'Add products with photos, prices, and stock limits right from your phone. Your branded web address is live immediately with zero server setup.',
    actor: 'Merchant',
    icon: Store,
    keyAction: 'Instant Catalog Setup',
  },
  {
    step: '02',
    name: 'Get Orders',
    tagline: 'CUSTOMER DISCOVERY & CART',
    description: 'Customers open your link from WhatsApp, QR codes, or social media. They browse live stock, add items to their cart, and submit structured orders.',
    actor: 'Customer',
    icon: ShoppingCart,
    keyAction: 'Direct Order Intake',
  },
  {
    step: '03',
    name: 'Get Paid',
    tagline: 'DIRECT SETTLEMENT',
    description: 'Payments process directly through your configured gateway. FeraSetu charges 0% platform commission — funds settle directly to your bank account.',
    actor: 'Payment Gateway',
    icon: CreditCard,
    keyAction: '0% Platform Commission',
  },
  {
    step: '04',
    name: 'Complete the Order',
    tagline: 'FULFILLMENT & RETENTION',
    description: 'You pack the order from your shelves. Customer receives status updates and direct receipts. You retain 100% ownership of their contact information.',
    actor: 'Store Team',
    icon: PackageCheck,
    keyAction: 'Owned Customer Data',
  },
];

export default function CompleteCircuit({ demo, market }: CompleteCircuitProps) {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const currentStage = STAGES[activeStepIndex];
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % STAGES.length;
      setActiveStepIndex(nextIndex);
      tabRefs.current[nextIndex]?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + STAGES.length) % STAGES.length;
      setActiveStepIndex(prevIndex);
      tabRefs.current[prevIndex]?.focus();
    }
  };

  return (
    <div className="w-full">
      {/* 4-Stage Stepper Buttons (Accessible Tabs) */}
      <div
        role="tablist"
        aria-label="FeraSetu four-stage commerce circuit"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8"
      >
        {STAGES.map((stage, idx) => {
          const isActive = idx === activeStepIndex;
          const Icon = stage.icon;

          return (
            <button
              key={stage.step}
              ref={(el) => (tabRefs.current[idx] = el)}
              role="tab"
              id={`circuit-tab-${stage.step}`}
              aria-selected={isActive}
              aria-controls={`circuit-panel-${stage.step}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveStepIndex(idx)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              type="button"
              className={`text-left p-4 sm:p-5 rounded-2xl border transition-all duration-150 cursor-pointer flex flex-col justify-between ${
                isActive
                  ? 'bg-white border-blue-600 shadow-md ring-2 ring-blue-600/10'
                  : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded tabular-nums tracking-normal ${
                      isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span>{stage.step}</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {stage.actor}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <Icon
                    size={16}
                    className={isActive ? 'text-blue-600' : 'text-slate-500'}
                    aria-hidden="true"
                  />
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">
                    {stage.name}
                  </h3>
                </div>
                <p className="text-[11px] font-mono text-slate-500 line-clamp-1">
                  {stage.tagline}
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className={`font-semibold ${isActive ? 'text-blue-700' : 'text-slate-500'}`}>
                  {stage.keyAction}
                </span>
                <span className="font-mono text-slate-400 tabular-nums">
                  {idx + 1}/4
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Interactive Stage Display */}
      <div
        id={`circuit-panel-${currentStage.step}`}
        role="tabpanel"
        aria-labelledby={`circuit-tab-${currentStage.step}`}
        className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden grid lg:grid-cols-12"
      >
        {/* Left Column: Stage Explanation */}
        <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/60">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4">
              <span className="tabular-nums font-mono">STAGE {currentStage.step}</span>
              <span>·</span>
              <span>{currentStage.tagline}</span>
            </div>

            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-3">
              {currentStage.name}
            </h3>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-6 font-normal">
              {currentStage.description}
            </p>

            <div className="space-y-3 pt-4 border-t border-slate-200 text-xs sm:text-sm">
              <div className="flex items-start gap-2.5 text-slate-700">
                <CheckCircle2 size={15} className="text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  {activeStepIndex === 0 && 'Instant cloud edge hosting with automatic SSL and responsive mobile catalog.'}
                  {activeStepIndex === 1 && 'Structured cart checkout avoids chaotic lost chats and transcription errors.'}
                  {activeStepIndex === 2 && 'Non-custodial settlement: FeraSetu does not hold or delay your payouts.'}
                  {activeStepIndex === 3 && 'Unmasked customer phone and order history saved in your merchant ledger.'}
                </span>
              </div>
              <div className="flex items-start gap-2.5 text-slate-700">
                <CheckCircle2 size={15} className="text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  {activeStepIndex === 0 && 'Permanent store link (e.g. ' + demo.displayUrl + ') or your custom domain.'}
                  {activeStepIndex === 1 && 'Customers order directly without downloading a dedicated app or creating an account.'}
                  {activeStepIndex === 2 && 'Zero commission surcharge from FeraSetu on any order.'}
                  {activeStepIndex === 3 && '1-click export of customer contacts, invoices, and product data anytime.'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between text-xs font-mono text-slate-500">
            <span className="tabular-nums">CIRCUIT STAGE {currentStage.step} OF 04</span>
            <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Live Interface Proof
            </span>
          </div>
        </div>

        {/* Right Column: Dynamic Stage Evidence UI */}
        <div className="lg:col-span-7 p-5 sm:p-7 bg-slate-900 text-slate-100 flex items-center justify-center">
          {activeStepIndex === 0 && (
            /* STAGE 01: Storefront Creation Proof */
            <div className="w-full max-w-md bg-white text-slate-900 rounded-xl overflow-hidden shadow-xl border border-slate-700 font-sans text-xs">
              <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                </div>
                <div className="bg-white px-2.5 py-0.5 rounded border border-slate-200 text-slate-700 font-mono text-[11px] flex items-center gap-1.5 truncate max-w-[220px]">
                  <Lock size={10} className="text-blue-600 shrink-0" aria-hidden="true" />
                  <span className="truncate whitespace-nowrap">{demo.storeUrl}</span>
                </div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Storefront Live
                </span>
              </div>
              <div className="p-4 bg-white">
                <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{demo.storeName}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">{demo.storeCategory}</p>
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Verified
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {demo.products.map((p, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-xs text-slate-900">{p.name}</div>
                        <div className="text-[10px] text-slate-500">{p.subtitle} · {p.stock}</div>
                      </div>
                      <span className="font-mono font-bold text-xs text-slate-900">{p.formattedPrice}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeStepIndex === 1 && (
            /* STAGE 02: Structured Order Intake Proof */
            <div className="w-full max-w-md bg-white text-slate-900 rounded-xl overflow-hidden shadow-xl border border-slate-700 font-sans text-xs">
              <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                  <ShoppingCart size={13} className="text-blue-600" aria-hidden="true" />
                  <span>Structured Customer Cart</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">2 Items Selected</span>
              </div>
              <div className="p-4 bg-white space-y-3">
                <div className="space-y-1.5">
                  {demo.products.map((p, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs pb-1.5 border-b border-slate-100">
                      <span className="font-medium text-slate-800">{p.name} (×1)</span>
                      <span className="font-mono font-bold text-slate-900">{p.formattedPrice}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 flex justify-between items-center text-xs">
                  <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold">Total Due</span>
                  <span className="text-sm font-black font-mono text-slate-900">{demo.formattedOrderTotal}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-[11px] leading-relaxed">
                  <strong>Direct Order Conduit:</strong> Itemized details transmit directly into your merchant board with zero customer phone masking.
                </div>
              </div>
            </div>
          )}

          {activeStepIndex === 2 && (
            /* STAGE 03: Direct Payment & Payout Proof */
            <div className="w-full max-w-md bg-white text-slate-900 rounded-xl overflow-hidden shadow-xl border border-slate-700 font-sans text-xs">
              <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                  <CreditCard size={13} className="text-blue-600" aria-hidden="true" />
                  <span>Settlement Breakdown</span>
                </span>
                <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Direct Payout
                </span>
              </div>
              <div className="p-4 bg-white space-y-3 font-mono">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-sans">Gross Order Amount:</span>
                  <span className="font-bold text-slate-900">{demo.formattedOrderTotal}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-sans">FeraSetu Commission Cut:</span>
                  <span className="font-bold text-blue-700">{demo.commissionText}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-sans">Gateway Provider:</span>
                  <span className="text-slate-800">{demo.paymentProviderName}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-900 font-sans">Net Payout to Your Bank:</span>
                  <span className="text-sm font-black text-blue-700">{demo.formattedOrderTotal}*</span>
                </div>
                <p className="text-[10px] text-slate-400 font-sans leading-relaxed pt-1">
                  *Third-party processor charges their standard processing fee directly. FeraSetu adds zero commission surcharge.
                </p>
              </div>
            </div>
          )}

          {activeStepIndex === 3 && (
            /* STAGE 04: Order Fulfillment & Owned Customer Proof */
            <div className="w-full max-w-md bg-white text-slate-900 rounded-xl overflow-hidden shadow-xl border border-slate-700 font-sans text-xs">
              <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                  <PackageCheck size={13} className="text-blue-600" aria-hidden="true" />
                  <span>Merchant Order Ledger</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">{demo.orderId}</span>
              </div>
              <div className="p-4 bg-white space-y-2.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold text-slate-900">{demo.customerName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Direct Contact:</span>
                  <span className="font-mono font-semibold text-slate-900">{demo.customerPhone}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Fulfillment Status:</span>
                  <span className="font-semibold text-blue-700">Packed &amp; Ready for Delivery</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-[11px]">
                  <strong>Owned Relationship:</strong> Customer contact history is stored directly in your merchant account for repeat orders.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
