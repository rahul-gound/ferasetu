import { useState } from 'react';
import { ArrowRight, CheckCircle2, Percent, ShieldCheck, TrendingUp, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMarket } from '../../contexts/MarketContext';
import { useAuth } from '../../contexts/AuthContext';

export default function CommissionCalculator() {
  const { market, config } = useMarket();
  const { user, register } = useAuth();

  const isIndia = market === 'IN';

  // Default slider values: ₹1,00,000 for IN, $5,000 for US/EU
  const [sales, setSales] = useState<number>(isIndia ? 100000 : 5000);

  // Platform parameters
  const commissionRate = isIndia ? 0.18 : 0.15; // 18% in India, 15% in US/EU
  const flatFee = isIndia ? 399 : 19; // FeraSetu Business flat fee

  const marketplaceCut = Math.round(sales * commissionRate);
  const monthlySavings = Math.max(0, marketplaceCut - flatFee);
  const annualSavings = monthlySavings * 12;

  const minSales = isIndia ? 20000 : 500;
  const maxSales = isIndia ? 1000000 : 30000;
  const step = isIndia ? 10000 : 500;

  const formatCurrency = (val: number) => {
    if (isIndia) {
      return '₹' + val.toLocaleString('en-IN');
    }
    return `${config.symbol}${val.toLocaleString('en-US')}`;
  };

  return (
    <section
      className="py-20 md:py-24 bg-gradient-to-b from-slate-50 via-white to-slate-50 border-t border-slate-200/80"
      id="commission-calculator"
      aria-label="Commission savings calculator"
    >
      <div className="max-w-[1140px] mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-4">
            <Percent size={14} className="text-emerald-600" />
            Interactive Loss Calculator
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-4">
            How much are marketplaces taking from your pocket?
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            Marketplaces and aggregators charge 15% to 30% on every order you pack. Move the slider to see your exact savings with FeraSetu’s 0% commission store.
          </p>
        </div>

        {/* Interactive Slider Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-10 shadow-xl shadow-slate-950/5 mb-10">
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <label htmlFor="monthly-sales-slider" className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                Your Estimated Monthly Sales
              </label>
              <div className="inline-flex items-baseline gap-1 text-3xl font-black text-blue-600 bg-blue-50 px-4 py-1.5 rounded-2xl border border-blue-100">
                <span>{formatCurrency(sales)}</span>
                <span className="text-xs font-semibold text-slate-500">/ month</span>
              </div>
            </div>

            {/* Slider */}
            <input
              id="monthly-sales-slider"
              type="range"
              min={minSales}
              max={maxSales}
              step={step}
              value={sales}
              onChange={(e) => setSales(Number(e.target.value))}
              aria-label="Estimated monthly sales volume"
              aria-valuemin={minSales}
              aria-valuemax={maxSales}
              aria-valuenow={sales}
              className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
            />

            <div className="flex justify-between text-xs font-semibold text-slate-400 mb-8">
              <span>{formatCurrency(minSales)}/mo</span>
              <span>{formatCurrency(Math.round((maxSales + minSales) / 2))}/mo</span>
              <span>{formatCurrency(maxSales)}/mo</span>
            </div>

            {/* Live Highlight Banner */}
            <div className="rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 p-6 md:p-8 text-white shadow-lg shadow-emerald-600/20 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider mb-2">
                  <TrendingUp size={13} />
                  Net Money Saved With FeraSetu
                </div>
                <div className="text-3xl md:text-5xl font-black tracking-tight">
                  +{formatCurrency(monthlySavings)}
                  <span className="text-lg md:text-xl font-normal opacity-90"> / month</span>
                </div>
                <p className="text-xs md:text-sm text-emerald-100 mt-2 font-medium">
                  That is <strong className="text-white font-bold">{formatCurrency(annualSavings)}</strong> kept in your business bank account every single year.
                </p>
              </div>

              <div className="w-full md:w-auto shrink-0 text-center">
                {user ? (
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold bg-white text-emerald-800 hover:bg-emerald-50 shadow-md transition-all text-sm w-full md:w-auto"
                  >
                    <span>Go to Dashboard</span>
                    <ArrowRight size={16} />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => register()}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold bg-white text-emerald-800 hover:bg-emerald-50 shadow-md transition-all text-sm w-full md:w-auto cursor-pointer"
                  >
                    <span>{isIndia ? 'Start Free Store (₹0)' : 'Start 14-Day Free Trial'}</span>
                    <ArrowRight size={16} />
                  </button>
                )}
                <div className="text-[11px] text-emerald-100 mt-2 font-medium">
                  {isIndia ? '₹0 setup • 0% commission' : '14-day trial • 0% transaction fees'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Side-by-Side Reality Comparison */}
        <div className="grid md:grid-cols-2 gap-7">
          {/* Marketplace Card (Loss Framing) */}
          <div className="bg-white rounded-2xl border-2 border-red-100 p-7 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-red-100 text-red-700 text-xs font-bold px-3.5 py-1 rounded-bl-xl uppercase tracking-wider">
              Marketplace Aggregators
            </div>
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold">
                  ✕
                </div>
                <h3 className="text-lg font-black text-slate-900">Extractive Marketplace Model</h3>
              </div>
              <p className="text-xs text-slate-500 mb-6">Zomato, Swiggy, Amazon, Blinkit, and large aggregator apps</p>

              <ul className="space-y-3.5 text-sm text-slate-700 mb-6">
                <li className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>{isIndia ? '18%–30%' : '15%–25%'} commission cut:</strong> On {formatCurrency(sales)}, they deduct{' '}
                    <strong className="text-red-600 font-bold">{formatCurrency(marketplaceCut)}</strong> every month.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Masked customer data:</strong> You never receive customer phone numbers or direct contacts; you cannot re-market to them.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Competitor advertisements:</strong> Aggregators display rival discount listings right underneath your products.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>7 to 14-day escrow hold:</strong> Payouts are delayed and subject to arbitrary platform freezes.
                  </span>
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-red-50/80 border border-red-200/80 text-center">
              <div className="text-xs text-red-600 font-bold uppercase tracking-wider">Revenue Cut on {formatCurrency(sales)} sales</div>
              <div className="text-2xl font-black text-red-700 mt-0.5">− {formatCurrency(marketplaceCut)} / month</div>
            </div>
          </div>

          {/* FeraSetu Card (Ownership Framing) */}
          <div className="bg-white rounded-2xl border-2 border-emerald-500 p-7 shadow-xl shadow-emerald-500/10 flex flex-col justify-between relative overflow-hidden ring-4 ring-emerald-50">
            <div className="absolute top-0 right-0 bg-emerald-600 text-white text-xs font-black px-3.5 py-1 rounded-bl-xl uppercase tracking-wider shadow-sm">
              100% Yours
            </div>
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  ✓
                </div>
                <h3 className="text-lg font-black text-slate-900">Your Independent FeraSetu Store</h3>
              </div>
              <p className="text-xs text-slate-500 mb-6">Your custom store link with direct checkout & zero middleman cuts</p>

              <ul className="space-y-3.5 text-sm text-slate-700 mb-6">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>0% sales commission:</strong> On {formatCurrency(sales)}, you pay <strong className="text-emerald-700 font-bold">{formatCurrency(0)}</strong> in commission. You keep 100% of your earnings.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>100% customer ownership:</strong> Complete customer phone numbers, addresses, and order histories for direct WhatsApp re-orders.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Zero ads or distractions:</strong> Your store belongs to you. No competing merchants are ever shown on your catalog.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Instant direct settlements:</strong> {isIndia ? 'UPI & Cashfree payments flow directly into your bank account with zero escrow delay.' : 'Direct Stripe checkout credited directly to your bank account.'}
                  </span>
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <div className="text-xs text-emerald-700 font-bold uppercase tracking-wider">Commission Paid to FeraSetu</div>
              <div className="text-2xl font-black text-emerald-800 mt-0.5">{formatCurrency(0)} (0% cut)</div>
            </div>
          </div>
        </div>

        {/* Structural Trust Note */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500 font-medium text-center">
          <span className="inline-flex items-center gap-1.5 text-slate-700 font-semibold">
            <ShieldCheck size={14} className="text-emerald-600" />
            Non-custodial direct payments
          </span>
          <span>•</span>
          <span>FeraSetu never delays or freezes your customer payouts</span>
          <span>•</span>
          <span>Export your full catalog & customer data anytime (1-click CSV)</span>
        </div>
      </div>
    </section>
  );
}
