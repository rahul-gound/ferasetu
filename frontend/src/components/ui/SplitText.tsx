import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

interface SplitTextProps {
  text: string;
  className?: string;
  highlightText?: string;
  highlightClassName?: string;
  delay?: number;
  duration?: number;
  stagger?: number;
  tag?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
}

/**
 * SplitText component for restrained, accessible headline animations.
 *
 * Requirements met:
 * - Keeps plain text accessible to screen readers and search crawlers (via sr-only and aria-hidden).
 * - Restrained entrance: small y translation (8-12px) and opacity fade.
 * - Respects prefers-reduced-motion by rendering static text immediately.
 * - No blocking delay or huge animation loops.
 */
export default function SplitText({
  text,
  className = '',
  highlightText = '',
  highlightClassName = '',
  delay = 0.05,
  duration = 0.45,
  stagger = 0.035,
  tag: Tag = 'h1',
}: SplitTextProps) {
  const containerRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    // Respect user's reduced motion preferences
    if (typeof window === 'undefined') return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    if (!containerRef.current) return;

    const words = containerRef.current.querySelectorAll<HTMLElement>('.split-word');
    if (!words.length) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        words,
        {
          opacity: 0,
          y: 10,
        },
        {
          opacity: 1,
          y: 0,
          duration,
          stagger,
          delay,
          ease: 'power2.out',
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [delay, duration, stagger]);

  const fullText = highlightText ? `${text} ${highlightText}` : text;
  const baseWords = text.split(' ').filter(Boolean);
  const highlightWords = highlightText.split(' ').filter(Boolean);

  return (
    <Tag ref={containerRef} className={className} aria-label={fullText}>
      {/* Screen-reader accessible full text */}
      <span className="sr-only">{fullText}</span>

      {/* Visual animated word tokens */}
      <span aria-hidden="true" className="inline">
        {baseWords.map((word, idx) => (
          <span
            key={`base-${idx}`}
            className="split-word inline-block mr-[0.28em] will-change-transform"
          >
            {word}
          </span>
        ))}
        {highlightWords.length > 0 && (
          <span className={highlightClassName}>
            {highlightWords.map((word, idx) => (
              <span
                key={`hl-${idx}`}
                className="split-word inline-block mr-[0.28em] will-change-transform"
              >
                {word}
              </span>
            ))}
          </span>
        )}
      </span>
    </Tag>
  );
}
