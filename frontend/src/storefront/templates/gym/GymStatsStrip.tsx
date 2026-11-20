import React from 'react';
import { Dumbbell, ShieldCheck, KeyRound, Waves, Award } from 'lucide-react';

export default function GymStatsStrip() {
  const stats = [
    {
      icon: <Dumbbell size={20} className="text-[#D4FF00]" />,
      val: '12,500 SQ FT',
      label: 'Main Iron & Turf Floor',
      sub: 'Dedicated zones for lifting & conditioning',
    },
    {
      icon: <Award size={20} className="text-[#D4FF00]" />,
      val: '8 OLYMPIC PLATFORMS',
      label: 'Eleiko & Rogue Equipment',
      sub: 'Calibrated steel plates & competition bars',
    },
    {
      icon: <KeyRound size={20} className="text-[#D4FF00]" />,
      val: '24/7 BIOMETRIC RFID',
      label: 'Seamless Door Access',
      sub: 'Train at 4 AM or midnight with your keycard',
    },
    {
      icon: <Waves size={20} className="text-[#D4FF00]" />,
      val: '4°C COLD PLUNGE',
      label: 'Contrast Recovery Suites',
      sub: 'Ice bath immersion & 85°C dry Finnish sauna',
    },
  ];

  return (
    <section className="bg-[#0D0F14] border-b border-white/10 py-8 px-4 sm:px-6 lg:px-8 text-white">
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, idx) => (
          <div
            key={idx}
            className="flex items-start gap-4 p-4 rounded-sm bg-[#14161F] border border-white/5 hover:border-[#D4FF00]/40 transition-colors"
          >
            <div className="p-2.5 rounded-sm bg-black/50 border border-white/10 shrink-0">
              {s.icon}
            </div>
            <div>
              <div className="text-lg font-black font-display tracking-tight text-white leading-tight">
                {s.val}
              </div>
              <div className="text-xs font-bold text-neutral-300 mt-0.5">{s.label}</div>
              <div className="text-[11px] text-neutral-500 font-mono mt-1 leading-snug">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
