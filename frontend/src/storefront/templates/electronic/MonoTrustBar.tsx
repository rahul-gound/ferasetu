import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Award, RotateCcw, Truck, Headphones } from 'lucide-react';
import { TRUST_ITEMS } from './electronicData';
import { staggerContainer } from './MonoUI';

const ICONS = {
  shield: ShieldCheck,
  award: Award,
  returns: RotateCcw,
  truck: Truck,
  support: Headphones,
};

const popIn = {
  hidden: { opacity: 0, scale: 0.8 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 260, damping: 18 },
  },
};

export default function MonoTrustBar() {
  return (
    <motion.section
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-40px' }}
      variants={staggerContainer(0.09)}
      aria-label="Trust service"
    >
      <h2 className="mb-7 text-2xl font-bold tracking-tight text-ink">Trust service</h2>

      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-8">
        {TRUST_ITEMS.map((item) => {
          const Icon = ICONS[item.icon];
          return (
            <motion.div
              key={item.label}
              variants={popIn}
              whileHover={{ y: -3 }}
              className="flex w-[96px] flex-col items-center gap-3 sm:w-[104px]"
            >
              <span className="grid h-12 w-12 place-items-center rounded-full border border-ink/25 text-ink/80 transition-colors duration-300 hover:border-brand hover:text-brand">
                <Icon size={18} strokeWidth={1.6} />
              </span>
              <span className="text-center text-[13px] font-medium leading-snug text-ink/80">{item.label}</span>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}
