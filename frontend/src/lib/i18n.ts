// src/lib/i18n.ts

export const SUPPORTED_LOCALES = ['en', 'fr', 'de', 'es', 'hi'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export const EU_COUNTRY_CODES = [
  'FR', 'DE', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'IE', 'FI',
  'GR', 'LU', 'CY', 'MT', 'SK', 'SI', 'EE', 'LV', 'LT'
] as const;

export const LOCALE_METADATA: Record<
  Locale,
  { name: string; nativeName: string; dir: 'ltr' | 'rtl'; defaultCountry: string }
> = {
  en: { name: 'English', nativeName: 'English', dir: 'ltr', defaultCountry: 'US' },
  fr: { name: 'French', nativeName: 'Français', dir: 'ltr', defaultCountry: 'FR' },
  de: { name: 'German', nativeName: 'Deutsch', dir: 'ltr', defaultCountry: 'DE' },
  es: { name: 'Spanish', nativeName: 'Español', dir: 'ltr', defaultCountry: 'ES' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr', defaultCountry: 'IN' }
};

export async function getDictionary(locale: Locale) {
  try {
    switch (locale) {
      case 'fr':
        return (await import('../dictionaries/fr.json')).default;
      case 'de':
        return (await import('../dictionaries/de.json')).default;
      case 'es':
        return (await import('../dictionaries/es.json')).default;
      case 'hi':
        return (await import('../dictionaries/hi.json')).default;
      case 'en':
      default:
        return (await import('../dictionaries/en.json')).default;
    }
  } catch (error) {
    console.error(`Failed to load dictionary for locale "${locale}", falling back to "en":`, error);
    return (await import('../dictionaries/en.json')).default;
  }
}
