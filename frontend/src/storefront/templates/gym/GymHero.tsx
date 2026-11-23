import React from 'react';
import { ArrowRight, Flame, Shield, CheckCircle2, Users, Dumbbell } from 'lucide-react';
import { useStorefront } from '../../runtime/StorefrontProvider';
import { useGym } from './GymContext';

export default function GymHero() {
  const { shopName } = useStorefront();
  const { openFreePassModal } = useGym();

  return (
    <section id="hero" className="relative min-h-[85vh] flex items-center bg-[#090A0D] text-white overflow-hidden border-b border-white/10">
      {/* Background Photography with Atmospheric Vignette */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1800&q=85"
          alt="Iron Training Floor with Barbell Equipment"
          className="w-full h-full object-cover object-center filter brightness-[0.45] contrast-[1.15]"
          loading="eager"
        />
        {/* Layered dark gradients for legibility under bright shop screens */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#090A0D] via-[#090A0D]/75 to-[#090A0D]/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#090A0D] via-[#090A0D]/80 to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Main Left Content Column */}
          <div className="lg:col-span-8 space-y-6">
            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight text-white leading-[0.95] font-display">
              RAW IRON. <br />
              <span className="text-white">
                CLEAN COACHING.
              </span> <br />
              <span className="text-[#D4FF00]">ZERO COMPROMISE.</span>
            </h1>

            {/* Human Anti-Slop Subtitle */}
            <p className="text-base sm:text-lg text-neutral-300 max-w-2xl font-normal leading-relaxed">
              We ditched the crowded rows of broken machines and pushy sales reps. What remains is honest training: 
              calibrated Eleiko platforms, dumbbells up to 60kg, cold plunges, and coaches who know your name.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <button
                type="button"
                onClick={openFreePassModal}
                className="min-h-[52px] px-8 py-3.5 rounded-sm bg-[#D4FF00] hover:bg-[#BCE600] active:scale-95 text-[#090A0D] font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all"
              >
                <span>Claim Free Day Pass</span>
                <ArrowRight size={17} strokeWidth={2.5} />
              </button>

              <a
                href="#schedule"
                className="min-h-[52px] px-7 py-3.5 rounded-sm bg-white/5 hover:bg-white/10 text-white font-bold text-sm uppercase tracking-wider border border-white/15 flex items-center justify-center gap-2 transition-all"
              >
                <span>View Class Schedule</span>
              </a>
            </div>

            {/* Quick Trust Checks */}
            <div className="flex flex-wrap items-center gap-6 pt-4 text-xs font-mono text-neutral-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-[#D4FF00]" />
                <span>Zero Initiation Fee</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-[#D4FF00]" />
                <span>Month-to-Month Guarantee</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-[#D4FF00]" />
                <span>Free Towel &amp; Locker Service</span>
              </div>
            </div>
          </div>

          {/* Right Live Training Floor Telemetry Card */}
          <div className="lg:col-span-4">
            <div className="bg-[#12141A]/90 border border-white/15 rounded-sm p-6 backdrop-blur-md shadow-2xl relative space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <span className="text-[10px] font-mono text-[#D4FF00] uppercase tracking-wider block">FACILITY TELEMETRY</span>
                  <span className="text-base font-black text-white uppercase tracking-tight">Main Training Hall</span>
                </div>
                <div className="px-2.5 py-1 rounded-sm bg-[#D4FF00]/10 border border-[#D4FF00]/30 text-[#D4FF00] text-[11px] font-mono font-bold">
                  24/7 OPEN
                </div>
              </div>

              {/* Stat rows */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/40 p-3.5 rounded-sm border border-white/5">
                  <span className="text-[10px] font-mono text-neutral-400 block mb-1">OLYMPIC PLATFORMS</span>
                  <span className="text-2xl font-black text-white font-display">8 UNITS</span>
                  <span className="text-[10px] text-neutral-500 block">Eleiko &amp; Rogue Spec</span>
                </div>
                <div className="bg-black/40 p-3.5 rounded-sm border border-white/5">
                  <span className="text-[10px] font-mono text-neutral-400 block mb-1">DUMBBELLS</span>
                  <span className="text-2xl font-black text-[#D4FF00] font-display">2.5 - 60 KG</span>
                  <span className="text-[10px] text-neutral-500 block">Solid Urethane Pairs</span>
                </div>
                <div className="bg-black/40 p-3.5 rounded-sm border border-white/5">
                  <span className="text-[10px] font-mono text-neutral-400 block mb-1">TOTAL FLOOR</span>
                  <span className="text-2xl font-black text-white font-display">12,500 SQ FT</span>
                  <span className="text-[10px] text-neutral-500 block">Climate Controlled</span>
                </div>
                <div className="bg-black/40 p-3.5 rounded-sm border border-white/5">
                  <span className="text-[10px] font-mono text-neutral-400 block mb-1">RECOVERY ZONE</span>
                  <span className="text-2xl font-black text-white font-display">4°C &amp; 85°C</span>
                  <span className="text-[10px] text-neutral-500 block">Cold Plunge &amp; Sauna</span>
                </div>
              </div>

              {/* Member rating snippet */}
              <div className="border-t border-white/10 pt-4 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex text-[#D4FF00]">
                    {'★'.repeat(5)}
                  </div>
                  <span className="font-bold text-white">4.92 / 5.0</span>
                </div>
                <span className="text-neutral-400 font-mono text-[11px]">420+ active members</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
