---
name: FeraSetu Design System
description: Calm, high-trust, human-first commerce infrastructure for global independent retail shopkeepers
colors:
  primary: "#0052FF"
  primary-hover: "#0047E0"
  primary-active: "#003BB5"
  primary-light: "#EFF6FF"
  accent: "#EA580C"
  accent-hover: "#C2410C"
  accent-active: "#9A3412"
  accent-light: "#FFF7ED"
  neutral-bg: "#FFFFFF"
  surface-muted: "#F8FAFC"
  surface-card: "#FFFFFF"
  border-subtle: "#F1F5F9"
  border-default: "#E2E8F0"
  border-strong: "#CBD5E1"
  text-primary: "#0F172A"
  text-secondary: "#475569"
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
  lg: "12px"
  xl: "14px"
  "2xl": "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  "2xl": "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.xl}"
    padding: "12px 24px"
    minHeight: "48px"
    boxShadow: "0 2px 4px rgba(0,82,255,0.15), 0 1px 2px rgba(0,0,0,0.06)"
    activeTransform: "translateY(1.5px) scale(0.985)"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    boxShadow: "0 6px 16px rgba(0,82,255,0.22)"
---

# FeraSetu — Premium Design Constitution & Implementation

<!-- impeccable:design-schema 1 -->

## 1. Brand Philosophy & Identity
- **Core Mantra:** *"Your business is yours. The internet should be too."*
- **Brand Personality:** Premium, Independent, Confident, Professional, Human, Trustworthy, Modern but Timeless, Commercially Credible.
- **Audience:** The Global Independent Shopkeeper (kirana stores, bodegas, boutiques, neighborhood merchants across 48+ regions).
- **Core Value:** 0% marketplace commission, direct bank settlements, zero technical jargon.

### Color Palette
- **Primary Sovereign Blue (`#0052FF`):** Confident institutional reliability. Primary action color.
- **Pure White Canvas (`#FFFFFF`):** High-clarity ground providing expansive breathing room.
- **Restrained Saffron/Orange Accent (`#EA580C` / `#C2410C`):** Warm commerce accents and energy. Never decorative clutter.
- **Deep Slate Typography (`#0F172A` / `#475569`):** High-contrast sunlight legibility under harsh shop lights.
- **Surface Foundations (`#FFFFFF` / `#F8FAFC`):** Generous, clean backgrounds that create trust and visual stability.
- **Zero Neon / Purple Slop Invariant:** Never introduce random purple, violet, or neon gradients. No decorative color blobs.

---

## 2. Premium Tactile Button Design System
*Core Invariant: I LOVE premium rounded-corner buttons with subtle shadows. When a user taps a button, it should physically feel like it presses inward.*

### A. Shape & Corner Radii
- **Primary Buttons:** 12–14px (`rounded-xl`).
- **Large CTA Buttons:** 14–16px (`rounded-2xl` or smooth rounded capsules where specified).
- **Compact Controls:** 9–12px (`rounded-lg` / `rounded-xl`).
- **Icon-Only Buttons:** 10–12px (`rounded-xl`).
- **Pills (`rounded-full`):** Reserved for live status tags, filters, chips, and specialized CTA pills.
- Avoid overly sharp square buttons; maintain a unified, friendly, premium curvature.

### B. Dimensions & Touch Ergonomics
- **Primary Button Height:** 48–52px (standard touch zone).
- **Standard Button Height:** 44–48px.
- **Compact Button Height:** 38–42px (dense desktop tables).
- **Horizontal Padding:** 18–26px.
- **Icon-Text Gap:** 8px (`gap-2`).
- **Fitts's Law Invariant:** Touch targets must be at least 44–48px on mobile viewports.

### C. Layered Subtle Shadows
- **Primary Sovereign Button:**
  - Resting: `shadow-[0_2px_4px_rgba(0,82,255,0.16),0_1px_2px_rgba(0,0,0,0.06)]`
  - Hover: `shadow-[0_6px_16px_rgba(0,82,255,0.24),0_2px_4px_rgba(0,0,0,0.06)]`
  - Pressed: `shadow-[0_1px_2px_rgba(0,82,255,0.12),inset_0_2px_4px_rgba(0,0,0,0.18)]`
- **Secondary / Outline Button:**
  - Resting: `shadow-[0_1px_2px_rgba(0,0,0,0.04)]` with crisp border (`border-slate-200`)
  - Hover: `shadow-[0_4px_12px_rgba(0,0,0,0.06)]` with darkened border (`border-slate-300`)
  - Pressed: `shadow-inner` with `bg-slate-100`
- **Prohibited:** Giant black shadows, neon halos, constant pulsing outlines, or plastic glassmorphism.

### D. Physical Inward Press Interaction
- **Resting:** Base position, subtle ambient shadow.
- **Hover:** Gentle lift (`hover:-translate-y-0.5`), slightly deepened shadow, smooth color shift.
- **Pressed (`:active`):**
  - Physically travels downward 1–2px (`active:translate-y-0.5` or `active:translate-y-1`).
  - Subtle inward compression scale: `active:scale-[0.985]`.
  - Outer shadow compresses and tightens; subtle inset shadow activates.
  - Transition duration: 150–200ms ease-out.
- **Touch Parity:** Touch devices receive the active depression immediately without requiring hover states.
- **Reduced Motion:** Respects `prefers-reduced-motion` by reducing transform travel while maintaining color and border feedback.

### E. Coherent Button Variant Matrix
1. **Primary (`default`):** Sovereign Blue (`bg-[#0052FF]`), white text, layered depth, active inward depression.
2. **Accent / Commerce (`brand`):** Saffron Orange (`bg-[#EA580C]`), white text, warm depth, active mechanical press.
3. **Secondary (`outline`):** White background, crisp `border-slate-200`, dark slate text, subtle depth.
4. **Tertiary (`ghost`):** Minimal slate button, subtle background tint on hover, clean active press.
5. **Destructive (`destructive`):** Restrained crimson (`bg-rose-600`), white text, clear active feedback.
6. **Icon-Only (`icon`):** 44x44px minimum touch target, centered Lucide icon (`strokeWidth={1.75}`).
7. **Loading (`loading`):** Preserves button geometry, disables click events, renders calm inline spinner.
8. **Disabled (`disabled`):** Muted opacity (50%), pointer events disabled, no misleading hover/press animation.

---

## 3. Global UI Rules & Anti-Slop Standards
- **Typography:** System UI font stack (`system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`). Tabular numerals (`tabular-nums`) for currency, prices, inventory, and timestamps.
- **Headings:** Bold and self-evident. Strictly NO pulsing dot eyebrow kickers or repetitive micro-badges above headings.
- **Accordion & Drawer Motion:** Premium slow expansion (`duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]`) giving a calm, deliberate, dopamine-releasing fluidity instead of abrupt snapping.
- **Anti-Nesting Rule:** Never nest bordered cards within bordered cards. Use soft background shifts (`bg-slate-50`), whitespace, or borderless dividers.
- **Form Controls:** Inputs and buttons share identical heights, border radii, and focus ring metrics.
- **Error & 404 Pages:** Witty, empathetic, shopkeeper-friendly copy that values the customer, reassures data safety, and avoids dry corporate jargon.
- **Zero Sarvam Invariant:** Never display or reference Sarvam AI anywhere. Powered exclusively by Sovereign FeraSetu AI (`https://ai.fera-search.tech/v1`).

---

## 4. Stitch Retail Design System & UI Test Specifications
The FeraSetu storefront engine incorporates the high-craft Stitch Design System (Project ID `6894408154411177085`). All implementations, component breakdowns, tokens, and verification criteria are systematically partitioned into three companion specifications:

- **[ui-1-test.md](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/ui-1-test.md):**
  - **Screen 1:** `Retail - Local Storefront Home` (ID: `d71b6d95dd764895939859c4d73e8106`)
    - Verified GSTIN badge, local delivery in 24 hrs, WhatsApp merchant communication, 2-column bestsellers with quick add, Google reviews widget, and direct UPI rails.
  - **Screen 2:** `Retail - Product Catalog & Filters` (ID: `7e630f2d9dc749ce8b365a80346e8f12`)
    - Faceted search, responsive dual-column product grid, discount tags, rating indicators, and store guarantee footprint.
- **[ui-2-test.md](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/ui-2-test.md):**
  - **Screen 3:** `Retail - Product Detail (PDP)` (ID: `516552b83c954e60ba0af7bc0c573ec2`)
    - Multi-angle carousel, Indian chest sizing guide, authentic handloom badges, tactile "Add to Cart" and dual-rail "Order via WhatsApp".
  - **Screen 4:** `Retail - Cart & Checkout` (ID: `112f966813864d128d6d8a650dc77aec`)
    - Tactile quantity steppers (`[-] 1 [+]`), 0% aggregator platform fee ledger, delivery address GPS selector, and discount coupon engine.
- **[ui-3-test.md](file:///c:/Users/himanshu/OneDrive/fera-shopkeeeper-web-testing-/ui-3-test.md):**
  - **Screen 5:** `Retail - Select Payment Mode` (ID: `1c43bc7c6b634f7ca979160e112baff1`)
    - UPI Instant Settlement (GPay, PhonePe, Paytm, CRED), Cash on Delivery with OTP verification, 256-bit card gateway, and master tactile CTA button.
  - **Website Builder Architecture:** Integration blueprint for `RetailStorefrontTemplate.tsx`, `THEME_REGISTRY['retail']`, and 5-screen interactive preview in `WebsiteDesignPage.tsx`.
