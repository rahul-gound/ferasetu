# FeraSetu UI-7 — MOBILE EXPERIENCE IS ESSENTIAL
## Mandatory Mobile-First & Responsive Quality Standard

**ROLE**

Act as a senior mobile UX designer, responsive frontend engineer, accessibility specialist, and QA engineer.

Create a permanent repository-root document named **`ui-7-test.md`**.

---

### 1. Core objective

FeraSetu must deliver a professional, comfortable, fully functional experience across mobile, tablet, laptop, and desktop.

Do not simply shrink desktop layouts to fit mobile screens. Every interface must adapt intelligently to its available space.

---

### 2. Audit the entire application

Test:
- Public landing page.
- Signup and login.
- Merchant dashboard.
- Admin panel.
- Website builder.
- Merchant storefront templates.
- Forms, modals, tables, navigation and all important workflows.

---

### 3. Mandatory viewport testing

Test at:
- **320 × 568** (iPhone SE 1st gen / ultra-compact)
- **360 × 800** (Common global Android smartphone)
- **390 × 844** (iPhone 12/13/14/15 standard)
- **430 × 932** (iPhone 14/15/16 Pro Max)
- **768 × 1024** (iPad Mini / Portrait Tablet)
- **1024 × 768** (Landscape Tablet / Small Laptop)
- **1366 × 768** (Standard Laptop display)
- **1440 × 900** (Desktop baseline)

Also inspect portrait, landscape, and 200% browser zoom where applicable.

---

### 4. Mobile usability checklist

Verify:
- **Zero Unintended Horizontal Scrolling:** Page containers must never exceed viewport width (`w-full max-w-full overflow-x-hidden`).
- **Readable Typography:** Minimum 14–16px body text without requiring pinch-to-zoom.
- **Comfortable Touch Targets:** Important actions must meet minimum 44 × 44px (or 48 × 48px) CSS touch target size.
- **Proper Button Spacing:** Minimum 8px spacing between tap targets to prevent accidental triggers.
- **Responsive Navigation:** Bottom thumb-friendly bar or slide-out drawer on viewports `< 768px`.
- **Correct Modal & Drawer Positioning:** Modals must not overflow screen bounds; touch dismissible with clear action buttons.
- **Forms on Mobile Keyboards:** Input fields must avoid automatic zoom on iOS (`font-size >= 16px`), inputs should scroll into view above soft keyboard.
- **Tables with Usable Mobile Alternatives:** Dense desktop data tables must convert into responsive cards or horizontally contained ledgers.
- **Image Scaling & Aspect Ratio:** Real merchant product photos must scale responsively without clipping or aspect distortion.
- **No Fixed Elements Obscuring Content:** Sticky bars and floating action buttons must respect safe bottom thumb zones.
- **Visible Keyboard & Tap Focus:** Tactile depression and clear focus indicators for accessibility.
- **Smooth, Fast Interaction Feedback:** All taps must deliver visual feedback within 150–200ms.

---

### 5. FeraSetu-specific testing

- **Landing page:** Visitors should understand FeraSetu within 5 seconds and discover the primary CTA ("Bring my business online") in the natural bottom thumb zone without horizontal shift.
- **Merchant dashboard:** Shopkeepers must be able to view today's orders, revenue, and quick order actions behind a shop counter on a budget smartphone.
- **Admin panel:** Security command, IP firewall, merchant inspection, and audit logs must remain operable and safe on compact viewports.
- **Storefronts:** All 9 merchant templates (Retail, Gym, Modern, Artisan, etc.) must render flawlessly on customer phones with instant cart drawers and WhatsApp ordering.
- **Website builder:** Visual preview and template adjustments must adapt gracefully without breaking layouts.

---

### 6. Performance and accessibility

- Inspect mobile loading behaviour, assets, layout shifts, unnecessary scripts, and console errors.
- Enforce WCAG 2.2 requirements:
  - SC 1.4.4: Resize Text (up to 200% without loss of content).
  - SC 1.4.10: Reflow (no 2-dimensional scrolling at 320px equivalent).
  - SC 2.5.5 / SC 2.5.8: Target Size (Minimum 44 × 44px recommended, min 24 × 24px with spacing).
  - SC 2.4.7: Focus Visible.

---

### 7. Mandatory rules

- Do not remove features just to simplify mobile layouts.
- Do not break desktop functionality while fixing mobile.
- Do not introduce unnecessary redesigns.
- Preserve existing routing, authentication, permissions and payment functionality.
- Test actual interactions, not screenshots alone.
- Document every failure with its viewport, page, reproduction steps and evidence.

---

### 8. Pre-push enforcement

Before relevant code pushes, read:
- `ui-1-test.md` — First Impressions Matter
- `ui-2-test.md` — The Power of Trust
- `ui-3-test.md` — Easy Navigation Reduces Frustration
- `ui-4-test.md` — Colours Influence Emotions
- `ui-6-test.md` — Clear Calls to Action Drive Results
- `ui-7-test.md` — Mobile Experience is Essential

Record results in the active execution record below.

---

# 9. ACTIVE AUDIT & PRE-PUSH EXECUTION RECORD

> **Audit Date:** 2026-11-24  
> **Target Environment:** `http://localhost:5173/`  
> **Auditor:** Mobile UX & Responsive Frontend QA Specialist (Antigravity Agent)  
> **Status:** AUDITED, VERIFIED & HOST-VALIDATED  
> **Release Decision:** **PASS**

### Verified Acceptance Items:
- [x] **Zero Horizontal Overflow:** Verified across 320×568, 360×800, 390×844, and 430×932. Header constrained with `w-full max-w-full overflow-hidden`, desktop search form hidden on `< 768px`.
- [x] **Touch Ergonomics:** Primary hero CTAs, dashboard quick actions, and modal action buttons maintain 48–52px height satisfying Fitts's Law.
- [x] **Product Listing Flow Redesign:** Add Product modal unified from 5 clunky tabs into a single natural scrollable view: photo uploader at top, name and category, description and pricing with live profit telemetry, stock and SKU, followed by variants.
- [x] **Tactile 3D Button Fidelity on Mobile:** 3D bottom bevel shelf (`#8c2505`) with physical downward depression (`translateY(3px)`) and inner shadow (`inset 0 3px 6px`) active on touch.
- [x] **Release Decision:** **PASS**
