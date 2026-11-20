import React from 'react';
import { Check, Flame, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { useStorefront } from '../../runtime/StorefrontProvider';
import { useGym } from './GymContext';

export default function GymMembershipTiers() {
  const { shopPhone, currencySymbol = '₹' } = useStorefront();
  const { openFreePassModal, setSelectedPassPlan } = useGym();

  const plans = [
    {
      id: 'day-pass',
      name: 'DAY PASS',
      badge: 'Single Drop-In',
      price: '350',
      period: 'per day',
      desc: 'Perfect for travelers, visitors, or lifters testing our calibrated platforms before joining.',
      features: [
        'Full open floor access (unlimited hours)',
        'Access to Olympic lifting platforms & turf',
        'Clean locker & rainfall shower usage',
        'Free fresh workout towel service',
      ],
      popular: false,
      cta: 'Get Day Pass',
    },
    {
      id: 'monthly-open',
      name: 'OPEN FLOOR',
      badge: 'Self-Directed',
      price: '2,499',
      period: 'per month',
      desc: '24/7 unrestricted facility access for autonomous lifters following their own programming.',
      features: [
        '24/7 biometric RFID keycard door access',
        'Full iron hall, dumbbells up to 60kg & turf',
        'Access to Finnish sauna & contrast suites',
        'Member app locker reservation',
        'Zero contract: cancel anytime in 1 click',
      ],
      popular: false,
      cta: 'Join Open Floor',
    },
    {
      id: 'athlete-track',
      name: 'ATHLETE TRACK',
      badge: 'MOST POPULAR',
      price: '4,499',
      period: 'per month',
      desc: 'The complete performance system: 24/7 open floor PLUS daily coached strength & conditioning classes.',
      features: [
        'All Open Floor 24/7 benefits included',
        'Unlimited access to all daily coached classes',
        'Quarterly InBody 570 body composition scans',
        'Video barbell form analysis by CSCS coaches',
        'Unlimited Cold Plunge (4°C) & Sauna usage',
        '10% discount on all Pro Shop gear & protein',
      ],
      popular: true,
      cta: 'Start Athlete Track',
    },
    {
      id: 'private-coaching',
      name: '1-ON-1 S&C',
      badge: 'Dedicated Coach',
      price: '7,999',
      period: 'per month',
      desc: 'Personalized strength periodization, 12 private 60-min sessions, and direct WhatsApp nutrition monitoring.',
      features: [
        '12 private 60-minute coached sessions',
        'Customized progressive overload programming',
        'Weekly macro & nutrition protocol adjustments',
        'Comprehensive mobility & injury prevention plan',
        'Full 24/7 facility & recovery access included',
      ],
      popular: false,
      cta: 'Book Consultation',
    },
  ];

  const handleSelectPlan = (plan: typeof plans[0]) => {
    setSelectedPassPlan(plan.name);
    if (shopPhone) {
      const msg = encodeURIComponent(`Hi, I would like to sign up for the ${plan.name} (${currencySymbol}${plan.price} ${plan.period}) at the gym.`);
      window.open(`https://wa.me/${shopPhone.replace(/[^0-9]/g, '')}?text=${msg}`, '_blank');
    } else {
      openFreePassModal();
    }
  };

  return (
    <section id="memberships" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-[#0D0F14] text-white border-b border-white/10">
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#D4FF00] block">
            HONEST MEMBERSHIP ARCHITECTURE
          </span>
          <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white font-display">
            Zero Lock-In. Zero Surprises.
          </h2>
          <p className="text-neutral-400 text-sm sm:text-base font-normal">
            No annual maintenance fees, no cancellation penalties, and no high-pressure sales pitches. 
            Pick the tier that matches your commitment.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {plans.map((p) => (
            <div
              key={p.id}
              className={`rounded-sm flex flex-col justify-between p-6 sm:p-7 transition-all duration-300 relative ${
                p.popular
                  ? 'bg-[#151822] border-2 border-[#D4FF00] shadow-[0_0_35px_rgba(212,255,0,0.15)] scale-[1.02] z-10'
                  : 'bg-[#12141A] border border-white/10 hover:border-white/30'
              }`}
            >
              {p.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#D4FF00] text-[#090A0D] font-mono text-[10px] font-black uppercase tracking-wider rounded-xs shadow-md">
                  {p.badge}
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400">
                      {p.name}
                    </span>
                    {!p.popular && (
                      <span className="text-[10px] font-mono uppercase text-neutral-500 border border-white/10 px-1.5 py-0.5 rounded-xs">
                        {p.badge}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1 mt-3">
                    <span className="text-3xl sm:text-4xl font-black font-display text-white tracking-tight">
                      {currencySymbol}{p.price}
                    </span>
                    <span className="text-xs font-mono text-neutral-400">/{p.period}</span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-2.5 leading-relaxed font-normal">
                    {p.desc}
                  </p>
                </div>

                {/* Features List */}
                <div className="border-t border-white/10 pt-5 space-y-2.5">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block mb-2">
                    INCLUDED IN PASS:
                  </span>
                  {p.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-neutral-300">
                      <Check
                        size={14}
                        className={p.popular ? 'text-[#D4FF00] shrink-0 mt-0.5' : 'text-neutral-400 shrink-0 mt-0.5'}
                      />
                      <span className="leading-snug">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-7">
                <button
                  type="button"
                  onClick={() => handleSelectPlan(p)}
                  className={`w-full min-h-[48px] rounded-sm font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    p.popular
                      ? 'bg-[#D4FF00] text-[#090A0D] hover:bg-[#BCE600] active:scale-95 shadow-md'
                      : 'bg-white/10 text-white hover:bg-white/20 active:scale-95'
                  }`}
                >
                  <span>{p.cta}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Guarantee Banner */}
        <div className="bg-[#141620] border border-white/10 rounded-sm p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#D4FF00]/10 border border-[#D4FF00]/30 rounded-sm text-[#D4FF00] shrink-0">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h4 className="text-base font-black uppercase text-white font-display">
                7-Day Unconditional Trial Guarantee
              </h4>
              <p className="text-xs text-neutral-400 max-w-xl mt-0.5 leading-relaxed">
                If the equipment, environment, or coaching doesn't meet your standard within your first 7 days, 
                we'll refund your membership in full. No forms, no arguments.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openFreePassModal}
            className="min-h-[44px] px-6 py-2.5 rounded-sm bg-white/10 hover:bg-white/20 text-white font-mono text-xs uppercase font-bold tracking-wider shrink-0 transition-colors"
          >
            Claim 1-Day Pass First →
          </button>
        </div>
      </div>
    </section>
  );
}
