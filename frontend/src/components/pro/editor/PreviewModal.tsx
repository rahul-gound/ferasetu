// FeraSetu Pro Studio — Live Responsive Preview Modal
// =============================================================================
// Standalone responsive preview (Desktop, Tablet, Mobile).
// Enforces Custom Code Preview Security via an isolated sandbox boundary.
// Zero access to parent application tokens, secrets, or privileged APIs.
// =============================================================================

import React, { useState } from 'react';
import type { PageDocument, ViewportBreakpoint } from './pageEditorTypes';
import { ComponentRenderer } from './ComponentRenderer';
import { documentToHtml } from '../../../../../worker/pro/pageAstConverter.js';
import {
  Monitor,
  Tablet,
  Smartphone,
  X,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

interface PreviewModalProps {
  document: PageDocument;
  onClose: () => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  document,
  onClose,
}) => {
  const [viewport, setViewport] = useState<ViewportBreakpoint>('desktop');

  const viewportWidths: Record<ViewportBreakpoint, string> = {
    desktop: 'w-full max-w-6xl',
    tablet: 'w-[768px]',
    mobile: 'w-[375px]',
  };

  const isCustomCodeOrCodeNative =
    document.state === 'CODE_NATIVE' ||
    (document.nodes || []).some((n) => n.type === 'custom_code');

  const generatedHtml = documentToHtml(document);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-between p-4 sm:p-6 select-none animate-in fade-in duration-150">
      {/* Top Preview Control Bar */}
      <div className="w-full max-w-6xl bg-white rounded-2xl border border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-xl mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-bold text-xs text-slate-900">{document.title} (Live Preview)</span>
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium border border-emerald-200">
            <ShieldCheck size={12} /> Sandbox Isolated
          </span>
        </div>

        {/* Viewport Toggles */}
        <div className="flex bg-slate-100 p-0.5 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setViewport('desktop')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              viewport === 'desktop' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Monitor size={14} /> Desktop
          </button>
          <button
            type="button"
            onClick={() => setViewport('tablet')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              viewport === 'tablet' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Tablet size={14} /> Tablet
          </button>
          <button
            type="button"
            onClick={() => setViewport('mobile')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              viewport === 'mobile' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone size={14} /> Mobile
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="Close Preview"
        >
          <X size={18} />
        </button>
      </div>

      {/* Center Device Frame */}
      <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
        <div
          className={`${viewportWidths[viewport]} h-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-y-auto flex flex-col transition-all duration-300`}
        >
          {isCustomCodeOrCodeNative ? (
            /* ISOLATED IFRAME SANDBOX (Correction 10) */
            <iframe
              sandbox="allow-scripts"
              srcDoc={generatedHtml}
              title="Secure Page Preview"
              className="w-full flex-1 border-0"
            />
          ) : (
            /* VISUAL NATIVE RENDERER */
            <div className="p-4 sm:p-6 space-y-6">
              {document.nodes.map((node) => (
                <ComponentRenderer
                  key={node.id}
                  node={node}
                  isEditorMode={false}
                  viewportBreakpoint={viewport}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
