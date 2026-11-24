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
- **Resting Depth:** Rich multi-layered shadows combining 3D extruded shelf, grounded contact shadow, and ambient warm glow:
  - **Saffron Orange (`#EA580C`):** `box-shadow: 0 4px 0 0 #8c2505, 0 8px 18px -2px rgba(140, 37, 5, 0.35), 0 14px 28px -4px rgba(234, 88, 12, 0.42), 0 4px 8px -1px rgba(0, 0, 0, 0.12) !important;`
  - **Sovereign Blue (`#0052FF`):** `box-shadow: 0 4px 0 0 #0036A3, 0 8px 18px -2px rgba(0, 54, 163, 0.35), 0 14px 28px -4px rgba(0, 82, 255, 0.42), 0 4px 8px -1px rgba(0, 0, 0, 0.12) !important;`
  - **White / Secondary:** `box-shadow: 0 3px 0 0 #E2E8F0, 0 6px 16px -2px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04) !important;`
- **Hover Motion:** Subtle upward lift (`hover:-translate-y-0.5` or `translateY(-2px)`) with expanded 6px shelf depth and ambient shadow bloom.
- **Active Physical Press ("Go Inside & Shadow Work"):**
  - Travels downward 2–3px (`active:translate-y-1` or `translateY(3px) scale(0.985)`).
  - Micro-compression scale (`scale(0.985)`).
  - 3D bottom shelf collapses down to 1px / 0.5px.
  - Distinct inner inset shadow activates (`inset 0 3px 6px rgba(0, 0, 0, 0.36)`), physically depressing the button into the canvas.
  - Timing: 150ms ease-out.
- **Touch Ergonomics:** Minimum 44–48px touch targets satisfying Fitts's Law.

---

## 4. Calm Motion & Interaction Invariants
- **FAQ & Accordion Motion:** Slow, luxurious ease (`duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]`) for a dopamine-releasing, calm fluid expansion instead of harsh snapping.
- **404 & Error States:** Witty, humorous, and values the customer. Reassures order and money safety without corporate jargon.

---

## 5. Stitch Retail Design System & UI Specifications
Integrated from Stitch Project `6894408154411177085`:
- **[[ui-1-test.md]]:** Screen 1 (Local Storefront Home) & Screen 2 (Product Catalog & Filters).
- **[[ui-2-test.md]]:** Screen 3 (Product Detail PDP) & Screen 4 (Cart & Checkout).
- **[[ui-3-test.md]]:** Screen 5 (Select Payment Mode) & Website Builder Template Integration Architecture.
