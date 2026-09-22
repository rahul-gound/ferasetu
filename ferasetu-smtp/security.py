"""
FeraSetu SMTP Security & Sanitization Module
Provides API authorization, CRLF header injection defense, multi-level rate limiting,
custom header allowlist validation, and safe operational logging.
"""

import re
import time
import hmac
import logging
from typing import Optional, Dict, Tuple, Any
from config import Config

logger = logging.getLogger("ferasetu_smtp.security")

class SecurityError(Exception):
    pass

class UnauthorizedError(SecurityError):
    pass

class HeaderInjectionError(SecurityError):
    pass

class RateLimitExceededError(SecurityError):
    pass

class SecurityManager:
    """Handles API authentication, CRLF protection, rate limiting, and sanitization."""
    
    # In-memory token buckets for rate limiting: key -> (tokens, last_update)
    _rate_buckets: Dict[str, Tuple[float, float]] = {}

    @classmethod
    def verify_api_key(cls, auth_header: Optional[str]) -> bool:
        """
        Validates Bearer token using constant-time comparison to prevent timing attacks.
        """
        if not auth_header:
            raise UnauthorizedError("Missing Authorization header")
        
        parts = auth_header.strip().split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise UnauthorizedError("Invalid Authorization format. Expected 'Bearer <token>'")
        
        token = parts[1]
        expected_token = Config.API_KEY
        
        if not expected_token:
            if Config.IS_PRODUCTION:
                logger.critical("FERASETU_SMTP_API_KEY is not set in production!")
                raise UnauthorizedError("Server authentication configuration error")
            raise UnauthorizedError("API key not configured on server")
        
        # Constant-time comparison
        if not hmac.compare_digest(token.encode("utf-8"), expected_token.encode("utf-8")):
            raise UnauthorizedError("Invalid API key")
        
        return True

    @classmethod
    def validate_no_header_injection(cls, field_name: str, value: Optional[str]) -> str:
        """
        Strictly guards against CRLF / SMTP header injection.
        Disallows carriage return (\r), line feed (\n), and URL-encoded variants.
        """
        if value is None:
            return ""
        
        # Check for raw or encoded line breaks
        injection_pattern = re.compile(r"[\r\n]|%0[adAD]", re.IGNORECASE)
        if injection_pattern.search(value):
            logger.warning("Header injection attempt detected in field '%s': %s", field_name, cls.safe_redact(value))
            raise HeaderInjectionError(f"CRLF header injection detected in '{field_name}'")
        
        return value.strip()

    @classmethod
    def validate_custom_headers(cls, headers: Optional[Dict[str, str]]) -> Dict[str, str]:
        """
        Enforces strict header security:
        1. Explicitly forbids dangerous/internal delivery headers:
           Return-Path, Received, DKIM-Signature, Authentication-Results,
           X-Authentication-Warning, Bcc, Delivered-To, Resent-*
        2. Prohibits CRLF / injection in both header names and values.
        3. Enforces valid RFC 5322 header field name syntax.
        """
        if not headers:
            return {}
        
        validated: Dict[str, str] = {}
        header_name_pattern = re.compile(r"^[A-Za-z0-9_-]+$")

        for raw_key, raw_val in headers.items():
            if not raw_key or not isinstance(raw_key, str):
                continue

            clean_key = raw_key.strip()
            key_lower = clean_key.lower()

            # 1. Block dangerous headers
            if key_lower in Config.FORBIDDEN_HEADERS:
                logger.warning("Prohibited custom header rejected: %s", clean_key)
                raise HeaderInjectionError(f"Custom header '{clean_key}' is prohibited. Delivery and authentication headers are owned exclusively by the gateway.")

            # Also reject standard headers that must only be set by the message builder
            if key_lower in {"from", "to", "subject", "date", "message-id", "mime-version", "content-type", "sender"}:
                logger.warning("Overriding standard header '%s' via customHeaders is rejected", clean_key)
                raise HeaderInjectionError(f"Header '{clean_key}' cannot be set via customHeaders.")

            # 2. Syntax check on header name
            if not header_name_pattern.match(clean_key):
                raise HeaderInjectionError(f"Invalid characters in header name: '{clean_key}'")

            # 3. CRLF check on header name & value
            cls.validate_no_header_injection("custom_header_name", clean_key)
            clean_val = cls.validate_no_header_injection(clean_key, str(raw_val) if raw_val is not None else "")
            
            validated[clean_key] = clean_val

        return validated

    @classmethod
    def _consume_bucket(cls, key: str, rate_per_sec: float, burst_multiplier: float = Config.BURST_MULTIPLIER) -> bool:
        """Consumes a single token from the specified bucket key."""
        burst_capacity = rate_per_sec * burst_multiplier
        now = time.time()
        tokens, last_update = cls._rate_buckets.get(key, (burst_capacity, now))

        # Replenish tokens based on elapsed time
        elapsed = now - last_update
        tokens = min(burst_capacity, tokens + elapsed * rate_per_sec)

        if tokens < 1.0:
            return False

        cls._rate_buckets[key] = (tokens - 1.0, now)
        return True

    @classmethod
    def check_rate_limit(
        cls,
        scope_or_merchant_id: str,
        tenant_id: Optional[str] = None,
        sender_email: Optional[str] = None,
        recipient_email: Optional[str] = None,
        limit_per_sec: Optional[int] = None
    ) -> bool:
        """
        Multi-tier token-bucket rate limiter:
        1. Scope-level limit (Global Platform vs Global Merchant)
        2. Tenant-level limit (Platform tenant or specific Merchant ID)
        3. Sender identity limit (prevents compromised single sender mailbox)
        4. Recipient rate limit (prevents rapid mail-bombing of a single address)

        Backward compatible:
        If called as `check_rate_limit(merchant_id)`, detects scope="MERCHANT" and tenant_id=merchant_id.
        """
        # Determine scope and tenant_id
        if scope_or_merchant_id in ("PLATFORM", "MERCHANT"):
            scope = scope_or_merchant_id
            effective_tenant = tenant_id or (Config.PLATFORM_TENANT_ID if scope == "PLATFORM" else "unknown")
        else:
            # Backward compatible invocation: check_rate_limit("shopname-1")
            scope = "MERCHANT"
            effective_tenant = scope_or_merchant_id

        # 1. Global Scope Rate Limit
        if scope == "PLATFORM":
            global_rate = Config.PLATFORM_GLOBAL_RATE_LIMIT_PER_SEC
            tenant_rate = limit_per_sec or Config.PLATFORM_DEFAULT_RATE_LIMIT_PER_SEC
        else:
            global_rate = Config.GLOBAL_RATE_LIMIT_PER_SEC
            tenant_rate = limit_per_sec or Config.MERCHANT_DEFAULT_RATE_LIMIT_PER_SEC

        if not cls._consume_bucket(f"global:{scope}", global_rate):
            logger.warning("Global rate limit exceeded for scope: %s", scope)
            raise RateLimitExceededError(f"Global {scope} rate limit of {global_rate}/sec exceeded")

        # 2. Tenant / Merchant Rate Limit
        if not cls._consume_bucket(f"tenant:{effective_tenant}", tenant_rate):
            logger.warning("Tenant rate limit exceeded for %s: %s (limit: %d/s)", scope, effective_tenant, tenant_rate)
            raise RateLimitExceededError(f"Rate limit of {tenant_rate}/sec exceeded for {scope.lower()} {effective_tenant}")

        # 3. Sender Identity Rate Limit (allow 2x tenant rate per sender)
        if sender_email:
            sender_rate = max(5.0, tenant_rate * 1.5)
            if not cls._consume_bucket(f"sender:{sender_email.strip().lower()}", sender_rate):
                logger.warning("Sender rate limit exceeded for %s", cls.safe_redact_email(sender_email))
                raise RateLimitExceededError(f"Sender rate limit exceeded for {cls.safe_redact_email(sender_email)}")

        # 4. Recipient Rate Limit (burst protection: max 10/sec to same recipient)
        if recipient_email:
            recip_rate = 10.0
            if not cls._consume_bucket(f"recipient:{recipient_email.strip().lower()}", recip_rate):
                logger.warning("Recipient rate limit exceeded for %s", cls.safe_redact_email(recipient_email))
                raise RateLimitExceededError(f"Delivery rate limit exceeded for recipient {cls.safe_redact_email(recipient_email)}")

        return True

    @classmethod
    def safe_redact_email(cls, email: Optional[str]) -> str:
        """Redacts recipient or sender local-part for safe operational logging."""
        if not email or "@" not in email:
            return "[INVALID_EMAIL]"
        local, domain = email.strip().split("@", 1)
        if len(local) <= 2:
            redacted_local = local[0] + "*"
        else:
            redacted_local = local[0] + "*" * (len(local) - 2) + local[-1]
        return f"{redacted_local}@{domain}"

    @classmethod
    def safe_redact(cls, text: str) -> str:
        """
        Redacts sensitive tokens, passwords, and PII from log output.
        """
        if not text:
            return ""
        # Redact API keys and bearer tokens
        text = re.sub(r"(Bearer\s+)[A-Za-z0-9_\-\.]+", r"\1[REDACTED]", text, flags=re.IGNORECASE)
        # Redact passwords in connection strings
        text = re.sub(r"(:[^\s@/:]+)(@)", r":****\2", text)
        return text
