import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface PublicSmoothScrollProps {
  children: React.ReactNode;
}

/**
 * Resilient, Hardware-Accelerated Smooth Scroll Controller for Public Marketing Routes.
 *
 * Designed to solve scroll locking, freezes, and gesture drop across all browsers:
 * - Android (Chrome, Brave, Samsung Internet, Android WebView, Helium): Native touch gestures & overscroll bounce.
 * - Windows 11 (Precision Touchpad, high-DPI mouse wheel, touchscreens): 0% momentum fighting or wheel hijacking.
 * - Brave & Helium (Privacy/Ungoogled Chromium): No RAF throttling traps, compositor thread is never blocked.
 * - Passive scroll event listeners ({ passive: true }) for buttery 60/120fps compositor scrolling.
 * - Backward-compatible `(window).__lenis` shim so legacy callers execute native smooth scroll cleanly.
 * - Smooth anchor navigation (#complete-circuit, #pricing, etc.) with navbar compensation.
 * - Instant scroll restoration on route changes.
 */
export default function PublicSmoothScroll({ children }: PublicSmoothScrollProps) {
  const progressBarRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    // Ensure GSAP lag smoothing is safely configured (500ms lag threshold, 33ms tick compensation)
    gsap.ticker.lagSmoothing(500, 33);

    // Provide robust backward-compatible __lenis shim for legacy component calls
    const lenisShim = {
      scrollTo: (target: number | HTMLElement | string, options?: { offset?: number; immediate?: boolean; duration?: number }) => {
        let top = 0;
        const offset = options?.offset || 0;
        if (typeof target === 'number') {
          top = target + offset;
        } else if (typeof target === 'string') {
          const el = document.querySelector(target);
          if (el) {
            const rect = el.getBoundingClientRect();
            top = rect.top + window.scrollY + offset;
          }
        } else if (target instanceof HTMLElement) {
          const rect = target.getBoundingClientRect();
          top = rect.top + window.scrollY + offset;
        }

        const prefersReducedMotion =
          typeof window !== 'undefined' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        window.scrollTo({
          top: Math.max(0, top),
          behavior: options?.immediate || prefersReducedMotion ? 'instant' as ScrollBehavior : 'smooth',
        });
      },
      raf: () => {},
      on: () => () => {},
      off: () => {},
      destroy: () => {},
      stop: () => {},
      start: () => {},
    };

    if (typeof window !== 'undefined') {
      (window as any).__lenis = lenisShim;
    }

    // High-performance passive scroll tracker for top progress bar & ScrollTrigger sync
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const docElem = document.documentElement;
          const docBody = document.body;
          const scrollTop = docElem.scrollTop || docBody.scrollTop || 0;
          const scrollHeight = (docElem.scrollHeight || docBody.scrollHeight) - docElem.clientHeight;
          const progress = scrollHeight > 0 ? Math.min(Math.max(scrollTop / scrollHeight, 0), 1) : 0;

          if (progressBarRef.current) {
            progressBarRef.current.style.transform = `scaleX(${progress})`;
          }

          ScrollTrigger.update();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Keep ScrollTrigger synchronized on window resize, orientation change, and font load
    const handleResize = () => {
      ScrollTrigger.refresh();
      handleScroll();
    };
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    if (document.fonts) {
      document.fonts.ready.then(() => {
        ScrollTrigger.refresh();
      });
    }

    // Initial sync
    handleScroll();

    // Handle anchor navigation smoothly without jank
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;
      const href = target.getAttribute('href');
      if (href && href.startsWith('#') && href.length > 1) {
        const targetElement = document.querySelector(href);
        if (targetElement) {
          e.preventDefault();
          const targetRect = targetElement.getBoundingClientRect();
          const targetY = targetRect.top + window.scrollY - 76; // 76px sticky header clearance
          window.scrollTo({
            top: Math.max(0, targetY),
            behavior: 'smooth',
          });
          window.history.pushState(null, '', href);
        }
      }
    };
    document.addEventListener('click', handleAnchorClick);

    return () => {
      document.removeEventListener('click', handleAnchorClick);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (typeof window !== 'undefined') {
        delete (window as any).__lenis;
      }
    };
  }, []);

  // Handle route changes: scroll to hash or top cleanly
  useEffect(() => {
    if (location.hash) {
      const targetElement = document.querySelector(location.hash);
      if (targetElement) {
        const targetRect = targetElement.getBoundingClientRect();
        const targetY = targetRect.top + window.scrollY - 76;
        window.scrollTo({ top: Math.max(0, targetY), behavior: 'instant' as ScrollBehavior });
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname, location.hash]);

  return (
    <>
      <div
        ref={progressBarRef}
        className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-600 via-blue-500 to-orange-500 z-[100] origin-left pointer-events-none transform scale-x-0 will-change-transform"
        aria-hidden="true"
      />
      {children}
    </>
  );
}
