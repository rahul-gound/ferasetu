import type {
  ThemeId,
  ThemeDefinition,
  MerchantThemeOverrides,
  StorefrontSection,
  NormalizedStoreConfig,
} from './themeTypes';
import { THEME_REGISTRY, MARKET_THEME } from './themeDefinitions';

export interface ResolvedTheme {
  definition: ThemeDefinition;
  id: ThemeId;
  name: string;
  colors: ThemeDefinition['colors'];
  typography: ThemeDefinition['typography'];
  spacing: ThemeDefinition['spacing'];
  radius: ThemeDefinition['radius'];
  elevation: ThemeDefinition['elevation'];
  motion: ThemeDefinition['motion'];
  cardVariant: ThemeDefinition['cardVariant'];
  headerVariant: ThemeDefinition['headerVariant'];
  heroVariant: ThemeDefinition['heroVariant'];
  footerVariant: ThemeDefinition['footerVariant'];
  aspectRatio: string;
  cssVariables: Record<string, string>;
  sections: StorefrontSection[];
}

export function resolveStorefrontTheme(
  themeIdInput?: unknown,
  overridesInput?: unknown,
  sectionsInput?: unknown
): ResolvedTheme {
  // 1. Identify base theme safely
  let themeId: ThemeId = 'market';
  if (typeof themeIdInput === 'string') {
    const normalized = themeIdInput.toLowerCase().trim() as ThemeId;
    if (THEME_REGISTRY[normalized]) {
      themeId = normalized;
    }
  }

  const baseTheme = THEME_REGISTRY[themeId] || MARKET_THEME;
  const overrides = (typeof overridesInput === 'object' && overridesInput !== null
    ? (overridesInput as MerchantThemeOverrides)
    : {}) as MerchantThemeOverrides;

  // 2. Resolve colors with overrides
  const colors = {
    ...baseTheme.colors,
    ...(overrides.primaryColor ? { primary: overrides.primaryColor } : {}),
    ...(overrides.accentColor ? { accent: overrides.accentColor } : {}),
    ...(overrides.backgroundColor ? { background: overrides.backgroundColor } : {}),
  };

  // 3. Resolve typography with overrides
  const typography = {
    ...baseTheme.typography,
    ...(overrides.headingFont ? { fontFamilyHeading: overrides.headingFont } : {}),
    ...(overrides.bodyFont ? { fontFamilyBody: overrides.bodyFont } : {}),
  };

  // 4. Resolve radius based on merchant style preference if given
  let radius = { ...baseTheme.radius };
  if (overrides.radiusStyle === 'sharp') {
    radius = {
      none: '0px',
      sm: '0px',
      md: '0px',
      lg: '0px',
      pill: '0px',
      card: '0px',
      button: '0px',
      input: '0px',
    };
  } else if (overrides.radiusStyle === 'soft') {
    radius = {
      none: '0px',
      sm: '4px',
      md: '6px',
      lg: '8px',
      pill: '9999px',
      card: '6px',
      button: '6px',
      input: '6px',
    };
  } else if (overrides.radiusStyle === 'rounded') {
    radius = {
      none: '0px',
      sm: '6px',
      md: '10px',
      lg: '16px',
      pill: '9999px',
      card: '12px',
      button: '9999px',
      input: '10px',
    };
  }

  // 5. Resolve spacing density
  let spacing = { ...baseTheme.spacing };
  if (overrides.density === 'compact') {
    spacing = {
      ...spacing,
      sectionPadding: 'clamp(32px, 5vw, 60px)',
      cardGap: '16px',
    };
  } else if (overrides.density === 'editorial') {
    spacing = {
      ...spacing,
      sectionPadding: 'clamp(64px, 10vw, 120px)',
      cardGap: '32px',
    };
  }

  // 6. Normalize sections
  let sections: StorefrontSection[] = [];
  if (Array.isArray(sectionsInput) && sectionsInput.length > 0) {
    sections = sectionsInput
      .filter((s): s is StorefrontSection => s && typeof s === 'object' && typeof s.type === 'string')
      .map((s, idx) => ({
        id: s.id || `section-${idx}-${Date.now()}`,
        type: s.type,
        variant: s.variant,
        enabled: s.enabled !== false,
        config: s.config && typeof s.config === 'object' ? s.config : {},
      }));
  }

  if (sections.length === 0) {
    sections = baseTheme.defaultSections;
  }

  // 7. Compute CSS variables
  const cssVariables: Record<string, string> = {
    '--theme-color-primary': colors.primary,
    '--theme-color-primary-hover': colors.primaryHover,
    '--theme-color-accent': colors.accent,
    '--theme-color-accent-hover': colors.accentHover,
    '--theme-color-bg': colors.background,
    '--theme-color-surface': colors.surface,
    '--theme-color-surface-elevated': colors.surfaceElevated,
    '--theme-color-text': colors.text,
    '--theme-color-text-muted': colors.textMuted,
    '--theme-color-text-subtle': colors.textSubtle,
    '--theme-color-border': colors.border,
    '--theme-color-border-subtle': colors.borderSubtle,
    '--theme-color-badge-bg': colors.badgeBg,
    '--theme-color-badge-text': colors.badgeText,
    '--theme-color-sale-badge-bg': colors.saleBadgeBg,
    '--theme-color-sale-badge-text': colors.saleBadgeText,

    '--theme-font-heading': typography.fontFamilyHeading,
    '--theme-font-body': typography.fontFamilyBody,
    '--theme-weight-heading': typography.headingWeight,
    '--theme-weight-body': typography.bodyWeight,
    '--theme-tracking-heading': typography.letterSpacingHeading,
    '--theme-transform-heading': typography.textTransformHeading,

    '--theme-size-display': typography.display,
    '--theme-size-heading': typography.heading,
    '--theme-size-subheading': typography.subheading,
    '--theme-size-body': typography.body,
    '--theme-size-body-small': typography.bodySmall,
    '--theme-size-label': typography.label,
    '--theme-size-caption': typography.caption,
    '--theme-size-price': typography.price,
    '--theme-size-nav': typography.navigation,

    '--theme-radius-card': radius.card,
    '--theme-radius-button': radius.button,
    '--theme-radius-input': radius.input,
    '--theme-radius-pill': radius.pill,
    '--theme-radius-sm': radius.sm,
    '--theme-radius-md': radius.md,
    '--theme-radius-lg': radius.lg,

    '--theme-spacing-section': spacing.sectionPadding,
    '--theme-spacing-card-gap': spacing.cardGap,
    '--theme-max-width': spacing.containerMaxWidth,

    '--theme-shadow-card': baseTheme.elevation.shadowCard,
    '--theme-shadow-card-hover': baseTheme.elevation.shadowCardHover,
    '--theme-shadow-dropdown': baseTheme.elevation.shadowDropdown,
    '--theme-shadow-modal': baseTheme.elevation.shadowModal,

    '--theme-transition-fast': baseTheme.motion.fast,
    '--theme-transition-normal': baseTheme.motion.normal,
    '--theme-transition-slow': baseTheme.motion.slow,
  };

  return {
    definition: baseTheme,
    id: themeId,
    name: baseTheme.name,
    colors,
    typography,
    spacing,
    radius,
    elevation: baseTheme.elevation,
    motion: baseTheme.motion,
    cardVariant: baseTheme.cardVariant,
    headerVariant: baseTheme.headerVariant,
    heroVariant: baseTheme.heroVariant,
    footerVariant: baseTheme.footerVariant,
    aspectRatio: baseTheme.aspectRatio,
    cssVariables,
    sections,
  };
}
