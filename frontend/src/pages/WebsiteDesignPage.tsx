import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Monitor, Tablet, Smartphone, ExternalLink, Brush, ShieldCheck,
  Lock, RefreshCw, Maximize2, Palette, Sparkles, ArrowRight,
  Code, Eye, Check, ShoppingBag, Search, CheckCircle2, ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getStorefrontUrl } from '../utils/canonicalHostname';
import api from '../services/api';

interface ThemeItem {
  id: string;
  name: string;
  version: string;
  category: string;
  tagline: string;
  description: string;
  badge: string;
  tags: string[];
  imageUrl: string;
  isActive?: boolean;
}

const CURATED_THEMES: ThemeItem[] = [
  {
    id: 'atelier',
    name: 'Atelier',
    version: 'v2.4.1',
    category: 'Editorial',
    tagline: 'Curated editorial layout for craft merchants',
    description: 'Refined, editorial and quiet. Tailored for curated goods, lifestyle studios, and design-forward merchants.',
    badge: 'Editorial',
    tags: ['Editorial Spacing', 'Lookbook Ready', 'Hanken + Sans'],
    imageUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80',
    isActive: true,
  },
  {
    id: 'market',
    name: 'Market',
    version: 'v2.2.0',
    category: 'Commercial',
    tagline: 'High catalog density for daily retail',
    description: 'Welcoming, commercial and versatile. Built for high catalog density, fast grocery/retail purchasing, and clear offers.',
    badge: 'Catalog Density',
    tags: ['Quick-Add Drawer', 'Category Ribbon', 'Batch Pricing'],
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'mono',
    name: 'Mono',
    version: 'v1.9.4',
    category: 'Minimalist',
    tagline: 'Swiss modernist grid & brutalist typography',
    description: 'Minimal, stark and typography-focused. High-contrast monochrome and sharp architectural lines for contemporary brands.',
    badge: 'Brutalist Modern',
    tags: ['Stark Grid', '0px Sharp Corners', 'Monospaced Metadata'],
    imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'bold',
    name: 'Bold',
    version: 'v2.0.1',
    category: 'Expressive',
    tagline: 'Vibrant rhythm suited for apparel & lifestyle',
    description: 'Confident, expressive and visually distinctive. Vibrant rhythm and large cards suited for streetwear and youth lifestyle.',
    badge: 'High Impact',
    tags: ['Oversized Marquee', 'Punchy Micro-CTAs', 'Dynamic Grids'],
    imageUrl: 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'artisan',
    name: 'Artisan',
    version: 'v2.1.2',
    category: 'Warm & Earthy',
    tagline: 'Story-first layouts for ateliers and makers',
    description: 'Handcrafted, warm and character-rich. Organic textures, earth tones, and story-first layouts for ateliers and makers.',
    badge: 'Story & Craft',
    tags: ['Maker Story Block', 'Provenance Tags', 'Warm Khadi Tones'],
    imageUrl: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80',
  },
];

export default function WebsiteDesignPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [viewport, setViewport] = useState<'100%' | '768px' | '390px'>('100%');
  const [activeThemeId, setActiveThemeId] = useState('atelier');
  const [selectedDirection, setSelectedDirection] = useState<number | null>(1);
  const [aiCopilotNotice, setAiCopilotNotice] = useState<string | null>(null);

  const storeUrl = useMemo(() => getStorefrontUrl(user), [user]);
  const businessName = user?.business_name || (user as any)?.name || 'Himmat Crafts & Goods';
  const initial = businessName.charAt(0).toUpperCase();

  // Fetch real products for preview
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['products'],
    queryFn: async () => {
      try {
        const res = await api.get('/products');
        return Array.isArray(res.data) ? res.data : (res.data?.products || []);
      } catch {
        return [];
      }
    },
    staleTime: 60000,
  });

  const previewProducts = useMemo(() => {
    if (products.length > 0) return products.slice(0, 3);
    return [
      { id: '1', name: 'Mitti Ceramic Chai Kulhad Set', price: 1450, category: 'Tableware', badge: 'Hand-dipped' },
      { id: '2', name: 'Indigo Handloom Table Runner', price: 820, category: 'Textiles', badge: 'Pure Cotton' },
      { id: '3', name: 'Hammered Brass Dhoop Dani', price: 2190, category: 'Brassware', badge: 'Low Stock' },
    ];
  }, [products]);

  const handleApplyTheme = (theme: ThemeItem) => {
    setActiveThemeId(theme.id);
    toast.success(`Theme "${theme.name}" selected! Opening Studio Editor...`);
    setTimeout(() => {
      navigate('/website-builder');
    }, 400);
  };

  const handleTriggerAiAction = (actionName: string) => {
    setAiCopilotNotice(`FeraSetu AI: Applied "${actionName}" to your active store draft.`);
    toast.success(`Copilot: ${actionName} applied!`);
  };

  return (
    <div className="pb-16 max-w-[1400px] mx-auto space-y-6 text-slate-900 font-sans">
      
      {/* ── Breadcrumb & Top Bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="uppercase tracking-wider">Storefront Studio</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="text-blue-700 font-bold">{businessName}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Website & Design
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl font-medium">
            Make your storefront feel like your brand. Design your online presence on your terms with zero aggregator tax.
          </p>
        </div>

        {/* Top Primary Actions */}
        <div className="flex items-center flex-wrap gap-2.5 self-start md:self-auto">
          {/* Responsive Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setViewport('100%')}
              title="Desktop View"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewport === '100%' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Monitor size={17} />
            </button>
            <button
              type="button"
              onClick={() => setViewport('768px')}
              title="Tablet View"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewport === '768px' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Tablet size={17} />
            </button>
            <button
              type="button"
              onClick={() => setViewport('390px')}
              title="Mobile View"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewport === '390px' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Smartphone size={17} />
            </button>
          </div>

          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-10 px-3.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <span>Preview Storefront</span>
            <ExternalLink size={13} className="text-slate-400" />
          </a>

          <Link
            to="/website-builder"
            className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
          >
            <Brush size={14} />
            <span>Customize Design</span>
          </Link>
        </div>
      </div>

      {/* ── Sovereignty Belief Banner ── */}
      <div className="w-full bg-slate-50 border border-slate-200/80 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start md:items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck size={18} />
          </div>
          <div>
            <p className="font-extrabold text-sm text-slate-900 leading-snug">
              Your business is yours. The internet should be too.
            </p>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              100% merchant-owned domain, zero platform commissions on sales, and total aesthetic autonomy.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-xs font-semibold text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span className="font-mono text-slate-800">{user?.subdomain || 'vasai-thane'}.ferasetu.store</span>
          </span>
          <span className="text-slate-300">/</span>
          <Link to="/domains" className="font-bold text-blue-700 hover:underline">
            Connect Custom Domain
          </Link>
        </div>
      </div>

      {/* ── STOREFRONT PREVIEW HERO & ARCHITECTURE STATUS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Interactive Live Preview Centerpiece (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-2">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
            
            {/* Mock Browser Chrome */}
            <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between gap-4 border-b border-slate-200/80">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
                <div className="h-3.5 w-px bg-slate-200 mx-1" />
                <span className="text-xs text-slate-600 flex items-center gap-1.5 font-mono">
                  <Lock size={12} className="text-emerald-600" />
                  <span>https://{user?.subdomain || 'vasai-thane'}.ferasetu.store</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded-md text-slate-500 border border-slate-200">
                  {viewport === '100%' ? '1440 × 900' : viewport === '768px' ? '768 × 1024' : '390 × 844'}
                </span>
                <button
                  type="button"
                  onClick={() => toast.success('Storefront view refreshed!')}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Reload View"
                >
                  <RefreshCw size={13} />
                </button>
              </div>
            </div>

            {/* Rendered Storefront Stage */}
            <div className="bg-slate-100/70 p-4 sm:p-6 overflow-x-auto flex justify-center min-h-[520px]">
              <div
                style={{ width: viewport, maxWidth: '100%' }}
                className="transition-all duration-300 ease-out bg-white shadow-md rounded-xl overflow-hidden flex flex-col border border-slate-200"
              >
                {/* Store Header inside Mock */}
                <header className="px-5 py-3.5 bg-white flex items-center justify-between border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                      {initial}
                    </div>
                    <div>
                      <p className="font-extrabold text-xs text-slate-900 tracking-tight uppercase">
                        {businessName}
                      </p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                        Home & Goods Atelier
                      </p>
                    </div>
                  </div>
                  <nav className="hidden sm:flex items-center gap-4 text-xs font-medium text-slate-600">
                    <span className="text-slate-900 font-bold">Catalog</span>
                    <span>Essentials</span>
                    <span>Story</span>
                  </nav>
                  <div className="flex items-center gap-2 text-slate-700">
                    <button type="button" className="p-1 hover:bg-slate-50 rounded">
                      <Search size={14} />
                    </button>
                    <div className="relative p-1 hover:bg-slate-50 rounded">
                      <ShoppingBag size={14} />
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
                        2
                      </span>
                    </div>
                  </div>
                </header>

                {/* Store Hero Banner inside Mock */}
                <div className="p-5 sm:p-6 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100">
                  <div className="max-w-xs space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-orange-700 bg-orange-100 px-2 py-0.5 rounded-md inline-block">
                      Local Merchant Edition • 2026
                    </span>
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                      Handcrafted essentials direct from our local store.
                    </h2>
                    <p className="text-xs text-slate-600 font-medium">
                      0% aggregator markup. Delivered directly with care.
                    </p>
                    <div className="pt-1 flex items-center gap-2">
                      <span className="px-3 py-1.5 bg-slate-900 text-white font-bold text-xs rounded-lg shadow-xs">
                        Explore Collection
                      </span>
                    </div>
                  </div>
                  <div className="w-full sm:w-44 h-32 rounded-xl overflow-hidden bg-slate-200 shrink-0">
                    <img
                      src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=400&q=80"
                      alt="Artisan tableware"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Products Row inside Mock */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                        Curated Essentials
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">Direct store catalog</p>
                    </div>
                    <span className="text-xs font-bold text-blue-700">View All Items</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {previewProducts.map((p, idx) => (
                      <div key={p.id || idx} className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 flex flex-col justify-between">
                        <div>
                          <div className="h-24 rounded-lg bg-slate-200 overflow-hidden relative mb-2">
                            <img
                              src={
                                idx === 0
                                  ? 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=300&q=80'
                                  : idx === 1
                                  ? 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80'
                                  : 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=300&q=80'
                              }
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                            {p.badge && (
                              <span className="absolute top-1.5 right-1.5 bg-white/95 text-slate-900 px-1.5 py-0.5 rounded text-[9px] font-bold shadow-xs">
                                {p.badge}
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-xs text-slate-900 truncate">{p.name}</p>
                          <p className="text-[10px] text-slate-500 font-medium">{p.category || 'Retail'}</p>
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                          <span className="font-black text-xs text-slate-900 tabular-nums">
                            ₹{Number(p.price || 0).toLocaleString('en-IN')}
                          </span>
                          <span className="px-2 py-0.5 bg-white border border-slate-200 text-slate-800 rounded text-[10px] font-bold shadow-2xs">
                            Add
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer inside Mock */}
                <footer className="mt-auto px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                  <span>© {businessName}</span>
                  <span className="font-bold text-slate-700">Powered by FeraSetu Merchant Cloud</span>
                </footer>
              </div>
            </div>

            {/* Preview Control Bar Footer */}
            <div className="bg-slate-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80">
              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  Live & Synced (No unsaved changes)
                </span>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <span className="hidden sm:inline">Last published: Today IST</span>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to="/website-builder"
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Brush size={13} />
                  <span>Open Studio Editor</span>
                </Link>
              </div>
            </div>

          </div>
        </div>

        {/* Active Architecture & Token Controls (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Current Theme Status Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Active Store Theme</span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">Atelier</h3>
                <p className="text-xs text-slate-500 font-medium">v2.4.1 • Curated editorial layout for craft merchants</p>
              </div>
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-lg text-xs font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                Published
              </span>
            </div>

            {/* Token Strip */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Brand Design Tokens</span>
                <Link to="/website-builder" className="text-blue-700 hover:underline">Edit Tokens</Link>
              </div>

              <div className="grid grid-cols-4 gap-2 pt-0.5">
                <div className="flex flex-col items-center bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs">
                  <div className="w-5 h-5 rounded bg-[#0052FF] mb-1" />
                  <span className="text-[9px] font-mono text-slate-400">Primary</span>
                  <span className="text-[10px] font-bold text-slate-900">#0052FF</span>
                </div>
                <div className="flex flex-col items-center bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs">
                  <div className="w-5 h-5 rounded bg-[#0B1220] mb-1" />
                  <span className="text-[9px] font-mono text-slate-400">Surface</span>
                  <span className="text-[10px] font-bold text-slate-900">#0B1220</span>
                </div>
                <div className="flex flex-col items-center bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs">
                  <div className="w-5 h-5 rounded bg-[#E8590C] mb-1" />
                  <span className="text-[9px] font-mono text-slate-400">Accent</span>
                  <span className="text-[10px] font-bold text-slate-900">#E8590C</span>
                </div>
                <div className="flex flex-col items-center bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs">
                  <div className="w-5 h-5 rounded bg-[#F9F9FF] border border-slate-300 mb-1" />
                  <span className="text-[9px] font-mono text-slate-400">Canvas</span>
                  <span className="text-[10px] font-bold text-slate-900">#F9F9FF</span>
                </div>
              </div>

              <div className="pt-1 space-y-1 text-xs text-slate-600 font-medium">
                <div className="flex justify-between">
                  <span className="text-slate-400">Typography:</span>
                  <span className="font-bold text-slate-800">Hanken Grotesk & Sans</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Radius:</span>
                  <span className="font-bold text-slate-800 font-mono">8px (Subtle Rounded)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Shadow:</span>
                  <span className="font-bold text-slate-800">Planar & Crisp Line</span>
                </div>
              </div>
            </div>

            {/* Revision History Strip */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Recent Publication Revisions</span>
                <span className="text-blue-700">Audit Log</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-slate-800 font-medium">
                  <span className="font-bold">v2.4.1 — Collection launch</span>
                  <span className="text-slate-400 font-mono text-[10px]">Today, 14:15</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/60 text-slate-600 font-medium">
                  <span>v2.4.0 — Storefront banner refresh</span>
                  <span className="text-slate-400 font-mono text-[10px]">Oct 28</span>
                </div>
              </div>
            </div>
          </div>

          {/* FeraSetu AI Design Partner Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <Sparkles size={16} />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-900">FeraSetu AI Copilot</h4>
                <p className="text-[11px] text-slate-500 font-medium">Contextual one-click storefront enhancements</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => handleTriggerAiAction('Harmonize colors with your brand logo')}
                className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Palette size={14} className="text-blue-600" />
                  <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-700">Harmonize colors with brand logo</span>
                </div>
                <ArrowRight size={13} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => handleTriggerAiAction('Optimize product card density for mobile')}
                className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Smartphone size={14} className="text-blue-600" />
                  <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-700">Optimize product card density for mobile</span>
                </div>
                <ArrowRight size={13} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => handleTriggerAiAction('Generate festive campaign banner')}
                className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-blue-600" />
                  <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-700">Generate festive campaign banner</span>
                </div>
                <ArrowRight size={13} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {aiCopilotNotice && (
              <div className="p-2.5 rounded-lg bg-blue-50 text-[11px] text-blue-800 font-medium">
                {aiCopilotNotice}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── THEME SELECTION EXPERIENCE (Curated Collection) ── */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-700">
              <span className="uppercase tracking-wider">Independent Merchant Engine</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <span className="text-slate-500 font-medium">5 Curated Architectures</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Themes Built for Independence
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-3xl font-medium">
              Distinct design personalities engineered for commercial longevity. Switching themes preserves your entire product database, customer accounts, and order history.
            </p>
          </div>
        </div>

        {/* Themes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {CURATED_THEMES.map(theme => {
            const isCurrentlyActive = activeThemeId === theme.id;
            return (
              <div
                key={theme.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col group hover:shadow-md transition-all"
              >
                <div className="relative h-44 bg-slate-100 overflow-hidden">
                  <img
                    src={theme.imageUrl}
                    alt={theme.name}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                  />
                  {isCurrentlyActive && (
                    <div className="absolute top-3 left-3 bg-white text-slate-900 px-2.5 py-1 rounded-lg shadow-xs text-xs font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      Active on Store
                    </div>
                  )}
                  <div className="absolute top-3 right-3 bg-white/90 px-2 py-0.5 rounded text-[10px] font-mono text-slate-700">
                    {theme.version}
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-base text-slate-900">{theme.name}</h3>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {theme.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {theme.description}
                    </p>
                    <div className="pt-1 flex flex-wrap gap-1">
                      {theme.tags.map(t => (
                        <span key={t} className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyTheme(theme)}
                      className={`flex-1 h-9 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isCurrentlyActive
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      }`}
                    >
                      <span>{isCurrentlyActive ? 'Customize Active' : 'Apply Theme'}</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Custom Code Expansion Card */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200/90 p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-blue-600 flex items-center justify-center shadow-xs">
                <Code size={18} />
              </div>
              <h3 className="font-extrabold text-base text-slate-900">Build a Bespoke Theme</h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Have an in-house frontend engineer or agency? Export Liquid/HTML schemas, inject custom CSS variables, or link directly to custom code.
              </p>
            </div>
            <div className="space-y-2">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 font-mono text-[11px] text-slate-600 flex items-center justify-between">
                <span>git://store-theme</span>
                <span className="text-blue-700 font-bold">Connected</span>
              </div>
              <button
                type="button"
                onClick={() => toast.success('Developer documentation: Schema schemas are open!')}
                className="w-full h-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Developer Documentation
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── FAST SETUP ASSISTANCE ── */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Fast Setup Assistance</span>
            <h3 className="text-base font-extrabold text-slate-900 mt-0.5">Let's make this storefront uniquely yours</h3>
            <p className="text-xs text-slate-500 font-medium">Choose an aesthetic starting point. We'll configure fonts, color palettes, and header layouts in under 30 seconds.</p>
          </div>
          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full self-start md:self-auto">
            Preset Selector
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Preset 1 */}
          <div
            onClick={() => setSelectedDirection(1)}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
              selectedDirection === 1
                ? 'bg-blue-50/50 border-blue-500 shadow-xs'
                : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/60'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-slate-900">Elegant & Minimal</span>
                <ChevronRight size={14} className={selectedDirection === 1 ? 'text-blue-600' : 'text-slate-400'} />
              </div>
              <p className="text-xs text-slate-600 mt-1 font-medium">Generous whitespace, quiet typography, and gallery presentation for premium goods.</p>
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <span className="w-3 h-3 rounded-full bg-[#121c2b]" />
              <span className="w-3 h-3 rounded-full bg-[#f9f9ff] border border-slate-300" />
              <span className="w-3 h-3 rounded-full bg-[#737688]" />
              <span className="text-[10px] font-mono text-slate-500 ml-2">Monochrome</span>
            </div>
          </div>

          {/* Preset 2 */}
          <div
            onClick={() => setSelectedDirection(2)}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
              selectedDirection === 2
                ? 'bg-blue-50/50 border-blue-500 shadow-xs'
                : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/60'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-slate-900">Modern & Commercial</span>
                <ChevronRight size={14} className={selectedDirection === 2 ? 'text-blue-600' : 'text-slate-400'} />
              </div>
              <p className="text-xs text-slate-600 mt-1 font-medium">High product density, swift item additions, clear promotional alerts, and bold prices.</p>
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <span className="w-3 h-3 rounded-full bg-[#0052FF]" />
              <span className="w-3 h-3 rounded-full bg-[#E7F6F0]" />
              <span className="w-3 h-3 rounded-full bg-[#121C2B]" />
              <span className="text-[10px] font-mono text-slate-500 ml-2">Commercial Blue</span>
            </div>
          </div>

          {/* Preset 3 */}
          <div
            onClick={() => setSelectedDirection(3)}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
              selectedDirection === 3
                ? 'bg-blue-50/50 border-blue-500 shadow-xs'
                : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/60'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-slate-900">Creative & Expressive</span>
                <ChevronRight size={14} className={selectedDirection === 3 ? 'text-blue-600' : 'text-slate-400'} />
              </div>
              <p className="text-xs text-slate-600 mt-1 font-medium">Rich organic earth tones, story-first creator notes, and tactile product badges.</p>
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <span className="w-3 h-3 rounded-full bg-[#BF3003]" />
              <span className="w-3 h-3 rounded-full bg-[#FFDBD2]" />
              <span className="w-3 h-3 rounded-full bg-[#434656]" />
              <span className="text-[10px] font-mono text-slate-500 ml-2">Terracotta Spice</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
