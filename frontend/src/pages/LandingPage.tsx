import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShoppingBag, Zap, ShieldCheck, TrendingUp, 
  ChevronRight, Star, ArrowRight, Smartphone, 
  Store, MessageCircle, BarChart3, Globe
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-orange-100 selection:text-orange-600">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        body { font-family: 'Inter', sans-serif; }
        .hero-gradient {
          background: radial-gradient(circle at 50% -20%, rgba(255, 107, 53, 0.08) 0%, rgba(255, 255, 255, 0) 70%);
        }
        .animate-fade-up {
          animation: fadeUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px -8px rgba(0,0,0,0.08);
        }
        .commercial-orb {
          animation: floatOrb 7s ease-in-out infinite;
        }
        .commercial-shine {
          position: relative;
          overflow: hidden;
        }
        .commercial-shine::after {
          content: '';
          position: absolute;
          inset: -120% auto auto -60%;
          width: 60%;
          height: 300%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.42), transparent);
          transform: rotate(18deg);
          animation: shineSweep 4.2s ease-in-out infinite;
        }
        @keyframes floatOrb {
          0%, 100% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(12px,-18px,0) scale(1.04); }
        }
        @keyframes shineSweep {
          0%, 55% { left: -70%; }
          100% { left: 140%; }
        }
      `}</style>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <span className="text-white font-black text-xl italic">F</span>
            </div>
            <span className="text-xl font-black tracking-tight text-slate-900">Fera<span className="text-orange-500">Setu</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">How it works</a>
            <a href="#benefits" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">Benefits</a>
            <a href="#pricing" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">Pricing</a>
            <Link to="/login" className="text-sm font-semibold text-slate-900">Sign in</Link>
            <Link to="/register" className="px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-full hover:bg-slate-800 transition-all shadow-md active:scale-95">
              Start Your Shop
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-20">
        {/* Hero Section */}
        <section className="hero-gradient relative overflow-hidden pt-20 pb-32">
          <div className="commercial-orb absolute top-28 left-6 w-24 h-24 rounded-full bg-orange-200/50 blur-2xl" />
          <div className="commercial-orb absolute bottom-24 right-10 w-32 h-32 rounded-full bg-blue-200/40 blur-3xl" style={{ animationDelay: '1.5s' }} />
          <div className="max-w-7xl mx-auto px-6 text-center">
            <div className={`transition-all duration-1000 ${isVisible ? 'animate-fade-up' : 'opacity-0'}`}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-50 border border-orange-100 mb-8">
                <div className="flex -space-x-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                      <img src={`https://i.pravatar.cc/100?u=${i}`} alt="user" />
                    </div>
                  ))}
                </div>
                <span className="text-[13px] font-bold text-orange-600">10,000+ Indian shopkeepers joined</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 mb-6 leading-[1.1]">
                Grow your business <br className="hidden md:block" />
                <span className="text-orange-500">online in 2 minutes.</span>
              </h1>
              
              <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-500 font-medium mb-12 leading-relaxed">
                Build your shop website, manage products, and grow orders with AI. <span className="text-slate-900 font-bold">Dukaan ko online lao, orders WhatsApp par pao.</span>
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
                <Link to="/register" className="commercial-shine w-full sm:w-auto px-10 py-5 bg-orange-500 text-white text-lg font-black rounded-2xl hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/25 active:scale-95 flex items-center justify-center gap-3">
                  Start Your Shop Now <ChevronRight size={20} strokeWidth={3} />
                </Link>
                <div className="flex items-center gap-3 px-6 py-4">
                  <div className="flex text-orange-400">
                    {[1,2,3,4,5].map(i => <Star key={i} size={16} fill="currentColor" />)}
                  </div>
                  <span className="text-sm font-bold text-slate-600">4.9/5 Rating</span>
                </div>
              </div>

              {/* Product Mockup */}
              <div className="relative max-w-5xl mx-auto rounded-[2.5rem] p-4 bg-slate-100/50 border border-slate-200 shadow-2xl overflow-hidden group">
                <div className="bg-white rounded-[1.8rem] border border-slate-200 shadow-inner overflow-hidden aspect-[16/10] md:aspect-[16/8]">
                  <img 
                    src="https://images.unsplash.com/photo-1556742044-3c52d6e88c62?auto=format&fit=crop&q=80&w=2000" 
                    className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-1000"
                    alt="FeraSetu Dashboard"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/5 group-hover:bg-transparent transition-colors">
                    <div className="px-6 py-3 bg-white/90 backdrop-blur rounded-2xl border border-white shadow-xl flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-sm font-black text-slate-900">Your store is live & ready to sell</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-32 bg-slate-50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 mb-4">Start selling in 3 simple steps</h2>
              <p className="text-lg text-slate-500 font-medium">No technical skills needed. Bilkul aasan.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-12">
              <StepCard 
                number="01"
                title="Create Shop"
                desc="Apni shop ka naam daalein aur mobile number se verify karein."
                icon={<Store className="text-orange-500" size={32} />}
              />
              <StepCard 
                number="02"
                title="Add Products"
                desc="Products ki photos kheinchein aur price set karein instantly."
                icon={<ShoppingBag className="text-blue-500" size={32} />}
              />
              <StepCard 
                number="03"
                title="Share & Sell"
                desc="Link ko WhatsApp pe share karein aur orders lena shuru karein."
                icon={<Zap className="text-purple-500" size={32} />}
              />
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section id="benefits" className="py-32 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              <div>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-8 leading-[1.2]">
                  Designed for the <br />
                  <span className="text-orange-500">modern shopkeeper.</span>
                </h2>
                
                <div className="space-y-8">
                  <BenefitItem 
                    title="Know your profit instantly"
                    desc="Calculation ki tension khatam. Har order pe apna profit dekhein."
                    icon={<TrendingUp size={24} />}
                  />
                  <BenefitItem 
                    title="Sell on WhatsApp effortlessly"
                    desc="Customers ko professional link bhejein, purane tarike chhodein."
                    icon={<MessageCircle size={24} />}
                  />
                  <BenefitItem 
                    title="Safe & Secure"
                    desc="Aapka data hamesha secure rehta hai. Trust of 10k+ users."
                    icon={<ShieldCheck size={24} />}
                  />
                </div>
              </div>
              
              <div className="relative">
                <div className="bg-slate-900 rounded-[3rem] p-12 overflow-hidden shadow-2xl aspect-square flex flex-col justify-end">
                  <div className="absolute top-0 right-0 p-12 opacity-10">
                    <Globe size={400} />
                  </div>
                  <div className="relative z-10">
                    <div className="text-6xl font-black text-white mb-6">40%</div>
                    <div className="text-2xl font-bold text-slate-400 mb-8 leading-snug">Average sales increase for <br /> shopkeepers using FeraSetu.</div>
                    <Link to="/register" className="inline-flex items-center gap-2 text-orange-500 font-black text-lg group">
                      Grow your business today <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonial */}
        <section className="py-32 bg-slate-900 text-white overflow-hidden relative">
           <div className="max-w-7xl mx-auto px-6 relative z-10">
              <div className="max-w-3xl">
                <div className="flex gap-1 text-orange-400 mb-8">
                  {[1,2,3,4,5].map(i => <Star key={i} size={24} fill="currentColor" />)}
                </div>
                <h3 className="text-3xl md:text-5xl font-bold leading-tight mb-12 italic">
                  "Pehle register maintain karna mushkil tha. Ab FeraSetu se sab phone pe hai. Sales bhi badhi hai aur tension bhi kam hui hai."
                </h3>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center font-black text-2xl">RK</div>
                  <div>
                    <div className="text-xl font-black">Rajesh Kumar</div>
                    <div className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">Kirana Store Owner, Delhi</div>
                  </div>
                </div>
              </div>
           </div>
        </section>

        {/* Pricing Preview */}
        <section id="pricing" className="py-32 bg-slate-50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-orange-100 text-orange-600 text-xs font-black uppercase tracking-widest mb-6 shadow-sm">
                <ShieldCheck size={14} /> Simple pricing
              </div>
              <h2 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 mb-6 leading-tight">
                Start small. Upgrade when orders grow.
              </h2>
              <p className="text-lg text-slate-500 font-semibold leading-relaxed">
                Pricing is designed to feel safe for small shops and powerful when you are ready to scale.
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 items-stretch">
              <PricingTeaser
                icon={<Smartphone size={24} />}
                name="Starter"
                price="199"
                desc="Launch your online catalog and accept local orders."
                features={["100 products", "FeraSetu shop link", "Basic AI help"]}
              />
              <div className="relative rounded-[2rem] p-8 bg-white border-2 border-orange-500 shadow-2xl shadow-orange-500/15 lg:-translate-y-4">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full bg-orange-500 text-white text-xs font-black uppercase tracking-widest shadow-lg">
                  Best Value
                </div>
                <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mb-6">
                  <TrendingUp size={24} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">Growth</h3>
                <p className="text-slate-500 font-semibold min-h-[48px]">Custom domain, premium templates, and growth analytics.</p>
                <div className="my-8 flex items-end gap-1">
                  <span className="text-xl font-black text-slate-400">₹</span>
                  <span className="text-6xl font-black tracking-tighter text-slate-900">499</span>
                  <span className="text-slate-400 font-bold mb-2">/mo</span>
                </div>
                <div className="space-y-3 mb-8">
                  {["1,000 products", "Custom domain support", "Advanced AI and analytics"].map(item => (
                    <div key={item} className="flex items-center gap-3 text-sm font-bold text-slate-700">
                      <CheckMark /> {item}
                    </div>
                  ))}
                </div>
                <Link to="/upgrade" className="commercial-shine flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-orange-500 text-white font-black shadow-xl shadow-orange-500/25 hover:bg-orange-600 transition-all">
                  See plans <ArrowRight size={18} />
                </Link>
              </div>
              <PricingTeaser
                icon={<BarChart3 size={24} />}
                name="Scale"
                price="999"
                desc="For serious retailers with more products and staff."
                features={["Unlimited products", "Sales prediction", "Onboarding help"]}
              />
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-32 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="bg-orange-500 rounded-[3rem] p-12 md:p-24 text-center relative overflow-hidden">
               <div className="absolute inset-0 opacity-10 pointer-events-none">
                 <Store size={400} className="absolute -bottom-20 -right-20" />
               </div>
               <h2 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tight">Ab aapki baari hai.</h2>
               <p className="text-xl text-orange-100 font-bold mb-12 max-w-xl mx-auto leading-relaxed">Join 10,000+ smart shopkeepers. Bilkul free se shuru karein.</p>
               <Link to="/register" className="inline-flex px-12 py-6 bg-white text-orange-600 text-xl font-black rounded-2xl hover:shadow-2xl transition-all shadow-xl active:scale-95">
                 Create Your Store
               </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm italic">F</span>
            </div>
            <span className="text-lg font-black tracking-tight text-slate-900">Fera<span className="text-orange-500">Setu</span></span>
          </div>
          <div className="text-sm font-bold text-slate-400">
            © {new Date().getFullYear()} FeraSetu. Your shop’s digital bridge.
          </div>
        </div>
      </footer>
    </div>
  );
}

function StepCard({ number, title, desc, icon }: any) {
  return (
    <div className="feature-card p-10 bg-white rounded-[2.5rem] border border-slate-100 transition-all">
      <div className="text-sm font-black text-slate-400 mb-6 tracking-widest">{number}</div>
      <div className="mb-8">{icon}</div>
      <h3 className="text-2xl font-black text-slate-900 mb-4">{title}</h3>
      <p className="text-slate-500 font-medium leading-relaxed">{desc}</p>
    </div>
  );
}

function BenefitItem({ title, desc, icon }: any) {
  return (
    <div className="flex gap-6">
      <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-900 border border-slate-100">
        {icon}
      </div>
      <div>
        <h4 className="text-xl font-black text-slate-900 mb-1">{title}</h4>
        <p className="text-slate-500 font-medium leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function PricingTeaser({ icon, name, price, desc, features }: any) {
  return (
    <div className="rounded-[2rem] p-8 bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
      <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-900 flex items-center justify-center mb-6 border border-slate-100">
        {icon}
      </div>
      <h3 className="text-2xl font-black text-slate-900 mb-2">{name}</h3>
      <p className="text-slate-500 font-semibold min-h-[48px]">{desc}</p>
      <div className="my-8 flex items-end gap-1">
        <span className="text-xl font-black text-slate-400">₹</span>
        <span className="text-5xl font-black tracking-tighter text-slate-900">{price}</span>
        <span className="text-slate-400 font-bold mb-1">/mo</span>
      </div>
      <div className="space-y-3 mb-8">
        {features.map((item: string) => (
          <div key={item} className="flex items-center gap-3 text-sm font-bold text-slate-700">
            <CheckMark /> {item}
          </div>
        ))}
      </div>
      <Link to="/upgrade" className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-slate-900 text-white font-black hover:bg-slate-800 transition-all">
        View details <ArrowRight size={18} />
      </Link>
    </div>
  );
}

function CheckMark() {
  return <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-black">✓</span>;
}
