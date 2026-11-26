import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sparkles,
  ShieldCheck,
  Smartphone,
  Landmark,
  Bot,
  Store,
  CheckCircle2,
  Package,
  QrCode,
  ArrowRight,
  MousePointer2
} from 'lucide-react';
import type { MarketCode } from '../../config/plans';
import { meditativeAudio } from '../../lib/audio/meditativeSoundscape';

interface ScrollViewCinemaProps {
  market: MarketCode;
  onStart?: () => void;
}

interface Chapter {
  id: string;
  stepNumber: string;
  label: string;
  title: string;
  desc: string;
  url: string;
  screenImage: string;
  annotation: {
    title: string;
    detail: string;
    tag: string;
    tagColor: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  };
  cursorTarget: { x: number; y: number; clickLabel: string };
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accent: string;
}

const CHAPTERS: Chapter[] = [
  {
    id: 'catalog',
    stepNumber: '01',
    label: 'Step 01 · Manage Catalog & Stock',
    title: 'How merchants manage their store in 60 seconds',
    desc: 'Add items with photos, update prices, and set inventory thresholds right from your phone or desktop. Fero automatically calculates daily sales velocity.',
    url: 'app.ferasetu.com/dashboard/products',
    screenImage: '/hero/dashboard.webp',
    annotation: {
      title: 'Merchant Sovereign Till',
      detail: 'Add products, update stock alerts & broadcast to WhatsApp with 1 tap.',
      tag: '0% PLATFORM CUT',
      tagColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      position: 'top-left',
    },
    cursorTarget: { x: 38, y: 44, clickLabel: 'Click: Add Product' },
    icon: Package,
    accent: '#0052FF',
  },
  {
    id: 'storefront',
    stepNumber: '02',
    label: 'Step 02 · Customer Direct Storefront',
    title: 'Customer browses & orders directly from you',
    desc: 'Customers open your branded link on Web or WhatsApp. No third-party app downloads, no aggressive competitor ads, and no rented marketplace space.',
    url: 'sharma-kirana.ferasetu.com',
    screenImage: '/templates/retail/screen-1-retail-home.png',
    annotation: {
      title: 'Branded Retail Front',
      detail: 'Direct merchant-customer connection. Every repeat patron is 100% yours.',
      tag: 'DIRECT DOMAIN',
      tagColor: 'bg-blue-50 text-blue-800 border-blue-200',
      position: 'top-right',
    },
    cursorTarget: { x: 62, y: 58, clickLabel: 'Click: Order Now' },
    icon: Smartphone,
    accent: '#EA580C',
  },
  {
    id: 'checkout',
    stepNumber: '03',
    label: 'Step 03 · Direct UPI / Card Checkout',
    title: 'Payment flows straight to merchant bank',
    desc: 'Customer scans your direct UPI QR or enters their card. Zero intermediate escrow holds, zero 14-day delays, and 0% marketplace commission deduction.',
    url: 'sharma-kirana.ferasetu.com/checkout',
    screenImage: '/templates/retail/screen-4-cart-checkout.png',
    annotation: {
      title: 'Instant Bank UPI QR',
      detail: 'Customer pays merchant directly. 100% money deposited to your bank account.',
      tag: 'ZERO ESCROW',
      tagColor: 'bg-amber-50 text-amber-900 border-amber-200',
      position: 'bottom-left',
    },
    cursorTarget: { x: 50, y: 72, clickLabel: 'Click: Confirm & Pay' },
    icon: QrCode,
    accent: '#10B981',
  },
  {
    id: 'settlement',
    stepNumber: '04',
    label: 'Step 04 · Till Settlement & OTP Handshake',
    title: 'Confirmed in your till with Fero 24/7 audit',
    desc: 'Order appears in your dashboard in <0.8 seconds. Fero confirms delivery with secure OTP, updates inventory ledger, and logs zero platform deductions.',
    url: 'app.ferasetu.com/dashboard/orders',
    screenImage: '/hero/dashboard.webp',
    annotation: {
      title: 'Settled to HDFC Bank',
      detail: 'Order #FS-9422 confirmed. ₹1,450.00 retained · ₹0.00 platform fee.',
      tag: '100% SETTLED',
      tagColor: 'bg-emerald-100/90 text-emerald-900 border-emerald-300 font-bold',
      position: 'bottom-right',
    },
    cursorTarget: { x: 74, y: 36, clickLabel: 'Click: Order Confirmed' },
    icon: Landmark,
    accent: '#6366F1',
  },
];

export default function ScrollViewCinema({ market, onStart }: ScrollViewCinemaProps) {
  const isIndia = market === 'IN';
  const currencySymbol = isIndia ? '₹' : '$';

  const [activeStep, setActiveStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);
  const [cursorPos, setCursorPos] = useState({ x: 38, y: 44 });
  const [isClicking, setIsClicking] = useState<boolean>(false);

  const autoPlayTimerRef = useRef<number | null>(null);
  const stepRef = useRef<number>(0);

  // Sync ref with state
  useEffect(() => {
    stepRef.current = activeStep;
  }, [activeStep]);

  // Meditative soundscape sync
  const toggleMusic = () => {
    const next = meditativeAudio.toggle();
    setIsMusicPlaying(next);
  };

  // Move animated cursor smoothly to the chapter target
  const triggerStep = useCallback((stepIdx: number) => {
    const target = CHAPTERS[stepIdx];
    setActiveStep(stepIdx);

    // Animate cursor moving to target
    setCursorPos({ x: target.cursorTarget.x, y: target.cursorTarget.y });
    setIsClicking(false);

    // Trigger realistic click pulse after arrival
    const clickTimer = window.setTimeout(() => {
      setIsClicking(true);
      const resetClick = window.setTimeout(() => setIsClicking(false), 600);
      return () => clearTimeout(resetClick);
    }, 450);

    return () => clearTimeout(clickTimer);
  }, []);

  // Auto-play walkthrough loop
  useEffect(() => {
    if (!isPlaying) {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
      return;
    }

    autoPlayTimerRef.current = window.setInterval(() => {
      const nextStep = (stepRef.current + 1) % CHAPTERS.length;
      triggerStep(nextStep);
    }, 4500);

    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [isPlaying, triggerStep]);

  const toggleAutoPlay = () => {
    const next = !isPlaying;
    setIsPlaying(next);
    if (next && !isMusicPlaying) {
      // Gentle start of meditative ambient audio on tutorial play
      const musicState = meditativeAudio.toggle();
      setIsMusicPlaying(musicState);
    }
  };

  const currentChapter = CHAPTERS[activeStep];

  return (
    <section
      id="scroll-view"
      className="py-16 md:py-24 bg-gradient-to-b from-white via-slate-50/70 to-white border-b border-slate-200/90 scroll-mt-24 relative overflow-hidden"
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">

        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold mb-4">
            <Sparkles size={14} className="text-[#0052FF]" />
            <span>Interactive Storefront Walkthrough</span>
            <span className="text-blue-300">•</span>
            <span className="text-emerald-700 font-bold">Real FeraSetu Interface</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
            How independent merchants manage &amp; sell.
          </h2>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Follow the live cursor as a shopkeeper manages stock, a customer orders over WhatsApp, and 100% of the sale settles directly to the merchant till with 0% platform commission.
          </p>

          {/* Master Walkthrough & Meditative Sanctuary Controls */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            {/* Auto-play Walkthrough Button */}
            <button
              type="button"
              onClick={toggleAutoPlay}
              className={`min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.985] ${
                isPlaying
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white border border-slate-200 hover:border-slate-300 text-slate-800 hover:bg-slate-50'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause size={15} className="text-amber-400" />
                  <span>Pause Tutorial</span>
                </>
              ) : (
                <>
                  <Play size={15} className="text-[#0052FF] fill-[#0052FF]" />
                  <span>Play Interactive Tutorial</span>
                </>
              )}
            </button>

            {/* Meditative Soundscape Sanctuary Toggle */}
            <button
              type="button"
              onClick={toggleMusic}
              className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-all cursor-pointer border active:scale-[0.985] ${
                isMusicPlaying
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-xs ring-2 ring-emerald-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
              title="Play calming 432Hz meditative audio designed to bring peace and unhurried focus to store owners"
            >
              {isMusicPlaying ? (
                <>
                  <Volume2 size={16} className="text-emerald-600" />
                  <span>Meditative Calm: On</span>
                  {/* Visualizer Soundwave Bars */}
                  <span className="flex items-center gap-0.5 ml-1">
                    <span className="w-1 h-3 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="w-1 h-4 bg-emerald-600 rounded-full animate-bounce" />
                    <span className="w-1 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
                  </span>
                </>
              ) : (
                <>
                  <VolumeX size={16} className="text-slate-400" />
                  <span>Meditative Music</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ================================================================
          TUTORIAL VIDEO STAGE WITH REAL UI SCREENSHOTS & ANIMATED CURSOR
        ================================================================ */}
        <div className="w-full max-w-5xl mx-auto rounded-3xl border border-slate-300/80 bg-slate-900 p-2 sm:p-3.5 shadow-2xl shadow-slate-900/15 overflow-hidden mb-8 relative">

          {/* Browser / OS Window Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 rounded-t-2xl text-slate-400 text-xs border-b border-slate-800">
            {/* Window Traffic Lights */}
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/90 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/90 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/90 inline-block" />
            </div>

            {/* URL HUD */}
            <div className="flex items-center gap-2 px-4 py-1 rounded-lg bg-slate-800/90 border border-slate-700/70 text-slate-300 font-mono text-[11px] max-w-md truncate">
              <span className="text-emerald-400 font-bold">https://</span>
              <span>{currentChapter.url}</span>
            </div>

            {/* Step Counter Badge */}
            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{currentChapter.stepNumber} / 04</span>
            </div>
          </div>

          {/* Interactive Screen Display Area */}
          <div className="relative rounded-b-2xl overflow-hidden bg-slate-950 aspect-[16/10] sm:aspect-[16/9] max-h-[560px]">
            {/* Real Screenshot */}
            <img
              src={currentChapter.screenImage}
              alt={currentChapter.title}
              className="w-full h-full object-cover object-top transition-opacity duration-500 select-none pointer-events-none"
              loading="eager"
            />

            {/* Subtle Gradient Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-black/10 pointer-events-none" />

            {/* Architectural Annotation HUD Card */}
            <div
              className={`absolute p-3.5 sm:p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 text-slate-900 shadow-2xl max-w-xs sm:max-w-sm transition-all duration-500 pointer-events-none ${
                currentChapter.annotation.position === 'top-left'
                  ? 'top-4 left-4'
                  : currentChapter.annotation.position === 'top-right'
                  ? 'top-4 right-4'
                  : currentChapter.annotation.position === 'bottom-left'
                  ? 'bottom-4 left-4'
                  : 'bottom-4 right-4'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>{currentChapter.annotation.title}</span>
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${currentChapter.annotation.tagColor}`}>
                  {currentChapter.annotation.tag}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-snug">
                {currentChapter.annotation.detail}
              </p>
            </div>

            {/* ========================================================
              ANIMATED MOUSE CURSOR WITH CLICK RIPPLE
            ======================================================== */}
            <div
              className="absolute pointer-events-none z-30 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
              style={{
                left: `${cursorPos.x}%`,
                top: `${cursorPos.y}%`,
                transform: 'translate(-4px, -4px)',
              }}
            >
              {/* Click Ripple Wave */}
              {isClicking && (
                <span className="absolute -inset-4 rounded-full border-2 border-emerald-400 bg-emerald-400/20 animate-ping" />
              )}

              {/* Cursor Icon */}
              <div className={`relative transition-transform duration-150 ${isClicking ? 'scale-90' : 'scale-100'}`}>
                <MousePointer2
                  size={24}
                  className="text-slate-950 fill-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                />
                {/* Floating Action Tag */}
                <span className="absolute left-6 top-1 text-[11px] font-bold whitespace-nowrap bg-slate-900/95 text-white px-2.5 py-1 rounded-lg border border-slate-700 shadow-xl backdrop-blur-xs">
                  {currentChapter.cursorTarget.clickLabel}
                </span>
              </div>
            </div>

            {/* Bottom Status Ticker */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/80 text-white text-[11px] font-medium flex items-center gap-2 pointer-events-none hidden sm:flex">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Real FeraSetu Workspace • 0% Platform Commission</span>
            </div>
          </div>
        </div>

        {/* Timeline Progress Track Scrubber */}
        <div className="max-w-md mx-auto flex items-center gap-3">
          <span className="font-mono text-xs font-bold text-slate-500">01</span>
          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-[#0052FF] transition-all duration-500 rounded-full"
              style={{ width: `${((activeStep + 1) / CHAPTERS.length) * 100}%` }}
            />
          </div>
          <span className="font-mono text-xs font-bold text-slate-500">04</span>
        </div>

      </div>
    </section>
  );
}
