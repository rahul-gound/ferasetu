import type { Dictionary } from './types';
import en from './en';
import { CORE_TRANSLATIONS } from './core';

const dict: Dictionary = {
  ...en,
  ...CORE_TRANSLATIONS.ne,
  "seo.landing.title": "FeraSetu — ०% कमिसनमा तपाईंको आफ्नै अनलाइन पसल",
  "seo.landing.desc": "FeraSetu मार्फत आफ्नो अनलाइन स्टोर ० रुपैयाँमा सुरु गर्नुहोस्। सिधै बैंक खातामा भुक्तानी, ०% प्लेटफर्म कमिसन र सजिलो WhatsApp अर्डर सुविधा।"
};

export default dict;
