-- Migration 0001: Initial Baseline Schema
-- This mirrors the original ensureSchema() to safely skip creation if tables already exist in production.

CREATE TABLE IF NOT EXISTS users (
  id                TEXT PRIMARY KEY,
  email             TEXT UNIQUE NOT NULL,
  name              TEXT NOT NULL,
  phone             TEXT,
  business_name     TEXT,
  plan              TEXT NOT NULL DEFAULT 'free',
  preferred_language TEXT NOT NULL DEFAULT 'en',
  subdomain         TEXT UNIQUE,
  custom_domain      TEXT UNIQUE,
  plan_expires_at    TEXT,
  ai_credits_balance INTEGER NOT NULL DEFAULT 20,
  ai_credits_monthly_limit INTEGER NOT NULL DEFAULT 20,
  ai_credits_used_month INTEGER NOT NULL DEFAULT 0,
  ai_credits_reset_at TEXT,
  storage_used_bytes INTEGER NOT NULL DEFAULT 0,
  storage_limit_bytes INTEGER NOT NULL DEFAULT 52428800,
  founding_member   INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  name        TEXT NOT NULL,
  price       REAL NOT NULL DEFAULT 0,
  stock       INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  items         TEXT NOT NULL DEFAULT '[]',
  total         REAL NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'pending',
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meetings (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  customer_name   TEXT NOT NULL,
  customer_email  TEXT NOT NULL,
  meeting_date    TEXT NOT NULL,
  topic           TEXT,
  status          TEXT NOT NULL DEFAULT 'scheduled',
  created_at      TEXT NOT NULL
);
