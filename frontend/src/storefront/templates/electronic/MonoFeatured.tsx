import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { getElectronicProduct } from './electronicData';
import { useMonoShop } from './MonoContext';
import { fadeUp, staggerContainer, OutlineButton, StockPill, scrollToId } from './MonoUI';

export default function MonoFeatured() {
  const { openQuickView, addToCart, formatPrice, products } = useMonoShop();
  const product = products.find((p) => p.id === 'wh-1000xm5') || getElectronicProduct('wh-1000xm5') || products[0];
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [40, -40]);

  if (!product) return null;

  return (
    <motion.section
      ref={ref}
      id="featured"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      variants={staggerContainer(0.12)}
      className="grid items-center gap-10 md:grid-cols-[minmax(0,45%)_minmax(0,55%)] md:gap-12"
    >
      {/* Parallax product shot */}
      <motion.div variants={fadeUp} className="overflow-hidden rounded-md border border-black/5 bg-white">
        <motion.img
          src={product.img}
          alt={product.name}
          style={{ y }}
          className="h-[380px] w-full object-contain p-6 md:h-[480px]"
          draggable={false}
        />
      </motion.div>

      {/* Copy */}
      <div>
        <motion.p variants={fadeUp} className="text-sm font-medium text-ink/55">
          Featured Product
        </motion.p>
        <motion.h2 variants={fadeUp} className="mt-3 text-5xl font-extrabold tracking-tight text-ink sm:text-[52px]">
          {product.name}
        </motion.h2>
        <motion.p variants={fadeUp} className="mt-4 max-w-[360px] text-[15px] leading-relaxed text-ink/70">
          {product.desc}
        </motion.p>

        <motion.div variants={fadeUp} className="mt-7 flex items-center gap-3">
          <span className="text-[15px] font-semibold text-ink">Starting at {formatPrice(product.price)}</span>
          <StockPill state={product.stock} />
        </motion.div>

        {/* Spec pills — slide in from the right, 0.1s stagger */}
        <motion.ul variants={staggerContainer(0.1, 0.15)} className="mt-7 space-y-2.5">
          {product.specs.map((spec) => (
            <motion.li
              key={spec}
              variants={{
                hidden: { opacity: 0, x: 40 },
                show: { opacity: 1, x: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
              }}
              className="w-fit rounded-full border border-ink/10 bg-surface px-4 py-1.5 text-[13px] font-medium text-ink/75"
            >
              {spec}
            </motion.li>
          ))}
        </motion.ul>

        <motion.div variants={fadeUp} className="mt-9 flex flex-wrap gap-4">
          <OutlineButton className="px-6 py-2.5 text-sm" onClick={() => openQuickView(product.id)}>
            Quick View
          </OutlineButton>
          <OutlineButton tone="gray" className="px-6 py-2.5 text-sm" onClick={() => scrollToId('compare')}>
            Product Details
          </OutlineButton>
          <OutlineButton tone="gray" className="px-6 py-2.5 text-sm" onClick={() => addToCart(product.id)}>
            Add to Cart
          </OutlineButton>
        </motion.div>
      </div>
    </motion.section>
  );
}
