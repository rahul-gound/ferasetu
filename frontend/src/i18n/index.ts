import type { Dictionary } from './types';
import en from './en';

const dictionaryImports: Record<string, () => Promise<{ default: Dictionary }>> = {
  // Global English
  en: () => import('./en'),

  // European Union (EU) Languages
  fr: () => import('./fr'),
  de: () => import('./de'),
  es: () => import('./es'),
  it: () => import('./it'),
  nl: () => import('./nl'),
  pt: () => import('./pt'),
  pl: () => import('./pl'),
  sv: () => import('./sv'),
  da: () => import('./da'),
  fi: () => import('./fi'),
  el: () => import('./el'),
  cs: () => import('./cs'),
  ro: () => import('./ro'),
  hu: () => import('./hu'),
  ga: () => import('./ga'),

  // Indian Languages (22)
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
  ta: () => import('./ta'),
  te: () => import('./te'),
  ur: () => import('./ur'),
  sd: () => import('./sd')
};

export async function loadDictionary(langCode: string): Promise<Dictionary> {
  const load = dictionaryImports[langCode];
  if (!load) return fallbackDictionary;
  const module = await load();
  return module.default;
}

export const fallbackDictionary: Dictionary = en;

export * from './config';
export * from './types';
