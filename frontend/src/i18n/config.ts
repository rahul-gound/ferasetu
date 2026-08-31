export interface LanguageConfig {
  code: string;
  nativeName: string;
  englishName: string;
  locale: string;
  status: 'published';
  direction: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  { code: 'en', nativeName: 'English', englishName: 'English', locale: 'en-IN', status: 'published', direction: 'ltr' },
  { code: 'as', nativeName: 'অসমীয়া', englishName: 'Assamese', locale: 'as-IN', status: 'published', direction: 'ltr' },
  { code: 'bn', nativeName: 'বাংলা', englishName: 'Bengali', locale: 'bn-IN', status: 'published', direction: 'ltr' },
  { code: 'brx', nativeName: 'बड़ो', englishName: 'Bodo', locale: 'brx-IN', status: 'published', direction: 'ltr' },
  { code: 'doi', nativeName: 'डोगरी', englishName: 'Dogri', locale: 'doi-IN', status: 'published', direction: 'ltr' },
  { code: 'gu', nativeName: 'ગુજરાતી', englishName: 'Gujarati', locale: 'gu-IN', status: 'published', direction: 'ltr' },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', locale: 'hi-IN', status: 'published', direction: 'ltr' },
  { code: 'kn', nativeName: 'ಕನ್ನಡ', englishName: 'Kannada', locale: 'kn-IN', status: 'published', direction: 'ltr' },
  { code: 'ks', nativeName: 'کٲشُر', englishName: 'Kashmiri', locale: 'ks-IN', status: 'published', direction: 'rtl' },
  { code: 'gom', nativeName: 'कोंकणी', englishName: 'Konkani', locale: 'kok-IN', status: 'published', direction: 'ltr' },
  { code: 'mai', nativeName: 'मैथिली', englishName: 'Maithili', locale: 'mai-IN', status: 'published', direction: 'ltr' },
  { code: 'ml', nativeName: 'മലയാളം', englishName: 'Malayalam', locale: 'ml-IN', status: 'published', direction: 'ltr' },
  { code: 'mni', nativeName: 'ꯃꯤꯇꯩꯂꯣꯟ', englishName: 'Manipuri', locale: 'mni-IN', status: 'published', direction: 'ltr' },
  { code: 'mr', nativeName: 'मराठी', englishName: 'Marathi', locale: 'mr-IN', status: 'published', direction: 'ltr' },
  { code: 'ne', nativeName: 'नेपाली', englishName: 'Nepali', locale: 'ne-IN', status: 'published', direction: 'ltr' },
  { code: 'or', nativeName: 'ଓଡ଼ିଆ', englishName: 'Odia', locale: 'or-IN', status: 'published', direction: 'ltr' },
  { code: 'pa', nativeName: 'ਪੰਜਾਬੀ', englishName: 'Punjabi', locale: 'pa-IN', status: 'published', direction: 'ltr' },
  { code: 'sa', nativeName: 'संस्कृतम्', englishName: 'Sanskrit', locale: 'sa-IN', status: 'published', direction: 'ltr' },
  { code: 'ta', nativeName: 'தமிழ்', englishName: 'Tamil', locale: 'ta-IN', status: 'published', direction: 'ltr' },
  { code: 'te', nativeName: 'తెలుగు', englishName: 'Telugu', locale: 'te-IN', status: 'published', direction: 'ltr' },
  { code: 'ur', nativeName: 'اردو', englishName: 'Urdu', locale: 'ur-IN', status: 'published', direction: 'rtl' },
  { code: 'sd', nativeName: 'سنڌي', englishName: 'Sindhi', locale: 'sd-IN', status: 'published', direction: 'rtl' }
];

export const ENABLED_LANGUAGES = SUPPORTED_LANGUAGES;

export const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/pricing',
  '/online-dukaan-banaye',
  '/free-online-store',
  '/shopify-alternative-india',
  '/kirana-store-online',
  '/terms',
  '/privacy'
];

export function getCleanPath(path: string): string {
  for (const language of SUPPORTED_LANGUAGES) {
    if (path === `/${language.code}`) return '/';
    if (path.startsWith(`/${language.code}/`)) {
      return path.substring(language.code.length + 1) || '/';
    }
  }
  return path;
}

export function getLanguagePath(path: string, langCode: string): string {
  const cleanPath = getCleanPath(path);
  if (langCode === 'en') return cleanPath;
  return cleanPath === '/' ? `/${langCode}` : `/${langCode}${cleanPath}`;
}
