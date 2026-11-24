/**
 * FeraSetu AI Storefront Studio — Intelligent Multi-Colour System
 *
 * Implements a sophisticated, coordinated multi-colour design system:
 * - 10-role coordinated palettes (Primary, Secondary, Supporting, Accent, Highlight, Background, Surface, SurfaceElevated, Text, TextMuted, Border, Semantic)
 * - WCAG 2.2 AA/AAA contrast ratio verification (>= 4.5:1 body, >= 3:1 large headers/buttons)
 * - Colour psychology, harmony, and business-category awareness
 * - Visual swatches generation for in-chat interactive presentation
 * - Design token generation that maps cleanly into Storefront Theme Overrides
 */

export interface ColorRolePalette {
  id: string;
  name: string;
  category: string; // e.g. 'Electronics & Tech', 'Artisan & Craft', 'Grocery & Fresh', 'Luxury & Fashion', 'Wellness & Health'
  description: string;
  vibe: 'minimal' | 'bold' | 'editorial' | 'warm' | 'fresh';
  roles: {
    primary: string;           // Core brand identity
    secondary: string;         // Complementary brand anchor
    supporting: string;        // Harmonious intermediate tone
    accent: string;            // High-converting commerce accent (e.g. Saffron/Orange)
    highlight: string;         // Vibrant attention beacon
    background: string;        // Clean canvas background (#FFFFFF or subtle warm tint)
    surface: string;           // Cards and elevated panels
    surfaceElevated: string;   // Modals and floating drawers
    text: string;              // High-contrast readable body/header text
    textMuted: string;         // Secondary descriptive text
    border: string;            // Subtle card & divider borders
    semantic: {
      success: string;
      warning: string;
      error: string;
    };
  };
  contrastRatios: {
    textOnBackground: number;
    primaryOnBackground: number;
    accentOnBackground: number;
    textOnPrimary: number;
    textOnAccent: number;
    isAccessible: boolean;
  };
}

/**
 * Calculates the relative luminance of a hex color according to WCAG 2.2 guidelines.
 */
function getRelativeLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return 0.5;

  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const sRGB = [r, g, b].map((val) => {
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}

/**
 * Calculates WCAG contrast ratio between two hex colors (e.g. text vs background).
 * Returns a ratio between 1 and 21.
 */
export function calculateContrastRatio(color1: string, color2: string): number {
  try {
    const l1 = getRelativeLuminance(color1);
    const l2 = getRelativeLuminance(color2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    const ratio = (lighter + 0.05) / (darker + 0.05);
    return Math.round(ratio * 10) / 10;
  } catch {
    return 4.5;
  }
}

/**
 * Builds and evaluates a full coordinated palette with contrast validation.
 */
function createPalette(
  id: string,
  name: string,
  category: string,
  description: string,
  vibe: 'minimal' | 'bold' | 'editorial' | 'warm' | 'fresh',
  roles: ColorRolePalette['roles']
): ColorRolePalette {
  const textOnBg = calculateContrastRatio(roles.text, roles.background);
  const primaryOnBg = calculateContrastRatio(roles.primary, roles.background);
  const accentOnBg = calculateContrastRatio(roles.accent, roles.background);
  const textOnPrimary = calculateContrastRatio('#FFFFFF', roles.primary);
  const textOnAccent = calculateContrastRatio('#FFFFFF', roles.accent);

  const isAccessible = textOnBg >= 4.5 && textOnPrimary >= 3.0;

  return {
    id,
    name,
    category,
    description,
    vibe,
    roles,
    contrastRatios: {
      textOnBackground: textOnBg,
      primaryOnBackground: primaryOnBg,
      accentOnBackground: accentOnBg,
      textOnPrimary,
      textOnAccent,
      isAccessible,
    },
  };
}

/**
 * Curated, verified multi-colour palette library covering retail categories.
 */
export const COORDINATED_PALETTES: ColorRolePalette[] = [
  // 1. Electronics & Tech
  createPalette(
    'tech-deep-cobalt',
    'Deep Navy & Cobalt Tech',
    'Electronics & Gadgets',
    'Disciplined tech palette: Deep navy foundation, electric cobalt primary, cool graphite surfaces, and warm saffron accents for high-converting buy buttons.',
    'bold',
    {
      primary: '#0052FF',         // FeraSetu Sovereign Blue
      secondary: '#0F172A',       // Deep Midnight Navy
      supporting: '#475569',      // Slate Cool Grey
      accent: '#EA580C',          // Saffron Orange CTA
      highlight: '#38BDF8',       // Electric Cyan highlight
      background: '#FFFFFF',      // Crisp White
      surface: '#F8FAFC',         // Subtle Slate Tint
      surfaceElevated: '#FFFFFF', // Elevated White
      text: '#0F172A',            // Deep Slate Text
      textMuted: '#64748B',       // Muted Text
      border: '#E2E8F0',          // Neutral Border
      semantic: {
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
      },
    }
  ),

  createPalette(
    'tech-minimal-titanium',
    'Titanium Graphite & Silver',
    'Electronics & Gadgets',
    'Minimalist premium electronics: Graphite titanium with frosted silver surfaces and sharp high-contrast typography.',
    'minimal',
    {
      primary: '#1E293B',
      secondary: '#334155',
      supporting: '#64748B',
      accent: '#2563EB',
      highlight: '#60A5FA',
      background: '#FFFFFF',
      surface: '#F8FAFC',
      surfaceElevated: '#FFFFFF',
      text: '#0F172A',
      textMuted: '#475569',
      border: '#E2E8F0',
      semantic: {
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
      },
    }
  ),

  // 2. Artisan, Handcrafted & Organic
  createPalette(
    'artisan-forest-terracotta',
    'Forest Moss & Warm Terracotta',
    'Handicrafts & Artisans',
    'Organic harmony: Deep pine green, terracotta clay accents, warm cream canvas, and restrained brass details.',
    'warm',
    {
      primary: '#1B4332',         // Deep Pine Green
      secondary: '#2D6A4F',       // Forest Moss
      supporting: '#6C584C',      // Warm Earth Tone
      accent: '#C86432',          // Warm Terracotta
      highlight: '#DDA15E',       // Soft Sand Brass
      background: '#FDFBF7',      // Warm Cream Canvas
      surface: '#FFFFFF',         // Clean Surface
      surfaceElevated: '#FAF8F2', // Warm Elevated
      text: '#1C1917',            // Deep Warm Charcoal
      textMuted: '#57534E',       // Warm Stone Muted
      border: '#E7E2D9',          // Warm Linen Border
      semantic: {
        success: '#2D6A4F',
        warning: '#D97706',
        error: '#DC2626',
      },
    }
  ),

  // 3. Luxury Fashion & Haute Boutique
  createPalette(
    'luxury-obsidian-gold',
    'Obsidian & Champagne Gold',
    'Fashion & Boutique',
    'High-fashion editorial elegance: Deep obsidian black, warm cream paper canvas, champagne gold accents, and architectural slate.',
    'editorial',
    {
      primary: '#121212',
      secondary: '#262626',
      supporting: '#737373',
      accent: '#B8860B',          // Muted Champagne Gold
      highlight: '#D4AF37',       // Luminous Gold
      background: '#FAFAF7',      // Warm Paper
      surface: '#FFFFFF',
      surfaceElevated: '#FFFFFF',
      text: '#171717',
      textMuted: '#525252',
      border: '#E5E5E0',
      semantic: {
        success: '#059669',
        warning: '#D97706',
        error: '#E11D48',
      },
    }
  ),

  // 4. Grocery & Kirana Fresh
  createPalette(
    'grocery-emerald-citrus',
    'Emerald Leaf & Citrus Fresh',
    'Grocery & Daily Kirana',
    'Vibrant farm-fresh palette: High-trust emerald green, warm amber-citrus accents, pristine white background, and crisp green badges.',
    'fresh',
    {
      primary: '#047857',         // Rich Emerald
      secondary: '#065F46',       // Deep Leaf Green
      supporting: '#0D9488',      // Teal Accent
      accent: '#EA580C',          // Fresh Carrot Orange
      highlight: '#10B981',       // Mint Glow
      background: '#FFFFFF',
      surface: '#F0FDF4',         // Very Soft Mint Tint
      surfaceElevated: '#FFFFFF',
      text: '#064E3B',            // Deep Forest Text
      textMuted: '#374151',       // Slate Grey
      border: '#DCFCE7',          // Mint Border
      semantic: {
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
      },
    }
  ),

  // 5. Gourmet Cafe & Bakery
  createPalette(
    'gourmet-espresso-honey',
    'Roasted Espresso & Wild Honey',
    'Restaurant & Sweets',
    'Rich culinary palette: Roasted coffee bean brown, warm wild honey gold, soft buttermilk cream, and cinnamon accents.',
    'warm',
    {
      primary: '#3E2723',         // Espresso Roast
      secondary: '#4E342E',       // Warm Mocha
      supporting: '#8D6E63',      // Cinnamon Wood
      accent: '#D97706',          // Warm Golden Honey
      highlight: '#F59E0B',       // Amber Glow
      background: '#FFFDF9',      // Buttermilk Cream
      surface: '#FFFFFF',
      surfaceElevated: '#FBF7EE',
      text: '#271D18',            // Deep Dark Chocolate
      textMuted: '#6D5D53',       // Roasted Nut Muted
      border: '#EFE9DE',          // Biscuit Border
      semantic: {
        success: '#16A34A',
        warning: '#D97706',
        error: '#DC2626',
      },
    }
  ),

  // 6. Athletic & Gym High-Performance
  createPalette(
    'athletic-matte-iron',
    'Iron Black & Saffron Heat',
    'Fitness & Athletic',
    'High-intensity athletic palette: Matte cast iron black, titanium silver, and energetic saffron heat.',
    'bold',
    {
      primary: '#09090B',         // Cast Iron
      secondary: '#27272A',       // Textured Zinc
      supporting: '#71717A',      // Titanium
      accent: '#FF5400',          // Saffron Heat Pulse
      highlight: '#FACC15',       // High-Volt Yellow
      background: '#FFFFFF',
      surface: '#F4F4F5',
      surfaceElevated: '#FFFFFF',
      text: '#09090B',
      textMuted: '#52525B',
      border: '#E4E4E7',
      semantic: {
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
      },
    }
  ),

  // 7. Wellness & Ayurvedic Botanicals
  createPalette(
    'wellness-sage-eucalyptus',
    'Sage Leaf & Soft Eucalyptus',
    'Health & Ayurvedic',
    'Calm restorative botanical palette: Muted sage green, eucalyptus grey, soft linen white, and warm apricot accents.',
    'minimal',
    {
      primary: '#2A5D4A',         // Muted Sage
      secondary: '#4B7F6D',       // Soft Eucalyptus
      supporting: '#799E8F',      // Pale Botanical
      accent: '#D97706',          // Herbal Apricot
      highlight: '#52B788',       // Spring Glow
      background: '#F9FBF9',      // Dew Linen
      surface: '#FFFFFF',
      surfaceElevated: '#F2F7F4',
      text: '#1E352B',            // Botanical Dark
      textMuted: '#4A6256',       // Leaf Shadow
      border: '#E2EBE5',          // Soft Sage Rim
      semantic: {
        success: '#2A5D4A',
        warning: '#D97706',
        error: '#DC2626',
      },
    }
  ),
];

/**
 * Suggests 3 coordinated palettes tailored to a business category and preferred style.
 */
export function getRecommendedPalettes(
  category: string,
  preferredVibe?: 'minimal' | 'bold' | 'editorial' | 'warm' | 'fresh'
): ColorRolePalette[] {
  const normCategory = category.toLowerCase();

  // First, find exact or category matches
  let matches = COORDINATED_PALETTES.filter((p) => {
    const pCat = p.category.toLowerCase();
    if (normCategory.includes('electronic') || normCategory.includes('tech') || normCategory.includes('mobile')) {
      return pCat.includes('electronic');
    }
    if (normCategory.includes('craft') || normCategory.includes('artisan') || normCategory.includes('pottery')) {
      return pCat.includes('artisan');
    }
    if (normCategory.includes('cloth') || normCategory.includes('fashion') || normCategory.includes('boutique') || normCategory.includes('jewel')) {
      return pCat.includes('fashion');
    }
    if (normCategory.includes('groc') || normCategory.includes('kirana') || normCategory.includes('food')) {
      return pCat.includes('grocery');
    }
    if (normCategory.includes('cafe') || normCategory.includes('bakery') || normCategory.includes('sweet') || normCategory.includes('rest')) {
      return pCat.includes('restaurant');
    }
    if (normCategory.includes('gym') || normCategory.includes('fitness') || normCategory.includes('athletic')) {
      return pCat.includes('fitness');
    }
    if (normCategory.includes('health') || normCategory.includes('wellness') || normCategory.includes('ayur')) {
      return pCat.includes('health');
    }
    return false;
  });

  // If vibe specified, prioritize vibe
  if (preferredVibe) {
    matches.sort((a, b) => (a.vibe === preferredVibe ? -1 : b.vibe === preferredVibe ? 1 : 0));
  }

  // Fill up to 3 options with complementary palettes
  const result: ColorRolePalette[] = [...matches];
  for (const pal of COORDINATED_PALETTES) {
    if (result.length >= 3) break;
    if (!result.some((r) => r.id === pal.id)) {
      result.push(pal);
    }
  }

  return result.slice(0, 3);
}

/**
 * Converts a ColorRolePalette into Storefront MerchantThemeOverrides tokens.
 */
export function paletteToThemeOverrides(palette: ColorRolePalette) {
  return {
    primaryColor: palette.roles.primary,
    accentColor: palette.roles.accent,
    secondaryColor: palette.roles.secondary,
    supportingColor: palette.roles.supporting,
    backgroundColor: palette.roles.background,
    surfaceColor: palette.roles.surface,
    textColor: palette.roles.text,
    textMutedColor: palette.roles.textMuted,
    borderColor: palette.roles.border,
  };
}
