import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Sparkles } from 'lucide-react';
import { meditativeAudio } from '../../lib/audio/meditativeSoundscape';

export default function MeditativeSanctuaryPill() {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Check initial state
    setIsPlaying(meditativeAudio.getIsPlaying());
  }, []);

  const handleToggle = () => {
    const next = meditativeAudio.toggle();
    setIsPlaying(next);
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 select-none">
      <button
        type="button"
        onClick={handleToggle}
        aria-label={isPlaying ? 'Pause meditative atmosphere' : 'Play meditative atmosphere'}
        className={`group flex items-center gap-2.5 px-3.5 py-2 rounded-full border shadow-lg backdrop-blur-md transition-all duration-200 cursor-pointer active:scale-95 ${
          isPlaying
            ? 'bg-slate-900/95 text-white border-slate-700 shadow-emerald-500/10'
            : 'bg-white/95 text-slate-700 border-slate-200/90 hover:border-slate-300 hover:text-slate-950 shadow-slate-900/10'
        }`}
      >
        {isPlaying ? (
          <>
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Volume2 size={13} />
            </div>
            <div className="text-left pr-1">
              <div className="text-[11px] font-bold text-white flex items-center gap-1.5 leading-none">
                <span>Calm Sanctuary</span>
                <span className="flex items-center gap-0.5">
                  <span className="w-1 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="w-1 h-3 bg-emerald-500 rounded-full animate-bounce" />
                  <span className="w-1 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                </span>
              </div>
              <span className="text-[9px] text-slate-400 font-mono">432Hz Ambient</span>
            </div>
          </>
        ) : (
          <>
            <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 group-hover:text-slate-800 flex items-center justify-center shrink-0 transition-colors">
              <VolumeX size={13} />
            </div>
            <div className="text-left pr-1 hidden sm:block">
              <div className="text-[11px] font-bold text-slate-800 leading-none">
                Meditative Calm
              </div>
              <span className="text-[9px] text-slate-500">Tap for peace</span>
            </div>
          </>
        )}
      </button>
    </div>
  );
}
