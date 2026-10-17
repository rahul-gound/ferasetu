# 🧪 QA, Testing & Control Plane

> **Subsystem Completion:** `92%`  
> **Status:** 🟢 Production Ready  
> **Primary Path:** `tests/`, `packages/qa-engine/`  
> **Parent:** [[00 - 🗺️ System Architecture Overview]] | **Progress:** [[01 - 📊 Progress & Completion Matrix]]

---

## 1. Test Suite Coverage (38+ Test Suites)
The platform enforces strict automated verification using the native Node.js test runner (`node --test`).

### Key Suites:
- `tests/fera-ai.test.mjs`: 32 tests verifying Sarvam prompt sanitization, intent routers, and fallbacks.
- `tests/p1-slice-a-commerce-loop.test.mjs`: Full end-to-end cart-to-order-to-receipt cycle.
- `tests/cashfree-payment-verification.test.mjs`: Payment webhook verification and replay defenses.
- `tests/auth-fail-closed.test.mjs`: Validates that expired/tampered JWT tokens fail closed safely.
- `tests/qa-control-plane.test.mjs`: Architectural health-check orchestrator.
- `tests/tenant-isolation.test.mjs`: Multi-tenant data segregation audits across D1 SQLite shards.

## 2. Fast Execution Commands
```bash
# Run full unit & integration tests
npm test

# Run QA control plane health-check
npm run test:qa

# Run QA engine smoke test
npm run qa:smoke
```
