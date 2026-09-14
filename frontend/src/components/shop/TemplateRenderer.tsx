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

// Overlays & Modals
import ProductDetailModal from '../../storefront/components/ProductDetailModal';
import CartDrawer from '../../storefront/components/CartDrawer';
import CustomerAuthModal from '../../storefront/components/CustomerAuthModal';
import CustomerAccountDrawer from '../../storefront/components/CustomerAccountDrawer';
import TrackOrderModal from './TrackOrderModal';

export interface TemplateRendererProps {
  sections?: TemplateSection[] | any[];
  products: ShopProduct[];
  shopName: string;
  shopId: string;
  shopPhone?: string;
  shopLogo?: string;
  currency?: string;
  currencySymbol?: string;
  theme?: string | Record<string, unknown>;
  overrides?: MerchantThemeOverrides | Record<string, unknown>;
  isPreview?: boolean;
  initialProductId?: string | null;
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
  overrides,
  isPreview = false,
  initialProductId,
}: TemplateRendererProps) {
  const [showTrackModal, setShowTrackModal] = useState(false);

  useEffect(() => {
    const handleOpenTrack = () => setShowTrackModal(true);
    window.addEventListener('fera-open-track-order', handleOpenTrack);
    return () => window.removeEventListener('fera-open-track-order', handleOpenTrack);
  }, []);

  // 1. Resolve theme ID safely
  const themeId = useMemo(() => {
    if (typeof theme === 'string') return theme;
    if (theme && typeof theme === 'object' && 'id' in theme && typeof (theme as any).id === 'string') {
      return (theme as any).id;
    }
    return 'market';
  }, [theme]);

  // 2. Normalize sections safely (guarantees legacy sections work seamlessly)
  const normalizedSections = useMemo(() => {
    return normalizeLegacySections(sections, shopName);
  }, [sections, shopName]);

  // 3. Resolve theme definition and CSS variables
  const resolvedTheme = useMemo(() => {
    return resolveStorefrontTheme(themeId, overrides, normalizedSections);
  }, [themeId, overrides, normalizedSections]);

  return (
    <StorefrontProvider
      shopId={shopId}
      shopName={shopName}
      shopPhone={shopPhone}
      shopLogo={shopLogo}
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

        {/* Render Normalized Storefront Sections */}
        {resolvedTheme.sections.map((section) => {
          if (section.enabled === false) return null;

          const key = section.id;
          const config = section.config || {};
          const variant = section.variant;

          switch (section.type) {
            case 'announcement':
              return <AnnouncementBarSection key={key} config={config} variant={variant} />;

            case 'header':
              return (
                <HeaderSection
                  key={key}
                  config={config}
                  variant={variant || resolvedTheme.headerVariant}
                />
              );

            case 'hero':
              return (
                <HeroSection
                  key={key}
                  config={config}
                  variant={variant || resolvedTheme.heroVariant}
                />
              );

            case 'category-grid':
              return <CategoryGridSection key={key} config={config} variant={variant} />;

            case 'product-grid':
              return (
                <ProductGridSection
                  key={key}
                  config={config}
                  variant={variant || resolvedTheme.cardVariant}
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

            case 'footer':
              return (
                <FooterSection
                  key={key}
                  config={config}
                  variant={variant || resolvedTheme.footerVariant}
                />
              );

            default:
              return null;
          }
        })}

        {/* Global Storefront Overlays */}
        <ProductDetailModal />
        <CartDrawer />
        <CustomerAuthModal />
        <CustomerAccountDrawer />

        {/* Track Order Modal */}
        {showTrackModal && (
          <TrackOrderModal shopId={shopId} onClose={() => setShowTrackModal(false)} />
        )}
      </div>
    </StorefrontProvider>
  );
}
