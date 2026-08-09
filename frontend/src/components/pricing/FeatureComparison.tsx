import { Check } from 'lucide-react';
import { PLANS, type PlanId } from '../../config/plans';

interface CompareRow {
  feature: string;
  free: string | boolean;
  growth: string | boolean;
  pro: string | boolean;
  category?: string;
}

const COMPARISON_ROWS: CompareRow[] = [
  // Products & Store
  { feature: 'Products', free: 'Up to 25', growth: 'Up to 500', pro: 'Unlimited', category: 'Store' },
  { feature: 'Online storefront', free: true, growth: true, pro: true },
  { feature: 'FeraSetu subdomain', free: true, growth: true, pro: true },
  { feature: 'Custom domain', free: false, growth: 'Coming soon', pro: 'Coming soon' },
  { feature: 'Remove FeraSetu branding', free: false, growth: 'Coming soon', pro: true },
  { feature: 'Store customization', free: false, growth: true, pro: true },
  // Orders & Operations
  { feature: 'Order management', free: true, growth: true, pro: true, category: 'Operations' },
  { feature: 'WhatsApp ordering link', free: true, growth: true, pro: true },
  { feature: 'Invoices', free: 'Basic', growth: 'Professional', pro: 'Professional' },
  { feature: 'Inventory management', free: false, growth: true, pro: true },
  { feature: 'Low-stock alerts', free: false, growth: true, pro: true },
  { feature: 'Order automation', free: false, growth: 'Better', pro: 'Advanced' },
  // Analytics
  { feature: 'Sales overview', free: 'Basic', growth: 'Advanced', pro: 'Advanced', category: 'Analytics' },
  { feature: 'Profit tracking', free: false, growth: true, pro: true },
  { feature: 'Sales trends', free: false, growth: true, pro: true },
  { feature: 'AI sales forecasting', free: false, growth: false, pro: true },
  // Fera AI
  { feature: 'Fera AI messages/month', free: '20', growth: '200', pro: '1,000', category: 'Fera AI' },
  { feature: 'Product descriptions', free: true, growth: true, pro: true },
  { feature: 'WhatsApp promo drafts', free: true, growth: true, pro: true },
  { feature: 'Advanced analysis & forecasting', free: false, growth: false, pro: true },
  // Support
  { feature: 'Support', free: 'Community', growth: 'Priority', pro: 'Priority', category: 'Support' },
  // Staff
  { feature: 'Staff accounts', free: '1 (owner)', growth: '1 (Coming soon: more)', pro: 'Coming soon: up to 5', category: 'Team' },
];

function CellContent({ value }: { value: string | boolean }) {
  if (value === true) return <Check size={18} color="#10b981" strokeWidth={3} aria-label="Included" />;
  if (value === false) return <span aria-label="Not included" style={{ color: '#e2e8f0', fontSize: 18 }}>—</span>;
  return (
    <span style={{
      fontSize: 13, fontWeight: 600, color: '#334155',
      whiteSpace: 'nowrap',
    }}>
      {value}
    </span>
  );
}

export default function FeatureComparison() {
  let lastCategory = '';

  return (
    <section aria-label="Plan feature comparison">
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <p style={{
          display: 'inline-block', fontSize: 12, fontWeight: 800,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: '#FF6B35', marginBottom: 12,
          background: 'rgba(255,107,53,0.08)', padding: '4px 12px', borderRadius: 999,
        }}>
          Compare Plans
        </p>
        <h2 style={{
          fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, color: '#0f172a',
          letterSpacing: '-0.03em', margin: 0, lineHeight: 1.1,
        }}>
          Everything side by side
        </h2>
      </div>

      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table
          style={{
            width: '100%', minWidth: 560, borderCollapse: 'collapse',
            background: '#fff', borderRadius: 20, overflow: 'hidden',
            border: '1px solid #f1f5f9',
            boxShadow: '0 8px 32px rgba(15,23,42,0.06)',
          }}
        >
          <thead>
            <tr style={{ background: '#0f172a' }}>
              <th scope="col" style={{ padding: '18px 20px', textAlign: 'left', color: '#94a3b8', fontSize: 13, fontWeight: 700, width: '35%' }}>
                Feature
              </th>
              {PLANS.map(plan => (
                <th
                  key={plan.id}
                  scope="col"
                  style={{
                    padding: '18px 16px', textAlign: 'center',
                    color: plan.id === 'growth' ? '#FF6B35' : '#fff',
                    fontSize: 15, fontWeight: 900,
                  }}
                >
                  {plan.displayName}
                  {plan.id !== 'free' && (
                    <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginTop: 2 }}>
                      ₹{plan.price.monthly}/mo
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map((row, i) => {
              const showCategory = row.category && row.category !== lastCategory;
              if (row.category) lastCategory = row.category;

              return (
                <>
                  {showCategory && (
                    <tr key={`cat-${row.category}`} style={{ background: '#f8fafc' }}>
                      <td
                        colSpan={4}
                        style={{
                          padding: '8px 20px',
                          fontSize: 11, fontWeight: 900, letterSpacing: '0.08em',
                          textTransform: 'uppercase', color: '#94a3b8',
                        }}
                      >
                        {row.category}
                      </td>
                    </tr>
                  )}
                  <tr
                    key={row.feature}
                    style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}
                  >
                    <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 600, color: '#334155' }}>
                      {row.feature}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <CellContent value={row.free} />
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', background: 'rgba(255,107,53,0.03)' }}>
                      <CellContent value={row.growth} />
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <CellContent value={row.pro} />
                    </td>
                  </tr>
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
