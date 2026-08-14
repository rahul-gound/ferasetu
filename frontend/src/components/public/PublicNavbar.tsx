import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ChevronDown, Globe, Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { ENABLED_LANGUAGES, getLanguagePath } from '../../i18n';

function LightLanguageSelector() {
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
        className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors border border-slate-200 rounded-full px-4 py-2 bg-white shadow-sm"
        aria-expanded={isOpen}
        aria-label="Select Language"
      >
        <Globe size={16} className="text-slate-400" />
        <span className="hidden sm:inline">{currentLanguage.nativeName}</span>
        <span className="sm:hidden">{currentLanguage.code.toUpperCase()}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 py-1"
          role="menu"
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
                    ? 'bg-blue-50 text-blue-600 font-bold' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
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

export default function PublicNavbar() {
  const { user } = useAuth();
  const { getLocalizedLink } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 transition-all">
        <div className="max-w-[1280px] mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo-official.png" alt="FeraSetu" fetchpriority="high" className="h-8 w-auto object-contain" />
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="/#how-it-works" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">How it works</a>
            <a href="/#features" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Features</a>
            <Link to={getLocalizedLink('/pricing')} className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Pricing</Link>
          </div>
          
          <div className="hidden md:flex items-center gap-4">
            <LightLanguageSelector />
            
            {user ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-bold shadow-sm hover:bg-slate-800 transition-all"
              >
                Dashboard <ArrowRight size={14} />
              </Link>
            ) : (
              <>
                <Link to={getLocalizedLink('/login')} className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">
                  Sign in
                </Link>
                <Link to={getLocalizedLink('/register')} className="px-5 py-2.5 rounded-full bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all hover:-translate-y-0.5">
                  Start Free
                </Link>
              </>
            )}
          </div>

          <button 
            className="md:hidden p-2 text-slate-600 hover:text-slate-900"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-white pt-20 px-6 overflow-y-auto">
          <div className="flex flex-col gap-6 py-6">
            <a href="/#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-lg font-semibold text-slate-900">How it works</a>
            <a href="/#features" onClick={() => setMobileMenuOpen(false)} className="text-lg font-semibold text-slate-900">Features</a>
            <Link to={getLocalizedLink('/pricing')} onClick={() => setMobileMenuOpen(false)} className="text-lg font-semibold text-slate-900">Pricing</Link>
            
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-4">
              <LightLanguageSelector />
              {user ? (
                <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="w-full py-4 flex justify-center items-center gap-2 rounded-xl bg-slate-900 text-white font-bold">
                  Dashboard <ArrowRight size={16} />
                </Link>
              ) : (
                <>
                  <Link to={getLocalizedLink('/login')} onClick={() => setMobileMenuOpen(false)} className="w-full py-4 text-center rounded-xl bg-slate-50 text-slate-900 font-bold">
                    Sign in
                  </Link>
                  <Link to={getLocalizedLink('/register')} onClick={() => setMobileMenuOpen(false)} className="w-full py-4 text-center rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/20">
                    Start Free
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
