import React, { useState, useMemo } from 'react';
import { Package, Search, SlidersHorizontal } from 'lucide-react';
import { useStorefront } from '../runtime/StorefrontProvider';
import ProductCard from '../components/ProductCard';
import type { CardVariant } from '../theme/themeTypes';
import { sanitizeText } from '../utilities/formatting';

interface ProductGridSectionProps {
  config?: Record<string, unknown>;
  variant?: string;
}

export default function ProductGridSection({
  config = {},
  variant,
}: ProductGridSectionProps) {
  const { filteredProducts, selectedCategory, searchQuery, setSearchQuery } = useStorefront();

  const title = sanitizeText((config.title as string) || 'Our Products');
  const subtitle = sanitizeText((config.subtitle as string) || '');
  const columns = Number(config.columns) || 3;
  const cardVariant = (variant as CardVariant) || (config.cardVariant as CardVariant) || 'clean';

  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'name'>('featured');

  // Sorted list
  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    if (sortBy === 'price-asc') {
      list.sort((a, b) => (a.sale_price ?? a.price) - (b.sale_price ?? b.price));
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => (b.sale_price ?? b.price) - (a.sale_price ?? a.price));
    } else if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [filteredProducts, sortBy]);

  // Determine grid column class
  const gridColsClass =
    columns === 4
      ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
      : columns === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : 'grid-cols-2 sm:grid-cols-3';

  return (
    <section id="products" className="py-10 sm:py-16 px-4 sm:px-6 bg-[var(--theme-color-bg)]">
      <div className="max-w-[var(--theme-max-width)] mx-auto">
        {/* Header with Title & Sort controls */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-[var(--theme-color-border)] gap-4">
          <div>
            <h2
              className="text-2xl sm:text-3xl font-bold text-[var(--theme-color-text)] tracking-tight"
              style={{ fontFamily: 'var(--theme-font-heading)' }}
            >
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs sm:text-sm text-[var(--theme-color-text-muted)] mt-1">
                {subtitle}
              </p>
            )}
            <span className="text-xs text-[var(--theme-color-text-subtle)] block mt-1">
              Showing {sortedProducts.length} product{sortedProducts.length !== 1 ? 's' : ''}
              {selectedCategory !== 'all' ? ` in "${selectedCategory}"` : ''}
            </span>
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <SlidersHorizontal size={14} className="text-[var(--theme-color-text-subtle)]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs font-semibold bg-[var(--theme-color-surface)] border border-[var(--theme-color-border)] rounded-[var(--theme-radius-input)] px-2.5 py-1.5 text-[var(--theme-color-text)] focus:outline-none cursor-pointer"
            >
              <option value="featured">Sort: Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name">Name: A to Z</option>
            </select>
          </div>
        </div>

        {/* Catalog Grid */}
        {sortedProducts.length === 0 ? (
          /* Empty state */
          <div className="py-16 px-6 text-center bg-[var(--theme-color-surface)] rounded-[var(--theme-radius-card)] border border-[var(--theme-color-border)] max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <Package size={28} />
            </div>
            <h3
              className="text-lg font-bold text-[var(--theme-color-text)] mb-1"
              style={{ fontFamily: 'var(--theme-font-heading)' }}
            >
              {searchQuery ? 'No matching products found' : 'Collection in Preparation'}
            </h3>
            <p className="text-xs text-[var(--theme-color-text-muted)] max-w-xs mx-auto mb-6">
              {searchQuery
                ? `We could not find anything matching "${searchQuery}". Try clearing your search.`
                : 'The merchant is curating new inventory for this collection. Please check back shortly.'}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 bg-[var(--theme-color-primary)] text-white text-xs font-bold rounded-[var(--theme-radius-button)]"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : sortedProducts.length === 1 ? (
          /* Single product layout */
          <div className="max-w-md mx-auto">
            <ProductCard
              product={sortedProducts[0]}
              variant={cardVariant}
              showStock={config.showStock !== false}
            />
          </div>
        ) : (
          /* Standard Multi-column grid */
          <div className={`grid ${gridColsClass} gap-[var(--theme-spacing-card-gap)]`}>
            {sortedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                variant={cardVariant}
                showStock={config.showStock !== false}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
