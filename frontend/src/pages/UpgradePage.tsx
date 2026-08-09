/**
 * UpgradePage — In-app upgrade flow (requires auth).
 *
 * This is distinct from the public PricingPage (/pricing) which anyone can view.
 * This page is shown to logged-in users who want to upgrade.
 *
 * Design rules:
 * - Show the user's current plan prominently
 * - No fake stats, no fake testimonials
 * - Honest, contextual benefit language
 * - No modal spam — this is the dedicated upgrade destination
 */
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Check, ArrowRight, Loader2, ShieldCheck, Zap, Sparkles, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import SEO from '../components/SEO';
import PlanBadge from '../components/ui/PlanBadge';
import PricingCard from '../components/pricing/PricingCard';
import FeatureComparison from '../components/pricing/FeatureComparison';
import ValueCalculator from '../components/pricing/ValueCalculator';
import PricingFAQ from '../components/pricing/PricingFAQ';
import { PLANS, normalizePlanId, getPlan, getNextPlan, isFreePlan } from '../config/plans';
import type { PlanDefinition } from '../config/plans';

export default function UpgradePage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [upgrading, setUpgrading] = useState<string | null>(null);

  const currentPlanId = normalizePlanId(user?.plan);
  const currentPlan = getPlan(user?.plan);
  const nextPlan = getNextPlan(user?.plan);

  const handleSelectPlan = async (plan: PlanDefinition) => {
    if (!user) { navigate('/login'); return; }
    if (normalizePlanId(user.plan) === plan.id) return;
    if (plan.price.monthly === 0) return; // already on free, nothing to do

    setUpgrading(plan.id);
    try {
      const price = billing === 'yearly' ? plan.price.yearly : plan.price.monthly;
      const res = await api.post('/payment/initialize', {
        plan: plan.id,
        amount: price,
        billing,
      });

      if (res.data.betaFreePlan) {
        // Beta activation: plan is free during beta, just update user state
        toast.success(`${plan.displayName} plan activated!`);
        if (updateUser) await updateUser({ plan: plan.id });
        navigate('/dashboard');
        return;
      }

      // Real payment flow (Razorpay / UPI) — placeholder for when integrated
      toast.success(`${plan.displayName} plan activated! (Payment integration coming soon)`);
      if (updateUser) await updateUser({ plan: plan.id });
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setUpgrading(null);
    }
  };

  return (
    <>
      <SEO
        title="Upgrade Your Plan — FeraSetu"
        description="Choose the right plan for your shop. Honest pricing, no hidden fees."
        url="https://ferasetu.appwrite.network/upgrade"
        type="website"
      />

      <div style={{ padding: '24px 0', fontFamily: "'Inter', system-ui, sans-serif" }}>
        {/* Back link */}
        <div style={{ padding: '0 24px', marginBottom: 32, maxWidth: 1100, margin: '0 auto 32px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#64748b', fontSize: 14, fontWeight: 600, padding: 0,
            }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>

        {/* Page header */}
        <div style={{ textAlign: 'center', padding: '0 24px', marginBottom: 48 }}>
          {/* Current plan badge */}
          {user && (
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Your current plan: </span>
              <PlanBadge plan={user.plan} size="md" />
            </div>
          )}
          <h1 style={{
            fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 900,
            letterSpacing: '-0.04em', color: '#0f172a', margin: '0 0 16px', lineHeight: 1.1,
          }}>
            {isFreePlan(user?.plan)
              ? 'Take your shop further'
              : `Upgrade from ${currentPlan.displayName}`
            }
          </h1>
          <p style={{ fontSize: 17, color: '#64748b', fontWeight: 500, margin: '0 0 28px', maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
            {nextPlan
              ? `${nextPlan.outcome}`
              : 'You\'re on the top plan. All features are unlocked.'
            }
          </p>

          {/* Billing toggle */}
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 0,
              background: '#f1f5f9', borderRadius: 14, padding: 4,
            }}
            role="group"
            aria-label="Billing cycle"
          >
            {(['monthly', 'yearly'] as const).map(cycle => (
              <button
                key={cycle}
                id={`billing-toggle-${cycle}`}
                onClick={() => setBilling(cycle)}
                aria-pressed={billing === cycle}
                style={{
                  padding: '10px 20px', borderRadius: 10, border: 'none',
                  background: billing === cycle ? '#fff' : 'transparent',
                  boxShadow: billing === cycle ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  color: billing === cycle ? '#0f172a' : '#64748b',
                  fontWeight: 800, fontSize: 14, cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {cycle === 'monthly' ? 'Monthly' : 'Annual'}
                {cycle === 'yearly' && (
                  <span style={{
                    marginLeft: 8, fontSize: 11, fontWeight: 900,
                    color: '#10b981', background: 'rgba(16,185,129,0.1)',
                    padding: '2px 6px', borderRadius: 6,
                  }}>
                    Save 2 months
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Pricing Cards */}
        <section
          aria-label="Upgrade options"
          style={{ padding: '0 24px 64px', maxWidth: 1100, margin: '0 auto' }}
        >
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'clamp(16px, 2vw, 24px)',
            alignItems: 'start',
          }}>
            {PLANS.map(plan => (
              <PricingCard
                key={plan.id}
                plan={plan}
                billingCycle={billing}
                isCurrentPlan={currentPlanId === plan.id}
                loading={upgrading === plan.id}
                isAuthenticated={true}
                onSelect={handleSelectPlan}
              />
            ))}
          </div>

          {/* Trust signals */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 28px',
            marginTop: 32,
          }}>
            {[
              '₹0 to start — no credit card needed for Free plan',
              'Cancel anytime',
              'Your data stays yours',
              'No hidden fees',
            ].map(signal => (
              <span key={signal} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b', fontWeight: 600 }}>
                <ShieldCheck size={14} color="#10b981" aria-hidden="true" />
                {signal}
              </span>
            ))}
          </div>
        </section>

        {/* Feature Comparison */}
        <section style={{ padding: '0 24px 80px', maxWidth: 1100, margin: '0 auto' }}>
          <FeatureComparison />
        </section>

        {/* Value Calculator */}
        <section style={{ padding: '0 24px 80px', maxWidth: 1100, margin: '0 auto' }}>
          <ValueCalculator monthlyPlanCost={299} />
        </section>

        {/* FAQ */}
        <section style={{
          padding: 'clamp(40px, 6vw, 80px) 24px',
          background: '#f8fafc',
          borderTop: '1px solid #f1f5f9',
          borderBottom: '1px solid #f1f5f9',
        }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <PricingFAQ />
          </div>
        </section>

        {/* Bottom CTA for free plan users */}
        {isFreePlan(user?.plan) && (
          <div style={{ textAlign: 'center', padding: '40px 24px 60px' }}>
            <p style={{ fontSize: 15, color: '#64748b', fontWeight: 600, margin: '0 0 8px' }}>
              Not ready to upgrade?
            </p>
            <Link
              to="/dashboard"
              style={{ fontSize: 14, color: '#FF6B35', fontWeight: 700, textDecoration: 'none' }}
            >
              Continue with Free plan →
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
