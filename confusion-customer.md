# FeraSetu Anti-Confusion & Customer Clarity Rulebook (`confusion-customer.md`)

## 1. Core Mission & Invariant
Independent shopkeepers, local artisans, and merchants are busy, practical entrepreneurs. When navigating FeraSetu, every visual control, button, indicator, and link MUST communicate its purpose instantly. **Never rely on "mystery meat" navigation, unlabelled icons, or cryptic UI states that cause user hesitation or confusion.**

---

## 2. Invariant Rules to Prevent Customer Confusion

### Rule 1: Zero Icon-Only Primary Wayfinding (The "Dashboard Label" Rule)
- **Mandatory:** All primary navigation waypoints, especially the **"Dashboard"** link in headers, navbars, and mobile menus, **MUST always display clear, legible text** (e.g. `Dashboard` or `Merchant Dashboard`).
- **Forbidden:** Never hide the text label behind responsive utility classes (`hidden sm:inline` or `hidden xs:inline`) such that the button degrades into an ambiguous icon-only pill or floating orange circle on mobile devices.
- **Why:** On mobile and small tablet screens, an icon-only orange square or circle confuses merchants who do not recognize abstract dashboard iconography, leading them to believe the site is incomplete or broken.

### Rule 2: Explicit Visual State & Wayfinding
- Always show where the user is, where they came from, and what happens next.
- Active tabs, navigation links, and filter pills must have unmistakable contrast and indicator lines or solid fills—never subtle opacity drops that leave the active state ambiguous.

### Rule 3: Zero Mystery Controls
- Every button must feature a descriptive verb-noun action label (e.g., `+ Record Counter Order`, `Display Store QR`, `View Live Store`, `Bring your business online`).
- Tooltips or inline labels must accompany all secondary toolbar buttons and icon triggers.

### Rule 4: Zero Ambiguous Status Signals
- When displaying ledger statuses, order queues, or compliance metrics, never show bare colored dots without an accompanying status badge and clear textual description (e.g., `Direct Settlement Active`, `100% Reconciled`, `All Queues Clear`).

### Rule 5: Honest Empty States Over Phantom Placeholders
- Empty states must state the current reality with complete honesty (e.g., `All caught up — no orders in this queue`) paired with immediate, actionable next steps (`+ Record Counter Order`, `Display Store QR`).
- Never show fake simulated placeholder orders or dummy metrics that mislead a shopkeeper into thinking an actual transaction occurred.

### Rule 6: Transparent Pricing & Regional Clarity
- Show direct settlement methods native to the merchant's region:
  - **India:** Direct Bank UPI & QR by default, optional Razorpay integration.
  - **EU:** Stripe, Adyen, PayPal, Worldline, Mollie.
  - **Global:** Stripe, PayPal, and regional gateways.
- Explicitly state 0% marketplace commission with zero hidden escrow holdbacks.
