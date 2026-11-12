import React, { useState, useId } from 'react';
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
  Percent
} from 'lucide-react';

interface CommissionCalculatorMatrixProps {
  market?: string;
  onStart?: () => void;
}

export default function CommissionCalculatorMatrix({ market = 'IN', onStart }: CommissionCalculatorMatrixProps) {
  const isIndia = market === 'IN';
  const currencySymbol = isIndia ? '₹' : '$';

  // Sales volume presets & default
  const defaultSales = isIndia ? 250000 : 8000;
  const minSales = isIndia ? 25000 : 500;
  const maxSales = isIndia ? 2000000 : 50000;
  const stepSales = isIndia ? 25000 : 500;

  const [monthlySales, setMonthlySales] = useState<number>(defaultSales);
  const [marketplaceTollRate, setMarketplaceTollRate] = useState<number>(18); // 18% standard marketplace commission
  const sliderId = useId();

  // Calculations
  const monthlyMarketplaceToll = Math.round(monthlySales * (marketplaceTollRate / 100));
  const annualMarketplaceToll = monthlyMarketplaceToll * 12;
  const ferasetuPlatformFee = 0; // 0% platform commission!
  const annualSaved = annualMarketplaceToll;

  const formatAmount = (val: number) => {
    return currencySymbol + Math.round(val).toLocaleString(isIndia ? 'en-IN' : 'en-US');
  };

  return (
    <section id="commission-calculator" className="py-16 md:py-24 bg-[#F8FAFC] border-y border-slate-200/80">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200/90 text-amber-950 text-xs sm:text-sm font-semibold mb-4 shadow-2xs">
            <Coins size={15} className="text-[#F59E0B]" />
            <span className="font-mono text-[11px] font-black tracking-wider uppercase text-amber-800">
              COMMISSION TRANSPARENCY CALCULATOR
            </span>
            <span className="text-amber-300">|</span>
            <span className="font-extrabold text-[#F59E0B]">0% Platform Toll</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4">
            Calculate your relief from marketplace exploitation.
          </h2>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Every rupee or dollar you earn from customer trust should stay in your store and family. See how much traditional marketplaces confiscate from your business every single year.
          </p>
        </div>

        {/* Interactive Calculator + Matrix Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ======================================================== */}
          {/* LEFT: Dynamic Slider & Real Annual Savings (Col 1-5)      */}
          {/* ======================================================== */}
          <div className="lg:col-span-5 rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-ambient space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor={sliderId} className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Your Monthly Store Sales
                </label>
                <span className="font-mono text-xl sm:text-2xl font-black text-[#0052FF] tabular-nums">
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

              <div className="flex justify-between text-[11px] text-slate-400 font-mono mt-1.5">
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
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
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

            {/* Big Relief Highlight Card */}
            <div className="rounded-2xl border-2 border-amber-300/80 bg-gradient-to-br from-amber-50/90 via-amber-50/40 to-emerald-50/60 p-6 text-center shadow-xs">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-900">
                Annual Money Retained on FeraSetu
              </span>
              <div className="text-3xl sm:text-4xl font-black text-[#0A0F1D] font-mono tabular-nums mt-1 mb-2">
                <span className="text-[#10B981]">{formatAmount(annualSaved)}</span>
                <span className="text-xs text-slate-500 font-sans font-semibold block sm:inline sm:ml-1">
                  kept every year
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                That is <strong>{formatAmount(monthlyMarketplaceToll)}</strong> staying in your bank account every single month instead of disappearing into platform commission fees.
              </p>

              {onStart && (
                <button
                  type="button"
                  onClick={onStart}
                  className="mt-4 w-full py-3 px-4 rounded-xl bg-[#0052FF] hover:bg-[#0047E0] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-[#0052FF]/20 cursor-pointer min-h-[48px]"
                >
                  <span>Claim Your 0% Commission Store</span>
                  <ArrowRight size={15} />
                </button>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* RIGHT: Side-by-Side Sovereignty Matrix (Col 6-12)         */}
          {/* ======================================================== */}
          <div className="lg:col-span-7 rounded-3xl border border-slate-200/80 bg-white overflow-hidden shadow-ambient">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">The Sovereignty Matrix</h3>
                <p className="text-xs text-slate-500">Why independent shopkeepers leave aggregators for FeraSetu</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#10B981]/10 text-[#059669] text-xs font-bold border border-[#10B981]/20">
                100% Ownership
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs sm:text-sm">
              {/* Row 1: Platform Cut */}
              <div className="grid grid-cols-12 p-4 sm:p-5 hover:bg-slate-50/50 transition-colors">
                <div className="col-span-4 sm:col-span-4 font-bold text-slate-900 flex items-center gap-1.5">
                  <Percent size={15} className="text-[#0052FF] shrink-0" />
                  <span>Platform Cut</span>
                </div>
                <div className="col-span-4 sm:col-span-4 text-rose-700 bg-rose-50/70 p-2 rounded-lg border border-rose-100 text-xs">
                  <div className="font-bold flex items-center gap-1">
                    <XCircle size={13} className="text-rose-600 shrink-0" />
                    <span>15% to 25% Toll</span>
                  </div>
                  <div className="text-[10px] text-rose-500 font-mono mt-0.5">
                    Forfeiting {formatAmount(monthlyMarketplaceToll)}/mo
                  </div>
                </div>
                <div className="col-span-4 sm:col-span-4 text-[#059669] bg-emerald-50/80 p-2 rounded-lg border border-emerald-200 text-xs ml-2">
                  <div className="font-bold flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-[#10B981] shrink-0" />
                    <span>0% Commission</span>
                  </div>
                  <div className="text-[10px] text-emerald-700 font-mono mt-0.5">
                    Keep 100% of your margin
                  </div>
                </div>
              </div>

              {/* Row 2: Customer Data Ownership */}
              <div className="grid grid-cols-12 p-4 sm:p-5 hover:bg-slate-50/50 transition-colors">
                <div className="col-span-4 sm:col-span-4 font-bold text-slate-900 flex items-center gap-1.5">
                  <Users size={15} className="text-[#0052FF] shrink-0" />
                  <span>Customer Data</span>
                </div>
                <div className="col-span-4 sm:col-span-4 text-slate-600 p-2 text-xs">
                  <div className="font-semibold text-rose-600 flex items-center gap-1">
                    <Lock size={12} className="shrink-0" />
                    <span>Locked &amp; Masked</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Aggregators hide customer phone numbers &amp; market rivals
                  </div>
                </div>
                <div className="col-span-4 sm:col-span-4 text-slate-900 p-2 text-xs ml-2">
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
              <div className="grid grid-cols-12 p-4 sm:p-5 hover:bg-slate-50/50 transition-colors">
                <div className="col-span-4 sm:col-span-4 font-bold text-slate-900 flex items-center gap-1.5">
                  <Wallet size={15} className="text-[#0052FF] shrink-0" />
                  <span>Settlement Speed</span>
                </div>
                <div className="col-span-4 sm:col-span-4 text-slate-600 p-2 text-xs">
                  <div className="font-semibold text-slate-700">7 to 14 Days Delay</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Funds locked in aggregator escrow with clawback risks
                  </div>
                </div>
                <div className="col-span-4 sm:col-span-4 text-slate-900 p-2 text-xs ml-2">
                  <div className="font-semibold text-[#10B981]">Direct Bank Payouts</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Direct UPI &amp; card rails settle into your account
                  </div>
                </div>
              </div>

              {/* Row 4: Store Branding & Identity */}
              <div className="grid grid-cols-12 p-4 sm:p-5 hover:bg-slate-50/50 transition-colors">
                <div className="col-span-4 sm:col-span-4 font-bold text-slate-900 flex items-center gap-1.5">
                  <Building2 size={15} className="text-[#0052FF] shrink-0" />
                  <span>Store Identity</span>
                </div>
                <div className="col-span-4 sm:col-span-4 text-slate-600 p-2 text-xs">
                  <div className="font-semibold text-slate-700">Generic Listing</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Customers think they bought from the app, not you
                  </div>
                </div>
                <div className="col-span-4 sm:col-span-4 text-slate-900 p-2 text-xs ml-2">
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
    </section>
  );
}
