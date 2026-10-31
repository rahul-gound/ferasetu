import React, { useState } from 'react';
import {
  X,
  Type,
  ImageIcon,
  Sparkles,
  Sliders,
  Check,
  Zap,
  ArrowRight,
  Palette,
  Search,
  Box,
  Layers,
  Wand2,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { SEARCHABLE_ICONS, ICON_CATEGORIES } from '../registry/iconsCatalog';

interface InCanvasInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  section: {
    id: string;
    type: string;
    label?: string;
    config?: Record<string, any>;
  } | null;
  onUpdateConfig: (id: string, newConfig: Record<string, any>) => void;
}

const CURATED_IMAGE_PRESETS = [
  { label: '🍏 Groceries & Fresh Produce', url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1600&q=80' },
  { label: '👗 Boutique & Fashion', url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=80' },
  { label: '📱 Electronics & Tech', url: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=1600&q=80' },
  { label: '☕ Cafe, Chai & Bakery', url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1600&q=80' },
  { label: '🏺 Handcrafted Pottery', url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=1600&q=80' },
  { label: '🌿 Organic Honey & Ayurvedic', url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=1600&q=80' },
];

export default function InCanvasInspectorModal({
  isOpen,
  onClose,
  section,
  onUpdateConfig,
}: InCanvasInspectorModalProps) {
  const [activeTab, setActiveTab] = useState<'content' | 'shape' | 'animation' | 'icons'>('content');
  const [iconQuery, setIconQuery] = useState('');
  const [iconCategory, setIconCategory] = useState<string>('all');

  if (!isOpen || !section) return null;

  const config = (section.config || {}) as Record<string, any>;

  const handleFieldChange = (field: string, val: any) => {
    onUpdateConfig(section.id, { [field]: val });
  };

  const filteredIcons = SEARCHABLE_ICONS.filter((icon) => {
    const matchesCat = iconCategory === 'all' || icon.category === iconCategory;
    const matchesQuery =
      !iconQuery ||
      icon.name.toLowerCase().includes(iconQuery.toLowerCase()) ||
      (icon.tags || []).some((k) => k.toLowerCase().includes(iconQuery.toLowerCase()));
    return matchesCat && matchesQuery;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-sm animate-fera-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/80 text-orange-600 flex items-center justify-center flex-shrink-0">
              <Wand2 size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                Customize: {section.label || section.type.replace(/-/g, ' ')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Visual block styling, shapes, typography &amp; animation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-4 sm:px-6 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('content')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'content'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <Type size={14} />
            <span>Text &amp; Copy</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shape')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'shape'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <ImageIcon size={14} />
            <span>Image &amp; Shape</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('animation')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'animation'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles size={14} />
            <span>Animations</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('icons')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'icons'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <Zap size={14} />
            <span>Vector Icons</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* TAB 1: TEXT & COPY */}
          {activeTab === 'content' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Eyebrow / Small Badge Text
                </label>
                <input
                  type="text"
                  value={config.eyebrow || ''}
                  onChange={(e) => handleFieldChange('eyebrow', e.target.value)}
                  placeholder="e.g. DIRECT STORE or VERIFIED SHOP"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Main Headline / Title
                </label>
                <input
                  type="text"
                  value={config.headline || config.title || ''}
                  onChange={(e) => {
                    handleFieldChange('headline', e.target.value);
                    handleFieldChange('title', e.target.value);
                  }}
                  placeholder="e.g. Handcrafted Heritage Pashminas"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Subheadline / Descriptive Text
                </label>
                <textarea
                  rows={3}
                  value={config.subheadline || config.subtitle || config.description || ''}
                  onChange={(e) => {
                    handleFieldChange('subheadline', e.target.value);
                    handleFieldChange('subtitle', e.target.value);
                    handleFieldChange('description', e.target.value);
                  }}
                  placeholder="Share details about this collection or shopkeeper promise..."
                  className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Button CTA Label
                  </label>
                  <input
                    type="text"
                    value={config.ctaText || ''}
                    onChange={(e) => handleFieldChange('ctaText', e.target.value)}
                    placeholder="e.g. Browse Products or Order Now"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Click Action / Destination
                  </label>
                  <select
                    value={config.clickAction || 'scroll'}
                    onChange={(e) => handleFieldChange('clickAction', e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium"
                  >
                    <option value="scroll">Scroll to Products (#products)</option>
                    <option value="whatsapp">Open WhatsApp Direct Chat</option>
                    <option value="cart">Open Shopping Cart</option>
                    <option value="signup">Open Customer Sign In / Account</option>
                    <option value="track">Track Order Status</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IMAGE & SHAPE FRAMING */}
          {activeTab === 'shape' && (
            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Featured Image URL
                </label>
                <input
                  type="text"
                  value={config.imageUrl || config.image || ''}
                  onChange={(e) => {
                    handleFieldChange('imageUrl', e.target.value);
                    handleFieldChange('image', e.target.value);
                  }}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>

              {/* Curated Gallery Presets */}
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-2">
                  Or select a curated photo:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CURATED_IMAGE_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        handleFieldChange('imageUrl', preset.url);
                        handleFieldChange('image', preset.url);
                      }}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-orange-500 bg-white dark:bg-slate-900 text-left text-xs font-medium text-slate-700 dark:text-slate-300 transition-all truncate"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shape Framing Selector */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                  Image &amp; Card Shape Framing
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'rounded', label: 'Curved Soft', desc: 'rounded-2xl', preview: 'rounded-2xl' },
                    { id: 'squircle', label: 'Squircle', desc: 'rounded-[2rem]', preview: 'rounded-[1.75rem]' },
                    { id: 'sharp', label: 'Sharp Studio', desc: 'rounded-none', preview: 'rounded-none' },
                    { id: 'pill', label: 'Capsule Pill', desc: 'rounded-full', preview: 'rounded-full' },
                  ].map((sh) => (
                    <button
                      key={sh.id}
                      type="button"
                      onClick={() => handleFieldChange('imageShape', sh.id)}
                      className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-2 ${
                        (config.imageShape || 'rounded') === sh.id
                          ? 'border-orange-500 bg-orange-50/60 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 ring-2 ring-orange-500/20 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-10 h-10 bg-orange-200/80 border border-orange-400 ${sh.preview}`} />
                      <span className="text-xs font-bold">{sh.label}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{sh.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Depth & Glow Effects (Astryx / React Bits) */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                  Surface Depth &amp; Spotlight Glow
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'none', label: 'Clean Flat' },
                    { id: 'spotlight', label: 'Spotlight Glow (React Bits)' },
                    { id: 'shimmer', label: 'Shimmer Beam (Astryx)' },
                    { id: 'elevated', label: 'Elevated 3D Shadow' },
                    { id: 'border-glow', label: 'Radiant Orange Border' },
                  ].map((fx) => (
                    <button
                      key={fx.id}
                      type="button"
                      onClick={() => handleFieldChange('depthEffect', fx.id)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left ${
                        (config.depthEffect || 'none') === fx.id
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {fx.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ANIMATIONS ENGINE (React Bits & Astryx) */}
          {activeTab === 'animation' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                  Entrance &amp; Scroll Motion Preset
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { id: 'none', label: 'Static Calm (Default)', desc: 'Zero movement, instant render' },
                    { id: 'fade-in', label: 'Gentle Fade In', desc: 'Smooth opacity & subtle vertical lift' },
                    { id: 'slide-up', label: 'Upward Slide Glide', desc: 'Cinematic scroll-triggered slide' },
                    { id: 'scale-up', label: 'Scale Pop-in', desc: 'Light focal magnification entrance' },
                    { id: 'shimmer', label: 'Astryx Shimmer Beam', desc: 'Sweeping soft light beam across surface' },
                    { id: 'float', label: 'Breathing Float', desc: 'Calm continuous ambient suspension' },
                    { id: 'pulse', label: 'Ambient Pulse', desc: 'Soft breathing opacity glow' },
                  ].map((anim) => (
                    <button
                      key={anim.id}
                      type="button"
                      onClick={() => handleFieldChange('animation', anim.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        (config.animation || 'none') === anim.id
                          ? 'border-orange-500 bg-orange-50/70 dark:bg-orange-950/40 ring-2 ring-orange-500/20 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {anim.label}
                        </span>
                        {(config.animation || 'none') === anim.id && (
                          <Check size={14} className="text-orange-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{anim.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview Demo Chip */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Active Effect: {config.animation || 'None (Static)'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Renders smoothly in the live preview canvas without layout-thrashing.
                  </span>
                </div>
                <div
                  className={`px-3 py-1.5 rounded-xl bg-orange-500 text-white font-bold text-xs shadow-sm ${
                    config.animation === 'fade-in'
                      ? 'animate-fera-fade-in'
                      : config.animation === 'slide-up'
                      ? 'animate-fera-slide-up'
                      : config.animation === 'scale-up'
                      ? 'animate-fera-scale-up'
                      : config.animation === 'float'
                      ? 'animate-fera-float'
                      : config.animation === 'pulse'
                      ? 'animate-fera-pulse'
                      : ''
                  }`}
                >
                  Live Preview
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: VECTOR ICONS */}
          {activeTab === 'icons' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  placeholder="Search vector icons (e.g. cart, bag, star, phone)..."
                  value={iconQuery}
                  onChange={(e) => setIconQuery(e.target.value)}
                  className="w-full h-11 pl-9 pr-3.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
                {['all', ...ICON_CATEGORIES].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setIconCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs capitalize whitespace-nowrap font-medium transition-all ${
                      iconCategory === cat
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 max-h-64 overflow-y-auto pr-1">
                {filteredIcons.slice(0, 72).map((icon) => {
                  const IconComp = (LucideIcons as any)[icon.name] || LucideIcons.Sparkles;
                  const isSelected = config.iconName === icon.name;

                  return (
                    <button
                      key={icon.name}
                      type="button"
                      onClick={() => handleFieldChange('iconName', icon.name)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/60 text-orange-600 font-bold shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <IconComp size={20} strokeWidth={1.75} />
                      <span className="text-[10px] truncate w-full font-mono">{icon.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer CTA */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-900/80">
          <span className="text-xs text-slate-500">
            Changes apply instantly to live preview
          </span>
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 active:scale-98 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Check size={16} />
            <span>Done &amp; Apply</span>
          </button>
        </div>
      </div>
    </div>
  );
}
