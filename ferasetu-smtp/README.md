# FeraSetu Transactional SMTP Service (`ferasetu-smtp`)

Dedicated, multi-tenant transactional email infrastructure for FeraSetu merchants deployed on **Modal.com** with Cloudflare DNS automation and **in-container Postfix MTA delivery**.

---

## 1. Production Architecture & Delivery Flow

The service operates as a **single persistent Modal container** hosting the FastAPI gateway, the Postfix MTA daemon, and the background queue retry worker.

```
FeraSetu Backend (Node/Express or Microservice)
       │ (HTTPS + Bearer API Key)
       ▼
Modal FastAPI Gateway (`web_gateway`)
       │
       ├── 1. API Key Authentication & CRLF Header Injection Defense
       ├── 2. Merchant Domain Isolation (`noreply@<merchant-slug>.ferasetu.com`)
       ├── 3. Token-Bucket Rate Limiter & Daily Warm-up Quota Checks
       ├── 4. Anti-Spam & Hard-Bounce Suppression Check (0.3% spam cutoff)
       ├── 5. RFC 5322 MIME Construction (Plaintext + HTML + Transactional Headers)
       ├── 6. 2048-bit RSA DKIM Signing (RFC 6376, `fs1` selector)
       ├── 7. SQLite Persistent Queue (`/data` Modal Volume, Idempotency Deduplication)
       │
       ▼
In-Container Postfix MTA Daemon (127.0.0.1:25)
       │
       ├── Loopback submission (`mynetworks = 127.0.0.0/8 [::1]/128`)
       ├── Strict Relay Controls (No Open Relay, `relayhost = `)
       ├── Code 250 Verification (Messages marked SENT ONLY upon Postfix acceptance)
       └── Standard out delivery logging (`maillog_file = /dev/stdout`)
       │
       ▼
Direct SMTP Delivery
```

> [!IMPORTANT]
> **No External Relays Used**: All email transmission is handled directly by the internal Postfix MTA. External relay services (Brevo, AWS SES, Postmark) are **not** required.
>
> **Prohibited Simulation in Production**: Simulated delivery is strictly disabled by default (`ALLOW_SIMULATED_DELIVERY=false`). Any attempt to enable simulation when `ENVIRONMENT=production` immediately raises a fatal `RuntimeError` and fails configuration validation. A message is **never** reported as `SENT` unless Postfix actually accepts and queues it (code 250).

---

## 2. Resource Allocation

Configured with Modal's official minimum resource limits:
* **CPU:** `0.125` cores
* **Memory:** `128` MiB
* **Single Container:** `min_containers=1, max_containers=1`
* **Persistent Volume:** `modal.Volume` mounted at `/data` (`ferasetu-smtp-data`)
* **Background Worker:** Async task inside FastAPI lifespan (no secondary cron containers)

---

## 3. Directory Structure

```
ferasetu-smtp/
├── PRODUCTION-FEASIBILITY.md       # Feasibility audit, Modal limits, and FCrDNS analysis
├── README.md                       # Operations, deployment, architecture, and API guide
├── RUNBOOK.md                      # Operational runbook, troubleshooting, and verification
├── requirements.txt                # Python package dependencies
├── config.py                       # Configuration management, environment guards, limits
├── security.py                     # API key auth, CRLF injection defense, token-bucket limiter
├── merchant.py                     # Merchant domain isolation & 2048-bit DKIM key store
├── dkim_signer.py                  # RFC 6376 DKIM signing engine (canonicalization, RSA-SHA256)
├── deliverability.py               # RFC 5322 MIME builder, FCrDNS & DMARC alignment verifier
├── reputation.py                   # Hard-bounce suppression, spam complaint tracking, warm-up pacing
├── queue_manager.py                # Persistent SQLite queue on Modal Volume, idempotency deduplication
├── delivery.py                     # Outbound dispatcher to Postfix loopback on port 25
├── client.ts                       # Strongly typed TypeScript client for Node/Express backend
├── test_suite.py                   # Automated test suite (19 comprehensive tests)
└── postfix/
    ├── main.cf                     # Postfix configuration (direct delivery, strict no-relay, loopback)
    ├── master.cf                   # Postfix process map
    └── entrypoint.sh               # Postfix container setup script
```

---

## 4. API Endpoints Reference

Base URL (Modal Production): `https://singhantima203--ferasetu-smtp-web-gateway.modal.run`

All mutating and operational endpoints require service authentication:
```http
Authorization: Bearer <FERASETU_SMTP_API_KEY>
Content-Type: application/json
```

### 4.1. Health Check
* **Method:** `GET /health`
* **Auth:** None (Public health probe)
* **Response Example:**
  ```json
  {
    "status": "HEALTHY",
    "service": "ferasetu-smtp",
    "environment": "development",
    "transport": "POSTFIX_DIRECT",
    "postfix_status": "RUNNING",
    "queue": {
      "queued": 0,
      "processing": 0,
      "sent": 5,
      "dead_letter": 1
    },
    "config_valid": true,
    "database_path": "/data/ferasetu_smtp_queue.db",
    "resource_allocation": {
      "cpu_cores": 0.125,
      "memory_mib": 128,
      "min_containers": 1,
      "max_containers": 1
    }
  }
  ```

### 4.2. Deliverability & MTA Audit
* **Method:** `GET /v1/deliverability/audit`
* **Auth:** None
* **Response Example:**
  ```json
  {
    "deliverabilityStatus": "DIRECT_POSTFIX_ACTIVE",
    "directSmtpDelivery": "ACTIVE (Handed to Postfix MTA; public deliverability subject to cloud provider port 25 & PTR restrictions)",
    "postfixStatus": "RUNNING",
    "fcrdnsCheck": {
      "sending_ip": "127.0.0.1",
      "expected_hostname": "localhost",
      "ptr_hostname": "localhost",
      "forward_ip": "127.0.0.1",
      "fcrdns_pass": true,
      "details": "FCrDNS confirmed: 127.0.0.1 <-> localhost"
    },
    "dmarcAlignmentCheck": {
      "from_domain": "shopname-mumbai-mh-1.ferasetu.com",
      "envelope_domain": "shopname-mumbai-mh-1.ferasetu.com",
      "dkim_domain": "shopname-mumbai-mh-1.ferasetu.com",
      "spf_alignment": true,
      "dkim_alignment": true,
      "dmarc_aligned": true
    },
    "recommendations": [
      "Postfix is operating as the primary MTA inside the single Modal container.",
      "Verify destination mail server PTR / rDNS requirements if direct internet delivery encounters spam filtering.",
      "Monitor Postfix delivery logs via 'modal app logs ferasetu-smtp'."
    ]
  }
  ```

### 4.3. Send Transactional Email
* **Method:** `POST /v1/email/send`
* **Auth:** Bearer API key
* **Request Body:**
  ```json
  {
    "merchantId": "shopname-mumbai-mh-1",
    "from": "noreply@shopname-mumbai-mh-1.ferasetu.com",
    "to": "customer@example.com",
    "subject": "Order Confirmation #ORD-98214",
    "html": "<h1>Thank you for your order!</h1><p>Order #ORD-98214 confirmed.</p>",
    "text": "Thank you for your order! Order #ORD-98214 confirmed.",
    "idempotencyKey": "order_ord_98214_confirmation"
  }
  ```
* **Success Response (HTTP 200):**
  ```json
  {
    "success": true,
    "messageId": "<b2594191-680e-4486-8da1-189d462b6767@shopname-mumbai-mh-1.ferasetu.com>",
    "status": "SENT",
    "duplicate": false,
    "details": "Queued to Postfix"
  }
  ```

### 4.4. Merchant DNS Provisioning
* **Method:** `POST /v1/merchants/{merchant_id}/provision`
* **Auth:** Bearer API key
* **Request Body:**
  ```json
  {
    "merchantSlug": "shopname-mumbai-mh-1"
  }
  ```
* **Response:** Returns 2048-bit DKIM public key and Cloudflare DNS TXT records for SPF, DKIM (`fs1._domainkey`), and DMARC.

### 4.5. Message Status Check
* **Method:** `GET /v1/email/status/{message_id}`
* **Auth:** Bearer API key
* **Response:** Returns delivery state (`QUEUED`, `PROCESSING`, `SENT`, `DEAD_LETTER`), retry count, and timestamp.

### 4.6. Merchant Reputation Status
* **Method:** `GET /v1/merchants/{merchant_id}/reputation`
* **Auth:** Bearer API key
* **Response:** Returns sent count, hard/soft bounces, complaint count, bounce rate, complaint rate, and suspension status.

### 4.7. Bounce & Complaint Webhook
* **Method:** `POST /v1/webhooks/bounce`
* **Auth:** Bearer API key
* **Request Body:**
  ```json
  {
    "merchantId": "shopname-mumbai-mh-1",
    "recipientEmail": "bounced-user@example.com",
    "bounceType": "hard",
    "details": "550 5.1.1 User unknown"
  }
  ```

---

## 5. Cloudflare DNS Configuration for Merchants

Each merchant receives an isolated subdomain under `ferasetu.com`:
```
noreply@<merchant-slug>.ferasetu.com
```

Add these TXT records in Cloudflare under the `ferasetu.com` zone:

| Type | Name / Host | Value | Purpose |
| :--- | :--- | :--- | :--- |
| **TXT** | `<merchant-slug>.ferasetu.com` | `v=spf1 a mx ~all` | Authorizes outbound MTA |
| **TXT** | `fs1._domainkey.<merchant-slug>.ferasetu.com` | `v=DKIM1; k=rsa; p=MIIBIjANBgkq...` | 2048-bit RSA public key |
| **TXT** | `_dmarc.<merchant-slug>.ferasetu.com` | `v=DMARC1; p=reject; rua=mailto:dmarc@ferasetu.com; aspf=r; adkim=r` | Strict DMARC reject policy |

---

## 6. Anti-Spam & Deliverability Safeguards

1. **Strict Deliverability Cutoffs (Google Postmaster & Yahoo Standards):**
   * Spam complaint rate warning: `>= 0.10%`
   * **Automatic merchant suspension:** `>= 0.30%` (Google hard cutoff)
   * Bounce rate warning: `>= 2.0%`
   * **Automatic suspension on high bounce:** `>= 5.0%`
2. **Permanent Hard-Bounce Suppression:**
   * Any recipient generating a permanent 5xx bounce or spam complaint is automatically blacklisted in SQLite and suppressed across all future dispatch attempts.
3. **Gradual Merchant Warm-Up:**
   * Day 1: Max 50 emails/day
   * Day 2: Max 100 emails/day
   * Day 3: Max 250 emails/day
   * Day 4: Max 500 emails/day
   * Day 5: Max 1,000 emails/day
   * Day 6: Max 1,500 emails/day
   * Day 7+: Standard allocation (2,500+/day)
4. **Idempotency & Duplicate Send Protection:**
   * Repeated submissions with the same `idempotencyKey` within 24 hours are safely deduplicated and will not trigger duplicate SMTP dispatches.

---

## 7. Node.js / Express Integration Example

Using [`client.ts`](./client.ts):

```typescript
import { FeraSetuSmtpClient } from './ferasetu-smtp/client';

const mailClient = new FeraSetuSmtpClient({
  baseUrl: process.env.FERASETU_SMTP_SERVICE_URL || 'https://singhantima203--ferasetu-smtp-web-gateway.modal.run',
  apiKey: process.env.FERASETU_SMTP_API_KEY,
});

// Send Order Confirmation
const response = await mailClient.sendOrderConfirmation(
  'shopname-mumbai-mh-1',
  'shopname-mumbai-mh-1',
  'customer@example.com',
  {
    orderId: 'ORD-98214',
    totalAmount: '₹1,249.00',
    invoiceNumber: 'INV-2026-089',
    itemsSummary: '2x Organic Cotton Shirts, 1x Canvas Bag'
  }
);

console.log(`Email dispatched with ID: ${response.messageId}, Status: ${response.status}`);
```

---

## 8. Verification & Test Suite

The comprehensive automated test suite includes **19 tests** covering:
- Service-to-service authentication and rejection
- Cross-merchant sender mismatch and domain spoofing prevention
- Token-bucket rate limiting and burst protection
- CRLF header injection mitigation
- Idempotency deduplication
- Exponential backoff retry scheduling and dead-letter quarantine
- Queue persistence across container restarts
- DKIM 2048-bit key generation and MIME signing
- SPF/DKIM/DMARC alignment validation
- Hard-bounce suppression and spam-complaint suspension
- Merchant warm-up daily volume enforcement
- **Actual Postfix loopback transport and DKIM preservation**
- **Unreachable Postfix connection retry handling**
- **Strict prohibition of simulated delivery in production**

### Running Tests Locally
```powershell
python test_suite.py
```
*Result: 19/19 passing tests.*
