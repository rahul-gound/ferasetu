import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { useMonoShop } from './MonoContext';

export default function MonoToasts() {
  const { toasts } = useMonoShop();

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            className="flex items-center gap-2 rounded-full border border-black/10 bg-ink px-4 py-2 text-xs font-semibold text-white shadow-xl"
          >
            <span className="grid h-4 w-4 place-items-center rounded-full bg-stock text-white">
              <Check size={10} strokeWidth={3} />
            </span>
            <span>{t.msg}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
