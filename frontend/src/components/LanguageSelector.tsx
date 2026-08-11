import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ENABLED_LANGUAGES, getLanguagePath } from '../i18n';
import { ChevronDown, Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function LanguageSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { language } = useLanguage();

  const currentLanguage = ENABLED_LANGUAGES.find(l => l.code === language) || ENABLED_LANGUAGES[0];
  const cleanPath = location.pathname;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white transition-colors border border-white/20 rounded-full px-4 py-2"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Select Language"
      >
        <Globe size={16} />
        <span className="hidden sm:inline">{currentLanguage.nativeName}</span>
        <span className="sm:hidden">{currentLanguage.code.toUpperCase()}</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-40 bg-[#0a0d24] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 py-1"
          role="menu"
          aria-orientation="vertical"
        >
          {ENABLED_LANGUAGES.map((lang) => {
            const href = getLanguagePath(cleanPath, lang.code);
            const isSelected = language === lang.code;
            return (
              <a
                key={lang.code}
                href={href}
                className={`block px-4 py-2.5 text-sm transition-colors ${
                  isSelected 
                    ? 'bg-[#FF6B35]/10 text-[#FF6B35] font-bold' 
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                {lang.nativeName}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
