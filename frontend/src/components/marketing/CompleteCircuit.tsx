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
  Sparkles,
} from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { type MarketDemoConfig } from '../../config/marketDemo';

gsap.registerPlugin(ScrollTrigger);

interface CompleteCircuitProps {
  demo: MarketDemoConfig;
  market: string;
  onStart?: () => void;
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
    description: 'Add products with photos and prices right from your phone. Your store address is live right away with zero server setup.',
    actor: 'Merchant',
    icon: Store,
    keyAction: 'Instant Catalog Setup',
  },
  {
    step: '02',
    name: 'Get Orders',
    tagline: 'CUSTOMER DISCOVERY & CART',
    description: 'Customers open your link from WhatsApp, printed QR codes, or social channels. They browse current inventory, choose items, and send an organized order.',
    actor: 'Customer',
    icon: ShoppingCart,
    keyAction: 'Direct Order Intake',
  },
  {
    step: '03',
    name: 'Get Paid',
    tagline: 'DIRECT SETTLEMENT',
    description: 'Payments process directly through your own payment gateway. FeraSetu charges 0% platform commission, and payouts settle straight to your bank account.',
    actor: 'Payment Gateway',
    icon: CreditCard,
    keyAction: '0% Platform Commission',
  },
  {
    step: '04',
    name: 'Complete the Order',
    tagline: 'FULFILLMENT & RETENTION',
    description: 'Pack the order from your shelves. Customers receive direct status updates and receipts, while their contact details stay in your own customer list.',
    actor: 'Store Team',
    icon: PackageCheck,
    keyAction: 'Owned Customer Data',
  },
];

export default function CompleteCircuit({ demo, onStart }: CompleteCircuitProps) {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [stepProgresses, setStepProgresses] = useState<number[]>([1, 0, 0, 0]);
  const [isPinnedMode, setIsPinnedMode] = useState(true);

  const sectionRef = useRef<HTMLDivElement | null>(null);
  const pinFrameRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const leftPanelRef = useRef<HTMLDivElement | null>(null);
  const rightPanelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const scrollDirectionRef = useRef<'down' | 'up'>('down');

  const currentStage = STAGES[activeStepIndex];

  // GSAP ScrollTrigger Pinned Narrative Stepper
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !sectionRef.current) {
      setIsPinnedMode(false);
      return;
    }

    const isDesktop = window.innerWidth >= 768;
    setIsPinnedMode(isDesktop);

    const ctx = gsap.context(() => {
      const section = sectionRef.current!;

      if (isDesktop) {
        // Pin the entire circuit section as the user scrolls down
        const totalScrollDistance = 2200;

        const st = ScrollTrigger.create({
          trigger: section,
          start: 'top top',
          end: `+=${totalScrollDistance}`,
          pin: true,
          pinSpacing: true,
          scrub: 0.5,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const p = self.progress;
            scrollDirectionRef.current = self.direction > 0 ? 'down' : 'up';

            // Compute active step (0, 1, 2, 3)
            let step = 0;
            if (p < 0.25) step = 0;
            else if (p < 0.50) step = 1;
            else if (p < 0.75) step = 2;
            else step = 3;

            setActiveStepIndex(step);

            // Compute progress for each individual step (0 to 1)
            const prog0 = Math.min(Math.max(p / 0.25, 0), 1);
            const prog1 = Math.min(Math.max((p - 0.25) / 0.25, 0), 1);
            const prog2 = Math.min(Math.max((p - 0.50) / 0.25, 0), 1);
            const prog3 = Math.min(Math.max((p - 0.75) / 0.25, 0), 1);

            setStepProgresses([prog0, prog1, prog2, prog3]);
          },
        });

        triggerRef.current = st;
      }
    }, sectionRef);

    const handleResize = () => {
      const desktop = window.innerWidth >= 768;
      setIsPinnedMode(desktop);
    };
    window.addEventListener('resize', handleResize);

    if (document.fonts) {
      document.fonts.ready.then(() => {
        ScrollTrigger.refresh();
      });
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      ctx.revert();
    };
  }, []);

  // Smooth directional (--->) transition animations when active stage changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const isDown = scrollDirectionRef.current === 'down';
    const xOffset = isDown ? 28 : -28;

    if (leftPanelRef.current) {
      gsap.fromTo(
        leftPanelRef.current.children,
        { opacity: 0, x: isDown ? 12 : -12 },
        { opacity: 1, x: 0, duration: 0.3, stagger: 0.04, ease: 'power2.out' }
      );
    }

    if (rightPanelRef.current) {
      gsap.fromTo(
        rightPanelRef.current,
        { opacity: 0.1, x: xOffset, scale: 0.98 },
        { opacity: 1, x: 0, scale: 1, duration: 0.35, ease: 'power2.out' }
      );
    }
  }, [activeStepIndex]);

  const handleStepClick = (targetIdx: number) => {
    setActiveStepIndex(targetIdx);

    if (triggerRef.current && isPinnedMode) {
      const st = triggerRef.current;
      const totalDist = st.end - st.start;
      // Target the middle of the selected step zone
      const targetProgress = (targetIdx + 0.5) / 4;
      const targetScroll = st.start + targetProgress * totalDist;
      if (typeof window !== 'undefined' && (window as any).__lenis) {
        (window as any).__lenis.scrollTo(targetScroll, { duration: 0.8 });
      } else {
        window.scrollTo({ top: targetScroll, behavior: 'smooth' });
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % STAGES.length;
      handleStepClick(nextIndex);
      tabRefs.current[nextIndex]?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + STAGES.length) % STAGES.length;
      handleStepClick(prevIndex);
      tabRefs.current[prevIndex]?.focus();
    }
  };

  return (
    <section
      ref={sectionRef}
      id="complete-circuit"
      className="relative bg-slate-50 border-b border-slate-200 overflow-hidden"
    >
      <div
        ref={pinFrameRef}
        className="w-full max-w-[1260px] mx-auto px-4 sm:px-6 py-6 md:py-10 min-h-screen flex flex-col justify-between"
      >
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-4 sm:mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2 border border-blue-200">
            <Sparkles size={12} className="text-blue-600" aria-hidden="true" />
            <span>THE PRODUCT CIRCUIT</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-2">
            One connected workflow from physical shop to returning customer.
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal max-w-xl mx-auto">
            No messy plugins. No middleman holding your inventory hostage. Four clear stages connect your business to the web.
          </p>
        </div>

        {/* 4-Stage Stepper Buttons (Interactive Progress Scrubbers) */}
        <div className="relative mb-4 sm:mb-6">
          <div
            role="tablist"
            aria-label="FeraSetu four-stage commerce circuit"
            className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5"
          >
            {STAGES.map((stage, idx) => {
              const isActive = idx === activeStepIndex;
              const isPaymentStage = idx === 2;
              const isCompleted = idx < activeStepIndex;
              const progress = stepProgresses[idx] || 0;
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
                  onClick={() => handleStepClick(idx)}
                  onKeyDown={(e) => handleKeyDown(e, idx)}
                  type="button"
                  className={`text-left p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden select-none ${
                    isActive
                      ? isPaymentStage
                        ? 'bg-white border-orange-500 shadow-md ring-2 ring-orange-500/10'
                        : 'bg-white border-blue-600 shadow-md ring-2 ring-blue-600/10'
                      : isCompleted
                      ? 'bg-white/95 border-slate-300 shadow-xs'
                      : 'bg-white/70 border-slate-200 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div>
                    {/* Top Row: Step Tag + Actor */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded tabular-nums tracking-normal flex items-center gap-1 ${
                          isActive
                            ? isPaymentStage
                              ? 'bg-orange-500 text-white'
                              : 'bg-blue-600 text-white'
                            : isCompleted
                            ? 'bg-slate-200 text-slate-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isCompleted && <CheckCircle2 size={11} className="shrink-0" />}
                        <span>{stage.step}</span>
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {stage.actor}
                      </span>
                    </div>

                    {/* Step Title */}
                    <div className="flex items-center gap-2 mb-0.5">
                      <Icon
                        size={15}
                        className={
                          isActive
                            ? isPaymentStage
                              ? 'text-orange-600'
                              : 'text-blue-600'
                            : isCompleted
                            ? 'text-slate-700'
                            : 'text-slate-400'
                        }
                        aria-hidden="true"
                      />
                      <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {stage.name}
                      </h3>
                    </div>

                    <p className="text-[10px] sm:text-[11px] font-mono text-slate-500 line-clamp-1">
                      {stage.tagline}
                    </p>
                  </div>

                  {/* Stage Progress Bar (Animated as user scrolls) */}
                  <div className="mt-2 pt-1.5 border-t border-slate-100 flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className={`font-semibold ${isActive ? 'text-blue-700' : 'text-slate-500'}`}>
                        {stage.keyAction}
                      </span>
                      <span className="font-mono text-slate-400 tabular-nums">
                        {Math.round(progress * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-100 ${
                          isPaymentStage ? 'bg-orange-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Interactive Stage Display */}
        <div
          id={`circuit-panel-${currentStage.step}`}
          role="tabpanel"
          aria-labelledby={`circuit-tab-${currentStage.step}`}
          className="rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden grid lg:grid-cols-12 min-h-[350px] sm:min-h-[380px]"
        >
          {/* Left Column: Stage Narrative Details */}
          <div
            ref={leftPanelRef}
            className="lg:col-span-5 p-5 sm:p-6 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/70"
          >
            <div>
              <div
                className={`inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md border text-xs font-bold uppercase tracking-wider mb-2.5 ${
                  activeStepIndex === 2
                    ? 'bg-orange-50 border-orange-200 text-orange-800'
                    : 'bg-blue-50 border-blue-200 text-blue-700'
                }`}
              >
                <span className="tabular-nums font-mono">STAGE {currentStage.step} OF 04</span>
                <span>·</span>
                <span>{currentStage.tagline}</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2">
                {currentStage.name}
              </h3>

              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-4 font-normal">
                {currentStage.description}
              </p>

              <div className="space-y-2 pt-3 border-t border-slate-200 text-xs sm:text-sm">
                <div className="flex items-start gap-2 text-slate-700">
                  <CheckCircle2 size={15} className="text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="leading-snug">
                    {activeStepIndex === 0 && 'Fast Cloudflare edge hosting with automated SSL and clean mobile layout.'}
                    {activeStepIndex === 1 && 'Structured shopping cart avoids lost chat messages and missed orders.'}
                    {activeStepIndex === 2 && 'Direct settlement: FeraSetu never holds or delays your customer payouts.'}
                    {activeStepIndex === 3 && 'Direct customer phone numbers and purchase history stay in your private ledger.'}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-slate-700">
                  <CheckCircle2 size={15} className="text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="leading-snug">
                    {activeStepIndex === 0 && `Permanent store link (${demo.displayUrl}) or your own custom domain.`}
                    {activeStepIndex === 1 && 'Buyers order instantly without downloading an app or creating accounts.'}
                    {activeStepIndex === 2 && 'Zero commission surcharge from FeraSetu on any order.'}
                    {activeStepIndex === 3 && '1-click CSV export of your entire customer list whenever you want.'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Progress Footnote */}
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-mono text-slate-500">
              <span className="tabular-nums">
                {isPinnedMode
                  ? `Scroll down to advance (${activeStepIndex + 1}/4) --->`
                  : `Stage ${activeStepIndex + 1} of 04`}
              </span>
              <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                Live Interface Proof
              </span>
            </div>
          </div>

          {/* Right Column: Dynamic Stage Evidence UI */}
          <div className="lg:col-span-7 p-4 sm:p-6 bg-slate-900 text-slate-100 flex items-center justify-center relative overflow-hidden">
            <div ref={rightPanelRef} className="w-full max-w-md">
              {activeStepIndex === 0 && (
                /* STAGE 01: Storefront Creation Proof */
                <div className="bg-white text-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700 font-sans text-xs">
                  <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <div className="bg-white px-2.5 py-0.5 rounded border border-slate-200 text-slate-700 font-mono text-[11px] flex items-center gap-1.5 truncate max-w-[200px]">
                      <Lock size={10} className="text-blue-600 shrink-0" aria-hidden="true" />
                      <span className="truncate whitespace-nowrap">{demo.storeUrl}</span>
                    </div>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                      <span>Storefront Live</span>
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
                        <div key={idx} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 flex items-center justify-between">
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
                <div className="bg-white text-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700 font-sans text-xs">
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
                <div className="bg-white text-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700 font-sans text-xs">
                  <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                      <CreditCard size={13} className="text-orange-500" aria-hidden="true" />
                      <span>Settlement Breakdown</span>
                    </span>
                    <span className="text-[10px] font-bold text-orange-800 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                      Direct Payout · 0% Cut
                    </span>
                  </div>
                  <div className="p-4 bg-white space-y-3 font-mono">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-sans">Gross Order Amount:</span>
                      <span className="font-bold text-slate-900">{demo.formattedOrderTotal}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-sans">FeraSetu Commission Cut:</span>
                      <span className="font-bold text-orange-600">{demo.commissionText}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-sans">Gateway Provider:</span>
                      <span className="text-slate-800">{demo.paymentProviderName}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-900 font-sans">Net Payout to Your Bank:</span>
                      <span className="text-sm font-black text-slate-900">{demo.formattedOrderTotal}*</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-sans leading-relaxed pt-1">
                      *Third-party processor charges their standard processing fee directly. FeraSetu adds zero commission surcharge.
                    </p>
                  </div>
                </div>
              )}

              {activeStepIndex === 3 && (
                /* STAGE 04: Order Fulfillment & Owned Customer Proof */
                <div className="bg-white text-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700 font-sans text-xs">
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

        {/* Bottom Action Row */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-200/80">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <ShieldCheck size={16} className="text-blue-600 shrink-0" aria-hidden="true" />
            <span>0% commissions. Full customer data ownership. Direct payouts.</span>
          </div>

          {onStart && (
            <button
              type="button"
              onClick={onStart}
              className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer group"
            >
              <span>Bring my business online</span>
              <ArrowRight size={14} className="transition-transform duration-150 group-hover:translate-x-1" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
