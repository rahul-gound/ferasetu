-- FeraSetu Worker — D1 schema (reference / optional manual init).
--
-- The Worker creates these tables automatically on first request, so you do
-- NOT need to run this. It's here if you want to initialize the DB up front:
--
--   npx wrangler d1 execute fera-shopkeeper --remote --file=worker/schema.sql

CREATE TABLE IF NOT EXISTS products (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL,
  organization_id TEXT,
  name           TEXT NOT NULL,
  description    TEXT,
  cost_price     REAL,
  price          REAL NOT NULL DEFAULT 0,
  sale_price     REAL,
  category       TEXT,
  stock          INTEGER NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  image_url      TEXT,
  media_key      TEXT,
  image_file_id  TEXT,
  image_size_bytes INTEGER NOT NULL DEFAULT 0,
  is_active      INTEGER NOT NULL DEFAULT 1,
  metadata       TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL,
  organization_id TEXT,
  customer_name  TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  delivery_address TEXT,
  delivery_type  TEXT NOT NULL DEFAULT 'pickup',
  status         TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  items          TEXT NOT NULL DEFAULT '[]',
  subtotal       REAL NOT NULL DEFAULT 0,
  delivery_fee   REAL NOT NULL DEFAULT 0,
  total          REAL NOT NULL DEFAULT 0,
  notes          TEXT,
  invoice        TEXT,
  invoice_number TEXT,
  delivery_code  TEXT,
  delivery_code_hash TEXT,
  payment_otp_hash   TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT
);

CREATE TABLE IF NOT EXISTS announcements (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  content        TEXT NOT NULL,
  category       TEXT NOT NULL DEFAULT 'feature',
  badge_label    TEXT DEFAULT 'New Feature',
  action_url     TEXT,
  action_label   TEXT,
  target_plan    TEXT DEFAULT 'all',
  is_pinned      INTEGER NOT NULL DEFAULT 0,
  is_active      INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS customer_segments (
  id             TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name           TEXT NOT NULL,
  description    TEXT,
  query_type     TEXT NOT NULL DEFAULT 'custom',
  template_id    TEXT,
  rules_json     TEXT NOT NULL,
  conjunction    TEXT NOT NULL DEFAULT 'AND',
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS gift_cards (
  id             TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  user_id        TEXT,
  code           TEXT UNIQUE NOT NULL,
  initial_value  REAL NOT NULL,
  balance        REAL NOT NULL,
  currency       TEXT NOT NULL DEFAULT 'INR',
  recipient_email TEXT,
  recipient_name TEXT,
  note           TEXT,
  status         TEXT NOT NULL DEFAULT 'active',
  expires_at     TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inventory_transfers (
  id             TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  user_id        TEXT,
  transfer_number TEXT NOT NULL,
  reference_name TEXT,
  origin_location_id TEXT NOT NULL,
  origin_name    TEXT NOT NULL,
  destination_location_id TEXT NOT NULL,
  destination_name TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'draft',
  estimated_arrival TEXT,
  note           TEXT,
  tags           TEXT,
  purchase_order_id TEXT,
  total_items    INTEGER NOT NULL DEFAULT 0,
  total_units    INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inventory_transfer_items (
  id             TEXT PRIMARY KEY,
  transfer_id    TEXT NOT NULL,
  product_id     TEXT NOT NULL,
  product_title  TEXT NOT NULL,
  sku            TEXT,
  quantity_requested INTEGER NOT NULL DEFAULT 1,
  quantity_received INTEGER NOT NULL DEFAULT 0,
  unit_cost      REAL NOT NULL DEFAULT 0
);
