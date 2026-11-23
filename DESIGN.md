---
name: FeraSetu Design System
description: Calm, high-trust, human-first commerce interface for global independent retail shopkeepers
colors:
  primary: "#0052FF"
  primary-hover: "#0047E0"
  primary-light: "#EFF6FF"
  accent: "#EA580C"
  accent-hover: "#C2410C"
  accent-light: "#FFF7ED"
  neutral-bg: "#FFFFFF"
  surface-muted: "#F8FAFC"
  surface-card: "#FFFFFF"
  border-subtle: "#F1F5F9"
  border-default: "#E2E8F0"
  text-primary: "#0F172A"
  text-secondary: "#334155"
  text-muted: "#64748B"
  success: "#10B981"
  success-bg: "#ECFDF5"
  warning: "#F59E0B"
  warning-bg: "#FFFBEB"
  danger: "#EF4444"
  danger-bg: "#FEF2F2"
typography:
  display:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 800
    lineHeight: 1.12
    letterSpacing: "-0.03em"
  title:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  body:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0em"
  caption:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.01em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
---

# Design System

<!-- impeccable:design-schema 1 -->

## Overview
FeraSetu's design language prioritizes **calm trust, generous breathing room, authoritative typography, and zero technical jargon** for independent global shopkeepers. Retail shop environments are busy, harsh, and stressful; our interface must act as an oasis of quiet clarity, legibility, and effortless control.

## Colors & Art Direction
- **Primary Sovereign Blue (`#0052FF`):** Confident, institutional reliability and principal brand color.
- **Pure White Background (`#FFFFFF`):** High-clarity canvas providing expansive breathing room.
- **Restrained Saffron/Orange Accent (`#EA580C` / `#E8590C`):** Warmth, energy, and commerce callouts without visual noise.
- **Deep Slate Typography (`#0F172A` / `#334155`):** High-contrast sunlight readability; never use faint gray text for critical numbers or transaction data.
- **Surface Foundations (`#FFFFFF` / `#F8FAFC`):** Generous, clean backgrounds that create security and visual stability.
- **Status Tints:** Emerald (`#10B981`) for settlements and live connectivity; Amber (`#F59E0B`) for low-stock triage; Crimson (`#EF4444`) for urgent merchant actions.

## Typography
- Native system UI font stack (`system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`) ensures instant rendering and platform-familiar legibility.
- Headings speak for themselves: **strictly no repetitive eyebrow pills or kickers** with pulsing dots above headings.
- Tabular figures (`tabular-nums`) for all monetary amounts, inventory counts, and timestamps. Avoid stylized blocky monospace masquerading as "technical" data.
- High visual hierarchy: 1 distinct heading per viewport with intentional line height and tracking.

## Layout & Space Rhythm
- **Generous Whitespace:** Minimum container padding `p-6` to `p-10`, grid gaps `gap-6` to `gap-8`, section spacing `py-20 md:py-28`.
- **Hick's Law:** Limit primary decisions to 1 or 2 per screen.
- **Fitts's Law:** Mobile touch targets must be at least 48x48px and anchored in the natural bottom thumb zone.
- **Anti-Nesting (Card-in-Card Prevention):** Never embed bordered cards inside bordered cards. Differentiate nested zones with soft surface tint shifts (`bg-slate-50`), whitespace, or subtle border dividers (`border-slate-100`).
- **Anchor Offset Invariant:** All anchored sections must include `scroll-mt-24` to prevent fixed navbar occlusion.

## Elevation & Depth
- Flat, clean structural boundaries with soft, hardware-accelerated ambient drop shadows (`shadow-sm`, `shadow-md`).
- Never use harsh dark glows, artificial colored neo-brutalist borders, or generic purple-blue gradients.

## Shapes
- Modest, friendly radii: `rounded-xl` (12px) for cards, `rounded-lg` (8px) for buttons/inputs, `rounded-full` for status indicators and avatar rings.
- Symmetrical, balanced geometric layout rhythm.

## Components
- **shadcn/ui Primitives:** Base all buttons, dialogs, dropdowns, and tables on accessible Radix/shadcn primitives.
- **Lenis Smooth Scroll:** Butter-smooth inertial scrolling on marketing and dashboard routes.
- **GSAP:** Orchestrated timeline entrances without layout thrashing (`translate3d`, `opacity`).
- **Uniform Icons:** `lucide-react` with consistent stroke weight (`strokeWidth={1.75}`) and sizing.
- **No Mascots or AI Slop:** Store intelligence (Fero) is represented exclusively as an authoritative, elegant architectural emblem/badge—never as a 3D-rendered mascot or cartoon animal.

## Do's and Don'ts
### Do:
- Provide instant visual feedback (<400ms Doherty threshold).
- Display currency symbols and decimal formats cleanly with tabular numerals.
- Ensure 48px touch targets for mobile shopkeepers operating behind counters.
- Provide instant undo toasts for critical operational actions.
- Let headings speak for themselves with confident typography.

### Don't:
- Don't use AI-generated mascots, cartoon characters, or 3D character illustrations.
- Don't place kicker or eyebrow pills with pulsing dots above section headings.
- Don't nest bordered cards within bordered cards.
- Don't use generic purple/blue AI gradients or Inter-default cliches.
- Don't load Three.js, Canvas shaders, or heavy 3D scripts on transactional screens.
- Don't use synthetic AI hype words ("revolutionary", "empower your workflow", "cutting-edge").
- Don't ever show "Powered by Sarvam" or mention Sarvam AI.
