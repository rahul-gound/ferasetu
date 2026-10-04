'use client';

import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import type { PlatformStats } from '@/lib/stats';
import { formatNumber, formatCurrency } from '@/lib/stats';

// Inline SVG sprite for Lucide icons (14–20px, thin stroke)
const IconSprite = () => (
  <svg style={{ display: 'none' }}>
    <symbol id="icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </symbol>
    <symbol id="icon-credit-card" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <line x1="2" y1="14" x2="22" y2="14" />
    </symbol>
    <symbol id="icon-shopping-bag" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </symbol>
    <symbol id="icon-globe" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </symbol>
    <symbol id="icon-store" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 21v-4a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v4" />
      <line x1="4" y1="21" x2="20" y2="21" />
      <path d="M8 21v-8a4 4 0 0 1 8 0v8" />
    </symbol>
    <symbol id="icon-users" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </symbol>
    <symbol id="icon-truck" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
      <path d="M16 8v8a2 2 0 0 1-2 2H3" />
      <circle cx="17" cy="18" r="2" />
      <path d="M17 8V7a2 2 0 0 0-2-2H9" />
      <circle cx="7" cy="18" r="2" />
    </symbol>
    <symbol id="icon-cog" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33H12a3 3 0 1 1 0-6h7a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33z" />
    </symbol>
    <symbol id="icon-chevron-right" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6" />
    </symbol>
    <symbol id="icon-external-link" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </symbol>
    <symbol id="icon-phone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </symbol>
  </svg>
);

export default function Hero({ stats }: { stats: PlatformStats }) {
  const { scrollY } = useScroll();
  const heroFade = useTransform(scrollY, [0, 500], [1, 0.25]);
  const heroLift = useTransform(scrollY, [0, 500], [0, -60]);

  return (
    <section
      className="aurora relative overflow-hidden"
      style={{ minHeight: '100vh', paddingTop: 150, paddingBottom: 120 }}
    >
<div
        className="orb"
        style={{ width: 600, height: 600, top: -200, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0, 82, 255, 0.16)' }}
      />
      <div
        className="orb"
        style={{ width: 420, height: 420, bottom: -120, right: -100, background: 'rgba(77,124,255,0.12)' }}
      />
      <div className="grid-floor" />

      <motion.div
        className="max-w-7xl mx-auto px-6 text-center relative z-10"
        style={{ opacity: heroFade, y: heroLift }}
      >
        {/* Trust Badge — Real Data */}
        <div
          className="hero-visible stagger-1 inline-flex items-center gap-2 mb-8"
          style={{
            padding: '8px 18px',
            borderRadius: 50,
            background: 'rgba(0, 82, 255, 0.12)',
            border: '1px solid rgba(0, 82, 255, 0.25)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <Sparkles size={14} style={{ color: '#0052FF' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#9EC5FF' }}>
            {formatNumber(stats.totalUsers)} shopkeepers trust FeraSetu
          </span>
        </div>

        {/* Headline */}
        <h1
          className="hero-visible stagger-2 font-display"
          style={{
            fontSize: 'clamp(44px, 8vw, 96px)',
            fontWeight: 900,
            lineHeight: 1.0,
            letterSpacing: '-0.05em',
            marginBottom: 28,
          }}
        >
          Grow your business
          <br />
          <span className="animated-gradient glow-text">online in 2 minutes.</span>
        </h1>

        <p
          className="hero-visible stagger-3"
          style={{
            maxWidth: 560,
            margin: '0 auto 40px',
            fontSize: 18,
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.6)',
            lineHeight: 1.7,
          }}
        >
          Build your shop website, manage products, and grow orders with AI.{' '}
          <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 700 }}>
            Dukaan ko online lao, orders WhatsApp par pao.
          </span>
        </p>

        {/* CTAs */}
        <div className="hero-visible stagger-4 flex flex-col sm:flex-row items-center justify-center gap-4 mb-24">
<Link
            href="/register"
            className="shimmer-btn cursor-pointer"
            style={{
              padding: '18px 40px',
              borderRadius: 20,
              background: 'linear-gradient(135deg, #0052FF, #4D7CFF)',
              color: '#fff',
              fontSize: 18,
              fontWeight: 900,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: '0 8px 40px rgba(0, 82, 255, 0.45), 0 0 0 1px rgba(0, 82, 255, 0.2)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
          >
            Start Your Shop Now <ChevronRight size={20} strokeWidth={3} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 24px' }}>
            <div style={{ display: 'flex', color: '#FFD700' }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={16} fill="currentColor" />
              ))}
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255, 255, 255, 0.6)' }}>
              4.9/5 Rating
            </span>
          </div>
        </div>

        {/* Micro-Badges / Metadata */}
        <div className="hero-visible stagger-5 flex flex-wrap items-center justify-center gap-3 mb-12">
          {[
            { label: 'Store live', icon: 'check' },
            { label: '₹ Payments', icon: 'credit-card' },
            { label: '128+ Orders', icon: 'shopping-bag' },
            { label: '37+ Languages', icon: 'globe' },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-white/70"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              {item.label}
            </div>
          ))}
        </div>

        {/* Real-time Data Visualization Dashboard Mockup */}
        <div
          className="hero-visible stagger-6"
          style={{ perspective: 1400, maxWidth: 980, margin: '0 auto' }}
        >
          <div
            className="glass-strong"
            style={{
              borderRadius: 32,
              padding: 6,
              boxShadow: '0 60px 120px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)',
            }}
          >
            <div
              style={{
                borderRadius: 28,
                overflow: 'hidden',
                position: 'relative',
                aspectRatio: '16/8',
                background: 'linear-gradient(135deg, rgba(11, 15, 36, 0.95), rgba(6, 8, 24, 0.9))',
              }}
            >
              {/* Scanline overlay */}
              <div className="scanline" />

              {/* Live badge */}
              <div
                className="stat-badge"
                style={{
                  position: 'absolute',
                  bottom: 24,
                  left: '50%',
                  borderRadius: 50,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  whiteSpace: 'nowrap',
                  transform: 'translateX(-50%)',
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#10B981',
                    animation: 'pulseRing 2s infinite',
                  }}
                />
                <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>
                  Real-time platform data
                </span>
              </div>

              {/* Floating stat badges with REAL data */}
              <div
                className="stat-badge float-a"
                style={{ position: 'absolute', top: 24, left: 24 }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'rgba(255, 255, 255, 0.55)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: 4,
                  }}
                >
                  Active Shopkeepers
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>
                  {formatNumber(stats.activeUsers || stats.totalUsers)}
                </div>
                <div style={{ fontSize: 12, color: '#10B981', fontWeight: 700, marginTop: 2 }}>
                  <Users size={10} className="inline" /> Currently online
                </div>
              </div>

              <div
                className="stat-badge float-b"
                style={{ position: 'absolute', top: 24, right: 24 }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'rgba(255, 255, 255, 0.55)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: 4,
                  }}
                >
                  Total Orders
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>
                  {formatNumber(stats.totalOrders)}
                </div>
                <div style={{ fontSize: 12, color: '#4D7CFF', fontWeight: 700, marginTop: 2 }}>
                  <ShoppingBag size={10} className="inline" /> Across all shops
                </div>
              </div>

              <div
                className="stat-badge float-a"
                style={{ position: 'absolute', bottom: 90, left: 56 }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'rgba(255, 255, 255, 0.55)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: 4,
                  }}
                >
                  Revenue Processed
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>
                  {formatCurrency(stats.totalRevenue)}
                </div>
                <div style={{ fontSize: 12, color: '#10B981', fontWeight: 700, marginTop: 2 }}>
                  <TrendingUp size={10} className="inline" /> Verified payments
                </div>
              </div>

              <div
                className="stat-badge float-b"
                style={{ position: 'absolute', bottom: 90, right: 56 }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'rgba(255, 255, 255, 0.55)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: 4,
                  }}
                >
                  Products Listed
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>
                  {formatNumber(stats.totalProducts)}
                </div>
                <div style={{ fontSize: 12, color: '#6366F1', fontWeight: 700, marginTop: 2 }}>
                  <ShoppingBag size={10} className="inline" /> Across platform
                </div>
              </div>

              {/* Center pulse orb */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(0, 82, 255, 0.3), rgba(0, 82, 255, 0.05))',
                    border: '2px solid rgba(0, 82, 255, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'pulseRing 2s infinite',
                  }}
                >
                  <TrendingUp size={36} style={{ color: '#4D7CFF' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255, 255, 255, 0.4)' }}>
                  LIVE ANALYTICS
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
