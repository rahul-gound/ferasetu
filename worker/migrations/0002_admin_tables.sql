-- Migration 0002: Admin Dashboard Tables
-- Adds required tables and columns for the Admin API

-- Add is_blocked to existing users table
-- D1 doesn't support IF NOT EXISTS for columns, but Wrangler migration system tracks applied migrations.
ALTER TABLE users ADD COLUMN is_blocked INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ticket_replies (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS websites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  template TEXT NOT NULL DEFAULT 'default',
  config TEXT,
  sections TEXT,
  is_published INTEGER NOT NULL DEFAULT 0,
  theme TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feature_flags (
  id TEXT PRIMARY KEY,
  flag_key TEXT UNIQUE NOT NULL,
  description TEXT,
  is_enabled INTEGER NOT NULL DEFAULT 0,
  rules_json TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tenant_feature_flags (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  flag_key TEXT NOT NULL,
  is_enabled INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(tenant_id, flag_key)
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id TEXT PRIMARY KEY,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  cost REAL NOT NULL DEFAULT 0,
  credits_used INTEGER NOT NULL DEFAULT 1,
  usage_type TEXT NOT NULL DEFAULT 'shopkeeper_assistant',
  created_at TEXT NOT NULL
);
