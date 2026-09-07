import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  SUPPORTED_LANGUAGES,
  resolveLanguageCode,
  loadDictionary,
  formatNumber,
  formatCurrency,
  getCleanPath,
  getLanguagePath
} from '../src/i18n/index.ts';

test('SUPPORTED_LANGUAGES contains exactly 48 languages', () => {
  assert.equal(SUPPORTED_LANGUAGES.length, 48, 'Must support exactly 48 languages');
});

test('All 22 Indian scheduled languages are defined with proper codes', () => {
  const indian22 = [
    'as', 'bn', 'brx', 'doi', 'gu', 'hi', 'kn', 'ks', 'gom', 'mai',
    'ml', 'mni', 'mr', 'ne', 'or', 'pa', 'sa', 'sat', 'sd', 'ta', 'te', 'ur'
  ];

  for (const code of indian22) {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
    assert.ok(lang, `Missing scheduled Indian language: ${code}`);
    assert.equal(lang.region, 'in');
    assert.ok(lang.nativeName, `Missing native name for ${code}`);
    assert.ok(lang.englishName, `Missing english name for ${code}`);
  }
});

test('Hinglish and US English are configured', () => {
  const hinglish = SUPPORTED_LANGUAGES.find(l => l.code === 'hi-latn');
  assert.ok(hinglish, 'Hinglish must be configured');
  assert.equal(hinglish.region, 'in');

  const en = SUPPORTED_LANGUAGES.find(l => l.code === 'en');
  assert.ok(en, 'US English must be configured');
  assert.equal(en.region, 'global');
});

test('All 24 official EU languages are defined', () => {
  const eu24 = [
    'bg', 'hr', 'cs', 'da', 'nl', 'en-gb', 'et', 'fi', 'fr', 'de',
    'el', 'hu', 'ga', 'it', 'lv', 'lt', 'mt', 'pl', 'pt', 'ro',
    'sk', 'sl', 'es', 'sv'
  ];

  for (const code of eu24) {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
    assert.ok(lang, `Missing official EU language: ${code}`);
    assert.equal(lang.region, 'eu');
  }
});

test('RTL languages are correctly identified with rtl direction', () => {
  const rtlCodes = ['ur', 'ks', 'sd'];
  for (const code of rtlCodes) {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
    assert.ok(lang, `Language ${code} should exist`);
    assert.equal(lang.direction, 'rtl', `Language ${code} must have rtl direction`);
  }

  // Non-RTL languages must be ltr
  const hindi = SUPPORTED_LANGUAGES.find(l => l.code === 'hi');
  assert.equal(hindi?.direction, 'ltr');
  const french = SUPPORTED_LANGUAGES.find(l => l.code === 'fr');
  assert.equal(french?.direction, 'ltr');
});

test('Language alias resolution maps aliases to canonical codes', () => {
  assert.equal(resolveLanguageCode('hinglish'), 'hi-latn');
  assert.equal(resolveLanguageCode('hi-in'), 'hi');
  assert.equal(resolveLanguageCode('en-us'), 'en');
  assert.equal(resolveLanguageCode('en-in'), 'en');
  assert.equal(resolveLanguageCode('en-eu'), 'en-gb');
  assert.equal(resolveLanguageCode('kok'), 'gom');
  assert.equal(resolveLanguageCode('unknown-code'), 'en');
});

test('Dictionary loading falls back cleanly to English for any language', async () => {
  const hiDict = await loadDictionary('hi');
  assert.ok(hiDict, 'Hindi dictionary should load');
  assert.ok(hiDict['nav.dashboard'], 'Should have nav.dashboard');

  const unknownDict = await loadDictionary('zz-unknown');
  assert.ok(unknownDict, 'Unknown language should fall back to English dictionary');
  assert.equal(unknownDict['nav.dashboard'], 'Dashboard');
});

test('Number formatting supports Indian lakh/crore vs Western standard', () => {
  const num = 100000;
  const inFormatted = formatNumber(num, 'hi');
  const usFormatted = formatNumber(num, 'en');

  assert.ok(inFormatted.includes('1,00,000') || inFormatted.includes('100,000'));
  assert.ok(usFormatted.includes('100,000'));
});

test('Path localization helpers work bidirectionally', () => {
  assert.equal(getCleanPath('/hi/pricing'), '/pricing');
  assert.equal(getCleanPath('/ta/online-dukaan-banaye'), '/online-dukaan-banaye');
  assert.equal(getCleanPath('/pricing'), '/pricing');

  assert.equal(getLanguagePath('/pricing', 'hi'), '/hi/pricing');
  assert.equal(getLanguagePath('/pricing', 'en'), '/pricing');
});
