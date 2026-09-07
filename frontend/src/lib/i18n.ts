// src/lib/i18n.ts - Central Localization Re-export
export * from '../i18n';
export { loadDictionary as getDictionary } from '../i18n';

export const EU_COUNTRY_CODES = [
  'FR', 'DE', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'IE', 'FI',
  'GR', 'LU', 'CY', 'MT', 'SK', 'SI', 'EE', 'LV', 'LT', 'BG',
  'HR', 'CZ', 'DK', 'HU', 'PL', 'RO', 'SE'
] as const;

export const SUPPORTED_LOCALES = [
  'en', 'hi', 'fr', 'de', 'es', 'it', 'nl', 'pt', 'pl', 'sv',
  'da', 'fi', 'el', 'cs', 'ro', 'hu', 'ga', 'bg', 'hr', 'et',
  'lv', 'lt', 'mt', 'sk', 'sl', 'as', 'bn', 'brx', 'doi', 'gu',
  'kn', 'ks', 'gom', 'mai', 'ml', 'mni', 'mr', 'ne', 'or', 'pa',
  'sa', 'sat', 'sd', 'ta', 'te', 'ur', 'hi-latn', 'en-gb'
] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
