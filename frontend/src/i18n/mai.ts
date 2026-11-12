import type { Dictionary } from './types';
import en from './en';
import { CORE_TRANSLATIONS } from './core';

const dict: Dictionary = {
  ...en,
  ...CORE_TRANSLATIONS.mai,
  "seo.landing.title": "FeraSetu — बिना कोनो कमीशनक अपन अनलाइन दोकान",
  "seo.landing.desc": "FeraSetu सँ अपन अनलाइन दोकान ₹0 मे शुरू करू। सोझे बैंक खाता मे UPI भुक्तान, 0% मंच कमीशन आ WhatsApp पर सोझे आर्डरक सुविधा।"
};

export default dict;
