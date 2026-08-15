import type { Dictionary, TranslationKey } from './types';
import enDict from './en';
import { SUPPORTED_LANGUAGES, ENABLED_LANGUAGES } from './config';

export const loadDictionary = async (langCode: string): Promise<Dictionary> => {
  switch (langCode) {
    case 'en': return (await import('./en')).default;
    case 'hg': return (await import('./hg')).default;
    case 'hi': return (await import('./hi')).default;
    case 'mr': return (await import('./mr')).default;
    case 'gu': return (await import('./gu')).default;
    case 'as': return (await import('./as')).default;
    case 'bn': return (await import('./bn')).default;
    case 'brx': return (await import('./brx')).default;
    case 'doi': return (await import('./doi')).default;
    case 'kn': return (await import('./kn')).default;
    case 'ks': return (await import('./ks')).default;
    case 'gom': return (await import('./gom')).default;
    case 'mai': return (await import('./mai')).default;
    case 'ml': return (await import('./ml')).default;
    case 'mni': return (await import('./mni')).default;
    case 'ne': return (await import('./ne')).default;
    case 'or': return (await import('./or')).default;
    case 'pa': return (await import('./pa')).default;
    case 'sa': return (await import('./sa')).default;
    case 'sat': return (await import('./sat')).default;
    case 'sd': return (await import('./sd')).default;
    case 'ta': return (await import('./ta')).default;
    case 'te': return (await import('./te')).default;
    case 'ur': return (await import('./ur')).default;
    default: return enDict;
  }
};

export const fallbackDictionary: Dictionary = enDict;

export * from './config';
export * from './types';
