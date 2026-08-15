export interface LanguageConfig {
  code: string;
  nativeName: string;
  locale: string;
  status: 'published' | 'draft';
  direction: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  { code: 'en', nativeName: 'English', locale: 'en-IN', status: 'published', direction: 'ltr' },
  { code: 'hg', nativeName: 'Hinglish', locale: 'hi-Latn', status: 'published', direction: 'ltr' },
  { code: 'hi', nativeName: 'हिन्दी', locale: 'hi-IN', status: 'published', direction: 'ltr' },
  { code: 'mr', nativeName: 'मराठी', locale: 'mr-IN', status: 'published', direction: 'ltr' },
  { code: 'gu', nativeName: 'ગુજરાતી', locale: 'gu-IN', status: 'published', direction: 'ltr' },
  { code: 'as', nativeName: 'অসমীয়া', locale: 'as-IN', status: 'draft', direction: 'ltr' },
  { code: 'bn', nativeName: 'বাংলা', locale: 'bn-IN', status: 'draft', direction: 'ltr' },
  { code: 'brx', nativeName: 'बड़ो', locale: 'brx-IN', status: 'draft', direction: 'ltr' },
  { code: 'doi', nativeName: 'डोगरी', locale: 'doi-IN', status: 'draft', direction: 'ltr' },
  { code: 'kn', nativeName: 'ಕನ್ನಡ', locale: 'kn-IN', status: 'draft', direction: 'ltr' },
  { code: 'ks', nativeName: 'کأشُر', locale: 'ks-IN', status: 'draft', direction: 'rtl' },
  { code: 'gom', nativeName: 'कोंकणी', locale: 'kok-IN', status: 'draft', direction: 'ltr' },
  { code: 'mai', nativeName: 'मैथिली', locale: 'mai-IN', status: 'draft', direction: 'ltr' },
  { code: 'ml', nativeName: 'മലയാളം', locale: 'ml-IN', status: 'draft', direction: 'ltr' },
  { code: 'mni', nativeName: 'ꯃꯤꯇꯩꯂꯣꯟ', locale: 'mni-IN', status: 'draft', direction: 'ltr' },
  { code: 'ne', nativeName: 'नेपाली', locale: 'ne-IN', status: 'draft', direction: 'ltr' },
  { code: 'or', nativeName: 'ଓଡ଼ିଆ', locale: 'or-IN', status: 'draft', direction: 'ltr' },
  { code: 'pa', nativeName: 'ਪੰਜਾਬੀ', locale: 'pa-IN', status: 'draft', direction: 'ltr' },
  { code: 'sa', nativeName: 'संस्कृतम्', locale: 'sa-IN', status: 'draft', direction: 'ltr' },
  { code: 'sat', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', locale: 'sat-IN', status: 'draft', direction: 'ltr' },
  { code: 'sd', nativeName: 'سنڌي', locale: 'sd-IN', status: 'draft', direction: 'rtl' },
  { code: 'ta', nativeName: 'தமிழ்', locale: 'ta-IN', status: 'draft', direction: 'ltr' },
  { code: 'te', nativeName: 'తెలుగు', locale: 'te-IN', status: 'draft', direction: 'ltr' },
  { code: 'ur', nativeName: 'اردو', locale: 'ur-IN', status: 'draft', direction: 'rtl' }
];

export const ENABLED_LANGUAGES = SUPPORTED_LANGUAGES;


export const PUBLIC_ROUTES = [
  '/',
  '/pricing',
  '/online-dukaan-banaye',
  '/free-online-store',
  '/shopify-alternative-india',
  '/kirana-store-online',
  '/terms',
  '/privacy'
];

export const getLanguagePath = (path: string, langCode: string) => {
  // Removes existing language prefix if present, and prepends new language prefix.
  // Example: ('/hi/pricing', 'mr') -> '/mr/pricing'
  // Example: ('/pricing', 'hi') -> '/hi/pricing'
  // Example: ('/hi/pricing', 'en') -> '/pricing'
  
  let cleanPath = path;
  
  for (const lang of SUPPORTED_LANGUAGES) {
    if (path === `/${lang.code}`) {
      cleanPath = '/';
      break;
    }
    if (path.startsWith(`/${lang.code}/`)) {
      cleanPath = path.substring(lang.code.length + 1);
      break;
    }
  }
  
  if (langCode === 'en') {
    return cleanPath;
  }
  
  return cleanPath === '/' ? `/${langCode}/` : `/${langCode}${cleanPath}`;
};
