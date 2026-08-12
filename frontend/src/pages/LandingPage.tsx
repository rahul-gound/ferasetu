import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Store, ShoppingBag, MessageCircle, BarChart3,
  Bot, ShieldCheck, ArrowRight, Zap, Check, ChevronDown, TrendingUp
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import SEO from '../components/SEO';

// Minimal, restrained design using FeraSetu's color palette:
// Background: #060818 (Deep navy/black)
// Primary: #FF6B35 (Brand Orange)
// Secondary: #6366f1 (Indigo)
// Success: #10b981 (Emerald)
// Text: rgba(255,255,255, 0.85) for body, #fff for headings

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language, translate, getLocalizedLink } = useLanguage();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-[#060818] text-white selection:bg-[#FF6B35] selection:text-white font-sans">
      <SEO
        title="FeraSetu — Your Shop's Digital Bridge"
        description="FeraSetu gives every shopkeeper the power to sell online — without depending on any marketplace."
        url="https://ferasetu.com"
        type="website"
      />

      <style>{`
        h1, h2, h3, h4, h5, h6 { font-family: 'Outfit', sans-serif; letter-spacing: -0.02em; }
        body { font-family: 'Inter', sans-serif; }
        .glass-panel {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .text-gradient {
          background: linear-gradient(135deg, #FF6B35, #f97316);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .subtle-grid {
          background-image: 
            linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
        }
      `}</style>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass-panel border-b border-white/5 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.webp" alt="FeraSetu" fetchpriority="high" width="128" height="32" className="h-8 w-auto" />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-sm font-medium text-white/60 hover:text-white transition-colors">{translate('nav.howItWorks')}</a>
            <a href="#features" className="text-sm font-medium text-white/60 hover:text-white transition-colors">{translate('nav.features')}</a>
            <a href="#pricing" className="text-sm font-medium text-white/60 hover:text-white transition-colors">{translate('nav.pricing')}</a>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSelector />
            <Link to={getLocalizedLink('/login')} className="text-sm font-semibold text-white/80 hover:text-white transition-colors">
              {translate('nav.signIn')}
            </Link>
            <Link to={getLocalizedLink('/register')} className="px-5 py-2.5 rounded-full bg-[#FF6B35] text-white text-sm font-bold shadow-lg shadow-[#FF6B35]/20 hover:bg-[#e55a24] transition-all hover:-translate-y-0.5">
              {translate('nav.startFree')}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-32 overflow-hidden subtle-grid">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#FF6B35]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel mb-8"
          >
            <Store size={14} className="text-[#FF6B35]" />
            <span className="text-xs font-semibold tracking-wide text-white/80 uppercase">{translate('hero.badge')}</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-[80px] font-bold leading-[1.05] tracking-tight mb-8"
          >
            {translate('hero.title')}
            <br />
            <span className="text-gradient">{translate('hero.titleHighlight')}</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-12 font-medium"
          >
            {translate('hero.subtitle')}
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to={getLocalizedLink('/register')} className="px-8 py-4 rounded-full bg-[#FF6B35] text-white font-bold text-lg shadow-xl shadow-[#FF6B35]/20 hover:bg-[#e55a24] transition-all hover:-translate-y-1 flex items-center gap-2">
              {translate('hero.cta')} <ArrowRight size={20} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-24 border-t border-white/5 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Kya aap bhi yeh problems face kar rahe ho?</h2>
            <p className="text-white/50 text-lg">Running a modern shop shouldn't feel this chaotic.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "WhatsApp Chaos", desc: "Taking orders on WhatsApp means scrolling through chats, losing track, and manual mistakes.", icon: <MessageCircle size={24} className="text-[#EF4444]" /> },
              { title: "Marketplace Control", desc: "Big e-commerce apps take your customers, hide your data, and charge high commissions.", icon: <Store size={24} className="text-[#F59E0B]" /> },
              { title: "Digital Confusion", desc: "Building a website feels too technical, too expensive, or just not made for Indian shops.", icon: <Zap size={24} className="text-[#6366f1]" /> }
            ].map((prob, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="glass-panel p-8 rounded-3xl">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6">{prob.icon}</div>
                <h3 className="text-xl font-bold mb-3">{prob.title}</h3>
                <p className="text-white/60 leading-relaxed">{prob.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* The Solution */}
      <section className="py-32 relative">
        <div className="absolute top-1/2 right-0 w-[600px] h-[600px] bg-[#6366f1]/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">FeraSetu sab <span className="text-gradient">simple kar deta hai.</span></h2>
              <p className="text-lg text-white/60 mb-8 leading-relaxed">
                We built FeraSetu so you can have the same digital power as a large retailer, without the complexity. Everything you need to run your business is right on your phone.
              </p>
              
              <ul className="space-y-6">
                {[
                  "Share a professional store link, not a PDF catalog.",
                  "Orders arrive in a clean dashboard, not WhatsApp messages.",
                  "Keep 100% of your profits and customer data."
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <div className="mt-1 w-6 h-6 rounded-full bg-[#10b981]/10 flex items-center justify-center flex-shrink-0">
                      <Check size={14} className="text-[#10b981]" />
                    </div>
                    <span className="text-white/80 font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="relative">
              <div className="glass-panel p-2 rounded-3xl overflow-hidden shadow-2xl">
                <img src="/hero/dashboard.webp" alt="FeraSetu Dashboard" loading="lazy" width="800" height="450" className="w-full h-auto rounded-2xl opacity-90 hover:opacity-100 transition-opacity" 
                  onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1556742044-3c52d6e88c62?auto=format&fit=crop&q=80&w=2000' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">3 steps mein online ho jao</h2>
            <p className="text-white/50 text-lg">No developer required. Set up from your phone.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
             {[
                { num: '01', title: 'Apni dukaan ka naam batao', desc: 'Create your account securely.', icon: <Store size={24} /> },
                { num: '02', title: 'Pehla product add karo', desc: 'Upload a photo and set your price.', icon: <ShoppingBag size={24} /> },
                { num: '03', title: 'WhatsApp pe share karo', desc: 'Share your store link and accept orders.', icon: <Zap size={24} /> }
              ].map((step, i) => (
                <div key={i} className="relative glass-panel p-8 rounded-3xl">
                  <div className="text-[#FF6B35]/20 font-bold text-5xl absolute top-6 right-6">{step.num}</div>
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white mb-6">
                    {step.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-white/60">{step.desc}</p>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* Social Proof (Verified / Real quotes) */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-12">Yeh dukandar already online hain</h2>
          <div className="glass-panel p-10 md:p-14 rounded-[40px] text-left relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF6B35]/10 rounded-full blur-[80px]" />
             <div className="relative z-10">
                <blockquote className="text-2xl md:text-3xl font-medium leading-relaxed mb-8 text-white/90">
                  "Pehle register maintain karna mushkil tha. Ab FeraSetu se sab phone pe hai. Customers direct link se order karte hain."
                </blockquote>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#e55a24] flex items-center justify-center font-bold text-lg">
                    RK
                  </div>
                  <div>
                    <div className="font-bold text-lg">Rajesh Kumar</div>
                    <div className="text-sm text-white/50 tracking-wide uppercase">Kirana Store Owner</div>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-white/[0.02] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Sab kuch ek jagah</h2>
            <p className="text-white/50 text-lg">Everything you need, nothing you don't.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Online Storefront', desc: 'A beautiful, mobile-friendly shop that represents your brand.', icon: <Store size={20} className="text-[#FF6B35]" /> },
              { title: 'Order Management', desc: 'Accept, prepare, and complete orders clearly without confusion.', icon: <ShoppingBag size={20} className="text-[#6366f1]" /> },
              { title: 'Profit Tracking', desc: 'Know exactly what you earn. FeraSetu tracks your margins automatically.', icon: <BarChart3 size={20} className="text-[#10b981]" /> },
              { title: 'Fera AI Assistant', desc: 'Ask your AI questions about your shop, inventory, and sales.', icon: <Bot size={20} className="text-[#F59E0B]" /> },
              { title: 'WhatsApp Integration', desc: 'Share products and receive order alerts right where you spend your time.', icon: <MessageCircle size={20} className="text-[#3B82F6]" /> },
              { title: 'Data Ownership', desc: 'Your customers are yours. Export your data securely at any time.', icon: <ShieldCheck size={20} className="text-white" /> }
            ].map((feat, i) => (
              <div key={i} className="glass-panel p-6 rounded-2xl flex flex-col">
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-4">
                  {feat.icon}
                </div>
                <h4 className="font-bold text-lg mb-2">{feat.title}</h4>
                <p className="text-white/50 text-sm leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Header */}
      <section id="pricing" className="pt-32 pb-16 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Sahi plan chunein. Koi hidden fees nahi.</h2>
          <p className="text-lg text-white/60 mb-10">Start with zero risk. Upgrade only when your business needs it.</p>
          <div className="flex justify-center">
            <Link to="/pricing" className="px-6 py-3 rounded-full glass-panel hover:bg-white/5 transition-colors font-semibold flex items-center gap-2">
              View full pricing details <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32">
        <div className="max-w-4xl mx-auto px-6">
          <div className="glass-panel rounded-[40px] p-12 md:p-20 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#FF6B35]/10 to-transparent opacity-50" />
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">{translate('cta.title')}</h2>
              <p className="text-xl text-white/60 mb-10 font-medium">{translate('cta.subtitle')}</p>
              <Link to={getLocalizedLink('/register')} className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#FF6B35] text-white font-bold text-lg shadow-xl shadow-[#FF6B35]/20 hover:bg-[#e55a24] transition-transform hover:-translate-y-1">
                {translate('hero.cta')} <ArrowRight size={20} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.webp" alt="FeraSetu" loading="lazy" width="96" height="24" className="h-6 w-auto opacity-80" />
          </div>
          <div className="flex flex-col items-center md:items-end gap-2">
            <p className="text-sm text-white/40 font-medium">
              © {new Date().getFullYear()} FeraSetu. Independent digital commerce.
            </p>
            <div className="flex gap-4 text-sm text-white/40 font-medium">
              <Link to={getLocalizedLink('/terms')} className="hover:text-white transition-colors">Terms of Service</Link>
              <Link to={getLocalizedLink('/privacy')} className="hover:text-white transition-colors">Privacy Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
