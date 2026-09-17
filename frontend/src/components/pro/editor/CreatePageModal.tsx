// FeraSetu Pro Studio — Rich Page Creation Modal
// =============================================================================
// Supports 4 creation paths:
// 1. Create Blank Page (Visual Editor)
// 2. Create from Template (Studio, Launch, Creator, Commerce Pro)
// 3. Create with React (single-page JSX)
// 4. Create with HTML (single-page HTML)
// Enforces Pro plan page quotas (max_pages: 50) upfront.
// =============================================================================

import React, { useState } from 'react';
import { proStudioApi, type ProPage } from '../../../services/proStudioApi';
import { convertTemplatePageToDocument } from '../../../../../worker/pro/pageTemplateAdapter.js';
import { parseReactJsxToDocument, parseHtmlToDocument } from '../../../../../worker/pro/pageAstConverter.js';
import { createBlankPageDocument } from '../../../../../worker/pro/pageModel.js';
import { toast } from 'react-hot-toast';
import {
  FileText,
  Layers,
  Code2,
  FileCode,
  X,
  Plus,
  AlertCircle,
} from 'lucide-react';

interface CreatePageModalProps {
  currentPagesCount: number;
  maxPagesQuota: number;
  onClose: () => void;
  onPageCreated: (page: ProPage) => void;
}

export const CreatePageModal: React.FC<CreatePageModalProps> = ({
  currentPagesCount,
  maxPagesQuota,
  onClose,
  onPageCreated,
}) => {
  const [creationPath, setCreationPath] = useState<'blank' | 'template' | 'react' | 'html'>('blank');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [pageType, setPageType] = useState('standard');
  const [authRequired, setAuthRequired] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('studio');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [loading, setLoading] = useState(false);

  const isQuotaExceeded = currentPagesCount >= maxPagesQuota;

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slug || slug === title.toLowerCase().replace(/[^a-z0-9]+/g, '-')) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Page title is required');
      return;
    }

    if (isQuotaExceeded) {
      toast.error(`Page quota exceeded (${currentPagesCount}/${maxPagesQuota}). Please upgrade your Pro plan.`);
      return;
    }

    setLoading(true);
    try {
      let pageContent: any;

      if (creationPath === 'blank') {
        pageContent = createBlankPageDocument(title);
      } else if (creationPath === 'template') {
        pageContent = convertTemplatePageToDocument(selectedTemplate, 'home');
        pageContent.title = title;
      } else if (creationPath === 'react') {
        pageContent = parseReactJsxToDocument(codeSnippet || `export default function ${title.replace(/[^a-zA-Z0-9]/g, '')}() {\n  return (\n    <main className="p-8">\n      <h1 className="text-3xl font-bold">${title}</h1>\n    </main>\n  );\n}`, title);
      } else if (creationPath === 'html') {
        pageContent = parseHtmlToDocument(codeSnippet || `<section class="py-12 px-4 max-w-6xl mx-auto">\n  <h1>${title}</h1>\n</section>`, title);
      }

      const created = await proStudioApi.createPage({
        title: title.trim(),
        slug: slug.trim() || undefined,
        type: pageType,
        auth_required: authRequired ? 1 : 0,
        content: pageContent,
      });

      toast.success(`Created '${created.title}' successfully`);
      onPageCreated(created);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err.message || 'Failed to create page');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 text-left animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Create New Pro Page</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Available Pages: {currentPagesCount} / {maxPagesQuota}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X size={16} />
          </button>
        </div>

        {/* Quota Notice */}
        {isQuotaExceeded && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle size={16} className="shrink-0" />
            <span>Page limit reached ({maxPagesQuota} pages). Upgrade your subscription to create additional pages.</span>
          </div>
        )}

        {/* 4 Creation Paths Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { key: 'blank', label: 'Blank Canvas', icon: <FileText size={16} /> },
            { key: 'template', label: 'From Template', icon: <Layers size={16} /> },
            { key: 'react', label: 'From React JSX', icon: <Code2 size={16} /> },
            { key: 'html', label: 'From HTML', icon: <FileCode size={16} /> },
          ].map((mode) => (
            <button
              key={mode.key}
              type="button"
              onClick={() => setCreationPath(mode.key as any)}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all ${
                creationPath === mode.key
                  ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {mode.icon}
              <span className="text-xs font-semibold">{mode.label}</span>
            </button>
          ))}
        </div>

        {/* Common Form Fields */}
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Page Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="About Atelier"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:ring-1 focus:ring-slate-900 outline-hidden"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">URL Slug</label>
              <div className="flex items-center">
                <span className="px-2.5 py-2 bg-slate-100 border border-r-0 border-slate-200 text-slate-500 rounded-l-lg text-xs font-mono">/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="about-atelier"
                  className="w-full px-3 py-2 rounded-r-lg border border-slate-200 bg-slate-50 text-xs font-mono focus:ring-1 focus:ring-slate-900 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Creation Path Specific Options */}
          {creationPath === 'template' && (
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block mb-1">Choose Pro Template</label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs outline-hidden"
              >
                <option value="studio">Studio — Creative Design & Showcase</option>
                <option value="launch">Launch — Tech Hardware & Pre-order</option>
                <option value="creator">Creator — Digital Media & Vault</option>
                <option value="commerce_pro">Commerce Pro — Flagship D2C Store</option>
              </select>
            </div>
          )}

          {(creationPath === 'react' || creationPath === 'html') && (
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block mb-1">
                Paste Single-Page {creationPath === 'react' ? 'React JSX' : 'HTML'}
              </label>
              <textarea
                rows={4}
                value={codeSnippet}
                onChange={(e) => setCodeSnippet(e.target.value)}
                placeholder={creationPath === 'react' ? 'export default function Page() {\n  return <main><h1>Title</h1></main>;\n}' : '<section>\n  <h1>Title</h1>\n</section>'}
                className="w-full p-3 rounded-lg border border-slate-200 bg-slate-900 text-slate-100 font-mono text-xs outline-hidden resize-none"
              />
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="req_auth"
              checked={authRequired}
              onChange={(e) => setAuthRequired(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="req_auth" className="text-slate-700 font-medium">Require customer authentication to access</label>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || isQuotaExceeded}
            onClick={handleCreate}
            className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
          >
            <Plus size={14} /> {loading ? 'Creating...' : 'Create & Open Editor'}
          </button>
        </div>
      </div>
    </div>
  );
};
