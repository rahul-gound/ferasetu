import React, { useState } from 'react';

export interface FeroMascotProps {
  size?: number;
  className?: string;
  variant?: 'guardian' | 'calm' | 'thinking' | 'celebrating';
  showBadge?: boolean;
  mode?: 'photo' | 'transparent' | 'vector';
  aspect?: 'square' | 'portrait';
  shape?: 'rounded' | 'circle' | 'natural';
}

/**
 * Fero — The Sovereign Lion Guardian of FeraSetu.
 * An iconic, protective character representing merchant independence,
 * 0% platform toll, and unyielding defense of merchant ownership.
 */
export default function FeroMascot({
  size = 64,
  className = '',
  variant = 'guardian',
  showBadge = true,
  mode = 'photo',
  aspect = 'square',
  shape = 'rounded',
}: FeroMascotProps) {
  const [imageFailed, setImageFailed] = useState(false);

  const isPortrait = aspect === 'portrait';
  const width = size;
  const height = isPortrait ? Math.round(size * 1.41) : size;

  const shapeClass =
    shape === 'circle'
      ? 'rounded-full'
      : shape === 'natural'
      ? 'rounded-none'
      : 'rounded-2xl';

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width, height }}
      aria-label="Fero, the protective lion guardian of FeraSetu"
      role="img"
    >
      {/* Ambient Sovereign Aura */}
      <div
        className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#0052FF]/15 via-[#F59E0B]/15 to-[#FF6B00]/15 blur-md -z-10"
        aria-hidden="true"
      />

      {mode !== 'vector' && !imageFailed ? (
        <div
          className={`relative w-full h-full overflow-hidden border border-[#F59E0B]/40 bg-white shadow-sm transition-transform duration-300 hover:scale-105 ${shapeClass}`}
        >
          <picture className="w-full h-full block">
            <source
              srcSet={
                mode === 'transparent'
                  ? '/pictures/fero-mascot-transparent.webp'
                  : '/pictures/fero-mascot.webp'
              }
              type="image/webp"
            />
            <img
              src={
                mode === 'transparent'
                  ? '/pictures/fero-mascot-transparent.png'
                  : '/pictures/fero-mascot.jpg'
              }
              alt="Fero — Sovereign Lion Guardian of FeraSetu"
              className={`w-full h-full object-top ${
                mode === 'transparent' ? 'object-contain' : 'object-cover'
              }`}
              loading="lazy"
              onError={() => setImageFailed(true)}
            />
          </picture>
        </div>
      ) : (
        /* Outer Protective Shield Emblem (Vector SVG Fallback) */
        <svg
          width={width}
          height={height}
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-xs transition-transform duration-300 hover:scale-105"
        >
          <defs>
            <linearGradient id="feroShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0A0F1D" />
              <stop offset="100%" stopColor="#111827" />
            </linearGradient>
            <linearGradient id="feroGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="50%" stopColor="#FF6B00" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
            <linearGradient id="feroBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0052FF" />
              <stop offset="100%" stopColor="#4D7CFF" />
            </linearGradient>
            <filter id="feroGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#F59E0B" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Shield Outer Border */}
          <rect
            x="3"
            y="3"
            width="74"
            height="74"
            rx="22"
            fill="url(#feroShieldGrad)"
            stroke="url(#feroBlueGrad)"
            strokeWidth="1.75"
          />

          {/* Inner Subtle Border */}
          <rect
            x="6.5"
            y="6.5"
            width="67"
            height="67"
            rx="18.5"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="1"
          />

          {/* Lion Mane Geometric Crown */}
          <path
            d="M 40 16 
               L 47 22 
               L 56 20 
               L 57 30 
               L 64 35 
               L 60 45 
               L 63 55 
               L 53 60 
               L 48 68 
               L 40 64 
               L 32 68 
               L 27 60 
               L 17 55 
               L 20 45 
               L 16 35 
               L 23 30 
               L 24 20 
               L 33 22 
               Z"
            fill="rgba(0, 82, 255, 0.18)"
            stroke="url(#feroGoldGrad)"
            strokeWidth="1.5"
            strokeLinejoin="round"
            filter="url(#feroGlow)"
          />

          {/* Lion Face Mask */}
          <path
            d="M 28 32
               C 32 26, 48 26, 52 32
               C 55 38, 54 48, 50 56
               C 46 62, 40 65, 40 65
               C 40 65, 34 62, 30 56
               C 26 48, 25 38, 28 32
               Z"
            fill="#111827"
            stroke="rgba(245, 158, 11, 0.6)"
            strokeWidth="1.25"
          />

          {/* Forehead Bridge Emblem */}
          <path
            d="M 36 28 Q 40 24 44 28 L 43 36 Q 40 38 37 36 Z"
            fill="url(#feroBlueGrad)"
          />

          {/* Lion Eyes */}
          <ellipse cx="34" cy="39" rx="2.5" ry="1.75" fill="#F59E0B" />
          <ellipse cx="46" cy="39" rx="2.5" ry="1.75" fill="#F59E0B" />
          <circle cx="34.5" cy="38.75" r="0.8" fill="#FFFFFF" />
          <circle cx="46.5" cy="38.75" r="0.8" fill="#FFFFFF" />

          {/* Lion Brow */}
          <path
            d="M 31 35 Q 35 34 37 36"
            stroke="#F59E0B"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M 49 35 Q 45 34 43 36"
            stroke="#F59E0B"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Lion Snout & Muzzle */}
          <path
            d="M 37 45 Q 40 43 43 45 L 42 49 Q 40 51 38 49 Z"
            fill="#F59E0B"
          />
          <path
            d="M 40 51 L 40 55 M 40 55 Q 36 57 34 54 M 40 55 Q 44 57 46 54"
            stroke="rgba(255, 255, 255, 0.75)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      )}

      {/* 0% Commission Badge Pill Overlay */}
      {showBadge && (
        <span
          className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-[#10B981] text-white text-[9px] font-mono font-extrabold shadow-sm border border-white flex items-center gap-0.5 z-10"
          title="Fero safeguards your store with 0% platform commission"
        >
          0%
        </span>
      )}
    </div>
  );
}
