import { useState } from 'react';
import { PLAN_PRICES } from '../../config/plans';
import { useLanguage } from '../../contexts/LanguageContext';

interface ValueCalculatorProps {
  billingCycle?: 'monthly' | 'yearly';
}

export default function ValueCalculator({ billingCycle = 'monthly' }: ValueCalculatorProps) {
  const { translate: t } = useLanguage();
  const [ordersPerWeek, setOrdersPerWeek] = useState(10);
  const [avgOrderValue, setAvgOrderValue] = useState(350);

  // Derive the active plan cost from the Growth plan using the SSOT
  const monthlyPlanCost = billingCycle === 'yearly' 
    ? PLAN_PRICES.growth.yearlyPerMonth 
    : PLAN_PRICES.growth.monthly;

  const weeklyRevenue = ordersPerWeek * avgOrderValue;
  const monthlyRevenue = weeklyRevenue * 4;
  
  // Calculate percentage of revenue
  const planCostPct = monthlyRevenue > 0 
    ? ((monthlyPlanCost / monthlyRevenue) * 100).toFixed(1) 
    : '—';
    
  const timeSavedPerWeek = Math.round(ordersPerWeek * 5); // estimate 5 min/order saved

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  return (
    <section
      aria-label="Value calculator"
      style={{
        borderRadius: 24,
        padding: '36px 32px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#fff',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Background decoration */}
      <div style={{
        position: 'absolute', top: -60, right: -60, width: 200, height: 200,
        borderRadius: '50%', background: 'rgba(37,99,235,0.15)',
        filter: 'blur(40px)',
        pointerEvents: 'none',
      }} aria-hidden="true" />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <p style={{
          display: 'inline-block', fontSize: 11, fontWeight: 800,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: '#60a5fa', marginBottom: 12,
          background: 'rgba(59,130,246,0.15)', padding: '4px 12px', borderRadius: 999,
        }}>
          {t('calc.tag')}
        </p>
        <h2 style={{
          fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 900,
          letterSpacing: '-0.03em', margin: '0 0 8px', lineHeight: 1.1, color: '#fff',
        }}>
          {t('calc.title')}
        </h2>
        <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 32px', lineHeight: 1.7, fontWeight: 500 }}>
          {t('calc.desc')}
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 24, marginBottom: 32,
        }}>
          {/* Slider 1 */}
          <div>
            <label
              htmlFor="orders-slider"
              style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#cbd5e1', marginBottom: 12 }}
            >
              {t('calc.orders')}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <input
                id="orders-slider"
                type="range" min="1" max="100" value={ordersPerWeek}
                onChange={e => setOrdersPerWeek(Number(e.target.value))}
                aria-valuemin={1} aria-valuemax={100} aria-valuenow={ordersPerWeek}
                style={{ flex: 1, accentColor: '#2563EB', cursor: 'pointer' }}
              />
              <span style={{
                minWidth: 40, fontSize: 20, fontWeight: 900, color: '#60a5fa',
                textAlign: 'right',
              }}>
                {ordersPerWeek}
              </span>
            </div>
          </div>

          {/* Slider 2 */}
          <div>
            <label
              htmlFor="value-slider"
              style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#cbd5e1', marginBottom: 12 }}
            >
              {t('calc.aov')}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <input
                id="value-slider"
                type="range" min="50" max="5000" step="50" value={avgOrderValue}
                onChange={e => setAvgOrderValue(Number(e.target.value))}
                aria-valuemin={50} aria-valuemax={5000} aria-valuenow={avgOrderValue}
                style={{ flex: 1, accentColor: '#2563EB', cursor: 'pointer' }}
              />
              <span style={{
                minWidth: 60, fontSize: 20, fontWeight: 900, color: '#60a5fa',
                textAlign: 'right',
              }}>
                {formatCurrency(avgOrderValue)}
              </span>
            </div>
          </div>
        </div>

        {/* Results */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 16, marginBottom: 24,
        }}>
          <div style={{
            padding: '18px 20px', borderRadius: 16,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('calc.estOrders')}
            </p>
            <p style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.03em' }}>
              {(ordersPerWeek * 4).toLocaleString('en-IN')}
            </p>
          </div>
          <div style={{
            padding: '18px 20px', borderRadius: 16,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('calc.estRevenue')}
            </p>
            <p style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.03em' }}>
              {formatCurrency(monthlyRevenue)}
            </p>
          </div>
          <div style={{
            padding: '18px 20px', borderRadius: 16,
            background: 'rgba(37,99,235,0.15)',
            border: '1px solid rgba(37,99,235,0.3)',
          }}>
            <p style={{ fontSize: 12, color: '#93c5fd', fontWeight: 700, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('calc.planCost')}
            </p>
            <p style={{ fontSize: 28, fontWeight: 900, color: '#60a5fa', margin: 0, letterSpacing: '-0.03em' }}>
              {planCostPct}%
            </p>
            <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 0', fontWeight: 500 }}>
              {t('calc.basedOn', { billing: billingCycle, price: formatCurrency(monthlyPlanCost) })}
            </p>
          </div>
          <div style={{
            padding: '18px 20px', borderRadius: 16,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('calc.timeSaved')}
            </p>
            <p style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.03em' }}>
              ~{timeSavedPerWeek} min
            </p>
          </div>
        </div>

        {/* Honest disclaimer */}
        <div style={{
          padding: '14px 18px', borderRadius: 14,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', lineHeight: 1.7, fontWeight: 500 }}>
            <strong style={{ color: '#cbd5e1' }}>{t('calc.disclaimerTitle')}</strong> {t('calc.disclaimerText')}
          </p>
        </div>
      </div>
    </section>
  );
}
