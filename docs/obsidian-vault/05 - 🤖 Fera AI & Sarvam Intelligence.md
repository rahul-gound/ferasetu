# 🤖 Fera AI & Sarvam Intelligence

> **Subsystem Completion:** `94%`  
> **Status:** 🟢 Production Ready  
> **Primary Path:** `worker/ai/`, `worker/services/aiGatewayService.js`, `backend/src/routes/ai.ts`, `docs/FERA_AI.md`  
> **Parent:** [[00 - 🗺️ System Architecture Overview]] | **Progress:** [[01 - 📊 Progress & Completion Matrix]]

---

## 1. System Role & Value Proposition
Fera AI is an Indic-first conversational assistant and copilot for shopkeepers. Powered by an OpenAI-compatible reasoning cluster (`https://ai.fera-search.tech/v1`) with regional Sarvam AI translation & voice pipeline (`mayura:v1`, `bulbul:v1`), it handles inventory creation, marketing campaigns, voice commands, and store performance queries without requiring technical jargon.

## 2. Component Structure

| Component | Path | Function |
| :--- | :--- | :--- |
| **Fera AI Provider** | `worker/ai/providers/feraAi.js` | OpenAI-compatible client calling `https://ai.fera-search.tech/v1/chat/completions` with Bearer auth |
| **Model Router** | `worker/ai/router.js` | Intent classification & model selection |
| **AI Gateway Service** | `worker/services/aiGatewayService.js` | Unified edge gateway with bounded timeouts, retries & secret redaction |
| **Provider Config** | `worker/ai/config.js` | Centralized resolver for `FERA_AI_ENDPOINT`, `FERA_AI_API_KEY`, `FERA_AI_MODEL` |
| **Local Dev Secrets** | `worker/.dev.vars` | Mock secrets for local dev (never committed, never sent to client) |
| **Sarvam Provider** | `worker/ai/providers/sarvamTranslate.js` | REST API wrapper for Sarvam translation endpoints |
| **Skill Orchestrator** | `worker/ai/skills/orchestrator.ts` | Dispatches actions (create product, check orders, sales summary) |
| **Core AI Route** | `backend/src/routes/ai.ts` | Authenticated merchant proxy for AI calls with server-enforced monthly spend limits & feature pause toggles |
| **Voice Router** | `backend/src/routes/voice.ts` | Speech-to-text and audio translation pipeline |
| **Merchant AI Spend Limits** | `backend/src/routes/payment.ts`, `worker/index.js` | `POST /api/payment/ai-credits/limits` updates `ferasetu_ai_limit`, `website_ai_limit`, `ferasetu_ai_enabled`, `website_ai_enabled` |
| **Storefront AI Assistant Section** | `frontend/src/storefront/sections/AiAssistantSection.tsx` | Customer-facing shopping assistant with quick question chips, live simulated replies, and 1-click "Remove from Section" action |
| **AI Credits Dashboard** | `frontend/src/pages/AICreditsPage.tsx` | Professional telemetry command center with interactive SVG bar charts, 7d/14d/30d views, burn runway, spend limits, and credit packs |
| **Endpoint Test Suite**| `tests/fera-ai-openai-endpoint.test.mjs`| 7 tests verifying OpenAI compatibility & secret protection |
| **Integration Test Suite**| `tests/fera-ai.test.mjs` | 32 comprehensive tests verifying prompt safety & response formats |
| **Admin AI Credits Suite**| `tests/admin-ai-credits.test.mjs` | 10 tests verifying admin AI credit telemetry, per-shopkeeper breakdown & top-up controls |
| **Merchant AI Limits Suite**| `tests/merchant-ai-credits-limits-template.test.mjs` | 5 tests verifying merchant spend limits, pause toggles, template section removal event contract, and instant sandbox credit top-ups |
| **Admin Credit Control** | `frontend/src/pages/AdminAICreditsPage.tsx`, `backend/src/routes/admin.ts` | Real-time platform AI credit telemetry, shopkeeper usage leaderboard, and manual balance adjustment |

## 3. Strict Frontend / Backend Security Isolation
- **Private Backend Upstream:** `https://ai.fera-search.tech/v1` and its API secret (`FERA_AI_API_KEY`) are strictly held by the Cloudflare Worker backend.
- **Zero Frontend Leakage:** The client never receives, sees, or calls `ai.fera-search.tech/v1`. The frontend communicates exclusively with `/api/v1/ai/chat` (authenticated via WorkOS JWT and gated by D1 credits).
- **Secret Redaction:** All error responses and status checks scrub authorization tokens, keys, and upstream hosts.

## 4. Merchant Spend Safety Limits & Master Feature Toggles
To protect independent merchants from unexpected credit depletion:
- **Dual Limit Architecture:**
  - **FeraSetu AI Limit (`ferasetu_ai_limit`):** Monthly hard credit ceiling for shopkeeper backoffice tasks (inventory generation, order queries, business insights).
  - **Website & Storefront AI Limit (`website_ai_limit`):** Monthly hard credit ceiling for customer-facing store inquiries and template AI generators.
- **Master Feature Toggles:** `ferasetu_ai_enabled` and `website_ai_enabled` (0 = paused, 1 = active). When paused, `chargeAiCredits` immediately returns HTTP 403 without deducting credits or querying upstream models.
- **Quota Exceeded Enforcement:** When monthly usage equals or exceeds the merchant-configured cap, `chargeAiCredits` returns HTTP 429 with `{ error: 'AI limit reached for this month. Adjust your limit in AI Credits.' }`.
- **Storefront Template 1-Click Removal:** Shopkeepers can effortlessly add or remove the AI shopping assistant from any template section. Both the section header on the live store preview and the builder `DesignPanel.tsx` inspector provide a prominent, accessible "Remove from Section" button that dispatches `fera-remove-section` to purge the section from template state.

## 5. Token-Saving Context Injection
When dealing with AI inquiries, use pre-compiled catalog schema summaries instead of full table dumps:
- Compact prompt templates: `worker/ai/skills/shared.ts`
- Language localized dictionaries: `frontend/src/utils/languages.ts`
