import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  Globe,
  MessageCircle,
  PackagePlus,
  Play,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  TrendingUp,
  Wand2,
  Zap,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const proofItems = ['No coding', 'WhatsApp-first', 'Live in 2 minutes'];
const products = [
  { name: 'Masala Box', price: '₹240', status: '12 sold', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=220' },
  { name: 'Cotton Kurti', price: '₹799', status: 'Low stock', image: 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&q=80&w=220' },
  { name: 'Dry Fruits', price: '₹499', status: 'Trending', image: 'https://images.unsplash.com/photo-1606914469633-bd39206ea739?auto=format&fit=crop&q=80&w=220' },
];

const galleryItems = [
  {
    title: 'Fresh grocery stores',
    label: 'Daily essentials',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200',
  },
  {
    title: 'Fashion and boutique sellers',
    label: 'Premium catalog',
    image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&q=80&w=1200',
  },
  {
    title: 'Local handmade brands',
    label: 'Story-led selling',
    image: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&q=80&w=1200',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  return (
    <div className="min-h-screen overflow-hidden bg-[#faf7ef] text-stone-950 selection:bg-amber-300 selection:text-stone-950">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');

        body { font-family: 'DM Sans', sans-serif; }

        .fera-noise::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 60;
          opacity: 0.035;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }

        .liquid-orb {
          animation: liquidFloat 11s ease-in-out infinite;
          transform-origin: center;
        }

        .hero-device {
          animation: deviceLift 1s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .stagger-in {
          animation: staggerIn 0.9s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .marquee-track {
          animation: marquee 24s linear infinite;
        }

        .premium-shine {
          position: relative;
          overflow: hidden;
        }

        .premium-shine::after {
          content: '';
          position: absolute;
          inset: -120% auto auto -70%;
          width: 70%;
          height: 320%;
          transform: rotate(19deg);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
          animation: shineSweep 4.8s ease-in-out infinite;
        }

        .image-float {
          animation: imageFloat 7.5s ease-in-out infinite;
        }

        .image-card img {
          transform: scale(1.04);
          transition: transform 900ms cubic-bezier(0.16, 1, 0.3, 1), filter 900ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .image-card:hover img {
          transform: scale(1.12);
          filter: saturate(1.08) contrast(1.04);
        }

        .glass-card {
          background: linear-gradient(145deg, rgba(255,255,255,0.82), rgba(255,255,255,0.5));
          border: 1px solid rgba(120, 113, 108, 0.16);
          box-shadow: 0 30px 90px rgba(28, 25, 23, 0.08);
          backdrop-filter: blur(22px);
        }

        .gold-text {
          background: linear-gradient(120deg, #7c2d12 0%, #ca8a04 42%, #facc15 68%, #92400e 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        @keyframes liquidFloat {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1) rotate(0deg); border-radius: 42% 58% 54% 46%; }
          33% { transform: translate3d(22px, -26px, 0) scale(1.05) rotate(8deg); border-radius: 58% 42% 48% 52%; }
          66% { transform: translate3d(-18px, 18px, 0) scale(0.96) rotate(-7deg); border-radius: 48% 52% 62% 38%; }
        }

        @keyframes deviceLift {
          from { opacity: 0; transform: translateY(44px) rotateX(12deg) scale(0.96); }
          to { opacity: 1; transform: translateY(0) rotateX(0) scale(1); }
        }

        @keyframes staggerIn {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }

        @keyframes shineSweep {
          0%, 58% { left: -75%; }
          100% { left: 145%; }
        }

        @keyframes imageFloat {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(-2deg); }
          50% { transform: translate3d(0, -14px, 0) rotate(1deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .liquid-orb, .hero-device, .stagger-in, .marquee-track, .premium-shine::after, .image-float { animation: none !important; }
        }
      `}</style>

      <div className="fera-noise" />

      <nav className="fixed left-3 right-3 top-3 z-50 md:left-6 md:right-6 md:top-5">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between rounded-full border border-white/50 bg-white/70 px-4 shadow-[0_18px_70px_rgba(28,25,23,0.09)] backdrop-blur-2xl md:h-20 md:px-6">
          <Link to="/" className="flex items-center gap-3 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-950 text-lg font-black italic text-amber-300 shadow-xl shadow-stone-950/20">F</div>
            <div>
              <div className="text-lg font-black leading-none tracking-tight text-stone-950">Fera<span className="text-amber-600">AI</span></div>
              <div className="hidden text-[10px] font-black uppercase tracking-[0.22em] text-stone-400 sm:block">Shopkeeper OS</div>
            </div>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#how-it-works" className="text-sm font-bold text-stone-600 transition-colors hover:text-stone-950">Flow</a>
            <a href="#benefits" className="text-sm font-bold text-stone-600 transition-colors hover:text-stone-950">Why Fera</a>
            <a href="#pricing" className="text-sm font-bold text-stone-600 transition-colors hover:text-stone-950">Pricing</a>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <Link to="/login" className="hidden rounded-full px-4 py-2 text-sm font-black text-stone-700 transition-colors hover:text-stone-950 sm:block">Sign in</Link>
            <Link to="/register" className="premium-shine inline-flex cursor-pointer items-center gap-2 rounded-full bg-stone-950 px-5 py-3 text-sm font-black text-white shadow-xl shadow-stone-950/15 transition-all hover:-translate-y-0.5 hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-4 active:translate-y-0">
              Start <ChevronRight size={17} strokeWidth={3} />
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="relative min-h-screen px-4 pb-20 pt-32 md:px-6 md:pt-40">
          <div className="liquid-orb absolute -left-28 top-20 h-80 w-80 bg-amber-300/45 blur-3xl" />
          <div className="liquid-orb absolute right-[-8rem] top-28 h-96 w-96 bg-orange-400/25 blur-3xl" style={{ animationDelay: '1.7s' }} />
          <div className="liquid-orb absolute bottom-4 left-1/3 h-72 w-72 bg-stone-900/10 blur-3xl" style={{ animationDelay: '3.2s' }} />

          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.02fr_0.98fr]">
            <div className={`relative z-10 ${isVisible ? 'stagger-in' : 'opacity-0'}`}>
              <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-amber-200/80 bg-white/70 px-3 py-2 shadow-lg shadow-amber-900/5 backdrop-blur-xl">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-300 text-stone-950"><Sparkles size={16} /></div>
                <span className="pr-2 text-sm font-black text-stone-800">A premium store builder for Bharat sellers</span>
              </div>

              <h1 className="max-w-5xl text-[clamp(3.2rem,8vw,8.8rem)] font-black leading-[0.82] tracking-[-0.09em] text-stone-950">
                Turn your shop into a <span className="gold-text">selling machine.</span>
              </h1>

              <p className="mt-8 max-w-2xl text-lg font-semibold leading-8 text-stone-600 md:text-xl">
                Fera AI gives small businesses a beautiful online storefront, WhatsApp order flow, product catalog, analytics, and AI help without making them feel like they are using software.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link to="/register" className="premium-shine inline-flex cursor-pointer items-center justify-center gap-3 rounded-2xl bg-stone-950 px-8 py-5 text-base font-black text-white shadow-2xl shadow-stone-950/20 transition-all hover:-translate-y-1 hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-4 active:translate-y-0">
                  Build my store <ArrowRight size={19} strokeWidth={3} />
                </Link>
                <a href="#how-it-works" className="inline-flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-stone-200 bg-white/65 px-8 py-5 text-base font-black text-stone-900 shadow-xl shadow-stone-950/5 backdrop-blur-xl transition-all hover:-translate-y-1 hover:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-4 active:translate-y-0">
                  <Play size={18} fill="currentColor" /> See the flow
                </a>
              </div>

              <div className="mt-9 flex flex-wrap gap-3">
                {proofItems.map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-full border border-stone-200 bg-white/70 px-4 py-2 text-sm font-black text-stone-700 backdrop-blur-xl">
                    <Check size={15} className="text-amber-600" strokeWidth={3} /> {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="hero-device relative z-10 mx-auto w-full max-w-[620px] lg:mt-10">
              <div className="image-float absolute -right-6 -top-14 z-20 hidden h-32 w-32 overflow-hidden rounded-[2rem] border-4 border-white bg-white shadow-2xl shadow-stone-950/18 md:block">
                <img
                  src="https://images.unsplash.com/photo-1516594798947-e65505dbb29d?auto=format&fit=crop&q=80&w=500"
                  alt="Small shop owner preparing products"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="absolute -left-8 top-10 z-20 hidden rounded-3xl border border-white/60 bg-white/80 p-4 shadow-2xl shadow-stone-950/12 backdrop-blur-2xl sm:block">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><TrendingUp size={22} /></div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">Today</div>
                    <div className="text-xl font-black text-stone-950">₹18,420</div>
                  </div>
                </div>
              </div>

              <div className="absolute -right-4 bottom-24 z-20 hidden rounded-3xl border border-white/60 bg-stone-950 p-4 text-white shadow-2xl shadow-stone-950/25 sm:block">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-300 text-stone-950"><MessageCircle size={20} /></div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">New order</div>
                    <div className="text-sm font-black">WhatsApp customer paid</div>
                  </div>
                </div>
              </div>

              <div className="relative rounded-[2.5rem] border border-white/70 bg-white/45 p-3 shadow-[0_40px_120px_rgba(28,25,23,0.18)] backdrop-blur-2xl md:rounded-[3.2rem] md:p-5">
                <div className="overflow-hidden rounded-[2rem] border border-stone-200 bg-[#11100e] shadow-inner md:rounded-[2.5rem]">
                  <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-red-400" />
                      <span className="h-3 w-3 rounded-full bg-amber-300" />
                      <span className="h-3 w-3 rounded-full bg-emerald-400" />
                    </div>
                    <div className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-black text-white/70">raj-kirana.fera-search.tech</div>
                  </div>

                  <div className="grid gap-5 p-5 md:grid-cols-[0.82fr_1.18fr] md:p-7">
                    <div className="image-card relative min-h-[330px] overflow-hidden rounded-[1.8rem] bg-stone-900 p-5 text-white">
                      <img
                        src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=900"
                        alt="Premium grocery storefront preview"
                        className="absolute inset-0 h-full w-full object-cover opacity-80"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/35 to-transparent" />
                      <div className="relative z-10 flex h-full min-h-[290px] flex-col justify-end">
                        <div className="mb-auto w-fit rounded-full bg-white/80 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-stone-950 backdrop-blur">Live store</div>
                        <h3 className="text-4xl font-black leading-none tracking-[-0.06em]">Raj Fresh Mart</h3>
                        <p className="mt-4 text-sm font-bold leading-6 text-white/75">Daily grocery, offers, and festival bundles delivered nearby.</p>
                        <button className="mt-8 inline-flex w-fit cursor-pointer items-center gap-2 rounded-full bg-amber-300 px-5 py-3 text-sm font-black text-stone-950 transition-transform hover:-translate-y-0.5">
                          Shop now <ArrowRight size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Metric label="Orders" value="148" />
                        <Metric label="Profit" value="31%" />
                      </div>
                      <div className="rounded-[1.7rem] border border-white/10 bg-white/[0.07] p-4">
                        <div className="mb-4 flex items-center justify-between">
                          <div className="text-sm font-black text-white">AI product desk</div>
                          <Wand2 size={18} className="text-amber-300" />
                        </div>
                        <div className="space-y-3">
                          {products.map((product) => (
                            <div key={product.name} className="flex items-center justify-between rounded-2xl bg-white/10 p-3 text-white">
                              <div className="flex items-center gap-3">
                                <img src={product.image} alt={product.name} className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/20" />
                                <div>
                                  <div className="text-sm font-black">{product.name}</div>
                                  <div className="text-xs font-bold text-white/45">{product.status}</div>
                                </div>
                              </div>
                              <div className="text-sm font-black text-amber-200">{product.price}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-stone-200/70 bg-stone-950 py-5 text-white">
          <div className="marquee-track flex w-[200%] gap-4">
            {[...Array(2)].map((_, group) => (
              <div key={group} className="flex min-w-[50%] flex-1 items-center justify-around gap-4 text-sm font-black uppercase tracking-[0.22em] text-white/60">
                <span>Catalog</span><span className="text-amber-300">Orders</span><span>Analytics</span><span className="text-amber-300">AI Builder</span><span>Payments</span><span className="text-amber-300">WhatsApp</span>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="relative px-4 py-24 md:px-6 md:py-32">
          <div className="mx-auto max-w-7xl">
            <SectionIntro eyebrow="A flow people actually finish" title="From counter to online store before the next customer walks in." />
            <div className="mt-14 grid gap-5 md:grid-cols-3">
              <StepCard number="01" title="Speak or type your shop" desc="Add the shop name, category, and products in normal language. Fera turns it into a clean catalog." icon={<Store size={28} />} image="https://images.unsplash.com/photo-1556745757-8d76bdb6984b?auto=format&fit=crop&q=80&w=900" />
              <StepCard number="02" title="AI builds the storefront" desc="Hero, product sections, contact buttons, and order flow are assembled with a polished retail look." icon={<PackagePlus size={28} />} image="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=900" />
              <StepCard number="03" title="Share and collect orders" desc="Send one link on WhatsApp. Customers browse, place orders, and your dashboard stays updated." icon={<Zap size={28} />} image="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&q=80&w=900" />
            </div>
          </div>
        </section>

        <section className="px-4 pb-24 md:px-6 md:pb-32">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <SectionIntro eyebrow="Image-led stores" title="Beautiful pages for the products people can actually see." />
              <p className="max-w-sm text-base font-bold leading-7 text-stone-600">
                The design uses product photography, rich contrast, and clean motion so every shop feels trustworthy before customers read a word.
              </p>
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              {galleryItems.map((item, index) => (
                <div key={item.title} className={`image-card group relative overflow-hidden rounded-[2.3rem] bg-stone-950 shadow-[0_28px_90px_rgba(28,25,23,0.14)] ${index === 1 ? 'lg:mt-12' : ''}`}>
                  <img src={item.image} alt={item.title} className="h-[430px] w-full object-cover opacity-85" />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/25 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-7 text-white">
                    <div className="mb-3 w-fit rounded-full bg-amber-300 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-stone-950">{item.label}</div>
                    <h3 className="text-3xl font-black leading-none tracking-[-0.05em]">{item.title}</h3>
                    <div className="mt-5 flex items-center gap-2 text-sm font-black text-white/70 transition-colors group-hover:text-amber-200">
                      Preview template <ArrowRight size={16} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="benefits" className="px-4 py-24 md:px-6 md:py-32">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="rounded-[2.4rem] bg-stone-950 p-7 text-white shadow-[0_35px_110px_rgba(28,25,23,0.25)] md:rounded-[3rem] md:p-10">
              <div className="image-card mb-8 h-72 overflow-hidden rounded-[2rem] bg-stone-800">
                <img
                  src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=1200"
                  alt="Shopkeeper reviewing online orders"
                  className="h-full w-full object-cover opacity-90"
                />
              </div>
              <div className="mb-12 flex items-center justify-between">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">Growth panel</div>
                  <h2 className="mt-3 text-4xl font-black tracking-[-0.06em] md:text-6xl">Built for real shops.</h2>
                </div>
                <Globe className="text-white/20" size={64} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <DarkStat label="Avg. sales lift" value="40%" />
                <DarkStat label="Stores launched" value="10k+" />
                <DarkStat label="Setup time" value="2 min" />
                <DarkStat label="Support style" value="Hindi" />
              </div>
            </div>

            <div className="space-y-5">
              <BenefitItem title="Looks premium without agency cost" desc="Every store gets generous spacing, good typography, image-forward cards, and trust-building order moments." icon={<Sparkles size={23} />} />
              <BenefitItem title="Works where customers already are" desc="WhatsApp sharing, simple product pages, and clear CTAs make it familiar for local buyers." icon={<MessageCircle size={23} />} />
              <BenefitItem title="Numbers that shopkeepers understand" desc="Revenue, orders, product movement, and profit are surfaced without dashboard clutter." icon={<BarChart3 size={23} />} />
              <BenefitItem title="Safe foundation for growing up" desc="Secure login, protected dashboard routes, and upgrade paths keep the business ready for scale." icon={<ShieldCheck size={23} />} />
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-stone-950 px-4 py-24 text-white md:px-6 md:py-32">
          <div className="liquid-orb absolute -right-24 top-10 h-80 w-80 bg-amber-300/20 blur-3xl" />
          <div className="mx-auto max-w-7xl">
            <div className="max-w-4xl">
              <div className="mb-8 flex gap-1 text-amber-300">
                {[1, 2, 3, 4, 5].map((item) => <Star key={item} size={24} fill="currentColor" />)}
              </div>
              <blockquote className="text-3xl font-black leading-tight tracking-[-0.04em] md:text-6xl">
                "It does not feel like software. It feels like someone made my shop famous on the internet. Customers trust the link now."
              </blockquote>
              <div className="mt-12 flex items-center gap-4">
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300"
                  alt="Rajesh Kumar"
                  className="h-16 w-16 rounded-3xl object-cover ring-4 ring-amber-300"
                />
                <div>
                  <div className="text-xl font-black">Rajesh Kumar</div>
                  <div className="mt-1 text-xs font-black uppercase tracking-[0.22em] text-white/40">Kirana Store Owner, Delhi</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="px-4 py-24 md:px-6 md:py-32">
          <div className="mx-auto max-w-7xl">
            <SectionIntro eyebrow="Simple pricing" title="Start tiny. Upgrade only when orders deserve it." />
            <div className="mt-14 grid items-stretch gap-5 lg:grid-cols-3">
              <PricingTeaser icon={<ShoppingBag size={24} />} name="Starter" price="199" desc="Launch your catalog and start collecting local orders." features={["100 products", "Fera shop link", "Basic AI help"]} />
              <div className="relative rounded-[2.2rem] border border-amber-300 bg-stone-950 p-8 text-white shadow-[0_35px_110px_rgba(28,25,23,0.26)] lg:-translate-y-5">
                <div className="absolute -top-4 left-8 rounded-full bg-amber-300 px-5 py-2 text-xs font-black uppercase tracking-[0.2em] text-stone-950 shadow-xl shadow-amber-900/20">Best Value</div>
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-300 text-stone-950"><TrendingUp size={25} /></div>
                <h3 className="text-3xl font-black tracking-[-0.04em]">Growth</h3>
                <p className="mt-3 min-h-[56px] font-bold leading-7 text-white/55">Custom domain, premium templates, and growth analytics.</p>
                <div className="my-8 flex items-end gap-1">
                  <span className="mb-2 text-xl font-black text-white/35">₹</span>
                  <span className="text-6xl font-black tracking-[-0.07em]">499</span>
                  <span className="mb-2 font-black text-white/35">/mo</span>
                </div>
                <FeatureList items={["1,000 products", "Custom domain support", "Advanced AI and analytics"]} dark />
                <Link to="/upgrade" className="premium-shine mt-8 flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-amber-300 py-4 font-black text-stone-950 transition-all hover:-translate-y-1 hover:bg-amber-200">
                  See plans <ArrowRight size={18} />
                </Link>
              </div>
              <PricingTeaser icon={<BarChart3 size={24} />} name="Scale" price="999" desc="For serious retailers with bigger catalogs and staff." features={["Unlimited products", "Sales prediction", "Onboarding help"]} />
            </div>
          </div>
        </section>

        <section className="px-4 pb-24 md:px-6 md:pb-32">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-stone-950 text-center text-white shadow-[0_40px_130px_rgba(28,25,23,0.26)] md:rounded-[3.5rem]">
            <img
              src="https://images.unsplash.com/photo-1556741533-411cf82e4e2d?auto=format&fit=crop&q=80&w=1800"
              alt="Retail business going online"
              className="absolute inset-0 h-full w-full object-cover opacity-[0.36]"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-stone-950 via-stone-950/86 to-amber-950/65" />
            <div className="relative z-10 p-10 md:p-20">
              <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 text-amber-200 ring-1 ring-white/15"><Store size={30} /></div>
              <h2 className="mx-auto max-w-4xl text-4xl font-black leading-[0.95] tracking-[-0.07em] md:text-7xl">Ab aapki dukaan bhi internet pe premium lagegi.</h2>
              <p className="mx-auto mt-8 max-w-2xl text-lg font-bold leading-8 text-white/70">Join smart shopkeepers building beautiful online stores without designers, developers, or confusion.</p>
              <Link to="/register" className="premium-shine mt-10 inline-flex cursor-pointer items-center justify-center gap-3 rounded-2xl bg-white px-9 py-5 text-lg font-black text-stone-950 shadow-2xl shadow-stone-950/25 transition-all hover:-translate-y-1 hover:bg-amber-100 active:translate-y-0">
                Create your store <ArrowRight size={20} strokeWidth={3} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 px-4 py-10 md:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-950 text-sm font-black italic text-amber-300">F</div>
            <span className="text-lg font-black tracking-tight text-stone-950">Fera<span className="text-amber-600">AI</span></span>
          </div>
          <div className="text-center text-sm font-bold text-stone-400 md:text-right">© {new Date().getFullYear()} Fera AI. Digitizing Bharat, one shop at a time.</div>
        </div>
      </footer>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.07] p-4">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-white/35">{label}</div>
      <div className="mt-3 text-3xl font-black tracking-[-0.06em] text-white">{value}</div>
    </div>
  );
}

function SectionIntro({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="max-w-4xl">
      <div className="mb-5 inline-flex rounded-full border border-amber-200 bg-amber-100/70 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-amber-800">{eyebrow}</div>
      <h2 className="text-4xl font-black leading-[0.95] tracking-[-0.07em] text-stone-950 md:text-7xl">{title}</h2>
    </div>
  );
}

function StepCard({ number, title, desc, icon, image }: { number: string; title: string; desc: string; icon: ReactNode; image: string }) {
  return (
    <div className="glass-card group overflow-hidden rounded-[2.2rem] p-4 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_35px_100px_rgba(28,25,23,0.13)]">
      <div className="image-card mb-6 h-48 overflow-hidden rounded-[1.7rem] bg-stone-200">
        <img src={image} alt={title} className="h-full w-full object-cover" />
      </div>
      <div className="mb-8 flex items-center justify-between px-4">
        <div className="text-sm font-black tracking-[0.26em] text-stone-400">{number}</div>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-950 text-amber-300 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">{icon}</div>
      </div>
      <div className="px-4 pb-5">
        <h3 className="text-2xl font-black tracking-[-0.04em] text-stone-950">{title}</h3>
        <p className="mt-4 font-semibold leading-7 text-stone-600">{desc}</p>
      </div>
    </div>
  );
}

function DarkStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.06] p-5">
      <div className="text-xs font-black uppercase tracking-[0.2em] text-white/35">{label}</div>
      <div className="mt-4 text-4xl font-black tracking-[-0.06em] text-amber-200">{value}</div>
    </div>
  );
}

function BenefitItem({ title, desc, icon }: { title: string; desc: string; icon: ReactNode }) {
  return (
    <div className="glass-card flex gap-5 rounded-[2rem] p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-white/85">
      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-200 text-stone-950">{icon}</div>
      <div>
        <h4 className="text-xl font-black tracking-[-0.03em] text-stone-950">{title}</h4>
        <p className="mt-2 font-semibold leading-7 text-stone-600">{desc}</p>
      </div>
    </div>
  );
}

function PricingTeaser({ icon, name, price, desc, features }: { icon: ReactNode; name: string; price: string; desc: string; features: string[] }) {
  return (
    <div className="glass-card rounded-[2.2rem] p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_35px_100px_rgba(28,25,23,0.13)]">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-950 text-amber-300">{icon}</div>
      <h3 className="text-3xl font-black tracking-[-0.04em] text-stone-950">{name}</h3>
      <p className="mt-3 min-h-[56px] font-bold leading-7 text-stone-600">{desc}</p>
      <div className="my-8 flex items-end gap-1">
        <span className="mb-2 text-xl font-black text-stone-400">₹</span>
        <span className="text-6xl font-black tracking-[-0.07em] text-stone-950">{price}</span>
        <span className="mb-2 font-black text-stone-400">/mo</span>
      </div>
      <FeatureList items={features} />
      <Link to="/upgrade" className="mt-8 flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-stone-950 py-4 font-black text-white transition-all hover:-translate-y-1 hover:bg-stone-800">
        View details <ArrowRight size={18} />
      </Link>
    </div>
  );
}

function FeatureList({ items, dark = false }: { items: string[]; dark?: boolean }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item} className={`flex items-center gap-3 text-sm font-black ${dark ? 'text-white/80' : 'text-stone-700'}`}>
          <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${dark ? 'bg-amber-300 text-stone-950' : 'bg-emerald-100 text-emerald-700'}`}><Check size={13} strokeWidth={4} /></span>
          {item}
        </div>
      ))}
    </div>
  );
}
