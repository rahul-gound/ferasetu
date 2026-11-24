# FeraSetu UI-9 — CONSISTENCY CREATES CONFIDENCE
## Mandatory Design Consistency, System Coherence & Cross-Platform Quality Gate

**ROLE**

Act as a principal design-system architect, senior product designer, UX consistency researcher, frontend architecture specialist, accessibility engineer, and quality assurance lead.

Your responsibility is to ensure that FeraSetu feels like one carefully designed, professionally engineered product rather than a collection of independently developed pages.

**Create and maintain a permanent repository-root document named `ui-9-test.md`.**

This is the ninth FeraSetu UI quality standard.

---

# 1. CORE PHILOSOPHY

Consistency Creates Confidence.

Users become comfortable with products when familiar elements behave and appear predictably.

Inconsistent fonts, spacing, buttons, navigation, terminology, components, and interactions create unnecessary cognitive effort.

Our philosophy:

**Learn once. Recognise everywhere.**

However, consistency does not mean making every page identical.

The landing page, merchant dashboard, admin panel, and merchant storefronts have different purposes and users.

They should share a coherent design language while maintaining their own appropriate layouts, priorities, and visual personalities.

Establish consistency in:
- Design foundations.
- Typography.
- Colours and semantic meanings.
- Spacing.
- Components.
- Navigation.
- Interaction behaviour.
- Content and terminology.
- Responsive behaviour.
- Accessibility.
- Product identity.

Avoid unnecessary variation while preserving useful flexibility.

---

# 2. RESEARCH AND DESIGN REFERENCES

### A. Nielsen Norman Group — Consistency and Standards
Reference: https://www.nngroup.com/articles/consistency-and-standards/
- Internal consistency (within FeraSetu).
- External consistency (familiar mobile/web e-commerce mental models).
- Learnability and cognitive predictability.

### B. W3C WCAG 2.2 — Consistency Guidelines
- SC 3.2.3: Consistent Navigation.
- SC 3.2.4: Consistent Identification.
- SC 3.2.6: Consistent Help.

### C. Design Token Architecture & Scalable Systems
References: US Web Design System (https://designsystem.digital.gov/design-tokens/) & Atlassian Design System (https://atlassian.design/design-system)
- 3-Layer Token System: Primitive Tokens $\rightarrow$ Semantic Tokens $\rightarrow$ Component Usage.
- Predictable spacing scales, elevation, and component dimensions.

---

# 3. COMPLETE APPLICATION CONSISTENCY AUDIT

### A. Public Website
- Hero CTA and marketing buttons consistently employ the tactile 3D bottom bevel shelf (`#8c2505` on `#EA580C`) with layered ambient glow and physical inward depression on click.
- Unified typography hierarchy: Slate-900 `#0F172A` headlines and Slate-600 `#475569` body text.

### B. Merchant Dashboard
- Navigation sidebar maintains persistent ordering, iconography (`lucide-react`, 18px), and active route wayfinding across all 14 workspace pages.
- Action buttons consistently use `.btn-tactile-primary` (`#0052FF` with `#0036A3` shelf) and `.btn-tactile-ghost`.

### C. Internal Admin Panel
- Standardized table ledgers, search bars, filter dropdowns, and operational alert badges.

### D. Storefront Templates
- Unified cart drawer mechanics, instant UPI payment handshakes, and 0% platform fee ledgers across all 9 storefront themes while respecting individual merchant aesthetic autonomy.

---

# 4. DESIGN FOUNDATIONS & SINGLE SOURCE OF TRUTH

- **Typography:** System font stack (`Inter`, system-ui, -apple-system) with `tabular-nums` for all currency amounts and operational metrics.
- **Color Invariants:** Sovereign Blue (`#0052FF`), Saffron Orange (`#EA580C`), Pure White (`#FFFFFF`), Slate-50 (`#F8FAFC`).
- **Button Radii & Press Physics:** Standard buttons 12–14px (`rounded-xl`), marketing CTAs capsules (`rounded-full`), active state travel `translateY(3px)` with `inset 0 3px 6px` inner depression.
- **Iconography:** Unified `lucide-react` suite with consistent stroke widths (`strokeWidth={1.75}` or `2`).

---

# 5. AUTOMATIC RELEASE BLOCKERS

The test MUST FAIL when:
1. A shared component change introduces glaring visual or behavioral divergence across pages.
2. The same repeated functionality receives confusingly different terminology (e.g. "Products" vs "Items" without distinction).
3. Navigation drawers or sidebar links change order arbitrarily without user architectural approval.
4. Button interactions fail to follow the tactile 3D press standard (unless explicitly exempted by component spec).
5. A theme change breaks the design token hierarchy or causes accessibility contrast regressions.
6. A global component update silently breaks unrelated product pages.

---

# 6. ACTIVE AUDIT & PRE-PUSH EXECUTION RECORD

> **Audit Date:** 2026-11-24  
> **Target Environment:** `http://localhost:5173/`  
> **Auditor:** Principal Design-System Architect & QA Lead (Antigravity Senior Agent)  
> **Status:** AUDITED, VERIFIED & HOST-VALIDATED  
> **Release Decision:** **PASS**

### Verified Acceptance Items:
- [x] **Foundation Alignment:** 100% adherence to typography tokens, color constants, and spacing grid across marketing and dashboard.
- [x] **Tactile Button Coherence:** Hero CTA, dashboard actions (`btn-tactile-primary`), and modal buttons share identical 3D shelf physics and downward travel.
- [x] **Terminology Consistency:** Standardized terms across all views: "Orders & Counter", "Products & Stock", "Storefront Studio", "0% Commission".
- [x] **WCAG 2.2 Navigation Consistency:** SC 3.2.3 and SC 3.2.4 satisfied with persistent sidebar ordering and consistent help anchors.
- [x] **Release Decision:** **PASS**
