import { Check, X, ArrowRight, Loader2 } from 'lucide-react';
import type { PlanDefinition } from '../../config/plans';
import { useLanguage } from '../../contexts/LanguageContext';

interface PricingCardProps {
  plan: PlanDefinition;
  isCurrentPlan?: boolean;
  billingCycle: 'monthly' | 'yearly';
  loading?: boolean;
  onSelect: (plan: PlanDefinition) => void;
  isAuthenticated?: boolean;
}

export default function PricingCard({
  plan,
  isCurrentPlan,
  billingCycle,
  loading,
  onSelect,
  isAuthenticated,
}: PricingCardProps) {
  const { translate: t } = useLanguage();
  const price = billingCycle === 'yearly' ? plan.price.yearlyPerMonth : plan.price.monthly;
  const totalYearly = plan.price.yearly;
  const isFree = plan.price.monthly === 0;

  const CARD_STYLES: Record<string, React.CSSProperties> = {
    free: {
      background: '#fff',
      border: '1px solid #e2e8f0',
    },
    growth: {
      background: 'linear-gradient(160deg, #fff7ed 0%, #ffffff 50%)',
      border: '2px solid #FF6B35',
      transform: 'translateY(-8px)',
      boxShadow: '0 24px 60px rgba(255,107,53,0.15)',
    },
    pro: {
      background: 'linear-gradient(160deg, #f5f3ff 0%, #ffffff 50%)',
      border: '1px solid rgba(124,58,237,0.3)',
    },
  };

  const ACCENT_COLORS: Record<string, string> = {
    free: '#64748b',
    growth: '#FF6B35',
    pro: '#7c3aed',
  };

  const accentColor = ACCENT_COLORS[plan.id] ?? '#64748b';
  const cardStyle = CARD_STYLES[plan.id] ?? CARD_STYLES.free;

  const getButtonLabel = () => {
    if (isCurrentPlan) return t('card.current');
    if (isFree) return isAuthenticated ? t('card.current') : plan.ctaText;
    if (!isAuthenticated) return plan.ctaText;
    return plan.ctaText;
  };

  return (
    <article
      aria-label={`${plan.displayName} plan — ₹${price}/month`}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 24,
        padding: '28px 26px',
        boxShadow: '0 8px 32px rgba(15,23,42,0.06)',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        ...cardStyle,
      }}
      onMouseEnter={e => {
        if (plan.id !== 'growth') {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 20px 50px rgba(15,23,42,0.1)';
        }
      }}
      onMouseLeave={e => {
        if (plan.id !== 'growth') {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(15,23,42,0.06)';
        }
      }}
    >
      {/* Most Popular badge */}
      {plan.highlighted && (
        <div
          aria-label="Most popular plan"
          style={{
            position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)',
            background: '#FF6B35', color: '#fff',
            fontSize: 11, fontWeight: 800, letterSpacing: '0.05em',
            padding: '4px 14px', borderRadius: '0 0 12px 12px',
            whiteSpace: 'nowrap',
          }}
        >
          {t('card.popular')}
        </div>
      )}

      {/* Plan header */}
      <div style={{ marginBottom: 20, paddingTop: plan.highlighted ? 8 : 0 }}>
        <h2 style={{
          fontSize: 22, fontWeight: 900, color: '#0f172a',
          letterSpacing: '-0.03em', margin: '0 0 6px',
        }}>
          {plan.displayName}
        </h2>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
          {plan.tagline}
        </p>
      </div>

      {/* Price */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#64748b' }}>₹</span>
          <span style={{
            fontSize: 52, fontWeight: 900, color: '#0f172a',
            letterSpacing: '-0.05em', lineHeight: 1,
          }}>
            {isFree ? '0' : price.toLocaleString('en-IN')}
          </span>
          <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 600, marginLeft: 4 }}>
            /mo
          </span>
        </div>
        {!isFree && billingCycle === 'yearly' && (
          <p style={{
            margin: '6px 0 0', fontSize: 12, color: '#10b981', fontWeight: 700,
            background: 'rgba(16,185,129,0.1)', padding: '3px 8px',
            borderRadius: 999, display: 'inline-block',
          }}>
            {t('card.save', { total: totalYearly.toLocaleString('en-IN') })}
          </p>
        )}
        {!isFree && billingCycle === 'monthly' && (
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
            {t('card.day', { price: Math.round(price / 30).toLocaleString('en-IN') })}
          </p>
        )}
      </div>

      {/* Outcome */}
      <div style={{
        margin: '16px 0', padding: '12px 14px', borderRadius: 12,
        background: `rgba(${accentColor === '#FF6B35' ? '255,107,53' : accentColor === '#7c3aed' ? '124,58,237' : '100,116,139'},0.06)`,
        borderLeft: `3px solid ${accentColor}`,
      }}>
        <p style={{ margin: 0, fontSize: 13, color: '#334155', fontWeight: 700, lineHeight: 1.5 }}>
          {plan.outcome}
        </p>
      </div>

      {/* Features */}
      <ul
        aria-label={`${plan.displayName} plan features`}
        style={{ flex: 1, listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        {plan.features.map(feature => (
          <li
            key={feature.label}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              opacity: feature.included ? 1 : 0.5,
            }}
          >
            <span style={{ flexShrink: 0, marginTop: 1 }}>
              {feature.included
                ? <Check size={15} color="#10b981" strokeWidth={3} aria-hidden="true" />
                : <X size={15} color="#94a3b8" strokeWidth={2} aria-hidden="true" />
              }
            </span>
            <span style={{
              fontSize: 13, fontWeight: feature.included ? 600 : 500,
              color: feature.included ? '#1e293b' : '#94a3b8',
              lineHeight: 1.4,
            }}>
              {feature.label}
              {feature.note && (
                <span style={{
                  marginLeft: 6, fontSize: 11, fontWeight: 700,
                  color: '#94a3b8', background: 'rgba(148,163,184,0.15)',
                  padding: '1px 6px', borderRadius: 4,
                }}>
                  {feature.note}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <button
        id={`pricing-cta-${plan.id}`}
        disabled={!!loading || isCurrentPlan || (isFree && isAuthenticated)}
        onClick={() => onSelect(plan)}
        aria-label={`${getButtonLabel()} — ${plan.displayName} plan`}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', minHeight: 50, borderRadius: 14, border: 'none',
          background: isCurrentPlan || (isFree && isAuthenticated)
            ? '#e2e8f0'
            : accentColor === '#FF6B35'
              ? '#FF6B35'
              : accentColor === '#7c3aed'
                ? '#7c3aed'
                : '#0f172a',
          color: isCurrentPlan || (isFree && isAuthenticated) ? '#64748b' : '#fff',
          fontSize: 14, fontWeight: 800, cursor: isCurrentPlan || (isFree && isAuthenticated) ? 'not-allowed' : 'pointer',
          transition: 'transform 0.2s ease, filter 0.2s ease',
          boxShadow: isCurrentPlan || (isFree && isAuthenticated) ? 'none'
            : `0 10px 28px ${accentColor}40`,
        }}
        onMouseEnter={e => {
          if (!isCurrentPlan && !(isFree && isAuthenticated)) {
            (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.08)';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
          }
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.filter = 'none';
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
        }}
      >
        {loading
          ? <Loader2 size={18} className="animate-spin" aria-label="Loading..." />
          : <>{getButtonLabel()}{!isCurrentPlan && !(isFree && isAuthenticated) && <ArrowRight size={16} />}</>
        }
      </button>

      {/* Trust line */}
      {!isFree && (
        <p style={{
          textAlign: 'center', margin: '10px 0 0',
          fontSize: 11, color: '#94a3b8', fontWeight: 600,
        }}>
          {t('card.cancel')}
        </p>
      )}
    </article>
  );
}
