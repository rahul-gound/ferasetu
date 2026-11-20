import React from 'react';
import { Dumbbell, MapPin, Phone, Clock, ShieldCheck, Heart } from 'lucide-react';
import { useStorefront } from '../../runtime/StorefrontProvider';
import { useGym } from './GymContext';

export default function GymFooter() {
  const { shopName, shopPhone } = useStorefront();
  const { openFreePassModal } = useGym();

  const name = shopName || 'APEX STRENGTH CLUB';

  return (
    <footer className="bg-[#060709] border-t border-white/10 text-white pt-16 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-white/10">
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-sm bg-[#D4FF00] text-[#090A0D] flex items-center justify-center font-black">
                <Dumbbell size={20} strokeWidth={2.2} />
              </div>
              <span className="text-xl font-black uppercase tracking-tight font-display text-white">
                {name}
              </span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed font-normal">
              High-performance training hall engineered for strength athletes, powerlifters, and conditioning. 
              No sales gimmicks. Raw iron, clean platforms, zero lock-in contracts.
            </p>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xs bg-white/5 border border-white/10 text-[#D4FF00] text-[10px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4FF00]" />
              <span>DIRECT MERCHANT STOREFRONT</span>
            </div>
          </div>

          {/* Training Hours */}
          <div className="space-y-3 font-mono text-xs">
            <span className="text-xs uppercase font-bold text-[#D4FF00] tracking-wider block">
              OPERATING HOURS
            </span>
            <div className="space-y-2 text-neutral-300">
              <div>
                <div className="text-white font-bold">24/7 BIOMETRIC ACCESS</div>
                <div className="text-[11px] text-neutral-400">All RFID keycard members</div>
              </div>
              <div className="border-t border-white/5 pt-2">
                <div className="text-white font-bold">STAFFED DESK &amp; COACHING</div>
                <div className="text-[11px] text-neutral-400">Mon - Fri: 06:00 AM - 10:00 PM</div>
                <div className="text-[11px] text-neutral-400">Sat - Sun: 08:00 AM - 08:00 PM</div>
              </div>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="space-y-3 text-xs">
            <span className="font-mono uppercase font-bold text-[#D4FF00] tracking-wider block">
              FACILITY NAVIGATION
            </span>
            <ul className="space-y-2 text-neutral-300 font-medium">
              <li>
                <a href="#programs" className="hover:text-[#D4FF00] transition-colors">
                  Training Pillars
                </a>
              </li>
              <li>
                <a href="#schedule" className="hover:text-[#D4FF00] transition-colors">
                  Live Class Timetable
                </a>
              </li>
              <li>
                <a href="#memberships" className="hover:text-[#D4FF00] transition-colors">
                  Passes &amp; Membership Tiers
                </a>
              </li>
              <li>
                <a href="#facility" className="hover:text-[#D4FF00] transition-colors">
                  Equipment Spec Sheet
                </a>
              </li>
              <li>
                <a href="#pro-shop" className="hover:text-[#D4FF00] transition-colors">
                  Pro Shop &amp; Supplements
                </a>
              </li>
            </ul>
          </div>

          {/* Action & Contact */}
          <div className="space-y-4">
            <span className="font-mono text-xs uppercase font-bold text-[#D4FF00] tracking-wider block">
              GUEST ACCESS
            </span>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Visiting for the day? Test our Olympic platforms and contrast suites without any obligation.
            </p>
            <button
              type="button"
              onClick={openFreePassModal}
              className="w-full min-h-[44px] rounded-sm bg-[#D4FF00] hover:bg-[#BCE600] active:scale-95 text-[#090A0D] font-black text-xs uppercase tracking-wider transition-all shadow-md"
            >
              Get Free Day Pass
            </button>
            {shopPhone && (
              <div className="text-xs font-mono text-neutral-400 flex items-center gap-2">
                <Phone size={13} className="text-[#D4FF00]" />
                <span>Front Desk: {shopPhone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-neutral-500">
          <div>
            © {new Date().getFullYear()} {name}. All Rights Reserved.
          </div>
          <div className="flex items-center gap-5">
            <span>0% Commission Store</span>
            <span>Direct Settlement</span>
            <span className="text-neutral-400">Powered by FeraSetu</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
