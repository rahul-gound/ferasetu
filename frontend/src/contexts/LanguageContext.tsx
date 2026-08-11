import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { t as translateFn, SUPPORTED_LANGUAGES, ENABLED_LANGUAGES, PUBLIC_ROUTES } from '../i18n';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  translate: (key: string) => string;
  getLocalizedLink: (path: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  
  // Extract language from URL if present (e.g. /hi/pricing -> 'hi')
  const pathParts = location.pathname.split('/');
  const urlLang = pathParts[1];
  const isValidUrlLang = ENABLED_LANGUAGES.some(l => l.code === urlLang);
  
  // Check if current route is a public route (either exactly, or with lang prefix)
  let isPublicRoute = false;
  const currentCleanPath = isValidUrlLang ? location.pathname.substring(urlLang.length + 1) || '/' : location.pathname;
  if (PUBLIC_ROUTES.includes(currentCleanPath)) {
    isPublicRoute = true;
  }
  
  // State holds the user's preferred or local storage language.
  // We initialize from localStorage (or 'en')
  const [localLanguage, setLocalLanguage] = useState(
    localStorage.getItem('fera_language') || 'en'
  );

  // Sync with user profile if authenticated
  useEffect(() => {
    if (user?.preferred_language && user.preferred_language !== localLanguage) {
      setLocalLanguage(user.preferred_language);
      localStorage.setItem('fera_language', user.preferred_language);
    }
  }, [user?.preferred_language]);

  // Determine active language: URL overrides everything for public pages.
  // Otherwise, use user preference / local state.
  const activeLanguage = (isPublicRoute && isValidUrlLang) ? urlLang : (isPublicRoute && !isValidUrlLang && location.pathname !== '/' ? 'en' : localLanguage);

  const setLanguage = (lang: string) => {
    setLocalLanguage(lang);
    localStorage.setItem('fera_language', lang);
  };

  const translate = (key: string) => translateFn(key, activeLanguage);
  
  const getLocalizedLink = (path: string) => {
    // If path doesn't start with /, add it.
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    if (activeLanguage === 'en') return cleanPath;
    return `/${activeLanguage}${cleanPath === '/' ? '' : cleanPath}`;
  };

  return (
    <LanguageContext.Provider value={{ language: activeLanguage, setLanguage, translate, getLocalizedLink }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
