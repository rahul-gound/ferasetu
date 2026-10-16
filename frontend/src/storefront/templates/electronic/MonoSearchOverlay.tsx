import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, CornerDownLeft } from 'lucide-react';
import { useMonoShop } from './MonoContext';
import { Stars } from './MonoUI';

export default function MonoSearchOverlay() {
  const { ui, openSearch, products, openQuickView, formatPrice } = useMonoShop();
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ui.search) {
      setQ('');
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [ui.search]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') openSearch(false);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
  }, [openSearch]);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return products.slice(0, 5);
    return products.filter((p) => `${p.brand} ${p.name} ${p.sub} ${p.category}`.toLowerCase().includes(query));
  }, [q, products]);

  return (
    <AnimatePresence>
      {ui.search && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm"
          onClick={() => openSearch(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-20 w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Search products"
          >
            <div className="flex items-center gap-3 border-b border-black/5 px-5 py-4">
              <Search size={18} className="text-ink/40" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search MacBooks, iPhones, Sony audio…"
                className="flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink/35"
              />
              <button
                onClick={() => openSearch(false)}
                className="grid h-8 w-8 place-items-center rounded-full text-ink/50 transition-colors hover:bg-ink/5 hover:text-ink"
                aria-label="Close search"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-2">
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-ink/40">
                {q.trim() ? `${results.length} result${results.length === 1 ? '' : 's'}` : 'Popular now'}
              </p>
              {results.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-ink/50">
                  Nothing matches “{q}”. Try “MacBook”, “Sony” or “watch”.
                </p>
              ) : (
                results.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      openSearch(false);
                      openQuickView(p.id);
                    }}
                    className="flex w-full items-center gap-4 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface"
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-black/5 bg-white">
                      <img src={p.img} alt={p.name} className="h-full w-full object-contain p-1" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{p.name}</span>
                      <span className="block text-xs text-ink/50">
                        {p.brand} · {p.category}
                      </span>
                    </span>
                    <Stars value={p.rating} size={12} />
                    <span className="text-sm font-bold text-ink">{formatPrice(p.price)}</span>
                    <CornerDownLeft size={14} className="text-ink/30" />
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
