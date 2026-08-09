import { useState } from 'react';

interface ValueCalculatorProps {
  monthlyPlanCost?: number; // default to Growth plan ₹299
}

/**
 * ValueCalculator — "Would FeraSetu pay for itself?"
 *
 * Honest ROI framing:
 * - Does NOT promise X orders or X revenue
 * - Helps users think about their own margins
 * - Shows time saved as well as order value
 * - No dark patterns, no fake numbers
 */
export default function ValueCalculator({ monthlyPlanCost = 299 }: ValueCalculatorProps) {
  const [ordersPerWeek, setOrdersPerWeek] = useState(10);
  const [avgOrderValue, setAvgOrderValue] = useState(350);

  const weeklyRevenue = ordersPerWeek * avgOrderValue;
  const monthlyRevenue = weeklyRevenue * 4;
  const planCostPct = monthlyRevenue > 0 ? ((monthlyPlanCost / monthlyRevenue) * 100).toFixed(1) : '—';
  const timeSavedPerWeek = Math.round(ordersPerWeek * 5); // estimate 5 min/order saved on manual WhatsApp tracking

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
        borderRadius: '50%', background: 'rgba(255,107,53,0.08)',
        filter: 'blur(40px)',
        pointerEvents: 'none',
      }} aria-hidden="true" />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <p style={{
          display: 'inline-block', fontSize: 11, fontWeight: 800,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: '#FF6B35', marginBottom: 12,
          background: 'rgba(255,107,53,0.15)', padding: '4px 12px', borderRadius: 999,
        }}>
          Think About It
        </p>
        <h2 style={{
          fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 900,
          letterSpacing: '-0.03em', margin: '0 0 8px', lineHeight: 1.1, color: '#fff',
        }}>
          Would FeraSetu pay for itself?
        </h2>
        <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 32px', lineHeight: 1.7, fontWeight: 500 }}>
          You know your margins better than we do. Use this to think it through — we won't promise you anything we can't deliver.
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
              Orders per week
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <input
                id="orders-slider"
                type="range" min="1" max="100" value={ordersPerWeek}
                onChange={e => setOrdersPerWeek(Number(e.target.value))}
                aria-valuemin={1} aria-valuemax={100} aria-valuenow={ordersPerWeek}
                style={{ flex: 1, accentColor: '#FF6B35', cursor: 'pointer' }}
              />
              <span style={{
                minWidth: 40, fontSize: 20, fontWeight: 900, color: '#FF6B35',
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
              Average order value (₹)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <input
                id="value-slider"
                type="range" min="50" max="5000" step="50" value={avgOrderValue}
                onChange={e => setAvgOrderValue(Number(e.target.value))}
                aria-valuemin={50} aria-valuemax={5000} aria-valuenow={avgOrderValue}
                style={{ flex: 1, accentColor: '#FF6B35', cursor: 'pointer' }}
              />
              <span style={{
                minWidth: 60, fontSize: 20, fontWeight: 900, color: '#FF6B35',
                textAlign: 'right',
              }}>
                ₹{avgOrderValue.toLocaleString('en-IN')}
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
              Est. monthly orders
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
              Est. monthly revenue
            </p>
            <p style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.03em' }}>
              ₹{monthlyRevenue.toLocaleString('en-IN')}
            </p>
          </div>
          <div style={{
            padding: '18px 20px', borderRadius: 16,
            background: 'rgba(255,107,53,0.12)',
            border: '1px solid rgba(255,107,53,0.25)',
          }}>
            <p style={{ fontSize: 12, color: '#fed7aa', fontWeight: 700, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Growth plan as % of revenue
            </p>
            <p style={{ fontSize: 28, fontWeight: 900, color: '#FF6B35', margin: 0, letterSpacing: '-0.03em' }}>
              {planCostPct}%
            </p>
          </div>
          <div style={{
            padding: '18px 20px', borderRadius: 16,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Time saved per week
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
            <strong style={{ color: '#cbd5e1' }}>Honest note:</strong> These are your numbers, not ours. We can't promise how many orders you'll get or what your revenue will be — that depends on your shop, your products, and your customers. What FeraSetu does is make it easier to manage what you already have, and give it a better online presence. The rest is up to you.
          </p>
        </div>
      </div>
    </section>
  );
}
