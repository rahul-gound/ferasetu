'use client';

import { motion } from 'framer-motion';
import { IndianRupee, ArrowRight } from 'lucide-react';

export default function FinalCTA() {
  return (
    <section style={{ padding: '80px 0 120px' }}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          className="shimmer-btn"
          initial={{ opacity: 0, y: 50, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          style={{
            borderRadius: 48,
            padding: '80px 64px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            background:
              'linear-gradient(135deg, rgba(255, 107, 53, 0.2), rgba(229, 90, 36, 0.15) 50%, rgba(99, 102, 241, 0.12))',
            border: '1px solid rgba(255, 107, 53, 0.2)',
            boxShadow: '0 40px 80px rgba(255, 107, 53, 0.12)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -80,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 400,
              height: 400,
              borderRadius: '50%',
              background: 'rgba(255, 107, 53, 0.15)',
              filter: 'blur(80px)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <IndianRupee
              className="icon-float"
              size={40}
              style={{ color: '#FF6B35', margin: '0 auto 24px', display: 'block', opacity: 0.8 }}
            />
            <h2 className="font-display" style={{ fontSize: 'clamp(32px, 5vw, 64px)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 20 }}>
              Ab aapki baari hai.
            </h2>
            <p style={{ fontSize: 18, color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600, maxWidth: 480, margin: '0 auto 44px' }}>
              Join smart shopkeepers across India. Bilkul free se shuru karein.
            </p>
            <a
              href="/register"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
                padding: '20px 52px',
                borderRadius: 24,
                background: 'linear-gradient(135deg, #FF6B35, #E55A24)',
                color: '#fff',
                fontSize: 20,
                fontWeight: 900,
                boxShadow: '0 16px 60px rgba(255, 107, 53, 0.5)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                textDecoration: 'none',
              }}
            >
              Create Your Store <ArrowRight size={22} />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
