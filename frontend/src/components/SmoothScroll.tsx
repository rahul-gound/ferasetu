import React, { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import { useLocation } from 'react-router-dom';

/**
 * High-Performance SmoothScroll component using on-demand RAF.
 * Automatically goes to sleep when idle to ensure 0% CPU overhead,
 * honoring reduced motion and skipping emulation on touch/mobile devices.
 */
export default function SmoothScroll({ children }: { children?: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const location = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Respect user preference for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    // Mobile / touch devices natively handle smooth inertial scrolling with hardware acceleration
    const isTouchOrCoarse =
      window.matchMedia('(pointer: coarse)').matches ||
      ('ontouchstart' in window) ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
      window.innerWidth < 1024;
    if (isTouchOrCoarse) return;

    const lenis = new Lenis({
      duration: 1.0,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.0,
      infinite: false,
    });
    lenisRef.current = lenis;

    let rafId: number | null = null;
    let isTicking = false;

    // On-demand RAF loop: runs ONLY while scrolling / settling, then sleeps to eliminate idle CPU drain
    function tick(time: number) {
      lenis.raf(time);
      const isSettled = !lenis.isScrolling && Math.abs(lenis.scroll - lenis.actualScroll) < 0.1;
      if (!isSettled) {
        rafId = requestAnimationFrame(tick);
      } else {
        isTicking = false;
        rafId = null;
      }
    }

    function wakeUp() {
      if (!isTicking) {
        isTicking = true;
        rafId = requestAnimationFrame(tick);
      }
    }

    window.addEventListener('wheel', wakeUp, { passive: true });
    window.addEventListener('scroll', wakeUp, { passive: true });
    window.addEventListener('keydown', wakeUp, { passive: true });

    return () => {
      window.removeEventListener('wheel', wakeUp);
      window.removeEventListener('scroll', wakeUp);
      window.removeEventListener('keydown', wakeUp);
      if (rafId !== null) cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Reset scroll to top cleanly on route navigation
  useEffect(() => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
    } else if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);

  return <>{children}</>;
}
