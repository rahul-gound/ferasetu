# 🌪️ Hurricane Electric IPv6 Tunnel & SMTP Relay Architecture

> **Subsystem Completion:** `97%`  
> **Status:** 🟢 Operational (Single-Container Modal + Oracle VM + HE 6in4 Tunnel)  
> **Primary Path:** `ferasetu-smtp/`, `worker/services/emailService.js`, Oracle Postfix Gateway (`92.4.77.19` / `2001:470:35:813::2`)  
> **Parent:** [[00 - 🗺️ System Architecture Overview]] | **Progress:** [[01 - 📊 Progress & Completion Matrix]] | **Edge Tier:** [[02 - ⚡ Edge Tier (Cloudflare Workers & D1)]]

---

## 1. Why Hurricane Electric IPv6 Tunnelbroker?

Delivering zero-cost transactional emails for thousands of independent shopkeepers (`0% commission`) without third-party email tax (SendGrid, Postmark, Mailgun fees) faces two major industry roadblocks:

1. **Cloud IPv4 Port 25 Outbound Blacklists & Blocks:**
   - Serverless platforms (Modal.com, Cloudflare Workers, AWS Lambda) strictly block outbound TCP connections on port 25.
   - Cloud IPv4 address pools (Oracle Cloud, DigitalOcean, AWS EC2) frequently carry legacy reputation penalties, low sender scores on Spamhaus, or lack customizable reverse DNS (PTR) delegation on standard tiers.

2. **The Hurricane Electric (AS6939) Solution:**
   - **Dedicated Clean IPv6 Allocation:** Hurricane Electric provides dedicated `/64` IPv6 prefixes (`2001:470:35:813::/64`) through a static 6in4 SIT tunnel.
   - **Full Reverse DNS (PTR) Authority:** Hurricane Electric delegates forward-confirmed reverse DNS (rDNS) directly to the domain owner via `tunnelbroker.net`, enabling strict compliance with Google and Yahoo's 2024+ sender mandates.
   - **Direct Port 25 Internet Delivery:** Postfix on the Oracle VM delivers directly to major destination MX servers (Gmail, Outlook, Yahoo) over pristine IPv6 routes.

---

## 2. End-to-End Mail Delivery Topology

```
[Cloudflare Edge Worker (worker/services/emailService.js)]
         │
         │  1. HTTPS POST /v1/email/send (Bearer FERASETU_SMTP_API_KEY)
         ▼
[Modal.com Serverless App: ferasetu-smtp (singhantima203)]
         │  - Persistent container (/data volume: ferasetu-smtp-data)
         │  - 2048-bit RSA DKIM signing (fs1._domainkey.ferasetu.com)
         │  - SQLite durable queue & rate limiting
         │
         │  2. Authenticated SMTP over TLS (Port 587)
         ▼
[Oracle Cloud Relay VM: 92.4.77.19 (mail.ferasetu.com)]
         │
         │  3. Encapsulated 6in4 IPv6 SIT Tunnel (HE Tunnel ID: 1038745)
         │     Local Tunnel Endpoint: 2001:470:35:813::2
         │     Server PoP: tserv25.sin1.ipv6.he.net (Singapore)
         ▼
[Hurricane Electric Global Backbone (AS6939)]
         │
         │  4. Native Outbound SMTP Delivery (Port 25 over IPv6)
         │     Source IP: 2001:470:35:813::2
         ▼
[Destination MX Server (e.g., gmail-smtp-in.l.google.com)]
   ├── Passes SPF: v=spf1 ip6:2001:470:35:813::2 -all
   ├── Passes DKIM: fs1._domainkey.ferasetu.com (2048-bit RSA)
   ├── Passes DMARC: v=DMARC1; p=reject (Strict 100% alignment)
   └── Matches FCrDNS: 2.0.0.0...ip6.arpa -> mail.ferasetu.com
```

---

## 3. Tunnel Configuration & DNS Contracts

### A. Hurricane Electric Tunnel Parameters
- **Tunnel ID:** `1038745`
- **Server IPv4 (HE PoP):** `216.218.221.42` (`tserv25.sin1.ipv6.he.net`)
- **Client IPv4 (Oracle VM):** `92.4.77.19`
- **Client IPv6 (Assigned Endpoint):** `2001:470:35:813::2/64`
- **Server IPv6:** `2001:470:35:813::1/64`

### B. DNS & Deliverability Invariants

| Record | Type | Value | Role |
| :--- | :---: | :--- | :--- |
| `mail.ferasetu.com` | `A` | `92.4.77.19` | Ingress submission endpoint for Modal |
| `mail.ferasetu.com` | `AAAA` | `2001:470:35:813::2` | Outbound IPv6 HELO / identity |
| `ferasetu.com` | `TXT` (SPF) | `v=spf1 ip6:2001:470:35:813::2 -all` | Authorizes Hurricane IPv6 only; rejects untrusted IPs |
| `fs1._domainkey.ferasetu.com` | `TXT` (DKIM) | `v=DKIM1; k=rsa; p=MIIBIj...` | 2048-bit cryptographic message signature |
| `_dmarc.ferasetu.com` | `TXT` (DMARC) | `v=DMARC1; p=reject; sp=reject; ...` | Enforces reject on unaligned or forged senders |
| `2.0.0.0...ip6.arpa` | `PTR` | `mail.ferasetu.com` | Forward-Confirmed Reverse DNS (FCrDNS) |

---

## 4. Modal Container Secrets Contract

Modal requires the following secrets passed to the `ferasetu-smtp` application:

```python
import os
import modal

app = modal.App("ferasetu-smtp")

# Required environment secrets injected into single container
secrets_list = [modal.Secret.from_name("ferasetu-smtp-secrets")]

@app.function(
    image=smtp_image,
    cpu=0.125,
    memory=128,
    min_containers=1,
    max_containers=1,
    volumes={"/data": volume},
    secrets=secrets_list
)
@modal.asgi_app()
def web_gateway():
    ...
```

### Injected Keys in `ferasetu-smtp-secrets`:
1. `FERASETU_SMTP_API_KEY`: Secret Bearer token for Cloudflare Worker authentication.
2. `SMTP_RELAY_HOST`: `92.4.77.19` (Oracle Cloud MTA).
3. `SMTP_RELAY_PORT`: `587`.
4. `SMTP_RELAY_USERNAME`: Authorized SASL user.
5. `SMTP_RELAY_PASSWORD`: Authorized SASL password.
6. `SMTP_RELAY_TLS`: `true`.
7. `SMTP_RELAY_VERIFY_CERT`: `true`.

---

## 5. Troubleshooting & Operational Guide

| Symptom | Underlying Cause | Remediation |
| :--- | :--- | :--- |
| `401 API key not configured on server` | `FERASETU_SMTP_API_KEY` missing from Modal secret | Run `modal secret create ferasetu-smtp-secrets FERASETU_SMTP_API_KEY="..." --force` |
| `Relay Authentication Error (5.7.8)` | SASL password mismatch between Modal and Oracle Postfix | Verify credentials in `/etc/postfix/sasl_passwd` on Oracle VM |
| `POSTFIX_QUEUED` but no Gmail delivery | Postfix attempted IPv4 instead of IPv6 Hurricane tunnel | Configure Oracle Postfix `smtp_address_preference = ipv6` and `smtp_bind_address6 = 2001:470:35:813::2` |
| Gmail DMARC / PTR rejection | HE Tunnel rDNS returns default `tunnel1038745...` hostname | In `tunnelbroker.net` under Tunnel 1038745, set rDNS for `2001:470:35:813::2` to `mail.ferasetu.com` |
