-- Migration 0002: Add canonical commercial market to users
-- Safe backfill: preserves existing accounts without blindly rewriting everything to India.

ALTER TABLE users ADD COLUMN market TEXT DEFAULT NULL;

-- Backfill existing US accounts if phone has +1 country code
UPDATE users SET market = 'US' WHERE phone LIKE '+1%' AND market IS NULL;

-- Backfill remaining existing Indian merchant accounts
UPDATE users SET market = 'IN' WHERE market IS NULL;
