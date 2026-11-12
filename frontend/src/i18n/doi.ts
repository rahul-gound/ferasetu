import type { Dictionary } from './types';
import en from './en';
import { CORE_TRANSLATIONS } from './core';

const dict: Dictionary = {
  ...en,
  ...CORE_TRANSLATIONS.doi,
  "seo.landing.title": "FeraSetu — बिना कमेंशन गी अपनी आनलाइन दुकान खोल्हो",
  "seo.landing.desc": "FeraSetu दे कन्ने अपनी आनलाइन दुकान ₹0 च शुरू करो। सीधे बैंक खाते च UPI पेमेंट, 0% प्लेटफार्म कमेंशन ते WhatsApp आर्डरें दी सुविधा।"
};

export default dict;
