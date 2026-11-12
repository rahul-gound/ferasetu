import React, { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';
import FeroMascot from './FeroMascot';

export interface ActionableEmptyStateProps {
  icon?: ReactNode | React.ComponentType<any>;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  expectedOutcome?: string;
  primaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  onGenerateWithAi?: () => void;
  aiPromptLabel?: string;
  badgeText?: string;
}

export default function ActionableEmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  expectedOutcome,
  primaryAction,
  secondaryAction,
  onGenerateWithAi,
  aiPromptLabel = 'Generate with Fera AI',
  badgeText,
}: ActionableEmptyStateProps) {
  const effectiveActionLabel = primaryAction?.label || actionLabel;
  const effectiveActionHref = primaryAction?.href || actionHref;
  const effectiveOnAction = primaryAction?.onClick || onAction;

  const effectiveSecondaryLabel = secondaryAction?.label || secondaryActionLabel;
  const effectiveSecondaryHref = secondaryAction?.href;
  const effectiveOnSecondary = secondaryAction?.onClick || onSecondaryAction;

  const renderIcon = () => {
    if (!icon) return <FeroMascot size={64} showBadge={true} />;
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && ('render' in icon || '$$typeof' in icon))) {
      const IconComponent = icon as React.ComponentType<{ size?: number; className?: string }>;
      return <IconComponent size={28} className="text-[#0052FF]" />;
    }
    return <FeroMascot size={64} showBadge={true} />;
  };

  const renderedIcon = renderIcon();

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center rounded-3xl border border-slate-200/80 bg-white p-8 sm:p-10 text-center shadow-ambient transition-all duration-200 hover:border-slate-300">
      <div className="mb-4 flex items-center justify-center">
        {renderedIcon}
      </div>

      {badgeText && (
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#0052FF] border border-blue-100">
          <ShieldCheck size={14} className="text-[#0052FF]" />
          <span>{badgeText}</span>
        </div>
      )}

      <h3 className="mb-2 text-xl font-bold tracking-tight text-slate-900">{title}</h3>
      <p className="mb-6 text-sm sm:text-base leading-relaxed text-slate-600 max-w-md">{description}</p>

      {expectedOutcome && (
        <div className="mb-6 rounded-xl bg-slate-50 border border-slate-200/80 px-4 py-2 text-xs font-medium text-slate-600">
          {expectedOutcome}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3 w-full">
        {effectiveActionLabel && effectiveActionHref && (
          <Link
            to={effectiveActionHref}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0052FF] hover:bg-[#0047E0] px-5 py-3 text-sm font-bold text-white shadow-md shadow-[#0052FF]/20 transition-all duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052FF] focus-visible:ring-offset-2 min-h-[48px]"
          >
            {effectiveActionLabel}
            <ArrowRight size={16} />
          </Link>
        )}

        {effectiveActionLabel && !effectiveActionHref && effectiveOnAction && (
          <button
            type="button"
            onClick={effectiveOnAction}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0052FF] hover:bg-[#0047E0] px-5 py-3 text-sm font-bold text-white shadow-md shadow-[#0052FF]/20 transition-all duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052FF] focus-visible:ring-offset-2 min-h-[48px] cursor-pointer"
          >
            {effectiveActionLabel}
            <ArrowRight size={16} />
          </button>
        )}

        {onGenerateWithAi && (
          <button
            type="button"
            onClick={onGenerateWithAi}
            className="group inline-flex items-center gap-2 rounded-xl border border-amber-300/80 bg-amber-50/70 hover:bg-amber-100/70 px-5 py-3 text-sm font-bold text-amber-950 transition-all duration-150 hover:-translate-y-0.5 cursor-pointer min-h-[48px]"
          >
            <Sparkles size={16} className="text-[#F59E0B] group-hover:rotate-12 transition-transform duration-200" />
            <span>{aiPromptLabel}</span>
          </button>
        )}

        {effectiveSecondaryLabel && effectiveSecondaryHref && (
          <Link
            to={effectiveSecondaryHref}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200/90 px-5 py-3 text-sm font-bold text-slate-700 transition-all duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 min-h-[48px]"
          >
            {effectiveSecondaryLabel}
          </Link>
        )}

        {effectiveSecondaryLabel && !effectiveSecondaryHref && effectiveOnSecondary && (
          <button
            type="button"
            onClick={effectiveOnSecondary}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200/90 px-5 py-3 text-sm font-bold text-slate-700 transition-all duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 min-h-[48px] cursor-pointer"
          >
            {effectiveSecondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
