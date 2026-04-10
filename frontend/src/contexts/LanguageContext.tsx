import { createContext, useContext, useState, type ReactNode } from 'react';
import { t } from '../utils/languages';
import { useAuth } from './AuthContext';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  translate: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [language, setLanguageState] = useState(
    user?.preferred_language || localStorage.getItem('fera_language') || 'en'
  );

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    localStorage.setItem('fera_language', lang);
  };

  const translate = (key: string) => t(key, language);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translate }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
