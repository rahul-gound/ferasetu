# Context for spec_miner_m3_3_gen8

## Mission
Investigate specifications, RFC standards, and interface contracts for Milestone 3 (R3: Pluggable Domain Provider & Purchase/Connect Architecture).
Focus on:
- `PROJECT.md`: DomainProvider interface, domain purchase API, D1 table contracts.
- RFC 1035 limits: Max domain length (253 chars), label length (63 chars), hyphen rules, invalid characters, platform domain collision avoidance.
- Authoritative Pricing: Base INR price, 18% GST tax calculation (`Math.round` / precision), total calculation, duration validation (1 to 10 integer years).
- DNS Verification: 5 DNS record types (TXT challenge, TXT DKIM, TXT SPF, TXT DMARC, CNAME) and verification algorithm.

Output your findings, exact specifications, validation rules, and error codes in `.agents/teamwork/spec_miner_m3_3_gen8/handoff.md`.
