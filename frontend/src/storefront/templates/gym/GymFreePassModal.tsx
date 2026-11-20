import React, { useState } from 'react';
import { X, CheckCircle2, Flame, ArrowRight, ShieldCheck, Dumbbell } from 'lucide-react';
import { useStorefront } from '../../runtime/StorefrontProvider';
import { useGym } from './GymContext';

export default function GymFreePassModal() {
  const { isFreePassModalOpen, closeFreePassModal, selectedPassPlan } = useGym();
  const { shopName, shopPhone } = useStorefront();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [focus, setFocus] = useState('barbell');
  const [timeSlot, setTimeSlot] = useState('morning');
  const [submitted, setSubmitted] = useState(false);

  if (!isFreePassModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    if (shopPhone) {
      const msg = encodeURIComponent(
        `Hi ${shopName || 'Gym'}! I'd like to activate my Free 1-Day Guest Pass.\nName: ${name}\nPhone: ${phone}\nFocus: ${focus.toUpperCase()}\nPreferred Slot: ${timeSlot.toUpperCase()}${
          selectedPassPlan ? `\nInterested In: ${selectedPassPlan}` : ''
        }`
      );
      setTimeout(() => {
        window.open(`https://wa.me/${shopPhone.replace(/[^0-9]/g, '')}?text=${msg}`, '_blank');
      }, 700);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setName('');
    setPhone('');
    closeFreePassModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-sm bg-[#12141A] border border-white/20 shadow-2xl p-6 sm:p-8 text-white overflow-hidden">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleReset}
          className="absolute top-5 right-5 p-2 rounded-sm text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        {!submitted ? (
          <div className="space-y-6">
            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#D4FF00] block mb-1">
                GUEST INVITATION PASS
              </span>
              <h3 className="text-2xl sm:text-3xl font-black uppercase text-white font-display tracking-tight">
                Claim 1-Day Floor Access
              </h3>
              <p className="text-xs sm:text-sm text-neutral-300 mt-1.5 leading-relaxed font-normal">
                Experience calibrated Eleiko iron, 40m turf, and contrast plunge suites. No sales pitch, no commitment.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-neutral-300 font-bold mb-1.5">
                  Your Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Morgan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full min-h-[46px] px-3.5 bg-black/60 border border-white/15 rounded-sm text-white text-sm focus:outline-none focus:border-[#D4FF00] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-neutral-300 font-bold mb-1.5">
                  WhatsApp / Phone Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full min-h-[46px] px-3.5 bg-black/60 border border-white/15 rounded-sm text-white text-sm focus:outline-none focus:border-[#D4FF00] transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-neutral-300 font-bold mb-1.5">
                    Primary Focus
                  </label>
                  <select
                    value={focus}
                    onChange={(e) => setFocus(e.target.value)}
                    className="w-full min-h-[46px] px-3 bg-black/60 border border-white/15 rounded-sm text-white text-xs focus:outline-none focus:border-[#D4FF00] cursor-pointer"
                  >
                    <option value="barbell">Barbell &amp; Strength</option>
                    <option value="turf">Turf &amp; Conditioning</option>
                    <option value="combat">Boxing &amp; Combat</option>
                    <option value="recovery">Sauna &amp; Recovery</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-neutral-300 font-bold mb-1.5">
                    Preferred Time
                  </label>
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full min-h-[46px] px-3 bg-black/60 border border-white/15 rounded-sm text-white text-xs focus:outline-none focus:border-[#D4FF00] cursor-pointer"
                  >
                    <option value="morning">Morning (06:00 - 10:00)</option>
                    <option value="noon">Midday (11:00 - 16:00)</option>
                    <option value="evening">Evening (17:00 - 22:00)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full min-h-[50px] rounded-sm bg-[#D4FF00] hover:bg-[#BCE600] active:scale-95 text-[#090A0D] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all"
                >
                  <span>Activate Free Guest Pass</span>
                  <ArrowRight size={16} />
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-neutral-400 pt-1">
                <ShieldCheck size={13} className="text-[#D4FF00]" />
                <span>Instant confirmation · ID verification required on arrival</span>
              </div>
            </form>
          </div>
        ) : (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#D4FF00]/10 border border-[#D4FF00]/40 text-[#D4FF00] flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black uppercase text-white font-display">
                Guest Pass Dispatched!
              </h3>
              <p className="text-xs text-neutral-300 max-w-sm mx-auto leading-relaxed">
                Welcome, {name}! Your 1-day pass for {timeSlot.toUpperCase()} slot has been generated. 
                Show this confirmation or your WhatsApp chat at the front desk.
              </p>
            </div>

            <div className="p-4 bg-black/60 border border-white/10 rounded-sm font-mono text-xs text-[#D4FF00] max-w-xs mx-auto">
              PASS REF: GUEST-{Math.floor(100000 + Math.random() * 900000)}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-2.5 rounded-sm bg-white/10 text-white font-mono text-xs uppercase font-bold hover:bg-white/20 transition-colors"
              >
                Close &amp; Return to Store
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
