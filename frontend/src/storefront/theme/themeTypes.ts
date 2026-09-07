import type { TypographyTokens, SpacingTokens, RadiusTokens, ElevationTokens, MotionTokens } from './tokens';

export type ThemeId = 'atelier' | 'market' | 'mono' | 'bold' | 'artisan';

export type CardVariant = 'editorial' | 'clean' | 'mono' | 'bold' | 'artisan';
export type HeaderVariant = 'editorial' | 'commerce' | 'minimal' | 'bold' | 'artisan';
export type HeroVariant = 'split' | 'editorial' | 'product-focused' | 'commerce-banner' | 'minimal' | 'artisan-story';
export type FooterVariant = 'editorial' | 'commerce' | 'minimal' | 'bold' | 'artisan';
export type TrustStripVariant = 'commerce-badges' | 'artisan-values' | 'luxury-guarantee';
export type AnnouncementVariant = 'ticker' | 'static-center' | 'split-promos' | 'minimal';

export type ModernSectionType =
  | 'announcement'
  | 'header'
  | 'hero'
  | 'category-grid'
  | 'product-grid'
  | 'featured-product'
  | 'trust-strip'
  | 'brand-story'
  | 'testimonials'
  | 'faq'
  | 'newsletter'
  | 'footer';

export type LegacySectionType = 'navbar' | 'banner' | 'productGrid' | 'contact';

export type SectionType = ModernSectionType | LegacySectionType;

export interface StorefrontSection {
  id: string;
  type: SectionType;
  variant?: string;
  enabled?: boolean;
  config: Record<string, unknown>;
}

export interface MerchantThemeOverrides {
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  logo?: string;
  headingFont?: string;
  bodyFont?: string;
  radiusStyle?: 'sharp' | 'soft' | 'rounded';
  density?: 'compact' | 'balanced' | 'editorial';
}

export interface ThemeColors {
  primary: string;
  primaryHover: string;
  accent: string;
  accentHover: string;
  background: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  border: string;
  borderSubtle: string;
  badgeBg: string;
  badgeText: string;
  saleBadgeBg: string;
  saleBadgeText: string;
}

export interface ThemeDefinition {
  id: ThemeId;
  version: number;
  name: string;
  tagline: string;
  description: string;
  idealFor: string[];
  colors: ThemeColors;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  radius: RadiusTokens;
  elevation: ElevationTokens;
  motion: MotionTokens;
  cardVariant: CardVariant;
  headerVariant: HeaderVariant;
  heroVariant: HeroVariant;
  footerVariant: FooterVariant;
  aspectRatio: string;
  defaultSections: StorefrontSection[];
}

export interface NormalizedStoreConfig {
  theme: ThemeId;
  version: number;
  overrides: MerchantThemeOverrides;
  sections: StorefrontSection[];
}
