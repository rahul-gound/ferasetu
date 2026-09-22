"""
FeraSetu Reputation & Anti-Spam Safeguards Module
Manages per-merchant reputation metrics, hard-bounce suppression lists,
warm-up volume pacing, and automatic suspension of abusive senders.
"""

import os
import time
import sqlite3
import logging
from typing import Dict, Any, Optional
from config import Config

logger = logging.getLogger("ferasetu_smtp.reputation")

class ReputationError(Exception):
    pass

class SenderSuspendedError(ReputationError):
    pass

class AddressSuppressedError(ReputationError):
    pass

class WarmupLimitExceededError(ReputationError):
    pass

class ReputationManager:
    """Protects shared FeraSetu infrastructure reputation across all merchants."""

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
        """Initializes tables for merchant & platform reputation tracking, suppression, and warm-up."""
        with cls._get_conn() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS merchant_reputation (
                    merchant_id TEXT PRIMARY KEY,
                    merchant_domain TEXT NOT NULL,
                    created_at REAL NOT NULL,
                    total_sent INTEGER DEFAULT 0,
                    total_delivered INTEGER DEFAULT 0,
                    total_bounced INTEGER DEFAULT 0,
                    total_complaints INTEGER DEFAULT 0,
                    status TEXT DEFAULT 'ACTIVE', -- ACTIVE, WARNING, SUSPENDED
                    status_reason TEXT,
                    updated_at REAL NOT NULL
                );

                CREATE TABLE IF NOT EXISTS platform_reputation (
                    tenant_id TEXT PRIMARY KEY,
                    created_at REAL NOT NULL,
                    total_sent INTEGER DEFAULT 0,
                    total_delivered INTEGER DEFAULT 0,
                    total_bounced INTEGER DEFAULT 0,
                    total_complaints INTEGER DEFAULT 0,
                    updated_at REAL NOT NULL
                );

                CREATE TABLE IF NOT EXISTS suppression_list (
                    email TEXT NOT NULL,
                    tenant_id TEXT NOT NULL DEFAULT 'GLOBAL',
                    scope TEXT NOT NULL DEFAULT 'MERCHANT',
                    reason TEXT NOT NULL, -- HARD_BOUNCE, SPAM_COMPLAINT, UNSUBSCRIBE, SUPPRESSION
                    created_at REAL NOT NULL,
                    details TEXT,
                    PRIMARY KEY (email, tenant_id)
                );

                CREATE INDEX IF NOT EXISTS idx_suppression_lookup 
                ON suppression_list(email, tenant_id);

                CREATE TABLE IF NOT EXISTS daily_volume (
                    merchant_id TEXT NOT NULL,
                    day_key TEXT NOT NULL, -- YYYY-MM-DD
                    sent_count INTEGER DEFAULT 0,
                    PRIMARY KEY (merchant_id, day_key)
                );
            """)

            # Ensure platform tenant initialized
            now = time.time()
            conn.execute("""
                INSERT OR IGNORE INTO platform_reputation (tenant_id, created_at, updated_at)
                VALUES (?, ?, ?)
            """, (Config.PLATFORM_TENANT_ID, now, now))

            # Incremental column check for suppression_list if migrating
            cols = [c[1] for c in conn.execute("PRAGMA table_info(suppression_list)").fetchall()]
            if "tenant_id" not in cols:
                conn.execute("ALTER TABLE suppression_list ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'GLOBAL'")
            if "scope" not in cols:
                conn.execute("ALTER TABLE suppression_list ADD COLUMN scope TEXT NOT NULL DEFAULT 'MERCHANT'")

    @classmethod
    def check_recipient_suppressed(cls, email: str, tenant_id: Optional[str] = None, scope: str = "MERCHANT") -> None:
        """
        Raises AddressSuppressedError if recipient email is on the suppression list.
        Maintains strict tenant isolation:
        - PLATFORM only checks platform tenant suppressions and global suppressions.
        - MERCHANT only checks their own tenant suppressions and global suppressions.
        - Platform suppression never leaks into merchant data; Merchant A never affects Merchant B.
        """
        cls.init_schema()
        normalized_email = email.strip().lower()
        effective_tenant = tenant_id or (Config.PLATFORM_TENANT_ID if scope == "PLATFORM" else "GLOBAL")

        with cls._get_conn() as conn:
            row = conn.execute("""
                SELECT reason, details, tenant_id FROM suppression_list 
                WHERE email = ? AND (tenant_id = ? OR tenant_id = 'GLOBAL')
            """, (normalized_email, effective_tenant)).fetchone()
            
            if row:
                raise AddressSuppressedError(
                    f"Recipient '{normalized_email}' is suppressed due to previous {row['reason']}"
                )

    @classmethod
    def add_to_suppression(
        cls,
        email: str,
        reason: str,
        details: str = "",
        tenant_id: Optional[str] = None,
        scope: str = "MERCHANT"
    ):
        """Adds an email address to the suppression list for a specific tenant or globally."""
        cls.init_schema()
        normalized_email = email.strip().lower()
        effective_tenant = tenant_id or (Config.PLATFORM_TENANT_ID if scope == "PLATFORM" else "GLOBAL")
        now = time.time()

        with cls._get_conn() as conn:
            conn.execute("""
                INSERT INTO suppression_list (email, tenant_id, scope, reason, created_at, details)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(email, tenant_id) DO UPDATE SET
                    reason = excluded.reason,
                    details = excluded.details,
                    created_at = excluded.created_at
            """, (normalized_email, effective_tenant, scope, reason, now, details))
    @classmethod
    def is_suppressed(cls, email: str, tenant_id: Optional[str] = None) -> bool:
        """Checks whether an email address is currently suppressed for a tenant or globally."""
        cls.init_schema()
        normalized_email = email.strip().lower()
        effective_tenant = tenant_id or "GLOBAL"
        with cls._get_conn() as conn:
            row = conn.execute("""
                SELECT reason FROM suppression_list
                WHERE email = ? AND (tenant_id = ? OR tenant_id = 'GLOBAL')
            """, (normalized_email, effective_tenant)).fetchone()
            return bool(row)

    @classmethod
    def check_merchant_allowed_to_send(cls, merchant_id: str, merchant_domain: str) -> None:
        """
        Validates that the merchant is ACTIVE and within their daily warm-up allocation.
        """
        now = time.time()
        with cls._get_conn() as conn:
            row = conn.execute(
                "SELECT * FROM merchant_reputation WHERE merchant_id = ?",
                (merchant_id,)
            ).fetchone()

            if not row:
                # Register new merchant identity
                conn.execute("""
                    INSERT INTO merchant_reputation (merchant_id, merchant_domain, created_at, updated_at)
                    VALUES (?, ?, ?, ?)
                """, (merchant_id, merchant_domain, now, now))
                created_at = now
                status = "ACTIVE"
            else:
                created_at = row["created_at"]
                status = row["status"]
                if status.startswith("SUSPENDED"):
                    raise SenderSuspendedError(
                        f"Merchant '{merchant_id}' sending is SUSPENDED. Reason: {row['status_reason']}"
                    )

            # Warm-up pacing calculation
            days_active = max(1, int((now - created_at) // 86400) + 1)
            daily_limit = Config.WARMUP_SCHEDULE_DAYS.get(
                days_active,
                Config.WARMUP_SCHEDULE_DAYS[max(Config.WARMUP_SCHEDULE_DAYS.keys())]
            )

            # Check today's volume
            today_key = time.strftime("%Y-%m-%d", time.gmtime(now))
            vol_row = conn.execute(
                "SELECT sent_count FROM daily_volume WHERE merchant_id = ? AND day_key = ?",
                (merchant_id, today_key)
            ).fetchone()
            current_sent = vol_row["sent_count"] if vol_row else 0

            if current_sent >= daily_limit:
                raise WarmupLimitExceededError(
                    f"Merchant '{merchant_id}' exceeded warm-up quota for Day {days_active} "
                    f"({current_sent}/{daily_limit} emails). Wait until tomorrow or contact support."
                )

    @classmethod
    def record_email_sent(cls, tenant_id: str, scope: str = "MERCHANT"):
        """Increments sent counts for the target tenant without cross-scope contamination."""
        cls.init_schema()
        now = time.time()
        today_key = time.strftime("%Y-%m-%d", time.gmtime(now))

        with cls._get_conn() as conn:
            if scope == "PLATFORM":
                conn.execute("""
                    INSERT INTO platform_reputation (tenant_id, created_at, total_sent, total_delivered, total_bounced, total_complaints, updated_at)
                    VALUES (?, ?, 1, 0, 0, 0, ?)
                    ON CONFLICT(tenant_id) DO UPDATE SET
                        total_sent = total_sent + 1,
                        updated_at = excluded.updated_at
                """, (tenant_id or Config.PLATFORM_TENANT_ID, now, now))
            else:
                conn.execute("""
                    INSERT INTO merchant_reputation (merchant_id, merchant_domain, created_at, total_sent, total_delivered, total_bounced, total_complaints, updated_at)
                    VALUES (?, '', ?, 1, 0, 0, 0, ?)
                    ON CONFLICT(merchant_id) DO UPDATE SET
                        total_sent = total_sent + 1,
                        updated_at = excluded.updated_at
                """, (tenant_id, now, now))

                conn.execute("""
                    INSERT INTO daily_volume (merchant_id, day_key, sent_count)
                    VALUES (?, ?, 1)
                    ON CONFLICT(merchant_id, day_key) DO UPDATE SET
                        sent_count = sent_count + 1
                """, (tenant_id, today_key))

    @classmethod
    def record_delivered(cls, tenant_id: str, scope: str = "MERCHANT"):
        """Increments delivered counts for the target tenant."""
        cls.init_schema()
        now = time.time()
        with cls._get_conn() as conn:
            if scope == "PLATFORM":
                conn.execute("""
                    INSERT INTO platform_reputation (tenant_id, created_at, total_sent, total_delivered, total_bounced, total_complaints, updated_at)
                    VALUES (?, ?, 0, 1, 0, 0, ?)
                    ON CONFLICT(tenant_id) DO UPDATE SET
                        total_delivered = total_delivered + 1,
                        updated_at = excluded.updated_at
                """, (tenant_id or Config.PLATFORM_TENANT_ID, now, now))
            else:
                conn.execute("""
                    INSERT INTO merchant_reputation (merchant_id, merchant_domain, created_at, total_sent, total_delivered, total_bounced, total_complaints, updated_at)
                    VALUES (?, '', ?, 0, 1, 0, 0, ?)
                    ON CONFLICT(merchant_id) DO UPDATE SET
                        total_delivered = total_delivered + 1,
                        updated_at = excluded.updated_at
                """, (tenant_id, now, now))

    @classmethod
    def record_bounce(
        cls,
        tenant_id: str,
        recipient_email: str,
        is_hard_bounce: bool = True,
        details: str = "",
        scope: str = "MERCHANT"
    ):
        """Records a bounce event and suppresses recipient on hard bounce within tenant scope."""
        cls.init_schema()
        now = time.time()
        if is_hard_bounce:
            cls.add_to_suppression(recipient_email, "HARD_BOUNCE", details, tenant_id=tenant_id, scope=scope)

        with cls._get_conn() as conn:
            if scope == "PLATFORM":
                conn.execute("""
                    INSERT INTO platform_reputation (tenant_id, created_at, total_sent, total_delivered, total_bounced, total_complaints, updated_at)
                    VALUES (?, ?, 0, 0, 1, 0, ?)
                    ON CONFLICT(tenant_id) DO UPDATE SET
                        total_bounced = total_bounced + 1,
                        updated_at = excluded.updated_at
                """, (tenant_id or Config.PLATFORM_TENANT_ID, now, now))
            else:
                conn.execute("""
                    INSERT INTO merchant_reputation (merchant_id, merchant_domain, created_at, total_sent, total_delivered, total_bounced, total_complaints, updated_at)
                    VALUES (?, '', ?, 0, 0, 1, 0, ?)
                    ON CONFLICT(merchant_id) DO UPDATE SET
                        total_bounced = total_bounced + 1,
                        updated_at = excluded.updated_at
                """, (tenant_id, now, now))

        if scope == "MERCHANT":
            cls._evaluate_merchant_health(tenant_id)

    @classmethod
    def record_spam_complaint(
        cls,
        tenant_id: str,
        recipient_email: str,
        details: str = "",
        scope: str = "MERCHANT"
    ):
        """Records a spam complaint and suppresses recipient within tenant scope."""
        cls.init_schema()
        now = time.time()
        cls.add_to_suppression(recipient_email, "SPAM_COMPLAINT", details, tenant_id=tenant_id, scope=scope)

        with cls._get_conn() as conn:
            if scope == "PLATFORM":
                conn.execute("""
                    INSERT INTO platform_reputation (tenant_id, created_at, total_sent, total_delivered, total_bounced, total_complaints, updated_at)
                    VALUES (?, ?, 0, 0, 0, 1, ?)
                    ON CONFLICT(tenant_id) DO UPDATE SET
                        total_complaints = total_complaints + 1,
                        updated_at = excluded.updated_at
                """, (tenant_id or Config.PLATFORM_TENANT_ID, now, now))
            else:
                conn.execute("""
                    INSERT INTO merchant_reputation (merchant_id, merchant_domain, created_at, total_sent, total_delivered, total_bounced, total_complaints, updated_at)
                    VALUES (?, '', ?, 0, 0, 0, 1, ?)
                    ON CONFLICT(merchant_id) DO UPDATE SET
                        total_complaints = total_complaints + 1,
                        updated_at = excluded.updated_at
                """, (tenant_id, now, now))

        if scope == "MERCHANT":
            cls._evaluate_merchant_health(tenant_id)

    @classmethod
    def record_event(
        cls,
        tenant_id: str,
        recipient_email: str,
        event_type: str,
        details: str = "",
        scope: str = "MERCHANT"
    ) -> Dict[str, Any]:
        """
        Unified webhook handler supporting:
        - hard bounce
        - soft bounce
        - complaint
        - suppression
        - delivery
        - deferred
        """
        evt = event_type.strip().lower()
        if evt in ("hard_bounce", "hard", "bounce"):
            cls.record_bounce(tenant_id, recipient_email, is_hard_bounce=True, details=details, scope=scope)
            return {"status": "recorded", "event": "hard_bounce", "suppressed": True}
        elif evt in ("soft_bounce", "soft"):
            cls.record_bounce(tenant_id, recipient_email, is_hard_bounce=False, details=details, scope=scope)
            return {"status": "recorded", "event": "soft_bounce", "suppressed": False}
        elif evt in ("complaint", "spam"):
            cls.record_spam_complaint(tenant_id, recipient_email, details=details, scope=scope)
            return {"status": "recorded", "event": "complaint", "suppressed": True}
        elif evt in ("suppression", "suppress"):
            cls.add_to_suppression(recipient_email, "MANUAL_SUPPRESSION", details=details, tenant_id=tenant_id, scope=scope)
            return {"status": "recorded", "event": "suppression", "suppressed": True}
        elif evt in ("delivery", "delivered"):
            cls.record_delivered(tenant_id, scope=scope)
            return {"status": "recorded", "event": "delivered", "suppressed": False}
        elif evt in ("deferred", "deferral"):
            return {"status": "recorded", "event": "deferred", "suppressed": False}
        else:
            return {"status": "ignored", "event": evt, "suppressed": False}

    @classmethod
    def _evaluate_merchant_health(cls, merchant_id: str):
        """
        Evaluates deliverability metrics against Google & Yahoo thresholds.
        Suspends the merchant if spam rate >= 0.3% or bounce rate >= 5%.
        """
        with cls._get_conn() as conn:
            row = conn.execute(
                "SELECT * FROM merchant_reputation WHERE merchant_id = ?",
                (merchant_id,)
            ).fetchone()
            if not row or row["total_sent"] < 20:
                # Minimum sample size before automated penalty
                return

            sent = row["total_sent"]
            bounces = row["total_bounced"]
            complaints = row["total_complaints"]

            bounce_rate = bounces / sent
            spam_rate = complaints / sent

            now = time.time()
            if spam_rate >= Config.MAX_SPAM_RATE_SUSPEND:
                conn.execute("""
                    UPDATE merchant_reputation
                    SET status = 'SUSPENDED_ABUSE',
                        status_reason = ?,
                        updated_at = ?
                    WHERE merchant_id = ?
                """, (f"Spam complaint rate {spam_rate*100:.2f}% exceeded 0.30% cutoff", now, merchant_id))
                logger.error("Merchant %s SUSPENDED for spam complaint rate: %.2f%%", merchant_id, spam_rate*100)

            elif bounce_rate >= Config.MAX_BOUNCE_RATE_SUSPEND:
                conn.execute("""
                    UPDATE merchant_reputation
                    SET status = 'SUSPENDED_BOUNCE',
                        status_reason = ?,
                        updated_at = ?
                    WHERE merchant_id = ?
                """, (f"Bounce rate {bounce_rate*100:.2f}% exceeded 5.0% cutoff", now, merchant_id))
                logger.error("Merchant %s SUSPENDED for bounce rate: %.2f%%", merchant_id, bounce_rate*100)

            elif spam_rate >= Config.MAX_SPAM_RATE_WARNING:
                conn.execute("""
                    UPDATE merchant_reputation
                    SET status = 'WARNING',
                        status_reason = ?,
                        updated_at = ?
                    WHERE merchant_id = ?
                """, (f"Spam rate {spam_rate*100:.2f}% above 0.10% threshold", now, merchant_id))
                logger.warning("Merchant %s placed on WARNING for spam rate: %.2f%%", merchant_id, spam_rate*100)

    @classmethod
    def get_platform_status(cls, tenant_id: Optional[str] = None) -> Dict[str, Any]:
        """Returns reputation profile for the platform tenant."""
        cls.init_schema()
        eff_tenant = tenant_id or Config.PLATFORM_TENANT_ID
        with cls._get_conn() as conn:
            row = conn.execute(
                "SELECT * FROM platform_reputation WHERE tenant_id = ?",
                (eff_tenant,)
            ).fetchone()
            if not row:
                return {
                    "tenant_id": eff_tenant,
                    "scope": "PLATFORM",
                    "status": "ACTIVE",
                    "total_sent": 0,
                    "total_delivered": 0,
                    "total_bounced": 0,
                    "total_complaints": 0,
                    "bounce_rate": 0.0,
                    "spam_rate": 0.0
                }
            
            sent = row["total_sent"]
            return {
                "tenant_id": row["tenant_id"],
                "scope": "PLATFORM",
                "status": "ACTIVE",
                "total_sent": sent,
                "total_delivered": row["total_delivered"],
                "total_bounced": row["total_bounced"],
                "total_complaints": row["total_complaints"],
                "bounce_rate": (row["total_bounced"] / sent) if sent > 0 else 0.0,
                "spam_rate": (row["total_complaints"] / sent) if sent > 0 else 0.0,
            }

    @classmethod
    def get_merchant_status(cls, merchant_id: str) -> Dict[str, Any]:
        """Returns the full reputation profile for a merchant."""
        cls.init_schema()
        with cls._get_conn() as conn:
            row = conn.execute(
                "SELECT * FROM merchant_reputation WHERE merchant_id = ?",
                (merchant_id,)
            ).fetchone()
            if not row:
                return {
                    "merchant_id": merchant_id,
                    "merchant_domain": "",
                    "scope": "MERCHANT",
                    "status": "UNKNOWN",
                    "status_reason": None,
                    "total_sent": 0,
                    "total_delivered": 0,
                    "total_bounced": 0,
                    "total_complaints": 0,
                    "bounce_rate": 0.0,
                    "spam_rate": 0.0,
                }
            
            sent = row["total_sent"]
            return {
                "merchant_id": row["merchant_id"],
                "merchant_domain": row["merchant_domain"],
                "scope": "MERCHANT",
                "status": row["status"],
                "status_reason": row["status_reason"],
                "total_sent": sent,
                "total_delivered": row["total_delivered"],
                "total_bounced": row["total_bounced"],
                "total_complaints": row["total_complaints"],
                "bounce_rate": (row["total_bounced"] / sent) if sent > 0 else 0.0,
                "spam_rate": (row["total_complaints"] / sent) if sent > 0 else 0.0,
            }
