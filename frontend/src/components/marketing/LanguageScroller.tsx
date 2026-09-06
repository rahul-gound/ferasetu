import { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Globe, Sparkles } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { SUPPORTED_LANGUAGES, getCleanPath, getLanguagePath, type LanguageConfig } from '../../i18n';

interface LanguageScrollerProps {
  className?: string;
}

export default function LanguageScroller({ className = '' }: LanguageScrollerProps) {
  const { language, setLanguage } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'eu' | 'in'>('all');

  const cleanPath = getCleanPath(location.pathname);

  const filteredLanguages = useMemo(() => {
    if (filter === 'eu') return SUPPORTED_LANGUAGES.filter(l => l.region === 'eu');
    if (filter === 'in') return SUPPORTED_LANGUAGES.filter(l => l.region === 'in');
    return SUPPORTED_LANGUAGES;
  }, [filter]);

  const handleSelectLanguage = (lang: LanguageConfig) => {
    setLanguage(lang.code);
    const targetPath = getLanguagePath(cleanPath, lang.code);
    navigate(targetPath);
  };

  return (
    <div className={`w-full border-b border-slate-200/80 bg-slate-900 text-white select-none ${className}`}>
      <div className="max-w-[1280px] mx-auto px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        {/* Left header / filter pills */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 uppercase tracking-wider">
            <Globe size={13} className="animate-pulse" />
            <span>Global Stores:</span>
          </span>

          <div className="inline-flex items-center bg-slate-800/90 rounded-full p-0.5 border border-slate-700/60 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer ${
                filter === 'all' ? 'bg-blue-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({SUPPORTED_LANGUAGES.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('eu')}
              className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer flex items-center gap-1 ${
                filter === 'eu' ? 'bg-blue-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🇪🇺</span> Europe (15)
            </button>
            <button
              type="button"
              onClick={() => setFilter('in')}
              className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer flex items-center gap-1 ${
                filter === 'in' ? 'bg-blue-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🇮🇳</span> India (22)
            </button>
          </div>
        </div>

        {/* Scrollable Language Ticker */}
        <div className="w-full sm:w-auto flex-1 overflow-x-auto no-scrollbar scroll-smooth flex items-center gap-1.5 py-0.5">
          {filteredLanguages.map((lang) => {
            const isActive = language === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelectLanguage(lang)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-400 shadow-md ring-2 ring-blue-500/30'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700/50 hover:bg-slate-700 hover:text-white hover:border-slate-600'
                }`}
                title={`${lang.englishName} (${lang.nativeName})`}
              >
                <span className="text-sm leading-none">{lang.flag}</span>
                <span>{lang.nativeName}</span>
                {isActive && <Sparkles size={11} className="text-amber-300 ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
