'use client';

import { motion } from 'framer-motion';
import { Check, ShieldCheck, TrendingUp, BarChart3, Smartphone, Zap } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    icon: <Smartphone size={22} />,
    price: '₹299',
    badge: 'Free during Beta',
    desc: 'Launch your catalog and accept local orders.',
    features: ['100 products', 'FeraSetu shop link', '100 AI credits/mo', 'Basic AI help', 'Email support', '1 user'],
    featured: false,
    cta: 'Start Free',
    href: '/register',
  },
  {
    name: 'Growth',
    icon: <TrendingUp size={22} />,
    price: '₹699',
    desc: 'Custom domain, premium templates, growth analytics.',
    features: ['1,000 products', 'Custom domain', '500 AI credits/mo', 'Advanced AI & analytics', 'Priority WhatsApp support', '1 user'],
    featured: true,
    cta: 'Start Growing',
    href: '/register',
  },
  {
    name: 'Scale',
    icon: <BarChart3 size={22} />,
    price: '₹1,499',
    desc: 'For serious retailers with more products and staff.',
    features: ['5,000 products', 'Sales prediction & alerts', '2,000 AI credits/mo', 'Up to 5 staff accounts', 'Dedicated onboarding', 'Bulk imports'],
    featured: false,
    cta: 'Go Scale',
    href: '/register',
  },
];

export default function Pricing() {
  return (
    <section id="pricing" style={{ padding: '120px 0' }}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
        >
          <div
            className="inline-flex items-center gap-2"
            style={{
              padding: '6px 16px',
              borderRadius: 50,
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}
          >
            <ShieldCheck size={13} style={{ color: '#34D399' }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: '#34D399', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Simple Pricing
            </span>
          </div>
          <h2
            className="font-display"
            style={{
              fontSize: 'clamp(32px, 5vw, 60px)',
              fontWeight: 900,
              letterSpacing: '-0.04em',
              margin: '20px 0 16px',
            }}
          >
            Start small. Upgrade when <span style={{ color: '#4D7CFF' }}>orders grow.</span>
          </h2>
          <p style={{ fontSize: 18, color: 'rgba(255, 255, 255, 0.45)', fontWeight: 500 }}>
            Designed to feel safe for small shops and powerful at scale.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: index * 0.12 }}
              style={{ height: '100%' }}
            >
              <div
                className={`pricing-3d ${plan.featured ? 'glass-strong' : 'glass'}`}
                style={{
                  height: '100%',
                  borderRadius: 32,
                  padding: 40,
                  background: plan.featured
                    ? 'linear-gradient(135deg, rgba(0, 82, 255, 0.15), rgba(77, 124, 255, 0.08))'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02))',
                  border: plan.featured
                    ? '1px solid rgba(0, 82, 255, 0.3)'
                    : '1px solid rgba(255, 255, 255, 0.07)',
                  boxShadow: plan.featured
                    ? '0 24px 60px rgba(0, 82, 255, 0.15), 0 0 0 1px rgba(0, 82, 255, 0.15)'
                    : 'none',
                  position: 'relative',
                  overflow: 'hidden',
                  transform: plan.featured ? 'scale(1.03)' : 'scale(1)',
                }}
              >
                {plan.featured && (
                  <div
                    className="font-display"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      padding: '6px 20px',
                      borderRadius: '0 0 16px 16px',
                      background: 'linear-gradient(135deg, #0052FF, #4D7CFF)',
                      fontSize: 11,
                      fontWeight: 900,
                      color: '#fff',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      boxShadow: '0 4px 20px rgba(0, 82, 255, 0.4)',
                    }}
                  >
                    Most Popular
                  </div>
                )}
                {plan.badge && !plan.featured && (
                  <div
                    className="font-display"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      padding: '6px 20px',
                      borderRadius: '0 0 16px 16px',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      fontSize: 11,
                      fontWeight: 900,
                      color: '#fff',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
                    }}
                  >
                    {plan.badge}
                  </div>
                )}

                {plan.featured && (
<div
                  style={{
                    position: 'absolute',
                    top: -40,
                    right: -40,
                    width: 140,
                    height: 140,
                    borderRadius: '50%',
                    background: 'rgba(0, 82, 255, 0.15)',
                    filter: 'blur(30px)',
                  }}
                />
                )}

                <div
                  className="icon-float"
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 18,
                    background: plan.featured ? 'rgba(0, 82, 255, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                    border: plan.featured ? '1px solid rgba(0, 82, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: plan.featured ? '#4D7CFF' : 'rgba(255, 255, 255, 0.6)',
                    marginBottom: 24,
                    marginTop: plan.featured ? 24 : 0,
                    animationDelay: `${index * 0.5}s`,
                  }}
                >
                  {plan.icon}
                </div>

                <h3 className="font-display" style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 10 }}>
                  {plan.name}
                </h3>
                <p style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.4)', fontWeight: 500, lineHeight: 1.6, minHeight: 48 }}>
                  {plan.desc}
                </p>

                <div style={{ margin: '28px 0', display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                  <span className="font-display" style={{ fontSize: 20, fontWeight: 900, color: 'rgba(255, 255, 255, 0.4)', lineHeight: 1.6 }}>
                    ₹
                  </span>
                  <span className="font-display" style={{ fontSize: 56, fontWeight: 900, letterSpacing: '-0.04em', color: plan.featured ? '#4D7CFF' : '#fff', lineHeight: 1 }}>
                    {plan.price.replace('₹', '')}
                  </span>
                  <span style={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.3)', fontWeight: 700, marginBottom: 6 }}>
                    /month
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                  {plan.features.map((f) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)' }}>
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: plan.featured ? 'rgba(0, 82, 255, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                          color: plan.featured ? '#0052FF' : 'rgba(255, 255, 255, 0.5)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Check />
                      </div>
                      {f}
                    </div>
                  ))}
                </div>

                <a
                  href={plan.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '14px 0',
                    borderRadius: 50,
                    background: plan.featured ? 'linear-gradient(135deg, #0052FF, #4D7CFF)' : 'rgba(255, 255, 255, 0.08)',
                    border: plan.featured ? 'none' : '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 15,
                    boxShadow: plan.featured ? '0 8px 30px rgba(0, 82, 255, 0.35)' : 'none',
                    transition: 'transform 0.2s',
                    textDecoration: 'none',
                  }}
                >
                  {plan.cta} <Zap size={16} />
                </a>
              </div>
            </motion.div>
          ))}
        </div>

        <p style={{ textAlign: 'center', marginTop: 40, fontSize: 14, color: 'rgba(255, 255, 255, 0.3)', fontWeight: 500 }}>
          All plans include 7-day free trial. No credit card required. Cancel anytime.
        </p>
      </div>
    </section>
  );
}