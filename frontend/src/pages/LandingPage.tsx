/**
 * LandingPage — Redesigned around the Start With Why / Golden Circle philosophy.
 *
 * PHILOSOPHY:
 * 1. WHY (Belief & Purpose)
 * 2. HOW (Principles & Architecture)
 * 3. WHAT (Product & Evidence)
 *
 * Core Brand Idea:
 * “Your business is yours. The internet should be too.”
 *
 * Truth & Transparency:
 * - 0% FeraSetu platform commission (third-party payment processing fees clearly noted)
 * - FeraSetu does not own warehouses, physical inventory, riders, or delivery fleets
 * - Real product demonstrations (no fake testimonials, no fake metrics, no fake urgency)
 * - 14-day trial model with no credit card required to start
 */
import { useEffect, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Check,
  Lock,
} from 'lucide-react';
import PublicLayout from '../components/public/PublicLayout';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useMarket } from '../contexts/MarketContext';
import { getMarketPlans } from '../config/plans';
import SEO from '../components/SEO';
import { trackCtaClick, trackSectionView, trackSignupStart } from '../lib/analytics/tracker';

// Lazy-loaded specialized components for optimal performance & clean code-splitting
const EvidenceShowcase = lazy(() => import('../components/marketing/EvidenceShowcase'));
const JourneyDiagram = lazy(() => import('../components/marketing/JourneyDiagram'));
const TransparencyTable = lazy(() => import('../components/marketing/TransparencyTable'));
const ProductStoryWalkthrough = lazy(() => import('../components/marketing/ProductStoryWalkthrough'));
const FAQSection = lazy(() => import('../components/marketing/FAQSection'));

const SectionFallback = () => (
  <div className="w-full py-16 flex items-center justify-center">
    <div className="w-6 h-6 rounded-full border-2 border-blue-100 border-t-blue-600 animate-spin" />
  </div>
);

export default function LandingPage() {
  const { getLocalizedLink } = useLanguage();
  const { user, register } = useAuth();
  const { market, config, trialPolicy, formatPrice } = useMarket();
  const navigate = useNavigate();
  const previewPlans = getMarketPlans(market);

  const claimShopName = '';

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

  const slugifiedClaim = claimShopName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || (market === 'IN' ? 'sharmageneral' : 'apexstore');

  const handleStart = (source: string) => {
    trackCtaClick(source, 'Bring your business online', source, '/register');
    trackSignupStart(market, source);
    if (claimShopName.trim()) {
      try {
        localStorage.setItem('ferasetu_claimed_shop_name', claimShopName.trim());
      } catch {
        // ignore localStorage access errors
      }
    }
    if (user) {
      navigate('/dashboard');
    } else {
      register();
    }
  };

  return (
    <>
      <SEO
        title="FeraSetu — Your business is yours. The internet should be too."
        description="We believe independent businesses should be able to build an online presence, serve their customers and grow without losing control of the business they built."
        noindex={false}
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'FeraSetu',
          applicationCategory: 'BusinessApplication',
          description:
            'Digital infrastructure for independent commerce. Connects storefront, ordering, payments, and fulfillment with 0% FeraSetu platform commission.',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: market === 'IN' ? 'INR' : 'USD',
            description: '14-day trial · No credit card to start',
          },
          operatingSystem: 'Web, Mobile',
          url: 'https://ferasetu.com',
        }}
      />

      <PublicLayout>

        {/* ================================================================
          SECTION 1 — HERO / WHY
          Headline: “Your business is yours. The internet should be too.”
          Core Purpose: Why FeraSetu exists.
        ================================================================ */}
        <section id="why" className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden bg-white border-b border-slate-100">
          <div className="max-w-[1100px] mx-auto px-6 relative z-10 text-center">

            {/* Belief Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs sm:text-sm font-semibold mb-8">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span>The Independent Business Philosophy</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.08] mb-6 max-w-4xl mx-auto">
              Your business is yours.{' '}
              <span className="text-blue-600 block sm:inline">The internet should be too.</span>
            </h1>

            {/* Supporting Copy */}
            <p className="text-lg sm:text-xl text-slate-600 mb-10 max-w-3xl mx-auto leading-relaxed font-normal">
              We believe independent businesses should be able to build an online presence, serve their customers and grow without losing control of the business they built.
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10 max-w-md mx-auto">
              <button
                type="button"
                onClick={() => handleStart('hero_primary')}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 text-white font-bold text-base hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Bring your business online</span>
                <ArrowRight size={18} />
              </button>

              <a
                href="#belief"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-base hover:bg-slate-50 hover:text-slate-900 transition-all flex items-center justify-center gap-1.5"
              >
                <span>See why FeraSetu exists</span>
              </a>
            </div>

            {/* Trial & Trust Line */}
            <div className="text-xs sm:text-sm text-slate-500 font-medium flex items-center justify-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-blue-600" />
                14-day trial
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-blue-600" />
                No credit card to start
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-blue-600" />
                0% FeraSetu platform commission
              </span>
            </div>

            {/* Visual: Transformation Flow from Physical Business to Customer */}
            <div className="mt-16 pt-10 border-t border-slate-100">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-6">
                THE DIGITAL BRIDGE // FROM REAL WORLD TO RETURNING CUSTOMER
              </div>

              {/* 5-Node Connected Transformation Flow */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 max-w-4xl mx-auto text-left">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-mono font-bold text-slate-400 block mb-1">01 / REAL-WORLD</span>
                  <div className="font-bold text-slate-900 text-sm">Physical Business</div>
                  <p className="text-xs text-slate-500 mt-1">Your shop, products, and years of hard work.</p>
                </div>
                <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200">
                  <span className="text-[10px] font-mono font-bold text-blue-600 block mb-1">02 / STOREFRONT</span>
                  <div className="font-bold text-blue-950 text-sm">FeraSetu Storefront</div>
                  <p className="text-xs text-slate-600 mt-1">Your own permanent address on the web.</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-mono font-bold text-slate-400 block mb-1">03 / INTAKE</span>
                  <div className="font-bold text-slate-900 text-sm">Customer Order</div>
                  <p className="text-xs text-slate-500 mt-1">Structured cart checkout and direct contact.</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-mono font-bold text-slate-400 block mb-1">04 / DISPATCH</span>
                  <div className="font-bold text-slate-900 text-sm">Fulfillment & Handshake</div>
                  <p className="text-xs text-slate-500 mt-1">Packed by you; handed off with OTP verification.</p>
                </div>
                <div className="col-span-2 md:col-span-1 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-mono font-bold text-slate-400 block mb-1">05 / RETENTION</span>
                  <div className="font-bold text-slate-900 text-sm">Returning Customer</div>
                  <p className="text-xs text-slate-500 mt-1">Direct customer relationship owned by you.</p>
                </div>
              </div>
            </div>

            {/* Real Product UI Mockup */}
            <div className="mt-12 max-w-4xl mx-auto rounded-2xl border-2 border-slate-200 bg-white shadow-2xl overflow-hidden text-left">
              {/* Browser bar */}
              <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                </div>
                <div className="bg-white px-4 py-1 rounded-md border border-slate-200 text-slate-600 font-mono text-xs flex items-center gap-2">
                  <Lock size={12} className="text-green-600" />
                  <span>https://{slugifiedClaim}.ferasetu.com</span>
                </div>
                <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                  Active Storefront
                </span>
              </div>

              {/* Storefront Header */}
              <div className="p-6 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Sharma General Store</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Online ordering · Instant UPI & Cards · Local Store Pickup or Delivery</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full font-bold text-xs">
                    ● Accepting Orders
                  </span>
                </div>
              </div>

              {/* Real Catalog Line Items */}
              <div className="p-6 divide-y divide-slate-100">
                <div className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">Farm Fresh Milk (500ml)</div>
                    <div className="text-xs text-slate-400">Dairy Essentials · Real-time stock tracked</div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 text-sm">₹34.00</span>
                    <span className="block text-[11px] text-green-600 font-medium">In Stock</span>
                  </div>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">Whole Wheat Bread (400g)</div>
                    <div className="text-xs text-slate-400">Fresh Daily Bakery · In-store packaging</div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 text-sm">₹45.00</span>
                    <span className="block text-[11px] text-green-600 font-medium">In Stock</span>
                  </div>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">Butter Marie Biscuits (250g)</div>
                    <div className="text-xs text-slate-400">Pantry Essentials · Regular customer favorite</div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 text-sm">₹30.00</span>
                    <span className="block text-[11px] text-green-600 font-medium">In Stock</span>
                  </div>
                </div>
              </div>

              {/* Bottom transparency notice */}
              <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
                <span>Direct customer connection. FeraSetu does not run marketplace ads or divert your buyers.</span>
                <span className="font-mono text-blue-700 font-semibold">0% Platform Cut</span>
              </div>
            </div>

          </div>
        </section>


        {/* ================================================================
          SECTION 2 — “YOU ALREADY BUILT SOMETHING REAL”
          Empathy section: Recognition of merchant's hard work.
        ================================================================ */}
        <section className="py-20 md:py-24 bg-slate-50 border-b border-slate-200">
          <div className="max-w-[1000px] mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200/80 text-slate-700 text-xs font-bold uppercase tracking-wider mb-4">
                Recognition
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-5">
                You already built the hard part.
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed font-normal">
                Before you ever opened a browser or looked at an online tool, you did what most software never understands:
              </p>
            </div>

            {/* The 6 Real Foundations */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
              {[
                { title: 'A Respected Name', desc: 'A real identity that customers in your area know, trust, and search for.' },
                { title: 'Curated Products', desc: 'Years spent learning exactly what your customers need and what quality looks like.' },
                { title: 'Real Relationships', desc: 'Direct handshakes, familiar faces, and conversations built over time.' },
                { title: 'Local Knowledge', desc: 'Knowing your neighborhood routes, customer preferences, and seasonal demands.' },
                { title: 'Pricing & Trust', desc: 'Fair, transparent prices that people rely on without hidden platform surcharges.' },
                { title: 'Years of Dedication', desc: 'The daily discipline of opening on time, solving issues, and keeping shelves stocked.' },
              ].map((item, idx) => (
                <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center mb-3">
                    0{idx + 1}
                  </div>
                  <h3 className="font-bold text-base text-slate-900 mb-1.5">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Punchline */}
            <div className="p-8 rounded-2xl bg-white border-2 border-blue-100 shadow-md text-center max-w-2xl mx-auto">
              <p className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
                Going online shouldn’t make it feel less like your business.
              </p>
              <p className="text-slate-600 text-sm mt-3 leading-relaxed">
                Platforms often demand that you surrender your customer contacts, give away 15%–30% of your margin, and hide your business behind their logo. We reject that trade-off entirely.
              </p>
            </div>
          </div>
        </section>


        {/* ================================================================
          SECTION 3 — THE BELIEF
          Large Editorial Section: The Golden Circle WHY.
        ================================================================ */}
        <section id="belief" className="py-20 md:py-28 bg-white border-b border-slate-200">
          <div className="max-w-[1000px] mx-auto px-6">
            <div className="max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-6">
                Our First Principle
              </div>

              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-8">
                We believe a business should belong to the person who built it.
              </h2>

              <p className="text-lg text-slate-600 leading-relaxed mb-12">
                When you bring your business onto the internet, you should not be forced into digital tenant farming. You should not be an anonymous catalog item inside an aggregator that auctions your own customers to the highest bidder.
              </p>

              {/* Three Editorial Principles */}
              <div className="space-y-8 border-l-2 border-blue-600 pl-6 sm:pl-8">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                    “Your identity should be yours.”
                  </h3>
                  <p className="text-slate-600 text-base leading-relaxed">
                    Your storefront URL is your name, not our brand. Customers see your logo, your colors, and your story. You are never forced to compete against sponsored clones right on your own catalog.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                    “Your customer relationship should be yours.”
                  </h3>
                  <p className="text-slate-600 text-base leading-relaxed">
                    When someone buys from you, they are your customer. You have their contact details, order history, and direct communication channel. We never mask customer phone numbers or sell your buyer list.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                    “Your online presence should be yours.”
                  </h3>
                  <p className="text-slate-600 text-base leading-relaxed">
                    You can export your complete catalog, customer list, and order history at any time. Your digital presence is an asset you own, not a rented lease that can be terminated without explanation.
                  </p>
                </div>
              </div>

              {/* Section Conclusion */}
              <div className="mt-12 pt-8 border-t border-slate-200">
                <p className="text-xl font-bold text-blue-900">
                  FeraSetu exists to make that belief practical.
                </p>
              </div>
            </div>
          </div>
        </section>


        {/* ================================================================
          SECTION 4 — TRUST THROUGH EVIDENCE
          Headline: “Don't take our word for it. Look at how it works.”
        ================================================================ */}
        <section id="evidence" className="py-20 md:py-28 bg-slate-50 border-b border-slate-200">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wider mb-4">
                Verifiable Capability
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
                Don’t take our word for it.<br />
                <span className="text-blue-600">Look at how it works.</span>
              </h2>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                We don’t ask you to trust marketing claims. Here is the actual digital workflow running in FeraSetu today — from storefront link to delivery handshake.
              </p>
            </div>

            <Suspense fallback={<SectionFallback />}>
              <EvidenceShowcase />
            </Suspense>
          </div>
        </section>


        {/* ================================================================
          SECTION 5 — THE END-TO-END JOURNEY
          Headline: “From first click to front door.”
        ================================================================ */}
        <section id="journey" className="py-20 md:py-28 bg-white border-b border-slate-200">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider mb-4">
                Connected Architecture
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
                From first click to front door.
              </h2>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                FeraSetu is not merely a website builder that dumps you once a product page is generated. We connect the complete digital business journey while keeping you at the centre.
              </p>
            </div>

            <Suspense fallback={<SectionFallback />}>
              <JourneyDiagram />
            </Suspense>
          </div>
        </section>


        {/* ================================================================
          SECTION 6 — HOW FERASETU WORKS
          Headline: “We build differently.”
          The 5 Core Principles.
        ================================================================ */}
        <section id="principles" className="py-20 md:py-28 bg-slate-50 border-b border-slate-200">
          <div className="max-w-[1100px] mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wider mb-4">
                How We Operate
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
                We build differently.
              </h2>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                These five design principles govern every line of code and every workflow we ship.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Principle 1 */}
              <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm mb-4">
                    01
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">OWNERSHIP FIRST</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    The merchant stays permanently at the centre. You own your storefront, your brand name, your customer phone numbers, and your order history.
                  </p>
                </div>
                <div className="mt-5 pt-4 border-t border-slate-100 text-xs font-mono text-blue-700 font-semibold">
                  Zero Lock-In Guarantee
                </div>
              </div>

              {/* Principle 2 */}
              <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm mb-4">
                    02
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">SIMPLICITY FIRST</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Technology should remove daily work, not create more. A mobile-friendly system that sets up in minutes with no coding or server administration.
                  </p>
                </div>
                <div className="mt-5 pt-4 border-t border-slate-100 text-xs font-mono text-blue-700 font-semibold">
                  No Developers Required
                </div>
              </div>

              {/* Principle 3 */}
              <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm mb-4">
                    03
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">TRANSPARENCY FIRST</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    We clearly explain who does what. No confusing commission tiers, no hidden deductions, and no physical claims we cannot fulfill.
                  </p>
                </div>
                <div className="mt-5 pt-4 border-t border-slate-100 text-xs font-mono text-blue-700 font-semibold">
                  0% FeraSetu Sales Cut
                </div>
              </div>

              {/* Principle 4 */}
              <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm mb-4">
                    04
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">HUMAN-FIRST AI</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    FeraSetu AI assists the shop owner with catalog cleanup, translations, and low-stock alerts — without pretending to run or automate away the merchant.
                  </p>
                </div>
                <div className="mt-5 pt-4 border-t border-slate-100 text-xs font-mono text-blue-700 font-semibold">
                  Assistant, Not Replacement
                </div>
              </div>

              {/* Principle 5 */}
              <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all flex flex-col justify-between md:col-span-2 lg:col-span-2">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm mb-4">
                    05
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">CONNECTED WORKFLOW</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Storefront, cart checkout, payment settlement, fulfillment dispatch, invoice generation, and customer retention operate as one connected circuit. You don’t have to glue 5 different plugins together.
                  </p>
                </div>
                <div className="mt-5 pt-4 border-t border-slate-100 text-xs font-mono text-blue-700 font-semibold">
                  Unified Merchant Workspace
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* ================================================================
          SECTION 7 — PRODUCT REVEAL
          Headline: “This is what we built to make the belief real.”
        ================================================================ */}
        <section id="product-reveal" className="py-20 md:py-28 bg-white border-b border-slate-200">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wider mb-4">
                The Product Journey
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
                This is what we built to make the belief real.
              </h2>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Rather than an overwhelming pile of 30 isolated features, follow ONE coherent journey from product creation to the repeat customer order.
              </p>
            </div>

            <Suspense fallback={<SectionFallback />}>
              <ProductStoryWalkthrough />
            </Suspense>
          </div>
        </section>


        {/* ================================================================
          SECTION 8 — WHO DOES WHAT
          Headline: “Know who does what.”
          Operational transparency table.
        ================================================================ */}
        <section id="transparency" className="py-20 md:py-28 bg-slate-50 border-b border-slate-200">
          <div className="max-w-[1100px] mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200 text-slate-800 text-xs font-bold uppercase tracking-wider mb-4">
                Radical Transparency
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
                Know who does what.
              </h2>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Software companies often exaggerate what their tools physically do. We are explicit about our responsibilities, your control, and third-party integrations.
              </p>
            </div>

            <Suspense fallback={<SectionFallback />}>
              <TransparencyTable />
            </Suspense>
          </div>
        </section>


        {/* ================================================================
          SECTION 9 — ECONOMICS
          Headline: “We believe the value you create should stay with you.”
          Real pricing from codebase with 0% FeraSetu platform commission.
        ================================================================ */}
        <section id="pricing" className="py-20 md:py-28 bg-white border-b border-slate-200" aria-label="FeraSetu pricing plans">
          <div className="max-w-[1100px] mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wider mb-4">
                Platform Economics
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
                We believe the value you create should stay with you.
              </h2>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                FeraSetu charges a predictable subscription. We charge <strong>0% platform commission</strong> on your sales.
              </p>
            </div>

            {/* Commission Notice Card */}
            <div className="mb-12 p-6 rounded-2xl bg-blue-50/70 border border-blue-200 max-w-2xl mx-auto text-center">
              <h3 className="font-bold text-blue-950 text-base mb-1">
                Technically Precise Fee Structure
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                When you make a sale on FeraSetu, our platform takes ₹0 / $0. Third-party payment providers (such as Cashfree in India or Stripe internationally) charge their own standard gateway processing fee directly to settle funds into your bank account.
              </p>
            </div>

            {/* Real Plans Grid from Codebase */}
            <div className={`grid gap-6 mx-auto mb-12 items-stretch ${
              previewPlans.length === 2 ? 'md:grid-cols-2 max-w-3xl' : 'md:grid-cols-3 max-w-5xl'
            }`}>
              {previewPlans.map((plan) => {
                const isPopular = plan.id === 'business';

                return (
                  <div
                    key={plan.id}
                    className={`rounded-2xl p-7 flex flex-col relative transition-all duration-200 ${
                      isPopular
                        ? 'bg-white border-2 border-blue-600 shadow-xl shadow-blue-600/10'
                        : 'bg-white border border-slate-200 shadow-sm hover:border-slate-300'
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute top-0 right-6 transform -translate-y-1/2 bg-blue-600 text-white text-xs font-bold px-3.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                        Most Popular
                      </div>
                    )}

                    <div className="mb-6">
                      <h3 className="font-bold text-2xl text-slate-900 mb-1">{plan.displayName}</h3>
                      <p className="text-sm text-slate-600 min-h-[40px] leading-relaxed">
                        {plan.tagline}
                      </p>

                      <div className="mt-5 pb-5 border-b border-slate-100">
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-black text-slate-900">
                            {formatPrice(plan.price.monthly)}
                          </span>
                          <span className="text-sm text-slate-500 font-semibold">
                            {plan.price.monthly === 0 ? 'forever' : '/month'}
                          </span>
                        </div>
                        <div className="text-xs text-blue-700 font-semibold mt-1">
                          {market === 'IN' && plan.price.monthly === 0
                            ? 'Forever Free · No credit card needed'
                            : `${config.trialDays}-day free trial · Cancel anytime`}
                        </div>
                      </div>

                      <ul className="text-sm space-y-3 mt-5 text-slate-700">
                        {plan.features.filter(f => typeof f === 'string' || f.included).slice(0, 6).map((f, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <Check size={16} className={`shrink-0 mt-0.5 ${isPopular ? 'text-blue-600 font-bold' : 'text-slate-500'}`} />
                            <span className="leading-snug">{typeof f === 'string' ? f : f.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-auto pt-4">
                      <button
                        type="button"
                        onClick={() => handleStart(`plan_${plan.id}`)}
                        className={`w-full py-3 rounded-xl font-bold text-center text-sm transition-all cursor-pointer ${
                          isPopular
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        {market === 'IN' && plan.price.monthly === 0
                          ? 'Start Free Store'
                          : (market === 'IN' ? `Get ${plan.displayName}` : `Start ${config.trialDays}-Day Free Trial`)}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pricing Transparency & Terms */}
            <div className="text-center">
              <Link
                to={getLocalizedLink('/pricing')}
                className="text-blue-600 hover:text-blue-800 font-bold text-sm inline-flex items-center gap-1.5 transition-colors"
              >
                <span>Compare all plan features & limits in detail</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </section>


        {/* ================================================================
          FAQ SECTION (Objection handling & SEO preservation)
        ================================================================ */}
        <Suspense fallback={<SectionFallback />}>
          <FAQSection
            title="Questions merchants ask"
            subtitle="Honest answers with complete operational clarity."
          />
        </Suspense>


        {/* ================================================================
          SECTION 10 — FINAL CTA
          Headline: “You built the business. Now build its place on the internet.”
        ================================================================ */}
        <section className="py-20 md:py-28 bg-slate-900 text-white relative overflow-hidden">
          <div className="max-w-[900px] mx-auto px-6 text-center relative z-10">

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs sm:text-sm font-semibold mb-6">
              <span>Ready When You Are</span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-6">
              You built the business.<br />
              Now build its place on the internet.
            </h2>

            <p className="text-lg sm:text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed font-normal">
              FeraSetu is for businesses that want to grow online without forgetting who their business belongs to.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6 max-w-md mx-auto">
              <button
                type="button"
                onClick={() => handleStart('final_cta')}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 text-white font-bold text-base hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Bring your business online</span>
                <ArrowRight size={18} />
              </button>
            </div>

            {/* Secondary supporting line */}
            <p className="text-sm font-medium text-slate-400">
              14-day trial · No credit card to start
            </p>
          </div>
        </section>

      </PublicLayout>
    </>
  );
}
