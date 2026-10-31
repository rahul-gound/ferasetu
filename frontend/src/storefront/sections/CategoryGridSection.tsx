import React from 'react';
import { useStorefront } from '../runtime/StorefrontProvider';
import { sanitizeText } from '../utilities/formatting';

interface CategoryGridSectionProps {
  config?: Record<string, unknown>;
  variant?: string;
}

export default function CategoryGridSection({
  config = {},
  variant = 'pill-slider',
}: CategoryGridSectionProps) {
  const { categories, selectedCategory, setSelectedCategory, products } = useStorefront();

  const title = sanitizeText((config.title as string) || 'Shop by Category');

  if (categories.length === 0) return null;

  return (
    <section id="categories" className="py-6 sm:py-8 px-4 sm:px-6 bg-[var(--theme-color-bg)]">
      <div className="max-w-[var(--theme-max-width)] mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-base sm:text-lg font-bold text-[var(--theme-color-text)] tracking-tight"
            style={{ fontFamily: 'var(--theme-font-heading)' }}
          >
            {title}
          </h2>
          {selectedCategory !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className="text-xs font-semibold text-[var(--theme-color-primary)] hover:underline"
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* Scrollable category pills with counts & Fitts's Law touch targets */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`min-h-[42px] px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 flex items-center gap-2 ${
              selectedCategory === 'all'
                ? 'bg-[var(--theme-color-primary,#0F172A)] text-white shadow-sm'
                : 'bg-[var(--theme-color-surface,#FFFFFF)] text-slate-700 border border-slate-200 hover:border-slate-400'
            }`}
          >
            <span>All Products</span>
            {products.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {products.length}
              </span>
            )}
          </button>

          {categories.map((cat) => {
            const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
            const catCount = products.filter(
              (p) => (p.category || '').trim().toLowerCase() === cat.trim().toLowerCase()
            ).length;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`min-h-[42px] px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 flex items-center gap-2 ${
                  isSelected
                    ? 'bg-[var(--theme-color-primary,#0F172A)] text-white shadow-sm'
                    : 'bg-[var(--theme-color-surface,#FFFFFF)] text-slate-700 border border-slate-200 hover:border-slate-400'
                }`}
              >
                <span>{cat}</span>
                {catCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {catCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
