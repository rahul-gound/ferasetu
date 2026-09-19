/**
 * LandingPage — Complete AIDA narrative with Purple Cow positioning.
 *
 * STRUCTURE:
 * 1. ATTENTION — Hero (Purple Cow: zero-commission direct store + AI)
 * 2. ATTENTION — Dashboard preview
 * 3. INTEREST — Problem recognition (3 real shopkeeper problems)
 * 4. INTEREST — How FeraSetu works (3-step mechanism)
 * 5. DESIRE — Features as outcomes (Feature → Does → Matters)
 * 6. DESIRE — FeraSetu AI differentiator (real AI examples)
 * 7. TRUST — Proof section (replaces fake testimonial)
 * 8. DESIRE/ACTION — Pricing preview
 * 9. ACTION — FAQ (real objections, factual answers)
 * 10. ACTION — Final CTA
 *
 * Purple Cow positioning:
 * "Your own online store. Your customers. Your profits."
 *
 * Ethical constraints:
 * - No fake testimonials
 * - No fake user counts
 * - No fake urgency
 * - No invented claims
 *
 * Psychology applied:
 * - AIDA framework (full page structure)
 * - Loss aversion (commission calculator)
 * - Endowment effect (shop name claim input)
 * - Foot-in-door (micro-commitment in hero)
 * - Risk reversal (data portability, cancel anytime)
 * - Authority + trust (payment logos, architecture guarantee)
 * - Color psychology (Blue=Trust, Orange=Action/Energy, White=Clarity)
 * - Contrast/anchoring (marketplace vs FeraSetu comparison)
 * - Chunking (steps in 3s, features in 3x2 grid)
 * - Specificity (real URLs, real product names, real numbers)
 */
import { useState, useEffect, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  MessageSquare,
  Zap,
  BarChart3,
  Store,
  Globe,
  Percent,
  Smartphone,
  ShieldCheck,
  Sparkles,
  Check,
  LayoutDashboard,
  Lock,
  Star,
} from 'lucide-react';
import PublicLayout from '../components/public/PublicLayout';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useMarket } from '../contexts/MarketContext';
import { getMarketPlans } from '../config/plans';
import MarketingReveal from '../components/marketing/MarketingReveal';
import SEO from '../components/SEO';

// Lazy-loaded marketing sections for instant FCP/LCP and progressive chunk loading
const HowItWorksSection = lazy(() => import('../components/marketing/HowItWorksSection'));
const ProofSection = lazy(() => import('../components/marketing/ProofSection'));
const FAQSection = lazy(() => import('../components/marketing/FAQSection'));
const FinalCTA = lazy(() => import('../components/marketing/FinalCTA'));
const AIExamplePrompts = lazy(() => import('../components/marketing/AIExamplePrompts'));
const TransformationFlow = lazy(() => import('../components/marketing/TransformationFlow'));
const ValueCurveSection = lazy(() => import('../components/marketing/ValueCurveSection'));
const HeroProductVisual = lazy(() => import('../components/marketing/HeroProductVisual'));
const CommissionCalculator = lazy(() => import('../components/marketing/CommissionCalculator'));

const SectionFallback = () => (
  <div className="w-full py-16 flex items-center justify-center">
    <div className="w-6 h-6 rounded-full border-2 border-blue-100 border-t-blue-500 animate-spin" />
  </div>
);

/** Outcome-oriented feature block: Feature → Does → Matters */
const FEATURE_OUTCOMES = [
  {
    icon: <Globe size={20} />,
    feature: 'Your own store URL',
    does: 'Your catalog lives at yourshop.ferasetu.com — permanently yours to share anywhere.',
    matters: 'Customers know exactly where to find you. No searching on a crowded marketplace or scrolling through chat.',
    iconBg: 'bg-blue-100 text-blue-600',
    accent: 'border-blue-200',
  },
  {
    icon: <Percent size={20} />,
    feature: 'Zero commissions',
    does: 'We charge a flat subscription. You keep 100% of every sale.',
    matters: 'Unlike marketplace platforms taking 15%–30% cuts on every order, 100% of your customer revenue stays yours.',
    iconBg: 'bg-orange-100 text-orange-600',
    accent: 'border-orange-200',
  },
  {
    icon: <Zap size={20} />,
    feature: 'Direct payments',
    does: 'Customers pay via UPI, cards, and direct channels — money goes straight to your account.',
    matters: 'No weeks of payout escrow. No merchant lock-in. Faster cash flow directly to your business.',
    iconBg: 'bg-blue-100 text-blue-600',
    accent: 'border-blue-200',
  },
  {
    icon: <MessageSquare size={20} />,
    feature: 'Streamlined ordering',
    does: 'Customers build a cart in your store and submit clean, formatted orders instantly.',
    matters: 'No chaotic back-and-forth messaging. Orders arrive structured and ready to fulfill.',
    iconBg: 'bg-orange-100 text-orange-600',
    accent: 'border-orange-200',
  },
  {
    icon: <Store size={20} />,
    feature: 'Product & inventory management',
    does: 'Add products with photos, prices, and stock limits. Track levels automatically.',
    matters: 'You\'ll know what\'s running low before you run out. No manual spreadsheets.',
    iconBg: 'bg-blue-100 text-blue-600',
    accent: 'border-blue-200',
  },
  {
    icon: <BarChart3 size={20} />,
    feature: 'Sales analytics',
    does: 'See your revenue, top products, and order trends in one clear dashboard.',
    matters: 'Know what\'s actually making you money instead of guessing.',
    iconBg: 'bg-orange-100 text-orange-600',
    accent: 'border-orange-200',
  },
];

export default function LandingPage() {
  const { getLocalizedLink, translate: t } = useLanguage();
  const { user, register } = useAuth();
  const { market, config } = useMarket();
  const navigate = useNavigate();
  const previewPlans = getMarketPlans(market);

  const [claimShopName, setClaimShopName] = useState('');

  useEffect(() => {
    // Zoho Zia Agents Chat Integration
    const scriptId = 'zoho-agents-chat-sdk';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://agents.zoho.in/resources/addon-chat/assets/js/agents-chat-sdk.js';
      script.async = true;
      document.body.appendChild(script);
    }

    const containerId = 'zoho-agents-chatkit-wrap';
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;

      const orgId = (import.meta as any).env?.VITE_ZOHO_CHAT_ORG_ID || '60088469696';
      const entityId = (import.meta as any).env?.VITE_ZOHO_CHAT_ENTITY_ID || '12456000000002143';
      const chatKey = (import.meta as any).env?.VITE_ZOHO_CHAT_KEY || '';

      const ziaConfig: Record<string, string> = { orgId, entityId };
      if (chatKey) {
        ziaConfig.chatKey = chatKey;
        ziaConfig.chatkey = chatKey;
      }

      const chatkit = document.createElement('agents-chatkit');
      chatkit.setAttribute('ziaAgents', JSON.stringify(ziaConfig));
      if (chatKey) {
        chatkit.setAttribute('chatkey', chatKey);
        chatkit.setAttribute('chatKey', chatKey);
      }

      container.appendChild(chatkit);
      document.body.appendChild(container);
    }

    return () => {
      const el = document.getElementById(containerId);
      if (el) el.remove();
    };
  }, []);

  const slugifiedClaim = claimShopName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || (market === 'IN' ? 'sharmakirana' : 'apexroasters');

  const handleClaimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (claimShopName.trim()) {
      try {
        localStorage.setItem('ferasetu_claimed_shop_name', claimShopName.trim());
      } catch {}
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
        title={t('seo.landing.title') || "FeraSetu — Zero-Bloat Online Store Builder with Built-in AI"}
        description={t('seo.landing.desc') || "Launch your independent online store in minutes. 0% commissions, no plugin bloat, and proactive AI assistance built-in."}
        noindex={false}
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'FeraSetu',
          applicationCategory: 'BusinessApplication',
          description:
            'Online store builder. Zero commissions, direct ordering, fast payments, and FeraSetu AI assistant.',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
            description: 'Free forever for up to 25 products',
          },
          operatingSystem: 'Web, iOS, Android',
          url: 'https://ferasetu.com',
        }}
      />

      <PublicLayout>

        {/* ================================================================
          SECTION 1 — HERO (ATTENTION)
          Psychology: Endowment effect (shop name claim), Zero-risk anchor,
          Foot-in-door (type name = micro commitment)
        ================================================================ */}
        <section className="relative pt-12 pb-24 md:pt-18 md:pb-28 overflow-hidden">
          {/* Warm layered gradient — white + blue + faint orange warmth */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-orange-50/40 pointer-events-none" />
          {/* Subtle decorative circle */}
          <div className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-blue-100/30 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-[320px] h-[320px] rounded-full bg-orange-100/25 blur-3xl pointer-events-none" />

          <div className="max-w-[1000px] mx-auto px-6 relative z-10 text-center">

            {/* Badge */}
            <div className="hero-card-enter inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-600/10 border border-blue-200 text-blue-700 text-xs sm:text-sm font-bold tracking-wide mb-6 uppercase shadow-sm">
              <Store size={14} className="text-blue-600" />
              <span>{t('hero.badge') || 'For Independent Shopkeepers & Small Businesses'}</span>
            </div>

            {/* Main Headline — Psychology: Loss aversion + specificity */}
            <h1 className="hero-card-enter hero-card-delay-1 text-4xl sm:text-5xl md:text-6xl font-black text-blue-950 tracking-tight leading-[1.08] mb-4">
              Your own online store.{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent">
                  0% commission.
                </span>
              </span>
            </h1>

            {/* Subheadline — conversational, human */}
            <p className="hero-card-enter hero-card-delay-2 text-lg sm:text-xl text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              Stop losing 15%–30% of your hard-earned margins to marketplaces. Launch your independent online store with your custom link, instant UPI payments, and FeraSetu AI — all built-in, free to start.
            </p>

            {/* Interactive Hero Storefront Reservation Sandbox */}
            {/* Psychology: Endowment effect — "your" shop URL makes it feel already theirs */}
            <form onSubmit={handleClaimSubmit} className="hero-card-enter hero-card-delay-3 max-w-xl mx-auto mb-6">
              <div className="flex flex-col sm:flex-row items-center gap-2 p-2 bg-white rounded-2xl sm:rounded-full border-2 border-blue-200 shadow-xl shadow-blue-500/10 focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-100 transition-all">
                <div className="flex items-center gap-2 px-4 py-2 w-full sm:w-auto flex-1 min-w-0">
                  <Store size={20} className="text-orange-500 shrink-0" />
                  <input
                    type="text"
                    value={claimShopName}
                    onChange={(e) => setClaimShopName(e.target.value)}
                    placeholder={market === 'IN' ? 'Enter shop name (e.g. Sharma Kirana)' : 'Enter business name (e.g. Apex Roasters)'}
                    className="w-full bg-transparent text-sm sm:text-base font-semibold text-blue-950 placeholder-slate-400 focus:outline-none"
                    aria-label="Claim your store name"
                  />
                  <span className="text-xs font-mono font-bold text-slate-400 shrink-0 hidden sm:inline">
                    .ferasetu.com
                  </span>
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl sm:rounded-full bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-lg shadow-orange-500/25"
                >
                  <span>{market === 'IN' ? (t('hero.cta') || 'Claim Free Store (₹0)') : 'Claim 14-Day Free Trial'}</span>
                  <ArrowRight size={16} />
                </button>
              </div>

              {/* Reactive Live URL Slug Indicator — Psychology: Makes it feel real/owned */}
              <div className="text-xs text-slate-500 font-medium mt-3 flex items-center justify-center gap-1.5 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span>Your store link:</span>
                <strong className="text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                  {slugifiedClaim}.ferasetu.com
                </strong>
                {claimShopName.trim() && (
                  <span className="text-orange-500 font-semibold ml-1">← reserving for you</span>
                )}
              </div>
            </form>

            {/* Secondary actions */}
            <div className="hero-card-enter hero-card-delay-3 flex items-center justify-center gap-4 mb-8">
              {user ? (
                <Link
                  to="/dashboard"
                  className="px-6 py-2.5 rounded-full bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-600/20"
                >
                  <LayoutDashboard size={16} />
                  <span>Go to Dashboard</span>
                </Link>
              ) : (
                <a
                  href="#how-it-works"
                  className="px-6 py-2.5 rounded-full bg-white border border-blue-200 text-blue-700 font-bold text-sm hover:bg-blue-50 transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <span>See how it works</span>
                  <ArrowRight size={14} />
                </a>
              )}
            </div>

            {/* Trust badges — Psychology: Zero-risk anchoring, authority */}
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs sm:text-sm font-semibold text-slate-600">
              {market === 'IN' ? (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 size={15} className="text-blue-500 flex-shrink-0" />
                    {t('hero.zeroStart') || '₹0 to start'}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 size={15} className="text-blue-500 flex-shrink-0" />
                    {t('hero.noCreditCard') || 'No credit card required'}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 size={15} className="text-orange-500 flex-shrink-0" />
                    0% commission on sales
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck size={15} className="text-blue-500 flex-shrink-0" />
                    Instant UPI & WhatsApp
                  </span>
                </>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 size={15} className="text-blue-500 flex-shrink-0" />
                    14-Day Free Trial
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 size={15} className="text-blue-500 flex-shrink-0" />
                    No credit card to start
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 size={15} className="text-orange-500 flex-shrink-0" />
                    0% transaction fees
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck size={15} className="text-blue-500 flex-shrink-0" />
                    Cancel anytime • No surprise charges
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Transformation Flow */}
          <div className='mt-10 max-w-4xl mx-auto px-6'>
            <Suspense fallback={<SectionFallback />}>
              <TransformationFlow />
            </Suspense>
          </div>

          {/* Hero Dashboard Visual */}
          <div className='hero-card-enter hero-card-delay-3 mx-auto mt-14 max-w-[1100px] px-6'>
            <Suspense fallback={<SectionFallback />}>
              <HeroProductVisual
                shopName={claimShopName}
                storeSlug={slugifiedClaim}
                market={market}
                currencySymbol={config.symbol}
              />
            </Suspense>
          </div>
        </section>

        {/* ================================================================
          SECTION 2 — PROBLEM RECOGNITION (INTEREST)
          Psychology: Problem agitation — amplify pain before offering solution.
          Three concrete, honest problems Indian shopkeepers actually face.
        ================================================================ */}
        <section className="py-20 md:py-24 bg-white border-t border-slate-100">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold uppercase tracking-wider mb-4">
                🤔 Sound familiar?
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-blue-950 tracking-tight mb-4">
                {t('problem.title') || 'Running a shop is hard enough without fighting your own tools.'}
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                {t('problem.subtitle') || 'Most shopkeepers lose lakhs every year to messy orders, massive commissions, and complicated digital tools. It doesn\'t have to be this way.'}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-7">
              {[
                {
                  icon: <MessageSquare size={22} className="text-orange-500" />,
                  iconBg: 'bg-orange-50',
                  accent: 'border-l-4 border-l-orange-400',
                  label: 'The problem',
                  title: t('problem.whatsapp.title') || 'Order chaos on WhatsApp',
                  desc: t('problem.whatsapp.desc') || 'Customers order via personal WhatsApp. You chase 50 threads trying to remember who paid, who needs delivery, and what they ordered.',
                },
                {
                  icon: <Percent size={22} className="text-red-500" />,
                  iconBg: 'bg-red-50',
                  accent: 'border-l-4 border-l-red-400',
                  label: 'The problem',
                  title: t('problem.marketplace.title') || 'Losing 15–30% to marketplaces',
                  desc: t('problem.marketplace.desc') || 'Zomato, Swiggy, Amazon — every order you get through them costs you a chunk of your margin. Your shop, their commission.',
                },
                {
                  icon: <Smartphone size={22} className="text-blue-500" />,
                  iconBg: 'bg-blue-50',
                  accent: 'border-l-4 border-l-blue-400',
                  label: 'The problem',
                  title: t('problem.digital.title') || 'Going online feels too complicated',
                  desc: t('problem.digital.desc') || 'Building a website, setting up payment gateways, managing inventory — each part feels like a different project requiring a developer.',
                },
              ].map((problem, i) => (
                <div
                  key={i}
                  className={`bg-white p-7 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 ${problem.accent}`}
                >
                  <div className={`w-11 h-11 ${problem.iconBg} rounded-xl flex items-center justify-center mb-5`}>
                    {problem.icon}
                  </div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {problem.label}
                  </div>
                  <h3 className="text-xl font-bold text-blue-950 mb-3">{problem.title}</h3>
                  <p className="text-slate-600 leading-relaxed text-sm">{problem.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <MarketingReveal>
          <Suspense fallback={<SectionFallback />}>
            <ValueCurveSection />
          </Suspense>
        </MarketingReveal>

        {/* ================================================================
          SECTION 3 — HOW FERASETU WORKS (INTEREST → DESIRE)
          3-step mechanism: Add → Share → Receive
        ================================================================ */}
        <MarketingReveal>
          <Suspense fallback={<SectionFallback />}>
            <HowItWorksSection showCTA={false} />
          </Suspense>
        </MarketingReveal>

        {/* ================================================================
          SECTION 4 — SOLUTION DEMO (DESIRE)
          Psychology: Social proof via real store mockup. Authority signals.
        ================================================================ */}
        <section className="py-20 md:py-24 bg-gradient-to-b from-blue-50/60 to-white border-t border-blue-100/60">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-14 items-center">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold uppercase tracking-wider mb-4">
                  ✦ The FeraSetu Difference
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold text-blue-950 mb-5 tracking-tight leading-[1.15]">
                  {t('solution.title') || 'Your shop. Your customers. Your profits.'}
                </h2>
                <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                  {t('solution.subtitle') || 'FeraSetu gives you everything to sell online professionally — without paying commissions, hiring developers, or dealing with marketplace rules.'}
                </p>

                <div className="space-y-5">
                  {[
                    { step: '1', title: t('solution.step1.title') || 'Add your products', desc: t('solution.step1.desc') || 'Upload your catalog with photos, prices, and stock limits in minutes, right from your phone.', time: '~ 5 min setup' },
                    { step: '2', title: t('solution.step2.title') || 'Share your link', desc: t('solution.step2.desc') || 'Post your custom store link on WhatsApp, Instagram, or share via QR code at your shop counter.', time: 'Share instantly' },
                    { step: '3', title: t('solution.step3.title') || 'Receive orders & direct UPI', desc: t('solution.step3.desc') || 'Customers buy directly. Money goes straight to your UPI account. You own 100% of the customer relationship.', time: 'Earn daily' },
                  ].map((s, idx) => (
                    <div key={s.step} className="flex gap-4 items-start group">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black flex-shrink-0 text-sm shadow-md transition-all ${idx === 2 ? 'bg-orange-500 shadow-orange-400/30 text-white' : 'bg-blue-600 shadow-blue-500/20 text-white'}`}>
                        {s.step}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-blue-950 text-base mb-0.5">{s.title}</h4>
                          <span className="text-[10px] font-bold text-orange-500 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full hidden sm:inline">{s.time}</span>
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live store mockup — Psychology: Authority via product demo */}
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/6 rounded-3xl transform rotate-1 scale-105" />
                <div className="bg-blue-950 text-white p-8 md:p-10 rounded-2xl border border-blue-900 shadow-2xl relative">
                  <div className="flex items-center justify-between mb-7 pb-5 border-b border-blue-900/60">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center text-white">
                        <Store size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">Sharma Kirana & General Store</div>
                        <div className="text-xs text-blue-400 font-mono">sharmakirana.ferasetu.com</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold">
                      ● Live
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-blue-900/60 p-4 rounded-xl border border-blue-800/60 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center">
                          <MessageSquare className="text-green-400 flex-shrink-0" size={16} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">New Order #1042</div>
                          <div className="text-xs text-blue-300">
                            {market === 'IN' ? 'Ramesh K. · 4 items · Paid via UPI' : 'Alex M. · 3 items · Paid direct'}
                          </div>
                        </div>
                      </div>
                      <span className="text-green-400 font-bold text-sm">
                        {market === 'IN' ? '₹1,240' : `${config.symbol}84`}
                      </span>
                    </div>

                    <div className="bg-blue-900/60 p-4 rounded-xl border border-blue-800/60 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                          <Sparkles className="text-blue-300 flex-shrink-0" size={16} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">FeraSetu AI Alert</div>
                          <div className="text-xs text-blue-300">
                            {market === 'IN' ? 'Fortune Mustard Oil — 2 units left' : 'Artisan Roast Blend — 3 units left'}
                          </div>
                        </div>
                      </div>
                      <span className="text-blue-300 text-xs font-semibold px-2 py-1 bg-blue-500/15 rounded-md">Restock</span>
                    </div>

                    <div className="bg-orange-500/10 p-4 rounded-xl border border-orange-400/20 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-400/15 flex items-center justify-center">
                          <Percent className="text-orange-400 flex-shrink-0" size={16} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">Commission Saved</div>
                          <div className="text-xs text-blue-300">100% credited to your bank</div>
                        </div>
                      </div>
                      <span className="text-orange-400 font-bold text-sm">{config.symbol}0 Cut</span>
                    </div>
                  </div>

                  {/* Trust line at bottom of mockup */}
                  <div className="mt-5 pt-4 border-t border-blue-900/60 flex items-center gap-2 text-xs text-blue-400">
                    <Lock size={12} />
                    <span>Payments go directly to your bank — FeraSetu never holds your money</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
          COMMISSION SAVINGS COMPARISON (Interactive Loss Calculator)
          Psychology: Loss aversion — show exact rupees being "stolen"
        ================================================================ */}
        <MarketingReveal>
          <Suspense fallback={<SectionFallback />}>
            <CommissionCalculator />
          </Suspense>
        </MarketingReveal>

        {/* ================================================================
          SECTION 5 — FEATURES AS OUTCOMES (DESIRE)
          Feature → What it does → Why it matters
        ================================================================ */}
        <section className="py-20 md:py-24 bg-white" id="features" aria-label="FeraSetu features">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4">
                🛒 Everything You Need
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-blue-950 mb-4 tracking-tight">
                {t('features.title') || 'Built for how shopkeepers actually work'}
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                {t('features.subtitle') || 'Every feature answers a real problem. No bloat, no complexity — just what your shop needs.'}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURE_OUTCOMES.map((item, i) => (
                <div
                  key={i}
                  className={`bg-white border ${item.accent} rounded-2xl p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${item.iconBg}`}>
                    {item.icon}
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">{item.feature}</div>
                  <h3 className="font-bold text-blue-950 text-base mb-2 leading-snug">{item.does}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{item.matters}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
          SECTION 6 — FERASETU AI (DESIRE — Purple Cow differentiator)
          Real AI examples with shop-specific context.
        ================================================================ */}
        <MarketingReveal>
          <Suspense fallback={<SectionFallback />}>
            <AIExamplePrompts showCTA ctaHref="/register" ctaText="Try FeraSetu AI Free" />
          </Suspense>
        </MarketingReveal>

        {/* ================================================================
          SECTION 7 — PROOF (TRUST — No fake testimonials)
          Psychology: Social proof, authority, risk reversal
        ================================================================ */}
        <MarketingReveal>
          <Suspense fallback={<SectionFallback />}>
            <ProofSection
              title="What you get from day one"
              subtitle="Every feature below works on the Free plan — no credit card, no trial period, no hidden costs."
            />
          </Suspense>
        </MarketingReveal>

        {/* ================================================================
          SECTION 8 — PRICING PREVIEW (DESIRE → ACTION)
          Psychology: Anchoring (popular plan), contrast, transparency
        ================================================================ */}
        <section className="py-20 md:py-24 bg-gradient-to-b from-blue-50/40 to-white border-t border-blue-100/60" id="pricing" aria-label="FeraSetu pricing plans">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="text-center mb-14 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4">
                💰 Transparent Pricing
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight text-blue-950">
                {t('pricingPreview.title') || 'Simple, honest pricing'}
              </h2>
              <p className="text-slate-600 text-lg">
                {market === 'IN'
                  ? (t('pricingPreview.subtitle') || 'Start for ₹0. Upgrade when your business needs more. No hidden charges — ever.')
                  : 'Start your 14-day free trial. Choose a plan to continue after your trial. No surprise charges — ever.'}
              </p>
            </div>

            <div className={`grid gap-6 mx-auto mb-10 items-stretch ${
              previewPlans.length === 2 ? 'md:grid-cols-2 max-w-3xl' : 'md:grid-cols-3 max-w-5xl'
            }`}>
              {previewPlans.map((plan) => {
                const isPopular = plan.id === 'business';
                const isFree = plan.price.monthly === 0;

                return (
                  <div
                    key={plan.id}
                    className={`rounded-2xl p-7 flex flex-col relative transition-all duration-200 ${
                      isPopular
                        ? 'bg-white border-2 border-orange-500 transform md:-translate-y-3 shadow-2xl shadow-orange-500/10 text-blue-950'
                        : 'bg-white border border-slate-200 shadow-md text-blue-950 hover:shadow-lg'
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute top-0 right-6 transform -translate-y-1/2 bg-orange-500 text-white text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider shadow-md">
                        {market === 'IN' ? (t('pricingPreview.recommended') || 'MOST POPULAR') : '14-DAY TRIAL • MOST POPULAR'}
                      </div>
                    )}
                    {!isPopular && !isFree && market !== 'IN' && (
                      <div className="absolute top-0 right-6 transform -translate-y-1/2 bg-blue-50 text-blue-700 text-xs font-bold px-3 py-0.5 rounded-full uppercase tracking-wider border border-blue-200">
                        14-DAY FREE TRIAL
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-2xl text-blue-950 mb-1">{plan.displayName}</h3>
                      <p className="text-sm mb-5 text-slate-600">
                        {plan.tagline}
                      </p>
                      <div className="mb-6">
                        <span className="text-4xl font-black text-blue-950">
                          {config.symbol}{plan.price.monthly}
                        </span>
                        <span className="text-sm ml-1.5 text-slate-500 font-semibold">
                          /month
                        </span>
                        {market !== 'IN' && !isFree && (
                          <div className={`text-xs mt-1 font-semibold ${isPopular ? 'text-orange-600' : 'text-slate-500'}`}>
                            Free for 14 days, then {config.symbol}{plan.price.monthly}/mo
                          </div>
                        )}
                      </div>
                      <ul className="text-sm space-y-3 mb-7 text-slate-700">
                        {plan.features.filter(f => typeof f === 'string' || f.included).slice(0, 6).map((f, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <Check size={15} className={`flex-shrink-0 mt-0.5 ${isPopular ? 'text-orange-500' : 'text-blue-500'}`} />
                            <span>{typeof f === 'string' ? f : f.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {user ? (
                      <Link
                        to={isFree ? "/dashboard" : "/upgrade"}
                        className={`mt-auto w-full py-3.5 rounded-xl font-bold text-center transition-colors block text-sm ${
                          isPopular
                            ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {isFree ? 'Go to Dashboard' : `Upgrade to ${plan.displayName}`}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => register()}
                        className={`mt-auto w-full py-3.5 rounded-xl font-bold text-center transition-colors block text-sm cursor-pointer ${
                          isPopular
                            ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {isFree
                          ? 'Start Free (₹0)'
                          : (market === 'IN' ? `Start ${plan.displayName} Plan` : `Start 14-Day Free Trial`)}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Trust and Policy notice */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500 font-medium text-center mb-6">
              <span className="inline-flex items-center gap-1.5 text-slate-700 font-semibold">
                <ShieldCheck size={14} className="text-blue-500" />
                Secure 256-bit checkout via {market === 'IN' ? 'Cashfree' : 'Stripe'}
              </span>
              <span>•</span>
              <span>0% sales commission</span>
              <span>•</span>
              <span>Cancel anytime to stop future renewals</span>
              <span>•</span>
              <span className="text-orange-700 font-semibold">Strictly non-refundable — no prorated refunds or money-back guarantee</span>
            </div>

            <div className="text-center">
              <Link
                to={getLocalizedLink('/pricing')}
                className="text-blue-600 hover:text-blue-700 font-bold transition-colors inline-flex items-center gap-2 text-sm group"
              >
                <span>{t('pricingPreview.viewAll') || 'See full feature comparison'}</span>
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </section>

        {/* ================================================================
          SECTION 9 — FAQ (ACTION — objection handling)
          Psychology: Objection handling, risk reversal, trust building
        ================================================================ */}
        <MarketingReveal>
          <Suspense fallback={<SectionFallback />}>
            <FAQSection
              title="Questions merchants ask"
              subtitle="Honest answers — no fluff."
            />
          </Suspense>
        </MarketingReveal>

        {/* ================================================================
          SECTION 10 — FINAL CTA (ACTION)
          Psychology: Summary of benefits, zero-risk message, urgency (honest)
        ================================================================ */}
        <MarketingReveal>
          <Suspense fallback={<SectionFallback />}>
            <FinalCTA
              title={market === 'IN' ? "Your shop is already real.\nNow give it an online front door." : "Your business is already real.\nNow give it an online front door."}
              subtitle={market === 'IN'
                ? "Start free today. Your store URL is ready in minutes — no technical setup required."
                : "Start your 14-day free trial today. Your store URL is ready in minutes — no technical setup required."}
              primaryText={market === 'IN' ? "Start Free Store (₹0)" : "Start 14-Day Free Trial"}
              primaryHref="/register"
              secondaryText="See pricing"
              secondaryHref="/pricing"
              trustItems={market === 'IN'
                ? ['₹0 to start', 'No credit card', '0% commission', 'Setup in minutes', 'Secure cloud hosted']
                : ['14-day free trial', 'No credit card to start', '0% transaction fees', 'Setup in minutes', 'Cancel anytime']}
            />
          </Suspense>
        </MarketingReveal>
      </PublicLayout>
    </>
  );
}
