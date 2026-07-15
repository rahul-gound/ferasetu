'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Navbar() {
  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      className="fixed top-0 w-full z-50"
      style={{
        background: 'rgba(6, 8, 24, 0.7)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-[72px]">
        <Link href="/" className="flex items-center gap-3">
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #FF6B35, #E55A24)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(255, 107, 53, 0.4)',
            }}
          >
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 20, fontStyle: 'italic' }}>F</span>
          </div>
          <span className="font-display text-xl font-black tracking-tight">
            Fera<span style={{ color: '#FF6B35' }}>Setu</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {['Features', 'Pricing', 'Trust'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-sm font-semibold text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              {item}
            </a>
          ))}
          <Link href="/login" className="text-sm font-semibold text-white/70 cursor-pointer">
            Sign in
          </Link>
          <Link
            href="/register"
            className="shimmer-btn cursor-pointer"
            style={{
              padding: '10px 22px',
              borderRadius: 50,
              background: 'linear-gradient(135deg, #FF6B35, #E55A24)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              boxShadow: '0 4px 20px rgba(255, 107, 53, 0.4)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              display: 'inline-block',
            }}
          >
            Start Your Shop
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
