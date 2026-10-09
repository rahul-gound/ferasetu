import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface PublicSmoothScrollProps {
  children: React.ReactNode;
}

/**
 * Dedicated Lenis Smooth Scroll Provider for Public Marketing Routes.
 *
 * Requirements met:
 * - Scoped exclusively to PublicLayout (never wraps dashboards, admin, auth, or storefronts).
 * - Synchronizes with GSAP ticker in milliseconds with zero lag smoothing.
 * - Single RAF loop controlled by GSAP (autoRaf: false).
 * - ScrollTrigger updated on Lenis scroll events.
 * - Preserves native touch scrolling (syncTouch: false).
 * - Respects prefers-reduced-motion.
 * - Anchor link support (#complete-circuit, #pricing, etc.).
 * - Correct scroll positioning upon route changes.
 * - Full cleanup on unmount.
 */
export default function PublicSmoothScroll({ children }: PublicSmoothScrollProps) {
  const lenisRef = useRef<Lenis | null>(null);
  const location = useLocation();

  useEffect(() => {
    // Respect user's reduced motion preferences
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      return;
    }

    // Initialize Lenis without internal RAF loop
    const lenis = new Lenis({
      autoRaf: false, // Critical: GSAP ticker drives the RAF loop
      smoothWheel: true,
      syncTouch: false, // Preserve native touch scrolling
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    lenisRef.current = lenis;

    // Update ScrollTrigger on Lenis scroll events
    const handleScroll = () => {
      ScrollTrigger.update();
    };
    lenis.on('scroll', handleScroll);

    // Advance Lenis from GSAP ticker in milliseconds (time * 1000)
    const tickerCallback = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tickerCallback);

    // Disable GSAP ticker lag smoothing as recommended by Lenis documentation
    gsap.ticker.lagSmoothing(0);

    // Handle anchor navigation smoothly
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;
      const href = target.getAttribute('href');
      if (href && href.startsWith('#') && href.length > 1) {
        const targetElement = document.querySelector(href);
        if (targetElement) {
          e.preventDefault();
          lenis.scrollTo(targetElement as HTMLElement, {
            offset: -72,
            duration: 1.2,
          });
          // Update URL hash without jumping
          window.history.pushState(null, '', href);
        }
      }
    };
    document.addEventListener('click', handleAnchorClick);

    return () => {
      document.removeEventListener('click', handleAnchorClick);
      gsap.ticker.remove(tickerCallback);
      lenis.off('scroll', handleScroll);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Handle route changes: scroll to hash or top
  useEffect(() => {
    if (lenisRef.current) {
      if (location.hash) {
        const targetElement = document.querySelector(location.hash);
        if (targetElement) {
          lenisRef.current.scrollTo(targetElement as HTMLElement, {
            immediate: true,
            offset: -72,
          });
          return;
        }
      }
      lenisRef.current.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.hash]);

  return <>{children}</>;
}
