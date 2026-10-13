import React, { useState, useEffect, useMemo, useRef } from 'react';
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
    primaryColor: '#2563eb',
    accentColor: '#1e293b',
    fontFamily: 'Inter, sans-serif',
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
      }
      if (Array.isArray(websiteData.sections) && websiteData.sections.length > 0) {
        setSections(normalizeLegacySections(websiteData.sections, websiteData.name));
      } else {
        setSections(THEME_REGISTRY.market.defaultSections);
      }
      setIsPublished(websiteData.is_published === 1);
    } else {
      setShopName(user?.business_name || 'My Store');
      setSections(THEME_REGISTRY.market.defaultSections);
    }
  }, [draftResponse, websiteData, user]);

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
            primary: overrides.primaryColor || '#2563eb',
            secondary: overrides.accentColor || '#4b5563',
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

      await builderApi.saveDraft(draftPayload);
      toast.success('Working draft saved safely (not affecting live store)');
      refetchDraft();
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
      const res = await builderApi.publishDraft();
      setIsPublished(true);
      setCurrentVersion(res.published_version);
      toast.success(`🎉 Store successfully published live as Version ${res.published_version}!`, {
        duration: 5000,
      });
      queryClient.invalidateQueries({ queryKey: ['website'] });
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
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-slate-100 text-slate-900 font-sans">
      {/* Top Cockpit Navigation Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between gap-4 flex-shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-sm">
            FS
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900">
                {shopName || 'Unified Website Builder'}
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                Theme: {activeThemeDef.name}
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                v{currentVersion}
              </span>
            </div>
          </div>
        </div>

        {/* Device Switcher (Desktop/Tablet/Mobile) */}
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
            <Tablet size={14} /> Tablet (768px)
          </button>
          <button
            type="button"
            onClick={() => setDeviceView('mobile')}
            className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-1.5 transition-all ${
              deviceView === 'mobile' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone size={14} /> Mobile (375px)
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Version History Button */}
          <button
            type="button"
            onClick={() => setIsVersionModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
            title="View publication snapshots and rollback"
          >
            <History size={13} />
            <span className="hidden sm:inline">Versions</span>
          </button>

          {isPublished && (
            <a
              href={liveUrl}
              target="_blank"
              rel="noreferrer"
              className="hidden lg:flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded hover:bg-emerald-50 transition-colors"
            >
              <ExternalLink size={13} /> Live Store
            </a>
          )}

          {/* Save Draft Button */}
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 text-xs font-bold bg-slate-900 text-white hover:bg-black rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            <Save size={13} />
            <span>{savingDraft ? 'Saving Draft…' : 'Save Draft'}</span>
          </button>

          {/* Publish Store Button */}
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            <Globe size={13} />
            <span>{publishing ? 'Publishing…' : 'Publish Live'}</span>
          </button>
        </div>
      </div>

      {/* Main Studio Workspace (Left Panels + Live Canvas) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Navigation Icon Strip */}
        <div className="w-16 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-3 gap-2 flex-shrink-0 z-20">
          <button
            onClick={() => setActiveTab('design')}
            title="Design & Style"
            className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
              activeTab === 'design'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Palette size={16} />
            <span className="text-[9px] font-bold">Design</span>
          </button>

          <button
            onClick={() => setActiveTab('logic')}
            title="Logic & Declarative Workflows"
            className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
              activeTab === 'logic'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Zap size={16} />
            <span className="text-[9px] font-bold">Logic</span>
          </button>

          <button
            onClick={() => setActiveTab('connections')}
            title="Connections & Data"
            className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
              activeTab === 'connections'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Link2 size={16} />
            <span className="text-[9px] font-bold">Data</span>
          </button>

          <button
            onClick={() => setActiveTab('assets')}
            title="Assets & Media"
            className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
              activeTab === 'assets'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ImageIconLucide size={16} />
            <span className="text-[9px] font-bold">Assets</span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            title="AI Storefront Generator"
            className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
              activeTab === 'ai'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Wand2 size={16} />
            <span className="text-[9px] font-bold">AI</span>
          </button>
        </div>

        {/* Contextual Drawer / Panel Area */}
        <div className="w-80 md:w-96 flex-shrink-0 h-full overflow-hidden z-10">
          {activeTab === 'design' && (
            <DesignPanel
              selectedTheme={selectedThemeId}
              onThemeSelect={(tId) => setSelectedThemeId(tId as ThemeId)}
              primaryColor={overrides.primaryColor || '#2563eb'}
              onColorChange={(col) => setOverrides((prev) => ({ ...prev, primaryColor: col }))}
              fontFamily={overrides.fontFamily || 'Inter, sans-serif'}
              onFontChange={(font) => setOverrides((prev) => ({ ...prev, fontFamily: font }))}
              sections={sections}
              onAddSection={handleAddSection}
              onRemoveSection={handleRemoveSection}
              selectedNodeId={selectedSectionId}
              onSelectNode={(id) => setSelectedSectionId(id)}
              workflows={workflows}
              onBindWorkflowToNode={handleBindWorkflow}
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
            <div className="h-full overflow-y-auto p-4 bg-white dark:bg-slate-900">
              <WebsiteAIBuilder
                websiteId={websiteData?.id || 'new'}
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

        {/* Live Canvas Viewport Container */}
        <div className="flex-1 bg-slate-200/70 p-4 md:p-6 overflow-y-auto flex items-start justify-center">
          <div
            className={`bg-white shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 border border-slate-300/80 flex flex-col ${
              deviceView === 'desktop'
                ? 'w-full max-w-6xl min-h-[85vh]'
                : deviceView === 'tablet'
                ? 'w-[768px] min-h-[85vh]'
                : 'w-[375px] min-h-[700px]'
            }`}
          >
            {/* Viewport Browser Header Bar */}
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center gap-2 select-none">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              </div>
              <div className="flex-1 mx-4 bg-white border border-slate-200 rounded-md px-3 py-0.5 text-[11px] text-slate-500 font-mono text-center truncate">
                https://{user?.subdomain || 'yourstore'}.ferasetu.com
              </div>
            </div>

            {/* Live Storefront Renderer */}
            <div className="flex-1 overflow-x-hidden">
              <TemplateRenderer
                themeId={selectedThemeId}
                sections={sections}
                shop={{
                  id: user?.id || 'demo-shop',
                  name: shopName || 'My Store',
                  description: 'Welcome to our online store',
                  phone: shopPhone || user?.phone || '',
                  logo_url: logoUrl,
                }}
                products={activeProducts}
                previewMode={true}
                themeOverrides={overrides}
                onSelectSection={(secId) => {
                  setSelectedSectionId(secId);
                  setActiveTab('design');
                }}
                selectedSectionId={selectedSectionId}
              />
            </div>
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
