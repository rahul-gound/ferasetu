// FeraSetu Pro Studio — Context-Sensitive Properties & Settings Panel (Right Sidebar)
// =============================================================================
// Contextual property editor with element hierarchy breadcrumbs,
// responsive inheritance controls, layout/style sliders, and action binders.
// =============================================================================

import React, { useState } from 'react';
import type { PageComponentNode, ViewportBreakpoint, PageDocument } from './pageEditorTypes';
import { SMART_COMPONENT_CATALOG, type PropControl } from './smartComponentCatalog';
import {
  Sliders,
  Layout,
  Palette,
  Zap,
  Smartphone,
  ChevronRight,
  Copy,
  Trash2,
  FileCode,
} from 'lucide-react';

interface PropertiesPanelProps {
  document: PageDocument;
  selectedNode: PageComponentNode | null;
  selectedAncestors: { id: string; label: string }[];
  viewportBreakpoint: ViewportBreakpoint;
  onUpdateProps: (nodeId: string, updates: Record<string, any>) => void;
  onUpdateResponsive: (nodeId: string, breakpoint: ViewportBreakpoint, updates: Record<string, any>) => void;
  onUpdateDocumentMeta: (updates: Partial<PageDocument>) => void;
  onSelectNode: (nodeId: string) => void;
  onDuplicate: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  document,
  selectedNode,
  selectedAncestors,
  viewportBreakpoint,
  onUpdateProps,
  onUpdateResponsive,
  onUpdateDocumentMeta,
  onSelectNode,
  onDuplicate,
  onDelete,
}) => {
  const [activeSection, setActiveSection] = useState<'content' | 'layout' | 'style' | 'actions' | 'responsive'>('content');

  // If no node selected, show page-level settings
  if (!selectedNode) {
    return (
      <div className="w-72 h-full bg-white border-l border-slate-200 flex flex-col shrink-0 text-left select-none">
        <div className="p-3 border-b border-slate-100 flex items-center gap-2 text-xs font-bold text-slate-800">
          <Sliders size={14} className="text-indigo-600" />
          <span>Page Settings</span>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs text-slate-700">
          <div>
            <label className="font-semibold block mb-1">Page Title</label>
            <input
              type="text"
              value={document.title || ''}
              onChange={(e) => onUpdateDocumentMeta({ title: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs"
            />
          </div>

          <div>
            <label className="font-semibold block mb-1">Document State</label>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono">
              <span className="font-bold text-indigo-700">{document.state}</span>
              <p className="text-slate-500 mt-0.5 font-sans">schemaVersion: {document.schemaVersion}</p>
            </div>
          </div>

          <div>
            <label className="font-semibold block mb-1 flex items-center gap-1">
              <FileCode size={13} /> Page-Level Custom CSS
            </label>
            <textarea
              rows={6}
              value={document.customCss || ''}
              onChange={(e) => onUpdateDocumentMeta({ customCss: e.target.value })}
              placeholder="/* Add scoped CSS selectors */"
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-900 text-indigo-200 font-mono text-[11px] outline-hidden"
            />
            <span className="text-[10px] text-slate-400">Preserved without destroying component classes.</span>
          </div>

          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400">
            Click any component on the canvas to inspect its properties.
          </div>
        </div>
      </div>
    );
  }

  const def = SMART_COMPONENT_CATALOG[selectedNode.type];
  const controls: PropControl[] = def?.controls || [];
  const activeProps = {
    ...(def?.defaultProps || {}),
    ...(selectedNode.props || {}),
    ...(selectedNode.responsive?.[viewportBreakpoint] || {}),
  };

  const handlePropChange = (key: string, val: any) => {
    if (activeSection === 'responsive' && viewportBreakpoint !== 'desktop') {
      onUpdateResponsive(selectedNode.id, viewportBreakpoint, { [key]: val });
    } else {
      onUpdateProps(selectedNode.id, { [key]: val });
    }
  };

  return (
    <div className="w-72 h-full bg-white border-l border-slate-200 flex flex-col shrink-0 text-left select-none">
      {/* Element Breadcrumbs */}
      <div className="p-2.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-1 overflow-x-auto text-[11px] text-slate-500 no-scrollbar">
        <button
          type="button"
          onClick={() => onSelectNode('')}
          className="hover:text-slate-900 shrink-0 font-medium"
        >
          Page
        </button>
        {selectedAncestors.map((anc) => (
          <React.Fragment key={anc.id}>
            <ChevronRight size={10} className="text-slate-400 shrink-0" />
            <button
              type="button"
              onClick={() => onSelectNode(anc.id)}
              className="hover:text-slate-900 shrink-0 font-medium truncate max-w-[80px]"
            >
              {anc.label}
            </button>
          </React.Fragment>
        ))}
        <ChevronRight size={10} className="text-slate-400 shrink-0" />
        <span className="font-bold text-indigo-600 shrink-0">{def?.label || selectedNode.type}</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 p-1 bg-slate-50 text-[11px] font-semibold">
        {[
          { key: 'content', label: 'Content', icon: <Sliders size={12} /> },
          { key: 'layout', label: 'Layout', icon: <Layout size={12} /> },
          { key: 'style', label: 'Style', icon: <Palette size={12} /> },
          { key: 'actions', label: 'Actions', icon: <Zap size={12} /> },
          { key: 'responsive', label: 'Resp.', icon: <Smartphone size={12} /> },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveSection(tab.key as any)}
            className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1 transition-colors ${
              activeSection === tab.key
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Controls Body */}
      <div className="p-4 space-y-3.5 overflow-y-auto flex-1 text-xs text-slate-700">
        {activeSection === 'responsive' && (
          <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg text-[11px] text-indigo-800 mb-2">
            Editing for <strong className="capitalize">{viewportBreakpoint}</strong>. Changes cascade down with responsive inheritance.
          </div>
        )}

        {controls
          .filter((ctrl) => activeSection === 'responsive' || ctrl.section === activeSection)
          .map((ctrl) => (
            <div key={ctrl.name} className="space-y-1">
              <label className="font-semibold block text-slate-700 text-[11px]">{ctrl.label}</label>

              {ctrl.type === 'text' && (
                <input
                  type="text"
                  value={activeProps[ctrl.name] || ''}
                  onChange={(e) => handlePropChange(ctrl.name, e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:ring-1 focus:ring-slate-900 outline-hidden"
                />
              )}

              {ctrl.type === 'textarea' && (
                <textarea
                  rows={3}
                  value={activeProps[ctrl.name] || ''}
                  onChange={(e) => handlePropChange(ctrl.name, e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:ring-1 focus:ring-slate-900 outline-hidden resize-none"
                />
              )}

              {ctrl.type === 'number' && (
                <input
                  type="number"
                  value={activeProps[ctrl.name] ?? ''}
                  onChange={(e) => handlePropChange(ctrl.name, Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:ring-1 focus:ring-slate-900 outline-hidden"
                />
              )}

              {ctrl.type === 'checkbox' && (
                <div className="flex items-center gap-2 pt-0.5">
                  <input
                    type="checkbox"
                    checked={Boolean(activeProps[ctrl.name])}
                    onChange={(e) => handlePropChange(ctrl.name, e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-[11px] text-slate-600">Enabled</span>
                </div>
              )}

              {ctrl.type === 'select' && (
                <select
                  value={activeProps[ctrl.name] || ''}
                  onChange={(e) => handlePropChange(ctrl.name, e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs outline-hidden"
                >
                  {(ctrl.options || []).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}

        {controls.filter((c) => activeSection === 'responsive' || c.section === activeSection).length === 0 && (
          <div className="text-center py-6 text-slate-400 text-xs">
            No specific {activeSection} settings for this component.
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="p-3 border-t border-slate-100 flex items-center justify-between gap-2 bg-slate-50/50">
        <button
          type="button"
          onClick={() => onDuplicate(selectedNode.id)}
          className="flex-1 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
        >
          <Copy size={12} /> Duplicate
        </button>
        <button
          type="button"
          onClick={() => onDelete(selectedNode.id)}
          className="flex-1 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
        >
          <Trash2 size={12} /> Delete
        </button>
      </div>
    </div>
  );
};
