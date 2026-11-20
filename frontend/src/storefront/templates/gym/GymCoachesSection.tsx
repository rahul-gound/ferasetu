import React from 'react';
import { Award, MessageCircle, ShieldCheck, Check } from 'lucide-react';
import { useStorefront } from '../../runtime/StorefrontProvider';
import { useGym } from './GymContext';

export default function GymCoachesSection() {
  const { shopPhone } = useStorefront();
  const { openFreePassModal } = useGym();

  const coaches = [
    {
      name: 'Marcus Vance',
      role: 'Head Strength & Conditioning Lead',
      certs: ['CSCS (NSCA)', '12 Years Coaching', 'Ex-National Powerlifter'],
      bio: 'Specializes in barbell biomechanics, heavy squat/deadlift periodization, and building indestructible posterior chains.',
      image: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Elena Rostova',
      role: 'Olympic Weightlifting & Mobility Director',
      certs: ['USAW Level 2', 'M.S. Exercise Physiology', 'Barbell Mechanics'],
      bio: 'Coaches snatch and clean & jerk mechanics from grassroots to national qualification. Obsessive about wrist/hip mobility.',
      image: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Devon Cole',
      role: 'Metabolic Conditioning & Recovery Lead',
      certs: ['NSCA-CPT', 'Combat Conditioning Coach', 'Recovery Specialist'],
      bio: 'Directs the 40m turf programs and contrast recovery protocols. Builds athletic work capacity that carries outside the gym.',
      image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=600&q=80',
    },
  ];

  const handleConsult = (coachName: string) => {
    if (shopPhone) {
      const msg = encodeURIComponent(`Hi, I'd like to book a 1-on-1 strength assessment consultation with ${coachName}.`);
      window.open(`https://wa.me/${shopPhone.replace(/[^0-9]/g, '')}?text=${msg}`, '_blank');
    } else {
      openFreePassModal();
    }
  };

  return (
    <section id="coaches" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-[#0D0F14] text-white border-b border-white/10">
      <div className="max-w-7xl mx-auto space-y-14">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#D4FF00] block">
            FACULTY &amp; STAFF
          </span>
          <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white font-display">
            Coaches. Not Influencers.
          </h2>
          <p className="text-neutral-400 text-sm sm:text-base font-normal">
            No selfie sticks or social media gimmicks. Just certified specialists on the floor supervising every set.
          </p>
        </div>

        {/* 3 Coaches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {coaches.map((c, idx) => (
            <div
              key={idx}
              className="group rounded-sm bg-[#12141A] border border-white/10 hover:border-[#D4FF00]/40 overflow-hidden flex flex-col justify-between transition-all duration-300 shadow-xl"
            >
              <div>
                <div className="relative aspect-[4/5] overflow-hidden bg-neutral-900">
                  <img
                    src={c.image}
                    alt={c.name}
                    className="w-full h-full object-cover object-top filter brightness-[0.8] contrast-[1.1] group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#12141A] via-transparent to-transparent" />
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="text-2xl font-black uppercase text-white font-display tracking-tight group-hover:text-[#D4FF00] transition-colors">
                      {c.name}
                    </h3>
                    <div className="text-xs font-mono text-[#D4FF00] mt-1 font-semibold">
                      {c.role}
                    </div>
                  </div>

                  {/* Certifications */}
                  <div className="space-y-1.5 pt-2 border-t border-white/10">
                    {c.certs.map((cert, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs font-mono text-neutral-300">
                        <Check size={13} className="text-[#D4FF00] shrink-0" />
                        <span>{cert}</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-neutral-400 leading-relaxed pt-2 font-normal">
                    {c.bio}
                  </p>
                </div>
              </div>

              {/* Consultation trigger */}
              <div className="p-6 pt-0">
                <button
                  type="button"
                  onClick={() => handleConsult(c.name)}
                  className="w-full min-h-[44px] rounded-sm bg-white/10 hover:bg-[#D4FF00] hover:text-[#090A0D] text-white font-mono text-xs uppercase font-bold tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <MessageCircle size={14} />
                  <span>Consult with {c.name.split(' ')[0]}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
