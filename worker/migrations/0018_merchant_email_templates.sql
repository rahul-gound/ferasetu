-- Migration 0018: Merchant Email Templates and AI Action History
-- Allows merchants to customize transactional email subjects and content
-- with variable whitelisting, versioning, audit trail, and 1-click undo.

CREATE TABLE IF NOT EXISTS merchant_email_templates (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  template_key TEXT NOT NULL,
  subject TEXT,
  content_html TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  UNIQUE(organization_id, template_key)
);

CREATE INDEX IF NOT EXISTS idx_merchant_email_templates_org ON merchant_email_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_merchant_email_templates_key ON merchant_email_templates(template_key);

CREATE TABLE IF NOT EXISTS ai_action_history (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  before_state TEXT NOT NULL,
  after_state TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_action_history_org ON ai_action_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_action_history_created ON ai_action_history(created_at);
