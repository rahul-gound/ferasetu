import { Globe, ChevronDown, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useMarket } from '../../contexts/MarketContext';
import { type Market } from '../../config/pricing';

export interface MarketOption {
  id: Market;
  label: string;
  currency: string;
  symbol: string;
  flag: string;
}

export const MARKET_OPTIONS: MarketOption[] = [
  { id: 'IN', label: 'India', currency: 'INR', symbol: '₹', flag: '🇮🇳' },
  { id: 'UK', label: 'United Kingdom', currency: 'GBP', symbol: '£', flag: '🇬🇧' },
  { id: 'US', label: 'United States', currency: 'USD', symbol: '$', flag: '🇺🇸' },
  { id: 'EU', label: 'Europe', currency: 'EUR', symbol: '€', flag: '🇪🇺' },
  { id: 'GLOBAL', label: 'Global', currency: 'USD', symbol: '$', flag: '🌐' },
];

interface MarketSelectorProps {
  variant?: 'light' | 'dark' | 'pills' | 'header' | 'footer';
  className?: string;
}

export default function MarketSelector({ variant = 'light', className = '' }: MarketSelectorProps) {
  const { market, setMarket } = useMarket();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = MARKET_OPTIONS.find(m => m.id === market) || MARKET_OPTIONS[4];

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (variant === 'pills') {
    return (
      <div
        role="radiogroup"
        aria-label="Select market and commercial currency"
        className={`inline-flex flex-wrap items-center justify-center gap-1 rounded-2xl bg-slate-100 p-1.5 border border-slate-200/80 shadow-inner ${className}`}
      >
        {MARKET_OPTIONS.map(m => {
          const isActive = m.id === market;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setMarket(m.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold scale-[1.01]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <span>{m.flag}</span>
              <span>{m.label} ({m.symbol})</span>
            </button>
          );
        })}
      </div>
    );
  }

  const isDark = variant === 'dark';
  const isFooter = variant === 'footer';

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Select market. Currently selected: ${current.label} (${current.currency})`}
        className={`group flex items-center gap-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
          isFooter
            ? 'px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 bg-white hover:bg-slate-50 shadow-sm'
            : isDark
            ? 'px-3.5 py-1.5 text-xs font-semibold border border-white/15 bg-white/10 text-white hover:bg-white/15'
            : 'px-3.5 py-1.5 text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm'
        }`}
      >
        <span className="text-sm" aria-hidden="true">🌍</span>
        <span className="font-semibold text-slate-800">
          {current.label} · {current.currency} {current.symbol}
        </span>
        <ChevronDown
          size={13}
          aria-hidden="true"
          className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180 text-blue-600' : 'group-hover:text-slate-600'}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Available commercial markets"
          className={`absolute mt-2 w-56 rounded-2xl bg-white p-1.5 shadow-xl border border-slate-200/90 z-50 animate-fade-in ${
            isFooter ? 'bottom-full mb-2 left-0' : 'right-0'
          }`}
        >
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
            Select Commercial Market
          </div>
          {MARKET_OPTIONS.map(m => {
            const isSelected = m.id === market;
            return (
              <button
                key={m.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  setMarket(m.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                  isSelected
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-700 hover:bg-slate-50 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base" aria-hidden="true">{m.flag}</span>
                  <div className="text-left">
                    <div className="text-slate-900 leading-tight">
                      {m.label} · {m.currency} {m.symbol}
                    </div>
                  </div>
                </div>
                {isSelected && <Check size={14} className="text-blue-600 shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
