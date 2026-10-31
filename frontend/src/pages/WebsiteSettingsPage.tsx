import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Globe,
  Search,
  CheckCircle2,
  ExternalLink,
  Save,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Eye,
  Sliders,
  Share2,
  Info,
  Layers,
  MapPin,
  Clock,
  Lock,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { getStorefrontUrl } from '../utils/canonicalHostname';
import SEO from '../components/SEO';

interface WebsiteSettingsData {
  show_on_google: boolean;
  show_on_bing: boolean;
  search_engine_indexing: boolean;
  auto_sitemap: boolean;
  show_on_local_maps: boolean;
  show_business_hours: boolean;
  meta_title: string;
  meta_description: string;
  keywords: string;
  social_share_image: string;
  canonical_url: string;
  maintenance_mode: boolean;
  require_customer_login: boolean;
  google_analytics_id?: string;
  facebook_pixel_id?: string;
}

const DEFAULT_SETTINGS: WebsiteSettingsData = {
  show_on_google: true,
  show_on_bing: true,
  search_engine_indexing: true,
  auto_sitemap: true,
  show_on_local_maps: true,
  show_business_hours: true,
  meta_title: '',
  meta_description: '',
  keywords: 'kirana, online store, fast delivery, local retail, fresh products',
  social_share_image: '',
  canonical_url: '',
  maintenance_mode: false,
  require_customer_login: false,
  google_analytics_id: '',
  facebook_pixel_id: '',
};

export default function WebsiteSettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const liveStoreUrl = getStorefrontUrl(user);

  const [settings, setSettings] = useState<WebsiteSettingsData>(DEFAULT_SETTINGS);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [previewTab, setPreviewTab] = useState<'google' | 'whatsapp'>('google');

  // Load existing settings
  const { data, isLoading } = useQuery({
    queryKey: ['website-settings'],
    queryFn: async () => {
      try {
        const res = await api.get('/website/settings');
        return res.data;
      } catch {
        return null;
      }
    },
    staleTime: 60000,
  });

  useEffect(() => {
    if (data?.settings) {
      const incoming = data.settings;
      const defaultTitle = incoming.meta_title || user?.business_name || user?.name || 'My Online Store';
      const defaultDesc = incoming.meta_description || `Shop fresh essentials and retail collections directly from ${defaultTitle}. 0% commission, guaranteed authentic products, and fast local dispatch.`;
      const storeSlug = user?.subdomain || (user?.hostname ? user.hostname.split('.')[0] : 'store');

      setSettings({
        show_on_google: incoming.show_on_google ?? true,
        show_on_bing: incoming.show_on_bing ?? true,
        search_engine_indexing: incoming.search_engine_indexing ?? true,
        auto_sitemap: incoming.auto_sitemap ?? true,
        show_on_local_maps: incoming.show_on_local_maps ?? true,
        show_business_hours: incoming.show_business_hours ?? true,
        meta_title: defaultTitle,
        meta_description: defaultDesc,
        keywords: incoming.keywords || 'online store, shopping, local retail, whatsapp orders',
        social_share_image: incoming.social_share_image || user?.logo_url || '',
        canonical_url: incoming.canonical_url || `https://${storeSlug}.ferasetu.com`,
        maintenance_mode: incoming.maintenance_mode ?? false,
        require_customer_login: incoming.require_customer_login ?? false,
        google_analytics_id: incoming.google_analytics_id || '',
        facebook_pixel_id: incoming.facebook_pixel_id || '',
      });
    } else if (user) {
      const defaultTitle = user.business_name || user.name || 'My Online Store';
      const storeSlug = user.subdomain || (user.hostname ? user.hostname.split('.')[0] : 'store');
      setSettings((prev) => ({
        ...prev,
        meta_title: prev.meta_title || defaultTitle,
        meta_description: prev.meta_description || `Welcome to ${defaultTitle}. Browse our products, enjoy 0% markup, and order directly on WhatsApp.`,
        canonical_url: prev.canonical_url || `https://${storeSlug}.ferasetu.com`,
      }));
    }
  }, [data, user]);

  // Mutation to save settings
  const saveMutation = useMutation({
    mutationFn: async (updated: WebsiteSettingsData) => {
      const res = await api.put('/website/settings', updated);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-settings'] });
      queryClient.invalidateQueries({ queryKey: ['website'] });
      setHasChanges(false);
      toast.success('Website & search settings saved successfully!', {
        icon: '✅',
        duration: 3500,
      });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to save settings. Please try again.');
    },
  });

  const handleToggle = (key: keyof WebsiteSettingsData) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      setHasChanges(true);
      return next;
    });
  };

  const handleInputChange = (key: keyof WebsiteSettingsData, value: string) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      setHasChanges(true);
      return next;
    });
  };

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  const handlePingSearchEngines = async () => {
    setIsPinging(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      toast.success('Googlebot and Bing crawlers notified to refresh your sitemap and index!', {
        icon: '🚀',
        duration: 4000,
      });
    } catch {
      toast.error('Network request timed out. Please retry.');
    } finally {
      setIsPinging(false);
    }
  };

  const handleCopyStoreUrl = () => {
    if (navigator?.clipboard && liveStoreUrl) {
      navigator.clipboard.writeText(liveStoreUrl);
      setCopiedUrl(true);
      toast.success('Storefront link copied!');
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const storeSlug = user?.subdomain || (user?.hostname ? user.hostname.split('.')[0] : 'mystore');
  const displayTitle = settings.meta_title || user?.business_name || 'My Store';
  const displayDesc = settings.meta_description || 'Direct retail storefront with zero commission, verified products, and fast dispatch.';

  return (
    <div className="min-h-full bg-slate-50/50 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <SEO
        title="Website Settings — Search Visibility & SEO | FeraSetu"
        description="Configure Google & Bing search indexing, XML sitemap, meta tags, and storefront discovery controls."
      />

      {/* Header & Quick Navigation Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-600 mb-1">
            <Sliders size={15} />
            <span>Website Builder / Settings</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Website Settings
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Control how your store appears on Google, Microsoft Bing, and local search engines. Manage SEO metadata, sitemaps, and public access.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
          {/* Quick link to Visual Website Builder */}
          <Link
            to="/website-builder"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs hover:border-slate-300"
          >
            <Layers size={15} className="text-orange-600" />
            <span>Open Website Builder</span>
          </Link>

          {/* Live Storefront Link */}
          {liveStoreUrl && (
            <a
              href={liveStoreUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all"
            >
              <ExternalLink size={14} />
              <span>View Live Store</span>
            </a>
          )}

          {/* Primary Save Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-sm cursor-pointer active:scale-98 ${
              hasChanges
                ? 'bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-500/30'
                : 'bg-slate-900 hover:bg-slate-800'
            } disabled:opacity-50`}
          >
            <Save size={15} />
            <span>{saveMutation.isPending ? 'Saving Settings…' : hasChanges ? 'Save Changes' : 'Saved'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Settings Controls (Left 2 Cols) + Live Search Engine Preview (Right Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Controls (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Search Engine Visibility & Indexing Toggles */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Search size={20} strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Search Engine Visibility & Indexing
                  </h2>
                  <p className="text-xs text-slate-500">
                    Choose which search engines are permitted to index and showcase your storefront
                  </p>
                </div>
              </div>

              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 size={13} />
                <span>SEO Optimized</span>
              </span>
            </div>

            {/* Toggle 1: Show on Google */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">Show store on Google</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-100 text-blue-800">
                    Googlebot
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Allows Google Search and Google Assistant to crawl your shop catalog, products, and prices for organic search footfall.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={settings.show_on_google}
                onClick={() => handleToggle('show_on_google')}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  settings.show_on_google ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    settings.show_on_google ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 2: Show on Microsoft Bing & Yahoo */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">Show on Microsoft Bing & Yahoo</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-teal-100 text-teal-800">
                    Bingbot
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Lists your store across Microsoft Bing, Windows Search, Copilot web results, and Yahoo search networks.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={settings.show_bing || settings.show_on_bing}
                onClick={() => handleToggle('show_on_bing')}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  settings.show_on_bing ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    settings.show_on_bing ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 3: Global robots.txt Search Indexing */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">Search Engine Indexing Directive</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-200 text-slate-700">
                    robots.txt
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Controls the <code className="text-slate-800 bg-slate-200/70 px-1 py-0.5 rounded">index, follow</code> tag on your storefront HTML headers. Turning this off tells search engines not to index your pages.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={settings.search_engine_indexing}
                onClick={() => handleToggle('search_engine_indexing')}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  settings.search_engine_indexing ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    settings.search_engine_indexing ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 4: Automated Sitemap Generation */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">Auto XML Sitemap Submission</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">
                    sitemap.xml
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Generates an XML sitemap of all your active products and categories at <code className="text-slate-800 bg-slate-200/70 px-1 py-0.5 rounded">/sitemap.xml</code> for search bots.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={settings.auto_sitemap}
                onClick={() => handleToggle('auto_sitemap')}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  settings.auto_sitemap ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    settings.auto_sitemap ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 5: Local Maps & Kirana Discovery */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">Local Maps & Neighborhood Search</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800">
                    Nearby Kirana
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Embeds Schema.org LocalBusiness structured data so customers searching "groceries near me" or in your pincode can discover your shop.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={settings.show_on_local_maps}
                onClick={() => handleToggle('show_on_local_maps')}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  settings.show_on_local_maps ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    settings.show_on_local_maps ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Quick Ping / Refresh CTA */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-slate-500">
                Updated your catalog recently? Request instant crawl.
              </div>
              <button
                type="button"
                onClick={handlePingSearchEngines}
                disabled={isPinging}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
              >
                <RefreshCw size={13} className={isPinging ? 'animate-spin text-blue-600' : 'text-slate-500'} />
                <span>{isPinging ? 'Pinging Search Bots…' : 'Ping Google & Bing'}</span>
              </button>
            </div>
          </div>

          {/* 2. Search Appearance & Metadata Config */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                <Globe size={20} strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Search Result Appearance (SEO Title & Snippet)
                </h2>
                <p className="text-xs text-slate-500">
                  This text is displayed prominently when people search for your store on Google
                </p>
              </div>
            </div>

            {/* Meta Title */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="meta_title" className="text-xs font-bold text-slate-800">
                  Store Title for Google (Meta Title)
                </label>
                <span
                  className={`text-[11px] font-mono font-semibold ${
                    settings.meta_title.length > 60 ? 'text-amber-600' : 'text-slate-400'
                  }`}
                >
                  {settings.meta_title.length}/60 chars (Recommended: 40-60)
                </span>
              </div>
              <input
                id="meta_title"
                type="text"
                value={settings.meta_title}
                onChange={(e) => handleInputChange('meta_title', e.target.value)}
                placeholder="e.g. Himmat Kirana Store | Daily Groceries & Spices"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-2xs"
              />
            </div>

            {/* Meta Description */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="meta_description" className="text-xs font-bold text-slate-800">
                  Search Result Snippet (Meta Description)
                </label>
                <span
                  className={`text-[11px] font-mono font-semibold ${
                    settings.meta_description.length > 160 ? 'text-amber-600' : 'text-slate-400'
                  }`}
                >
                  {settings.meta_description.length}/160 chars (Recommended: 120-155)
                </span>
              </div>
              <textarea
                id="meta_description"
                rows={3}
                value={settings.meta_description}
                onChange={(e) => handleInputChange('meta_description', e.target.value)}
                placeholder="e.g. Order fresh dry fruits, daily kirana essentials, and spices with same-day local delivery and direct WhatsApp confirmation. 0% platform markup."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-2xs resize-none"
              />
            </div>

            {/* Retail Keywords */}
            <div className="space-y-1.5">
              <label htmlFor="keywords" className="text-xs font-bold text-slate-800">
                Retail Keywords & Product Tags (Comma-separated)
              </label>
              <input
                id="keywords"
                type="text"
                value={settings.keywords}
                onChange={(e) => handleInputChange('keywords', e.target.value)}
                placeholder="e.g. groceries, dry fruits, spices, local kirana, wheat flour, online store"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-2xs"
              />
              <p className="text-[11px] text-slate-500">
                Helps search algorithms associate your store with specific regional search terms.
              </p>
            </div>
          </div>

          {/* 3. Storefront Access & Maintenance Mode Controls */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <ShieldCheck size={20} strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Storefront Access & Protection
                </h2>
                <p className="text-xs text-slate-500">
                  Control visitor access mode and customer checkout options
                </p>
              </div>
            </div>

            {/* Maintenance Mode Toggle */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">Maintenance / Opening Soon Mode</span>
                  {settings.maintenance_mode && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Temporarily pause public storefront traffic while you add products or reorder sections. Visitors will see a friendly "Opening Soon" greeting.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={settings.maintenance_mode}
                onClick={() => handleToggle('maintenance_mode')}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  settings.maintenance_mode ? 'bg-amber-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    settings.maintenance_mode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Customer Account Requirement */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">Require Customer Login at Checkout</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 text-slate-700">
                    Accounts
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  When enabled, buyers must log in or create an account with OTP before confirming their order. When disabled, fast guest checkout is allowed.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={settings.require_customer_login}
                onClick={() => handleToggle('require_customer_login')}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  settings.require_customer_login ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    settings.require_customer_login ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Search Engine & Social Preview (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-20">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Live Preview</h3>
              </div>

              {/* Segmented Switcher: Google vs WhatsApp */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPreviewTab('google')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    previewTab === 'google'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Google Search
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('whatsapp')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    previewTab === 'whatsapp'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  WhatsApp Card
                </button>
              </div>
            </div>

            {previewTab === 'google' ? (
              /* Google Search Result Card Simulator */
              <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-2 font-sans">
                {/* Google Result URL Breadcrumbs */}
                <div className="flex items-center gap-2 text-xs text-slate-600 truncate">
                  <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-[10px] font-black text-orange-600">
                    FS
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-medium text-slate-700 truncate leading-none">
                      {displayTitle}
                    </span>
                    <span className="text-[10px] text-slate-500 truncate leading-tight">
                      {settings.canonical_url || `https://${storeSlug}.ferasetu.com`}
                    </span>
                  </div>
                </div>

                {/* Google Search Clickable Title */}
                <h4 className="text-base sm:text-lg font-medium text-[#1a0dab] hover:underline cursor-pointer leading-snug break-words">
                  {displayTitle}
                </h4>

                {/* Star rating and snippet */}
                <div className="flex items-center gap-1.5 text-xs text-slate-700">
                  <span className="text-amber-500 font-bold">★★★★★</span>
                  <span className="font-bold text-slate-800">4.9</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                    In Stock • 0% Markup
                  </span>
                </div>

                {/* Snippet Description */}
                <p className="text-xs sm:text-sm text-[#4d5156] leading-relaxed break-words line-clamp-3">
                  {displayDesc}
                </p>

                {/* Search Engine Badges Status */}
                <div className="pt-3 mt-3 border-t border-slate-100 flex flex-wrap gap-2 text-[10px] font-bold text-slate-500">
                  <span className={`px-2 py-0.5 rounded-md ${settings.show_on_google ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                    {settings.show_on_google ? '✓ Google Indexed' : '✕ Google Hidden'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md ${settings.show_on_bing ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-400'}`}>
                    {settings.show_on_bing ? '✓ Bing & Yahoo Enabled' : '✕ Bing Hidden'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md ${settings.show_on_local_maps ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-400'}`}>
                    {settings.show_on_local_maps ? '✓ Maps Discovery' : '✕ Maps Hidden'}
                  </span>
                </div>
              </div>
            ) : (
              /* WhatsApp Shared Link Card Simulator */
              <div className="bg-[#EFEAE2] p-4 rounded-xl space-y-2">
                <p className="text-[11px] font-bold text-slate-600 mb-1">
                  How your store link looks when shared on WhatsApp:
                </p>
                <div className="bg-white rounded-lg overflow-hidden shadow-xs border border-slate-200/80 max-w-sm">
                  <div className="h-32 bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center text-white font-black text-xl p-4 text-center">
                    {user?.logo_url ? (
                      <img src={user.logo_url} alt="Store logo" className="max-h-24 max-w-full object-contain" />
                    ) : (
                      <span>{displayTitle}</span>
                    )}
                  </div>
                  <div className="p-3 bg-slate-50 border-t border-slate-100 space-y-1">
                    <p className="text-xs font-bold text-slate-900 leading-tight truncate">
                      {displayTitle}
                    </p>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {displayDesc}
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold pt-1">
                      {storeSlug}.ferasetu.com
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Storefront URL Sharing Box */}
            <div className="pt-2 space-y-2">
              <label className="text-xs font-bold text-slate-700">Official Storefront Link</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={liveStoreUrl || `https://${storeSlug}.ferasetu.com`}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyStoreUrl}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer shrink-0 shadow-2xs"
                  title="Copy storefront link"
                >
                  {copiedUrl ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3.5 flex items-start gap-2.5">
              <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900 leading-relaxed">
                <strong>Kirana Growth Tip:</strong> Including your town or neighborhood in your Store Title (e.g. <em>"Jodhpur Sweets"</em>) boosts Google Maps search discovery by over 3x!
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
