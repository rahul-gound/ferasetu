# 🤖 Fera AI & Sarvam Intelligence

> **Subsystem Completion:** `85%`  
> **Status:** 🟡 Active Enhancement  
> **Primary Path:** `worker/ai/`, `backend/src/routes/ai.ts`, `docs/FERA_AI.md`  
> **Parent:** [[00 - 🗺️ System Architecture Overview]] | **Progress:** [[01 - 📊 Progress & Completion Matrix]]

---

## 1. System Role & Value Proposition
Fera AI is an Indic-first conversational assistant and copilot for shopkeepers. Powered by Sarvam AI models (`sarvam-2b` / `sarvam-m`), it handles inventory creation, voice commands in regional languages (Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, etc.), and store performance queries without requiring technical jargon.

## 2. Component Structure

| Component | Path | Function |
| :--- | :--- | :--- |
| **Model Router** | `worker/ai/router.ts` | Intent classification & model selection |
| **Sarvam Provider** | `worker/ai/providers/sarvam.ts` | REST API wrapper for Sarvam completion endpoints |
| **Skill Orchestrator** | `worker/ai/skills/orchestrator.ts` | Dispatches actions (create product, check orders, sales summary) |
| **Core AI Route** | `backend/src/routes/ai.ts` | Authenticated merchant proxy for AI calls |
| **Voice Router** | `backend/src/routes/voice.ts` | Speech-to-text and audio translation pipeline |
| **Test Suite** | `tests/fera-ai.test.mjs` | 32 comprehensive tests verifying prompt safety & response formats |

## 3. Token-Saving Context Injection
When dealing with AI inquiries, use pre-compiled catalog schema summaries instead of full table dumps:
- Compact prompt templates: `worker/ai/skills/shared.ts`
- Language localized dictionaries: `frontend/src/utils/languages.ts`
