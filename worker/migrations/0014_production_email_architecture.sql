-- Migration 0014: Production Email Architecture
-- Multi-tenant domain management, sender identities, encrypted external SMTP connections,
-- delivery tracking, and transactional email events.

-- 1. Domains Table
CREATE TABLE IF NOT EXISTS email_domains (
  id TEXT PRIMARY KEY,
  organization_id TEXT, -- NULL for platform domains (ferasetu.com)
  domain TEXT NOT NULL UNIQUE,
  domain_type TEXT NOT NULL CHECK(domain_type IN ('PLATFORM', 'FERASETU_MERCHANT', 'CUSTOM')),
  verification_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(verification_status IN ('PENDING', 'VERIFYING', 'VERIFIED', 'FAILED', 'SUSPENDED')),
  ownership_verification_method TEXT DEFAULT 'DNS_TXT',
  verification_token_hash TEXT,
  dkim_selector TEXT DEFAULT 'fs1',
  dkim_status TEXT DEFAULT 'PENDING' CHECK(dkim_status IN ('PENDING', 'VERIFIED', 'FAILED')),
  spf_status TEXT DEFAULT 'PENDING' CHECK(spf_status IN ('PENDING', 'VERIFIED', 'FAILED')),
  dmarc_status TEXT DEFAULT 'PENDING' CHECK(dmarc_status IN ('PENDING', 'VERIFIED', 'RECOMMENDED_MISSING', 'FAILED')),
  mail_from_status TEXT DEFAULT 'PENDING' CHECK(mail_from_status IN ('PENDING', 'VERIFIED', 'FAILED')),
  provider TEXT NOT NULL DEFAULT 'FERASETU' CHECK(provider IN ('FERASETU', 'EXTERNAL')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  verified_at TEXT,
  last_checked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_email_domains_org ON email_domains(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_domains_domain ON email_domains(domain);
CREATE INDEX IF NOT EXISTS idx_email_domains_status ON email_domains(verification_status);

-- 2. Sender Identities Table
CREATE TABLE IF NOT EXISTS email_identities (
  id TEXT PRIMARY KEY,
  organization_id TEXT, -- NULL for platform identities (no-reply@ferasetu.com)
  domain_id TEXT NOT NULL,
  local_part TEXT NOT NULL,
  email_address TEXT NOT NULL UNIQUE,
  display_name TEXT,
  identity_type TEXT NOT NULL CHECK(identity_type IN ('PLATFORM', 'MERCHANT', 'CUSTOM')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'PENDING', 'DISABLED')),
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (domain_id) REFERENCES email_domains(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_identities_org ON email_identities(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_identities_email ON email_identities(email_address);
CREATE INDEX IF NOT EXISTS idx_email_identities_domain ON email_identities(domain_id);

-- 3. Email Provider Connections Table (Encrypted Secrets at Rest)
CREATE TABLE IF NOT EXISTS email_provider_connections (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL UNIQUE,
  provider_type TEXT NOT NULL DEFAULT 'FERASETU' CHECK(provider_type IN ('FERASETU', 'EXTERNAL_SMTP')),
  smtp_host TEXT,
  smtp_port INTEGER DEFAULT 587,
  smtp_username TEXT,
  encrypted_secret_reference TEXT, -- AES-256-GCM encrypted payload, never plaintext
  security_mode TEXT DEFAULT 'STARTTLS' CHECK(security_mode IN ('STARTTLS', 'SSL_TLS', 'NONE')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'ERROR', 'UNTESTED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_provider_org ON email_provider_connections(organization_id);

-- 4. Email Messages Table
CREATE TABLE IF NOT EXISTS email_messages (
  id TEXT PRIMARY KEY,
  merchant_id TEXT, -- NULL for platform email
  sender_identity_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  to_address TEXT NOT NULL,
  reply_to TEXT,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED')),
  idempotency_key TEXT,
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK(priority IN ('HIGH', 'NORMAL', 'LOW')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_messages_merchant ON email_messages(merchant_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_status ON email_messages(status);
CREATE INDEX IF NOT EXISTS idx_email_messages_idempotency ON email_messages(idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_messages_tenant_idempotency ON email_messages(COALESCE(merchant_id, 'PLATFORM'), idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_messages_created ON email_messages(created_at);

-- 5. Email Delivery Events Table
CREATE TABLE IF NOT EXISTS email_events (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  merchant_id TEXT, -- NULL for platform email
  event_type TEXT NOT NULL CHECK(event_type IN ('ACCEPTED', 'QUEUED', 'SENT', 'DELIVERED', 'BOUNCED', 'COMPLAINT', 'FAILED')),
  provider_status TEXT,
  recipient TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  metadata TEXT, -- JSON string
  FOREIGN KEY (message_id) REFERENCES email_messages(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_events_message ON email_events(message_id);
CREATE INDEX IF NOT EXISTS idx_email_events_merchant ON email_events(merchant_id);
CREATE INDEX IF NOT EXISTS idx_email_events_type ON email_events(event_type);
CREATE INDEX IF NOT EXISTS idx_email_events_timestamp ON email_events(timestamp);

-- Seed Platform Tenant Domain and Official Senders
INSERT OR IGNORE INTO email_domains (
  id, organization_id, domain, domain_type, verification_status,
  ownership_verification_method, verification_token_hash, dkim_selector,
  dkim_status, spf_status, dmarc_status, mail_from_status, provider,
  created_at, updated_at, verified_at, last_checked_at
) VALUES (
  'dom_platform_ferasetu', NULL, 'ferasetu.com', 'PLATFORM', 'VERIFIED',
  'SYSTEM_CORE', 'platform_verified_token', 'fs1',
  'VERIFIED', 'VERIFIED', 'VERIFIED', 'VERIFIED', 'FERASETU',
  '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'
);

INSERT OR IGNORE INTO email_identities (
  id, organization_id, domain_id, local_part, email_address,
  display_name, identity_type, status, is_default, created_at, updated_at
) VALUES 
  ('ident_platform_noreply', NULL, 'dom_platform_ferasetu', 'no-reply', 'no-reply@ferasetu.com', 'FeraSetu Platform', 'PLATFORM', 'ACTIVE', 1, '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
  ('ident_platform_support', NULL, 'dom_platform_ferasetu', 'support', 'support@ferasetu.com', 'FeraSetu Support', 'PLATFORM', 'ACTIVE', 0, '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
  ('ident_platform_billing', NULL, 'dom_platform_ferasetu', 'billing', 'billing@ferasetu.com', 'FeraSetu Billing', 'PLATFORM', 'ACTIVE', 0, '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z');
