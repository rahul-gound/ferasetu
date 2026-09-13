/**
 * UpgradePage — In-app upgrade flow with Market Awareness,
 * 14-day trial management, and trust-first cancellation.
 */
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Check, ArrowRight, Loader2, ShieldCheck, Zap, Sparkles, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useMarket } from '../contexts/MarketContext';
import api from '../services/api';
import SEO from '../components/SEO';
import PlanBadge from '../components/ui/PlanBadge';
import PricingCard from '../components/pricing/PricingCard';
import FeatureComparison from '../components/pricing/FeatureComparison';
import ValueCalculator from '../components/pricing/ValueCalculator';
import PricingFAQ from '../components/pricing/PricingFAQ';
import MarketSelector from '../components/marketing/MarketSelector';
import { getMarketPlans, normalizePlanId, getPlan, getNextPlan, isFreePlan } from '../config/plans';
import type { PlanDefinition } from '../config/plans';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
    Cashfree?: any;
  }
}

function loadCashfreeScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (typeof window === 'undefined') { resolve(false); return; }
    if (window.Cashfree) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (typeof window === 'undefined') { resolve(false); return; }
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function UpgradePage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { market, config, subscription } = useMarket();
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const currentPlanId = normalizePlanId(user?.plan);
  const currentPlan = getPlan(user?.plan, null, market);
  const nextPlan = getNextPlan(user?.plan);
  const marketPlans = getMarketPlans(market);

  // Handle return from Cashfree checkout via ?order_id=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id');
    if (!orderId || !user) return;

    let isMounted = true;
    const verifyCashfree = async () => {
      setUpgrading('verifying');
      const toastId = toast.loading('Verifying your payment with Cashfree...');
      try {
        const verifyRes = await api.post('/payment/verify', {
          cashfree_order_id: orderId,
          order_id: orderId,
          transaction_id: orderId,
        });

        if (verifyRes.data.success) {
          toast.success(verifyRes.data.message || 'Payment verified and plan activated!', { id: toastId });
          if (updateUser) await updateUser({ plan: verifyRes.data.plan });
          // Clean URL parameter
          window.history.replaceState({}, '', window.location.pathname);
          navigate('/dashboard');
        } else {
          toast.error(verifyRes.data.error || 'Payment verification failed.', { id: toastId });
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.error || 'Failed to verify payment with Cashfree.', { id: toastId });
      } finally {
        if (isMounted) setUpgrading(null);
      }
    };

    verifyCashfree();
    return () => { isMounted = false; };
  }, [user, updateUser, navigate]);

  const handleSelectPlan = async (plan: PlanDefinition) => {
    if (!user) { navigate('/login'); return; }
    if (normalizePlanId(user.plan) === plan.id) return;

    setUpgrading(plan.id);
    try {
      const price = billing === 'yearly' ? plan.price.yearly : plan.price.monthly;
      const res = await api.post('/payment/initialize', {
        plan: plan.id,
        amount: price,
        billingCycle: billing,
      });

      if (!res.data.success) {
        toast.error(res.data.error || 'Could not start the upgrade. Please try again.');
        return;
      }

      // Free plans are activated directly by the backend — Razorpay is never used.
      if (!res.data.requiresPayment) {
        toast.success(`${plan.displayName} plan activated!`);
        if (updateUser) await updateUser({ plan: plan.id });
        navigate('/dashboard');
        return;
      }

      // Paid plans via Cashfree Checkout (India market)
      if (res.data.gateway === 'cashfree' && res.data.paymentSessionId) {
        const cashfreeLoaded = await loadCashfreeScript();
        if (cashfreeLoaded && window.Cashfree) {
          const cashfree = window.Cashfree({
            mode: res.data.cashfreeEnv === 'production' ? 'production' : 'sandbox',
          });
          cashfree.checkout({
            paymentSessionId: res.data.paymentSessionId,
            redirectTarget: '_self',
          });
          return;
        } else {
          toast.error('Could not load Cashfree checkout window. Please check your connection and try again.');
          setUpgrading(null);
          return;
        }
      }

      // Paid plans via Stripe Checkout (US & Europe markets)
      if (res.data.gateway === 'stripe' || res.data.stripeUrl) {
        if (res.data.stripeUrl) {
          window.location.href = res.data.stripeUrl;
          return;
        }
        toast.error('Stripe checkout session URL was not provided.');
        return;
      }

      // Fallback: Paid plans via Razorpay Checkout.
      const razorpayLoaded = await loadRazorpayScript();
      if (!razorpayLoaded || !window.Razorpay) {
        toast.error('Could not load the payment window. Please check your connection and try again.');
        return;
      }

      const razorpay = new window.Razorpay({
        key: res.data.razorpayKeyId,
        amount: res.data.amount * 100,
        currency: res.data.currency || 'INR',
        name: 'FeraSetu',
        description: `${plan.displayName} plan (${billing})`,
        order_id: res.data.razorpayOrderId,
        prefill: { email: user.email, name: user.name },
        theme: { color: '#FF6B35' },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes = await api.post('/payment/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              transaction_id: res.data.id,
            });

            if (verifyRes.data.success) {
              toast.success(`${plan.displayName} plan activated successfully!`);
              if (updateUser) await updateUser({ plan: plan.id });
              navigate('/dashboard');
            } else {
              toast.error(verifyRes.data.error || 'Payment verification failed.');
            }
          } catch (verifyErr: any) {
            toast.error(verifyErr?.response?.data?.error || 'Payment verification failed.');
          } finally {
            setUpgrading(null);
          }
        },
      });
      razorpay.open();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.response?.data?.error || 'Something went wrong. Please try again.');
      setUpgrading(null);
    } finally {
      setUpgrading(null);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const res = await api.post('/payment/cancel-subscription');
      if (res.data.success) {
        toast.success('Subscription renewal cancelled. Access continues until your billing period ends.');
        if (updateUser) {
          await updateUser({
            cancel_at_period_end: true,
            plan_expires_at: res.data.plan_expires_at,
          } as any);
        }
        setShowCancelModal(false);
      } else {
        toast.error(res.data.error || 'Failed to cancel subscription.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to cancel subscription.');
    } finally {
      setCancelling(false);
    }
  };

  const handleResumeSubscription = async () => {
    setCancelling(true);
    try {
      const res = await api.post('/payment/resume-subscription');
      if (res.data.success) {
        toast.success('Subscription renewal resumed.');
        if (updateUser) {
          await updateUser({
            cancel_at_period_end: false,
          } as any);
        }
      } else {
        toast.error(res.data.error || 'Failed to resume subscription.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to resume subscription.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <SEO
        title="Upgrade Your Plan — FeraSetu"
        description="Choose the right plan for your business. Honest pricing, no hidden fees."
        url="https://ferasetu.com/upgrade"
        type="website"
        noindex
      />

      <div style={{ padding: '24px 0', fontFamily: "'Inter', system-ui, sans-serif" }}>
        {/* Navigation bar */}
        <div style={{ padding: '0 24px', marginBottom: 28, maxWidth: 1100, margin: '0 auto 28px' }}>
          <div className="flex items-center justify-between">
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
            <MarketSelector variant="pills" />
          </div>
        </div>

        {/* Subscription Status Banners */}
        <div style={{ maxWidth: 1100, margin: '0 auto 24px', padding: '0 24px' }}>
          {/* Active 14-day trial banner (> 3 days remaining) */}
          {subscription.isTrialing && !subscription.isEndingSoon && (
            <div className="rounded-2xl bg-blue-600 border border-blue-700 p-5 text-white shadow-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 font-black text-lg">
                    <Sparkles size={20} className="text-orange-300" />
                    <span>14-Day Free Trial: {subscription.trialDaysRemaining} {subscription.trialDaysRemaining === 1 ? 'day' : 'days'} remaining</span>
                  </div>
                  <p className="text-sm text-blue-100 mt-1">
                    Enjoy full access to Business capabilities. Select a plan below to ensure uninterrupted service when your trial finishes.
                  </p>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-orange-500 text-xs font-extrabold uppercase tracking-wider text-white">
                  Trial Active
                </span>
              </div>
            </div>
          )}

          {/* Trial Ending Soon banner (<= 3 days remaining) */}
          {subscription.isTrialing && subscription.isEndingSoon && (
            <div className="rounded-2xl bg-orange-50 border-2 border-orange-500 p-5 text-slate-900 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertCircle size={24} className="text-orange-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-black text-base text-slate-900">
                      Free Trial Ending Soon: {subscription.trialDaysRemaining} {subscription.trialDaysRemaining === 1 ? 'day' : 'days'} remaining
                    </h3>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                      Your trial will conclude soon. Select a plan below to maintain active storefront features and uninterrupted customer ordering.
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-orange-600 text-xs font-extrabold uppercase tracking-wider text-white animate-pulse">
                  Ending Soon
                </span>
              </div>
            </div>
          )}

          {/* Expired trial alert */}
          {subscription.isTrialExpired && (
            <div className="rounded-2xl bg-white border-2 border-orange-500 p-5 text-slate-900 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertCircle size={24} className="text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    Your 14-Day Free Trial Has Concluded
                  </h3>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Trust-First Billing: We did not surprise-charge you. Your products, orders, and store configurations are safely preserved. Select a plan below to reactivate customer ordering and continue running your store.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Cancelled plan pending expiration banner */}
          {subscription.isPaidActive && subscription.isCancelled && (
            <div className="rounded-2xl bg-slate-100 border border-slate-300 p-5 text-slate-800">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="font-black text-base text-slate-900">
                    Subscription Cancellation Scheduled
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    Your plan is cancelled, but you can continue using FeraSetu until{' '}
                    <strong>{subscription.planExpiresAt ? subscription.planExpiresAt.toLocaleDateString() : 'the end of your billing cycle'}</strong>.
                  </p>
                </div>
                <button
                  onClick={handleResumeSubscription}
                  disabled={cancelling}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow transition-all"
                >
                  Resume Renewal
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Page header */}
        <div style={{ textAlign: 'center', padding: '0 24px', marginBottom: 44 }}>
          {user && (
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Your current plan: </span>
              <PlanBadge plan={user.plan} size="md" />
            </div>
          )}
          <h1 style={{
            fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 900,
            letterSpacing: '-0.04em', color: '#0f172a', margin: '0 0 14px', lineHeight: 1.1,
          }}>
            {isFreePlan(user?.plan)
              ? 'Take your business further'
              : `Upgrade from ${currentPlan.displayName}`
            }
          </h1>
          <p style={{ fontSize: 16, color: '#64748b', fontWeight: 500, margin: '0 0 24px', maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
            {nextPlan
              ? `${nextPlan.outcome}`
              : 'You are on the top tier. All features and AI capabilities are unlocked.'
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
          style={{ padding: '0 24px 64px', maxWidth: market === 'IN' ? 1100 : 800, margin: '0 auto' }}
        >
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'clamp(16px, 2vw, 24px)',
            alignItems: 'start',
          }}>
            {marketPlans.map(plan => (
              <PricingCard
                key={plan.id}
                plan={plan}
                billingCycle={billing}
                isCurrentPlan={currentPlanId === plan.id}
                loading={upgrading === plan.id}
                isAuthenticated={!!user}
                onSelect={handleSelectPlan}
              />
            ))}
          </div>

          {/* Trust & Strict No-Refund Policy Strip */}
          <div className="mt-8 pt-6 border-t border-slate-200/60 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500 font-medium text-center">
            <span className="inline-flex items-center gap-1.5 text-slate-700 font-semibold">
              <ShieldCheck size={14} className="text-emerald-600" />
              Secure 256-bit payment via {market === 'IN' ? 'Cashfree' : 'Stripe'}
            </span>
            <span>•</span>
            <span>0% sales commission</span>
            <span>•</span>
            <span>Cancel anytime to stop future renewals</span>
            <span>•</span>
            <span className="text-amber-800 font-semibold">Strictly non-refundable — no partial refunds, prorated credits, or money-back guarantee</span>
          </div>

          {/* Cancellation management for active paid users */}
          {subscription.isPaidActive && !subscription.isCancelled && (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="text-xs text-slate-400 hover:text-red-600 font-semibold underline transition-colors"
              >
                Cancel subscription renewal
              </button>
            </div>
          )}
        </section>

        {/* Cancel Confirmation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
              <h3 className="text-lg font-black text-slate-900">Cancel Future Renewal?</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Cancellation stops future automatic renewals. In accordance with our Terms of Service, all subscription charges are strictly non-refundable and no partial or prorated refunds are issued. You retain full access to all features on your plan until the end of your prepaid billing period ({subscription.planExpiresAt ? subscription.planExpiresAt.toLocaleDateString() : 'current period'}). Your data and products are safely preserved.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
                >
                  Keep My Plan
                </button>
                <button
                  type="button"
                  onClick={handleCancelSubscription}
                  disabled={cancelling}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 shadow"
                >
                  {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feature Comparison Table */}
        <div style={{ maxWidth: 1100, margin: '0 auto 64px', padding: '0 24px' }}>
          <FeatureComparison />
        </div>

        {/* Value Calculator */}
        <div style={{ maxWidth: 1100, margin: '0 auto 64px', padding: '0 24px' }}>
          <ValueCalculator billingCycle={billing} />
        </div>

        {/* FAQ Section */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
          <PricingFAQ />
        </div>
      </div>
    </>
  );
}
