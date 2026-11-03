import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
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
  Smartphone,
  Tablet,
  Monitor,
  Check,
  Palette,
  RotateCcw,
  Sliders,
  Type,
  Maximize2,
  Upload,
  History,
  Zap,
  Link2,
  Image as ImageIconLucide,
  Wand2,
  Menu,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { getStorefrontUrl } from '../utils/canonicalHostname';
import { useLanguage } from '../contexts/LanguageContext';
import TemplateRenderer from '../components/shop/TemplateRenderer';
import WebsiteAIBuilder from '../components/WebsiteAIBuilder';
import DesignPanel from '../builder/panels/DesignPanel';
import LogicPanel from '../builder/panels/LogicPanel';
import ConnectionsPanel from '../builder/panels/ConnectionsPanel';
import AssetsPanel from '../builder/panels/AssetsPanel';
import VersionHistoryModal from '../builder/modals/VersionHistoryModal';
import { builderApi } from '../builder/services/builderApi';
import { createDefaultSignupWorkflow } from '../builder/workflows/workflowSchema';
import type { ShopProduct, TemplateSection } from '../types/template';
import type { ThemeId, StorefrontSection, MerchantThemeOverrides } from '../storefront/theme/themeTypes';
import { THEMES_LIST, THEME_REGISTRY } from '../storefront/theme/themeDefinitions';
import { normalizeLegacySections } from '../storefront/compatibility/legacySectionAdapter';
import type { WorkflowDefinition, ConnectionConfig } from '../builder/types/builderTypes';
import posthog from '../lib/posthog';

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

type UnifiedTab = 'design' | 'logic' | 'connections' | 'assets' | 'ai';

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
  const outletContext = (useOutletContext<{ setSidebarOpen?: (open: boolean) => void }>() || {});

  const [activeTab, setActiveTab] = useState<UnifiedTab>('design');
  const [deviceView, setDeviceView] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [mobileMode, setMobileMode] = useState<'controls' | 'preview'>('controls');
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);

  // Store metadata & Canvas state
  const [shopName, setShopName] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [selectedThemeId, setSelectedThemeId] = useState<ThemeId>('market');
  const [sections, setSections] = useState<StorefrontSection[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<number>(1);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Authoritative Branding & Token Overrides
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [faviconUrl, setFaviconUrl] = useState<string>('');
  const [overrides, setOverrides] = useState<MerchantThemeOverrides>({
    primaryColor: '#0F172A',
    accentColor: '#16A34A',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    radiusStyle: 'soft',
    density: 'balanced',
  });

  // Declarative Workflows state
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([createDefaultSignupWorkflow()]);

  // Fetch website draft
  const { data: draftResponse, refetch: refetchDraft } = useQuery({
    queryKey: ['builder-draft'],
    queryFn: builderApi.getDraft,
  });

  // Fetch connections
  const { data: connectionsData, refetch: refetchConnections } = useQuery({
    queryKey: ['builder-connections'],
    queryFn: builderApi.getConnections,
  });

  // Fetch website fallback data
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

  // Initialize draft / store data
  useEffect(() => {
    if (draftResponse?.draft) {
      const d = draftResponse.draft;
      setShopName(d.name || user?.business_name || 'My Store');
      if (d.template && THEME_REGISTRY[d.template as ThemeId]) {
        setSelectedThemeId(d.template as ThemeId);
      }
      if (d.tokens) {
        setOverrides((prev) => ({
          ...prev,
          primaryColor: d.tokens?.colors?.primary || prev.primaryColor,
          accentColor: d.tokens?.colors?.secondary || prev.accentColor,
          fontFamily: d.tokens?.typography?.fontFamily || prev.fontFamily,
        }));
      }
      if (d.pages && d.pages.length > 0 && d.pages[0].nodes) {
        setSections(normalizeLegacySections(d.pages[0].nodes, d.name));
      }
      if (d.workflows && d.workflows.length > 0) {
        setWorkflows(d.workflows);
      }
      setCurrentVersion(draftResponse.version || 1);
    } else if (websiteData) {
      setShopName(websiteData.name || user?.business_name || 'My Store');
      const savedThemeId = (websiteData.theme?.id || websiteData.theme || websiteData.template) as ThemeId;
      if (THEME_REGISTRY[savedThemeId]) {
        setSelectedThemeId(savedThemeId);
      }
      if (websiteData.theme?.overrides) {
        setOverrides((prev) => ({ ...prev, ...websiteData.theme.overrides }));
      } else if (websiteData.config?.overrides) {
        setOverrides((prev) => ({ ...prev, ...websiteData.config.overrides }));
      }
      if (Array.isArray(websiteData.sections) && websiteData.sections.length > 0) {
        setSections(normalizeLegacySections(websiteData.sections, websiteData.name));
      } else {
        const defTheme = THEME_REGISTRY[savedThemeId] || THEME_REGISTRY.market;
        setSections(defTheme.defaultSections);
      }
      setIsPublished(websiteData.is_published === 1);
    } else {
      setShopName(user?.business_name || 'My Store');
      setSections(THEME_REGISTRY.market.defaultSections);
    }
  }, [draftResponse, websiteData, user]);

  // Listen for remove-section custom event from section components (e.g. AiAssistantSection)
  useEffect(() => {
    const handleRemoveSectionEvent = (e: any) => {
      if (e.detail?.id) {
        handleRemoveSection(e.detail.id);
      }
    };
    window.addEventListener('fera-remove-section', handleRemoveSectionEvent);
    return () => window.removeEventListener('fera-remove-section', handleRemoveSectionEvent);
  }, []);

  // Dedicated Theme Selection Handler
  const handleThemeSelect = (themeIdInput: string) => {
    let tId = (themeIdInput || 'market').toLowerCase().trim() as ThemeId;
    if (
      tId === ('mono-electronic' as any) ||
      tId === ('mono_electronic' as any) ||
      tId === ('tech' as any) ||
      tId === ('electronics' as any)
    ) {
      tId = 'electronic';
    }
    const themeDef = THEME_REGISTRY[tId] || THEME_REGISTRY.market;
    setSelectedThemeId(tId);

    // Update overrides to match the new theme's native palette, fonts & aesthetics
    setOverrides((prev) => ({
      ...prev,
      primaryColor: themeDef.colors.primary,
      accentColor: themeDef.colors.accent,
      fontFamily: themeDef.typography.fontFamilyBody,
      headingFont: themeDef.typography.fontFamilyHeading,
      radiusStyle: tId === 'atelier' || tId === 'mono' ? 'sharp' : tId === 'bold' ? 'rounded' : 'soft',
      density: tId === 'atelier' ? 'editorial' : 'balanced',
    }));

    // Update sections to the new theme's signature sections, adapting any existing merchant content
    setSections((currentSections) => {
      if (!currentSections || currentSections.length === 0) {
        return themeDef.defaultSections;
      }
      return themeDef.defaultSections.map((newSec) => {
        const existing = currentSections.find((s) => s.type === newSec.type);
        if (existing) {
          return {
            ...newSec,
            config: {
              ...newSec.config,
              ...(existing.config || {}),
            },
          };
        }
        return newSec;
      });
    });

    toast.success(`Theme switched to ${themeDef.name}`);
  };

  // Section Manipulation Handlers
  const handleAddSection = (type: string) => {
    const defaultVariant = 'clean';
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

  const handleRemoveSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
    if (selectedSectionId === id) setSelectedSectionId(null);
  };

  const handleReorderSections = (newSections: StorefrontSection[]) => {
    setSections(newSections);
  };

  const handleUpdateSectionConfig = (id: string, newConfig: Record<string, any>) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              config: { ...(s.config || {}), ...newConfig },
            }
          : s
      )
    );
  };

  const handleDuplicateSection = (id: string) => {
    const existing = sections.find((s) => s.id === id);
    if (!existing) return;
    const duplicated: StorefrontSection = {
      ...existing,
      id: `${existing.type}-${Date.now()}`,
      config: { ...(existing.config || {}) },
    };
    const index = sections.findIndex((s) => s.id === id);
    const newSections = [...sections];
    newSections.splice(index + 1, 0, duplicated);
    setSections(newSections);
    setSelectedSectionId(duplicated.id);
    toast.success(`Duplicated ${existing.type} section`);
  };

  // Cursor Drag-and-Drop Insert Handler for Preview Canvas
  const handleInsertSectionAt = (index: number, type: string, customConfig?: any) => {
    let cleanType = type;
    if (cleanType.startsWith('primitive.button') || cleanType === 'button') {
      cleanType = 'hero';
      customConfig = { ...(customConfig || {}), ctaText: customConfig?.text || 'Explore Products' };
    } else if (cleanType.startsWith('primitive.card') || cleanType === 'spotlight-card' || cleanType === 'bento-card') {
      cleanType = 'bento-grid';
    } else if (cleanType === 'marquee-ticker') {
      cleanType = 'marquee';
    }

    const newSection: StorefrontSection = {
      id: `${cleanType}-${Date.now()}`,
      type: cleanType as any,
      variant: 'clean',
      enabled: true,
      config: customConfig ? { ...customConfig } : {},
    };

    setSections((prev) => {
      const next = [...prev];
      const insertIdx = Math.max(0, Math.min(index, next.length));
      next.splice(insertIdx, 0, newSection);
      return next;
    });
    setSelectedSectionId(newSection.id);
    toast.success(`Added ${newSection.type.replace(/-/g, ' ')} block to canvas`);
  };

  const handleBindWorkflow = (nodeId: string, workflowId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === nodeId
          ? {
              ...s,
              props: { ...(s as any).props, workflowId },
              config: { ...s.config, workflowId },
            }
          : s
      )
    );
    toast.success('Interactive workflow bound to section');
  };

  const handleApplyAssetToNode = (assetUrl: string) => {
    if (!selectedSectionId) {
      toast.error('Select a section in Design panel first to apply this image');
      return;
    }
    setSections((prev) =>
      prev.map((s) =>
        s.id === selectedSectionId
          ? {
              ...s,
              config: { ...s.config, imageUrl: assetUrl, heroImage: assetUrl },
            }
          : s
      )
    );
    toast.success('Image applied to selected section preview!');
  };

  // Draft Save Handler
  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const draftPayload = {
        name: shopName,
        template: selectedThemeId,
        theme: {
          id: selectedThemeId,
          overrides,
        },
        config: {
          phone: shopPhone,
          logo: logoUrl || undefined,
          favicon: faviconUrl || undefined,
          overrides,
        },
        pages: [
          {
            id: 'page_home',
            name: 'Home',
            slug: '/',
            title: shopName,
            nodes: sections,
          },
        ],
        activePageId: 'page_home',
        tokens: {
          colors: {
            primary: overrides.primaryColor || '#0F172A',
            secondary: overrides.accentColor || '#16A34A',
            background: '#ffffff',
            text: '#111827',
          },
          typography: {
            fontFamily: overrides.fontFamily || 'Inter, sans-serif',
            baseFontSize: 16,
          },
        },
        workflows,
      };

      let saved = false;
      try {
        await builderApi.saveDraft(draftPayload);
        saved = true;
      } catch (builderErr) {
        console.warn('Builder draft endpoint warning, falling back to /website:', builderErr);
      }

      try {
        await api.post('/website', {
          name: shopName,
          template: selectedThemeId,
          theme: { id: selectedThemeId, overrides },
          config: { phone: shopPhone, logo: logoUrl, favicon: faviconUrl, overrides },
          sections,
        });
        saved = true;
      } catch (siteErr) {
        if (!saved) throw siteErr;
      }

      posthog.capture('storefront_draft_saved', {
        theme: selectedThemeId,
        section_count: sections.length,
        workflow_count: workflows.length,
      });
      toast.success('Working draft saved safely');
      refetchDraft();
      queryClient.invalidateQueries({ queryKey: ['website'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to save draft');
    } finally {
      setSavingDraft(false);
    }
  };

  // Publish Handler
  const handlePublish = async () => {
    setPublishing(true);
    try {
      // Ensure current state is saved as draft first
      await handleSaveDraft();
      let published = false;
      try {
        const res = await builderApi.publishDraft();
        setCurrentVersion(res.published_version);
        published = true;
      } catch (pubErr) {
        console.warn('Builder publish warning, syncing via website API:', pubErr);
      }

      try {
        await api.post('/website/publish', { published: true });
        published = true;
      } catch {}

      if (!published) {
        throw new Error('Unable to publish live. Please try again.');
      }

      setIsPublished(true);
      posthog.capture('storefront_published', {
        theme: selectedThemeId,
        section_count: sections.length,
      });
      toast.success('🎉 Store successfully published live!', {
        duration: 5000,
      });
      queryClient.invalidateQueries({ queryKey: ['website'] });
      refetchDraft();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Publishing failed');
    } finally {
      setPublishing(false);
    }
  };

  const handleRollbackComplete = () => {
    refetchDraft();
    queryClient.invalidateQueries({ queryKey: ['website'] });
    toast.success('Canvas restored to selected historical version');
  };

  const activeThemeDef = THEME_REGISTRY[selectedThemeId] || THEME_REGISTRY.market;
  const activeProducts = merchantProducts.length > 0 ? merchantProducts : DEMO_PRODUCTS;
  const liveUrl = getStorefrontUrl(user);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Top Cockpit Navigation Bar */}
      <div className="bg-white border-b border-slate-200/90 px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-3 sm:gap-6 flex-shrink-0 shadow-xs z-30">
        {/* Left Branding & Shop Name */}
        <div className="flex items-center gap-3 min-w-0">
          {outletContext.setSidebarOpen && (
            <button
              type="button"
              onClick={() => outletContext.setSidebarOpen?.(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 md:hidden shrink-0 cursor-pointer shadow-2xs transition-colors"
              aria-label="Open sidebar menu"
              title="Open menu"
            >
              <Menu size={18} />
            </button>
          )}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 text-white flex items-center justify-center font-black text-sm shadow-sm shadow-orange-500/25 flex-shrink-0 ring-1 ring-orange-400/30">
            FS
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate max-w-[110px] xs:max-w-[150px] sm:max-w-[220px] md:max-w-xs">
                {shopName || user?.business_name || user?.name || 'Himmat'}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-orange-50 text-orange-700 border border-orange-200/90 tracking-wide shadow-2xs">
                Theme: <span className="font-extrabold">{activeThemeDef.name}</span>
              </span>
              <span className="hidden md:inline-flex text-[11px] font-mono font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                v{currentVersion}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Mobile Segmented Mode Switcher (Editor vs Preview) */}
        <div className="flex lg:hidden items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
          <button
            type="button"
            onClick={() => setMobileMode('controls')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
              mobileMode === 'controls'
                ? 'bg-white text-orange-600 shadow-xs border border-orange-100'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sliders size={13} />
            <span>Editor</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileMode('preview')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
              mobileMode === 'preview'
                ? 'bg-white text-orange-600 shadow-xs border border-orange-100'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Eye size={13} />
            <span>Preview</span>
          </button>
        </div>

        {/* Desktop Device Switcher (Desktop/Tablet/Mobile Simulator) */}
        <div className="hidden lg:flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/90 shadow-2xs gap-1">
          <button
            type="button"
            onClick={() => setDeviceView('desktop')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              deviceView === 'desktop'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <Monitor size={14} className={deviceView === 'desktop' ? 'text-orange-600' : 'text-slate-400'} />
            <span>Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => setDeviceView('tablet')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              deviceView === 'tablet'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <Tablet size={14} className={deviceView === 'tablet' ? 'text-orange-600' : 'text-slate-400'} />
            <span>Tablet (768px)</span>
          </button>
          <button
            type="button"
            onClick={() => setDeviceView('mobile')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              deviceView === 'mobile'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <Smartphone size={14} className={deviceView === 'mobile' ? 'text-orange-600' : 'text-slate-400'} />
            <span>Mobile (375px)</span>
          </button>
        </div>

        {/* Action Buttons: Versions, Save Draft, Publish Live */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
          {/* Version History Button */}
          <button
            type="button"
            onClick={() => setIsVersionModalOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 text-slate-700 transition-all cursor-pointer shadow-2xs"
            title="View publication snapshots and rollback"
          >
            <History size={14} className="text-slate-500" />
            <span className="hidden md:inline">Versions</span>
          </button>

          {/* Website Settings Link */}
          <Link
            to="/website-settings"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 transition-all cursor-pointer shadow-2xs"
            title="Configure Google search indexing, visibility & SEO metadata"
          >
            <Sliders size={14} className="text-slate-500" />
            <span className="hidden md:inline">Settings</span>
          </Link>

          {isPublished && (
            <a
              href={liveUrl}
              target="_blank"
              rel="noreferrer"
              className="hidden xl:flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-3 py-2 rounded-xl transition-all shadow-2xs"
            >
              <ExternalLink size={13} /> Live Store
            </a>
          )}

          {/* Save Draft Button (Orange / Clean Warm Style - NO BLACK!) */}
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 text-xs font-bold border border-orange-200/90 bg-orange-50/70 hover:bg-orange-100 text-orange-700 rounded-xl shadow-2xs transition-all disabled:opacity-50 cursor-pointer active:scale-98"
          >
            <Save size={14} className="text-orange-600" />
            <span className="hidden sm:inline">{savingDraft ? 'Saving Draft…' : 'Save Draft'}</span>
            <span className="sm:hidden">{savingDraft ? 'Saving…' : 'Save'}</span>
          </button>

          {/* Publish Store Button (Emerald Green Primary) */}
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-xs shadow-emerald-600/25 transition-all disabled:opacity-50 cursor-pointer active:scale-98"
          >
            <Globe size={14} />
            <span>{publishing ? 'Publishing…' : 'Publish Live'}</span>
          </button>
        </div>
      </div>

      {/* Main Studio Workspace (Left Panels + Live Canvas) */}
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        {/* Desktop Left Navigation Icon Strip - Clean, Warm & Vibrant with Orange Accents, NO BLACK */}
        <div className="hidden lg:flex w-[72px] bg-white border-r border-slate-200 flex-col items-center py-4 gap-3 flex-shrink-0 z-20 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab('design')}
            title="Design & Style"
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'design'
                ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/30 ring-2 ring-orange-200'
                : 'text-slate-600 hover:text-orange-600 hover:bg-orange-50/80'
            }`}
          >
            <Palette size={18} />
            <span className="text-[10px] font-bold">Design</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logic')}
            title="Logic & Declarative Workflows"
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'logic'
                ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30 ring-2 ring-amber-200'
                : 'text-slate-600 hover:text-amber-600 hover:bg-amber-50/80'
            }`}
          >
            <Zap size={18} />
            <span className="text-[10px] font-bold">Logic</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('connections')}
            title="Connections & Data"
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'connections'
                ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30 ring-2 ring-blue-200'
                : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/80'
            }`}
          >
            <Link2 size={18} />
            <span className="text-[10px] font-bold">Data</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('assets')}
            title="Assets & Media"
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'assets'
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30 ring-2 ring-emerald-200'
                : 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-50/80'
            }`}
          >
            <ImageIconLucide size={18} />
            <span className="text-[10px] font-bold">Assets</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            title="AI Storefront Generator"
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-gradient-to-br from-purple-600 to-pink-500 text-white shadow-md shadow-purple-500/30 ring-2 ring-purple-200'
                : 'text-slate-600 hover:text-purple-600 hover:bg-purple-50/80'
            }`}
          >
            <Wand2 size={18} />
            <span className="text-[10px] font-bold">AI</span>
          </button>

          <div className="w-8 border-t border-slate-200 my-1" />

          <Link
            to="/website-settings"
            title="Website & SEO Settings"
            className="w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          >
            <Sliders size={18} />
            <span className="text-[10px] font-bold">Settings</span>
          </Link>
        </div>

        {/* Studio Controls Container */}
        {/* On desktop: w-96 flex-shrink-0. On mobile (<lg): full width if mobileMode === 'controls', hidden if mobileMode === 'preview' */}
        <div
          className={`flex-col h-full overflow-hidden z-10 bg-white border-r border-slate-200 ${
            mobileMode === 'controls' ? 'flex w-full lg:w-96 flex-shrink-0' : 'hidden lg:flex lg:w-96 flex-shrink-0'
          }`}
        >
          {/* Mobile Studio Category Tab Bar - Crisp White & Color Accents, NO BLACK */}
          <div className="flex lg:hidden overflow-x-auto no-scrollbar items-center bg-white px-3 py-2.5 gap-2 flex-shrink-0 border-b border-slate-200 shadow-2xs">
            {[
              { id: 'design', label: 'Design & Style', icon: Palette, activeBg: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs' },
              { id: 'logic', label: 'Workflows', icon: Zap, activeBg: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs' },
              { id: 'connections', label: 'Data', icon: Link2, activeBg: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs' },
              { id: 'assets', label: 'Assets', icon: ImageIconLucide, activeBg: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xs' },
              { id: 'ai', label: 'AI Generator', icon: Wand2, activeBg: 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-xs' },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? tab.activeBg
                      : 'text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200/80'
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Panel Content */}
          <div className="flex-1 overflow-hidden min-h-0">
            {activeTab === 'design' && (
              <DesignPanel
                selectedTheme={selectedThemeId}
                onThemeSelect={handleThemeSelect}
                primaryColor={overrides.primaryColor || activeThemeDef.colors.primary}
                onColorChange={(col) => setOverrides((prev) => ({ ...prev, primaryColor: col }))}
                fontFamily={overrides.fontFamily || activeThemeDef.typography.fontFamilyBody}
                onFontChange={(font) => setOverrides((prev) => ({ ...prev, fontFamily: font }))}
                sections={sections}
                onAddSection={handleAddSection}
                onRemoveSection={handleRemoveSection}
                selectedNodeId={selectedSectionId}
                onSelectNode={(id) => setSelectedSectionId(id)}
                workflows={workflows}
                onBindWorkflowToNode={handleBindWorkflow}
                onReorderSections={handleReorderSections}
                onUpdateSectionConfig={handleUpdateSectionConfig}
                onDuplicateSection={handleDuplicateSection}
              />
            )}

            {activeTab === 'logic' && (
              <LogicPanel
                workflows={workflows}
                onUpdateWorkflows={(wfs) => setWorkflows(wfs)}
              />
            )}

            {activeTab === 'connections' && (
              <ConnectionsPanel
                connections={connectionsData?.connections || []}
                onRefreshConnections={refetchConnections}
              />
            )}

            {activeTab === 'assets' && (
              <AssetsPanel
                selectedNodeId={selectedSectionId}
                onApplyAssetToNode={handleApplyAssetToNode}
              />
            )}

            {activeTab === 'ai' && (
              <div className="h-full overflow-y-auto p-4 sm:p-6 bg-white">
                <WebsiteAIBuilder
                  websiteId={websiteData?.id || 'new'}
                  shopName={shopName || user?.business_name || 'My Store'}
                  onApplied={(updatedWebsite: any) => {
                    if (updatedWebsite.template && THEME_REGISTRY[updatedWebsite.template as ThemeId]) {
                      setSelectedThemeId(updatedWebsite.template as ThemeId);
                    }
                    if (updatedWebsite.sections) {
                      setSections(normalizeLegacySections(updatedWebsite.sections, updatedWebsite.name));
                    }
                    if (updatedWebsite.theme?.overrides) {
                      setOverrides(updatedWebsite.theme.overrides);
                    }
                    toast.success('AI Website design applied!');
                    setActiveTab('design');
                  }}
                />
              </div>
            )}
          </div>

          {/* Mobile Bottom Quick-Action Bar */}
          <div className="p-3 bg-white/95 border-t border-slate-200 flex items-center justify-between gap-3 lg:hidden flex-shrink-0 shadow-lg">
            <button
              type="button"
              onClick={() => setMobileMode('preview')}
              className="flex-1 h-12 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-xs shadow-md shadow-orange-500/20 active:scale-98 transition-all"
            >
              <Eye size={16} />
              <span>Preview Storefront</span>
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={savingDraft}
              className="h-12 px-4 flex items-center justify-center gap-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs border border-orange-200 active:scale-98 transition-all disabled:opacity-50"
            >
              <Save size={15} className="text-orange-600" />
              <span>{savingDraft ? 'Saving…' : 'Save'}</span>
            </button>
          </div>
        </div>

        {/* Live Canvas Viewport Container */}
        {/* On desktop: flex-1 flex. On mobile (<lg): full width if mobileMode === 'preview', hidden if mobileMode === 'controls' */}
        <div
          className={`flex-1 h-full min-h-0 overflow-hidden bg-slate-100/90 dark:bg-slate-950/40 p-3 sm:p-5 md:p-6 lg:p-8 flex items-center justify-center relative ${
            mobileMode === 'preview' ? 'flex w-full' : 'hidden lg:flex'
          }`}
        >
          {/* Fixed Storefront Preview Frame / Tab (fixed container, leaves balanced spacing) */}
          <div
            className={`bg-white dark:bg-slate-900 transition-all duration-300 flex flex-col h-full max-h-full shadow-2xl rounded-2xl overflow-hidden border border-slate-200/90 dark:border-slate-800 ${
              deviceView === 'desktop'
                ? 'w-full max-w-6xl'
                : deviceView === 'tablet'
                ? 'w-[768px] max-w-full'
                : 'w-[390px] max-w-full rounded-3xl border-2 border-slate-300/90 dark:border-slate-700 shadow-2xl'
            }`}
          >
            {/* Live Storefront Renderer - Website scrolls smoothly inside fixed frame */}
            <div className="flex-1 min-h-0 h-full overflow-y-auto overflow-x-hidden relative overscroll-contain select-auto">
              <TemplateRenderer
                theme={selectedThemeId}
                themeId={selectedThemeId}
                sections={sections}
                shop={{
                  id: user?.id || 'demo-shop',
                  name: shopName || 'My Store',
                  description: 'Welcome to our online store',
                  phone: shopPhone || user?.phone || '',
                  logo_url: logoUrl,
                }}
                shopName={shopName || 'My Store'}
                shopId={user?.id || 'demo-shop'}
                shopPhone={shopPhone || user?.phone || ''}
                shopLogo={logoUrl}
                products={activeProducts}
                isPreview={true}
                previewMode={true}
                showPreviewBanner={false}
                overrides={overrides}
                themeOverrides={overrides}
                onSelectSection={(secId) => {
                  setSelectedSectionId(secId);
                  setActiveTab('design');
                  setMobileMode('controls');
                }}
                selectedSectionId={selectedSectionId}
                onRemoveSection={(secId) => {
                  handleRemoveSection(secId);
                }}
                onReorderSections={handleReorderSections}
                onInsertSectionAt={handleInsertSectionAt}
                onUpdateSectionConfig={handleUpdateSectionConfig}
                onDuplicateSection={handleDuplicateSection}
              />
            </div>
          </div>

          {/* Floating Return Button for Mobile Preview */}
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 lg:hidden pointer-events-auto">
            <button
              type="button"
              onClick={() => setMobileMode('controls')}
              className="flex items-center gap-2 px-5 py-3 bg-slate-900/95 hover:bg-black text-white text-xs font-bold rounded-full shadow-2xl border border-slate-700/60 backdrop-blur-md active:scale-95 transition-all"
            >
              <Sliders size={14} className="text-blue-400" />
              <span>Back to Editor Controls</span>
            </button>
          </div>
        </div>
      </div>

      {/* Version History & Rollback Modal */}
      <VersionHistoryModal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        onRollbackComplete={handleRollbackComplete}
      />
    </div>
  );
}
