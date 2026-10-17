import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ShieldCheck,
  Check,
  Lock,
  Store,
  ShoppingCart,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  Zap
} from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import PublicLayout from '../components/public/PublicLayout';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useMarket } from '../contexts/MarketContext';
import { getMarketPlans } from '../config/plans';
import { getMarketDemoConfig } from '../config/marketDemo';
import CompleteCircuit from '../components/marketing/CompleteCircuit';
import StorefrontShowcase from '../components/marketing/StorefrontShowcase';
import SEO from '../components/SEO';
import SplitText from '../components/ui/SplitText';
import SpotlightCard from '../components/ui/SpotlightCard';
import { trackCtaClick, trackSectionView, trackSignupStart } from '../lib/analytics/tracker';

gsap.registerPlugin(ScrollTrigger);

const TransparencyTable = lazy(() => import('../components/marketing/TransparencyTable'));
const FAQSection = lazy(() => import('../components/marketing/FAQSection'));

const SectionFallback = () => (
  <div className="w-full py-16 flex items-center justify-center">
    <div className="w-6 h-6 rounded-full border-2 border-blue-100 border-t-blue-600 animate-spin" />
  </div>
);

export default function LandingPage() {
  const { language, translate, getLocalizedLink } = useLanguage();
  const { user, register } = useAuth();
  const { market, config, formatPrice } = useMarket();
  const navigate = useNavigate();
  const previewPlans = getMarketPlans(market);
  const demo = getMarketDemoConfig(market);
  const [philosophyExpanded, setPhilosophyExpanded] = useState(false);
  const landingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !landingRef.current) return;

    const ctx = gsap.context(() => {
      // Subtle scroll reveal for product proof
      gsap.from('#product-proof', {
        opacity: 0,
        y: 24,
        duration: 0.6,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '#product-proof',
          start: 'top 85%',
          once: true,
        },
      });

      // Staggered row reveal for comparison table
      gsap.from('.comparison-row', {
        opacity: 0,
        y: 16,
        duration: 0.45,
        stagger: 0.08,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '#comparison table',
          start: 'top 80%',
          once: true,
        },
      });
    }, landingRef);

    return () => ctx.revert();
  }, []);

  // Recalibrate ScrollTrigger positions after lazy components and layout settle
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.25) {
          trackSectionView(entry.target.id);
        }
      });
    }, { threshold: [0.25] });

    const sections = document.querySelectorAll('section[id]');
    sections.forEach((s) => observer.observe(s));

    return () => observer.disconnect();
  }, []);

  const handleStart = (source: string) => {
    trackCtaClick(source, 'Bring my business online', source, '/register');
    trackSignupStart(market, source);
    if (user) {
      navigate('/dashboard');
    } else {
      register();
    }
  };

  const isDefaultLang = language === 'en';
  const pageTitle = isDefaultLang
    ? 'FeraSetu — Your business is yours. The internet should be too.'
    : translate('seo.landing.title');
  const pageDescription = isDefaultLang
    ? 'Run your own branded online store, receive direct customer orders, and keep what you make after payment processing. 0% FeraSetu platform commission.'
    : translate('seo.landing.desc');

  return (
    <>
      <SEO
        title={pageTitle}
        description={pageDescription}
        url={isDefaultLang ? 'https://ferasetu.com/' : undefined}
        noindex={false}
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'FeraSetu',
          applicationCategory: 'BusinessApplication',
          description:
            'Independent digital commerce infrastructure. Connects storefront, ordering, payments, and fulfillment with 0% FeraSetu platform commission.',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: market === 'IN' ? 'INR' : market === 'EU' ? 'EUR' : 'USD',
            description: market === 'IN' ? 'Permanent Free plan · No credit card to start' : '14-day trial · No credit card to start',
          },
          operatingSystem: 'Web, Mobile',
          url: 'https://ferasetu.com',
        }}
      />

      <PublicLayout>
        <div ref={landingRef}>

        {/* ================================================================
          SECTION 1 — HERO: IMMEDIATE UNDERSTANDING & IMMEDIATE PROOF
        ================================================================ */}
        <section id="hero" className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden bg-white border-b border-slate-100">
          <div className="max-w-[1240px] mx-auto px-4 sm:px-6">

            {/* Top Eyebrow, Headline & Value Statement */}
            <div className="max-w-3xl mx-auto text-center mb-10 sm:mb-12">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200/90 text-orange-950 text-xs sm:text-sm font-semibold mb-6 shadow-xs">
                <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                <span className="font-mono text-[11px] font-black tracking-wider uppercase text-orange-700">INDEPENDENT COMMERCE</span>
                <span className="text-orange-300">|</span>
                <span className="font-extrabold text-orange-600">0% Commission</span>
              </div>

              <SplitText
                text="Your business is yours."
                highlightText="The internet should be too."
                highlightClassName="text-blue-600 block sm:inline"
                className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.08] mb-6"
              />

              <p className="text-lg sm:text-xl text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed font-normal">
                Run your own branded online store, receive direct customer orders, and keep what you make after payment processing. <strong>0% FeraSetu platform commission.</strong>
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-8 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => handleStart('hero_primary')}
                  className="group w-full sm:w-auto px-7 py-3.5 rounded-xl bg-orange-500 text-white font-bold text-base hover:bg-orange-600 transition-all duration-150 hover:-translate-y-0.5 shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                >
                  <span>Bring my business online</span>
                  <ArrowRight size={17} className="transition-transform duration-150 group-hover:translate-x-1" aria-hidden="true" />
                </button>

                <a
                  href="#complete-circuit"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-base hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-all duration-150 flex items-center justify-center gap-1.5"
                >
                  <span>See how it works</span>
                </a>
              </div>

              {/* Trust Indicators */}
              <div className="text-xs sm:text-sm text-slate-500 font-medium flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
                <span className="inline-flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                  <CheckCircle2 size={14} className="text-blue-600" aria-hidden="true" />
                  <span>{market === 'IN' ? 'Permanent Free Plan' : '14-day trial'}</span>
                </span>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <span className="inline-flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                  <CheckCircle2 size={14} className="text-blue-600" aria-hidden="true" />
                  <span>No credit card to start</span>
                </span>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <span className="inline-flex items-center gap-1.5 bg-orange-50/80 px-2.5 py-1 rounded-md border border-orange-200/80 text-orange-950 font-semibold">
                  <ShieldCheck size={14} className="text-orange-600" aria-hidden="true" />
                  <span>0% FeraSetu platform commission</span>
                </span>
              </div>
            </div>

            {/* ================================================================
              SECTION 2 — PRODUCT PROOF: DUAL-STATE REAL PRODUCT UI
            ================================================================ */}
            <div id="product-proof" className="max-w-5xl mx-auto rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden text-left">
              {/* Top System Bar */}
              <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  </div>
                  <span className="font-bold text-slate-800 ml-2">FeraSetu Commerce System</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-600">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-orange-50 text-orange-900 border border-orange-200 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                    Direct Conduit Active
                  </span>
                  <span className="font-bold text-orange-600 bg-white px-2 py-0.5 rounded border border-slate-200">0% Platform Cut</span>
                </div>
              </div>

              {/* Dual-Pane View: Customer Storefront (Left) -> Merchant Live Control Desk (Right) */}
              <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">

                {/* PANE 1: CUSTOMER STOREFRONT */}
                <div className="p-5 sm:p-7 bg-white flex flex-col justify-between">
                  <div>
                    {/* Customer Browser URL Bar (Single continuous URL, no artificial spaces) */}
                    <div className="mb-4 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate">
                        <Lock size={12} className="text-blue-600 shrink-0" aria-hidden="true" />
                        <span className="font-semibold text-slate-900 font-mono tracking-tight whitespace-nowrap">
                          {demo.storeUrl}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Storefront</span>
                    </div>

                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">{demo.storeName}</h2>
                        <p className="text-xs text-slate-500 mt-0.5">{demo.storeCategory}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                        Open Now
                      </span>
                    </div>

                    {/* Regional Demo Product Catalog */}
                    <div className="space-y-2.5">
                      {demo.products.map((prod, idx) => (
                        <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-xs text-slate-900">{prod.name}</div>
                            <div className="text-[11px] text-slate-500">{prod.subtitle}</div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-sm text-slate-900 tabular-nums">{prod.formattedPrice}</span>
                            <span className="block text-[10px] text-blue-700 font-semibold">In Cart (×1)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Customer Checkout Action */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Order Total</div>
                      <div className="text-base font-black text-slate-900 font-mono tabular-nums">{demo.formattedOrderTotal}</div>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 text-white font-bold text-xs shadow-md shadow-orange-500/20">
                      <ShoppingCart size={13} aria-hidden="true" />
                      <span>{demo.paymentMethod}</span>
                    </div>
                  </div>
                </div>

                {/* PANE 2: MERCHANT LIVE ORDER DESK */}
                <div className="p-5 sm:p-7 bg-slate-50/60 flex flex-col justify-between">
                  <div>
                    {/* Merchant Desk Header */}
                    <div className="mb-4 p-2 rounded-lg bg-white border border-slate-200 text-xs font-mono flex items-center justify-between">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Store size={13} className="text-blue-600" aria-hidden="true" />
                        Merchant Control Desk
                      </span>
                      <span className="text-blue-700 font-bold text-[11px] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                        Real-time Sync
                      </span>
                    </div>

                    {/* Incoming Order Card */}
                    <div className="p-4 rounded-xl border border-blue-200 bg-white shadow-xs">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-blue-700 tabular-nums">{demo.orderId}</span>
                          <span className="text-[10px] font-bold text-orange-800 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                            {market === 'IN' ? 'Paid via UPI' : 'Paid via Card'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">{demo.orderTime}</span>
                      </div>

                      <div className="text-xs text-slate-700 space-y-1 mb-3">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Customer:</span>
                          <span className="font-semibold text-slate-900">{demo.customerName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Direct Contact:</span>
                          <span className="font-mono text-slate-800">{demo.customerPhone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Items:</span>
                          <span className="font-medium text-slate-800">2 items ({demo.products.map(p => p.name.split(' (')[0]).join(', ')})</span>
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                        <div>
                          <span className="text-slate-400 text-[10px] block">Net Order Amount</span>
                          <span className="font-bold text-slate-900 tabular-nums">{demo.formattedOrderTotal}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 text-[10px] block">FeraSetu Commission</span>
                          <span className="font-bold text-orange-600">{demo.commissionText}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Merchant Action Bar */}
                  <div className="mt-5 pt-4 border-t border-slate-200/80 flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-600 flex items-center gap-1 font-medium text-[11px] sm:text-xs">
                      <CheckCircle2 size={13} className="text-blue-600 shrink-0" aria-hidden="true" />
                      <span>{demo.settlementText}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStart('hero_demo_pack')}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer transition-colors shadow-xs shrink-0"
                    >
                      Mark as Packed
                    </button>
                  </div>
                </div>

              </div>

              {/* Bottom Proof Strip */}
              <div className="bg-slate-50 px-5 sm:px-6 py-3 border-t border-slate-200 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-blue-600" aria-hidden="true" />
                  <span>Direct customer connection. FeraSetu does not run marketplace ads or divert your buyers.</span>
                </span>
                <span className="font-mono text-orange-700 font-bold bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                  0% FeraSetu Platform Commission
                </span>
              </div>
            </div>

          </div>
        </section>


        {/* ================================================================
          SECTION 3 — THREE OWNERSHIP PILLARS: OPEN COMPOSITION
        ================================================================ */}
        <section id="ownership-pillars" className="py-20 md:py-24 bg-white border-b border-slate-200">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4 border border-blue-200">
                <span>OWNERSHIP PRINCIPLES</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
                Three pillars of digital independence.
              </h2>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
                Infrastructure designed so you never have to trade your identity, your customer list, or your margins to be on the internet.
              </p>
            </div>

            {/* Interactive Feature Cards using SpotlightCard */}
            <div className="grid md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
              {/* Pillar 1: Your Name & Domain */}
              <SpotlightCard
                className="p-6 sm:p-7 flex flex-col justify-between hover:border-slate-300 shadow-sm"
                spotlightColor="rgba(0, 82, 255, 0.08)"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm mb-4 border border-blue-100 shadow-xs">
                    <span className="tabular-nums font-mono">01</span>
                  </div>
                  <div className="text-[11px] font-mono font-bold text-blue-700 uppercase tracking-wider mb-1">
                    STOREFRONT IDENTITY
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    Your Name &amp; Domain
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed font-normal">
                    Your store runs under your own business name, using your permanent store address or your own custom domain. No third-party ads, no search ranking games, and no competing shops pushed alongside your goods.
                  </p>
                </div>
              </SpotlightCard>

              {/* Pillar 2: Direct Customer Relationships */}
              <SpotlightCard
                className="p-6 sm:p-7 flex flex-col justify-between hover:border-slate-300 shadow-sm"
                spotlightColor="rgba(0, 82, 255, 0.08)"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm mb-4 border border-blue-100 shadow-xs">
                    <span className="tabular-nums font-mono">02</span>
                  </div>
                  <div className="text-[11px] font-mono font-bold text-blue-700 uppercase tracking-wider mb-1">
                    DIRECT CONDUIT
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    Direct Customer Relationships
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed font-normal">
                    When someone orders from your storefront, you receive their direct phone number and full order history. We never hide buyer details or use your customer list to sell ads.
                  </p>
                </div>
              </SpotlightCard>

              {/* Pillar 3: Your Money (0% Commission) */}
              <SpotlightCard
                className="p-6 sm:p-7 flex flex-col justify-between border-orange-200/80 hover:border-orange-300 shadow-sm"
                spotlightColor="rgba(249, 115, 22, 0.08)"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-sm mb-4 border border-orange-200 shadow-xs">
                    <span className="tabular-nums font-mono">03</span>
                  </div>
                  <div className="text-[11px] font-mono font-bold text-orange-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    HONEST COMMERCE · 0% TOLL
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    Your Money: 0% Platform Commission
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed font-normal">
                    You pay a predictable subscription for software that keeps running. We do not take a percentage cut of your sales. Every payment settles directly into your bank account through your chosen gateway.
                  </p>
                </div>
              </SpotlightCard>
            </div>
          </div>
        </section>


        {/* ================================================================
          SECTION 3.5 — STOREFRONT SHOWCASE: LIVE MERCHANT CONDUITS
        ================================================================ */}
        <StorefrontShowcase />


        {/* ================================================================
          SECTION 4 — THE COMPLETE CIRCUIT: SCROLL-DRIVEN PRODUCT JOURNEY
        ================================================================ */}
        <CompleteCircuit
          demo={demo}
          market={market}
          onStart={() => handleStart('circuit_start')}
        />


        {/* ================================================================
          SECTION 5 — THE PHILOSOPHY: DIGESTIBLE LAYERS WITH DEPTH
        ================================================================ */}
        <section id="philosophy" className="py-20 md:py-24 bg-white border-b border-slate-200">
          <div className="max-w-[900px] mx-auto px-4 sm:px-6">

            {/* Layer 1: Dominant Headline */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-800 text-xs font-bold uppercase tracking-wider mb-4 border border-orange-200">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                <span>WHY FERASETU EXISTS</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-6">
                You already built the hard part.
              </h2>
            </div>

            {/* Layer 2: Concise Core Explanation */}
            <div className="max-w-2xl mx-auto text-center mb-8">
              <p className="text-base sm:text-lg text-slate-700 leading-relaxed font-normal">
                A physical store takes real work: finding inventory, earning neighbor trust, and opening the door every single morning. Putting that store online should be dependable software, not a toll booth taking 15% to 25% of your turnover or walling off your customers. We built FeraSetu so shopkeepers can sell online without giving away their business.
              </p>
            </div>

            {/* Layer 3: Progressive Disclosure / Expandable Deeper Reading */}
            <div className="max-w-2xl mx-auto">
              <button
                type="button"
                onClick={() => setPhilosophyExpanded(!philosophyExpanded)}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-900 font-bold text-sm transition-colors cursor-pointer"
                aria-expanded={philosophyExpanded}
              >
                <span>Read our core operational beliefs</span>
                <ChevronDown
                  size={16}
                  className={`text-slate-500 transition-transform duration-200 ${philosophyExpanded ? 'rotate-180 text-blue-600' : ''}`}
                />
              </button>

              {philosophyExpanded && (
                <div className="mt-4 p-6 sm:p-7 rounded-2xl bg-slate-50 border border-slate-200 space-y-5 text-sm text-slate-700 leading-relaxed animate-fade-in">
                  <div>
                    <h4 className="font-bold text-slate-900 text-base mb-1">
                      1. Marketplaces turn independent shops into packing stations.
                    </h4>
                    <p className="text-slate-600">
                      Marketplaces promised new buyers but quietly turned local merchants into replaceable packing stations. When a platform hides customer contacts from you, you are working for their catalog instead of building your own goodwill. FeraSetu gives you an independent storefront so your customers stay yours.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-base mb-1">
                      2. Software is an operating tool, not an equity partner.
                    </h4>
                    <p className="text-slate-600">
                      You pay a clear subscription. If your shop has a record-breaking weekend, your software cost stays unchanged. FeraSetu takes 0% platform commission on your sales.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-base mb-1">
                      3. Customer records are your shop's long-term asset.
                    </h4>
                    <p className="text-slate-600">
                      When repeat buyers order, their numbers and purchase records stay in your private dashboard. You can download your entire customer list whenever you want.
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </section>


        {/* ================================================================
          SECTION 6 — COMPARISON / DIFFERENTIATION: HONEST ECONOMIC MATRIX
        ================================================================ */}
        <section id="comparison" className="py-20 md:py-24 bg-slate-50 border-b border-slate-200">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4 border border-blue-200">
                <span>HONEST COMPARISON</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
                Flat software vs. percentage tolls.
              </h2>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
                Compare the economics of direct ownership against traditional aggregators and generic website builders.
              </p>
            </div>

            {/* Scannable Comparison Matrix Table */}
            <div className="max-w-4xl mx-auto overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider">
                    <tr>
                      <th scope="col" className="px-5 py-4 w-1/4">Commercial Dimension</th>
                      <th scope="col" className="px-5 py-4 w-1/3 bg-blue-50/70 text-blue-900 font-black border-x border-blue-100">
                        <div className="flex items-center justify-between">
                          <span>FeraSetu Commerce</span>
                          <span className="px-2 py-0.5 rounded bg-orange-500 text-white text-[10px] font-black uppercase tracking-wider">
                            0% Toll
                          </span>
                        </div>
                      </th>
                      <th scope="col" className="px-5 py-4 w-1/3 text-slate-600">
                        Aggregator / Marketplace
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr className="comparison-row">
                      <td className="px-5 py-4 font-bold text-slate-900">Platform Commission</td>
                      <td className="px-5 py-4 bg-blue-50/30 text-blue-900 font-bold border-x border-blue-100">
                        <div className="flex items-center justify-between gap-2">
                          <span>0% (Flat subscription only)</span>
                          <span className="text-[11px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200 shrink-0">
                            100% Margin
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        15% to 25% deducted from every order
                      </td>
                    </tr>
                    <tr className="comparison-row">
                      <td className="px-5 py-4 font-bold text-slate-900">Customer Data Ownership</td>
                      <td className="px-5 py-4 bg-blue-50/30 text-blue-900 font-semibold border-x border-blue-100">
                        100% unmasked (phone, email &amp; history in your ledger)
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        Masked or completely withheld from seller
                      </td>
                    </tr>
                    <tr className="comparison-row">
                      <td className="px-5 py-4 font-bold text-slate-900">Storefront Identity</td>
                      <td className="px-5 py-4 bg-blue-50/30 text-blue-900 font-semibold border-x border-blue-100">
                        Your brand &amp; products only. Zero competitor ads
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        Competitor and sponsored ads placed on your listings
                      </td>
                    </tr>
                    <tr className="comparison-row">
                      <td className="px-5 py-4 font-bold text-slate-900">Payout Mechanism</td>
                      <td className="px-5 py-4 bg-blue-50/30 text-blue-900 font-semibold border-x border-blue-100">
                        Direct settlement into your business bank account
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        7 to 14-day platform escrow hold periods
                      </td>
                    </tr>
                    <tr className="comparison-row">
                      <td className="px-5 py-4 font-bold text-slate-900">Data Portability</td>
                      <td className="px-5 py-4 bg-blue-50/30 text-blue-900 font-semibold border-x border-blue-100">
                        1-click CSV export of all products, stock &amp; contacts
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        Locked into platform ecosystem
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Technical Payment Processing Fee Note */}
            <div className="mt-6 p-4 rounded-xl bg-slate-100 border border-slate-200 text-center max-w-3xl mx-auto text-xs text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-800">Payment Processor Note: </span>
              Standard merchant gateway processing fees apply directly from your payment processor ({market === 'IN' ? 'Cashfree' : 'Stripe'}). FeraSetu charges 0% commission surcharge.
            </div>
          </div>
        </section>


        {/* ================================================================
          SECTION 7 — TRANSPARENCY: OPERATIONAL BOUNDARIES
        ================================================================ */}
        <section id="transparency" className="py-20 md:py-24 bg-white border-b border-slate-200">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-wider mb-4 border border-slate-200">
                <span>OPERATIONAL BOUNDARIES</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
                Know who does what.
              </h2>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
                We are explicit about our responsibilities, your control, and third-party integrations.
              </p>
            </div>

            <Suspense fallback={<SectionFallback />}>
              <TransparencyTable />
            </Suspense>
          </div>
        </section>


        {/* ================================================================
          SECTION 8 — PREDICTABLE PRICING
        ================================================================ */}
        <section id="pricing" className="py-20 md:py-24 bg-slate-50 border-b border-slate-200" aria-label="FeraSetu pricing plans">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4 border border-blue-200">
                <span>PREDICTABLE PRICING</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
                Simple software subscription.<br />
                <span className="text-blue-600">0% sales commission.</span>
              </h2>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
                FeraSetu charges a predictable subscription. We charge <strong>0% platform commission</strong> on your sales.
              </p>
            </div>

            {/* Plans Grid */}
            <div className={`grid gap-6 mx-auto mb-10 items-stretch ${
              previewPlans.length === 2 ? 'md:grid-cols-2 max-w-3xl' : 'md:grid-cols-3 max-w-5xl'
            }`}>
              {previewPlans.map((plan) => {
                const isPopular = plan.id === 'business';
                const PlanIcon = plan.id === 'pro' ? Sparkles : plan.id === 'business' ? Zap : Store;

                return (
                  <div
                    key={plan.id}
                    className={`rounded-2xl p-6 sm:p-7 flex flex-col relative transition-all duration-200 ${
                      isPopular
                        ? 'bg-white border-2 border-orange-500 shadow-xl shadow-orange-500/10'
                        : 'bg-white border border-slate-200 shadow-sm hover:border-slate-300'
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute top-0 right-6 transform -translate-y-1/2 bg-orange-500 text-white text-[11px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                        <Zap size={11} aria-hidden="true" />
                        <span>Most Popular</span>
                      </div>
                    )}

                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shadow-xs ${
                          isPopular ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}>
                          <PlanIcon size={16} aria-hidden="true" />
                        </div>
                        <h3 className="font-bold text-2xl text-slate-900">{plan.displayName}</h3>
                      </div>
                      <p className="text-sm text-slate-600 min-h-[40px] leading-relaxed">
                        {plan.tagline}
                      </p>

                      <div className="mt-5 pb-5 border-b border-slate-100">
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-black text-slate-900 font-mono tabular-nums">
                            {formatPrice(plan.price.monthly)}
                          </span>
                          <span className="text-sm text-slate-500 font-semibold">
                            {plan.price.monthly === 0 ? 'forever' : '/month'}
                          </span>
                        </div>
                        <div className="text-xs text-blue-700 font-semibold mt-1">
                          {market === 'IN' && plan.price.monthly === 0
                            ? 'Permanent Free Plan · No credit card required'
                            : `${config.trialDays || 14}-day free trial · Cancel anytime`}
                        </div>
                      </div>

                      <ul className="text-sm space-y-3 mt-5 text-slate-700">
                        {plan.features.filter(f => typeof f === 'string' || f.included).slice(0, 6).map((f, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <Check size={15} className={`shrink-0 mt-0.5 ${isPopular ? 'text-orange-600 font-bold' : 'text-slate-500'}`} aria-hidden="true" />
                            <span className="leading-snug text-xs sm:text-sm">{typeof f === 'string' ? f : f.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-auto pt-4">
                      <button
                        type="button"
                        onClick={() => handleStart(`plan_${plan.id}`)}
                        className={`group w-full py-3 rounded-xl font-bold text-center text-sm transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 hover:-translate-y-0.5 ${
                          isPopular
                            ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/25'
                            : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                        }`}
                      >
                        <span>
                          {market === 'IN' && plan.price.monthly === 0
                            ? 'Start Free Store'
                            : (market === 'IN' ? `Get ${plan.displayName}` : `Start ${config.trialDays || 14}-Day Free Trial`)}
                        </span>
                        <ArrowRight size={14} className="transition-transform duration-150 group-hover:translate-x-1" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-center">
              <Link
                to={getLocalizedLink('/pricing')}
                className="group text-blue-600 hover:text-blue-800 font-bold text-sm inline-flex items-center gap-1.5 transition-colors"
              >
                <span>Compare all plan features &amp; limits in detail</span>
                <ArrowRight size={14} className="transition-transform duration-150 group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>


        {/* ================================================================
          SECTION 9 — SKEPTICISM RESOLUTION: FAQ
        ================================================================ */}
        <Suspense fallback={<SectionFallback />}>
          <FAQSection
            title="Questions independent merchants ask"
            subtitle="Honest answers with complete operational clarity."
          />
        </Suspense>


        {/* ================================================================
          SECTION 10 — FINAL CTA: THE SOVEREIGN SUMMONS
        ================================================================ */}
        <section className="py-20 md:py-28 bg-slate-900 text-white relative overflow-hidden border-t border-slate-800">
          <div className="max-w-[800px] mx-auto px-4 sm:px-6 text-center relative z-10">

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-orange-500/30 text-orange-400 text-xs sm:text-sm font-semibold mb-6 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              <span>Ready When You Are</span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-5">
              Bring your business online.<br />
              <span className="text-orange-400">Keep it yours.</span>
            </h2>

            <p className="text-lg sm:text-xl text-slate-300 mb-8 max-w-xl mx-auto leading-relaxed font-normal">
              Direct customer orders. 0% FeraSetu platform commission. Your own branded web address.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 max-w-md mx-auto">
              <button
                type="button"
                onClick={() => handleStart('final_cta')}
                className="group w-full sm:w-auto px-8 py-3.5 rounded-xl bg-orange-500 text-white font-bold text-base hover:bg-orange-600 transition-all duration-150 shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5"
              >
                <span>Bring my business online</span>
                <ArrowRight size={17} className="transition-transform duration-150 group-hover:translate-x-1" aria-hidden="true" />
              </button>
            </div>

            <div className="text-xs sm:text-sm text-slate-400 font-medium flex flex-wrap items-center justify-center gap-2.5">
              <span className="bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700">
                {market === 'IN' ? 'Permanent Free Plan' : '14-day trial'}
              </span>
              <span className="text-slate-600">•</span>
              <span className="bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700">No credit card to start</span>
              <span className="text-slate-600">•</span>
              <span className="bg-slate-800/80 px-2.5 py-1 rounded border border-orange-500/30 text-orange-300 font-semibold">
                0% FeraSetu platform commission
              </span>
            </div>
          </div>
        </section>

        </div>
      </PublicLayout>
    </>
  );
}
