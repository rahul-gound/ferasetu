/**
 * LandingPage — Complete AIDA narrative with Purple Cow positioning.
 *
 * STRUCTURE:
 * 1. ATTENTION — Hero (Purple Cow: zero-commission direct store + AI)
 * 2. ATTENTION — Dashboard preview
 * 3. INTEREST — Problem recognition (3 real shopkeeper problems)
 * 4. INTEREST — How FeraSetu works (3-step mechanism)
 * 5. DESIRE — Features as outcomes (Feature → Does → Matters)
 * 6. DESIRE — Fera AI differentiator (real AI examples)
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
 */
import { Link } from 'react-router-dom';
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
} from 'lucide-react';
import PublicLayout from '../components/public/PublicLayout';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import HowItWorksSection from '../components/marketing/HowItWorksSection';
import ProofSection from '../components/marketing/ProofSection';
import FAQSection from '../components/marketing/FAQSection';
import FinalCTA from '../components/marketing/FinalCTA';
import AIExamplePrompts from '../components/marketing/AIExamplePrompts';
import TransformationFlow from '../components/marketing/TransformationFlow';
import ValueCurveSection from '../components/marketing/ValueCurveSection';
import HeroProductVisual from '../components/marketing/HeroProductVisual';
import MarketingReveal from '../components/marketing/MarketingReveal';
import SEO from '../components/SEO';

/** Outcome-oriented feature block: Feature → Does → Matters */
const FEATURE_OUTCOMES = [
  {
    icon: <Globe size={20} />,
    feature: 'Your own store URL',
    does: 'Your catalog lives at yourshop.ferasetu.com — permanently yours to share anywhere.',
    matters: 'Customers know exactly where to find you. No searching on a marketplace or scrolling through WhatsApp.',
    iconBg: 'bg-blue-50 text-blue-600',
  },
  {
    icon: <Percent size={20} />,
    feature: 'Zero commissions',
    does: 'We charge a flat monthly fee. You keep 100% of every sale.',
    matters: 'On ₹1 lakh monthly sales, that\'s ₹15,000–₹30,000 in commission you don\'t pay to anyone.',
    iconBg: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: <Zap size={20} />,
    feature: 'Direct UPI payments',
    does: 'Customers pay via Google Pay, PhonePe, Paytm — money goes directly to your account.',
    matters: 'No payment gateway delays. No merchant account setup. Money in your bank the same day.',
    iconBg: 'bg-amber-50 text-amber-600',
  },
  {
    icon: <MessageSquare size={20} />,
    feature: 'WhatsApp ordering',
    does: 'Customers build a cart in your store and send the order via WhatsApp.',
    matters: 'No more chaos in your personal chat. Orders come in formatted and ready to fulfill.',
    iconBg: 'bg-green-50 text-green-600',
  },
  {
    icon: <Store size={20} />,
    feature: 'Product & inventory management',
    does: 'Add products with photos, prices, and stock limits. Track levels automatically.',
    matters: 'You\'ll know what\'s running low before you run out. No manual spreadsheets.',
    iconBg: 'bg-purple-50 text-purple-600',
  },
  {
    icon: <BarChart3 size={20} />,
    feature: 'Sales analytics',
    does: 'See your revenue, top products, and order trends in one clear dashboard.',
    matters: 'Know what\'s actually making you money instead of guessing.',
    iconBg: 'bg-orange-50 text-orange-600',
  },
];

export default function LandingPage() {
  const { getLocalizedLink, translate: t } = useLanguage();
  const { user, register } = useAuth();

  return (
    <>
      <SEO
        title="FeraSetu — Your Own Online Store for Indian Shopkeepers"
        description="Turn your shop into an online business. Get your own store link, accept WhatsApp orders, receive UPI payments, and use AI to manage your shop — starting at ₹0."
        noindex={false}
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'FeraSetu',
          applicationCategory: 'BusinessApplication',
          description:
            'Online store builder for Indian shopkeepers. Zero commissions, WhatsApp ordering, UPI payments, and FeraSetu AI assistant.',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'INR',
            description: 'Free forever for up to 25 products',
          },
          operatingSystem: 'Web, iOS, Android',
          url: 'https://ferasetu.com',
        }}
      />

      <PublicLayout>
        {/* ================================================================
          SECTION 1 — HERO (ATTENTION)
          Purple Cow: "Your own store. Your customers. Your profits."
          First viewport answers: What? Who for? Why care? What's different?
        ================================================================ */}
        <section className="relative pt-20 pb-24 md:pt-24 md:pb-28 overflow-hidden bg-gradient-to-b from-blue-50/60 via-white to-white">
          <div className="max-w-[1000px] mx-auto px-6 relative z-10 text-center">

            {/* Purple Cow Badge */}
            <div className="hero-card-enter inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100/70 border border-blue-200 text-blue-800 text-xs sm:text-sm font-bold tracking-wide mb-6 uppercase shadow-sm">
              <Store size={14} className="text-blue-600" />
              <span>{t('hero.badge') || 'For Indian Shopkeepers & Local Retailers'}</span>
            </div>

            {/* Main Headline — Purple Cow positioning */}
            <h1 className="hero-card-enter hero-card-delay-1 text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] mb-4">
              Apni dukaan ko online le jao.{' '}
              <span className="text-blue-600">
                Orders badhao, business sambhalo
              </span>{' '}
              — ek hi jagah se.
            </h1>

            {/* Translation */}
            <p className="text-sm sm:text-base font-semibold text-slate-400 mb-5 max-w-2xl mx-auto">
              (Build your online store, accept more orders, and manage your business from one place.)
            </p>

            {/* Purple Cow differentiator line */}
            <p className="hero-card-enter hero-card-delay-2 text-lg sm:text-xl text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              {t('hero.subtitle') || 'No technical knowledge needed. Your own store link. WhatsApp orders. Direct UPI payments. FeraSetu AI handles the rest.'}
            </p>

            {/* Hero CTAs */}
            <div className="hero-card-enter hero-card-delay-3 flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              {user && (
                <Link
                  to="/dashboard"
                  className="w-full sm:w-auto px-8 py-4 rounded-full bg-blue-600 text-white font-bold text-lg shadow-xl shadow-blue-600/25 hover:bg-blue-700 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer ring-4 ring-blue-100"
                >
                  <LayoutDashboard size={20} />
                  <span>Dashboard</span>
                  <ArrowRight size={18} />
                </Link>
              )}
              <button
                type="button"
                onClick={() => register()}
                className={`w-full sm:w-auto px-8 py-4 rounded-full font-bold text-lg transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer ${
                  user
                    ? 'bg-slate-900 text-white shadow-lg hover:bg-slate-800'
                    : 'bg-blue-600 text-white shadow-xl shadow-blue-600/25 hover:bg-blue-700'
                }`}
              >
                <span>{t('hero.cta') || 'Start Free (₹0)'}</span>
                <ArrowRight size={18} />
              </button>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-white border border-slate-300 text-slate-700 font-bold text-lg hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm flex items-center justify-center gap-2"
              >
                See how it works
              </a>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs sm:text-sm font-semibold text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-blue-600 flex-shrink-0" />
                {t('hero.zeroStart') || '₹0 to start'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-blue-600 flex-shrink-0" />
                {t('hero.noCreditCard') || 'No credit card required'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-blue-600 flex-shrink-0" />
                0% commission on sales
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-emerald-600 flex-shrink-0" />
                {t('hero.dataInIndia') || '100% Data in India'}
              </span>
            </div>
          </div>

          <div className='mt-10 max-w-4xl mx-auto'>
            <TransformationFlow />
          </div>

          <div className='hero-card-enter hero-card-delay-3 mx-auto mt-14 max-w-[1100px] px-6'>
            <HeroProductVisual />
          </div>
        </section>

        {/* ================================================================
          SECTION 2 — PROBLEM RECOGNITION (INTEREST)
          Three concrete, honest problems Indian shopkeepers actually face.
        ================================================================ */}
        <section className="py-20 md:py-24 bg-slate-50 border-t border-slate-200/60">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-100 text-red-700 text-xs font-bold uppercase tracking-wider mb-4">
                Sound familiar?
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
                {t('problem.title') || 'Running a business is hard enough without fighting your tools.'}
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                {t('problem.subtitle') || 'Stop losing orders in messy chat threads, wasting time on manual bookkeeping, or paying massive commissions.'}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-7">
              {[
                {
                  icon: <MessageSquare size={22} className="text-red-500" />,
                  iconBg: 'bg-red-50',
                  label: 'The problem',
                  title: t('problem.whatsapp.title') || 'Order chaos on WhatsApp',
                  desc: t('problem.whatsapp.desc') || 'Customers order via personal WhatsApp. You chase 50 threads trying to remember who paid, who needs delivery, and what they ordered.',
                },
                {
                  icon: <Percent size={22} className="text-amber-600" />,
                  iconBg: 'bg-amber-50',
                  label: 'The problem',
                  title: t('problem.marketplace.title') || 'Losing 15–30% to marketplaces',
                  desc: t('problem.marketplace.desc') || 'Zomato, Swiggy, Amazon — every order you get through them costs you a chunk of your margin. Your shop, their commission.',
                },
                {
                  icon: <Smartphone size={22} className="text-blue-500" />,
                  iconBg: 'bg-blue-50',
                  label: 'The problem',
                  title: t('problem.digital.title') || 'Getting online feels complicated',
                  desc: t('problem.digital.desc') || 'Building a website, setting up payment gateways, managing inventory — each part feels like a different project.',
                },
              ].map((problem, i) => (
                <div
                  key={i}
                  className="bg-white p-7 rounded-2xl border border-slate-200/80 shadow-sm"
                >
                  <div className={`w-11 h-11 ${problem.iconBg} rounded-xl flex items-center justify-center mb-5`}>
                    {problem.icon}
                  </div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {problem.label}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{problem.title}</h3>
                  <p className="text-slate-600 leading-relaxed text-sm">{problem.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <MarketingReveal>
          <ValueCurveSection />
        </MarketingReveal>

        {/* ================================================================
          SECTION 3 — HOW FERASETU WORKS (INTEREST → DESIRE)
          3-step mechanism: Add → Share → Receive
        ================================================================ */}
        <MarketingReveal>
          <HowItWorksSection showCTA={false} />
        </MarketingReveal>

        {/* ================================================================
          SECTION 4 — SOLUTION DEMO (DESIRE)
          Side-by-side: The mechanism in action.
        ================================================================ */}
        <section className="py-20 md:py-24 bg-slate-50 border-t border-slate-200/60">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-14 items-center">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4">
                  The FeraSetu Difference
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-5 tracking-tight leading-[1.15]">
                  {t('solution.title') || 'Your shop. Your customers. Your profits.'}
                </h2>
                <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                  {t('solution.subtitle') || 'FeraSetu gives you everything to sell online professionally — without paying commissions, hiring developers, or dealing with marketplace rules.'}
                </p>

                <div className="space-y-5">
                  {[
                    { step: '1', title: t('solution.step1.title') || 'Add your products', desc: t('solution.step1.desc') || 'Upload your catalog with photos, prices, and stock limits in minutes, right from your phone.' },
                    { step: '2', title: t('solution.step2.title') || 'Share your link', desc: t('solution.step2.desc') || 'Post your custom store link on WhatsApp, Instagram, or share via QR code at your shop counter.' },
                    { step: '3', title: t('solution.step3.title') || 'Receive orders & direct UPI', desc: t('solution.step3.desc') || 'Customers buy directly. Money goes straight to your UPI account. You own 100% of the customer relationship.' },
                  ].map((s) => (
                    <div key={s.step} className="flex gap-4 items-start">
                      <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-black flex-shrink-0 text-sm shadow-md shadow-blue-500/20">
                        {s.step}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-base mb-1">{s.title}</h4>
                        <p className="text-slate-600 text-sm leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live store mockup */}
              <div className="relative">
                <div className="absolute inset-0 bg-blue-600/8 rounded-3xl transform rotate-1 scale-105" />
                <div className="bg-slate-900 text-white p-8 md:p-10 rounded-2xl border border-slate-800 shadow-2xl relative">
                  <div className="flex items-center justify-between mb-7 pb-5 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                        <Store size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">Sharma Kirana & General Store</div>
                        <div className="text-xs text-blue-400 font-mono">sharmakirana.ferasetu.com</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold">
                      ● Live
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="text-emerald-400 flex-shrink-0" size={18} />
                        <div>
                          <div className="text-sm font-semibold text-white">New Order #1042</div>
                          <div className="text-xs text-slate-400">Ramesh K. · 4 items · Paid via UPI</div>
                        </div>
                      </div>
                      <span className="text-emerald-400 font-bold text-sm">₹1,240</span>
                    </div>

                    <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Sparkles className="text-blue-400 flex-shrink-0" size={18} />
                        <div>
                          <div className="text-sm font-semibold text-white">FeraSetu AI Alert</div>
                          <div className="text-xs text-slate-400">Fortune Mustard Oil — 2 units left</div>
                        </div>
                      </div>
                      <span className="text-blue-400 text-xs font-semibold px-2 py-1 bg-blue-500/10 rounded-md">Restock</span>
                    </div>

                    <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Percent className="text-amber-400 flex-shrink-0" size={18} />
                        <div>
                          <div className="text-sm font-semibold text-white">Commission Saved</div>
                          <div className="text-xs text-slate-400">100% credited to your bank</div>
                        </div>
                      </div>
                      <span className="text-amber-400 font-bold text-sm">₹0 Cut</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
          SECTION 5 — FEATURES AS OUTCOMES (DESIRE)
          Feature → What it does → Why it matters
        ================================================================ */}
        <section className="py-20 md:py-24 bg-white" id="features" aria-label="FeraSetu features">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
                {t('features.title') || 'Built for how shopkeepers actually work'}
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                {t('features.subtitle') || 'Every feature answers a real problem. No bloat, no complexity.'}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURE_OUTCOMES.map((item, i) => (
                <div
                  key={i}
                  className="bg-white border border-slate-100 rounded-2xl p-6 hover:border-slate-200 hover:shadow-sm transition-all duration-200"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${item.iconBg}`}>
                    {item.icon}
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">{item.feature}</div>
                  <h3 className="font-bold text-slate-900 text-base mb-2 leading-snug">{item.does}</h3>
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
        <AIExamplePrompts showCTA ctaHref="/register" ctaText="Try FeraSetu AI Free" />

        {/* ================================================================
          SECTION 7 — PROOF (TRUST — No fake testimonials)
          Replaces fabricated "Rajesh Kumar, Electronics Hub" testimonial.
          Shows real product capabilities and honest what-you-get.
        ================================================================ */}
        <MarketingReveal>
          <ProofSection
            title="What you get from day one"
            subtitle="Every feature below works on the Free plan — no credit card, no trial period, no hidden costs."
          />
        </MarketingReveal>

        {/* ================================================================
          SECTION 8 — PRICING PREVIEW (DESIRE → ACTION)
          Transparent pricing. No fake discounts. No manufactured urgency.
        ================================================================ */}
        <section className="py-20 md:py-24 bg-slate-900 text-white" id="pricing" aria-label="FeraSetu pricing plans">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="text-center mb-14 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-900/60 border border-blue-700 text-blue-300 text-xs font-bold uppercase tracking-wider mb-4">
                Transparent Pricing
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">
                {t('pricingPreview.title') || 'Simple, honest pricing'}
              </h2>
              <p className="text-slate-400 text-lg">
                {t('pricingPreview.subtitle') || 'Start for ₹0. Upgrade when your business needs more. No hidden charges — ever.'}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-10 items-stretch">
              {/* Free */}
              <div className="rounded-2xl p-7 bg-slate-800/90 border border-slate-700 flex flex-col">
                <div>
                  <h3 className="font-bold text-2xl text-white mb-1">{t('plan.free.name') || 'Free'}</h3>
                  <p className="text-slate-400 text-sm mb-5">Start your online store with zero risk.</p>
                  <div className="mb-6">
                    <span className="text-4xl font-black text-white">₹0</span>
                    <span className="text-slate-400 text-sm ml-1.5">/month</span>
                  </div>
                  <ul className="text-sm space-y-3 text-slate-300 mb-7">
                    {['Online storefront with your own link', 'Up to 25 products', 'WhatsApp ordering & UPI payments', 'Order dashboard & inventory tracking', '20 FeraSetu AI queries/month'].map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <Check size={15} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {user ? (
                  <Link
                    to="/dashboard"
                    className="mt-auto w-full py-3.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-center transition-colors block text-sm"
                  >
                    Go to Dashboard
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => register()}
                    className="mt-auto w-full py-3.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-center transition-colors block text-sm cursor-pointer"
                  >
                    Start Free (₹0)
                  </button>
                )}
              </div>

              {/* Business — Most Popular */}
              <div className="rounded-2xl p-7 bg-blue-600 border-2 border-blue-400 flex flex-col relative transform md:-translate-y-3 shadow-2xl shadow-blue-900/60">
                <div className="absolute top-0 right-6 transform -translate-y-1/2 bg-amber-400 text-slate-950 text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider shadow-md">
                  {t('pricingPreview.recommended') || 'MOST POPULAR'}
                </div>
                <div>
                  <h3 className="font-bold text-2xl text-white mb-1">{t('plan.business.name') || 'Business'}</h3>
                  <p className="text-blue-100 text-sm mb-5">Run and grow your retail business.</p>
                  <div className="mb-6">
                    <span className="text-4xl font-black text-white">₹399</span>
                    <span className="text-blue-200 text-sm ml-1.5">/month</span>
                  </div>
                  <ul className="text-sm space-y-3 text-white mb-7">
                    {['Everything in Free', 'Up to 500 products + categories', 'Advanced analytics & profit tracking', 'Automated low-stock alerts', '200 FeraSetu AI queries/month', 'Custom domain & remove branding'].map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <Check size={15} className="text-amber-300 flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {user ? (
                  <Link
                    to="/upgrade"
                    className="mt-auto w-full py-3.5 rounded-xl bg-white hover:bg-slate-100 text-blue-700 font-bold text-center transition-colors block text-sm shadow-md"
                  >
                    Upgrade to Business
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => register()}
                    className="mt-auto w-full py-3.5 rounded-xl bg-white hover:bg-slate-100 text-blue-700 font-bold text-center transition-colors block text-sm shadow-md cursor-pointer"
                  >
                    Start Business Plan
                  </button>
                )}
              </div>

              {/* Pro */}
              <div className="rounded-2xl p-7 bg-slate-800/90 border border-slate-700 flex flex-col">
                <div>
                  <h3 className="font-bold text-2xl text-white mb-1">{t('plan.pro.name') || 'Pro'}</h3>
                  <p className="text-slate-400 text-sm mb-5">Unlimited scale for serious merchants.</p>
                  <div className="mb-6">
                    <span className="text-4xl font-black text-white">₹999</span>
                    <span className="text-slate-400 text-sm ml-1.5">/month</span>
                  </div>
                  <ul className="text-sm space-y-3 text-slate-300 mb-7">
                    {['Everything in Business', 'Unlimited products', '1,000 FeraSetu AI queries + forecasting', 'Up to 5 staff accounts', 'Priority phone & chat support', 'White-label (remove FeraSetu branding)'].map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <Check size={15} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {user ? (
                  <Link
                    to="/upgrade"
                    className="mt-auto w-full py-3.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-center transition-colors block text-sm"
                  >
                    Upgrade to Pro
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => register()}
                    className="mt-auto w-full py-3.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-center transition-colors block text-sm cursor-pointer"
                  >
                    Get Pro Plan
                  </button>
                )}
              </div>
            </div>

            <div className="text-center">
              <Link
                to={getLocalizedLink('/pricing')}
                className="text-blue-400 hover:text-blue-300 font-semibold transition-colors inline-flex items-center gap-2 text-sm group"
              >
                <span>{t('pricingPreview.viewAll') || 'See full feature comparison'}</span>
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </section>

        {/* ================================================================
          SECTION 9 — FAQ (ACTION — objection handling)
          Real questions. Factual answers. No marketing language.
        ================================================================ */}
        <MarketingReveal>
          <FAQSection
            title="Questions shopkeepers ask"
            subtitle="Honest answers — no fluff."
          />
        </MarketingReveal>

        {/* ================================================================
          SECTION 10 — FINAL CTA (ACTION)
          Ethical. No fake urgency. Strong but truthful.
        ================================================================ */}
        <MarketingReveal>
          <FinalCTA
            title={"Your shop is already real.\nNow give it an online front door."}
            subtitle="Start free today. Your store URL is ready in minutes — no technical setup required."
            primaryText="Start Free Store (₹0)"
            primaryHref="/register"
            secondaryText="See pricing"
            secondaryHref="/pricing"
            trustItems={['₹0 to start', 'No credit card', '0% commission', 'Setup in minutes', 'Data stays in India']}
          />
        </MarketingReveal>
      </PublicLayout>
    </>
  );
}
