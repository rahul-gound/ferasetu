-- Migration 0009: Authoritative Subscriptions System
-- Authoritative billing/subscription state engine, trial immutability, and compatibility mirrors.

-- 1. Authoritative Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  organization_id TEXT,

  plan TEXT NOT NULL DEFAULT 'free',

  status TEXT NOT NULL DEFAULT 'free'
    CHECK(status IN (
      'free',
      'trial',
      'active',
      'past_due',
      'cancelled',
      'expired',
      'pending'
    )),

  trial_used INTEGER NOT NULL DEFAULT 0,
  trial_started_at TEXT,
  trial_ends_at TEXT,

  current_period_start TEXT,
  current_period_end TEXT,

  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,

  payment_provider TEXT,
  provider_order_id TEXT,
  provider_payment_id TEXT,

  metadata TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_order ON subscriptions(provider_order_id);

-- 2. Compatibility Mirrors (users and organizations)
ALTER TABLE users ADD COLUMN trial_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE organizations ADD COLUMN trial_used INTEGER NOT NULL DEFAULT 0;
