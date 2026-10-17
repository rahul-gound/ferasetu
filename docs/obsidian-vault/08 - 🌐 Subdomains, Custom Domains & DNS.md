# 🌐 Subdomains, Custom Domains & DNS

> **Subsystem Completion:** `88%`  
> **Status:** 🟢 Production Ready  
> **Primary Path:** `worker/routes/domainRoutes.js`, `worker/index.js`  
> **Parent:** [[00 - 🗺️ System Architecture Overview]] | **Progress:** [[01 - 📊 Progress & Completion Matrix]]

---

## 1. Domain Resolution Hierarchy
FeraSetu resolves domains in three distinct tiers:
1. **Platform Wildcard Subdomains:** `shopname.ferasetu.com`
   - Instantly provisioned via wildcard DNS records.
   - Handled directly by Edge Worker via `Host` header inspection.
2. **Pro Custom Domains:** `myshop.in`, `organicspices.com`
   - Managed via Cloudflare Custom Hostname API (for Pro subscribers).
   - Automated SSL cert issuance & renewal via Let's Encrypt / DigiCert.
3. **Canonical Apex Fallback:** `ferasetu.com`
   - Directs to the main marketing landing page and merchant onboarding funnel.

## 2. Security & Tenant Isolation
- Strict origin host validation prevents host header spoofing attacks.
- Subdomain collision prevention prevents reserved names (`admin`, `api`, `auth`, `billing`, `mail`).
