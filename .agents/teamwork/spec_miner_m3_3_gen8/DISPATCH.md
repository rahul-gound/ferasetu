## 2026-10-02T04:56:31Z

You are spec_miner_m3_3_gen8.
Your working directory is: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\teamwork\spec_miner_m3_3_gen8
Your project root is: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-

Authoritative Request:
Read c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\ORIGINAL_REQUEST.md (specifically under header ## 2026-10-01T11:23:41Z and requirement R3).
Master plan & contracts:
Read c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\PROJECT.md.
Also read your context: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\teamwork\spec_miner_m3_3_gen8\context.md.

Task:
Mine specifications, standards, and validation rules for Milestone 3 (R3: Pluggable Domain Provider & Purchase/Connect Architecture).
Examine:
- Domain name validation rules per RFC 1035: total length <= 253 characters, label length <= 63 characters, label regex (`^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`), no leading/trailing hyphens, no consecutive dots, forbidden platform domains (e.g. `ferasetu.com`, `admin.ferasetu.com`, `mail.ferasetu.com`).
- Authoritative Pricing calculation specification: base prices across supported TLDs (`.in`, `.com`, `.store`, `.co.in`), 18% GST tax calculation with exact rounding rules, total INR calculation, duration validation (1 to 10 integer years, reject zero/negative/fractional/excessive years).
- DNS Verification specification: exactly 5 DNS records required (TXT challenge `_ferasetu-challenge`, TXT DKIM `fs1._domainkey`, TXT SPF, TXT DMARC `_dmarc`, and CNAME `mail`), record value formats, DoH verification handling, and failure states.

Write your specification and validation matrix in:
c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\teamwork\spec_miner_m3_3_gen8\handoff.md
Update progress.md as you work. When finished, send a message to parent.
