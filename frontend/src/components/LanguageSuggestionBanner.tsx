import { Globe, X, ArrowRight, Sparkles } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../i18n';

export default function LanguageSuggestionBanner() {
  const {
    language,
    suggestedLanguage,
    suggestedStateName,
    dismissSuggestion,
    acceptSuggestion
  } = useLanguage();

  if (!suggestedLanguage || suggestedLanguage === language) {
    return null;
  }

  const currentLangConfig = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];
  const targetLangConfig = SUPPORTED_LANGUAGES.find(l => l.code === suggestedLanguage);

  if (!targetLangConfig) {
    return null;
  }

  return (
    <aside
      aria-label="Language suggestion"
      className="fixed bottom-5 right-5 z-50 max-w-sm w-[calc(100vw-2.5rem)] rounded-2xl border border-blue-200/80 bg-white p-4 shadow-2xl shadow-blue-900/10 transition-all animate-in fade-in slide-in-from-bottom-3 duration-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Globe size={18} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                Language Suggestion
              </p>
              <Sparkles size={12} className="text-amber-500" />
            </div>
            {suggestedStateName && (
              <p className="text-[11px] text-slate-500">
                Based on your region: {suggestedStateName}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={dismissSuggestion}
          aria-label="Dismiss language suggestion"
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
        <span className="flex items-center gap-1">
          <span>{currentLangConfig.flag}</span>
          <span>{currentLangConfig.nativeName}</span>
        </span>
        <ArrowRight size={14} className="text-slate-400" />
        <span className="flex items-center gap-1 font-bold text-blue-700">
          <span>{targetLangConfig.flag}</span>
          <span>{targetLangConfig.nativeName}</span>
          <span className="text-[11px] text-slate-400">({targetLangConfig.englishName})</span>
        </span>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={dismissSuggestion}
          className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
        >
          Keep {currentLangConfig.englishName}
        </button>
        <button
          type="button"
          onClick={acceptSuggestion}
          className="rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          Switch to {targetLangConfig.nativeName}
        </button>
      </div>
    </aside>
  );
}
