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
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.16 }
    );

    observer.observe(element);
    return () => observer.disconnect();
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
