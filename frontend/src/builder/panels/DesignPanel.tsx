import React, { useState } from 'react';
import {
  Palette,
  Layout,
  Layers,
  Sparkles,
  Search,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Copy,
  GripVertical,
  Sliders,
  Type,
  MousePointer,
  Box,
  Image as ImageIcon,
  CheckCircle,
  Minus,
  MessageCircle,
  ShoppingBag,
  User,
  Package,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { COMPONENT_CATALOG } from '../registry/componentRegistry';
import { SEARCHABLE_ICONS, ICON_CATEGORIES } from '../registry/iconsCatalog';
import type { WorkflowDefinition } from '../types/builderTypes';

export interface DesignPanelProps {
  selectedTheme: string;
  onThemeSelect: (themeId: string) => void;
  primaryColor: string;
  onColorChange: (color: string) => void;
  fontFamily: string;
  onFontChange: (font: string) => void;
  sections: Array<{ id: string; type: string; label?: string; config?: Record<string, any>; props?: Record<string, any> }>;
  onAddSection: (type: string) => void;
  onRemoveSection: (id: string) => void;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  workflows: WorkflowDefinition[];
  onBindWorkflowToNode?: (nodeId: string, workflowId: string) => void;
  onReorderSections?: (newSections: any[]) => void;
  onUpdateSectionConfig?: (id: string, newConfig: Record<string, any>) => void;
  onDuplicateSection?: (id: string) => void;
}

import { THEME_PRESETS } from '../../storefront/theme/themeDefinitions';
export { THEME_PRESETS };

export const AVAILABLE_BLOCKS = [
  { type: 'hero', label: 'Hero Showcase', category: 'Page Block', desc: 'Prominent headline, imagery, and primary CTA' },
  { type: 'image-banner', label: 'Image Section / Banner', category: 'Media & Story', desc: 'Promo image or photo banner with custom click action' },
  { type: 'divider', label: 'Straight Line / Divider', category: 'Visual Separator', desc: 'Clean straight line with customizable style, thickness & color' },
  { type: 'product-grid', label: 'Product Catalog Grid', category: 'Commerce', desc: 'Responsive product cards with price, badges, and quick add' },
  { type: 'category-grid', label: 'Category Explorer', category: 'Commerce', desc: 'Visual collection pills and navigation cards' },
  { type: 'trust-strip', label: 'Trust & Guarantees', category: 'Page Block', desc: 'Free shipping, secure payments, and returns badges' },
  { type: 'testimonials', label: 'Customer Reviews', category: 'Social Proof', desc: 'Verified customer ratings and testimonial carousel' },
  { type: 'faq', label: 'FAQ Accordion', category: 'Content', desc: 'Expandable answers to common customer questions' },
  { type: 'newsletter', label: 'Newsletter Signup', category: 'Lead Gen', desc: 'Email collection form with subscription CTA' },
  { type: 'footer', label: 'Storefront Footer', category: 'Page Block', desc: 'Links, payment icons, copyright, and social links' },
];

const CURATED_IMAGE_PRESETS = [
  { label: '🍏 Groceries & Fresh Produce', url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1600&q=80' },
  { label: '👗 Boutique & Fashion', url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=80' },
  { label: '📱 Electronics & Tech', url: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=1600&q=80' },
  { label: '☕ Cafe, Chai & Bakery', url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1600&q=80' },
  { label: '🏺 Handcrafted Pottery', url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=1600&q=80' },
  { label: '🌿 Organic Honey & Ayurvedic', url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=1600&q=80' },
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
  onReorderSections,
  onUpdateSectionConfig,
  onDuplicateSection,
}: DesignPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<'blocks' | 'tokens' | 'components' | 'icons'>('blocks');
  const [iconQuery, setIconQuery] = useState('');
  const [selectedIconCategory, setSelectedIconCategory] = useState<string>('all');
  const [componentCategoryFilter, setComponentCategoryFilter] = useState<string>('all');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

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
  const selectedConfig = (selectedSection?.config || {}) as Record<string, any>;

  // Section Reordering Helpers
  const handleMoveUp = (index: number) => {
    if (index <= 0 || !onReorderSections) return;
    const newSections = [...sections];
    const [moved] = newSections.splice(index, 1);
    newSections.splice(index - 1, 0, moved);
    onReorderSections(newSections);
  };

  const handleMoveDown = (index: number) => {
    if (index >= sections.length - 1 || !onReorderSections) return;
    const newSections = [...sections];
    const [moved] = newSections.splice(index, 1);
    newSections.splice(index + 1, 0, moved);
    onReorderSections(newSections);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex || !onReorderSections) return;
    const newSections = [...sections];
    const [moved] = newSections.splice(draggedIndex, 1);
    newSections.splice(targetIndex, 0, moved);
    setDraggedIndex(null);
    onReorderSections(newSections);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 select-none">
      {/* Sub-nav: Horizontally scrollable pill tabs with generous touch targets */}
      <div className="flex items-center overflow-x-auto no-scrollbar border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 py-2.5 gap-2 bg-slate-50/80 dark:bg-slate-950 flex-shrink-0">
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
          <span>Page Blocks ({sections.length})</span>
        </button>
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
          onClick={() => setActiveSubTab('components')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeSubTab === 'components'
              ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 dark:hover:bg-slate-800'
          }`}
        >
          <Box size={14} />
          <span>Registry</span>
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
          <span>Icons</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
        {/* SUBTAB 1: PAGE BLOCKS & REORDERING */}
        {activeSubTab === 'blocks' && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Storefront Structure ({sections.length})
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Drag handles or tap arrows to reorder. Tap to customize.
                  </p>
                </div>
              </div>

              {/* Drag-and-drop & Reorderable List */}
              <div className="space-y-2">
                {sections.map((sec, idx) => {
                  const isSelected = selectedNodeId === sec.id;
                  const isDivider = sec.type === 'divider' || sec.type === 'separator';
                  const isImage = sec.type === 'image-banner' || sec.type === 'image-section';

                  return (
                    <div
                      key={sec.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, idx)}
                      onClick={() => onSelectNode(sec.id)}
                      className={`flex items-center justify-between p-3 rounded-2xl border text-xs cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 font-semibold ring-2 ring-blue-500/20 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Drag Handle */}
                        <div
                          className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 p-0.5"
                          title="Drag to reorder"
                        >
                          <GripVertical size={15} />
                        </div>

                        {/* Order Index */}
                        <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>

                        {/* Section Name & Badge */}
                        <div className="min-w-0 flex items-center gap-1.5">
                          {isDivider ? (
                            <span className="text-slate-500 flex items-center gap-1 text-xs">
                              <Minus size={14} className="text-blue-500" /> Straight Line
                            </span>
                          ) : isImage ? (
                            <span className="text-slate-800 dark:text-slate-200 flex items-center gap-1 text-xs font-medium">
                              <ImageIcon size={14} className="text-emerald-500" /> Image Banner
                            </span>
                          ) : (
                            <span className="text-slate-800 dark:text-slate-200 truncate capitalize">
                              {sec.label || sec.type.replace(/-/g, ' ')}
                            </span>
                          )}
                          {sec.config?.clickAction && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                              ⚡ {sec.config.clickAction}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons: Move Up, Move Down, Duplicate, Remove */}
                      <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveUp(idx)}
                          className="p-1.5 hover:text-blue-600 hover:bg-blue-50 rounded-lg text-slate-400 disabled:opacity-30 transition-colors"
                          title="Move up"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={idx === sections.length - 1}
                          onClick={() => handleMoveDown(idx)}
                          className="p-1.5 hover:text-blue-600 hover:bg-blue-50 rounded-lg text-slate-400 disabled:opacity-30 transition-colors"
                          title="Move down"
                        >
                          <ChevronDown size={14} />
                        </button>
                        {onDuplicateSection && (
                          <button
                            type="button"
                            onClick={() => onDuplicateSection(sec.id)}
                            className="p-1.5 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                            title="Duplicate section"
                          >
                            <Copy size={13} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onRemoveSection(sec.id)}
                          className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded-lg text-slate-400 transition-colors"
                          title="Remove section"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Add Visual Blocks */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
                + Add Pre-designed Block
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {AVAILABLE_BLOCKS.map((blk) => (
                  <button
                    key={blk.type}
                    type="button"
                    onClick={() => onAddSection(blk.type)}
                    className="text-left p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 bg-white dark:bg-slate-900 transition-all flex flex-col justify-between group shadow-2xs hover:shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                        {blk.label}
                      </span>
                      <Plus size={14} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">{blk.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* CONTEXTUAL SECTION INSPECTOR (Edit Logic, Colors, Images & Dividers) */}
            {selectedSection && (
              <div className="border-2 border-blue-500 bg-blue-50/20 p-4 sm:p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-blue-200 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                      Configure: {selectedSection.label || selectedSection.type.replace(/-/g, ' ')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectNode(null)}
                    className="text-xs text-blue-600 hover:underline font-bold"
                  >
                    Done
                  </button>
                </div>

                {/* 1. STRAIGHT LINE / DIVIDER SETTINGS */}
                {(selectedSection.type === 'divider' || selectedSection.type === 'separator') && onUpdateSectionConfig && (
                  <div className="space-y-3.5">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Straight Line Properties</h5>

                    {/* Style (Solid, Dashed, Dotted, Double) */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Line Style</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {['solid', 'dashed', 'dotted', 'double'].map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => onUpdateSectionConfig(selectedSection.id, { style: st })}
                            className={`py-1.5 text-xs capitalize rounded-lg border font-medium transition-all ${
                              (selectedConfig.style || 'solid') === st
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Thickness */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Thickness</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[1, 2, 4, 6].map((th) => (
                          <button
                            key={th}
                            type="button"
                            onClick={() => onUpdateSectionConfig(selectedSection.id, { thickness: th })}
                            className={`py-1.5 text-xs rounded-lg border font-medium transition-all ${
                              Number(selectedConfig.thickness || 1) === th
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {th}px
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Width */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Width</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {['100%', '80%', '60%', '40%'].map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => onUpdateSectionConfig(selectedSection.id, { width: w })}
                            className={`py-1.5 text-xs rounded-lg border font-medium transition-all ${
                              (selectedConfig.width || '100%') === w
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {w}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Optional Center Badge Text */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Optional Center Label</label>
                      <input
                        type="text"
                        value={selectedConfig.label || ''}
                        onChange={(e) => onUpdateSectionConfig(selectedSection.id, { label: e.target.value })}
                        placeholder="e.g. ✦ OUR PROMISE ✦ (Leave empty for pure line)"
                        className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-900"
                      />
                    </div>
                  </div>
                )}

                {/* 2. IMAGE SECTION / BANNER SETTINGS */}
                {(selectedSection.type === 'image-banner' || selectedSection.type === 'image-section') && onUpdateSectionConfig && (
                  <div className="space-y-3.5">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Image & Visual Content</h5>

                    {/* Image URL Input */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Image URL</label>
                      <input
                        type="text"
                        value={selectedConfig.imageUrl || ''}
                        onChange={(e) => onUpdateSectionConfig(selectedSection.id, { imageUrl: e.target.value })}
                        placeholder="Paste image link https://..."
                        className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-900"
                      />
                    </div>

                    {/* Curated Presets */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">Pick Curated Retail Image</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {CURATED_IMAGE_PRESETS.map((preset) => (
                          <button
                            key={preset.url}
                            type="button"
                            onClick={() => onUpdateSectionConfig(selectedSection.id, { imageUrl: preset.url })}
                            className="p-2 text-left rounded-xl border border-slate-200 bg-white hover:border-blue-400 text-[11px] font-medium text-slate-700 hover:text-blue-600 truncate transition-colors"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Overlay Text */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Headline Text</label>
                      <input
                        type="text"
                        value={selectedConfig.headline || ''}
                        onChange={(e) => onUpdateSectionConfig(selectedSection.id, { headline: e.target.value })}
                        placeholder="e.g. Special Festive Collection"
                        className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Subtitle</label>
                      <input
                        type="text"
                        value={selectedConfig.subheadline || ''}
                        onChange={(e) => onUpdateSectionConfig(selectedSection.id, { subheadline: e.target.value })}
                        placeholder="e.g. 100% Genuine, direct doorstep delivery"
                        className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-900"
                      />
                    </div>
                  </div>
                )}

                {/* 3. UNIVERSAL INTERACTIVE LOGIC & CLICK ACTION */}
                {onUpdateSectionConfig && (
                  <div className="border-t border-blue-200 pt-3.5 space-y-3">
                    <div className="flex items-center gap-1.5">
                      <Zap size={14} className="text-blue-600" />
                      <h5 className="text-xs font-bold text-slate-800">Add Click Logic & Action</h5>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Choose what happens when customers click the primary button or banner on this component.
                    </p>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Button / CTA Label</label>
                      <input
                        type="text"
                        value={selectedConfig.ctaText || ''}
                        onChange={(e) => onUpdateSectionConfig(selectedSection.id, { ctaText: e.target.value })}
                        placeholder="e.g. Order on WhatsApp, Explore Catalog, Sign In..."
                        className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">Action Logic</label>
                      <div className="space-y-1.5">
                        {[
                          { id: 'whatsapp', label: '💬 Open Direct WhatsApp Chat', desc: 'Opens WhatsApp with a pre-filled order inquiry' },
                          { id: 'cart', label: '🛍️ Open Shopping Cart Drawer', desc: 'Instantly opens the checkout bag' },
                          { id: 'signup', label: '👤 Open Customer Sign In / Account', desc: 'Allows customer to register or log into their store account' },
                          { id: 'track', label: '📦 Open Track Order Modal', desc: 'Allows customer to track their delivery' },
                          { id: 'scroll', label: '📍 Scroll Smoothly to Products', desc: 'Jumps straight down to the catalog grid' },
                          { id: 'link', label: '🔗 Custom External Link', desc: 'Navigates to external URL or social link' },
                        ].map((act) => {
                          const isAct = (selectedConfig.clickAction || 'scroll') === act.id;
                          return (
                            <button
                              key={act.id}
                              type="button"
                              onClick={() => onUpdateSectionConfig(selectedSection.id, { clickAction: act.id })}
                              className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-start justify-between ${
                                isAct
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                              }`}
                            >
                              <div>
                                <span className="font-bold block">{act.label}</span>
                                <span className={`text-[10px] ${isAct ? 'text-blue-100' : 'text-slate-500'}`}>{act.desc}</span>
                              </div>
                              {isAct && <CheckCircle size={14} className="shrink-0 mt-0.5" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bind Declarative Workflow */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Or Bind Declarative Automation Workflow
                      </label>
                      <select
                        value={selectedSection.props?.workflowId || selectedConfig.workflowId || ''}
                        onChange={(e) => {
                          if (onBindWorkflowToNode) {
                            onBindWorkflowToNode(selectedSection.id, e.target.value);
                          }
                          onUpdateSectionConfig(selectedSection.id, { workflowId: e.target.value });
                        }}
                        className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-900"
                      >
                        <option value="">None (Standard Action)</option>
                        {workflows.map((wf) => (
                          <option key={wf.id} value={wf.id}>
                            ⚡ {wf.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SUBTAB 2: DESIGN TOKENS & THEMES */}
        {activeSubTab === 'tokens' && (
          <div className="space-y-6">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {THEME_PRESETS.map((t) => {
                  const isSelected = selectedTheme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onThemeSelect(t.id)}
                      className={`text-left p-3.5 rounded-2xl border transition-all relative flex flex-col justify-between group ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/20 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-4 h-4 rounded-full shadow-xs shrink-0"
                            style={{ backgroundColor: t.color }}
                          />
                          <span className="font-bold text-xs text-slate-900">
                            {t.name}
                          </span>
                        </div>
                        {isSelected && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {t.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Design Tokens Controls */}
            <div className="border-t border-slate-200 pt-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Primary Brand Color
              </h3>

              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => onColorChange(e.target.value)}
                  className="w-12 h-12 rounded-xl cursor-pointer border-2 border-slate-200 p-1 bg-white shadow-xs"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => onColorChange(e.target.value)}
                  className="flex-1 h-12 px-3.5 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-slate-50 uppercase text-slate-800"
                />
              </div>

              {/* Quick Retail Palettes */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {[
                  { label: 'Royal Blue', hex: '#2563EB' },
                  { label: 'Forest Green', hex: '#059669' },
                  { label: 'Warm Saffron', hex: '#D97706' },
                  { label: 'Ruby Red', hex: '#E11D48' },
                  { label: 'Deep Indigo', hex: '#4F46E5' },
                  { label: 'Obsidian Black', hex: '#0F172A' },
                ].map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => onColorChange(preset.hex)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-lg border border-slate-200 bg-white hover:border-slate-400 transition-colors shadow-2xs"
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: preset.hex }} />
                    <span className="font-medium text-slate-700">{preset.label}</span>
                  </button>
                ))}
              </div>

              {/* Typography */}
              <div className="pt-3">
                <label className="text-xs font-semibold text-slate-800 mb-2 block">
                  Typography Style
                </label>
                <select
                  value={fontFamily}
                  onChange={(e) => onFontChange(e.target.value)}
                  className="w-full h-11 px-3.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 font-medium shadow-xs"
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

        {/* SUBTAB 3: COMPONENT REGISTRY */}
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
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                  className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900">{comp.name}</span>
                      <span className="ml-2 text-[10px] font-mono text-slate-400">v{comp.version}</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {comp.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{comp.description}</p>
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
                className="w-full h-11 pl-9 pr-3.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900"
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
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2">
              {filteredIcons.slice(0, 60).map((icon) => (
                <button
                  key={icon.name}
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(icon.name);
                  }}
                  title={`${icon.name} (${icon.category}) — tap to copy`}
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 text-slate-700 transition-all text-center group active:scale-95 shadow-2xs"
                >
                  <span className="text-[11px] font-mono text-slate-600 group-hover:text-blue-600 truncate w-full">
                    {icon.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
