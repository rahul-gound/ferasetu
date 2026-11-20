import React, { useState } from 'react';
import { ShoppingBag, Phone, Menu, X, Dumbbell, ShieldCheck, Clock, Flame } from 'lucide-react';
import { useStorefront } from '../../runtime/StorefrontProvider';
import { useGym } from './GymContext';

export default function GymHeader() {
  const { shopName, shopPhone, cartCount, openCart } = useStorefront();
  const { openFreePassModal } = useGym();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const displayName = shopName || 'APEX STRENGTH CLUB';

  return (
    <header className="sticky top-0 z-40 bg-[#090A0D]/95 backdrop-blur-md border-b border-white/10 text-white transition-all">
      {/* Top utility ticker strip */}
      <div className="bg-[#12141A] border-b border-white/5 py-1.5 px-4 text-[11px] font-mono tracking-wider text-neutral-400">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[#D4FF00] font-bold">
              <span className="w-2 h-2 rounded-full bg-[#D4FF00] animate-pulse" />
              FLOOR STATUS: 24/7 RFID ACTIVE
            </span>
            <span className="hidden sm:inline text-neutral-600">|</span>
            <span className="hidden sm:inline">NO CONTRACT LOCK-IN</span>
          </div>
          <div className="flex items-center gap-4">
            {shopPhone && (
              <a
                href={`https://wa.me/${shopPhone.replace(/[^0-9]/g, '')}?text=Hi,%20I%20have%20a%20question%20about%20membership`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors flex items-center gap-1"
              >
                <Phone size={11} className="text-[#D4FF00]" />
                <span>DESK: {shopPhone}</span>
              </a>
            )}
            <span className="text-neutral-500 hidden md:inline">0% JOINING FEES THIS WEEK</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Name & Logo */}
        <a href="#hero" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-sm bg-[#D4FF00] text-[#090A0D] flex items-center justify-center font-black transition-transform group-hover:scale-105">
            <Dumbbell size={22} strokeWidth={2.2} />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black uppercase tracking-tight block font-display leading-none text-white">
              {displayName}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4FF00] block mt-1">
              ATHLETIC PERFORMANCE
            </span>
          </div>
        </a>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-7 text-xs font-bold uppercase tracking-wider text-neutral-300">
          <a href="#programs" className="hover:text-[#D4FF00] transition-colors py-1">
            Training Pillars
          </a>
          <a href="#schedule" className="hover:text-[#D4FF00] transition-colors py-1 flex items-center gap-1">
            <span>Schedule</span>
            <span className="text-[9px] bg-[#D4FF00]/10 text-[#D4FF00] border border-[#D4FF00]/30 px-1 py-0.2 rounded-xs">
              LIVE
            </span>
          </a>
          <a href="#memberships" className="hover:text-[#D4FF00] transition-colors py-1">
            Passes &amp; Rates
          </a>
          <a href="#facility" className="hover:text-[#D4FF00] transition-colors py-1">
            Facility Specs
          </a>
          <a href="#coaches" className="hover:text-[#D4FF00] transition-colors py-1">
            Coaches
          </a>
          <a href="#pro-shop" className="hover:text-[#D4FF00] transition-colors py-1">
            Pro Shop &amp; Gear
          </a>
        </nav>

        {/* Right Action CTAs */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Cart Icon Trigger */}
          <button
            type="button"
            onClick={openCart}
            aria-label="View Pro Shop Cart"
            className="relative p-2.5 rounded-sm bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/10"
          >
            <ShoppingBag size={19} />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#D4FF00] text-[#090A0D] text-[10px] font-black flex items-center justify-center shadow-md">
                {cartCount}
              </span>
            )}
          </button>

          {/* Primary CTA: Claim Day Pass */}
          <button
            type="button"
            onClick={openFreePassModal}
            className="hidden sm:inline-flex items-center justify-center min-h-[46px] px-5 py-2.5 rounded-sm bg-[#D4FF00] text-[#090A0D] font-black text-xs uppercase tracking-wider hover:bg-[#BCE600] active:scale-95 transition-all shadow-md"
          >
            Claim Free Day Pass
          </button>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2.5 rounded-sm bg-white/5 text-white hover:bg-white/10 transition-colors border border-white/10"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0F1117] border-b border-white/15 px-6 py-6 space-y-4">
          <nav className="flex flex-col space-y-3 text-sm font-bold uppercase tracking-wider text-neutral-200">
            <a
              href="#programs"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 border-b border-white/5 hover:text-[#D4FF00]"
            >
              Training Pillars
            </a>
            <a
              href="#schedule"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 border-b border-white/5 hover:text-[#D4FF00] flex items-center justify-between"
            >
              <span>Class Schedule</span>
              <span className="text-[10px] bg-[#D4FF00] text-[#090A0D] font-black px-1.5 py-0.5 rounded-xs">
                TODAY
              </span>
            </a>
            <a
              href="#memberships"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 border-b border-white/5 hover:text-[#D4FF00]"
            >
              Passes &amp; Memberships
            </a>
            <a
              href="#facility"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 border-b border-white/5 hover:text-[#D4FF00]"
            >
              Facility &amp; Iron Specs
            </a>
            <a
              href="#coaches"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 border-b border-white/5 hover:text-[#D4FF00]"
            >
              Coaches Roster
            </a>
            <a
              href="#pro-shop"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 border-b border-white/5 hover:text-[#D4FF00]"
            >
              Pro Shop &amp; Gear
            </a>
          </nav>

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              openFreePassModal();
            }}
            className="w-full min-h-[48px] rounded-sm bg-[#D4FF00] text-[#090A0D] font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
          >
            <Flame size={16} />
            <span>Claim Free Day Pass</span>
          </button>
        </div>
      )}
    </header>
  );
}
