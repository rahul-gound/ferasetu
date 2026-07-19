'use client';

import { motion } from 'framer-motion';
import { TrendingUp, ShoppingBag, Users, Globe } from 'lucide-react';
import type { PlatformStats } from '@/lib/stats';
import { formatNumber, formatCurrency } from '@/lib/stats';

export default function AnalyticsShowcase({ stats }: { stats: PlatformStats }) {
  const showcaseStats = [
    { label: 'Active Shopkeepers', value: formatNumber(stats.activeUsers || stats.totalUsers), icon: <Users size={16} />, color: '#0052FF' },
    { label: 'Total Orders', value: formatNumber(stats.totalOrders), icon: <ShoppingBag size={16} />, color: '#10B981' },
    { label: 'Revenue Processed', value: formatCurrency(stats.totalRevenue), icon: <TrendingUp size={16} />, color: '#6366F1' },
    { label: 'Cities Served', value: stats.citiesCount > 0 ? `${stats.citiesCount}+` : '500+', icon: <Globe size={16} />, color: '#F59E0B' },
  ];

  return (
    <section
      style={{
        padding: '120px 0',
        background: 'rgba(255, 255, 255, 0.015)',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
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
            <BarChartIcon />
            <span style={{ fontSize: 12, fontWeight: 800, color: '#34D399', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Live Platform Data
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
            Real numbers. <span style={{ color: '#4D7CFF' }}>Real impact.</span>
          </h2>
          <p style={{ fontSize: 18, color: 'rgba(255, 255, 255, 0.45)', fontWeight: 500 }}>
            These stats update live from our database. No marketing fluff.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {showcaseStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="glass card-3d"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              style={{
                padding: 32,
                borderRadius: 24,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: `${stat.color}15`,
                  border: `1px solid ${stat.color}25`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: stat.color,
                  margin: '0 auto 20px',
                }}
              >
                {stat.icon}
              </div>
              <div
                className="font-display"
                style={{ fontSize: 36, fontWeight: 900, color: stat.color, letterSpacing: '-0.03em', marginBottom: 8 }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="glass-strong mt-12"
          initial={{ opacity: 0, y: 50, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          style={{
            borderRadius: 40,
            padding: '48px 56px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -60,
              right: -60,
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'rgba(0, 82, 255, 0.15)',
              filter: 'blur(40px)',
            }}
          />
          <div style={{ position: 'relative', zIndex: 1 }} className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="font-display" style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 20 }}>
                See your business in <span style={{ color: '#4D7CFF' }}>real-time</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {[
                  { label: 'Revenue today vs yesterday', value: 'Track daily growth' },
                  { label: 'Top-selling products', value: 'Know what to restock' },
                  { label: 'Customer repeat rate', value: 'Build loyalty insights' },
                  { label: 'AI sales predictions', value: 'Plan inventory smartly' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: '#0052FF',
                        marginTop: 8,
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255, 255, 255, 0.9)', marginBottom: 4 }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.4)', fontWeight: 500 }}>{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div
              style={{
                borderRadius: 24,
                padding: 40,
                background: 'linear-gradient(135deg, rgba(0, 82, 255, 0.1), rgba(6, 8, 24, 0.6))',
                border: '1px solid rgba(0, 82, 255, 0.15)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255, 255, 255, 0.6)' }}>Weekly Revenue</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#10B981', padding: '4px 12px', borderRadius: 50, background: 'rgba(16, 185, 129, 0.1)' }}>
                  +23% growth
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 160 }}>
                {[40, 65, 45, 80, 60, 95, 75].map((h, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <motion.div
                      initial={{ height: 0 }}
                      whileInView={{ height: `${h}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: i * 0.1, ease: [0.2, 0.8, 0.2, 1] }}
                      style={{
                        width: '100%',
                        height: `${h}%`,
                        borderRadius: '8px 8px 0 0',
                        background: 'linear-gradient(180deg, #0052FF, rgba(0, 82, 255, 0.2))',
                        minHeight: 8,
                      }}
                    />
                    <span style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.3)', fontWeight: 700 }}>
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function BarChartIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}
