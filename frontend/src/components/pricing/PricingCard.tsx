import { Check, X, ArrowRight, Loader2 } from 'lucide-react';
import type { PlanDefinition } from '../../config/plans';
import { useLanguage } from '../../contexts/LanguageContext';
import { useMarket } from '../../contexts/MarketContext';

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
  const { market, config } = useMarket();

  const price = billingCycle === 'yearly' ? plan.price.yearlyPerMonth : plan.price.monthly;
  const totalYearly = plan.price.yearly;
  const isFree = plan.price.monthly === 0;

  const CARD_STYLES: Record<string, React.CSSProperties> = {
    free: {
      background: '#ffffff',
      border: '1px solid #e2e8f0',
    },
    starter: {
      background: '#ffffff',
      border: '1px solid #cbd5e1',
    },
    business: {
      background: '#ffffff',
      border: '2px solid #2563eb',
      transform: 'translateY(-8px)',
      boxShadow: '0 24px 60px rgba(37,99,235,0.12)',
    },
    growth: {
      background: '#ffffff',
      border: '2px solid #2563eb',
      transform: 'translateY(-8px)',
      boxShadow: '0 24px 60px rgba(37,99,235,0.12)',
    },
    pro: {
      background: '#ffffff',
      border: '1px solid #94a3b8',
      boxShadow: '0 8px 32px rgba(15,23,42,0.06)',
    },
  };

  const ACCENT_COLORS: Record<string, string> = {
    free: '#64748b',
    starter: '#2563eb',
    business: '#2563eb',
    growth: '#2563eb',
    pro: '#1e3a8a',
  };

  const accentColor = ACCENT_COLORS[plan.id] ?? '#64748b';
  const cardStyle = CARD_STYLES[plan.id] ?? CARD_STYLES.free;

  const formattedPrice = isFree
    ? '0'
    : market === 'IN'
      ? price.toLocaleString('en-IN')
      : price.toLocaleString(market === 'EU' ? 'de-DE' : 'en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  const formattedTotalYearly = market === 'IN'
    ? totalYearly.toLocaleString('en-IN')
    : totalYearly.toLocaleString(market === 'EU' ? 'de-DE' : 'en-US');

  const getButtonLabel = () => {
    if (isCurrentPlan) return t('card.current');
    if (isFree) return isAuthenticated ? t('card.current') : plan.ctaText;
    if (!isAuthenticated) return plan.ctaText;
    return plan.ctaText;
  };

  const badgeText = plan.badge || (plan.highlighted ? t('card.popular') : null);

  return (
    <article
      aria-label={`${plan.displayName} plan — ${config.symbol}${formattedPrice}/month`}
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
        if (!plan.highlighted && plan.id !== 'business' && plan.id !== 'growth') {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 20px 50px rgba(15,23,42,0.1)';
        }
      }}
      onMouseLeave={e => {
        if (!plan.highlighted && plan.id !== 'business' && plan.id !== 'growth') {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(15,23,42,0.06)';
        }
      }}
    >
      {/* Popular / 14-day trial badge */}
      {badgeText && (
        <div
          aria-label={badgeText}
          style={{
            position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)',
            background: '#FF6B35', color: '#fff',
            fontSize: 11, fontWeight: 800, letterSpacing: '0.05em',
            padding: '4px 14px', borderRadius: '0 0 12px 12px',
            whiteSpace: 'nowrap',
          }}
        >
          {badgeText}
        </div>
      )}

      {/* Plan header */}
      <div style={{ marginBottom: 20, paddingTop: badgeText ? 8 : 0 }}>
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
          <span style={{ fontSize: 20, fontWeight: 800, color: '#64748b' }}>{config.symbol}</span>
          <span style={{
            fontSize: 52, fontWeight: 900, color: '#0f172a',
            letterSpacing: '-0.05em', lineHeight: 1,
          }}>
            {formattedPrice}
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
            {t('card.save', { total: `${config.symbol}${formattedTotalYearly}` })}
          </p>
        )}
        {!isFree && billingCycle === 'monthly' && (
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
            {market === 'IN'
              ? t('card.day', { price: `${config.symbol}${Math.round(price / 30).toLocaleString('en-IN')}` })
              : `${config.symbol}${(price / 30).toFixed(2)}/day`
            }
          </p>
        )}
      </div>

      {/* Outcome */}
      <div style={{
        margin: '16px 0', padding: '12px 14px', borderRadius: 12,
        background: plan.id === 'business' || plan.id === 'growth' ? 'rgba(37,99,235,0.06)' : 'rgba(100,116,139,0.06)',
        borderLeft: `3px solid ${plan.id === 'business' || plan.id === 'growth' ? '#2563eb' : accentColor}`,
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
            : plan.id === 'pro'
              ? '#0f172a'
              : '#2563eb',
          color: isCurrentPlan || (isFree && isAuthenticated) ? '#64748b' : '#fff',
          fontSize: 14, fontWeight: 800, cursor: isCurrentPlan || (isFree && isAuthenticated) ? 'not-allowed' : 'pointer',
          transition: 'transform 0.2s ease, filter 0.2s ease',
          boxShadow: isCurrentPlan || (isFree && isAuthenticated) ? 'none'
            : plan.id === 'pro'
              ? '0 10px 24px rgba(15,23,42,0.2)'
              : '0 10px 24px rgba(37,99,235,0.25)',
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
          {market === 'IN' ? t('card.cancel') : '14 days free. Cancel anytime.'}
        </p>
      )}
    </article>
  );
}
