import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Globe,
  Eye,
  EyeOff,
  Sparkles,
  Plus,
  Trash2,
  Save,
  ExternalLink,
  Layers,
  Settings,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Wand2,
  Smartphone,
  Tablet,
  Monitor,
  Check,
  Palette,
  RotateCcw,
  Sliders,
  Type,
  Maximize2,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import TemplateRenderer from '../components/shop/TemplateRenderer';
import WebsiteAIBuilder from '../components/WebsiteAIBuilder';
import type { ShopProduct, TemplateSection } from '../types/template';
import type { ThemeId, StorefrontSection, MerchantThemeOverrides } from '../storefront/theme/themeTypes';
import { THEMES_LIST, THEME_REGISTRY } from '../storefront/theme/themeDefinitions';
import { normalizeLegacySections } from '../storefront/compatibility/legacySectionAdapter';

// Realistic deterministic demo products for preview
const DEMO_PRODUCTS: ShopProduct[] = [
  {
    id: 'demo-1',
    name: 'Handcrafted Heritage Pashmina Shawl',
    price: 4999,
    sale_price: 3899,
    category: 'Apparel',
    stock_quantity: 8,
    image_url: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=800&q=80',
    is_active: 1,
  },
  {
    id: 'demo-2',
    name: 'Cold-Pressed Wild Forest Honey (500g)',
    price: 650,
    sale_price: 549,
    category: 'Gourmet',
    stock_quantity: 24,
    image_url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&q=80',
    is_active: 1,
  },
  {
    id: 'demo-3',
    name: 'Minimalist Matte Ceramic Planter & Saucer',
    price: 1299,
    category: 'Home & Living',
    stock_quantity: 12,
    image_url: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800&q=80',
    is_active: 1,
  },
  {
    id: 'demo-4',
    name: 'Mechanical Architectural Desk Timer',
    price: 2499,
    sale_price: 1999,
    category: 'Design & Tech',
    stock_quantity: 5,
    image_url: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&q=80',
    is_active: 1,
  },
  {
    id: 'demo-5',
    name: 'Pure Brass Hammered Chai Kulhad Set',
    price: 1450,
    category: 'Handmade',
    stock_quantity: 15,
    image_url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&q=80',
    is_active: 1,
  },
  {
    id: 'demo-6',
    name: 'Heavyweight Drop-Shoulder Oversized Tee',
    price: 1199,
    sale_price: 899,
    category: 'Streetwear',
    stock_quantity: 30,
    image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80',
    is_active: 1,
  },
];

const AVAILABLE_SECTIONS = [
  { type: 'announcement', label: 'Announcement Bar', emoji: '📢', defaultVariant: 'ticker' },
  { type: 'header', label: 'Header Navigation', emoji: '🧭', defaultVariant: 'commerce' },
  { type: 'hero', label: 'Hero Showcase', emoji: '🦸', defaultVariant: 'split' },
  { type: 'trust-strip', label: 'Trust & Guarantees', emoji: '🛡️', defaultVariant: 'commerce-badges' },
  { type: 'category-grid', label: 'Category Explorer', emoji: '🏷️', defaultVariant: 'pill-slider' },
  { type: 'product-grid', label: 'Product Catalog', emoji: '🛍️', defaultVariant: 'clean' },
  { type: 'featured-product', label: 'Flagship Spotlight', emoji: '⭐', defaultVariant: 'spotlight' },
  { type: 'brand-story', label: 'Brand Story / Maker Note', emoji: '📖', defaultVariant: 'split-right-image' },
  { type: 'testimonials', label: 'Customer Reviews', emoji: '💬', defaultVariant: 'verified-buyer-feed' },
  { type: 'faq', label: 'FAQ Accordion', emoji: '❓', defaultVariant: 'accordion' },
  { type: 'newsletter', label: 'Newsletter / Updates', emoji: '✉️', defaultVariant: 'minimal' },
  { type: 'footer', label: 'Store Footer', emoji: '🦶', defaultVariant: 'commerce' },
];

const SECTION_VARIANTS_MAP: Record<string, { id: string; label: string }[]> = {
  announcement: [
    { id: 'ticker', label: 'Scrolling Marquee Ticker' },
    { id: 'static-center', label: 'Centered Editorial' },
    { id: 'split-promos', label: 'Split Dual Offers' },
    { id: 'minimal', label: 'Minimal One-Liner' },
  ],
  header: [
    { id: 'commerce', label: 'Commerce Practical (Search & Categories)' },
    { id: 'editorial', label: 'Editorial Centered Logo' },
    { id: 'minimal', label: 'Swiss Grid Minimal' },
    { id: 'bold', label: 'Bold Pill Navigation' },
    { id: 'artisan', label: 'Artisan Heritage Emblem' },
  ],
  hero: [
    { id: 'commerce-banner', label: 'Commerce Banner with Trust Highlights' },
    { id: 'editorial', label: 'Quiet Luxury Editorial' },
    { id: 'product-focused', label: 'Product Spotlight Card' },
    { id: 'artisan-story', label: 'Maker Workshop Story' },
    { id: 'minimal', label: 'Typographic Swiss Statement' },
    { id: 'split', label: 'Asymmetric Split Media' },
  ],
  'trust-strip': [
    { id: 'commerce-badges', label: 'Retail Badges (COD, Dispatch, Return)' },
    { id: 'luxury-guarantee', label: 'Luxury Assurance & Bespoke Packaging' },
    { id: 'artisan-values', label: 'Artisan Values (Handmade, Fair Trade)' },
  ],
  'product-grid': [
    { id: 'clean', label: 'Clean Retail (Instant Cart & WhatsApp)' },
    { id: 'editorial', label: 'Editorial 3:4 Luxury' },
    { id: 'mono', label: 'Mono Swiss 1px Grid' },
    { id: 'bold', label: 'Bold Rounded with Pill Badges' },
    { id: 'artisan', label: 'Artisan Tactile Linen' },
  ],
  'brand-story': [
    { id: 'split-right-image', label: 'Split Text & Image' },
    { id: 'quote-center', label: 'Centered Manifesto Quote' },
    { id: 'heritage-story', label: 'Artisan Heritage Note' },
  ],
  footer: [
    { id: 'commerce', label: 'Retail Complete (Contact & WhatsApp)' },
    { id: 'editorial', label: 'Editorial Multi-Column' },
    { id: 'minimal', label: 'Minimalist Single Row' },
    { id: 'artisan', label: 'Artisan Heritage Warmth' },
  ],
};

interface WebsiteRecord {
  id: string;
  name: string;
  template: string;
  theme?: any;
  config?: any;
  sections: any[];
  is_published: number;
}

export default function WebsiteBuilderPage() {
  const { user } = useAuth();
  const { translate } = useLanguage();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'gallery' | 'customize' | 'sections' | 'ai'>('gallery');
  const [deviceView, setDeviceView] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Store metadata
  const [shopName, setShopName] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [selectedThemeId, setSelectedThemeId] = useState<ThemeId>('market');
  const [sections, setSections] = useState<StorefrontSection[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);

  // Overrides state
  const [overrides, setOverrides] = useState<MerchantThemeOverrides>({
    radiusStyle: 'soft',
    density: 'balanced',
  });

  // Modal preview state for gallery
  const [previewModalTheme, setPreviewModalTheme] = useState<ThemeId | null>(null);

  // Fetch website data
  const { data: websiteData } = useQuery<WebsiteRecord | null>({
    queryKey: ['website'],
    queryFn: async () => {
      try {
        const res = await api.get('/website');
        return res.data as WebsiteRecord;
      } catch {
        return null;
      }
    },
  });

  // Fetch merchant products for live preview
  const { data: merchantProducts = [] } = useQuery<ShopProduct[]>({
    queryKey: ['products'],
    queryFn: async () => {
      try {
        const res = await api.get('/products');
        return res.data.products || res.data || [];
      } catch {
        return [];
      }
    },
  });

  // Initialize from existing store data
  useEffect(() => {
    if (websiteData) {
      setShopName(websiteData.name || user?.business_name || 'My Store');
      const savedThemeId = (websiteData.theme?.id || websiteData.theme || websiteData.template) as ThemeId;
      if (THEME_REGISTRY[savedThemeId]) {
        setSelectedThemeId(savedThemeId);
      }

      if (websiteData.theme?.overrides || websiteData.config?.overrides) {
        setOverrides(websiteData.theme?.overrides || websiteData.config?.overrides || {});
      }

      if (Array.isArray(websiteData.sections) && websiteData.sections.length > 0) {
        const normalized = normalizeLegacySections(websiteData.sections, websiteData.name);
        setSections(normalized);
      } else {
        const defaultSecs = (THEME_REGISTRY[savedThemeId] || THEME_REGISTRY.market).defaultSections;
        setSections(defaultSecs);
      }

      setIsPublished(websiteData.is_published === 1);
    } else {
      setShopName(user?.business_name || 'My Store');
      setShopPhone(user?.phone || '');
      setSections(THEME_REGISTRY.market.defaultSections);
    }
  }, [websiteData, user]);

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: () =>
      api.post('/website', {
        name: shopName,
        template: selectedThemeId,
        theme: {
          id: selectedThemeId,
          overrides,
        },
        config: {
          phone: shopPhone,
          overrides,
        },
        sections,
      }),
    onSuccess: () => {
      toast.success('Storefront changes saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['website'] });
      setSaving(false);
    },
    onError: () => {
      toast.error('Failed to save. Please try again.');
      setSaving(false);
    },
  });

  // Publish Mutation
  const publishMutation = useMutation({
    mutationFn: () => api.patch('/website/publish', { published: !isPublished }),
    onSuccess: (res) => {
      const published = (res.data as { published: boolean }).published;
      setIsPublished(published);
      toast.success(published ? '🌐 Website published and live!' : '🔒 Website taken offline');
    },
    onError: () => toast.error('Failed to update publish status'),
  });

  const handleSave = () => {
    if (!shopName.trim()) {
      toast.error('Please enter a shop name');
      return;
    }
    setSaving(true);
    saveMutation.mutate();
  };

  // 1-Click Apply Theme
  const handleApplyTheme = (themeId: ThemeId) => {
    const themeDef = THEME_REGISTRY[themeId];
    if (!themeDef) return;

    setSelectedThemeId(themeId);
    setSections(themeDef.defaultSections);
    setOverrides((prev) => ({
      ...prev,
      primaryColor: themeDef.colors.primary,
      accentColor: themeDef.colors.accent,
      radiusStyle: themeId === 'atelier' || themeId === 'mono' ? 'sharp' : themeId === 'bold' ? 'rounded' : 'soft',
    }));
    setPreviewModalTheme(null);
    setActiveTab('customize');
    toast.success(`Theme switched to ${themeDef.name}!`, { icon: '✨' });
  };

  // Section Manipulation
  const moveSection = (idx: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= sections.length) return;
    const copy = [...sections];
    const item = copy.splice(idx, 1)[0];
    copy.splice(newIdx, 0, item);
    setSections(copy);
  };

  const toggleSectionEnabled = (id: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: s.enabled === false ? true : false } : s))
    );
  };

  const updateSectionVariant = (id: string, variant: string) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, variant } : s)));
  };

  const deleteSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
    if (selectedSectionId === id) setSelectedSectionId(null);
  };

  const addSection = (type: string, defaultVariant: string) => {
    const newSection: StorefrontSection = {
      id: `${type}-${Date.now()}`,
      type: type as any,
      variant: defaultVariant,
      enabled: true,
      config: {},
    };
    setSections((prev) => [...prev, newSection]);
    setSelectedSectionId(newSection.id);
    toast.success(`Added ${type} section`);
  };

  const updateSectionConfig = (sectionId: string, key: string, value: unknown) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, config: { ...s.config, [key]: value } } : s))
    );
  };

  const activeThemeDef = THEME_REGISTRY[selectedThemeId] || THEME_REGISTRY.market;
  const activeProducts = merchantProducts.length > 0 ? merchantProducts : DEMO_PRODUCTS;

  const baseDomain = import.meta.env.VITE_BASE_DOMAIN || 'ferasetu.com';
  const liveUrl = `https://${user?.subdomain || shopName.toLowerCase().replace(/\s+/g, '-')}.${baseDomain}`;

  const selectedSection = sections.find((s) => s.id === selectedSectionId) || null;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-slate-100 text-slate-900 font-sans">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm">
            FS
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Website Studio</span>
              <span className="text-[11px] font-medium text-slate-400">·</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                Theme: {activeThemeDef.name}
              </span>
            </h1>
          </div>
        </div>

        {/* Device Switcher */}
        <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setDeviceView('desktop')}
            className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-1.5 transition-all ${
              deviceView === 'desktop' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Monitor size={14} /> Desktop
          </button>
          <button
            type="button"
            onClick={() => setDeviceView('tablet')}
            className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-1.5 transition-all ${
              deviceView === 'tablet' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Tablet size={14} /> Tablet
          </button>
          <button
            type="button"
            onClick={() => setDeviceView('mobile')}
            className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-1.5 transition-all ${
              deviceView === 'mobile' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone size={14} /> Mobile
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {isPublished && (
            <a
              href={liveUrl}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded hover:bg-emerald-50 transition-colors"
            >
              <ExternalLink size={13} /> View Live Store
            </a>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-slate-900 text-white hover:bg-black rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            <Save size={13} /> {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => publishMutation.mutate()}
            disabled={publishMutation.isPending}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white rounded-lg shadow-sm transition-colors ${
              isPublished ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isPublished ? <EyeOff size={13} /> : <Globe size={13} />}
            {isPublished ? 'Take Offline' : 'Publish Store'}
          </button>
        </div>
      </div>

      {/* Main Workspace Layout (Sidebar + Live Preview Frame) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Control Sidebar */}
        <div className="w-80 md:w-96 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 overflow-hidden">
          {/* Studio Tab Navigation */}
          <div className="flex border-b border-slate-200 bg-slate-50/50 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('gallery')}
              className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'gallery'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Palette size={14} /> Themes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('customize')}
              className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'customize'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Sliders size={14} /> Brand &amp; Style
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sections')}
              className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'sections'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Layers size={14} /> Sections
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'ai'
                  ? 'bg-white text-purple-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Wand2 size={14} /> AI
            </button>
          </div>

          {/* Sidebar Tab Panels */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* 1. THEMES GALLERY */}
            {activeTab === 'gallery' && (
              <div className="space-y-4">
                <div className="mb-2">
                  <h3 className="text-sm font-bold text-slate-900">5 Distinct Storefront Themes</h3>
                  <p className="text-xs text-slate-500">
                    Switch between handcrafted design architectures. All products, orders, and content are preserved.
                  </p>
                </div>

                <div className="space-y-3.5">
                  {THEMES_LIST.map((theme) => {
                    const isSelected = selectedThemeId === theme.id;
                    return (
                      <div
                        key={theme.id}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/20 ring-2 ring-blue-600/10'
                            : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                        }`}
                        onClick={() => setSelectedThemeId(theme.id)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{theme.defaultSections[0]?.config?.text ? '✨' : '🛍️'}</span>
                            <div>
                              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                {theme.name}
                                {isSelected && (
                                  <span className="text-[10px] font-black bg-blue-600 text-white px-1.5 py-0.2 rounded">
                                    ACTIVE
                                  </span>
                                )}
                              </h4>
                              <span className="text-[11px] text-slate-500 font-medium">
                                {theme.tagline}
                              </span>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed mb-3">
                          {theme.description}
                        </p>

                        {/* Palette preview */}
                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-4 h-4 rounded-full border border-black/10 shadow-xs"
                              style={{ backgroundColor: theme.colors.primary }}
                            />
                            <span
                              className="w-4 h-4 rounded-full border border-black/10 shadow-xs"
                              style={{ backgroundColor: theme.colors.accent }}
                            />
                            <span
                              className="w-4 h-4 rounded-full border border-black/10 shadow-xs"
                              style={{ backgroundColor: theme.colors.background }}
                            />
                            <span className="text-[11px] text-slate-400 font-mono ml-1">
                              {theme.aspectRatio} card
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApplyTheme(theme.id);
                              }}
                              className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                                isSelected
                                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                                  : 'bg-slate-900 text-white hover:bg-black'
                              }`}
                            >
                              {isSelected ? 'Applied' : 'Apply Theme'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. BRAND & STYLE CUSTOMIZER */}
            {activeTab === 'customize' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">Brand Identity</h3>
                  <p className="text-xs text-slate-500 mb-3">
                    Configure your shop branding and contact details.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        Store Name
                      </label>
                      <input
                        type="text"
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-slate-900 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        WhatsApp Contact Phone
                      </label>
                      <input
                        type="tel"
                        value={shopPhone}
                        onChange={(e) => setShopPhone(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900 mb-1">Theme Palette Overrides</h3>
                  <p className="text-xs text-slate-500 mb-3">
                    Customize primary and accent colors within the {activeThemeDef.name} theme.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        Primary Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={overrides.primaryColor || activeThemeDef.colors.primary}
                          onChange={(e) =>
                            setOverrides({ ...overrides, primaryColor: e.target.value })
                          }
                          className="w-8 h-8 rounded border-0 cursor-pointer"
                        />
                        <span className="text-xs font-mono text-slate-700">
                          {overrides.primaryColor || activeThemeDef.colors.primary}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        Accent Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={overrides.accentColor || activeThemeDef.colors.accent}
                          onChange={(e) =>
                            setOverrides({ ...overrides, accentColor: e.target.value })
                          }
                          className="w-8 h-8 rounded border-0 cursor-pointer"
                        />
                        <span className="text-xs font-mono text-slate-700">
                          {overrides.accentColor || activeThemeDef.colors.accent}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900 mb-1">Shape &amp; Radius</h3>
                  <p className="text-xs text-slate-500 mb-3">
                    Controlled corner styles maintaining typographic harmony.
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    {(['sharp', 'soft', 'rounded'] as const).map((rad) => (
                      <button
                        key={rad}
                        type="button"
                        onClick={() => setOverrides({ ...overrides, radiusStyle: rad })}
                        className={`py-2 px-3 text-xs font-bold rounded border capitalize transition-all ${
                          overrides.radiusStyle === rad
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {rad}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900 mb-1">Section Density</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {(['compact', 'balanced', 'editorial'] as const).map((density) => (
                      <button
                        key={density}
                        type="button"
                        onClick={() => setOverrides({ ...overrides, density })}
                        className={`py-2 px-3 text-xs font-bold rounded border capitalize transition-all ${
                          overrides.density === density
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {density}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 3. SECTIONS MANAGER */}
            {activeTab === 'sections' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Store Sections</h3>
                    <p className="text-xs text-slate-500">
                      Drag, reorder, or swap variants for each section.
                    </p>
                  </div>
                </div>

                {/* Active Sections List */}
                <div className="space-y-2">
                  {sections.map((section, idx) => {
                    const variants = SECTION_VARIANTS_MAP[section.type] || [];
                    const isSelected = selectedSectionId === section.id;

                    return (
                      <div
                        key={section.id}
                        className={`p-3 rounded-lg border transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/30'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                            <span className="text-xs font-bold capitalize text-slate-800">
                              {section.type.replace('-', ' ')}
                            </span>
                            {section.enabled === false && (
                              <span className="text-[10px] bg-slate-200 text-slate-600 px-1 rounded">
                                Hidden
                              </span>
                            )}
                          </div>

                          {/* Reorder and action buttons */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveSection(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                              aria-label="Move section up"
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveSection(idx, 'down')}
                              disabled={idx === sections.length - 1}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                              aria-label="Move section down"
                            >
                              <ChevronDown size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleSectionEnabled(section.id)}
                              className="p-1 text-slate-400 hover:text-slate-700"
                              title={section.enabled === false ? 'Show section' : 'Hide section'}
                            >
                              {section.enabled === false ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteSection(section.id)}
                              className="p-1 text-slate-400 hover:text-red-600"
                              title="Delete section"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Variant selector */}
                        {variants.length > 0 && (
                          <div className="mt-2">
                            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                              Layout Variant
                            </label>
                            <select
                              value={section.variant || variants[0].id}
                              onChange={(e) => updateSectionVariant(section.id, e.target.value)}
                              className="w-full text-xs font-medium border border-slate-200 rounded p-1.5 bg-slate-50 text-slate-800 focus:outline-none"
                            >
                              {variants.map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add Section Library */}
                <div className="pt-4 border-t border-slate-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Add More Sections
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_SECTIONS.map((sec) => (
                      <button
                        key={sec.type}
                        type="button"
                        onClick={() => addSection(sec.type, sec.defaultVariant)}
                        className="p-2 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors"
                      >
                        <span>{sec.emoji}</span>
                        <span className="truncate">{sec.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 4. AI BUILDER */}
            {activeTab === 'ai' && (
              <WebsiteAIBuilder
                shopName={shopName}
                onGenerate={(generatedSections) => {
                  setSections(generatedSections);
                  toast.success('✨ AI Sections generated! Check live preview.');
                }}
              />
            )}
          </div>
        </div>

        {/* Right Live Interactive Preview Workspace */}
        <div className="flex-1 bg-slate-200/80 overflow-y-auto p-4 sm:p-6 flex justify-center items-start">
          <div
            className={`bg-white shadow-2xl transition-all duration-300 overflow-hidden flex flex-col ${
              deviceView === 'mobile'
                ? 'w-[390px] rounded-[36px] border-[10px] border-slate-800 min-h-[780px]'
                : deviceView === 'tablet'
                ? 'w-[768px] rounded-2xl border-[8px] border-slate-800 min-h-[900px]'
                : 'w-full max-w-[1340px] rounded-xl border border-slate-300 min-h-[900px]'
            }`}
          >
            {/* Mock device status bar on mobile */}
            {deviceView === 'mobile' && (
              <div className="h-6 bg-slate-800 text-white text-[11px] px-6 flex items-center justify-between select-none">
                <span>9:41</span>
                <div className="w-16 h-4 bg-black rounded-full" />
                <span>5G 100%</span>
              </div>
            )}

            <div className="flex-1 overflow-x-hidden">
              <TemplateRenderer
                shopId={user?.id || 'builder-preview'}
                shopName={shopName || 'Store'}
                shopPhone={shopPhone}
                products={activeProducts}
                theme={selectedThemeId}
                overrides={overrides}
                sections={sections}
                isPreview={true}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
