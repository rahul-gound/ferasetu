import React, { useState } from 'react';
import { Clock, User, Users, Flame, Dumbbell, Shield, ChevronRight, Check } from 'lucide-react';
import { useStorefront } from '../../runtime/StorefrontProvider';
import { useGym, type DayOfWeek, type ClassSession } from './GymContext';

const SESSIONS_DATA: Record<DayOfWeek, ClassSession[]> = {
  mon: [
    { id: 'm1', name: 'Barbell Club: Heavy Squat & Accessory', time: '06:30 AM', duration: '60 Min', coach: 'Coach Marcus (CSCS)', category: 'strength', spotsRemaining: 3, level: 'All Levels' },
    { id: 'm2', name: 'Engine Room: 40m Turf Conditioning', time: '08:00 AM', duration: '45 Min', coach: 'Coach Devon', category: 'conditioning', spotsRemaining: 6, level: 'Intermediate' },
    { id: 'm3', name: 'Lunch Hour Express Mobility & Core', time: '12:30 PM', duration: '35 Min', coach: 'Coach Elena', category: 'recovery', spotsRemaining: 8, level: 'All Levels' },
    { id: 'm4', name: 'Upper Body Hypertrophy & Pulling', time: '05:30 PM', duration: '60 Min', coach: 'Coach Marcus (CSCS)', category: 'strength', spotsRemaining: 2, level: 'Advanced' },
    { id: 'm5', name: 'Boxing Conditioning & Heavy Bags', time: '07:00 PM', duration: '50 Min', coach: 'Coach Tariq', category: 'combat', spotsRemaining: 4, level: 'All Levels' },
  ],
  tue: [
    { id: 't1', name: 'Deadlift Dynamics & Posterior Chain', time: '06:30 AM', duration: '60 Min', coach: 'Coach Marcus (CSCS)', category: 'strength', spotsRemaining: 4, level: 'All Levels' },
    { id: 't2', name: 'Kettlebell Complex & Sled Drills', time: '08:00 AM', duration: '45 Min', coach: 'Coach Devon', category: 'conditioning', spotsRemaining: 5, level: 'All Levels' },
    { id: 't3', name: 'Olympic Snatch & Clean Workshop', time: '05:30 PM', duration: '75 Min', coach: 'Coach Elena (USAW L2)', category: 'strength', spotsRemaining: 3, level: 'Intermediate' },
    { id: 't4', name: 'Contrast Therapy & Guided Breathwork', time: '07:00 PM', duration: '40 Min', coach: 'Coach Elena', category: 'recovery', spotsRemaining: 6, level: 'All Levels' },
  ],
  wed: [
    { id: 'w1', name: 'Bench Press Protocol & Overhead Press', time: '06:30 AM', duration: '60 Min', coach: 'Coach Marcus (CSCS)', category: 'strength', spotsRemaining: 2, level: 'All Levels' },
    { id: 'w2', name: 'High-Output Aerobic Threshold Intervals', time: '08:00 AM', duration: '50 Min', coach: 'Coach Devon', category: 'conditioning', spotsRemaining: 5, level: 'Intermediate' },
    { id: 'w3', name: 'Muay Thai Kick & Rotational Power', time: '06:00 PM', duration: '60 Min', coach: 'Coach Tariq', category: 'combat', spotsRemaining: 4, level: 'All Levels' },
    { id: 'w4', name: 'Spinal Decompression & Hip Opening', time: '07:15 PM', duration: '35 Min', coach: 'Coach Devon', category: 'recovery', spotsRemaining: 7, level: 'All Levels' },
  ],
  thu: [
    { id: 'th1', name: 'Front Squat & Quad Development', time: '06:30 AM', duration: '60 Min', coach: 'Coach Marcus (CSCS)', category: 'strength', spotsRemaining: 5, level: 'All Levels' },
    { id: 'th2', name: 'Assault Bike & Sandbag Carry Circuit', time: '08:00 AM', duration: '45 Min', coach: 'Coach Devon', category: 'conditioning', spotsRemaining: 3, level: 'Advanced' },
    { id: 'th3', name: 'Olympic Clean & Jerk Technique', time: '05:30 PM', duration: '75 Min', coach: 'Coach Elena (USAW L2)', category: 'strength', spotsRemaining: 4, level: 'Intermediate' },
    { id: 'th4', name: 'Boxing Footwork & Defensive Angles', time: '07:00 PM', duration: '50 Min', coach: 'Coach Tariq', category: 'combat', spotsRemaining: 6, level: 'All Levels' },
  ],
  fri: [
    { id: 'f1', name: 'Full Body Heavy Compound Peaking', time: '06:30 AM', duration: '60 Min', coach: 'Coach Marcus (CSCS)', category: 'strength', spotsRemaining: 1, level: 'All Levels' },
    { id: 'f2', name: 'Team Turf Challenge & Relays', time: '08:00 AM', duration: '45 Min', coach: 'Coach Devon', category: 'conditioning', spotsRemaining: 8, level: 'All Levels' },
    { id: 'f3', name: 'Friday Night Fight Conditioning', time: '06:00 PM', duration: '60 Min', coach: 'Coach Tariq', category: 'combat', spotsRemaining: 2, level: 'Advanced' },
    { id: 'f4', name: 'Ice Bath & Sauna Contrast Protocol', time: '07:15 PM', duration: '45 Min', coach: 'Coach Devon', category: 'recovery', spotsRemaining: 5, level: 'All Levels' },
  ],
  sat: [
    { id: 's1', name: 'Saturday Barbell Open Platform Marathon', time: '08:00 AM', duration: '90 Min', coach: 'Coaches Marcus & Elena', category: 'strength', spotsRemaining: 4, level: 'All Levels' },
    { id: 's2', name: 'All-Hands Turf Wars Conditioning', time: '10:00 AM', duration: '60 Min', coach: 'Coach Devon', category: 'conditioning', spotsRemaining: 7, level: 'All Levels' },
    { id: 's3', name: 'Community Open Floor & Sparring', time: '11:30 AM', duration: '75 Min', coach: 'Coach Tariq', category: 'combat', spotsRemaining: 10, level: 'All Levels' },
  ],
  sun: [
    { id: 'su1', name: 'Sunday Active Recovery & Soft Tissue Flow', time: '09:00 AM', duration: '60 Min', coach: 'Coach Elena', category: 'recovery', spotsRemaining: 12, level: 'All Levels' },
    { id: 'su2', name: 'Open Lifting Floor & PR Testing (Uncoached)', time: '10:30 AM - 06:00 PM', duration: 'All Day', coach: 'Duty Floor Manager', category: 'strength', spotsRemaining: 25, level: 'All Levels' },
  ],
};

const DAYS: { key: DayOfWeek; label: string; sub: string }[] = [
  { key: 'mon', label: 'MON', sub: 'Squat & Engine' },
  { key: 'tue', label: 'TUE', sub: 'Deadlift & Oly' },
  { key: 'wed', label: 'WED', sub: 'Press & Combat' },
  { key: 'thu', label: 'THU', sub: 'Lower & Sprints' },
  { key: 'fri', label: 'FRI', sub: 'Peaking & Relays' },
  { key: 'sat', label: 'SAT', sub: 'Barbell Open' },
  { key: 'sun', label: 'SUN', sub: 'Recovery' },
];

export default function GymClassSchedule() {
  const { activeDay, setActiveDay, openFreePassModal } = useGym();
  const { shopPhone } = useStorefront();
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [reservedSessionId, setReservedSessionId] = useState<string | null>(null);

  const activeSessions = SESSIONS_DATA[activeDay] || [];
  const filteredSessions = activeSessions.filter((s) =>
    filterCategory === 'all' ? true : s.category === filterCategory
  );

  const handleRsvp = (session: ClassSession) => {
    setReservedSessionId(session.id);
    if (shopPhone) {
      const msg = encodeURIComponent(
        `Hi, I want to reserve a spot for "${session.name}" on ${activeDay.toUpperCase()} at ${session.time} with ${session.coach}.`
      );
      window.open(`https://wa.me/${shopPhone.replace(/[^0-9]/g, '')}?text=${msg}`, '_blank');
    } else {
      openFreePassModal();
    }
  };

  return (
    <section id="schedule" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-[#090A0D] text-white border-b border-white/10">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
          <div className="space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#D4FF00] block">
              LIVE TRAINING TIMETABLE
            </span>
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white font-display">
              Weekly Coached Floor.
            </h2>
            <p className="text-neutral-400 text-sm sm:text-base max-w-xl font-normal">
              Small-group coaching capped at 12 athletes per session. Reserve your spot online or via WhatsApp.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto">
            {['all', 'strength', 'conditioning', 'combat', 'recovery'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(cat)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xs text-xs font-mono uppercase tracking-wider transition-all ${
                  filterCategory === cat
                    ? 'bg-[#D4FF00] text-[#090A0D] font-bold shadow-sm'
                    : 'bg-white/5 text-neutral-400 hover:text-white border border-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Day Selector Buttons */}
        <div className="grid grid-cols-7 gap-2 overflow-x-auto pb-2 scrollbar-none">
          {DAYS.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setActiveDay(d.key)}
              className={`p-3 rounded-sm text-center transition-all flex flex-col items-center justify-center min-w-[70px] ${
                activeDay === d.key
                  ? 'bg-[#D4FF00] text-[#090A0D] font-black shadow-lg scale-[1.02]'
                  : 'bg-[#12141A] text-neutral-300 hover:bg-[#181B24] border border-white/10'
              }`}
            >
              <span className="text-base font-black font-display tracking-tight">{d.label}</span>
              <span
                className={`text-[10px] font-mono mt-0.5 hidden sm:block ${
                  activeDay === d.key ? 'text-[#090A0D]/80 font-bold' : 'text-neutral-500'
                }`}
              >
                {d.sub}
              </span>
            </button>
          ))}
        </div>

        {/* Schedule Ledger List */}
        <div className="space-y-3">
          {filteredSessions.length === 0 ? (
            <div className="p-12 text-center bg-[#12141A] border border-white/10 rounded-sm">
              <p className="text-sm text-neutral-400 font-mono">
                No sessions scheduled for this category on {activeDay.toUpperCase()}.
              </p>
            </div>
          ) : (
            filteredSessions.map((sess) => {
              const isReserved = reservedSessionId === sess.id;
              return (
                <div
                  key={sess.id}
                  className="p-5 sm:p-6 rounded-sm bg-[#12141A] border border-white/10 hover:border-[#D4FF00]/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-5 group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                    {/* Time Pill */}
                    <div className="p-3 bg-black/60 border border-white/10 rounded-sm min-w-[130px] text-center shrink-0">
                      <span className="text-base font-black font-mono text-[#D4FF00] block">
                        {sess.time}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono uppercase block">
                        {sess.duration}
                      </span>
                    </div>

                    {/* Class Details */}
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-lg font-black uppercase text-white font-display tracking-tight group-hover:text-[#D4FF00] transition-colors">
                          {sess.name}
                        </h4>
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-xs bg-white/5 border border-white/10 text-neutral-300">
                          {sess.level}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-mono text-neutral-400">
                        <span className="flex items-center gap-1.5 text-neutral-300">
                          <User size={13} className="text-[#D4FF00]" />
                          {sess.coach}
                        </span>
                        <span>•</span>
                        <span className={sess.spotsRemaining <= 3 ? 'text-amber-400 font-bold' : 'text-neutral-400'}>
                          {sess.spotsRemaining} spots left
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* RSVP Action */}
                  <div className="shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRsvp(sess)}
                      className={`min-h-[44px] w-full sm:w-auto px-6 py-2.5 rounded-sm font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                        isReserved
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white/10 text-white hover:bg-[#D4FF00] hover:text-[#090A0D]'
                      }`}
                    >
                      {isReserved ? (
                        <>
                          <Check size={14} />
                          <span>Reserved Spot</span>
                        </>
                      ) : (
                        <>
                          <span>Reserve Spot</span>
                          <ChevronRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
