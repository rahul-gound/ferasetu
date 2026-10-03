-- Migration 0015: Payment Hardening, Idempotency & Safe Test Mode
-- Authoritative migration for price tampering defense, webhook idempotency, and server-side test payment isolation.

-- 1. Add is_test_payment flag to transactions
ALTER TABLE transactions ADD COLUMN is_test_payment INTEGER NOT NULL DEFAULT 0;

-- 2. Add is_test_payment flag to subscriptions
ALTER TABLE subscriptions ADD COLUMN is_test_payment INTEGER NOT NULL DEFAULT 0;

-- 3. Unique index on transactions provider_order_id for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_provider_order_unique
ON transactions (provider_order_id)
WHERE provider_order_id IS NOT NULL;

-- 4. Ensure meetings table exists with tenant isolation and proper indexes
CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  meeting_date TEXT NOT NULL,
  topic TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_meetings_user ON meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
