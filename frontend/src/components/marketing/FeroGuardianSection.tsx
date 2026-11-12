import React from 'react';
import { ShieldCheck, ArrowRight, CheckCircle2, Store, Lock, Smartphone, Building2 } from 'lucide-react';

interface FeroGuardianSectionProps {
  onStart: () => void;
  market?: string;
}

/**
 * Fero Guardian — Visual presentation of FeraSetu's sovereign mascot,
 * Fero the Lion Guardian, standing beside independent merchants.
 */
export default function FeroGuardianSection({ onStart, market = 'IN' }: FeroGuardianSectionProps) {
  const isIndia = market === 'IN';

  return (
    <section
      id="fero-guardian"
      className="py-20 md:py-24 bg-gradient-to-b from-white via-slate-50/60 to-white border-b border-slate-200 relative overflow-hidden"
      aria-label="Meet Fero, Sovereign Lion Guardian"
    >
      {/* Ambient Lighting Orbs */}
      <div className="absolute top-1/4 -left-40 w-96 h-96 bg-[#F59E0B]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 -right-40 w-96 h-96 bg-[#0052FF]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 relative z-10">
        
        {/* Section Eyebrow & Title */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold mb-4 shadow-sm border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span className="font-mono text-[11px] font-bold text-[#F59E0B] uppercase tracking-wider">
              SOVEREIGN GUARDIAN OF INDEPENDENT SHOPS
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.12] mb-4">
            Meet Fero.<br />
            <span className="text-[#0052FF]">The lion guardian of your store.</span>
          </h2>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-2xl mx-auto">
            Marketplaces take 15% to 25% of every sale and hide your customer numbers. Fero stands beside your counter to make sure every order and rupee reaches your hands.
          </p>
        </div>

        {/* 2-Column Presentation Card */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-10 lg:p-12 shadow-xl shadow-slate-900/5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Column 1: Fero Mascot Visual Card (Col 1-5) */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="relative w-full max-w-[360px] group">
                {/* Outer Glow Halo */}
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-[#0052FF]/20 via-[#F59E0B]/25 to-[#10B981]/20 blur-md opacity-80 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Main Mascot Portrait Frame */}
                <div className="relative rounded-2xl overflow-hidden border-2 border-[#F59E0B]/60 bg-white shadow-2xl">
                  <picture>
                    <source srcSet="/pictures/fero-mascot.webp" type="image/webp" />
                    <img
                      src="/pictures/fero-mascot.jpg"
                      alt="Fero — The sovereign lion guardian of FeraSetu holding a store management tablet"
                      className="w-full h-auto object-cover object-top transition-transform duration-500 group-hover:scale-102"
                      loading="lazy"
                    />
                  </picture>

                  {/* Tablet Live Status Overlay Card */}
                  <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700/80 text-white shadow-lg">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-mono font-bold text-[#F59E0B] flex items-center gap-1.5">
                        <Store size={13} className="text-[#F59E0B]" />
                        Direct Merchant Payout
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono text-[10px] font-bold">
                        100% Retained
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-300 font-mono">
                      <span>Platform Commission:</span>
                      <span className="font-bold text-white">0% (₹0.00)</span>
                    </div>
                  </div>

                  {/* Top Corner Shield Pill */}
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-[#10B981] text-white text-[10px] font-mono font-black shadow-md border border-white flex items-center gap-1">
                    <ShieldCheck size={12} />
                    <span>0% TOLL GUARANTEE</span>
                  </div>
                </div>
              </div>

              {/* Caption Under Mascot */}
              <div className="mt-4 text-center">
                <span className="font-bold text-sm text-slate-900 block">Fero</span>
                <span className="text-xs text-slate-500">Guardian of Merchant Ownership</span>
              </div>
            </div>

            {/* Column 2: The 4 Merchant Defense Guarantees (Col 6-12) */}
            <div className="lg:col-span-7 flex flex-col justify-between">
              
              <div className="mb-6">
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
                  What Fero protects for your business
                </h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
                  A physical store takes real sweat: finding goods, building neighbor trust, and opening the shutters every morning. Your online software should never act like a landlord demanding a cut of every sale.
                </p>
              </div>

              {/* 4 Core Guarantees Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                
                {/* Guarantee 1 */}
                <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/70 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center font-bold text-xs font-mono">
                      0%
                    </div>
                    <h4 className="font-bold text-sm text-slate-900">Zero Commission Toll</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-snug">
                    Keep 100% of your earnings after direct gateway processing fees. No percentage toll taken from your store sales.
                  </p>
                </div>

                {/* Guarantee 2 */}
                <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/70 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold text-xs">
                      <Building2 size={14} />
                    </div>
                    <h4 className="font-bold text-sm text-slate-900">Direct Bank Settlement</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-snug">
                    Customer payments settle directly into your merchant bank account without platform escrow holding periods.
                  </p>
                </div>

                {/* Guarantee 3 */}
                <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/70 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-bold text-xs">
                      <Smartphone size={14} />
                    </div>
                    <h4 className="font-bold text-sm text-slate-900">Unmasked Customer Ledger</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-snug">
                    Direct phone numbers and full purchase records on every invoice. Your customer list is yours to download anytime.
                  </p>
                </div>

                {/* Guarantee 4 */}
                <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/70 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center font-bold text-xs">
                      <Lock size={14} />
                    </div>
                    <h4 className="font-bold text-sm text-slate-900">Your Domain &amp; Brand</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-snug">
                    Your permanent web address with zero competitor ads or recommended products placed next to your goods.
                  </p>
                </div>

              </div>

              {/* Action Strip */}
              <div className="pt-5 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-[#10B981]" />
                  <span>{isIndia ? 'Permanent Free Plan · No credit card required' : '14-day free trial · Cancel anytime'}</span>
                </div>

                <button
                  type="button"
                  onClick={onStart}
                  className="group w-full sm:w-auto px-6 py-3 rounded-xl bg-[#0052FF] text-white font-bold text-sm hover:bg-[#0047E0] transition-all duration-150 hover:-translate-y-0.5 shadow-md shadow-[#0052FF]/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Bring my business online</span>
                  <ArrowRight size={15} className="transition-transform duration-150 group-hover:translate-x-1" />
                </button>
              </div>

            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
