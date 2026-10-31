---
name: shadcn-human-ui
description: >-
  Builds, audits, and styles calm, trustworthy, premium UI using shadcn/ui, Lenis, GSAP, React Bits, Superdesign, and OpenDesign. Enforces generous whitespace, Hick's Law, 48px touch ergonomics, and FeraSetu human design invariants.
---

# 🎨 Shadcn & Calm Human UI Skill Runbook

This skill directs how to construct, audit, and enhance every user interface across FeraSetu to look and feel premium, rock-solid, and trustworthy for the global shopkeeper.

---

## 1. The Core UI Stack & Ecosystem

Whenever creating, refactoring, or polishing user interfaces:
1. **shadcn/ui Primitives:**
   - Source components from `@/components/ui/` (`Button`, `Card`, `Badge`, `Input`, `BentoGrid`, `SpotlightCard`, etc.).
   - Compose styles with `cn(...)` (`clsx` + `tailwind-merge`) and `class-variance-authority` (cva).
2. **Lenis (Buttery Smooth Scrolling):**
   - Use Lenis for inertial, fluid scrolling on marketing and dashboard routes.
   - Guard against wheel/touch hijacking on mobile and Windows precision touchpads.
3. **GSAP (Motion & Choreography):**
   - Use GSAP ScrollTrigger and timeline animations for subtle, cinematic entrances.
   - Sync GSAP ticker with smooth scroll handlers (`gsap.ticker.lagSmoothing(500, 33)`).
4. **React Bits:**
   - Use micro-interaction patterns such as `SpotlightCard` (subtle pointer-following glow), `SplitText` (optical typography entrance), and magnetic buttons.
   - Keep interactions hardware-accelerated (`transform: translate3d`, `opacity`).
5. **Superdesign & OpenDesign:**
   - Clean, uncluttered layouts, modern typography scales, high legibility, and high-trust status indicators.

---

## 2. Calm Trust & Whitespace Architecture

Shopkeepers operate in busy, noisy environments. A cramped, cluttered screen creates anxiety. Expansive, thoughtful whitespace creates calm and signals reliability:

1. **Generous Breathing Room:**
   - Cards and containers should use generous padding (`p-6` to `p-10`).
   - Use wide grid and flex gaps (`gap-6` to `gap-8`) instead of cramming elements together.
   - Ample section margins (`my-12` to `my-24`) allow the eye to rest and absorb information unhurriedly.
2. **Anti-Clutter (Zero Card-in-Card Nesting):**
   - Never place bordered cards inside bordered cards.
   - Separate nested sections with soft surface tint shifts (`bg-slate-50` vs `bg-white`), subtle dividers (`border-slate-100`), or whitespace.
3. **High Contrast Sunlight Legibility:**
   - Use deep, crisp text (`text-slate-900` for titles, `text-slate-700` for body).
   - Avoid faint gray text (`text-slate-400` on white) for essential transaction data.
4. **Hick's Law & Focus:**
   - Every screen has 1 primary call-to-action (CTA) and at most 1 secondary action.
   - Highlight the single next step clearly.

---

## 3. Touch Ergonomics & The Doherty Threshold

1. **48x48px Minimum Touch Target:**
   - Ensure all buttons, inputs, pills, and toggles have a minimum height/width of 48px on mobile (`min-h-[48px]`).
   - Keep primary actions within the natural bottom thumb zone on mobile screens.
2. **Tactile Feedback (<400ms):**
   - Interactive elements must respond immediately on press (`active:scale-[0.98] transition-all duration-150`).
   - Buttons show immediate loading states or subtle micro-spinners when triggered.

---

## 4. Component Development Checklist

When building any new component or screen:
- [ ] Uses shadcn primitive imports (`@/components/ui/*`)
- [ ] Classes merged with `cn(...)`
- [ ] Generous padding (`p-6+`) and calm whitespace applied
- [ ] No nested card-in-card borders
- [ ] Primary button is 48px touch target with active tactile feedback
- [ ] Text passes sunlight squint test (`text-slate-900`/`text-slate-700`)
- [ ] Marketing/UI copy is checked with SlopMonster (`tools/slopmonster/tools/deslop.py`) to guarantee 5/5 CLEAN score
- [ ] Obsidian documentation synced in `docs/obsidian-vault/04 - 🎨 Frontend & Design System (React 19 & Tailwind).md`
