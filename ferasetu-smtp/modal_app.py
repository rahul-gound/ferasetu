"""
FeraSetu SMTP Service - Modal.com Deployment Definition
Single-Container Serverless Transactional Email Infrastructure for FeraSetu Merchants.

Configured with:
- Single container architecture (web gateway + Postfix MTA + background queue retry worker in ONE container)
- Direct Postfix delivery engine (no external Brevo/SES/Postmark relay)
- Canonical merchant domain generation (shopname-city-district-state-uniqueid.ferasetu.com)
- Cloudflare DNS automation & DoH verification
- Accurate delivery states (ACCEPTED, QUEUED, POSTFIX_QUEUED, DELIVERED, DEFERRED, FAILED, BOUNCED)
- CPU: 0.125 cores (Modal supported minimum)
- Memory: 128 MiB (Modal supported minimum)
- Persistent Volume: 'ferasetu-smtp-data' mounted at '/data'
- Warm single container: min_containers=1, max_containers=1
"""

import os
import sys
import shutil
import asyncio
import logging
import subprocess
import socket
from contextlib import asynccontextmanager
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, EmailStr, Field

# Ensure current directory is in sys.path
sys.path.insert(0, os.path.dirname(__file__))

from config import Config
from security import (
    SecurityManager,
    UnauthorizedError,
    HeaderInjectionError,
    RateLimitExceededError
)
from merchant import MerchantManager, UnauthorizedSenderDomainError, MerchantError
from dkim_signer import DKIMSigner
from deliverability import DeliverabilityCompliance
from reputation import (
    ReputationManager,
    SenderSuspendedError,
    AddressSuppressedError,
    WarmupLimitExceededError
)
from queue_manager import QueueManager
from delivery import OutboundDispatcher
from cloudflare_dns import CloudflareDNSManager

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ferasetu_smtp.modal_app")

# Runtime initialization state
_db_initialized = False
_postfix_initialized = False

def ensure_db_initialized():
    """
    Initializes the SQLite database schemas.
    Executes safely at runtime after Modal Volume /data is mounted,
    and NEVER during module import / modal deploy inspection.
    Idempotent across repeated container startups.
    """
    global _db_initialized
    if _db_initialized:
        return
    
    # If in Modal container environment where /data is mounted, ensure DATA_DIR is /data
    if os.name != "nt" and os.path.exists("/data") and os.path.isdir("/data"):
        Config.set_data_dir("/data")
    
    # Ensure directories exist
    Config.ensure_data_dirs()
    
    QueueManager.init_queue()
    ReputationManager.init_schema()
    MerchantManager.init_schema()

    # Synchronize master root DKIM key to persistent volume /data/dkim_keys
    master_key_src = "/opt/dkim_master/ferasetu.com.key"
    target_key_dest = os.path.join(Config.KEYS_DIR, f"{Config.ROOT_DOMAIN}.key")
    if os.path.exists(master_key_src):
        os.makedirs(Config.KEYS_DIR, exist_ok=True)
        shutil.copyfile(master_key_src, target_key_dest)
        logger.info("Synchronized master root DKIM key from %s to %s", master_key_src, target_key_dest)

    _db_initialized = True
    logger.info("Database initialized successfully at: %s", Config.DB_PATH)


def ensure_postfix_running():
    """
    Configures and starts the Postfix MTA daemon inside the Linux container.
    Executes postfix/entrypoint.sh if present; ensures direct delivery and loopback listening.
    """
    global _postfix_initialized
    if _postfix_initialized:
        return

    if os.name == "nt":
        logger.info("Running on Windows local environment; skipping Postfix daemon launch.")
        return

    postfix_bin = shutil.which("postfix")
    if not postfix_bin:
        logger.warning("Postfix binary not found in PATH; running without local Postfix daemon.")
        return

    try:
        # 1. First attempt execution of dedicated entrypoint.sh script
        entrypoint_sh = "/opt/postfix_config/entrypoint.sh"
        if os.path.exists(entrypoint_sh):
            logger.info("Executing Postfix entrypoint script: %s", entrypoint_sh)
            subprocess.run(["chmod", "+x", entrypoint_sh], check=False)
            ep_res = subprocess.run(["bash", entrypoint_sh, "daemon"], capture_output=True, text=True)
            logger.info("entrypoint.sh output: stdout=%s stderr=%s", ep_res.stdout.strip(), ep_res.stderr.strip())
            _postfix_initialized = True
            return

        # 2. Fallback manual setup
        cfg_source = "/opt/postfix_config"
        if os.path.exists(cfg_source):
            main_src = os.path.join(cfg_source, "main.cf")
            master_src = os.path.join(cfg_source, "master.cf")
            if os.path.exists(main_src):
                shutil.copyfile(main_src, "/etc/postfix/main.cf")
                logger.info("Installed custom /etc/postfix/main.cf")
            if os.path.exists(master_src):
                shutil.copyfile(master_src, "/etc/postfix/master.cf")
                logger.info("Installed custom /etc/postfix/master.cf")

        # Set mandatory container parameters via postconf
        subprocess.run(["postconf", "-e", "maillog_file = /dev/stdout"], check=False)
        subprocess.run(["postconf", "-e", "inet_interfaces = 127.0.0.1"], check=False)
        subprocess.run(["postconf", "-e", "inet_protocols = ipv4"], check=False)
        subprocess.run(["postconf", "-e", "myhostname = mail.ferasetu.com"], check=False)
        subprocess.run(["postconf", "-e", "mydomain = ferasetu.com"], check=False)
        subprocess.run(["postconf", "-e", "relayhost = "], check=False)
        subprocess.run(["postconf", "-e", "mynetworks = 127.0.0.0/8 [::1]/128"], check=False)
        subprocess.run(["postconf", "-e", "smtpd_relay_restrictions = permit_mynetworks, reject"], check=False)
        subprocess.run(["postconf", "-e", "smtpd_recipient_restrictions = permit_mynetworks, reject"], check=False)
        subprocess.run(["postconf", "-e", "smtpd_sender_restrictions = permit_mynetworks, reject_non_fqdn_sender, reject_unknown_sender_domain"], check=False)

        # Postfix permissions and sanity check
        subprocess.run(["postfix", "set-permissions"], check=False)
        subprocess.run(["postfix", "check"], check=False)

        # Check status and start daemon
        status_check = subprocess.run(["postfix", "status"], capture_output=True, text=True)
        if "is running" not in status_check.stdout and "is running" not in status_check.stderr:
            logger.info("Starting Postfix MTA daemon...")
            res = subprocess.run(["postfix", "start"], capture_output=True, text=True)
            if res.returncode == 0:
                logger.info("Postfix MTA daemon started successfully.")
                _postfix_initialized = True
            else:
                logger.error("Failed to start Postfix MTA: stdout=%s stderr=%s", res.stdout, res.stderr)
        else:
            logger.info("Postfix MTA daemon is already active. Reloading configuration...")
            subprocess.run(["postfix", "reload"], check=False)
            _postfix_initialized = True

    except Exception as e:
        logger.error("Exception during Postfix setup/start: %s", str(e))


def check_postfix_status() -> str:
    """Checks if Postfix is listening on loopback port 25 or running as a daemon."""
    if os.name == "nt":
        return "WINDOWS_LOCAL_DEV (MTA daemon skipped)"

    # Socket connectivity to loopback port 25 is the definitive operational check
    try:
        with socket.create_connection((Config.POSTFIX_HOST, Config.POSTFIX_PORT), timeout=2):
            return "RUNNING"
    except Exception:
        pass

    if shutil.which("postfix"):
        try:
            status_check = subprocess.run(["postfix", "status"], capture_output=True, text=True)
            output = (status_check.stdout + " " + status_check.stderr).strip()
            if "is running" in output or status_check.returncode == 0:
                return "RUNNING"
            return f"STOPPED ({output or 'code ' + str(status_check.returncode)})"
        except Exception as e:
            return f"ERROR ({str(e)})"

    return "NOT_INSTALLED"


async def background_queue_worker():
    """
    Background retry worker running inside the single container.
    Periodically inspects the persistent queue and retries pending deliveries.
    """
    logger.info("Background queue retry worker started inside single container.")
    while True:
        try:
            await asyncio.sleep(60) # Process queue every 60 seconds
            batch = QueueManager.fetch_pending_batch(limit=25)
            if batch:
                logger.info("Processing %d queued retry messages...", len(batch))
                for item in batch:
                    OutboundDispatcher.dispatch_message(
                        message_id=item["id"],
                        merchant_id=item["merchant_id"],
                        from_email=item["from_email"],
                        to_email=item["to_email"],
                        raw_mime=item["raw_mime"],
                        scope=item.get("scope", "MERCHANT"),
                        tenant_id=item.get("tenant_id")
                    )
        except asyncio.CancelledError:
            logger.info("Background queue worker stopped.")
            break
        except Exception as e:
            logger.error("Error in background queue worker: %s", e)


# --- Pydantic Request/Response Models ---
class SendEmailRequest(BaseModel):
    scope: Optional[str] = Field("MERCHANT", description="Identity scope: 'PLATFORM' or 'MERCHANT'")
    tenantId: Optional[str] = Field(None, description="Tenant ID, e.g. 'ferasetu-platform' or 'shopname-mumbai-mh-1'")
    merchantId: Optional[str] = Field(None, description="Merchant identifier (required for MERCHANT scope)")
    fromEmail: str = Field(..., alias="from", description="Authorized sender email address")
    toEmail: Any = Field(..., alias="to", description="Recipient email address or list of recipient addresses")
    subject: str = Field(..., description="Email subject")
    html: Optional[str] = Field(None, description="HTML body content")
    text: Optional[str] = Field(None, description="Plain text fallback body content")
    replyTo: Optional[str] = Field(None, description="Optional Reply-To address")
    idempotencyKey: Optional[str] = Field(None, description="Unique key for duplicate-send protection")
    customHeaders: Optional[Any] = Field(None, description="Custom X- headers (dict or list of name/value pairs)")
    priority: Optional[str] = Field("NORMAL", description="Priority class: CRITICAL, HIGH, NORMAL, LOW")

class SendEmailResponse(BaseModel):
    success: bool
    messageId: str
    status: str # ACCEPTED, QUEUED, POSTFIX_QUEUED, DELIVERED, DEFERRED, FAILED, BOUNCED
    duplicate: bool
    details: Optional[str] = None

class ProvisionMerchantRequest(BaseModel):
    merchantSlug: Optional[str] = Field(None, description="Direct merchant slug, e.g. 'shopname-mumbai-mh-1'")
    shopName: Optional[str] = Field(None, description="Shop name, e.g. 'My Store'")
    city: Optional[str] = Field(None, description="City name, e.g. 'Mumbai'")
    district: Optional[str] = Field(None, description="District name, e.g. 'Andheri'")
    state: Optional[str] = Field(None, description="State code or name, e.g. 'MH'")
    uniqueId: Optional[str] = Field(None, description="Collision-resistant suffix, e.g. '1'")
    customDomain: Optional[str] = Field(None, description="Optional custom merchant domain to provision")

class ProvisionMerchantResponse(BaseModel):
    merchantDomain: str
    storefrontUrl: str
    senderEmail: str
    selector: str
    dnsRecords: List[Dict[str, Any]]
    cloudflareProvisioned: bool
    verificationStatus: str # VERIFIED, PENDING_PROPAGATION, LOOKUP_FAILED
    emailActivationStatus: str # ACTIVE, PENDING_DNS, SUSPENDED
    cloudflareInstructions: str

class RegisterCustomDomainRequest(BaseModel):
    domain: str = Field(..., description="Custom domain name, e.g. 'example.com'")
    selector: Optional[str] = Field("fs1", description="DKIM selector, e.g. 'fs1'")

class VerifyCustomDomainRequest(BaseModel):
    domain: str = Field(..., description="Custom domain to verify")
    forceVerified: Optional[bool] = Field(False, description="Manual/Testing verification override")

class BounceWebhookRequest(BaseModel):
    merchantId: Optional[str] = None
    tenantId: Optional[str] = None
    scope: Optional[str] = "MERCHANT"
    recipientEmail: str
    bounceType: str = "hard" # "hard", "soft", "complaint", "suppression", "delivery", "deferred"
    details: Optional[str] = None

class DeliverabilityAuditResponse(BaseModel):
    deliverabilityStatus: str
    directSmtpDelivery: str
    postfixStatus: str
    fcrdnsCheck: Dict[str, Any]
    dmarcAlignmentCheck: Dict[str, Any]
    recommendations: List[str]
    platformSends: Optional[int] = 0
    merchantSends: Optional[int] = 0
    queueMetrics: Optional[Dict[str, Any]] = None


# --- Modal Application Definition ---
try:
    import modal
    app = modal.App("ferasetu-smtp")

    # Container image with Postfix MTA, mailutils, and all dependencies explicitly baked in
    smtp_image = (
        modal.Image.debian_slim(python_version="3.11")
        .run_commands(
            "echo 'postfix postfix/mailname string ferasetu.com' | debconf-set-selections",
            "echo 'postfix postfix/main_mailer_type string \"Internet Site\"' | debconf-set-selections",
        )
        .apt_install(
            "postfix",
            "mailutils",
            "ca-certificates",
            "libsasl2-modules",
            "sasl2-bin"
        )
        .pip_install(
            "fastapi[standard]>=0.115.0",
            "pydantic>=2.0.0",
            "cryptography>=43.0.0",
            "dkimpy>=1.1.0",
            "aiosmtpd>=1.4.6"
        )
        .add_local_python_source(
            "config",
            "security",
            "merchant",
            "dkim_signer",
            "deliverability",
            "reputation",
            "queue_manager",
            "delivery",
            "cloudflare_dns",
            copy=True
        )
        .add_local_dir(
            os.path.join(os.path.dirname(__file__), "postfix"),
            remote_path="/opt/postfix_config",
            copy=True
        )
        .add_local_file(
            os.path.join(os.path.dirname(__file__), "data", "dkim_keys", "ferasetu.com.key"),
            remote_path="/opt/dkim_master/ferasetu.com.key",
            copy=True
        )
    )

    volume = modal.Volume.from_name("ferasetu-smtp-data", create_if_missing=True)

except ImportError:
    logger.warning("Modal package not found; running in standalone local FastAPI mode")
    app = None
    smtp_image = None
    volume = None

# --- FastAPI Router & Endpoints ---
from fastapi import FastAPI, Header, HTTPException, Depends, status

@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    """Lifespan context manager that initializes the database, Postfix, and background worker."""
    ensure_db_initialized()
    ensure_postfix_running()
    worker_task = asyncio.create_task(background_queue_worker())
    try:
        yield
    finally:
        worker_task.cancel()
        try:
            await worker_task
        except asyncio.CancelledError:
            pass

api = FastAPI(
    title="FeraSetu Transactional SMTP Service",
    version="1.1.0",
    description="Dedicated single-container transactional email infrastructure with Postfix MTA for FeraSetu merchants.",
    lifespan=lifespan
)

def require_auth(authorization: Optional[str] = Header(None)):
    """FastAPI dependency for service-to-service Bearer authentication."""
    ensure_db_initialized()
    try:
        SecurityManager.verify_api_key(authorization)
    except UnauthorizedError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@api.post("/v1/email/send", response_model=SendEmailResponse, dependencies=[Depends(require_auth)])
def send_email_endpoint(payload: SendEmailRequest):
    """
    Submits an email for authorized delivery across PLATFORM or MERCHANT scopes.
    Enforces tenant authorization, rate limits, warm-up volume, DKIM signing,
    and priority queue dispatch.
    """
    ensure_db_initialized()
    ensure_postfix_running()

    # Determine scope and tenant identifiers
    scope = (payload.scope or "MERCHANT").upper()
    if scope == "PLATFORM":
        eff_tenant = payload.tenantId or Config.PLATFORM_TENANT_ID
        eff_merchant = None
    else:
        scope = "MERCHANT"
        eff_merchant = payload.merchantId or payload.tenantId
        if not eff_merchant:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="merchantId is required for MERCHANT scope email")
        eff_tenant = payload.tenantId or eff_merchant

    # Normalize recipients
    raw_to = payload.toEmail
    if isinstance(raw_to, list):
        recipients = [str(r).strip() for r in raw_to if str(r).strip()]
    elif isinstance(raw_to, str):
        recipients = [r.strip() for r in raw_to.split(",") if r.strip()]
    else:
        recipients = [str(raw_to).strip()]

    if not recipients:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Recipient address 'to' cannot be empty")
    if len(recipients) > Config.MAX_RECIPIENTS_PER_MSG:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Exceeded maximum recipients per message ({len(recipients)} > {Config.MAX_RECIPIENTS_PER_MSG})"
        )
    primary_to = recipients[0]
    to_header_val = ", ".join(recipients)

    # Normalize custom headers
    normalized_headers: Optional[Dict[str, str]] = None
    if payload.customHeaders:
        if isinstance(payload.customHeaders, dict):
            normalized_headers = {str(k): str(v) for k, v in payload.customHeaders.items()}
        elif isinstance(payload.customHeaders, list):
            normalized_headers = {}
            for item in payload.customHeaders:
                if isinstance(item, dict):
                    if "name" in item and "value" in item:
                        normalized_headers[str(item["name"])] = str(item["value"])
                    else:
                        for k, v in item.items():
                            normalized_headers[str(k)] = str(v)

    priority = (payload.priority or "NORMAL").upper()

    # 1. Validate sender authorization according to scope
    try:
        _, domain = MerchantManager.validate_sender_authorization(
            tenant_id_or_merchant_id=eff_tenant,
            sender_email=payload.fromEmail,
            scope=scope,
            merchant_id=eff_merchant
        )
    except (UnauthorizedSenderDomainError, MerchantError) as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))

    # 2. Check multi-level rate limit
    try:
        SecurityManager.check_rate_limit(
            scope_or_merchant_id=scope,
            tenant_id=eff_tenant,
            sender_email=payload.fromEmail,
            recipient_email=primary_to
        )
    except RateLimitExceededError as e:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(e))

    # 3. Check anti-spam safeguards (suspension, bounce suppression, warm-up limits)
    try:
        for r in recipients:
            ReputationManager.check_recipient_suppressed(r, tenant_id=eff_tenant, scope=scope)
        if scope == "MERCHANT" and eff_merchant:
            ReputationManager.check_merchant_allowed_to_send(eff_merchant, domain)
    except AddressSuppressedError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except (SenderSuspendedError, WarmupLimitExceededError) as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))

    # 4. Build transactional RFC 5322 MIME message
    try:
        mime_msg, msg_id = DeliverabilityCompliance.build_transactional_mime(
            merchant_id=eff_merchant or eff_tenant,
            from_email=payload.fromEmail,
            to_email=to_header_val,
            subject=payload.subject,
            html_content=payload.html,
            text_content=payload.text,
            reply_to=payload.replyTo,
            custom_headers=normalized_headers,
            scope=scope,
            tenant_id=eff_tenant,
            priority=priority
        )
    except HeaderInjectionError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # 5. Sign with 2048-bit RSA DKIM
    if scope == "PLATFORM" or domain.endswith(f".{Config.ROOT_DOMAIN}"):
        signing_domain = Config.ROOT_DOMAIN
        selector = "fs1"
    else:
        signing_domain = domain
        selector = "fs1"

    raw_bytes = mime_msg.as_bytes()
    signed_bytes = DKIMSigner.sign_message(raw_bytes, domain=signing_domain, selector=selector)

    # 6. Persist to priority queue with tenant-scoped idempotency protection
    queue_result = QueueManager.enqueue(
        message_id=msg_id,
        merchant_id=eff_merchant or eff_tenant,
        from_email=payload.fromEmail,
        to_email=to_header_val,
        subject=payload.subject,
        raw_mime=signed_bytes,
        idempotency_key=payload.idempotencyKey,
        scope=scope,
        tenant_id=eff_tenant,
        priority=priority
    )

    # 7. Attempt immediate dispatch (if not duplicate)
    if not queue_result["duplicate"]:
        dispatch_result = OutboundDispatcher.dispatch_message(
            message_id=msg_id,
            merchant_id=eff_merchant or eff_tenant,
            from_email=payload.fromEmail,
            to_email=primary_to,
            raw_mime=signed_bytes,
            scope=scope,
            tenant_id=eff_tenant
        )
        final_status = dispatch_result.queue_status if dispatch_result.success else "DEFERRED"
        details = dispatch_result.message
    else:
        final_status = queue_result["status"]
        details = "Duplicate submission detected via idempotency key"

    return SendEmailResponse(
        success=True,
        messageId=msg_id,
        status=final_status,
        duplicate=queue_result["duplicate"],
        details=details
    )


@api.get("/v1/email/status/{message_id}", dependencies=[Depends(require_auth)])
def get_message_status(message_id: str, tenant_id: Optional[str] = None):
    """Retrieves current queue and delivery status for a message with tenant isolation."""
    ensure_db_initialized()
    status_info = QueueManager.get_status(message_id, requester_tenant_id=tenant_id)
    if not status_info:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message ID not found or unauthorized")
    return status_info


@api.get("/v1/merchants/{merchant_id}/reputation", dependencies=[Depends(require_auth)])
def get_merchant_reputation(merchant_id: str):
    """Returns reputation metrics, bounce counts, and active status for a merchant."""
    ensure_db_initialized()
    return ReputationManager.get_merchant_status(merchant_id)


@api.get("/v1/platform/reputation", dependencies=[Depends(require_auth)])
def get_platform_reputation():
    """Returns reputation metrics and delivery counts for the platform tenant."""
    ensure_db_initialized()
    return ReputationManager.get_platform_status()


@api.post("/v1/merchants/{merchant_id}/provision", response_model=ProvisionMerchantResponse, dependencies=[Depends(require_auth)])
def provision_merchant_dns(merchant_id: str, payload: ProvisionMerchantRequest):
    """
    Provisions canonical domain, 2048-bit DKIM keypair, and Cloudflare DNS records (SPF, DKIM, DMARC)
    for a merchant storefront and email identity. Idempotent across repeated invocations.
    """
    ensure_db_initialized()

    # 1. Determine merchant domain
    if payload.customDomain:
        domain = payload.customDomain.strip().lower()
        MerchantManager.register_custom_domain(merchant_id, domain)
    elif payload.shopName:
        domain = MerchantManager.generate_canonical_merchant_domain(
            shop_name=payload.shopName,
            city=payload.city or "",
            district=payload.district or "",
            state=payload.state or "",
            unique_id=payload.uniqueId or merchant_id
        )
    elif payload.merchantSlug:
        domain = MerchantManager.get_merchant_domain(payload.merchantSlug)
    else:
        domain = MerchantManager.get_merchant_domain(merchant_id)

    # 2. Retrieve or generate DKIM 2048-bit keypair idempotently
    _, public_base64 = MerchantManager.get_or_create_dkim_key(domain)
    dns_info = MerchantManager.generate_dns_records(domain)

    # 3. Cloudflare DNS provisioning (if configured)
    cf_res = CloudflareDNSManager.provision_merchant_dns(
        merchant_domain=domain,
        dkim_public_key=public_base64,
        selector=MerchantManager.DKIM_SELECTOR
    )
    cf_provisioned = cf_res.get("provisioned", False)

    # 4. Verify DNS propagation via Cloudflare DoH
    verify_res = CloudflareDNSManager.verify_dns_records(
        merchant_domain=domain,
        selector=MerchantManager.DKIM_SELECTOR,
        expected_dkim_pubkey=public_base64
    )
    is_verified = verify_res.get("verified", False)
    verification_status = verify_res.get("status", "PENDING_PROPAGATION")
    email_activation_status = "ACTIVE" if is_verified else "PENDING_DNS"

    # 5. Persist merchant identity in SQLite
    MerchantManager.save_merchant_identity(
        merchant_id=merchant_id,
        canonical_domain=domain,
        shop_name=payload.shopName or "",
        city=payload.city or "",
        district=payload.district or "",
        state=payload.state or "",
        unique_id=payload.uniqueId or "",
        dns_verified=is_verified,
        email_status=email_activation_status
    )

    return ProvisionMerchantResponse(
        merchantDomain=domain,
        storefrontUrl=f"https://{domain}",
        senderEmail=f"noreply@{domain}",
        selector=MerchantManager.DKIM_SELECTOR,
        dnsRecords=dns_info["records"],
        cloudflareProvisioned=cf_provisioned,
        verificationStatus=verification_status,
        emailActivationStatus=email_activation_status,
        cloudflareInstructions="Records are automatically published via Cloudflare API. For manual verification, publish TXT records to DNS zone."
    )


@api.post("/v1/merchants/{merchant_id}/domains", dependencies=[Depends(require_auth)])
def register_custom_domain_endpoint(merchant_id: str, payload: RegisterCustomDomainRequest):
    """Registers a verified custom domain for a merchant and derives DNS records."""
    ensure_db_initialized()
    try:
        return MerchantManager.register_custom_domain(
            merchant_id=merchant_id,
            domain=payload.domain,
            selector=payload.selector or "fs1"
        )
    except MerchantError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@api.post("/v1/merchants/{merchant_id}/domains/verify", dependencies=[Depends(require_auth)])
def verify_custom_domain_endpoint(merchant_id: str, payload: VerifyCustomDomainRequest):
    """Verifies DNS propagation for a custom domain."""
    ensure_db_initialized()
    try:
        return MerchantManager.verify_custom_domain(
            merchant_id=merchant_id,
            domain=payload.domain,
            force_verified=payload.forceVerified or False
        )
    except MerchantError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@api.get("/v1/merchants/{merchant_id}/domains", dependencies=[Depends(require_auth)])
def list_merchant_domains_endpoint(merchant_id: str):
    """Lists all registered domains for a merchant."""
    ensure_db_initialized()
    return MerchantManager.get_merchant_domains(merchant_id)


@api.post("/v1/webhooks/bounce", dependencies=[Depends(require_auth)])
def handle_bounce_webhook(payload: BounceWebhookRequest):
    """Ingests bounce, complaint, or delivery events to maintain tenant-scoped suppression lists."""
    ensure_db_initialized()
    eff_scope = (payload.scope or "MERCHANT").upper()
    eff_tenant = payload.tenantId or (Config.PLATFORM_TENANT_ID if eff_scope == "PLATFORM" else payload.merchantId)
    if not eff_tenant:
        eff_tenant = "GLOBAL"

    result = ReputationManager.record_event(
        tenant_id=eff_tenant,
        recipient_email=payload.recipientEmail,
        event_type=payload.bounceType,
        details=payload.details or "Webhook report",
        scope=eff_scope
    )
    return {"success": True, **result}


@api.get("/v1/deliverability/audit", dependencies=[Depends(require_auth)])
def deliverability_audit():
    """
    Live Deliverability and MTA Audit Endpoint.
    Verifies FCrDNS, DMARC alignment, Postfix status, queue backlog, and tenant send counts.
    """
    ensure_db_initialized()
    ensure_postfix_running()
    fcrdns = DeliverabilityCompliance.verify_fcrdns("127.0.0.1", "localhost")
    alignment = DeliverabilityCompliance.verify_alignment(
        from_email=f"noreply@{Config.ROOT_DOMAIN}",
        envelope_sender=f"noreply@{Config.ROOT_DOMAIN}",
        dkim_domain=Config.ROOT_DOMAIN
    )

    postfix_running = check_postfix_status()
    queue_metrics = QueueManager.get_metrics()
    plat_status = ReputationManager.get_platform_status()

    # Sum merchant sends from queue metrics
    merchant_counts = queue_metrics.get("by_scope", {}).get("MERCHANT", {})
    merchant_sends = sum(merchant_counts.values()) if merchant_counts else 0

    return DeliverabilityAuditResponse(
        deliverabilityStatus="DIRECT_POSTFIX_ACTIVE",
        directSmtpDelivery="ACTIVE (In-Container Postfix MTA on 127.0.0.1:25)",
        postfixStatus=postfix_running,
        fcrdnsCheck=fcrdns,
        dmarcAlignmentCheck=alignment,
        platformSends=plat_status.get("total_sent", 0),
        merchantSends=merchant_sends,
        queueMetrics=queue_metrics,
        recommendations=[
            "Postfix is operating as the primary MTA inside the single Modal container on loopback.",
            "Platform and merchant mail streams operate on isolated reputation and rate limit allocations.",
            "Verify destination mail server PTR / rDNS requirements if direct internet delivery encounters spam filtering.",
            "Monitor Postfix delivery logs via 'modal app logs ferasetu-smtp'."
        ]
    )


@api.get("/v1/debug/postfix", dependencies=[Depends(require_auth)])
def debug_postfix(unsuppress: Optional[str] = None):
    """Runs mailq and inspects Postfix logs and live port 25 connection to Google MX."""
    ensure_db_initialized()
    ensure_postfix_running()
    res = {}

    if unsuppress:
        with ReputationManager._get_conn() as conn:
            conn.execute("DELETE FROM suppression_list WHERE email = ?", (unsuppress.strip().lower(),))
        res["unsuppressed"] = unsuppress
    
    # 1. Run mailq
    try:
        q = subprocess.run(["mailq"], capture_output=True, text=True, timeout=5)
        res["mailq"] = (q.stdout + "\n" + q.stderr).strip()
    except Exception as e:
        res["mailq"] = f"Error: {e}"

    # 2. Check Postfix log files
    for log_path in ["/var/log/mail.log", "/var/log/mail.err", "/var/log/syslog"]:
        if os.path.exists(log_path):
            try:
                with open(log_path, "r", errors="ignore") as f:
                    content = f.read()
                    res[log_path] = content[-3000:] if len(content) > 3000 else content
            except Exception as e:
                res[log_path] = str(e)
        else:
            res[log_path] = "FILE_NOT_FOUND"

    # 3. Direct socket test to Gmail MX on port 25
    try:
        s = socket.create_connection(("gmail-smtp-in.l.google.com", 25), timeout=5)
        banner = s.recv(1024).decode("latin-1", errors="ignore")
        s.close()
        res["google_mx_port25"] = f"CONNECTED: {banner.strip()}"
    except Exception as e:
        res["google_mx_port25"] = f"FAILED: {type(e).__name__} ({e})"

    # 4. Outbound public IP
    try:
        import urllib.request
        with urllib.request.urlopen("https://api.ipify.org", timeout=3) as r:
            res["egress_ip"] = r.read().decode().strip()
    except Exception as e:
        res["egress_ip"] = str(e)

    # 5. Outbound SMTP Relay Connectivity Test (if configured)
    if Config.SMTP_RELAY_HOST:
        relay_diag = {
            "relay_host": Config.SMTP_RELAY_HOST,
            "relay_port": Config.SMTP_RELAY_PORT,
            "tls_enabled": Config.SMTP_RELAY_TLS,
            "auth_configured": bool(Config.SMTP_RELAY_USERNAME and Config.SMTP_RELAY_PASSWORD),
        }
        try:
            with socket.create_connection((Config.SMTP_RELAY_HOST, Config.SMTP_RELAY_PORT), timeout=5) as s:
                banner = s.recv(1024).decode("latin-1", errors="ignore")
                relay_diag["connection_status"] = f"CONNECTED: {banner.strip()}"
        except Exception as e:
            relay_diag["connection_status"] = f"FAILED: {type(e).__name__} ({e})"
        res["relay_diagnostics"] = relay_diag
    else:
        res["relay_diagnostics"] = {"configured": False, "note": "Direct Postfix MTA loopback mode active"}

    return res


@api.get("/health")
def health_check():
    """Service health probe, Postfix daemon status, and queue metrics."""
    ensure_db_initialized()
    ensure_postfix_running()
    metrics = QueueManager.get_metrics()
    config_status = Config.validate_config()
    postfix_status = check_postfix_status()
    transport_name = "ORACLE_RELAY_587" if Config.SMTP_RELAY_HOST else "POSTFIX_DIRECT"

    return {
        "status": "HEALTHY",
        "service": "ferasetu-smtp",
        "environment": Config.ENV,
        "transport": transport_name,
        "postfix_status": postfix_status,
        "relay": {
            "configured": bool(Config.SMTP_RELAY_HOST),
            "host": Config.SMTP_RELAY_HOST,
            "port": Config.SMTP_RELAY_PORT,
            "tls": Config.SMTP_RELAY_TLS,
            "auth_configured": bool(Config.SMTP_RELAY_USERNAME and Config.SMTP_RELAY_PASSWORD)
        },
        "queue": metrics,
        "config_valid": config_status["valid"],
        "database_path": Config.DB_PATH,
        "resource_allocation": {
            "cpu_cores": Config.MODAL_CPU,
            "memory_mib": Config.MODAL_MEMORY_MIB,
            "min_containers": 1,
            "max_containers": 1
        }
    }


if app:
    # Attach Modal secrets (for SMTP_RELAY_* credentials) if available
    secrets_list = []
    try:
        secrets_list.append(modal.Secret.from_name("ferasetu-smtp-secrets"))
    except Exception:
        pass

    # Single Persistent Container: Web Gateway + Postfix MTA + Background Queue Worker
    @app.function(
        image=smtp_image,
        cpu=Config.MODAL_CPU,
        memory=Config.MODAL_MEMORY_MIB,
        min_containers=1,
        max_containers=1,
        volumes={"/data": volume},
        secrets=secrets_list
    )
    @modal.asgi_app()
    def web_gateway():
        ensure_db_initialized()
        ensure_postfix_running()
        return api
