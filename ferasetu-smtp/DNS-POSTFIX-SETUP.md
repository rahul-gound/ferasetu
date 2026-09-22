# FeraSetu DNS, Postfix MTA & Deliverability Architecture (`DNS-POSTFIX-SETUP.md`)

This document defines the exact DNS records, authentication architecture (SPF, DKIM, DMARC), MX routing, and Modal container networking constraints for `ferasetu-smtp`.

---

## 1. Core Architecture Overview

* **Root Domain:** `ferasetu.com` (owned and managed in Cloudflare DNS)
* **Merchant Email Identity:** `noreply@<merchant-slug>.ferasetu.com` (e.g. `noreply@my-store-mumbai-andheri-mh-1.ferasetu.com`)
* **Merchant Storefront URL:** `https://<merchant-slug>.ferasetu.com` (e.g. `https://my-store-mumbai-andheri-mh-1.ferasetu.com`)
* **MTA Engine:** In-Container **Postfix MTA** on loopback `127.0.0.1:25` (Modal serverless persistent container)
* **Cryptographic DKIM Signing:** 2048-bit RSA, selector `fs1`, domain `d=<merchant-slug>.ferasetu.com`

---

## 2. Cloudflare DNS Records Matrix

All DNS records under `ferasetu.com` are managed via the Cloudflare REST API.

### 2.1. Centralized Platform Records (Zone Level: `ferasetu.com`)

| Record Type | Name / Host | Content / Value | TTL | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **TXT** | `_spf.ferasetu.com` | `v=spf1 ~all` | 3600 | Centralized SPF policy anchor for FeraSetu sending infrastructure. Subdomains delegate here. |
| **TXT** | `_dmarc.ferasetu.com` | `v=DMARC1; p=reject; sp=reject; rua=mailto:dmarc-reports@ferasetu.com; aspf=r; adkim=r` | 3600 | Platform-wide DMARC policy. `p=reject` protects apex; `sp=reject` automatically protects all merchant subdomains. |
| **TXT** | `ferasetu.com` | `v=spf1 include:_spf.ferasetu.com ~all` | 3600 | Apex SPF record for official emails (`noreply@ferasetu.com`). |
| **TXT** | `fs1._domainkey.ferasetu.com` | `v=DKIM1; k=rsa; p=<apex-public-key>` | 3600 | DKIM signature verification for official platform communications. |

### 2.2. Per-Merchant Subdomain Records (Automated via Cloudflare API)

When a merchant provisions a shop with canonical slug `my-store-mumbai-andheri-mh-1`:

| Record Type | Name / Host | Content / Value | TTL | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **TXT** | `fs1._domainkey.my-store-mumbai-andheri-mh-1.ferasetu.com` | `v=DKIM1; k=rsa; p=<merchant-2048-rsa-public-key>` | 3600 | **DKIM Authentication**: 2048-bit RSA public key matching the private key used by `DKIMSigner`. |
| **TXT** | `my-store-mumbai-andheri-mh-1.ferasetu.com` | `v=spf1 include:_spf.ferasetu.com ~all` | 3600 | **SPF Authentication**: Centralized include avoiding conflicting SPF records across subdomains. |
| **TXT** | `_dmarc.my-store-mumbai-andheri-mh-1.ferasetu.com` | `v=DMARC1; p=reject; rua=mailto:dmarc-reports@ferasetu.com; aspf=r; adkim=r` | 3600 | **Explicit DMARC Override**: Reinforces strict reject alignment (can be omitted if relying on `sp=reject`). |

---

## 3. SPF Strategy & Architecture

### Where does the SPF record belong?
In SPF (RFC 7208 §4.3), SPF evaluation strictly checks the domain in the `RFC 5321.MailFrom` (envelope sender) address:
```
MAIL FROM: <noreply@my-store-mumbai-andheri-mh-1.ferasetu.com>
```
* **RFC 7208 Constraint**: An SPF record on the apex domain (`ferasetu.com`) **does not** automatically apply to its subdomains.
* **Centralized Policy Anchor**: Rather than hardcoding distinct IP lists or vendor entries on every merchant record, FeraSetu publishes the master sending policy at:
  `_spf.ferasetu.com`
* Each merchant subdomain publishes:
  `v=spf1 include:_spf.ferasetu.com ~all`
* **Advantage**: Any update to the egress sending infrastructure is made once at `_spf.ferasetu.com` and immediately applies to all merchant subdomains without touching individual DNS records.
* **Conflict Prevention**: Never publish more than one TXT record starting with `v=spf1` on the same subdomain.

---

## 4. DKIM Strategy (RFC 6376)

* **Selector:** `fs1`
* **Key Length:** 2048-bit RSA (`rsa-sha256`)
* **Private Key Storage:** Stored securely on the persistent Modal Volume at:
  `/data/dkim_keys/<canonical-domain>.key`
* **Canonicalization:** `relaxed/relaxed` (tolerates whitespace/header adjustments during transit)
* **Strict DMARC Alignment:**
  * Header `From: noreply@my-store-mumbai-andheri-mh-1.ferasetu.com`
  * DKIM signature header: `d=my-store-mumbai-andheri-mh-1.ferasetu.com; s=fs1`
  * Because `d=` **exactly matches** the `From:` domain, DKIM achieves 100% **Strict Alignment** (`adkim=s` and `adkim=r`).
* **Cloudflare Automation**: The base64 DER public key is extracted directly from the generated RSA key and published via `POST /v1/merchants/{merchant_id}/provision`.

---

## 5. DMARC Strategy (RFC 7489)

### Separation of Concerns:
1. **Official FeraSetu Email (`noreply@ferasetu.com`):**
   * Evaluates `_dmarc.ferasetu.com`.
   * Policy: `p=reject`.
2. **Merchant Transactional Email (`noreply@<merchant-slug>.ferasetu.com`):**
   * Subdomains inherit policy from `_dmarc.ferasetu.com` using the `sp=` tag (RFC 7489 §6.6.3).
   * Since `_dmarc.ferasetu.com` defines `sp=reject`, receiving MX servers will reject unauthorized emails claiming to be from any `<merchant-slug>.ferasetu.com`.
   * An explicit record `_dmarc.<merchant-slug>.ferasetu.com` is automatically provisioned to give per-merchant reporting autonomy if needed.

> [!WARNING]
> **Common Misconfiguration Guard**:
> * `fs1._domainkey.<domain>` is a **DKIM** public key record.
> * `_dmarc.<domain>` is a **DMARC** policy record.
> * Never publish a `v=DMARC1` record under `_domainkey` or vice-versa.

---

## 6. MX Records: Outbound Sending vs. Inbound Receiving

* **Pure Outbound Transactional Mail**:
  * Outbound mail servers (Postfix) do **not** require an MX record on the sender domain to transmit email.
  * Destination MX servers verify identity via SPF, DKIM, and DMARC, not sender MX records.
* **Inbound Receiving / Customer Replies**:
  * If merchants later accept customer replies at `noreply@...` or `support@<merchant-slug>.ferasetu.com`, an MX record pointing to an inbound mail processor is required:
    ```
    my-store-mumbai-andheri-mh-1.ferasetu.com  MX  10  mail.ferasetu.com
    ```
  * In the current outbound-only transactional phase, MX records are flagged as `required_for_outbound: false` to keep DNS clean and avoid routing unhandled bounces to a non-existent recipient inbox.

---

## 7. Modal.com Container Networking & SMTP Reality Check

### Egress Networking Path
```
OutboundDispatcher (Python)
  │ (SMTP over 127.0.0.1:25)
  ▼
Postfix MTA Daemon (inside Modal container)
  │ (Direct SMTP over Internet to destination MX)
  ▼
Destination Mail Server (Gmail / Outlook / Yahoo)
```

### Reality Check & Cloud Limitations
1. **Modal Serverless IP Identity:**
   * Modal containers run on shared cloud infrastructure (AWS / GCP / OCI / CoreWeave).
   * Egress IPs are dynamically assigned from shared cloud IP pools on each container boot.
2. **Port 25 Outbound Restrictions:**
   * Major cloud providers block raw outbound TCP port 25 by default to prevent spam botnets.
   * Unless specific static egress IP allocations with port 25 unblocking are arranged with the cloud provider, outbound connection attempts from Postfix directly to remote MX port 25 may be dropped.
3. **Forward-Confirmed Reverse DNS (FCrDNS / PTR Records):**
   * Destination MX servers (Google, Yahoo, Microsoft) require that the egress IP's reverse DNS (PTR) resolves to `mail.ferasetu.com`, and that `mail.ferasetu.com` forward-resolves back to that exact same IP.
   * Modal does not provide custom PTR record editing for serverless container egress IPs.
4. **Conclusion on Production Status:**
   * Postfix MTA inside the container is **100% operational, fully configured, and actively queues and processes mail**.
   * State reporting is kept strictly honest: when Postfix accepts mail, the state is recorded as **`POSTFIX_QUEUED`** (not `DELIVERED`).
   * Service is marked: **`READY WITH EXTERNAL DEPENDENCY`** (downstream delivery over public port 25 depends on cloud network egress policy / static IP tunnel).
