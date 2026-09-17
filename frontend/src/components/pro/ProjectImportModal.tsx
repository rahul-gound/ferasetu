import React, { useState, useRef } from 'react';
import {
  Upload, FileArchive, CheckCircle2, AlertTriangle, X, ArrowRight,
  Layers, FileText, Globe, Code, Shield, RefreshCw, Eye, Check, HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  proStudioApi,
  type ProjectConversionReport,
  type ProjectReimportDiffReport,
  type ProjectCandidatePage,
  type ProjectCandidateRoute,
  type ProjectCandidateFunction
} from '../../services/proStudioApi';

interface ProjectImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  existingProjectId?: string | null;
}

export default function ProjectImportModal({
  isOpen,
  onClose,
  onImportSuccess,
  existingProjectId = null,
}: ProjectImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // First import report state
  const [conversionReport, setConversionReport] = useState<ProjectConversionReport | null>(null);
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [selectedRoutes, setSelectedRoutes] = useState<Set<string>>(new Set());
  const [selectedFunctions, setSelectedFunctions] = useState<Set<string>>(new Set());

  // Re-import diff state
  const [reimportDiff, setReimportDiff] = useState<ProjectReimportDiffReport | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, {
    resolution: 'keep_external' | 'keep_studio' | 'manual_merge';
    resolved_content?: string;
  }>>({});
  const [manualMergeInputs, setManualMergeInputs] = useState<Record<string, string>>({});

  const [activeSubTab, setActiveSubTab] = useState<'pages' | 'routes' | 'functions' | 'warnings'>('pages');
  const [diffViewPath, setDiffViewPath] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle file selection (drag-and-drop or input)
  const handleFileChange = async (file: File) => {
    if (!file.name.endsWith('.zip')) {
      toast.error('Please upload a valid .zip project archive.');
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      if (existingProjectId) {
        // Re-import / Update diff flow
        formData.append('projectId', existingProjectId);
        const res = await proStudioApi.getReimportDiff(existingProjectId, formData);
        setReimportDiff(res.diff);

        // Pre-fill initial resolutions for non-conflicts
        const initialRes: Record<string, any> = {};
        for (const change of res.diff.changes) {
          if (change.conflict_status === 'EXTERNAL_ONLY_CHANGE') {
            initialRes[change.source_path] = { resolution: 'keep_external' };
          } else if (change.conflict_status === 'STUDIO_ONLY_CHANGE') {
            initialRes[change.source_path] = { resolution: 'keep_studio' };
          } else if (change.conflict_status === 'TRUE_CONFLICT') {
            initialRes[change.source_path] = { resolution: 'keep_external' };
          }
        }
        setResolutions(initialRes);
      } else {
        // First-time Import analysis flow
        const res = await proStudioApi.analyzeProject(formData);
        const report = res.report;
        setConversionReport(report);

        // Pre-select all pages, routes, functions
        setSelectedPages(new Set(report.resources.pages.map(p => p.slug)));
        setSelectedRoutes(new Set(report.resources.routes.map(r => r.path_pattern)));
        setSelectedFunctions(new Set(report.resources.functions.map(f => f.name)));
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to analyze project archive.';
      setUploadError(msg);
      toast.error(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Dependency-aware selection toggle
  const togglePageSelection = (slug: string) => {
    const nextPages = new Set(selectedPages);
    const nextRoutes = new Set(selectedRoutes);

    if (nextPages.has(slug)) {
      nextPages.delete(slug);
      // Unselect any routes that depend on this page
      if (conversionReport) {
        for (const r of conversionReport.resources.routes) {
          if (r.dependencies.includes(slug) || r.page_slug === slug) {
            nextRoutes.delete(r.path_pattern);
          }
        }
      }
    } else {
      nextPages.add(slug);
    }

    setSelectedPages(nextPages);
    setSelectedRoutes(nextRoutes);
  };

  const toggleRouteSelection = (pattern: string) => {
    const nextRoutes = new Set(selectedRoutes);
    const nextPages = new Set(selectedPages);

    if (nextRoutes.has(pattern)) {
      nextRoutes.delete(pattern);
    } else {
      nextRoutes.add(pattern);
      // Dependency awareness: auto-select dependent page
      if (conversionReport) {
        const route = conversionReport.resources.routes.find(r => r.path_pattern === pattern);
        if (route && route.page_slug) {
          nextPages.add(route.page_slug);
        }
      }
    }

    setSelectedRoutes(nextRoutes);
    setSelectedPages(nextPages);
  };

  const toggleFunctionSelection = (name: string) => {
    const next = new Set(selectedFunctions);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setSelectedFunctions(next);
  };

  // Execute Initial Import
  const handleExecuteImport = async () => {
    if (!conversionReport || !selectedFile) return;

    setIsCommitting(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('projectName', selectedFile.name.replace(/\.zip$/i, ''));

      const filteredPages = conversionReport.resources.pages.filter(p => selectedPages.has(p.slug));
      const filteredRoutes = conversionReport.resources.routes.filter(r => selectedRoutes.has(r.path_pattern));
      const filteredFunctions = conversionReport.resources.functions.filter(f => selectedFunctions.has(f.name));

      formData.append('selection', JSON.stringify({
        pages: filteredPages,
        routes: filteredRoutes,
        functions: filteredFunctions,
      }));

      await proStudioApi.executeProjectImport(formData);

      toast.success('Project successfully imported into Pro Studio!');
      onImportSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to commit project import.';
      setUploadError(msg);
      toast.error(msg);
    } finally {
      setIsCommitting(false);
    }
  };

  // Apply Re-import Updates
  const handleApplyReimport = async () => {
    if (!reimportDiff || !existingProjectId) return;

    setIsCommitting(true);
    setUploadError(null);

    try {
      const resolutionPayload = reimportDiff.changes.map(c => {
        const userChoice = resolutions[c.source_path] || { resolution: 'keep_external' };
        const isManual = userChoice.resolution === 'manual_merge';
        return {
          source_path: c.source_path,
          resource_type: c.resource_type,
          resource_id: c.resource_id,
          resolution: userChoice.resolution,
          resolved_content: isManual ? (manualMergeInputs[c.source_path] || c.external_content || '') : undefined,
        };
      });

      const formData = new FormData();
      if (selectedFile) formData.append('file', selectedFile);
      formData.append('projectId', existingProjectId);
      formData.append('resolutions', JSON.stringify(resolutionPayload));

      await proStudioApi.applyReimportUpdates({
        projectId: existingProjectId,
        resolutions: resolutionPayload,
      });

      toast.success('Project updates successfully applied!');
      onImportSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to apply project updates.';
      setUploadError(msg);
      toast.error(msg);
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
              <Upload size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {existingProjectId ? 'Import Updates & Review Changes' : 'Import Project'}
              </h2>
              <p className="text-xs text-slate-500">
                {existingProjectId
                  ? 'Deterministic 3-way change detection with conflict resolution'
                  : 'Deterministic AST-first analysis & Pro Studio resource conversion'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* 1. File Upload Dropzone (if no report yet) */}
          {!conversionReport && !reimportDiff && (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]);
              }}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                isAnalyzing
                  ? 'border-indigo-400 bg-indigo-50/30'
                  : 'border-slate-300 hover:border-indigo-500 hover:bg-slate-50/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileChange(e.target.files[0]);
                }}
              />
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-indigo-100/70 text-indigo-600 flex items-center justify-center">
                  <FileArchive size={28} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {isAnalyzing ? 'Analyzing project AST & structure...' : 'Click to upload or drag & drop project .zip'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports React + Vite, React, Express Backends, and Static HTML/CSS/JS (Max 25 MB)
                  </p>
                </div>
                {isAnalyzing && (
                  <div className="flex items-center gap-2 text-xs text-indigo-600 font-medium">
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Executing deterministic parser without AI...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Banner with Retry */}
          {uploadError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-rose-800 flex items-start gap-3 text-xs">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1">
                <p className="font-semibold">{uploadError}</p>
                <p className="text-slate-600 mt-0.5">No Pro Studio resources were committed.</p>
              </div>
              <button
                onClick={() => {
                  if (selectedFile) handleFileChange(selectedFile);
                }}
                className="px-2.5 py-1 bg-rose-600 text-white rounded font-medium hover:bg-rose-500 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* 2. Conversion Report (First Import) */}
          {conversionReport && (
            <div className="space-y-5">
              
              {/* Framework & Fingerprint Banner */}
              <div className="flex items-center justify-between p-4 bg-slate-900 text-white rounded-xl">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 bg-indigo-500/30 text-indigo-300 rounded border border-indigo-500/40">
                      {conversionReport.framework.name}
                    </span>
                    <span className="text-xs text-slate-400">v{conversionReport.analyzer_version}</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{conversionReport.framework.description}</p>
                </div>
                <div className="text-right text-[11px] text-slate-400">
                  <p>Fingerprint:</p>
                  <code className="text-indigo-300">{conversionReport.project_fingerprint.slice(0, 16)}...</code>
                </div>
              </div>

              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-xs text-slate-500">Pages</p>
                  <p className="text-lg font-bold text-slate-900">{conversionReport.summary.pages_count}</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-xs text-slate-500">Routes</p>
                  <p className="text-lg font-bold text-slate-900">{conversionReport.summary.routes_count}</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-xs text-slate-500">Functions</p>
                  <p className="text-lg font-bold text-slate-900">{conversionReport.summary.functions_count}</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-xs text-slate-500">Components</p>
                  <p className="text-lg font-bold text-slate-900">{conversionReport.summary.components_count}</p>
                </div>
              </div>

              {/* Quota Governance Alert */}
              {conversionReport.quotaImpact.hasExceededQuota && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Quota Exceeded:</span>
                    <p className="mt-0.5 text-amber-800">
                      Your project exceeds the plan limits. Please uncheck excess resources below to stay within your allowance.
                    </p>
                  </div>
                </div>
              )}

              {/* Sub-tabs for detailed selection */}
              <div className="flex border-b border-slate-200 space-x-2">
                {[
                  { key: 'pages', label: `Pages (${conversionReport.resources.pages.length})` },
                  { key: 'routes', label: `Routes (${conversionReport.resources.routes.length})` },
                  { key: 'functions', label: `Functions (${conversionReport.resources.functions.length})` },
                  { key: 'warnings', label: `Warnings (${conversionReport.warnings.length})` },
                ].map(t => (
                  <button
                    key={t.key}
                    onClick={() => setActiveSubTab(t.key as any)}
                    className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
                      activeSubTab === t.key
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Pages Tab */}
              {activeSubTab === 'pages' && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {conversionReport.resources.pages.map(p => (
                    <div
                      key={p.slug}
                      onClick={() => togglePageSelection(p.slug)}
                      className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                        selectedPages.has(p.slug)
                          ? 'border-indigo-300 bg-indigo-50/40 text-slate-900'
                          : 'border-slate-200 bg-white opacity-60 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedPages.has(p.slug)}
                          onChange={() => {}}
                          className="rounded text-indigo-600 pointer-events-none"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-900">{p.title}</span>
                            {p.is_homepage === 1 && (
                              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] rounded font-medium">Home</span>
                            )}
                            <span className="text-[10px] text-slate-400">/{p.slug}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">{p.source_path}</p>
                        </div>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5 bg-slate-100 rounded">
                        {p.confidence}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Routes Tab */}
              {activeSubTab === 'routes' && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {conversionReport.resources.routes.map(r => (
                    <div
                      key={r.path_pattern}
                      onClick={() => toggleRouteSelection(r.path_pattern)}
                      className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                        selectedRoutes.has(r.path_pattern)
                          ? 'border-indigo-300 bg-indigo-50/40 text-slate-900'
                          : 'border-slate-200 bg-white opacity-60 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedRoutes.has(r.path_pattern)}
                          onChange={() => {}}
                          className="rounded text-indigo-600 pointer-events-none"
                        />
                        <div>
                          <p className="font-mono text-xs font-semibold text-slate-900">{r.path_pattern}</p>
                          <p className="text-[11px] text-slate-500">
                            Target Page: <code className="text-indigo-600">{r.page_slug || r.target_component || 'Custom'}</code>
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium px-2 py-0.5 bg-slate-100 rounded">
                        {r.access_level}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Functions Tab */}
              {activeSubTab === 'functions' && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {conversionReport.resources.functions.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">No backend functions detected in this project.</p>
                  ) : (
                    conversionReport.resources.functions.map(fn => (
                      <div
                        key={fn.name}
                        onClick={() => toggleFunctionSelection(fn.name)}
                        className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                          selectedFunctions.has(fn.name)
                            ? 'border-indigo-300 bg-indigo-50/40 text-slate-900'
                            : 'border-slate-200 bg-white opacity-60 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedFunctions.has(fn.name)}
                            onChange={() => {}}
                            className="rounded text-indigo-600 pointer-events-none"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-slate-900">{fn.name}</span>
                              {fn.requiresReview && (
                                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] rounded font-medium">Review Required</span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500">{fn.description || fn.source_path}</p>
                          </div>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5 bg-slate-100 rounded">
                          {fn.confidence}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Warnings Tab */}
              {activeSubTab === 'warnings' && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {conversionReport.warnings.length === 0 ? (
                    <p className="text-xs text-emerald-600 py-6 text-center">Clean analysis! Zero warnings or unsupported packages.</p>
                  ) : (
                    conversionReport.warnings.map((w, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-amber-50/60 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                        <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                        <span>{w}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3. Re-Import / Update 3-Way Diff View */}
          {reimportDiff && (
            <div className="space-y-5">
              
              {/* 5-Outcome Summary Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-slate-500">Unchanged</p>
                  <p className="text-base font-bold text-slate-700">{reimportDiff.summary.unchanged_count}</p>
                </div>
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-emerald-700">Added</p>
                  <p className="text-base font-bold text-emerald-800">{reimportDiff.summary.added_count}</p>
                </div>
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-700">Modified</p>
                  <p className="text-base font-bold text-blue-800">{reimportDiff.summary.modified_count}</p>
                </div>
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
                  <p className="text-rose-700">Deleted</p>
                  <p className="text-base font-bold text-rose-800">{reimportDiff.summary.deleted_count}</p>
                </div>
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-amber-700">Conflicts</p>
                  <p className="text-base font-bold text-amber-800">{reimportDiff.summary.conflict_count}</p>
                </div>
              </div>

              {/* Changes List */}
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {reimportDiff.changes.map((item, idx) => {
                  const currentRes = resolutions[item.source_path]?.resolution || 'keep_external';
                  return (
                    <div key={idx} className="p-3.5 border border-slate-200 rounded-xl bg-white space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-900">{item.source_path}</span>
                            <span className={`px-2 py-0.5 text-[10px] rounded font-bold uppercase tracking-wider ${
                              item.change_type === 'added' ? 'bg-emerald-100 text-emerald-800' :
                              item.change_type === 'deleted' ? 'bg-rose-100 text-rose-800' :
                              item.change_type === 'rename_candidate' ? 'bg-purple-100 text-purple-800' :
                              item.is_conflict ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {item.change_type}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{item.summary}</p>
                        </div>

                        {/* Diff View Toggle */}
                        {item.diff && item.diff.length > 0 && (
                          <button
                            onClick={() => setDiffViewPath(diffViewPath === item.source_path ? null : item.source_path)}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                          >
                            <Eye size={13} /> {diffViewPath === item.source_path ? 'Hide Diff' : 'View Diff'}
                          </button>
                        )}
                      </div>

                      {/* Conflict Resolution Controls */}
                      {item.is_conflict && (
                        <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-xs">
                          <span className="font-semibold text-slate-700">Resolution:</span>
                          <button
                            onClick={() => setResolutions({ ...resolutions, [item.source_path]: { resolution: 'keep_external' } })}
                            className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                              currentRes === 'keep_external'
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            Keep External
                          </button>
                          <button
                            onClick={() => setResolutions({ ...resolutions, [item.source_path]: { resolution: 'keep_studio' } })}
                            className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                              currentRes === 'keep_studio'
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            Keep Studio
                          </button>
                          <button
                            onClick={() => setResolutions({ ...resolutions, [item.source_path]: { resolution: 'manual_merge' } })}
                            className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                              currentRes === 'manual_merge'
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            Manual Merge
                          </button>
                        </div>
                      )}

                      {/* Manual Merge Editor */}
                      {currentRes === 'manual_merge' && (
                        <div className="mt-2 space-y-1">
                          <label className="text-[11px] font-semibold text-slate-700">Resolved Merged Content:</label>
                          <textarea
                            value={manualMergeInputs[item.source_path] || item.external_content || ''}
                            onChange={(e) => setManualMergeInputs({ ...manualMergeInputs, [item.source_path]: e.target.value })}
                            rows={5}
                            className="w-full font-mono text-xs p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      )}

                      {/* Inline Diff Viewer */}
                      {diffViewPath === item.source_path && item.diff && (
                        <div className="mt-2 bg-slate-950 text-slate-200 p-3 rounded-lg font-mono text-xs max-h-52 overflow-y-auto space-y-0.5">
                          {item.diff.map((d, dIdx) => (
                            <div
                              key={dIdx}
                              className={`flex items-center gap-3 px-1 rounded ${
                                d.type === 'added' ? 'bg-emerald-950/60 text-emerald-400' :
                                d.type === 'removed' ? 'bg-rose-950/60 text-rose-400' : 'text-slate-400'
                              }`}
                            >
                              <span className="w-6 text-right select-none text-slate-600">
                                {d.newLineNumber || d.oldLineNumber || ' '}
                              </span>
                              <span className="select-none font-bold">
                                {d.type === 'added' ? '+' : d.type === 'removed' ? '-' : ' '}
                              </span>
                              <span className="whitespace-pre">{d.line}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>

          {conversionReport && (
            <button
              onClick={handleExecuteImport}
              disabled={isCommitting || conversionReport.quotaImpact.hasExceededQuota}
              className="px-5 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-50 flex items-center gap-2 shadow-xs transition-colors"
            >
              {isCommitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Storing B2 Snapshot & Committing...</span>
                </>
              ) : (
                <>
                  <span>Import Resources to Pro Studio</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          )}

          {reimportDiff && (
            <button
              onClick={handleApplyReimport}
              disabled={isCommitting}
              className="px-5 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-50 flex items-center gap-2 shadow-xs transition-colors"
            >
              {isCommitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Applying Changes...</span>
                </>
              ) : (
                <>
                  <span>Apply Reviewed Updates</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
