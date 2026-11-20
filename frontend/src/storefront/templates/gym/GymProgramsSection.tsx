import React from 'react';
import { ArrowRight, Flame, Dumbbell, Zap, HeartPulse, Sparkles } from 'lucide-react';

export default function GymProgramsSection() {
  const programs = [
    {
      id: 'strength',
      title: 'Strength & Hypertrophy',
      tagline: 'Compound Movements · Calibrated Iron · Progressive Overload',
      description: 'Structured programming for squat, bench, deadlift, and accessory muscle development. Coached barbell mechanics with video form feedback.',
      image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=900&q=85',
      tags: ['Barbell Lifts', 'Eleiko Plates', 'Form Analysis'],
      sessionLength: '60 Min Sessions',
      intensity: 'Heavy Resistance',
    },
    {
      id: 'conditioning',
      title: 'Metabolic Conditioning & Turf',
      tagline: 'Sled Sprints · Kettlebell Flow · Aerobic Threshold',
      description: 'High-output interval training on 40m indoor turf. Build work capacity, stamina, and explosive power without joint-destroying impact.',
      image: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=900&q=85',
      tags: ['40m Sprint Turf', 'Assault Bikes', 'RowErgs'],
      sessionLength: '45 Min High-Output',
      intensity: 'Zone 4-5 Cardio',
    },
    {
      id: 'combat',
      title: 'Combat & Striking Club',
      tagline: 'Heavy Bags · Pad Work · Footwork & Defense',
      description: 'Boxing and Muay Thai striking fundamentals led by active regional champions. Sharpen reflexes, rotational power, and mental resilience.',
      image: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=900&q=85',
      tags: ['Fairtex Bags', 'Pad Rounds', 'Rotational Power'],
      sessionLength: '50 Min Rounds',
      intensity: 'Athletic Conditioning',
    },
    {
      id: 'recovery',
      title: 'Contrast Therapy & Mobility',
      tagline: '4°C Ice Bath · 85°C Finnish Sauna · Fascial Release',
      description: 'Complete recovery suites engineered to accelerate central nervous system restoration, clear lactic accumulation, and improve joint capsule mobility.',
      image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=85',
      tags: ['Cold Immersion', 'Dry Sauna', 'Joint Hygiene'],
      sessionLength: 'Self-Paced / Guided',
      intensity: 'Parasympathetic Reset',
    },
  ];

  return (
    <section id="programs" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-[#090A0D] text-white border-b border-white/10">
      <div className="max-w-7xl mx-auto space-y-14">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
          <div className="space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#D4FF00] block">
              TRAINING DISCIPLINES
            </span>
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white font-display">
              Built For Serious Work.
            </h2>
            <p className="text-neutral-400 text-sm sm:text-base max-w-xl font-normal">
              Every square foot of our training hall is assigned to a specific physiological purpose. 
              Pick your focus or combine them inside the Athlete Track.
            </p>
          </div>
          <a
            href="#schedule"
            className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#D4FF00] hover:underline shrink-0"
          >
            <span>See Weekly Timetable</span>
            <ArrowRight size={14} />
          </a>
        </div>

        {/* 2x2 Clean High-Craft Program Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {programs.map((prog) => (
            <div
              key={prog.id}
              className="group rounded-sm bg-[#12141A] border border-white/10 hover:border-[#D4FF00]/60 overflow-hidden flex flex-col transition-all duration-300 shadow-xl"
            >
              {/* Photo Header */}
              <div className="relative w-full aspect-[16/9] overflow-hidden bg-neutral-900">
                <img
                  src={prog.image}
                  alt={prog.title}
                  className="w-full h-full object-cover object-center filter brightness-[0.75] contrast-[1.1] group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#12141A] via-transparent to-black/30" />
                <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 rounded-xs bg-black/80 backdrop-blur-md text-[#D4FF00] font-mono text-[10px] font-bold uppercase border border-[#D4FF00]/30">
                    {prog.intensity}
                  </span>
                  <span className="px-2.5 py-1 rounded-xs bg-black/80 backdrop-blur-md text-white font-mono text-[10px] font-bold uppercase border border-white/15">
                    {prog.sessionLength}
                  </span>
                </div>
              </div>

              {/* Content Body */}
              <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <h3 className="text-2xl font-black uppercase text-white font-display tracking-tight group-hover:text-[#D4FF00] transition-colors">
                    {prog.title}
                  </h3>
                  <div className="text-xs font-mono text-[#D4FF00]/90 font-medium">
                    {prog.tagline}
                  </div>
                  <p className="text-sm text-neutral-300 font-normal leading-relaxed">
                    {prog.description}
                  </p>
                </div>

                {/* Tags and CTA */}
                <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-1.5">
                    {prog.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] font-mono px-2 py-0.5 rounded-xs bg-white/5 text-neutral-400 border border-white/5"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                  <a
                    href="#schedule"
                    className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-white group-hover:text-[#D4FF00] transition-colors"
                  >
                    <span>Check Times</span>
                    <ArrowRight size={13} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
