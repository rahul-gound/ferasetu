import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateContrastRatio,
  COORDINATED_PALETTES,
  getRecommendedPalettes,
  paletteToThemeOverrides,
} from '../frontend/src/builder/ai/colorSystem.ts';
import {
  runVisualQaAudit,
  applyAutomatedRepairs,
} from '../frontend/src/builder/ai/visualQaEngine.ts';

console.log('\n=============================================================================');
console.log('  RUNNING FERASETU STOREFRONT STUDIO AI COLOUR & VISUAL QA TEST SUITE');
console.log('=============================================================================\n');

test('1. Intelligent Colour System: calculateContrastRatio matches WCAG 2.2 definitions', () => {
  // Black on white is maximum 21:1
  const maxContrast = calculateContrastRatio('#000000', '#FFFFFF');
  assert.ok(maxContrast >= 20.0, 'Black on white must yield near 21:1');

  // White on white is minimum 1:1
  const minContrast = calculateContrastRatio('#FFFFFF', '#FFFFFF');
  assert.equal(minContrast, 1.0, 'Identical colours must yield 1:1');

  // FeraSetu Slate (#0F172A) on pure white (#FFFFFF)
  const slateOnWhite = calculateContrastRatio('#0F172A', '#FFFFFF');
  assert.ok(slateOnWhite >= 15.0, 'Deep slate on white must easily exceed WCAG AA 4.5:1');

  // Saffron Orange (#EA580C) on white
  const saffronOnWhite = calculateContrastRatio('#EA580C', '#FFFFFF');
  assert.ok(saffronOnWhite >= 3.0, 'Saffron on white exceeds 3:1 for large elements');
});

test('2. Intelligent Colour System: All coordinated palettes define complete 10-role structures and pass WCAG', () => {
  assert.ok(COORDINATED_PALETTES.length >= 7, 'Must have palettes across retail categories');

  for (const pal of COORDINATED_PALETTES) {
    assert.ok(pal.id, 'Palette must have ID');
    assert.ok(pal.name, 'Palette must have human-readable name');
    assert.ok(pal.roles.primary, 'Must have primary colour');
    assert.ok(pal.roles.secondary, 'Must have secondary colour');
    assert.ok(pal.roles.supporting, 'Must have supporting colour');
    assert.ok(pal.roles.accent, 'Must have accent colour');
    assert.ok(pal.roles.background, 'Must have background colour');
    assert.ok(pal.roles.surface, 'Must have surface colour');
    assert.ok(pal.roles.text, 'Must have text colour');
    assert.ok(pal.roles.textMuted, 'Must have muted text colour');
    assert.ok(pal.roles.border, 'Must have border colour');
    assert.ok(pal.roles.semantic.success, 'Must have semantic success');
    assert.ok(pal.roles.semantic.warning, 'Must have semantic warning');
    assert.ok(pal.roles.semantic.error, 'Must have semantic error');

    // Verify contrast ratio
    assert.ok(pal.contrastRatios.textOnBackground >= 4.5, `${pal.name} text contrast must meet WCAG AA (>= 4.5:1)`);
    assert.equal(pal.contrastRatios.isAccessible, true, `${pal.name} must be flagged as accessible`);
  }
});

test('3. Intelligent Colour System: getRecommendedPalettes returns 3 curated options for electronics', () => {
  const techPalettes = getRecommendedPalettes('Electronics & Computers', 'bold');
  assert.equal(techPalettes.length, 3, 'Must return exactly 3 coordinated palettes');
  assert.equal(techPalettes[0].category, 'Electronics & Gadgets');

  // Check token conversion
  const tokens = paletteToThemeOverrides(techPalettes[0]);
  assert.equal(tokens.primaryColor, techPalettes[0].roles.primary);
  assert.equal(tokens.accentColor, techPalettes[0].roles.accent);
  assert.equal(tokens.backgroundColor, techPalettes[0].roles.background);
});

test('4. Visual QA Engine: audits viewports and catches low contrast or missing sections', () => {
  // Empty sections
  const emptyReport = runVisualQaAudit([]);
  assert.equal(emptyReport.passed, false);
  assert.ok(emptyReport.issues.some((i) => i.id === 'empty-storefront'));
  assert.equal(emptyReport.viewports.length, 6, 'Must audit across 6 standard viewports');

  // Low contrast simulation
  const badContrastSections = [
    {
      id: 'hero-1',
      type: 'hero',
      variant: 'split',
      enabled: true,
      config: { title: 'Hello Store' },
    },
    {
      id: 'prod-1',
      type: 'product-grid',
      variant: 'grid-4',
      enabled: true,
      config: { title: 'Products' },
    },
  ];

  // Text color #EEEEEE on #FFFFFF is illegible
  const badContrastReport = runVisualQaAudit(badContrastSections, {
    textColor: '#EEEEEE',
    backgroundColor: '#FFFFFF',
    primaryColor: '#FFFF00', // yellow button on white
  });

  assert.equal(badContrastReport.passed, false);
  assert.ok(badContrastReport.issues.some((i) => i.id === 'contrast-body-text'));
  assert.ok(badContrastReport.issues.some((i) => i.id === 'contrast-primary-button'));
});

test('5. Visual QA Engine: applyAutomatedRepairs safely resolves contrast and missing essentials', () => {
  const sectionsWithIssues = [
    {
      id: 'banner-1',
      type: 'announcement',
      variant: 'minimal',
      enabled: true,
      config: { text: 'Sale' },
    },
  ];

  const report = runVisualQaAudit(sectionsWithIssues, {
    textColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    primaryColor: '#FFFFFF',
  });

  const repaired = applyAutomatedRepairs(sectionsWithIssues, { textColor: '#E2E8F0', backgroundColor: '#FFFFFF', primaryColor: '#FFFFFF' }, report, 'Himmat Store');

  assert.ok(repaired.fixesApplied.length >= 2, 'Must apply targeted repairs');
  assert.equal(repaired.updatedOverrides.textColor, '#0F172A', 'Text color must be restored to high-contrast slate');
  assert.equal(repaired.updatedOverrides.primaryColor, '#0052FF', 'Primary color must be restored to Sovereign Blue');

  // Must have added a Hero section
  assert.ok(repaired.updatedSections.some((s) => s.type === 'hero'), 'Must insert missing Hero section');
  // Must have added a Product Grid
  assert.ok(repaired.updatedSections.some((s) => s.type === 'product-grid'), 'Must insert missing Product Grid section');

  // Run audit again on repaired state
  const repairedReport = runVisualQaAudit(repaired.updatedSections, repaired.updatedOverrides, 1);
  assert.equal(repairedReport.passed, true, 'Repaired storefront must pass Visual QA');
  assert.ok(repairedReport.overallScore >= 90, 'Score should be >= 90');
});
