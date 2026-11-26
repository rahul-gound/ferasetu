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
  Store,
  ShoppingBag,
  Star,
  Plus,
  Check,
  Zap,
  Coffee,
  Laptop,
  Flame,
  Truck,
} from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface StorefrontProduct {
  name: string;
  unit: string;
  price: string;
  tag: string;
  tagColor: string;
  icon: typeof ShoppingBag;
}

interface StorefrontReview {
  customerName: string;
  location: string;
  rating: number;
  reviewText: string;
  orderSummary: string;
}

interface ShowcaseStore {
  name: string;
  category: string;
  url: string;
  tagline: string;
  badge: string;
  badgeColor: string;
  bannerGradient: string;
  avatarBg: string;
  avatarIcon: typeof Store;
  rating: string;
  orderCount: string;
  deliveryTime: string;
  payoutDetail: string;
  paymentMethod: string;
  products: StorefrontProduct[];
  cartCount: number;
  cartTotal: string;
  customerReview: StorefrontReview;
}

const SHOWCASE_STORES: ShowcaseStore[] = [
  {
    name: 'Sharma General Store',
    category: 'Daily Kirana & Groceries',
    url: 'sharma-groceries.ferasetu.store',
    tagline: 'Neighborhood daily essentials & packaged goods delivered locally',
    badge: '0% Platform Cut',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    bannerGradient: 'from-amber-600 via-orange-600 to-amber-700',
    avatarBg: 'bg-amber-500 text-white',
    avatarIcon: Store,
    rating: '4.9',
    orderCount: '240+ orders',
    deliveryTime: '30m Local Delivery',
    payoutDetail: 'Instant UPI Settlement to HDFC Bank',
    paymentMethod: 'UPI · GooglePay · Cash',
    cartCount: 2,
    cartTotal: '₹380',
    customerReview: {
      customerName: 'Rajesh K.',
      location: 'Karol Bagh, New Delhi',
      rating: 5,
      reviewText: 'Ordered mustard oil and wheat flour. Paid directly with UPI and received delivery in 30 minutes without extra platform surge fees.',
      orderSummary: 'Verified Counter Order · 2 items',
    },
    products: [
      {
        name: 'Aashirvaad Shudh Chakki Atta',
        unit: '5kg Pack · Whole Wheat',
        price: '₹245',
        tag: 'Daily Staple',
        tagColor: 'bg-amber-50 text-amber-800 border-amber-200',
        icon: ShoppingBag,
      },
      {
        name: 'Fortune Sunlite Sunflower Oil',
        unit: '1L Pouch · Refined',
        price: '₹135',
        tag: 'Bestseller',
        tagColor: 'bg-orange-50 text-orange-800 border-orange-200',
        icon: ShoppingBag,
      },
      {
        name: 'Tata Salt Vacuum Evaporated',
        unit: '1kg Pack · Pure Iodine',
        price: '₹28',
        tag: 'Essential',
        tagColor: 'bg-blue-50 text-blue-800 border-blue-200',
        icon: ShoppingBag,
      },
    ],
  },
  {
    name: 'Mono Electronic Store',
    category: 'Hardware, Audio & Gadgets',
    url: 'mono-hardware.ferasetu.store',
    tagline: 'High-performance audio gear, creator tools & certified hardware',
    badge: 'Direct Card Checkout',
    badgeColor: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    bannerGradient: 'from-slate-900 via-zinc-800 to-cyan-950',
    avatarBg: 'bg-cyan-600 text-white',
    avatarIcon: Laptop,
    rating: '5.0',
    orderCount: '92 orders',
    deliveryTime: 'Free Insured Express',
    payoutDetail: 'Direct Gateway Payout via Cashfree',
    paymentMethod: 'Cards · EMI · NetBanking',
    cartCount: 1,
    cartTotal: '₹26,990',
    customerReview: {
      customerName: 'Siddharth M.',
      location: 'Indiranagar, Bengaluru',
      rating: 5,
      reviewText: 'Purchased the Sony XM5 headphones. Verified warranty invoice was generated instantly on the merchant\'s direct domain.',
      orderSummary: 'Verified Tech Order · Insured Delivery',
    },
    products: [
      {
        name: 'Sony WH-1000XM5 Headphones',
        unit: 'Active Noise Cancelling · 30h',
        price: '₹26,990',
        tag: 'Top Rated',
        tagColor: 'bg-cyan-50 text-cyan-800 border-cyan-200',
        icon: Laptop,
      },
      {
        name: 'Apple Watch Series 9 GPS',
        unit: '45mm Midnight Aluminum',
        price: '₹41,900',
        tag: 'Official Warranty',
        tagColor: 'bg-slate-100 text-slate-800 border-slate-300',
        icon: Laptop,
      },
      {
        name: 'MacBook Air M2 13-inch',
        unit: '8GB Unified · 256GB SSD',
        price: '₹94,990',
        tag: 'Direct Merchant',
        tagColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        icon: Laptop,
      },
    ],
  },
  {
    name: 'SweetCraft Bakehouse',
    category: 'Fresh Cakes & Artisan Pastries',
    url: 'sweetcraft.ferasetu.store',
    tagline: 'Custom celebration cakes & slow-fermented sourdough loaves',
    badge: 'Direct WhatsApp Link',
    badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
    bannerGradient: 'from-rose-500 via-pink-600 to-rose-700',
    avatarBg: 'bg-rose-500 text-white',
    avatarIcon: Sparkles,
    rating: '4.9',
    orderCount: '310+ orders',
    deliveryTime: 'Fresh Baked · Same Day',
    payoutDetail: 'Direct WhatsApp Orders to Merchant',
    paymentMethod: 'UPI · QR on Delivery',
    cartCount: 1,
    cartTotal: '₹950',
    customerReview: {
      customerName: 'Priya N.',
      location: 'Bandra West, Mumbai',
      rating: 5,
      reviewText: 'Ordered a custom truffle cake for my daughter\'s birthday. The merchant contacted me directly on WhatsApp to coordinate fresh delivery.',
      orderSummary: 'Verified Bakery Order · Same Day Delivery',
    },
    products: [
      {
        name: 'Belgian Truffle Birthday Cake',
        unit: '1kg · Dark Chocolate Ganache',
        price: '₹950',
        tag: 'Baked Fresh',
        tagColor: 'bg-rose-50 text-rose-800 border-rose-200',
        icon: Sparkles,
      },
      {
        name: 'Wildflower Honey Sourdough',
        unit: 'Slow Fermented · 500g Loaf',
        price: '₹220',
        tag: '100% Organic',
        tagColor: 'bg-amber-50 text-amber-800 border-amber-200',
        icon: Sparkles,
      },
      {
        name: 'Almond Butter Croissant',
        unit: 'Box of 4 · French Butter',
        price: '₹420',
        tag: 'Chef Choice',
        tagColor: 'bg-orange-50 text-orange-800 border-orange-200',
        icon: Sparkles,
      },
    ],
  },
  {
    name: 'Chanderi Weaves',
    category: 'Handloom & Indian Ethnic Wear',
    url: 'chanderi-weaves.ferasetu.store',
    tagline: 'Authentic hand-woven sarees and artisanal dupattas from weavers',
    badge: 'Owned Customer List',
    badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    bannerGradient: 'from-indigo-700 via-purple-700 to-amber-700',
    avatarBg: 'bg-indigo-600 text-white',
    avatarIcon: ShoppingBag,
    rating: '4.9',
    orderCount: '175+ orders',
    deliveryTime: 'All-India Insured Dispatch',
    payoutDetail: 'Unmasked Buyer Contact Records',
    paymentMethod: 'Prepaid UPI · Card Checkout',
    cartCount: 1,
    cartTotal: '₹4,800',
    customerReview: {
      customerName: 'Meenakshi V.',
      location: 'T. Nagar, Chennai',
      rating: 5,
      reviewText: 'Direct handloom certificate with loom origin included. Saree arrived in 3 days. Genuine craftsmanship and fair weaver price.',
      orderSummary: 'Verified Handloom Order · Express Dispatch',
    },
    products: [
      {
        name: 'Pure Silk Zari Chanderi Saree',
        unit: 'Handloom Certified Mark · Maroon',
        price: '₹4,800',
        tag: 'Artisan Woven',
        tagColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        icon: ShoppingBag,
      },
      {
        name: 'Hand-block Printed Cotton Dupatta',
        unit: 'Pure Mulmul · Natural Indigo',
        price: '₹1,250',
        tag: 'Eco Dye',
        tagColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        icon: ShoppingBag,
      },
      {
        name: 'Tussar Silk Festive Kurta Set',
        unit: 'Tailored Fit · Festive Edition',
        price: '₹3,400',
        tag: 'Limited Batch',
        tagColor: 'bg-purple-50 text-purple-800 border-purple-200',
        icon: ShoppingBag,
      },
    ],
  },
  {
    name: 'Monsoon Coffee Roasters',
    category: 'Specialty Arabica & Filter Blends',
    url: 'monsoon-coffee.ferasetu.store',
    tagline: 'Single-origin estate beans roasted to order with custom grinding',
    badge: 'Custom Domain Connected',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    bannerGradient: 'from-stone-900 via-amber-950 to-stone-800',
    avatarBg: 'bg-amber-700 text-white',
    avatarIcon: Coffee,
    rating: '4.8',
    orderCount: '420+ batches',
    deliveryTime: 'Roasted Mondays · 48h Delivery',
    payoutDetail: 'Instant UPI & Card Payouts to Merchant',
    paymentMethod: 'Instant UPI · 0% Toll',
    cartCount: 2,
    cartTotal: '₹850',
    customerReview: {
      customerName: 'Arjun T.',
      location: 'Saket, New Delhi',
      rating: 5,
      reviewText: 'Roasted on Monday and delivered by Wednesday in South Delhi. Freshest ground filter blend I have had all year.',
      orderSummary: 'Verified Roastery Order · Custom Grind',
    },
    products: [
      {
        name: 'Chikmagalur Malabar AAA',
        unit: '250g Whole Bean · Medium Roast',
        price: '₹460',
        tag: 'Single Origin',
        tagColor: 'bg-stone-100 text-stone-800 border-stone-300',
        icon: Coffee,
      },
      {
        name: 'Traditional South Indian Filter',
        unit: '500g · 80:20 Plantation Blend',
        price: '₹390',
        tag: 'House Blend',
        tagColor: 'bg-amber-50 text-amber-800 border-amber-200',
        icon: Coffee,
      },
      {
        name: 'Cold Brew Blend Dark Roast',
        unit: '250g · Coarse Grind for Immersion',
        price: '₹480',
        tag: 'Low Acidity',
        tagColor: 'bg-orange-50 text-orange-800 border-orange-200',
        icon: Coffee,
      },
    ],
  },
  {
    name: 'MittiCraft Studio',
    category: 'Studio Pottery & Terracotta Decor',
    url: 'mitticraft.ferasetu.store',
    tagline: 'Hand-thrown artisanal ceramics & sustainable home tableware',
    badge: '0% Middleman Escrow',
    badgeColor: 'bg-orange-50 text-orange-800 border-orange-200',
    bannerGradient: 'from-orange-700 via-amber-800 to-stone-800',
    avatarBg: 'bg-orange-600 text-white',
    avatarIcon: Store,
    rating: '4.9',
    orderCount: '160+ orders',
    deliveryTime: 'Safe Foam-Cushioned Shipping',
    payoutDetail: 'Direct Bank Settlement in Merchant Ledger',
    paymentMethod: 'UPI · NetBanking · Cards',
    cartCount: 1,
    cartTotal: '₹1,450',
    customerReview: {
      customerName: 'Sunita D.',
      location: 'Sector 15, Gurugram',
      rating: 5,
      reviewText: 'The terracotta tea set arrived packed in eco-friendly molded padding with zero breakages. Direct from studio kiln to kitchen.',
      orderSummary: 'Verified Studio Order · Safe Transit',
    },
    products: [
      {
        name: 'Glazed Terracotta Tea Set',
        unit: '4 Cups + 1 Teapot · Lead-Free',
        price: '₹1,450',
        tag: 'Studio Made',
        tagColor: 'bg-orange-50 text-orange-800 border-orange-200',
        icon: Store,
      },
      {
        name: 'Hand-carved Stoneware Planter',
        unit: 'Medium (6-inch) · Matte Grey',
        price: '₹780',
        tag: 'Drainage Hole',
        tagColor: 'bg-stone-100 text-stone-800 border-stone-300',
        icon: Store,
      },
      {
        name: 'Artisan Clay Water Dispenser',
        unit: '5 Litres · Brass Tap Fitted',
        price: '₹1,120',
        tag: 'Eco Cool',
        tagColor: 'bg-amber-50 text-amber-800 border-amber-200',
        icon: Store,
      },
    ],
  },
];

export default function StorefrontShowcase() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackWrapperRef = useRef<HTMLDivElement>(null);
  const scrollTrackRef = useRef<HTMLDivElement>(null);

  const [activeCard, setActiveCard] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isInView, setIsInView] = useState(false);

  // Track if showcase is currently in viewport so auto-scroll only runs when visible
  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.15 }
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  // GSAP ScrollTrigger Entrance Reveal
  useEffect(() => {
    if (!sectionRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.storefront-card',
        { y: 35, opacity: 0, scale: 0.98 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          stagger: 0.12,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
          },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const handleTrackScroll = () => {
    if (!scrollTrackRef.current) return;
    const track = scrollTrackRef.current;
    const maxScroll = track.scrollWidth - track.clientWidth;
    if (maxScroll > 0) {
      const p = track.scrollLeft / maxScroll;
      const totalCards = SHOWCASE_STORES.length;
      const current = Math.min(Math.round(p * (totalCards - 1)), totalCards - 1);
      setActiveCard(current);
    }
  };

  const handleScrollToCard = (targetIdx: number) => {
    const clampedIdx = Math.max(0, Math.min(targetIdx, SHOWCASE_STORES.length - 1));
    setActiveCard(clampedIdx);

    if (scrollTrackRef.current) {
      const track = scrollTrackRef.current;
      const targetCard = track.children[clampedIdx] as HTMLElement;
      if (targetCard) {
        // Scroll ONLY the internal horizontal track container — NEVER hijack the vertical window scroll
        const cardOffset = targetCard.offsetLeft - track.offsetLeft;
        const centerOffset = cardOffset - (track.clientWidth - targetCard.clientWidth) / 2;
        track.scrollTo({
          left: Math.max(0, centerOffset),
          behavior: 'smooth',
        });
      } else {
        const cardWidth = 380;
        track.scrollTo({
          left: clampedIdx * cardWidth,
          behavior: 'smooth',
        });
      }
    }
  };

  // Automatic gentle carousel advance ONLY when visible in viewport and not hovered/touched
  useEffect(() => {
    if (isPaused || !isInView) return;
    const timer = setInterval(() => {
      handleScrollToCard((activeCard + 1) % SHOWCASE_STORES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [activeCard, isPaused, isInView]);

  return (
    <section
      ref={sectionRef}
      id="storefront-showcase"
      className="relative bg-white border-b border-slate-200 scroll-mt-24 py-16 md:py-24"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <div
        className="w-full max-w-[1340px] mx-auto px-4 sm:px-6 flex flex-col justify-between"
      >
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
              Real storefronts. Independent ownership.
            </h2>
            <p className="text-base text-slate-600 mt-2 max-w-2xl font-normal">
              Explore how independent shops and local makers take orders directly with zero platform tax.
            </p>
          </div>

          {/* Live Indicator (No clunky manual arrow buttons) */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Store <strong className="text-[#0052FF]">{activeCard + 1}</strong> of {SHOWCASE_STORES.length}</span>
            </span>
          </div>
        </div>

        {/* Horizontal Track Wrapper */}
        <div
          ref={trackWrapperRef}
          className="relative w-full overflow-hidden py-2"
        >
          {/* Scrollable Horizontal Track */}
          <div
            ref={scrollTrackRef}
            onScroll={handleTrackScroll}
            tabIndex={0}
            role="region"
            aria-label="Scrollable merchant storefront gallery"
            className="flex gap-6 items-stretch will-change-transform overflow-x-auto pb-4 pt-2 scroll-smooth touch-pan-x"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {SHOWCASE_STORES.map((store, idx) => {
              const isCurrent = idx === activeCard;
              const StoreAvatar = store.avatarIcon;

              return (
                <div
                  key={idx}
                  onClick={() => handleScrollToCard(idx)}
                  className={`storefront-card group w-[360px] sm:w-[410px] shrink-0 rounded-2xl border flex flex-col justify-between transition-all duration-300 cursor-pointer select-none overflow-hidden ${
                    isCurrent
                      ? 'bg-white border-[#0052FF] shadow-lg ring-2 ring-[#0052FF]/15 scale-[1.01] -translate-y-0.5'
                      : 'bg-white/95 border-slate-200 hover:border-slate-300 hover:bg-white hover:-translate-y-1 shadow-sm hover:shadow-md'
                  }`}
                >
                  {/* CLEAN STORE HEADER CHROME */}
                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200/80 flex items-center justify-between text-xs">
                    {/* Verified SSL URL Bar */}
                    <div className="text-slate-600 text-xs flex items-center gap-1.5 truncate max-w-[240px]">
                      <Lock size={12} className="text-emerald-600 shrink-0" aria-hidden="true" />
                      <span className="font-medium text-slate-800 truncate">{store.url}</span>
                    </div>

                    {/* Live Indicator */}
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      <span>Live Store</span>
                    </span>
                  </div>

                  {/* STORE FRONT HERO / BRAND HEADER */}
                  <div className={`p-4 bg-gradient-to-r ${store.bannerGradient} text-white relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 pointer-events-none" />
                    <div className="relative z-10 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-10 h-10 rounded-xl ${store.avatarBg} flex items-center justify-center font-bold text-sm shadow-md border border-white/20 shrink-0`}>
                          <StoreAvatar size={20} className="text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-black text-base leading-tight text-white">
                              {store.name}
                            </h3>
                            <CheckCircle2 size={13} className="text-blue-300 shrink-0" />
                          </div>
                          <p className="text-[11px] text-white/80 mt-0.5 font-medium">{store.category}</p>
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-xs whitespace-nowrap bg-white/95 text-slate-900`}>
                        {store.badge}
                      </span>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-white/15 flex items-center justify-between text-[11px] text-white/90 font-medium">
                      <span className="flex items-center gap-1">
                        <Star size={11} className="text-amber-300 fill-amber-300" />
                        <span>{store.rating} ({store.orderCount})</span>
                      </span>
                      <span className="flex items-center gap-1 text-white/80">
                        <Truck size={12} />
                        <span>{store.deliveryTime}</span>
                      </span>
                    </div>
                  </div>

                  {/* STORE PRODUCT CATALOG SHELF */}
                  <div className="p-4 bg-white flex-grow flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 font-mono">
                          FEATURED PRODUCTS
                        </span>
                        <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-0.5">
                          <span>Browse Catalog</span>
                          <ArrowUpRight size={10} />
                        </span>
                      </div>

                      <div className="space-y-2 mb-3">
                        {store.products.map((prod, pIdx) => {
                          const ProdIcon = prod.icon;
                          return (
                            <div
                              key={pIdx}
                              className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 hover:border-slate-200 transition-colors flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0 shadow-xs">
                                  <ProdIcon size={14} className="text-blue-600" />
                                </div>
                                <div className="truncate">
                                  <div className="font-bold text-slate-900 truncate leading-snug">
                                    {prod.name}
                                  </div>
                                  <div className="text-[10px] text-slate-500 truncate">
                                    {prod.unit}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-mono font-bold text-slate-900">
                                  {prod.price}
                                </span>
                                <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-colors border border-blue-200">
                                  <Plus size={12} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* GENUINE CUSTOMER REVIEW (NO FAKE FACES) */}
                    <div className="mb-3 p-3 rounded-xl bg-slate-50/90 border border-slate-150 text-left">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {store.customerReview.customerName.charAt(0)}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {store.customerReview.customerName}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            • {store.customerReview.location}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 text-amber-500 shrink-0">
                          {[...Array(store.customerReview.rating)].map((_, i) => (
                            <Star key={i} size={10} className="fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-snug italic">
                        "{store.customerReview.reviewText}"
                      </p>
                      <div className="mt-1.5 text-[10px] font-mono text-emerald-700 font-semibold uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 size={11} className="shrink-0" />
                        <span>{store.customerReview.orderSummary}</span>
                      </div>
                    </div>

                    {/* LIVE STOREFRONT CART & CHECKOUT STRIP */}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between text-xs mb-2.5">
                        <div className="flex items-center gap-1.5 font-semibold text-blue-900">
                          <ShoppingBag size={13} className="text-blue-600" />
                          <span>Cart ({store.cartCount} items): <strong className="font-mono font-bold">{store.cartTotal}</strong></span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-600 text-white shadow-xs">
                          Direct Order
                        </span>
                      </div>

                      {/* MERCHANT PAYOUT & 0% TOLL GUARANTEE */}
                      <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                          <span className="truncate font-medium">{store.payoutDetail}</span>
                        </div>
                        <span className="font-bold text-orange-600 shrink-0 font-mono text-[10px]">
                          0% Toll
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Context & Scrub Progress Indicator */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-orange-600 shrink-0" aria-hidden="true" />
            <span className="text-xs text-slate-600 font-medium">
              Every storefront runs on its own URL. Customers buy directly with zero middleman rerouting.
            </span>
          </div>

          {/* Dynamic Scroll Progress Bar */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-[11px] font-mono font-medium text-slate-500 whitespace-nowrap">
              Scroll or swipe to explore
            </span>
            <div className="w-32 h-1.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
              <div
                className="h-full bg-blue-600 transition-all duration-150 rounded-full"
                style={{ width: `${Math.max(((activeCard + 1) / SHOWCASE_STORES.length) * 100, 20)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
