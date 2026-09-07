import { Globe, ChevronDown, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useMarket } from '../../contexts/MarketContext';
import { MARKET_CONFIGS, type Market } from '../../config/pricing';

interface MarketSelectorProps {
  variant?: 'light' | 'dark' | 'pills';
  className?: string;
}

const MARKETS: { id: Market; label: string; currency: string; flag: string; symbol: string }[] = [
  { id: 'US', label: 'United States', currency: 'USD', symbol: '$', flag: '🇺🇸' },
  { id: 'EU', label: 'Europe', currency: 'EUR', symbol: '€', flag: '🇪🇺' },
  { id: 'IN', label: 'India', currency: 'INR', symbol: '₹', flag: '🇮🇳' },
];

export default function MarketSelector({ variant = 'light', className = '' }: MarketSelectorProps) {
  const { market, setMarket } = useMarket();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = MARKETS.find(m => m.id === market) || MARKETS[0];

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  if (variant === 'pills') {
    return (
      <div
        role="radiogroup"
        aria-label="Select currency and regional pricing"
        className={`inline-flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 shadow-inner ${className}`}
      >
        {MARKETS.map(m => {
          const isActive = m.id === market;
          return (
            <button
              key={m.id}
              role="radio"
              aria-checked={isActive}
              onClick={() => setMarket(m.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isActive
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{m.flag}</span>
              <span>{m.currency} ({m.symbol})</span>
            </button>
          );
        })}
      </div>
    );
  }

  const isDark = variant === 'dark';

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Select market and currency"
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
          isDark
            ? 'border-white/15 bg-white/10 text-white hover:bg-white/15'
            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm'
        }`}
      >
        <span className="text-sm">{current.flag}</span>
        <span>{current.currency} ({current.symbol})</span>
        <ChevronDown size={13} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 mt-1.5 w-48 rounded-2xl bg-white p-1.5 shadow-2xl border border-slate-100 z-50 animate-fade-in"
        >
          <div className="px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Regional Pricing
          </div>
          {MARKETS.map(m => {
            const isSelected = m.id === market;
            return (
              <button
                key={m.id}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  setMarket(m.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  isSelected
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{m.flag}</span>
                  <div className="text-left">
                    <div className="font-bold text-slate-900 leading-tight">{m.label}</div>
                    <div className="text-[10px] text-slate-500">{m.currency} ({m.symbol})</div>
                  </div>
                </div>
                {isSelected && <Check size={14} className="text-blue-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
