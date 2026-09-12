-- Migration 0004: WorkOS Multi-Tenant Organizations & Tenant Isolation
-- Adds organizations, organization_members, shops, customers, invoices tables
-- and tenant scoping columns across all merchant-owned resources.

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  workos_organization_id TEXT UNIQUE NOT NULL,
  market TEXT NOT NULL DEFAULT 'IN',
  plan TEXT NOT NULL DEFAULT 'free',
  address TEXT,
  city TEXT,
  state TEXT,
  store_slug TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_organizations_workos_id ON organizations(workos_organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_store_slug ON organizations(store_slug);

CREATE TABLE IF NOT EXISTS organization_members (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('owner', 'admin', 'staff')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);

CREATE TABLE IF NOT EXISTS shops (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  store_slug TEXT UNIQUE NOT NULL,
  hostname TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shops_org ON shops(organization_id);
CREATE INDEX IF NOT EXISTS idx_shops_slug ON shops(store_slug);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customers_org ON customers(organization_id);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  order_id TEXT,
  invoice_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'issued',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);

-- Add organization_id column to existing merchant resource tables
ALTER TABLE products ADD COLUMN organization_id TEXT;
CREATE INDEX IF NOT EXISTS idx_products_org ON products(organization_id);

ALTER TABLE orders ADD COLUMN organization_id TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_org ON orders(organization_id);

ALTER TABLE websites ADD COLUMN organization_id TEXT;
CREATE INDEX IF NOT EXISTS idx_websites_org ON websites(organization_id);

ALTER TABLE transactions ADD COLUMN organization_id TEXT;
CREATE INDEX IF NOT EXISTS idx_transactions_org ON transactions(organization_id);

ALTER TABLE smtp_settings ADD COLUMN organization_id TEXT;
CREATE INDEX IF NOT EXISTS idx_smtp_settings_org ON smtp_settings(organization_id);

ALTER TABLE tickets ADD COLUMN organization_id TEXT;
CREATE INDEX IF NOT EXISTS idx_tickets_org ON tickets(organization_id);
