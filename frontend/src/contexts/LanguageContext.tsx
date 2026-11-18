import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  resolveLanguageCode,
  type Dictionary,
  type TranslationKey
} from '../i18n';
import {
  getCachedTranslation,
  translateTextAsync,
  translateBatchAsync
} from '../services/translationPipeline';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  translate: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  tDynamic: (text: string, context?: string) => string;
  translateAsync: (text: string, context?: string) => Promise<string>;
  getLocalizedLink: (path: string) => string;
  suggestedLanguage: string | null;
  suggestedStateName: string | null;
  dismissSuggestion: () => void;
  acceptSuggestion: () => void;
  isTranslating: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
const LANGUAGE_STORAGE_KEY = 'fera_language';
const PRE_LOGIN_LANGUAGE_KEY = 'fera_prelogin_language';
const PROMPT_DISMISSED_KEY = 'fera_lang_prompt_dismissed';

function isSupportedLanguage(lang: string | null | undefined): boolean {
  if (!lang) return false;
  const resolved = resolveLanguageCode(lang);
  return Boolean(ENABLED_LANGUAGES.some(language => language.code === resolved));
}

function getBrowserLanguage(): string {
  if (typeof navigator === 'undefined' || !navigator.languages) return 'en';
  for (const browserLanguage of navigator.languages) {
    const resolved = resolveLanguageCode(browserLanguage);
    if (isSupportedLanguage(resolved)) return resolved;
  }
  return 'en';
}

function getStoredLanguage(isCanonicalPublic = false): string {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored !== null && isSupportedLanguage(stored)) {
    return resolveLanguageCode(stored);
  }
  if (isCanonicalPublic) {
    return 'en';
  }
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
  const isCanonicalPublic = isPublicRoute && !isValidUrlLanguage;

  const [localLanguage, setLocalLanguage] = useState(() => (
    isPublicRoute && isValidUrlLanguage ? resolveLanguageCode(urlLanguage) : getStoredLanguage(isCanonicalPublic)
  ));
  const [dictionaries, setDictionaries] = useState<Record<string, Dictionary>>({
    en: fallbackDictionary
  });

  // Suggestion & Auto-detection state
  const [suggestedLanguage, setSuggestedLanguage] = useState<string | null>(null);
  const [suggestedStateName, setSuggestedStateName] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [, setDynamicTick] = useState(0);

  const activeLanguage = isPublicRoute && isValidUrlLanguage ? resolveLanguageCode(urlLanguage) : localLanguage;
  const dictionary = dictionaries[activeLanguage] || fallbackDictionary;

  // Track pending dynamic translations to trigger re-renders
  const requestedTranslations = useRef(new Set<string>());

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

  // Privacy-conscious smart auto-detection via /api/geo
  useEffect(() => {
    const hasExplicitChoice = localStorage.getItem(LANGUAGE_STORAGE_KEY) !== null;
    const isDismissed = localStorage.getItem(PROMPT_DISMISSED_KEY) === 'true';

    if (hasExplicitChoice || user?.preferred_language) {
      return;
    }

    let isMounted = true;
    fetch('/api/geo')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!isMounted || !data || !data.suggestedLanguage) return;
        const resolved = resolveLanguageCode(data.suggestedLanguage);
        if (resolved && isSupportedLanguage(resolved)) {
          // If browser is default en, but high-confidence regional locale detected, auto-suggest or set
          if (resolved !== activeLanguage) {
            setSuggestedLanguage(resolved);
            setSuggestedStateName(data.subdivision || data.name || null);
          }
        }
      })
      .catch(() => {
        // Fallback gracefully on network error
      });

    return () => {
      isMounted = false;
    };
  }, [activeLanguage, user]);

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
      const resolved = resolveLanguageCode(preferredLanguage);
      setLocalLanguage(resolved);
      localStorage.setItem(LANGUAGE_STORAGE_KEY, resolved);
    }, 0);

    if (preLoginLanguage) {
      sessionStorage.removeItem(PRE_LOGIN_LANGUAGE_KEY);
      if (user.preferred_language !== preLoginLanguage) {
        updateUser({ preferred_language: preLoginLanguage });
      }
    }

    return () => window.clearTimeout(applyPreference);
  }, [user, updateUser, localLanguage]);

  const setLanguage = useCallback((lang: string) => {
    const resolved = resolveLanguageCode(lang);
    if (!isSupportedLanguage(resolved) || resolved === activeLanguage) return;

    setLocalLanguage(resolved);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, resolved);

    // Dismiss suggestion once explicit choice is made
    setSuggestedLanguage(null);
    localStorage.setItem(PROMPT_DISMISSED_KEY, 'true');

    if (!user) {
      sessionStorage.setItem(PRE_LOGIN_LANGUAGE_KEY, resolved);
      return;
    }

    sessionStorage.removeItem(PRE_LOGIN_LANGUAGE_KEY);
    if (user.preferred_language !== resolved) {
      updateUser({ preferred_language: resolved });
    }
  }, [activeLanguage, user, updateUser]);

  const dismissSuggestion = useCallback(() => {
    setSuggestedLanguage(null);
    localStorage.setItem(PROMPT_DISMISSED_KEY, 'true');
  }, []);

  const acceptSuggestion = useCallback(() => {
    if (suggestedLanguage) {
      setLanguage(suggestedLanguage);
    }
    dismissSuggestion();
  }, [suggestedLanguage, setLanguage, dismissSuggestion]);

  const translate = useCallback((key: TranslationKey, vars?: Record<string, string | number>) => {
    let text = dictionary[key] ?? fallbackDictionary[key] ?? key;

    if (vars) {
      for (const [variable, value] of Object.entries(vars)) {
        text = text.replace(new RegExp(`{{${variable}}}`, 'g'), String(value));
      }
    }

    return text;
  }, [dictionary]);

  // Context-aware dynamic translate helper
  const tDynamic = useCallback((text: string, context = 'retail') => {
    if (!text || activeLanguage === 'en') return text;

    const cached = getCachedTranslation(text, activeLanguage, context);
    if (cached !== null) return cached;

    // Schedule async translation if not already in flight
    const trackKey = `${activeLanguage}:${context}:${text}`;
    if (!requestedTranslations.current.has(trackKey)) {
      requestedTranslations.current.add(trackKey);
      setIsTranslating(true);
      translateTextAsync(text, activeLanguage, context)
        .then(() => {
          setDynamicTick(t => t + 1);
        })
        .finally(() => {
          setIsTranslating(false);
        });
    }

    return text; // Return English text while translation loads smoothly
  }, [activeLanguage]);

  const translateAsync = useCallback(async (text: string, context = 'retail') => {
    if (!text || activeLanguage === 'en') return text;
    setIsTranslating(true);
    try {
      return await translateTextAsync(text, activeLanguage, context);
    } finally {
      setIsTranslating(false);
    }
  }, [activeLanguage]);

  const getLocalizedLink = useCallback((path: string) => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const cleanLinkPath = getCleanPath(normalizedPath);
    if (!PUBLIC_ROUTES.includes(cleanLinkPath) || activeLanguage === 'en') {
      return cleanLinkPath;
    }
    return getLanguagePath(cleanLinkPath, activeLanguage);
  }, [activeLanguage]);

  const contextValue = useMemo(() => ({
    language: activeLanguage,
    setLanguage,
    translate,
    tDynamic,
    translateAsync,
    getLocalizedLink,
    suggestedLanguage,
    suggestedStateName,
    dismissSuggestion,
    acceptSuggestion,
    isTranslating
  }), [
    activeLanguage,
    setLanguage,
    translate,
    tDynamic,
    translateAsync,
    getLocalizedLink,
    suggestedLanguage,
    suggestedStateName,
    dismissSuggestion,
    acceptSuggestion,
    isTranslating
  ]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}

/**
 * High-craft component that translates text dynamically into activeLanguage
 */
export function DynamicText({
  text,
  context = 'retail',
  className = ''
}: {
  text: string;
  context?: string;
  className?: string;
}) {
  const { tDynamic } = useLanguage();
  return <span className={className}>{tDynamic(text, context)}</span>;
}
