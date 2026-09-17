import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Sparkles, Globe, Terminal, Shield, FileText, Layers, Plus,
  Trash2, Copy, CheckCircle2, AlertCircle, ArrowUpRight, Play,
  Lock, RefreshCw, Send, Check, ExternalLink, Settings, Database,
  Cpu, HardDrive, Key, Code, HelpCircle, AlertTriangle, Eye, Server, Zap, FolderUp
} from 'lucide-react';
import { proStudioApi, type ProPage, type ProRoute, type ProFunction, type ProTemplate, type ImportedProject } from '../services/proStudioApi';
import { useAuth } from '../contexts/AuthContext';
import { parseAIPromptToActions } from '../../../worker/ai/proBuilderActions.js';
import ProjectImportModal from '../components/pro/ProjectImportModal';

type TabKey = 'overview' | 'pages' | 'routes' | 'functions' | 'templates' | 'storage' | 'auth' | 'ai_builder' | 'publish' | 'imports';

export default function ProStudioPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const activeTab = (searchParams.get('tab') as TabKey) || 'overview';
  const setTab = (tab: TabKey) => {
    setSearchParams({ tab });
  };

  // 1. Fetch Overview & Authoritative Subscription State
  const {
    data: overviewData,
    isLoading: isOverviewLoading,
    error: overviewError,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ['pro-studio-overview'],
    queryFn: proStudioApi.getOverview,
    retry: 1,
  });

  const isProRequired = useMemo(() => {
    const err = overviewError as any;
    return err?.response?.status === 403 || err?.response?.data?.code === 'PRO_REQUIRED';
  }, [overviewError]);

  // 2. Fetch Pages, Routes, Functions
  const { data: pages = [], refetch: refetchPages } = useQuery({
    queryKey: ['pro-pages'],
    queryFn: proStudioApi.getPages,
    enabled: !isProRequired && Boolean(overviewData),
  });

  const { data: routes = [], refetch: refetchRoutes } = useQuery({
    queryKey: ['pro-routes'],
    queryFn: proStudioApi.getRoutes,
    enabled: !isProRequired && Boolean(overviewData),
  });

  const { data: functions = [], refetch: refetchFunctions } = useQuery({
    queryKey: ['pro-functions'],
    queryFn: proStudioApi.getFunctions,
    enabled: !isProRequired && Boolean(overviewData),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['pro-templates'],
    queryFn: proStudioApi.getTemplates,
    enabled: !isProRequired && Boolean(overviewData),
  });

  const { data: storageKeys = [], refetch: refetchStorage } = useQuery({
    queryKey: ['pro-storage'],
    queryFn: proStudioApi.getStorage,
    enabled: !isProRequired && Boolean(overviewData),
  });

  const { data: logs = [], refetch: refetchLogs } = useQuery({
    queryKey: ['pro-logs'],
    queryFn: proStudioApi.getLogs,
    enabled: !isProRequired && Boolean(overviewData),
  });

  const { data: importedProjects = [], refetch: refetchProjects } = useQuery({
    queryKey: ['pro-imported-projects'],
    queryFn: proStudioApi.getImportedProjects,
    enabled: !isProRequired && Boolean(overviewData),
  });

  // Modals & form state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedReimportProjectId, setSelectedReimportProjectId] = useState<string | null>(null);

  const [pageModalOpen, setPageModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<Partial<ProPage> | null>(null);

  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Partial<ProRoute> | null>(null);

  const [functionModalOpen, setFunctionModalOpen] = useState(false);
  const [editingFunction, setEditingFunction] = useState<{
    id?: string;
    name: string;
    description: string;
    code: string;
    capabilities: string[];
  } | null>(null);

  const [functionTestArgs, setFunctionTestArgs] = useState('{}');
  const [functionTestResult, setFunctionTestResult] = useState<any>(null);
  const [isTestingFunction, setIsTestingFunction] = useState(false);

  const [aiPrompt, setAiPrompt] = useState('');
  const [plannedActions, setPlannedActions] = useState<any[]>([]);
  const [isExecutingAI, setIsExecutingAI] = useState(false);

  const [validationResult, setValidationResult] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [installingTemplateId, setInstallingTemplateId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // NON-PRO UPGRADE CTA SCREEN
  // ---------------------------------------------------------------------------
  if (isProRequired) {
    return (
      <div className="max-w-5xl mx-auto py-10 px-4">
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-800/40 rounded-2xl p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold mb-6 uppercase tracking-wider">
              <Sparkles size={14} className="text-rose-400" /> Exclusive to FeraSetu Pro
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-4">
              Pro Studio — AI-Native Programmable Website Platform
            </h1>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-8">
              Transform your storefront into a complete multi-page web application. Write controlled Fera Functions, create dynamic and protected customer routes, and automate your entire architecture with FeraSetu AI.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
                <Globe className="text-indigo-400 shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="font-semibold text-white text-sm">Multi-Page Architecture</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Nested pages, custom subpages, and dynamic routes like <code className="text-rose-300">/products/:slug</code></p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
                <Terminal className="text-rose-400 shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="font-semibold text-white text-sm">Controlled Fera Functions</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Sandboxed server-side code bound to your UI with restricted <code className="text-indigo-300">ferasetu.*</code> APIs</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
                <Shield className="text-emerald-400 shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="font-semibold text-white text-sm">Protected Routes & Auth</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Customer login, signup, member portals, and server-guarded private content</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
                <Layers className="text-amber-400 shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="font-semibold text-white text-sm">4 Premium Pro Templates</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Studio, Launch, Creator, and Commerce Pro — built for high-conversion brands</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link
                to="/upgrade?plan=pro"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-rose-600/30 transition-all text-sm"
              >
                Upgrade to FeraSetu Pro <ArrowUpRight size={16} />
              </Link>
              <button
                onClick={() => refetchOverview()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-slate-300 font-medium px-5 py-3 rounded-xl border border-white/10 transition-all text-sm"
              >
                <RefreshCw size={14} /> Refresh Subscription Status
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // PRO STUDIO ACTIVE DASHBOARD
  // ---------------------------------------------------------------------------
  const quotas = overviewData?.quotas;
  const deployment = overviewData?.deployment;

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                <Terminal size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-slate-900">Pro Studio</h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 tracking-wide uppercase">
                    PRO
                  </span>
                  {deployment ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live v{deployment.version}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      Draft (Unpublished)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 hidden sm:block">AI-Native Programmable Website & Controlled Functions Platform</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedReimportProjectId(null);
                  setImportModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition-colors"
              >
                <FolderUp size={14} className="text-slate-600" /> Import Project
              </button>
              <button
                onClick={() => setTab('ai_builder')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
              >
                <Sparkles size={14} className="text-indigo-600" /> AI Copilot
              </button>
              <button
                onClick={() => setTab('publish')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-500 shadow-sm transition-colors"
              >
                <Send size={13} /> Publish Site
              </button>
            </div>
          </div>

          {/* Navigation Sub-tabs */}
          <div className="flex overflow-x-auto space-x-1 border-t border-slate-100 py-1.5 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
            {[
              { key: 'overview', label: 'Overview', icon: <Layers size={14} /> },
              { key: 'pages', label: `Pages (${pages.length})`, icon: <FileText size={14} /> },
              { key: 'routes', label: `Routes (${routes.length})`, icon: <Globe size={14} /> },
              { key: 'functions', label: `Functions (${functions.length})`, icon: <Code size={14} /> },
              { key: 'imports', label: `Project Imports (${importedProjects.length})`, icon: <FolderUp size={14} /> },
              { key: 'templates', label: 'Templates', icon: <Layers size={14} /> },
              { key: 'storage', label: 'Data & Storage', icon: <Database size={14} /> },
              { key: 'auth', label: 'Authentication', icon: <Shield size={14} /> },
              { key: 'ai_builder', label: 'AI Builder', icon: <Sparkles size={14} /> },
              { key: 'publish', label: 'Deploy & Publish', icon: <Send size={14} /> },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setTab(tab.key as TabKey)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">

        {/* ================================================================= */}
        {/* TAB 1: OVERVIEW */}
        {/* ================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                  <span>Pages</span>
                  <FileText size={16} className="text-indigo-500" />
                </div>
                <div className="text-2xl font-bold text-slate-900 mt-2">{pages.length}</div>
                <div className="text-[11px] text-slate-400 mt-1">Limit: {quotas?.limits?.max_pages || 50}</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                  <span>Routes</span>
                  <Globe size={16} className="text-emerald-500" />
                </div>
                <div className="text-2xl font-bold text-slate-900 mt-2">{routes.length}</div>
                <div className="text-[11px] text-slate-400 mt-1">Limit: {quotas?.limits?.max_routes || 50}</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                  <span>Fera Functions</span>
                  <Code size={16} className="text-rose-500" />
                </div>
                <div className="text-2xl font-bold text-slate-900 mt-2">{functions.length}</div>
                <div className="text-[11px] text-slate-400 mt-1">Limit: {quotas?.limits?.max_functions || 30}</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                  <span>KV Storage</span>
                  <Database size={16} className="text-amber-500" />
                </div>
                <div className="text-2xl font-bold text-slate-900 mt-2">
                  {Math.round((quotas?.usage?.storage_bytes || 0) / 1024)} KB
                </div>
                <div className="text-[11px] text-slate-400 mt-1">100 MB quota</div>
              </div>
            </div>

            {/* Status & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-slate-900">Website Status</h3>
                  <button
                    onClick={() => setTab('publish')}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
                  >
                    View Deployments <ArrowUpRight size={14} />
                  </button>
                </div>

                {deployment ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="text-emerald-600 mt-0.5" size={20} />
                      <div>
                        <h4 className="font-semibold text-emerald-900 text-sm">Deployment Version {deployment.version} Active</h4>
                        <p className="text-xs text-emerald-700 mt-1">
                          Published on {new Date(deployment.created_at).toLocaleString()} by {deployment.deployed_by}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setTab('publish')}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      Publish Changes
                    </button>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="text-amber-600 mt-0.5" size={20} />
                      <div>
                        <h4 className="font-semibold text-amber-900 text-sm">Draft State — Never Published</h4>
                        <p className="text-xs text-amber-700 mt-1">
                          You have {pages.length} pages and {routes.length} routes in draft. Publish to make them visible to visitors.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setTab('publish')}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700"
                    >
                      Deploy Now
                    </button>
                  </div>
                )}

                {/* Quick Start Guide */}
                <div className="mt-6 border-t border-slate-100 pt-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Recommended Steps</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      onClick={() => setTab('templates')}
                      className="text-left p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all"
                    >
                      <Layers size={16} className="text-indigo-600 mb-2" />
                      <div className="text-xs font-bold text-slate-800">1. Apply Template</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Start with Studio or Commerce Pro</div>
                    </button>

                    <button
                      onClick={() => setTab('functions')}
                      className="text-left p-3 rounded-lg border border-slate-200 hover:border-rose-300 hover:bg-rose-50/30 transition-all"
                    >
                      <Terminal size={16} className="text-rose-600 mb-2" />
                      <div className="text-xs font-bold text-slate-800">2. Bind Functions</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Connect products or inquiry forms</div>
                    </button>

                    <button
                      onClick={() => setTab('publish')}
                      className="text-left p-3 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all"
                    >
                      <Send size={16} className="text-emerald-600 mb-2" />
                      <div className="text-xs font-bold text-slate-800">3. Atomic Publish</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Validate routes and go live</div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Resource Quotas Breakdown */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                <h3 className="text-base font-bold text-slate-900 mb-4">Pro Plan Limits</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                      <span>Pages</span>
                      <span>{pages.length} / {quotas?.limits?.max_pages || 50}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${Math.min((pages.length / (quotas?.limits?.max_pages || 50)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                      <span>Routes</span>
                      <span>{routes.length} / {quotas?.limits?.max_routes || 50}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full"
                        style={{ width: `${Math.min((routes.length / (quotas?.limits?.max_routes || 50)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                      <span>Fera Functions</span>
                      <span>{functions.length} / {quotas?.limits?.max_functions || 30}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-600 rounded-full"
                        style={{ width: `${Math.min((functions.length / (quotas?.limits?.max_functions || 30)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                      <span>Monthly Function Invocations</span>
                      <span>{quotas?.usage?.function_invocations || 0} / {quotas?.limits?.max_function_invocations || 50000}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-600 rounded-full"
                        style={{ width: `${Math.min(((quotas?.usage?.function_invocations || 0) / (quotas?.limits?.max_function_invocations || 50000)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
                  <div className="font-semibold text-slate-700 mb-0.5">Authoritative Subscription</div>
                  <div>Plan: <span className="font-mono text-slate-900 font-semibold">{overviewData?.subscription?.plan}</span></div>
                  <div>Status: <span className="text-emerald-700 font-medium">{overviewData?.subscription?.status}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: PAGES */}
        {/* ================================================================= */}
        {activeTab === 'pages' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Pages</h2>
                <p className="text-xs text-slate-500">Manage multi-page structure, authentication requirements, and home page.</p>
              </div>
              <button
                onClick={() => {
                  setEditingPage({
                    title: '',
                    slug: '',
                    type: 'standard',
                    auth_required: 0,
                    is_homepage: 0,
                    content: { sections: [] },
                  });
                  setPageModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs"
              >
                <Plus size={14} /> Create Page
              </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Title & Slug</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Access</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pages.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        No pages created yet. Apply a Pro template or create your first page.
                      </td>
                    </tr>
                  ) : (
                    pages.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900 flex items-center gap-2">
                            {p.title}
                            {Boolean(p.is_homepage) && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Home
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[11px] text-slate-400 mt-0.5">/{p.slug}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="capitalize px-2 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                            {p.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {Boolean(p.auth_required) ? (
                            <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                              <Lock size={12} /> Protected
                            </span>
                          ) : (
                            <span className="text-slate-500">Public</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            p.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right space-x-1">
                          {!Boolean(p.is_homepage) && (
                            <button
                              onClick={async () => {
                                try {
                                  await proStudioApi.setHomepage(p.id);
                                  toast.success(`Set ${p.title} as homepage`);
                                  refetchPages();
                                } catch (err: any) {
                                  toast.error(err?.response?.data?.error || "Failed to set homepage");
                                }
                              }}
                              className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-md text-[11px]"
                              title="Set as homepage"
                            >
                              Set Home
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingPage(p);
                              setPageModalOpen(true);
                            }}
                            className="p-1.5 hover:bg-slate-100 text-indigo-600 rounded-md text-[11px] font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await proStudioApi.duplicatePage(p.id);
                                toast.success("Page duplicated");
                                refetchPages();
                              } catch (err: any) {
                                toast.error(err?.response?.data?.error || "Failed to duplicate");
                              }
                            }}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-md"
                            title="Duplicate"
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Delete page '${p.title}'?`)) {
                                try {
                                  await proStudioApi.deletePage(p.id);
                                  toast.success("Page deleted");
                                  refetchPages();
                                } catch (err: any) {
                                  toast.error(err?.response?.data?.error || "Failed to delete");
                                }
                              }
                            }}
                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-md"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: ROUTES */}
        {/* ================================================================= */}
        {activeTab === 'routes' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Routes & Access Guard</h2>
                <p className="text-xs text-slate-500">Map URL patterns to pages and enforce server-side authentication policies.</p>
              </div>
              <button
                onClick={() => {
                  setEditingRoute({
                    path_pattern: '/',
                    page_id: pages[0]?.id || '',
                    access_level: 'public',
                  });
                  setRouteModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs"
              >
                <Plus size={14} /> Add Route
              </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Path Pattern</th>
                    <th className="px-4 py-3">Mapped Page</th>
                    <th className="px-4 py-3">Access Level</th>
                    <th className="px-4 py-3">Function Binding</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {routes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        No custom routes configured.
                      </td>
                    </tr>
                  ) : (
                    routes.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5 font-mono font-semibold text-slate-900">
                          {r.path_pattern}
                          {r.path_pattern.includes(':') && (
                            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-sans font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Dynamic
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-medium text-slate-800">{r.page_title || r.page_id}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-semibold uppercase ${
                            r.access_level === 'authenticated'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {r.access_level}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {r.function_binding ? (
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {r.function_binding}()
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">None</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right space-x-1">
                          <button
                            onClick={() => {
                              setEditingRoute(r);
                              setRouteModalOpen(true);
                            }}
                            className="p-1.5 hover:bg-slate-100 text-indigo-600 rounded-md text-[11px] font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Delete route '${r.path_pattern}'?`)) {
                                try {
                                  await proStudioApi.deleteRoute(r.id);
                                  toast.success("Route deleted");
                                  refetchRoutes();
                                } catch (err: any) {
                                  toast.error("Failed to delete route");
                                }
                              }
                            }}
                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-md"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: FUNCTIONS */}
        {/* ================================================================= */}
        {activeTab === 'functions' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Controlled Fera Functions</h2>
                <p className="text-xs text-slate-500">
                  Sandboxed server-side functions. Strictly restricted to approved <code className="text-indigo-600">ferasetu.*</code> operations.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingFunction({
                    name: 'getCustomData',
                    description: 'Custom server-side data resolver',
                    capabilities: ['products.read'],
                    code: `function getCustomData() {\n  return products.list({ limit: 5 });\n}`,
                  });
                  setFunctionModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs"
              >
                <Plus size={14} /> New Function
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Functions List */}
              <div className="space-y-4">
                {functions.length === 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
                    No functions created yet. Apply a Pro template or create a new function.
                  </div>
                ) : (
                  functions.map((fn) => (
                    <div key={fn.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-mono text-sm font-bold text-slate-900">{fn.name}()</h3>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                              v{fn.version}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{fn.description || "No description provided."}</p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              const codeStr = typeof fn.definition === 'string' ? fn.definition : (fn.definition?.source || "");
                              setEditingFunction({
                                id: fn.id,
                                name: fn.name,
                                description: fn.description || "",
                                code: codeStr,
                                capabilities: fn.capabilities || [],
                              });
                              setFunctionModalOpen(true);
                            }}
                            className="text-xs px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Delete function '${fn.name}'?`)) {
                                try {
                                  await proStudioApi.deleteFunction(fn.id);
                                  toast.success("Function deleted");
                                  refetchFunctions();
                                } catch (err: any) {
                                  toast.error("Failed to delete function");
                                }
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {fn.capabilities.map((cap) => (
                          <span key={cap} className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {cap}
                          </span>
                        ))}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Timeout: {fn.timeout_ms}ms</span>
                        <button
                          onClick={async () => {
                            setIsTestingFunction(true);
                            try {
                              const res = await proStudioApi.executeFunction(fn.id, {});
                              setFunctionTestResult(res);
                              toast.success(`Executed ${fn.name}() in ${res.duration_ms}ms`);
                            } catch (err: any) {
                              setFunctionTestResult({ error: err.message, details: err.response?.data });
                              toast.error(`Execution failed: ${err.message}`);
                            } finally {
                              setIsTestingFunction(false);
                            }
                          }}
                          className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:text-rose-700"
                        >
                          <Play size={12} /> Test Run
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Live Sandbox Execution Console */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 text-white flex flex-col h-[520px]">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Terminal size={16} className="text-emerald-400" />
                    <h3 className="font-bold text-sm text-slate-200">Fera Sandbox Console</h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Restricted AST Engine</span>
                </div>

                <div className="my-3">
                  <label className="text-xs font-medium text-slate-400 mb-1 block">Test Input Arguments (JSON)</label>
                  <input
                    type="text"
                    value={functionTestArgs}
                    onChange={(e) => setFunctionTestArgs(e.target.value)}
                    placeholder='{"limit": 5, "featured": true}'
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div className="flex-1 overflow-auto bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-300">
                  {isTestingFunction ? (
                    <div className="flex items-center gap-2 text-slate-500">
                      <RefreshCw size={14} className="animate-spin" /> Evaluating within sandbox...
                    </div>
                  ) : functionTestResult ? (
                    <pre className="whitespace-pre-wrap">{JSON.stringify(functionTestResult, null, 2)}</pre>
                  ) : (
                    <div className="text-slate-600 italic">
                      Click "Test Run" on any function or test custom code to view sandbox execution output here.
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Execution limit: 5,000 steps</span>
                  <span>Timeout: 1,500ms</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 5: TEMPLATES */}
        {/* ================================================================= */}
        {activeTab === 'templates' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Advanced Pro Templates</h2>
              <p className="text-xs text-slate-500">
                Four production-grade multi-page architectures complete with navigation, auth, dynamic routes, and functions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  id: 'studio',
                  name: 'Studio',
                  tagline: 'Creative Agency & Design Atelier',
                  desc: 'Multi-page portfolio with editorial showcase, protected client proofing portal, and dynamic project archive.',
                  pages: '9 Pages',
                  badge: 'Agency & Portfolio',
                  color: 'from-rose-600 to-slate-900',
                },
                {
                  id: 'launch',
                  name: 'Launch',
                  tagline: 'Hardware & Tech Product Debut',
                  desc: 'Interactive product launch with engineering specifications, pre-order bundles, and backer dashboard.',
                  pages: '10 Pages',
                  badge: 'Tech & Hardware',
                  color: 'from-blue-600 to-indigo-950',
                },
                {
                  id: 'creator',
                  name: 'Creator',
                  tagline: 'Digital Goods & Member Community',
                  desc: 'Digital asset drops, tutorials, and gated members-only download vault with authentication.',
                  pages: '9 Pages',
                  badge: 'Media & Downloads',
                  color: 'from-purple-600 to-indigo-900',
                },
                {
                  id: 'commerce_pro',
                  name: 'Commerce Pro',
                  tagline: 'Flagship Direct-to-Consumer Store',
                  desc: 'Full-scale commerce with category catalog, wholesale B2B bulk inquiries, customer order tracking.',
                  pages: '10 Pages',
                  badge: 'Full-Scale Retail',
                  color: 'from-emerald-600 to-slate-900',
                },
              ].map((tmpl) => (
                <div key={tmpl.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                  <div className={`p-6 bg-gradient-to-r ${tmpl.color} text-white`}>
                    <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 uppercase tracking-wider mb-3">
                      {tmpl.badge}
                    </div>
                    <h3 className="text-xl font-extrabold">{tmpl.name}</h3>
                    <p className="text-xs text-white/80 mt-1">{tmpl.tagline}</p>
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-xs text-slate-600 leading-relaxed">{tmpl.desc}</p>
                      <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-medium text-slate-500">
                        <span className="bg-slate-100 px-2.5 py-1 rounded-md">{tmpl.pages}</span>
                        <span className="bg-slate-100 px-2.5 py-1 rounded-md">Auth / Signup / Account</span>
                        <span className="bg-slate-100 px-2.5 py-1 rounded-md">Dynamic Routes</span>
                        <span className="bg-slate-100 px-2.5 py-1 rounded-md">Bound Functions</span>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">Ready to install</span>
                      <button
                        disabled={Boolean(installingTemplateId)}
                        onClick={async () => {
                          if (confirm(`Install '${tmpl.name}' template? This will configure draft pages, routes, functions, and navigation.`)) {
                            setInstallingTemplateId(tmpl.id);
                            try {
                              const res = await proStudioApi.applyTemplate(tmpl.id);
                              toast.success(`Installed ${tmpl.name} template (${res.pages_installed} pages configured)`);
                              await Promise.all([
                                refetchPages(),
                                refetchRoutes(),
                                refetchFunctions()
                              ]);
                              setTab('pages');
                            } catch (err: any) {
                              toast.error(err?.response?.data?.error || "Failed to install template");
                            } finally {
                              setInstallingTemplateId(null);
                            }
                          }
                        }}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-xs font-semibold shadow-xs transition-all ${
                          installingTemplateId === tmpl.id
                            ? 'bg-slate-700 cursor-wait'
                            : 'bg-slate-900 hover:bg-slate-800'
                        }`}
                      >
                        {installingTemplateId === tmpl.id ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" /> Installing...
                          </>
                        ) : (
                          <>
                            Install Template <ArrowUpRight size={14} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 6: DATA & STORAGE */}
        {/* ================================================================= */}
        {activeTab === 'storage' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Tenant KV Storage</h2>
                <p className="text-xs text-slate-500">Key-value state managed by your Fera Functions via <code className="text-indigo-600">ferasetu.storage.*</code>.</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Storage Key</th>
                    <th className="px-4 py-3">Payload Value</th>
                    <th className="px-4 py-3">Size</th>
                    <th className="px-4 py-3">Last Updated</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {storageKeys.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        No storage keys set yet. Functions can write keys using <code className="text-indigo-600">storage.set(key, val)</code>.
                      </td>
                    </tr>
                  ) : (
                    storageKeys.map((item) => (
                      <tr key={item.key} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{item.key}</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500 max-w-md truncate">
                          {item.value}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px]">{item.bytes_size} B</td>
                        <td className="px-4 py-3 text-[11px] text-slate-400">{new Date(item.updated_at).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={async () => {
                              if (confirm(`Delete storage key '${item.key}'?`)) {
                                await proStudioApi.deleteStorage(item.key);
                                toast.success("Key deleted");
                                refetchStorage();
                              }
                            }}
                            className="text-rose-600 hover:text-rose-700 p-1"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 7: AUTHENTICATION */}
        {/* ================================================================= */}
        {activeTab === 'auth' && (
          <div className="space-y-6 max-w-4xl">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Storefront Customer Authentication</h2>
              <p className="text-xs text-slate-500">Configure customer registration, login pages, and protected routes.</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Protected Routes Enforced</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                When a visitor accesses an authenticated route, FeraSetu verifies their session server-side. If not logged in, they are redirected to <code className="text-indigo-600 font-mono">/login</code>.
              </p>

              <div className="space-y-2 pt-2">
                {routes.filter(r => r.access_level === 'authenticated').map(r => (
                  <div key={r.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium">
                    <span className="font-mono text-slate-900">{r.path_pattern}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase">
                      Requires Customer Login
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 8: AI BUILDER */}
        {/* ================================================================= */}
        {activeTab === 'ai_builder' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-rose-600 text-white flex items-center justify-center mx-auto shadow-md">
                <Sparkles size={24} />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">FeraSetu AI Pro Copilot</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Ask FeraSetu AI to generate pages, wire functions, add routes, or prepare wholesale portals using structured operations.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700">What would you like to build?</label>
                <textarea
                  rows={3}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder='e.g. "Create a wholesale page with a bulk inquiry form and send contact messages to email"'
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-500"
                />

                <div className="flex flex-wrap gap-2 text-[11px]">
                  {[
                    "Create a wholesale page with bulk inquiry form",
                    "Add /products/:slug dynamic route",
                    "Create a protected customer dashboard",
                    "Apply the Commerce Pro template",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAiPrompt(preset)}
                      className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!aiPrompt.trim()) return;
                    const parsed = parseAIPromptToActions(aiPrompt);
                    setPlannedActions(parsed);
                  }}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Sparkles size={14} /> Plan Operations
                </button>
              </div>

              {/* Planned Operations Preview */}
              {plannedActions.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Planned Structured Actions</h4>
                    <span className="text-[11px] text-slate-400">{plannedActions.length} operations</span>
                  </div>

                  <div className="space-y-2">
                    {plannedActions.map((op, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center mt-0.5">
                          {idx + 1}
                        </div>
                        <div className="flex-1 text-xs">
                          <div className="font-semibold text-slate-900">{op.title}</div>
                          <div className="text-slate-500 mt-0.5">{op.description}</div>
                          <div className="font-mono text-[10px] text-indigo-600 mt-1">action: {op.action}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    disabled={isExecutingAI}
                    onClick={async () => {
                      setIsExecutingAI(true);
                      try {
                        for (const op of plannedActions) {
                          if (op.action === 'apply_template') {
                            await proStudioApi.applyTemplate(op.params.template_id);
                          } else {
                            await proStudioApi.executeAIAction(op.action, op.params);
                          }
                        }
                        toast.success("AI actions executed successfully!");
                        setPlannedActions([]);
                        setAiPrompt('');
                        refetchPages();
                        refetchRoutes();
                        refetchFunctions();
                        setTab('pages');
                      } catch (err: any) {
                        toast.error(err?.response?.data?.error || "Execution failed");
                      } finally {
                        setIsExecutingAI(false);
                      }
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5"
                  >
                    {isExecutingAI ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                    Execute Planned Actions Atomically
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 9: DEPLOY & PUBLISH */}
        {/* ================================================================= */}
        {activeTab === 'publish' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Atomic Deployment & Publishing</h2>
              <p className="text-xs text-slate-500">
                Validate all routes, bindings, and capabilities before publishing an immutable live deployment.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Site Validation Check</h3>
                  <p className="text-xs text-slate-500">Checks broken routes, missing pages, and function references.</p>
                </div>
                <button
                  disabled={isValidating}
                  onClick={async () => {
                    setIsValidating(true);
                    try {
                      const res = await proStudioApi.validateSite();
                      setValidationResult(res);
                      if (res.valid) toast.success("Site validation passed!");
                      else toast.error("Site validation found issues.");
                    } catch (err: any) {
                      toast.error("Validation check failed");
                    } finally {
                      setIsValidating(false);
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {isValidating ? "Validating..." : "Run Validation"}
                </button>
              </div>

              {validationResult && (
                <div className={`p-4 rounded-xl border ${validationResult.valid ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'} text-xs space-y-2`}>
                  <div className="font-bold flex items-center gap-2">
                    {validationResult.valid ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertCircle size={16} className="text-rose-600" />}
                    {validationResult.valid ? "Validation Passed: Site is ready to publish" : "Validation Failed"}
                  </div>

                  {validationResult.errors.length > 0 && (
                    <ul className="list-disc list-inside space-y-1 text-rose-700">
                      {validationResult.errors.map((e: string, i: number) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  )}

                  {validationResult.warnings.length > 0 && (
                    <ul className="list-disc list-inside space-y-1 text-amber-700">
                      {validationResult.warnings.map((w: string, i: number) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">Atomic 1-Click Publish</div>
                  <div className="text-[11px] text-slate-500">Deploys snapshot to live storefront edge instantly.</div>
                </div>
                <button
                  disabled={isPublishing}
                  onClick={async () => {
                    setIsPublishing(true);
                    try {
                      const res = await proStudioApi.publishSite();
                      toast.success(`Published deployment version ${res.version}!`);
                      refetchOverview();
                      refetchPages();
                      refetchRoutes();
                      refetchFunctions();
                    } catch (err: any) {
                      toast.error(err?.response?.data?.error || "Publishing failed");
                    } finally {
                      setIsPublishing(false);
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-sm flex items-center gap-2"
                >
                  {isPublishing ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  Publish Site Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 10: PROJECT IMPORTS */}
        {/* ================================================================= */}
        {activeTab === 'imports' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">Project Imports & Deterministic Analysis</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    AST-First Engine
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                  Import entire React, Vite, Express, or Static codebases into Pro Studio resources with zero AI and 100% deterministic mapping. Full project snapshots are stored in Backblaze B2, while metadata and routes are tracked in D1.
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedReimportProjectId(null);
                  setImportModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs shrink-0"
              >
                <FolderUp size={15} /> Import Project ZIP
              </button>
            </div>

            {importedProjects.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
                  <FolderUp size={24} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">No imported projects yet</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6">
                  Upload a ZIP archive of your React, Vite, Express, or Static website. The deterministic analyzer will parse pages, routes, functions, and assets automatically.
                </p>
                <button
                  onClick={() => {
                    setSelectedReimportProjectId(null);
                    setImportModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs"
                >
                  <FolderUp size={14} /> Upload Project Archive
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {importedProjects.map((proj) => (
                  <div key={proj.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                          {proj.framework || 'unknown'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          v{proj.latest_version_number || 1}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 truncate" title={proj.name}>
                        {proj.name}
                      </h3>
                      <p className="text-xs text-slate-500 truncate mt-0.5 font-mono" title={proj.original_path || ''}>
                        {proj.original_path || 'Archive upload'}
                      </p>

                      <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase font-medium">B2 Storage</span>
                          <span className="font-semibold text-slate-700">
                            {proj.latest_snapshot_b2_key ? 'Stored in B2' : 'Pending'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase font-medium">Last Import</span>
                          <span className="font-semibold text-slate-700">
                            {proj.updated_at ? new Date(proj.updated_at).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedReimportProjectId(proj.id);
                          setImportModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors"
                      >
                        <RefreshCw size={12} /> Sync / Re-import
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ================================================================= */}
      {/* MODAL: CREATE / EDIT PAGE */}
      {/* ================================================================= */}
      {pageModalOpen && editingPage && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {editingPage.id ? "Edit Page" : "Create New Page"}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Page Title</label>
                <input
                  type="text"
                  value={editingPage.title || ''}
                  onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value })}
                  placeholder="About Us"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">URL Slug</label>
                <input
                  type="text"
                  value={editingPage.slug || ''}
                  onChange={(e) => setEditingPage({ ...editingPage, slug: e.target.value })}
                  placeholder="about"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Page Type</label>
                <select
                  value={editingPage.type || 'standard'}
                  onChange={(e) => setEditingPage({ ...editingPage, type: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                >
                  <option value="standard">Standard Page</option>
                  <option value="protected">Protected / Member Only</option>
                  <option value="auth_login">Login Page</option>
                  <option value="auth_signup">Signup Page</option>
                  <option value="auth_account">Customer Account Page</option>
                  <option value="custom">Custom Dynamic Page</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="auth_req"
                  checked={Boolean(editingPage.auth_required)}
                  onChange={(e) => setEditingPage({ ...editingPage, auth_required: e.target.checked ? 1 : 0 })}
                  className="rounded text-indigo-600"
                />
                <label htmlFor="auth_req" className="font-medium text-slate-700">Require Customer Login to view this page</label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPageModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    if (editingPage.id) {
                      await proStudioApi.updatePage(editingPage.id, editingPage);
                      toast.success("Page updated");
                    } else {
                      await proStudioApi.createPage(editingPage);
                      toast.success("Page created");
                    }
                    setPageModalOpen(false);
                    refetchPages();
                    refetchRoutes();
                  } catch (err: any) {
                    toast.error(err?.response?.data?.error || "Save failed");
                  }
                }}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
              >
                Save Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: CREATE / EDIT FUNCTION */}
      {/* ================================================================= */}
      {functionModalOpen && editingFunction && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {editingFunction.id ? "Edit Fera Function" : "Create Fera Function"}
            </h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Function Name</label>
                  <input
                    type="text"
                    value={editingFunction.name}
                    onChange={(e) => setEditingFunction({ ...editingFunction, name: e.target.value })}
                    placeholder="getFeaturedProducts"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Description</label>
                  <input
                    type="text"
                    value={editingFunction.description}
                    onChange={(e) => setEditingFunction({ ...editingFunction, description: e.target.value })}
                    placeholder="Fetches live products"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Fera Function Code (Declarative JS)</label>
                <textarea
                  rows={8}
                  value={editingFunction.code}
                  onChange={(e) => setEditingFunction({ ...editingFunction, code: e.target.value })}
                  className="w-full bg-slate-900 text-slate-200 font-mono text-xs rounded-lg p-3 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Declared Capabilities</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {['products.read', 'orders.create', 'orders.read', 'email.send', 'storage.read', 'storage.write', 'customers.inquiry.create', 'auth.read', 'auth.required'].map((cap) => (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => {
                        const exists = editingFunction.capabilities.includes(cap);
                        const next = exists
                          ? editingFunction.capabilities.filter(c => c !== cap)
                          : [...editingFunction.capabilities, cap];
                        setEditingFunction({ ...editingFunction, capabilities: next });
                      }}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all ${
                        editingFunction.capabilities.includes(cap)
                          ? 'bg-emerald-600 text-white font-bold shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cap}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setFunctionModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    if (editingFunction.id) {
                      await proStudioApi.updateFunction(editingFunction.id, editingFunction);
                      toast.success("Function updated");
                    } else {
                      await proStudioApi.createFunction(editingFunction);
                      toast.success("Function created");
                    }
                    setFunctionModalOpen(false);
                    refetchFunctions();
                  } catch (err: any) {
                    toast.error(err?.response?.data?.error || "Save failed");
                  }
                }}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
              >
                Save Function
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: CREATE / EDIT ROUTE */}
      {/* ================================================================= */}
      {routeModalOpen && editingRoute && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {editingRoute.id ? "Edit Route" : "Add URL Route"}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Path Pattern</label>
                <input
                  type="text"
                  value={editingRoute.path_pattern}
                  onChange={(e) => setEditingRoute({ ...editingRoute, path_pattern: e.target.value })}
                  placeholder="/products/:slug"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Page</label>
                <select
                  value={editingRoute.page_id}
                  onChange={(e) => setEditingRoute({ ...editingRoute, page_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                >
                  {pages.map(p => (
                    <option key={p.id} value={p.id}>{p.title} (/{p.slug})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Access Level</label>
                <select
                  value={editingRoute.access_level}
                  onChange={(e) => setEditingRoute({ ...editingRoute, access_level: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                >
                  <option value="public">Public (Anyone can view)</option>
                  <option value="authenticated">Authenticated (Customer Login Required)</option>
                  <option value="merchant_admin">Merchant Admin Only</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Function Binding (Optional)</label>
                <select
                  value={editingRoute.function_binding || ''}
                  onChange={(e) => setEditingRoute({ ...editingRoute, function_binding: e.target.value || null })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono"
                >
                  <option value="">None</option>
                  {functions.map(f => (
                    <option key={f.id} value={f.name}>{f.name}()</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRouteModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    if (editingRoute.id) {
                      await proStudioApi.updateRoute(editingRoute.id, editingRoute);
                      toast.success("Route updated");
                    } else {
                      await proStudioApi.createRoute(editingRoute);
                      toast.success("Route added");
                    }
                    setRouteModalOpen(false);
                    refetchRoutes();
                  } catch (err: any) {
                    toast.error(err?.response?.data?.error || "Save failed");
                  }
                }}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
              >
                Save Route
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: PROJECT IMPORT & DETERMINISTIC ANALYSIS */}
      {/* ================================================================= */}
      <ProjectImportModal
        isOpen={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setSelectedReimportProjectId(null);
        }}
        onImportSuccess={() => {
          refetchOverview();
          refetchPages();
          refetchRoutes();
          refetchFunctions();
          refetchProjects();
        }}
        existingProjectId={selectedReimportProjectId}
      />

    </div>
  );
}
