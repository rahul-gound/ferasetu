import { useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Lock,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface ShowcaseStore {
  name: string;
  category: string;
  url: string;
  tagline: string;
  badge: string;
  badgeColor: string;
  items: { name: string; price: string }[];
  payoutDetail: string;
}

const SHOWCASE_STORES: ShowcaseStore[] = [
  {
    name: 'Sharma General Store',
    category: 'Daily Kirana & Groceries',
    url: 'sharma-groceries.ferasetu.com',
    tagline: 'Neighborhood daily essentials & packaged goods',
    badge: '0% Platform Cut',
    badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
    items: [
      { name: 'Aashirvaad Shudh Chakki Atta 5kg', price: '₹245' },
      { name: 'Fortune Sunlite Sunflower Oil 1L', price: '₹135' },
      { name: 'Tata Salt Vaccum Evaporated 1kg', price: '₹28' },
    ],
    payoutDetail: 'Instant UPI Settlement to HDFC Bank',
  },
  {
    name: 'SweetCraft Bakehouse',
    category: 'Fresh Cakes & Artisan Pastries',
    url: 'sweetcraft.ferasetu.com',
    tagline: 'Custom celebration cakes & sourdough bakes',
    badge: 'Direct WhatsApp Link',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    items: [
      { name: 'Belgian Truffle Birthday Cake (1kg)', price: '₹950' },
      { name: 'Wildflower Honey Sourdough Loaf', price: '₹220' },
      { name: 'Almond Butter Croissant (Box of 4)', price: '₹420' },
    ],
    payoutDetail: 'Direct Card Checkout via Cashfree',
  },
  {
    name: 'Chanderi Weaves',
    category: 'Handloom & Indian Ethnic Wear',
    url: 'chanderi-weaves.ferasetu.com',
    tagline: 'Authentic hand-woven sarees and dupattas',
    badge: 'Owned Customer List',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    items: [
      { name: 'Pure Silk Zari Border Chanderi Saree', price: '₹4,800' },
      { name: 'Hand-block Printed Cotton Dupatta', price: '₹1,250' },
      { name: 'Tussar Silk Festive Kurta Set', price: '₹3,400' },
    ],
    payoutDetail: 'Unmasked Buyer Contact Records',
  },
  {
    name: 'GreenRoot Farms',
    category: 'Organic Harvest & Fresh Produce',
    url: 'greenroot-farms.ferasetu.com',
    tagline: 'Farm-fresh harvest baskets delivered weekly',
    badge: 'Direct Conduit Active',
    badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
    items: [
      { name: 'Weekly Farm Harvest Veggie Box (7kg)', price: '₹550' },
      { name: 'Cold-pressed Mustard Oil 1L (Wood Churned)', price: '₹260' },
      { name: 'Wild Forest Raw Honey 500g', price: '₹380' },
    ],
    payoutDetail: '0% Middleman Escrow Holds',
  },
  {
    name: 'Monsoon Coffee Roasters',
    category: 'Specialty Arabica & Filter Blends',
    url: 'monsoon-coffee.ferasetu.com',
    tagline: 'Single-origin estate beans roasted to order',
    badge: 'Custom Domain Connected',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    items: [
      { name: 'Chikmagalur Malabar AAA Whole Bean 250g', price: '₹460' },
      { name: 'Traditional South Indian Filter Blend 500g', price: '₹390' },
      { name: 'Cold Brew Blend Medium-Dark 250g', price: '₹480' },
    ],
    payoutDetail: 'Export buyer records anytime',
  },
];

export default function StorefrontShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTrackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !containerRef.current || !scrollTrackRef.current) return;

    const ctx = gsap.context(() => {
      // Staggered reveal of showcase cards
      gsap.from('.storefront-card', {
        opacity: 0,
        y: 24,
        duration: 0.5,
        stagger: 0.08,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 85%',
          once: true,
        },
      });

      // Subtle scroll-linked velocity drift
      gsap.fromTo(
        scrollTrackRef.current,
        { x: 30 },
        {
          x: -30,
          ease: 'none',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1.2,
          },
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleScrollLeft = () => {
    if (scrollTrackRef.current) {
      scrollTrackRef.current.scrollBy({ left: -340, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollTrackRef.current) {
      scrollTrackRef.current.scrollBy({ left: 340, behavior: 'smooth' });
    }
  };

  return (
    <section
      ref={containerRef}
      id="storefront-showcase"
      className="py-20 md:py-24 bg-white border-b border-slate-200 overflow-hidden"
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4 border border-blue-200">
              <Sparkles size={12} className="text-blue-600" aria-hidden="true" />
              <span>LIVE MERCHANT CONDUITS</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              Real storefronts. Independent ownership.
            </h2>
            <p className="text-base sm:text-lg text-slate-600 mt-3 max-w-2xl font-normal leading-relaxed">
              Explore how independent shops and local makers take orders directly with zero platform commissions.
            </p>
          </div>

          {/* Horizontal Navigation Buttons */}
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={handleScrollLeft}
              aria-label="Scroll left"
              className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-colors shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleScrollRight}
              aria-label="Scroll right"
              className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-colors shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Scrollable Horizontal Track */}
        <div
          ref={scrollTrackRef}
          data-lenis-prevent
          tabIndex={0}
          role="region"
          aria-label="Scrollable merchant storefront gallery"
          className="flex gap-5 overflow-x-auto pb-4 pt-2 scroll-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-4 rounded-2xl"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {SHOWCASE_STORES.map((store, idx) => (
            <div
              key={idx}
              className="storefront-card w-[310px] sm:w-[350px] shrink-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                {/* Simulated URL bar */}
                <div className="mb-4 p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-600 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    <Lock size={11} className="text-blue-600 shrink-0" aria-hidden="true" />
                    <span className="font-semibold text-slate-900 truncate">{store.url}</span>
                  </div>
                  <ArrowUpRight size={12} className="text-slate-400 shrink-0" aria-hidden="true" />
                </div>

                {/* Store Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 leading-snug">{store.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{store.category}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${store.badgeColor}`}>
                    {store.badge}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mb-4 leading-relaxed font-normal">
                  {store.tagline}
                </p>

                {/* Sample Catalog Mini-List */}
                <div className="space-y-1.5 pt-3 border-t border-slate-100 mb-4 text-xs font-sans">
                  {store.items.map((item, itemIdx) => (
                    <div
                      key={itemIdx}
                      className="p-2 rounded-lg bg-slate-50/70 border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <span className="font-medium text-slate-800 truncate pr-2">{item.name}</span>
                      <span className="font-mono font-bold text-slate-900 shrink-0">{item.price}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Settlement Footer */}
              <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-600 flex items-center gap-1.5 font-medium">
                <CheckCircle2 size={13} className="text-blue-600 shrink-0" aria-hidden="true" />
                <span className="truncate">{store.payoutDetail}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Context Pill */}
        <div className="mt-8 text-center">
          <span className="inline-flex items-center gap-2 text-xs text-slate-500 font-medium bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200">
            <ShieldCheck size={14} className="text-orange-600" aria-hidden="true" />
            <span>Every storefront runs on its own URL. Customers buy directly without marketplace rerouting.</span>
          </span>
        </div>
      </div>
    </section>
  );
}
