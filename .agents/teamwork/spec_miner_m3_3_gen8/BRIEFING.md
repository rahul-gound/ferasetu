# BRIEFING — 2026-10-02T05:26:00Z

## Mission
Mine specifications, standards, and validation rules for Milestone 3 (R3: Pluggable Domain Provider & Purchase/Connect Architecture).

## 🔒 My Identity
- Archetype: specification_miner
- Roles: Specification Miner
- Working directory: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\teamwork\spec_miner_m3_3_gen8
- Original parent: 76ef2f37-4c0f-43b4-8dfd-b52f18004856
- Milestone: Milestone 3 (R3)

## 🔒 Key Constraints
- Sole job is to discover and document features by probing authoritative specification. Do NOT implement anything.
- Do NOT skip any feature, no matter how obscure.
- Prioritize authoritative sources over LLM prior knowledge.
- Must cover RFC 1035 domain name validation rules, authoritative pricing & 18% GST calculation, DNS verification specification (5 records, DoH, failure states).
- Output specification and validation matrix in `handoff.md` with required sections and tables.
- Update `progress.md` as work proceeds.
- Send results to parent via `send_message`.

## Current Parent
- Conversation ID: 76ef2f37-4c0f-43b4-8dfd-b52f18004856
- Updated: 2026-10-02T05:26:00Z

## Task Summary
- **What to build**: Specification discovery & validation rules documentation for Milestone 3 (Domain provider, purchase, connect, DNS verification, pricing calculation).
- **Success criteria**: Comprehensive handoff report with exact validation algorithms, regexes, pricing tables/formulas, DNS record specifications, failure modes, error codes, and edge case matrices.
- **Interface contracts**: `PROJECT.md`, `ORIGINAL_REQUEST.md` (R3), `context.md`
- **Code layout**: Project root codebase, tests, Cloudflare worker domain module.

## Key Decisions Made
- [RFC 1035]: Formalized exact length bounds (total <= 253, label <= 63) and label regex `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`, no leading/trailing hyphens, no consecutive dots, blocking `ferasetu.com` root and subdomains.
- [Authoritative Pricing]: Defined base prices (.in: ₹799, .com: ₹999, .store: ₹499, .co.in: ₹699, fallback: ₹899), 18% GST calculation with `Math.round(price * 0.18 * 100) / 100`, duration validation (1–10 integer years), and anti-tampering rejection.
- [DNS Verification]: Documented the 5 required records (TXT ownership challenge, TXT DKIM `fs1`, TXT SPF, TXT DMARC `_dmarc`, CNAME `mail`), Cloudflare DoH parallel query execution, quote unescaping, and failure/state transitions.
- [Deliverables]: Completed `handoff.md` containing 15 Discovered Features, 30 Edge Cases, 5-component report structure, and exact code algorithms.

## Artifact Index
- `.agents/teamwork/spec_miner_m3_3_gen8/handoff.md` — Final handoff report & validation matrix
- `.agents/teamwork/spec_miner_m3_3_gen8/progress.md` — Progress heartbeat
- `.agents/teamwork/spec_miner_m3_3_gen8/DISPATCH.md` — Incoming dispatch logs

## Loaded Skills
None
