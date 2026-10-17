import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveStorefrontTheme } from '../src/storefront/theme/themeResolver.ts';
import { THEME_REGISTRY, THEMES_LIST, THEME_PRESETS } from '../src/storefront/theme/themeDefinitions.ts';
import type { ThemeId } from '../src/storefront/theme/themeTypes.ts';

test('1. THEME_REGISTRY contains all 9 production themes', () => {
  const expectedThemes: ThemeId[] = [
    'market',
    'atelier',
    'mono',
    'bold',
    'artisan',
    'studio',
    'home',
    'dine',
    'electronic',
  ];

  for (const id of expectedThemes) {
    assert.ok(THEME_REGISTRY[id], `Missing registered theme: ${id}`);
    assert.equal(THEME_REGISTRY[id].id, id);
    assert.ok(THEME_REGISTRY[id].name, `Theme ${id} must have a name`);
    assert.ok(THEME_REGISTRY[id].colors.primary, `Theme ${id} must have primary color`);
    assert.ok(THEME_REGISTRY[id].defaultSections.length > 0, `Theme ${id} must have default sections`);
  }
});

test('2. THEME_PRESETS in DesignPanel matches registered themes', () => {
  assert.equal(THEME_PRESETS.length, 9, 'DesignPanel must feature all 9 theme presets');

  for (const preset of THEME_PRESETS) {
    assert.ok(THEME_REGISTRY[preset.id as ThemeId], `Preset ${preset.id} must exist in THEME_REGISTRY`);
    const themeDef = THEME_REGISTRY[preset.id as ThemeId];
    assert.equal(preset.color, themeDef.colors.primary, `Preset color for ${preset.id} must match theme primary color`);
  }
});

test('3. resolveStorefrontTheme resolves themes from string IDs', () => {
  const themesToTest: ThemeId[] = ['atelier', 'mono', 'bold', 'artisan', 'studio', 'home', 'dine', 'electronic', 'market'];

  for (const id of themesToTest) {
    const resolved = resolveStorefrontTheme(id);
    assert.equal(resolved.id, id);
    assert.equal(resolved.name, THEME_REGISTRY[id].name);
    assert.equal(resolved.cssVariables['--theme-color-primary'], THEME_REGISTRY[id].colors.primary);
  }
});

test('4. resolveStorefrontTheme resolves theme aliases safely', () => {
  const aliases: Record<string, ThemeId> = {
    'mono-electronic': 'electronic',
    'mono_electronic': 'electronic',
    'tech': 'electronic',
    'electronics': 'electronic',
    'general': 'market',
    'default': 'market',
  };

  for (const [alias, expected] of Object.entries(aliases)) {
    const resolved = resolveStorefrontTheme(alias);
    assert.equal(resolved.id, expected, `Alias ${alias} should resolve to ${expected}`);
  }
});

test('5. resolveStorefrontTheme handles object inputs (e.g. from database / draft)', () => {
  const fromObjectWithId = resolveStorefrontTheme({ id: 'atelier' });
  assert.equal(fromObjectWithId.id, 'atelier');
  assert.equal(fromObjectWithId.heroVariant, 'editorial');

  const fromObjectWithTemplate = resolveStorefrontTheme({ template: 'bold' });
  assert.equal(fromObjectWithTemplate.id, 'bold');
  assert.equal(fromObjectWithTemplate.heroVariant, 'product-focused');

  const fromObjectWithThemeField = resolveStorefrontTheme({ theme: 'artisan' });
  assert.equal(fromObjectWithThemeField.id, 'artisan');
  assert.equal(fromObjectWithThemeField.heroVariant, 'artisan-story');
});

test('6. resolveStorefrontTheme extracts overrides embedded in theme object or direct overrides', () => {
  const resolvedWithDirectOverrides = resolveStorefrontTheme('atelier', {
    primaryColor: '#ff0055',
  });
  assert.equal(resolvedWithDirectOverrides.colors.primary, '#ff0055');
  assert.equal(resolvedWithDirectOverrides.cssVariables['--theme-color-primary'], '#ff0055');

  const resolvedWithEmbeddedOverrides = resolveStorefrontTheme({
    id: 'atelier',
    overrides: { primaryColor: '#00cc88' },
  });
  assert.equal(resolvedWithEmbeddedOverrides.colors.primary, '#00cc88');
  assert.equal(resolvedWithEmbeddedOverrides.cssVariables['--theme-color-primary'], '#00cc88');
});

test('7. Switching theme safely updates default sections and CSS variables', () => {
  const marketTheme = resolveStorefrontTheme('market');
  assert.equal(marketTheme.id, 'market');
  assert.equal(marketTheme.heroVariant, 'commerce-banner');
  assert.equal(marketTheme.cssVariables['--theme-color-primary'], '#0F172A');

  const atelierTheme = resolveStorefrontTheme('atelier');
  assert.equal(atelierTheme.id, 'atelier');
  assert.equal(atelierTheme.heroVariant, 'editorial');
  assert.equal(atelierTheme.cssVariables['--theme-color-primary'], '#121212');
  assert.equal(atelierTheme.cssVariables['--theme-color-accent'], '#D4AF37');

  const monoTheme = resolveStorefrontTheme('mono');
  assert.equal(monoTheme.id, 'mono');
  assert.equal(monoTheme.heroVariant, 'minimal');
  assert.equal(monoTheme.radius.card, '0px');
});
