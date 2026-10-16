import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useMonoShop } from './MonoContext';
import { fadeUp, staggerContainer, OutlineButton, scrollToId } from './MonoUI';

export default function MonoSplitBanner() {
  const { openQuickView, formatPrice } = useMonoShop();

  return (
    <motion.section
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      variants={staggerContainer(0.12)}
      className="grid overflow-hidden rounded-md md:grid-cols-2"
    >
      <motion.div variants={fadeUp} className="flex min-h-[320px] flex-col justify-end bg-surface p-10 sm:p-12">
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => openQuickView('airpods-pro-2')}
          className="mb-5 flex w-fit items-center gap-2 rounded-full border border-ink/10 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-ink/70 transition-colors hover:border-brand/40 hover:text-brand"
        >
          New · AirPods Pro 2 — {formatPrice(249)} <ArrowRight size={12} />
        </motion.button>
        <h3 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-[42px]">
          BUILT FOR THE
          <br />
          WAY YOU WORK.
        </h3>
        <p className="mt-5 max-w-[340px] text-[15px] leading-relaxed text-ink/70">
          With its ultra-fast processor and ample RAM, your workflow will be smoother than ever.
        </p>
        <div className="mt-8">
          <OutlineButton tone="gray" className="bg-white/70 px-6 py-2.5 text-sm" onClick={() => scrollToId('catalog')}>
            Learn more
          </OutlineButton>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="relative min-h-[300px] overflow-hidden">
        <motion.img
          src="/earbuds.jpg"
          alt="Wireless earbuds on a concrete block"
          initial={{ scale: 1.12 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
      </motion.div>
    </motion.section>
  );
}
