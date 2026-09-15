-- Migration 0008: P1 Commerce Foundation Schema
-- Authoritative migration for integer minor-unit finances, product variants with deterministic signatures,
-- shop-level normalized SKU/barcode registries, single-source inventory locations, and immutable order items.

-- 1. Upgrade products table with minor units, shop-scoping, and normalized identifiers
ALTER TABLE products ADD COLUMN shop_id TEXT;
ALTER TABLE products ADD COLUMN slug TEXT;
ALTER TABLE products ADD COLUMN short_description TEXT;
ALTER TABLE products ADD COLUMN status TEXT DEFAULT 'active';
ALTER TABLE products ADD COLUMN product_type TEXT;
ALTER TABLE products ADD COLUMN vendor TEXT;
ALTER TABLE products ADD COLUMN sku TEXT;
ALTER TABLE products ADD COLUMN barcode TEXT;
ALTER TABLE products ADD COLUMN sku_normalized TEXT;
ALTER TABLE products ADD COLUMN barcode_normalized TEXT;
ALTER TABLE products ADD COLUMN currency TEXT DEFAULT 'INR';
ALTER TABLE products ADD COLUMN price_minor INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN compare_at_price_minor INTEGER;
ALTER TABLE products ADD COLUMN cost_price_minor INTEGER;
ALTER TABLE products ADD COLUMN is_inventory_tracked INTEGER NOT NULL DEFAULT 1;
ALTER TABLE products ADD COLUMN seo_title TEXT;
ALTER TABLE products ADD COLUMN seo_description TEXT;

CREATE INDEX IF NOT EXISTS idx_products_shop ON products(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_shop_slug ON products(shop_id, slug);
CREATE INDEX IF NOT EXISTS idx_products_shop_status ON products(shop_id, status);

-- 2. Product Options (Attributes: e.g. Color, Size)
CREATE TABLE IF NOT EXISTS product_options (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  values_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_prod_opts_prod ON product_options(product_id);
CREATE INDEX IF NOT EXISTS idx_prod_opts_shop ON product_options(shop_id);

-- 3. Product Variants with Deterministic Option Signature
CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  title TEXT NOT NULL,
  option_signature TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  sku_normalized TEXT,
  barcode_normalized TEXT,
  currency TEXT NOT NULL DEFAULT 'INR',
  price_minor INTEGER NOT NULL DEFAULT 0,
  compare_at_price_minor INTEGER,
  cost_price_minor INTEGER,
  image_url TEXT,
  weight_grams INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','draft','archived')),
  option_values_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(product_id, option_signature)
);
CREATE INDEX IF NOT EXISTS idx_variants_prod ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_shop ON product_variants(shop_id);

-- 4. Unified Shop-Level SKU and Barcode Registry (Guarantees shop-level uniqueness across products and variants)
CREATE TABLE IF NOT EXISTS shop_skus (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  sku_normalized TEXT NOT NULL,
  product_id TEXT NOT NULL,
  variant_id TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  UNIQUE(shop_id, sku_normalized)
);
CREATE INDEX IF NOT EXISTS idx_shop_skus_lookup ON shop_skus(shop_id, sku_normalized);

CREATE TABLE IF NOT EXISTS shop_barcodes (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  barcode_normalized TEXT NOT NULL,
  product_id TEXT NOT NULL,
  variant_id TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  UNIQUE(shop_id, barcode_normalized)
);
CREATE INDEX IF NOT EXISTS idx_shop_barcodes_lookup ON shop_barcodes(shop_id, barcode_normalized);

-- 5. Upgrade orders table with integer minor units and fulfillment tracking
ALTER TABLE orders ADD COLUMN currency TEXT DEFAULT 'INR';
ALTER TABLE orders ADD COLUMN subtotal_minor INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN discount_minor INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN shipping_minor INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN tax_minor INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN total_minor INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN amount_paid_minor INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN refunded_minor INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN fulfillment_status TEXT NOT NULL DEFAULT 'unfulfilled';
ALTER TABLE orders ADD COLUMN channel TEXT NOT NULL DEFAULT 'storefront';
ALTER TABLE orders ADD COLUMN tracking_carrier TEXT;
ALTER TABLE orders ADD COLUMN tracking_number TEXT;
ALTER TABLE orders ADD COLUMN internal_notes TEXT;

-- 6. Normalized Order Items (Authoritative, Immutable Purchase Snapshot)
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  variant_id TEXT NOT NULL DEFAULT '',
  title_snapshot TEXT NOT NULL,
  variant_title_snapshot TEXT,
  sku_snapshot TEXT,
  option_values_snapshot TEXT,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  unit_price_minor INTEGER NOT NULL,
  total_minor INTEGER NOT NULL,
  discount_minor INTEGER NOT NULL DEFAULT 0,
  tax_minor INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_prod ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_shop ON order_items(shop_id);

-- 7. One-time deterministic legacy monetary conversion for existing products & orders
UPDATE products 
SET price_minor = CAST(ROUND(price * 100) AS INTEGER) 
WHERE (price_minor IS NULL OR price_minor = 0) AND price IS NOT NULL AND price > 0;

UPDATE orders 
SET total_minor = CAST(ROUND(total * 100) AS INTEGER),
    subtotal_minor = CAST(ROUND(subtotal * 100) AS INTEGER)
WHERE (total_minor IS NULL OR total_minor = 0) AND total IS NOT NULL AND total > 0;

-- 8. Backfill shop_id from organization_id where missing
UPDATE products SET shop_id = organization_id WHERE shop_id IS NULL AND organization_id IS NOT NULL;
UPDATE orders SET shop_id = organization_id WHERE shop_id IS NULL AND organization_id IS NOT NULL;
