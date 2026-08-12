import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { loadDictionary, fallbackDictionary, SUPPORTED_LANGUAGES, ENABLED_LANGUAGES, PUBLIC_ROUTES, type Dictionary, type TranslationKey } from '../i18n';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  translate: (key: TranslationKey, vars?: Record<string, string | number>) => string;
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
  const activeLanguage = (isPublicRoute && isValidUrlLang) ? urlLang : (isPublicRoute && !isValidUrlLang && location.pathname !== '/' ? 'en' : localLanguage);

  const [dictionary, setDictionary] = useState<Dictionary>(fallbackDictionary);

  // Handle dictionary lazy loading and RTL injection
  useEffect(() => {
    const langConfig = SUPPORTED_LANGUAGES.find(l => l.code === activeLanguage);
    
    // Inject RTL / LTR dynamically
    document.documentElement.dir = langConfig?.direction === 'rtl' ? 'rtl' : 'ltr';
    document.documentElement.lang = activeLanguage;

    let isMounted = true;
    if (activeLanguage === 'en') {
      setDictionary(fallbackDictionary);
    } else {
      loadDictionary(activeLanguage).then(dict => {
        if (isMounted) {
          setDictionary(dict);
        }
      });
    }

    return () => { isMounted = false; };
  }, [activeLanguage]);

  const setLanguage = (lang: string) => {
    setLocalLanguage(lang);
    localStorage.setItem('fera_language', lang);
  };

  const translate = (key: TranslationKey, vars?: Record<string, string | number>) => {
    let text = dictionary[key];
    if (!text) {
      text = fallbackDictionary[key] || key;
    }
    
    if (vars) {
      Object.keys(vars).forEach(k => {
        text = text.replace(new RegExp(`{{${k}}}`, 'g'), String(vars[k]));
      });
    }
    
    return text;
  };
  
  const getLocalizedLink = (path: string) => {
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
