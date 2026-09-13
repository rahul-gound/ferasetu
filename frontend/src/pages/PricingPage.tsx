import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  ShoppingBag, BarChart3, Bot, ArrowRight, Check,
  Package, Zap, Globe, Sparkles, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useMarket } from '../contexts/MarketContext';
import SEO from '../components/SEO';
import PublicLayout from '../components/public/PublicLayout';
import PricingCard from '../components/pricing/PricingCard';
import FeatureComparison from '../components/pricing/FeatureComparison';
import FoundingOfferBanner from '../components/pricing/FoundingOfferBanner';
import ValueCalculator from '../components/pricing/ValueCalculator';
import PricingFAQ from '../components/pricing/PricingFAQ';
import ValueLadderSection from '../components/pricing/ValueLadderSection';
import MarketingReveal from '../components/marketing/MarketingReveal';
import MarketSelector from '../components/marketing/MarketSelector';
import { getMarketPlans, normalizePlanId } from '../config/plans';
import type { PlanDefinition } from '../config/plans';

/** Outcome value prop items */
const OUTCOMES = [
  {
    icon: <ShoppingBag size={22} color="#2563EB" aria-hidden="true" />,
    title: 'Sell without being there all day',
    desc: 'Your store takes orders 24 hours a day, even when you\'re at home, sleeping, or doing other work. Customers browse your products and place orders — you just manage and fulfill.',
  },
  {
    icon: <BarChart3 size={22} color="#2563EB" aria-hidden="true" />,
    title: 'Know what\'s actually making you money',
    desc: 'See which products sell, which sit on the shelf, and what your profit looks like — all in one clear dashboard. No spreadsheets, no guesswork.',
  },
  {
    icon: <Package size={22} color="#2563EB" aria-hidden="true" />,
    title: 'Streamline order and customer workflows',
    desc: 'When orders come in, you get a clear centralized list — not scattered chat threads. Update status, print invoices, track inventory, all in one place.',
  },
  {
    icon: <Bot size={22} color="#2563EB" aria-hidden="true" />,
    title: 'An AI that understands your business',
    desc: 'FeraSetu AI uses your actual store data. Ask it "what should I restock?", "write a product description", or "create a seasonal promotion" and get contextual answers.',
  },
];

export default function PricingPage() {
  const navigate = useNavigate();
  const { user, register, login } = useAuth();
  const { translate: t } = useLanguage();
  const { market, setMarket, config, trialPolicy } = useMarket();
  const [searchParams] = useSearchParams();
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [selectingPlan, setSelectingPlan] = useState<string | null>(null);

  const currentPlan = user ? normalizePlanId(user.plan) : null;
  const marketPlans = getMarketPlans(market);

  const handleSelectPlan = async (plan: PlanDefinition) => {
    // Free plan (India only): go to register
    if (plan.price.monthly === 0) {
      if (user) {
        navigate('/dashboard');
      } else {
        register();
      }
      return;
    }

    // US/EU: 14-day trial signup
    if (!user) {
      navigate(`/register?plan=${plan.id}&market=${market}`);
      return;
    }

    // Already on this plan
    if (currentPlan === plan.id) return;

    // Go to upgrade flow
    navigate(`/upgrade?plan=${plan.id}`);
  };

  const isIndia = market === 'IN';

  const pageTitle = isIndia
    ? 'Pricing — FeraSetu | Honest, Simple Pricing with Permanent Free Entry'
    : `Pricing — FeraSetu | ${config.trialDays}-Day Free Trial for Independent Businesses`;

  const pageDescription = isIndia
    ? 'Start your online store for ₹0. Upgrade to Business (₹399/mo) or Pro (₹999/mo) as your catalog grows. Zero commissions, no hidden fees.'
    : `Start your 14-day free trial on FeraSetu. ${config.symbol}${config.plans.business.monthly}/mo for Business, ${config.symbol}${config.plans.pro.monthly}/mo for Pro. Zero marketplace commissions and proactive AI assistance built-in.`;

  const trustSignals = isIndia
    ? [
        '₹0 to start — no credit card needed',
        'Data stays in India',
        'Cancel anytime, no penalty',
        'FeraSetu AI uses your real shop data',
        '0% commissions on orders',
      ]
    : [
        `${config.trialDays}-day free trial on all plans`,
        'No surprise charges',
        'Cancel anytime — keep access until period ends',
        '0% transaction commissions',
        'Dedicated AI inventory & sales assistant',
      ];

  return (
    <>
      <SEO
        title={pageTitle}
        description={pageDescription}
        type="website"
        noindex={false}
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'FeraSetu Pricing',
          description: pageDescription,
          url: 'https://ferasetu.com/pricing',
        }}
      />

      <PublicLayout>
        {/* ================================================================
          HERO
        ================================================================ */}
        <section
          className="animate-fade-in"
          style={{
            textAlign: 'center',
            padding: 'clamp(50px, 8vw, 80px) 24px clamp(30px, 5vw, 50px)',
            maxWidth: 820, margin: '0 auto',
          }}
        >
          {/* Market / Currency selector toggle */}
          <div className="mb-5 flex justify-center">
            <MarketSelector variant="pills" />
          </div>

          <p
            className="animate-slide-up"
            style={{
              display: 'inline-block', fontSize: 12, fontWeight: 800,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: '#2563EB', marginBottom: 16,
              background: 'rgba(37,99,235,0.08)', padding: '6px 16px', borderRadius: 999,
              border: '1px solid rgba(37,99,235,0.2)',
            }}
          >
            {isIndia ? (t('pricing.tag') || 'Simple, Honest Pricing') : `${config.trialDays}-Day Free Trial`}
          </p>

          <h1
            className="animate-slide-up"
            style={{
              fontSize: 'clamp(32px, 5.5vw, 56px)', fontWeight: 900,
              letterSpacing: '-0.04em', lineHeight: 1.1,
              color: '#0f172a', margin: '0 0 18px',
            }}
          >
            {isIndia ? (
              <>Start free. Upgrade when you need more<span className="text-blue-600">.</span></>
            ) : (
              <>{config.trialDays} days free. No surprise charges<span className="text-blue-600">.</span></>
            )}
          </h1>

          <p
            className="animate-slide-up"
            style={{
              fontSize: 'clamp(16px, 2.2vw, 19px)', color: '#475569',
              lineHeight: 1.65, margin: '0 0 28px', fontWeight: 500,
            }}
          >
            {isIndia
              ? (t('pricing.subtitle') || 'Put your shop online today for ₹0. Upgrade as your catalog grows. Zero commissions, no hidden fees.')
              : 'Launch your independent storefront in minutes. Enjoy full access for 14 days, then choose a plan to continue. Zero commissions, cancel anytime.'
            }
          </p>

          {/* Trust signals */}
          <ul
            className="animate-slide-up"
            style={{
              listStyle: 'none', padding: 0, margin: '0 0 32px',
              display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 20px',
            }}
          >
            {trustSignals.map(signal => (
              <li
                key={signal}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b', fontWeight: 600 }}
              >
                <Check size={14} color="#10b981" strokeWidth={3} aria-hidden="true" />
                {signal}
              </li>
            ))}
          </ul>

          {/* Billing toggle */}
          <div
            className="animate-slide-up"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 0,
              background: '#f1f5f9', borderRadius: 14, padding: 4,
              position: 'relative',
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
                {cycle === 'monthly' ? t('pricing.monthly') : t('pricing.annual')}
                {cycle === 'yearly' && (
                  <span style={{
                    marginLeft: 8, fontSize: 11, fontWeight: 900,
                    color: '#10b981', background: 'rgba(16,185,129,0.1)',
                    padding: '2px 6px', borderRadius: 6,
                  }}>
                    {t('pricing.save2Months') || 'Save 2 months'}
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Value Progression (India only or tailored) */}
        {isIndia && (
          <ValueLadderSection
            currentPlan={currentPlan}
            isAuthenticated={!!user}
            onSelectPlan={handleSelectPlan}
          />
        )}

        {/* ================================================================
          PRICING CARDS
        ================================================================ */}
        <section
          aria-label="Pricing plans"
          style={{
            padding: '0 24px 60px',
            maxWidth: isIndia ? 1200 : 840,
            margin: '0 auto'
          }}
        >
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fit, minmax(280px, 1fr))`,
            gap: 'clamp(16px, 2vw, 24px)',
            alignItems: 'start',
          }}>
            {marketPlans.map(plan => (
              <PricingCard
                key={plan.id}
                plan={plan}
                billingCycle={billing}
                isCurrentPlan={currentPlan === plan.id}
                loading={selectingPlan === plan.id}
                isAuthenticated={!!user}
                onSelect={handleSelectPlan}
              />
            ))}
          </div>

          {/* Tax note */}
          {config.taxNote && (
            <p className="text-center text-xs text-slate-400 mt-6 font-medium">
              {config.taxNote}
            </p>
          )}

          {/* Trust & Strict No-Refund Policy Strip */}
          <div className="mt-8 pt-6 border-t border-slate-200/60 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500 font-medium text-center">
            <span className="inline-flex items-center gap-1.5 text-slate-700 font-semibold">
              <ShieldCheck size={14} className="text-emerald-600" />
              Secure 256-bit checkout via {isIndia ? 'Cashfree' : 'Stripe'}
            </span>
            <span>•</span>
            <span>0% sales commission</span>
            <span>•</span>
            <span>Cancel anytime to stop future renewals</span>
            <span>•</span>
            <span className="text-amber-800 font-semibold">Strictly non-refundable — no prorated refunds or money-back guarantee</span>
          </div>
        </section>

        {/* ================================================================
          FOUNDING OFFER BANNER (India only or active promotions)
        ================================================================ */}
        {isIndia && (
          <section style={{ padding: '0 24px 80px', maxWidth: 1100, margin: '0 auto' }}>
            <FoundingOfferBanner />
          </section>
        )}

        {/* ================================================================
          OUTCOME VALUE PROPS
        ================================================================ */}
        <section
          aria-label="What you'll be able to do"
          style={{
            padding: 'clamp(60px, 8vw, 100px) 24px',
            background: '#fff',
            borderTop: '1px solid #f1f5f9',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 52 }}>
              <p style={{
                display: 'inline-block', fontSize: 12, fontWeight: 800,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: '#2563EB', marginBottom: 16,
                background: 'rgba(37,99,235,0.08)', padding: '4px 12px', borderRadius: 999,
              }}>
                {t('pricing.outcomes.tag') || 'Outcomes'}
              </p>
              <h2 style={{
                fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 900,
                letterSpacing: '-0.03em', margin: '0 0 14px', lineHeight: 1.1,
              }}>
                {t('pricing.outcomes.title') || 'Built for real business outcomes'}
              </h2>
              <p style={{ color: '#64748b', fontSize: 17, fontWeight: 500, maxWidth: 600, margin: '0 auto' }}>
                {t('pricing.outcomes.subtitle') || 'Everything you need to sell online, keep more margin, and manage your store effortlessly.'}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 24,
            }}>
              {OUTCOMES.map((outcome) => (
                <MarketingReveal key={outcome.title}>
                  <div
                    style={{
                      padding: '24px 22px', borderRadius: 20,
                      border: '1px solid #f1f5f9',
                      background: '#fff',
                      boxShadow: '0 4px 16px rgba(15,23,42,0.04)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      height: '100%',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 32px rgba(15,23,42,0.08)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(15,23,42,0.04)';
                    }}
                  >
                    <div style={{
                      width: 44, height: 44, borderRadius: 14,
                      background: 'rgba(37,99,235,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 16,
                    }}>
                      {outcome.icon}
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 10px', lineHeight: 1.3 }}>
                      {outcome.title}
                    </h3>
                    <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, margin: 0, fontWeight: 500 }}>
                      {outcome.desc}
                    </p>
                  </div>
                </MarketingReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
          FEATURE COMPARISON TABLE
        ================================================================ */}
        <section style={{ padding: 'clamp(60px, 8vw, 100px) 24px', maxWidth: 1100, margin: '0 auto' }}>
          <FeatureComparison />
        </section>

        {/* ================================================================
          VALUE CALCULATOR
        ================================================================ */}
        <section style={{ padding: '0 24px 80px', maxWidth: 1100, margin: '0 auto' }}>
          <ValueCalculator billingCycle={billing} />
        </section>

        {/* ================================================================
          RISK REVERSAL / FINAL CTA
        ================================================================ */}
        <section
          aria-label="Get started"
          style={{
            padding: 'clamp(60px, 8vw, 100px) 24px',
            background: '#0f172a',
            textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <p style={{
              display: 'inline-block', fontSize: 12, fontWeight: 800,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: '#3b82f6', marginBottom: 20,
              background: 'rgba(59,130,246,0.15)', padding: '4px 12px', borderRadius: 999,
            }}>
              {isIndia ? (t('pricing.cta.tag') || 'Ready to begin?') : `${config.trialDays}-Day Free Trial`}
            </p>
            <h2 style={{
              fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 900, color: '#fff',
              letterSpacing: '-0.04em', lineHeight: 1.1, margin: '0 0 20px',
            }}>
              {isIndia ? (
                <>Start your store today.<br /><span className="text-blue-400">Zero risk, 0% commissions.</span></>
              ) : (
                <>Experience FeraSetu free.<br /><span className="text-blue-400">14 days free, no surprise charges.</span></>
              )}
            </h2>
            <p style={{ color: '#94a3b8', fontSize: 17, margin: '0 0 36px', lineHeight: 1.7, fontWeight: 500 }}>
              {isIndia
                ? 'Join thousands of independent merchants growing their sales directly with FeraSetu.'
                : 'Built for independent shopkeepers and small businesses ready to sell directly — without marketplace commissions or technical complexity.'}
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => register()}
                id="pricing-final-cta-free"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '14px 28px', borderRadius: 16,
                  background: '#2563EB', color: '#fff',
                  fontWeight: 800, fontSize: 15, border: 'none', cursor: 'pointer',
                  boxShadow: '0 10px 30px rgba(37,99,235,0.3)',
                  transition: 'filter 0.2s ease',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.08)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
              >
                {isIndia ? 'Start Free' : `Start ${config.trialDays}-Day Free Trial`}
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => login()}
                id="pricing-final-cta-login"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '14px 28px', borderRadius: 16,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  fontWeight: 800, fontSize: 15, cursor: 'pointer',
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
              >
                Sign In
              </button>
            </div>
            <p style={{ color: '#475569', fontSize: 13, margin: '20px 0 0', fontWeight: 600 }}>
              {isIndia ? '₹0 to start • No credit card required • Strictly non-refundable • Cancel anytime to stop renewals' : '14 days free • 0% transaction fees • Strictly non-refundable • Cancel anytime to stop renewals'}
            </p>
          </div>
        </section>

        {/* ================================================================
          FAQ
        ================================================================ */}
        <section style={{
          padding: 'clamp(60px, 8vw, 100px) 24px',
          background: '#fff',
          borderTop: '1px solid #f1f5f9',
        }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <PricingFAQ />
          </div>
        </section>
      </PublicLayout>
    </>
  );
}
