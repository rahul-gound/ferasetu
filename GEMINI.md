# FeraSetu Human UI/UX & Global Shopkeeper Rule

## 1. Product Context & Target User
- **Target Audience:** The Global Shopkeeper (independent retailers, corner grocers, bodegas, boutiques, and artisans across 48+ regions).
- **Core Value Proposition:** 0% marketplace commission, direct merchant-customer relationships, zero technical jargon.
- **Language & Tone:** Write with natural human empathy, clarity, and warmth. Never use synthetic AI buzzwords ("revolutionary", "empower your workflow", "seamless tapestry", "cutting-edge", "game-changing").
- **Copy Linter:** Verify marketing and UI copy with SlopMonster (`python tools/slopmonster/tools/deslop.py`) to guarantee a 5/5 CLEAN human score.

## 2. Human Cognitive Psychology Invariants
When creating, editing, or auditing any user interface:
- **Hick's Law:** Minimize decision fatigue. Limit primary actions to 1 or 2 per screen.
- **Fitts's Law:** Mobile touch targets must be at least 48x48px and placed within the natural bottom thumb zone.
- **Jakob's Law:** Match familiar real-world and mobile mental models (WhatsApp, PhonePe, local wallets) rather than inventing abstract patterns.
- **Contrast & Legibility:** Use high-contrast text (`text-slate-900` / `text-slate-700`) so interfaces remain legible under harsh shop lights and outdoor sunlight.
- **Loss Aversion:** Highlight safety, transaction clarity, and zero-commission guarantees. Provide instant undo feedback for critical actions.
- **Doherty Threshold:** All interactive elements must provide visual feedback in <400ms (active states, press feedback, clear spinners).

## 3. Mandatory UI Design Vocabulary & Engine: Impeccable (pbakaus/impeccable)
- **Always Active for UI:** ALWAYS use the **Impeccable** design framework (`.agents/skills/impeccable/SKILL.md`) for all user interface creation, styling, redesign, critique, and auditing across FeraSetu.
- **Anti-Slop Enforcement:** Strictly follow Impeccable's deterministic anti-slop rules (no default generic templates, no nested cards, strict contrast, intentional typography and hierarchy, purposeful motion).
- **Quality Floor & Verification:** Always inspect `.agents/skills/impeccable/reference/craft-floor.md` before executing UI edits and use `impeccable detect` to verify zero regressions.
- **Core Stack Integration:** ALWAYS build and style components using **shadcn/ui** primitives (`@/components/ui/*`), **Lenis** (buttery smooth scrolling), **GSAP** (orchestration & scroll-driven motion), **React Bits** (SpotlightCard, SplitText micro-interactions), **Superdesign**, and **OpenDesign**.
- **Generous Whitespace & Calm Trust Psychology:** Provide generous breathing room (`p-6` to `p-10`, `gap-6` to `gap-8`, ample margin). An unhurried, spacious layout signals security, premium quality, and reliability, making shopkeepers feel calm and trusting of FeraSetu.
- **No Heavy 3D Bloat:** Never load Three.js, Canvas shaders, or heavy script libraries on functional or transactional merchant screens.
- **Uniform Icon Suite:** Use `lucide-react` with consistent sizing (`size={18}` or `size={20}`) and stroke width (`strokeWidth={1.75}`).
- **Hardware-Accelerated CSS & GSAP:** Favor native CSS transitions (`translate3d`, `opacity`) and GSAP ticker sync over layout-thrashing animations.
- **Card-in-Card Prevention:** Avoid nesting bordered cards within bordered cards. Use whitespace, subtle tint shifts, and typography hierarchy to separate content.

## 4. Visual Feedback Loop (Screenshot Review Protocol)
When the user shares a screenshot or photo of the UI:
1. Conduct the **Squint Test** to verify visual prominence of the primary CTA.
2. Check **optical balance** of icons and badges (visual mass over bounding-box centering).
3. Verify **spacing rhythm** and whitespace breathing room.
4. Audit **finger-friendly ergonomics** for mobile viewports.
5. Verify **copy quality** and ensure tone matches the independent global merchant mindset.

## 5. Obsidian Architecture Sync & Token-Optimization Invariant
- **Vault Location:** The canonical architecture knowledge base is maintained in `docs/obsidian-vault/`.
- **Token Optimization Rule:** Before performing wide-scope directory grepping or re-reading massive code files, ALWAYS consult the corresponding note in `docs/obsidian-vault/` (`00` through `10`) to identify exact contracts and entrypoints.
- **Mandatory Synchronization:** Whenever changing, adding, or removing routes, database schemas, worker handlers, frontend pages, pricing plans, or test suites, ALWAYS update the relevant Obsidian note in `docs/obsidian-vault/` and update `docs/obsidian-vault/01 - 📊 Progress & Completion Matrix.md`.

## 6. Work Completion & Progress Reporting Invariant
- Always report "which work is done how much" by citing exact percentage completions and milestone statuses from `docs/obsidian-vault/01 - 📊 Progress & Completion Matrix.md`:
  - **Edge Gateway & D1:** 92%
  - **Core API & Express:** 90%
  - **Frontend & UI/UX:** 88%
  - **Fera AI Engine:** 85%
  - **Pricing & Billing:** 95%
  - **GST & Compliance:** 90%
  - **Custom Domains & DNS:** 88%
  - **QA & Verification:** 92%
  - **Database Schemas:** 90%
  - **Global Platform:** 90%
- Maintain this matrix live in Obsidian so that team members and agents always have instant, token-efficient visibility into project status.

## 7. Cloudflare Worker Backend Architecture & AI Secrets Invariant
- **Backend Environment:** FeraSetu's primary production backend runs serverless on Cloudflare Workers (`worker/`), NOT on Node.js Express.
- **AI Upstream Endpoint:** The OpenAI-compatible backend endpoint variable is `AI_ENDPOINT` (or `ai_endpoint`), set to `https://ai.fera-search.tech/v1`.
- **AI Secret Key:** The secret key is `API_AI` (or `api_ai`), configured in `worker/.dev.vars` for local development and Cloudflare Worker secrets for production.
- **Strict Frontend Isolation:** Neither `AI_ENDPOINT` nor `API_AI` must ever be leaked, shown in client responses, or called directly by the frontend. The frontend communicates exclusively with `/api/v1/ai/chat` (or `/api/ai/chat`) on the Cloudflare Worker backend.
- **Zero Sarvam Invariant:** We do NOT use Sarvam AI. NEVER show or mention "Powered by Sarvam", "Sarvam", or "savram" anywhere in UI pages, legal modals, privacy policies, system prompts, or merchant facing copy. The AI engine is branded exclusively as **FeraSetu AI** / **Fera AI** powered by our OpenAI-compatible backend cluster (`https://ai.fera-search.tech/v1`).

## 8. Mandatory Pre-Push Quality Gates (ui-1-test.md through ui-9-test.md)
- **Pre-Push Quality Rule:** Before any git push or major release, EVERY agent and developer MUST audit and verify changes against all 9 quality gates:
  1. `ui-1-test.md`: Complete First-Impression, UX & Product Quality Audit (Five-second comprehension, cognitive load, visual hierarchy, mobile viewport ergonomics, tactile button press physics).
  2. `ui-2-test.md`: The Power of Trust, Credibility & Transparency Quality Gate (Zero fake social proof/reviews, accurate pricing/currencies, honest data presentation, verified payment/support signals, zero broken links).
  3. `ui-3-test.md`: Easy Navigation Reduces Frustration Quality Gate (Navigation bars, findability, active route wayfinding, and zero broken routes).
  4. `ui-4-test.md`: Colour Psychology, Brand Identity & Visual Colour System Quality Gate (Intentional colour usage, WCAG 2.2 contrast compliance, semantic states, and non-colour reliance).
  5. `ui-5-test.md`: Strong Headlines Capture Attention Quality Gate (Clear, scannable headings, inverted-pyramid structure, semantic H1-H6 hierarchy, zero synthetic AI clichés).
  6. `ui-6-test.md`: Clear Calls to Action Drive Results (CTA strategy, action hierarchy, touch targets, and tactile button physics).
  7. `ui-7-test.md`: Mobile Experience is Essential Quality Gate (Responsive adaptability, 320px–1440px viewports, 44–48px touch targets, zero horizontal overflow).
  8. `ui-8-test.md`: Emotional Connection Matters Quality Gate (Human-centred design, visceral/behavioral/reflective UX, zero dark patterns, user dignity & empowerment).
  9. `ui-9-test.md`: Consistency Creates Confidence Quality Gate (Design foundations, single source of truth tokens, shared component coherence, predictable navigation, and cross-platform integrity).
- **Button Rule Exception Invariant:** When a specific button design standard or rule (`.md`) is provided for a particular component, follow that explicit rule; otherwise, always apply the universal tactile 3D button standard (`DESIGN.md`, `.agents/rules/ferasetu-design-system.md`).
- **Browser Visual Verification:** ALWAYS invoke the `browser` subagent to visually inspect and verify the UI on running `http://localhost:5173` across desktop (`1440×900`) and mobile (`390×844`) viewports before clearing a release.
- **Automatic Release Blockers:** An automatic FAIL occurs if fake testimonials, broken pricing/currencies, unreadable buttons, navigation dead ends, horizontal mobile overflows, or misleading claims are introduced. Never push code until all mandatory checks PASS.

## 9. Mandatory UX Principles Standard (ux-principles.md)
- **Always Active for Every UI Change:** Every agent and developer MUST follow `ux-principles.md` in the repository root for all UI/UX creation, editing, redesign, and review across FeraSetu.
- **Navigation vs. Button Invariant:** Navigation bars, sidebar links, category filters, and horizontal sub-tabs are spatial wayfinding elements. They MUST NEVER be styled as 3D tactile buttons and MUST NOT follow `button.md`. They must be clean, rectangular or subtly rounded items with flat indicators (underlines, clean background tints), never floating 3D pills with depth shadows or active scale compressions.
- **Zero Fake Data Invariant:** Never fabricate simulated metrics, fake traffic sources (e.g., "84% Mobile Web • 46% WhatsApp"), or placeholder customer numbers in empty states. State zero data honestly and provide actionable setup guidance.
- **High Contrast & Calm Surfaces:** Maintain high-contrast text (`text-slate-900` / `text-slate-700`, WCAG 2.2 AA ≥4.5:1). Never render faint grey text on white surfaces, and avoid heavy, jarring pitch-black slabs (`bg-slate-900` / `#0A0F1D`) on light merchant workbenches.
- **Accessible Modals:** Every modal dialog and popup MUST provide an explicit, accessible "X" close button in the top right corner in addition to `Esc` and "Cancel" actions.

## 10. Mandatory Navigation Standard (nav-rule.md)
- **Always Active:** Every agent and developer MUST strictly obey `nav-rule.md` in the repository root for all navigation, sidebar, tab bar, header, footer, and category filter implementations.
- **Wayfinding vs. Action Buttons:** Navigation items are spatial wayfinding tools, never mechanical action buttons. They must never follow `button.md`, never receive 3D bottom shelves (`box-shadow: 0 4px 0 0 ...`), and never be forced into `9999px` oval pills.
- **Flexbox Scroll Invariant:** All main workbench views and flex columns MUST specify `h-full min-h-0` on flex parents and `flex-1 min-h-0 overflow-y-auto` on scrollable content areas to prevent viewport clipping and guarantee vertical scrollability on pages like `/products`.
- **Naming Invariant:** The visual builder is branded exclusively as **Website Builder** across navigation, headers, and documentation (not "Storefront Studio").

## 11. Mandatory Typography Standard (typography.md)
- **Always Active:** Every agent and developer MUST strictly follow `typography.md` in the repository root for all text styling, hierarchy, font weights, line heights, and typography tokens across FeraSetu.
- **Five Priorities:** Legibility, Hierarchy, Consistency, Personality, Performance. Never sacrifice the first three for decorative styling.
- **Deliberate Type Scale Tokens:** Display (56px/600), H1 (36px/600), H2 (28px/600), H3 (22px/600), H4 (18px/600), H5 (16px/600), H6 (14px/600), Body Large (18px/400), Body (16px/400), Body Small (14px/400), Caption (13px/400), Micro (12px/500). Never use 10px text in ordinary functional interfaces.
- **Tabular Numerals Invariant:** Always apply tabular figures (`tabular-nums`) to prices, order counts, ledger entries, settlement balances, and quantitative metrics.
- **Multilingual Glyph & Script Support:** Ensure proper line-height headroom and zero clipping across English and Indian scripts (Hindi, Marathi, Bengali, Gujarati, Tamil, Telugu, Kannada, Malayalam, Punjabi). Preserve correct Unicode character shaping without manual CSS letter-spacing deformation.

## 12. Mandatory Spacing Standard (spaicng-rule.md / spacing-rule.md)
- **Always Active:** Every agent and developer MUST strictly follow `spaicng-rule.md` (and `spacing-rule.md`) in the repository root for all margins, padding, gaps, and layout structures across FeraSetu.
- **Fundamental Rule:** Smaller spacing groups related elements (4–8px tight, 12–16px normal). Larger spacing separates unrelated groups (20–32px group, 40–64px section). Never add arbitrary whitespace to make a layout appear minimal or premium.
- **Core 4px Foundation & 8px Rhythm:** Approved spacing tokens: `--space-0` (0px), `--space-1` (4px), `--space-2` (8px), `--space-3` (12px), `--space-4` (16px), `--space-5` (20px), `--space-6` (24px), `--space-8` (32px), `--space-10` (40px), `--space-12` (48px), `--space-16` (64px), `--space-20` (80px), `--space-24` (96px).
- **Merchant Dashboard Density:** Balance information density with comfort. Use compact density for order lists, inventory, and ledger tables; standard density for overview, settings, and product details; spacious density for onboarding and empty states.
- **Anti-Pattern Prevention:** Never introduce arbitrary negative margins to patch broken layouts, never stack unexamined nested card padding, avoid layout clipping with fixed heights, and always use CSS logical properties (`margin-inline-start`, `padding-inline-end`) for RTL and international layout resilience.




