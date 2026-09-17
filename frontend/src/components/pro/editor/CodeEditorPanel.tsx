// FeraSetu Pro Studio — Single-Page Code Mode & Synchronization Panel
// =============================================================================
// Supports React JSX/TSX and HTML for a single Pro Studio page.
// Enforces lossless classification: VISUAL_NATIVE, HYBRID, and CODE_NATIVE.
// Rule: NEVER silently destroy code or behavior during Code <-> Visual conversion.
// =============================================================================

import React, { useState, useEffect } from 'react';
import type { PageDocument, PageState } from './pageEditorTypes';
import { classifyPageSource, parseReactJsxToDocument, parseHtmlToDocument, documentToReactJsx, documentToHtml } from '../../../../../worker/pro/pageAstConverter.js';
import {
  Code2,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  ShieldCheck,
  FileCode,
} from 'lucide-react';

interface CodeEditorPanelProps {
  document: PageDocument;
  onUpdateDocument: (newDoc: PageDocument) => void;
}

export const CodeEditorPanel: React.FC<CodeEditorPanelProps> = ({
  document,
  onUpdateDocument,
}) => {
  const [codeLanguage, setCodeLanguage] = useState<'jsx' | 'html'>('jsx');
  const [codeText, setCodeText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [syncWarning, setSyncWarning] = useState<string | null>(null);

  // Initialize code representation from document
  useEffect(() => {
    if (document.state === 'CODE_NATIVE' && document.sourceCode) {
      setCodeText(document.sourceCode);
    } else {
      const generated = codeLanguage === 'jsx' ? documentToReactJsx(document) : documentToHtml(document);
      setCodeText(generated);
    }
  }, [document.nodes, document.state, codeLanguage]);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSyncToVisual = () => {
    setSyncWarning(null);

    const classification = classifyPageSource(codeText, codeLanguage);

    if (classification.state === 'CODE_NATIVE') {
      // Preserve code exactly and mark CODE_NATIVE
      const newDoc: PageDocument = {
        ...document,
        state: 'CODE_NATIVE',
        sourceCode: codeText,
      };
      onUpdateDocument(newDoc);
      setSyncWarning('Some code cannot be represented as editable Pro Studio components. The original code is preserved and remains authoritative.');
      return;
    }

    try {
      const parsedDoc = codeLanguage === 'html'
        ? parseHtmlToDocument(codeText, document.title)
        : parseReactJsxToDocument(codeText, document.title);

      onUpdateDocument({
        ...document,
        state: parsedDoc.state as PageState,
        nodes: parsedDoc.nodes,
        sourceCode: codeText,
        customCss: parsedDoc.customCss || document.customCss,
      });

      if (parsedDoc.state === 'HYBRID') {
        setSyncWarning('Page contains custom expressions or structures preserved as custom code blocks.');
      }
    } catch (err: any) {
      setSyncWarning(`Failed to parse code: ${err.message}. Original code preserved in Code Mode.`);
    }
  };

  return (
    <div className="flex-1 h-full bg-slate-950 flex flex-col text-left overflow-hidden select-none">
      {/* Code Mode Toolbar */}
      <div className="h-12 border-b border-slate-800 bg-slate-900 px-4 flex items-center justify-between text-xs text-slate-300 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 font-semibold text-white">
            <Code2 size={15} className="text-indigo-400" />
            <span>Single-Page Code Editor</span>
          </div>

          <div className="flex bg-slate-800 p-0.5 rounded-lg text-[11px]">
            <button
              type="button"
              onClick={() => setCodeLanguage('jsx')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                codeLanguage === 'jsx' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              React JSX
            </button>
            <button
              type="button"
              onClick={() => setCodeLanguage('html')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                codeLanguage === 'html' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              HTML
            </button>
          </div>

          {/* State Badge */}
          {document.state === 'VISUAL_NATIVE' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
              <ShieldCheck size={11} /> VISUAL_NATIVE (Lossless)
            </span>
          )}
          {document.state === 'HYBRID' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950 text-amber-300 border border-amber-800">
              <AlertTriangle size={11} /> HYBRID (Preserved Code Blocks)
            </span>
          )}
          {document.state === 'CODE_NATIVE' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
              <FileCode size={11} /> CODE_NATIVE (Authoritative)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-[11px]"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy Code'}</span>
          </button>

          <button
            type="button"
            onClick={handleSyncToVisual}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors text-[11px] shadow-xs"
          >
            <RefreshCw size={12} /> Sync to Visual Canvas
          </button>
        </div>
      </div>

      {/* Synchronize Warning / Notice Banner */}
      {syncWarning && (
        <div className="px-4 py-2.5 bg-amber-950/80 border-b border-amber-800/80 flex items-start gap-2.5 text-xs text-amber-200">
          <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong>Code Synchronization Notice:</strong> {syncWarning}
          </div>
        </div>
      )}

      {/* Code Textarea Area */}
      <div className="flex-1 p-4 overflow-hidden flex flex-col">
        <textarea
          value={codeText}
          onChange={(e) => setCodeText(e.target.value)}
          spellCheck={false}
          className="flex-1 w-full p-4 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 font-mono text-xs leading-relaxed outline-hidden resize-none overflow-y-auto selection:bg-indigo-600 selection:text-white"
        />
        <div className="pt-2 flex justify-between text-[11px] text-slate-500 font-mono">
          <span>Single-page scope ({codeLanguage.toUpperCase()})</span>
          <span>{codeText.split('\n').length} lines</span>
        </div>
      </div>
    </div>
  );
};
