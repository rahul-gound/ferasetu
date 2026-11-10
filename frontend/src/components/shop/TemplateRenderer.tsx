import React, { useState, useEffect, useMemo } from 'react';
import type { ShopProduct, TemplateSection } from '../../types/template';
import { StorefrontProvider } from '../../storefront/runtime/StorefrontProvider';
import { resolveStorefrontTheme } from '../../storefront/theme/themeResolver';
import type { MerchantThemeOverrides } from '../../storefront/theme/themeTypes';
import { normalizeLegacySections } from '../../storefront/compatibility/legacySectionAdapter';

// Sections
import AnnouncementBarSection from '../../storefront/sections/AnnouncementBarSection';
import HeaderSection from '../../storefront/sections/HeaderSection';
import HeroSection from '../../storefront/sections/HeroSection';
import CategoryGridSection from '../../storefront/sections/CategoryGridSection';
import ProductGridSection from '../../storefront/sections/ProductGridSection';
import FeaturedProductSection from '../../storefront/sections/FeaturedProductSection';
import TrustStripSection from '../../storefront/sections/TrustStripSection';
import BrandStorySection from '../../storefront/sections/BrandStorySection';
import TestimonialsSection from '../../storefront/sections/TestimonialsSection';
import FAQSection from '../../storefront/sections/FAQSection';
import NewsletterSection from '../../storefront/sections/NewsletterSection';
import FooterSection from '../../storefront/sections/FooterSection';
import DividerSection from '../../storefront/sections/DividerSection';
import ImageBannerSection from '../../storefront/sections/ImageBannerSection';
import AiAssistantSection from '../../storefront/sections/AiAssistantSection';
import BentoGridSection from '../../storefront/sections/BentoGridSection';
import MarqueeSection from '../../storefront/sections/MarqueeSection';

// Overlays & Modals
import ProductDetailModal from '../../storefront/components/ProductDetailModal';
import CartDrawer from '../../storefront/components/CartDrawer';
import CustomerAuthModal from '../../storefront/components/CustomerAuthModal';
import CustomerAccountDrawer from '../../storefront/components/CustomerAccountDrawer';
import TrackOrderModal from './TrackOrderModal';
import InCanvasInspectorModal from '../../builder/modals/InCanvasInspectorModal';

// Dedicated Templates
import MonoElectronicTemplate from '../../storefront/templates/electronic/MonoElectronicTemplate';
import { GripVertical, Wand2, ChevronUp, ChevronDown, Copy, Trash2, Plus, Sparkles, Sliders } from 'lucide-react';

export interface TemplateRendererProps {
  sections?: TemplateSection[] | any[];
  products: ShopProduct[];
  shopName?: string;
  shopId?: string;
  shopPhone?: string;
  shopLogo?: string;
  currency?: string;
  currencySymbol?: string;
  theme?: string | Record<string, unknown>;
  themeId?: string;
  overrides?: MerchantThemeOverrides | Record<string, unknown>;
  themeOverrides?: MerchantThemeOverrides | Record<string, unknown>;
  isPreview?: boolean;
  previewMode?: boolean;
  showPreviewBanner?: boolean;
  shop?: {
    id?: string;
    name?: string;
    description?: string;
    phone?: string;
    logo_url?: string;
  };
  initialProductId?: string | null;
  initialOrderId?: string | null;
  onSelectSection?: (sectionId: string) => void;
  selectedSectionId?: string | null;
  onRemoveSection?: (sectionId: string) => void;
  onReorderSections?: (newSections: any[]) => void;
  onInsertSectionAt?: (index: number, blockType: string, customConfig?: any) => void;
  onUpdateSectionConfig?: (id: string, newConfig: Record<string, any>) => void;
  onDuplicateSection?: (id: string) => void;
}

export default function TemplateRenderer({
  sections = [],
  products,
  shopName,
  shopId,
  shopPhone = '',
  shopLogo,
  currency,
  currencySymbol,
  theme,
  themeId: propThemeId,
  overrides,
  themeOverrides,
  isPreview = false,
  previewMode = false,
  showPreviewBanner = false,
  shop,
  initialProductId,
  initialOrderId,
  onSelectSection,
  selectedSectionId,
  onRemoveSection,
  onReorderSections,
  onInsertSectionAt,
  onUpdateSectionConfig,
  onDuplicateSection,
}: TemplateRendererProps) {
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null);
  const [activeDropTargetIndex, setActiveDropTargetIndex] = useState<number | null>(null);

  useEffect(() => {
    const handleOpenTrack = () => setShowTrackModal(true);
    window.addEventListener('fera-open-track-order', handleOpenTrack);
    return () => window.removeEventListener('fera-open-track-order', handleOpenTrack);
  }, []);

  const effectiveThemeInput = theme ?? propThemeId;
  const effectiveShopName = shopName || shop?.name || 'My Store';
  const effectiveShopId = shopId || shop?.id || 'store';
  const effectiveShopPhone = shopPhone || shop?.phone || '';
  const effectiveShopLogo = shopLogo || shop?.logo_url;
  const effectiveIsPreview = Boolean(isPreview || previewMode);

  const effectiveOverrides = useMemo(() => {
    const direct = overrides || themeOverrides;
    if (direct && typeof direct === 'object' && Object.keys(direct).length > 0) {
      return direct;
    }
    if (
      effectiveThemeInput &&
      typeof effectiveThemeInput === 'object' &&
      'overrides' in effectiveThemeInput &&
      typeof (effectiveThemeInput as any).overrides === 'object'
    ) {
      return (effectiveThemeInput as any).overrides;
    }
    return {};
  }, [overrides, themeOverrides, effectiveThemeInput]);

  // 1. Resolve theme ID safely
  const resolvedThemeId = useMemo(() => {
    if (typeof effectiveThemeInput === 'string') return effectiveThemeInput;
    if (
      effectiveThemeInput &&
      typeof effectiveThemeInput === 'object' &&
      'id' in effectiveThemeInput &&
      typeof (effectiveThemeInput as any).id === 'string'
    ) {
      return (effectiveThemeInput as any).id;
    }
    if (
      effectiveThemeInput &&
      typeof effectiveThemeInput === 'object' &&
      'template' in effectiveThemeInput &&
      typeof (effectiveThemeInput as any).template === 'string'
    ) {
      return (effectiveThemeInput as any).template;
    }
    return 'market';
  }, [effectiveThemeInput]);

  // 2. Normalize sections safely (guarantees legacy sections work seamlessly)
  const normalizedSections = useMemo(() => {
    return normalizeLegacySections(sections, effectiveShopName);
  }, [sections, effectiveShopName]);

  // 3. Resolve theme definition and CSS variables
  const resolvedTheme = useMemo(() => {
    return resolveStorefrontTheme(resolvedThemeId, effectiveOverrides, normalizedSections);
  }, [resolvedThemeId, effectiveOverrides, normalizedSections]);

  // Helper for Section Reordering directly inside preview
  const handleMoveUp = (index: number) => {
    if (index <= 0 || !onReorderSections) return;
    const newSections = [...normalizedSections];
    const [moved] = newSections.splice(index, 1);
    newSections.splice(index - 1, 0, moved);
    onReorderSections(newSections);
  };

  const handleMoveDown = (index: number) => {
    if (index >= normalizedSections.length - 1 || !onReorderSections) return;
    const newSections = [...normalizedSections];
    const [moved] = newSections.splice(index, 1);
    newSections.splice(index + 1, 0, moved);
    onReorderSections(newSections);
  };

  // Drag and Drop between sections on Preview Canvas
  const handleDragOverZone = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (activeDropTargetIndex !== index) {
      setActiveDropTargetIndex(index);
    }
  };

  const handleDropOnZone = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDropTargetIndex(null);

    // Case 1: Reordering an existing section inside the preview
    if (draggedSectionIndex !== null) {
      if (draggedSectionIndex === index || !onReorderSections) {
        setDraggedSectionIndex(null);
        return;
      }
      const newSections = [...normalizedSections];
      const [moved] = newSections.splice(draggedSectionIndex, 1);
      const targetPos = index > draggedSectionIndex ? index - 1 : index;
      newSections.splice(targetPos, 0, moved);
      setDraggedSectionIndex(null);
      onReorderSections(newSections);
      return;
    }

    // Case 2: Dropping a new block or component from the sidebar
    try {
      const payloadStr =
        e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
      if (payloadStr) {
        const payload = JSON.parse(payloadStr);
        if (payload.type && onInsertSectionAt) {
          onInsertSectionAt(index, payload.type, payload.config || payload.defaultProps);
          return;
        }
      }
    } catch {
      // If plain text was dropped representing block type
      const plainType = e.dataTransfer.getData('text/plain');
      if (plainType && onInsertSectionAt) {
        onInsertSectionAt(index, plainType);
      }
    }
  };

  // Currently inspected section for modal
  const editingSection = useMemo(() => {
    if (!editingSectionId) return null;
    return normalizedSections.find((s) => s.id === editingSectionId) || null;
  }, [editingSectionId, normalizedSections]);

  const getAnimationClass = (anim?: string) => {
    switch (anim) {
      case 'fade-in':
        return 'animate-fera-fade-in';
      case 'slide-up':
        return 'animate-fera-slide-up';
      case 'scale-up':
        return 'animate-fera-scale-up';
      case 'float':
        return 'animate-fera-float';
      case 'pulse':
        return 'animate-fera-pulse';
      default:
        return '';
    }
  };

  return (
    <StorefrontProvider
      shopId={effectiveShopId}
      shopName={effectiveShopName}
      shopPhone={effectiveShopPhone}
      shopLogo={effectiveShopLogo}
      currency={currency}
      currencySymbol={currencySymbol}
      products={products}
      initialProductId={initialProductId}
      initialOrderId={initialOrderId}
    >
      <div
        className="fera-storefront-root min-h-screen text-[var(--theme-color-text)] bg-[var(--theme-color-bg)] transition-colors duration-200"
        style={{
          ...resolvedTheme.cssVariables,
          fontFamily: 'var(--theme-font-body), system-ui, sans-serif',
        }}
      >
        {/* Preview Banner */}
        {isPreview && showPreviewBanner && (
          <div className="sticky top-0 z-[100] bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-2 flex items-center justify-between text-xs font-bold shadow-sm">
            <span className="flex items-center gap-1.5">
              <span>👁️</span> Live Store Preview &mdash; Theme: <span className="uppercase">{resolvedTheme.name}</span>
            </span>
            <span className="opacity-90 font-medium hidden sm:inline">
              Drag &amp; drop components or tap edit to shape live
            </span>
          </div>
        )}

        {/* If Electronic / Mono Electronic theme is selected, render its signature dual-column layout */}
        {resolvedTheme.id === 'electronic' ? (
          <MonoElectronicTemplate />
        ) : (
          <div className="relative">
            {/* Top Drop Zone (Position 0) in Preview Mode */}
            {effectiveIsPreview && (
              <div
                onDragOver={(e) => handleDragOverZone(e, 0)}
                onDragLeave={() => setActiveDropTargetIndex(null)}
                onDrop={(e) => handleDropOnZone(e, 0)}
                className={`transition-all duration-200 py-1.5 px-4 flex items-center justify-center ${
                  activeDropTargetIndex === 0
                    ? 'bg-orange-500/15 border-2 border-dashed border-orange-500 py-4 scale-[1.01]'
                    : 'hover:bg-orange-500/10 opacity-40 hover:opacity-100 border border-dashed border-transparent hover:border-orange-300'
                }`}
              >
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-800 text-orange-600 text-[11px] font-bold shadow-2xs">
                  <Plus size={12} />
                  <span>Drop block or component here (Top of Page)</span>
                </div>
              </div>
            )}

            {/* Render Normalized Storefront Sections */}
            {resolvedTheme.sections.map((section, idx) => {
              if (section.enabled === false) return null;

              const key = section.id;
              const config = (section.config || {}) as Record<string, any>;
              const variant = section.variant;
              const isSelected = selectedSectionId === key;
              const animClass = getAnimationClass(config.animation);

              const renderContent = () => {
                switch (section.type) {
                  case 'announcement':
                    return <AnnouncementBarSection key={key} config={config} variant={variant} />;

                  case 'header':
                    return (
                      <HeaderSection
                        key={key}
                        config={config}
                        variant={resolvedTheme.headerVariant || variant}
                      />
                    );

                  case 'hero':
                    return (
                      <HeroSection
                        key={key}
                        config={config}
                        variant={resolvedTheme.heroVariant || variant}
                      />
                    );

                  case 'bento-grid':
                  case 'bento':
                  case 'bento-showcase':
                    return <BentoGridSection key={key} config={config} variant={variant} />;

                  case 'marquee':
                  case 'ticker':
                    return <MarqueeSection key={key} config={config} variant={variant} />;

                  case 'category-grid':
                    return <CategoryGridSection key={key} config={config} variant={variant} />;

                  case 'product-grid':
                    return (
                      <ProductGridSection
                        key={key}
                        config={config}
                        variant={resolvedTheme.cardVariant || variant}
                      />
                    );

                  case 'featured-product':
                    return <FeaturedProductSection key={key} config={config} variant={variant} />;

                  case 'trust-strip':
                    return <TrustStripSection key={key} config={config} variant={variant} />;

                  case 'brand-story':
                    return <BrandStorySection key={key} config={config} variant={variant} />;

                  case 'testimonials':
                    return <TestimonialsSection key={key} config={config} variant={variant} />;

                  case 'faq':
                    return <FAQSection key={key} config={config} variant={variant} />;

                  case 'newsletter':
                    return <NewsletterSection key={key} config={config} variant={variant} />;

                  case 'divider':
                  case 'separator':
                  case 'line':
                    return <DividerSection key={key} config={config} variant={variant} />;

                  case 'image-banner':
                  case 'image-section':
                  case 'banner-image':
                    return <ImageBannerSection key={key} config={config} variant={variant} />;

                  case 'ai-assistant':
                  case 'ai_assistant':
                  case 'ai-chat':
                  case 'ai-concierge':
                    return (
                      <AiAssistantSection
                        key={key}
                        id={key}
                        config={config}
                        variant={variant}
                        onRemove={() => {
                          if (onRemoveSection) {
                            onRemoveSection(key);
                          }
                        }}
                        isPreview={effectiveIsPreview}
                      />
                    );

                  case 'footer':
                    return (
                      <FooterSection
                        key={key}
                        config={config}
                        variant={resolvedTheme.footerVariant || variant}
                      />
                    );

                  default:
                    return null;
                }
              };

              if (effectiveIsPreview && onSelectSection) {
                return (
                  <React.Fragment key={key}>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSection(key);
                      }}
                      className={`group relative transition-all duration-200 ${animClass} ${
                        isSelected
                          ? 'ring-2 ring-orange-500 ring-offset-2 z-20 shadow-md'
                          : 'hover:outline-dashed hover:outline-2 hover:outline-orange-400/80'
                      }`}
                    >
                      {/* Floating In-Preview Control Bar */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className={`absolute top-2 right-2 sm:right-4 z-30 flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 shadow-xl backdrop-blur-md transition-all ${
                          isSelected ? 'opacity-100 scale-100' : 'opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100'
                        }`}
                      >
                        {/* Cursor Drag Handle */}
                        <div
                          draggable
                          onDragStart={(e) => {
                            setDraggedSectionIndex(idx);
                            e.dataTransfer.setData('application/json', JSON.stringify({ index: idx, id: key }));
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-grab active:cursor-grabbing hover:bg-orange-50 hover:text-orange-600 transition-colors"
                          title="Drag to reorder position"
                        >
                          <GripVertical size={14} />
                          <span className="text-[10px] font-bold">#{idx + 1}</span>
                        </div>

                        {/* Block Label & Active Animation badge */}
                        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-bold text-slate-800 dark:text-slate-200 capitalize">
                          {section.label || section.type.replace(/-/g, ' ')}
                          {config.animation && config.animation !== 'none' && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 font-extrabold">
                              ✨ {config.animation}
                            </span>
                          )}
                        </span>

                        {/* Quick Edit Visual Inspector Button */}
                        <button
                          type="button"
                          onClick={() => setEditingSectionId(key)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                          title="Edit text, shape image, animation & icons"
                        >
                          <Wand2 size={13} />
                          <span>Quick Edit</span>
                        </button>

                        {/* Move Up */}
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveUp(idx)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                          title="Move up"
                        >
                          <ChevronUp size={14} />
                        </button>

                        {/* Move Down */}
                        <button
                          type="button"
                          disabled={idx === normalizedSections.length - 1}
                          onClick={() => handleMoveDown(idx)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                          title="Move down"
                        >
                          <ChevronDown size={14} />
                        </button>

                        {/* Duplicate */}
                        {onDuplicateSection && (
                          <button
                            type="button"
                            onClick={() => onDuplicateSection(key)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Duplicate block"
                          >
                            <Copy size={13} />
                          </button>
                        )}

                        {/* Remove */}
                        {onRemoveSection && (
                          <button
                            type="button"
                            onClick={() => onRemoveSection(key)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                            title="Remove section"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      {/* Actual Section Visual Content */}
                      <div className="relative">
                        {renderContent()}
                      </div>
                    </div>

                    {/* Inter-Section Drop Zone (Position idx + 1) */}
                    <div
                      onDragOver={(e) => handleDragOverZone(e, idx + 1)}
                      onDragLeave={() => setActiveDropTargetIndex(null)}
                      onDrop={(e) => handleDropOnZone(e, idx + 1)}
                      className={`transition-all duration-200 py-1.5 px-4 flex items-center justify-center ${
                        activeDropTargetIndex === idx + 1
                          ? 'bg-orange-500/15 border-2 border-dashed border-orange-500 py-4 scale-[1.01]'
                          : 'hover:bg-orange-500/10 opacity-30 hover:opacity-100 border border-dashed border-transparent hover:border-orange-300'
                      }`}
                    >
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-800 text-orange-600 text-[11px] font-bold shadow-2xs">
                        <Plus size={12} />
                        <span>Drop here (Position #{idx + 2})</span>
                      </div>
                    </div>
                  </React.Fragment>
                );
              }

              return renderContent();
            })}
          </div>
        )}

        {/* Global Storefront Overlays */}
        <ProductDetailModal />
        <CartDrawer />
        <CustomerAuthModal />
        <CustomerAccountDrawer />

        {/* In-Canvas Visual Inspector Modal */}
        {editingSection && onUpdateSectionConfig && (
          <InCanvasInspectorModal
            isOpen={Boolean(editingSectionId)}
            onClose={() => setEditingSectionId(null)}
            section={editingSection}
            onUpdateConfig={onUpdateSectionConfig}
          />
        )}
      </div>
    </StorefrontProvider>
  );
}
