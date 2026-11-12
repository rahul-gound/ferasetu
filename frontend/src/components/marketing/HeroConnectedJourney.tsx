import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  ShoppingBag,
  Sparkles,
  Building2,
  Clock,
  Check,
  RotateCcw,
  Receipt,
  Store,
  ChevronRight,
  CreditCard,
  Banknote
} from 'lucide-react';
import FeroMascot from '../ui/FeroMascot';

interface HeroConnectedJourneyProps {
  market?: string;
  onExplorePlans?: () => void;
}

export default function HeroConnectedJourney({ market = 'IN', onExplorePlans }: HeroConnectedJourneyProps) {
  const isIndia = market === 'IN';
  const currencySymbol = isIndia ? '₹' : '$';
  const itemPrice = isIndia ? 1450 : 45;
  const legacyToll = Math.round(itemPrice * 0.18);
  const netEarnings = itemPrice;

  // Simulation state
  const [simulationStep, setSimulationStep] = useState<'idle' | 'transmitting' | 'settled'>('idle');
  const [orderCount, setOrderCount] = useState<number>(1);
  const [cumulativeSaved, setCumulativeSaved] = useState<number>(legacyToll);

  const handleSimulateOrder = () => {
    if (simulationStep === 'transmitting') return;
    setSimulationStep('transmitting');

    setTimeout(() => {
      setSimulationStep('settled');
      setOrderCount((prev) => prev + 1);
      setCumulativeSaved((prev) => prev + legacyToll);
    }, 900);
  };

  const handleReset = () => {
    setSimulationStep('idle');
  };

  return (
    <div className="w-full max-w-5xl mx-auto mt-8 sm:mt-12">
      {/* Top Experience Pill */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4 px-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
          <span className="text-slate-300">Live Interactive Proof:</span>
          <span className="text-[#F59E0B]">The Sovereign Commerce Loop</span>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <span className="hidden sm:inline">Commission saved on FeraSetu:</span>
          <span className="font-mono font-bold text-[#10B981] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            {currencySymbol}{cumulativeSaved.toLocaleString()}
          </span>
          {simulationStep === 'settled' && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-slate-400 hover:text-slate-700 underline cursor-pointer ml-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Split-Preview Card */}
      <div className="relative rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-8 shadow-ambient-lg overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#0052FF]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#F59E0B]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* ========================================================== */}
          {/* LEFT: Customer Mobile Storefront Experience (Col 1-5)      */}
          {/* ========================================================== */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full max-w-[340px] rounded-[2.5rem] border-[6px] border-slate-900 bg-slate-900 p-2 shadow-2xl relative">
              {/* Phone Speaker & Camera Notch */}
              <div className="h-4 w-28 bg-slate-900 rounded-b-xl mx-auto absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center">
                <div className="w-10 h-1 bg-slate-700 rounded-full" />
              </div>

              {/* Inner Screen */}
              <div className="w-full rounded-[2rem] bg-[#F8FAFC] overflow-hidden pt-6 pb-4 px-3.5 flex flex-col text-left">
                {/* Store Header in Phone */}
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#0052FF] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                      S
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 leading-tight">Sharma Heritage Organics</div>
                      <div className="text-[10px] text-slate-500 font-mono">sharma.ferasetu.com</div>
                    </div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-[#10B981]" title="Store Live" />
                </div>

                {/* Product Card */}
                <div className="rounded-xl bg-white border border-slate-200/90 p-3 shadow-xs mb-3">
                  <div className="flex items-start gap-2.5 mb-2">
                    <div className="w-12 h-12 rounded-lg bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700 shrink-0">
                      <ShoppingBag size={20} />
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider bg-amber-50 px-1.5 py-0.5 rounded">
                        Artisan Batch
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 mt-1 leading-snug">
                        {isIndia ? 'Cold-Pressed Mustard Oil & Lakadong Turmeric' : 'Organic Cold-Pressed Olive & Sea Salt'}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                        Qty: 1 · {currencySymbol}{itemPrice.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 border-t border-slate-100 pt-1.5 flex justify-between">
                    <span>Customer: Ananya S. (Mumbai)</span>
                    <span className="text-[#10B981] font-semibold">1-Tap Direct UPI</span>
                  </div>
                </div>

                {/* Primary Simulation CTA Button */}
                <button
                  type="button"
                  onClick={handleSimulateOrder}
                  disabled={simulationStep === 'transmitting'}
                  className={`w-full py-3 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-md ${
                    simulationStep === 'transmitting'
                      ? 'bg-amber-500 text-white animate-pulse'
                      : simulationStep === 'settled'
                      ? 'bg-slate-900 text-white hover:bg-slate-800'
                      : 'bg-[#0052FF] text-white hover:bg-[#0047E0] hover:scale-[1.02] shadow-[#0052FF]/25'
                  }`}
                >
                  {simulationStep === 'transmitting' ? (
                    <>
                      <Zap size={14} className="animate-spin text-white" />
                      <span>Transmitting Direct Order...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} className="text-[#F59E0B]" />
                      <span>Simulate Customer Order ({currencySymbol}{itemPrice})</span>
                    </>
                  )}
                </button>

                <p className="text-[10px] text-center text-slate-400 mt-2 font-medium">
                  Tap to watch the money &amp; invoice travel directly to the merchant
                </p>
              </div>
            </div>
            <div className="mt-2 text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Smartphone size={13} className="text-[#0052FF]" />
              <span>Customer Mobile Storefront</span>
            </div>
          </div>

          {/* ========================================================== */}
          {/* CENTER: The Sovereign Bridge Rail (Col 6-7)                */}
          {/* ========================================================== */}
          <div className="lg:col-span-2 flex flex-col items-center justify-center py-2 lg:py-0">
            <div className="relative w-full flex lg:flex-col items-center justify-center gap-2">
              {/* Animated Connection Line */}
              <div className="hidden lg:block w-0.5 h-36 bg-gradient-to-b from-[#0052FF] via-[#F59E0B] to-[#10B981] relative">
                {simulationStep === 'transmitting' && (
                  <div className="w-3 h-3 rounded-full bg-[#F59E0B] shadow-glow-gold absolute -left-[5px] top-0 animate-bounce" />
                )}
              </div>

              {/* Sovereign Rail Emblem */}
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-lg flex flex-col items-center text-center">
                <FeroMascot size={44} shape="circle" showBadge={false} />
                <span className="text-[10px] font-mono font-bold text-[#F59E0B] mt-1.5 uppercase tracking-wider">
                  0% Toll Rail
                </span>
                <span className="text-[9px] text-slate-400 leading-tight mt-0.5">
                  Direct Bank Settlement
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* RIGHT: Merchant Sovereign Dashboard Terminal (Col 8-12)    */}
          {/* ========================================================== */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="rounded-2xl border border-slate-200/90 bg-[#F8FAFC] p-4 sm:p-5 shadow-xs">
              {/* Terminal Header */}
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                    <Store size={16} className="text-[#0052FF]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Merchant Operations Workbench</div>
                    <div className="text-[11px] text-[#10B981] font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                      <span>Direct Settlement Active</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-mono uppercase block">Order Feed</span>
                  <span className="text-xs font-mono font-bold text-slate-700">#FS-942{orderCount}</span>
                </div>
              </div>

              {/* Settlement Live Ledger Card */}
              <div className="rounded-xl bg-white border border-slate-200/80 p-3.5 shadow-2xs space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">Customer Paid:</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {currencySymbol}{itemPrice.toLocaleString()}.00
                  </span>
                </div>

                {/* Traditional Marketplace Comparison */}
                <div className="flex justify-between items-center text-xs bg-rose-50/70 p-2 rounded-lg border border-rose-100">
                  <div className="flex items-center gap-1.5 text-rose-900 font-medium">
                    <span className="text-xs line-through text-rose-500">Marketplace Cut (18%):</span>
                  </div>
                  <span className="font-mono text-rose-600 font-bold line-through tabular-nums">
                    -{currencySymbol}{legacyToll.toLocaleString()}.00
                  </span>
                </div>

                {/* FeraSetu Commission: 0% */}
                <div className="flex justify-between items-center text-xs bg-amber-50/80 p-2 rounded-lg border border-amber-200/80">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-[#F59E0B]" />
                    <span className="font-bold text-amber-950">FeraSetu Platform Cut:</span>
                  </div>
                  <span className="font-mono font-extrabold text-[#F59E0B] tabular-nums">
                    {currencySymbol}0.00 (0%)
                  </span>
                </div>

                {/* Net Merchant Bank Deposit */}
                <div className="flex justify-between items-center text-sm border-t border-slate-200/80 pt-2 font-bold">
                  <div className="flex items-center gap-1.5 text-slate-900">
                    <Building2 size={16} className="text-[#10B981]" />
                    <span>Direct Bank Deposit:</span>
                  </div>
                  <span className="font-mono font-black text-[#10B981] tabular-nums text-base">
                    100% ({currencySymbol}{netEarnings.toLocaleString()}.00)
                  </span>
                </div>
              </div>

              {/* Real-time Settlement Status Pill */}
              <div className="mt-3.5 flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[#059669] text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-[#10B981]" />
                  <span>Immediate Bank Settlement (Zero Escrow)</span>
                </div>
                <span className="font-mono text-[10px] text-emerald-800 uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-emerald-200">
                  Settled
                </span>
              </div>
            </div>

            <div className="mt-2 text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Receipt size={13} className="text-[#10B981]" />
              <span>Merchant Real-Time Ledger</span>
            </div>
          </div>
        </div>

        {/* Bottom Sovereign Guarantee */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#0052FF]" />
            <span>
              <strong>Zero percentage toll.</strong> No hidden marketplace cuts, no 14-day escrow lockups.
            </span>
          </div>

          {onExplorePlans && (
            <button
              type="button"
              onClick={onExplorePlans}
              className="font-bold text-[#0052FF] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Compare all features</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
