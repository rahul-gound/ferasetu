import { useEffect, useState, useRef, Suspense, lazy, Component } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useReducedMotion, useSpring } from 'framer-motion';
import {
  ShoppingBag, Zap, ShieldCheck, TrendingUp,
  ChevronRight, Star, ArrowRight, Smartphone,
  Store, MessageCircle, BarChart3, Sparkles, IndianRupee,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Heavy WebGL hero — code-split so three.js only loads when the scene renders.
const HeroScene = lazy(() => import('../components/three/HeroScene'));

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  // User can opt into full animation even if the OS has reduced-motion on.
  const [forceMotion, setForceMotion] = useState(false);
  const reduceMotion = !!prefersReducedMotion && !forceMotion;
  // Only mount the WebGL hero when motion is allowed; SceneBoundary catches any
  // WebGL failure and falls back to the CSS aurora below.
  const enable3D = !reduceMotion;
  const heroRef = useRef<HTMLDivElement>(null);

  const { scrollY, scrollYProgress } = useScroll();
  // Smooth scroll-progress bar (completion drive).
  const progressScaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });
  // Parallax: background layers drift slower/faster than scroll for depth.
  const orbY1 = useTransform(scrollY, [0, 800], [0, reduceMotion ? 0 : 160]);
  const orbY2 = useTransform(scrollY, [0, 800], [0, reduceMotion ? 0 : -120]);
  const gridY = useTransform(scrollY, [0, 800], [0, reduceMotion ? 0 : 120]);
  const heroFade = useTransform(scrollY, [0, 500], [1, reduceMotion ? 1 : 0.25]);
  const heroLift = useTransform(scrollY, [0, 500], [0, reduceMotion ? 0 : -60]);

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 80);
    if (user) navigate('/dashboard');
    return () => clearTimeout(t);
  }, [user, navigate]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!heroRef.current || reduceMotion) return;
    const rect = heroRef.current.getBoundingClientRect();
    setMousePos({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  };

  // Mouse-driven 3D tilt for the hero scene.
  const tiltX = (mousePos.y - 0.5) * -12;
  const tiltY = (mousePos.x - 0.5) * 12;
  // Depth offsets — each layer shifts a different amount for parallax inside the scene.
  const depth = (factor: number) => ({
    transform: `translate3d(${(mousePos.x - 0.5) * factor}px, ${(mousePos.y - 0.5) * factor}px, 0)`,
  });

  return (
    <div className="min-h-screen bg-[#060818] text-white overflow-x-hidden" style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}>
      <style>{`
        h1,h2,h3,h4,.font-display { font-family: 'Outfit', sans-serif; }
        body, p, span, a, div { font-family: 'Work Sans', 'Outfit', sans-serif; }

        .aurora {
          background:
            radial-gradient(ellipse 70% 50% at 50% -10%, rgba(255,107,53,0.22) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 85% 30%, rgba(99,102,241,0.16) 0%, transparent 55%),
            radial-gradient(ellipse 60% 50% at 10% 70%, rgba(16,185,129,0.10) 0%, transparent 55%),
            #060818;
        }
        .aurora::before {
          content:''; position:absolute; inset:-20%;
          background:
            conic-gradient(from 0deg at 30% 30%, rgba(255,107,53,0.10), transparent 40%),
            conic-gradient(from 180deg at 70% 60%, rgba(99,102,241,0.10), transparent 40%);
          filter: blur(60px);
          animation: auroraSpin 24s linear infinite;
          pointer-events:none;
        }
        @keyframes auroraSpin { to { transform: rotate(360deg); } }

        /* 3D perspective grid floor */
        .grid-floor {
          position:absolute; left:50%; bottom:-2px; width:200%; height:60%;
          transform: translateX(-50%) perspective(420px) rotateX(70deg);
          transform-origin: bottom center;
          background-image:
            linear-gradient(rgba(255,107,53,0.18) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,107,53,0.18) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: linear-gradient(to top, #000 0%, transparent 75%);
          -webkit-mask-image: linear-gradient(to top, #000 0%, transparent 75%);
          animation: gridMove 6s linear infinite;
          pointer-events:none;
        }
        @keyframes gridMove { to { background-position: 0 56px; } }

        .glass {
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.09);
        }
        .glow-text { text-shadow: 0 0 60px rgba(255,107,53,0.5); }

        @keyframes floatA { 0%,100%{transform:translate3d(0,0,40px) rotate(0)} 33%{transform:translate3d(8px,-14px,40px) rotate(2deg)} 66%{transform:translate3d(-6px,-8px,40px) rotate(-1deg)} }
        @keyframes floatB { 0%,100%{transform:translate3d(0,0,60px) rotate(0)} 50%{transform:translate3d(-12px,-18px,60px) rotate(-2deg)} }
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scanline { 0%{top:-8%} 100%{top:108%} }
        @keyframes shimmerBtn { 0%,60%{left:-70%} 100%{left:140%} }
        @keyframes pulseRing { 0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,0.5)} 50%{box-shadow:0 0 0 8px rgba(16,185,129,0)} }
        @keyframes gradientShift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes iconFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
        @keyframes spinSlow { to { transform: rotate(360deg); } }

        /* Continuous subtle float for icons/badges */
        .icon-float { animation: iconFloat 4.5s ease-in-out infinite; }

        /* Infinite city marquee */
        .marquee-mask { overflow:hidden; -webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent); mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent); }
        .marquee-track { display:flex; gap:40px; width:max-content; animation: marquee 32s linear infinite; }
        .marquee-mask:hover .marquee-track { animation-play-state: paused; }

        .float-a { animation: floatA 8s ease-in-out infinite; }
        .float-b { animation: floatB 10s ease-in-out infinite; }
        .hero-visible { animation: fadeSlideUp 0.9s cubic-bezier(0.2,0.8,0.2,1) forwards; }
        .hero-hidden { opacity:0; }
        .stagger-1{animation-delay:.05s}.stagger-2{animation-delay:.15s}.stagger-3{animation-delay:.28s}.stagger-4{animation-delay:.4s}.stagger-5{animation-delay:.55s}

        .shimmer-btn { position:relative; overflow:hidden; }
        .shimmer-btn::after {
          content:''; position:absolute; inset:-120% auto auto -60%;
          width:60%; height:300%;
          background: linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent);
          transform: rotate(18deg); animation: shimmerBtn 3.5s ease-in-out infinite;
        }

        .card-3d { transition: transform .4s cubic-bezier(0.2,0.8,0.2,1), box-shadow .4s ease; transform-style: preserve-3d; }
        .card-3d:hover { transform: translateY(-10px) rotateX(6deg) rotateY(-3deg); box-shadow: 0 36px 70px -16px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.1); }
        .pricing-3d { transition: transform .4s cubic-bezier(0.2,0.8,0.2,1); }
        .pricing-3d:hover { transform: translateY(-12px) scale(1.02); }

        .animated-gradient {
          background: linear-gradient(270deg,#ff6b35,#e55a24,#ff9a6c,#ff6b35);
          background-size: 300% 300%; animation: gradientShift 4s ease infinite;
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
        }
        .orb { position:absolute; border-radius:50%; filter:blur(70px); pointer-events:none; }
        .stat-badge { background: rgba(8,10,28,0.7); border:1px solid rgba(255,255,255,0.12); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border-radius:16px; padding:12px 16px; }

        @media (prefers-reduced-motion: reduce) {
          .aurora::before, .grid-floor, .float-a, .float-b, .shimmer-btn::after, .icon-float { animation: none !important; }
          .marquee-track { animation: none !important; flex-wrap: wrap; justify-content: center; width: 100% !important; }
          .hero-hidden { opacity: 1 !important; }
          .card-3d:hover { transform: translateY(-4px); }
        }
      `}</style>

      {/* Scroll progress bar — completion drive */}
      <motion.div
        aria-hidden="true"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 60, transformOrigin: '0%',
          scaleX: progressScaleX,
          background: 'linear-gradient(90deg,#ff6b35,#ff9a6c,#6366f1)',
          boxShadow: '0 0 12px rgba(255,107,53,0.6)',
        }}
      />

      {/* Live activity ticker — real social proof */}
      <ActivityTicker forceMotion={forceMotion} />

      {/* Navigation */}
      <motion.nav
        initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        className="fixed top-0 w-full z-50" style={{ background: 'rgba(6,8,24,0.7)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between" style={{ height: 72 }}>
          <div className="flex items-center gap-3">
            <div style={{ width: 42, height: 42, borderRadius: 14, background: 'linear-gradient(135deg,#ff6b35,#e55a24)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(255,107,53,0.4)' }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 20, fontStyle: 'italic' }}>F</span>
            </div>
            <span className="font-display" style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.03em' }}>
              Fera<span style={{ color: '#ff6b35' }}>Setu</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {['How it works', 'Benefits', 'Pricing'].map((item, i) => (
              <a key={i} href={`#${item.toLowerCase().replace(/ /g, '-')}`} className="cursor-pointer"
                style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.6)', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}>
                {item}
              </a>
            ))}
            <Link to="/login" className="cursor-pointer" style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Sign in</Link>
            <Link to="/register" className="shimmer-btn cursor-pointer" style={{ padding: '10px 22px', borderRadius: 50, background: 'linear-gradient(135deg,#ff6b35,#e55a24)', color: '#fff', fontSize: 14, fontWeight: 700, boxShadow: '0 4px 20px rgba(255,107,53,0.4)', transition: 'transform 0.2s, box-shadow 0.2s', display: 'inline-block' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 6px 30px rgba(255,107,53,0.55)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(255,107,53,0.4)'; }}>
              Start Your Shop
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="aurora relative overflow-hidden" style={{ minHeight: '100vh', paddingTop: 150, paddingBottom: 120 }} ref={heroRef} onMouseMove={handleMouseMove}>
        <motion.div className="orb" style={{ y: orbY1, width: 600, height: 600, top: -200, left: '50%', x: '-50%', background: 'rgba(255,107,53,0.16)' }} />
        <motion.div className="orb" style={{ y: orbY2, width: 420, height: 420, bottom: -120, right: -100, background: 'rgba(99,102,241,0.12)' }} />
        <motion.div className="grid-floor" style={{ y: gridY }} />

        {/* Cursor-following spotlight glow — premium interactive light */}
        {!prefersReducedMotion && (
          <div aria-hidden="true" style={{
            position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
            background: `radial-gradient(600px circle at ${mousePos.x * 100}% ${mousePos.y * 100}%, rgba(255,107,53,0.13), transparent 42%)`,
            transition: 'background 0.12s ease-out',
          }} />
        )}

        {/* Immersive WebGL 3D layer — fills the first viewport, never blocks interaction */}
        {enable3D && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100vh', zIndex: 2, pointerEvents: 'none' }} aria-hidden="true">
            <SceneBoundary>
              <Suspense fallback={null}>
                <HeroScene reducedMotion={reduceMotion} />
              </Suspense>
            </SceneBoundary>
          </div>
        )}

        <motion.div className="max-w-7xl mx-auto px-6 text-center relative z-10" style={{ opacity: heroFade, y: heroLift }}>
          {/* Badge */}
          <div className={`inline-flex items-center gap-2 mb-8 ${isVisible ? 'hero-visible stagger-1' : 'hero-hidden'}`}
            style={{ padding: '8px 18px', borderRadius: 50, background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.25)', backdropFilter: 'blur(12px)' }}>
            <Sparkles size={14} style={{ color: '#ff6b35' }} aria-hidden="true" />
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid rgba(255,107,53,0.4)', overflow: 'hidden', background: '#1e293b' }}>
                  <img src={`https://i.pravatar.cc/100?u=${i + 10}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                </div>
              ))}
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#ff9a6c' }}>10,000+ Indian shopkeepers joined</span>
          </div>

          {/* Headline */}
          <h1 className={`font-display ${isVisible ? 'hero-visible stagger-2' : 'hero-hidden'}`}
            style={{ fontSize: 'clamp(44px,8vw,96px)', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.05em', marginBottom: 28 }}>
            Grow your business
            <br />
            <span className="animated-gradient glow-text">online in 2 minutes.</span>
          </h1>

          <p className={`${isVisible ? 'hero-visible stagger-3' : 'hero-hidden'}`}
            style={{ maxWidth: 560, margin: '0 auto 40px', fontSize: 18, fontWeight: 500, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
            Build your shop website, manage products, and grow orders with AI.{' '}
            <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>Dukaan ko online lao, orders WhatsApp par pao.</span>
          </p>

          {/* CTAs */}
          <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-24 ${isVisible ? 'hero-visible stagger-4' : 'hero-hidden'}`}>
            <MagneticCTA to="/register">
              Start Your Shop Now <ChevronRight size={20} strokeWidth={3} aria-hidden="true" />
            </MagneticCTA>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 24px' }}>
              <div style={{ display: 'flex', color: '#ff6b35' }} aria-hidden="true">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} size={16} fill="currentColor" />)}
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>4.9/5 Rating</span>
            </div>
          </div>

          {/* Motion opt-in — only shown when the device has reduced-motion enabled */}
          {prefersReducedMotion && !forceMotion && (
            <button
              type="button"
              onClick={() => setForceMotion(true)}
              className="cursor-pointer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, margin: '-8px auto 32px',
                padding: '10px 20px', borderRadius: 50, background: 'rgba(255,107,53,0.12)',
                border: '1px solid rgba(255,107,53,0.3)', color: '#ff9a6c', fontSize: 13, fontWeight: 700,
                backdropFilter: 'blur(12px)', transition: 'transform 0.2s, background 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.background = 'rgba(255,107,53,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(255,107,53,0.12)'; }}
            >
              <Sparkles size={14} aria-hidden="true" />
              Reduced Motion is on — tap to experience the full 3D
            </button>
          )}

          {/* 3D Layered Mockup */}
          <div className={`${isVisible ? 'hero-visible stagger-5' : 'hero-hidden'}`} style={{ perspective: 1400, maxWidth: 980, margin: '0 auto' }}>
            <div style={{
              transform: `rotateX(${tiltX * 0.6}deg) rotateY(${tiltY * 0.6}deg)`,
              transition: 'transform 0.15s ease-out', transformStyle: 'preserve-3d',
              borderRadius: 32, background: 'linear-gradient(135deg, rgba(255,255,255,0.09), rgba(255,255,255,0.03))',
              border: '1px solid rgba(255,255,255,0.12)', padding: 6,
              boxShadow: '0 60px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
            }}>
              <div style={{ borderRadius: 28, overflow: 'hidden', position: 'relative', aspectRatio: '16/8', transformStyle: 'preserve-3d' }}>
                <img src="/hero/dashboard.webp"
                  onError={(e) => { const img = e.currentTarget; if (!img.dataset.fb) { img.dataset.fb = '1'; img.src = 'https://images.unsplash.com/photo-1556742044-3c52d6e88c62?auto=format&fit=crop&q=80&w=2000'; } }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.7) saturate(1.2)' }}
                  alt="FeraSetu seller dashboard preview" loading="lazy" />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,107,53,0.15), rgba(6,8,24,0.45))' }} />
                <div style={{ position: 'absolute', left: 0, right: 0, height: '8%', background: 'linear-gradient(0deg,transparent,rgba(255,255,255,0.05),transparent)', animation: 'scanline 3s linear infinite' }} />

                {/* Live badge — depth layer */}
                <div className="stat-badge" style={{ position: 'absolute', bottom: 24, left: '50%', borderRadius: 50, display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap', transform: `translateX(-50%) translate3d(${(mousePos.x - 0.5) * 14}px, ${(mousePos.y - 0.5) * 14}px, 0)` }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', animation: 'pulseRing 2s infinite' }} />
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Your store is live & ready to sell</span>
                </div>

                {/* Floating stat badges — separated in Z for real depth */}
                <div className="stat-badge float-a" style={{ position: 'absolute', top: 24, left: 24, ...depth(26) }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Today's Revenue</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>₹12,480</div>
                  <div style={{ fontSize: 12, color: '#10B981', fontWeight: 700, marginTop: 2 }}>↑ 23% vs yesterday</div>
                </div>
                <div className="stat-badge float-b" style={{ position: 'absolute', top: 24, right: 24, ...depth(34) }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>New Orders</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>47</div>
                  <div style={{ fontSize: 12, color: '#ff6b35', fontWeight: 700, marginTop: 2 }}>+8 pending</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Trusted by cities strip — infinite marquee */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '28px 0', background: 'rgba(255,255,255,0.015)' }}>
        <div className="marquee-mask max-w-7xl mx-auto px-6">
          <div className="marquee-track">
            {[...Array(2)].flatMap((_, dup) =>
              ['Delhi', 'Mumbai', 'Bangalore', 'Kolkata', 'Chennai', 'Hyderabad', 'Pune', 'Jaipur', 'Surat', 'Lucknow'].map(city => (
                <div key={`${dup}-${city}`} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.32)', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff6b35', opacity: 0.6 }} />
                  {city}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* How It Works */}
      <Section id="how-it-works" bg="rgba(255,255,255,0.01)">
        <motion.div className="text-center mb-20"
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5 }}>
          <Pill color="#818cf8" bg="rgba(99,102,241,0.12)" border="rgba(99,102,241,0.2)" icon={<Zap size={13} />}>Super Simple</Pill>
          <h2 className="font-display" style={{ fontSize: 'clamp(32px,5vw,56px)', fontWeight: 900, letterSpacing: '-0.04em', margin: '20px 0 16px' }}>
            Start selling in <span style={{ color: '#ff6b35' }}>3 simple steps</span>
          </h2>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>No technical skills needed. Bilkul aasan.</p>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-8" style={{ perspective: 1200 }}>
          {[
            { num: '01', title: 'Create Shop', desc: 'Apni shop ka naam daalein aur mobile number se verify karein.', icon: <Store size={28} />, color: '#ff6b35', glow: 'rgba(255,107,53,0.2)' },
            { num: '02', title: 'Add Products', desc: 'Products ki photos kheinchein aur price set karein instantly.', icon: <ShoppingBag size={28} />, color: '#6366f1', glow: 'rgba(99,102,241,0.2)' },
            { num: '03', title: 'Share & Sell', desc: 'Link ko WhatsApp pe share karein aur orders lena shuru karein.', icon: <Zap size={28} />, color: '#10b981', glow: 'rgba(16,185,129,0.2)' },
          ].map((step, i) => (
            <motion.div key={i} className="card-3d" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5, delay: i * 0.1 }}
              style={{ padding: 40, borderRadius: 28, background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.07)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: step.glow, filter: 'blur(30px)' }} />
              <div style={{ fontSize: 12, fontWeight: 900, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 24 }}>{step.num}</div>
              <div style={{ width: 56, height: 56, borderRadius: 18, background: step.glow, border: `1px solid ${step.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: step.color, marginBottom: 28, boxShadow: `0 8px 24px ${step.glow}`, transform: 'translateZ(40px)' }}>
                {step.icon}
              </div>
              <h3 className="font-display" style={{ fontSize: 24, fontWeight: 900, marginBottom: 12, letterSpacing: '-0.02em' }}>{step.title}</h3>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, fontWeight: 500 }}>{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Benefits */}
      <Section id="benefits">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <div>
            <Pill color="#ff6b35" bg="rgba(255,107,53,0.1)" border="rgba(255,107,53,0.2)" icon={<TrendingUp size={13} />}>Why FeraSetu</Pill>
            <h2 className="font-display" style={{ fontSize: 'clamp(32px,4vw,52px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, margin: '24px 0 40px' }}>
              Designed for the <span style={{ color: '#ff6b35' }}>modern shopkeeper.</span>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              {[
                { title: 'Know your profit instantly', desc: 'Calculation ki tension khatam. Har order pe apna profit dekhein.', icon: <TrendingUp size={22} />, color: '#ff6b35' },
                { title: 'Sell on WhatsApp effortlessly', desc: 'Customers ko professional link bhejein, purane tarike chhodein.', icon: <MessageCircle size={22} />, color: '#10b981' },
                { title: 'Safe & Secure', desc: 'Aapka data hamesha secure rehta hai. Trust of 10k+ users.', icon: <ShieldCheck size={22} />, color: '#6366f1' },
              ].map((item, i) => (
                <motion.div key={i} style={{ display: 'flex', gap: 20 }}
                  initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, delay: i * 0.12 }}>
                  <div className="icon-float" style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 18, background: `${item.color}15`, border: `1px solid ${item.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, boxShadow: `0 8px 24px ${item.color}20`, animationDelay: `${i * 0.6}s` }}>
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="font-display" style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.02em' }}>{item.title}</h4>
                    <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, fontWeight: 500 }}>{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* 3D Stats Card */}
          <div style={{ perspective: 900 }}>
            <motion.div className="card-3d" initial={{ opacity: 0, scale: 0.92 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
              style={{ borderRadius: 40, padding: 52, background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.4)' }}>
              <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,107,53,0.15)', filter: 'blur(40px)' }} />
              <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', filter: 'blur(40px)' }} />
              <div style={{ position: 'relative', zIndex: 1, transform: 'translateZ(30px)' }}>
              <div className="font-display" style={{ fontSize: 80, fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1, background: 'linear-gradient(135deg,#ff6b35,#ff9a6c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: 12 }}>
                  <CountUpStat to={40} suffix="%" />
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 40, lineHeight: 1.5 }}>Average sales increase for<br />shopkeepers using FeraSetu.</div>
                <div className="grid grid-cols-2 gap-4" style={{ marginBottom: 36 }}>
                  {[
                    { val: '10K+', label: 'Shops', color: '#ff6b35' },
                    { val: '₹2Cr+', label: 'Revenue Processed', color: '#10b981' },
                    { val: '22+', label: 'Languages', color: '#6366f1' },
                    { val: '99.9%', label: 'Uptime', color: '#f59e0b' },
                  ].map((stat, i) => (
                    <div key={i} style={{ padding: '16px 20px', borderRadius: 18, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div className="font-display" style={{ fontSize: 22, fontWeight: 900, color: stat.color, letterSpacing: '-0.03em' }}>{stat.val}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginTop: 4 }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
                <Link to="/register" className="cursor-pointer" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 28px', borderRadius: 50, background: 'linear-gradient(135deg,#ff6b35,#e55a24)', color: '#fff', fontWeight: 800, fontSize: 16, boxShadow: '0 8px 30px rgba(255,107,53,0.4)', transition: 'transform 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                  Grow your business today <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* Testimonial */}
      <section style={{ padding: '120px 0', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }} whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
            style={{ padding: '60px 64px', borderRadius: 40, background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -60, left: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,107,53,0.1)', filter: 'blur(50px)' }} />
            <div style={{ display: 'flex', gap: 4, color: '#ff6b35', marginBottom: 28, position: 'relative', zIndex: 1 }} aria-hidden="true">
              {[1, 2, 3, 4, 5].map(i => <Star key={i} size={22} fill="currentColor" />)}
            </div>
            <blockquote className="font-display" style={{ fontSize: 'clamp(20px,3vw,30px)', fontWeight: 700, lineHeight: 1.5, fontStyle: 'italic', color: 'rgba(255,255,255,0.85)', marginBottom: 40, position: 'relative', zIndex: 1 }}>
              "Pehle register maintain karna mushkil tha. Ab FeraSetu se sab phone pe hai. Sales bhi badhi hai aur tension bhi kam hui hai."
            </blockquote>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative', zIndex: 1 }}>
              <div className="font-display" style={{ width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg,#ff6b35,#e55a24)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, boxShadow: '0 8px 24px rgba(255,107,53,0.35)' }}>RK</div>
              <div>
                <div className="font-display" style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>Rajesh Kumar</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>Kirana Store Owner, Delhi</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <Section id="pricing">
        <motion.div className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5 }}>
          <Pill color="#10b981" bg="rgba(16,185,129,0.1)" border="rgba(16,185,129,0.2)" icon={<ShieldCheck size={13} />}>Simple Pricing</Pill>
          <h2 className="font-display" style={{ fontSize: 'clamp(32px,5vw,60px)', fontWeight: 900, letterSpacing: '-0.04em', margin: '20px 0 16px' }}>
            Start small. Upgrade when <span style={{ color: '#ff6b35' }}>orders grow.</span>
          </h2>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>Designed to feel safe for small shops and powerful at scale.</p>
        </motion.div>
        <div className="grid lg:grid-cols-3 gap-6 items-stretch">
          <PricingCard index={0} icon={<Smartphone size={22} />} name="Starter" price="199" desc="Launch your online catalog and accept local orders." features={['100 products', 'FeraSetu shop link', 'Basic AI help']} featured={false} />
          <PricingCard index={1} icon={<TrendingUp size={22} />} name="Growth" price="499" desc="Custom domain, premium templates, and growth analytics." features={['1,000 products', 'Custom domain support', 'Advanced AI & analytics']} featured={true} />
          <PricingCard index={2} icon={<BarChart3 size={22} />} name="Scale" price="999" desc="For serious retailers with more products and staff." features={['Unlimited products', 'Sales prediction', 'Onboarding help']} featured={false} />
        </div>
      </Section>

      {/* Final CTA */}
      <section style={{ padding: '80px 0 120px' }}>
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.96 }} whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
            style={{ borderRadius: 48, padding: '80px 64px', textAlign: 'center', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, rgba(255,107,53,0.2), rgba(229,90,36,0.15) 50%, rgba(99,102,241,0.12))', border: '1px solid rgba(255,107,53,0.2)', boxShadow: '0 40px 80px rgba(255,107,53,0.12)' }}>
            <div style={{ position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)', width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,107,53,0.15)', filter: 'blur(80px)' }} />
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px,transparent 1px)', backgroundSize: '32px 32px' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <IndianRupee className="icon-float" size={40} style={{ color: '#ff6b35', margin: '0 auto 24px', display: 'block', opacity: 0.8 }} aria-hidden="true" />
              <h2 className="font-display" style={{ fontSize: 'clamp(32px,5vw,64px)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 20 }}>Ab aapki baari hai.</h2>
              <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.6)', fontWeight: 600, maxWidth: 480, margin: '0 auto 44px' }}>
                Join 10,000+ smart shopkeepers. Bilkul free se shuru karein.
              </p>
              <Link to="/register" className="shimmer-btn cursor-pointer" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '20px 52px', borderRadius: 24, background: 'linear-gradient(135deg,#ff6b35,#e55a24)', color: '#fff', fontSize: 20, fontWeight: 900, boxShadow: '0 16px 60px rgba(255,107,53,0.5)', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 20px 70px rgba(255,107,53,0.65)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 16px 60px rgba(255,107,53,0.5)'; }}>
                Create Your Store <ArrowRight size={22} aria-hidden="true" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '40px 0' }}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#ff6b35,#e55a24)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(255,107,53,0.3)' }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 16, fontStyle: 'italic' }}>F</span>
            </div>
            <span className="font-display" style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.03em' }}>Fera<span style={{ color: '#ff6b35' }}>Setu</span></span>
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.25)' }}>
            © {new Date().getFullYear()} FeraSetu. Your shop's digital bridge.
          </p>
        </div>
      </motion.footer>
    </div>
  );
}

function Section({ id, bg, children }: { id?: string; bg?: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ padding: '120px 0', background: bg }}>
      <div className="max-w-7xl mx-auto px-6">{children}</div>
    </section>
  );
}

// ---- Engagement components ----------------------------------------------

// Keeps a WebGL crash from ever blanking the hero — falls back to the CSS aurora.
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err: unknown) { console.warn('HeroScene disabled:', err); }
  render() { return this.state.failed ? null : this.props.children; }
}

const ACTIVITY = [
  { name: 'Priya', city: 'Jaipur', action: 'launched her saree shop' },
  { name: 'Imran', city: 'Lucknow', action: 'got 12 orders today' },
  { name: 'Anand', city: 'Coimbatore', action: 'added 40 products' },
  { name: 'Meena', city: 'Surat', action: 'crossed ₹50,000 in sales' },
  { name: 'Ravi', city: 'Patna', action: 'shared his shop on WhatsApp' },
  { name: 'Fatima', city: 'Hyderabad', action: 'upgraded to Growth plan' },
];

function ActivityTicker({ forceMotion = false }: { forceMotion?: boolean }) {
  const prefersReducedMotion = useReducedMotion();
  const reduce = !!prefersReducedMotion && !forceMotion;
  const [idx, setIdx] = useState(0);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    // Reduced motion: show a single static badge, no slide/cycle.
    if (reduce) { setShown(true); return; }
    const intro = setTimeout(() => setShown(true), 2600);
    const cycle = setInterval(() => {
      setShown(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % ACTIVITY.length);
        setShown(true);
      }, 450);
    }, 5200);
    return () => { clearTimeout(intro); clearInterval(cycle); };
  }, [reduce]);

  const a = ACTIVITY[idx];

  return (
    <div
      className="glass"
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed', bottom: 24, left: 24, zIndex: 55,
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderRadius: 16,
        maxWidth: 'calc(100vw - 48px)',
        boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
        transform: shown || reduce ? 'translateY(0)' : 'translateY(140%)',
        opacity: shown ? 1 : 0,
        transition: reduce ? 'none' : 'transform 0.5s cubic-bezier(0.2,0.8,0.2,1), opacity 0.5s ease',
        pointerEvents: 'none',
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981', animation: 'pulseRing 2s infinite' }} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        <span style={{ fontWeight: 800, color: '#ff9a6c' }}>{a.name}</span>
        <span style={{ color: 'rgba(255,255,255,0.55)' }}> from {a.city} </span>
        {a.action}
      </div>
    </div>
  );
}

// Animated count-up that fires when scrolled into view (progress/reward).
function CountUpStat({
  to, prefix = '', suffix = '', decimals = 0, duration = 1600, style, className,
}: {
  to: number; prefix?: string; suffix?: string; decimals?: number; duration?: number;
  style?: React.CSSProperties; className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (prefersReducedMotion) { setVal(to); return; }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
          setVal(to * eased);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [to, duration, prefersReducedMotion]);

  const display = decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString('en-IN');
  return <span ref={ref} className={className} style={style}>{prefix}{display}{suffix}</span>;
}

// Primary CTA that subtly leans toward the cursor when near (playful pull).
function MagneticCTA({ to, children }: { to: string; children: React.ReactNode }) {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef<HTMLAnchorElement>(null);
  const [t, setT] = useState({ x: 0, y: 0 });

  const onMove = (e: React.MouseEvent) => {
    if (prefersReducedMotion || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    setT({ x: dx * 0.25, y: dy * 0.35 });
  };
  const reset = () => setT({ x: 0, y: 0 });

  return (
    <Link
      ref={ref}
      to={to}
      className="shimmer-btn cursor-pointer"
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{
        padding: '18px 40px', borderRadius: 20, background: 'linear-gradient(135deg,#ff6b35,#e55a24)',
        color: '#fff', fontSize: 18, fontWeight: 900,
        boxShadow: '0 8px 40px rgba(255,107,53,0.45), 0 0 0 1px rgba(255,107,53,0.2)',
        display: 'inline-flex', alignItems: 'center', gap: 10,
        transform: `translate(${t.x}px, ${t.y}px) scale(${t.x || t.y ? 1.05 : 1})`,
        transition: 'transform 0.18s cubic-bezier(0.2,0.8,0.2,1), box-shadow 0.2s',
      }}
    >
      {children}
    </Link>
  );
}

function Pill({ color, bg, border, icon, children }: { color: string; bg: string; border: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 50, background: bg, border: `1px solid ${border}` }}>
      <span style={{ color }} aria-hidden="true">{icon}</span>
      <span style={{ fontSize: 12, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{children}</span>
    </div>
  );
}

function PricingCard({ index = 0, icon, name, price, desc, features, featured }: { index?: number; icon: React.ReactNode; name: string; price: string; desc: string; features: string[]; featured: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, delay: index * 0.12 }}
      style={{ height: '100%' }}
    >
    <div className="pricing-3d" style={{
      height: '100%',
      borderRadius: 32, padding: 40,
      background: featured ? 'linear-gradient(135deg, rgba(255,107,53,0.15), rgba(229,90,36,0.08))' : 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
      border: featured ? '1px solid rgba(255,107,53,0.3)' : '1px solid rgba(255,255,255,0.07)',
      boxShadow: featured ? '0 24px 60px rgba(255,107,53,0.15), 0 0 0 1px rgba(255,107,53,0.15)' : 'none',
      position: 'relative', overflow: 'hidden', transform: featured ? 'scale(1.03)' : 'scale(1)',
    }}>
      {featured && (
        <div className="font-display" style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', padding: '6px 20px', borderRadius: '0 0 16px 16px', background: 'linear-gradient(135deg,#ff6b35,#e55a24)', fontSize: 11, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em', boxShadow: '0 4px 20px rgba(255,107,53,0.4)' }}>Best Value</div>
      )}
      {featured && <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,107,53,0.15)', filter: 'blur(30px)' }} />}
      <div className="icon-float" style={{ width: 52, height: 52, borderRadius: 18, background: featured ? 'rgba(255,107,53,0.2)' : 'rgba(255,255,255,0.06)', border: featured ? '1px solid rgba(255,107,53,0.3)' : '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: featured ? '#ff6b35' : 'rgba(255,255,255,0.6)', marginBottom: 24, marginTop: featured ? 24 : 0, animationDelay: `${index * 0.5}s` }}>
        {icon}
      </div>
      <h3 className="font-display" style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 10 }}>{name}</h3>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: 500, lineHeight: 1.6, minHeight: 48 }}>{desc}</p>
      <div style={{ margin: '28px 0', display: 'flex', alignItems: 'flex-end', gap: 4 }}>
        <span className="font-display" style={{ fontSize: 20, fontWeight: 900, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>₹</span>
        <span className="font-display" style={{ fontSize: 56, fontWeight: 900, letterSpacing: '-0.04em', color: featured ? '#ff6b35' : '#fff', lineHeight: 1 }}>{price}</span>
        <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.3)', fontWeight: 700, marginBottom: 6 }}>/mo</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
        {features.map((f) => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: featured ? 'rgba(255,107,53,0.2)' : 'rgba(255,255,255,0.08)', color: featured ? '#ff6b35' : 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Check />
            </div>
            {f}
          </div>
        ))}
      </div>
      <Link to="/upgrade" className="cursor-pointer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '14px 0', borderRadius: 50, background: featured ? 'linear-gradient(135deg,#ff6b35,#e55a24)' : 'rgba(255,255,255,0.08)', border: featured ? 'none' : '1px solid rgba(255,255,255,0.12)', color: '#fff', fontWeight: 800, fontSize: 15, boxShadow: featured ? '0 8px 30px rgba(255,107,53,0.35)' : 'none', transition: 'transform 0.2s' }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
        View details <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </div>
    </motion.div>
  );
}

function Check() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
