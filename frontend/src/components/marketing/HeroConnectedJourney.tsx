import { useState, useRef } from 'react';
import {
  Smartphone,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  ShoppingBag,
  Sparkles,
  Building2,
  Receipt,
  Store,
  ChevronRight,
  Lock,
  QrCode,
  TrendingUp,
  Wifi,
  Battery,
} from 'lucide-react';

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

  // View Mode: Interactive Simulation vs Full Workbench View
  const [viewMode, setViewMode] = useState<'interactive' | 'workbench'>('interactive');

  // Simulation state
  const [simulationStep, setSimulationStep] = useState<'idle' | 'transmitting' | 'settled'>('idle');
  const [orderCount, setOrderCount] = useState<number>(1);
  const [cumulativeSaved, setCumulativeSaved] = useState<number>(legacyToll);

  // 3D Perspective Tilt on Mouse Movement
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setTilt({
      x: -(y / rect.height) * 3,
      y: (x / rect.width) * 3,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const handleSimulateOrder = () => {
    if (simulationStep === 'transmitting') return;
    setSimulationStep('transmitting');

    setTimeout(() => {
      setSimulationStep('settled');
      setOrderCount((prev) => prev + 1);
      setCumulativeSaved((prev) => prev + legacyToll);
    }, 850);
  };

  const handleReset = () => {
    setSimulationStep('idle');
  };

  return (
    <div className="w-full max-w-5xl mx-auto mt-8 sm:mt-12">
      {/* Top Experience HUD Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4 px-3 py-2 rounded-2xl bg-slate-900/5 border border-slate-200/70 backdrop-blur-xs">
        <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-800">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500">Live Architecture Demo:</span>
          <span>Customer Checkout to Merchant Bank Deposit</span>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <span className="hidden sm:inline">Commission retained by merchant:</span>
          <span className="font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-lg border border-emerald-300/80 tabular-nums font-mono">
            +{currencySymbol}{cumulativeSaved.toLocaleString()}
          </span>
          {simulationStep === 'settled' && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold underline cursor-pointer ml-1.5 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* View Mode Switcher Pills (Tactile & Clean) */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => setViewMode('interactive')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            viewMode === 'interactive'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <Zap size={13} className={viewMode === 'interactive' ? 'text-amber-400' : 'text-slate-500'} />
          <span>Interactive 0% Settlement Circuit</span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode('workbench')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            viewMode === 'workbench'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <Store size={13} className={viewMode === 'workbench' ? 'text-blue-400' : 'text-slate-500'} />
          <span>Real Sovereign Workbench View</span>
        </button>
      </div>

      {/* Main 3D Perspective Showcase Stage */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: 'transform 0.15s ease-out',
        }}
        className="relative rounded-3xl border border-slate-200/90 bg-gradient-to-b from-white via-white to-slate-50/60 p-5 sm:p-8 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden"
      >
        {/* Subtle Ambient Radial Lighting */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        {viewMode === 'workbench' ? (
          /* ========================================================== */
          /* FULL WORKBENCH HARDWARE PRESENTATION                       */
          /* ========================================================== */
          <div className="relative z-10 py-2">
            <div className="rounded-2xl border border-slate-800/10 bg-slate-900 p-2 sm:p-3 shadow-2xl shadow-slate-900/20">
              {/* Browser / OS Window Bar */}
              <div className="flex items-center justify-between px-3 py-2 bg-slate-900 rounded-t-xl text-slate-400 text-xs border-b border-slate-800">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                </div>
                <div className="flex items-center gap-2 px-4 py-1 rounded-lg bg-slate-800/90 border border-slate-700/60 text-slate-300 font-mono text-[11px] max-w-sm truncate">
                  <Lock size={11} className="text-emerald-400" />
                  <span>app.ferasetu.com/dashboard • Encrypted Till Ledger</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Online</span>
                </div>
              </div>

              {/* Real FeraSetu Workbench High-Res Visual */}
              <div className="relative rounded-b-xl overflow-hidden bg-slate-950 aspect-[16/10] max-h-[520px]">
                <img
                  src="/hero/dashboard.webp"
                  alt="FeraSetu sovereign merchant dashboard interface showing sales, inventory, and order settlement"
                  className="w-full h-full object-cover object-top"
                  loading="lazy"
                />

                {/* Floating Telemetry Annotation Badges */}
                <div className="absolute top-4 left-4 p-3 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-white shadow-xl max-w-xs hidden sm:block">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs mb-1">
                    <CheckCircle2 size={13} />
                    <span>Direct Bank Deposit Active</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    0% platform take-rate. All customer card & UPI payments settle directly to your registered bank account.
                  </p>
                </div>

                <div className="absolute bottom-4 right-4 p-3 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-white shadow-xl max-w-xs hidden sm:block">
                  <div className="flex items-center gap-1.5 text-blue-400 font-bold text-xs mb-1">
                    <Sparkles size={13} />
                    <span>Fero Autonomous Guard Active</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    Continuously auditing daily run-rates, inventory thresholds, and repeat patron loyalty cohorts.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-500 px-1">
              <span>Actual FeraSetu Merchant Workspace Interface</span>
              <span className="font-semibold text-[#0052FF]">Real-time Cryptographic Till Engine</span>
            </div>
          </div>
        ) : (
          /* ========================================================== */
          /* INTERACTIVE SIMULATION GRID                                */
          /* ========================================================== */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center relative z-10">
          {/* ========================================================== */}
          {/* LEFT: Customer Mobile Storefront Experience (Col 1-5)      */}
          {/* ========================================================== */}
          <div className="lg:col-span-5 flex flex-col items-center">
            {/* Realistic Smartphone Chassis Frame */}
            <div className="w-full max-w-[330px] rounded-[36px] border-[5px] border-slate-800 bg-slate-900 p-2 shadow-xl shadow-slate-900/15 relative">
              {/* Dynamic Island / Speaker */}
              <div className="w-20 h-4 bg-slate-800 rounded-full mx-auto mb-2 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-900/80 ml-auto mr-1.5" />
              </div>

              {/* Smartphone Screen Viewport */}
              <div className="w-full rounded-[26px] bg-white overflow-hidden text-left border border-slate-100">
                {/* Mobile Status Bar */}
                <div className="flex items-center justify-between px-4 pt-1.5 pb-1 text-[10px] text-slate-600 font-semibold border-b border-slate-100 bg-slate-50/80">
                  <span>9:41</span>
                  <div className="flex items-center gap-1.5">
                    <Wifi size={11} className="text-slate-600" />
                    <span className="text-[9px] font-bold">5G</span>
                    <Battery size={12} className="text-slate-700" />
                  </div>
                </div>

                {/* Store Header & URL HUD */}
                <div className="p-3 border-b border-slate-100 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-orange-500 text-white flex items-center justify-center text-xs font-black shadow-xs">
                        S
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 leading-tight">Sharma Heritage Kirana</div>
                        <div className="text-[9px] text-slate-400 font-mono">sharma.ferasetu.com</div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[9px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Sovereign
                    </span>
                  </div>
                </div>

                {/* Product Detail Card in Cart */}
                <div className="p-3 bg-slate-50/50">
                  <div className="rounded-2xl bg-white border border-slate-200/80 p-3 shadow-2xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/70 flex items-center justify-center text-amber-700 shrink-0">
                        <ShoppingBag size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded-md">
                          Direct Inventory
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 mt-1 leading-snug truncate">
                          {isIndia ? 'Cold-Pressed Mustard Oil & Spices' : 'Organic Olive Oil & Artisan Spices'}
                        </h4>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-xs font-black text-slate-900 tabular-nums">
                            {currencySymbol}{itemPrice.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">Qty: 1 box</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500">Customer: Ananya S. (Mumbai)</span>
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <Lock size={10} /> Direct Bank UPI
                      </span>
                    </div>
                  </div>

                  {/* Payment Method Selected */}
                  <div className="mt-2.5 p-2 rounded-xl border border-blue-200 bg-blue-50/60 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 text-blue-900 font-semibold">
                      <QrCode size={14} className="text-blue-600" />
                      <span>Instant UPI / Zero Middleman</span>
                    </div>
                    <span className="text-[10px] font-bold text-blue-700 bg-white px-1.5 py-0.5 rounded border border-blue-200">
                      Direct Pay
                    </span>
                  </div>

                  {/* Interactive Trigger CTA Button */}
                  <button
                    type="button"
                    onClick={handleSimulateOrder}
                    disabled={simulationStep === 'transmitting'}
                    className={`mt-3 w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer shadow-md select-none active:translate-y-0.5 active:scale-[0.985] ${
                      simulationStep === 'transmitting'
                        ? 'bg-amber-500 text-white animate-pulse'
                        : simulationStep === 'settled'
                        ? 'bg-slate-900 text-white hover:bg-slate-800'
                        : 'bg-[#0052FF] text-white hover:bg-[#0047E0] hover:shadow-lg hover:shadow-blue-500/20'
                    }`}
                  >
                    {simulationStep === 'transmitting' ? (
                      <>
                        <Zap size={14} className="animate-spin text-white" />
                        <span>Settling Directly into Merchant Till...</span>
                      </>
                    ) : simulationStep === 'settled' ? (
                      <>
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        <span>Order #FS-942{orderCount} Completed! Tap Again</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag size={14} className="text-white" />
                        <span>Tap to Place Order ({currencySymbol}{itemPrice})</span>
                      </>
                    )}
                  </button>

                  <p className="text-[9px] text-center text-slate-400 mt-2 font-medium">
                    Simulates zero-commission direct customer checkout
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-2.5 text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Smartphone size={14} className="text-[#0052FF]" />
              <span>Customer Mobile Storefront</span>
            </div>
          </div>

          {/* ========================================================== */}
          {/* CENTER: The Direct Bridge Rail (Col 6-7)                   */}
          {/* ========================================================== */}
          <div className="lg:col-span-2 flex flex-col items-center justify-center py-2 lg:py-0 relative">
            <div className="relative w-full flex lg:flex-col items-center justify-center gap-3">
              {/* Direct Route Indicator with Animated Settlement Beam */}
              <div className="relative p-4 rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-lg shadow-slate-900/10 flex flex-col items-center text-center max-w-[150px] w-full overflow-hidden">
                {/* Luminous Animated Beam when transmitting */}
                {simulationStep === 'transmitting' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent animate-pulse pointer-events-none" />
                )}

                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-1.5 transition-all duration-300 ${
                  simulationStep === 'transmitting'
                    ? 'bg-amber-500 text-white scale-110 shadow-lg shadow-amber-500/50'
                    : simulationStep === 'settled'
                    ? 'bg-emerald-500 text-white scale-105 shadow-md shadow-emerald-500/30'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  <Zap size={18} className={simulationStep === 'transmitting' ? 'animate-bounce' : ''} />
                </div>
                <span className="text-[11px] font-bold text-slate-100">
                  Direct Settlement
                </span>
                <span className="text-[10px] text-emerald-400 font-extrabold mt-0.5">
                  0% Commission
                </span>
                <span className="text-[9px] text-slate-400 font-mono mt-1">
                  Bank-to-Bank
                </span>
              </div>

              {/* Velocity Pulse Badge */}
              <div className="hidden lg:flex items-center gap-1 text-[10px] font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                <span>0.8s</span>
                <ArrowRight size={10} className={`text-slate-400 ${simulationStep === 'transmitting' ? 'text-emerald-600 translate-x-0.5 transition-transform' : ''}`} />
                <span>Instant</span>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* RIGHT: Merchant Sovereign Operations Register (Col 8-12)   */}
          {/* ========================================================== */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="rounded-3xl border border-slate-200/90 bg-[#F8FAFC] p-4 sm:p-5 shadow-xs">
              {/* Counter Register Header */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#0052FF] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                    <Store size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Merchant Counter Register</div>
                    <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Direct Settlement Active (HDFC Bank)</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] text-slate-400 font-mono uppercase block">Ledger Tx</span>
                  <span className="text-xs font-mono font-bold text-slate-800">#TX-942{orderCount}</span>
                </div>
              </div>

              {/* Settlement Calculation Breakdown */}
              <div className="rounded-2xl bg-white border border-slate-200/80 p-3.5 shadow-2xs space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">Customer Paid:</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {currencySymbol}{itemPrice.toLocaleString()}.00
                  </span>
                </div>

                {/* Legacy Marketplace Toll (Comparison) */}
                <div className="flex justify-between items-center text-xs bg-rose-50/80 p-2 rounded-xl border border-rose-100">
                  <div className="flex items-center gap-1.5 text-rose-900 font-medium">
                    <span className="text-xs line-through text-rose-500">Marketplace Commission (18%):</span>
                  </div>
                  <span className="font-mono text-rose-600 font-bold line-through tabular-nums">
                    -{currencySymbol}{legacyToll.toLocaleString()}.00
                  </span>
                </div>

                {/* FeraSetu 0% Commission */}
                <div className="flex justify-between items-center text-xs bg-amber-50/80 p-2 rounded-xl border border-amber-200/80">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-amber-600" />
                    <span className="font-bold text-amber-950">FeraSetu Platform Cut:</span>
                  </div>
                  <span className="font-mono font-black text-amber-700 tabular-nums">
                    {currencySymbol}0.00 (0%)
                  </span>
                </div>

                {/* Net Merchant Bank Deposit */}
                <div className={`flex justify-between items-center text-sm border-t border-slate-200 pt-2 font-bold transition-all duration-300 ${
                  simulationStep === 'settled' ? 'bg-emerald-50/70 p-2 rounded-xl border border-emerald-200 ring-2 ring-emerald-400/40' : ''
                }`}>
                  <div className="flex items-center gap-1.5 text-slate-900">
                    <Building2 size={16} className="text-emerald-600" />
                    <span>Direct Bank Deposit:</span>
                  </div>
                  <span className="font-mono font-black text-emerald-700 tabular-nums text-base">
                    100% ({currencySymbol}{netEarnings.toLocaleString()}.00)
                  </span>
                </div>
              </div>

              {/* Autonomous Fero AI Radar Observation */}
              <div className="mt-3 p-3 rounded-2xl bg-blue-50/80 border border-blue-200 text-xs">
                <div className="flex items-center gap-1.5 text-blue-900 font-bold mb-1">
                  <Sparkles size={13} className="text-blue-600" />
                  <span>Fero Autonomous Store Radar</span>
                </div>
                <p className="text-[11px] text-blue-800/90 leading-relaxed font-normal">
                  {simulationStep === 'transmitting'
                    ? 'Transmitting cryptographic invoice to merchant till... Zero platform hold.'
                    : simulationStep === 'settled'
                    ? `Payment settled to HDFC Bank A/c • Inventory auto-decremented to 8 units. Repeat patron Ananya S.`
                    : `Monitoring inventory & payment routes 24/7. Ready for incoming orders with zero platform fees.`}
                </p>
              </div>

              {/* Real-time Status Banner */}
              <div className="mt-2.5 flex items-center justify-between p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>Immediate Bank Settlement (Zero Escrow)</span>
                </div>
                <span className="font-mono text-[9px] text-emerald-900 uppercase font-extrabold bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                  Verified
                </span>
              </div>
            </div>

            <div className="mt-2.5 text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Receipt size={13} className="text-emerald-600" />
              <span>Merchant Counter Register & AI Intelligence</span>
            </div>
          </div>
        </div>
        )}

        {/* Bottom Sovereign Guarantee Bar */}
        <div className="mt-6 pt-5 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#0052FF] shrink-0" />
            <span>
              <strong>Zero percentage toll.</strong> No hidden payment markups, no 14-day escrow holdbacks.
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
