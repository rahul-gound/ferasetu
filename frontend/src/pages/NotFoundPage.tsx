import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  LayoutDashboard,
  Search,
  Bell,
  HelpCircle,
  Package,
  ShoppingCart,
  Sparkles,
  Store,
  DollarSign,
  MessageCircle,
  Home,
  ChevronRight,
  ShieldCheck,
  Compass
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import PublicNavbar from '../components/public/PublicNavbar';
import PublicFooter from '../components/public/PublicFooter';
import FeroMascot from '../components/ui/FeroMascot';

// Web Audio API synthesizer for an authentic shop counter bell chime
function playShopBellChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Harmonic frequencies simulating a brass counter bell
    const frequencies = [880, 1760, 2640];
    const gains = [0.22, 0.12, 0.05];

    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(gains[idx], now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (idx === 0 ? 1.4 : 0.8));

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.5);
    });

    // Provide haptic feedback on mobile if supported
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([20, 30, 20]);
      } catch {}
    }
  } catch (e) {
    // Audio context may be restricted by autoplay policy; silent fallback is completely acceptable
  }
}

// Friendly, authentic shopkeeper sayings for the interactive bell
const SHOPKEEPER_WISDOM = [
  "Ting-ting! Welcome in! Chai is always brewing here. Your store data and orders are safe.",
  "Every busy bazaar has a quiet alleyway. Even seasoned shopkeepers take a detour now and then.",
  "0% platform commission, 100% merchant ownership. That never changes, even on a 404 page!",
  "Take a breather. Nothing broke — you just wandered into an unopened aisle.",
  "Need a quick hand? Our human support team is always one WhatsApp message away.",
  "A good shopkeeper turns every wrong turn into an opportunity to inspect the shelves."
];

// Directory of popular destinations for quick live search
interface DirectoryLink {
  title: string;
  description: string;
  href: string;
  icon: typeof Store;
  keywords: string[];
  badge?: string;
}

const DIRECTORY_LINKS: DirectoryLink[] = [
  {
    title: 'Merchant Dashboard',
    description: 'Overview of your sales, live visitors, and recent transactions',
    href: '/dashboard',
    icon: LayoutDashboard,
    keywords: ['dashboard', 'home', 'sales', 'metrics', 'admin', 'portal'],
    badge: 'Merchant Hub'
  },
  {
    title: 'Products & Inventory',
    description: 'Add new products, adjust stock, and update catalog pricing',
    href: '/products',
    icon: Package,
    keywords: ['products', 'inventory', 'items', 'catalog', 'stock', 'goods']
  },
  {
    title: 'Orders & Fulfillment',
    description: 'Track incoming customer orders, manage shipments, and export bills',
    href: '/orders',
    icon: ShoppingCart,
    keywords: ['orders', 'shipping', 'delivery', 'receipts', 'tracking', 'sales']
  },
  {
    title: '0% Commission Pricing',
    description: 'Transparent plans with zero sales cuts, direct UPI, and full data control',
    href: '/pricing',
    icon: DollarSign,
    keywords: ['pricing', 'plans', 'cost', 'subscription', 'free', 'commission'],
    badge: '0% Toll'
  },
  {
    title: 'FeraSetu AI Assistant',
    description: 'Generate product descriptions, translate listings, and answer inquiries',
    href: '/ferasetu-ai',
    icon: Sparkles,
    keywords: ['ai', 'fera', 'assistant', 'catalog', 'generator', 'descriptions'],
    badge: 'Built-in'
  },
  {
    title: 'WhatsApp Commerce',
    description: 'Receive customer order alerts and share catalog links via WhatsApp',
    href: '/whatsapp-assistant',
    icon: MessageCircle,
    keywords: ['whatsapp', 'chat', 'direct', 'orders', 'notifications']
  },
  {
    title: 'Merchant Support',
    description: 'Direct help with store setup, orders, and billing',
    href: '/support',
    icon: HelpCircle,
    keywords: ['support', 'help', 'contact', 'whatsapp', 'call', 'faq']
  },
  {
    title: 'Create Your Online Store',
    description: 'Start your independent web shop in under 5 minutes with zero fees',
    href: '/signup',
    icon: Store,
    keywords: ['signup', 'register', 'start', 'create', 'new', 'join'],
    badge: 'Free Setup'
  }
];

export default function NotFoundPage() {
  const { user } = useAuth();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [bellRingCount, setBellRingCount] = useState(0);
  const [bellMessage, setBellMessage] = useState<string | null>(null);
  const [isBellAnimating, setIsBellAnimating] = useState(false);
  const bellTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Smart URL Typo Detection: Figure out where the user probably intended to go
  const suggestedDestination = useMemo(() => {
    const rawPath = location.pathname.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (!rawPath || rawPath === '404') return null;

    if (rawPath.includes('dash') || rawPath.includes('admin') || rawPath.includes('home')) {
      return { title: 'Merchant Dashboard', href: '/dashboard', reason: 'manage your store' };
    }
    if (rawPath.includes('prod') || rawPath.includes('item') || rawPath.includes('stock') || rawPath.includes('cat')) {
      return { title: 'Products & Inventory', href: '/products', reason: 'view your catalog' };
    }
    if (rawPath.includes('order') || rawPath.includes('sale') || rawPath.includes('ship')) {
      return { title: 'Customer Orders', href: '/orders', reason: 'fulfill customer purchases' };
    }
    if (rawPath.includes('pric') || rawPath.includes('plan') || rawPath.includes('cost') || rawPath.includes('tier')) {
      return { title: 'Pricing & Plans', href: '/pricing', reason: 'review 0% commission plans' };
    }
    if (rawPath.includes('log') || rawPath.includes('signi') || rawPath.includes('auth')) {
      return { title: 'Sign In to Store', href: '/login', reason: 'access your merchant portal' };
    }
    if (rawPath.includes('sign') || rawPath.includes('reg') || rawPath.includes('join') || rawPath.includes('start')) {
      return { title: 'Create Your Free Store', href: '/signup', reason: 'launch an online shop' };
    }
    if (rawPath.includes('supp') || rawPath.includes('help') || rawPath.includes('contact')) {
      return { title: 'Merchant Support', href: '/support', reason: 'get help from our team' };
    }
    if (rawPath.includes('ai') || rawPath.includes('bot') || rawPath.includes('chat')) {
      return { title: 'FeraSetu AI Assistant', href: '/ferasetu-ai', reason: 'generate catalogs and answers' };
    }

    return null;
  }, [location.pathname]);

  // Handle ringing the counter bell
  const handleRingBell = () => {
    playShopBellChime();
    setIsBellAnimating(true);
    const nextCount = bellRingCount + 1;
    setBellRingCount(nextCount);

    const messageIndex = (nextCount - 1) % SHOPKEEPER_WISDOM.length;
    setBellMessage(SHOPKEEPER_WISDOM[messageIndex]);

    if (bellTimeoutRef.current) {
      clearTimeout(bellTimeoutRef.current);
    }

    bellTimeoutRef.current = setTimeout(() => {
      setIsBellAnimating(false);
    }, 450);
  };

  useEffect(() => {
    return () => {
      if (bellTimeoutRef.current) clearTimeout(bellTimeoutRef.current);
    };
  }, []);

  // Filter directory links based on search query
  const filteredLinks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return DIRECTORY_LINKS.filter(link => {
      return (
        link.title.toLowerCase().includes(q) ||
        link.description.toLowerCase().includes(q) ||
        link.keywords.some(k => k.includes(q))
      );
    });
  }, [searchQuery]);

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 selection:bg-orange-100 selection:text-orange-900">
      <SEO
        title="404 — The Shutter is Down on This Aisle • FeraSetu"
        description="The shutter is down on this aisle, but your store is right around the corner. Explore products, pricing plans, or return to your merchant dashboard."
        noindex
      />

      <PublicNavbar />

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="w-full max-w-3xl mx-auto flex flex-col items-center text-center">

          {/* Top Status Breadcrumb */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-semibold mb-6 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Store Route 404 • Quiet Lane in the Bazaar</span>
          </div>

          {/* Central Hero Interaction: Fero Guardian & Interactive Shopkeeper Counter Bell */}
          <div className="relative mb-6 flex flex-col items-center">
            <div className="flex items-center justify-center gap-5 sm:gap-7">
              {/* Fero Mascot Guardian */}
              <div className="transition-transform duration-300 hover:scale-105">
                <FeroMascot size={80} showBadge={true} variant="calm" />
              </div>

              {/* Interactive Counter Bell */}
              <button
                type="button"
                onClick={handleRingBell}
                title="Ring the shopkeeper counter bell for good luck and a warm tip"
                className={`group relative p-4 rounded-2xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200/90 shadow-sm transition-all duration-200 cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 min-h-[48px] min-w-[48px] ${
                  isBellAnimating ? 'animate-bounce ring-4 ring-amber-300/50' : ''
                }`}
                aria-label="Ring the shopkeeper counter bell"
              >
                <div className="flex flex-col items-center gap-1.5">
                  <Bell
                    size={26}
                    className={`text-amber-700 transition-transform duration-200 ${
                      isBellAnimating ? 'rotate-12 scale-110 text-orange-600' : 'group-hover:rotate-6'
                    }`}
                  />
                  <span className="text-[11px] font-bold text-amber-900 tracking-tight">
                    {bellRingCount === 0 ? 'Ring Bell 🔔' : `Ting! (${bellRingCount})`}
                  </span>
                </div>

                {/* Subtle sound ring indicator */}
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                </span>
              </button>
            </div>

            {/* Lively Speech Bubble from the Bell */}
            {bellMessage && (
              <div className="mt-4 p-3 px-4 rounded-xl bg-amber-50/95 border border-amber-200 text-amber-950 text-xs sm:text-sm font-medium max-w-md shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
                {bellMessage}
              </div>
            )}
          </div>

          {/* Human, Warm Heading */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
            The shutter is down on this aisle.
          </h1>

          {/* Empathetic Subtext */}
          <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto leading-relaxed mb-6">
            Do not worry — no orders or products were lost. The page you are looking for might have been moved, renamed, or tucked away on a different shelf in our store.
          </p>

          {/* Smart Typo Detection Banner (If user typed a close path) */}
          {suggestedDestination && (
            <div className="w-full max-w-lg mb-8 p-4 rounded-2xl bg-blue-50/90 border border-blue-200/90 text-left shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Compass size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm">
                  <p className="font-semibold text-slate-900">
                    Looking for <span className="text-blue-700 font-bold">{suggestedDestination.title}</span>?
                  </p>
                  <p className="text-slate-600 text-xs mt-0.5">
                    Click through directly to {suggestedDestination.reason}.
                  </p>
                </div>
              </div>
              <Link
                to={suggestedDestination.href}
                className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all hover:translate-x-0.5 min-h-[44px]"
              >
                <span>Jump in</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          )}

          {/* Primary Action Buttons (Hick's Law: 2 primary choices) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full max-w-md mb-10">
            <Link
              to="/"
              className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-sm sm:text-base px-6 py-3.5 shadow-md shadow-blue-600/20 transition-all min-h-[48px] cursor-pointer"
            >
              <Home size={18} />
              <span>Back to FeraSetu Home</span>
              <ArrowRight size={16} />
            </Link>

            {user ? (
              <Link
                to="/dashboard"
                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white font-bold text-sm sm:text-base px-6 py-3.5 shadow-sm transition-all min-h-[48px] cursor-pointer"
              >
                <LayoutDashboard size={18} />
                <span>Open Dashboard</span>
              </Link>
            ) : (
              <Link
                to="/signup"
                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-800 font-bold text-sm sm:text-base px-6 py-3.5 transition-all min-h-[48px] cursor-pointer shadow-xs"
              >
                <Store size={18} className="text-orange-500" />
                <span>Start Free Store</span>
              </Link>
            )}
          </div>

          {/* Live Store Finder / Directory Search */}
          <div className="w-full max-w-xl mx-auto mb-10">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, orders, pricing, or settings..."
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/60 focus:bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-inner min-h-[48px]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-slate-800 p-1"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Filtered Search Results Dropdown/Card */}
            {searchQuery && (
              <div className="mt-3 p-2 bg-white rounded-2xl border border-slate-200 shadow-lg text-left divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {filteredLinks.length > 0 ? (
                  filteredLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        to={link.href}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Icon size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                {link.title}
                              </span>
                              {link.badge && (
                                <span className="px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-[10px] font-bold text-orange-700">
                                  {link.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-1">{link.description}</p>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No matching store shelves found for &quot;{searchQuery}&quot;. Try searching for &quot;dashboard&quot;, &quot;pricing&quot;, or &quot;products&quot;.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Helpful Shelves (4 clean, spacious cards) */}
          <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left mb-10">
            <Link
              to="/products"
              className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-blue-300 hover:bg-blue-50/20 transition-all duration-150 group shadow-2xs"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform">
                  <Package size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    Manage Products & Stock
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Check your catalog, add new items, or update inventory levels.
                  </p>
                </div>
              </div>
            </Link>

            <Link
              to="/pricing"
              className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-amber-300 hover:bg-amber-50/20 transition-all duration-150 group shadow-2xs"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform">
                  <DollarSign size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                    0% Commission Pricing
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    See our fair pricing tiers with zero marketplace take rate.
                  </p>
                </div>
              </div>
            </Link>

            <Link
              to="/ferasetu-ai"
              className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-purple-300 hover:bg-purple-50/20 transition-all duration-150 group shadow-2xs"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 group-hover:scale-105 transition-transform">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                    FeraSetu AI Studio
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Instant catalog generation and smart merchant copywriting.
                  </p>
                </div>
              </div>
            </Link>

            <Link
              to="/support"
              className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-emerald-300 hover:bg-emerald-50/20 transition-all duration-150 group shadow-2xs"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
                  <MessageCircle size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Human Merchant Support
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Direct WhatsApp help from real people who know retail.
                  </p>
                </div>
              </div>
            </Link>
          </div>

          {/* Trust Anchor & Direct Human Contact */}
          <div className="border-t border-slate-100 pt-6 w-full max-w-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5 font-medium">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>0% Commission · 100% Merchant Owned</span>
            </div>

            <div className="flex items-center gap-4">
              <Link to="/terms" className="hover:text-blue-600 transition-colors">
                Terms
              </Link>
              <span>•</span>
              <Link to="/privacy" className="hover:text-blue-600 transition-colors">
                Privacy
              </Link>
              <span>•</span>
              <a
                href="mailto:support@ferasetu.com"
                className="hover:text-blue-600 transition-colors font-semibold text-slate-700"
              >
                support@ferasetu.com
              </a>
            </div>
          </div>

        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
