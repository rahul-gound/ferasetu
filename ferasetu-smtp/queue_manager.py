"""
FeraSetu Persistent Mail Queue & Retry Engine
SQLite-backed persistent queue for Modal Volume storage, providing idempotency deduplication,
granular delivery lifecycle states (ACCEPTED, QUEUED, POSTFIX_QUEUED, DELIVERED, DEFERRED, FAILED, BOUNCED),
exponential backoff retries, and crash recovery.
"""

import os
import time
import sqlite3
import logging
from typing import Optional, Dict, Any, List
from config import Config

logger = logging.getLogger("ferasetu_smtp.queue")

class QueueManager:
    """Manages transactional email queue persistence on durable storage."""

    # Explicit accurate delivery lifecycle states
    STATE_ACCEPTED = "ACCEPTED"
    STATE_QUEUED = "QUEUED"
    STATE_POSTFIX_QUEUED = "POSTFIX_QUEUED"
    STATE_DELIVERED = "DELIVERED"
    STATE_DEFERRED = "DEFERRED"
    STATE_FAILED = "FAILED"
    STATE_BOUNCED = "BOUNCED"
    STATE_PROCESSING = "PROCESSING"

    @classmethod
    def _get_conn(cls) -> sqlite3.Connection:
        db_dir = os.path.dirname(Config.DB_PATH)
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)
        conn = sqlite3.connect(Config.DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

    @classmethod
    def init_queue(cls):
        """Initializes SQLite schema for message queue, priority handling, and tenant-scoped idempotency."""
        with cls._get_conn() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS email_queue (
                    id TEXT PRIMARY KEY,
                    scope TEXT NOT NULL DEFAULT 'MERCHANT',
                    tenant_id TEXT NOT NULL DEFAULT '',
                    merchant_id TEXT NOT NULL,
                    from_email TEXT NOT NULL,
                    to_email TEXT NOT NULL,
                    subject TEXT NOT NULL,
                    raw_mime BLOB NOT NULL,
                    status TEXT NOT NULL, -- QUEUED, POSTFIX_QUEUED, DELIVERED, DEFERRED, FAILED, BOUNCED, PROCESSING
                    priority INTEGER NOT NULL DEFAULT 3, -- 1=CRITICAL, 2=HIGH, 3=NORMAL, 4=LOW
                    priority_name TEXT NOT NULL DEFAULT 'NORMAL',
                    retry_count INTEGER DEFAULT 0,
                    next_retry_at REAL NOT NULL,
                    last_error TEXT,
                    idempotency_key TEXT,
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_status_priority_retry 
                ON email_queue(status, priority, next_retry_at);

                CREATE UNIQUE INDEX IF NOT EXISTS idx_idempotency_tenant 
                ON email_queue(tenant_id, idempotency_key) 
                WHERE idempotency_key IS NOT NULL;
            """)

            # Safe incremental migration for existing databases missing new columns
            cols = [col[1] for col in conn.execute("PRAGMA table_info(email_queue)").fetchall()]
            if "scope" not in cols:
                conn.execute("ALTER TABLE email_queue ADD COLUMN scope TEXT NOT NULL DEFAULT 'MERCHANT'")
            if "tenant_id" not in cols:
                conn.execute("ALTER TABLE email_queue ADD COLUMN tenant_id TEXT NOT NULL DEFAULT ''")
                conn.execute("UPDATE email_queue SET tenant_id = merchant_id WHERE tenant_id = ''")
            if "priority" not in cols:
                conn.execute("ALTER TABLE email_queue ADD COLUMN priority INTEGER NOT NULL DEFAULT 3")
            if "priority_name" not in cols:
                conn.execute("ALTER TABLE email_queue ADD COLUMN priority_name TEXT NOT NULL DEFAULT 'NORMAL'")

    @classmethod
    def enqueue(
        cls,
        message_id: str,
        merchant_id: str,
        from_email: str,
        to_email: str,
        subject: str,
        raw_mime: bytes,
        idempotency_key: Optional[str] = None,
        scope: str = "MERCHANT",
        tenant_id: Optional[str] = None,
        priority: str = "NORMAL"
    ) -> Dict[str, Any]:
        """
        Enqueues an email for outbound delivery with priority and tenant-scoped idempotency.
        Duplicate requests with the same valid key do not create duplicate deliveries.
        Merchant A's idempotency keys never collide with Merchant B's.
        """
        cls.init_queue()
        now = time.time()
        effective_tenant = tenant_id or (Config.PLATFORM_TENANT_ID if scope == "PLATFORM" else merchant_id)
        prio_upper = priority.upper() if priority else "NORMAL"
        prio_val = Config.PRIORITY_MAP.get(prio_upper, 3)
        prio_name = prio_upper if prio_upper in Config.PRIORITY_MAP else "NORMAL"

        with cls._get_conn() as conn:
            if idempotency_key:
                existing = conn.execute(
                    "SELECT id, status, created_at FROM email_queue WHERE tenant_id = ? AND idempotency_key = ?",
                    (effective_tenant, idempotency_key)
                ).fetchone()
                if existing:
                    logger.info("Duplicate send prevented for tenant '%s' idempotency_key '%s'", effective_tenant, idempotency_key)
                    return {
                        "message_id": existing["id"],
                        "status": existing["status"],
                        "duplicate": True,
                        "created_at": existing["created_at"]
                    }

            conn.execute("""
                INSERT INTO email_queue (
                    id, scope, tenant_id, merchant_id, from_email, to_email, subject, raw_mime,
                    status, priority, priority_name, retry_count, next_retry_at, idempotency_key, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
            """, (
                message_id, scope, effective_tenant, merchant_id, from_email, to_email, subject, raw_mime,
                cls.STATE_QUEUED, prio_val, prio_name, now, idempotency_key, now, now
            ))

        return {
            "message_id": message_id,
            "status": cls.STATE_QUEUED,
            "duplicate": False,
            "created_at": now
        }

    @classmethod
    def fetch_pending_batch(cls, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Fetches messages that are due for delivery (status IN ('QUEUED', 'DEFERRED') and next_retry_at <= now).
        Orders by priority ASC (CRITICAL=1 before HIGH=2 before NORMAL=3 before LOW=4) then next_retry_at ASC.
        Transitions fetched items to 'PROCESSING'.
        """
        cls.init_queue()
        now = time.time()
        with cls._get_conn() as conn:
            # First recover stuck 'PROCESSING' messages from unexpected container crashes
            stuck_threshold = now - 300 # 5 minutes
            conn.execute("""
                UPDATE email_queue
                SET status = 'DEFERRED', updated_at = ?
                WHERE status = 'PROCESSING' AND updated_at < ?
            """, (now, stuck_threshold))

            rows = conn.execute("""
                SELECT id, scope, tenant_id, merchant_id, from_email, to_email, subject, raw_mime,
                       status, priority, priority_name, retry_count
                FROM email_queue
                WHERE status IN ('QUEUED', 'DEFERRED') AND next_retry_at <= ?
                ORDER BY priority ASC, next_retry_at ASC
                LIMIT ?
            """, (now, limit)).fetchall()

            if not rows:
                return []

            ids = [r["id"] for r in rows]
            placeholders = ",".join("?" * len(ids))
            conn.execute(f"""
                UPDATE email_queue
                SET status = 'PROCESSING', updated_at = ?
                WHERE id IN ({placeholders})
            """, [now] + ids)

            return [dict(r) for r in rows]

    @classmethod
    def mark_postfix_queued(cls, message_id: str, details: str = "Accepted by Postfix MTA on loopback"):
        """
        Accurately records that the message has been accepted into Postfix's internal queue.
        Does NOT falsely mark as DELIVERED until downstream remote MX acceptance is verified.
        """
        now = time.time()
        with cls._get_conn() as conn:
            conn.execute("""
                UPDATE email_queue
                SET status = ?, last_error = NULL, updated_at = ?
                WHERE id = ?
            """, (cls.STATE_POSTFIX_QUEUED, now, message_id))

    @classmethod
    def mark_delivered(cls, message_id: str, details: str = "Delivered to recipient MX"):
        """Marks message as successfully delivered to destination MX server."""
        now = time.time()
        with cls._get_conn() as conn:
            conn.execute("""
                UPDATE email_queue
                SET status = ?, last_error = NULL, updated_at = ?
                WHERE id = ?
            """, (cls.STATE_DELIVERED, now, message_id))

    @classmethod
    def mark_success(cls, message_id: str):
        """Backward-compatible alias for mark_postfix_queued."""
        cls.mark_postfix_queued(message_id)

    @classmethod
    def mark_failure(
        cls,
        message_id: str,
        error_message: str,
        is_permanent: bool = False,
        is_bounce: bool = False
    ):
        """
        Handles delivery failure:
        - If bounce: transitions to BOUNCED
        - If permanent error or retries exhausted: transitions to FAILED
        - If transient error: transitions to DEFERRED with exponential backoff
        """
        now = time.time()
        with cls._get_conn() as conn:
            row = conn.execute(
                "SELECT retry_count FROM email_queue WHERE id = ?",
                (message_id,)
            ).fetchone()
            if not row:
                return

            retries = row["retry_count"] + 1
            if is_bounce:
                new_status = cls.STATE_BOUNCED
                next_retry = now
                logger.error("Message %s marked as BOUNCED: %s", message_id, error_message)
            elif is_permanent or retries >= Config.MAX_RETRIES:
                new_status = cls.STATE_FAILED
                next_retry = now
                logger.error("Message %s permanently FAILED after %d attempts: %s", message_id, retries, error_message)
            else:
                new_status = cls.STATE_DEFERRED
                delay = Config.INITIAL_RETRY_DELAY_SEC * (Config.BACKOFF_FACTOR ** (retries - 1))
                next_retry = now + delay
                logger.warning("Message %s DEFERRED (attempt %d/%d). Retrying in %ds: %s",
                               message_id, retries, Config.MAX_RETRIES, delay, error_message)

            conn.execute("""
                UPDATE email_queue
                SET status = ?, retry_count = ?, next_retry_at = ?, last_error = ?, updated_at = ?
                WHERE id = ?
            """, (new_status, retries, next_retry, error_message, now, message_id))

    @classmethod
    def get_status(cls, message_id: str, requester_tenant_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Retrieves delivery status of a message.
        Enforces tenant isolation: if requester_tenant_id is provided, returns None if
        the message belongs to a different merchant/tenant.
        """
        cls.init_queue()
        with cls._get_conn() as conn:
            row = conn.execute(
                "SELECT id, scope, tenant_id, merchant_id, from_email, to_email, subject, status, priority, priority_name, retry_count, next_retry_at, last_error, created_at, updated_at "
                "FROM email_queue WHERE id = ?",
                (message_id,)
            ).fetchone()
            if not row:
                return None
            
            data = dict(row)
            if requester_tenant_id:
                # Platform operators can view any status; merchants can only view their own
                if requester_tenant_id != Config.PLATFORM_TENANT_ID and data["tenant_id"] != requester_tenant_id and data["merchant_id"] != requester_tenant_id:
                    logger.warning("Tenant isolation violation: tenant '%s' attempted to access message '%s' belonging to '%s'",
                                   requester_tenant_id, message_id, data["tenant_id"])
                    return None
            return data

    @classmethod
    def get_metrics(cls) -> Dict[str, Any]:
        """Returns aggregate queue counts with granular states and scope/priority breakdown."""
        cls.init_queue()
        with cls._get_conn() as conn:
            rows = conn.execute("""
                SELECT status, COUNT(*) as count
                FROM email_queue
                GROUP BY status
            """).fetchall()
            counts = {r["status"]: r["count"] for r in rows}
            postfix_queued = counts.get(cls.STATE_POSTFIX_QUEUED, 0)
            delivered = counts.get(cls.STATE_DELIVERED, 0)
            legacy_sent = counts.get("SENT", 0)
            total_sent = postfix_queued + delivered + legacy_sent

            # Scope breakdown
            scope_rows = conn.execute("""
                SELECT scope, status, COUNT(*) as count
                FROM email_queue
                GROUP BY scope, status
            """).fetchall()
            scope_breakdown = {"PLATFORM": {}, "MERCHANT": {}}
            for r in scope_rows:
                sc = r["scope"]
                if sc not in scope_breakdown:
                    scope_breakdown[sc] = {}
                scope_breakdown[sc][r["status"]] = r["count"]

            # Priority breakdown
            prio_rows = conn.execute("""
                SELECT priority_name, COUNT(*) as count
                FROM email_queue
                GROUP BY priority_name
            """).fetchall()
            priority_breakdown = {r["priority_name"]: r["count"] for r in prio_rows}

            return {
                "queued": counts.get(cls.STATE_QUEUED, 0),
                "postfix_queued": postfix_queued,
                "delivered": delivered,
                "deferred": counts.get(cls.STATE_DEFERRED, 0),
                "failed": counts.get(cls.STATE_FAILED, 0) + counts.get("DEAD_LETTER", 0),
                "bounced": counts.get(cls.STATE_BOUNCED, 0),
                "processing": counts.get(cls.STATE_PROCESSING, 0),
                "sent": total_sent, # Backward-compatible aggregate
                "by_scope": scope_breakdown,
                "by_priority": priority_breakdown
            }
