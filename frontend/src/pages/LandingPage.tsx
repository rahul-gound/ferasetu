import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  CheckCircle2, 
  MessageSquare, 
  ShoppingCart, 
  Zap, 
  BarChart3, 
  Store, 
  Globe, 
  Percent, 
  Smartphone, 
  ShieldCheck, 
  Sparkles,
  Check
} from 'lucide-react';
import PublicLayout from '../components/public/PublicLayout';
import { useLanguage } from '../contexts/LanguageContext';

export default function LandingPage() {
  const { getLocalizedLink, translate: t } = useLanguage();

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative pt-20 pb-28 md:pt-24 md:pb-32 overflow-hidden bg-gradient-to-b from-blue-50/60 via-white to-white">
        <div className="max-w-[1000px] mx-auto px-6 relative z-10 text-center">
          {/* Hero Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100/70 border border-blue-200 text-blue-800 text-xs sm:text-sm font-bold tracking-wide mb-6 uppercase shadow-sm">
            <Store size={15} className="text-blue-600" />
            <span>{t('hero.badge') || 'FOR INDIAN SHOPKEEPERS & LOCAL RETAILERS'}</span>
          </div>
          
          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.15] mb-3">
            Apni dukaan ko online le jao.{' '}
            <span className="text-blue-600">Orders badhao, business sambhalo</span> — ek hi jagah se.
          </h1>
          
          {/* English Sub-Headline / Translation */}
          <p className="text-sm sm:text-base font-semibold text-slate-500 mb-6 max-w-2xl mx-auto">
            (Build your online store, accept more orders, and manage your business from one place.)
          </p>
          
          {/* Hero Subtitle */}
          <p className="text-lg sm:text-xl text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            {t('hero.subtitle')}
          </p>
          
          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link 
              to={getLocalizedLink('/register')} 
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-blue-600 text-white font-bold text-lg shadow-xl shadow-blue-600/25 hover:bg-blue-700 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <span>{t('hero.cta') || 'Start Free (₹0)'}</span>
              <ArrowRight size={18} />
            </Link>
            <Link 
              to={getLocalizedLink('/pricing')}
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-white border border-slate-300 text-slate-700 font-bold text-lg hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm flex items-center justify-center"
            >
              {t('hero.pricingCta') || 'See Pricing Plans'}
            </Link>
          </div>
          
          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm font-medium text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-blue-600 flex-shrink-0" /> 
              {t('hero.zeroStart') || '₹0 to start'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-blue-600 flex-shrink-0" /> 
              {t('hero.noCreditCard') || 'No credit card required'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-blue-600 flex-shrink-0" /> 
              {t('hero.setupIn') || 'Ready in 5 minutes'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-emerald-600 flex-shrink-0" /> 
              {t('hero.dataInIndia') || '100% Data in India'}
            </span>
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="max-w-[1100px] mx-auto px-6 mt-14 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10 pointer-events-none h-full" />
          <div className="rounded-2xl border border-slate-200/80 shadow-2xl overflow-hidden bg-white">
            <div className="h-10 bg-slate-50 border-b border-slate-200 flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
              <div className="ml-4 text-xs font-mono text-slate-400">yourshop.ferasetu.com</div>
            </div>
            <div className="aspect-[16/9] bg-slate-100 flex items-center justify-center relative overflow-hidden">
              <picture className="w-full h-full">
                <source srcSet="/hero/dashboard.webp" type="image/webp" />
                <img
                  src="/hero/dashboard.png"
                  alt="FeraSetu Merchant Dashboard Preview"
                  width={1200}
                  height={675}
                  loading="eager"
                  fetchPriority="high"
                  className="w-full h-full object-cover"
                />
              </picture>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section (Problem & Solution Breakdown) */}
      <section className="py-20 md:py-24 bg-slate-50 border-t border-slate-200/60">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold uppercase tracking-wider mb-3">
              The Real Problems You Face
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
              {t('problem.title')}
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              {t('problem.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Problem 1 */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mb-6">
                <MessageSquare size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                {t('problem.whatsapp.title')}
              </h3>
              <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                {t('problem.whatsapp.desc')}
              </p>
            </div>

            {/* Problem 2 */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-6">
                <Percent size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                {t('problem.marketplace.title')}
              </h3>
              <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                {t('problem.marketplace.desc')}
              </p>
            </div>

            {/* Problem 3 */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                <Smartphone size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                {t('problem.digital.title')}
              </h3>
              <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                {t('problem.digital.desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section (How FeraSetu Works) */}
      <section className="py-20 md:py-24 bg-white" id="how-it-works">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-3">
                The Solution
              </div>
              <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
                {t('solution.title')}
              </h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                {t('solution.subtitle')}
              </p>
              
              <div className="space-y-6">
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0 text-base shadow-md shadow-blue-500/20">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg mb-1">{t('solution.step1.title')}</h4>
                    <p className="text-slate-600 leading-relaxed">{t('solution.step1.desc')}</p>
                  </div>
                </div>
                
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0 text-base shadow-md shadow-blue-500/20">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg mb-1">{t('solution.step2.title')}</h4>
                    <p className="text-slate-600 leading-relaxed">{t('solution.step2.desc')}</p>
                  </div>
                </div>
                
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0 text-base shadow-md shadow-blue-500/20">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg mb-1">{t('solution.step3.title')}</h4>
                    <p className="text-slate-600 leading-relaxed">{t('solution.step3.desc')}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-blue-600/10 rounded-3xl transform rotate-1 scale-105" />
              <div className="bg-slate-900 text-white p-8 md:p-10 rounded-2xl border border-slate-800 shadow-2xl relative">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
                      <Store size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-white">Sharma Kirana & General Store</div>
                      <div className="text-xs text-blue-400 font-mono">sharmakirana.ferasetu.com</div>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold">
                    Online & Active
                  </span>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="text-emerald-400" size={20} />
                      <div>
                        <div className="text-sm font-semibold text-white">WhatsApp Order #1042</div>
                        <div className="text-xs text-slate-400">Ramesh K. • 4 items • Paid via UPI</div>
                      </div>
                    </div>
                    <span className="text-emerald-400 font-bold text-sm">₹1,240</span>
                  </div>

                  <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Zap className="text-blue-400" size={20} />
                      <div>
                        <div className="text-sm font-semibold text-white">Fera AI Restock Alert</div>
                        <div className="text-xs text-slate-400">Fortune Mustard Oil low on stock (2 left)</div>
                      </div>
                    </div>
                    <span className="text-blue-400 text-xs font-semibold px-2.5 py-1 bg-blue-500/10 rounded-md">Smart Action</span>
                  </div>

                  <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Percent className="text-amber-400" size={20} />
                      <div>
                        <div className="text-sm font-semibold text-white">Marketplace Commission Saved</div>
                        <div className="text-xs text-slate-400">100% money credited to your bank</div>
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

      {/* Features Grid */}
      <section className="py-20 md:py-24 bg-slate-50 border-y border-slate-200/80" id="features">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
              {t('features.title')}
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              {t('features.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { 
                title: t('features.domain.title') || 'Custom Store Link & Branding', 
                desc: t('features.domain.desc') || 'Get your own branded storefront link (yourshop.ferasetu.com) to share anywhere.', 
                icon: <Globe size={22} /> 
              },
              { 
                title: t('features.commission.title') || 'Zero Commissions', 
                desc: t('features.commission.desc') || 'We never take a cut of your sales. What you earn is 100% yours to keep.', 
                icon: <Percent size={22} /> 
              },
              { 
                title: t('features.upi.title') || 'Direct UPI Payments', 
                desc: t('features.upi.desc') || 'Seamless checkout with Google Pay, PhonePe, Paytm, BHIM, and instant payment confirmations.', 
                icon: <Zap size={22} /> 
              },
              { 
                title: t('features.inventory.title') || 'Smart Inventory Management', 
                desc: t('features.inventory.desc') || 'Track stock levels automatically and get alerted before best-sellers run out.', 
                icon: <Store size={22} /> 
              },
              { 
                title: t('features.whatsapp.title') || 'WhatsApp Order Integration', 
                desc: t('features.whatsapp.desc') || 'Allow customers to build a cart and send the final formatted order via WhatsApp.', 
                icon: <MessageSquare size={22} /> 
              },
              { 
                title: t('features.ai.title') || 'Fera AI Assistant', 
                desc: t('features.ai.desc') || 'Get instant restock advice, sales summaries, and product descriptions in Hindi or English.', 
                icon: <Sparkles size={22} /> 
              },
            ].map((feature, i) => (
              <div key={i} className="bg-white p-7 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5 font-bold">
                  {feature.icon}
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">{feature.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 md:py-24 bg-white">
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-12 tracking-tight">
            {t('testimonial.title')}
          </h2>
          
          <div className="max-w-3xl mx-auto bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200/80 rounded-2xl p-8 md:p-12 relative shadow-sm">
            <p className="text-lg md:text-xl text-slate-700 italic font-medium leading-relaxed mb-8">
              {t('testimonial.quote')}
            </p>
            <div className="flex items-center justify-center gap-4">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-md shadow-blue-600/30">
                R
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-900 text-base">{t('testimonial.author')}</p>
                <p className="text-xs sm:text-sm text-slate-500">{t('testimonial.role')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Pricing Preview (3 Transparent Cards) */}
      <section className="py-20 md:py-24 bg-slate-900 text-white" id="pricing">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-900/60 border border-blue-700 text-blue-300 text-xs font-bold uppercase tracking-wider mb-3">
              Transparent Pricing
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">
              {t('pricingPreview.title') || 'Simple, transparent pricing'}
            </h2>
            <p className="text-slate-400 text-base sm:text-lg">
              {t('pricingPreview.subtitle') || 'Start for ₹0, upgrade when you need to grow. No hidden charges.'}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-12 items-stretch">
            {/* Card 1: Free Plan */}
            <div className="rounded-2xl p-7 bg-slate-800/90 border border-slate-700 flex flex-col justify-between hover:border-slate-600 transition-all">
              <div>
                <h3 className="font-bold text-2xl text-white mb-1">
                  {t('plan.free.name') || 'Free'}
                </h3>
                <p className="text-slate-400 text-xs sm:text-sm mb-6">
                  Start your online store with zero risk.
                </p>
                
                <div className="mb-6">
                  <span className="text-4xl font-black text-white">₹0</span>
                  <span className="text-slate-400 text-sm ml-1.5">/month</span>
                </div>

                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Merchant Outcomes:
                </div>
                <ul className="text-sm space-y-3 text-slate-300 mb-8">
                  <li className="flex items-start gap-2.5">
                    <Check size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>Online storefront with your custom link (<span className="font-mono text-xs text-blue-300">yourshop.ferasetu.com</span>)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>Up to 25 products with photo uploads</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>Direct WhatsApp ordering & instant UPI QR</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>Order dashboard & basic inventory tracking</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>20 Fera AI assistant queries/month</span>
                  </li>
                </ul>
              </div>

              <Link
                to={getLocalizedLink('/register')}
                className="w-full py-3.5 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-center transition-colors block text-sm"
              >
                Start Free (₹0)
              </Link>
            </div>

            {/* Card 2: Business Plan (RECOMMENDED / MOST POPULAR) */}
            <div className="rounded-2xl p-7 bg-blue-600 border-2 border-blue-400 flex flex-col justify-between relative transform md:-translate-y-3 shadow-2xl shadow-blue-900/60">
              <div className="absolute top-0 right-6 transform -translate-y-1/2 bg-amber-400 text-slate-950 text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider shadow-md">
                {t('pricingPreview.recommended') || 'MOST POPULAR'}
              </div>

              <div>
                <h3 className="font-bold text-2xl text-white mb-1">
                  {t('plan.business.name') || 'Business'}
                </h3>
                <p className="text-blue-100 text-xs sm:text-sm mb-6">
                  Run and grow your retail business efficiently.
                </p>
                
                <div className="mb-6">
                  <span className="text-4xl font-black text-white">₹399</span>
                  <span className="text-blue-200 text-sm ml-1.5">/month</span>
                </div>

                <div className="text-xs font-semibold uppercase tracking-wider text-blue-200 mb-3">
                  Merchant Outcomes:
                </div>
                <ul className="text-sm space-y-3 text-white mb-8">
                  <li className="flex items-start gap-2.5">
                    <Check size={16} className="text-amber-300 flex-shrink-0 mt-0.5" />
                    <span className="font-medium">Everything in Free</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={16} className="text-amber-300 flex-shrink-0 mt-0.5" />
                    <span>Up to 500 products with categories & variants</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={16} className="text-amber-300 flex-shrink-0 mt-0.5" />
                    <span>Advanced analytics & profit tracking</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={16} className="text-amber-300 flex-shrink-0 mt-0.5" />
                    <span>Automated low-stock alerts & WhatsApp receipts</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={16} className="text-amber-300 flex-shrink-0 mt-0.5" />
                    <span>200 Fera AI queries/mo & custom branding</span>
                  </li>
                </ul>
              </div>

              <Link
                to={getLocalizedLink('/register?plan=business')}
                className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-blue-700 font-bold text-center transition-colors block text-sm shadow-md"
              >
                Start Business Plan
              </Link>
            </div>

            {/* Card 3: Pro Plan */}
            <div className="rounded-2xl p-7 bg-slate-800/90 border border-slate-700 flex flex-col justify-between hover:border-slate-600 transition-all">
              <div>
                <h3 className="font-bold text-2xl text-white mb-1">
                  {t('plan.pro.name') || 'Pro'}
                </h3>
                <p className="text-slate-400 text-xs sm:text-sm mb-6">
                  Complete power and scale for serious merchants.
                </p>
                
                <div className="mb-6">
                  <span className="text-4xl font-black text-white">₹999</span>
                  <span className="text-slate-400 text-sm ml-1.5">/month</span>
                </div>

                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Merchant Outcomes:
                </div>
                <ul className="text-sm space-y-3 text-slate-300 mb-8">
                  <li className="flex items-start gap-2.5">
                    <Check size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="font-medium">Everything in Business</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>Unlimited products & high-volume ordering</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>1,000 Fera AI messages with forecasting</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>Multi-staff accounts & priority phone/chat support</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>100% white-label (remove FeraSetu branding)</span>
                  </li>
                </ul>
              </div>

              <Link
                to={getLocalizedLink('/register?plan=pro')}
                className="w-full py-3.5 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-center transition-colors block text-sm"
              >
                Get Pro Plan
              </Link>
            </div>
          </div>

          {/* Pricing Comparison Link */}
          <div className="text-center">
            <Link 
              to={getLocalizedLink('/pricing')} 
              className="text-blue-400 hover:text-blue-300 font-semibold transition-colors inline-flex items-center gap-2 text-sm sm:text-base group"
            >
              <span>{t('pricingPreview.viewAll') || 'See full pricing & feature comparison'}</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 md:py-28 bg-white text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
            {t('cta.title')}
          </h2>
          <p className="text-lg text-slate-600 mb-8 leading-relaxed">
            {t('cta.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link 
              to={getLocalizedLink('/register')} 
              className="w-full sm:w-auto px-9 py-4 rounded-full bg-blue-600 text-white font-bold text-lg shadow-xl shadow-blue-600/25 hover:bg-blue-700 transition-all hover:-translate-y-0.5"
            >
              {t('cta.createStore') || 'Start Free Store (₹0)'}
            </Link>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            {t('hero.zeroStart') || '₹0 to start'} · {t('hero.noCreditCard') || 'No credit card required'} · {t('hero.setupIn') || 'Ready in 5 minutes'}
          </p>
        </div>
      </section>
    </PublicLayout>
  );
}
