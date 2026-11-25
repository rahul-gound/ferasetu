import { Component, useEffect, useState, useRef, lazy, Suspense, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ShieldCheck,
  Check,
  Store,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  Zap,
  TrendingUp,
  Coins,
  Bot
} from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import PublicLayout from '../components/public/PublicLayout';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useMarket } from '../contexts/MarketContext';
import { getMarketPlans } from '../config/plans';
import { getMarketDemoConfig } from '../config/marketDemo';
import StorefrontShowcase from '../components/marketing/StorefrontShowcase';
import FAQSection from '../components/marketing/FAQSection';
import HeroConnectedJourney from '../components/marketing/HeroConnectedJourney';
import FeroGuardianSection from '../components/marketing/FeroGuardianSection';
import CommissionCalculatorMatrix from '../components/marketing/CommissionCalculatorMatrix';
import HowItWorksFeraAIShowcase from '../components/marketing/HowItWorksFeraAIShowcase';
import CompleteCircuit from '../components/marketing/CompleteCircuit';
import MerchantStorySpotlight from '../components/marketing/MerchantStorySpotlight';
import ScrollViewCinema from '../components/marketing/ScrollViewCinema';
import SEO from '../components/SEO';
import { trackCtaClick, trackSectionView, trackSignupStart } from '../lib/analytics/tracker';

const HeroScene = lazy(() => import('../components/three/HeroScene'));

class ThreeErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

gsap.registerPlugin(ScrollTrigger);

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
    const isTouchOrCoarse =
      window.matchMedia('(pointer: coarse)').matches ||
      ('ontouchstart' in window) ||
      navigator.maxTouchPoints > 0 ||
      window.innerWidth < 1024;

    if (prefersReducedMotion || isTouchOrCoarse || !landingRef.current) return;

    const ctx = gsap.context(() => {
      // Choreographed above-the-fold Hero entrance
      gsap.fromTo(
        '.hero-stagger',
        { opacity: 0, y: 18 },
        {
          opacity: 1,
          y: 0,
          duration: 0.65,
          stagger: 0.08,
          ease: 'power3.out',
          clearProps: 'transform',
        }
      );

      // Staggered row reveal for comparison table
      gsap.fromTo(
        '.comparison-row',
        { opacity: 0.2, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          stagger: 0.05,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '#comparison table',
            start: 'top 88%',
            once: true,
          },
        }
      );
    }, landingRef);

    return () => ctx.revert();
  }, []);

  // Recalibrate ScrollTrigger positions after lazy components settle
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 350);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.25) {
            trackSectionView(entry.target.id);
          }
        });
      },
      { threshold: [0.25] }
    );

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
    ? 'Run your own branded online store with direct customer orders, instant bank settlement, and Fero — your autonomous 24/7 AI shop monitor. 0% FeraSetu platform commission.'
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
            'Independent digital commerce platform with Fero autonomous AI shop monitor. Connects storefront, ordering, payments, and fulfillment with 0% FeraSetu platform commission.',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: market === 'IN' ? 'INR' : market === 'EU' ? 'EUR' : 'USD',
            description:
              market === 'IN'
                ? 'Permanent Free plan · No credit card to start'
                : '14-day trial · No credit card to start',
          },
          operatingSystem: 'Web, Mobile',
          url: 'https://ferasetu.com',
        }}
      />

      <PublicLayout>
        <div ref={landingRef} className="bg-white text-slate-900 selection:bg-orange-100 selection:text-orange-950">

          {/* ================================================================
            SECTION 1 — HERO: IMMEDIATE UNDERSTANDING, SOVEREIGN COMMERCE & PROOF
          ================================================================ */}
          <section
            id="hero"
            className="relative pt-14 pb-16 md:pt-20 md:pb-24 overflow-hidden bg-white border-b border-slate-200/80 scroll-mt-24"
          >
            {/* Interactive 3D Sovereign Engine Backdrop (Three.js) */}
            <div
              className="absolute inset-0 pointer-events-none overflow-hidden opacity-20 sm:opacity-25 z-0"
              style={{
                maskImage: 'radial-gradient(ellipse 75% 65% at 50% 35%, black 20%, transparent 100%)',
                WebkitMaskImage: 'radial-gradient(ellipse 75% 65% at 50% 35%, black 20%, transparent 100%)',
              }}
            >
              <ThreeErrorBoundary>
                <Suspense fallback={null}>
                  <HeroScene />
                </Suspense>
              </ThreeErrorBoundary>
            </div>

            {/* Subtle Kombai-Inspired Ambient Radial Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-b from-blue-50/40 via-orange-50/20 to-transparent blur-3xl pointer-events-none" />

            <div className="max-w-[1240px] mx-auto px-4 sm:px-6 relative z-10">
              
              {/* Main Headline & Core Proposition */}
              <div className="max-w-3xl mx-auto text-center mb-10 sm:mb-12">
                {/* Architectural HUD Eyebrow Badge */}
                <div className="hero-stagger inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/[0.03] border border-slate-200/80 mb-6 text-xs font-semibold text-slate-800 shadow-2xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500">Sovereign Retail Commerce</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-orange-950 font-bold">0% Commission Guaranteed</span>
                </div>

                <h1 className="hero-stagger text-4xl sm:text-5xl md:text-6xl lg:text-[62px] font-black text-slate-950 tracking-[-0.03em] leading-[1.08] mb-6">
                  Your business is yours.{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-950 via-slate-800 to-slate-600">
                    The internet should be too.
                  </span>
                </h1>

                <p className="hero-stagger text-lg sm:text-xl text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed font-normal">
                  FeraSetu connects your physical shop directly to online buyers with zero intermediary commissions and instant bank settlement. Built inside is <strong>Fero</strong> — your autonomous 24/7 AI agent monitoring stock, auditing payouts, and defending your store.
                </p>

                {/* Primary Action Row */}
                <div className="hero-stagger flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-8 max-w-md mx-auto">
                  <button
                    type="button"
                    onClick={() => handleStart('hero_primary')}
                    className="group w-full sm:w-auto min-h-[52px] px-8 py-3.5 rounded-2xl bg-[#EA580C] hover:bg-[#D9480F] active:bg-[#C2410C] text-white font-bold text-base transition-all duration-150 flex items-center justify-center gap-2.5 cursor-pointer shadow-[0_2px_4px_rgba(234,88,12,0.16),0_1px_2px_rgba(0,0,0,0.06)] hover:shadow-[0_6px_16px_rgba(234,88,12,0.24)] hover:-translate-y-0.5 active:translate-y-0.5 active:scale-[0.985] active:shadow-inner select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                  >
                    <span>Bring my business online</span>
                    <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                  </button>

                  <a
                    href="#fero-agent"
                    className="w-full sm:w-auto min-h-[52px] px-7 py-3.5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 text-slate-800 hover:text-slate-950 font-bold text-base transition-all duration-150 flex items-center justify-center gap-2 shadow-xs hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0.5 active:scale-[0.985] select-none"
                  >
                    <ShieldCheck size={18} className="text-[#0052FF]" />
                    <span>Store Intelligence</span>
                  </a>
                </div>

                {/* Trust Invariants */}
                <div className="text-xs sm:text-sm text-slate-600 font-medium flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
                  <span className="inline-flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                    <CheckCircle2 size={15} className="text-emerald-600" aria-hidden="true" />
                    <span>{market === 'IN' ? 'Permanent Free Plan' : '14-day trial'}</span>
                  </span>
                  <span className="text-slate-300 hidden sm:inline">•</span>
                  <span className="inline-flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                    <CheckCircle2 size={15} className="text-emerald-600" aria-hidden="true" />
                    <span>No credit card to start</span>
                  </span>
                  <span className="text-slate-300 hidden sm:inline">•</span>
                  <span className="inline-flex items-center gap-1.5 bg-orange-50/70 px-3 py-1.5 rounded-xl border border-orange-200 text-orange-950 font-semibold">
                    <ShieldCheck size={15} className="text-orange-600" aria-hidden="true" />
                    <span>0% FeraSetu platform commission</span>
                  </span>
                </div>
              </div>

              {/* Product Proof & Live Interactive Loop */}
              <div id="product-proof" className="scroll-mt-24">
                <HeroConnectedJourney
                  market={market}
                  onExplorePlans={() => {
                    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                />
              </div>

            </div>
          </section>


          {/* ================================================================
            SECTION 1B — REAL MERCHANT SPOTLIGHT: EMOTIONAL CONNECTION & HUMAN PROOF
          ================================================================ */}
          <MerchantStorySpotlight />


          {/* ================================================================
            SECTION 1C — SCROLL-VIEW: FRAME-BY-FRAME COMMERCE WALKTHROUGH
          ================================================================ */}
          <ScrollViewCinema market={market} />


          {/* ================================================================
            SECTION 2 — FERO: AUTONOMOUS AI SHOPKEEPER AGENT & MONITOR
          ================================================================ */}
          <FeroGuardianSection
            onStart={() => handleStart('fero_guardian_cta')}
            market={market}
          />


          {/* ================================================================
            SECTION 3 — HOW FERASETU WORKS: 3-STEP SOVEREIGN COMMERCE CIRCUIT
          ================================================================ */}
          <HowItWorksFeraAIShowcase
            onStart={() => handleStart('how_it_works_cta')}
            market={market}
          />


          {/* ================================================================
            SECTION 3B — CONNECTED JOURNEY: 4-STAGE PRODUCT CIRCUIT
          ================================================================ */}
          <CompleteCircuit
            demo={demo}
            market={market}
            onStart={() => handleStart('journey_cta')}
          />


          {/* ================================================================
            SECTION 4 — REAL MERCHANT STOREFRONTS
          ================================================================ */}
          <StorefrontShowcase />


          {/* ================================================================
            SECTION 5 — 0% COMMISSION CALCULATOR & SAVINGS MATRIX
          ================================================================ */}
          <section id="commission-calculator" className="py-20 md:py-28 bg-slate-50 border-b border-slate-200 scroll-mt-24">
            <CommissionCalculatorMatrix
              market={market}
              onStart={() => handleStart('calculator_cta')}
            />
          </section>


          {/* ================================================================
            SECTION 6 — WHY FERASETU: HONEST OPERATIONAL BELIEFS
          ================================================================ */}
          <section id="why" className="py-20 md:py-28 bg-white border-b border-slate-200 scroll-mt-24">
            <div className="max-w-[900px] mx-auto px-4 sm:px-6">

              {/* Header */}
              <div className="text-center mb-10">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-5">
                  You already built the hard part.
                </h2>
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-2xl mx-auto">
                  A physical store takes real work: finding inventory, earning neighbor trust, and opening the door every single morning. Putting that store online should be dependable software, not a toll booth taking 15% to 25% of your turnover or walling off your customers. We built FeraSetu so shopkeepers sell online without giving away their business.
                </p>
              </div>

              {/* Core Operational Beliefs (Expandable) */}
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
                    className={`text-slate-500 transition-transform duration-200 ${
                      philosophyExpanded ? 'rotate-180 text-blue-600' : ''
                    }`}
                  />
                </button>

                {philosophyExpanded && (
                  <div className="mt-4 p-6 sm:p-7 rounded-2xl bg-slate-50 border border-slate-200 space-y-5 text-sm text-slate-700 leading-relaxed">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base mb-1">
                        1. Marketplaces turn independent shops into packing stations.
                      </h3>
                      <p className="text-slate-600">
                        Marketplaces promised new buyers but quietly turned local merchants into replaceable packing stations. When a platform hides customer contacts from you, you are working for their catalog instead of building your own goodwill. FeraSetu gives you an independent storefront so your customers stay yours.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base mb-1">
                        2. Software is an operating tool, not an equity partner.
                      </h3>
                      <p className="text-slate-600">
                        You pay a clear subscription. If your shop has a record-breaking weekend, your software cost stays unchanged. FeraSetu takes 0% platform commission on your sales.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base mb-1">
                        3. Customer records are your shop's long-term asset.
                      </h3>
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
            SECTION 7 — COMPARISON: FLAT SOFTWARE VS. PERCENTAGE TOLLS
          ================================================================ */}
          <section id="comparison" className="py-20 md:py-28 bg-slate-50 border-b border-slate-200 scroll-mt-24">
            <div className="max-w-[1100px] mx-auto px-4 sm:px-6">
              <div className="text-center max-w-2xl mx-auto mb-12">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
                  Flat software vs. percentage tolls.
                </h2>
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
                  Compare the economics of direct ownership against traditional aggregators and generic website builders.
                </p>
              </div>

              {/* Comparison Matrix Table */}
              <div className="max-w-4xl mx-auto overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto -mx-1 sm:mx-0">
                  <table className="w-full text-left text-sm min-w-[620px]">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider">
                      <tr>
                        <th scope="col" className="px-5 py-4 w-1/4">Commercial Dimension</th>
                        <th scope="col" className="px-5 py-4 w-1/3 bg-blue-50/70 text-blue-900 font-bold border-x border-blue-100">
                          <div className="flex items-center justify-between">
                            <span>FeraSetu Commerce</span>
                            <span className="px-2 py-0.5 rounded bg-orange-600 text-white text-[10px] font-bold uppercase tracking-wider">
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
                          100% unmasked (phone &amp; order history in your private ledger)
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          Masked or completely withheld from seller
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
                        <td className="px-5 py-4 font-bold text-slate-900">Autonomous Shop Monitoring</td>
                        <td className="px-5 py-4 bg-blue-50/30 text-blue-900 font-semibold border-x border-blue-100">
                          Fero Store Intelligence audits deposits, watches stock &amp; suggests moves
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          Algorithms push ads to your buyers instead of helping you
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Transparent Note */}
              <div className="mt-6 p-4 rounded-xl bg-slate-100 border border-slate-200 text-center max-w-3xl mx-auto text-xs text-slate-600 leading-relaxed">
                <span className="font-semibold text-slate-800">Payment Processor Note: </span>
                Standard merchant gateway processing fees apply directly from your payment processor ({market === 'IN' ? 'Cashfree' : 'Stripe'}). FeraSetu charges 0% commission surcharge.
              </div>
            </div>
          </section>


          {/* ================================================================
            SECTION 8 — PREDICTABLE PRICING
          ================================================================ */}
          <section id="pricing" className="py-20 md:py-28 bg-white border-b border-slate-200 scroll-mt-24" aria-label="FeraSetu pricing plans">
            <div className="max-w-[1100px] mx-auto px-4 sm:px-6">
              <div className="text-center max-w-2xl mx-auto mb-12">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
                  Simple software subscription. 0% sales commission.
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
                  const isPopular = plan.highlighted ?? (plan.id === 'pro');
                  const PlanIcon = plan.id === 'pro' ? Sparkles : plan.id === 'business' ? Zap : Store;

                  return (
                    <div
                      key={plan.id}
                      className={`rounded-2xl p-6 sm:p-7 flex flex-col relative transition-all duration-200 ${
                        isPopular
                          ? 'bg-white border-2 border-[#0052FF] shadow-lg shadow-blue-500/10'
                          : 'bg-white border border-slate-200 shadow-sm hover:border-slate-300'
                      }`}
                    >
                      {isPopular && (
                        <div className="absolute top-0 right-6 transform -translate-y-1/2 bg-[#0052FF] text-white text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                          <Zap size={11} aria-hidden="true" />
                          <span>Most Popular</span>
                        </div>
                      )}

                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shadow-xs ${
                            isPopular ? 'bg-blue-50 border-blue-200 text-[#0052FF]' : 'bg-slate-50 border-slate-200 text-slate-700'
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
                            <span className="text-4xl font-extrabold text-slate-900 tabular-nums">
                              {formatPrice(plan.price.monthly)}
                            </span>
                            <span className="text-sm text-slate-500 font-semibold">
                              {plan.price.monthly === 0 ? 'forever' : '/month'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 font-medium mt-1.5">
                            {market === 'IN' && plan.price.monthly === 0
                              ? 'Permanent Free Plan · No credit card required'
                              : `${config.trialDays || 14}-day free trial · Cancel anytime`}
                          </div>
                        </div>

                        <ul className="text-sm space-y-3 mt-5 text-slate-700">
                          {plan.features.filter(f => typeof f === 'string' || f.included).slice(0, 6).map((f, i) => (
                            <li key={i} className="flex items-start gap-2.5">
                              <Check size={15} className={`shrink-0 mt-0.5 ${isPopular ? 'text-[#0052FF] font-bold' : 'text-slate-500'}`} aria-hidden="true" />
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
                              ? 'bg-[#0052FF] hover:bg-[#0047E0] text-white shadow-md shadow-blue-500/25'
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
          <FAQSection
            title="Questions independent merchants ask"
            subtitle="Honest answers with complete operational clarity."
          />


          {/* ================================================================
            SECTION 10 — FINAL CTA: DIRECT COMMERCE
          ================================================================ */}
          <section className="py-24 md:py-32 bg-[#060D1F] text-white relative overflow-hidden border-t border-slate-800/80">
            {/* Subtle Blueprint Geometry Lattice */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.06]"
              style={{
                backgroundImage: 'linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
              aria-hidden="true"
            />
            
            {/* Soft Radial Center Light */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#0052FF]/15 blur-[100px] rounded-full pointer-events-none"
              aria-hidden="true"
            />

            <div className="max-w-[820px] mx-auto px-4 sm:px-6 text-center relative z-10">

              {/* Direct Commerce Trust Badge with Micro-interaction */}
              <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition-colors duration-200 shadow-sm cursor-default">
                <ShieldCheck size={16} className="text-emerald-400" />
                <span className="text-xs font-medium text-slate-300">
                  Independent store · Direct bank settlements · 0% commission
                </span>
              </div>

              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-5">
                Bring your business online. Keep it yours.
              </h2>

              <p className="text-lg sm:text-xl text-slate-300 mb-9 max-w-xl mx-auto leading-relaxed font-normal">
                Direct customer orders, instant bank deposits, and automated store monitoring without giving away your hard-earned margins.
              </p>

              {/* Rounded-Rectangle CTA Button with 3D Tactile Press */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-9 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => handleStart('final_cta')}
                  className="group w-full sm:w-auto px-9 py-4 rounded-full bg-[#EA580C] hover:bg-[#D9480F] active:bg-[#C2410C] text-white font-semibold text-base transition-all duration-150 flex items-center justify-center gap-2.5 cursor-pointer border-t border-white/30 shadow-[0_4px_0_0_#8c2505,0_8px_18px_-2px_rgba(140,37,5,0.35),0_14px_28px_-4px_rgba(234,88,12,0.42),0_4px_8px_-1px_rgba(0,0,0,0.12)] hover:shadow-[0_6px_0_0_#8c2505,0_10px_22px_-2px_rgba(140,37,5,0.4),0_20px_36px_-4px_rgba(234,88,12,0.5),0_6px_12px_-2px_rgba(0,0,0,0.16)] hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_1px_0_0_#8c2505,inset_0_3px_6px_rgba(0,0,0,0.36),0_2px_6px_rgba(0,0,0,0.12)] select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                >
                  <span>Bring my business online</span>
                  <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                </button>
              </div>

              <div className="text-xs sm:text-sm text-slate-400 font-medium flex flex-wrap items-center justify-center gap-2.5">
                <span className="bg-slate-900/90 px-3.5 py-1.5 rounded-lg border border-slate-800 text-slate-300 hover:border-slate-700 transition-colors">
                  {market === 'IN' ? 'Permanent Free Plan' : '14-day trial'}
                </span>
                <span className="text-slate-700">•</span>
                <span className="bg-slate-900/90 px-3.5 py-1.5 rounded-lg border border-slate-800 text-slate-300 hover:border-slate-700 transition-colors">
                  No credit card to start
                </span>
                <span className="text-slate-700">•</span>
                <span className="bg-slate-900/90 px-3.5 py-1.5 rounded-lg border border-orange-500/30 text-orange-300 font-medium hover:border-orange-500/50 transition-colors">
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
