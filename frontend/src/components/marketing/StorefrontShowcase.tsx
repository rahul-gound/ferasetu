import { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Lock,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ExternalLink,
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
  highlightColor?: string;
}

const SHOWCASE_STORES: ShowcaseStore[] = [
  {
    name: 'Sharma General Store',
    category: 'Daily Kirana & Groceries',
    url: 'sharma-groceries.ferasetu.com',
    tagline: 'Neighborhood daily essentials & packaged goods delivered locally',
    badge: '0% Platform Cut',
    badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
    highlightColor: 'border-orange-500/40',
    items: [
      { name: 'Aashirvaad Shudh Chakki Atta 5kg', price: '₹245' },
      { name: 'Fortune Sunlite Sunflower Oil 1L', price: '₹135' },
      { name: 'Tata Salt Vacuum Evaporated 1kg', price: '₹28' },
    ],
    payoutDetail: 'Instant UPI Settlement to HDFC Bank',
  },
  {
    name: 'SweetCraft Bakehouse',
    category: 'Fresh Cakes & Artisan Pastries',
    url: 'sweetcraft.ferasetu.com',
    tagline: 'Custom celebration cakes & slow-fermented sourdough loaves',
    badge: 'Direct WhatsApp Link',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    highlightColor: 'border-blue-500/40',
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
    tagline: 'Authentic hand-woven sarees and artisanal dupattas from weavers',
    badge: 'Owned Customer List',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    highlightColor: 'border-emerald-500/40',
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
    tagline: 'Farm-fresh harvest baskets delivered weekly with direct farm pricing',
    badge: 'Direct Conduit Active',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    highlightColor: 'border-amber-500/40',
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
    tagline: 'Single-origin estate beans roasted to order with custom grinding',
    badge: 'Custom Domain Connected',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    highlightColor: 'border-purple-500/40',
    items: [
      { name: 'Chikmagalur Malabar AAA Whole Bean 250g', price: '₹460' },
      { name: 'Traditional South Indian Filter Blend 500g', price: '₹390' },
      { name: 'Cold Brew Blend Medium-Dark 250g', price: '₹480' },
    ],
    payoutDetail: 'Export buyer records anytime',
  },
  {
    name: 'MittiCraft Studio',
    category: 'Studio Pottery & Terracotta Decor',
    url: 'mitticraft.ferasetu.com',
    tagline: 'Hand-thrown artisanal ceramics & sustainable home tableware',
    badge: '0% Commissions',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    highlightColor: 'border-rose-500/40',
    items: [
      { name: 'Glazed Terracotta Tea Set (4 Cups + Pot)', price: '₹1,450' },
      { name: 'Hand-carved Stoneware Planter (Medium)', price: '₹780' },
      { name: 'Artisan Clay Water Dispenser (5L)', price: '₹1,120' },
    ],
    payoutDetail: 'Instant UPI & Card Payouts to Merchant',
  },
];

export default function StorefrontShowcase() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const pinContainerRef = useRef<HTMLDivElement>(null);
  const trackWrapperRef = useRef<HTMLDivElement>(null);
  const scrollTrackRef = useRef<HTMLDivElement>(null);
  const triggerInstanceRef = useRef<ScrollTrigger | null>(null);

  const [activeCard, setActiveCard] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isPinnedMode, setIsPinnedMode] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !sectionRef.current || !scrollTrackRef.current) {
      setIsPinnedMode(false);
      return;
    }

    const isDesktop = window.innerWidth >= 768;
    setIsPinnedMode(isDesktop);

    const ctx = gsap.context(() => {
      const track = scrollTrackRef.current!;
      const section = sectionRef.current!;
      const wrapper = trackWrapperRef.current!;

      // Initial stagger reveal
      gsap.from('.storefront-card', {
        opacity: 0,
        y: 28,
        duration: 0.6,
        stagger: 0.08,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 80%',
          once: true,
        },
      });

      if (isDesktop) {
        // Calculate the exact horizontal overflow distance to scroll
        const getScrollDistance = () => {
          const trackWidth = track.scrollWidth;
          const wrapperWidth = wrapper.clientWidth || window.innerWidth;
          // Add extra padding so the last card settles cleanly in view
          return Math.max(trackWidth - wrapperWidth + 64, 400);
        };

        const horizontalTween = gsap.to(track, {
          x: () => -getScrollDistance(),
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: () => `+=${getScrollDistance() + 400}`,
            pin: true,
            pinSpacing: true,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const p = self.progress;
              setScrollProgress(p);
              const totalCards = SHOWCASE_STORES.length;
              const current = Math.min(Math.floor(p * totalCards), totalCards - 1);
              setActiveCard(current);
            },
          },
        });

        triggerInstanceRef.current = horizontalTween.scrollTrigger || null;
      }
    }, sectionRef);

    // Refresh layout once fonts/images load
    if (document.fonts) {
      document.fonts.ready.then(() => {
        ScrollTrigger.refresh();
      });
    }

    return () => {
      ctx.revert();
    };
  }, []);

  const handleScrollToCard = (targetIdx: number) => {
    const clampedIdx = Math.max(0, Math.min(targetIdx, SHOWCASE_STORES.length - 1));
    setActiveCard(clampedIdx);

    if (triggerInstanceRef.current && isPinnedMode) {
      const st = triggerInstanceRef.current;
      const totalDist = st.end - st.start;
      const targetScroll = st.start + (clampedIdx / (SHOWCASE_STORES.length - 1)) * totalDist;
      window.scrollTo({ top: targetScroll, behavior: 'smooth' });
    } else if (scrollTrackRef.current) {
      const cardWidth = 360;
      scrollTrackRef.current.scrollTo({
        left: clampedIdx * cardWidth,
        behavior: 'smooth',
      });
    }
  };

  const handleScrollLeft = () => handleScrollToCard(activeCard - 1);
  const handleScrollRight = () => handleScrollToCard(activeCard + 1);

  return (
    <section
      ref={sectionRef}
      id="storefront-showcase"
      className="relative bg-white border-b border-slate-200 overflow-hidden"
    >
      <div
        ref={pinContainerRef}
        className="w-full max-w-[1320px] mx-auto px-4 sm:px-6 py-12 md:py-16 min-h-[100vh] flex flex-col justify-between"
      >
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-3 border border-blue-200">
              <Sparkles size={13} className="text-blue-600" aria-hidden="true" />
              <span>LIVE MERCHANT CONDUITS</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              Real storefronts. Independent ownership.
            </h2>
            <p className="text-base sm:text-lg text-slate-600 mt-2 max-w-2xl font-normal leading-relaxed">
              Explore how independent shops and local makers take orders directly with zero platform commissions.
            </p>
          </div>

          {/* Interactive Navigation & Live Store Counter */}
          <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
            {/* Active Store Indicator Pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span className="font-semibold text-slate-900">
                Store {activeCard + 1} of {SHOWCASE_STORES.length}
              </span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-600 truncate max-w-[160px]">
                {SHOWCASE_STORES[activeCard].category}
              </span>
            </div>

            {/* Scroll Navigation Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleScrollLeft}
                disabled={activeCard === 0}
                aria-label="Scroll left to previous storefront"
                className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleScrollRight}
                disabled={activeCard === SHOWCASE_STORES.length - 1}
                aria-label="Scroll right to next storefront"
                className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal Track Wrapper */}
        <div
          ref={trackWrapperRef}
          className="relative w-full overflow-hidden py-3"
        >
          {/* Scrollable Horizontal Track */}
          <div
            ref={scrollTrackRef}
            data-lenis-prevent={!isPinnedMode}
            tabIndex={0}
            role="region"
            aria-label="Scrollable merchant storefront gallery"
            className={`flex gap-6 items-stretch will-change-transform ${
              isPinnedMode ? '' : 'overflow-x-auto pb-4 pt-2 scroll-smooth'
            }`}
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {SHOWCASE_STORES.map((store, idx) => {
              const isCurrent = idx === activeCard;

              return (
                <div
                  key={idx}
                  onClick={() => handleScrollToCard(idx)}
                  className={`storefront-card group w-[310px] sm:w-[360px] shrink-0 rounded-2xl border p-6 flex flex-col justify-between transition-all duration-300 cursor-pointer select-none ${
                    isCurrent
                      ? 'bg-white border-blue-600 shadow-xl ring-2 ring-blue-600/10 scale-[1.01]'
                      : 'bg-white/90 border-slate-200 hover:border-slate-300 hover:bg-white shadow-sm hover:shadow-md'
                  }`}
                >
                  <div>
                    {/* Simulated URL bar */}
                    <div className="mb-4 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-600 flex items-center justify-between group-hover:border-slate-300 transition-colors">
                      <div className="flex items-center gap-1.5 truncate">
                        <Lock size={12} className="text-blue-600 shrink-0" aria-hidden="true" />
                        <span className="font-semibold text-slate-900 truncate">{store.url}</span>
                      </div>
                      <ExternalLink size={12} className="text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" aria-hidden="true" />
                    </div>

                    {/* Store Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <h3 className="font-black text-lg text-slate-900 leading-snug group-hover:text-blue-700 transition-colors">
                          {store.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium">{store.category}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${store.badgeColor}`}>
                        {store.badge}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mb-4 leading-relaxed font-normal">
                      {store.tagline}
                    </p>

                    {/* Sample Catalog Mini-List */}
                    <div className="space-y-2 pt-3 border-t border-slate-100 mb-4 text-xs">
                      {store.items.map((item, itemIdx) => (
                        <div
                          key={itemIdx}
                          className="p-2 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between text-xs"
                        >
                          <span className="font-medium text-slate-800 truncate pr-2">{item.name}</span>
                          <span className="font-mono font-bold text-slate-900 shrink-0">{item.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Settlement Footer */}
                  <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-600 flex items-center justify-between font-medium">
                    <div className="flex items-center gap-1.5 truncate">
                      <CheckCircle2 size={14} className="text-blue-600 shrink-0" aria-hidden="true" />
                      <span className="truncate">{store.payoutDetail}</span>
                    </div>
                    <ArrowUpRight size={13} className="text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" aria-hidden="true" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Context & Scrub Progress Indicator */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-orange-600 shrink-0" aria-hidden="true" />
            <span className="text-xs text-slate-600 font-medium">
              Every storefront runs on its own URL. Customers buy directly with zero middleman rerouting.
            </span>
          </div>

          {/* Dynamic Scroll Progress Bar */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-[11px] font-mono font-medium text-slate-500 whitespace-nowrap">
              {isPinnedMode ? 'Scroll down to browse shops' : 'Swipe to explore'}
            </span>
            <div className="w-32 h-1.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
              <div
                className="h-full bg-blue-600 transition-all duration-150 rounded-full"
                style={{ width: `${Math.max(scrollProgress * 100, 16)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
