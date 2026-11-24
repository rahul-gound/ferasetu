# FeraSetu UI-3: EASY NAVIGATION REDUCES FRUSTRATION
## Mandatory Navigation, Information Architecture & Findability Quality Gate

**ROLE:** Act as a principal UX architect, information architect, usability researcher, navigation specialist, accessibility engineer, and SaaS product QA specialist.

You are responsible for ensuring that users can find what they need within FeraSetu quickly, naturally, and without unnecessary frustration.

FeraSetu is a global SaaS platform providing independent businesses with tools to establish and operate their online presence.

Its application includes a public marketing website, merchant dashboard, internal admin panel, and merchant storefronts.

Your responsibility is to ensure that every experience has an understandable information architecture and navigation system.

**Create and maintain a permanent repository-root document named `ui-3-test.md`. This must become a mandatory quality gate before pushing relevant code.**

---

# 1. CORE PHILOSOPHY: EASY NAVIGATION REDUCES FRUSTRATION

Nobody likes getting lost on a website.

When visitors cannot find information, they become frustrated, lose confidence, and may leave.

Users expect websites and applications to guide them naturally.

Good navigation helps users understand:

- Where am I?
- What can I find here?
- Where should I go next?
- How do I return to where I was?
- How can I accomplish my goal?

Our philosophy:

**The user should spend their time accomplishing their goals, not figuring out how FeraSetu works.**

Every navigation element should have a purpose.

Every section should have a logical location.

Every label should communicate what users can expect to find.

Every important action should be discoverable.

FeraSetu should feel straightforward even when it contains hundreds of features.

Do not remove useful functionality merely to make navigation look simple.

Organise complexity intelligently.

# 2. RESEARCH-BACKED NAVIGATION PRINCIPLES

Use established usability research and accessibility guidance.

Apply these principles:

### A. Information scent

Users decide where to navigate based on the wording of links, surrounding context, and what they expect to find.

Therefore:

- Use understandable navigation labels.
- Avoid vague names.
- Avoid unnecessary internal technical terminology.
- Ensure labels match the actual destination.
- Use consistent terminology across the product.
- Make important destinations easy to recognise.

Example:

"Manage Products" communicates more clearly than an unexplained internal label.

Do not create misleading labels to make the interface look sophisticated.

### B. Predictable information architecture

Related functionality should be grouped logically.

Users should be able to predict where a feature belongs.

Do not randomly distribute related functions throughout different menus.

### C. User-oriented navigation

Navigation should reflect how merchants, visitors, and administrators think about their work.

Do not organise menus entirely around internal engineering architecture or database structures.

### D. Consistency

Repeated navigation mechanisms should remain consistent across relevant pages.

Users should not have to learn a new navigation system whenever they open another section.

### E. Multiple discovery methods

For important destinations, evaluate whether users can reach them through appropriate methods such as:

- Main navigation.
- Contextual links.
- Search.
- Breadcrumbs.
- Related-page links.
- Help and guidance.

Do not force every page to appear in the main navigation.

### F. Task-oriented journeys

Some workflows have a natural sequence.

For example, setting up a new storefront may require:

1. Business information.
2. Products or services.
3. Design.
4. Domain.
5. Payment configuration.
6. Publishing.

For such workflows, use appropriate progress indicators or task lists rather than relying entirely on general-purpose navigation menus.

Do not mix sequential onboarding tasks with unrelated permanent navigation.

# 3. AUDIT THE ENTIRE APPLICATION

Discover every route and navigation mechanism in the actual repository and running application.

Do not assume the route inventory is complete.

Inspect:

- Header navigation.
- Footer navigation.
- Main menus.
- Sidebars.
- Nested menus.
- Dropdowns.
- Tabs.
- Breadcrumbs.
- Search.
- Contextual links.
- Buttons that navigate.
- Related-content links.
- Mobile navigation.
- Account menus.
- Organisation switchers.
- Back links.
- Onboarding navigation.
- Help navigation.

Create a complete navigation inventory and route map.

For every discovered navigation element document:

- Its visible label.
- Its location.
- Its destination.
- Its intended user.
- Whether it works.
- Whether its destination is understandable.
- Whether its location is appropriate.
- Whether it creates duplication or confusion.

# 4. PUBLIC WEBSITE NAVIGATION — HIGHEST PRIORITY

Audit `ferasetu.com` as a completely new visitor.

The website should make it easy to discover:

- What FeraSetu does.
- How the platform works.
- Product capabilities.
- Pricing.
- Templates or business use cases.
- Integrations.
- Security and privacy information.
- Support and contact information.
- Account signup and login.
- Important legal information.

Evaluate:

### Main navigation

- Are the most important destinations visible?
- Are labels understandable?
- Is the number and grouping of items appropriate?
- Are unrelated destinations mixed together?
- Are dropdowns necessary?
- Are CTAs visually distinguishable?
- Is the logo's navigation behaviour predictable?
- Are important links unnecessarily hidden?

### Visitor journey

Test these scenarios:

1. A visitor wants to understand FeraSetu.
2. A visitor wants to compare pricing.
3. A visitor wants to understand the trial conditions.
4. A visitor wants to view supported features.
5. A visitor wants to contact support.
6. A visitor wants to sign up.
7. A visitor wants to log in.
8. A visitor wants to read the privacy policy or terms.

Check that each destination can be found naturally.

### Landing-page navigation

A user should be able to understand the page structure without scrolling randomly.

Evaluate section headings, in-page links, anchor navigation, CTA placement, and footer navigation.

Do not add navigation elements simply because competitors have them.

# 5. MERCHANT DASHBOARD NAVIGATION — HIGHEST PRIORITY

This is one of the most important audits.

FeraSetu has multiple capabilities and business workflows.

The merchant dashboard must provide access to these capabilities without overwhelming merchants.

Inspect all existing sections, including:

- Dashboard.
- Orders.
- Products.
- Customers.
- Website and Design.
- Content and Pages.
- Domains.
- Analytics.
- Marketing and SEO.
- Payments.
- Inventory and Locations.
- Staff.
- Community.
- Integrations.
- FeraSetu AI.
- Help and Learning.
- Settings.

Discover any additional sections actually implemented.

### Sidebar audit

Check:

- Is the sidebar logically organised?
- Are related features grouped?
- Are the labels obvious?
- Are icons understandable?
- Are icons accompanied by labels where necessary?
- Is the active page clearly identifiable?
- Are nested sections predictable?
- Is sidebar expansion and collapse intuitive?
- Are important destinations unnecessarily buried?
- Is there duplication?
- Are there too many unrelated top-level destinations?
- Does the sidebar behave consistently across routes?

### Information architecture

Evaluate whether merchant tasks are grouped according to their actual purpose.

For example:

A merchant managing products should not need to search through unrelated settings sections.

A merchant configuring a website should easily discover related design, content, and domain capabilities.

A merchant managing daily operations should be able to identify orders, customers, payments, and inventory without guessing.

Do not force these examples into a rigid taxonomy if the actual user workflows indicate a better structure.

### Contextual navigation

Inspect whether users can naturally move between related functions.

Examples:

- Product management to inventory.
- Orders to customers.
- Website design to pages.
- Website management to domains.
- Analytics to relevant reporting.
- Integrations to their connected service settings.
- Help resources to relevant product sections.

These connections must be logical and useful, not excessive.

### New merchant experience

A new merchant should understand where to begin.

Check whether onboarding and initial setup have:

- A clear starting point.
- Logical ordering.
- Understandable progress.
- Appropriate next actions.
- Useful explanations.
- Clear completion states.
- Safe ways to return to previous steps.

Do not force merchants into unnecessary onboarding steps if they can accomplish their goals directly.

### Experienced merchant experience

Test whether an established merchant can repeatedly access important features without relearning the interface.

Predictability matters more than decorative navigation.

# 6. INTERNAL ADMIN PANEL NAVIGATION

Treat the admin panel as a distinct operational application.

Its users have different goals from merchants.

Evaluate whether administrators can efficiently locate:

- Users.
- Merchants.
- Organisations.
- Subscriptions.
- Billing information.
- Platform operations.
- Support cases.
- Analytics.
- Security controls.
- Audit logs.
- System configuration.

Inspect:

- Administrative navigation hierarchy.
- Search and filtering.
- Table navigation.
- Active section indicators.
- Nested management screens.
- Breadcrumbs.
- Account switching where supported.
- Access-controlled sections.
- Back and forward behaviour.

Ensure that sensitive operational actions are not unnecessarily mixed with ordinary browsing actions.

Do not expose navigation links or destinations to users without the appropriate permissions.

Do not bypass authorization or tenant isolation to make navigation work.

An inaccessible page must not become accessible simply by directly entering its URL.

# 7. MERCHANT STOREFRONT NAVIGATION

FeraSetu creates websites for different types of businesses.

The navigation experience must reflect the business category.

### Ecommerce and retail websites

Check:

- Main categories.
- Product discovery.
- Category hierarchy.
- Subcategories.
- Product pages.
- Cart.
- Checkout.
- Account and order tracking where implemented.
- Contact and policy information.

A customer should be able to browse products without getting lost.

### Gym and fitness websites

Check:

- Home.
- About the gym.
- Programs and services.
- Memberships.
- Trainers.
- Timetable.
- Enquiry or booking.
- Contact and location.

Only include sections supported by the merchant's actual website configuration.

### Consulting and professional services

Check:

- Services.
- About.
- Expertise.
- Case studies or portfolio, if genuine.
- Enquiry.
- Consultation booking, if implemented.
- Contact information.

Do not force the same navigation structure on every template.

The business owner should be able to create an appropriate navigation experience using the available builder functionality.

# 8. MOBILE NAVIGATION AUDIT

HIGHEST PRIORITY.

Desktop and mobile navigation are different interaction environments.

Do not simply shrink the desktop sidebar or header.

Test:

- 360 × 800.
- 390 × 844.
- 768 × 1024.
- 1366 × 768.
- 1440 × 900.

### Public mobile navigation

Check:

- Menu button visibility.
- Opening and closing.
- Menu hierarchy.
- Parent-category accessibility.
- Subcategory accessibility.
- Scroll behaviour.
- Touch targets.
- Outside-click behaviour where appropriate.
- Escape-key behaviour.
- Navigation after selection.
- Whether the menu blocks essential content.
- Whether users can return to the previous screen.

### Merchant dashboard mobile navigation

Check:

- Sidebar transformation.
- Drawer behaviour.
- Menu discoverability.
- Current-section identification.
- Nested navigation.
- Touch usability.
- Horizontal overflow.
- Scroll locking.
- Drawer closing behaviour.
- Navigation after orientation or viewport changes.

### Storefront mobile navigation

Check:

- Logo.
- Menu.
- Product categories.
- Search.
- Cart where applicable.
- Account options where applicable.
- Important business information.

Navigation must remain understandable and usable on small screens.

# 9. ROUTING AND NAVIGATION FUNCTIONALITY

Do not evaluate navigation only by appearance.

Test actual routing behaviour.

Inspect:

- Broken routes.
- Broken links.
- Incorrect destinations.
- Routes that lead to unexpected pages.
- Redirect loops.
- Duplicate routes.
- Incorrect active states.
- Missing page titles.
- Incorrect page breadcrumbs.
- Routes that fail on refresh.
- Deep links.
- Browser back.
- Browser forward.
- Browser refresh.
- Direct URL access.
- Authentication redirects.
- Permission-related redirects.
- External navigation.

### Important requirements

A user should be able to refresh a valid page without losing access to it.

A deep link should work when the user has the required permissions.

The browser back button should behave predictably.

Authentication redirects should preserve the intended destination where the existing authentication flow supports that behaviour.

Do not introduce unexpected redirects.

Do not silently lose user context when moving between related pages.

When a page is unavailable, show a helpful recovery path rather than a confusing dead end.

# 10. SEARCH AND FINDABILITY

Inspect every existing search experience.

Evaluate:

- Is search easy to discover?
- Is its purpose understandable?
- Does it search the expected scope?
- Are results relevant?
- Are results organised understandably?
- Can users identify the correct destination?
- Are loading states clear?
- Are errors handled?
- Are empty results useful?
- Are suggestions understandable?
- Can users navigate results using a keyboard?

For empty search results, provide useful recovery options where appropriate:

- Correct spelling.
- Try another keyword.
- Clear filters.
- Return to a relevant category.
- Browse available sections.

Do not create a search feature simply to compensate for poorly organised navigation.

Do not pretend that global search exists if only a local table search is implemented.

# 11. LABELS, ICONS AND TERMINOLOGY

Inspect every important navigation label.

Identify:

- Vague labels.
- Duplicate labels.
- Technical jargon.
- Unexplained abbreviations.
- Misleading names.
- Inconsistent terminology.
- Ambiguous icons.
- Incorrect section names.

A navigation label should clearly communicate its destination.

Icons must support recognition, not replace essential meaning.

Ensure that the same function uses the same name across the landing page, dashboard, admin, and relevant help documentation.

Do not rename routes or underlying product features without checking the consequences for existing deep links and integrations.

# 12. BREADCRUMBS, PAGE TITLES AND WAYFINDING

Users should understand where they are.

Inspect:

- Page headings.
- Browser document titles.
- Active sidebar items.
- Breadcrumbs.
- Back links.
- Section labels.
- Progress indicators.

Use breadcrumbs when a page belongs to a meaningful hierarchy.

Do not add breadcrumbs to flat applications or linear processes where they add no useful information.

For sequential setup processes, use progress indicators or task lists.

Every page should communicate its purpose through a clear page title.

Do not make users guess their current location.

# 13. ACCESSIBILITY OF NAVIGATION

Audit navigation against applicable WCAG 2.2 AA requirements.

Check:

- Keyboard-accessible menus.
- Logical tab order.
- Visible focus states.
- Accessible menu buttons.
- Correct expanded and collapsed states.
- Screen-reader-friendly navigation landmarks.
- Meaningful link names.
- Correct page titles.
- Skip navigation links where appropriate.
- Keyboard escape behaviour.
- No keyboard traps.
- Focus visibility when menus and drawers open.
- Focus restoration when they close.
- Touch target sizing.
- Consistent navigation placement.
- Consistent help placement.

Test navigation without using a mouse.

Dropdown menus must not work only on hover.

Do not automatically navigate users merely because a menu item receives keyboard focus.

Ensure that expanded menu states are communicated to assistive technology.

# 14. NAVIGATION PERFORMANCE AND INTERACTION

Check whether navigation feels responsive and dependable.

Inspect:

- Unnecessary page reloads.
- Slow transitions.
- Broken loading states.
- Layout shifts.
- Delayed menu interactions.
- Excessive animations.
- Unnecessary redirects.
- Unresponsive click targets.
- Unexpected scroll resets.
- Lost filter and pagination state.
- Lost form state.
- Broken navigation after errors.

Use animations only when they improve understanding or provide useful feedback.

Avoid decorative transitions that make navigation feel slower.

# 15. TASK-BASED FINDABILITY TESTS

This is mandatory.

Do not simply open every page and declare navigation successful.

Test realistic tasks without assuming users already know the menu structure.

Create task scenarios based on actual application functionality.

### Public website scenarios

1. Find FeraSetu's core product explanation.
2. Find the pricing page.
3. Find trial information.
4. Find customer support.
5. Find the signup page.
6. Find privacy and legal information.

### Merchant scenarios

1. Find where to add a new product.
2. Find where to manage an existing order.
3. Find where to view customers.
4. Find where to change storefront design.
5. Find where to edit website content.
6. Find where to connect or manage a domain.
7. Find where to view payment settings.
8. Find where to manage inventory.
9. Find where to invite or manage staff.
10. Find relevant help for a feature.

### Admin scenarios

1. Find a merchant account.
2. Locate organisation information.
3. Find subscription details.
4. Find an appropriate operational status.
5. Find relevant audit information.
6. Locate a support-related management screen.

Do not execute destructive operations.

### Storefront customer scenarios

For retail:
1. Find a particular product category.
2. Find a product.
3. Find product information.
4. Find delivery or return information.
5. Find the business contact option.

For gyms:
1. Find membership information.
2. Find available programs.
3. Find the timetable where implemented.
4. Find contact or enquiry options.

For consulting:
1. Find available services.
2. Understand the business offering.
3. Find enquiry or consultation options.

Use only functionality that actually exists.

### Testing methodology

For each task record:

- Starting page.
- Intended destination.
- Actual navigation path.
- Number of meaningful user actions.
- Whether the task was completed.
- Whether the first navigation choice was reasonable.
- Whether the user encountered confusion.
- Whether an alternative path exists.
- Any errors or dead ends.

Distinguish simulated agent-based task testing from actual testing with human participants.

Do not claim that real users were interviewed or tested unless that actually happened.

Do not use an arbitrary three-click rule.

The objective is to minimise unnecessary cognitive effort, not achieve a fixed number of clicks.

# 16. NAVIGATION SCORING SYSTEM

Score each major navigation experience out of 100.

| Category | Weight |
|---|---:|
| Information architecture and grouping | 20 |
| Clarity of navigation labels | 15 |
| Discoverability and findability | 20 |
| Routing and interaction reliability | 15 |
| Wayfinding and location awareness | 10 |
| Mobile navigation | 10 |
| Accessibility | 10 |
| **Total** | **100** |

Provide separate scores for:

- Public website navigation.
- Merchant dashboard navigation.
- Admin panel navigation.
- Ecommerce storefront navigation.
- Gym storefront navigation.
- Consulting storefront navigation.
- Overall FeraSetu navigation.

A numerical score cannot override a critical failure.

# 17. AUTOMATIC RELEASE BLOCKERS

The navigation standard MUST FAIL when:

1. A critical navigation link leads to the wrong destination.
2. A critical route is broken.
3. An important page cannot be discovered through any reasonable available path.
4. A menu or essential navigation control is unusable by keyboard.
5. A mobile menu prevents users from reaching essential functionality.
6. Permission restrictions can be bypassed through direct navigation.
7. Authentication redirects expose protected content or create serious navigation failures.
8. A critical task leads to a dead end.
9. Important navigation labels are misleading.
10. A new change breaks existing routes or deep links.
11. Browser back or refresh creates a serious failure in an affected workflow.
12. Navigation changes introduce unauthorized access.

Use these statuses:

- PASS
- FAIL
- BLOCKED
- NOT APPLICABLE

Any applicable P0 or P1 issue must block a PASS.

A critical test marked BLOCKED must be investigated before passing the release gate.

Do not hide issues by marking them NOT APPLICABLE.

# 18. REQUIRED FILE: ui-3-test.md

Create this document at the repository root.

It must contain:

### Part A — Permanent navigation standards

The reusable navigation principles and acceptance checklist.

### Part B — Route inventory

A maintained inventory of actual application routes and their purpose.

### Part C — Navigation architecture

A record of the public website, merchant dashboard, admin panel, and storefront navigation structures.

### Part D — Task-based tests

The recurring test scenarios and acceptance criteria.

### Part E — Accessibility checklist

Keyboard, focus, screen-reader, responsive, and WCAG checks.

### Part F — Scoring system

The scoring framework and mandatory release blockers.

### Part G — Execution history

For every relevant test run record:

- Date.
- Commit or revision ID.
- Changed files.
- Affected routes.
- Tests performed.
- PASS results.
- FAIL results.
- BLOCKED results.
- NOT APPLICABLE results and reasons.
- Evidence.
- Final release decision.

Keep the reusable standard separate from the latest execution record.

Do not overwrite earlier test history unnecessarily.

# 19. MANDATORY PRE-PUSH WORKFLOW

Every future code push involving navigation or relevant shared UI components must trigger the following process.

**STEP 1 — Inspect changes**

Review the Git diff, modified files, affected routes, shared components, menus, and navigation logic.

**STEP 2 — Read all existing standards**

Read:

- `ui-1-test.md`
- `ui-2-test.md`
- `ui-3-test.md`

UI-1 covers first impressions and overall design quality.

UI-2 covers credibility, trust, and transparency.

UI-3 covers navigation and findability.

All applicable standards are mandatory.

**STEP 3 — Identify affected user journeys**

Determine which public, merchant, admin, and storefront experiences could be affected.

**STEP 4 — Run applicable tests**

Test the relevant navigation paths, routes, menus, responsive behaviour, keyboard interactions, and task scenarios.

Run wider regression tests when shared components or route architecture change.

**STEP 5 — Resolve failures**

Fix relevant defects.

Retest the affected journeys after corrections.

**STEP 6 — Record evidence**

Update the execution history in `ui-3-test.md`.

**STEP 7 — Release decision**

Do not push code while an applicable mandatory navigation test is failing or blocked.

Do not silently bypass failures.

Do not claim that tests passed when they were not performed.

# 20. PROJECT INSTRUCTION INTEGRATION

Inspect:

- `GEMINI.md`
- `AGENTS.md`
- Existing project instructions.
- Existing testing scripts.
- Git hooks.
- CI workflows.
- Previous UI quality standards.

Integrate references to UI-1, UI-2, and UI-3 into the existing project instructions.

Ensure that future Gemini development tasks automatically consult the relevant standards.

Do not unnecessarily duplicate the complete documents into instruction files.

Inspect existing pre-push mechanisms and implement reliable enforcement where technically feasible.

Preserve existing hooks and workflows.

Do not create a fake automation script that prints PASS without executing real checks.

Where manual agent-based checks are necessary, execute and document them.

If the repository cannot technically prevent an unaudited push, explicitly document that limitation instead of claiming that a Markdown checklist provides automatic enforcement.

# 21. IMPLEMENTATION RULES

First inspect the repository and running application.

Then:

1. Map all existing navigation systems.
2. Identify broken and confusing journeys.
3. Create `ui-3-test.md`.
4. Document reusable acceptance criteria.
5. Audit the current application.
6. Identify the highest-impact navigation issues.
7. Fix clear, relevant defects within the authorised scope.
8. Preserve existing product functionality.
9. Retest affected pages.
10. Update Gemini/project instructions.
11. Integrate the release gate where safe.
12. Record final results.

Do not perform an unnecessary complete navigation redesign.

Do not remove features simply because their placement is inconvenient.

Do not change authentication, authorization, permissions, tenant isolation, or production routing in an unsafe manner.

Protect existing deep links and integrations.

Any significant architecture change must be evaluated for backward compatibility.

# 22. FINAL ACCEPTANCE CRITERIA

The task is complete only when:

- `ui-3-test.md` exists in the repository root.
- A complete route inventory has been created.
- Main navigation systems have been audited.
- Task-based scenarios have been tested.
- Mobile navigation has been checked.
- Keyboard navigation has been checked.
- Critical routing failures have been investigated and resolved.
- The results are documented.
- Existing Gemini instructions reference all three UI standards.
- The final status is explicitly PASS or FAIL.

# FINAL PHILOSOPHY

FeraSetu should never make merchants work hard to find the tools they need.

A shopkeeper should not need to understand software architecture to manage a shop.

A gym owner should not need to understand website development to manage their digital presence.

An administrator should not waste time navigating through unrelated sections.

A visitor should not have to search endlessly for important information.

**Our product can be powerful behind the scenes. It should feel simple in the hands of the people using it.**

Good navigation is invisible when it works.

Users should remember what they accomplished, not how difficult it was to find the right page.

Inspect. Test. Improve. Verify. Document.

**No navigation-related push without passing the applicable UI quality standards.**

---

# 23. ACTIVE EXECUTION RECORD & AUDIT RESULTS

> **Audit Date:** 2026-11-23  
> **Environment:** `http://localhost:5173/`  
> **Auditor:** Principal UX & Navigation Architect (Antigravity Agent)  
> **Status:** AUDITED, TESTED & VERIFIED  
> **Release Decision:** **PASS**

### A. Navigation & Routing Remediations Completed
1. **Header Mobile Constriction:** Added `w-full max-w-full overflow-hidden` to `Layout.tsx` top navbar. Hides wide desktop search input on mobile viewports (< 768px), eliminating the 699px mobile overflow.
2. **Missing Route Forwarding:** Registered `<Route path="/website/design" element={<Navigate to="/website-design" replace />} />` in `App.tsx` ensuring zero 404 dead ends on legacy design bookmarks.
3. **Mobile Drawer & Touch Target Ergonomics:** Verified hamburger button (`Menu`, 36×36px) opens persistent full-height slide-out drawer with 48px touch targets for all catalog, order, and storefront links.
4. **Active Route Highlights:** Verified active section indicator cleanly highlights current page in sidebar and top navbar.
5. **Keyboard Accessibility:** All interactive links and dropdown items cycle predictably with native visible focus rings (`audit_evidence/step_80_shot_1_keyboard_focus_ring.png`).
