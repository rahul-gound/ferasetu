-- Migration 0003: Transactions, Survey Submissions, and SMTP Settings
-- Ensures complete table schema for authoritative payments, customer feedback, and email config.

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'razorpay',
  provider_order_id TEXT,
  provider_payment_id TEXT,
  amount REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending',
  plan TEXT NOT NULL,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  metadata TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_provider_order_id ON transactions (provider_order_id);

CREATE TABLE IF NOT EXISTS survey_submissions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  answers_json TEXT,
  feedback TEXT,
  contact TEXT,
  ai_summary_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_survey_user_id ON survey_submissions (user_id);

CREATE TABLE IF NOT EXISTS smtp_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  provider TEXT NOT NULL DEFAULT 'custom',
  host TEXT,
  port INTEGER NOT NULL DEFAULT 587,
  username TEXT,
  password_encrypted TEXT,
  sender_name TEXT,
  sender_email TEXT,
  reply_to_email TEXT,
  ssl_enabled INTEGER NOT NULL DEFAULT 0,
  tls_enabled INTEGER NOT NULL DEFAULT 1,
  otp_enabled INTEGER NOT NULL DEFAULT 1,
  otp_length INTEGER NOT NULL DEFAULT 6,
  otp_expiry_minutes INTEGER NOT NULL DEFAULT 10,
  otp_resend_cooldown INTEGER NOT NULL DEFAULT 60,
  otp_max_attempts INTEGER NOT NULL DEFAULT 5,
  otp_subject TEXT,
  otp_body_template TEXT,
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
