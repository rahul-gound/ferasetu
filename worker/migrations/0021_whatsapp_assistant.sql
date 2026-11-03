-- Migration 0021: FeraSetu WhatsApp Assistant Architecture
-- Multi-tenant WhatsApp Web sessions, conversations, message logs, and order requests.

-- 1. WhatsApp Sessions (One session per merchant organization)
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    phone_number TEXT,
    phone_number_masked TEXT,
    jid TEXT,
    status TEXT NOT NULL DEFAULT 'disconnected', -- 'disconnected', 'preparing', 'qr_ready', 'connecting', 'connected', 'interrupted', 'logged_out', 'expired'
    is_ai_replies_enabled INTEGER NOT NULL DEFAULT 1,
    is_notifications_enabled INTEGER NOT NULL DEFAULT 1,
    qr_code_raw TEXT,
    qr_expires_at TEXT,
    last_connected_at TEXT,
    last_qr_at TEXT,
    last_activity_at TEXT,
    session_metadata_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_org ON whatsapp_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_status ON whatsapp_sessions(status);

-- 2. WhatsApp Customer Conversations
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_name TEXT,
    last_message_text TEXT,
    last_message_at TEXT,
    message_count INTEGER NOT NULL DEFAULT 0,
    requires_attention INTEGER NOT NULL DEFAULT 0,
    attention_reason TEXT,
    is_ai_paused INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(organization_id, customer_phone)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conv_org ON whatsapp_conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conv_attention ON whatsapp_conversations(organization_id, requires_attention);

-- 3. WhatsApp Messages Log (Grounded, Tenant-Isolated, Idempotent)
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    whatsapp_message_id TEXT NOT NULL,
    sender_type TEXT NOT NULL, -- 'customer', 'ai', 'merchant', 'system'
    sender_jid TEXT NOT NULL,
    message_text TEXT NOT NULL,
    intent TEXT, -- 'inquiry', 'product_question', 'order_request', 'general', 'handover'
    is_order_request INTEGER NOT NULL DEFAULT 0,
    order_request_id TEXT,
    status TEXT NOT NULL DEFAULT 'delivered', -- 'delivered', 'pending', 'failed'
    error_message TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(organization_id, whatsapp_message_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_msgs_org_conv ON whatsapp_messages(organization_id, conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_msgs_wam_id ON whatsapp_messages(organization_id, whatsapp_message_id);

-- 4. WhatsApp Pending Order Requests
CREATE TABLE IF NOT EXISTS whatsapp_order_requests (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_name TEXT,
    items_json TEXT NOT NULL,
    estimated_total_cents INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'INR',
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending_confirmation', -- 'pending_confirmation', 'confirmed', 'rejected', 'cancelled'
    linked_order_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_orders_org ON whatsapp_order_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_orders_status ON whatsapp_order_requests(organization_id, status);

-- 5. WhatsApp Audit Logs
CREATE TABLE IF NOT EXISTS whatsapp_audit_logs (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'disclosure_accepted', 'qr_generated', 'connected', 'disconnected', 'ai_replied', 'order_captured', 'handover_triggered'
    metadata_json TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_audit_org ON whatsapp_audit_logs(organization_id, created_at);
