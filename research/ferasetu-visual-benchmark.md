# FeraSetu — Visual Benchmark Research & UI Audit

> **Scope:** Stage 1 & Stage 2 Research across Apple, Kombai Gallery, Mobbin, Stripe, Shopify, Linear, and BigCommerce, paired with a direct audit of `http://localhost:5173`.

---

## 1. Benchmark Analysis

### 1.1 Stripe (`stripe.com`) — Connected Commerce & Financial Trust
- **Actual Pages Inspected:** `stripe.com` (Homepage Hero, Interactive 3D Globe & Connected Payment Arcs, Modular Product Bento).
- **Useful Design Observation:** Stripe pairs crisp, high-contrast typography on a clean white canvas with an asymmetric 3D interactive focal object (dot-matrix globe + luminous bezier transaction arcs) that bleeds subtly into the composition. Motion is smooth, ambient, and continuous—never distracting from the primary CTA.
- **Psychological Reasoning:** Processing fluency + awe + institutional trust. Translating abstract payment flows into spatial luminous arcs makes invisible infrastructure feel tangible, fast, and reliable.
- **Application to FeraSetu:**
  - Replace decorative spheres/particles with an **interactive 3D Sovereign Commerce Architecture** (a geometric 3D Storefront Plinth + Direct Settlement Arcs connecting Customer → Storefront → Bank Vault with `0% Fee`).
  - Use Stripe-style hairline `1px` bento cards with live `tabular-nums` settlement counters and interactive mode toggles.
- **What NOT to Copy:** Heavy "Blurple" neon-purple gradients—FeraSetu's palette is **Sovereign Blue (`#0052FF`)**, **Pure White (`#FFFFFF`)**, and **Saffron Orange (`#EA580C`)**.

### 1.2 Apple (`apple.com`) — Scroll-Driven Storytelling & Pacing
- **Actual Pages Inspected:** Product storytelling pages (sticky hardware/UI stages, chapter transitions).
- **Useful Design Observation:** Every scroll chapter has one clear focal visual pinned in a sticky frame while concise narrative copy steps through 4 distinct states. Transitions use deliberate easing (`cubic-bezier(0.16, 1, 0.3, 1)`), never abrupt snapping.
- **Psychological Reasoning:** Chunking + narrative transportation. Merchants absorb one concept per chapter without cognitive overload.
- **Application to FeraSetu:**
  - Structure `#scroll-view` into the 4 requested chapters:
    1. *Chapter 01 — Your business, your identity* (3D storefront reveal)
    2. *Chapter 02 — Your customer relationship* (real commerce + direct storefront interaction)
    3. *Chapter 03 — Direct commerce* (3D order + 0% commission settlement flow)
    4. *Chapter 04 — Your business, under your control* (real FeraSetu dashboard + 3D control layer)
- **What NOT to Copy:** Dark-mode-only theatrical black slabs on functional merchant pages or heavy multi-megabyte video downloads that stall on 3G/4G shopkeeper phones.

### 1.3 Kombai Gallery (`kombai.com/gallery` — Tidewell, Hollis, Prism, Cumulus)
- **Actual Pages Inspected:** Kombai Gallery web & dashboard templates (`Tidewell`, `Hollis`, `Prism`, `Cumulus`).
- **Useful Design Observation:**
  - **Prism / Cumulus:** Choreographed hero entrance, mono uppercase eyebrows (`11px`, `tracking-wider`), and sticky scroll-pinned product stages.
  - **Tidewell / Hollis:** Clean daylight surfaces (`#FFFFFF` / `#F8FAFC`), `1px` hairline borders, **only one focal KPI card** in high-contrast primary color while secondary KPIs stay calm white, and bottom-bordered card action links (`View payouts →`).
- **Psychological Reasoning:** Hick's Law + Visual Hierarchy. When every card screams with colored top borders and heavy gradients, the merchant doesn't know where to look first.
- **Application to FeraSetu:** Keep **Net Sales** as the single focal KPI card, neutralize secondary cards into crisp white hairline cards with contextual deltas, and use mono uppercase labels.
- **What NOT to Copy:** Overly decorative blur blobs or generic SaaS eyebrow kickers with pulsing dots everywhere.

### 1.4 Mobbin, Shopify, Linear & BigCommerce (Merchant Dashboards)
- **Actual Pages Inspected:** `mobbin.com/explore/web` (Jobber, Better Stack, Databricks), `linear.app`, `shopify.com`.
- **Useful Design Observation:**
  - **Linear:** Keyboard-first `⌘K` search pill in the header, progressive disclosure via drawers/tabs, instant optimistic feedback (<400ms).
  - **Shopify / Jobber:** Unified segmented order pipeline strip (*New → Packing → Out for Delivery → Settled*), actionable inline table row controls, and onboarding checklists with time estimates when a store has 0 orders.
  - **BigCommerce:** Clear store context switcher at the top before metrics load.
- **Psychological Reasoning:** Self-determination & Perceived Control. Busy shopkeepers need to answer 3 questions in <5 seconds: *How are sales today? Which orders need action right now? Is my store healthy?*
- **What NOT to Copy:** Dense enterprise multi-tab clutter or hidden cancellation/export paths.

---

## 2. Audit of Current `http://localhost:5173` Application

### Biggest Visual & UX Weaknesses Identified
1. **3D Hero Object (`HeroScene.tsx`):** Currently renders a generic orange icosahedron sphere with orbiting wireframe satellites and particles—explicitly violates our rule against decorative spheres with orbiting particles. Needs a purpose-built **3D Sovereign Storefront & Direct Settlement Network** (geometric storefront terminal + product nodes + Stripe-style luminous payment arcs).
2. **AI-Generated Human Photo (Removed):** Previously rendered an AI-generated shopkeeper photo with a fabricated persona ("Ramesh Sharma"). Removed immediately; must only use authentic licensed photography (with zero invented merchant names/testimonials) or real product UI / 3D scenes.
3. **Scroll-View Chapters:** Current `ScrollViewCinema` needs explicit alignment with the 4 named chapters (*Identity → Customer Relationship → Direct Commerce → Control*) and smoother Stripe/Apple-style 3D + real product UI integration.
4. **Dashboard Secondary Cards (`OperationsDashboard.tsx`):** While Card 1 (Net Sales) is now focal, Cards 2–6 still use heavy `border-t-[3px]` colored top borders and dark-gradient backgrounds, creating competing visual noise. Also, the order queue & empty states can be tightened into a cleaner 65/35 operational layout with a segmented 4-stage pipeline strip.
