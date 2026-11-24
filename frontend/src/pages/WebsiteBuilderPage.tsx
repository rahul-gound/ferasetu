import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Globe,
  Eye,
  Sparkles,
  Save,
  ExternalLink,
  Smartphone,
  Tablet,
  Monitor,
  Check,
  RotateCcw,
  Sliders,
  History,
  Link2,
  Menu,
  X,
  FileSpreadsheet,
  MessageSquare,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { getStorefrontUrl } from '../utils/canonicalHostname';
import { useLanguage } from '../contexts/LanguageContext';
import TemplateRenderer from '../components/shop/TemplateRenderer';
import StorefrontAiChat from '../builder/ai/StorefrontAiChat';
import CompactConnectorsPopover from '../builder/connectors/CompactConnectorsPopover';
import VersionHistoryModal from '../builder/modals/VersionHistoryModal';
import { builderApi } from '../builder/services/builderApi';
import { createDefaultSignupWorkflow } from '../builder/workflows/workflowSchema';
import type { ShopProduct, TemplateSection } from '../types/template';
import type { ThemeId, StorefrontSection, MerchantThemeOverrides } from '../storefront/theme/themeTypes';
import { THEMES_LIST, THEME_REGISTRY } from '../storefront/theme/themeDefinitions';
import { normalizeLegacySections } from '../storefront/compatibility/legacySectionAdapter';
import type { WorkflowDefinition, ConnectionConfig } from '../builder/types/builderTypes';
import posthog from '../lib/posthog';

// Realistic deterministic demo products for live preview
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
  const outletContext = useOutletContext<{ setSidebarOpen?: (open: boolean) => void }>() || {};

  // Device & Layout Modes
  const [deviceView, setDeviceView] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [mobileMode, setMobileMode] = useState<'chat' | 'preview'>('chat');
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isConnectorsOpen, setIsConnectorsOpen] = useState(false);

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
  const [showPublishModal, setShowPublishModal] = useState(false);

  // State undo history stack
  const [historyStack, setHistoryStack] = useState<StorefrontSection[][]>([]);

  // Authoritative Branding & Token Overrides
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [faviconUrl, setFaviconUrl] = useState<string>('');
  const [overrides, setOverrides] = useState<MerchantThemeOverrides>({
    primaryColor: '#0052FF',
    accentColor: '#EA580C',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    radiusStyle: 'soft',
    density: 'balanced',
  });

  // Declarative Workflows state (kept internally for AI operations)
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

  // Section update handler with undo history tracking
  const handleUpdateSections = (newSections: StorefrontSection[], reason?: string) => {
    setHistoryStack((prev) => [...prev, sections]);
    setSections(newSections);
    if (reason) {
      toast.success(reason);
    }
  };

  // Undo last modification
  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const previous = historyStack[historyStack.length - 1];
    setHistoryStack((prev) => prev.slice(0, prev.length - 1));
    setSections(previous);
    toast.success('↩️ Reverted storefront to previous snapshot');
  };

  // Theme selection handler
  const handleThemeSelect = (themeId: ThemeId) => {
    setSelectedThemeId(themeId);
    const themeDef = THEME_REGISTRY[themeId];
    if (themeDef) {
      setOverrides((prev) => ({
        ...prev,
        primaryColor: themeDef.colors.primary,
        accentColor: themeDef.colors.accent,
        fontFamily: themeDef.typography.fontFamilyHeading,
      }));
    }
    toast.success(`Theme updated to ${themeDef?.name || themeId}`);
  };

  // Overrides update handler
  const handleUpdateOverrides = (newOverrides: Partial<MerchantThemeOverrides>) => {
    setOverrides((prev) => ({ ...prev, ...newOverrides }));
  };

  // Refresh live preview
  const handleRefreshPreview = () => {
    refetchDraft();
    queryClient.invalidateQueries({ queryKey: ['website'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    toast.success('🔄 Live website preview refreshed');
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
            primary: overrides.primaryColor || '#0052FF',
            secondary: overrides.accentColor || '#EA580C',
            background: overrides.backgroundColor || '#ffffff',
            text: overrides.textColor || '#0F172A',
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
        console.warn('Builder draft endpoint warning, syncing via /website:', builderErr);
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
      });
      toast.success('💾 Working draft saved safely');
      refetchDraft();
      queryClient.invalidateQueries({ queryKey: ['website'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to save draft');
    } finally {
      setSavingDraft(false);
    }
  };

  // Publish Live Handler
  const handlePublish = async () => {
    setPublishing(true);
    try {
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
      setShowPublishModal(false);
      posthog.capture('storefront_published', {
        theme: selectedThemeId,
        section_count: sections.length,
      });
      toast.success('🎉 Storefront successfully published live!', {
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
      <div className="bg-white border-b border-slate-200/90 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 sm:gap-6 flex-shrink-0 shadow-xs z-30">
        {/* Left Branding & Shop Info */}
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

          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-xs shadow-blue-500/25 flex-shrink-0">
            FS
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate max-w-[120px] xs:max-w-[160px] sm:max-w-[220px]">
                {shopName || user?.business_name || 'My Store'}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/80 tracking-wide">
                Theme: <span className="font-extrabold">{activeThemeDef.name}</span>
              </span>
              <span className="hidden md:inline-flex text-[11px] font-mono font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                v{currentVersion}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Mobile Segmented Switcher (AI Chat vs Live Preview) */}
        <div className="flex lg:hidden items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
          <button
            type="button"
            onClick={() => setMobileMode('chat')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
              mobileMode === 'chat'
                ? 'bg-white text-blue-600 shadow-xs border border-blue-100'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare size={13} />
            <span>AI Studio</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileMode('preview')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
              mobileMode === 'preview'
                ? 'bg-white text-blue-600 shadow-xs border border-blue-100'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Eye size={13} />
            <span>Live Store</span>
          </button>
        </div>

        {/* Center-Right: Desktop Device Simulator (Desktop / Tablet / Mobile) */}
        <div className="hidden lg:flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/90 shadow-2xs gap-1">
          <button
            type="button"
            onClick={() => setDeviceView('desktop')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              deviceView === 'desktop'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <Monitor size={14} className={deviceView === 'desktop' ? 'text-blue-600' : 'text-slate-400'} />
            <span>Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => setDeviceView('tablet')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              deviceView === 'tablet'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <Tablet size={14} className={deviceView === 'tablet' ? 'text-blue-600' : 'text-slate-400'} />
            <span>Tablet (768px)</span>
          </button>
          <button
            type="button"
            onClick={() => setDeviceView('mobile')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              deviceView === 'mobile'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <Smartphone size={14} className={deviceView === 'mobile' ? 'text-blue-600' : 'text-slate-400'} />
            <span>Mobile (375px)</span>
          </button>
        </div>

        {/* Right Action Controls: Refresh, Connectors, Versions, Save Draft, Publish Live */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
          {/* Refresh Live Preview */}
          <button
            type="button"
            onClick={handleRefreshPreview}
            title="Refresh preview canvas"
            className="p-2 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer shadow-2xs"
            aria-label="Refresh preview"
          >
            <RotateCcw size={14} />
          </button>

          {/* Compact Connectors Entry Point */}
          <button
            type="button"
            onClick={() => setIsConnectorsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 text-slate-700 transition-all cursor-pointer shadow-2xs"
            title="Manage connected services: Google Sheets, WhatsApp, Payments"
          >
            <Link2 size={14} className="text-blue-600" />
            <span className="hidden sm:inline">Connectors</span>
          </button>

          {/* Version History Button */}
          <button
            type="button"
            onClick={() => setIsVersionModalOpen(true)}
            className="hidden xl:flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all cursor-pointer shadow-2xs"
            title="View publication snapshots and rollback"
          >
            <History size={14} className="text-slate-500" />
            <span>Versions</span>
          </button>

          {isPublished && (
            <a
              href={liveUrl}
              target="_blank"
              rel="noreferrer"
              className="hidden 2xl:flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-3 py-2 rounded-xl transition-all shadow-2xs"
            >
              <ExternalLink size={13} /> Live Store
            </a>
          )}

          {/* Save Draft Button (Tactile Inward Physics) */}
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl shadow-2xs transition-all disabled:opacity-50 cursor-pointer active:translate-y-0.5 active:scale-[0.985] active:shadow-inner"
          >
            <Save size={14} className="text-slate-500" />
            <span className="hidden sm:inline">{savingDraft ? 'Saving Draft…' : 'Save Draft'}</span>
            <span className="sm:hidden">{savingDraft ? 'Saving…' : 'Save'}</span>
          </button>

          {/* Publish Store Button (Tactile Emerald Primary) */}
          <button
            type="button"
            onClick={() => setShowPublishModal(true)}
            disabled={publishing}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-[0_2px_4px_rgba(16,185,129,0.16),0_1px_2px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(16,185,129,0.24)] transition-all disabled:opacity-50 cursor-pointer active:translate-y-0.5 active:scale-[0.985] active:shadow-inner"
          >
            <Globe size={14} />
            <span>{publishing ? 'Publishing…' : 'Publish Live'}</span>
          </button>
        </div>
      </div>

      {/* Main Studio Workspace: EXACTLY TWO PRIMARY AREAS */}
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        {/* AREA 1: FeraSetu AI Chat Studio */}
        <div
          className={`flex-col h-full overflow-hidden z-20 bg-white ${
            mobileMode === 'chat'
              ? 'flex w-full lg:w-[420px] xl:w-[460px] flex-shrink-0'
              : 'hidden lg:flex lg:w-[420px] xl:w-[460px] flex-shrink-0'
          }`}
        >
          <StorefrontAiChat
            shopName={shopName}
            sections={sections}
            onUpdateSections={handleUpdateSections}
            selectedThemeId={selectedThemeId}
            onThemeSelect={handleThemeSelect}
            overrides={overrides}
            onUpdateOverrides={handleUpdateOverrides}
            onOpenConnectors={() => setIsConnectorsOpen(true)}
            onUndoLastChange={handleUndo}
            canUndo={historyStack.length > 0}
            onSaveDraft={handleSaveDraft}
          />
        </div>

        {/* AREA 2: Live Website Preview Canvas */}
        <div
          className={`flex-1 flex-col overflow-hidden bg-slate-100/70 ${
            mobileMode === 'preview' ? 'flex w-full' : 'hidden lg:flex'
          }`}
        >
          {/* Framed Canvas Stage with Responsive Simulation */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex justify-center">
            <div
              className={`transition-all duration-300 bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden flex flex-col ${
                deviceView === 'desktop'
                  ? 'w-full max-w-full'
                  : deviceView === 'tablet'
                  ? 'w-[768px] max-w-full'
                  : 'w-[375px] max-w-full'
              }`}
              style={{
                minHeight: '100%',
              }}
            >
              <TemplateRenderer
                sections={sections}
                products={activeProducts}
                shopName={shopName}
                shopLogo={logoUrl}
                shopPhone={shopPhone}
                theme={selectedThemeId}
                themeId={selectedThemeId}
                overrides={overrides}
                themeOverrides={overrides}
                isPreview={true}
                previewMode={true}
                showPreviewBanner={false}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Compact Connectors Popover / Drawer */}
      <CompactConnectorsPopover
        isOpen={isConnectorsOpen}
        onClose={() => setIsConnectorsOpen(false)}
        connections={connectionsData?.connections || []}
        onRefreshConnections={refetchConnections}
      />

      {/* Version History Modal */}
      <VersionHistoryModal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        onRollbackSuccess={handleRollbackComplete}
        currentVersion={currentVersion}
      />

      {/* Publish Live Confirmation Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 flex flex-col gap-4 animate-scale-up">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
              <Globe size={24} />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                Publish Storefront Live?
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Your approved changes will immediately go live to shoppers on your official store domain. All previous publications are safely stored in version history.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
              <p className="font-bold flex items-center gap-1.5 text-slate-900">
                <Check size={14} className="text-emerald-600" />
                Live Target URL:
              </p>
              <a
                href={liveUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 font-semibold underline block mt-0.5 truncate"
              >
                {liveUrl}
              </a>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={publishing}
                onClick={handlePublish}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs disabled:opacity-50 cursor-pointer active:scale-98"
              >
                {publishing ? 'Publishing…' : 'Confirm & Publish Live'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
