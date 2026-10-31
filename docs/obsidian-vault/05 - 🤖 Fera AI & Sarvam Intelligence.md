# 🤖 Fera AI & Sarvam Intelligence

> **Subsystem Completion:** `90%`  
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
| **Core AI Route** | `backend/src/routes/ai.ts` | Authenticated merchant proxy for AI calls |
| **Voice Router** | `backend/src/routes/voice.ts` | Speech-to-text and audio translation pipeline |
| **Endpoint Test Suite**| `tests/fera-ai-openai-endpoint.test.mjs`| 7 tests verifying OpenAI compatibility & secret protection |
| **Integration Test Suite**| `tests/fera-ai.test.mjs` | 32 comprehensive tests verifying prompt safety & response formats |
| **Admin AI Credits Suite**| `tests/admin-ai-credits.test.mjs` | 10 tests verifying admin AI credit telemetry, per-shopkeeper breakdown & top-up controls |
| **Admin Credit Control** | `frontend/src/pages/AdminAICreditsPage.tsx`, `backend/src/routes/admin.ts` | Real-time platform AI credit telemetry, shopkeeper usage leaderboard, and manual balance adjustment |

## 3. Strict Frontend / Backend Security Isolation
- **Private Backend Upstream:** `https://ai.fera-search.tech/v1` and its API secret (`FERA_AI_API_KEY`) are strictly held by the Cloudflare Worker backend.
- **Zero Frontend Leakage:** The client never receives, sees, or calls `ai.fera-search.tech/v1`. The frontend communicates exclusively with `/api/v1/ai/chat` (authenticated via WorkOS JWT and gated by D1 credits).
- **Secret Redaction:** All error responses and status checks scrub authorization tokens, keys, and upstream hosts.

## 4. Token-Saving Context Injection
When dealing with AI inquiries, use pre-compiled catalog schema summaries instead of full table dumps:
- Compact prompt templates: `worker/ai/skills/shared.ts`
- Language localized dictionaries: `frontend/src/utils/languages.ts`
