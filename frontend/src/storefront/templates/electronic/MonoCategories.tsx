import React from 'react';
import { motion } from 'framer-motion';
import { CATEGORIES } from './electronicData';
import { useMonoShop } from './MonoContext';
import { fadeUp, staggerContainer } from './MonoUI';

export default function MonoCategories() {
  const { selectCategory, products } = useMonoShop();

  const categoriesList = React.useMemo(() => {
    const rawCategories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
    if (rawCategories.length > 0 && products.length > 0) {
      return rawCategories.map((catKey) => {
        const prod = products.find((p) => p.category === catKey);
        return {
          key: catKey,
          label: catKey.charAt(0).toUpperCase() + catKey.slice(1).replace(/-/g, ' '),
          img: prod?.img || '/products/macbook-pro-14.png',
        };
      });
    }
    return CATEGORIES;
  }, [products]);

  return (
    <motion.section
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      variants={staggerContainer(0.07)}
      aria-label="Browse categories"
    >
      <h2 className="mb-6 text-2xl font-bold tracking-tight text-ink">Categories</h2>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        {categoriesList.map((cat) => {
          const count = products.filter((p) => p.category === cat.key).length;
          return (
            <motion.button
              key={cat.key}
              variants={fadeUp}
              whileHover={{ y: -4, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
              onClick={() => selectCategory(cat.key)}
              className="group text-left"
            >
              <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-md border border-transparent bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.05)] transition-all duration-300 group-hover:border-brand/30 group-hover:shadow-glow">
                <img
                  src={cat.img}
                  alt={cat.label}
                  loading="lazy"
                  className="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <p className="mt-3 text-sm font-medium text-ink/80 transition-colors group-hover:text-ink">
                {cat.label} <span className="text-xs text-ink/40">({count})</span>
              </p>
            </motion.button>
          );
        })}
      </div>
    </motion.section>
  );
}
