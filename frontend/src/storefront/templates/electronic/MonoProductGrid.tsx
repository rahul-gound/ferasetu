import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye } from 'lucide-react';
import { CATEGORIES, type ElectronicProduct } from './electronicData';
import { useMonoShop } from './MonoContext';
import { fadeUp, staggerContainer, useRipple, Ripples, Stars, StockPill } from './MonoUI';

function AddToCartButton({ product }: { product: ElectronicProduct }) {
  const { addToCart } = useMonoShop();
  const [added, setAdded] = useState(false);
  const { ripples, spawn } = useRipple();
  const out = product.stock === 'out';

  const click = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (out || added) return;
    spawn(e);
    setAdded(true);
    addToCart(product.id);
    if (typeof window !== 'undefined') {
      window.setTimeout(() => setAdded(false), 1300);
    }
  };

  return (
    <motion.button
      whileTap={out ? undefined : { scale: 0.94 }}
      onClick={click}
      disabled={out}
      aria-label={out ? 'Out of stock' : `Add ${product.name} to cart`}
      className={`relative h-9 min-w-[100px] overflow-hidden rounded-md px-3.5 text-[13px] font-semibold text-white transition-colors duration-300 ${
        out ? 'cursor-not-allowed bg-ink/20' : added ? 'bg-stock' : 'bg-brand hover:bg-brand-600'
      }`}
    >
      <span className="relative z-10 grid place-items-center">
        <AnimatePresence mode="wait" initial={false}>
          {added ? (
            <motion.span
              key="check"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <motion.path
                  d="M3 8.5 6.5 12 13 4.5"
                  stroke="white"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                />
              </svg>
            </motion.span>
          ) : (
            <motion.span
              key="label"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              {out ? 'Out of Stock' : 'Add to Cart'}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <Ripples ripples={ripples} />
    </motion.button>
  );
}

function ProductCard({ product }: { product: ElectronicProduct }) {
  const { openQuickView, formatPrice } = useMonoShop();
  return (
    <motion.article
      layout
      variants={fadeUp}
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      className="group rounded-md bg-white p-2 transition-shadow duration-300 hover:shadow-lift"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-sm border border-black/5 bg-white">
        <img
          src={product.img}
          alt={product.name}
          loading="lazy"
          className={`h-full w-full transition-transform duration-300 ease-smooth group-hover:scale-[1.05] ${
            product.fit === 'cover' ? 'object-cover' : 'object-contain p-5'
          }`}
        />
        <div className="absolute inset-0 grid place-items-center bg-ink/0 opacity-0 transition-all duration-300 group-hover:bg-ink/15 group-hover:opacity-100">
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => openQuickView(product.id)}
            className="flex translate-y-2 items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs font-semibold text-ink shadow-lg transition-transform duration-300 group-hover:translate-y-0"
          >
            <Eye size={14} /> Quick view
          </motion.button>
        </div>
      </div>

      <div className="px-1 pb-1 pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/45">{product.brand}</p>
        <h3 className="mt-0.5 text-[15px] font-semibold leading-tight text-ink">{product.name}</h3>
        <p className="mt-1 truncate text-xs text-ink/50">{product.sub}</p>

        <div className="mt-3 flex items-center justify-between">
          {product.reviews > 0 ? (
            <Stars value={product.rating} />
          ) : (
            <span className="text-[11px] font-medium text-ink/40">Direct from store</span>
          )}
          <StockPill state={product.stock} />
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-[15px] font-bold text-ink">{formatPrice(product.price)}</span>
          <AddToCartButton product={product} />
        </div>
      </div>
    </motion.article>
  );
}

export default function MonoProductGrid() {
  const { products, filter, setFilter } = useMonoShop();
  const filtered = filter === 'all' ? products : products.filter((p) => p.category === filter);
  const chips = React.useMemo(() => {
    const rawCategories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
    if (rawCategories.length > 0 && products.length > 0) {
      return [
        { key: 'all', label: 'All' },
        ...rawCategories.map((c) => ({
          key: c,
          label: c.charAt(0).toUpperCase() + c.slice(1).replace(/-/g, ' '),
        })),
      ];
    }
    return [{ key: 'all', label: 'All' }, ...CATEGORIES.map((c) => ({ key: c.key, label: c.label }))];
  }, [products]);

  return (
    <motion.section
      id="catalog"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      variants={staggerContainer(0.06)}
      aria-label="Product catalog"
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {chips.map((c) => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
              filter === c.key ? 'bg-ink text-white shadow-sm' : 'bg-surface text-ink/60 hover:bg-ink/10 hover:text-ink'
            }`}
          >
            {c.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-ink/40">{filtered.length} products</span>
      </div>

      <motion.div layout className="grid grid-cols-2 gap-5 sm:grid-cols-3 sm:gap-6">
        <AnimatePresence mode="popLayout">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </AnimatePresence>
      </motion.div>
    </motion.section>
  );
}
