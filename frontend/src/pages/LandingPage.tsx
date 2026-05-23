import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShoppingBag, Zap, ShieldCheck, TrendingUp,
  ChevronRight, Star, ArrowRight, Smartphone,
  Store, MessageCircle, BarChart3, Sparkles, IndianRupee
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 80);
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    setMousePos({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  };

  const tiltX = (mousePos.y - 0.5) * -10;
  const tiltY = (mousePos.x - 0.5) * 10;

  return (
    <div className="min-h-screen bg-[#060818] text-white font-sans overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { font-family: 'Inter', sans-serif; }

        .mesh-bg {
          background:
            radial-gradient(ellipse 80% 60% at 50% -10%, rgba(255,107,53,0.18) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 80%, rgba(99,102,241,0.12) 0%, transparent 50%),
            radial-gradient(ellipse 50% 50% at 10% 60%, rgba(16,185,129,0.08) 0%, transparent 50%),
            #060818;
        }

        .glass {
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .glass-warm {
          background: rgba(255,107,53,0.06);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,107,53,0.15);
        }

        .glow-orange {
          box-shadow: 0 0 40px rgba(255,107,53,0.35), 0 0 80px rgba(255,107,53,0.15);
        }

        .glow-text {
          text-shadow: 0 0 60px rgba(255,107,53,0.5);
        }

        @keyframes floatA {
          0%,100% { transform: translate3d(0,0,0) rotate(0deg); }
          33% { transform: translate3d(8px,-14px,0) rotate(2deg); }
          66% { transform: translate3d(-6px,-8px,0) rotate(-1deg); }
        }
        @keyframes floatB {
          0%,100% { transform: translate3d(0,0,0) rotate(0deg); }
          50% { transform: translate3d(-12px,-18px,0) rotate(-2deg); }
        }
        @keyframes fadeSlideUp {
          from { opacity:0; transform: translateY(32px); }
          to   { opacity:1; transform: translateY(0); }
        }
        @keyframes scanline {
          0% { top: -8%; }
          100% { top: 108%; }
        }
        @keyframes shimmerBtn {
          0%,60% { left:-70%; }
          100% { left:140%; }
        }
        @keyframes pulseRing {
          0%,100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.5); }
          50% { box-shadow: 0 0 0 8px rgba(16,185,129,0); }
        }
        @keyframes gradientShift {
          0%,100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes orbPulse {
          0%,100% { opacity:0.5; transform: scale(1); }
          50% { opacity:0.8; transform: scale(1.1); }
        }

        .float-a { animation: floatA 8s ease-in-out infinite; }
        .float-b { animation: floatB 10s ease-in-out infinite; }

        .hero-visible { animation: fadeSlideUp 0.9s cubic-bezier(0.2,0.8,0.2,1) forwards; }
        .hero-hidden { opacity:0; }

        .stagger-1 { animation-delay: 0.05s; }
        .stagger-2 { animation-delay: 0.15s; }
        .stagger-3 { animation-delay: 0.28s; }
        .stagger-4 { animation-delay: 0.4s; }
        .stagger-5 { animation-delay: 0.55s; }

        .shimmer-btn {
          position: relative;
          overflow: hidden;
        }
        .shimmer-btn::after {
          content:'';
          position:absolute;
          inset:-120% auto auto -60%;
          width:60%; height:300%;
          background: linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent);
          transform: rotate(18deg);
          animation: shimmerBtn 3.5s ease-in-out infinite;
        }

        .card-3d {
          transition: transform 0.4s cubic-bezier(0.2,0.8,0.2,1), box-shadow 0.4s ease;
          transform-style: preserve-3d;
        }
        .card-3d:hover {
          transform: translateY(-8px) rotateX(4deg) rotateY(-2deg);
          box-shadow: 0 32px 64px -16px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08);
        }

        .pricing-3d {
          transition: transform 0.4s cubic-bezier(0.2,0.8,0.2,1), box-shadow 0.4s ease;
        }
        .pricing-3d:hover {
          transform: translateY(-12px) scale(1.02);
        }

        .step-line {
          position:absolute;
          top:50%; left:calc(100% + 1px);
          width:100%; height:1px;
          background: linear-gradient(90deg, rgba(255,107,53,0.4), transparent);
        }

        .animated-gradient {
          background: linear-gradient(270deg, #ff6b35, #e55a24, #ff9a6c, #ff6b35);
          background-size: 300% 300%;
          animation: gradientShift 4s ease infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .orb {
          position:absolute;
          border-radius:50%;
          filter: blur(60px);
          animation: orbPulse 6s ease-in-out infinite;
          pointer-events:none;
        }

        .stat-badge {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(12px);
          border-radius:16px;
          padding: 12px 16px;
        }
      `}</style>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50" style={{
        background: 'rgba(6,8,24,0.7)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between" style={{ height: 72 }}>
          <div className="flex items-center gap-3">
            <div style={{
              width: 42, height: 42, borderRadius: 14,
              background: 'linear-gradient(135deg, #ff6b35 0%, #e55a24 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(255,107,53,0.4)',
            }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 20, fontStyle: 'italic' }}>F</span>
            </div>
            <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.03em' }}>
              Fera<span style={{ color: '#ff6b35' }}>Setu</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {['How it works', 'Benefits', 'Pricing'].map((item, i) => (
              <a key={i} href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.6)', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}>
                {item}
              </a>
            ))}
            <Link to="/login" style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Sign in</Link>
            <Link to="/register" className="shimmer-btn" style={{
              padding: '10px 22px', borderRadius: 50,
              background: 'linear-gradient(135deg, #ff6b35, #e55a24)',
              color: '#fff', fontSize: 14, fontWeight: 700,
              boxShadow: '0 4px 20px rgba(255,107,53,0.4)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              display: 'inline-block',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 6px 30px rgba(255,107,53,0.55)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(255,107,53,0.4)'; }}>
              Start Your Shop
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mesh-bg relative overflow-hidden" style={{ paddingTop: 160, paddingBottom: 120 }}
        ref={heroRef} onMouseMove={handleMouseMove}>

        <div className="orb" style={{ width: 600, height: 600, top: -200, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,107,53,0.12)' }} />
        <div className="orb" style={{ width: 400, height: 400, bottom: -100, right: -100, background: 'rgba(99,102,241,0.1)', animationDelay: '2s' }} />

        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">

          {/* Badge */}
          <div className={`inline-flex items-center gap-2 mb-8 ${isVisible ? 'hero-visible stagger-1' : 'hero-hidden'}`}
            style={{ padding: '8px 18px', borderRadius: 50, background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.25)', backdropFilter: 'blur(12px)' }}>
            <Sparkles size={14} style={{ color: '#ff6b35' }} />
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid rgba(255,107,53,0.4)', overflow: 'hidden', background: '#1e293b' }}>
                  <img src={`https://i.pravatar.cc/100?u=${i + 10}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#ff9a6c' }}>10,000+ Indian shopkeepers joined</span>
          </div>

          {/* Headline */}
          <h1 className={`${isVisible ? 'hero-visible stagger-2' : 'hero-hidden'}`}
            style={{ fontSize: 'clamp(42px,7vw,88px)', fontWeight: 900, lineHeight: 1.02, letterSpacing: '-0.04em', marginBottom: 28 }}>
            Grow your business
            <br />
            <span className="animated-gradient glow-text">online in 2 minutes.</span>
          </h1>

          <p className={`${isVisible ? 'hero-visible stagger-3' : 'hero-hidden'}`}
            style={{ maxWidth: 560, margin: '0 auto 40px', fontSize: 18, fontWeight: 500, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>
            Build your shop website, manage products, and grow orders with AI.{' '}
            <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>Dukaan ko online lao, orders WhatsApp par pao.</span>
          </p>

          {/* CTAs */}
          <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 ${isVisible ? 'hero-visible stagger-4' : 'hero-hidden'}`}>
            <Link to="/register" className="shimmer-btn" style={{
              padding: '18px 40px', borderRadius: 20,
              background: 'linear-gradient(135deg, #ff6b35 0%, #e55a24 100%)',
              color: '#fff', fontSize: 18, fontWeight: 900,
              boxShadow: '0 8px 40px rgba(255,107,53,0.45), 0 0 0 1px rgba(255,107,53,0.2)',
              display: 'inline-flex', alignItems: 'center', gap: 10,
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = '0 12px 50px rgba(255,107,53,0.6)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 8px 40px rgba(255,107,53,0.45)'; }}>
              Start Your Shop Now <ChevronRight size={20} strokeWidth={3} />
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 24px' }}>
              <div style={{ display: 'flex', color: '#ff6b35' }}>
                {[1, 2, 3, 4, 5].map(i => <Star key={i} size={16} fill="currentColor" />)}
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>4.9/5 Rating</span>
            </div>
          </div>

          {/* 3D Mockup */}
          <div className={`${isVisible ? 'hero-visible stagger-5' : 'hero-hidden'}`}
            style={{
              perspective: 1200,
              maxWidth: 960,
              margin: '0 auto',
            }}>
            <div style={{
              transform: `rotateX(${tiltX * 0.5}deg) rotateY(${tiltY * 0.5}deg)`,
              transition: 'transform 0.1s linear',
              transformStyle: 'preserve-3d',
              borderRadius: 32,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: 6,
              boxShadow: '0 60px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
            }}>
              <div style={{ borderRadius: 28, overflow: 'hidden', position: 'relative', aspectRatio: '16/8' }}>
                <img
                  src="https://images.unsplash.com/photo-1556742044-3c52d6e88c62?auto=format&fit=crop&q=80&w=2000"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.7) saturate(1.2)' }}
                  alt="FeraSetu Dashboard"
                />
                {/* Overlay grid */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(135deg, rgba(255,107,53,0.15) 0%, rgba(6,8,24,0.4) 100%)',
                }} />
                {/* Scanline effect */}
                <div style={{
                  position: 'absolute', left: 0, right: 0, height: '8%',
                  background: 'linear-gradient(0deg,transparent,rgba(255,255,255,0.04),transparent)',
                  animation: 'scanline 3s linear infinite',
                }} />
                {/* Live badge */}
                <div style={{
                  position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
                  padding: '12px 24px', borderRadius: 50,
                  background: 'rgba(6,8,24,0.8)', backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  display: 'flex', alignItems: 'center', gap: 10,
                  whiteSpace: 'nowrap',
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', animation: 'pulseRing 2s infinite' }} />
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Your store is live & ready to sell</span>
                </div>

                {/* Floating stat badges */}
                <div className="stat-badge float-a" style={{ position: 'absolute', top: 24, left: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Today's Revenue</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>₹12,480</div>
                  <div style={{ fontSize: 12, color: '#10B981', fontWeight: 700, marginTop: 2 }}>↑ 23% vs yesterday</div>
                </div>
                <div className="stat-badge float-b" style={{ position: 'absolute', top: 24, right: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>New Orders</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>47</div>
                  <div style={{ fontSize: 12, color: '#ff6b35', fontWeight: 700, marginTop: 2 }}>+8 pending</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted by logos strip */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '28px 0', background: 'rgba(255,255,255,0.015)' }}>
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-center gap-10">
          {['Delhi', 'Mumbai', 'Bangalore', 'Kolkata', 'Chennai', 'Hyderabad', 'Pune'].map(city => (
            <div key={city} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: 700 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff6b35', opacity: 0.6 }} />
              {city}
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <section id="how-it-works" style={{ padding: '120px 0', background: 'rgba(255,255,255,0.01)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 50, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', marginBottom: 20 }}>
              <Zap size={13} style={{ color: '#818cf8' }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Super Simple</span>
            </div>
            <h2 style={{ fontSize: 'clamp(32px,5vw,56px)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 16 }}>
              Start selling in{' '}
              <span style={{ color: '#ff6b35' }}>3 simple steps</span>
            </h2>
            <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>No technical skills needed. Bilkul aasan.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8" style={{ position: 'relative' }}>
            {[
              { num: '01', title: 'Create Shop', desc: 'Apni shop ka naam daalein aur mobile number se verify karein.', icon: <Store size={28} />, color: '#ff6b35', glow: 'rgba(255,107,53,0.2)' },
              { num: '02', title: 'Add Products', desc: 'Products ki photos kheinchein aur price set karein instantly.', icon: <ShoppingBag size={28} />, color: '#6366f1', glow: 'rgba(99,102,241,0.2)' },
              { num: '03', title: 'Share & Sell', desc: 'Link ko WhatsApp pe share karein aur orders lena shuru karein.', icon: <Zap size={28} />, color: '#10b981', glow: 'rgba(16,185,129,0.2)' },
            ].map((step, i) => (
              <div key={i} className="card-3d" style={{
                padding: 40,
                borderRadius: 28,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                border: '1px solid rgba(255,255,255,0.07)',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: step.glow, filter: 'blur(30px)' }} />
                <div style={{ fontSize: 12, fontWeight: 900, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 24 }}>{step.num}</div>
                <div style={{
                  width: 56, height: 56, borderRadius: 18,
                  background: `${step.glow}`,
                  border: `1px solid ${step.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: step.color, marginBottom: 28,
                  boxShadow: `0 8px 24px ${step.glow}`,
                }}>
                  {step.icon}
                </div>
                <h3 style={{ fontSize: 24, fontWeight: 900, marginBottom: 12, letterSpacing: '-0.02em' }}>{step.title}</h3>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, fontWeight: 500 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" style={{ padding: '120px 0' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 50, background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.2)', marginBottom: 24 }}>
                <TrendingUp size={13} style={{ color: '#ff6b35' }} />
                <span style={{ fontSize: 12, fontWeight: 800, color: '#ff6b35', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Why FeraSetu</span>
              </div>
              <h2 style={{ fontSize: 'clamp(32px,4vw,52px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 40 }}>
                Designed for the{' '}
                <span style={{ color: '#ff6b35' }}>modern shopkeeper.</span>
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                {[
                  { title: 'Know your profit instantly', desc: 'Calculation ki tension khatam. Har order pe apna profit dekhein.', icon: <TrendingUp size={22} />, color: '#ff6b35' },
                  { title: 'Sell on WhatsApp effortlessly', desc: 'Customers ko professional link bhejein, purane tarike chhodein.', icon: <MessageCircle size={22} />, color: '#10b981' },
                  { title: 'Safe & Secure', desc: 'Aapka data hamesha secure rehta hai. Trust of 10k+ users.', icon: <ShieldCheck size={22} />, color: '#6366f1' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 20 }}>
                    <div style={{
                      flexShrink: 0, width: 52, height: 52, borderRadius: 18,
                      background: `${item.color}15`, border: `1px solid ${item.color}25`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: item.color, boxShadow: `0 8px 24px ${item.color}20`,
                    }}>
                      {item.icon}
                    </div>
                    <div>
                      <h4 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.02em' }}>{item.title}</h4>
                      <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, fontWeight: 500 }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3D Stats Card */}
            <div style={{ perspective: 800 }}>
              <div className="card-3d" style={{
                borderRadius: 40,
                padding: 52,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 40px 80px rgba(0,0,0,0.4)',
              }}>
                <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,107,53,0.15)', filter: 'blur(40px)' }} />
                <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', filter: 'blur(40px)' }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: 80, fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1, background: 'linear-gradient(135deg,#ff6b35,#ff9a6c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: 12 }}>40%</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 40, lineHeight: 1.5 }}>Average sales increase for<br />shopkeepers using FeraSetu.</div>

                  <div className="grid grid-cols-2 gap-4" style={{ marginBottom: 36 }}>
                    {[
                      { val: '10K+', label: 'Shops', color: '#ff6b35' },
                      { val: '₹2Cr+', label: 'Revenue Processed', color: '#10b981' },
                      { val: '22+', label: 'Languages', color: '#6366f1' },
                      { val: '99.9%', label: 'Uptime', color: '#f59e0b' },
                    ].map((stat, i) => (
                      <div key={i} style={{ padding: '16px 20px', borderRadius: 18, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: stat.color, letterSpacing: '-0.03em' }}>{stat.val}</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginTop: 4 }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  <Link to="/register" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 10,
                    padding: '14px 28px', borderRadius: 50,
                    background: 'linear-gradient(135deg,#ff6b35,#e55a24)',
                    color: '#fff', fontWeight: 800, fontSize: 16,
                    boxShadow: '0 8px 30px rgba(255,107,53,0.4)',
                    transition: 'transform 0.2s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                    Grow your business today <ArrowRight size={18} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section style={{ padding: '120px 0', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-5xl mx-auto px-6">
          <div style={{
            padding: '60px 64px', borderRadius: 40,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: -60, left: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,107,53,0.1)', filter: 'blur(50px)' }} />
            <div style={{ display: 'flex', gap: 4, color: '#ff6b35', marginBottom: 28, position: 'relative', zIndex: 1 }}>
              {[1, 2, 3, 4, 5].map(i => <Star key={i} size={22} fill="currentColor" />)}
            </div>
            <blockquote style={{ fontSize: 'clamp(20px,3vw,30px)', fontWeight: 700, lineHeight: 1.5, fontStyle: 'italic', color: 'rgba(255,255,255,0.85)', marginBottom: 40, position: 'relative', zIndex: 1 }}>
              "Pehle register maintain karna mushkil tha. Ab FeraSetu se sab phone pe hai. Sales bhi badhi hai aur tension bhi kam hui hai."
            </blockquote>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative', zIndex: 1 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 18,
                background: 'linear-gradient(135deg,#ff6b35,#e55a24)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: 18, boxShadow: '0 8px 24px rgba(255,107,53,0.35)',
              }}>RK</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>Rajesh Kumar</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>Kirana Store Owner, Delhi</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: '120px 0' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 50, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', marginBottom: 20 }}>
              <ShieldCheck size={13} style={{ color: '#10b981' }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Simple Pricing</span>
            </div>
            <h2 style={{ fontSize: 'clamp(32px,5vw,60px)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 16 }}>
              Start small. Upgrade when <span style={{ color: '#ff6b35' }}>orders grow.</span>
            </h2>
            <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>Designed to feel safe for small shops and powerful at scale.</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 items-stretch">
            <PricingCard
              icon={<Smartphone size={22} />}
              name="Starter"
              price="199"
              desc="Launch your online catalog and accept local orders."
              features={['100 products', 'FeraSetu shop link', 'Basic AI help']}
              featured={false}
            />
            <PricingCard
              icon={<TrendingUp size={22} />}
              name="Growth"
              price="499"
              desc="Custom domain, premium templates, and growth analytics."
              features={['1,000 products', 'Custom domain support', 'Advanced AI & analytics']}
              featured={true}
            />
            <PricingCard
              icon={<BarChart3 size={22} />}
              name="Scale"
              price="999"
              desc="For serious retailers with more products and staff."
              features={['Unlimited products', 'Sales prediction', 'Onboarding help']}
              featured={false}
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ padding: '80px 0 120px' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div style={{
            borderRadius: 48,
            padding: '80px 64px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, rgba(255,107,53,0.2) 0%, rgba(229,90,36,0.15) 50%, rgba(99,102,241,0.12) 100%)',
            border: '1px solid rgba(255,107,53,0.2)',
            boxShadow: '0 40px 80px rgba(255,107,53,0.12)',
          }}>
            <div style={{ position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)', width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,107,53,0.15)', filter: 'blur(80px)' }} />
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px,transparent 1px)', backgroundSize: '32px 32px' }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <IndianRupee size={40} style={{ color: '#ff6b35', margin: '0 auto 24px', display: 'block', opacity: 0.8 }} />
              <h2 style={{ fontSize: 'clamp(32px,5vw,64px)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 20 }}>Ab aapki baari hai.</h2>
              <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginBottom: 44, maxWidth: 480, margin: '0 auto 44px' }}>
                Join 10,000+ smart shopkeepers. Bilkul free se shuru karein.
              </p>
              <Link to="/register" className="shimmer-btn" style={{
                display: 'inline-flex', alignItems: 'center', gap: 12,
                padding: '20px 52px', borderRadius: 24,
                background: 'linear-gradient(135deg,#ff6b35,#e55a24)',
                color: '#fff', fontSize: 20, fontWeight: 900,
                boxShadow: '0 16px 60px rgba(255,107,53,0.5)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 20px 70px rgba(255,107,53,0.65)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 16px 60px rgba(255,107,53,0.5)'; }}>
                Create Your Store <ArrowRight size={22} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '40px 0' }}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg,#ff6b35,#e55a24)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(255,107,53,0.3)',
            }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 16, fontStyle: 'italic' }}>F</span>
            </div>
            <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.03em' }}>Fera<span style={{ color: '#ff6b35' }}>Setu</span></span>
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.25)' }}>
            © {new Date().getFullYear()} FeraSetu. Your shop's digital bridge.
          </p>
        </div>
      </footer>
    </div>
  );
}

function PricingCard({ icon, name, price, desc, features, featured }: any) {
  return (
    <div className="pricing-3d" style={{
      borderRadius: 32, padding: 40,
      background: featured
        ? 'linear-gradient(135deg, rgba(255,107,53,0.15) 0%, rgba(229,90,36,0.08) 100%)'
        : 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
      border: featured ? '1px solid rgba(255,107,53,0.3)' : '1px solid rgba(255,255,255,0.07)',
      boxShadow: featured ? '0 24px 60px rgba(255,107,53,0.15), 0 0 0 1px rgba(255,107,53,0.15)' : 'none',
      position: 'relative',
      overflow: 'hidden',
      marginTop: featured ? 0 : 0,
      transform: featured ? 'scale(1.03)' : 'scale(1)',
    }}>
      {featured && (
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          padding: '6px 20px', borderRadius: '0 0 16px 16px',
          background: 'linear-gradient(135deg,#ff6b35,#e55a24)',
          fontSize: 11, fontWeight: 900, color: '#fff',
          textTransform: 'uppercase', letterSpacing: '0.08em',
          boxShadow: '0 4px 20px rgba(255,107,53,0.4)',
        }}>Best Value</div>
      )}
      {featured && <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,107,53,0.15)', filter: 'blur(30px)' }} />}

      <div style={{
        width: 52, height: 52, borderRadius: 18,
        background: featured ? 'rgba(255,107,53,0.2)' : 'rgba(255,255,255,0.06)',
        border: featured ? '1px solid rgba(255,107,53,0.3)' : '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: featured ? '#ff6b35' : 'rgba(255,255,255,0.6)',
        marginBottom: 24, marginTop: featured ? 24 : 0,
      }}>
        {icon}
      </div>

      <h3 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 10 }}>{name}</h3>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: 500, lineHeight: 1.6, minHeight: 48 }}>{desc}</p>

      <div style={{ margin: '28px 0', display: 'flex', alignItems: 'flex-end', gap: 4 }}>
        <span style={{ fontSize: 20, fontWeight: 900, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>₹</span>
        <span style={{ fontSize: 56, fontWeight: 900, letterSpacing: '-0.04em', color: featured ? '#ff6b35' : '#fff', lineHeight: 1 }}>{price}</span>
        <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.3)', fontWeight: 700, marginBottom: 6 }}>/mo</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
        {features.map((f: string) => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              background: featured ? 'rgba(255,107,53,0.2)' : 'rgba(255,255,255,0.08)',
              color: featured ? '#ff6b35' : 'rgba(255,255,255,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 900, flexShrink: 0,
            }}>✓</div>
            {f}
          </div>
        ))}
      </div>

      <Link to="/upgrade" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        width: '100%', padding: '14px 0', borderRadius: 50,
        background: featured ? 'linear-gradient(135deg,#ff6b35,#e55a24)' : 'rgba(255,255,255,0.08)',
        border: featured ? 'none' : '1px solid rgba(255,255,255,0.12)',
        color: '#fff', fontWeight: 800, fontSize: 15,
        boxShadow: featured ? '0 8px 30px rgba(255,107,53,0.35)' : 'none',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
        View details <ArrowRight size={16} />
      </Link>
    </div>
  );
}
