// FeraSetu Pro Studio — Master Page Editor Workspace
// =============================================================================
// Complete 3-panel visual and code page builder.
// Central live canvas with responsive viewports (Desktop, Tablet, Mobile),
// drag & drop, selection, reordering, undo/redo history, and atomic publishing.
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { PageDocument, PageComponentNode, ViewportBreakpoint, ActiveEditorTab } from './pageEditorTypes';
import {
  createBlankPageDocument,
  migratePageDocument,
  generateNodeId,
  insertNode,
  removeNode,
  moveNode,
  duplicateNode,
  updateNodeProps,
  updateNodeResponsive,
  findNodeAndParent,
} from '../../../../../worker/pro/pageModel.js';
import { convertTemplatePageToDocument } from '../../../../../worker/pro/pageTemplateAdapter.js';
import { proStudioApi, type ProPage } from '../../../services/proStudioApi';
import { ComponentsPanel } from './ComponentsPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { ComponentRenderer } from './ComponentRenderer';
import { CodeEditorPanel } from './CodeEditorPanel';
import { PreviewModal } from './PreviewModal';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  Monitor,
  Tablet,
  Smartphone,
  Undo2,
  Redo2,
  Eye,
  Save,
  Send,
  Check,
  AlertCircle,
  Code2,
  Layout,
  RefreshCw,
} from 'lucide-react';

interface ProPageEditorProps {
  pageId: string;
  onBack: () => void;
  onPageUpdated?: (page: ProPage) => void;
}

export const ProPageEditor: React.FC<ProPageEditorProps> = ({
  pageId,
  onBack,
  onPageUpdated,
}) => {
  // Page Document & Server State
  const [pageMeta, setPageMeta] = useState<ProPage | null>(null);
  const [document, setDocument] = useState<PageDocument>(createBlankPageDocument());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Editor View Controls
  const [activeTab, setActiveTab] = useState<ActiveEditorTab>('visual');
  const [viewport, setViewport] = useState<ViewportBreakpoint>('desktop');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // History / Undo & Redo (Max 50 states)
  const [history, setHistory] = useState<PageDocument[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Save / Autosave State
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty' | 'error'>('saved');
  const [isPublishing, setIsPublishing] = useState(false);
  const autosaveTimerRef = useRef<any>(null);

  // ---------------------------------------------------------------------------
  // 1. Initial Page Load
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let mounted = true;
    async function loadPage() {
      try {
        const page = await proStudioApi.getPage(pageId);
        if (!mounted) return;
        setPageMeta(page);

        // Parse content: check if structured JSON document or raw code/HTML
        let doc: PageDocument;
        if (page.content && typeof page.content === 'object' && page.content.schemaVersion) {
          doc = page.content as PageDocument;
        } else if (page.content && typeof page.content === 'string' && page.content.startsWith('{')) {
          try {
            doc = JSON.parse(page.content);
          } catch {
            doc = migratePageDocument(page.content);
          }
        } else {
          doc = migratePageDocument(page.content);
        }

        doc.title = page.title || doc.title;
        setDocument(doc);
        setHistory([JSON.parse(JSON.stringify(doc))]);
        setHistoryIndex(0);
        setIsDirty(false);
        setSaveStatus('saved');
      } catch (err: any) {
        toast.error(err?.response?.data?.error || 'Failed to load page');
      }
    }

    loadPage();
    return () => {
      mounted = false;
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [pageId]);

  // ---------------------------------------------------------------------------
  // 2. History & Undo / Redo Operations
  // ---------------------------------------------------------------------------
  const commitChange = useCallback((newDoc: PageDocument) => {
    const cloned = JSON.parse(JSON.stringify(newDoc));
    setDocument(cloned);
    setIsDirty(true);
    setSaveStatus('dirty');

    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      const updated = [...trimmed, cloned];
      if (updated.length > 50) updated.shift();
      return updated;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      const targetDoc = JSON.parse(JSON.stringify(history[nextIndex]));
      setDocument(targetDoc);
      setHistoryIndex(nextIndex);
      setIsDirty(true);
      setSaveStatus('dirty');
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const targetDoc = JSON.parse(JSON.stringify(history[nextIndex]));
      setDocument(targetDoc);
      setHistoryIndex(nextIndex);
      setIsDirty(true);
      setSaveStatus('dirty');
    }
  }, [history, historyIndex]);

  // Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // ---------------------------------------------------------------------------
  // 3. Document Tree Mutations (Preserves Node ID Stability!)
  // ---------------------------------------------------------------------------
  const handleAddComponent = (componentType: string) => {
    const docCopy = JSON.parse(JSON.stringify(document));
    const newNode: PageComponentNode = {
      id: generateNodeId(componentType.slice(0, 3)),
      type: componentType,
      version: 1,
      props: {},
    };

    if (selectedNodeId) {
      insertNode(docCopy, selectedNodeId, newNode, 'after');
    } else {
      docCopy.nodes.push(newNode);
    }

    commitChange(docCopy);
    setSelectedNodeId(newNode.id);
  };

  const handleApplyTemplate = (templateKey: string) => {
    try {
      const tmplDoc = convertTemplatePageToDocument(templateKey, 'home');
      tmplDoc.title = document.title;
      commitChange(tmplDoc);
      setSelectedNodeId(null);
      toast.success(`Applied '${templateKey}' template`);
    } catch (err: any) {
      toast.error(`Template apply failed: ${err.message}`);
    }
  };

  const handleMoveUp = (nodeId: string) => {
    const docCopy = JSON.parse(JSON.stringify(document));
    const found = findNodeAndParent(docCopy.nodes, nodeId);
    if (!found || found.index === 0) return;

    const prevSibling = found.siblings[found.index - 1];
    moveNode(docCopy, nodeId, prevSibling.id, 'before');
    commitChange(docCopy);
  };

  const handleMoveDown = (nodeId: string) => {
    const docCopy = JSON.parse(JSON.stringify(document));
    const found = findNodeAndParent(docCopy.nodes, nodeId);
    if (!found || found.index >= found.siblings.length - 1) return;

    const nextSibling = found.siblings[found.index + 1];
    moveNode(docCopy, nodeId, nextSibling.id, 'after');
    commitChange(docCopy);
  };

  const handleDuplicate = (nodeId: string) => {
    const docCopy = JSON.parse(JSON.stringify(document));
    const duplicated = duplicateNode(docCopy, nodeId);
    if (duplicated) {
      commitChange(docCopy);
      setSelectedNodeId(duplicated.id);
    }
  };

  const handleDelete = (nodeId: string) => {
    const docCopy = JSON.parse(JSON.stringify(document));
    removeNode(docCopy, nodeId);
    commitChange(docCopy);
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  };

  const handleUpdateProps = (nodeId: string, updates: Record<string, any>) => {
    const docCopy = JSON.parse(JSON.stringify(document));
    updateNodeProps(docCopy, nodeId, updates);
    commitChange(docCopy);
  };

  const handleUpdateResponsive = (nodeId: string, bp: ViewportBreakpoint, updates: Record<string, any>) => {
    const docCopy = JSON.parse(JSON.stringify(document));
    updateNodeResponsive(docCopy, nodeId, bp, updates);
    commitChange(docCopy);
  };

  const handleUpdateDocumentMeta = (updates: Partial<PageDocument>) => {
    const docCopy = {
      ...document,
      ...updates,
    };
    commitChange(docCopy);
  };

  // Drag & Drop to Canvas
  const handleDropOnCanvas = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;
      const data = JSON.parse(dataStr);
      if (data.componentType) {
        handleAddComponent(data.componentType);
      }
    } catch {}
  };

  // ---------------------------------------------------------------------------
  // 4. Persistence & Publish Operations
  // ---------------------------------------------------------------------------
  const handleSave = async (isAutosave = false) => {
    setSaveStatus('saving');
    try {
      const updated = await proStudioApi.updatePage(pageId, {
        title: document.title,
        content: document,
      });

      setPageMeta(updated);
      setIsDirty(false);
      setSaveStatus('saved');
      onPageUpdated?.(updated);
      if (!isAutosave) {
        toast.success('Page saved successfully');
      }
    } catch (err: any) {
      setSaveStatus('error');
      toast.error(err?.response?.data?.error || err.message || 'Save failed');
    }
  };

  // Debounced Autosave (Correction 14: 3-second debounce after edit)
  useEffect(() => {
    if (!isDirty) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = setTimeout(() => {
      handleSave(true);
    }, 3000);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [document, isDirty]);

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      // 1. Ensure latest document state is saved
      if (isDirty) {
        await handleSave(false);
      }

      // 2. Validate site and trigger atomic publish
      const res = await proStudioApi.publishSite('merchant');
      toast.success(`Site published live! Deployment v${res.version}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err.message || 'Publish failed');
    } finally {
      setIsPublishing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Ancestor Breadcrumbs Computation
  // ---------------------------------------------------------------------------
  const selectedAncestors = React.useMemo(() => {
    if (!selectedNodeId) return [];
    const ancestors: { id: string; label: string }[] = [];

    let currentId = selectedNodeId;
    while (true) {
      const found = findNodeAndParent(document.nodes, currentId);
      if (!found || !found.parent) break;
      ancestors.unshift({
        id: found.parent.id,
        label: found.parent.type,
      });
      currentId = found.parent.id;
    }

    return ancestors;
  }, [document.nodes, selectedNodeId]);

  const selectedNode = React.useMemo(() => {
    if (!selectedNodeId) return null;
    const found = findNodeAndParent(document.nodes, selectedNodeId);
    return found?.node || null;
  }, [document.nodes, selectedNodeId]);

  // Responsive device container styling
  const canvasWidthClasses: Record<ViewportBreakpoint, string> = {
    desktop: 'w-full max-w-6xl',
    tablet: 'w-[768px]',
    mobile: 'w-[375px]',
  };

  return (
    <div className="fixed inset-0 z-40 bg-slate-100 flex flex-col overflow-hidden text-slate-900 select-none">
      {/* ===================================================================== */}
      {/* 1. TOP HEADER TOOLBAR */}
      {/* ===================================================================== */}
      <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shadow-xs shrink-0 z-30">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (isDirty && !confirm('You have unsaved changes. Exit without saving?')) return;
              onBack();
            }}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Back to Pages"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={document.title}
              onChange={(e) => handleUpdateDocumentMeta({ title: e.target.value })}
              className="font-bold text-sm text-slate-900 bg-transparent hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-md px-2 py-1 outline-hidden transition-colors w-48 truncate"
            />
            <span className="text-slate-400 text-xs font-mono hidden sm:inline">/{pageMeta?.slug || 'page'}</span>
          </div>

          {/* Mode Switcher [Visual] [Code] */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold ml-2">
            <button
              type="button"
              onClick={() => setActiveTab('visual')}
              className={`flex items-center gap-1 px-3 py-1 rounded-md transition-colors ${
                activeTab === 'visual' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layout size={13} /> Visual
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1 px-3 py-1 rounded-md transition-colors ${
                activeTab === 'code' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Code2 size={13} /> Code
            </button>
          </div>
        </div>

        {/* Center: Responsive Breakpoint Toggles & Undo/Redo */}
        <div className="flex items-center gap-4">
          {/* Breakpoints */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setViewport('desktop')}
              className={`p-1.5 rounded-md transition-colors ${
                viewport === 'desktop' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Desktop View"
            >
              <Monitor size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewport('tablet')}
              className={`p-1.5 rounded-md transition-colors ${
                viewport === 'tablet' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Tablet View (768px)"
            >
              <Tablet size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewport('mobile')}
              className={`p-1.5 rounded-md transition-colors ${
                viewport === 'mobile' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Mobile View (375px)"
            >
              <Smartphone size={15} />
            </button>
          </div>

          {/* Undo / Redo */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={historyIndex <= 0}
              onClick={handleUndo}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={15} />
            </button>
            <button
              type="button"
              disabled={historyIndex >= history.length - 1}
              onClick={handleRedo}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 size={15} />
            </button>
          </div>
        </div>

        {/* Right: Save Status & Actions */}
        <div className="flex items-center gap-2.5">
          {/* Status Badge */}
          <div className="flex items-center text-xs">
            {saveStatus === 'saved' && (
              <span className="text-emerald-700 flex items-center gap-1 text-[11px] font-medium">
                <Check size={13} /> Saved
              </span>
            )}
            {saveStatus === 'dirty' && (
              <span className="text-amber-700 flex items-center gap-1.5 text-[11px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Unsaved changes
              </span>
            )}
            {saveStatus === 'saving' && (
              <span className="text-slate-500 flex items-center gap-1.5 text-[11px]">
                <RefreshCw size={12} className="animate-spin" /> Saving...
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-rose-600 flex items-center gap-1 text-[11px] font-medium">
                <AlertCircle size={13} /> Save failed
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
          >
            <Eye size={13} /> Preview
          </button>

          <button
            type="button"
            onClick={() => handleSave(false)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Save size={13} /> Save
          </button>

          <button
            type="button"
            disabled={isPublishing}
            onClick={handlePublish}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
          >
            <Send size={13} /> {isPublishing ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* 2. MAIN WORKSPACE (Left Components, Center Canvas, Right Properties) */}
      {/* ===================================================================== */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'visual' ? (
          <>
            {/* Left Components Panel */}
            <ComponentsPanel
              onAddComponent={handleAddComponent}
              onApplyTemplate={handleApplyTemplate}
            />

            {/* Center Live Canvas */}
            <main
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDropOnCanvas}
              onClick={() => setSelectedNodeId(null)}
              className="flex-1 bg-slate-100 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-start relative"
            >
              <div
                className={`${canvasWidthClasses[viewport]} min-h-[85vh] bg-white rounded-2xl shadow-xl border border-slate-200 transition-all duration-200 flex flex-col my-auto`}
              >
                {document.nodes.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
                    <Layout size={40} className="text-slate-300 mb-3" />
                    <h3 className="font-bold text-sm text-slate-700">Empty Page Canvas</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                      Drag components from the left panel or choose a pre-built template to start designing.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleAddComponent('section')}
                      className="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                    >
                      Add Initial Section
                    </button>
                  </div>
                ) : (
                  <div className="w-full flex-1 flex flex-col">
                    {document.nodes.map((node) => (
                      <ComponentRenderer
                        key={node.id}
                        node={node}
                        isEditorMode={true}
                        selectedNodeId={selectedNodeId}
                        viewportBreakpoint={viewport}
                        onSelectNode={(id) => setSelectedNodeId(id)}
                        onMoveUp={handleMoveUp}
                        onMoveDown={handleMoveDown}
                        onDuplicate={handleDuplicate}
                        onDelete={handleDelete}
                        onSelectParent={(pid) => setSelectedNodeId(pid)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </main>

            {/* Right Properties Panel */}
            <PropertiesPanel
              document={document}
              selectedNode={selectedNode}
              selectedAncestors={selectedAncestors}
              viewportBreakpoint={viewport}
              onUpdateProps={handleUpdateProps}
              onUpdateResponsive={handleUpdateResponsive}
              onUpdateDocumentMeta={handleUpdateDocumentMeta}
              onSelectNode={(id) => setSelectedNodeId(id)}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          </>
        ) : (
          /* Single-Page Code Mode */
          <CodeEditorPanel
            document={document}
            onUpdateDocument={(newDoc) => commitChange(newDoc)}
          />
        )}
      </div>

      {/* ===================================================================== */}
      {/* 3. LIVE PREVIEW MODAL */}
      {/* ===================================================================== */}
      {isPreviewOpen && (
        <PreviewModal
          document={document}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </div>
  );
};
