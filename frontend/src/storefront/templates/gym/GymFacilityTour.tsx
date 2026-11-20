import React from 'react';
import { Camera, CheckCircle2, Shield, Sparkles } from 'lucide-react';

export default function GymFacilityTour() {
  const facilities = [
    {
      title: 'Olympic Platforms & Calibrated Steel',
      spec: '8 Inset Oak Platforms · Eleiko Discs · Rogue Ohio Power Bars',
      desc: 'Tested for maximum drop stability. No bent commercial bars or bouncing plates.',
      image: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=1000&q=85',
    },
    {
      title: 'Heavyweight Dumbbell & Bench Gallery',
      spec: '2.5kg to 60kg Matched Pairs · 6 Custom Commercial Incline Benches',
      desc: 'Solid urethane welded heads. Zero loose rattling caps or greasy vinyl.',
      image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=1000&q=85',
    },
    {
      title: '40m High-Density Sprint & Sled Turf',
      spec: 'Prowler Sleds · Farmer Carry Implements · Assault AirBikes',
      desc: 'Engineered for conditioning without shin splints. High-traction shock absorption.',
      image: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=1000&q=85',
    },
    {
      title: 'Contrast Therapy & Hydro Recovery',
      spec: 'Continuous 4°C Ozone Cold Plunge · 85°C Nordic Dry Sauna',
      desc: 'Restores parasympathetic state, resets systemic inflammation, and speeds CNS readiness.',
      image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1000&q=85',
    },
  ];

  return (
    <section id="facility" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-[#090A0D] text-white border-b border-white/10">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#D4FF00] block">
            FACILITY ARCHITECTURE
          </span>
          <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white font-display">
            The Equipment Standard.
          </h2>
          <p className="text-neutral-400 text-sm sm:text-base font-normal">
            Take an honest look at our actual floor. Calibrated weights, clean air exchange, and zero waiting for benches.
          </p>
        </div>

        {/* 4 Photo Showcase Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {facilities.map((fac, idx) => (
            <div
              key={idx}
              className="group rounded-sm bg-[#12141A] border border-white/10 hover:border-[#D4FF00]/40 overflow-hidden flex flex-col transition-all duration-300 shadow-xl"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-neutral-900">
                <img
                  src={fac.image}
                  alt={fac.title}
                  className="w-full h-full object-cover object-center filter brightness-[0.8] contrast-[1.1] group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#12141A] via-transparent to-transparent" />
                <div className="absolute top-4 left-4">
                  <span className="px-2.5 py-1 rounded-xs bg-black/80 backdrop-blur-md text-[#D4FF00] font-mono text-[10px] font-bold uppercase border border-[#D4FF00]/30">
                    ZONE 0{idx + 1}
                  </span>
                </div>
              </div>

              <div className="p-6 sm:p-7 space-y-3">
                <h3 className="text-xl sm:text-2xl font-black uppercase text-white font-display tracking-tight group-hover:text-[#D4FF00] transition-colors">
                  {fac.title}
                </h3>
                <div className="text-xs font-mono text-[#D4FF00]/90 font-medium">
                  {fac.spec}
                </div>
                <p className="text-sm text-neutral-300 leading-relaxed font-normal">
                  {fac.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
