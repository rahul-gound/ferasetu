"""
FeraSetu SMTP Configuration Module
Defines runtime configurations, deliverability thresholds, resource constraints, and defaults.
"""

import os
import re
from typing import Dict, Any

class Config:
    # Base Domain and Identity
    ROOT_DOMAIN = os.getenv("FERASETU_ROOT_DOMAIN", "ferasetu.com")
    SERVICE_HOSTNAME = os.getenv("FERASETU_SMTP_HOSTNAME", f"mail.{ROOT_DOMAIN}")
    API_KEY = os.getenv("FERASETU_SMTP_API_KEY", "")
    
    # Platform Identity & Sender Allowlist
    PLATFORM_TENANT_ID = os.getenv("FERASETU_PLATFORM_TENANT_ID", "ferasetu-platform")
    _DEFAULT_PLATFORM_SENDERS = f"no-reply@{ROOT_DOMAIN},support@{ROOT_DOMAIN},billing@{ROOT_DOMAIN},alerts@{ROOT_DOMAIN},system@{ROOT_DOMAIN}"
    PLATFORM_ALLOWED_SENDERS = set(
        filter(None, [s.strip().lower() for s in os.getenv("PLATFORM_ALLOWED_SENDERS", _DEFAULT_PLATFORM_SENDERS).split(",")])
    )
    PLATFORM_GLOBAL_RATE_LIMIT_PER_SEC = int(os.getenv("PLATFORM_GLOBAL_RATE_LIMIT_PER_SEC", "200"))
    PLATFORM_DEFAULT_RATE_LIMIT_PER_SEC = int(os.getenv("PLATFORM_DEFAULT_RATE_LIMIT_PER_SEC", "50"))

    # Priority Classes
    PRIORITY_MAP = {
        "CRITICAL": 1,
        "HIGH": 2,
        "NORMAL": 3,
        "LOW": 4
    }
    DEFAULT_PRIORITY = "NORMAL"

    # Forbidden Headers (Owned strictly by MTA/Gateway; injection prohibited)
    FORBIDDEN_HEADERS = {
        "return-path",
        "received",
        "dkim-signature",
        "authentication-results",
        "x-authentication-warning",
        "bcc",
        "delivered-to",
        "content-length",
        "x-ferasetu-scope",
        "x-ferasetu-tenant-id",
        "resent-from",
        "resent-to",
        "resent-cc",
        "resent-bcc",
        "resent-date",
        "resent-message-id"
    }

    # Environment
    ENV = os.getenv("ENVIRONMENT", "development")
    IS_PRODUCTION = ENV.lower() == "production"

    # Postfix MTA Transport (Primary Production Delivery Engine)
    USE_POSTFIX_TRANSPORT = os.getenv("USE_POSTFIX_TRANSPORT", "true").lower() == "true"
    POSTFIX_HOST = os.getenv("POSTFIX_HOST", "127.0.0.1")
    POSTFIX_PORT = int(os.getenv("POSTFIX_PORT", "25"))

    # Development Simulation Flag (strictly opt-in; prohibited in production)
    ALLOW_SIMULATED_DELIVERY = os.getenv("ALLOW_SIMULATED_DELIVERY", "false").lower() == "true"

    # Cloudflare DNS Automation (Server-side credentials)
    CLOUDFLARE_API_TOKEN = os.getenv("CLOUDFLARE_API_TOKEN", "")
    CLOUDFLARE_ZONE_ID = os.getenv("CLOUDFLARE_ZONE_ID", "")

    # Production SMTP Relay (Modal -> Oracle:587 Outbound Submission)
    SMTP_RELAY_HOST = os.getenv("SMTP_RELAY_HOST", "")
    SMTP_RELAY_PORT = int(os.getenv("SMTP_RELAY_PORT", "587"))
    SMTP_RELAY_USERNAME = os.getenv("SMTP_RELAY_USERNAME", os.getenv("SMTP_RELAY_USER", ""))
    SMTP_RELAY_USER = SMTP_RELAY_USERNAME  # Backward compatible alias
    SMTP_RELAY_PASSWORD = os.getenv("SMTP_RELAY_PASSWORD", os.getenv("SMTP_RELAY_PASS", ""))
    SMTP_RELAY_PASS = SMTP_RELAY_PASSWORD  # Backward compatible alias
    SMTP_RELAY_TLS = os.getenv("SMTP_RELAY_TLS", os.getenv("SMTP_RELAY_REQUIRE_TLS", "true")).lower() == "true"
    SMTP_RELAY_REQUIRE_TLS = SMTP_RELAY_TLS  # Backward compatible alias
    SMTP_RELAY_VERIFY_CERT = os.getenv("SMTP_RELAY_VERIFY_CERT", "true").lower() == "true"

    # Resource Constraints (Modal.com limits)
    MODAL_CPU = float(os.getenv("MODAL_CPU", "0.125"))
    MODAL_MEMORY_MIB = int(os.getenv("MODAL_MEMORY_MIB", "128"))
    MODAL_MIN_CONTAINERS = int(os.getenv("MODAL_MIN_CONTAINERS", os.getenv("MODAL_KEEP_WARM", "1")))
    MODAL_KEEP_WARM = MODAL_MIN_CONTAINERS  # Backward compatible alias
    MODAL_MAX_CONTAINERS = int(os.getenv("MODAL_MAX_CONTAINERS", "5"))

    @staticmethod
    def _determine_default_data_dir() -> str:
        r"""
        Determines the appropriate default data directory:
        - In Modal Linux container where /data is mounted: '/data'
        - In Windows or local development: '<project_root>/data'
        - If DATA_DIR environment variable is set:
            - On Windows, if /data or \data is specified, falls back to local data directory
            - Otherwise uses specified DATA_DIR
        """
        env_dir = os.getenv("DATA_DIR")
        if env_dir:
            # On Windows, /data or \data is an invalid Unix root path; fall back to local data
            if os.name == "nt" and (env_dir in ("/data", "\\data") or (env_dir.startswith(("/", "\\")) and ":" not in env_dir)):
                return os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
            return env_dir

        # Inside Linux container with Modal Volume mounted at /data
        if os.name != "nt" and os.path.exists("/data") and os.path.isdir("/data"):
            return "/data"

        # Local development fallback
        return os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

    # Persistent Storage Paths
    DATA_DIR = _determine_default_data_dir()
    DB_PATH = os.path.join(DATA_DIR, "ferasetu_smtp_queue.db")
    KEYS_DIR = os.path.join(DATA_DIR, "dkim_keys")

    @classmethod
    def set_data_dir(cls, new_dir: str):
        """Dynamically updates DATA_DIR and dependent paths (e.g. when Volume is mounted)."""
        cls.DATA_DIR = new_dir
        cls.DB_PATH = os.path.join(new_dir, "ferasetu_smtp_queue.db")
        cls.KEYS_DIR = os.path.join(new_dir, "dkim_keys")

    @classmethod
    def ensure_data_dirs(cls):
        """Ensures the directory containing DB_PATH and KEYS_DIR exists."""
        db_dir = os.path.dirname(cls.DB_PATH)
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)
        if cls.KEYS_DIR:
            os.makedirs(cls.KEYS_DIR, exist_ok=True)

    # Message Limits
    MAX_MESSAGE_SIZE_BYTES = int(os.getenv("MAX_MESSAGE_SIZE_BYTES", str(10 * 1024 * 1024))) # 10MB
    MAX_RECIPIENTS_PER_MSG = int(os.getenv("MAX_RECIPIENTS_PER_MSG", "10"))
    
    # Rate Limiting & Burst Protection
    GLOBAL_RATE_LIMIT_PER_SEC = int(os.getenv("GLOBAL_RATE_LIMIT_PER_SEC", "100"))
    MERCHANT_DEFAULT_RATE_LIMIT_PER_SEC = int(os.getenv("MERCHANT_DEFAULT_RATE_LIMIT_PER_SEC", "10"))
    BURST_MULTIPLIER = 2.0

    # Queue & Exponential Backoff
    MAX_RETRIES = int(os.getenv("MAX_RETRIES", "5"))
    INITIAL_RETRY_DELAY_SEC = int(os.getenv("INITIAL_RETRY_DELAY_SEC", "60")) # 1 min
    BACKOFF_FACTOR = float(os.getenv("BACKOFF_FACTOR", "3.0")) # 1m, 3m, 9m, 27m, 81m
    IDEMPOTENCY_EXPIRY_HOURS = int(os.getenv("IDEMPOTENCY_EXPIRY_HOURS", "24"))

    # Deliverability Thresholds (Google Postmaster / Yahoo standards)
    MAX_SPAM_RATE_WARNING = 0.0010  # 0.10% Google threshold warning
    MAX_SPAM_RATE_SUSPEND = 0.0030  # 0.30% Google threshold hard cutoff
    MAX_BOUNCE_RATE_WARNING = 0.020 # 2.0%
    MAX_BOUNCE_RATE_SUSPEND = 0.050 # 5.0%

    # Merchant Warm-Up Daily Quotas
    WARMUP_SCHEDULE_DAYS = {
        1: 50,
        2: 100,
        3: 250,
        4: 500,
        5: 1000,
        6: 1500,
        7: 2500, # Day 7 onwards: standard tier
    }

    @classmethod
    def validate_config(cls) -> Dict[str, Any]:
        """Validates configuration parameters and returns warnings or errors."""
        issues = []
        if cls.IS_PRODUCTION:
            if not cls.API_KEY or cls.API_KEY == "ferasetu-test-insecure-key-change-me":
                issues.append("PRODUCTION ERROR: FERASETU_SMTP_API_KEY must be configured with a strong secret in production.")
            if cls.ALLOW_SIMULATED_DELIVERY:
                issues.append("PRODUCTION ERROR: ALLOW_SIMULATED_DELIVERY cannot be enabled in production.")
            if not cls.USE_POSTFIX_TRANSPORT and not cls.SMTP_RELAY_HOST:
                issues.append("PRODUCTION ERROR: Either USE_POSTFIX_TRANSPORT must be true or SMTP_RELAY_HOST must be provided.")
            if cls.MODAL_CPU < 0.125:
                issues.append("CONFIG ERROR: MODAL_CPU cannot be lower than Modal's supported minimum (0.125).")
            if cls.MODAL_MEMORY_MIB < 128:
                issues.append("CONFIG ERROR: MODAL_MEMORY_MIB cannot be lower than Modal's supported minimum (128 MiB).")
        
        # Ensure directories exist
        cls.ensure_data_dirs()
        
        return {
            "valid": len([i for i in issues if "ERROR" in i]) == 0,
            "issues": issues,
            "root_domain": cls.ROOT_DOMAIN,
            "use_postfix": cls.USE_POSTFIX_TRANSPORT,
            "postfix_host": cls.POSTFIX_HOST,
            "postfix_port": cls.POSTFIX_PORT,
            "smtp_relay_configured": bool(cls.SMTP_RELAY_HOST),
            "smtp_relay_host": cls.SMTP_RELAY_HOST,
            "smtp_relay_port": cls.SMTP_RELAY_PORT,
            "smtp_relay_tls": cls.SMTP_RELAY_TLS,
            "smtp_relay_auth": bool(cls.SMTP_RELAY_USERNAME and cls.SMTP_RELAY_PASSWORD),
            "allow_simulated": cls.ALLOW_SIMULATED_DELIVERY,
            "data_dir": cls.DATA_DIR,
            "db_path": cls.DB_PATH
        }
