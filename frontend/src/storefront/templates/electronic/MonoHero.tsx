import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { EASE, fadeUp, staggerContainer, PrimaryButton, OutlineButton, scrollToId } from './MonoUI';

const HEADLINE = ['PERFORMANCE,', 'WITHOUT', 'COMPROMISE.'];

export default function MonoHero() {
  const ref = useRef<HTMLElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const sx = useSpring(mx, { stiffness: 120, damping: 18 });
  const sy = useSpring(my, { stiffness: 120, damping: 18 });
  const rotateY = useTransform(sx, [0, 1], [-7, 7]);
  const rotateX = useTransform(sy, [0, 1], [5, -5]);

  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };

  const onLeave = () => {
    mx.set(0.5);
    my.set(0.5);
  };

  return (
    <motion.section
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      id="top"
      className="relative flex min-h-[540px] overflow-hidden rounded-md bg-gradient-to-br from-[#f4f4f2] via-[#e9e9e7] to-[#d8d8d6] lg:min-h-[620px]"
    >
      {/* Copy — staggered fade-up */}
      <motion.div
        variants={staggerContainer(0.14, 0.15)}
        initial="hidden"
        animate="show"
        className="relative z-10 max-w-[560px] px-8 pb-44 pt-14 sm:px-12 sm:pt-20 lg:pb-52"
      >
        <h1 className="text-[44px] font-extrabold leading-[1.04] tracking-tight text-ink sm:text-6xl">
          {HEADLINE.map((line) => (
            <motion.span key={line} variants={fadeUp} className="block">
              {line}
            </motion.span>
          ))}
        </h1>
        <motion.p variants={fadeUp} className="mt-6 max-w-[280px] text-[15px] leading-relaxed text-ink/70">
          Powerful technology designed for work, creativity and everything between.
        </motion.p>
        <motion.div variants={fadeUp} className="mt-9 flex flex-wrap gap-4">
          <PrimaryButton className="px-6 py-3 text-sm" onClick={() => scrollToId('catalog')}>
            Explore products
          </PrimaryButton>
          <OutlineButton tone="gray" className="bg-white/60 px-6 py-3 text-sm" onClick={() => scrollToId('compare')}>
            View specifications
          </OutlineButton>
        </motion.div>
      </motion.div>

      {/* Laptop render — cursor-driven 3D tilt + gentle idle float */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.25 }}
        className="pointer-events-none absolute bottom-0 right-[-6%] w-[68%] max-w-[680px] sm:right-[-2%] sm:w-[58%]"
        style={{ rotateX, rotateY, transformPerspective: 1000, transformOrigin: '50% 85%' }}
      >
        <motion.img
          src="/hero-laptop.jpg"
          alt="MONO flagship laptop on a concrete pedestal"
          animate={{ y: [0, -9, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          draggable={false}
          className="h-auto w-full select-none object-contain"
          style={{
            maskImage: 'linear-gradient(to right, transparent 0%, black 16%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 16%)',
          }}
        />
      </motion.div>
    </motion.section>
  );
}
