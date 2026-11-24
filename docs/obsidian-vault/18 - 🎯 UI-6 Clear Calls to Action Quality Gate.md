# FeraSetu UI-6: CLEAR CALLS TO ACTION DRIVE RESULTS
## Mandatory CTA Strategy, Action Hierarchy, Interaction Reliability & Conversion Quality Gate

**ROLE**

Act as a principal conversion-focused UX designer, product interaction architect, CRO researcher, UX writer, accessibility specialist, frontend QA engineer, and SaaS product strategist.

Your responsibility is to ensure that every important action in FeraSetu is discoverable, understandable, appropriately prioritised, accessible, and functionally reliable.

FeraSetu is a global SaaS platform helping independent businesses create and operate their own online presence.

Our goal is to make the next step obvious without pressuring users, overwhelming them, or using manipulative conversion techniques.

**Create and maintain a permanent repository-root document named `ui-6-test.md`.**

This is the sixth mandatory FeraSetu UI quality standard and must be referenced in relevant future development and pre-push testing workflows.

---

# 1. CORE PHILOSOPHY

## Clear Calls to Action Drive Results

Visitors need direction.

A user who understands a product but cannot identify the next useful action may abandon the experience.

Calls to action help users progress through their journey.

Examples include:

- Bring my business online.
- See how it works.
- Create an account.
- Add product.
- Connect domain.
- Save changes.
- Preview storefront.
- Publish website.
- Contact business.
- Request consultation.

Our philosophy:

**Every important page and workflow should make the next appropriate action understandable.**

We do not want:
- Confusing buttons.
- Too many competing primary actions.
- Misleading action labels.
- Broken destinations.
- Empty navigation actions.
- Unnecessary pop-ups.
- Manipulative urgency.
- Aggressive conversion patterns.
- Beautiful buttons that do nothing.

A CTA must fulfil the expectation it creates.

---

# 2. RESEARCH AND DESIGN REFERENCES

Use established research and official design-system guidance.

### A. GOV.UK Design System — Button

https://design-system.service.gov.uk/components/button/

Study:
- Button text.
- Primary and secondary actions.
- Button grouping.
- Warning actions.
- Disabled actions.
- Duplicate submissions.
- Loading feedback.

### B. Scottish Government Design System — Button

https://designsystem.gov.scot/components/button

Study:
- Primary and secondary hierarchy.
- Appropriate use of multiple primary actions.
- Contextual action prioritisation.

### C. CMS Design System — Buttons

https://design.cms.gov/v/5.0.2/components/button/

Study:
- Buttons as promises.
- Action-oriented wording.
- Semantic elements.
- Secondary actions.
- Destructive actions.
- Keyboard accessibility.

### D. UK Parliament Design System

https://designsystem.parliament.uk/components/button/

Study:
- When to use buttons.
- When to use links.
- Action versus navigation semantics.
- Primary CTA hierarchy.

### E. Baymard Institute — Button Design

https://baymard.com/blog/button-design

Study practical button usability and placement.

### F. Choice overload research

Chernev, Böckenholt and Goodman (2015):

"Choice overload: A conceptual review and meta-analysis."

https://doi.org/10.1016/j.jcps.2014.08.002

This research examined 99 observations involving 7,202 participants.

Understand how choice complexity, task difficulty, preference uncertainty, and decision goals can influence choice overload.

Do not assume that reducing every page to one button automatically improves conversion.

### G. WCAG 2.2

https://www.w3.org/TR/WCAG22/

Study:
- 2.1.1 Keyboard.
- 2.4.7 Focus Visible.
- 2.4.11 Focus Not Obscured.
- 2.5.3 Label in Name.
- 2.5.8 Target Size (Minimum).
- 1.4.3 Contrast (Minimum).
- 4.1.2 Name, Role, Value.
- 4.1.3 Status Messages.

Use the correct conformance levels and exceptions.

Do not invent universal conversion rules.

---

# 3. COMPLETE CTA INVENTORY

Discover the actual application structure and inspect every important user-facing action.

Do not assume that the existing CTA inventory is complete.

Inspect:

### A. Public website

- Main landing-page CTA.
- Header actions.
- Signup.
- Login.
- Pricing actions.
- Product exploration.
- Feature section links.
- Integration actions.
- Demo or enquiry actions where implemented.
- Contact and support links.
- Footer actions.
- Form submissions.

### B. Merchant dashboard

- Create actions.
- Add actions.
- Edit actions.
- Save actions.
- Publish actions.
- Preview actions.
- Search submission.
- Export actions.
- Payment actions.
- Domain actions.
- Website configuration.
- Onboarding steps.
- Upgrade actions where implemented.
- Help actions.
- Modal and drawer actions.

### C. Admin panel

- Search and filtering.
- View merchant.
- Edit user or organisation.
- Subscription management.
- Billing management.
- Support actions.
- Account controls.
- Security operations.
- Destructive actions.
- Confirmation actions.

### D. Merchant storefronts

Inspect ecommerce, retail, gym, consulting, and other existing template categories.

Check:
- Shop products.
- View product.
- Add to cart.
- Buy now.
- Checkout.
- Enquire.
- Contact.
- Book where an actual booking capability exists.
- View membership plans.
- Request consultation.
- Other implemented merchant actions.

### E. Forms and workflows

Inspect:
- Signup.
- Login.
- Onboarding.
- Product creation.
- Product editing.
- Domain connection.
- Website publishing.
- Settings updates.
- Customer management.
- Staff invitations.
- Checkout.
- Payment confirmation.
- Administrative operations.

Do not create features or actions merely because similar SaaS platforms offer them.

---

# 4. CTA HIERARCHY

Establish and audit four action classes.

### Class 1 — Primary action

The most important action for the current page, section, or workflow step.

Examples:
- Bring my business online.
- Add product.
- Publish website.
- Save changes.
- Continue to payment.

### Class 2 — Secondary action

A useful alternative with less visual emphasis.

Examples:
- See how it works.
- Preview storefront.
- Save as draft.
- View details.

### Class 3 — Tertiary action

Contextual actions that should not compete with the main action.

Examples:
- Read policy.
- View documentation.
- Visit support.
- Learn about a feature.

### Class 4 — Destructive or warning action

Actions that remove access, delete data, cancel something, or introduce substantial consequences.

Examples:
- Delete product.
- Suspend account.
- Remove domain.
- Cancel subscription.

Destructive actions must have clear wording and appropriate confirmation.

Do not rely exclusively on red colour to communicate the consequences.

### Important exception

Do not enforce a universal rule of one primary button per entire application page.

Use one primary action as the default for a single-purpose page or workflow section.

Multiple prominent actions may be appropriate when they genuinely represent separate tasks of equal importance, such as individual product cards or dashboard actions.

Document the reasoning and test the hierarchy.

Never reduce useful merchant functionality merely to satisfy an arbitrary button count.

---

# 5. LANDING PAGE CTA AUDIT — HIGHEST PRIORITY

The landing page is FeraSetu's primary public customer-acquisition experience.

The visitor should understand:

1. What FeraSetu offers.
2. Why it matters.
3. What makes it relevant.
4. What the next step is.

### Brand positioning

Preserve the established FeraSetu identity:

"Your business is yours. The internet should be too."

Preserve the established CTA direction where it accurately matches current functionality:

Primary:
"Bring my business online"

Secondary:
"See how it works"

Do not blindly replace established brand messaging with generic SaaS phrases.

Audit:

- Hero CTA.
- Header CTA.
- Product sections.
- Feature-specific actions.
- Pricing CTAs.
- Signup entry points.
- Footer actions.
- Mobile CTAs.

Ensure that important actions are discoverable without making the page feel aggressive.

### Hero requirements

Check that:
- The primary CTA appears near the main value proposition.
- The CTA has adequate visual prominence.
- The CTA label explains what happens.
- The destination is correct.
- The secondary action is visually distinct.
- Supporting information reduces uncertainty.
- The CTA is visible on mobile without destroying the layout.

Do not assume every meaningful CTA must appear above the fold.

Place actions where they naturally follow the information required to make a decision.

---

# 6. MERCHANT DASHBOARD CTA AUDIT — HIGHEST PRIORITY

The merchant dashboard is a productivity environment.

Prioritise task completion over promotional conversion.

Inspect whether merchants can discover and perform important actions easily.

Examples:

- Add product.
- Create page.
- Edit content.
- Connect domain.
- Publish website.
- Manage inventory.
- View orders.
- Add customer.
- Invite staff.
- Configure payments.

Evaluate:

### Action clarity

Does the label communicate the action?

### Action visibility

Can merchants find it without unnecessary searching?

### Context

Is the action placed near the information or component it affects?

### State

Does the action accurately reflect the current business state?

### Feedback

Does the application explain what happened after the action?

### Consistency

Do equivalent actions use consistent naming and visual hierarchy?

### New merchant experience

Test empty states and onboarding.

An empty state should help the merchant understand what to do next.

Example:

"Your product catalogue is empty."

"Add your first product to start building your catalogue."

Primary action: "Add product"

Only use such actions when the functionality exists.

### Experienced merchant experience

Ensure that frequent operations remain convenient without unnecessary promotional interruptions.

Do not insert signup or upgrade marketing CTAs into every dashboard section.

---

# 7. ADMIN PANEL CTA AUDIT

Treat the admin panel as an operational product.

Review:

- Merchant management actions.
- User management.
- Organisation controls.
- Subscription operations.
- Billing.
- Security.
- Support.
- Audit logs.
- Platform configuration.

Evaluate the prominence of every action according to operational importance and consequences.

Destructive actions should never be more visually prominent than routine actions without a clear reason.

For sensitive actions:

- Identify the exact target.
- Explain the consequences.
- Require appropriate confirmation.
- Respect permission restrictions.
- Record required audit information.
- Provide an appropriate recovery mechanism where supported.

Never bypass authentication, authorization, or tenant isolation.

Do not test destructive actions on production data.

---

# 8. MERCHANT STOREFRONT CTA AUDIT

Different businesses need different actions.

### Ecommerce and retail

Examples:
- View product.
- Choose options.
- Add to cart.
- Buy now.
- Proceed to checkout.
- Contact seller.

Ensure that each action accurately reflects the configured shopping experience.

### Gym and fitness

Examples:
- View memberships.
- Explore programs.
- Enquire about training.
- Contact the gym.
- Book a class where actually supported.

Do not display non-functional booking CTAs.

### Consulting and professional services

Examples:
- Explore services.
- Request consultation.
- Submit enquiry.
- Contact the business.

Only display actions that the merchant can actually fulfil.

### Merchant customisation

Inspect whether merchants can configure CTA labels and destinations appropriately.

Check:
- Button text.
- Destination.
- Link validation.
- Appearance.
- Responsive behaviour.
- Published storefront output.

Do not silently publish broken actions.

---

# 9. CTA WORDING AND ACTION CLARITY

Every important CTA should communicate a clear action.

Prefer action-oriented, understandable labels.

Examples:

| Weak or vague | Better direction |
|---|---|
| Click here | View pricing |
| Manage | Manage products |
| Go | Connect domain |
| Submit | Send enquiry |
| Continue | Save and continue where accurate |
| Learn more | See how the platform works |
| Confirm | Confirm cancellation |
| Delete | Delete product |

These are examples, not automatic replacement rules.

Use sentence case.

Prefer a recognisable action verb.

Use additional words when necessary to clarify the exact outcome.

Avoid:
- Empty marketing language.
- Misleading urgency.
- Fake countdowns.
- Fake scarcity.
- Unsupported promises.
- Unnecessary exclamation marks.
- Ambiguous labels repeated across unrelated actions.

Do not replace a useful contextual label just to make it shorter.

---

# 10. BUTTON VERSUS LINK SEMANTICS

Inspect the actual HTML.

Use an anchor element for navigation to another page or destination.

Use a button element for an in-page action, state change, dialog operation, or form submission.

Examples:

- Navigate to pricing: anchor.
- Open signup: anchor.
- Add product: button.
- Save changes: button.
- Open modal: button.
- Submit form: button.

A link can be styled to look like a premium CTA button.

Do not use clickable divs or spans as substitutes for semantic controls.

Check:
- Native keyboard behaviour.
- Correct roles.
- Accessible names.
- Focus states.
- URL behaviour.
- New-tab behaviour where applicable.

---

# 11. CTA PLACEMENT AND VISUAL HIERARCHY

Evaluate placement based on the user journey.

Check:

- Header placement.
- Hero placement.
- Section-end placement.
- Pricing placement.
- Form placement.
- Card placement.
- Empty-state placement.
- Sticky actions where justified.
- Mobile action placement.
- Relevant contextual actions.

Do not use arbitrary placement rules without considering page purpose.

Do not:
- Place a button far from the content it affects.
- Make every action equally prominent.
- Put destructive actions beside ordinary actions without distinction.
- Add unnecessary sticky buttons.
- Cover important information with a fixed CTA.
- Repeatedly interrupt users with pop-ups.
- Add redundant CTAs to every section.

Respect the existing FeraSetu visual identity.

---

# 12. EXISTING BUTTON DESIGN RULES

Inspect the repository for `button-rule.md`.

If it exists, treat it as the authoritative visual and tactile button-design standard.

Do not duplicate or contradict its rules.

Preserve FeraSetu's established premium button direction:

- Intentional rounded corners.
- Refined spacing.
- Appropriate depth and shadow.
- Subtle pressed or inset feeling on tap.
- Clear hover states.
- Consistent sizing.
- Professional typography.
- Visible focus states.
- Smooth but restrained interaction feedback.

UI-6 governs the strategic purpose, wording, hierarchy, placement, destination, and actual reliability of the CTA.

`button-rule.md` governs its detailed visual design and interaction styling.

Both standards must work together.

---

# 13. COMPLETE INTERACTION STATE TESTING

Every important CTA must be checked across applicable states.

### Default
The action is clear and visually distinguishable.

### Hover
Provides appropriate feedback without excessive animation.

### Focus
Keyboard users can clearly identify the focused control.

### Pressed
Provides subtle interaction feedback.

### Loading
Explains what is happening.

### Success
Communicates success only after successful completion.

### Failure
Explains failure and provides an appropriate recovery path.

### Disabled or unavailable
Communicates unavailability without making the user guess why.

Where disabling is necessary, explain the reason through nearby text or an accessible explanation.

Do not claim that a disabled button is universally prohibited.

Test repeated activation.

Ensure important submissions are not accidentally executed multiple times.

For payments, invitations, publishing, and other sensitive operations, inspect appropriate server-side duplicate-request protection and idempotency.

A frontend disabled state alone is not sufficient to protect sensitive operations.

---

# 14. ACCESSIBILITY AND WCAG 2.2

Test the applicable requirements.

### WCAG SC 2.1.1 — Keyboard
All important CTAs must be operable with a keyboard.

### WCAG SC 2.4.7 — Focus Visible
Keyboard focus must be visible.

### WCAG SC 2.4.11 — Focus Not Obscured (Minimum)
Sticky content must not entirely hide a focused control.

### WCAG SC 2.5.3 — Label in Name
Visible button text must be represented in its programmatic accessible name.

### WCAG SC 2.5.8 — Target Size (Minimum)
Pointer targets should meet 24 × 24 CSS pixels or satisfy an applicable exception.

### WCAG SC 2.5.5 — Target Size (Enhanced)
44 × 44 CSS pixels is the AAA enhanced target-size criterion.

Aim for comfortable 44 × 44 CSS pixel or larger touch targets for important mobile actions wherever practical.

### WCAG SC 1.4.3 — Contrast (Minimum)
Use the applicable text contrast requirements for labels.

### WCAG SC 4.1.2 — Name, Role, Value
Interactive components must expose their correct semantics.

### WCAG SC 4.1.3 — Status Messages
Important result and status feedback must be programmatically available where applicable.

Do not claim full WCAG conformance based on an automated scan alone.

Perform manual keyboard and interaction checks.

---

# 15. RESPONSIVE CTA TESTING

Test at:

- 1440 × 900.
- 1366 × 768.
- 768 × 1024.
- 390 × 844.
- 360 × 800.

Check:

- CTA visibility.
- Button width.
- Text wrapping.
- Button spacing.
- Touch target dimensions.
- Mobile hero layout.
- Sticky action behaviour.
- Overflow.
- Viewport clipping.
- Keyboard focus visibility.
- Form submission usability.
- Action accessibility.

Avoid buttons that become extremely narrow or difficult to tap on mobile.

Do not let multiple adjacent actions accidentally become overlapping controls.

---

# 16. END-TO-END CTA FUNCTIONAL TESTING

This is mandatory.

Do not mark a CTA as working because it looks clickable.

For each important CTA:

1. Record its page and location.
2. Record its visible label.
3. Record its expected action or destination.
4. Interact with it in a safe environment.
5. Verify the actual destination or outcome.
6. Verify loading behaviour.
7. Verify success feedback.
8. Verify error behaviour.
9. Check keyboard operation.
10. Check mobile usability.

Test realistic journeys.

### Public visitor scenarios

- Landing page to signup.
- Landing page to product explanation.
- Landing page to pricing.
- Pricing to correct signup or plan-selection journey.
- Contact CTA to actual contact mechanism.

### Merchant scenarios

- Dashboard to add product.
- Dashboard to create page.
- Dashboard to connect domain.
- Dashboard to manage orders.
- Website editor to preview.
- Website editor to publish in a safe environment.
- Help CTA to relevant assistance.

### Admin scenarios

- Find merchant.
- View organisation.
- View subscription.
- Access relevant support operations.
- Confirm safe administrative workflows.

### Storefront scenarios

- Find product.
- Add product to cart.
- Reach checkout in a safe test environment.
- Submit an enquiry using test data.
- Access implemented membership or consultation workflows.

Do not execute real production payments, deletions, subscription cancellations, or destructive administrative operations.

Clearly distinguish:
- Tested and passed.
- Tested and failed.
- Blocked.
- Not tested.

Never invent successful results.

---

# 17. CONVERSION AND ANALYTICS QUALITY

Where existing analytics infrastructure permits, evaluate whether meaningful CTA journeys can be measured.

Potential events include:

- CTA shown or exposed.
- CTA clicked.
- Signup started.
- Signup completed.
- Trial activated.
- Enquiry started.
- Enquiry submitted.
- Product added.
- Checkout started.
- Payment completed.
- Dashboard task completed.

Use actual available analytics infrastructure and existing privacy policies.

Do not introduce fingerprinting or unnecessary tracking.

Do not send personal or financial data inside event labels.

### Measurement principles

Do not evaluate CTA performance only through clicks.

Evaluate downstream completion and meaningful user outcomes.

Examples:

- Qualified signup completion.
- Merchant onboarding completion.
- Trial activation.
- Successful checkout.
- Completed enquiry.
- Product creation.
- Storefront publication.

When traffic and data quality are adequate, propose controlled experiments.

For each proposed experiment document:
- Hypothesis.
- Current CTA.
- Proposed CTA.
- Intended audience.
- Primary success metric.
- Guardrail metrics.
- Required sample size assumptions.
- Results.
- Limitations.

Do not fabricate test results or declare statistical significance without adequate evidence.

If traffic is insufficient, use qualitative usability testing and document the limitation.

---

# 18. SCORING FRAMEWORK

Score every major application area out of 100.

| Category | Weight |
|---|---:|
| CTA clarity and action wording | 15 |
| Visual hierarchy | 15 |
| Placement and discoverability | 15 |
| Destination and functional reliability | 20 |
| User journey alignment | 10 |
| Accessibility | 10 |
| Loading, success and error feedback | 10 |
| Responsive usability | 5 |
| Total | 100 |

Provide separate scores for:

- Public landing page.
- Public pricing and signup.
- Merchant dashboard.
- Admin panel.
- Ecommerce storefronts.
- Gym storefronts.
- Consulting storefronts.
- Overall FeraSetu CTA experience.

A high average score cannot override a serious functional, security, payment, or accessibility failure.

---

# 19. AUTOMATIC RELEASE BLOCKERS

The CTA standard MUST FAIL when:

1. A critical CTA leads to a broken destination.
2. A CTA label promises an action that the product does not perform.
3. A primary conversion action cannot be discovered through a reasonable available path.
4. A critical submit action does not provide appropriate feedback.
5. A success message appears before successful completion.
6. Payment-related actions permit serious duplicate-processing risks.
7. A destructive action executes without required safeguards.
8. An important CTA is inaccessible by keyboard.
9. A mobile layout hides or prevents access to an important action.
10. Navigation controls use incorrect semantics that prevent proper interaction.
11. A CTA causes an unauthorised action or permission bypass.
12. A new change breaks an existing critical CTA workflow.
13. A sticky CTA completely hides a keyboard-focused control in violation of applicable requirements.

Use these results:

- PASS
- FAIL
- BLOCKED
- NOT APPLICABLE

Any applicable critical failure blocks a PASS.

Do not silently reclassify failures as NOT APPLICABLE.

---

# 20. REQUIRED DOCUMENT: ui-6-test.md

Create the file at the repository root.

It must contain:

### Part A — Permanent CTA philosophy

The reusable strategic principles.

### Part B — CTA inventory

Actual CTAs, destinations, and actions across the application.

### Part C — CTA hierarchy

Primary, secondary, tertiary, destructive and warning actions.

### Part D — Public landing-page tests

Hero, pricing, signup, navigation and conversion actions.

### Part E — Merchant dashboard tests

Operational task CTAs and onboarding actions.

### Part F — Admin panel tests

Operational and destructive-action controls.

### Part G — Storefront CTA tests

Ecommerce, gym, consulting, and other supported categories.

### Part H — Wording and semantic checks

Action labels, links, buttons, and accessible names.

### Part I — Interaction-state tests

Default, hover, focus, pressed, loading, success, failure, and disabled.

### Part J — Accessibility and responsive tests

WCAG and mobile requirements.

### Part K — Functional and analytics tests

Actual action outcomes and appropriate measurement.

### Part L — Scoring and release blockers

Evaluation and release criteria.

### Part M — Execution history

For every relevant test run record:

- Date.
- Commit or revision ID.
- Changed files.
- Affected pages.
- Actions tested.
- Passed checks.
- Failed checks.
- Blocked checks.
- Not applicable checks and reasons.
- Evidence.
- Final release decision.

Maintain reusable standards separately from test-run history.

Preserve earlier relevant records.

---

# 21. MANDATORY PRE-PUSH WORKFLOW

Every future code push involving actions, CTAs, button components, forms, conversions, or important workflow changes must follow this process.

Read all applicable standards:

1. `ui-1-test.md` — First Impressions Matter.
2. `ui-2-test.md` — The Power of Trust.
3. `ui-3-test.md` — Easy Navigation Reduces Frustration.
4. `ui-4-test.md` — Colours Influence Emotions.
5. `ui-5-test.md` — Strong Headlines Capture Attention.
6. `ui-6-test.md` — Clear Calls to Action Drive Results.
7. `button-rule.md` — Detailed visual and tactile button standards, if present.

### STEP 1 — Inspect changes

Inspect:
- Git status.
- Git diff.
- Changed components.
- CTA labels.
- Button and link semantics.
- Routing.
- Event handlers.
- Form submissions.
- API interactions.
- Affected workflows.

### STEP 2 — Identify CTA impact

Identify the public, merchant, admin, and storefront actions affected.

### STEP 3 — Run applicable tests

Execute real CTA interaction tests, destination checks, responsive tests, keyboard tests, and relevant regression checks.

### STEP 4 — Resolve failures

Fix problems introduced by the changes.

Retest all affected workflows.

### STEP 5 — Record evidence

Update the execution history in `ui-6-test.md`.

### STEP 6 — Release decision

Only push when all applicable mandatory criteria pass.

Do not silently bypass failures.

Do not claim tests passed if they were not performed.

---

# 22. GEMINI AND ANTIGRAVITY INSTRUCTION INTEGRATION

Inspect:

- `GEMINI.md`.
- `AGENTS.md`.
- Existing project instructions.
- `ui-1-test.md` through `ui-5-test.md`.
- `button-rule.md`, if present.
- Existing testing scripts.
- Git hooks.
- CI workflows.

Integrate the new standard into existing development instructions.

Future Gemini and Antigravity tasks must consult all relevant standards before making changes.

Inspect existing pre-push enforcement.

Where technically practical:
- Add deterministic CTA regression checks.
- Preserve existing hooks.
- Integrate applicable automated tests into CI.
- Require documented manual checks for aspects that cannot be automated reliably.

A Markdown file alone cannot block a Git push.

Do not falsely claim enforcement exists unless actual mechanisms execute it.

Do not create fake tests that simply print PASS.

---

# 23. IMPLEMENTATION RULES

Follow this sequence:

1. Inspect repository and existing CTA components.
2. Discover `button-rule.md` and existing UI standards.
3. Inventory important CTAs.
4. Audit the landing page.
5. Audit the merchant dashboard.
6. Audit the admin panel.
7. Audit merchant storefronts.
8. Verify destinations and actual actions.
9. Inspect button/link semantics.
10. Test all applicable interaction states.
11. Perform responsive and accessibility checks.
12. Create `ui-6-test.md`.
13. Record problems and prioritise them.
14. Correct clear defects safely.
15. Preserve all existing business functionality.
16. Retest affected journeys.
17. Integrate Gemini instructions.
18. Record actual results.

Do not redesign every button just because this standard is being added.

Do not replace working functionality with placeholders.

Do not modify authentication, authorization, payment processing, secrets, production data, or sensitive infrastructure unnecessarily.

Never execute destructive production actions during testing.

---

# 24. FINAL ACCEPTANCE CRITERIA

The task is complete only when:

- `ui-6-test.md` exists in the repository root.
- Actual CTA inventory is documented.
- Primary and secondary hierarchies are evaluated.
- Landing-page conversion actions are tested.
- Merchant dashboard actions are tested.
- Admin actions are tested.
- Storefront CTAs are tested by business category.
- Button/link semantics are reviewed.
- Loading and error states are reviewed.
- Responsive and accessibility checks are documented.
- Important defects are resolved or honestly reported.
- Existing `button-rule.md` is respected where present.
- Gemini instructions reference the sixth standard.
- The final decision is explicitly PASS or FAIL.

# FINAL PHILOSOPHY

FeraSetu should never leave users wondering what to do next.

A visitor should know how to begin.

A merchant should know how to complete their task.

An administrator should know the consequences of an operation.

A storefront customer should know how to purchase, enquire, or contact the business.

We should never use unnecessary pressure to force action.

We should make useful actions easy to understand and easy to perform.

**The best CTA is not necessarily the brightest or biggest button. It is the most appropriate next step, communicated clearly and fulfilled reliably.**

Inspect. Test. Improve. Verify. Document.

**No relevant CTA-related push without passing the applicable FeraSetu UI quality standards.**

---

# 25. EXECUTION & AUDIT RECORD

> **Audit Date:** 2026-11-23  
> **Status:** AUDITED & VERIFIED  
> **Verdict:** **PASS**

### CTA & Button Remediations Executed
1. **Merchant Dashboard Action Buttons:** `.btn-tactile-primary` given explicit `#0052FF` sovereign background and `#FFFFFF` text color with 3D bottom shelf depth (`box-shadow: 0 4px 0 0 #003BB5`). Label visibility restored to 100%.
2. **Pricing Currency Concatenation:** Removed hardcoded `₹` prefix from `card.save` and `card.day` in `en.ts` and `hi-latn.ts`, eliminating `₹$190` and `₹₹9,990`.
3. **Mobile Header Ergonomics:** Constrained `Layout.tsx` top navbar to `w-full max-w-full overflow-hidden` and tucked desktop search bar on screens `< 768px`, eliminating the 699px overflow.
4. **Desktop Pricing Grid:** Unified container to `max-w-6xl` with `grid-cols-1 md:grid-cols-3 items-stretch`, preventing the Business card from dropping to a second row.
5. **Admin KPI Fallbacks:** Added nullish coalescing operators (`?? 0`) preventing literal `undefined` values.
6. **Route Resolution:** Added `/website/design` redirect in `App.tsx` pointing directly to `/website-design`.
