# BRIEFING — 2026-10-01T12:16:00Z

## Mission
Design and implement a comprehensive opaque-box test suite for FeraSetu's external integrations, domains, email system, and tenant isolation in tests/e2e-domains-email.test.mjs with TEST_INFRA.md and TEST_READY.md.

## 🔒 My Identity
- Archetype: test_writer
- Roles: specialist, qa
- Working directory: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\test_writer_e2e_gen6
- Original parent: 030ef1f7-ee1c-42c9-b5b4-a88328a36303
- Milestone: E2E Domains & Email Testing Track

## 🔒 Key Constraints
- Exclusive write ownership: `tests/e2e-domains-email.test.mjs`, `TEST_INFRA.md`, `TEST_READY.md`, and files inside working directory `.agents/test_writer_e2e_gen6/`.
- DO NOT modify frontend or worker production files.
- Test runner: `node --test tests/e2e-domains-email.test.mjs`.
- Opaque-box testing (exercise real endpoints/interfaces, do not mock internal logic in facade ways).
- Tier 1: >=5 test cases per feature across canonical integrations, domain resolution, FeraSetu mail default, sender aliases, Reply-To routing, transactional templates, AI tools, delivery logs.
- Tier 2: Boundary & Corner Cases (CRLF header injection, unverified domain sender spoofing, domain collision HTTP 409, invalid syntax, empty variables).
- Tier 3: Cross-Feature Combinations (Custom domain + FeraSetu email, Domain purchase + Cashfree HMAC, Template override + test send).
- Tier 4: Real-World Scenarios (Full merchant lifecycle: onboarding, domain connection, DNS verification, sender alias setup, transactional dispatch).

## Current Parent
- Conversation ID: 030ef1f7-ee1c-42c9-b5b4-a88328a36303
- Updated: not yet

## Task Summary
- **What to build**: Comprehensive opaque-box test suite `tests/e2e-domains-email.test.mjs`, architecture & methodology doc `TEST_INFRA.md`, completion checklist `TEST_READY.md`.
- **Success criteria**: All tests execute and pass with `node --test tests/e2e-domains-email.test.mjs`, covering all 4 tiers with >=5 cases per feature in Tier 1.
- **Interface contracts**: `PROJECT.md`, `ORIGINAL_REQUEST.md`, `survey_spec_miner_3_gen6/handoff.md`.
- **Code layout**: Project root `tests/`, root docs `TEST_INFRA.md`, `TEST_READY.md`.

## Key Decisions Made
- [TBD]

## Artifact Index
- [TBD]

## Loaded Skills
- None required for backend Node test suite.

## Quality Status
- **Build/test result**: Not run yet
- **Lint status**: Not run yet
- **Tests added/modified**: `tests/e2e-domains-email.test.mjs` (in progress)
