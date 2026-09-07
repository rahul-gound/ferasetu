import type { StorefrontSection } from '../theme/themeTypes';

interface RawSection {
  id?: string;
  type?: string;
  config?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Gracefully normalizes legacy sections into modern StorefrontSection structures.
 * Guarantees zero crashing when encountering legacy data.
 */
export function normalizeLegacySections(
  rawSections: unknown[],
  shopName: string = 'Store'
): StorefrontSection[] {
  if (!Array.isArray(rawSections) || rawSections.length === 0) {
    return [];
  }

  return rawSections.map((rawItem, index): StorefrontSection => {
    const raw = (rawItem && typeof rawItem === 'object' ? rawItem : {}) as RawSection;
    const type = raw.type || 'product-grid';
    const id = raw.id || `section-${type}-${index}-${Date.now()}`;
    const cfg = (raw.config && typeof raw.config === 'object' ? raw.config : {}) as Record<string, unknown>;

    switch (type) {
      case 'navbar':
        return {
          id,
          type: 'header',
          variant: 'commerce',
          enabled: true,
          config: {
            shopName: cfg.shopName || shopName,
            primaryColor: cfg.primaryColor,
            accentColor: cfg.accentColor,
            links: cfg.links,
          },
        };

      case 'banner':
        return {
          id,
          type: 'announcement',
          variant: 'ticker',
          enabled: true,
          config: {
            text: cfg.text || 'Welcome to our store!',
            bgColor: cfg.bgColor,
            textColor: cfg.textColor,
          },
        };

      case 'hero':
        return {
          id,
          type: 'hero',
          variant: 'split',
          enabled: true,
          config: {
            headline: cfg.headline || `Welcome to ${shopName}`,
            subheadline: cfg.subheadline || 'Browse our curated collection online.',
            ctaText: cfg.ctaText || 'Shop Now',
            ctaHref: cfg.ctaHref || '#products',
            bgColor: cfg.bgColor,
            accentColor: cfg.accentColor,
            imageUrl: cfg.imageUrl,
          },
        };

      case 'productGrid':
        return {
          id,
          type: 'product-grid',
          variant: 'clean',
          enabled: true,
          config: {
            title: cfg.title || 'Our Products',
            columns: cfg.columns || 3,
            showStock: cfg.showStock !== false,
            accentColor: cfg.accentColor,
          },
        };

      case 'contact':
        return {
          id,
          type: 'trust-strip',
          variant: 'commerce-badges',
          enabled: true,
          config: {
            title: cfg.title || 'Contact & Visit Us',
            address: cfg.address,
            phone: cfg.phone,
            email: cfg.email,
            hours: cfg.hours,
          },
        };

      case 'footer':
        return {
          id,
          type: 'footer',
          variant: 'commerce',
          enabled: true,
          config: {
            shopName: cfg.shopName || shopName,
            tagline: cfg.tagline,
            primaryColor: cfg.primaryColor,
            social: cfg.social,
          },
        };

      default:
        // Modern or unknown section
        return {
          id,
          type: type as any,
          variant: (raw as any).variant,
          enabled: (raw as any).enabled !== false,
          config: cfg,
        };
    }
  });
}
