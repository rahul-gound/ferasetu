import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Truck, ShieldCheck } from 'lucide-react';
import { useMonoShop } from './MonoContext';
import { PrimaryButton, QtyStepper, Stars, StockPill } from './MonoUI';

export default function MonoQuickView() {
  const { ui, openQuickView, addToCart, products, formatPrice } = useMonoShop();
  const product = ui.quickView ? products.find((p) => p.id === ui.quickView) : null;
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setQty(1);
  }, [ui.quickView]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') openQuickView(null);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
  }, [openQuickView]);

  return (
    <AnimatePresence>
      {product && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[85] grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => openQuickView(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 28, scale: 0.96 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="grid w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl md:grid-cols-2"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={product.name}
          >
            <div className="relative grid place-items-center border-b border-black/5 bg-white p-8 md:border-b-0 md:border-r">
              <motion.img
                key={product.id}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                src={product.img}
                alt={product.name}
                className={`max-h-[300px] w-full md:max-h-[380px] ${
                  product.fit === 'cover' ? 'h-full max-h-none object-cover' : 'object-contain'
                }`}
              />
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/45">{product.brand}</p>
                  <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">{product.name}</h2>
                  <p className="mt-0.5 text-xs text-ink/50">{product.sub}</p>
                </div>
                <button
                  onClick={() => openQuickView(null)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink/50 transition-colors hover:bg-ink/5 hover:text-ink"
                  aria-label="Close quick view"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <Stars value={product.rating} />
                <span className="text-xs text-ink/50">{product.reviews.toLocaleString()} reviews</span>
                <StockPill state={product.stock} />
              </div>

              <p className="mt-4 text-sm leading-relaxed text-ink/70">{product.desc}</p>

              <ul className="mt-4 space-y-1.5">
                {product.specs.map((s) => (
                  <li key={s} className="flex items-center gap-2 text-[13px] text-ink/75">
                    <Check size={13} className="shrink-0 text-stock" /> {s}
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex items-end justify-between">
                <div>
                  <p className="text-xs text-ink/50">Price</p>
                  <p className="text-2xl font-extrabold text-ink">{formatPrice(product.price)}</p>
                </div>
                <QtyStepper qty={qty} onChange={(q) => setQty(Math.max(1, q))} />
              </div>

              <PrimaryButton
                className="mt-4 w-full py-3 text-sm"
                disabled={product.stock === 'out'}
                onClick={() => {
                  addToCart(product.id, qty);
                  openQuickView(null);
                }}
                style={product.stock === 'out' ? { background: 'rgba(20,20,20,0.2)', cursor: 'not-allowed' } : undefined}
              >
                {product.stock === 'out' ? 'Out of stock' : `Add ${qty} to cart`}
              </PrimaryButton>

              <div className="mt-4 flex items-center justify-center gap-5 text-[11px] text-ink/50">
                <span className="flex items-center gap-1.5">
                  <Truck size={13} /> Free delivery
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={13} /> 2-year warranty
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
