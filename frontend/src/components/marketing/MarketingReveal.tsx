import { useEffect, useRef, useState, type ReactNode } from 'react';

interface MarketingRevealProps {
  children: ReactNode;
  className?: string;
}

export default function MarketingReveal({
  children,
  className = ''
}: MarketingRevealProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // If running in SSR or browser without IntersectionObserver or reduced motion, reveal immediately
    if (
      typeof window === 'undefined' ||
      !('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setIsVisible(true);
      return;
    }

    const element = elementRef.current;
    if (!element) return;

    // Fail-safe: if intersection observer fails to fire within 700ms, force visible so content is never stuck hidden
    const safetyTimer = setTimeout(() => {
      setIsVisible(true);
    }, 700);

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            clearTimeout(safetyTimer);
            setIsVisible(true);
            observer.disconnect();
          }
        }
      },
      {
        rootMargin: '120px 0px 120px 0px',
        threshold: 0,
      }
    );

    observer.observe(element);
    return () => {
      clearTimeout(safetyTimer);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={elementRef}
      className={`marketing-reveal ${isVisible ? 'marketing-reveal-visible' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
