import en from './en';
import hi from './hi';
import mr from './mr';
import gu from './gu';
import { SUPPORTED_LANGUAGES } from './config';

const dictionaries: Record<string, Record<string, string>> = {
  en,
  hi,
  mr,
  gu
};

export function t(key: string, langCode: string): string {
  // If the language is supported and enabled, look for the translation
  const langConfig = SUPPORTED_LANGUAGES.find(l => l.code === langCode);
  if (langConfig && langConfig.enabled && dictionaries[langCode] && dictionaries[langCode][key]) {
    return dictionaries[langCode][key];
  }
  
  // Fallback to English
  return dictionaries.en[key] || key;
}

export * from './config';
