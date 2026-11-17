-- Migration 0024: Add site changed notice and targeted announcements
ALTER TABLE users ADD COLUMN site_changed_notice TEXT;
ALTER TABLE announcements ADD COLUMN target_user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_announcements_target_user ON announcements(target_user_id);
