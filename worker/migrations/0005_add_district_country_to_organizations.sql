-- Migration 0005: Add district and country to organizations and users
ALTER TABLE organizations ADD COLUMN district TEXT;
ALTER TABLE organizations ADD COLUMN country TEXT;

ALTER TABLE users ADD COLUMN district TEXT;
ALTER TABLE users ADD COLUMN country TEXT;
