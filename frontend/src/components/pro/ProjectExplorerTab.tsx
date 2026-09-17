import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FolderUp, Layers, FileText, Globe, Code, Box, Image as ImageIcon,
  Clock, GitBranch, ArrowRight, CheckCircle2, AlertCircle, RefreshCw,
  Search, ExternalLink, Edit3, Play, Copy, Shield, ChevronRight, Hash,
  FileCode, Terminal, HelpCircle, HardDrive
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  proStudioApi,
  type ImportedProject,
  type ProPage,
  type ProRoute,
  type ProFunction,
} from '../../services/proStudioApi';

interface ProjectExplorerTabProps {
  importedProjects: ImportedProject[];
  pages: ProPage[];
  routes: ProRoute[];
  functions: ProFunction[];
  onOpenImportModal: (projectId?: string) => void;
  onOpenPageEditor: (pageId: string) => void;
  onNavigateTab: (tab: any) => void;
  onRefresh: () => void;
}

type ExplorerSection = 'overview' | 'pages' | 'routes' | 'functions' | 'components' | 'assets' | 'files' | 'versions';

export default function ProjectExplorerTab({
  importedProjects,
  pages,
  routes,
  functions,
  onOpenImportModal,
  onOpenPageEditor,
  onNavigateTab,
  onRefresh,
}: ProjectExplorerTabProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    importedProjects[0]?.id || ''
  );
  const [activeSection, setActiveSection] = useState<ExplorerSection>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  // Sync selected project if none selected yet
  React.useEffect(() => {
    if (!selectedProjectId && importedProjects.length > 0) {
      setSelectedProjectId(importedProjects[0].id);
    }
  }, [importedProjects, selectedProjectId]);

  // Fetch full details of selected project (versions, mappings, files)
  const {
    data: projectDetails,
    isLoading: isLoadingProject,
    refetch: refetchProjectDetails,
  } = useQuery({
    queryKey: ['pro-imported-project-detail', selectedProjectId],
    queryFn: () => proStudioApi.getImportedProject(selectedProjectId),
    enabled: Boolean(selectedProjectId),
  });

  const activeProject = useMemo(() => {
    return importedProjects.find(p => p.id === selectedProjectId) || projectDetails || null;
  }, [importedProjects, selectedProjectId, projectDetails]);

  const mappings = projectDetails?.mappings || [];
  const versions = projectDetails?.versions || [];
  const files = (projectDetails as any)?.files || [];

  // Mapped Resources categorization
  const mappedPages = useMemo(() => {
    return mappings.filter((m: any) => m.resource_type === 'page').map((m: any) => {
      const livePage = pages.find(p => p.id === m.resource_id);
      return {
        ...m,
        liveResource: livePage,
        name: livePage?.title || m.metadata?.title || m.source_path.split('/').pop(),
        slug: livePage?.slug,
      };
    });
  }, [mappings, pages]);

  const mappedRoutes = useMemo(() => {
    return mappings.filter((m: any) => m.resource_type === 'route').map((m: any) => {
      const liveRoute = routes.find(r => r.id === m.resource_id);
      return {
        ...m,
        liveResource: liveRoute,
        name: liveRoute?.path_pattern || m.metadata?.path_pattern || m.source_path,
        targetPage: liveRoute?.page_title,
      };
    });
  }, [mappings, routes]);

  const mappedFunctions = useMemo(() => {
    return mappings.filter((m: any) => m.resource_type === 'function').map((m: any) => {
      const liveFn = functions.find(f => f.id === m.resource_id || f.name === m.metadata?.name);
      return {
        ...m,
        liveResource: liveFn,
        name: liveFn?.name || m.metadata?.name || m.source_path.split('/').pop()?.replace(/\.[^/.]+$/, ''),
        capabilities: liveFn?.capabilities || [],
      };
    });
  }, [mappings, functions]);

  const detectedComponents = useMemo(() => {
    return mappings.filter((m: any) => m.resource_type === 'component').map((m: any) => ({
      ...m,
      name: m.metadata?.name || m.source_path.split('/').pop()?.replace(/\.[^/.]+$/, ''),
    }));
  }, [mappings]);

  const assetFiles = useMemo(() => {
    return files.filter((f: any) => {
      const p = (f.source_path || '').toLowerCase();
      return p.endsWith('.png') || p.endsWith('.jpg') || p.endsWith('.jpeg') ||
             p.endsWith('.svg') || p.endsWith('.webp') || p.endsWith('.gif') ||
             p.endsWith('.ico') || p.endsWith('.woff') || p.endsWith('.woff2') ||
             p.endsWith('.css');
    });
  }, [files]);

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  // If no projects imported yet
  if (importedProjects.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs max-w-2xl mx-auto my-8">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600 mb-4 shadow-inner">
          <FolderUp size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">No Imported Projects Yet</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto mb-6 leading-relaxed">
          Import an existing React, Vite, Express, or HTML project. FeraSetu will deterministically convert pages, routes, functions, and components into Pro Studio resources while preserving your source repository.
        </p>
        <button
          onClick={() => onOpenImportModal()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
        >
          <FolderUp size={16} /> Import Your First Project
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Project Selector Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-rose-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <FolderUp size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Project & Resource Explorer</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Traceability
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Inspect original source paths, deterministic identities, versions, and Studio bindings.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Project Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
            <span className="text-slate-400 font-medium">Project:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              {importedProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.framework || 'project'})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => onOpenImportModal(selectedProjectId)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
            title="Upload updated project code to detect changes and perform 3-way merge"
          >
            <GitBranch size={13} /> Re-import Updates
          </button>

          <button
            onClick={() => onOpenImportModal()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors"
          >
            <FolderUp size={13} /> Import New
          </button>

          <button
            onClick={() => {
              refetchProjectDetails();
              onRefresh();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className={isLoadingProject ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Selected Project Overview Card */}
      {activeProject && (
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <h3 className="text-xl font-extrabold tracking-tight">{activeProject.name}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white uppercase tracking-wider">
                  {activeProject.framework}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {activeProject.status || 'COMMITTED'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                <span className="flex items-center gap-1">
                  <Clock size={12} className="text-slate-400" />
                  Version: <strong className="text-white">v{activeProject.version_number || versions.length || 1}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Terminal size={12} className="text-slate-400" />
                  Analyzer: <span className="font-mono text-white">{activeProject.analyzer_version || '1.0.0'}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Hash size={12} className="text-slate-400" />
                  Fingerprint: <span className="font-mono text-slate-300">{activeProject.project_fingerprint?.slice(0, 16)}...</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-[11px] text-slate-400">Total Extracted Files</div>
                <div className="text-lg font-bold text-white">{files.length || '—'}</div>
              </div>
              <div className="h-8 w-px bg-white/10 hidden sm:block" />
              <div className="text-right hidden sm:block">
                <div className="text-[11px] text-slate-400">Mapped Resources</div>
                <div className="text-lg font-bold text-indigo-300">{mappings.length}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Explorer Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-1 flex flex-wrap gap-1 shadow-xs">
        {[
          { key: 'overview', label: 'Architecture Overview', icon: <Layers size={14} /> },
          { key: 'pages', label: 'Pages', count: mappedPages.length, icon: <FileText size={14} /> },
          { key: 'routes', label: 'Routes', count: mappedRoutes.length, icon: <Globe size={14} /> },
          { key: 'functions', label: 'Functions', count: mappedFunctions.length, icon: <Code size={14} /> },
          { key: 'components', label: 'Components', count: detectedComponents.length, icon: <Box size={14} /> },
          { key: 'assets', label: 'Assets', count: assetFiles.length, icon: <ImageIcon size={14} /> },
          { key: 'files', label: 'Source Files', count: files.length, icon: <FileCode size={14} /> },
          { key: 'versions', label: 'Version History', count: versions.length, icon: <Clock size={14} /> },
        ].map((tab) => {
          const isActive = activeSection === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveSection(tab.key as any);
                setSelectedItem(null);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-200/70 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Explorer Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Cols: Active Section Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search filter for tables */}
          {activeSection !== 'overview' && activeSection !== 'versions' && (
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={`Filter ${activeSection}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Section: Overview */}
          {activeSection === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div
                  onClick={() => setActiveSection('pages')}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                    <span>Pages</span>
                    <FileText size={16} className="text-indigo-500" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-2">{mappedPages.length}</div>
                  <div className="text-[11px] text-slate-400 mt-1">Routed UI screens</div>
                </div>

                <div
                  onClick={() => setActiveSection('routes')}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                    <span>Routes</span>
                    <Globe size={16} className="text-emerald-500" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-2">{mappedRoutes.length}</div>
                  <div className="text-[11px] text-slate-400 mt-1">URL patterns</div>
                </div>

                <div
                  onClick={() => setActiveSection('functions')}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-rose-300 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                    <span>Functions</span>
                    <Code size={16} className="text-rose-500" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-2">{mappedFunctions.length}</div>
                  <div className="text-[11px] text-slate-400 mt-1">Server handlers</div>
                </div>

                <div
                  onClick={() => setActiveSection('files')}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-amber-300 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                    <span>Source Files</span>
                    <FileCode size={16} className="text-amber-500" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-2">{files.length}</div>
                  <div className="text-[11px] text-slate-400 mt-1">In B2 snapshot</div>
                </div>
              </div>

              {/* Architecture Explanation Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3 text-xs text-slate-600">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Shield size={16} className="text-indigo-600" />
                  Deterministic Code-to-Platform Architecture
                </h4>
                <p className="leading-relaxed">
                  Every resource generated during project import maintains a permanent link to its source file in your Backblaze B2 archive. When you edit resources visually or in Code Mode, your edits update Studio state without corrupting the historical source.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="font-semibold text-slate-900 mb-1">1. Immutable B2 Archive</div>
                    <p className="text-[11px] text-slate-500">Committed project versions (<code className="font-mono text-indigo-600">source.zip</code>, <code className="font-mono text-indigo-600">manifest.json</code>) are stored permanently in Backblaze B2.</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="font-semibold text-slate-900 mb-1">2. Stable Identity Model</div>
                    <p className="text-[11px] text-slate-500">Resource IDs remain stable across renames, updates, and re-imports to preserve internal references.</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="font-semibold text-slate-900 mb-1">3. 3-Way Re-import Diff</div>
                    <p className="text-[11px] text-slate-500">Re-uploading code detects changes against original base and live Studio edits, giving you full merge control.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section: Pages */}
          {activeSection === 'pages' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Page Name</th>
                    <th className="px-4 py-3">Source Path</th>
                    <th className="px-4 py-3">Representation</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mappedPages
                    .filter((p: any) =>
                      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      p.source_path.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((p: any) => (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedItem({ type: 'page', data: p })}
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                          selectedItem?.data?.id === p.id ? 'bg-indigo-50/40' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <FileText size={14} className="text-indigo-500 flex-shrink-0" />
                            <span>{p.name}</span>
                            {p.slug && <span className="text-[10px] font-mono text-slate-400">/{p.slug}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                          {p.source_path}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {p.metadata?.representation_state || 'VISUAL_NATIVE'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {p.resource_id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenPageEditor(p.resource_id);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] rounded-lg transition-colors"
                            >
                              <Edit3 size={11} /> Open Editor
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Section: Routes */}
          {activeSection === 'routes' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Route Pattern</th>
                    <th className="px-4 py-3">Source Path</th>
                    <th className="px-4 py-3">Target Resource</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mappedRoutes
                    .filter((r: any) =>
                      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      r.source_path.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((r: any) => (
                      <tr
                        key={r.id}
                        onClick={() => setSelectedItem({ type: 'route', data: r })}
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                          selectedItem?.data?.id === r.id ? 'bg-indigo-50/40' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 flex items-center gap-2">
                          <Globe size={14} className="text-emerald-500 flex-shrink-0" />
                          <span>{r.name}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                          {r.source_path}
                        </td>
                        <td className="px-4 py-3">
                          {r.targetPage ? (
                            <span className="text-slate-700 font-medium">Page: {r.targetPage}</span>
                          ) : (
                            <span className="text-slate-400 italic">Route handler</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigateTab('routes');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded-lg transition-colors"
                          >
                            <ExternalLink size={11} /> View in Routes
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Section: Functions */}
          {activeSection === 'functions' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Function Name</th>
                    <th className="px-4 py-3">Source Path</th>
                    <th className="px-4 py-3">Capabilities</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mappedFunctions
                    .filter((fn: any) =>
                      fn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      fn.source_path.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((fn: any) => (
                      <tr
                        key={fn.id}
                        onClick={() => setSelectedItem({ type: 'function', data: fn })}
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                          selectedItem?.data?.id === fn.id ? 'bg-indigo-50/40' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 flex items-center gap-2">
                          <Code size={14} className="text-rose-500 flex-shrink-0" />
                          <span>{fn.name}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                          {fn.source_path}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {fn.capabilities && fn.capabilities.length > 0 ? (
                              fn.capabilities.map((c: string) => (
                                <span key={c} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-mono">
                                  {c}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 italic">None required</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigateTab('functions');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[11px] rounded-lg transition-colors"
                          >
                            <Play size={11} /> Test Sandbox
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Section: Components */}
          {activeSection === 'components' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Component</th>
                    <th className="px-4 py-3">Source Path</th>
                    <th className="px-4 py-3">Classification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {detectedComponents.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                        No isolated reusable components were detected during import.
                      </td>
                    </tr>
                  ) : (
                    detectedComponents
                      .filter((c: any) =>
                        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        c.source_path.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((c: any) => (
                        <tr
                          key={c.id}
                          onClick={() => setSelectedItem({ type: 'component', data: c })}
                          className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                            selectedItem?.data?.id === c.id ? 'bg-indigo-50/40' : ''
                          }`}
                        >
                          <td className="px-4 py-3 font-semibold text-slate-900 flex items-center gap-2">
                            <Box size={14} className="text-indigo-500 flex-shrink-0" />
                            <span>{c.name}</span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                            {c.source_path}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                              Reusable UI
                            </span>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Section: Assets */}
          {activeSection === 'assets' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Asset Path</th>
                    <th className="px-4 py-3">Size</th>
                    <th className="px-4 py-3">Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assetFiles.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                        No static assets found in this version snapshot.
                      </td>
                    </tr>
                  ) : (
                    assetFiles
                      .filter((a: any) => a.source_path.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((a: any) => (
                        <tr
                          key={a.id || a.source_path}
                          onClick={() => setSelectedItem({ type: 'asset', data: a })}
                          className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                            selectedItem?.data?.source_path === a.source_path ? 'bg-indigo-50/40' : ''
                          }`}
                        >
                          <td className="px-4 py-3 font-mono font-medium text-slate-900 flex items-center gap-2">
                            <ImageIcon size={14} className="text-amber-500 flex-shrink-0" />
                            <span>{a.source_path}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {(a.file_size / 1024).toFixed(1)} KB
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                            {a.file_hash?.slice(0, 16)}...
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Section: Source Files */}
          {activeSection === 'files' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">File Path</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Size</th>
                    <th className="px-4 py-3">Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {files
                    .filter((f: any) => f.source_path.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((f: any) => (
                      <tr
                        key={f.id || f.source_path}
                        onClick={() => setSelectedItem({ type: 'file', data: f })}
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                          selectedItem?.data?.source_path === f.source_path ? 'bg-indigo-50/40' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-mono font-medium text-slate-900 flex items-center gap-2">
                          <FileCode size={14} className="text-slate-400 flex-shrink-0" />
                          <span>{f.source_path}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                            {f.file_type || 'text'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {f.file_size ? `${(f.file_size / 1024).toFixed(1)} KB` : '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                          {f.file_hash?.slice(0, 16)}...
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Section: Version History */}
          {activeSection === 'versions' && (
            <div className="space-y-3">
              {versions.map((ver: any) => (
                <div
                  key={ver.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      v{ver.version_number}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900">Project Version {ver.version_number}</h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {ver.import_status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Committed: {new Date(ver.created_at).toLocaleString()}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-mono mt-2">
                        <span>Fingerprint: {ver.project_fingerprint?.slice(0, 16)}...</span>
                        {ver.archive_b2_key && (
                          <span className="text-indigo-600">B2: {ver.archive_b2_key}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(ver.project_fingerprint, 'Project Fingerprint')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium"
                    >
                      <Copy size={12} /> Copy Hash
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Traceability & Diagnostics Inspector */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 sticky top-24">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Shield size={16} className="text-indigo-600" />
              Traceability Diagnostics
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Select any resource on the left to inspect its source lineage.
            </p>
          </div>

          {selectedItem ? (
            <div className="space-y-4 text-xs">
              <div>
                <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mb-1">
                  Resource Name
                </div>
                <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  {selectedItem.data.name || selectedItem.data.source_path}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mb-1">
                  Resource Type
                </div>
                <span className="capitalize px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {selectedItem.type}
                </span>
              </div>

              <div>
                <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mb-1">
                  Original Source Path
                </div>
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-[11px] text-slate-800 break-all">
                  <span>{selectedItem.data.source_path}</span>
                  <button
                    onClick={() => handleCopy(selectedItem.data.source_path, 'Source Path')}
                    className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 ml-2 flex-shrink-0"
                    title="Copy path"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              </div>

              {selectedItem.data.deterministic_identity && (
                <div>
                  <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mb-1">
                    Deterministic Identity
                  </div>
                  <div className="font-mono text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200 break-all">
                    {selectedItem.data.deterministic_identity}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Source Version</div>
                  <div className="font-bold text-slate-800 mt-0.5">v{activeProject.version_number || 1}</div>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Mapping Status</div>
                  <div className="font-bold text-emerald-700 capitalize mt-0.5">
                    {selectedItem.data.mapping_status || 'Active'}
                  </div>
                </div>
              </div>

              {selectedItem.data.source_hash && (
                <div>
                  <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mb-1">
                    Source Hash (SHA-256)
                  </div>
                  <div className="font-mono text-[10px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 break-all">
                    {selectedItem.data.source_hash}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                {selectedItem.type === 'page' && selectedItem.data.resource_id && (
                  <button
                    onClick={() => onOpenPageEditor(selectedItem.data.resource_id)}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
                  >
                    <Edit3 size={13} /> Open in Page Editor
                  </button>
                )}
                {selectedItem.type === 'route' && (
                  <button
                    onClick={() => onNavigateTab('routes')}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
                  >
                    <Globe size={13} /> View in Routes
                  </button>
                )}
                {selectedItem.type === 'function' && (
                  <button
                    onClick={() => onNavigateTab('functions')}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
                  >
                    <Play size={13} /> Test Function Sandbox
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400 space-y-2">
              <Layers size={28} className="mx-auto text-slate-300" />
              <p className="font-semibold text-slate-600 text-xs">No Resource Selected</p>
              <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto">
                Click any Page, Route, Function, or Source File from the tables on the left to inspect its lineage.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
