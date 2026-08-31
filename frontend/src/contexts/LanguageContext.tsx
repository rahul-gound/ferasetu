import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import {
  ENABLED_LANGUAGES,
  PUBLIC_ROUTES,
  fallbackDictionary,
  getCleanPath,
  getLanguagePath,
  loadDictionary,
  type Dictionary,
  type TranslationKey
} from '../i18n';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  translate: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  getLocalizedLink: (path: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
const LANGUAGE_STORAGE_KEY = 'fera_language';
const PRE_LOGIN_LANGUAGE_KEY = 'fera_prelogin_language';

function isSupportedLanguage(lang: string | null | undefined): boolean {
  return Boolean(lang && ENABLED_LANGUAGES.some(language => language.code === lang));
}

function getBrowserLanguage(): string {
  if (typeof navigator === 'undefined' || !navigator.languages) return 'en';
  for (const browserLanguage of navigator.languages) {
    const code = browserLanguage.split('-')[0]?.toLowerCase();
    if (isSupportedLanguage(code)) return code;
  }
  return 'en';
}

function getStoredLanguage(): string {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored !== null && isSupportedLanguage(stored)) return stored;
  return getBrowserLanguage();
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user, updateUser } = useAuth();
  const location = useLocation();
  const accountPreferenceApplied = useRef(false);

  const cleanPath = getCleanPath(location.pathname);
  const urlLanguage = location.pathname.split('/')[1];
  const isValidUrlLanguage = isSupportedLanguage(urlLanguage);
  const isPublicRoute = PUBLIC_ROUTES.includes(cleanPath);

  const [localLanguage, setLocalLanguage] = useState(() => (
    isPublicRoute && isValidUrlLanguage ? urlLanguage : getStoredLanguage()
  ));
  const [dictionaries, setDictionaries] = useState<Record<string, Dictionary>>({
    en: fallbackDictionary
  });

  const activeLanguage = isPublicRoute && isValidUrlLanguage ? urlLanguage : localLanguage;
  const dictionary = dictionaries[activeLanguage] || fallbackDictionary;

  useEffect(() => {
    const languageConfig = ENABLED_LANGUAGES.find(language => language.code === activeLanguage);
    document.documentElement.lang = activeLanguage;
    document.documentElement.dir = languageConfig?.direction === 'rtl' ? 'rtl' : 'ltr';

    if (dictionaries[activeLanguage]) return;

    let isCurrentRequest = true;
    loadDictionary(activeLanguage).then(loadedDictionary => {
      if (!isCurrentRequest) return;
      setDictionaries(current => ({
        ...current,
        [activeLanguage]: loadedDictionary
      }));
    });

    return () => {
      isCurrentRequest = false;
    };
  }, [activeLanguage, dictionaries]);

  useEffect(() => {
    if (!user) {
      accountPreferenceApplied.current = false;
      return;
    }

    if (accountPreferenceApplied.current) return;
    accountPreferenceApplied.current = true;

    const preLoginLanguage = sessionStorage.getItem(PRE_LOGIN_LANGUAGE_KEY);
    const preferredLanguage = preLoginLanguage || user.preferred_language;

    const applyPreference = window.setTimeout(() => {
      if (!isSupportedLanguage(preferredLanguage)) return;
      setLocalLanguage(preferredLanguage);
      localStorage.setItem(LANGUAGE_STORAGE_KEY, preferredLanguage);
    }, 0);

    if (preLoginLanguage) {
      sessionStorage.removeItem(PRE_LOGIN_LANGUAGE_KEY);
      if (user.preferred_language !== preLoginLanguage) {
        updateUser({ preferred_language: preLoginLanguage });
      }
    }

    return () => window.clearTimeout(applyPreference);
  }, [user, updateUser, localLanguage]);

  const setLanguage = (lang: string) => {
    if (!isSupportedLanguage(lang) || lang === activeLanguage) return;

    setLocalLanguage(lang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);

    if (!user) {
      sessionStorage.setItem(PRE_LOGIN_LANGUAGE_KEY, lang);
      return;
    }

    sessionStorage.removeItem(PRE_LOGIN_LANGUAGE_KEY);
    if (user.preferred_language !== lang) {
      updateUser({ preferred_language: lang });
    }
  };

  const translate = (key: TranslationKey, vars?: Record<string, string | number>) => {
    let text = dictionary[key] || fallbackDictionary[key] || key;

    if (vars) {
      for (const [variable, value] of Object.entries(vars)) {
        text = text.replace(new RegExp(`{{${variable}}}`, 'g'), String(value));
      }
    }

    return text;
  };

  const getLocalizedLink = (path: string) => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const cleanLinkPath = getCleanPath(normalizedPath);
    if (!PUBLIC_ROUTES.includes(cleanLinkPath) || activeLanguage === 'en') {
      return cleanLinkPath;
    }
    return getLanguagePath(cleanLinkPath, activeLanguage);
  };

  return (
    <LanguageContext.Provider value={{ language: activeLanguage, setLanguage, translate, getLocalizedLink }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
