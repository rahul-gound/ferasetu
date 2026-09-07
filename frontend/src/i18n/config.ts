export interface LanguageConfig {
  code: string;
  nativeName: string;
  englishName: string;
  locale: string;
  status: 'published';
  direction: 'ltr' | 'rtl';
  region: 'eu' | 'in' | 'global';
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  // Global / US Primary (1)
  { code: 'en', nativeName: 'English', englishName: 'English (US)', locale: 'en-US', status: 'published', direction: 'ltr', region: 'global', flag: '🇺🇸' },

  // Hinglish (1)
  { code: 'hi-latn', nativeName: 'Hinglish', englishName: 'Hinglish', locale: 'hi-Latn-IN', status: 'published', direction: 'ltr', region: 'in', flag: '🇮🇳' },

  // All 22 Scheduled Indian Languages (Eighth Schedule of the Constitution of India) (22)
  { code: 'as', nativeName: 'অসমীয়া', englishName: 'Assamese', locale: 'as-IN', status: 'published', direction: 'ltr', region: 'in', flag: '🇮🇳' },
  { code: 'bn', nativeName: 'বাংলা', englishName: 'Bengali', locale: 'bn-IN', status: 'published', direction: 'ltr', region: 'in', flag: '🇮🇳' },
  { code: 'brx', nativeName: 'बड़ो', englishName: 'Bodo', locale: 'brx-IN', status: 'published', direction: 'ltr', region: 'in', flag: '🇮🇳' },
  { code: 'doi', nativeName: 'डोगरी', englishName: 'Dogri', locale: 'doi-IN', status: 'published', direction: 'ltr', region: 'in', flag: '🇮🇳' },
  { code: 'gu', nativeName: 'ગુજરાતી', englishName: 'Gujarati', locale: 'gu-IN', status: 'published', direction: 'ltr', region: 'in', flag: '🇮🇳' },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', locale: 'hi-IN', status: 'published', direction: 'ltr', region: 'in', flag: '🇮🇳' },
  { code: 'kn', nativeName: 'ಕನ್ನಡ', englishName: 'Kannada', locale: 'kn-IN', status: 'published', direction: 'ltr', region: 'in', flag: '🇮🇳' },
  { code: 'ks', nativeName: 'کٲشُر', englishName: 'Kashmiri', locale: 'ks-IN', status: 'published', direction: 'rtl', region: 'in', flag: '🇮🇳' },
  { code: 'gom', nativeName: 'कोंकणी', englishName: 'Konkani', locale: 'kok-IN', status: 'published', direction: 'ltr', region: 'in', flag: '🇮🇳' },
  { code: 'mai', nativeName: 'मैथिली', englishName: 'Maithili', locale: 'mai-IN', status: 'published', direction: 'ltr', region: 'in', flag: '🇮🇳' },
  { code: 'ml', nativeName: 'മലയാളം', englishName: 'Malayalam', locale: 'ml-IN', status: 'published', direction: 'ltr', region: 'in', flag: '🇮🇳' },
  { code: 'mni', nativeName: 'ꯃꯤꯇꯩꯂꯣꯟ', englishName: 'Manipuri', locale: 'mni-IN', status: 'published', direction: 'ltr', region: 'in', flag: '🇮🇳' },
  { code: 'mr', nativeName: 'मराठी', englishName: 'Marathi', locale: 'mr-IN', status: 'published', direction: 'ltr', region: 'in', flag: '🇮🇳' },
  { code: 'ne', nativeName: 'नेपाली', englishName: 'Nepali', locale: 'ne-IN', status: 'published', direction: 'ltr', region: 'in', flag: '🇳🇵' },
  { code: 'or', nativeName: 'ଓଡ଼ିଆ', englishName: 'Odia', locale: 'or-IN', status: 'published', direction: 'ltr', region: 'in', flag: '🇮🇳' },
  { code: 'pa', nativeName: 'ਪੰਜਾਬੀ', englishName: 'Punjabi', locale: 'pa-IN', status: 'published', direction: 'ltr', region: 'in', flag: '🇮🇳' },
  { code: 'sa', nativeName: 'संस्कृतम्', englishName: 'Sanskrit', locale: 'sa-IN', status: 'published', direction: 'ltr', region: 'in', flag: '🇮🇳' },
  { code: 'sat', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', englishName: 'Santali', locale: 'sat-IN', status: 'published', direction: 'ltr', region: 'in', flag: '🇮🇳' },
  { code: 'sd', nativeName: 'سنڌي', englishName: 'Sindhi', locale: 'sd-IN', status: 'published', direction: 'rtl', region: 'in', flag: '🇮🇳' },
  { code: 'ta', nativeName: 'தமிழ்', englishName: 'Tamil', locale: 'ta-IN', status: 'published', direction: 'ltr', region: 'in', flag: '🇮🇳' },
  { code: 'te', nativeName: 'తెలుగు', englishName: 'Telugu', locale: 'te-IN', status: 'published', direction: 'ltr', region: 'in', flag: '🇮🇳' },
  { code: 'ur', nativeName: 'اردو', englishName: 'Urdu', locale: 'ur-IN', status: 'published', direction: 'rtl', region: 'in', flag: '🇮🇳' },

  // All 24 Official European Union (EU) Languages (24)
  { code: 'bg', nativeName: 'Български', englishName: 'Bulgarian', locale: 'bg-BG', status: 'published', direction: 'ltr', region: 'eu', flag: '🇧🇬' },
  { code: 'hr', nativeName: 'Hrvatski', englishName: 'Croatian', locale: 'hr-HR', status: 'published', direction: 'ltr', region: 'eu', flag: '🇭🇷' },
  { code: 'cs', nativeName: 'Čeština', englishName: 'Czech', locale: 'cs-CZ', status: 'published', direction: 'ltr', region: 'eu', flag: '🇨🇿' },
  { code: 'da', nativeName: 'Dansk', englishName: 'Danish', locale: 'da-DK', status: 'published', direction: 'ltr', region: 'eu', flag: '🇩🇰' },
  { code: 'nl', nativeName: 'Nederlands', englishName: 'Dutch', locale: 'nl-NL', status: 'published', direction: 'ltr', region: 'eu', flag: '🇳🇱' },
  { code: 'en-gb', nativeName: 'English (EU)', englishName: 'English (Europe)', locale: 'en-GB', status: 'published', direction: 'ltr', region: 'eu', flag: '🇪🇺' },
  { code: 'et', nativeName: 'Eesti', englishName: 'Estonian', locale: 'et-EE', status: 'published', direction: 'ltr', region: 'eu', flag: '🇪🇪' },
  { code: 'fi', nativeName: 'Suomi', englishName: 'Finnish', locale: 'fi-FI', status: 'published', direction: 'ltr', region: 'eu', flag: '🇫🇮' },
  { code: 'fr', nativeName: 'Français', englishName: 'French', locale: 'fr-FR', status: 'published', direction: 'ltr', region: 'eu', flag: '🇫🇷' },
  { code: 'de', nativeName: 'Deutsch', englishName: 'German', locale: 'de-DE', status: 'published', direction: 'ltr', region: 'eu', flag: '🇩🇪' },
  { code: 'el', nativeName: 'Ελληνικά', englishName: 'Greek', locale: 'el-GR', status: 'published', direction: 'ltr', region: 'eu', flag: '🇬🇷' },
  { code: 'hu', nativeName: 'Magyar', englishName: 'Hungarian', locale: 'hu-HU', status: 'published', direction: 'ltr', region: 'eu', flag: '🇭🇺' },
  { code: 'ga', nativeName: 'Gaeilge', englishName: 'Irish', locale: 'ga-IE', status: 'published', direction: 'ltr', region: 'eu', flag: '🇮🇪' },
  { code: 'it', nativeName: 'Italiano', englishName: 'Italian', locale: 'it-IT', status: 'published', direction: 'ltr', region: 'eu', flag: '🇮🇹' },
  { code: 'lv', nativeName: 'Latviešu', englishName: 'Latvian', locale: 'lv-LV', status: 'published', direction: 'ltr', region: 'eu', flag: '🇱🇻' },
  { code: 'lt', nativeName: 'Lietuvių', englishName: 'Lithuanian', locale: 'lt-LT', status: 'published', direction: 'ltr', region: 'eu', flag: '🇱🇹' },
  { code: 'mt', nativeName: 'Malti', englishName: 'Maltese', locale: 'mt-MT', status: 'published', direction: 'ltr', region: 'eu', flag: '🇲🇹' },
  { code: 'pl', nativeName: 'Polski', englishName: 'Polish', locale: 'pl-PL', status: 'published', direction: 'ltr', region: 'eu', flag: '🇵🇱' },
  { code: 'pt', nativeName: 'Português', englishName: 'Portuguese', locale: 'pt-PT', status: 'published', direction: 'ltr', region: 'eu', flag: '🇵🇹' },
  { code: 'ro', nativeName: 'Română', englishName: 'Romanian', locale: 'ro-RO', status: 'published', direction: 'ltr', region: 'eu', flag: '🇷🇴' },
  { code: 'sk', nativeName: 'Slovenčina', englishName: 'Slovak', locale: 'sk-SK', status: 'published', direction: 'ltr', region: 'eu', flag: '🇸🇰' },
  { code: 'sl', nativeName: 'Slovenščina', englishName: 'Slovenian', locale: 'sl-SI', status: 'published', direction: 'ltr', region: 'eu', flag: '🇸🇮' },
  { code: 'es', nativeName: 'Español', englishName: 'Spanish', locale: 'es-ES', status: 'published', direction: 'ltr', region: 'eu', flag: '🇪🇸' },
  { code: 'sv', nativeName: 'Svenska', englishName: 'Swedish', locale: 'sv-SE', status: 'published', direction: 'ltr', region: 'eu', flag: '🇸🇪' }
];

export const ENABLED_LANGUAGES = SUPPORTED_LANGUAGES;

/**
 * Common code aliases and normalizations
 */
export const LANGUAGE_ALIASES: Record<string, string> = {
  hinglish: 'hi-latn',
  'hi-in': 'hi',
  'en-us': 'en',
  'en-in': 'en',
  'en-eu': 'en-gb',
  'en-uk': 'en-gb',
  kok: 'gom',
  'kok-in': 'gom',
  'bn-in': 'bn',
  'ta-in': 'ta',
  'te-in': 'te',
  'mr-in': 'mr',
  'gu-in': 'gu',
  'kn-in': 'kn',
  'ml-in': 'ml',
  'pa-in': 'pa',
  'or-in': 'or',
  'as-in': 'as',
  'ur-in': 'ur',
  'fr-fr': 'fr',
  'de-de': 'de',
  'es-es': 'es',
  'it-it': 'it',
  'nl-nl': 'nl',
  'pt-pt': 'pt',
  'pl-pl': 'pl',
  'sv-se': 'sv',
  'da-dk': 'da',
  'fi-fi': 'fi',
  'el-gr': 'el',
  'cs-cz': 'cs',
  'ro-ro': 'ro',
  'hu-hu': 'hu',
  'ga-ie': 'ga',
  'bg-bg': 'bg',
  'hr-hr': 'hr',
  'et-ee': 'et',
  'lv-lv': 'lv',
  'lt-lt': 'lt',
  'mt-mt': 'mt',
  'sk-sk': 'sk',
  'sl-si': 'sl'
};

export function resolveLanguageCode(code: string | null | undefined): string {
  if (!code) return 'en';
  const clean = code.toLowerCase().trim();
  if (LANGUAGE_ALIASES[clean]) {
    return LANGUAGE_ALIASES[clean];
  }
  const prefix = clean.split('-')[0];
  if (LANGUAGE_ALIASES[prefix]) {
    return LANGUAGE_ALIASES[prefix];
  }
  const match = SUPPORTED_LANGUAGES.find(l => l.code.toLowerCase() === clean || l.code.toLowerCase() === prefix);
  return match ? match.code : 'en';
}

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
