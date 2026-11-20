---
name: FeraSetu Design System
description: Calm, high-trust, human-first commerce interface for global independent retail shopkeepers
colors:
  primary: "#ea580c"
  primary-hover: "#c2410c"
  primary-light: "#fff7ed"
  neutral-bg: "#ffffff"
  surface-muted: "#f8fafc"
  surface-card: "#ffffff"
  border-subtle: "#f1f5f9"
  border-default: "#e2e8f0"
  text-primary: "#0f172a"
  text-secondary: "#334155"
  text-muted: "#64748b"
  success: "#10b981"
  success-bg: "#ecfdf5"
  warning: "#f59e0b"
  warning-bg: "#fffbeb"
  danger: "#ef4444"
  danger-bg: "#fef2f2"
typography:
  display:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  caption:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.75rem"
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
FeraSetu's design language prioritizes **calm trust, generous breathing room, and zero technical jargon** for independent global shopkeepers. Retail shop environments are loud, harsh, and stressful; our interface must act as an oasis of quiet clarity, legibility, and effortless control.

## Colors
- **Brand Saffron/Orange (`#ea580c`):** Purposeful energy and commerce actions without being overwhelming.
- **Deep Slate Typography (`#0f172a` / `#334155`):** High contrast sunlight readability; never use faint gray text for critical numbers or transaction data.
- **Surface Foundations (`#ffffff` / `#f8fafc`):** Generous, clean backgrounds that create security and visual stability.
- **Status Tints:** Emerald (`#10b981`) for settlements and live connectivity; Amber (`#f59e0b`) for low-stock triage; Crimson (`#ef4444`) for urgent merchant actions.

## Typography
- Native system UI font stack (`system-ui, -apple-system, BlinkMacSystemFont, sans-serif`) ensures fast rendering, zero FOIT/FOUT, and platform familiar legibility.
- Tabular figures (`tabular-nums`) for all monetary amounts, inventory counts, and time stamps.
- High visual hierarchy: 1 distinct heading per viewport, no flat typographic soup.

## Layout
- **Generous Whitespace:** Minimum container padding `p-6` to `p-10`, grid gaps `gap-6` to `gap-8`.
- **Hick's Law:** Limit primary decisions to 1 or 2 per screen.
- **Fitts's Law:** Mobile touch targets must be at least 48x48px and anchored in the natural bottom thumb zone.
- **Anti-Nesting (Card-in-Card Prevention):** Never embed bordered cards inside bordered cards. Differentiate nested zones with soft surface tint shifts (`bg-slate-50`), whitespace, or subtle border dividers (`border-slate-100`).

## Elevation & Depth
- Flat, clean structural boundaries with soft, hardware-accelerated ambient drop shadows (`shadow-sm`, `shadow-md`).
- Never use harsh dark glows, artificial colored neo-brutalist borders, or generic purple-blue gradients.

## Shapes
- Modest, friendly radii: `rounded-lg` (10px) for cards, `rounded-md` (6px) for inputs and badges, `rounded-full` for status indicators and avatar rings.
- Symmetrical, balanced geometric layout rhythm.

## Components
- **shadcn/ui Primitives:** Base all buttons, dialogs, dropdowns, and tables on accessible Radix/shadcn primitives.
- **React Bits:** `SpotlightCard` for pointer illumination; `SplitText` for gentle typography entrances.
- **Lenis Smooth Scroll:** Butter-smooth inertial scrolling on marketing and dashboard routes.
- **GSAP:** Orchestrated timeline entrances without layout thrashing (`translate3d`, `opacity`).
- **Uniform Icons:** `lucide-react` with `size={18}` / `size={20}` and `strokeWidth={1.75}`.

## Do's and Don'ts
### Do:
- Provide instant visual feedback (<400ms Doherty threshold).
- Display currency symbols and decimal formats cleanly with tabular numerals.
- Ensure 48px touch targets for mobile shopkeepers operating behind counters.
- Provide instant undo toasts for critical operational actions.

### Don't:
- Don't nest bordered cards within bordered cards.
- Don't use generic purple/blue AI gradients or Inter-default cliches.
- Don't load Three.js, Canvas shaders, or heavy 3D scripts on transactional screens.
- Don't use synthetic AI hype words ("revolutionary", "empower your workflow", "cutting-edge").
- Don't ever show "Powered by Sarvam" or mention Sarvam AI.
