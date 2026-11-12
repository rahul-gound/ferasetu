import type { Dictionary } from './types';
import en from './en';
import { CORE_TRANSLATIONS } from './core';

const dict: Dictionary = {
  ...en,
  ...CORE_TRANSLATIONS.sa,
  "seo.landing.title": "FeraSetu — शुल्कविना स्वकीयम् अन्तर्जालविपणिम् आरभध्वम्",
  "seo.landing.desc": "FeraSetu माध्यमेन स्वकीयम् आपणम् ० रूप्यकैः आरभध्वम्। साक्षात् वित्तकोषे धनप्राप्तिः, ०% मञ्चशुल्कं तथा च सुरक्षितं ग्राहकसम्बन्धम्।"
};

export default dict;
