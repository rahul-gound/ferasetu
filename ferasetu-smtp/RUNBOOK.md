# FeraSetu SMTP Service Runbook (`ferasetu-smtp`)

This runbook documents the complete production workflow, single-container architecture, in-container Postfix MTA lifecycle, Cloudflare DNS automation, persistent queue storage on Modal Volume, operational troubleshooting, and exact verification commands.

---

## 1. End-to-End Production Workflow

```
Merchant Signup & Shop Creation
      │
      ▼
Canonical Hostname Generation
  Format: shopname-city-district-state-uniqueid.ferasetu.com
  (Shared 1:1 between Storefront URL & Merchant Transactional Email Domain)
      │
      ▼
Cloudflare DNS Provisioning (`POST /v1/merchants/{merchant_id}/provision`)
  - Generates 2048-bit RSA DKIM keypair (/data/dkim_keys/<domain>.key)
  - Creates DKIM TXT record at fs1._domainkey.<domain>
  - Creates SPF TXT record at <domain> (v=spf1 include:_spf.ferasetu.com ~all)
  - Creates DMARC TXT record at _dmarc.<domain>
      │
      ▼
DNS Propagation Verification (via Cloudflare DoH)
  - Checks if DKIM TXT is resolvable
  - If verified -> email_status = 'ACTIVE'
  - If pending  -> email_status = 'PENDING_DNS'
      │
      ▼
Transactional Email Submission (`POST /v1/email/send`)
  - Authenticates Bearer API key
  - Validates sender authorization against merchant domain
  - Enforces token-bucket rate limits & warm-up pacing
  - Builds RFC 5322 MIME & signs with 2048-bit DKIM
  - Enqueues in SQLite with idempotency key deduplication
      │
      ▼
In-Container Postfix MTA Delivery (`127.0.0.1:25`)
  - Transmits signed MIME bytes to Postfix loopback
  - Postfix verifies loopback submission (mynetworks) and queues message (code 250)
  - Status transitions to POSTFIX_QUEUED
      │
      ▼
Downstream MX Delivery / Queue Draining
  - In-container background worker handles retries with exponential backoff
  - Unrecoverable failures transition to FAILED or BOUNCED
```

---

## 2. Architecture & Design Principles

### 2.1. Why ONE Single Container?
In Modal, every `@app.function` is an independent serverless deployment. A scheduled function creates separate containers on each trigger, leading to redundant container instances, pending task backlogs, and multi-container coordination complexity.

**The Production Architecture:**
* **Single Persistent Container (`min_containers=1`, `max_containers=1`):**
  Only one `@app.function` (`web_gateway`) is deployed to Modal.
* **In-Container Postfix MTA Daemon:**
  Postfix runs on loopback `127.0.0.1:25` inside the container, initialized automatically during startup via `ensure_postfix_running()`, which executes `/opt/postfix_config/entrypoint.sh`.
* **In-Container Background Queue Worker:**
  Instead of a separate cron container, the background retry worker runs as an asynchronous task (`asyncio.create_task(background_queue_worker())`) inside the FastAPI `lifespan` handler within the **same running container**.
* **Shared Minimal Resources:**
  The single container operates with `0.125 CPU` cores and `128 MiB RAM`, handling HTTP submissions (`/v1/email/send`), Postfix MTA delivery, and periodic queue draining (every 60 seconds) without any extra container overhead.

### 2.2. Delivery States & Honesty
* `ACCEPTED`: Received and validated by FastAPI
* `QUEUED`: Enqueued in persistent SQLite queue
* `POSTFIX_QUEUED`: Accepted by Postfix on `127.0.0.1:25` (SMTP code 250)
* `DELIVERED`: Confirmed delivered by Postfix to remote MX
* `DEFERRED`: Downstream MX temporary failure, scheduled for retry
* `FAILED`: Permanent error or max retries exhausted
* `BOUNCED`: Hard bounce reported

> [!IMPORTANT]
> The service **never** reports `DELIVERED` when the message has only reached the application queue or the local Postfix loopback queue. Code 250 acceptance from Postfix is recorded as `POSTFIX_QUEUED`.

---

## 3. Database Lifecycle (Local Development vs. Modal Cloud)

### 3.1. Directory-Safe & Runtime Initialization
1. **Module Import is Clean:**
   Zero database calls happen when `modal_app.py` or its modules are imported.
2. **Runtime `ensure_db_initialized()`:**
   Database tables (`email_queue`, `merchant_identities`, `merchant_reputation`, `suppression_list`, `daily_volume`) are initialized only when the container runtime actually boots inside Modal (via FastAPI `lifespan` and in the ASGI entrypoint), *after* the Modal Volume has been mounted to `/data`.
3. **Automatic Directory Creation:**
   Guarantees that `os.path.dirname(Config.DB_PATH)` exists before `sqlite3.connect()` is called.
4. **Environment Isolation:**
   * **In Modal Container (Linux):** Detects `/data` mount and uses `/data/ferasetu_smtp_queue.db` on persistent Volume `ferasetu-smtp-data`.
   * **In Windows Local Development:** Safely resolves to `ferasetu-smtp/data/ferasetu_smtp_queue.db`.

---

## 4. Verification & Operational Commands (PowerShell)

### Step 1: Run Automated Test Suite
From `c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\ferasetu-smtp`:
```powershell
.\.venv\Scripts\python.exe test_suite.py
```

### Step 2: Deploy Service to Modal
```powershell
$env:PYTHONIOENCODING="utf-8"; .\.venv\Scripts\modal.exe deploy modal_app.py
```

### Step 3: Verify Live Health Endpoint
```powershell
.\.venv\Scripts\python.exe -c "import requests; r = requests.get('https://singhantima203--ferasetu-smtp-web-gateway.modal.run/health', timeout=30); print('Status:', r.status_code); print('Response:', r.json())"
```

### Step 4: Verify Live Deliverability & MTA Audit
```powershell
.\.venv\Scripts\python.exe -c "import requests, json; r = requests.get('https://singhantima203--ferasetu-smtp-web-gateway.modal.run/v1/deliverability/audit', timeout=30); print('Status:', r.status_code); print('Response:', json.dumps(r.json(), indent=2))"
```

### Step 5: Provision a Merchant Domain
```powershell
.\.venv\Scripts\python.exe -c "import requests, json; payload = {'shopName': 'My Store', 'city': 'Mumbai', 'district': 'Andheri', 'state': 'MH', 'uniqueId': '1'}; headers = {'Authorization': 'Bearer ferasetu-test-insecure-key-change-me', 'Content-Type': 'application/json'}; r = requests.post('https://singhantima203--ferasetu-smtp-web-gateway.modal.run/v1/merchants/my-store-1/provision', json=payload, headers=headers); print('Status:', r.status_code); print('Response:', json.dumps(r.json(), indent=2))"
```

### Step 6: Test Real Email Submission to Postfix
```powershell
.\.venv\Scripts\python.exe -c "import requests, json; payload = {'merchantId': 'my-store-mumbai-andheri-mh-1', 'from': 'noreply@my-store-mumbai-andheri-mh-1.ferasetu.com', 'to': 'support@ferasetu.com', 'subject': 'Order Confirmation Verification', 'text': 'Postfix MTA live delivery test', 'idempotencyKey': 'runbook_verify_001'}; headers = {'Authorization': 'Bearer ferasetu-test-insecure-key-change-me', 'Content-Type': 'application/json'}; r = requests.post('https://singhantima203--ferasetu-smtp-web-gateway.modal.run/v1/email/send', json=payload, headers=headers); print('Status:', r.status_code); print('Body:', json.dumps(r.json(), indent=2))"
```

### Step 7: Stream Live Container Logs
```powershell
$env:PYTHONIOENCODING="utf-8"; .\.venv\Scripts\modal.exe app logs ferasetu-smtp
```

---

## 5. Troubleshooting Table

| Symptom | Probable Cause | Corrective Action |
| :--- | :--- | :--- |
| `Status: 401 Invalid API key` | Missing or mismatched `Authorization: Bearer <key>` header | Ensure the header matches `Config.API_KEY` (or the `FERASETU_SMTP_API_KEY` environment secret). |
| `Status: 403 Cross-merchant sender mismatch` | The `from` header domain does not match `merchantId` | Ensure `from` format matches canonical domain or merchant identity registered in SQLite. |
| `emailActivationStatus: PENDING_DNS` | DKIM DNS record not yet published or propagated in Cloudflare | Publish the TXT record in Cloudflare DNS or verify Cloudflare API credentials. |
| `Status: 429 Rate limit exceeded` | Merchant exceeded the token-bucket limit | Implement backoff on the client or raise `MERCHANT_DEFAULT_RATE_LIMIT_PER_SEC`. |
| `postfix_status: STOPPED` | Daemon startup issue or delayed boot | Ensure `ensure_postfix_running()` executed without error; check `modal app logs ferasetu-smtp`. |
| `sqlite3.OperationalError` | Container `/data` path unavailable | Verify that `volume = modal.Volume.from_name("ferasetu-smtp-data")` is mounted to `/data` in `web_gateway()`. |
