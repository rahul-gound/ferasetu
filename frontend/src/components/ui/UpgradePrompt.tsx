import { useNavigate } from 'react-router-dom';
import { ArrowRight, Zap } from 'lucide-react';
import { getPlan, getNextPlan, normalizePlanId, type PlanId } from '../../config/plans';

interface UpgradePromptProps {
  /** Why is this prompt being shown? */
  reason: string;
  /** What outcome will the upgrade give? */
  benefit: string;
  /** Which plan to upgrade to (defaults to next plan up) */
  targetPlan?: PlanId;
  /** Current user plan */
  currentPlan?: string | null;
  /** Visual variant */
  variant?: 'inline' | 'banner' | 'gate';
  /** Called when the upgrade CTA is clicked */
  onUpgradeClick?: () => void;
}

/**
 * UpgradePrompt — a contextual, non-annoying upgrade nudge.
 *
 * Rules:
 * - Only shown when genuinely relevant (caller decides when to mount it)
 * - Never shown as a random popup
 * - No fake urgency, no countdown timers
 * - Clear, honest benefit statement
 */
export default function UpgradePrompt({
  reason,
  benefit,
  targetPlan,
  currentPlan,
  variant = 'inline',
  onUpgradeClick,
}: UpgradePromptProps) {
  const navigate = useNavigate();
  const next = targetPlan
    ? getPlan(targetPlan)
    : getNextPlan(currentPlan);

  if (!next) return null; // already on top plan

  const handleClick = () => {
    onUpgradeClick?.();
    navigate('/upgrade');
  };

  if (variant === 'gate') {
    return (
      <div
        role="region"
        aria-label="Upgrade required"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: '48px 24px',
          textAlign: 'center',
          borderRadius: 20,
          background: 'rgba(255,107,53,0.04)',
          border: '1px dashed rgba(255,107,53,0.3)',
        }}
      >
        <div style={{
          width: 48, height: 48, borderRadius: 16,
          background: 'rgba(255,107,53,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#FF6B35',
        }}>
          <Zap size={24} />
        </div>
        <div>
          <p style={{ fontWeight: 700, color: '#0f172a', marginBottom: 6, fontSize: 16 }}>
            {reason}
          </p>
          <p style={{ color: '#64748b', fontSize: 14, maxWidth: 360, lineHeight: 1.6 }}>
            {benefit}
          </p>
        </div>
        <button
          id={`upgrade-prompt-${next.id}`}
          onClick={handleClick}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 20px', borderRadius: 14, border: 'none',
            background: '#FF6B35', color: '#fff',
            fontWeight: 800, fontSize: 14, cursor: 'pointer',
            transition: 'transform 0.2s ease, filter 0.2s ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.05)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.filter = 'none'; }}
        >
          Explore {next.displayName} — ₹{next.price.monthly}/mo
          <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div
        role="alert"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16, flexWrap: 'wrap',
          padding: '14px 20px', borderRadius: 14,
          background: 'linear-gradient(135deg, rgba(255,107,53,0.08), rgba(255,107,53,0.04))',
          border: '1px solid rgba(255,107,53,0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Zap size={18} color="#FF6B35" />
          <span style={{ fontSize: 14, color: '#0f172a', fontWeight: 600 }}>
            {reason} — {benefit}
          </span>
        </div>
        <button
          id={`upgrade-banner-${next.id}`}
          onClick={handleClick}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 10, border: 'none',
            background: '#FF6B35', color: '#fff',
            fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          Upgrade to {next.displayName}
          <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  // Default: 'inline'
  return (
    <div
      role="complementary"
      aria-label="Upgrade suggestion"
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 14,
        padding: '16px 18px', borderRadius: 14,
        background: 'rgba(255,107,53,0.05)',
        border: '1px solid rgba(255,107,53,0.2)',
      }}
    >
      <Zap size={16} color="#FF6B35" style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
          {reason}
        </p>
        <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, marginBottom: 10 }}>
          {benefit}
        </p>
        <button
          id={`upgrade-inline-${next.id}`}
          onClick={handleClick}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 10, border: 'none',
            background: '#FF6B35', color: '#fff',
            fontWeight: 700, fontSize: 12, cursor: 'pointer',
          }}
        >
          See {next.displayName} plan
          <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}
