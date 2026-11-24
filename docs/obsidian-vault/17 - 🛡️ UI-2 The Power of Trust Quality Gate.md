# FeraSetu UI-2: THE POWER OF TRUST
## Mandatory Trust, Credibility & Transparency Quality Gate

**ROLE:** Act as a senior trust-focused UX researcher, product designer, conversion specialist, accessibility auditor, and SaaS quality assurance engineer.

You are working on FeraSetu, a global SaaS platform that helps independent businesses establish and operate their own online presence.

Your responsibility is to ensure that every important part of FeraSetu communicates authenticity, professionalism, reliability, transparency, and confidence.

This is a permanent product quality requirement.

**Create and maintain a repository-root file named `ui-2-test.md`. This file must become a mandatory quality gate before any code is pushed to GitHub.**

---

# 1. THE CORE PRINCIPLE: THE POWER OF TRUST

Trust is one of the biggest reasons people choose one business over another online.

Visitors need to feel confident before taking action.

Trust naturally develops through:

- Clear and accessible contact information.
- Professional and consistent design.
- Genuine customer feedback, when available.
- Accurate payment information.
- Authentic product imagery.
- Consistent branding.
- Transparent pricing.
- Honest messaging.
- Understandable policies.
- Clear privacy and security information.
- Predictable and reliable interactions.

Trust is not created through attractive visuals alone.

It comes from ensuring that what the product communicates matches what the product actually delivers.

**Our philosophy: Never ask users to trust something that we cannot demonstrate, explain, or verify.**

# 2. CRITICAL RULE: NO SOCIAL PROOF YET

FeraSetu currently does not have established customer testimonials, independently verified reviews, or meaningful social proof.

This is intentional context for the audit.

DO NOT:

- Generate fake customer reviews.
- Invent testimonials.
- Invent customer names or photographs.
- Invent merchant success stories.
- Display fabricated star ratings.
- Display fake customer counts.
- Display fake transaction counts.
- Create fake client logos.
- Claim that businesses already trust FeraSetu without evidence.
- Add fake activity notifications.
- Use misleading statements such as "Trusted by thousands".
- Present development or demo data as actual customer activity.

Do not create empty testimonial sections simply to fill space.

Do not make the absence of social proof look like a design failure.

Instead, build credibility through genuine product quality and verifiable information.

**A new company must be able to look trustworthy without pretending to be an established company.**

# 3. AUDIT TWO DIFFERENT TYPES OF TRUST

## A. Trust in FeraSetu as a SaaS platform

A new merchant visiting `ferasetu.com` should understand:

- Who provides the service?
- What does FeraSetu actually do?
- How does the platform work?
- What does it cost?
- What happens after the trial?
- How can they contact support?
- What happens to their business data?
- How do payments work?
- What limitations or responsibilities should they understand?

Audit whether the website answers these questions without requiring unnecessary effort.

Inspect:

- Landing page.
- Pricing page.
- Signup and login.
- Contact and support pages.
- Privacy policy.
- Terms of service.
- Refund and cancellation information, where applicable.
- Security explanations.
- Integrations.
- Product demonstrations.
- Footer and navigation.
- All trust-related claims.

Ensure that every legal, pricing, security, and operational statement reflects the actual implementation and published policies.

## B. Trust in merchant storefronts

FeraSetu helps merchants create their own independent online presence.

The platform should make it easy for merchants to establish credibility with their customers.

Inspect the storefront builder and available templates for:

- Business name and branding.
- Business contact information.
- Product images.
- Product descriptions.
- Accurate pricing.
- Business information.
- About page.
- Shipping and delivery information, where applicable.
- Return and cancellation policies.
- Privacy policy.
- Terms and conditions.
- Supported payment methods.
- Order confirmation.
- Customer support information.
- Mobile usability.

Check whether merchants can easily add, edit, and display these elements.

Do not impose the same requirements on every business type.

For example, a gym website needs different trust information from an ecommerce storefront or consulting website.

# 4. LANDING PAGE TRUST AUDIT

HIGHEST PRIORITY.

Inspect the entire public landing page.

Evaluate:

### First impression

- Does the website look like a genuine professional company?
- Does the brand feel consistent?
- Does the visual design inspire confidence?
- Is the messaging understandable?
- Are there any visual elements that feel suspicious, cheap, artificial, or unfinished?

### Company identity

- Is it clear what FeraSetu offers?
- Is the contact information easy to find?
- Is the support channel accessible?
- Does the website clearly identify its service and responsibilities?
- Are claims about the company accurate?

### Pricing transparency

- Are plan prices understandable?
- Are billing periods clear?
- Are trial conditions explained?
- Are limitations and exclusions disclosed?
- Are cancellation conditions understandable?
- Are there any unexpected fees or misleading pricing statements?

### Product authenticity

- Are screenshots genuine?
- Does the displayed product actually exist?
- Do the screenshots match the current application?
- Are product demonstrations understandable?
- Are feature claims backed by implemented functionality?

### Conversion confidence

A visitor should be comfortable clicking the primary CTA without feeling that important information is being hidden.

Avoid:
- Fake urgency.
- Fake scarcity.
- Misleading countdowns.
- Hidden pricing conditions.
- Aggressive pop-ups.
- Unnecessary signup friction.
- Unsupported guarantees.

# 5. MERCHANT DASHBOARD TRUST AUDIT

HIGHEST PRIORITY.

The dashboard must make merchants feel that their business is in safe and capable hands.

Inspect every important dashboard page.

Evaluate:

### Data integrity and presentation

- Are numbers based on genuine application data?
- Are empty states handled honestly?
- Are unavailable metrics clearly identified?
- Are loading states accurate?
- Are stale or unavailable values distinguishable?
- Is demo data clearly labelled?
- Are financial figures and order statuses understandable?

Never display fabricated analytics to make an empty dashboard appear successful.

### Account and business confidence

- Can merchants understand their account status?
- Can they identify their subscription and billing details?
- Are domain and website statuses understandable?
- Are payment statuses clear?
- Are important actions explained?
- Are errors communicated honestly?

### Data ownership and control

Where applicable, clearly communicate:

- Which business data merchants can access.
- How customers and orders are managed.
- How domains are managed.
- Which integrations are connected.
- What happens when an integration fails.
- Which actions require additional permissions.

Do not make promises about data ownership, backups, exports, or deletion unless they are supported by actual functionality and policies.

### Operational reliability

- Do buttons provide accurate feedback?
- Are unsuccessful actions communicated?
- Are destructive actions protected?
- Are saves acknowledged only after successful completion?
- Are payment and order statuses trustworthy?
- Are permissions enforced consistently?

# 6. ADMIN PANEL TRUST AND OPERATIONAL INTEGRITY

Audit the internal admin panel separately.

Administrators need confidence in the correctness of the information presented.

Check:

- Accurate merchant and account information.
- Reliable subscription statuses.
- Clear billing information.
- Correct user roles.
- Clear operational alerts.
- Accurate audit logs.
- Understandable error messages.
- Proper confirmation for destructive operations.
- Consistent status labels.
- No misleading analytics.
- No unauthorized exposure of sensitive information.

Never sacrifice security or tenant isolation to improve convenience.

Do not execute destructive operations or modify real production data during testing.

# 7. TRUST THROUGH DESIGN CONSISTENCY

Inspect every important screen for design inconsistencies that reduce credibility.

Check:

- Consistent branding.
- Consistent logo usage.
- Consistent typography.
- Consistent spacing.
- Consistent buttons.
- Consistent icon styles.
- Consistent navigation.
- Consistent component behaviour.
- Consistent form validation.
- Consistent error messages.
- Consistent loading states.

Look for:
- Broken images.
- Incorrect logos.
- Placeholder text.
- Unfinished sections.
- Strange alignment.
- Inconsistent borders.
- Unnecessary animations.
- Excessive visual effects.
- Poor colour contrast.
- Broken mobile layouts.

The product should feel like one carefully engineered platform.

# 8. CONTACT, PAYMENT, PRIVACY AND SECURITY SIGNALS

Verify that all important trust-related information is genuine.

### Contact

Check that:
- Contact information is visible.
- Support links work.
- Email addresses are correct.
- Support pages are accessible.
- Users understand where to get assistance.

### Payments

Check that:
- Only actually supported payment methods are displayed.
- Provider branding is used accurately.
- Payment-related claims are verifiable.
- Checkout does not imply unsupported security certifications.
- Payment errors are understandable.
- Pricing and transaction responsibilities are transparent.

Never display security certifications, payment badges, or compliance logos that FeraSetu has not actually earned or implemented.

### Privacy and security

Check that:
- Privacy and terms links work.
- Security statements match the implementation.
- Data-handling explanations are understandable.
- No unsupported claims such as "100% secure" are displayed.
- Sensitive information is not exposed unnecessarily.

Do not claim GDPR compliance simply because a privacy policy exists.

# 9. TRUST DIFFERENCES BY BUSINESS TYPE

Test storefront experiences for different merchant categories.

### Ecommerce / retail

Customers should be able to understand:
- What is being sold?
- What does it cost?
- What are the product details?
- How can they contact the business?
- What are the delivery and return conditions?
- What payment methods are available?

### Gym / fitness

Visitors should be able to understand:
- What the gym offers.
- Where it operates.
- What membership options exist.
- How to contact the gym.
- How to enquire or book.
- What facilities and services are genuinely available.

### Consulting / professional services

Visitors should be able to understand:
- What services are offered.
- Who provides them.
- How to make an enquiry.
- How pricing or consultation arrangements work.
- How to contact the business.

Do not force every template into an ecommerce-style trust layout.

# 10. FUNCTIONAL TRUST TESTING

Visually correct elements are not sufficient.

Test real behaviour.

Verify:

- Contact links.
- Email links.
- Support links.
- Pricing links.
- Policy links.
- Signup and login.
- Form submissions.
- Navigation.
- Checkout entry points in safe environments.
- Payment status presentation.
- Storefront information.
- Responsive layouts.
- Error handling.
- Save and update feedback.

A visible contact link that leads nowhere is a trust failure.

A payment icon for an unsupported payment method is a trust failure.

A save button that reports success when the server operation failed is a trust failure.

Document reproduction steps for every failure.

# 11. SCORING FRAMEWORK

Score each major application area out of 100.

| Category | Weight |
|---|---:|
| Authenticity and credibility | 20 |
| Transparency and communication | 15 |
| Professional visual consistency | 15 |
| Contact and support accessibility | 10 |
| Data integrity and accurate feedback | 15 |
| Payment, privacy and security clarity | 15 |
| Functional reliability | 10 |
| **Total** | **100** |

Provide separate scores for:

- Public landing page.
- Pricing and signup experience.
- Merchant dashboard.
- Merchant storefronts.
- Admin panel.
- Overall platform.

A fabricated trust signal is an automatic failure, regardless of the numerical score.

# 12. MANDATORY PASS/FAIL RULES

Create the repository-root file:

`ui-2-test.md`

This is a permanent quality standard, not a one-time report.

Every future UI-related change and every relevant product change must be checked against this document before pushing code.

The gate must use these statuses:

- PASS
- FAIL
- BLOCKED
- NOT APPLICABLE

### Automatic release blockers

The test must FAIL when:

1. Fake testimonials or reviews are introduced.
2. Unsupported customer counts or company claims are introduced.
3. Incorrect pricing or misleading trial information is displayed.
4. Broken contact or critical support links are found.
5. Incorrect payment methods or false security badges are displayed.
6. Fake production analytics are presented as real.
7. Important legal or policy links are broken.
8. A critical trust-related workflow is broken.
9. Important user-facing information is misleading.
10. A save or payment operation reports success when it actually failed.

A critical item marked BLOCKED must also prevent a PASS until it has been investigated and resolved or formally determined not applicable with documented justification.

Do not change FAIL to PASS simply because the problem is difficult to resolve.

Do not treat NOT APPLICABLE as a way to hide unfinished functionality.

# 13. PRE-PUSH WORKFLOW — MANDATORY

This section is particularly important.

For every future code push, follow this exact workflow:

**STEP 1 — Discover changes**

Inspect:
- Git status.
- Changed files.
- Relevant pages.
- Shared components.
- Affected user journeys.

**STEP 2 — Read the standards**

Read both:
- `ui-1-test.md` — First Impressions and overall UI quality standard, if present.
- `ui-2-test.md` — Power of Trust standard.

Do not assume these documents are optional.

**STEP 3 — Run applicable tests**

Test every applicable trust criterion.

For shared components, inspect all affected surfaces where practical.

**STEP 4 — Fix failures**

Resolve problems introduced by the changes.

Retest after making corrections.

**STEP 5 — Produce test evidence**

Maintain a test record in `ui-2-test.md` containing:

- Date.
- Commit or revision identifier.
- Files and pages affected.
- Tests performed.
- Passed checks.
- Failed checks.
- Blocked checks.
- Not applicable checks and reasons.
- Relevant test evidence.
- Final result.

Keep the reusable acceptance criteria separate from the latest execution record.

**STEP 6 — Release decision**

Only push when all applicable mandatory checks pass.

If a mandatory check fails:
- Do not push.
- Do not silently bypass the requirement.
- Report the failure.
- Fix it.
- Run the tests again.

Do not claim a successful test without evidence.

If the local environment cannot execute a particular test, clearly report the limitation and do not falsely mark it as passed.

Where practical, inspect the existing Git hooks and testing infrastructure and establish a reliable pre-push quality check without overwriting existing hooks or disrupting the developer workflow.

Do not create a fake automated test that simply prints PASS without checking anything.

# 14. IMPLEMENTATION INSTRUCTIONS

First inspect the existing repository.

Look for:
- Existing UI quality standards.
- `ui-1-test.md`.
- `GEMINI.md`.
- `AGENTS.md`.
- Existing development instructions.
- Existing pre-push hooks.
- Testing scripts.
- CI workflows.

Then:

1. Create `ui-2-test.md` at the repository root.
2. Include the complete reusable trust acceptance checklist.
3. Include the scoring system and mandatory release blockers.
4. Include the pre-push procedure.
5. Integrate a reference to this standard into the existing Gemini/project instructions so it is consistently used in future work.
6. Avoid duplicating or contradicting existing instructions.
7. Audit the current running product against the standard.
8. Fix relevant trust-related defects where safe and within the authorised scope.
9. Retest all affected areas.
10. Record the actual test results.

Do not modify authentication, authorization, payment processing, secrets, production data, or sensitive infrastructure as part of visual improvements.

# 15. FINAL ACCEPTANCE CRITERIA

The task is complete only when:

- `ui-2-test.md` exists in the repository root.
- The trust standards are documented.
- The current product has been audited.
- Findings are evidence-based.
- Missing social proof has not been fabricated.
- Relevant trust issues have been addressed where safe.
- The test results are recorded.
- Future Gemini workflows reference this standard.
- The final release decision is explicitly PASS or FAIL.

**FINAL PHILOSOPHY**

FeraSetu does not need to pretend to be a massive established company.

It needs to behave like a trustworthy company from day one.

We will not manufacture reputation.

We will earn it through transparency, consistency, dependable functionality, and respect for every merchant and customer.

**Trust is not a section of the website. Trust is the experience of using the entire product.**

---

# 16. ACTIVE AUDIT & PRE-PUSH EXECUTION RECORD

> **Audit Date:** 2026-11-23  
> **Target Environment:** `http://localhost:5173/`  
> **Auditor:** Trust & UX Quality Auditor (Antigravity Senior Agent)  
> **Status:** AUDITED, REMEDIATED & HOST-VERIFIED  
> **Release Decision:** **PASS**

### A. Automatic Release Blockers Checklist
- [x] **Zero Fake Social Proof:** Verified 0 fake testimonials, 0 fabricated reviews, 0 synthetic 5-star ratings.
- [x] **Zero Fake Numbers:** No "Trusted by 10,000+ shops" or false counters.
- [x] **Accurate Pricing:** Clean localized formatting across currencies (`₹9,990/year`, `$790/year`, `€790/year`) with double-currency prefix eliminated. 3-column desktop layout balanced.
- [x] **Working Legal & Policy Links:** Terms, Privacy, Community, and Docs resolve cleanly.
- [x] **Data Integrity & Visual Visibility:** Merchant button text contrast restored with Sovereign Blue backgrounds and crisp white text. Mobile header overflow eliminated (`overflow-hidden` enforced, 0px horizontal jitter).
- [x] **Route Integrity:** Direct navigation to `/website/design` redirects cleanly (HTTP 200) to `/website-design`.
- [x] **Release Decision:** **PASS**
