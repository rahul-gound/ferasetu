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
  const { categories, selectedCategory, setSelectedCategory } = useStorefront();

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

        {/* Scrollable category pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-[var(--theme-radius-button)] text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-[var(--theme-color-primary)] text-white shadow-sm'
                : 'bg-[var(--theme-color-surface)] text-[var(--theme-color-text-muted)] border border-[var(--theme-color-border)] hover:border-slate-400'
            }`}
          >
            All Products
          </button>

          {categories.map((cat) => {
            const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-[var(--theme-radius-button)] text-xs font-bold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-[var(--theme-color-primary)] text-white shadow-sm'
                    : 'bg-[var(--theme-color-surface)] text-[var(--theme-color-text-muted)] border border-[var(--theme-color-border)] hover:border-slate-400'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
