-- Migration 0007: P0 Production Hardening Schema
-- Authoritative migration for multi-tenant isolation, locations, credit ledger, comprehensive invoices, and merchant branding.

-- 1. Orders schema enhancements: shop_id, customer identity, and fulfillment location
ALTER TABLE orders ADD COLUMN shop_id TEXT;
ALTER TABLE orders ADD COLUMN customer_id TEXT;
ALTER TABLE orders ADD COLUMN customer_user_id TEXT;
ALTER TABLE orders ADD COLUMN fulfillment_location_id TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_org_shop ON orders(organization_id, shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);

-- 2. Shops branding columns
ALTER TABLE shops ADD COLUMN logo_url TEXT;
ALTER TABLE shops ADD COLUMN favicon_url TEXT;
ALTER TABLE shops ADD COLUMN primary_color TEXT;
ALTER TABLE shops ADD COLUMN secondary_color TEXT;
ALTER TABLE shops ADD COLUMN social_image_url TEXT;

-- 3. Organizations branding columns
ALTER TABLE organizations ADD COLUMN logo_url TEXT;
ALTER TABLE organizations ADD COLUMN favicon_url TEXT;
ALTER TABLE organizations ADD COLUMN primary_color TEXT;
ALTER TABLE organizations ADD COLUMN secondary_color TEXT;
ALTER TABLE organizations ADD COLUMN social_image_url TEXT;

-- 4. Merchant-owned operational locations
CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  store_id TEXT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('warehouse', 'store', 'outlet', 'pickup', 'fulfillment')),
  address TEXT,
  contact_name TEXT,
  phone TEXT,
  country TEXT,
  state TEXT,
  city TEXT,
  postal_code TEXT,
  timezone TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_locations_org ON locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_locations_org_active ON locations(organization_id, is_active);

-- 5. Multi-location inventory management with variant support
CREATE TABLE IF NOT EXISTS inventory_locations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  variant_id TEXT NOT NULL DEFAULT '',
  location_id TEXT NOT NULL,
  available_quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0,
  incoming_quantity INTEGER NOT NULL DEFAULT 0,
  reorder_threshold INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(organization_id, product_id, variant_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_inv_loc_lookup ON inventory_locations(organization_id, product_id, variant_id);
CREATE INDEX IF NOT EXISTS idx_inv_loc_location ON inventory_locations(organization_id, location_id);

-- 6. Dedicated credit purchases table
CREATE TABLE IF NOT EXISTS credit_purchases (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  pack_id TEXT NOT NULL,
  credits INTEGER NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL CHECK(status IN ('payment_pending', 'paid', 'failed', 'cancelled', 'expired')),
  gateway TEXT NOT NULL DEFAULT 'cashfree',
  gateway_order_id TEXT,
  payment_id TEXT,
  usage_scope TEXT NOT NULL DEFAULT 'shared',
  metadata TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credit_purchases_org ON credit_purchases(organization_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_user ON credit_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_gateway_order ON credit_purchases(gateway_order_id);

-- 7. Immutable credit transactions accounting ledger
CREATE TABLE IF NOT EXISTS credit_transactions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  purchase_id TEXT,
  type TEXT NOT NULL CHECK(type IN ('purchase', 'usage', 'promotional', 'refund', 'adjustment')),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reference_id TEXT UNIQUE,
  metadata TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credit_tx_org ON credit_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_credit_tx_user ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_tx_ref ON credit_transactions(reference_id);

-- 8. Comprehensive Invoices table upgrade
-- Recreate or alter invoices to ensure all 21 authoritative fields exist
ALTER TABLE invoices ADD COLUMN shop_id TEXT;
ALTER TABLE invoices ADD COLUMN customer_id TEXT;
ALTER TABLE invoices ADD COLUMN subtotal REAL NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN discount REAL NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN shipping REAL NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN tax REAL NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN total REAL NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN amount_paid REAL NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN balance_due REAL NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN billing_address TEXT;
ALTER TABLE invoices ADD COLUMN shipping_address TEXT;
ALTER TABLE invoices ADD COLUMN issued_at TEXT;
ALTER TABLE invoices ADD COLUMN due_at TEXT;
ALTER TABLE invoices ADD COLUMN notes TEXT;
ALTER TABLE invoices ADD COLUMN updated_at TEXT;

CREATE INDEX IF NOT EXISTS idx_invoices_org_number ON invoices(organization_id, invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_order ON invoices(order_id);
