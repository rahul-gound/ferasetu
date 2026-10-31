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
}

const SHOWCASE_STORES: ShowcaseStore[] = [
  {
    name: 'Sharma General Store',
    category: 'Daily Kirana & Groceries',
    url: 'sharma-groceries.ferasetu.com',
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
    url: 'mono-hardware.ferasetu.com',
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
    url: 'sweetcraft.ferasetu.com',
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
    url: 'chanderi-weaves.ferasetu.com',
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
    url: 'monsoon-coffee.ferasetu.com',
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
    url: 'mitticraft.ferasetu.com',
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
        targetCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      } else {
        const cardWidth = 380;
        track.scrollTo({
          left: clampedIdx * cardWidth,
          behavior: 'smooth',
        });
      }
    }
  };

  const handleScrollLeft = () => handleScrollToCard(activeCard - 1);
  const handleScrollRight = () => handleScrollToCard(activeCard + 1);

  return (
    <section
      ref={sectionRef}
      id="storefront-showcase"
      className="relative bg-white border-b border-slate-200"
    >
      <div
        className="w-full max-w-[1340px] mx-auto px-4 sm:px-6 py-12 md:py-16 flex flex-col justify-between"
      >
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2 border border-blue-200">
              <Sparkles size={13} className="text-blue-600" aria-hidden="true" />
              <span>LIVE MERCHANT CONDUITS</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
              Real storefronts. Independent ownership.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-1 max-w-2xl font-normal">
              Explore how independent shops and local makers take orders directly with zero platform tax.
            </p>
          </div>

          {/* Stepper Controls & Active Indicator */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              Store <span className="text-blue-600">{activeCard + 1}</span> of {SHOWCASE_STORES.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleScrollLeft}
                disabled={activeCard === 0}
                aria-label="Scroll left to previous storefront"
                className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <ChevronLeft size={17} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleScrollRight}
                disabled={activeCard === SHOWCASE_STORES.length - 1}
                aria-label="Scroll right to next storefront"
                className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <ChevronRight size={17} aria-hidden="true" />
              </button>
            </div>
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
                      ? 'bg-white border-blue-600 shadow-xl ring-2 ring-blue-600/10 scale-[1.01]'
                      : 'bg-white/95 border-slate-200 hover:border-slate-300 hover:bg-white shadow-sm hover:shadow-md'
                  }`}
                >
                  {/* BROWSER WINDOW TITLEBAR CHROME */}
                  <div className="bg-slate-100/90 px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    </div>

                    {/* Verified SSL URL Bar */}
                    <div className="bg-white px-3 py-1 rounded-md border border-slate-200 text-slate-700 font-mono text-[11px] flex items-center gap-1.5 truncate max-w-[210px] shadow-xs">
                      <Lock size={10} className="text-emerald-600 shrink-0" aria-hidden="true" />
                      <span className="font-semibold text-slate-900 truncate">{store.url}</span>
                    </div>

                    {/* Live Indicator */}
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Live</span>
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

                      <div className="space-y-2">
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

                    {/* LIVE STOREFRONT CART & CHECKOUT STRIP */}
                    <div className="mt-3 pt-3 border-t border-slate-100">
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
