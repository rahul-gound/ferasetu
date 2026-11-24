# FeraSetu Typography Rules

> **Purpose:** Establish a consistent, premium, readable and accessible typography system across FeraSetu.
>
> **Core principle:** Typography should make every interaction feel clear, calm and intentional. It must help merchants understand information quickly without making them work to read it.

---

## 1. Typography philosophy

FeraSetu typography must communicate:

- Trust without looking corporate and lifeless.
- Premium quality without unnecessary decoration.
- Confidence without excessive boldness.
- Simplicity without becoming visually plain.
- Personality without sacrificing readability.
- Consistency without making every page look identical.

Typography is not decoration. It is part of the product's usability.

Every text element must have a clear purpose and a deliberate visual hierarchy.

### The five priorities

1. Legibility.
2. Hierarchy.
3. Consistency.
4. Personality.
5. Performance.

Never sacrifice the first three for visual styling.

## 2. Font family strategy

### 2.1 Primary typeface

Use one strong, highly readable sans-serif family as the default interface typeface.

Before selecting or replacing a font:

- Inspect the existing project font.
- Evaluate its lowercase and uppercase characters.
- Check its x-height and readability at 12–16px.
- Inspect punctuation, numerals and currency symbols.
- Check how Regular, Medium, Semibold and Bold weights render.
- Test it on real dashboard content.
- Test it with English and Indian scripts.
- Check whether the font loads reliably.

Do not automatically select Inter, Roboto, or another popular font because it is familiar.

Do not replace a good existing font merely to make the design appear different.

### 2.2 Font pairing

Default to one type family across the merchant dashboard.

A second typeface is optional for marketing or selected storefront themes, but only when it creates a meaningful brand distinction.

A second font must:
- Complement the primary font.
- Have a clear purpose.
- Work with the brand identity.
- Support required languages.
- Avoid unnecessary loading cost.

Never use multiple fonts simply to make a page look designed.

### 2.3 Font weights

Use a deliberate weight system:

| Weight | Usage |
|---|---|
| 400 Regular | Body text, descriptions and normal content |
| 500 Medium | Navigation, labels and subtle emphasis |
| 600 Semibold | Page headings, card headings and important values |
| 700 Bold | Selected marketing headlines and strong emphasis |

Avoid thin and ultralight weights in functional interfaces.

Do not make every heading bold. Hierarchy should come from a combination of size, weight, spacing and contrast.

## 3. FeraSetu type scale

Use these as initial design tokens. Adjust only when actual font metrics, content or usability testing justify a change.

| Token | Size | Weight | Line height | Purpose |
|---|---:|---:|---:|---|
| Display | 56px | 600 | 1.05 | Major marketing headlines |
| H1 | 36px | 600 | 1.15 | Main page heading |
| H2 | 28px | 600 | 1.2 | Major sections |
| H3 | 22px | 600 | 1.3 | Subsections |
| H4 | 18px | 600 | 1.35 | Card and panel headings |
| H5 | 16px | 600 | 1.4 | Smaller headings |
| H6 | 14px | 600 | 1.4 | Minor headings |
| Body Large | 18px | 400 | 1.6 | Introductory content |
| Body | 16px | 400 | 1.5 | Default reading text |
| Body Small | 14px | 400 | 1.5 | Supporting information |
| Caption | 13px | 400 | 1.45 | Secondary metadata |
| Micro | 12px | 500 | 1.4 | Rare compact metadata |

These are role-based tokens, not permission to create arbitrary new sizes.

### Minimum-size guidance

- Prefer 16px for normal body text.
- Use 14px for secondary interface information.
- Use 12–13px only for short, genuinely secondary information.
- Never make essential instructions, form labels or important statuses difficult to read by shrinking them.
- Do not use 10px text in ordinary interfaces.

A dense interface is not automatically an efficient interface.

## 4. Heading hierarchy

Headings must describe the actual structure of the page.

### Rules

- One clear primary page heading.
- Use H2 for major sections.
- Use H3 for subsections.
- Continue the hierarchy logically.
- Do not skip heading levels just to obtain a desired font size.
- Use CSS classes or design tokens when visual styling differs from semantic structure.
- Keep headings concise and meaningful.

### Heading appearance

Marketing headings may be expressive, but must remain easy to understand.

Dashboard headings should be direct and functional.

Avoid:
- Extremely tight line heights.
- Excessive uppercase headings.
- Unnecessary italic headings.
- Multiple competing large headings.
- Long headings stretched across the entire screen.

## 5. Line height and spacing

Line height determines how comfortably people can follow text.

Use these guidelines:

| Text type | Line height |
|---|---:|
| Display headings | 1.05–1.15 |
| Page headings | 1.1–1.2 |
| Section headings | 1.2–1.35 |
| Short UI text | 1.2–1.4 |
| Body paragraphs | 1.5–1.65 |
| Long-form reading | 1.55–1.7 |

Rules:

- Use unitless line-height values.
- Avoid cramped paragraphs.
- Avoid excessively loose headings.
- Give paragraphs meaningful separation.
- Allow multi-line text to grow naturally.
- Never clip descenders or accents.
- Do not use fixed heights that cut off text.

Typography spacing must work together with the existing spacing system. Do not create a competing spacing scale inside this file.

## 6. Letter spacing and text transformation

Letter spacing must be subtle and intentional.

Guidelines:

- Normal body text: approximately 0.
- Large display headings: slightly negative tracking may be appropriate.
- Small uppercase labels: modest positive tracking may be appropriate.
- Buttons and navigation: generally normal tracking.
- Avoid wide tracking on long sentences.
- Never apply uppercase transformations to entire paragraphs.

Do not force English letter-spacing conventions onto scripts where they damage character shaping or readability.

Use `text-transform` for presentation only. Preserve the original text and correct capitalization in the content itself.

## 7. Reading width and alignment

Text should be easy to scan and follow.

For long-form English reading:

- Target approximately 60–75 characters per line.
- Keep most paragraphs within the recommended 45–90 character range.
- Use a narrower measure for large introductory text.
- Allow short metadata and compact UI text to use different widths.

Rules:

- Default to left alignment for left-to-right content.
- Use right alignment for suitable numerical columns.
- Use centered alignment for short, intentional hero statements or empty states.
- Avoid justified paragraphs.
- Do not center long paragraphs.
- Do not stretch reading content across excessively wide screens.

For right-to-left languages, use appropriate direction-aware alignment.

## 8. Responsive typography

Typography must adapt to the available space.

### Desktop

- Maintain a clear hierarchy.
- Use comfortable reading widths.
- Avoid oversized dashboard headings.
- Give major marketing headings room to breathe.

### Tablet

- Reduce display sizes where necessary.
- Prevent headings from colliding with navigation.
- Allow content to reflow.
- Avoid forcing desktop layouts into narrow screens.

### Mobile

- Prioritize readability over fitting more content.
- Use sensible heading sizes.
- Allow navigation labels and business names to wrap where appropriate.
- Stack content when horizontal space becomes insufficient.
- Avoid clipped prices, buttons and form labels.
- Keep important text readable without zooming.

### Fluid sizing

Use `clamp()` for elements that benefit from gradual scaling, especially display headings.

Example:

```css
.hero-title {
  font-size: clamp(2.25rem, 5vw, 3.5rem);
  line-height: 1.08;
}
```

Do not use viewport units alone for body text. Text must remain usable when the viewport or browser zoom changes.

## 9. Merchant dashboard typography

The dashboard is a working environment, not a marketing poster.

It must feel calm, predictable and effortless to scan.

### Page headings

Clearly communicate the current page and its purpose.

### Navigation

- Keep labels readable.
- Use consistent font weight and size.
- Do not make every navigation item bold.
- Preserve enough room for longer labels.
- Make active states clear without relying only on typography.

### Cards and panels

- Give card headings clear distinction from supporting text.
- Keep descriptions readable.
- Avoid too many different text sizes inside one card.
- Use a consistent hierarchy across similar cards.

### Tables

- Use consistent typography for all comparable columns.
- Keep column headings distinguishable from values.
- Align numbers appropriately.
- Use tabular numerals where values need visual comparison.
- Allow important names and values to remain readable.
- Do not solve table overflow by making all text tiny.
- On mobile, consider stacked rows, responsive columns or horizontal scrolling when appropriate.

### Prices and numerical data

Use tabular numerals for prices, totals, analytics and values that should align.

Example:

```css
.numeric-value {
  font-variant-numeric: tabular-nums;
}
```

Do not force tabular numerals onto every text element.

Preserve currency symbols, decimal precision and localized number formatting.

### Forms

- Labels must be visually distinct from entered values.
- Placeholder text must not replace a real label.
- Error messages must be readable and clearly associated with their fields.
- Help text must remain legible.
- Long labels must wrap without overlapping controls.

### Buttons

Follow `button-rule.md` for button appearance and interaction.

Typography inside buttons must remain readable, vertically centered and consistent across variants.

Do not shrink button text to force long labels into narrow buttons.

## 10. Marketing and storefront typography

Marketing typography should express FeraSetu's belief:

"Your business is yours. The internet should be too."

Use a confident, clear typographic hierarchy.

### Marketing pages

- Use expressive but readable display headings.
- Keep supporting descriptions narrower than the full viewport.
- Avoid making every section headline oversized.
- Give headlines appropriate line breaks.
- Maintain consistent type relationships between sections.
- Use emphasis selectively.

### Storefronts

FeraSetu supports different business types. Typography should respect the identity of each storefront.

Examples:

- Ecommerce: clear product names, prices and descriptions.
- Gym: confident headings and highly readable membership information.
- Consulting: professional, restrained and editorial typography.
- Local shops: friendly, practical and easy-to-read content.

Do not impose one decorative typeface on every merchant's storefront.

Merchant-selected typography must not damage core usability or accessibility.

## 11. Multilingual and Indian-script support

This is a mandatory product requirement.

FeraSetu serves merchants internationally. Typography must not be designed only around English.

### Required testing

Test real content in:

- English.
- Hindi.
- Marathi.
- Bengali.
- Gujarati.
- Tamil.
- Telugu.
- Kannada.
- Malayalam.
- Punjabi.

Also test any additional languages supported by the product.

### Rules

- Select fonts with the required glyph coverage.
- Use appropriate script-specific fallback fonts where needed.
- Evaluate actual glyph rendering, not just font metadata.
- Test conjuncts, vowel signs, matras and punctuation.
- Check line height for scripts with taller or more complex glyph structures.
- Avoid clipping above or below characters.
- Allow longer translated labels to wrap.
- Do not assume English text width predicts translated text width.
- Preserve correct Unicode text and browser shaping.
- Never manually simulate script shaping with CSS spacing.

A possible fallback strategy:

```css
body {
  font-family:
    "Existing Project Sans",
    "Noto Sans Devanagari",
    "Noto Sans",
    system-ui,
    sans-serif;
}
```

This is illustrative, not a mandatory font selection. Choose the correct fallback order based on the actual font's glyph coverage and the scripts supported.

For additional scripts, add suitable fallbacks only when needed.

Do not download a huge collection of language fonts unnecessarily.

## 12. Accessibility requirements

Target WCAG 2.2 Level AA.

### Text contrast

- Normal text: minimum 4.5:1 contrast.
- Large text: minimum 3:1 contrast.
- Do not use low-contrast gray text for important information.
- Do not rely on color alone to communicate meaning.

### Text resizing

- Support browser zoom and text resizing up to 200% without loss of content or functionality.
- Avoid fixed-height text containers.
- Ensure controls and form fields adapt to enlarged text.
- Prevent overlap and clipping.

### Text spacing

Content must remain usable when users override:

- Line height to at least 1.5 times font size.
- Paragraph spacing to at least 2 times font size.
- Letter spacing to at least 0.12 times font size.
- Word spacing to at least 0.16 times font size.

These are WCAG text-spacing test conditions, not mandatory default values for every component.

### Other requirements

- Preserve semantic HTML headings.
- Do not use images of text for ordinary content.
- Ensure meaningful labels remain available to assistive technologies.
- Do not communicate status through font weight or color alone.
- Check keyboard focus and visible text.
- Test with screen readers where practical.

## 13. Font loading and performance

Typography must not make the interface slow.

Rules:

- Prefer WOFF2 for self-hosted web fonts.
- Load only necessary font families and weights.
- Prefer variable fonts when they reduce the number of required files without introducing compatibility problems.
- Avoid loading unused font weights.
- Use appropriate `font-display` behavior.
- Provide a reliable system fallback.
- Avoid invisible text while waiting for fonts.
- Reduce layout shifts when custom fonts replace fallback fonts.
- Preload only critical fonts when justified.
- Use language subsets only when configured and tested correctly.
- Do not add font dependencies without a clear benefit.

Font loading must be tested on slow mobile connections.

## 14. Design tokens

Use centralized tokens instead of scattered arbitrary values.

Illustrative CSS:

```css
:root {
  --font-interface: "Existing Project Sans", system-ui, sans-serif;

  --text-display: clamp(2.25rem, 5vw, 3.5rem);
  --text-h1: 2.25rem;
  --text-h2: 1.75rem;
  --text-h3: 1.375rem;
  --text-h4: 1.125rem;
  --text-h5: 1rem;
  --text-h6: 0.875rem;

  --text-body-lg: 1.125rem;
  --text-body: 1rem;
  --text-body-sm: 0.875rem;
  --text-caption: 0.8125rem;
  --text-micro: 0.75rem;

  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;

  --leading-display: 1.08;
  --leading-heading: 1.2;
  --leading-ui: 1.35;
  --leading-body: 1.5;
  --leading-reading: 1.65;
}
```

This is a starting reference. Inspect the project's existing architecture before implementation.

If equivalent tokens already exist, improve and reuse them rather than creating duplicate systems.

Do not blindly copy these example values into production.

## 15. Anti-patterns

Never introduce:

- Random font families across pages.
- Excessive bold text.
- Thin, barely visible text.
- Tiny essential information.
- Arbitrary letter spacing.
- Excessive uppercase text.
- Unnecessarily oversized headings.
- Long paragraphs spanning the entire viewport.
- Fixed-height containers that clip text.
- Inconsistent heading hierarchies.
- Too many font weights.
- Decorative fonts in complex dashboard interfaces.
- Text shadows used to compensate for poor contrast.
- Different typography for components that perform the same role.
- Forced English-only layout assumptions.
- Text that breaks when translated.
- Unnecessary font downloads.
- Font changes made only because a new font looks trendy.

## 16. Implementation rules for AI coding agents

Whenever modifying typography:

1. Read this file first.
2. Inspect existing font and token definitions.
3. Reuse existing design-system components and tokens.
4. Do not introduce new fonts without justification.
5. Do not create arbitrary one-off font sizes.
6. Preserve semantic HTML.
7. Test desktop, tablet and mobile.
8. Test long content and translated content.
9. Test text enlargement and wrapping.
10. Verify that the change improves the actual experience.

Do not redesign unrelated parts of the application while changing typography.

Do not replace large sections of existing code unnecessarily.

Do not remove content or functionality to make typography fit.

If a proposed change conflicts with an existing rule, identify the conflict instead of silently ignoring either rule.

## 17. Final typography audit checklist

Before declaring a typography task complete, verify:

- [ ] The font family has been deliberately selected.
- [ ] The hierarchy is immediately understandable.
- [ ] The type scale is consistent.
- [ ] Body text is comfortable to read.
- [ ] Headings have appropriate line height.
- [ ] Paragraph widths are controlled.
- [ ] Navigation and forms remain readable.
- [ ] Tables and prices are easy to scan.
- [ ] Mobile text does not clip or overflow.
- [ ] Hindi and other supported scripts render correctly.
- [ ] Currency symbols and numerals render correctly.
- [ ] Browser zoom does not break the layout.
- [ ] Text contrast meets WCAG AA.
- [ ] Font loading does not cause avoidable layout shifts.
- [ ] Existing components and tokens have been reused.
- [ ] No unnecessary font families or arbitrary sizes were introduced.

---

## 18. Reference standards

Use these sources when making typography decisions:

1. Apple Human Interface Guidelines — Typography  
   https://developer.apple.com/design/human-interface-guidelines/typography

2. U.S. Web Design System — Typography  
   https://designsystem.digital.gov/components/typography/

3. U.S. Web Design System — Typesetting tokens  
   https://designsystem.digital.gov/design-tokens/typesetting/overview/

4. W3C — WCAG 2.2  
   https://www.w3.org/TR/WCAG22/

5. W3C — Understanding Text Spacing  
   https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html

6. web.dev — Best practices for fonts  
   https://web.dev/articles/font-best-practices

7. web.dev — Typography  
   https://web.dev/learn/design/typography

Use these references as guidance, not as permission to copy another company's design system.

---

**Final principle:** Every word in FeraSetu should look like it belongs there. Typography should quietly build trust, reduce cognitive effort and make the product feel carefully crafted.
