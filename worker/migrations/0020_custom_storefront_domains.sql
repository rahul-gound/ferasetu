-- Migration 0020: Custom Storefront Domains & Spaceship Integration
-- Tracks merchant-owned custom storefront domains, Spaceship DNS status,
-- domain orders, and ingress TLS verification states with strict tenant isolation.

-- 1. Custom Storefront Domains Table
CREATE TABLE IF NOT EXISTS custom_storefront_domains (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  shop_id TEXT NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  apex_domain TEXT NOT NULL,
  hostname_type TEXT NOT NULL DEFAULT 'APEX' CHECK(hostname_type IN ('APEX', 'SUBDOMAIN')),
  registration_provider TEXT NOT NULL DEFAULT 'SPACESHIP' CHECK(registration_provider IN ('SPACESHIP', 'EXTERNAL')),
  registration_status TEXT NOT NULL DEFAULT 'EXTERNAL' CHECK(registration_status IN ('CHECKOUT_PENDING', 'REGISTERED', 'EXTERNAL', 'FAILED')),
  dns_provider TEXT NOT NULL DEFAULT 'SPACESHIP' CHECK(dns_provider IN ('SPACESHIP', 'EXTERNAL')),
  dns_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(dns_status IN ('PENDING', 'CONFIGURING', 'PROPAGATING', 'VERIFIED', 'CONFLICT', 'FAILED')),
  tls_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(tls_status IN ('PENDING', 'PROVISIONING', 'ACTIVE', 'FAILED')),
  status TEXT NOT NULL DEFAULT 'PENDING_DNS' CHECK(status IN ('PENDING_PURCHASE', 'PENDING_DNS', 'PENDING_TLS', 'ACTIVE', 'DISCONNECTED', 'SUSPENDED')),
  ownership_token TEXT NOT NULL,
  dns_target TEXT,
  last_dns_check_at TEXT,
  last_tls_check_at TEXT,
  verified_at TEXT,
  tls_verified_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_csd_org ON custom_storefront_domains(organization_id);
CREATE INDEX IF NOT EXISTS idx_csd_shop ON custom_storefront_domains(shop_id);
CREATE INDEX IF NOT EXISTS idx_csd_domain ON custom_storefront_domains(domain);
CREATE INDEX IF NOT EXISTS idx_csd_status ON custom_storefront_domains(status);

-- 2. Domain Orders Table (Tracks Spaceship customer checkout intents)
CREATE TABLE IF NOT EXISTS domain_orders (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  shop_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'SPACESHIP',
  status TEXT NOT NULL DEFAULT 'CHECKOUT_PENDING' CHECK(status IN ('QUOTED', 'CHECKOUT_PENDING', 'COMPLETED', 'CANCELLED', 'FAILED', 'EXPIRED')),
  quoted_price REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  period_years INTEGER NOT NULL DEFAULT 1,
  checkout_url TEXT,
  provider_ref TEXT,
  registrant_contact_json TEXT,
  error_details TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dom_orders_org ON domain_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_dom_orders_domain ON domain_orders(domain);
CREATE INDEX IF NOT EXISTS idx_dom_orders_status ON domain_orders(status);

-- 3. Domain Audit Logs Table
CREATE TABLE IF NOT EXISTS domain_audit_logs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  details_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dom_audit_org ON domain_audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_dom_audit_domain ON domain_audit_logs(domain);
