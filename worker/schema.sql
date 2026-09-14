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
