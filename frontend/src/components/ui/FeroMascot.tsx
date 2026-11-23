import React from 'react';
import { ShieldCheck } from 'lucide-react';

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
 * Fero — Store Operations Intelligence & Security Emblem.
 * A precision architectural mark representing autonomous inventory auditing,
 * direct bank settlement verification, and 0% platform commission protection.
 */
export default function FeroMascot({
  size = 48,
  className = '',
  showBadge = true,
}: FeroMascotProps) {
  const iconSize = Math.max(18, Math.round(size * 0.45));

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
      aria-label="FeraSetu Store Intelligence"
      role="img"
    >
      {/* Precision Structural Emblem */}
      <div className="w-full h-full rounded-2xl bg-slate-900 border border-slate-800 text-white flex items-center justify-center shadow-sm transition-transform duration-200 hover:scale-[1.03]">
        <div className="relative flex items-center justify-center">
          <ShieldCheck size={iconSize} className="text-[#0052FF]" strokeWidth={2} />
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#EA580C]" />
        </div>
      </div>

      {/* 0% Commission Sovereign Badge */}
      {showBadge && (
        <span
          className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold shadow-xs border border-white leading-none tracking-tight flex items-center justify-center z-10"
          title="0% platform commission protection"
        >
          0%
        </span>
      )}
    </div>
  );
}
