import type { Dictionary } from './types';
import en from './en';
import { resolveLanguageCode } from './config';

const dictionaryImports: Record<string, () => Promise<{ default: Dictionary }>> = {
  // Global / US Primary (1)
  en: () => import('./en'),

  // Hinglish (1)
  'hi-latn': () => import('./hi-latn'),

  // All 22 Scheduled Indian Languages (22)
  as: () => import('./as'),
  bn: () => import('./bn'),
  brx: () => import('./brx'),
  doi: () => import('./doi'),
  gu: () => import('./gu'),
  hi: () => import('./hi'),
  kn: () => import('./kn'),
  ks: () => import('./ks'),
  gom: () => import('./gom'),
  mai: () => import('./mai'),
  ml: () => import('./ml'),
  mni: () => import('./mni'),
  mr: () => import('./mr'),
  ne: () => import('./ne'),
  or: () => import('./or'),
  pa: () => import('./pa'),
  sa: () => import('./sa'),
  sat: () => import('./sat'),
  sd: () => import('./sd'),
  ta: () => import('./ta'),
  te: () => import('./te'),
  ur: () => import('./ur'),

  // All 24 Official European Union (EU) Languages (24)
  bg: () => import('./bg'),
  hr: () => import('./hr'),
  cs: () => import('./cs'),
  da: () => import('./da'),
  nl: () => import('./nl'),
  'en-gb': () => import('./en-gb'),
  et: () => import('./et'),
  fi: () => import('./fi'),
  fr: () => import('./fr'),
  de: () => import('./de'),
  el: () => import('./el'),
  hu: () => import('./hu'),
  ga: () => import('./ga'),
  it: () => import('./it'),
  lv: () => import('./lv'),
  lt: () => import('./lt'),
  mt: () => import('./mt'),
  pl: () => import('./pl'),
  pt: () => import('./pt'),
  ro: () => import('./ro'),
  sk: () => import('./sk'),
  sl: () => import('./sl'),
  es: () => import('./es'),
  sv: () => import('./sv')
};

export async function loadDictionary(langCode: string): Promise<Dictionary> {
  const normalizedCode = resolveLanguageCode(langCode);
  const load = dictionaryImports[normalizedCode] || dictionaryImports[langCode];
  if (!load) return fallbackDictionary;
  try {
    const module = await load();
    return module.default;
  } catch (err) {
    console.warn(`Failed to load dictionary for ${langCode} (${normalizedCode}), using English fallback:`, err);
    return fallbackDictionary;
  }
}

export const fallbackDictionary: Dictionary = en;

export * from './config';
export * from './types';
export * from './formatters';

