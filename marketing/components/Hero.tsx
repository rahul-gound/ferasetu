'use client';

import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ChevronRight, Star, Sparkles, TrendingUp, ShoppingBag, Users } from 'lucide-react';
import type { PlatformStats } from '@/lib/stats';
import { formatNumber, formatCurrency } from '@/lib/stats';

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
        style={{ width: 600, height: 600, top: -200, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,107,53,0.16)' }}
      />
      <div
        className="orb"
        style={{ width: 420, height: 420, bottom: -120, right: -100, background: 'rgba(99,102,241,0.12)' }}
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
            background: 'rgba(255, 107, 53, 0.12)',
            border: '1px solid rgba(255, 107, 53, 0.25)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <Sparkles size={14} style={{ color: '#FF6B35' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#FF9A6C' }}>
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
              background: 'linear-gradient(135deg, #FF6B35, #E55A24)',
              color: '#fff',
              fontSize: 18,
              fontWeight: 900,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: '0 8px 40px rgba(255, 107, 53, 0.45), 0 0 0 1px rgba(255, 107, 53, 0.2)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
          >
            Start Your Shop Now <ChevronRight size={20} strokeWidth={3} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 24px' }}>
            <div style={{ display: 'flex', color: '#FF6B35' }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={16} fill="currentColor" />
              ))}
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255, 255, 255, 0.6)' }}>
              4.9/5 Rating
            </span>
          </div>
        </div>

        {/* Real-time Data Visualization Dashboard Mockup */}
        <div
          className="hero-visible stagger-5"
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
                <div style={{ fontSize: 12, color: '#FF6B35', fontWeight: 700, marginTop: 2 }}>
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
                    background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.3), rgba(255, 107, 53, 0.05))',
                    border: '2px solid rgba(255, 107, 53, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'pulseRing 2s infinite',
                  }}
                >
                  <TrendingUp size={36} style={{ color: '#FF6B35' }} />
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
