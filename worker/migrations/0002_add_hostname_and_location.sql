-- Migration 0002: Add Canonical Hostname & Location Columns
-- Enables DNS-safe shop URLs formatted as shopname-city-district-state-1.ferasetu.com
-- Safely backfills existing merchant records with their existing subdomain hostname.

ALTER TABLE users ADD COLUMN hostname TEXT UNIQUE;
ALTER TABLE users ADD COLUMN city TEXT;
ALTER TABLE users ADD COLUMN district TEXT;
ALTER TABLE users ADD COLUMN state TEXT;

-- Backfill existing active subdomains to preserve backward compatibility
UPDATE users
SET hostname = subdomain || '.ferasetu.com'
WHERE hostname IS NULL AND subdomain IS NOT NULL;
