import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, MessageSquare, ShoppingCart, Zap, BarChart3, Store, Globe } from 'lucide-react';
import PublicLayout from '../components/public/PublicLayout';
import { useLanguage } from '../contexts/LanguageContext';

export default function LandingPage() {
  const { getLocalizedLink } = useLanguage();

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative pt-24 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-white pointer-events-none" />
        
        <div className="max-w-[1000px] mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100/50 border border-blue-200/50 text-blue-700 text-sm font-semibold tracking-wide mb-8">
            INDEPENDENT DIGITAL COMMERCE
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-8">
            Your business deserves a <br className="hidden md:block" />
            <span className="text-blue-600">better way</span> to sell online.
          </h1>
          
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Stop giving away your profits to marketplaces and losing track of orders on WhatsApp. Launch your own independent store, own your customers, and grow your business on your terms.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to={getLocalizedLink('/register')} 
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-blue-600 text-white font-bold text-lg shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all hover:-translate-y-0.5"
            >
              Start Free Today
            </Link>
            <a 
              href="#how-it-works"
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-white border border-slate-200 text-slate-700 font-bold text-lg hover:bg-slate-50 transition-colors"
            >
              See how it works
            </a>
          </div>
          
          <div className="mt-6 flex items-center justify-center gap-6 text-sm font-medium text-slate-500">
            <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-blue-500" /> No credit card required</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-blue-500" /> Setup in 5 minutes</span>
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
            {/* We assume /hero/dashboard.png or a fallback UI structure */}
            <div className="aspect-[16/9] bg-slate-100 flex items-center justify-center relative overflow-hidden">
              <img src="/hero/dashboard.png" alt="FeraSetu Dashboard" className="w-full h-full object-cover" onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<div class="text-slate-400 font-medium">Dashboard Interface Placeholder</div>';
              }} />
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">Running a business is hard enough without fighting your tools.</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center mb-6">
                <MessageSquare size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">The WhatsApp Chaos</h3>
              <p className="text-slate-600 leading-relaxed">Orders lost in endless chats. Manual payment tracking. Customers asking for prices over and over again.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center mb-6">
                <ShoppingCart size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Marketplace Control</h3>
              <p className="text-slate-600 leading-relaxed">Aggregators control your visibility, steal your customer relationships, and take massive commissions on every sale.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center mb-6">
                <Zap size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Digital Confusion</h3>
              <p className="text-slate-600 leading-relaxed">Building an independent website traditionally requires hiring agencies, learning code, and paying expensive monthly fees.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Split Section */}
      <section className="py-24 bg-white" id="how-it-works">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">Regain control with an independent storefront.</h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                FeraSetu gives you everything you need to sell online professionally, without the complexity or aggregator fees.
              </p>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">1</div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg">Add your products</h4>
                    <p className="text-slate-600">Upload your catalog with images, prices, and inventory limits in minutes.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">2</div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg">Share your link</h4>
                    <p className="text-slate-600">Post your custom store link on Instagram, WhatsApp, or Facebook.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">3</div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg">Receive orders securely</h4>
                    <p className="text-slate-600">Customers buy directly. You get paid directly. You own the relationship.</p>
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
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Everything you need to grow</h2>
            <p className="text-lg text-slate-600">Simple, powerful features designed specifically for Indian merchants.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: "Custom Domain", desc: "Connect your own domain (yourstore.com) for a professional brand presence.", icon: <Globe /> },
              { title: "Zero Commissions", desc: "We never take a cut of your sales. What you earn is entirely yours.", icon: <BarChart3 /> },
              { title: "UPI Payments", desc: "Seamless integration with Razorpay for UPI, Cards, and Netbanking.", icon: <Zap /> },
              { title: "Inventory Management", desc: "Track stock levels automatically and prevent overselling.", icon: <Store /> },
              { title: "WhatsApp Ordering", desc: "Allow customers to build a cart and send the final order via WhatsApp.", icon: <MessageSquare /> },
              { title: "AI Assistant", desc: "Generate product descriptions and setup your store instantly with Fera AI.", icon: <Zap /> },
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
          <h2 className="text-3xl font-bold text-slate-900 mb-12">Trusted by independent merchants</h2>
          
          <div className="max-w-3xl mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-8 md:p-12 relative">
            <p className="text-xl md:text-2xl text-slate-700 italic font-medium leading-relaxed mb-8">
              "Before FeraSetu, I was losing track of orders on WhatsApp and paying huge fees to aggregators. Now, my customers order directly from my own website, and my profits are up 40%."
            </p>
            <div className="flex items-center justify-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                R
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-900">Rajesh Kumar</p>
                <p className="text-sm text-slate-500">Owner, Electronics Hub</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-24 bg-slate-900 text-white">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-slate-400">Start for free, upgrade when you need to grow.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <h3 className="font-bold text-xl mb-2">Free</h3>
              <p className="text-3xl font-bold mb-4">₹0<span className="text-base font-normal text-slate-400">/mo</span></p>
              <ul className="text-sm text-slate-300 space-y-2">
                <li>• 50 Products</li>
                <li>• Standard Theme</li>
                <li>• 0% Commission</li>
              </ul>
            </div>
            <div className="bg-blue-600 rounded-2xl p-6 border border-blue-500 relative transform md:-translate-y-4 shadow-xl shadow-blue-900/50">
              <div className="absolute top-0 right-6 transform -translate-y-1/2 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                RECOMMENDED
              </div>
              <h3 className="font-bold text-xl mb-2">Growth</h3>
              <p className="text-3xl font-bold mb-4">₹299<span className="text-base font-normal text-blue-200">/mo</span></p>
              <ul className="text-sm text-blue-100 space-y-2">
                <li>• Unlimited Products</li>
                <li>• Custom Domain</li>
                <li>• Premium Themes</li>
              </ul>
            </div>
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <h3 className="font-bold text-xl mb-2">Pro</h3>
              <p className="text-3xl font-bold mb-4">₹999<span className="text-base font-normal text-slate-400">/mo</span></p>
              <ul className="text-sm text-slate-300 space-y-2">
                <li>• Fera AI Assistant</li>
                <li>• Advanced Analytics</li>
                <li>• Priority Support</li>
              </ul>
            </div>
          </div>

          <div className="text-center">
            <Link to={getLocalizedLink('/pricing')} className="text-blue-400 font-medium hover:text-blue-300 transition-colors inline-flex items-center gap-1">
              View all pricing details <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-white text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">Your business is ready for its next step.</h2>
          <p className="text-lg text-slate-600 mb-10">Join thousands of independent Indian merchants taking control of their online sales.</p>
          <Link 
            to={getLocalizedLink('/register')} 
            className="inline-block px-8 py-4 rounded-full bg-blue-600 text-white font-bold text-lg shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all hover:-translate-y-0.5"
          >
            Create Your Free Store
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
