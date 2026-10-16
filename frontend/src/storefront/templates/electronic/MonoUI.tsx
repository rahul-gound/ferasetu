import React, { useCallback, useState } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { Star, Minus, Plus } from 'lucide-react';

/* Shared easing — smooth "premium hardware" curve */
export const EASE = [0.22, 1, 0.36, 1] as const;

export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

export const staggerContainer = (amount = 0.12, delay = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: amount, delayChildren: delay } },
});

export const scrollToId = (id: string) => {
  if (typeof document === 'undefined') return;
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

/* ---------- Ripple hook ---------- */
interface RippleItem {
  id: string;
  x: number;
  y: number;
  size: number;
}

export function useRipple() {
  const [ripples, setRipples] = useState<RippleItem[]>([]);
  const spawn = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = `${Date.now()}-${Math.random()}`;
    const size = Math.max(rect.width, rect.height) * 2.2;
    const x = (e.clientX ?? rect.left + rect.width / 2) - rect.left;
    const y = (e.clientY ?? rect.top + rect.height / 2) - rect.top;
    setRipples((rs) => [...rs, { id, x, y, size }]);
    if (typeof window !== 'undefined') {
      window.setTimeout(() => setRipples((rs) => rs.filter((r) => r.id !== id)), 700);
    }
  }, []);
  return { ripples, spawn };
}

export function Ripples({ ripples, color = 'rgba(255,255,255,0.45)' }: { ripples: RippleItem[]; color?: string }) {
  return (
    <>
      {ripples.map((r) => (
        <span
          key={r.id}
          className="ripple"
          style={{ left: r.x - r.size / 2, top: r.y - r.size / 2, width: r.size, height: r.size, background: color }}
        />
      ))}
    </>
  );
}

/* ---------- Buttons ---------- */
interface ButtonProps extends HTMLMotionProps<'button'> {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export function PrimaryButton({ children, className = '', onClick, ...rest }: ButtonProps) {
  const { ripples, spawn } = useRipple();
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      onClick={(e) => {
        spawn(e);
        onClick?.(e);
      }}
      className={`relative overflow-hidden rounded-md bg-brand font-semibold text-white shadow-sm transition-shadow duration-300 hover:shadow-cta ${className}`}
      {...rest}
    >
      <span className="relative z-10">{children}</span>
      <Ripples ripples={ripples} />
    </motion.button>
  );
}

interface OutlineButtonProps extends ButtonProps {
  tone?: 'brand' | 'gray';
}

export function OutlineButton({ children, tone = 'brand', className = '', onClick, ...rest }: OutlineButtonProps) {
  const { ripples, spawn } = useRipple();
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      onClick={(e) => {
        spawn(e);
        onClick?.(e);
      }}
      className={`${tone === 'brand' ? 'btn-outline-brand' : 'btn-outline-gray'} ${className}`}
      {...rest}
    >
      <span className="relative z-10">{children}</span>
      <Ripples ripples={ripples} color="rgba(228,87,46,0.16)" />
    </motion.button>
  );
}

/* ---------- Rating stars ---------- */
export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-[3px]" aria-label={`Rated ${value} out of 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          size={size}
          strokeWidth={0}
          className={i < value ? 'fill-star text-star' : 'fill-ink/15 text-ink/15'}
        />
      ))}
    </div>
  );
}

/* ---------- Stock pill ---------- */
export function StockPill({ state }: { state?: 'in' | 'out' }) {
  if (!state) return null;
  const inStock = state === 'in';
  return (
    <span
      className={`rounded-md border px-2 py-0.5 text-xs font-medium ${
        inStock ? 'border-stock/50 text-stock' : 'border-red-400/60 text-red-500'
      }`}
    >
      {inStock ? 'In stock' : 'Out of stock'}
    </span>
  );
}

/* ---------- Quantity stepper ---------- */
export function QtyStepper({
  qty,
  onChange,
  small = false,
}: {
  qty: number;
  onChange: (q: number) => void;
  small?: boolean;
}) {
  const btn = `grid place-items-center text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink disabled:opacity-30 ${
    small ? 'h-7 w-7' : 'h-9 w-9'
  }`;
  return (
    <div className={`inline-flex items-center overflow-hidden rounded-md border border-ink/15 ${small ? 'h-7' : 'h-9'}`}>
      <button type="button" className={btn} onClick={() => onChange(qty - 1)} aria-label="Decrease quantity">
        <Minus size={small ? 12 : 14} />
      </button>
      <span className={`min-w-8 text-center font-semibold tabular-nums ${small ? 'text-xs' : 'text-sm'}`}>{qty}</span>
      <button type="button" className={btn} onClick={() => onChange(qty + 1)} aria-label="Increase quantity">
        <Plus size={small ? 12 : 14} />
      </button>
    </div>
  );
}
