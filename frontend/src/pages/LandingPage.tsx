import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, MessageSquare, ShoppingCart, Zap, BarChart3, Store, Globe } from 'lucide-react';
import PublicLayout from '../components/public/PublicLayout';
import { useLanguage } from '../contexts/LanguageContext';
import { PLANS } from '../config/plans';

export default function LandingPage() {
  const { getLocalizedLink, translate: t } = useLanguage();

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative pt-24 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-white pointer-events-none" />
        
        <div className="max-w-[1000px] mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100/50 border border-blue-200/50 text-blue-700 text-sm font-semibold tracking-wide mb-8 uppercase">
            {t('hero.badge')}
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-8">
            {t('hero.title').split(t('hero.titleHighlight'))[0]}
            <span className="text-blue-600">{t('hero.titleHighlight')}</span>
            {t('hero.title').split(t('hero.titleHighlight'))[1]}
          </h1>
          
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            {t('hero.subtitle')}
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to={getLocalizedLink('/register')} 
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-blue-600 text-white font-bold text-lg shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all hover:-translate-y-0.5"
            >
              {t('hero.cta')}
            </Link>
            <a 
              href="#how-it-works"
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-white border border-slate-200 text-slate-700 font-bold text-lg hover:bg-slate-50 transition-colors"
            >
              {t('hero.howItWorks')}
            </a>
          </div>
          
          <div className="mt-6 flex items-center justify-center gap-6 text-sm font-medium text-slate-500">
            <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-blue-500" /> {t('hero.noCreditCard')}</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-blue-500" /> {t('hero.setupIn')}</span>
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="max-w-[1200px] mx-auto px-6 mt-20 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10 pointer-events-none h-full" />
          <div className="rounded-2xl border border-slate-200 shadow-2xl overflow-hidden bg-white">
            <div className="h-10 bg-slate-50 border-b border-slate-200 flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-300" />
              <div className="w-3 h-3 rounded-full bg-slate-300" />
              <div className="w-3 h-3 rounded-full bg-slate-300" />
            </div>
            <div className="aspect-[16/9] bg-slate-100 flex items-center justify-center relative overflow-hidden">
              <picture className="w-full h-full">
                <source srcSet="/hero/dashboard.webp" type="image/webp" />
                <img
                  src="/hero/dashboard.png"
                  alt="FeraSetu Dashboard Preview"
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

      {/* Problem Section */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">{t('problem.title')}</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center mb-6">
                <MessageSquare size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{t('problem.whatsapp.title')}</h3>
              <p className="text-slate-600 leading-relaxed">{t('problem.whatsapp.desc')}</p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center mb-6">
                <ShoppingCart size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{t('problem.marketplace.title')}</h3>
              <p className="text-slate-600 leading-relaxed">{t('problem.marketplace.desc')}</p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center mb-6">
                <Zap size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{t('problem.digital.title')}</h3>
              <p className="text-slate-600 leading-relaxed">{t('problem.digital.desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Split Section */}
      <section className="py-24 bg-white" id="how-it-works">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">{t('solution.title')}</h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                {t('solution.subtitle')}
              </p>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">1</div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg">{t('solution.step1.title')}</h4>
                    <p className="text-slate-600">{t('solution.step1.desc')}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">2</div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg">{t('solution.step2.title')}</h4>
                    <p className="text-slate-600">{t('solution.step2.desc')}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">3</div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg">{t('solution.step3.title')}</h4>
                    <p className="text-slate-600">{t('solution.step3.desc')}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-blue-600 transform translate-x-4 translate-y-4 rounded-2xl opacity-10" />
              <div className="aspect-[4/3] bg-slate-100 rounded-2xl border border-slate-200 relative overflow-hidden flex items-center justify-center shadow-lg">
                <Store size={48} className="text-slate-300" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-slate-50 border-y border-slate-200" id="features">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">{t('features.title')}</h2>
            <p className="text-lg text-slate-600">{t('features.subtitle')}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: t('features.domain.title'), desc: t('features.domain.desc'), icon: <Globe /> },
              { title: t('features.commission.title'), desc: t('features.commission.desc'), icon: <BarChart3 /> },
              { title: t('features.upi.title'), desc: t('features.upi.desc'), icon: <Zap /> },
              { title: t('features.inventory.title'), desc: t('features.inventory.desc'), icon: <Store /> },
              { title: t('features.whatsapp.title'), desc: t('features.whatsapp.desc'), icon: <MessageSquare /> },
              { title: t('features.ai.title'), desc: t('features.ai.desc'), icon: <Zap /> },
            ].map((feature, i) => (
              <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h4 className="font-bold text-slate-900 mb-2">{feature.title}</h4>
                <p className="text-slate-600 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-24 bg-white">
        <div className="max-w-[1280px] mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-12">{t('testimonial.title')}</h2>
          
          <div className="max-w-3xl mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-8 md:p-12 relative">
            <p className="text-xl md:text-2xl text-slate-700 italic font-medium leading-relaxed mb-8">
              {t('testimonial.quote')}
            </p>
            <div className="flex items-center justify-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                R
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-900">{t('testimonial.author')}</p>
                <p className="text-sm text-slate-500">{t('testimonial.role')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-24 bg-slate-900 text-white">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('pricingPreview.title')}</h2>
            <p className="text-slate-400">{t('pricingPreview.subtitle')}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
            {PLANS.map((plan) => (
              <div 
                key={plan.id}
                className={`rounded-2xl p-6 border relative ${
                  plan.highlighted 
                    ? 'bg-blue-600 border-blue-500 transform md:-translate-y-4 shadow-xl shadow-blue-900/50 text-white' 
                    : 'bg-slate-800 border-slate-700 text-white'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute top-0 right-6 transform -translate-y-1/2 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">
                    {t('pricingPreview.recommended')}
                  </div>
                )}
                <h3 className="font-bold text-xl mb-2">{plan.displayName}</h3>
                <p className="text-3xl font-bold mb-4">
                  ₹{plan.price.monthly.toLocaleString('en-IN')}
                  <span className={`text-base font-normal ${plan.highlighted ? 'text-blue-200' : 'text-slate-400'}`}>
                    {t('pricingPreview.mo')}
                  </span>
                </p>
                <ul className={`text-sm space-y-2 ${plan.highlighted ? 'text-blue-100' : 'text-slate-300'}`}>
                  {plan.features.slice(0, 4).map((feature, idx) => (
                    <li key={idx} className={!feature.included ? 'opacity-50 line-through' : ''}>
                      • {feature.label}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link to={getLocalizedLink('/pricing')} className="text-blue-400 font-medium hover:text-blue-300 transition-colors inline-flex items-center gap-1">
              {t('pricingPreview.viewAll')} <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-white text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">{t('cta.title')}</h2>
          <p className="text-lg text-slate-600 mb-10">{t('cta.subtitle')}</p>
          <Link 
            to={getLocalizedLink('/register')} 
            className="inline-block px-8 py-4 rounded-full bg-blue-600 text-white font-bold text-lg shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all hover:-translate-y-0.5"
          >
            {t('cta.createStore')}
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
