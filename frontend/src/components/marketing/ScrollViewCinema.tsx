import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Sparkles, ShieldCheck, Smartphone, Landmark, Bot } from 'lucide-react';
import type { MarketCode } from '../../config/plans';

interface ScrollViewCinemaProps {
  market: MarketCode;
  onStart?: () => void;
}

const TOTAL_FRAMES = 180;

const CHAPTERS = [
  {
    id: 'launch',
    startFrame: 0,
    endFrame: 45,
    label: '01 · Storefront Live',
    title: 'Your shop opens online in minutes',
    desc: 'Physical counter inventory syncs into a fast, branded storefront on your own domain.',
    icon: Sparkles,
    accent: '#0052FF',
  },
  {
    id: 'order',
    startFrame: 45,
    endFrame: 90,
    label: '02 · Direct Orders',
    title: 'Customers order via Web & WhatsApp',
    desc: 'Zero middleman marketplaces. Buyers browse your catalog and send itemized orders straight to you.',
    icon: Smartphone,
    accent: '#EA580C',
  },
  {
    id: 'settle',
    startFrame: 90,
    endFrame: 135,
    label: '03 · 0% Commission Payout',
    title: 'Money settles straight to your bank',
    desc: 'Every rupee or dollar goes directly from your payment gateway to your bank account. 0% FeraSetu cut.',
    icon: Landmark,
    accent: '#10B981',
  },
  {
    id: 'fero',
    startFrame: 135,
    endFrame: 180,
    label: '04 · Fero 24/7 Guard',
    title: 'Autonomous stock & invoice monitor',
    desc: 'Fero audits payouts, flags low stock, and generates compliant GST invoices automatically.',
    icon: Bot,
    accent: '#6366F1',
  },
];

function clamp(v: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - clamp(t), 3);
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export default function ScrollViewCinema({ market }: ScrollViewCinemaProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(0);
  const targetProgressRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const [currentFrame, setCurrentFrame] = useState(1);
  const [activeChapterIdx, setActiveChapterIdx] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  const isIndia = market === 'IN';
  const currency = isIndia ? '₹1,450' : market === 'EU' ? '€38.00' : '$42.00';

  const drawFrame = useCallback(
    (progress: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) return;

      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Clear background with crisp light studio paper
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#F8FAFC');
      bgGrad.addColorStop(0.5, '#FFFFFF');
      bgGrad.addColorStop(1, '#F1F5F9');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle architectural dot grid
      ctx.fillStyle = 'rgba(15, 23, 42, 0.06)';
      const step = 28;
      for (let gx = step; gx < width; gx += step) {
        for (let gy = step; gy < height; gy += step) {
          ctx.beginPath();
          ctx.arc(gx, gy, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Compute normalized chapter sub-progresses
      const p1 = easeOutCubic(progress / 0.25); // 0 -> 0.25 (Storefront Launch)
      const p2 = easeOutCubic((progress - 0.25) / 0.25); // 0.25 -> 0.50 (Order Packet)
      const p3 = easeOutCubic((progress - 0.5) / 0.25); // 0.50 -> 0.75 (0% Settlement)
      const p4 = easeOutCubic((progress - 0.75) / 0.25); // 0.75 -> 1.0 (Fero Guard)

      const cx = width / 2;
      const cy = height / 2;
      const scale = Math.min(width / 920, height / 520);

      ctx.translate(cx, cy);
      ctx.scale(scale, scale);

      // ── STAGE 1: CENTRAL STOREFRONT CHASSIS (Morphs & elevates with p1) ──
      const cardW = lerp(340, 480, p1);
      const cardH = lerp(210, 300, p1);
      const cardX = -cardW / 2;
      const cardY = -cardH / 2 + lerp(28, 0, p1);

      // Ambient shadow under chassis
      ctx.save();
      ctx.shadowColor = 'rgba(15, 23, 42, 0.10)';
      ctx.shadowBlur = 34;
      ctx.shadowOffsetY = 16;
      ctx.fillStyle = '#FFFFFF';
      drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 18);
      ctx.fill();
      ctx.restore();

      // Hairline border
      ctx.strokeStyle = p4 > 0.2 ? 'rgba(99, 102, 241, 0.35)' : 'rgba(203, 213, 225, 0.9)';
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 18);
      ctx.stroke();

      // Browser top chrome bar
      ctx.fillStyle = '#F8FAFC';
      drawRoundedRect(ctx, cardX + 1, cardY + 1, cardW - 2, 36, 17);
      ctx.fill();
      ctx.fillStyle = '#CBD5E1';
      [0, 1, 2].forEach((dot) => {
        ctx.beginPath();
        ctx.arc(cardX + 20 + dot * 14, cardY + 19, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Domain pill in chrome bar
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, -105, cardY + 8, 210, 22, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0F172A';
      ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('https://sharma-store.com', 0, cardY + 23);

      // 3 Product Tiles inside storefront (staggered with p1)
      const tileW = (cardW - 64) / 3;
      const tileH = 112;
      const tileY = cardY + 58;
      const items = [
        { name: 'Organic Honey', price: isIndia ? '₹340' : '$12', color: '#FEF3C7', accent: '#D97706' },
        { name: 'Artisan Coffee', price: isIndia ? '₹490' : '$16', color: '#DBEAFE', accent: '#0052FF' },
        { name: 'Cold-Press Oil', price: isIndia ? '₹620' : '$14', color: '#D1FAE5', accent: '#059669' },
      ];
      items.forEach((item, idx) => {
        const localT = easeOutCubic((p1 - idx * 0.16) / 0.65);
        const tx = cardX + 20 + idx * (tileW + 12);
        const ty = tileY + (1 - localT) * 18;
        ctx.save();
        ctx.globalAlpha = clamp(localT, 0.15, 1);
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1;
        drawRoundedRect(ctx, tx, ty, tileW, tileH, 12);
        ctx.fill();
        ctx.stroke();

        // Product thumbnail swatch
        ctx.fillStyle = item.color;
        drawRoundedRect(ctx, tx + 8, ty + 8, tileW - 16, 52, 8);
        ctx.fill();

        // Product label & price
        ctx.fillStyle = '#0F172A';
        ctx.font = '700 11px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(item.name, tx + 8, ty + 78);

        ctx.fillStyle = item.accent;
        ctx.font = '700 12px ui-monospace, monospace';
        ctx.fillText(item.price, tx + 8, ty + 98);
        ctx.restore();
      });

      // Live Store Status Pill inside storefront footer
      ctx.fillStyle = '#ECFDF5';
      drawRoundedRect(ctx, cardX + 20, cardY + cardH - 52, cardW - 40, 34, 10);
      ctx.fill();
      ctx.fillStyle = '#065F46';
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('● Store Online · 0% Marketplace Commission', cardX + 34, cardY + cardH - 31);

      // ── STAGE 2: CUSTOMER ORDER PACKET TRAVELING FROM PHONE TO STOREFRONT (p2) ──
      if (p2 > 0.01) {
        const phoneX = -380;
        const phoneY = -40;

        // Customer Phone Node
        ctx.save();
        ctx.globalAlpha = clamp(p2 * 2, 0, 1);
        ctx.fillStyle = '#0F172A';
        drawRoundedRect(ctx, phoneX, phoneY, 106, 178, 18);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        drawRoundedRect(ctx, phoneX + 5, phoneY + 5, 96, 168, 14);
        ctx.fill();
        ctx.fillStyle = '#EA580C';
        drawRoundedRect(ctx, phoneX + 14, phoneY + 24, 78, 28, 8);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '700 10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Order Sent', phoneX + 53, phoneY + 42);
        ctx.fillStyle = '#334155';
        ctx.font = '600 10px ui-monospace, monospace';
        ctx.fillText('3 items', phoneX + 53, phoneY + 78);
        ctx.fillStyle = '#0F172A';
        ctx.font = '800 13px ui-monospace, monospace';
        ctx.fillText(currency, phoneX + 53, phoneY + 98);
        ctx.restore();

        // Glowing bezier order line
        const startX = phoneX + 108;
        const startY = phoneY + 88;
        const endX = cardX - 8;
        const endY = 0;

        ctx.save();
        ctx.strokeStyle = 'rgba(234, 88, 12, 0.35)';
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.bezierCurveTo(startX + 45, startY - 60, endX - 45, endY - 30, endX, endY);
        ctx.stroke();
        ctx.restore();

        // Moving order pulse dot along curve
        const t = clamp(p2);
        const u = 1 - t;
        const px =
          u * u * u * startX +
          3 * u * u * t * (startX + 45) +
          3 * u * t * t * (endX - 45) +
          t * t * t * endX;
        const py =
          u * u * u * startY +
          3 * u * u * t * (startY - 60) +
          3 * u * t * t * (endY - 30) +
          t * t * t * endY;

        ctx.save();
        ctx.fillStyle = '#EA580C';
        ctx.shadowColor = '#EA580C';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(px, py, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // ── STAGE 3: DIRECT 0% COMMISSION BANK SETTLEMENT (p3) ──
      if (p3 > 0.01) {
        const bankX = 278;
        const bankY = -75;

        // Settlement beam
        const startX = cardX + cardW + 8;
        const startY = 0;
        const endX = bankX - 8;
        const endY = bankY + 75;

        ctx.save();
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(lerp(startX, endX, p3), lerp(startY, endY, p3));
        ctx.stroke();
        ctx.restore();

        // Bank Vault Card
        ctx.save();
        ctx.globalAlpha = clamp(p3 * 1.5, 0, 1);
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = 'rgba(16, 185, 129, 0.14)';
        ctx.shadowBlur = 22;
        drawRoundedRect(ctx, bankX, bankY, 136, 150, 16);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ECFDF5';
        drawRoundedRect(ctx, bankX + 14, bankY + 14, 108, 26, 8);
        ctx.fill();
        ctx.fillStyle = '#047857';
        ctx.font = '800 10px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('0% FEE RETAINED', bankX + 68, bankY + 31);

        ctx.fillStyle = '#0F172A';
        ctx.font = '800 22px ui-monospace, monospace';
        ctx.fillText(currency, bankX + 68, bankY + 78);

        ctx.fillStyle = '#475569';
        ctx.font = '600 11px system-ui, sans-serif';
        ctx.fillText('Direct to Bank', bankX + 68, bankY + 102);

        ctx.fillStyle = '#10B981';
        ctx.font = '700 11px system-ui, sans-serif';
        ctx.fillText('✓ Settled T+1', bankX + 68, bankY + 128);
        ctx.restore();
      }

      // ── STAGE 4: FERO 24/7 AUTONOMOUS RADAR & SHIELD (p4) ──
      if (p4 > 0.01) {
        ctx.save();
        ctx.globalAlpha = clamp(p4, 0, 1);
        const badgeW = 280;
        const badgeH = 44;
        const bx = -badgeW / 2;
        const by = cardY + cardH + 22 - (1 - p4) * 14;

        ctx.fillStyle = '#0F172A';
        ctx.shadowColor = 'rgba(15, 23, 42, 0.2)';
        ctx.shadowBlur = 18;
        drawRoundedRect(ctx, bx, by, badgeW, badgeH, 999);
        ctx.fill();

        // Pulsing status dot
        ctx.fillStyle = '#10B981';
        ctx.beginPath();
        ctx.arc(bx + 24, by + 22, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '700 12px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Fero AI Verified · GST & Stock Synced', bx + 40, by + 26);
        ctx.restore();
      }

      ctx.restore();
    },
    [currency, isIndia]
  );

  // Scroll listener to compute progress cleanly
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      targetProgressRef.current = 0.65;
      progressRef.current = 0.65;
      drawFrame(0.65);
      return;
    }

    const updateTargetFromScroll = () => {
      if (isAutoPlaying) return;
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      if (scrollable <= 0) return;
      const raw = -rect.top / scrollable;
      targetProgressRef.current = clamp(raw, 0, 1);
    };

    window.addEventListener('scroll', updateTargetFromScroll, { passive: true });
    window.addEventListener('resize', updateTargetFromScroll, { passive: true });
    updateTargetFromScroll();

    let lastTime = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      if (isAutoPlaying) {
        targetProgressRef.current += dt * 0.14;
        if (targetProgressRef.current >= 1) {
          targetProgressRef.current = 0;
        }
      }

      const diff = targetProgressRef.current - progressRef.current;
      if (Math.abs(diff) > 0.0005 || isAutoPlaying) {
        progressRef.current += diff * 0.18;
        drawFrame(progressRef.current);

        const frameNum = Math.max(1, Math.min(TOTAL_FRAMES, Math.round(progressRef.current * (TOTAL_FRAMES - 1)) + 1));
        setCurrentFrame(frameNum);
        const chapIdx = Math.min(CHAPTERS.length - 1, Math.floor(progressRef.current * CHAPTERS.length));
        setActiveChapterIdx(chapIdx);
      } else {
        drawFrame(progressRef.current);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    drawFrame(progressRef.current);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('scroll', updateTargetFromScroll);
      window.removeEventListener('resize', updateTargetFromScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [drawFrame, isAutoPlaying]);

  const jumpToChapter = (idx: number) => {
    setIsAutoPlaying(false);
    const targetP = (idx + 0.35) / CHAPTERS.length;
    const track = trackRef.current;
    if (track && window.innerWidth >= 1024) {
      const rect = track.getBoundingClientRect();
      const trackTop = window.scrollY + rect.top;
      const scrollable = rect.height - window.innerHeight;
      window.scrollTo({
        top: trackTop + scrollable * targetP,
        behavior: 'smooth',
      });
    } else {
      targetProgressRef.current = targetP;
    }
  };

  const activeChapter = CHAPTERS[activeChapterIdx] || CHAPTERS[0];

  return (
    <section
      id="scroll-view"
      ref={trackRef}
      className="relative bg-white border-b border-slate-200/80 lg:h-[230vh]"
    >
      <div className="lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] flex items-center py-12 lg:py-8 overflow-hidden">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 w-full">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-[11px] font-mono uppercase tracking-wider text-[#0052FF] font-bold mb-3">
                <ShieldCheck size={13} />
                <span>Scroll-View Commerce Walkthrough</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-950 tracking-tight">
                Watch every frame of a sovereign sale.
              </h2>
            </div>

            {/* Frame Counter & Auto-Play Toggle */}
            <div className="flex items-center gap-3">
              <div className="px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 font-mono text-xs font-bold text-slate-700 tabular-nums">
                FRAME {String(currentFrame).padStart(3, '0')} / {TOTAL_FRAMES}
              </div>
              <button
                type="button"
                onClick={() => setIsAutoPlaying((prev) => !prev)}
                className="btn-tactile-ghost inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 cursor-pointer"
                aria-label={isAutoPlaying ? 'Pause walkthrough' : 'Play walkthrough'}
              >
                {isAutoPlaying ? <Pause size={14} className="text-orange-600" /> : <Play size={14} className="text-[#0052FF]" />}
                <span>{isAutoPlaying ? 'Pause' : 'Auto-play'}</span>
              </button>
            </div>
          </div>

          {/* Main 12-Col Layout: Left Chapter Rail + Right Frame-by-Frame Canvas */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left Rail: 4 Interactive Chapters */}
            <div className="lg:col-span-4 space-y-2.5">
              {CHAPTERS.map((chap, idx) => {
                const Icon = chap.icon;
                const isActive = idx === activeChapterIdx;
                return (
                  <button
                    key={chap.id}
                    type="button"
                    onClick={() => jumpToChapter(idx)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-slate-50 border-slate-300 shadow-sm'
                        : 'bg-white border-slate-200/70 hover:border-slate-300 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 mb-1">
                      <span
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: isActive ? chap.accent : '#94A3B8' }}
                      >
                        <Icon size={13} />
                      </span>
                      <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        {chap.label}
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                      {chap.title}
                    </h3>
                    {isActive && (
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                        {chap.desc}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right Stage: 60fps Frame-by-Frame Canvas */}
            <div className="lg:col-span-8">
              <div className="relative rounded-2xl border border-slate-200/90 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)] overflow-hidden">
                <div className="aspect-[16/9] w-full relative">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full block"
                    aria-label={`Interactive scroll-view animation frame ${currentFrame} of ${TOTAL_FRAMES}: ${activeChapter.title}`}
                  />
                </div>
                {/* Scrub Progress Bar Footer */}
                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-4">
                  <span className="text-[11px] font-semibold text-slate-600 truncate">
                    {activeChapter.label} — {activeChapter.title}
                  </span>
                  <div className="w-32 sm:w-48 h-1.5 rounded-full bg-slate-200 overflow-hidden shrink-0">
                    <div
                      className="h-full rounded-full transition-all duration-75"
                      style={{
                        width: `${Math.round((currentFrame / TOTAL_FRAMES) * 100)}%`,
                        backgroundColor: activeChapter.accent,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
