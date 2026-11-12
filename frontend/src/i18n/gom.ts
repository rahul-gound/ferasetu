import type { Dictionary } from './types';
import en from './en';
import { CORE_TRANSLATIONS } from './core';

const dict: Dictionary = {
  ...en,
  ...CORE_TRANSLATIONS.gom,
  "seo.landing.title": "FeraSetu — 0% कमिशनार तुमचें स्वताचे ऑनलायन दुकान",
  "seo.landing.desc": "FeraSetu सांगातान तुमचें ऑनलायन दुकान ₹0 त सुरू करात। थेट बँक खात्यांत UPI पेमेंट, 0% प्लॅटफॉर्म कमिशन आनी सुरक्षीत WhatsApp ऑर्डर्स।"
};

export default dict;
