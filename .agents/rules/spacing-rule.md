# FeraSetu Spacing Rules

> **Purpose:** Establish a consistent, responsive and intentional spacing system across FeraSetu.
>
> **Core principle:** Space is not empty. It communicates relationships, establishes hierarchy, reduces cognitive load and gives the interface room to breathe.

---

## 1. Spacing philosophy

FeraSetu should feel:

- Calm, not cramped.
- Spacious, not wasteful.
- Structured, not rigid.
- Premium, not unnecessarily oversized.
- Consistent, not repetitive.
- Comfortable, not inefficient.

Every margin, padding and gap must have a reason.

Spacing must help users understand:
- Which elements belong together.
- Where one section ends and another begins.
- Which information deserves attention.
- Where users should focus next.

### The fundamental rule

**Smaller spacing groups related elements. Larger spacing separates unrelated groups.**

For example:

- An icon and its label should be close.
- A heading and its description should feel connected.
- Different sections should have more separation.
- Independent content groups should not visually merge.

Never add spacing randomly to make a page appear premium.

---

## 2. The FeraSetu spacing foundation

Use a 4px foundation with an 8px primary spacing rhythm.

The 4px foundation allows precise alignment. The 8px rhythm provides consistency for most components and layouts.

### Core spacing tokens

| Token | Value | Usage |
|---|---:|---|
| space-0 | 0px | No spacing |
| space-1 | 4px | Tiny adjustments |
| space-2 | 8px | Tight grouping |
| space-3 | 12px | Compact grouping |
| space-4 | 16px | Standard component spacing |
| space-5 | 20px | Intermediate spacing |
| space-6 | 24px | Card and container padding |
| space-8 | 32px | Content group separation |
| space-10 | 40px | Large content separation |
| space-12 | 48px | Section separation |
| space-16 | 64px | Major section separation |
| space-20 | 80px | Large marketing layouts |
| space-24 | 96px | Exceptional hero and editorial spacing |

These tokens are the approved vocabulary, not mandatory values for every situation.

Avoid introducing arbitrary values when an existing token works.

### Token implementation

Use centralized CSS variables or the project's existing design-token system.

Illustrative example:

```css
:root {
  --space-0: 0;
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-20: 5rem;
  --space-24: 6rem;
}
```

Do not blindly duplicate tokens if the project already has an equivalent spacing system. Audit and reuse existing tokens first.

---

## 3. Spacing relationships

Use spacing to communicate visual relationships.

### Tight relationship

Use approximately 4–8px between closely related items.

Examples:
- Icon and label.
- Label and small supporting indicator.
- Badge and nearby text.
- Compact inline controls.

### Normal relationship

Use approximately 12–16px between related elements.

Examples:
- Heading and description.
- Form label and field.
- Product name and supporting details.
- Related controls.

### Group relationship

Use approximately 20–32px between distinct groups inside a section.

Examples:
- Different form groups.
- Card content groups.
- Toolbar and main content.
- Related dashboard panels.

### Section relationship

Use approximately 40–64px between major content sections, depending on density and screen size.

### Major visual separation

Use 64–96px only when the page needs a clear, deliberate visual transition.

Do not use large spacing between every element.

---

## 4. Layout spacing and page structure

Spacing must be consistent across the overall page.

### Main content containers

- Use a consistent content alignment system.
- Maintain predictable left and right page boundaries.
- Avoid content touching the viewport edges.
- Use a maximum content width where it improves readability.
- Do not force every page into the same maximum width.
- Use wider layouts for dashboards and data-heavy screens when appropriate.
- Use narrower layouts for reading-heavy content.

### Page gutters

Suggested starting values:

| Viewport | Horizontal page padding |
|---|---:|
| Small mobile | 16px |
| Large mobile | 20px |
| Tablet | 24–32px |
| Desktop | 32–40px |
| Wide desktop | 40–48px |

These are starting values. Adapt them to the actual layout and available width.

### Page headings

- Keep the page title visually connected to its description.
- Keep the heading group separated from the main content.
- Align headings with the content below.
- Avoid unnecessary empty space above every page heading.
- Maintain consistent heading placement across similar dashboard pages.

### Content sections

- Give major sections clear separation.
- Keep related content visually grouped.
- Avoid inconsistent gaps between similar sections.
- Do not compensate for poor information architecture by adding more whitespace.

---

## 5. Component spacing

### Cards

Cards must have consistent internal padding.

Suggested starting values:

| Card type | Padding |
|---|---:|
| Compact card | 12–16px |
| Standard card | 20–24px |
| Large content card | 24–32px |
| Mobile card | 16–20px |

Rules:

- Use consistent padding across similar cards.
- Keep headings connected to card content.
- Avoid unnecessary nested padding.
- Do not make small cards feel oversized.
- Do not squeeze large content into small cards.
- Allow card height to grow with its content.

### Forms

- Maintain consistent spacing between fields.
- Keep labels close to their corresponding controls.
- Keep validation messages near the relevant field.
- Separate independent form groups.
- Avoid excessively large gaps between fields.
- Do not rely on placeholder text for layout or labeling.

### Buttons

Follow `button-rule.md` for button dimensions, padding and interaction.

Spacing around buttons must support clear hierarchy.

- Primary and secondary actions should be visually grouped.
- Destructive actions should have appropriate separation.
- Button groups should have consistent gaps.
- Buttons must not collide or overflow on mobile.

### Tables

- Give table cells sufficient horizontal and vertical padding.
- Keep comparable rows consistent.
- Align values and columns carefully.
- Avoid excessive row height.
- Do not compress rows until information becomes difficult to scan.
- Handle narrow screens through responsive table behavior rather than shrinking everything.

### Navigation

Follow `nav-rule.md`.

- Maintain consistent spacing between navigation items.
- Keep icons and labels aligned.
- Preserve sufficient space for active states.
- Do not create unnecessary gaps between related navigation items.
- Support longer translated labels.

### Dialogs and popovers

- Use consistent internal padding.
- Keep titles, descriptions and actions grouped.
- Separate destructive actions when appropriate.
- Ensure dialogs fit smaller screens.
- Avoid fixed dimensions that clip content.

---

## 6. Merchant dashboard density

The merchant dashboard is a working environment.

It must balance information density with comfort.

Do not make every dashboard page spacious like a marketing landing page.

### Compact density

Use when merchants need to compare or manage many records.

Examples:
- Order lists.
- Inventory tables.
- Customer directories.
- Transaction histories.

### Standard density

Use for ordinary dashboard pages.

Examples:
- Overview pages.
- Settings.
- Product management.
- Customer details.

### Spacious density

Use for content that benefits from greater separation.

Examples:
- Onboarding.
- Empty states.
- Setup guides.
- Important configuration flows.

### Density rules

- Similar information must have consistent spacing.
- Important information must not be buried in crowded layouts.
- Avoid unnecessary card wrappers.
- Do not add large gaps just to make a dashboard look minimal.
- Prefer clear grouping over decorative whitespace.
- Do not show every section with the same visual weight.

A good dashboard lets merchants understand their business without searching through visual clutter.

---

## 7. Marketing and storefront spacing

Marketing pages and merchant storefronts have different goals from dashboards.

### Marketing pages

Use more generous spacing to establish brand confidence and visual rhythm.

Rules:

- Give major sections room to breathe.
- Use deliberate transitions between sections.
- Keep hero content focused.
- Avoid oversized empty areas without a visual purpose.
- Maintain consistent content alignment.
- Ensure section spacing does not become repetitive.
- Keep calls to action visually connected to their descriptions.

Whitespace should create hierarchy, not fill space.

### Storefronts

Spacing must respect the merchant's business identity.

**Ecommerce**
- Prioritize product browsing.
- Maintain consistent product-grid gaps.
- Keep prices, titles and purchase actions grouped.
- Avoid wasting space between related product information.

**Gym**
- Give membership plans and key calls to action clear separation.
- Use confident section transitions.
- Keep class schedules and pricing easy to scan.

**Consulting**
- Use comfortable reading widths.
- Give service descriptions and case studies enough breathing room.
- Avoid excessively dense paragraphs.

Do not force one universal spacing layout onto every storefront category.

---

## 8. Responsive spacing

Spacing must adapt to the actual available space.

Never simply shrink every desktop gap by the same percentage.

### Mobile

- Use smaller page gutters.
- Reduce unnecessary section separation.
- Preserve readable component padding.
- Stack content when horizontal space is insufficient.
- Prevent cards from becoming cramped.
- Allow content to grow naturally.
- Respect device safe areas.
- Keep important actions accessible.

### Tablet

- Rebalance columns and gaps.
- Avoid layouts that feel like oversized mobile screens.
- Use available horizontal space intelligently.
- Prevent uneven gaps between content groups.

### Desktop

- Use wider page gutters where appropriate.
- Allow multi-column layouts.
- Keep content aligned to a consistent grid.
- Preserve reasonable reading widths.

### Fluid spacing

Use responsive CSS where it creates a smoother transition.

Example:

```css
.section-spacing {
  padding-block: clamp(2.5rem, 5vw, 5rem);
}
```

Use fluid spacing selectively. Do not make every margin and padding value fluid.

---

## 9. Grid and alignment rules

A premium interface feels aligned even when users cannot explain why.

Rules:

- Align content to consistent page boundaries.
- Use a coherent grid for multi-column layouts.
- Keep repeated cards aligned.
- Maintain consistent gutters between columns.
- Align form fields and their labels.
- Align table headers with their data.
- Avoid accidental horizontal misalignment.
- Use Flexbox and CSS Grid according to the actual layout needs.

Do not use arbitrary margins to fix structural alignment problems.

Fix the layout structure instead.

### Grid behavior

- Use fewer columns on narrow screens.
- Increase columns when space genuinely supports more content.
- Preserve consistent gutters.
- Avoid cards becoming excessively narrow.
- Avoid empty columns created only to preserve a desktop layout.

---

## 10. Nested spacing and visual containment

Nested padding can create unexpected amounts of whitespace.

For example:

A page has 32px padding, a card has 24px padding, and an inner component adds another 24px.

The resulting 80px of accumulated spacing may make the content feel disconnected.

Rules:

- Inspect cumulative spacing.
- Avoid unnecessary nested containers.
- Do not add padding to every wrapper automatically.
- Prefer one clear containment boundary.
- Use internal gaps only when content needs separation.
- Keep related content visually connected.

Every nested container must justify its padding.

---

## 11. Alignment and direction support

FeraSetu serves international merchants.

Use CSS logical properties wherever appropriate.

Prefer:

```css
margin-inline-start
margin-inline-end
padding-inline-start
padding-inline-end
inset-inline-start
inset-inline-end
text-align: start
```

Avoid unnecessary hardcoded left/right assumptions.

This helps support right-to-left languages and different writing directions.

Test translated content because longer labels can change layout relationships.

---

## 12. Accessibility and interaction spacing

Spacing must not create accessibility problems.

Requirements:

- Preserve content when text is enlarged.
- Do not clip enlarged text.
- Allow components to grow naturally.
- Keep interactive controls sufficiently separated.
- Avoid placing unrelated actions too close together.
- Maintain visible keyboard focus.
- Ensure content can reflow at narrow viewport widths.
- Respect device safe areas.

For WCAG 2.2 Level AA, target sizes generally need to satisfy the 24 × 24 CSS pixel minimum or an applicable exception, including the spacing exception.

As a practical design target, aim for approximately 44–48px interactive touch areas where appropriate, especially for frequently used mobile controls.

Do not confuse visual icon size with the actual clickable area.

---

## 13. Spacing anti-patterns

Never introduce:

- Random margin and padding values.
- Different spacing between identical components.
- Excessive empty space.
- Cramped cards.
- Unnecessary nested padding.
- Inconsistent page gutters.
- Misaligned section boundaries.
- Fixed heights that cut off content.
- Desktop layouts squeezed into mobile screens.
- Huge gaps used to hide weak content hierarchy.
- Different gaps for components performing the same role.
- Arbitrary negative margins to fix broken layouts.
- Excessive whitespace in data-heavy dashboards.
- Unnecessary wrapper elements solely to add spacing.

Avoid using `margin` to compensate for an incorrect component structure.

Prefer consistent layout primitives and `gap` for relationships between sibling elements.

---

## 14. Implementation rules for AI coding agents

Whenever modifying spacing:

1. Read this file first.
2. Inspect existing spacing tokens and layout components.
3. Reuse existing spacing variables.
4. Understand the page's content density.
5. Identify the relationship between elements before changing gaps.
6. Prefer design tokens over arbitrary values.
7. Check cumulative nested padding.
8. Verify horizontal and vertical alignment.
9. Test mobile, tablet and desktop.
10. Test longer content and translated labels.
11. Check for clipping, overflow and accidental layout shifts.
12. Preserve existing functionality.

Do not redesign unrelated components.

Do not remove content to make a layout appear cleaner.

Do not rewrite large sections of code unnecessarily.

Do not introduce a second spacing system.

When a design exception is necessary, document the reason in the code or relevant component documentation.

---

## 15. Final spacing audit checklist

Before declaring a spacing task complete:

- [ ] Existing spacing tokens have been inspected.
- [ ] The 4px foundation and 8px primary rhythm are respected.
- [ ] Related elements are grouped together.
- [ ] Independent sections are clearly separated.
- [ ] Page gutters are consistent.
- [ ] Cards use appropriate internal padding.
- [ ] Forms have consistent field spacing.
- [ ] Tables remain comfortable to scan.
- [ ] Dashboard density matches the task.
- [ ] Marketing pages have intentional visual rhythm.
- [ ] Storefront layouts respect their business category.
- [ ] Nested padding has been checked.
- [ ] Alignment is consistent.
- [ ] Mobile layouts do not feel cramped.
- [ ] Desktop layouts do not feel excessively empty.
- [ ] Translated content does not break the layout.
- [ ] Interactive controls have adequate target areas.
- [ ] No unnecessary arbitrary spacing values were introduced.
- [ ] Existing functionality remains intact.

---

## 16. Reference standards

Use these references when making spacing decisions:

1. U.S. Web Design System — Spacing units  
   https://designsystem.digital.gov/design-tokens/spacing-units/

2. Material Design 3 — Grids and spacing  
   https://m3.material.io/foundations/layout/grids-spacing

3. Canadian Government Design System — Spacing  
   https://design-system.canada.ca/en/foundations/spacing/

4. Queensland Government Design System — Spacing  
   https://www.designsystem.qld.gov.au/styles/spacing

5. W3C — WCAG 2.2  
   https://www.w3.org/TR/WCAG22/

6. W3C — Understanding Reflow  
   https://www.w3.org/WAI/WCAG22/Understanding/reflow.html

Use these as research references, not as instructions to copy another design system.

---

**Final principle:** Spacing should make FeraSetu feel effortless. Users should never have to fight through clutter, nor should they have to travel through unnecessary empty space to complete their work.
