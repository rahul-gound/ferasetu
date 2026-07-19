'use client';

import { motion } from 'framer-motion';
import { TrendingUp, MessageCircle, ShieldCheck, BarChart3, Zap, Globe, CreditCard, Smartphone } from 'lucide-react';

const features = [
  {
    title: 'Real-time Analytics Dashboard',
    desc: 'Track revenue, orders, top products & customer trends live. Know your profit instantly.',
    icon: <TrendingUp size={24} />,
    color: '#0052FF',
    glow: 'rgba(0, 82, 255, 0.2)',
  },
  {
    title: 'WhatsApp Sales Engine',
    desc: 'Share product links on WhatsApp. Customers order directly. No app download needed for buyers.',
    icon: <MessageCircle size={24} />,
    color: '#10B981',
    glow: 'rgba(16, 185, 129, 0.2)',
  },
  {
    title: 'AI Profit Insights',
    desc: 'Smart AI analyzes your sales & suggests what to stock, when to discount, and how to increase margins.',
    icon: <BarChart3 size={24} />,
    color: '#6366F1',
    glow: 'rgba(99, 102, 241, 0.2)',
  },
  {
    title: 'Smart Inventory',
    desc: 'Auto low-stock alerts, cost tracking, profit per item, and bulk import. Never run out of bestsellers.',
    icon: <Smartphone size={24} />,
    color: '#F59E0B',
    glow: 'rgba(245, 158, 11, 0.2)',
  },
  {
    title: 'UPI & Card Payments',
    desc: 'Accept online payments via UPI, cards, net banking. Auto reconciliation. Zero setup fees.',
    icon: <CreditCard size={24} />,
    color: '#EC4899',
    glow: 'rgba(236, 72, 153, 0.2)',
  },
  {
    title: '22+ Indian Languages',
    desc: 'Run your shop in Hindi, Gujarati, Tamil, Telugu, Bengali, Marathi, and 16 more. Voice support included.',
    icon: <Globe size={24} />,
    color: '#06B6D4',
    glow: 'rgba(6, 182, 212, 0.2)',
  },
];

export default function Features() {
  return (
    <section id="features" style={{ padding: '120px 0' }}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          className="text-center mb-20"
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
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
            }}
          >
            <Zap size={13} style={{ color: '#818CF8' }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: '#818CF8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Why FeraSetu
            </span>
          </div>
          <h2
            className="font-display"
            style={{
              fontSize: 'clamp(32px, 5vw, 56px)',
              fontWeight: 900,
              letterSpacing: '-0.04em',
              margin: '20px 0 16px',
            }}
          >
            Designed for the <span style={{ color: '#4D7CFF' }}>modern shopkeeper.</span>
          </h2>
          <p style={{ fontSize: 18, color: 'rgba(255, 255, 255, 0.45)', fontWeight: 500 }}>
            No technical skills needed. Bilkul aasan.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8" style={{ perspective: 1200 }}>
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className="card-3d glass-strong"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              style={{
                padding: 40,
                borderRadius: 28,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: -40,
                  right: -40,
                  width: 140,
                  height: 140,
                  borderRadius: '50%',
                  background: feature.glow,
                  filter: 'blur(30px)',
                }}
              />
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  background: feature.glow,
                  border: `1px solid ${feature.color}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: feature.color,
                  marginBottom: 28,
                  boxShadow: `0 8px 24px ${feature.glow}`,
                  transform: 'translateZ(40px)',
                }}
              >
                {feature.icon}
              </div>
              <h3
                className="font-display"
                style={{ fontSize: 22, fontWeight: 900, marginBottom: 12, letterSpacing: '-0.02em' }}
              >
                {feature.title}
              </h3>
              <p
                style={{
                  fontSize: 15,
                  color: 'rgba(255, 255, 255, 0.45)',
                  lineHeight: 1.7,
                  fontWeight: 500,
                }}
              >
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}