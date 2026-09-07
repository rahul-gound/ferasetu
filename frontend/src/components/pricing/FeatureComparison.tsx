import { Check } from 'lucide-react';
import { getMarketPlans } from '../../config/plans';
import { useMarket } from '../../contexts/MarketContext';

interface CompareRow {
  feature: string;
  free: string | boolean;
  business: string | boolean;
  growth?: string | boolean;
  pro: string | boolean;
  category?: string;
}

const COMPARISON_ROWS: CompareRow[] = [
  // Products & Store
  { feature: 'Products', free: 'Up to 25', business: 'Up to 500', pro: 'Unlimited', category: 'Store' },
  { feature: 'Online storefront', free: true, business: true, pro: true },
  { feature: 'FeraSetu subdomain', free: true, business: true, pro: true },
  { feature: 'Custom domain', free: false, business: true, pro: true },
  { feature: 'Remove FeraSetu branding', free: false, business: true, pro: true },
  { feature: 'Store customization', free: false, business: true, pro: true },
  // Orders & Operations
  { feature: 'Order management', free: true, business: true, pro: true, category: 'Operations' },
  { feature: 'Direct ordering link', free: true, business: true, pro: true },
  { feature: 'Invoices', free: 'Basic', business: 'Professional', pro: 'Professional' },
  { feature: 'Inventory management', free: false, business: true, pro: true },
  { feature: 'Low-stock alerts', free: false, business: true, pro: true },
  { feature: 'Order automation', free: false, business: 'Standard', pro: 'Advanced' },
  // Analytics
  { feature: 'Sales overview', free: 'Basic', business: 'Advanced', pro: 'Advanced', category: 'Analytics' },
  { feature: 'Profit tracking', free: false, business: true, pro: true },
  { feature: 'Sales trends', free: false, business: true, pro: true },
  { feature: 'AI sales forecasting', free: false, business: false, pro: true },
  // FeraSetu AI
  { feature: 'FeraSetu AI credits/month', free: '20', business: '200', pro: '1,000', category: 'FeraSetu AI' },
  { feature: 'Product descriptions', free: true, business: true, pro: true },
  { feature: 'Campaign promo drafts', free: true, business: true, pro: true },
  { feature: 'Advanced analysis & forecasting', free: false, business: false, pro: true },
  // Support
  { feature: 'Support', free: 'Community', business: 'Priority', pro: '24/7 Priority', category: 'Support' },
  // Staff
  { feature: 'Staff accounts', free: '1 (owner)', business: '2 accounts', pro: 'Up to 5 accounts', category: 'Team' },
];

function CellContent({ value }: { value: string | boolean | undefined }) {
  if (value === true) return <Check size={18} color="#10b981" strokeWidth={3} aria-label="Included" />;
  if (value === false || value === undefined) return <span aria-label="Not included" style={{ color: '#e2e8f0', fontSize: 18 }}>—</span>;
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
  const { market, config } = useMarket();
  const plans = getMarketPlans(market);
  const isIndia = market === 'IN';
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
              <th scope="col" style={{ padding: '18px 20px', textAlign: 'left', color: '#94a3b8', fontSize: 13, fontWeight: 700, width: isIndia ? '34%' : '44%' }}>
                Feature
              </th>
              {plans.map(plan => (
                <th
                  key={plan.id}
                  scope="col"
                  style={{
                    padding: '18px 16px', textAlign: 'center',
                    color: plan.highlighted || plan.id === 'business' ? '#FF6B35' : '#fff',
                    fontSize: 15, fontWeight: 900,
                  }}
                >
                  {plan.displayName}
                  <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginTop: 2 }}>
                    {plan.id === 'free' ? '₹0/mo' : `${config.symbol}${plan.price.monthly}/mo`}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map((row, i) => {
              const showCategory = row.category && row.category !== lastCategory;
              if (row.category) lastCategory = row.category;

              return (
                <tr key={row.feature} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  {showCategory && (
                    <td
                      colSpan={isIndia ? 4 : 3}
                      style={{
                        padding: '8px 20px',
                        fontSize: 11, fontWeight: 900, letterSpacing: '0.08em',
                        textTransform: 'uppercase', color: '#94a3b8',
                        background: '#f8fafc',
                      }}
                    >
                      {row.category}
                    </td>
                  )}
                  {!showCategory && (
                    <>
                      <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 600, color: '#334155' }}>
                        {row.feature}
                      </td>
                      {isIndia && (
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <CellContent value={row.free} />
                        </td>
                      )}
                      <td style={{ padding: '14px 16px', textAlign: 'center', background: 'rgba(255,107,53,0.03)' }}>
                        <CellContent value={row.business ?? row.growth} />
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <CellContent value={row.pro} />
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
