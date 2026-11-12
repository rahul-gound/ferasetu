import type { Dictionary } from './types';
import en from './en';
import { CORE_TRANSLATIONS } from './core';

const dict: Dictionary = {
  ...en,
  ...CORE_TRANSLATIONS.as,
  "seo.landing.title": "FeraSetu — ০% কমিছনত আপোনাৰ নিজৰ অনলাইন দোকান",
  "seo.landing.desc": "FeraSetu-ৰ সৈতে আপোনাৰ নিজৰ ডিজিটেল দোকান ০ টকাত আৰম্ভ কৰক। পোনপটীয়া বেংক একাউন্টত UPI ধন পৰিশোধ, ০% প্লেটফৰ্ম কমিছন আৰু সুৰক্ষিত ডাট়া।"
};

export default dict;
