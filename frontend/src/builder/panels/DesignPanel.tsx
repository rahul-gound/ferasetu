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

export const THEME_PRESETS = [
  { id: 'electronic', name: 'Mono Electronic', desc: 'Hardware store with 3D tilt hero, spec compare matrix & quick view', color: '#E4572E' },
  { id: 'market', name: 'Market Retail', desc: 'Fast, vibrant dynamic commerce with badge highlights', color: '#2563eb' },
  { id: 'atelier', name: 'Atelier Luxury', desc: 'Refined editorial serif typography with serene neutrals', color: '#1e293b' },
  { id: 'mono', name: 'Mono Brutalist', desc: 'Architectural precision, high contrast, monospace vibes', color: '#09090b' },
  { id: 'bold', name: 'Bold Rounded', desc: 'Punchy lifestyle cards, playful pills, youthful energy', color: '#7c3aed' },
  { id: 'artisan', name: 'Artisan Craft', desc: 'Earthy warmth, handmade textures, authentic storytelling', color: '#b45309' },
  { id: 'studio', name: 'Studio Minimal', desc: 'Clean portfolio aesthetic, contemporary grid spacing', color: '#0f766e' },
  { id: 'home', name: 'Home & Living', desc: 'Gentle warm neutrals for interior design and decor', color: '#d97706' },
  { id: 'dine', name: 'Dine Culinary', desc: 'Rich appetizing tones for cafe, bakery, and restaurants', color: '#b91c1c' },
];

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
      {/* Sub-nav */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 px-3 py-2 gap-1 bg-slate-50 dark:bg-slate-950">
        <button
          onClick={() => setActiveSubTab('tokens')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeSubTab === 'tokens'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          Tokens & Theme
        </button>
        <button
          onClick={() => setActiveSubTab('blocks')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeSubTab === 'blocks'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          Page Blocks
        </button>
        <button
          onClick={() => setActiveSubTab('components')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeSubTab === 'components'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          Registry ({COMPONENT_CATALOG.length})
        </button>
        <button
          onClick={() => setActiveSubTab('icons')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeSubTab === 'icons'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          Icons (180+)
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* SUBTAB 1: DESIGN TOKENS & THEMES */}
        {activeSubTab === 'tokens' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                Theme Presets
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                {THEME_PRESETS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      onThemeSelect(t.id);
                      onColorChange(t.color);
                    }}
                    className={`text-left p-3 rounded-xl border text-xs transition-all relative ${
                      selectedTheme === t.id
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: t.color }} />
                      <span className="font-semibold">{t.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{t.desc}</p>
                    {selectedTheme === t.id && (
                      <CheckCircle className="w-4 h-4 text-blue-600 absolute top-2 right-2" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Design Tokens Controls */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-5 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Design Tokens
              </h3>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Brand Accent Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => onColorChange(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-700 p-0.5 bg-transparent"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => onColorChange(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Typography Preset
                </label>
                <select
                  value={fontFamily}
                  onChange={(e) => onFontChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
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
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Active Sections ({sections.length})
              </h3>
            </div>

            {/* List of current sections */}
            <div className="space-y-1.5">
              {sections.map((sec, idx) => (
                <div
                  key={sec.id}
                  onClick={() => onSelectNode(sec.id)}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                    selectedNodeId === sec.id
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 font-medium'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-mono text-[10px] w-4">{idx + 1}</span>
                    <span>{sec.label || sec.type}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveSection(sec.id);
                      }}
                      className="p-1 hover:text-red-500 text-slate-400 transition-colors"
                      title="Remove section"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                Add Discoverable Block
              </h4>
              <div className="space-y-2">
                {AVAILABLE_BLOCKS.map((blk) => (
                  <button
                    key={blk.type}
                    onClick={() => onAddSection(blk.type)}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 bg-white dark:bg-slate-900 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold group-hover:text-blue-600 transition-colors">
                          {blk.label}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {blk.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{blk.desc}</p>
                    </div>
                    <Plus className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 3: COMPONENT REGISTRY (Approach 400 entries) */}
        {activeSubTab === 'components' && (
          <div className="space-y-4">
            <div className="flex gap-1 overflow-x-auto pb-1 text-xs">
              {['all', 'primitives', 'form', 'commerce', 'page-blocks'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setComponentCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-md capitalize font-medium whitespace-nowrap ${
                    componentCategoryFilter === cat
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
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
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{comp.name}</span>
                      <span className="ml-2 text-[10px] font-mono text-slate-400">v{comp.version}</span>
                    </div>
                    <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {comp.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{comp.description}</p>

                  {/* Variants display */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-slate-400 font-medium">Variants:</span>
                    {comp.variants.map((v) => (
                      <span
                        key={v.id}
                        className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400"
                      >
                        {v.name}
                      </span>
                    ))}
                  </div>

                  {/* A11y Semantics */}
                  <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400">
                    <span>Role: <code className="text-blue-500">{comp.a11y.role}</code></span>
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
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search 180+ vector icons..."
                value={iconQuery}
                onChange={(e) => setIconQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
              />
            </div>

            <div className="flex gap-1 overflow-x-auto pb-1 text-xs">
              {['all', ...ICON_CATEGORIES].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedIconCategory(cat)}
                  className={`px-2 py-1 rounded-md text-[11px] capitalize whitespace-nowrap ${
                    selectedIconCategory === cat
                      ? 'bg-blue-600 text-white font-medium'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-2">
              {filteredIcons.slice(0, 80).map((icon) => (
                <button
                  key={icon.name}
                  onClick={() => {
                    // Copy icon name or insert
                    navigator.clipboard.writeText(icon.name);
                  }}
                  title={`${icon.name} (${icon.category}) — click to copy`}
                  className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-slate-700 dark:text-slate-300 transition-all text-center group"
                >
                  <span className="text-[10px] font-mono text-slate-500 group-hover:text-blue-600 truncate w-full">
                    {icon.name}
                  </span>
                </button>
              ))}
            </div>
            {filteredIcons.length > 80 && (
              <p className="text-[11px] text-slate-400 text-center">
                Showing top 80 matching icons. Refine search query for more.
              </p>
            )}
          </div>
        )}

        {/* COMPONENT INSPECTOR DOCK (Contextual when a node is selected) */}
        {selectedSection && (
          <div className="border-t-2 border-blue-500 dark:border-blue-600 pt-4 space-y-3 bg-blue-50/20 dark:bg-blue-950/10 p-3 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Selected Node Inspector
              </span>
              <button
                onClick={() => onSelectNode(null)}
                className="text-[11px] text-slate-400 hover:text-slate-600"
              >
                Deselect
              </button>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Section ID & Label
              </label>
              <input
                type="text"
                readOnly
                value={`${selectedSection.label || selectedSection.type} (${selectedSection.id})`}
                className="w-full px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono text-slate-500"
              />
            </div>

            {/* Workflow Action Binding */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Bind Interactive Workflow
              </label>
              <select
                value={selectedSection.props?.workflowId || ''}
                onChange={(e) => {
                  if (onBindWorkflowToNode) {
                    onBindWorkflowToNode(selectedSection.id, e.target.value);
                  }
                }}
                className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              >
                <option value="">None (Standard Render)</option>
                {workflows.map((wf) => (
                  <option key={wf.id} value={wf.id}>
                    ⚡ {wf.name}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                When triggered, this element executes the chosen declarative logic workflow.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
