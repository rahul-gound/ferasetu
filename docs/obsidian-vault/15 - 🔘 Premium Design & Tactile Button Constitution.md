# 🔘 Premium Design & Tactile Button Constitution

> **Status:** 🟢 Active Invariant & Architectural Law  
> **Parent:** [[00 - 🗺️ System Architecture Overview]] | **Matrix:** [[01 - 📊 Progress & Completion Matrix]]  
> **Source of Truth:** `DESIGN.md`, `.agents/rules/ferasetu-design-system.md`  

---

## 1. Executive Directive
FeraSetu's interface must feel premium, tactile, thoughtful, trustworthy, and professionally art-directed.

> *"I LOVE premium rounded-corner buttons with subtle shadows. When a user taps a button, it should physically feel like it presses inward."*

Every future agent and engineer modifying frontend components must strictly obey this design constitution before authoring or editing UI code.

---

## 2. Core Color & Typography Foundations
- **Primary Sovereign Blue (`#0052FF`):** Institutional reliability, primary action color.
- **Saffron Orange (`#EA580C`):** Warm commerce accents, high-priority conversion anchors.
- **Pure White Canvas (`#FFFFFF`):** High-clarity ground providing expansive breathing room.
- **Deep Slate Text (`#0F172A` / `#475569`):** High-contrast legibility under outdoor sunlight and bright counter lamps.
- **System Typography:** Clean, instant native system UI font stack with tabular figures (`tabular-nums`) for currency and metrics.
- **Anti-Slop Invariant:** Zero purple/neon gradients, zero floating blurry blobs, zero 3D mascot illustrations, and zero kicker pills with pulsing dots.
- **Zero Sarvam Invariant:** Powered exclusively by Sovereign FeraSetu AI (`https://ai.fera-search.tech/v1`). Never display or mention Sarvam AI.

---

## 3. Tactile Button Engineering Specifications
- **Corner Radii:**
  - Primary & Standard Buttons: 12–14px (`rounded-xl`).
  - Large Hero & Marketing CTAs: 14–16px (`rounded-2xl` or smooth rounded capsules).
  - Compact Table / Row Actions: 9–12px (`rounded-lg` / `rounded-xl`).
  - Never use sharp, unrounded 90-degree corners.
- **Resting Depth:** Layered ambient shadows (e.g. `shadow-[0_2px_4px_rgba(0,82,255,0.16),0_1px_2px_rgba(0,0,0,0.06)]`).
- **Hover Motion:** Subtle upward lift (`hover:-translate-y-0.5`) with ambient shadow bloom.
- **Active Physical Press:**
  - Travels downward 1–2px (`active:translate-y-0.5`).
  - Micro-compression scale (`active:scale-[0.985]`).
  - Outer shadow compresses; subtle inset shadow activates (`active:shadow-inner`).
  - Timing: 150–200ms ease-out.
- **Touch Ergonomics:** Minimum 44–48px touch targets satisfying Fitts's Law.

---

## 4. Calm Motion & Interaction Invariants
- **FAQ & Accordion Motion:** Slow, luxurious ease (`duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]`) for a dopamine-releasing, calm fluid expansion instead of harsh snapping.
- **404 & Error States:** Witty, humorous, and values the customer. Reassures order and money safety without corporate jargon.
