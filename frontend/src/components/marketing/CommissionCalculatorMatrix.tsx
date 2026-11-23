import React, { useState, useEffect, useId, useRef } from 'react';
import {
  ShieldCheck,
  TrendingUp,
  Coins,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Lock,
  Unlock,
  Users,
  Wallet,
  Building2,
  Percent,
  Check
} from 'lucide-react';
import { useMarket } from '../../contexts/MarketContext';
import type { Market } from '../../config/pricing';

interface CommissionCalculatorMatrixProps {
  market?: string;
  onStart?: () => void;
}

export default function CommissionCalculatorMatrix({ market: propMarket, onStart }: CommissionCalculatorMatrixProps) {
  const { market: contextMarket } = useMarket();
  const activeMarket = (propMarket || contextMarket || 'IN').toUpperCase() as Market;

  const isIndia = activeMarket === 'IN';
  const isEU = activeMarket === 'EU';
  const isUK = activeMarket === 'UK';

  const currencySymbol = isIndia ? '₹' : isEU ? '€' : isUK ? '£' : '$';
  const locale = isIndia ? 'en-IN' : isEU ? 'de-DE' : isUK ? 'en-GB' : 'en-US';

  // Sales volume presets based on market currency
  const defaultSales = isIndia ? 250000 : isEU ? 4000 : isUK ? 3500 : 5000;
  const minSales = isIndia ? 25000 : 500;
  const maxSales = isIndia ? 2000000 : isEU ? 30000 : isUK ? 25000 : 35000;
  const stepSales = isIndia ? 25000 : 500;

  const [monthlySales, setMonthlySales] = useState<number>(defaultSales);
  const [marketplaceTollRate, setMarketplaceTollRate] = useState<number>(18);
  const [revealedIndex, setRevealedIndex] = useState<number>(0);
  const matrixRef = useRef<HTMLDivElement>(null);
  const sliderId = useId();

  // Reset sales default if market changes
  useEffect(() => {
    setMonthlySales(defaultSales);
  }, [activeMarket]);

  // Sequential cascading attraction animation: Row 1 -> Row 2 -> Row 3 -> Row 4
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // Trigger domino / magnetic chain reaction: 1 attracts 2, 2 attracts 3, 3 attracts 4
          setRevealedIndex(1);
          const t2 = setTimeout(() => setRevealedIndex(2), 240);
          const t3 = setTimeout(() => setRevealedIndex(3), 480);
          const t4 = setTimeout(() => setRevealedIndex(4), 720);
          return () => {
            clearTimeout(t2);
            clearTimeout(t3);
            clearTimeout(t4);
          };
        }
      },
      { threshold: 0.25 }
    );

    if (matrixRef.current) observer.observe(matrixRef.current);
    return () => observer.disconnect();
  }, []);

  // Calculations
  const monthlyMarketplaceToll = Math.round(monthlySales * (marketplaceTollRate / 100));
  const annualMarketplaceToll = monthlyMarketplaceToll * 12;
  const annualSaved = annualMarketplaceToll;

  const formatAmount = (val: number) => {
    return currencySymbol + Math.round(val).toLocaleString(locale);
  };

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
      {/* Section Header */}
      <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-14">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
          Calculate what marketplace commissions cost you.
        </h2>
        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          {isIndia
            ? 'Every rupee earned from your customer goodwill belongs in your store. Compare traditional marketplace commissions against direct sovereign ownership.'
            : isEU
            ? 'Every euro earned from customer loyalty belongs to your business. See how much traditional delivery and marketplace platforms take every year.'
            : 'Every dollar earned from customer loyalty belongs to your business. See how much traditional delivery and marketplace platforms take every year.'}
        </p>
      </div>

      {/* Interactive Calculator + Matrix Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ======================================================== */}
        {/* LEFT: Dynamic Slider & Real Annual Savings (Col 1-5)      */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor={sliderId} className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Monthly Store Sales
              </label>
              <span className="text-2xl sm:text-3xl font-extrabold text-[#0052FF] tabular-nums">
                {formatAmount(monthlySales)}
              </span>
            </div>

            {/* Slider Input */}
            <input
              id={sliderId}
              type="range"
              min={minSales}
              max={maxSales}
              step={stepSales}
              value={monthlySales}
              onChange={(e) => setMonthlySales(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0052FF]"
              aria-label="Monthly Sales Volume Slider"
            />

            <div className="flex justify-between text-xs text-slate-500 font-medium mt-1.5 tabular-nums">
              <span>{formatAmount(minSales)}/mo</span>
              <span>{formatAmount(maxSales / 2)}/mo</span>
              <span>{formatAmount(maxSales)}/mo</span>
            </div>
          </div>

          {/* Marketplace Toll Rate Selector */}
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Typical Marketplace Commission Rate
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[15, 18, 22].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setMarketplaceTollRate(rate)}
                  className={`py-2 px-3 rounded-full text-xs font-bold transition-all cursor-pointer border active:translate-y-0.5 active:scale-[0.985] ${
                    marketplaceTollRate === rate
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{rate}% toll</span>
                </button>
              ))}
            </div>
          </div>

          {/* Relief Highlight Card */}
          <div className="rounded-2xl border-2 border-amber-300/80 bg-gradient-to-br from-amber-50/90 via-amber-50/40 to-emerald-50/60 p-6 text-center shadow-xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-900">
              Annual Money Retained on FeraSetu
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold text-[#0A0F1D] tabular-nums mt-1 mb-2">
              <span className="text-emerald-600">{formatAmount(annualSaved)}</span>
              <span className="text-xs text-slate-500 font-medium block sm:inline sm:ml-1">
                kept every year
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              That is <strong className="text-slate-900">{formatAmount(monthlyMarketplaceToll)}</strong> staying in your bank account every single month instead of disappearing into platform commission fees.
            </p>
          </div>

          {/* Primary CTA */}
          <button
            type="button"
            onClick={onStart}
            className="group w-full py-4 rounded-full bg-[#0052FF] hover:bg-[#0047E0] active:bg-[#003BB5] text-white font-semibold text-base transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_0_0_#003BB5,0_8px_16px_rgba(0,82,255,0.25)] hover:shadow-[0_5px_0_0_#003BB5,0_12px_20px_rgba(0,82,255,0.3)] hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_0px_0_0_#003BB5,inset_0_2px_4px_rgba(0,0,0,0.25)]"
          >
            <span>Claim Your 0% Commission Store</span>
            <ArrowRight size={17} className="transition-transform duration-150 group-hover:translate-x-1" />
          </button>
        </div>

        {/* ======================================================== */}
        {/* RIGHT: The Sovereignty Matrix with Magnetic Cascade (Col 6-12) */}
        {/* ======================================================== */}
        <div
          ref={matrixRef}
          className="lg:col-span-7 rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm"
        >
          <div className="p-6 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">The Sovereignty Matrix</h3>
              <p className="text-xs text-slate-500">Why independent shopkeepers leave aggregators for FeraSetu</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
              100% Ownership
            </span>
          </div>

          <div className="divide-y divide-slate-100 text-xs sm:text-sm">
            {/* Row 1: Platform Cut */}
            <div
              className={`grid grid-cols-12 p-4 sm:p-5 transition-all duration-500 ease-out ${
                revealedIndex >= 1
                  ? 'opacity-100 translate-y-0 bg-white'
                  : 'opacity-20 translate-y-3 bg-slate-50/50'
              } hover:bg-slate-50/80`}
            >
              <div className="col-span-4 font-bold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 text-[11px] font-extrabold flex items-center justify-center shrink-0">
                  1
                </span>
                <Percent size={15} className="text-[#0052FF] shrink-0" />
                <span>Platform Cut</span>
              </div>
              <div className="col-span-4 text-rose-700 bg-rose-50/70 p-2.5 rounded-xl border border-rose-100 text-xs">
                <div className="font-bold flex items-center gap-1">
                  <XCircle size={13} className="text-rose-600 shrink-0" />
                  <span>15% to 25% Toll</span>
                </div>
                <div className="text-[10px] text-rose-500 font-medium mt-0.5">
                  Forfeiting {formatAmount(monthlyMarketplaceToll)}/mo
                </div>
              </div>
              <div className="col-span-4 text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-xs ml-2">
                <div className="font-bold flex items-center gap-1">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>0% Commission</span>
                </div>
                <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
                  Keep 100% of your margin
                </div>
              </div>
            </div>

            {/* Row 2: Customer Data Ownership */}
            <div
              className={`grid grid-cols-12 p-4 sm:p-5 transition-all duration-500 ease-out delay-75 ${
                revealedIndex >= 2
                  ? 'opacity-100 translate-y-0 bg-white'
                  : 'opacity-20 translate-y-3 bg-slate-50/50'
              } hover:bg-slate-50/80`}
            >
              <div className="col-span-4 font-bold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 text-[11px] font-extrabold flex items-center justify-center shrink-0">
                  2
                </span>
                <Users size={15} className="text-[#0052FF] shrink-0" />
                <span>Customer Data</span>
              </div>
              <div className="col-span-4 text-slate-600 p-2.5 text-xs">
                <div className="font-semibold text-rose-600 flex items-center gap-1">
                  <Lock size={12} className="shrink-0" />
                  <span>Locked &amp; Masked</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Aggregators hide customer contacts &amp; market rivals
                </div>
              </div>
              <div className="col-span-4 text-slate-900 p-2.5 text-xs ml-2">
                <div className="font-semibold text-[#0052FF] flex items-center gap-1">
                  <Unlock size={12} className="shrink-0" />
                  <span>100% Unmasked &amp; Yours</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Direct phone numbers, repeat orders &amp; WhatsApp lists
                </div>
              </div>
            </div>

            {/* Row 3: Payout Speed & Settlement */}
            <div
              className={`grid grid-cols-12 p-4 sm:p-5 transition-all duration-500 ease-out delay-150 ${
                revealedIndex >= 3
                  ? 'opacity-100 translate-y-0 bg-white'
                  : 'opacity-20 translate-y-3 bg-slate-50/50'
              } hover:bg-slate-50/80`}
            >
              <div className="col-span-4 font-bold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 text-[11px] font-extrabold flex items-center justify-center shrink-0">
                  3
                </span>
                <Wallet size={15} className="text-[#0052FF] shrink-0" />
                <span>Settlement Speed</span>
              </div>
              <div className="col-span-4 text-slate-600 p-2.5 text-xs">
                <div className="font-semibold text-slate-700">7 to 14 Days Delay</div>
                <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Funds locked in aggregator escrow with clawback risks
                </div>
              </div>
              <div className="col-span-4 text-slate-900 p-2.5 text-xs ml-2">
                <div className="font-semibold text-emerald-700">Direct Bank Payouts</div>
                <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Direct UPI &amp; card rails settle into your account
                </div>
              </div>
            </div>

            {/* Row 4: Store Branding & Identity */}
            <div
              className={`grid grid-cols-12 p-4 sm:p-5 transition-all duration-500 ease-out delay-200 ${
                revealedIndex >= 4
                  ? 'opacity-100 translate-y-0 bg-white'
                  : 'opacity-20 translate-y-3 bg-slate-50/50'
              } hover:bg-slate-50/80`}
            >
              <div className="col-span-4 font-bold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 text-[11px] font-extrabold flex items-center justify-center shrink-0">
                  4
                </span>
                <Building2 size={15} className="text-[#0052FF] shrink-0" />
                <span>Store Identity</span>
              </div>
              <div className="col-span-4 text-slate-600 p-2.5 text-xs">
                <div className="font-semibold text-slate-700">Generic Listing</div>
                <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Customers think they bought from the app, not you
                </div>
              </div>
              <div className="col-span-4 text-slate-900 p-2.5 text-xs ml-2">
                <div className="font-semibold text-[#0052FF]">Your Own Sovereign URL</div>
                <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Your domain, custom logo, direct brand loyalty
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 text-[11px] text-slate-500 border-t border-slate-100 flex items-center justify-between">
            <span>* Standard payment processor gateway interchange fees (e.g. Razorpay/Stripe ~1.9%) apply directly.</span>
            <span className="font-bold text-slate-700">FeraSetu Fee: 0%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
