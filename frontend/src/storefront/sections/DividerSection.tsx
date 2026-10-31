import React from 'react';

interface DividerSectionProps {
  config?: Record<string, unknown>;
  variant?: string;
}

export default function DividerSection({
  config = {},
}: DividerSectionProps) {
  const style = (config.style as string) || 'solid'; // 'solid' | 'dashed' | 'dotted' | 'double'
  const thickness = Number(config.thickness || 1); // 1, 2, 4, 6
  const width = (config.width as string) || '100%'; // '100%', '80%', '60%', '40%', '20%'
  const alignment = (config.alignment as string) || 'center'; // 'center', 'left', 'right'
  const color = (config.color as string) || 'var(--theme-color-border, #E2E8F0)';
  const label = (config.label as string) || '';
  const spacing = (config.spacing as string) || 'md'; // 'sm', 'md', 'lg', 'xl'

  const spacingClass =
    spacing === 'sm'
      ? 'py-4 sm:py-6'
      : spacing === 'lg'
      ? 'py-12 sm:py-16'
      : spacing === 'xl'
      ? 'py-16 sm:py-24'
      : 'py-8 sm:py-10';

  const alignClass =
    alignment === 'left'
      ? 'justify-start'
      : alignment === 'right'
      ? 'justify-end'
      : 'justify-center';

  return (
    <section className={`px-4 sm:px-6 w-full ${spacingClass} flex items-center ${alignClass} bg-transparent`}>
      <div
        className="w-full flex items-center gap-4"
        style={{ maxWidth: width === '100%' ? '100%' : width }}
      >
        {label ? (
          <>
            <div
              className="flex-1 transition-all"
              style={{
                borderTopStyle: style as any,
                borderTopWidth: `${thickness}px`,
                borderTopColor: color,
              }}
            />
            <span
              className="text-xs uppercase tracking-widest font-semibold px-3 py-1 text-slate-500 shrink-0 bg-[var(--theme-color-bg,#ffffff)] rounded-full border border-slate-200 shadow-2xs"
            >
              {label}
            </span>
            <div
              className="flex-1 transition-all"
              style={{
                borderTopStyle: style as any,
                borderTopWidth: `${thickness}px`,
                borderTopColor: color,
              }}
            />
          </>
        ) : (
          <div
            className="w-full transition-all"
            style={{
              borderTopStyle: style as any,
              borderTopWidth: `${thickness}px`,
              borderTopColor: color,
            }}
          />
        )}
      </div>
    </section>
  );
}
