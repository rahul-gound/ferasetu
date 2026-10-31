---
name: human-ui-craft
description: >-
  Audits, refines, and generates high-craft, lightweight user interfaces for FeraSetu.
  Use when reviewing UI screenshots, fixing layout issues, eliminating AI design cliches,
  linting copy with SlopMonster, or building responsive components for global shopkeepers.
---

# Human UI Craft Runbook

This skill provides step-by-step procedures for reviewing and crafting interfaces that prioritize human cognition, mobile performance, and genuine human copywriting.

## Step 1: SlopMonster Copy Linting

Before finalizing copy on any landing page, button label, modal, or notification:
```bash
python tools/slopmonster/tools/deslop.py --text "your draft copy here"
```
Or check a file:
```bash
python tools/slopmonster/tools/deslop.py path/to/file.md
```
- **Goal:** Score 5/5 CLEAN.
- **Rule:** Never use buzzwords like `empower`, `unlock`, `seamless`, `game-changing`, `robust`, or empty contrasts like `not just X, but Y`.

---

## Step 2: Screenshot Review & Critique Workflow

When the user uploads a UI screenshot:
1. **Analyze Visual Hierarchy:**
   - Identify the single most important action on the screen.
   - Flag any competing primary buttons or high-saturation distractions.
2. **Audit Structural Clutter:**
   - Detect and remove nested bordered containers ("cards inside cards").
   - Replace unnecessary borders with background contrast or clean spacing.
3. **Inspect Optical Alignment:**
   - Check icon-to-label alignment, pill padding, and badge margins.
   - Adjust for optical mass (e.g., nudging asymmetrical icons like play arrows).
4. **Evaluate Performance & Weight:**
   - Verify that all icons belong to the `lucide-react` family.
   - Ensure transitions use CSS hardware-accelerated transforms (`translate3d`, `opacity`).
5. **Validate Usability Under Shopkeeper Conditions:**
   - Confirm touch targets meet the 48x48px requirement in the bottom thumb zone.
   - Check text contrast against sunlight washout (`text-slate-900` / `text-slate-700`).

---

## Step 3: Premium UI Stack & Calm Whitespace Invariant

Always follow the `shadcn-human-ui` standard:
1. **shadcn/ui Primitives:** Import and customize from `@/components/ui/` (`button.tsx`, `card.tsx`, `badge.tsx`, `input.tsx`, `BentoGrid.tsx`, `SpotlightCard.tsx`).
2. **Fluid Scrolling & Motion:** Utilize **Lenis** for smooth inertia scrolling and **GSAP** for choreographed entrances and ScrollTrigger effects.
3. **React Bits & OpenDesign Patterns:** Infuse subtle pointer spotlights (`SpotlightCard`) and split-text typography without adding bloated 3D canvases.
4. **Spacious Calm Trust:** Ensure generous padding (`p-6` to `p-10`) and large gaps (`gap-6` to `gap-8`). Space builds trust and signals that FeraSetu is a premium, dependable platform.

