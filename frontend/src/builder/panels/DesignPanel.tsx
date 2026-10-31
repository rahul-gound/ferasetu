import React, { useState } from 'react';
import {
  Palette,
  Layout,
  Layers,
  Sparkles,
  Search,
  Plus,
  Trash2,
  ChevronRight,
  Sliders,
  Type,
  MousePointer,
  Box,
  Image as ImageIcon,
  CheckCircle,
} from 'lucide-react';
import { COMPONENT_CATALOG } from '../registry/componentRegistry';
import { SEARCHABLE_ICONS, ICON_CATEGORIES } from '../registry/iconsCatalog';
import type { ComponentDefinition, WorkflowDefinition } from '../types/builderTypes';

interface DesignPanelProps {
  selectedTheme: string;
  onThemeSelect: (themeId: string) => void;
  primaryColor: string;
  onColorChange: (color: string) => void;
  fontFamily: string;
  onFontChange: (font: string) => void;
  sections: Array<{ id: string; type: string; label?: string; props?: Record<string, any> }>;
  onAddSection: (type: string) => void;
  onRemoveSection: (id: string) => void;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  workflows: WorkflowDefinition[];
  onBindWorkflowToNode?: (nodeId: string, workflowId: string) => void;
}

import { THEME_PRESETS } from '../../storefront/theme/themeDefinitions';
export { THEME_PRESETS };

export const AVAILABLE_BLOCKS = [
  { type: 'hero', label: 'Hero Showcase', category: 'Page Block', desc: 'Prominent headline, imagery, and primary CTA' },
  { type: 'product-grid', label: 'Product Catalog Grid', category: 'Commerce', desc: 'Responsive product cards with price, badges, and quick add' },
  { type: 'category-grid', label: 'Category Explorer', category: 'Commerce', desc: 'Visual collection pills and navigation cards' },
  { type: 'trust-strip', label: 'Trust & Guarantees', category: 'Page Block', desc: 'Free shipping, secure payments, and returns badges' },
  { type: 'testimonials', label: 'Customer Reviews', category: 'Social Proof', desc: 'Verified customer ratings and testimonial carousel' },
  { type: 'faq', label: 'FAQ Accordion', category: 'Content', desc: 'Expandable answers to common customer questions' },
  { type: 'newsletter', label: 'Newsletter Signup', category: 'Lead Gen', desc: 'Email collection form with subscription CTA' },
  { type: 'footer', label: 'Storefront Footer', category: 'Page Block', desc: 'Links, payment icons, copyright, and social links' },
];

export default function DesignPanel({
  selectedTheme,
  onThemeSelect,
  primaryColor,
  onColorChange,
  fontFamily,
  onFontChange,
  sections,
  onAddSection,
  onRemoveSection,
  selectedNodeId,
  onSelectNode,
  workflows,
  onBindWorkflowToNode,
}: DesignPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<'tokens' | 'blocks' | 'components' | 'icons'>('tokens');
  const [iconQuery, setIconQuery] = useState('');
  const [selectedIconCategory, setSelectedIconCategory] = useState<string>('all');
  const [componentCategoryFilter, setComponentCategoryFilter] = useState<string>('all');

  // Filter components
  const filteredComponents = COMPONENT_CATALOG.filter((c) =>
    componentCategoryFilter === 'all' ? true : c.category === componentCategoryFilter
  );

  // Filter icons
  const filteredIcons = SEARCHABLE_ICONS.filter((icon) => {
    const matchesCat = selectedIconCategory === 'all' || icon.category === selectedIconCategory;
    const matchesQuery =
      !iconQuery ||
      icon.name.toLowerCase().includes(iconQuery.toLowerCase()) ||
      (icon.tags || []).some((k) => k.toLowerCase().includes(iconQuery.toLowerCase()));
    return matchesCat && matchesQuery;
  });

  const selectedSection = sections.find((s) => s.id === selectedNodeId);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 select-none">
      {/* Sub-nav: Horizontally scrollable pill tabs with generous touch targets */}
      <div className="flex items-center overflow-x-auto no-scrollbar border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 py-2.5 gap-2 bg-slate-50/80 dark:bg-slate-950 flex-shrink-0">
        <button
          type="button"
          onClick={() => setActiveSubTab('tokens')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeSubTab === 'tokens'
              ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 dark:hover:bg-slate-800'
          }`}
        >
          <Palette size={14} />
          <span>Themes & Tokens</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('blocks')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeSubTab === 'blocks'
              ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 dark:hover:bg-slate-800'
          }`}
        >
          <Layout size={14} />
          <span>Page Blocks</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('components')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeSubTab === 'components'
              ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 dark:hover:bg-slate-800'
          }`}
        >
          <Box size={14} />
          <span>Registry ({COMPONENT_CATALOG.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('icons')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeSubTab === 'icons'
              ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles size={14} />
          <span>Icons (180+)</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
        {/* SUBTAB 1: DESIGN TOKENS & THEMES */}
        {activeSubTab === 'tokens' && (
          <div className="space-y-6 sm:space-y-7">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Curated Store Themes
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select a high-converting storefront theme for your business.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {THEME_PRESETS.map((t) => {
                  const isSelected = selectedTheme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onThemeSelect(t.id)}
                      className={`text-left p-4 rounded-2xl border transition-all duration-200 relative flex flex-col justify-between group ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/20 shadow-xs'
                          : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-5 h-5 rounded-full shadow-xs ring-2 ring-white dark:ring-slate-800 shrink-0"
                            style={{ backgroundColor: t.color }}
                          />
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {t.name}
                          </span>
                        </div>
                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 dark:text-blue-400 bg-blue-100/80 dark:bg-blue-900/60 px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Active
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            Select
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {t.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Design Tokens Controls */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-6 space-y-5">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Brand Color & Atmosphere
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Applied seamlessly across buttons, badges, prices, and navigation.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2 block">
                  Primary Accent Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => onColorChange(e.target.value)}
                    className="w-12 h-12 rounded-xl cursor-pointer border-2 border-slate-200 dark:border-slate-700 p-1 bg-white dark:bg-slate-800 shadow-xs"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => onColorChange(e.target.value)}
                    className="flex-1 h-12 px-3.5 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 uppercase text-slate-800 dark:text-slate-200"
                  />
                </div>

                {/* Quick Palette Suggestions */}
                <div className="flex items-center gap-2 flex-wrap mt-3">
                  <span className="text-[11px] text-slate-500 font-medium">Popular Retail Palettes:</span>
                  {[
                    { label: 'Royal Blue', hex: '#2563EB' },
                    { label: 'Forest Green', hex: '#059669' },
                    { label: 'Warm Saffron', hex: '#D97706' },
                    { label: 'Ruby Red', hex: '#E11D48' },
                    { label: 'Deep Indigo', hex: '#4F46E5' },
                    { label: 'Obsidian', hex: '#0F172A' },
                  ].map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => onColorChange(preset.hex)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-400 transition-colors shadow-2xs"
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: preset.hex }} />
                      <span className="font-medium text-slate-700 dark:text-slate-300">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2 block">
                  Typography Style
                </label>
                <select
                  value={fontFamily}
                  onChange={(e) => onFontChange(e.target.value)}
                  className="w-full h-12 px-3.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium shadow-xs focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="Inter, sans-serif">Modern Sans (Inter / Clean Retail)</option>
                  <option value="'Playfair Display', serif">Editorial Serif (Luxury Atelier)</option>
                  <option value="'JetBrains Mono', monospace">Technical Mono (Brutalist Minimal)</option>
                  <option value="'Plus Jakarta Sans', sans-serif">Geometric Sans (Bold Youth)</option>
                  <option value="'Merriweather', serif">Literary Warm Serif (Artisan Craft)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 2: PAGE BLOCKS */}
        {activeSubTab === 'blocks' && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Active Sections ({sections.length})
                </h3>
                <span className="text-[11px] text-slate-400">
                  Tap any section to configure
                </span>
              </div>

              {/* List of current sections */}
              <div className="space-y-2">
                {sections.map((sec, idx) => (
                  <div
                    key={sec.id}
                    onClick={() => onSelectNode(sec.id)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      selectedNodeId === sec.id
                        ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 font-semibold ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-slate-800 dark:text-slate-200">{sec.label || sec.type}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveSection(sec.id);
                        }}
                        className="p-1.5 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg text-slate-400 transition-colors"
                        title="Remove section"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                Add Pre-designed Block
              </h4>
              <div className="space-y-2.5">
                {AVAILABLE_BLOCKS.map((blk) => (
                  <button
                    key={blk.type}
                    type="button"
                    onClick={() => onAddSection(blk.type)}
                    className="w-full text-left p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 bg-white dark:bg-slate-900 transition-all flex items-center justify-between group shadow-2xs hover:shadow-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                          {blk.label}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {blk.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{blk.desc}</p>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-50 dark:group-hover:bg-blue-950 transition-colors ml-2">
                      <Plus className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 3: COMPONENT REGISTRY (Approach 400 entries) */}
        {activeSubTab === 'components' && (
          <div className="space-y-4">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
              {['all', 'primitives', 'form', 'commerce', 'page-blocks'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setComponentCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl capitalize font-semibold whitespace-nowrap transition-all ${
                    componentCategoryFilter === cat
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {filteredComponents.map((comp) => (
                <div
                  key={comp.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{comp.name}</span>
                      <span className="ml-2 text-[10px] font-mono text-slate-400">v{comp.version}</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {comp.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{comp.description}</p>

                  {/* Variants display */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[11px] text-slate-400 font-medium">Variants:</span>
                    {comp.variants.map((v) => (
                      <span
                        key={v.id}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400"
                      >
                        {v.name}
                      </span>
                    ))}
                  </div>

                  {/* A11y Semantics */}
                  <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
                    <span>Role: <code className="text-blue-500 font-bold">{comp.a11y.role}</code></span>
                    <span>Focusable: {comp.a11y.keyboardFocusable ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBTAB 4: VECTOR ICONS CATALOG */}
        {activeSubTab === 'icons' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                placeholder="Search 180+ curated vector icons..."
                value={iconQuery}
                onChange={(e) => setIconQuery(e.target.value)}
                className="w-full h-11 pl-9 pr-3.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
              {['all', ...ICON_CATEGORIES].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedIconCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs capitalize whitespace-nowrap font-medium transition-all ${
                    selectedIconCategory === cat
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-2.5">
              {filteredIcons.slice(0, 80).map((icon) => (
                <button
                  key={icon.name}
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(icon.name);
                  }}
                  title={`${icon.name} (${icon.category}) — tap to copy`}
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-slate-700 dark:text-slate-300 transition-all text-center group active:scale-95 shadow-2xs"
                >
                  <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 group-hover:text-blue-600 truncate w-full">
                    {icon.name}
                  </span>
                </button>
              ))}
            </div>
            {filteredIcons.length > 80 && (
              <p className="text-xs text-slate-400 text-center py-1">
                Showing top 80 matching icons. Refine search query for more.
              </p>
            )}
          </div>
        )}

        {/* COMPONENT INSPECTOR DOCK (Contextual when a node is selected) */}
        {selectedSection && (
          <div className="border-t-2 border-blue-500 dark:border-blue-600 pt-5 space-y-4 bg-blue-50/30 dark:bg-blue-950/20 p-4 sm:p-5 rounded-2xl mt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                Selected Section Inspector
              </span>
              <button
                type="button"
                onClick={() => onSelectNode(null)}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline font-medium"
              >
                Deselect
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Section ID & Label
              </label>
              <input
                type="text"
                readOnly
                value={`${selectedSection.label || selectedSection.type} (${selectedSection.id})`}
                className="w-full h-11 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono text-slate-600 dark:text-slate-400 shadow-2xs"
              />
            </div>

            {/* Workflow Action Binding */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Bind Interactive Workflow
              </label>
              <select
                value={selectedSection.props?.workflowId || ''}
                onChange={(e) => {
                  if (onBindWorkflowToNode) {
                    onBindWorkflowToNode(selectedSection.id, e.target.value);
                  }
                }}
                className="w-full h-11 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium text-slate-900 dark:text-slate-100 shadow-2xs"
              >
                <option value="">None (Standard Render)</option>
                {workflows.map((wf) => (
                  <option key={wf.id} value={wf.id}>
                    ⚡ {wf.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                When interacted with, this element executes the chosen declarative logic workflow.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
