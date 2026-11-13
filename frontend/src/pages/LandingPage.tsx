import { useEffect, useState, useRef } from 'react';
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
import SEO from '../components/SEO';
import SplitText from '../components/ui/SplitText';
import { trackCtaClick, trackSectionView, trackSignupStart } from '../lib/analytics/tracker';

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
            className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden bg-white border-b border-slate-200/80"
          >
            <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
              
              {/* Eyebrow, Main Headline & Core Proposition */}
              <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-white text-xs sm:text-sm font-semibold mb-6 shadow-md">
                  <span className="flex h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
                  <span className="font-mono text-[11px] font-bold tracking-wider uppercase text-[#F59E0B]">
                    0% Platform Commission · Direct Bank Settlement
                  </span>
                </div>

                <SplitText
                  text="Your business is yours."
                  highlightText="The internet should be too."
                  highlightClassName="text-[#0052FF] block sm:inline"
                  className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.08] mb-6"
                />

                <p className="text-lg sm:text-xl text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed font-normal">
                  FeraSetu gives you an independent online store with direct customer orders and instant bank settlement. Built inside is <strong>Fero</strong> — your autonomous 24/7 AI agent that monitors inventory, audits payouts, and advises your next move.
                </p>

                {/* Primary Action Row */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-8 max-w-md mx-auto">
                  <button
                    type="button"
                    onClick={() => handleStart('hero_primary')}
                    className="group w-full sm:w-auto min-h-[48px] px-7 py-3 rounded-xl bg-[#0052FF] text-white font-bold text-base hover:bg-[#0047E0] transition-all duration-150 hover:-translate-y-0.5 shadow-lg shadow-[#0052FF]/25 flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052FF] focus-visible:ring-offset-2"
                  >
                    <span>Bring my business online</span>
                    <ArrowRight size={17} className="transition-transform duration-150 group-hover:translate-x-1" aria-hidden="true" />
                  </button>

                  <a
                    href="#fero-agent"
                    className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-base hover:bg-slate-50 hover:border-slate-400 hover:text-slate-900 transition-all duration-150 flex items-center justify-center gap-2 shadow-xs"
                  >
                    <Sparkles size={16} className="text-[#F59E0B]" />
                    <span>Meet Fero AI Agent</span>
                  </a>
                </div>

                {/* Trust Invariants */}
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
                  <span className="inline-flex items-center gap-1.5 bg-orange-50 px-2.5 py-1 rounded-md border border-orange-200 text-orange-950 font-semibold">
                    <ShieldCheck size={14} className="text-orange-600" aria-hidden="true" />
                    <span>0% FeraSetu platform commission</span>
                  </span>
                </div>
              </div>

              {/* Product Proof & Live Interactive Loop */}
              <div id="product-proof">
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
            SECTION 4 — REAL MERCHANT STOREFRONTS
          ================================================================ */}
          <StorefrontShowcase />


          {/* ================================================================
            SECTION 5 — 0% COMMISSION CALCULATOR & SAVINGS MATRIX
          ================================================================ */}
          <section id="commission-calculator" className="py-20 md:py-24 bg-slate-50 border-b border-slate-200">
            <CommissionCalculatorMatrix
              market={market}
              onStart={() => handleStart('calculator_cta')}
            />
          </section>


          {/* ================================================================
            SECTION 6 — WHY FERASETU: HONEST OPERATIONAL BELIEFS
          ================================================================ */}
          <section id="why" className="py-20 md:py-24 bg-white border-b border-slate-200">
            <div className="max-w-[900px] mx-auto px-4 sm:px-6">

              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-800 text-xs font-bold uppercase tracking-wider mb-4 border border-orange-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  <span>WHY FERASETU EXISTS</span>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-6">
                  You already built the hard part.
                </h2>
                <p className="text-base sm:text-lg text-slate-700 leading-relaxed font-normal max-w-2xl mx-auto">
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

              {/* Comparison Matrix Table */}
              <div className="max-w-4xl mx-auto overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider">
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
                          100% unmasked (phone &amp; order history in your private ledger)
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
                        <td className="px-5 py-4 font-bold text-slate-900">Autonomous Shop Monitoring</td>
                        <td className="px-5 py-4 bg-blue-50/30 text-blue-900 font-semibold border-x border-blue-100">
                          Fero AI Agent audits deposits, watches stock &amp; suggests moves
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
          <section id="pricing" className="py-20 md:py-24 bg-white border-b border-slate-200" aria-label="FeraSetu pricing plans">
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
          <FAQSection
            title="Questions independent merchants ask"
            subtitle="Honest answers with complete operational clarity."
          />


          {/* ================================================================
            SECTION 10 — FINAL CTA: THE SOVEREIGN SUMMONS
          ================================================================ */}
          <section className="py-20 md:py-28 bg-slate-900 text-white relative overflow-hidden border-t border-slate-800">
            <div className="max-w-[800px] mx-auto px-4 sm:px-6 text-center relative z-10">

              {/* Fero AI Companion Pill */}
              <div className="mb-6 inline-flex items-center gap-3 p-1.5 pr-4 rounded-full bg-slate-800/90 border border-slate-700 shadow-md">
                <img
                  src="/pictures/fero-mascot.webp"
                  alt="Fero — Autonomous AI Store Monitor"
                  className="w-10 h-10 rounded-full object-cover object-top border-2 border-[#F59E0B]"
                  loading="lazy"
                />
                <span className="font-mono text-xs font-bold text-[#F59E0B] uppercase tracking-wider">
                  Fero AI Monitors Your Shop 24/7 · 0% Platform Toll
                </span>
              </div>

              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-5">
                Bring your business online.<br />
                <span className="text-orange-400">Keep it yours.</span>
              </h2>

              <p className="text-lg sm:text-xl text-slate-300 mb-8 max-w-xl mx-auto leading-relaxed font-normal">
                Direct customer orders. 0% FeraSetu platform commission. Your own branded web address with Fero monitoring your store.
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
                <span className="bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
                  {market === 'IN' ? 'Permanent Free Plan' : '14-day trial'}
                </span>
                <span className="text-slate-600">•</span>
                <span className="bg-slate-800 px-2.5 py-1 rounded border border-slate-700">No credit card to start</span>
                <span className="text-slate-600">•</span>
                <span className="bg-slate-800 px-2.5 py-1 rounded border border-orange-500/30 text-orange-300 font-semibold">
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
