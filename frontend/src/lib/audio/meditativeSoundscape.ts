/**
 * Meditative Ambient Soundscape for FeraSetu
 *
 * Synthesizes a calming, warm, harmonic 432 Hz healing drone and gentle ambient pads
 * using the Web Audio API. 
 *
 * Psychology:
 * - 432 Hz natural resonance induces relaxation and emotional calm.
 * - Slow 8-second breathing LFO mirrors calm, unhurried breathing.
 * - Gentle pentatonic harmonics (F# - C# - D# - B) evoke feelings of safety, ownership, and trust.
 * - Zero external network requests or audio file downloads.
 */

class MeditativeSoundscapeManager {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private masterGain: GainNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private intervals: number[] = [];
  private volume: number = 0.22;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public start() {
    if (this.isPlaying) return;
    this.initContext();
    if (!this.ctx) return;

    this.isPlaying = true;
    const now = this.ctx.currentTime;

    // Master volume with gentle fade-in
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0, now);
    this.masterGain.gain.linearRampToValueAtTime(this.volume, now + 2.5);
    this.masterGain.connect(this.ctx.destination);

    // Warm Low-Pass Filter to remove harshness
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(480, now);
    filter.Q.setValueAtTime(1.2, now);
    filter.connect(this.masterGain);

    // Filter LFO (gentle breathing resonance: 0.12 Hz = ~8 second breathing cycle)
    const filterLfo = this.ctx.createOscillator();
    const filterLfoGain = this.ctx.createGain();
    filterLfo.frequency.setValueAtTime(0.12, now);
    filterLfoGain.gain.setValueAtTime(160, now);
    filterLfo.connect(filterLfoGain);
    filterLfoGain.connect(filter.frequency);
    filterLfo.start(now);
    this.oscillators.push(filterLfo);

    // 432 Hz Meditative Harmonic Chords (Root 216Hz, 5th 324Hz, Octave 432Hz, 9th 486Hz)
    const baseFreqs = [216, 324, 432, 486];

    baseFreqs.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      // Subtle detune for lush analog chorus effect
      osc.detune.setValueAtTime((idx - 1.5) * 3.5, now);

      // Individual gain with gentle volume balance
      const voiceGain = 0.18 / (idx + 1);
      oscGain.gain.setValueAtTime(voiceGain, now);

      osc.connect(oscGain);
      oscGain.connect(filter);
      osc.start(now);
      this.oscillators.push(osc);
    });

    // Gentle singing bowl chime every 14 seconds
    const chimeTimer = window.setInterval(() => {
      if (!this.isPlaying || !this.ctx || !this.masterGain) return;
      this.triggerSoftChime();
    }, 14000);
    this.intervals.push(chimeTimer);
  }

  private triggerSoftChime() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const chime = this.ctx.createOscillator();
    const chimeGain = this.ctx.createGain();
    const chimeFilter = this.ctx.createBiquadFilter();

    chimeFilter.type = 'bandpass';
    chimeFilter.frequency.setValueAtTime(864, now);
    chimeFilter.Q.setValueAtTime(8.0, now);

    chime.type = 'sine';
    chime.frequency.setValueAtTime(864, now); // 432 * 2 = 864 Hz crystalline chime

    chimeGain.gain.setValueAtTime(0, now);
    chimeGain.gain.linearRampToValueAtTime(0.06, now + 0.15);
    chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 4.5);

    chime.connect(chimeFilter);
    chimeFilter.connect(chimeGain);
    chimeGain.connect(this.masterGain);

    chime.start(now);
    chime.stop(now + 4.6);
  }

  public stop() {
    if (!this.isPlaying || !this.ctx) return;

    if (this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 1.2);
    }

    setTimeout(() => {
      this.oscillators.forEach(osc => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          // ignore already stopped
        }
      });
      this.oscillators = [];
      this.intervals.forEach(t => clearInterval(t));
      this.intervals = [];
      this.isPlaying = false;
    }, 1250);
  }

  public toggle(): boolean {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const meditativeAudio = new MeditativeSoundscapeManager();
