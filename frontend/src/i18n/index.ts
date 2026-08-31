import type { Dictionary } from './types';
import en from './en';

const dictionaryImports: Record<string, () => Promise<{ default: Dictionary }>> = {
  en: () => import('./en'),
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
