-- FeraSetu Worker — D1 schema (reference / optional manual init).
--
-- The Worker creates these tables automatically on first request, so you do
-- NOT need to run this. It's here if you want to initialize the DB up front:
--
--   npx wrangler d1 execute fera-shopkeeper --remote --file=worker/schema.sql

CREATE TABLE IF NOT EXISTS products (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  price       REAL NOT NULL DEFAULT 0,
  stock       INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id            TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  items         TEXT NOT NULL DEFAULT '[]',
  total         REAL NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'pending',
  created_at    TEXT NOT NULL
);
