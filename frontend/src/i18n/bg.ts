import type { Dictionary } from './types';
import en from './en';
import { CORE_TRANSLATIONS } from './core';

const dict: Dictionary = {
  ...en,
  ...(CORE_TRANSLATIONS['bg'] || {})
};

export default dict;
