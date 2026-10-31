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

// Overlays & Modals
import ProductDetailModal from '../../storefront/components/ProductDetailModal';
import CartDrawer from '../../storefront/components/CartDrawer';
import CustomerAuthModal from '../../storefront/components/CustomerAuthModal';
import CustomerAccountDrawer from '../../storefront/components/CustomerAccountDrawer';
import TrackOrderModal from './TrackOrderModal';

// Dedicated Templates
import MonoElectronicTemplate from '../../storefront/templates/electronic/MonoElectronicTemplate';

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
  shop?: {
    id?: string;
    name?: string;
    description?: string;
    phone?: string;
    logo_url?: string;
  };
  initialProductId?: string | null;
  onSelectSection?: (sectionId: string) => void;
  selectedSectionId?: string | null;
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
  shop,
  initialProductId,
  onSelectSection,
  selectedSectionId,
}: TemplateRendererProps) {
  const [showTrackModal, setShowTrackModal] = useState(false);

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
    >
      <div
        className="fera-storefront-root min-h-screen text-[var(--theme-color-text)] bg-[var(--theme-color-bg)] transition-colors duration-200"
        style={{
          ...resolvedTheme.cssVariables,
          fontFamily: 'var(--theme-font-body), system-ui, sans-serif',
        }}
      >
        {/* Preview Banner */}
        {isPreview && (
          <div className="sticky top-0 z-[100] bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 flex items-center justify-between text-xs font-bold shadow-sm">
            <span className="flex items-center gap-1.5">
              <span>👁️</span> Live Store Preview &mdash; Theme: <span className="uppercase">{resolvedTheme.name}</span>
            </span>
            <span className="opacity-80 font-normal hidden sm:inline">
              Changes update in real time
            </span>
          </div>
        )}

        {/* If Electronic / Mono Electronic theme is selected, render its signature dual-column layout */}
        {resolvedTheme.id === 'electronic' ? (
          <MonoElectronicTemplate />
        ) : (
          <>
            {/* Render Normalized Storefront Sections */}
            {resolvedTheme.sections.map((section) => {
              if (section.enabled === false) return null;

              const key = section.id;
              const config = section.config || {};
              const variant = section.variant;
              const isSelected = selectedSectionId === key;

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

              if (onSelectSection) {
                return (
                  <div
                    key={key}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectSection(key);
                    }}
                    className={`transition-all ${
                      isSelected
                        ? 'ring-2 ring-blue-500 ring-offset-2 relative z-10'
                        : 'hover:outline-dashed hover:outline-1 hover:outline-blue-300'
                    }`}
                  >
                    {renderContent()}
                  </div>
                );
              }

              return renderContent();
            })}

            {/* Global Storefront Overlays */}
            <ProductDetailModal />
            <CartDrawer />
            <CustomerAuthModal />
            <CustomerAccountDrawer />
          </>
        )}

        {/* Track Order Modal */}
        {showTrackModal && (
          <TrackOrderModal shopId={shopId} onClose={() => setShowTrackModal(false)} />
        )}
      </div>
    </StorefrontProvider>
  );
}
