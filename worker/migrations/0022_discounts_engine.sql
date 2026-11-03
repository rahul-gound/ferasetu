-- Migration 0022: FeraSetu Promotional Pricing & Discounts Engine
-- Full multi-tenant schema for merchant discount codes, automatic discounts,
-- BOGO rules, usage tracking, redemption logs, and audit trails.

-- 1. Main Discounts table
CREATE TABLE IF NOT EXISTS discounts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  shop_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK(discount_type IN ('percentage', 'fixed_amount', 'bogo', 'free_shipping')),
  value_minor INTEGER NOT NULL DEFAULT 0, -- Minor units for fixed amounts, basis points (100 = 1%) for percentage
  target_type TEXT NOT NULL DEFAULT 'all' CHECK(target_type IN ('all', 'specific_products', 'specific_collections')),
  applies_to_resource_ids TEXT NOT NULL DEFAULT '[]', -- JSON array of product or collection IDs
  excluded_resource_ids TEXT NOT NULL DEFAULT '[]',   -- JSON array of excluded product IDs
  application_method TEXT NOT NULL CHECK(application_method IN ('code', 'automatic')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'scheduled', 'expired', 'paused')),
  starts_at TEXT NOT NULL,
  expires_at TEXT, -- NULL means does not expire
  minimum_subtotal_minor INTEGER NOT NULL DEFAULT 0,
  minimum_quantity INTEGER NOT NULL DEFAULT 0,
  usage_limit_total INTEGER, -- NULL = unlimited
  usage_limit_per_customer INTEGER, -- NULL = unlimited
  times_used INTEGER NOT NULL DEFAULT 0,
  combines_with_product_discounts INTEGER NOT NULL DEFAULT 0,
  combines_with_order_discounts INTEGER NOT NULL DEFAULT 0,
  combines_with_shipping_discounts INTEGER NOT NULL DEFAULT 0,
  customer_eligibility TEXT NOT NULL DEFAULT 'all' CHECK(customer_eligibility IN ('all', 'first_time', 'repeat', 'registered', 'specific_customers')),
  eligible_customer_ids TEXT NOT NULL DEFAULT '[]', -- JSON array of customer IDs
  bogo_config TEXT, -- JSON config for Buy X Get Y
  campaign_id TEXT,
  max_discount_minor INTEGER, -- Optional maximum cap for percentage discounts
  is_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_discounts_org_status ON discounts(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_discounts_shop_method ON discounts(shop_id, application_method, status);
CREATE INDEX IF NOT EXISTS idx_discounts_dates ON discounts(starts_at, expires_at);

-- 2. Discount Codes table (supports primary code and bulk unique codes per discount)
CREATE TABLE IF NOT EXISTS discount_codes (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  discount_id TEXT NOT NULL,
  code TEXT NOT NULL,
  code_normalized TEXT NOT NULL, -- Uppercase trimmed
  times_used INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER, -- NULL = inherits discount's limit, or specific limit (e.g. 1 for unique VIP codes)
  is_primary INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  UNIQUE(organization_id, code_normalized),
  FOREIGN KEY (discount_id) REFERENCES discounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_discount_codes_lookup ON discount_codes(organization_id, code_normalized);
CREATE INDEX IF NOT EXISTS idx_discount_codes_disc ON discount_codes(discount_id);

-- 3. Discount Redemptions table (audit and attribution record per redeemed order)
CREATE TABLE IF NOT EXISTS discount_redemptions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  shop_id TEXT NOT NULL,
  discount_id TEXT NOT NULL,
  discount_code_id TEXT,
  code TEXT,
  order_id TEXT NOT NULL,
  customer_id TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  discount_amount_minor INTEGER NOT NULL DEFAULT 0,
  order_subtotal_minor INTEGER NOT NULL DEFAULT 0,
  order_total_minor INTEGER NOT NULL DEFAULT 0,
  campaign_id TEXT,
  attribution_source TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_discount_redemptions_org ON discount_redemptions(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_discount_redemptions_disc ON discount_redemptions(discount_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_discount_redemptions_order ON discount_redemptions(order_id);
CREATE INDEX IF NOT EXISTS idx_discount_redemptions_phone ON discount_redemptions(organization_id, customer_phone);
CREATE INDEX IF NOT EXISTS idx_discount_redemptions_email ON discount_redemptions(organization_id, customer_email);
