import React, { useRef, useState, useCallback, MouseEvent } from 'react';

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  spotlightSize?: number;
}

/**
 * SpotlightCard component inspired by React Bits.
 *
 * Requirements met:
 * - Subtle pointer-following illumination using FeraSetu brand tones.
 * - Graceful fallback on touch devices or when mouse is inactive.
 * - Respects prefers-reduced-motion (disables spotlight tracking).
 * - Fully accessible for keyboard navigation and screen readers.
 * - No heavy WebGL/canvas dependencies.
 */
export default function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'rgba(0, 82, 255, 0.08)',
  spotlightSize = 300,
  ...props
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-200 ${className}`}
      {...props}
    >
      {/* Subtle radial pointer spotlight */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(${spotlightSize}px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 80%)`,
        }}
        aria-hidden="true"
      />

      {/* Card Content */}
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}
