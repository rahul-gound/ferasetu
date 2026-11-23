---
trigger: always_on
description: "Mandatory FeraSetu visual design system, premium tactile button standards, interaction patterns, accessibility and anti-AI-slop design rules."
---

# FeraSetu Visual Design System & Tactile Button Standards

## 1. Mandatory Pre-Execution Rule
Every agent and developer working on FeraSetu frontend interfaces MUST read and obey `DESIGN.md` in the repository root before making or proposing UI changes.

## 2. Core Visual Invariants
- **Primary Brand Color:** Sovereign Blue `#0052FF`. Primary action color for links and primary buttons.
- **Accent Color:** Saffron Orange `#EA580C`. Reserved for prominent commerce callouts and warm trust accents.
- **Backgrounds:** Pure white `#FFFFFF` canvas with subtle neutral surface tints (`#F8FAFC`).
- **Typography:** High-contrast slate `#0F172A` and `#475569`. Tabular numerals (`tabular-nums`) for currency and metrics.
- **Zero AI Slop:** Never use generic purple/neon gradients, floating blurry blobs, 3D character mascots, or repetitive eyebrow kickers with pulsing dots.
- **Zero Sarvam Invariant:** Never display or reference "Powered by Sarvam" or Sarvam AI anywhere.

## 3. Premium Tactile Button Standard
**Core Invariant:** Every button must feel intentionally designed. I LOVE premium rounded-corner buttons with subtle shadows. When a user taps a button, it should physically feel like it presses inward.

### Implementation Checklist for Buttons:
1. **Rounded Corners:**
   - Standard buttons: 12–14px (`rounded-xl`).
   - Large hero/marketing CTA buttons: 14–16px (`rounded-2xl` or smooth rounded capsules).
   - Compact table buttons: 9–12px (`rounded-lg` / `rounded-xl`).
   - Never use sharp, 90-degree square corners.
2. **Layered Depth & Shadows:**
   - Use soft, layered ambient shadows rather than harsh dark drop shadows.
   - Example primary: `shadow-[0_2px_4px_rgba(0,82,255,0.16),0_1px_2px_rgba(0,0,0,0.06)]`.
   - Hover state: subtle lift (`hover:-translate-y-0.5`) with deepened shadow (`shadow-[0_6px_16px_rgba(0,82,255,0.24)]`).
3. **Physical Press Interaction (`:active`):**
   - Active state MUST physically press inward: `active:translate-y-0.5 active:scale-[0.985]`.
   - Outer shadow compresses; subtle inset shadow appears (`active:shadow-inner`).
   - Transition duration: 150–200ms ease-out.
4. **Touch Ergonomics:**
   - Touch targets must be at least 44–48px for mobile shopkeepers operating behind counters.

## 4. Accordion & Micro-Interactions
- Accordion expansion and disclosure transitions must be slow, smooth, and luxurious (`duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]`) to create a calm, dopamine-releasing fluidity instead of abrupt snapping.

## 5. Friendly Human Copy
- Maintain warm, empathetic, witty shopkeeper-first copy that values the customer, reassures data safety, and avoids dry corporate or synthetic AI jargon.
