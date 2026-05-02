import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, CreditCard, Loader2, Shield, Sparkles, Trophy, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface PlanConfig {
  id: 'basic' | 'standard' | 'pro';
  name: string;
  price: number;
  yearlyPrice: number;
  description: string;
  outcome: string;
  features: string[];
  icon: ReactNode;
  color: string;
  buttonText: string;
  recommended?: boolean;
}

const plans: PlanConfig[] = [
  {
    id: 'basic',
    name: 'Starter',
    price: 199,
    yearlyPrice: 1990,
    description: 'For shops taking their first serious step online.',
    outcome: 'Launch your catalog and accept local orders without confusion.',
    icon: <Zap size={24} />,
    color: '#0F172A',
    buttonText: 'Start Starter',
    features: [
      '100 products with stock tracking',
      'Professional Fera shop link',
      'Order dashboard and customer details',
      'Basic AI assistant for daily questions',
      'Payment QR support',
      'Email support'
    ]
  },
  {
    id: 'standard',
    name: 'Growth',
    price: 499,
    yearlyPrice: 4990,
    description: 'Best for growing stores that want more orders and repeat customers.',
    outcome: 'Turn WhatsApp traffic into a polished buying experience.',
    icon: <Sparkles size={24} />,
    color: '#FF6B35',
    buttonText: 'Choose Growth',
    recommended: true,
    features: [
      '1,000 products and categories',
      'Advanced AI website and content help',
      'Custom domain support',
      'Premium storefront templates',
      'Sales analytics and recommendations',
      'WhatsApp support priority'
    ]
  },
  {
    id: 'pro',
    name: 'Scale',
    price: 999,
    yearlyPrice: 9990,
    description: 'For serious retailers managing more products, staff, and brand trust.',
    outcome: 'Run your digital shop like a proper commerce operation.',
    icon: <Trophy size={24} />,
    color: '#7C3AED',
    buttonText: 'Go Scale',
    features: [
      'Unlimited products',
      'Priority advanced AI access',
      'Sales prediction and stock alerts',
      'Up to 5 staff accounts',
      'Bulk product import/export',
      'Dedicated onboarding help'
    ]
  }
];

const comparisonFeatures = [
  { title: 'Products', basic: '100', standard: '1,000', pro: 'Unlimited' },
  { title: 'Website', basic: 'Fera link', standard: 'Custom domain ready', pro: 'Brand-first setup' },
  { title: 'AI Help', basic: 'Daily assistant', standard: 'Website + marketing', pro: 'Priority strategy' },
  { title: 'Analytics', basic: 'Basic', standard: 'Growth insights', pro: 'Forecasts + alerts' },
  { title: 'Support', basic: 'Email', standard: 'Priority WhatsApp', pro: 'Onboarding help' },
];

export default function UpgradePage() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleUpgrade = async (planId: string, amount: number) => {
    if (loading) return;
    setLoading(planId);

    try {
      const initRes = await api.post<{
        success: boolean;
        id: string;
        plan: string;
        message: string;
      }>('/payment/initialize', { plan: planId, amount });

      const planName = planId.charAt(0).toUpperCase() + planId.slice(1);

      if (initRes.data.success) {
        toast.success(`Development mode: ${planName} plan activated.`);
        if (user) updateUser({ plan: planId as any });
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Upgrade error:', err);
      toast.error(err.response?.data?.error || 'Failed to activate plan');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="pricing-page">
      <section className="pricing-hero">
        <div className="pricing-eyebrow">Plans built for Indian shopkeepers</div>
        <h1>Choose the plan that makes your shop look serious online.</h1>
        <p>
          Start with a 7-day trial, upgrade when your store is ready, and keep full control of products, orders, and customers.
        </p>
        <div className="pricing-trust-row">
          <span><Shield size={16} /> Secure payments</span>
          <span><CreditCard size={16} /> Cancel anytime</span>
          <span><Check size={16} /> No hidden setup fee</span>
        </div>
      </section>

      <section className="plans-grid" aria-label="Pricing plans">
        {plans.map((plan) => {
          const isCurrent = user?.plan === plan.id;
          return (
            <article
              key={plan.id}
              className={`plan-card ${plan.recommended ? 'recommended' : ''} ${isCurrent ? 'active' : ''}`}
              style={{ '--plan-color': plan.color } as any}
            >
              {plan.recommended && <div className="recommended-badge">Most shopkeepers choose this</div>}
              <div className="plan-topline">
                <div className="plan-icon">{plan.icon}</div>
                <div>
                  <h2>{plan.name}</h2>
                  <p>{plan.description}</p>
                </div>
              </div>

              <div className="plan-price">
                <span className="currency">₹</span>
                <span className="amount">{plan.price}</span>
                <span className="period">/month</span>
              </div>
              <div className="yearly-note">Pay yearly: ₹{plan.yearlyPrice.toLocaleString('en-IN')} and save 2 months</div>
              <div className="plan-outcome">{plan.outcome}</div>

              <div className="plan-features">
                {plan.features.map((feature) => (
                  <div key={feature} className="feature-item">
                    <Check size={18} />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleUpgrade(plan.id, plan.price)}
                disabled={!!loading || isCurrent}
                className="plan-btn"
              >
                {loading === plan.id ? <Loader2 className="animate-spin" size={20} /> : isCurrent ? 'Current Plan' : <>{plan.buttonText}<ArrowRight size={18} /></>}
              </button>
            </article>
          );
        })}
      </section>

      <section className="pricing-proof">
        <div>
          <strong>Why paid plans convert better</strong>
          <p>Customers trust shops that look organized, show real products, and respond quickly. Fera gives your store that professional signal.</p>
        </div>
        <div className="proof-stat"><span>40%</span> avg. sales lift after going online</div>
      </section>

      <section className="comparison-container">
        <h3>Compare what you get</h3>
        <div className="comparison-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Feature</th>
                <th>Starter</th>
                <th>Growth</th>
                <th>Scale</th>
              </tr>
            </thead>
            <tbody>
              {comparisonFeatures.map((feature) => (
                <tr key={feature.title}>
                  <td className="feature-title">{feature.title}</td>
                  <td>{feature.basic}</td>
                  <td>{feature.standard}</td>
                  <td>{feature.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <style>{`
        .pricing-page {
          max-width: 1220px;
          margin: 0 auto;
          padding: 48px 20px 80px;
        }

        .pricing-hero {
          position: relative;
          overflow: hidden;
          text-align: center;
          padding: 64px 24px;
          border: 1px solid #fed7aa;
          border-radius: 36px;
          background:
            radial-gradient(circle at 20% 20%, rgba(255, 107, 53, 0.18), transparent 28%),
            radial-gradient(circle at 80% 0%, rgba(15, 23, 42, 0.12), transparent 30%),
            linear-gradient(135deg, #fff7ed, #ffffff 48%, #f8fafc);
          box-shadow: 0 30px 80px rgba(15, 23, 42, 0.08);
          margin-bottom: 28px;
          animation: fadeUp 0.7s ease both;
        }

        .pricing-eyebrow {
          display: inline-flex;
          padding: 8px 14px;
          border-radius: 999px;
          background: #0f172a;
          color: #fff;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 20px;
        }

        .pricing-hero h1 {
          max-width: 820px;
          margin: 0 auto 18px;
          color: #0f172a;
          font-size: clamp(34px, 6vw, 64px);
          line-height: 0.98;
          letter-spacing: -0.06em;
          font-weight: 950;
        }

        .pricing-hero p {
          max-width: 680px;
          margin: 0 auto;
          color: #64748b;
          font-size: 18px;
          line-height: 1.7;
          font-weight: 600;
        }

        .pricing-trust-row {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 28px;
        }

        .pricing-trust-row span {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 999px;
          background: rgba(255,255,255,0.8);
          color: #334155;
          font-size: 13px;
          font-weight: 800;
        }

        .plans-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 22px;
          align-items: stretch;
          margin-bottom: 28px;
        }

        .plan-card {
          position: relative;
          display: flex;
          flex-direction: column;
          padding: 30px;
          min-height: 100%;
          border-radius: 30px;
          background: #fff;
          border: 1px solid #e2e8f0;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.06);
          transition: transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease;
          animation: fadeUp 0.75s ease both;
        }

        .plan-card:hover {
          transform: translateY(-8px);
          border-color: var(--plan-color);
          box-shadow: 0 28px 70px rgba(15, 23, 42, 0.12);
        }

        .plan-card.recommended {
          background: linear-gradient(180deg, #fff7ed 0%, #ffffff 42%);
          border: 2px solid #FF6B35;
          transform: translateY(-12px);
          box-shadow: 0 34px 90px rgba(255, 107, 53, 0.18);
        }

        .plan-card.recommended:hover {
          transform: translateY(-18px);
        }

        .recommended-badge {
          position: absolute;
          top: 18px;
          right: 18px;
          padding: 7px 12px;
          border-radius: 999px;
          background: #FF6B35;
          color: #fff;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.02em;
          box-shadow: 0 12px 28px rgba(255, 107, 53, 0.28);
        }

        .plan-topline {
          display: flex;
          gap: 14px;
          align-items: flex-start;
          margin-bottom: 26px;
          padding-right: 70px;
        }

        .plan-icon {
          width: 50px;
          height: 50px;
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          color: var(--plan-color);
          background: color-mix(in srgb, var(--plan-color) 12%, white);
        }

        .plan-topline h2 {
          margin: 0 0 6px;
          font-size: 24px;
          font-weight: 950;
          color: #0f172a;
          letter-spacing: -0.04em;
        }

        .plan-topline p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.5;
          font-weight: 650;
        }

        .plan-price {
          display: flex;
          align-items: baseline;
          gap: 4px;
          margin-bottom: 6px;
        }

        .currency {
          color: #64748b;
          font-size: 22px;
          font-weight: 900;
        }

        .amount {
          color: #0f172a;
          font-size: 56px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.06em;
        }

        .period {
          color: #64748b;
          font-weight: 800;
        }

        .yearly-note {
          width: fit-content;
          margin-bottom: 18px;
          padding: 7px 10px;
          border-radius: 999px;
          background: #ecfdf5;
          color: #047857;
          font-size: 12px;
          font-weight: 850;
        }

        .plan-outcome {
          padding: 14px;
          border-radius: 18px;
          background: #f8fafc;
          color: #334155;
          font-size: 14px;
          font-weight: 800;
          line-height: 1.5;
          margin-bottom: 22px;
        }

        .plan-features {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 13px;
          margin-bottom: 28px;
        }

        .feature-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          color: #1e293b;
          font-size: 14px;
          line-height: 1.4;
          font-weight: 700;
        }

        .feature-item svg {
          flex: 0 0 auto;
          color: #10b981;
          margin-top: 1px;
        }

        .plan-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          min-height: 54px;
          border: 0;
          border-radius: 17px;
          background: var(--plan-color);
          color: #fff;
          font-size: 15px;
          font-weight: 950;
          cursor: pointer;
          transition: transform 0.2s ease, filter 0.2s ease;
          box-shadow: 0 16px 34px color-mix(in srgb, var(--plan-color) 28%, transparent);
        }

        .plan-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          filter: brightness(1.05);
        }

        .plan-btn:disabled {
          cursor: not-allowed;
          background: #e2e8f0;
          color: #64748b;
          box-shadow: none;
        }

        .pricing-proof {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 18px;
          align-items: center;
          margin-bottom: 28px;
          padding: 28px;
          border-radius: 28px;
          background: #0f172a;
          color: #fff;
          overflow: hidden;
        }

        .pricing-proof strong {
          display: block;
          font-size: 22px;
          font-weight: 950;
          margin-bottom: 8px;
        }

        .pricing-proof p {
          margin: 0;
          color: #cbd5e1;
          line-height: 1.7;
          font-weight: 650;
        }

        .proof-stat {
          padding: 22px;
          border-radius: 22px;
          background: rgba(255,255,255,0.08);
          color: #cbd5e1;
          font-weight: 850;
        }

        .proof-stat span {
          display: block;
          color: #fb923c;
          font-size: 50px;
          line-height: 1;
          font-weight: 950;
        }

        .comparison-container {
          background: #fff;
          border-radius: 28px;
          padding: 32px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.05);
        }

        .comparison-container h3 {
          margin: 0 0 20px;
          color: #0f172a;
          font-size: 24px;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .comparison-table-wrapper { overflow-x: auto; }

        table {
          width: 100%;
          min-width: 650px;
          border-collapse: collapse;
        }

        th, td {
          padding: 16px;
          text-align: center;
          border-bottom: 1px solid #f1f5f9;
          color: #1e293b;
          font-size: 14px;
          font-weight: 700;
        }

        th {
          color: #64748b;
          font-size: 12px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        th:first-child, .feature-title {
          text-align: left;
          font-weight: 950;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 980px) {
          .plans-grid { grid-template-columns: 1fr; }
          .plan-card.recommended, .plan-card.recommended:hover { transform: none; }
          .pricing-proof { grid-template-columns: 1fr; }
        }

        @media (max-width: 640px) {
          .pricing-page { padding: 20px 14px 56px; }
          .pricing-hero { padding: 42px 18px; border-radius: 26px; }
          .pricing-hero p { font-size: 15px; }
          .plan-card { padding: 24px; border-radius: 24px; }
          .recommended-badge { position: static; width: fit-content; margin-bottom: 14px; }
          .plan-topline { padding-right: 0; }
          .amount { font-size: 48px; }
          .comparison-container { padding: 22px 14px; }
        }
      `}</style>
    </div>
  );
}
