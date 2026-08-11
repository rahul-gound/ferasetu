export interface LanguageConfig {
  code: string;
  nativeName: string;
  locale: string;
  enabled: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  { code: 'en', nativeName: 'English', locale: 'en-IN', enabled: true },
  { code: 'hi', nativeName: 'हिन्दी', locale: 'hi-IN', enabled: true },
  { code: 'mr', nativeName: 'मराठी', locale: 'mr-IN', enabled: true },
  { code: 'gu', nativeName: 'ગુજરાતી', locale: 'gu-IN', enabled: true },
  { code: 'bn', nativeName: 'বাংলা', locale: 'bn-IN', enabled: false },
  { code: 'ta', nativeName: 'தமிழ்', locale: 'ta-IN', enabled: false },
  { code: 'te', nativeName: 'తెలుగు', locale: 'te-IN', enabled: false },
  { code: 'kn', nativeName: 'ಕನ್ನಡ', locale: 'kn-IN', enabled: false },
  { code: 'ml', nativeName: 'മലയാളം', locale: 'ml-IN', enabled: false },
  { code: 'pa', nativeName: 'ਪੰਜਾਬੀ', locale: 'pa-IN', enabled: false }
];

export const ENABLED_LANGUAGES = SUPPORTED_LANGUAGES.filter(l => l.enabled);

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
