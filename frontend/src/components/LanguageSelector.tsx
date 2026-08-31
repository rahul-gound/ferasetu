import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Globe, Search, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { ENABLED_LANGUAGES, PUBLIC_ROUTES, getCleanPath, getLanguagePath } from '../i18n';

type SelectorVariant = 'light' | 'dark' | 'dashboard';

interface LanguageSelectorProps {
  variant?: SelectorVariant;
  className?: string;
}

const TRIGGER_CLASSES: Record<SelectorVariant, string> = {
  light: 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900 focus-visible:ring-blue-600',
  dark: 'border-white/15 bg-white/10 text-white/90 hover:border-white/30 hover:text-white focus-visible:ring-blue-400',
  dashboard: 'border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-200 hover:text-blue-700 focus-visible:ring-blue-600'
};

export default function LanguageSelector({
  variant = 'light',
  className = ''
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { language, setLanguage, translate } = useLanguage();

  const currentLanguage = ENABLED_LANGUAGES.find(item => item.code === language) || ENABLED_LANGUAGES[0];

  const closeSelector = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const filteredLanguages = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return ENABLED_LANGUAGES;
    return ENABLED_LANGUAGES.filter(item => (
      item.nativeName.toLowerCase().includes(normalizedQuery) ||
      item.englishName.toLowerCase().includes(normalizedQuery) ||
      item.code.includes(normalizedQuery)
    ));
  }, [query]);

  const openSelector = () => {
    setQuery('');
    setActiveIndex(0);
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    const timeout = window.setTimeout(() => searchRef.current?.focus(), 20);
    return () => window.clearTimeout(timeout);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const activeOption = containerRef.current?.querySelector('[role=option][aria-selected=true]');
    activeOption?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeSelector();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSelector();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selectLanguage = (code: string) => {
    setLanguage(code);
    const cleanPath = getCleanPath(location.pathname);
    if (PUBLIC_ROUTES.includes(cleanPath)) {
      navigate(getLanguagePath(cleanPath, code));
    }
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(currentIndex => {
        if (!filteredLanguages.length) return 0;
        if (event.key === 'ArrowDown') return (currentIndex + 1) % filteredLanguages.length;
        return (currentIndex - 1 + filteredLanguages.length) % filteredLanguages.length;
      });
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(Math.max(filteredLanguages.length - 1, 0));
      return;
    }

    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      const selected = filteredLanguages[activeIndex];
      if (selected) selectLanguage(selected.code);
    }
  };

  const languageList = (isMobile: boolean) => (
    <ul
      id={isMobile ? 'fera-mobile-language-options' : 'fera-desktop-language-options'}
      role='listbox'
      aria-label={translate('language.selector.available')}
      className={
        isMobile
          ? 'flex-1 space-y-2 overflow-y-auto overscroll-contain px-4 pb-4'
          : 'max-h-80 space-y-1 overflow-y-auto overscroll-contain p-2'
      }
    >
      {filteredLanguages.map((item, index) => {
        const isSelected = item.code === language;
        const isActive = index === activeIndex;
        return (
          <li key={item.code}>
            <button
              type='button'
              role='option'
              aria-selected={isActive}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectLanguage(item.code)}
              className={`flex min-h-[52px] w-full items-center justify-between gap-3 rounded-xl px-4 text-left transition-colors ${
                isSelected
                  ? 'bg-blue-50 text-blue-700'
                  : isActive
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className='min-w-0'>
                <span className='block truncate text-sm font-bold'>{item.nativeName}</span>
                <span className='block truncate text-xs font-medium text-slate-500'>{item.englishName}</span>
              </span>
              <span className='flex items-center gap-2'>
                <span className='text-[10px] font-bold uppercase tracking-wide text-slate-400'>
                  {item.code}
                </span>
                {isSelected && <Check size={16} aria-hidden='true' />}
              </span>
            </button>
          </li>
        );
      })}

      {!filteredLanguages.length && (
        <li className='px-4 py-8 text-center text-sm font-medium text-slate-500'>
          {translate('language.selector.noResults')}
        </li>
      )}
    </ul>
  );

  const selectorHeader = (
    <>
      <div className='flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4'>
        <div>
          <p className='text-sm font-bold text-slate-900'>
            {translate('language.selector.title')}
          </p>
          <p className='text-xs font-medium text-slate-500'>
            {translate('language.selector.available')}
          </p>
        </div>
        <button
          type='button'
          onClick={closeSelector}
          className='flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600'
          aria-label={translate('common.close')}
        >
          <X size={18} />
        </button>
      </div>
      <div className='border-b border-slate-100 p-3'>
        <div className='relative'>
          <Search size={16} className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' />
          <input
            ref={searchRef}
            type='search'
            value={query}
            onChange={event => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder={translate('language.selector.search')}
            aria-label={translate('language.selector.search')}
            className='w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
          />
        </div>
      </div>
    </>
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type='button'
        onClick={isOpen ? closeSelector : openSelector}
        aria-expanded={isOpen}
        aria-haspopup='dialog'
        aria-controls='fera-language-selector'
        aria-label={`${translate('language.selector.title')}: ${currentLanguage.nativeName}`}
        className={`inline-flex min-h-[40px] items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${TRIGGER_CLASSES[variant]}`}
      >
        <Globe size={16} aria-hidden='true' />
        <span className='hidden max-w-[9rem] truncate sm:inline'>{currentLanguage.nativeName}</span>
        <span className='sm:hidden'>{currentLanguage.code.toUpperCase()}</span>
        <ChevronDown
          size={14}
          aria-hidden='true'
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div className='absolute right-0 top-full z-50 mt-2 hidden w-[22rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 md:block'>
            {selectorHeader}
            {languageList(false)}
          </div>

          <div className='fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-sm md:hidden'>
            <div
              id='fera-language-selector'
              role='dialog'
              aria-modal='true'
              aria-label={translate('language.selector.title')}
              className='absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col overflow-hidden rounded-t-3xl border-t border-slate-200 bg-white shadow-2xl'
            >
              {selectorHeader}
              {languageList(true)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
