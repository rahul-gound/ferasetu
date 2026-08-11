import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShoppingBag, Clock, BarChart3, Bot, ArrowRight, Check,
  ShieldCheck, Package, Zap, IndianRupee,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import PricingCard from '../components/pricing/PricingCard';
import FeatureComparison from '../components/pricing/FeatureComparison';
import FoundingOfferBanner from '../components/pricing/FoundingOfferBanner';
import ValueCalculator from '../components/pricing/ValueCalculator';
import PricingFAQ from '../components/pricing/PricingFAQ';
import { PLANS, normalizePlanId } from '../config/plans';
import type { PlanDefinition } from '../config/plans';

/** Outcome value prop items */
const OUTCOMES = [
  {
    icon: <ShoppingBag size={22} color="#FF6B35" aria-hidden="true" />,
    title: 'Sell without being there all day',
    desc: 'Your store takes orders 24 hours a day, even when you\'re at home, sleeping, or at the shop doing other work. Customers browse your products and place orders — you just manage and fulfill.',
  },
  {
    icon: <BarChart3 size={22} color="#FF6B35" aria-hidden="true" />,
    title: 'Know what\'s actually making you money',
    desc: 'See which products sell, which sit on the shelf, and what your profit looks like — all in one clear dashboard. No spreadsheets, no guesswork.',
  },
  {
    icon: <Package size={22} color="#FF6B35" aria-hidden="true" />,
    title: 'Stop managing orders on WhatsApp',
    desc: 'When orders come in, you get a clear list — not 30 chat threads. Update status, print invoice, track what\'s pending. All in one place.',
  },
  {
    icon: <Bot size={22} color="#FF6B35" aria-hidden="true" />,
    title: 'An AI that knows your shop',
    desc: 'Fera AI uses your actual data. Ask it "what should I restock?" or "write a promo for Diwali" and it answers with context. No generic answers.',
  },
];

const TRUST_SIGNALS = [
  '₹0 to start — no credit card needed',
  'Data stays in India',
  'Cancel anytime, no penalty',
  'Fera AI uses your real shop data, not guesses',
  'No hidden fees, ever',
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

export default function PricingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [selectingPlan, setSelectingPlan] = useState<string | null>(null);
  const [showAnnualTooltip, setShowAnnualTooltip] = useState(false);

  const currentPlan = user ? normalizePlanId(user.plan) : null;

  const handleSelectPlan = async (plan: PlanDefinition) => {
    // Free plan: go to register
    if (plan.price.monthly === 0) {
      navigate(user ? '/dashboard' : '/register');
      return;
    }
    // Paid plan: needs auth
    if (!user) {
      navigate(`/register?plan=${plan.id}`);
      return;
    }
    // Already on this plan
    if (currentPlan === plan.id) return;
    // Go to upgrade flow
    navigate('/upgrade');
  };

  const pageTitle = 'Pricing — FeraSetu | Online Store for Indian Shopkeepers';
  const pageDescription =
    'Free forever for the basics. ₹299/month to grow. Honest, simple pricing with no hidden fees. Start building your online shop today.';

  return (
    <>
      <SEO
        title={pageTitle}
        description={pageDescription}
        url="https://ferasetu.com/pricing"
        type="website"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'FeraSetu Pricing',
          description: pageDescription,
          url: 'https://ferasetu.com/pricing',
        }}
      />

      <div
        style={{
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          background: '#fafafa',
          minHeight: '100vh',
          color: '#0f172a',
        }}
      >
        {/* ================================================================
          NAV BAR (minimal, public)
        ================================================================ */}
        <nav
          style={{
            position: 'sticky', top: 0, zIndex: 50,
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(226,232,240,0.8)',
            padding: '0 24px',
          }}
        >
          <div style={{ maxWidth: 1200, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              <img src="/logo.png" alt="FeraSetu Logo" style={{ height: 32, width: 'auto' }} />
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {user ? (
                <Link
                  to="/dashboard"
                  id="pricing-nav-dashboard"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', borderRadius: 12,
                    background: '#0f172a', color: '#fff',
                    fontWeight: 700, fontSize: 13, textDecoration: 'none',
                    transition: 'opacity 0.2s',
                  }}
                >
                  Dashboard <ArrowRight size={14} />
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    id="pricing-nav-login"
                    style={{ fontSize: 14, fontWeight: 700, color: '#475569', textDecoration: 'none' }}
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    id="pricing-nav-register"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '8px 16px', borderRadius: 12,
                      background: '#FF6B35', color: '#fff',
                      fontWeight: 700, fontSize: 13, textDecoration: 'none',
                    }}
                  >
                    Start Free
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* ================================================================
          HERO
        ================================================================ */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={stagger}
          style={{
            textAlign: 'center',
            padding: 'clamp(60px, 10vw, 100px) 24px clamp(40px, 6vw, 60px)',
            maxWidth: 760, margin: '0 auto',
          }}
        >
          <motion.p
            variants={fadeUp}
            style={{
              display: 'inline-block', fontSize: 12, fontWeight: 800,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: '#FF6B35', marginBottom: 20,
              background: 'rgba(255,107,53,0.08)', padding: '6px 16px', borderRadius: 999,
              border: '1px solid rgba(255,107,53,0.2)',
            }}
          >
            Sahi plan chunein
          </motion.p>

          <motion.h1
            variants={fadeUp}
            style={{
              fontSize: 'clamp(32px, 6vw, 60px)', fontWeight: 900,
              letterSpacing: '-0.04em', lineHeight: 1.05,
              color: '#0f172a', margin: '0 0 20px',
            }}
          >
            Koi hidden fees{' '}
            <span style={{
              background: 'linear-gradient(135deg, #FF6B35, #f97316)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              nahi.
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            style={{
              fontSize: 'clamp(16px, 2.5vw, 20px)', color: '#475569',
              lineHeight: 1.7, margin: '0 0 32px', fontWeight: 500,
            }}
          >
            Create your online store, accept orders, and manage your business —
            without needing technical knowledge or a big budget.
          </motion.p>

          {/* Trust signals */}
          <motion.ul
            variants={fadeUp}
            style={{
              listStyle: 'none', padding: 0, margin: '0 0 40px',
              display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 20px',
            }}
          >
            {TRUST_SIGNALS.map(signal => (
              <li
                key={signal}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b', fontWeight: 600 }}
              >
                <Check size={14} color="#10b981" strokeWidth={3} aria-hidden="true" />
                {signal}
              </li>
            ))}
          </motion.ul>

          {/* Billing toggle */}
          <motion.div
            variants={fadeUp}
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
                {cycle === 'monthly' ? 'Monthly' : 'Annual'}
                {cycle === 'yearly' && (
                  <span style={{
                    marginLeft: 8, fontSize: 11, fontWeight: 900,
                    color: '#10b981', background: 'rgba(16,185,129,0.1)',
                    padding: '2px 6px', borderRadius: 6,
                  }}>
                    2 months free
                  </span>
                )}
              </button>
            ))}
          </motion.div>
        </motion.section>

        {/* ================================================================
          PRICING CARDS
        ================================================================ */}
        <section
          aria-label="Pricing plans"
          style={{ padding: '0 24px 80px', maxWidth: 1200, margin: '0 auto' }}
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
                isCurrentPlan={currentPlan === plan.id}
                loading={selectingPlan === plan.id}
                isAuthenticated={!!user}
                onSelect={handleSelectPlan}
              />
            ))}
          </div>
        </section>

        {/* ================================================================
          FOUNDING OFFER BANNER (only shows if enabled in backend config)
        ================================================================ */}
        <section style={{ padding: '0 24px 80px', maxWidth: 1100, margin: '0 auto' }}>
          <FoundingOfferBanner />
        </section>

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
                color: '#FF6B35', marginBottom: 16,
                background: 'rgba(255,107,53,0.08)', padding: '4px 12px', borderRadius: 999,
              }}>
                What You'll Be Able To Do
              </p>
              <h2 style={{
                fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 900,
                letterSpacing: '-0.03em', margin: '0 0 14px', lineHeight: 1.1,
              }}>
                Not features. Outcomes.
              </h2>
              <p style={{ color: '#64748b', fontSize: 17, fontWeight: 500, maxWidth: 600, margin: '0 auto' }}>
                The real question isn't what FeraSetu does. It's what you'll be able to do because of it.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 24,
            }}>
              {OUTCOMES.map((outcome, i) => (
                <motion.div
                  key={outcome.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  style={{
                    padding: '24px 22px', borderRadius: 20,
                    border: '1px solid #f1f5f9',
                    background: '#fff',
                    boxShadow: '0 4px 16px rgba(15,23,42,0.04)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
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
                    background: 'rgba(255,107,53,0.08)',
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
                </motion.div>
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
          <ValueCalculator monthlyPlanCost={299} />
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
              color: '#FF6B35', marginBottom: 20,
              background: 'rgba(255,107,53,0.15)', padding: '4px 12px', borderRadius: 999,
            }}>
              Try it first
            </p>
            <h2 style={{
              fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 900, color: '#fff',
              letterSpacing: '-0.04em', lineHeight: 1.1, margin: '0 0 20px',
            }}>
              Start for free.<br />
              <span style={{
                background: 'linear-gradient(135deg, #FF6B35, #f97316)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                Upgrade when you're ready.
              </span>
            </h2>
            <p style={{ color: '#94a3b8', fontSize: 17, margin: '0 0 36px', lineHeight: 1.7, fontWeight: 500 }}>
              The Free plan isn't a trick to get you to pay. It's a complete, working store for up to 25 products. When your shop grows, Growth is there at ₹299/month.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                to="/register"
                id="pricing-final-cta-free"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '14px 28px', borderRadius: 16,
                  background: '#FF6B35', color: '#fff',
                  fontWeight: 800, fontSize: 15, textDecoration: 'none',
                  boxShadow: '0 10px 30px rgba(255,107,53,0.3)',
                  transition: 'filter 0.2s ease',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.08)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
              >
                Create Free Store
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/login"
                id="pricing-final-cta-login"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '14px 28px', borderRadius: 16,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  fontWeight: 800, fontSize: 15, textDecoration: 'none',
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
              >
                Already have an account? Sign in
              </Link>
            </div>
            <p style={{ color: '#475569', fontSize: 13, margin: '20px 0 0', fontWeight: 600 }}>
              No credit card · No setup fee · No lock-in
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

        {/* ================================================================
          FOOTER
        ================================================================ */}
        <footer style={{
          borderTop: '1px solid #f1f5f9',
          padding: '32px 24px',
          textAlign: 'center',
        }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'linear-gradient(135deg, #FF6B35, #f97316)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 13,
              }} aria-hidden="true">ফ</span>
              <span style={{ fontWeight: 800, fontSize: 16, color: '#0f172a', letterSpacing: '-0.02em' }}>FeraSetu</span>
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <Link to="/" style={{ fontSize: 13, color: '#64748b', textDecoration: 'none', fontWeight: 600 }}>Home</Link>
              <Link to="/login" style={{ fontSize: 13, color: '#64748b', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
              <Link to="/register" style={{ fontSize: 13, color: '#64748b', textDecoration: 'none', fontWeight: 600 }}>Get started</Link>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
              © {new Date().getFullYear()} FeraSetu · Made for Indian shopkeepers
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
