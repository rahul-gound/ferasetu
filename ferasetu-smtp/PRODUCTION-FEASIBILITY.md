# PRODUCTION FEASIBILITY & DELIVERABILITY GATE REPORT

**Service:** `ferasetu-smtp`  
**Date Checked:** September 8, 2026  
**Modal SDK Version:** Modal >= 0.63 (`modal.App`, `modal.Volume`, `modal.fastapi_endpoint`)  
**Target Infrastructure:** Modal.com Serverless Compute + Cloudflare DNS (`ferasetu.com`) + Authenticated SMTP Relay  

---

## 1. Executive Summary

| Scope | Decision | Status |
| :--- | :--- | :--- |
| **Standalone Public SMTP Listener (Port 587/25) on Modal** | **BLOCKED** | Direct incoming SMTP port binding and public DNS mapping are unsupported on Modal. |
| **Direct Outbound Internet SMTP Delivery from Modal** | **BLOCKED** | Dynamic cloud IPs without Forward-Confirmed Reverse DNS (FCrDNS/PTR) fail major inbox deliverability standards (Google/Yahoo). |
| **Hybrid Architecture (Modal Orchestration + Authenticated Relay)** | **PASSED** | Modal handles auth, DKIM signing, persistent queue, merchant isolation, rate limits; outbound relay handles delivery with valid rDNS and IP reputation. |
| **Deliverability Compliance (SPF/DKIM/DMARC/FCrDNS)** | **PASSED** | Strict alignment with 2048-bit RSA DKIM keys per merchant subdomain and managed DNS records. |

---

## 2. Feasibility Audit Against Gate Requirements

### Requirement 1: Persistent SMTP Listener on Modal
* **Assessment:** **FAILED / BLOCKED for Production Public Ingress**
* **Finding:** Modal is a serverless execution platform optimized for containerized workloads, batch processing, and HTTP/WebSocket endpoints (`@modal.fastapi_endpoint`, `@modal.asgi_app`). It does not provide persistent static public TCP port listeners for incoming SMTP traffic.
* **Impact:** Mail clients or external servers cannot connect directly to `smtp.ferasetu.com:587` hosted as a native Modal listener.

### Requirement 2: Public TCP Networking for SMTP Submission/Delivery
* **Assessment:** **FAILED / BLOCKED**
* **Finding:** The only raw TCP ingress mechanism provided by Modal is `modal.forward(port, unencrypted=True)`. This mechanism allocates **dynamic, ephemeral ports** on randomly generated hostnames (e.g., `tcp-tunnel-xyz.modal.run:39214`).
* **Impact:** Ephemeral random ports cannot be configured in public DNS MX or submission records.

### Requirement 3: Required SMTP Ports (25, 587, 465)
* **Assessment:** **FAILED / BLOCKED**
* **Finding:** Standard inbound ports 25, 587, and 465 cannot be bound directly as static public ports. Outbound port 25 is restricted or throttled by cloud providers hosting serverless nodes (AWS/GCP) to prevent spam abuse.

### Requirement 4: Officially Supported Production Networking vs. Experimental Tunnels
* **Assessment:** **FAILED / BLOCKED (for Tunnels)**
* **Finding:** `modal.forward()` is officially designed as an interactive debugging and tunneling tool (for Jupyter notebooks, VS Code, SSH, or ad-hoc testing). Modal's official documentation explicitly warns that tunnels do not have static IP addresses or standard port reservations and are not designed as a production TCP ingress proxy.

### Requirement 5: Stable Public Network Identity for Outbound SMTP
* **Assessment:** **FAILED / BLOCKED**
* **Finding:** Modal containers execute on a shared, dynamically scheduled worker pool across multiple cloud availability zones. Egress traffic originates from dynamic multi-tenant cloud IP addresses that change across container lifecycles.
* **Impact:** CAS-level and domain-level email deliverability requires a consistent, warmed, and reputable IP address. Casually rotating through shared cloud IPs leads to immediate blacklisting (e.g. Spamhaus PBL).

### Requirement 6: DNS / Reverse DNS (rDNS / PTR) Support
* **Assessment:** **FAILED / BLOCKED (for Direct Delivery)**
* **Finding:** RFC 5321, RFC 7208, and deliverability policies mandated by Google, Yahoo, and Microsoft require **Forward-Confirmed Reverse DNS (FCrDNS)**:
  1. The sending IP must resolve to a valid hostname via a PTR record (`PTR(sending_ip) -> mail.ferasetu.com`).
  2. The hostname must resolve back to that same IP via an A record (`A(mail.ferasetu.com) -> sending_ip`).
  3. The HELO/EHLO hostname in the SMTP session must match this hostname.
  Because Modal does not own the upstream IP ranges or offer PTR record delegation for container egress IPs, direct outbound delivery fails FCrDNS.

### Requirement 7: Resource Limits (0.125 CPU, 128 MiB RAM)
* **Assessment:** **PASSED**
* **Finding:** Modal's official minimum resource defaults are exactly:
  * CPU: `0.125` cores
  * Memory: `128` MiB
  Configuring `@app.function(cpu=0.125, memory=128)` is fully supported and matches FeraSetu's targets without requiring unsupported workarounds.

### Requirement 8: Autoscaling and Warm Instance Management
* **Assessment:** **PASSED**
* **Finding:** Modal provides `keep_warm=1` to guarantee at least one warm container is always ready, completely eliminating cold starts for transactional email dispatch. Under burst traffic, `max_containers` allows horizontal scaling.

### Requirement 9: No Undocumented Assumptions
* **Assessment:** **PASSED**
* **Finding:** The architecture makes zero assumptions regarding static IPs, TCP forwarding, or undocumented container host settings.

### Requirement 10: Reasonable Production Architecture for Transactional Email
* **Assessment:** **PASSED (via Hybrid Architecture)**
* **Finding:** Direct-to-MX delivery from serverless containers is fundamentally flawed for production email. A hybrid architecture—where Modal handles mail composition, merchant domain isolation, DKIM signing, persistent queueing, and rate limiting, and an authenticated relay handles final network delivery—is the industry gold standard.

---

## 3. Final Gate Status

```
===================================================================
PRODUCTION FEASIBILITY (DIRECT STANDALONE MTA): BLOCKED
DIRECT SMTP DELIVERY:                           BLOCKED
PRODUCTION FEASIBILITY (HYBRID MODAL + RELAY):  PASSED
DELIVERABILITY STATUS:                          PASS (HYBRID PATH)
===================================================================
```

---

## 4. Deliverability & Anti-Spam Architecture

### A. Clear Separation of Environments

| Environment | Component | Network Path | Role |
| :--- | :--- | :--- | :--- |
| **Production Ready** | `modal_app.py` | HTTPS (`fastapi_endpoint`) | Authenticated API, DKIM Signing, Persistent Queue, Rate Limits |
| **Production Ready** | `delivery.py` (Relay Mode) | TLS 587 (Authenticated) | Dispatches through Postfix or upstream SMTP relay (e.g. Brevo/SES) |
| **Prototype / Dev Only** | `dev_smtp_listener.py` | Raw TCP / `modal.forward()` | Local development & offline protocol testing |

### B. Authentication Alignment (SPF, DKIM, DMARC)
Every merchant identity is scoped to a dedicated subdomain:
* **Merchant Sender Address:** `noreply@shopname-mumbai-mh-1.ferasetu.com`
* **DKIM Selector:** `fs1`
* **DKIM Key:** 2048-bit RSA private key stored securely per merchant
* **DKIM Alignment:** Strict/relaxed alignment matching the `From:` header domain (`d=shopname-mumbai-mh-1.ferasetu.com`)
* **SPF Alignment:** Envelope sender / Return-Path resolves to `shopname-mumbai-mh-1.ferasetu.com` with authorized relay inclusion.
* **DMARC:** `v=DMARC1; p=reject; rua=mailto:dmarc-reports@ferasetu.com; aspf=r; adkim=r`

### C. Google Postmaster & Yahoo Compliance Standards
1. **Spam Complaint Thresholds:**
   * Target: `< 0.05%`
   * Alert / Investigation: `>= 0.10%`
   * Automatic Sender Suspension: `>= 0.30%` (Google hard cutoff)
2. **Bounce Thresholds:**
   * Warning: `>= 2.0%`
   * Automatic Sender Suspension: `>= 5.0%`
   * Hard bounces (5xx) are automatically added to the suppression table immediately.
3. **Transactional-Only Policy:**
   * Strictly limited to order confirmations, authentication codes, password resets, and receipts.
   * Promotional bulk mail is prohibited from sharing this sending pool.
4. **Gradual Merchant Warm-Up Ramp:**
   * Day 1: Max 50 emails/day
   * Day 2: Max 100 emails/day
   * Day 3: Max 250 emails/day
   * Day 4: Max 500 emails/day
   * Day 7+: Standard merchant allowance (e.g., 2,500/day)
