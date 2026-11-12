import React, { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import FeroMascot from './FeroMascot';

export interface EmotionalEmptyStateProps {
  title: string;
  description: string;
  badgeText?: string;
  primaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  onGenerateWithAi?: () => void;
  aiPromptLabel?: string;
  className?: string;
  trustAnchor?: string;
}

export default function EmotionalEmptyState({
  title,
  description,
  badgeText = 'Sovereign Storefront · 0% Commission',
  primaryAction,
  secondaryAction,
  onGenerateWithAi,
  aiPromptLabel = 'Generate with Fera AI',
  className = '',
  trustAnchor = 'Your data & customer list belong 100% to you.',
}: EmotionalEmptyStateProps) {
  return (
    <div
      className={`mx-auto flex max-w-xl flex-col items-center rounded-3xl border border-slate-200/80 bg-white p-8 sm:p-10 text-center shadow-ambient transition-all duration-200 hover:border-slate-300 ${className}`}
    >
      {/* Fero Mascot Slot */}
      <div className="relative mb-5 flex items-center justify-center">
        <FeroMascot size={72} showBadge={true} />
      </div>

      {/* Trust Pill */}
      {badgeText && (
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-blue-50/80 px-3 py-1 text-xs font-semibold text-[#0052FF] border border-blue-100">
          <ShieldCheck size={14} className="text-[#0052FF]" />
          <span>{badgeText}</span>
        </div>
      )}

      {/* Heading & Reassuring Body */}
      <h3 className="mb-2 text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
        {title}
      </h3>
      <p className="mb-6 max-w-md text-sm sm:text-base leading-relaxed text-slate-600">
        {description}
      </p>

      {/* Action Area */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md mb-6">
        {primaryAction && primaryAction.href && (
          <Link
            to={primaryAction.href}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#0052FF] hover:bg-[#0047E0] active:scale-[0.98] px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-[#0052FF]/20 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052FF] focus-visible:ring-offset-2 min-h-[48px]"
          >
            {primaryAction.icon}
            <span>{primaryAction.label}</span>
            <ArrowRight size={16} />
          </Link>
        )}

        {primaryAction && !primaryAction.href && primaryAction.onClick && (
          <button
            type="button"
            onClick={primaryAction.onClick}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#0052FF] hover:bg-[#0047E0] active:scale-[0.98] px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-[#0052FF]/20 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052FF] focus-visible:ring-offset-2 min-h-[48px]"
          >
            {primaryAction.icon}
            <span>{primaryAction.label}</span>
            <ArrowRight size={16} />
          </button>
        )}

        {/* Fera AI Generator Shortcut */}
        {onGenerateWithAi && (
          <button
            type="button"
            onClick={onGenerateWithAi}
            className="w-full sm:w-auto group inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300/80 bg-amber-50/70 hover:bg-amber-100/70 text-amber-950 px-5 py-3.5 text-sm font-bold transition-all duration-150 cursor-pointer hover:border-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 min-h-[48px] shadow-2xs"
          >
            <Sparkles size={16} className="text-[#F59E0B] group-hover:rotate-12 transition-transform duration-200" />
            <span>{aiPromptLabel}</span>
          </button>
        )}

        {secondaryAction && secondaryAction.href && (
          <Link
            to={secondaryAction.href}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-5 py-3.5 text-sm font-semibold transition-all duration-150 cursor-pointer min-h-[48px]"
          >
            {secondaryAction.label}
          </Link>
        )}

        {secondaryAction && !secondaryAction.href && secondaryAction.onClick && (
          <button
            type="button"
            onClick={secondaryAction.onClick}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-5 py-3.5 text-sm font-semibold transition-all duration-150 cursor-pointer min-h-[48px]"
          >
            {secondaryAction.label}
          </button>
        )}
      </div>

      {/* Trust Anchor Guarantee */}
      {trustAnchor && (
        <div className="pt-4 border-t border-slate-100 w-full flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium">
          <CheckCircle2 size={13} className="text-[#10B981]" />
          <span>{trustAnchor}</span>
        </div>
      )}
    </div>
  );
}
