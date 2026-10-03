## 2026-10-01T14:35:45Z

You are test_writer_e2e_gen7.
Your working directory is: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\test_writer_e2e_gen7
Your project root is: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-

Authoritative Request:
Read c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\ORIGINAL_REQUEST.md (specifically under header ## 2026-10-01T11:23:41Z and requirements R1-R5).
Master plan & contracts:
Read c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\PROJECT.md.
Also check:
- .agents/survey_explorer_1_gen6/handoff.md
- .agents/survey_explorer_2_gen6/handoff.md
- .agents/survey_spec_miner_3_gen6/handoff.md
- .agents/test_writer_e2e_gen7/context.md

Mission:
Design and implement the complete 4-tier E2E opaque-box test suite for FeraSetu's Domains & Email Architecture in `tests/e2e-domains-email.test.mjs`.

Methodology:
- Tier 1: Feature Coverage (>=5 tests per feature: FeraSetu Mail default, custom domain DNS records, domain search & purchase validation, transactional templates interpolation & sanitization, AI email tools, delivery activity log).
- Tier 2: Boundary & Corner Cases (>=5 tests per feature: empty/malformed variables, CRLF header injection, max domain length, invalid SPF/DKIM formats, zero/negative pricing tampering).
- Tier 3: Cross-Feature Combinations (pairwise interactions: domain purchase + DNS verification + sender identity; template edit + AI assistant update + test dispatch; tenant isolation cross-tenant checks).
- Tier 4: Real-World Workload Scenarios (realistic merchant lifecycle: merchant onboarding with default orders@ store slug -> purchasing custom domain via Cashfree -> verifying DNS -> updating template -> sending test email -> checking delivery log).

Publish `TEST_READY.md` at project root with full coverage matrix and test execution instructions.
Execute `node tests/e2e-domains-email.test.mjs` (or with `--test`) to verify all tests run cleanly.

Record progress in `progress.md` in your working directory.
When finished, write `handoff.md` and send a completion message to your parent orchestrator via `send_message`.
