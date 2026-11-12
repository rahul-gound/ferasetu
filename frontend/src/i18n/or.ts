import type { Dictionary } from './types';
import en from './en';
import { CORE_TRANSLATIONS } from './core';

const dict: Dictionary = {
  ...en,
  ...CORE_TRANSLATIONS.or,
  "seo.landing.title": "FeraSetu — ବିନା କମିଶନରେ ଆପଣଙ୍କ ନିଜର ଅନଲାଇନ୍ ଦୋକାନ",
  "seo.landing.desc": "FeraSetu ସହିତ ଆପଣଙ୍କର ଅନଲାଇନ୍ ଷ୍ଟୋର୍ ₹0 ରେ ଆରମ୍ଭ କରନ୍ତୁ। ସିଧାସଳଖ ବ୍ୟାଙ୍କ ଖାତାରେ UPI ପେମେଣ୍ଟ, 0% କମିଶନ୍ ଏବଂ WhatsApp ଅର୍ଡର ସୁବିଧା।"
};

export default dict;
