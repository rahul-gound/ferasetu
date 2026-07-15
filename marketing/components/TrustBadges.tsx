'use client';

import { motion } from 'framer-motion';
import { Star, IndianRupee, Activity, Globe, ShieldCheck, Lock, Zap } from 'lucide-react';
import type { PlatformStats } from '@/lib/stats';
import { formatNumber, formatCurrency } from '@/lib/stats';

export default function TrustBadges({ stats }: { stats: PlatformStats }) {
  const badges = [
    { label: 'Shopkeeper Rating', value: '4.9/5', icon: <Star size={20} fill="currentColor" />, color: '#FF6B35' },
    { label: 'Revenue Processed', value: formatCurrency(stats.totalRevenue), icon: <IndianRupee size={20} />, color: '#10B981' },
    { label: 'Platform Uptime', value: `${stats.uptime}%`, icon: <Activity size={20} />, color: '#6366F1' },
    { label: 'Active Shopkeepers', value: formatNumber(stats.totalUsers), icon: <Zap size={20} />, color: '#FF9A6C' },
    { label: 'Languages Supported', value: `${stats.languagesCount}+`, icon: <Globe size={20} />, color: '#06B6D4' },
    { label: 'SOC 2 Type II', value: 'Compliant', icon: <ShieldCheck size={20} />, color: '#34D399' },
    { label: 'ISO 27001', value: 'Certified', icon: <Lock size={20} />, color: '#F59E0B' },
    { label: 'Data Privacy', value: 'DPDPA Ready', icon: <ShieldCheck size={20} />, color: '#EC4899' },
  ];

  return (
    <section id="trust" style={{ padding: '120px 0' }}>
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
              background: 'rgba(255, 107, 53, 0.1)',
              border: '1px solid rgba(255, 107, 53, 0.2)',
            }}
          >
            <ShieldCheck size={13} style={{ color: '#FF9A6C' }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: '#FF9A6C', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Built on Trust
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
            Trusted by <span style={{ color: '#FF6B35' }}>{formatNumber(stats.totalUsers)}</span> shopkeepers.
          </h2>
          <p style={{ fontSize: 18, color: 'rgba(255, 255, 255, 0.45)', fontWeight: 500 }}>
            Real data. Real security. Real growth.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {badges.map((badge, i) => (
            <motion.div
              key={badge.label}
              className="glass card-3d"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              style={{
                padding: 24,
                borderRadius: 20,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: `${badge.color}15`,
                  border: `1px solid ${badge.color}25`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: badge.color,
                  margin: '0 auto 16px',
                }}
              >
                {badge.icon}
              </div>
              <div className="font-display" style={{ fontSize: 22, fontWeight: 900, color: badge.color, marginBottom: 4 }}>
                {badge.value}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {badge.label}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Testimonial */}
        <motion.div
          className="glass-strong mt-16"
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          style={{
            padding: '60px 64px',
            borderRadius: 40,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -60,
              left: -40,
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'rgba(255, 107, 53, 0.1)',
              filter: 'blur(50px)',
            }}
          />
          <div style={{ display: 'flex', gap: 4, color: '#FF6B35', marginBottom: 28, position: 'relative', zIndex: 1 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} size={22} fill="currentColor" />
            ))}
          </div>
          <blockquote
            className="font-display"
            style={{
              fontSize: 'clamp(20px, 3vw, 30px)',
              fontWeight: 700,
              lineHeight: 1.5,
              fontStyle: 'italic',
              color: 'rgba(255, 255, 255, 0.85)',
              marginBottom: 40,
              position: 'relative',
              zIndex: 1,
            }}
          >
            "Pehle register maintain karna mushkil tha. Ab FeraSetu se sab phone pe hai. Sales bhi badhi hai aur tension bhi kam hui hai."
          </blockquote>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative', zIndex: 1 }}>
            <div
              className="font-display"
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                background: 'linear-gradient(135deg, #FF6B35, #E55A24)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: 18,
                boxShadow: '0 8px 24px rgba(255, 107, 53, 0.35)',
              }}
            >
              RK
            </div>
            <div>
              <div className="font-display" style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>
                Rajesh Kumar
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>
                Kirana Store Owner, Delhi
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
