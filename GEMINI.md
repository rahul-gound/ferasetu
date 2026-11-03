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

## 3. Lightweight Asset, Premium Stack & Engineering Discipline
- **Mandatory UI Toolkit:** ALWAYS build and style components using **shadcn/ui** primitives (`@/components/ui/*`), **Lenis** (buttery smooth scrolling), **GSAP** (orchestration & scroll-driven motion), **React Bits** (SpotlightCard, SplitText micro-interactions), **Superdesign**, and **OpenDesign**.
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


