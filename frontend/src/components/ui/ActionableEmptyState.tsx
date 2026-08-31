import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface ActionableEmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  expectedOutcome?: string;
}

export default function ActionableEmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  expectedOutcome,
}: ActionableEmptyStateProps) {
  return (
    <div className='mx-auto flex max-w-md flex-col items-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm'>
      {icon && (
        <div className='mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600'>
          {icon}
        </div>
      )}
      <h3 className='mb-2 text-base font-bold text-slate-900'>{title}</h3>
      <p className='mb-5 text-sm leading-relaxed text-slate-600'>{description}</p>

      {actionLabel && actionHref && (
        <Link
          to={actionHref}
          className='inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2'
        >
          {actionLabel}
          <ArrowRight size={16} />
        </Link>
      )}

      {actionLabel && !actionHref && onAction && (
        <button
          type='button'
          onClick={onAction}
          className='inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2'
        >
          {actionLabel}
          <ArrowRight size={16} />
        </button>
      )}

      {expectedOutcome && (
        <p className='mt-5 rounded-xl bg-slate-50 px-4 py-3 text-xs font-semibold leading-relaxed text-slate-600'>
          What happens next: {expectedOutcome}
        </p>
      )}
    </div>
  );
}
