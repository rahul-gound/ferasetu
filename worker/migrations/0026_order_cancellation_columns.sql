-- Migration 0026: Order Cancellation & Returns Schema Parity
-- Adds missing cancellation audit columns to Cloudflare D1 orders table

ALTER TABLE orders ADD COLUMN cancellation_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE orders ADD COLUMN cancellation_reason TEXT;
ALTER TABLE orders ADD COLUMN cancelled_at TEXT;
ALTER TABLE orders ADD COLUMN cancelled_by TEXT;
ALTER TABLE orders ADD COLUMN return_status TEXT NOT NULL DEFAULT 'none';
