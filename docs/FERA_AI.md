# FeraSetu — Fera AI System

**One assistant. Many internal skills. Built for Indian shopkeepers.**

---

## What Was Built (Phase 1)

### Fera AI — Single Unified Assistant

The shopkeeper sees only **Fera AI**. Behind the interface, an orchestrator routes to specialised internal skills. No confusing list of bots.

### Files Created / Changed

| File | Status | Description |
|------|--------|-------------|
| `frontend/src/App.tsx` | **Modified** | Added Statsig SDK integration (StatsigProvider, session replay, autocapture) + new `/fera-ai` route |
| `frontend/src/pages/FeraAIPage.tsx` | **Created** | Premium mobile-first Fera AI chat page with 6 capability categories, approval cards, voice input |
| `frontend/src/components/Layout.tsx` | **Modified** | Added Fera AI nav item with Sparkles icon |
| `frontend/src/utils/languages.ts` | **Modified** | Added `feraAI` translation key |
| `worker/index.js` | **Modified** | Added `POST /api/v1/ai/chat`, `GET /api/v1/health`, CEO orchestrator, intent classifier, Sarvam caller, credit system, audit logs |
| `worker/ai/skills/orchestrator.ts` | **Created** | Full TypeScript CEO Orchestrator with intent classification, context building, prompt routing |
| `worker/ai/chat-handler.ts` | **Created** | TypeScript chat handler interface for future Cloud Run service |
| `tests/fera-ai.test.mjs` | **Created** | 32-test suite covering auth, isolation, injection, credits, intent, history |

---

## Architecture

```
Shopkeeper (phone)
      │
      ▼
React Frontend (Vite + Tailwind)
  ├── /fera-ai  → FeraAIPage (new premium UI)
  └── /ai-assistant → AIAssistantPage (existing, preserved)
      │
      │  Authorization: Bearer <appwrite-jwt>
      ▼
Cloudflare Worker (worker/index.js)
  ├── Verify JWT → Appwrite API
  ├── Load shop context from D1
  ├── Classify intent (deterministic regex, free)
  ├── Build system prompt + context + history
  ├── Call Sarvam AI (sarvam-m or sarvam-2-105b)
  ├── Deduct 1 AI credit
  ├── Write audit log
  └── Return structured response
```

---

## Local Development

### 1. Install dependencies

```bash
# Root
npm install

# Frontend
cd frontend && npm install

# Backend (legacy Node.js)
cd ../backend && npm install
```

### 2. Configure environment

Create `frontend/.env.local`:

```env
VITE_APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=6a267e4a000415bb2cdb
VITE_USE_LOCAL_STORAGE=false
```

### 3. Start services

```bash
# Terminal 1 — Frontend (http://localhost:5173)
cd frontend && npm run dev

# Terminal 2 — Cloudflare Worker (http://localhost:8787)
npx wrangler dev --local

# Terminal 3 — Express backend (optional legacy, http://localhost:3001)
cd backend && npm run dev
```

### 4. Run tests

```bash
node tests/fera-ai.test.mjs
# Expected: 32 passed, 0 failed
```

---

## Deployment

### Cloudflare Worker

```bash
# Set secrets (run once)
npx wrangler secret put SARVAM_API_KEY
# Enter your Sarvam AI API key

# Deploy worker
npx wrangler deploy

# Verify deployment
curl https://ferasetu.YOUR_ACCOUNT.workers.dev/api/v1/health
```

### Frontend (Cloudflare Pages)

```bash
cd frontend
npm run build
# Upload dist/ to Cloudflare Pages
# Set environment variables in Pages dashboard
```

### Environment Variables for Worker

| Variable | How to set | Description |
|----------|------------|-------------|
| `SARVAM_API_KEY` | `wrangler secret put` | Sarvam AI API key |
| `APPWRITE_ENDPOINT` | `wrangler.toml` vars section | `https://sgp.cloud.appwrite.io/v1` |
| `APPWRITE_PROJECT_ID` | `wrangler.toml` vars section | Appwrite project ID |

---

## New API Endpoints

### POST `/api/v1/ai/chat`

**Requires:** `Authorization: Bearer <appwrite-jwt>`

```json
{
  "message": "Which products are low in stock?",
  "language": "en",
  "conversationHistory": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

**Response:**
```json
{
  "content": "You have 3 products running low on stock:\n- Rice 5kg (3 units left)\n- ...",
  "model": "sarvam-m",
  "skillsUsed": ["inventory"],
  "hasProposedActions": false,
  "proposedActions": [],
  "requestId": "uuid",
  "latencyMs": 1240,
  "aiCreditsBalance": 9
}
```

**Error codes:**
- `401` — Invalid or expired Appwrite JWT
- `402` — AI credits exhausted
- `422` — Invalid request body
- `429` — Sarvam rate limited
- `503` — Sarvam unavailable
- `504` — Sarvam timeout

### GET `/api/v1/health`

```json
{
  "status": "ok",
  "version": "2.0.0",
  "service": "fera-ai",
  "timestamp": "2026-08-06T04:00:00Z"
}
```

---

## Statsig Integration

Statsig is integrated in `App.tsx`:

```typescript
const { client } = useClientAsyncInit(
  'client-XOZr1YiFOBSi6y6elVRLgwEQSY44LvCVpRwTzdfbd98',
  { userID: 'a-user' },
  { plugins: [new StatsigAutoCapturePlugin(), new StatsigSessionReplayPlugin()] }
);
```

- **StatsigAutoCapturePlugin** — automatically tracks page views and clicks
- **StatsigSessionReplayPlugin** — records user sessions for UX debugging
- The `StatsigProvider` wraps the entire app tree

---

## Authentication Flow

```
1. User logs in via Appwrite (email+password or OTP)
2. Appwrite creates a session
3. Frontend calls account.createJWT() → gets JWT
4. JWT stored in localStorage as 'fera_token'
5. Every API request: Authorization: Bearer <jwt>
6. Worker calls GET /account on Appwrite with X-Appwrite-JWT header
7. If valid: worker gets { $id, email, name, ... }
8. Worker uses $id to scope all D1 queries
9. Frontend-provided user IDs are IGNORED
```

---

## Security Protections Implemented

| Protection | Implementation |
|-----------|----------------|
| **JWT Verification** | Every protected endpoint calls Appwrite to verify token |
| **Tenant Isolation** | All D1 queries use `WHERE user_id = me.$id` (from JWT) |
| **No Frontend Trust** | Body-provided user IDs are completely ignored |
| **Prompt Injection** | Retrieved content goes in user role only, never system role |
| **Credit Enforcement** | AI chat blocked when `ai_credits_balance <= 0` |
| **Request Validation** | Message validated: non-empty, max 4000 chars |
| **Language Validation** | Language code clamped to 5 chars |
| **History Clamping** | Conversation history capped at 10 messages |
| **Retry + Backoff** | Sarvam calls retry once with 800ms backoff |
| **Timeout** | 30s for simple tasks, 90s for complex (sarvam-2-105b) |
| **Audit Logging** | All AI requests logged with requestId, userId, model, skills |
| **CORS** | Restricted via existing CORS_HEADERS config |
| **Secrets** | SARVAM_API_KEY stored as Cloudflare Secret, never in code |

---

## Known Limitations (Phase 1)

1. **No conversation persistence** — messages exist only in React state
2. **Shop context rebuilt per request** — no KV caching yet
3. **Approval cards are UI-only** — execution not wired in Phase 1
4. **No voice TTS** — voice button does speech-to-text only
5. **No automation engine** — Phase 2
6. **No admin AI dashboard** — Phase 2
7. **No monthly credit reset automation** — Phase 2
8. **Worker is JavaScript** — TypeScript AI modules are companions only

---

## Phase 2 Roadmap

1. Add conversation persistence (`ai_conversations` + `ai_messages` tables)
2. Add KV caching for shop context (30-second TTL)
3. Add Google Cloud Run AI service for complex orchestrations
4. Implement approval action execution
5. Add Finance, Sales, Design, Support, SEO, Security skills
6. Build admin AI cost dashboard
7. Add automation engine (trigger/condition/action)
8. Add WhatsApp Business API integration
9. Add Cloudflare R2 for product image uploads
10. Implement monthly credit reset via Cron Triggers
11. Add per-tenant rate limiting
12. Add prompt versioning system
13. Add Voice TTS via Sarvam speech API
14. Add customer-facing shopping assistant per shop

---

## Appwrite Setup

1. Create project at https://cloud.appwrite.io
2. Enable Email/Password authentication
3. (Optional) Enable Google OAuth
4. Get Project ID from Settings
5. Set endpoint in frontend `.env.local`

The existing Appwrite configuration uses:
- **Endpoint:** `https://sgp.cloud.appwrite.io/v1`
- **Project ID:** `6a267e4a000415bb2cdb`
