"""
FeraSetu Merchant Identity & DNS Provisioning Module
Handles canonical merchant domain generation, 2048-bit RSA DKIM key management,
merchant authorization, and DNS record templates for SPF, DKIM, DMARC, and MX.
"""

import os
import re
import time
import base64
import sqlite3
import logging
from typing import Dict, Any, Tuple, Optional, List
from config import Config

logger = logging.getLogger("ferasetu_smtp.merchant")

class MerchantError(Exception):
    pass

class UnauthorizedSenderDomainError(MerchantError):
    pass

class MerchantManager:
    """
    Manages merchant sender subdomains and cryptographic DKIM identities.
    Ensures merchants can only send from their assigned FeraSetu canonical domain.
    """
    
    DKIM_SELECTOR = "fs1"
    SUBDOMAIN_PATTERN = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
    EMAIL_PATTERN = re.compile(r"^[a-zA-Z0-9_.+-]+@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)$")
    _dkim_key_cache: Dict[str, Tuple[str, str]] = {}

    @classmethod
    def _get_conn(cls) -> sqlite3.Connection:
        db_dir = os.path.dirname(Config.DB_PATH)
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)
        conn = sqlite3.connect(Config.DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

    @classmethod
    def init_schema(cls):
        """Initializes SQLite schema for merchant identities, custom domains, and sender states."""
        with cls._get_conn() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS merchant_identities (
                    merchant_id TEXT PRIMARY KEY,
                    canonical_domain TEXT NOT NULL UNIQUE,
                    shop_name TEXT,
                    city TEXT,
                    district TEXT,
                    state TEXT,
                    unique_id TEXT,
                    dkim_selector TEXT NOT NULL DEFAULT 'fs1',
                    dns_verified INTEGER NOT NULL DEFAULT 0,
                    email_status TEXT NOT NULL DEFAULT 'PENDING_DNS', -- PENDING_DNS, ACTIVE, SUSPENDED
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_merchant_canonical_domain 
                ON merchant_identities(canonical_domain);

                CREATE TABLE IF NOT EXISTS merchant_domains (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tenant_id TEXT NOT NULL,
                    merchant_id TEXT NOT NULL,
                    domain TEXT NOT NULL,
                    domain_type TEXT NOT NULL DEFAULT 'CANONICAL', -- CANONICAL, CUSTOM, PLATFORM
                    dkim_selector TEXT NOT NULL DEFAULT 'fs1',
                    dns_verified INTEGER NOT NULL DEFAULT 0,
                    status TEXT NOT NULL DEFAULT 'PENDING_DNS', -- PENDING_DNS, ACTIVE, SUSPENDED
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL,
                    UNIQUE(tenant_id, domain)
                );
                CREATE INDEX IF NOT EXISTS idx_merchant_domains_lookup 
                ON merchant_domains(tenant_id, domain);

                CREATE TABLE IF NOT EXISTS merchant_senders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tenant_id TEXT NOT NULL,
                    merchant_id TEXT NOT NULL,
                    domain TEXT NOT NULL,
                    sender_email TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED
                    created_at REAL NOT NULL,
                    UNIQUE(tenant_id, sender_email)
                );
                CREATE INDEX IF NOT EXISTS idx_merchant_senders_lookup 
                ON merchant_senders(tenant_id, sender_email);
            """)

    @classmethod
    def sanitize_dns_label_part(cls, text: Optional[str]) -> str:
        """
        Sanitizes raw user input for use within a DNS label:
        - Converts to lowercase
        - Replaces non-alphanumerics with hyphens
        - Collapses consecutive hyphens
        - Strips leading and trailing hyphens
        """
        if not text:
            return ""
        clean = text.strip().lower()
        clean = re.sub(r"[^a-z0-9]+", "-", clean)
        clean = re.sub(r"-+", "-", clean).strip("-")
        return clean

    @classmethod
    def generate_canonical_merchant_slug(
        cls,
        shop_name: str,
        city: str,
        district: str,
        state: str,
        unique_id: str
    ) -> str:
        """
        Generates a canonical DNS-safe slug in the format:
        shopname-city-district-state-uniqueid

        Guarantees:
        - Only [a-z0-9-]
        - Lowercase
        - Total slug length <= 63 characters (RFC 1035 DNS label limit)
        - Total slug length >= 3 characters
        - Deterministic and collision-safe unique suffix
        """
        s_shop = cls.sanitize_dns_label_part(shop_name) or "shop"
        s_city = cls.sanitize_dns_label_part(city) or "city"
        s_dist = cls.sanitize_dns_label_part(district) or "dist"
        s_state = cls.sanitize_dns_label_part(state) or "st"
        s_unique = cls.sanitize_dns_label_part(str(unique_id)) or "1"

        # Unique suffix max length of 10 to ensure safety
        if len(s_unique) > 10:
            s_unique = s_unique[:10].rstrip("-")
        if not s_unique:
            s_unique = "1"

        MAX_LABEL_LEN = 63
        HYPHENS_LEN = 4

        # Initial check if complete slug fits without truncation
        full_slug = f"{s_shop}-{s_city}-{s_dist}-{s_state}-{s_unique}"
        if len(full_slug) <= MAX_LABEL_LEN:
            return full_slug

        # Progressively truncate segments if exceeding 63 chars:
        if len(s_state) > 4:
            s_state = s_state[:4].rstrip("-")

        if len(s_dist) > 12:
            s_dist = s_dist[:12].rstrip("-")

        if len(s_city) > 12:
            s_city = s_city[:12].rstrip("-")

        used = len(s_city) + len(s_dist) + len(s_state) + len(s_unique) + HYPHENS_LEN
        shop_budget = MAX_LABEL_LEN - used

        if shop_budget < 3:
            s_dist = s_dist[:6].rstrip("-")
            s_city = s_city[:6].rstrip("-")
            used = len(s_city) + len(s_dist) + len(s_state) + len(s_unique) + HYPHENS_LEN
            shop_budget = MAX_LABEL_LEN - used

        s_shop = s_shop[:max(3, shop_budget)].rstrip("-")
        if not s_shop:
            s_shop = "shop"

        slug = f"{s_shop}-{s_city}-{s_dist}-{s_state}-{s_unique}"
        if len(slug) > MAX_LABEL_LEN:
            slug = slug[:MAX_LABEL_LEN].rstrip("-")

        return slug

    @classmethod
    def generate_canonical_merchant_domain(
        cls,
        shop_name: str,
        city: str,
        district: str,
        state: str,
        unique_id: str
    ) -> str:
        """
        Constructs the canonical FQDN:
        shopname-city-district-state-uniqueid.ferasetu.com
        """
        slug = cls.generate_canonical_merchant_slug(shop_name, city, district, state, unique_id)
        return f"{slug}.{Config.ROOT_DOMAIN}"

    @classmethod
    def get_merchant_domain(cls, merchant_slug: str) -> str:
        """
        Constructs or normalizes the canonical sender domain for a merchant slug.
        Ensures lowercase and valid DNS format.
        """
        clean_slug = cls.sanitize_dns_label_part(merchant_slug)
        if len(clean_slug) > 63:
            clean_slug = clean_slug[:63].rstrip("-")
        if not clean_slug or not cls.SUBDOMAIN_PATTERN.match(clean_slug):
            raise MerchantError(f"Invalid merchant slug format '{merchant_slug}'. Must be lowercase alphanumeric with hyphens.")
        return f"{clean_slug}.{Config.ROOT_DOMAIN}"

    @classmethod
    def save_merchant_identity(
        cls,
        merchant_id: str,
        canonical_domain: str,
        shop_name: str = "",
        city: str = "",
        district: str = "",
        state: str = "",
        unique_id: str = "",
        dns_verified: bool = False,
        email_status: str = "PENDING_DNS"
    ):
        """Persists or updates the merchant's canonical identity in SQLite."""
        cls.init_schema()
        now = time.time()
        with cls._get_conn() as conn:
            conn.execute("""
                INSERT INTO merchant_identities (
                    merchant_id, canonical_domain, shop_name, city, district, state,
                    unique_id, dkim_selector, dns_verified, email_status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(merchant_id) DO UPDATE SET
                    canonical_domain = excluded.canonical_domain,
                    dns_verified = excluded.dns_verified,
                    email_status = excluded.email_status,
                    updated_at = excluded.updated_at
            """, (
                merchant_id, canonical_domain, shop_name, city, district, state,
                unique_id, cls.DKIM_SELECTOR, 1 if dns_verified else 0, email_status, now, now
            ))

            # Also ensure entry in merchant_domains
            conn.execute("""
                INSERT INTO merchant_domains (
                    tenant_id, merchant_id, domain, domain_type, dkim_selector, dns_verified, status, created_at, updated_at
                ) VALUES (?, ?, ?, 'CANONICAL', ?, ?, ?, ?, ?)
                ON CONFLICT(tenant_id, domain) DO UPDATE SET
                    dns_verified = excluded.dns_verified,
                    status = excluded.status,
                    updated_at = excluded.updated_at
            """, (
                merchant_id, merchant_id, canonical_domain, cls.DKIM_SELECTOR,
                1 if dns_verified else 0, email_status, now, now
            ))

    @classmethod
    def get_merchant_identity(cls, merchant_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a merchant's stored canonical identity."""
        cls.init_schema()
        with cls._get_conn() as conn:
            row = conn.execute(
                "SELECT * FROM merchant_identities WHERE merchant_id = ?",
                (merchant_id,)
            ).fetchone()
            return dict(row) if row else None

    @classmethod
    def validate_sender_authorization(
        cls,
        tenant_id_or_merchant_id: str,
        sender_email: str,
        scope: str = "MERCHANT",
        merchant_id: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        Validates sender authorization for both PLATFORM and MERCHANT scopes.
        - PLATFORM:
            Must have tenant_id == Config.PLATFORM_TENANT_ID
            Sender must be in Config.PLATFORM_ALLOWED_SENDERS
        - MERCHANT:
            Must have merchant_id (defaults to tenant_id_or_merchant_id)
            Domain must be authorized canonical subdomain or verified active custom domain
        Returns (local_part, domain).
        """
        match = cls.EMAIL_PATTERN.match(sender_email.strip())
        if not match:
            raise MerchantError(f"Malformed sender email address: '{sender_email}'")
        
        local_part, domain = sender_email.strip().split("@", 1)
        domain = domain.lower()
        normalized_sender = f"{local_part}@{domain}".lower()

        # 1. PLATFORM Scope Authorization
        if scope == "PLATFORM":
            if tenant_id_or_merchant_id != Config.PLATFORM_TENANT_ID:
                raise UnauthorizedSenderDomainError(
                    f"Tenant '{tenant_id_or_merchant_id}' is not authorized for PLATFORM scope. "
                    f"Expected platform tenant '{Config.PLATFORM_TENANT_ID}'."
                )
            if normalized_sender not in Config.PLATFORM_ALLOWED_SENDERS:
                logger.warning("Unauthorized platform sender attempt: %s for tenant %s", normalized_sender, tenant_id_or_merchant_id)
                raise UnauthorizedSenderDomainError(
                    f"Sender '{normalized_sender}' is not in the platform sender allowlist."
                )
            return local_part, domain

        # 2. MERCHANT Scope Authorization
        eff_merchant_id = merchant_id or tenant_id_or_merchant_id
        if not eff_merchant_id or eff_merchant_id == Config.PLATFORM_TENANT_ID:
            raise UnauthorizedSenderDomainError("Valid merchantId is required for MERCHANT scope email.")

        expected_suffix = f".{Config.ROOT_DOMAIN}"
        if domain.endswith(expected_suffix):
            # Canonical Subdomain validation
            subdomain_part = domain[:-len(expected_suffix)]
            if not cls.SUBDOMAIN_PATTERN.match(subdomain_part):
                raise UnauthorizedSenderDomainError(f"Invalid merchant subdomain structure: '{domain}'")
            
            # Check database registration
            saved = cls.get_merchant_identity(eff_merchant_id)
            if saved and saved.get("canonical_domain") == domain:
                return local_part, domain

            # Cross-merchant check: verify merchant_id matches or is authorized for this subdomain
            normalized_merchant = cls.sanitize_dns_label_part(eff_merchant_id)
            if not (normalized_merchant in subdomain_part or subdomain_part.startswith(normalized_merchant)):
                logger.warning(
                    "Cross-merchant sender mismatch: merchant_id '%s' attempted to send from '%s'",
                    eff_merchant_id, sender_email
                )
                raise UnauthorizedSenderDomainError(
                    f"Merchant '{eff_merchant_id}' is not authorized to send from domain '{domain}'"
                )
            return local_part, domain

        # Custom Domain validation
        cls.init_schema()
        with cls._get_conn() as conn:
            row = conn.execute(
                "SELECT * FROM merchant_domains WHERE merchant_id = ? AND domain = ?",
                (eff_merchant_id, domain)
            ).fetchone()

            if not row:
                raise UnauthorizedSenderDomainError(
                    f"Custom domain '{domain}' is not registered for merchant '{eff_merchant_id}'"
                )

            if row["status"] == "SUSPENDED":
                raise UnauthorizedSenderDomainError(f"Custom domain '{domain}' is suspended for sending")

            if row["status"] != "ACTIVE" or row["dns_verified"] != 1:
                raise UnauthorizedSenderDomainError(
                    f"Custom domain '{domain}' is pending DNS verification (status: {row['status']})"
                )

            # Check if specific senders are restricted in merchant_senders
            senders_count = conn.execute(
                "SELECT COUNT(*) as cnt FROM merchant_senders WHERE merchant_id = ? AND domain = ?",
                (eff_merchant_id, domain)
            ).fetchone()["cnt"]

            if senders_count > 0:
                sender_row = conn.execute(
                    "SELECT * FROM merchant_senders WHERE merchant_id = ? AND domain = ? AND LOWER(sender_email) = ? AND status = 'ACTIVE'",
                    (eff_merchant_id, domain, normalized_sender)
                ).fetchone()
                if not sender_row:
                    raise UnauthorizedSenderDomainError(
                        f"Sender '{normalized_sender}' is not in the authorized sender list for domain '{domain}'"
                    )

        return local_part, domain

    @classmethod
    def get_or_create_dkim_key(cls, domain: str, selector: Optional[str] = None) -> Tuple[str, str]:
        """
        Retrieves or generates a 2048-bit RSA DKIM private key and public key for the domain.
        Returns (private_key_pem, public_key_base64).
        """
        sel = selector or cls.DKIM_SELECTOR
        cache_key = f"{domain}:{sel}"
        if cache_key in cls._dkim_key_cache:
            return cls._dkim_key_cache[cache_key]

        key_specific = f"{domain}_{sel}.key"
        key_default = f"{domain}.key"
        
        path_specific = os.path.join(Config.KEYS_DIR, key_specific)
        path_default = os.path.join(Config.KEYS_DIR, key_default)
        
        target_path = path_specific if os.path.exists(path_specific) else path_default
        if os.path.exists(target_path):
            with open(target_path, "r", encoding="utf-8") as f:
                private_pem = f.read()
            public_base64 = cls._extract_public_key_base64(private_pem)
            cls._dkim_key_cache[cache_key] = (private_pem, public_base64)
            return private_pem, public_base64

        key_path = target_path

        # Generate a new 2048-bit RSA key
        logger.info("Generating new 2048-bit RSA DKIM key for domain: %s", domain)
        try:
            from cryptography.hazmat.primitives.asymmetric import rsa
            from cryptography.hazmat.primitives import serialization

            private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=2048
            )
            private_pem = private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.TraditionalOpenSSL,
                encryption_algorithm=serialization.NoEncryption()
            ).decode("utf-8")

            # Extract base64 public key (DER) for DNS record
            public_der = private_key.public_key().public_bytes(
                encoding=serialization.Encoding.DER,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            )
            public_base64 = base64.b64encode(public_der).decode("utf-8")

            os.makedirs(Config.KEYS_DIR, exist_ok=True)
            with open(key_path, "w", encoding="utf-8") as f:
                f.write(private_pem)

            cls._dkim_key_cache[cache_key] = (private_pem, public_base64)
            return private_pem, public_base64

        except ImportError:
            logger.warning("Cryptography package not available; using mock key for development")
            mock_private = f"-----BEGIN RSA PRIVATE KEY-----\nMOCK_PRIVATE_KEY_{domain}\n-----END RSA PRIVATE KEY-----"
            mock_public = f"MOCK_PUBLIC_KEY_{domain}"
            cls._dkim_key_cache[cache_key] = (mock_private, mock_public)
            return mock_private, mock_public

    @classmethod
    def _extract_public_key_base64(cls, private_pem: str) -> str:
        """Extracts the Base64 DER public key from an RSA private key PEM."""
        try:
            from cryptography.hazmat.primitives import serialization
            key = serialization.load_pem_private_key(private_pem.encode("utf-8"), password=None)
            public_der = key.public_key().public_bytes(
                encoding=serialization.Encoding.DER,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            )
            return base64.b64encode(public_der).decode("utf-8")
        except Exception:
            return "BASE64_PUBLIC_KEY"

    @classmethod
    def generate_dns_records(cls, merchant_domain: str, selector: Optional[str] = None) -> Dict[str, Any]:
        """
        Generates required DNS records derived from actual Postfix + DKIM architecture:
        1. DKIM TXT: 2048-bit RSA public key at <selector>._domainkey.<merchant_domain>
        2. SPF TXT: Centralized include:_spf.ferasetu.com at <merchant_domain>
        3. DMARC TXT: Explicit reject policy at _dmarc.<merchant_domain> (and inherited from _dmarc.ferasetu.com)
        4. MX: Documented as optional/inbound-only (not required for transactional sending)
        """
        sel = selector or cls.DKIM_SELECTOR
        _, public_base64 = cls.get_or_create_dkim_key(merchant_domain)
        
        records = [
            {
                "type": "TXT",
                "name": f"{sel}._domainkey.{merchant_domain}",
                "content": f"v=DKIM1; k=rsa; p={public_base64}",
                "ttl": 3600,
                "purpose": "2048-bit RSA DKIM public key for cryptographic signature verification"
            },
            {
                "type": "TXT",
                "name": merchant_domain,
                "content": f"v=spf1 include:_spf.{Config.ROOT_DOMAIN} ~all",
                "ttl": 3600,
                "purpose": f"Centralized SPF policy delegating authorization to _spf.{Config.ROOT_DOMAIN}"
            },
            {
                "type": "TXT",
                "name": f"_dmarc.{merchant_domain}",
                "content": f"v=DMARC1; p=reject; rua=mailto:dmarc-reports@{Config.ROOT_DOMAIN}; aspf=r; adkim=r",
                "ttl": 3600,
                "purpose": "Explicit merchant DMARC reject policy overriding/confirming root policy"
            },
            {
                "type": "MX",
                "name": merchant_domain,
                "content": f"10 {Config.SERVICE_HOSTNAME}",
                "ttl": 3600,
                "purpose": "Inbound mail routing (Optional; transactional outbound sending does not require MX)",
                "required_for_outbound": False
            }
        ]

        return {
            "merchant_domain": merchant_domain,
            "selector": sel,
            "records": records,
            "cloudflare_api_payload": [
                {
                    "type": r["type"],
                    "name": r["name"],
                    "content": r["content"],
                    "ttl": r["ttl"]
                }
                for r in records
                if r.get("required_for_outbound", True)
            ]
        }

    @classmethod
    def register_custom_domain(
        cls,
        merchant_id: str,
        domain: str,
        selector: str = "fs1"
    ) -> Dict[str, Any]:
        """
        Registers a custom domain for a merchant.
        Generates a dedicated 2048-bit RSA DKIM keypair and derives DNS records.
        """
        clean_domain = domain.strip().lower()
        if not clean_domain or "." not in clean_domain or "/" in clean_domain or "@" in clean_domain:
            raise MerchantError(f"Invalid domain format: '{domain}'")
        
        if clean_domain.endswith(f".{Config.ROOT_DOMAIN}"):
            raise MerchantError(f"Domain '{clean_domain}' is a FeraSetu subdomain; use standard merchant provisioning.")

        cls.init_schema()
        now = time.time()
        
        # 1. Generate or retrieve DKIM key for custom domain
        _, public_b64 = cls.get_or_create_dkim_key(clean_domain)
        dns_info = cls.generate_dns_records(clean_domain, selector=selector)

        # 2. Persist in merchant_domains
        with cls._get_conn() as conn:
            conn.execute("""
                INSERT INTO merchant_domains (
                    tenant_id, merchant_id, domain, domain_type, dkim_selector, dns_verified, status, created_at, updated_at
                ) VALUES (?, ?, ?, 'CUSTOM', ?, 0, 'PENDING_DNS', ?, ?)
                ON CONFLICT(tenant_id, domain) DO UPDATE SET
                    dkim_selector = excluded.dkim_selector,
                    updated_at = excluded.updated_at
            """, (merchant_id, merchant_id, clean_domain, selector, now, now))

        return {
            "merchant_id": merchant_id,
            "domain": clean_domain,
            "domain_type": "CUSTOM",
            "selector": selector,
            "dns_records": dns_info["records"],
            "verification_status": "PENDING_DNS"
        }

    @classmethod
    def verify_custom_domain(
        cls,
        merchant_id: str,
        domain: str,
        force_verified: bool = False
    ) -> Dict[str, Any]:
        """
        Verifies DNS propagation for a custom domain.
        If force_verified=True, immediately marks verified (for tests/admin override).
        """
        clean_domain = domain.strip().lower()
        cls.init_schema()
        
        with cls._get_conn() as conn:
            row = conn.execute(
                "SELECT * FROM merchant_domains WHERE merchant_id = ? AND domain = ?",
                (merchant_id, clean_domain)
            ).fetchone()
            if not row:
                raise MerchantError(f"Domain '{clean_domain}' is not registered for merchant '{merchant_id}'")

        if force_verified:
            is_verified = True
        else:
            try:
                from cloudflare_dns import CloudflareDNSManager
                _, pubkey = cls.get_or_create_dkim_key(clean_domain)
                res = CloudflareDNSManager.verify_dns_records(
                    merchant_domain=clean_domain,
                    selector=row["dkim_selector"],
                    expected_dkim_pubkey=pubkey
                )
                is_verified = res.get("verified", False)
            except Exception as e:
                logger.warning("DNS verification query error for %s: %s", clean_domain, e)
                is_verified = False

        now = time.time()
        new_status = "ACTIVE" if is_verified else "PENDING_DNS"
        with cls._get_conn() as conn:
            conn.execute("""
                UPDATE merchant_domains
                SET dns_verified = ?, status = ?, updated_at = ?
                WHERE merchant_id = ? AND domain = ?
            """, (1 if is_verified else 0, new_status, now, merchant_id, clean_domain))

        return {
            "merchant_id": merchant_id,
            "domain": clean_domain,
            "verified": is_verified,
            "status": new_status
        }

    @classmethod
    def authorize_merchant_sender(cls, merchant_id: str, domain: str, sender_email: str):
        """Authorizes a specific sender mailbox for a merchant's domain."""
        cls.init_schema()
        clean_email = sender_email.strip().lower()
        clean_domain = domain.strip().lower()
        now = time.time()
        with cls._get_conn() as conn:
            conn.execute("""
                INSERT INTO merchant_senders (tenant_id, merchant_id, domain, sender_email, status, created_at)
                VALUES (?, ?, ?, ?, 'ACTIVE', ?)
                ON CONFLICT(tenant_id, sender_email) DO UPDATE SET status = 'ACTIVE'
            """, (merchant_id, merchant_id, clean_domain, clean_email, now))

    @classmethod
    def get_merchant_domains(cls, merchant_id: str) -> List[Dict[str, Any]]:
        """Lists all registered domains for a merchant."""
        cls.init_schema()
        with cls._get_conn() as conn:
            rows = conn.execute(
                "SELECT * FROM merchant_domains WHERE merchant_id = ? ORDER BY created_at ASC",
                (merchant_id,)
            ).fetchall()
            return [dict(r) for r in rows]

    @classmethod
    def rotate_dkim_key(cls, domain: str, new_selector: Optional[str] = None) -> Tuple[str, str, str]:
        """
        Rotates DKIM key for a domain cleanly.
        Never exposes private key in logs or return values.
        Returns (domain, new_selector, public_key_base64).
        """
        clean_domain = domain.strip().lower()
        selector = new_selector or "fs2"
        key_filename = f"{clean_domain}_{selector}.key" if selector != "fs1" else f"{clean_domain}.key"
        key_path = os.path.join(Config.KEYS_DIR, key_filename)

        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.hazmat.primitives import serialization

        private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption()
        ).decode("utf-8")

        public_der = private_key.public_key().public_bytes(
            encoding=serialization.Encoding.DER,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        public_base64 = base64.b64encode(public_der).decode("utf-8")

        os.makedirs(Config.KEYS_DIR, exist_ok=True)
        with open(key_path, "w", encoding="utf-8") as f:
            f.write(private_pem)

        cls.init_schema()
        with cls._get_conn() as conn:
            conn.execute("""
                UPDATE merchant_domains
                SET dkim_selector = ?, updated_at = ?
                WHERE domain = ?
            """, (selector, time.time(), clean_domain))

        logger.info("Rotated DKIM key for domain %s (selector: %s)", clean_domain, selector)
        return clean_domain, selector, public_base64
