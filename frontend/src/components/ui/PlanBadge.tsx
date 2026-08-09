import { normalizePlanId, getPlanDisplayName, type PlanId } from '../../config/plans';

interface PlanBadgeProps {
  plan: string | undefined | null;
  size?: 'sm' | 'md';
  className?: string;
}

const PLAN_STYLES: Record<PlanId, { bg: string; text: string; border: string; emoji: string }> = {
  free: {
    bg: 'rgba(100,116,139,0.12)',
    text: '#475569',
    border: 'rgba(100,116,139,0.3)',
    emoji: '',
  },
  growth: {
    bg: 'rgba(255,107,53,0.12)',
    text: '#ea580c',
    border: 'rgba(255,107,53,0.35)',
    emoji: '⚡',
  },
  pro: {
    bg: 'rgba(124,58,237,0.12)',
    text: '#7c3aed',
    border: 'rgba(124,58,237,0.35)',
    emoji: '🚀',
  },
};

/**
 * PlanBadge — shows the user's current plan in a small pill.
 * Handles all legacy plan IDs (beta, trial, basic, standard, etc.)
 */
export default function PlanBadge({ plan, size = 'sm', className = '' }: PlanBadgeProps) {
  const normalized = normalizePlanId(plan);
  const style = PLAN_STYLES[normalized];
  const label = getPlanDisplayName(plan);

  const fontSize = size === 'sm' ? 11 : 13;
  const padding = size === 'sm' ? '3px 8px' : '5px 12px';

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding,
        borderRadius: 999,
        border: `1px solid ${style.border}`,
        background: style.bg,
        color: style.text,
        fontSize,
        fontWeight: 700,
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap',
      }}
      aria-label={`Current plan: ${label}`}
    >
      {style.emoji && <span aria-hidden="true">{style.emoji}</span>}
      {label}
    </span>
  );
}
