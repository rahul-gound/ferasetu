# FeraSetu Navigation Standard & Wayfinding Rules (`nav-rule.md`)

## Mandatory Navigation, Sidebar, Tab Bar & Spatial Wayfinding Standard

---

### 1. CORE PHILOSOPHY: WAYFINDING VS. TACTILE TRIGGERS

In digital product design, **Navigation** and **Action Buttons** serve two fundamentally different cognitive purposes:

1. **Navigation (Spatial Wayfinding):**
   - Answers: *"Where am I?"*, *"Where can I go?"*, and *"How do I switch sections?"*
   - Includes: Top navigation bars, sidebar links, category filters, horizontal sub-tabs, segmented channel controls, breadcrumbs, and pagination controls.
   - Mental Model: Rooms, signs, maps, drawers, and tabs in a physical notebook or file cabinet.
   - Behavior: Quiet, predictable, rectangular or subtly rounded, flat indicators, zero dramatic physical depression.

2. **Action Buttons (Tactile Triggers):**
   - Answers: *"What can I execute right now?"*
   - Includes: "New Order", "Add Product", "Save Changes", "Export CSV", "Submit Ticket".
   - Mental Model: Physical mechanical keys or pushbuttons.
   - Behavior: 3D shelf depth, ambient layered shadows, subtle hover lift (`-translate-y-0.5`), physical press inward on click (`:active:translate-y-0.5 active:scale-[0.985]`).

> [!IMPORTANT]
> **THE UNIVERSAL NAVIGATION INVARIANT:**
> Navigation elements, sidebar items, category filters, and horizontal tabs **MUST NEVER** be styled as 3D tactile buttons, MUST NEVER follow `button.md`, and MUST NEVER be forced into `9999px` oval pills.

---

### 2. STRICT NAVIGATION DESIGN INVARIANTS

Every developer and AI agent working on FeraSetu MUST strictly obey these rules:

#### A. Geometry & Radiuses
- **Tabs & Segmented Controls:** Clean rectangular or gently rounded boxes (`rounded-lg` / `rounded-xl`, 8px to 12px) inside a subtle neutral container (`bg-slate-100 border border-slate-200`).
- **Underline Tabs:** Flat tabs with bottom active accent (`border-b-2 border-[#0052FF] text-[#0052FF] pb-3`).
- **Sidebar Links:** Clean rectangular or rounded-xl items (`rounded-xl px-3 py-2.5`).
- **Forbidden:** Never apply `border-radius: 9999px !important` or round pills to structural navigation or sidebar links.

#### B. Depth & Shadows
- **Active Navigation States:** Flat indicators only.
  - Segmented tab active: `bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold`.
  - Inactive tab: `text-slate-600 hover:text-slate-900 hover:bg-slate-200/50`.
  - Sidebar active: `bg-blue-50 text-[#0052FF] font-semibold`.
  - Sidebar inactive: `text-slate-600 hover:bg-slate-50 hover:text-slate-900`.
- **Forbidden:** Never apply 3D shelf shadows (`box-shadow: 0 4px 0 0 ...`) or dark drop shadows to navigation links or tabs.

#### C. Interaction Physics
- **Hover:** Clean color transition or subtle background shift (150ms ease).
- **Active / Press:** Instant, quiet state switch.
- **Forbidden:** Never apply `translateY(3px)` drop or `active:scale-[0.985]` inwards crush to navigation bars, sidebar links, category filters, or horizontal sub-tabs.

#### D. Semantic Accessibility (W3C WCAG 2.2)
- Tab bars must use `<div role="tablist" aria-label="...">`.
- Tab items must use `<button role="tab" aria-selected={isActive} ...>`.
- Sidebar must be inside `<aside>` and wrap links in `<nav>`.
- Navigation items must meet minimum 44×44px touch targets on mobile viewports.

---

### 3. CSS GLOBAL SCOPING ENFORCEMENT (`index.css`)

All universal button styles in `frontend/src/index.css` must strictly exclude navigation elements:

```css
/* Universal tactile button transitions (strictly excluding nav, sidebar, tabs, and unstyled) */
button:not([data-unstyled]):not([aria-expanded]):not([role="tab"]):not(.unstyled-btn):not([class*="w-full"][class*="text-left"]):not(nav *):not(aside *):not([role="tablist"] *):not([role="navigation"] *):not(footer *),
input[type="button"],
input[type="submit"],
.btn:not(nav *):not(aside *):not(footer *),
.btn-tactile,
.btn-3d {
  /* Applied only to true action buttons */
}
```

**Never** attach global rules to `a[class*="rounded-"][class*="bg-"]` or unqualified `button` elements that bleed into navigation wayfinding.

---

### 4. AUDIT CHECKLIST FOR NAVIGATION

Before proposing or pushing any UI changes:
- [ ] Are horizontal sub-tabs styled as flat segmented controls or underline tabs rather than 3D pills?
- [ ] Are sidebar links rectangular/subtly rounded without 3D bottom shelves?
- [ ] Are category filters styled with `role="tab"` and free of 3D depth?
- [ ] Does the page scroll smoothly with `min-h-0` on flex columns?
- [ ] Are active states indicated cleanly by tint, border, or underline rather than mechanical depression?
- [ ] Do all navigation elements pass WCAG 2.2 AA contrast (≥4.5:1)?
