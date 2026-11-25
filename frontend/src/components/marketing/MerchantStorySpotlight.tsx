import { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Building2,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Lock,
  Store,
  QrCode,
  Users,
  Play,
  VolumeX,
} from 'lucide-react';

export default function MerchantStorySpotlight() {
  const [activeTab, setActiveTab] = useState<'sharma' | 'tech' | 'growth'>('sharma');
  const [pulseIndex, setPulseIndex] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Soundless ambient pulse simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setPulseIndex((prev) => (prev + 1) % 3);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  // Ambient soundless canvas animation (visual particle connection representing direct customer-to-merchant orders)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles: Array<{
      x: number;
      y: number;
      radius: number;
      vx: number;
      vy: number;
      alpha: number;
    }> = Array.from({ length: 24 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2 + 1,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.4 + 0.2,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw subtle ambient particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(234, 88, 12, ${p.alpha})`;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <section
      id="merchant-story"
      className="relative py-20 md:py-28 bg-gradient-to-b from-white via-slate-50/70 to-white border-b border-slate-200/80 overflow-hidden overflow-x-clip scroll-mt-24 w-full max-w-full"
    >
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden max-w-full">
        <canvas ref={canvasRef} className="w-full h-full opacity-60 pointer-events-none" />
      </div>

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Eyebrow */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200/80 text-orange-950 text-xs font-bold uppercase tracking-wider mb-4 shadow-2xs">
            <Store size={14} className="text-orange-600" />
            <span>Sovereign Merchant Stories • Chembur, Mumbai</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-950 tracking-[-0.03em] leading-[1.1] mb-4">
            Built for the person who opens the shutter at 6 AM.
          </h2>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
            For eighteen years, Ramesh Sharma built neighborhood customer trust one conversation at a time. Delivery aggregators demanded 22% of every bill and hid his customer contacts. With FeraSetu, his store is online, orders go straight to his counter, and 100% of the money stays in his till.
          </p>
        </div>

        {/* Apple & Shopify-Style Split Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* ========================================================== */}
          {/* LEFT: Authentic Photography with Ambient Motion Card (7 cols) */}
          {/* ========================================================== */}
          <div className="lg:col-span-7">
            <div className="relative rounded-3xl overflow-hidden border border-slate-200 bg-slate-900 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.18)] group">
              {/* Authentic Real Merchant Photo with Responsive Headroom */}
              <div className="relative aspect-[4/3] sm:aspect-[16/10] w-full overflow-hidden bg-slate-900">
                <img
                  src="/pictures/shop-owner-grocery.jpg"
                  alt="Ramesh Sharma behind his physical counter at Sharma Kirana Store in Mumbai"
                  className="w-full h-full object-cover object-top sm:object-center transform group-hover:scale-102 transition-transform duration-700 ease-out brightness-[0.92] contrast-[1.04]"
                  loading="lazy"
                />

                {/* Filmic Lighting Scrim & Ambient Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent pointer-events-none" />

                {/* Soundless Ambient Indicator Badge */}
                <div className="absolute top-3 sm:top-4 right-3 sm:right-4 inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 text-white text-[10px] sm:text-[11px] font-mono font-medium shadow-md">
                  <VolumeX size={12} className="text-orange-400" />
                  <span>Silent Ambient Feed</span>
                </div>

                {/* Live Order Pulse Floating Card */}
                <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-auto sm:max-w-md p-3 sm:p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-white/60 shadow-xl text-slate-900 transition-all duration-300">
                  <div className="flex items-center justify-between gap-2 sm:gap-3 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-emerald-500"></span>
                      </span>
                      <span className="text-[11px] sm:text-xs font-bold text-slate-900">Live Customer Order Reconciled</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                      ₹0 Commission
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    {pulseIndex === 0 && 'Ananya S. ordered 2× Lakadong Turmeric (500g) · ₹1,450 settled directly to HDFC Bank.'}
                    {pulseIndex === 1 && 'Karan M. ordered 5kg Sharbati Atta & Desi Ghee · ₹1,820 paid via instant counter QR.'}
                    {pulseIndex === 2 && 'Pooja V. reordered monthly staples · ₹3,240 gross deposited with zero middleman hold.'}
                  </p>

                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Direct Store: sharma.ferasetu.com</span>
                    <span className="text-emerald-700 font-bold">100% Payout Kept</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* RIGHT: Emotional Connection & Sovereign Pillars (5 cols)   */}
          {/* ========================================================== */}
          <div className="lg:col-span-5 flex flex-col justify-center space-y-6">
            <div>
              <span className="text-xs font-mono font-bold text-orange-600 uppercase tracking-widest block mb-2">
                Dignity & Sovereignty
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight leading-tight">
                No middleman between your counter and your customers.
              </h3>
            </div>

            {/* 3 Emotional Pillars */}
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 shrink-0 mt-0.5">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">0% Commission, Direct Bank Payouts</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Delivery aggregators keep up to 28% of your gross bill. FeraSetu charges 0% platform commission — funds settle directly to your UPI ID or bank account.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                    <Users size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Own Your Customer Relationships</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Your patrons order directly through your personalized web link or WhatsApp. You keep their phone numbers and repeat order loyalty — not an algorithm.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Fero AI: Your 24/7 Silent Co-Pilot</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Built right into your register. Fero audits your ledger, forecasts fast-moving pantry stock, and writes product descriptions from a single phone photo.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sovereign Quote Callout */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-sm">
              <p className="text-xs text-slate-300 italic leading-relaxed">
                "Before FeraSetu, I felt trapped paying aggregators just to keep my neighborhood regulars. Now, my customers order on my direct link, payment hits my bank immediately, and my margin is completely protected."
              </p>
              <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-semibold text-slate-200">— Ramesh Sharma, Sharma Heritage Kirana</span>
                <span className="text-orange-400 font-bold">Mumbai, Maharashtra</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
