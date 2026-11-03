/**
 * FeraSetu WhatsApp Assistant Service for Cloudflare Worker
 * Coordinates multi-tenant sessions, D1 persistence, catalog grounding context,
 * and internal communication with the persistent WhatsApp connector.
 */

export class WhatsAppService {
  constructor(env) {
    this.env = env;
    this.connectorUrl = (env.WHATSAPP_CONNECTOR_URL || '').replace(/\/+$/, '');
    this.internalSecret = env.WHATSAPP_INTERNAL_SECRET || '';
  }

  requireConnectorConfig() {
    if (!this.connectorUrl || !this.internalSecret) {
      const error = new Error('WhatsApp connector is not configured');
      error.status = 503;
      throw error;
    }
  }

  /**
   * Masks a phone number (e.g. +91 98765 •••••).
   */
  maskPhoneNumber(rawNumber) {
    if (!rawNumber) return null;
    const cleaned = String(rawNumber).replace(/[^\d+]/g, '');
    if (cleaned.length <= 6) return cleaned;
    if (cleaned.startsWith('+91') && cleaned.length >= 12) {
      return `+91 ${cleaned.slice(3, 8)} •••••`;
    }
    const prefix = cleaned.slice(0, Math.max(3, cleaned.length - 5));
    return `${prefix} •••••`;
  }

  /**
   * Fetches or creates session record from D1 for an organization.
   */
  async getOrCreateSession(orgId, userId) {
    let session = await this.env.DB.prepare(
      "SELECT * FROM whatsapp_sessions WHERE organization_id = ? LIMIT 1"
    ).bind(orgId).first();

    if (!session) {
      const now = new Date().toISOString();
      const id = `ws_${crypto.randomUUID()}`;
      await this.env.DB.prepare(`
        INSERT INTO whatsapp_sessions (
          id, organization_id, user_id, status, is_ai_replies_enabled,
          is_notifications_enabled, created_at, updated_at
        ) VALUES (?, ?, ?, 'disconnected', 1, 1, ?, ?)
      `).bind(id, orgId, userId, now, now).run();

      session = await this.env.DB.prepare(
        "SELECT * FROM whatsapp_sessions WHERE id = ? LIMIT 1"
      ).bind(id).first();
    }

    return session;
  }

  /**
   * Fetches live session status, activity counters, and connection details.
   */
  async getSessionStatus(orgId, userId) {
    const session = await this.getOrCreateSession(orgId, userId);

    // Fetch conversation & message stats from D1
    const messageStats = await this.env.DB.prepare(`
      SELECT 
        COUNT(CASE WHEN sender_type = 'customer' THEN 1 END) as messages_received,
        COUNT(CASE WHEN sender_type = 'ai' THEN 1 END) as ai_replies_sent
      FROM whatsapp_messages
      WHERE organization_id = ?
    `).bind(orgId).first();

    const ordersCount = await this.env.DB.prepare(`
      SELECT COUNT(*) as pending_count 
      FROM whatsapp_order_requests 
      WHERE organization_id = ? AND status = 'pending_confirmation'
    `).bind(orgId).first();

    const attentionCount = await this.env.DB.prepare(`
      SELECT COUNT(*) as attention_count 
      FROM whatsapp_conversations 
      WHERE organization_id = ? AND requires_attention = 1
    `).bind(orgId).first();

    return {
      id: session.id,
      organization_id: session.organization_id,
      status: session.status,
      phone_number_masked: session.phone_number_masked,
      is_ai_replies_enabled: Boolean(session.is_ai_replies_enabled),
      is_notifications_enabled: Boolean(session.is_notifications_enabled),
      qr_code_raw: session.qr_code_raw,
      qr_expires_at: session.qr_expires_at,
      last_connected_at: session.last_connected_at,
      last_activity_at: session.last_activity_at,
      stats: {
        messages_received: messageStats?.messages_received || 0,
        ai_replies_sent: messageStats?.ai_replies_sent || 0,
        pending_orders: ordersCount?.pending_count || 0,
        attention_needed: attentionCount?.attention_count || 0,
      }
    };
  }

  /**
   * Requests connection & generates QR code.
   * Syncs catalog products from D1 to the connector.
   */
  async requestConnection(orgId, userId, options = {}) {
    this.requireConnectorConfig();
    const session = await this.getOrCreateSession(orgId, userId);

    // Fetch store info and active catalog to prime context
    const org = await this.env.DB.prepare(
      "SELECT name, store_slug, market FROM organizations WHERE id = ? LIMIT 1"
    ).bind(orgId).first();

    const products = await this.env.DB.prepare(`
      SELECT id, name, description, price, sale_price, stock_quantity, category 
      FROM products 
      WHERE organization_id = ? AND is_active = 1 
      LIMIT 100
    `).bind(orgId).all();

    const currencySymbol = org?.market === 'US' ? '$' : '₹';
    const currency = org?.market === 'US' ? 'USD' : 'INR';

    // Update connector context
    try {
      const contextRes = await fetch(`${this.connectorUrl}/sessions/${orgId}/context`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Fera-Internal-Secret': this.internalSecret,
        },
        body: JSON.stringify({
          storeName: org?.name || 'My Store',
          currency,
          currencySymbol,
          catalog: products?.results || [],
        }),
      });
      if (!contextRes.ok) throw new Error('Connector rejected store context');

      // Request QR from connector
      const connRes = await fetch(`${this.connectorUrl}/sessions/${orgId}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Fera-Internal-Secret': this.internalSecret,
        },
        body: JSON.stringify({ mock: options.mock || false }),
      });

      if (connRes.ok) {
        const connData = await connRes.json();
        if (!connData.qrCodeDataUrl) throw new Error('Connector did not return a QR code');
        const now = new Date().toISOString();
        const qrData = connData.qrCodeDataUrl;
        const expiresAt = connData.qrExpiresAt ? new Date(connData.qrExpiresAt).toISOString() : null;

        await this.env.DB.prepare(`
          UPDATE whatsapp_sessions 
          SET status = ?, qr_code_raw = ?, qr_expires_at = ?, updated_at = ?
          WHERE id = ?
        `).bind(connData.status || 'qr_ready', qrData, expiresAt, now, session.id).run();

        // Audit log
        await this.recordAuditLog(orgId, 'qr_generated', { status: connData.status });

        return {
          status: connData.status || 'qr_ready',
          qr_code_raw: qrData,
          qr_expires_at: expiresAt,
        };
      }
      throw new Error('Connector refused the connection request');
    } catch (err) {
      console.warn('[WhatsAppService] Failed to contact persistent connector:', err);
      const error = new Error('WhatsApp connector is temporarily unavailable');
      error.status = 502;
      throw error;
    }
  }

  /**
   * Emergency Disconnect.
   */
  async disconnect(orgId, userId) {
    this.requireConnectorConfig();
    const session = await this.getOrCreateSession(orgId, userId);

    try {
      const response = await fetch(`${this.connectorUrl}/sessions/${orgId}/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Fera-Internal-Secret': this.internalSecret,
        },
      });
      if (!response.ok) throw new Error('Connector refused the disconnect request');
    } catch (err) {
      console.warn('[WhatsAppService] Error notifying connector of disconnect:', err);
      const error = new Error('Could not confirm WhatsApp disconnection; try again');
      error.status = 502;
      throw error;
    }

    const now = new Date().toISOString();
    await this.env.DB.prepare(`
      UPDATE whatsapp_sessions 
      SET status = 'disconnected', qr_code_raw = NULL, qr_expires_at = NULL,
          phone_number = NULL, phone_number_masked = NULL, jid = NULL, updated_at = ?
      WHERE id = ?
    `).bind(now, session.id).run();

    await this.recordAuditLog(orgId, 'disconnected', { manual: true, userId });

    return { status: 'disconnected', success: true };
  }

  /**
   * Updates Settings (AI Replies Toggle, Order Notifications Toggle).
   */
  async updateSettings(orgId, userId, { isAiRepliesEnabled, isNotificationsEnabled }) {
    this.requireConnectorConfig();
    const session = await this.getOrCreateSession(orgId, userId);
    const now = new Date().toISOString();

    const newAi = typeof isAiRepliesEnabled === 'boolean' ? (isAiRepliesEnabled ? 1 : 0) : session.is_ai_replies_enabled;
    const newNotif = typeof isNotificationsEnabled === 'boolean' ? (isNotificationsEnabled ? 1 : 0) : session.is_notifications_enabled;

    try {
      const response = await fetch(`${this.connectorUrl}/sessions/${orgId}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Fera-Internal-Secret': this.internalSecret,
        },
        body: JSON.stringify({
          isAiRepliesEnabled: Boolean(newAi),
          isNotificationsEnabled: Boolean(newNotif),
        }),
      });
      if (!response.ok) throw new Error('Connector refused the settings update');
    } catch (err) {
      const error = new Error('WhatsApp connector is temporarily unavailable');
      error.status = 502;
      throw error;
    }

    await this.env.DB.prepare(`
      UPDATE whatsapp_sessions 
      SET is_ai_replies_enabled = ?, is_notifications_enabled = ?, updated_at = ?
      WHERE id = ?
    `).bind(newAi, newNotif, now, session.id).run();

    return {
      is_ai_replies_enabled: Boolean(newAi),
      is_notifications_enabled: Boolean(newNotif),
    };
  }

  /**
   * Lists recent customer conversations with status badges.
   */
  async listConversations(orgId, limit = 50) {
    const rows = await this.env.DB.prepare(`
      SELECT * FROM whatsapp_conversations 
      WHERE organization_id = ? 
      ORDER BY last_message_at DESC 
      LIMIT ?
    `).bind(orgId, limit).all();

    return rows?.results || [];
  }

  /**
   * Fetches messages for a specific conversation.
   */
  async getConversationMessages(orgId, conversationId, limit = 50) {
    const rows = await this.env.DB.prepare(`
      SELECT * FROM (
        SELECT * FROM whatsapp_messages
        WHERE organization_id = ? AND conversation_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      ) ORDER BY created_at ASC
    `).bind(orgId, conversationId, limit).all();

    return rows?.results || [];
  }

  /**
   * Toggles customer handover / pause AI for a specific conversation.
   */
  async setConversationHandover(orgId, conversationId, { requiresAttention, isAiPaused }) {
    const now = new Date().toISOString();
    const conv = await this.env.DB.prepare(
      "SELECT * FROM whatsapp_conversations WHERE id = ? AND organization_id = ? LIMIT 1"
    ).bind(conversationId, orgId).first();

    if (!conv) {
      throw new Error("Conversation not found");
    }

    const newAttention = typeof requiresAttention === 'boolean' ? (requiresAttention ? 1 : 0) : conv.requires_attention;
    const newAiPaused = typeof isAiPaused === 'boolean' ? (isAiPaused ? 1 : 0) : conv.is_ai_paused;

    await this.env.DB.prepare(`
      UPDATE whatsapp_conversations 
      SET requires_attention = ?, is_ai_paused = ?, updated_at = ?
      WHERE id = ?
    `).bind(newAttention, newAiPaused, now, conversationId).run();

    return {
      id: conversationId,
      requires_attention: Boolean(newAttention),
      is_ai_paused: Boolean(newAiPaused),
    };
  }

  /**
   * Lists pending order requests.
   */
  async listOrderRequests(orgId, limit = 50) {
    const rows = await this.env.DB.prepare(`
      SELECT * FROM whatsapp_order_requests 
      WHERE organization_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `).bind(orgId, limit).all();

    return rows?.results || [];
  }

  /**
   * Updates order request status (confirm or reject).
   */
  async updateOrderRequestStatus(orgId, orderRequestId, status) {
    const now = new Date().toISOString();
    const order = await this.env.DB.prepare(
      "SELECT * FROM whatsapp_order_requests WHERE id = ? AND organization_id = ? LIMIT 1"
    ).bind(orderRequestId, orgId).first();

    if (!order) {
      throw new Error("Order request not found");
    }

    await this.env.DB.prepare(`
      UPDATE whatsapp_order_requests 
      SET status = ?, updated_at = ?
      WHERE id = ?
    `).bind(status, now, orderRequestId).run();

    return { id: orderRequestId, status };
  }

  /**
   * Records an audit log entry in D1.
   */
  async recordAuditLog(orgId, eventType, metadata = {}) {
    try {
      const id = `wal_${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      await this.env.DB.prepare(`
        INSERT INTO whatsapp_audit_logs (id, organization_id, event_type, metadata_json, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(id, orgId, eventType, JSON.stringify(metadata), now).run();
    } catch (e) {
      console.warn('[WhatsAppService] Failed to record audit log:', e);
    }
  }

  /**
   * Processes internal webhook events sent from the persistent connector service.
   */
  async handleConnectorWebhook(payload) {
    const { orgId, eventType, data } = payload;
    const now = new Date().toISOString();

    if (eventType === 'connected') {
      await this.env.DB.prepare(`
        UPDATE whatsapp_sessions 
        SET status = 'connected', phone_number = ?, phone_number_masked = ?,
            jid = ?, last_connected_at = ?, updated_at = ?
        WHERE organization_id = ?
      `).bind(
        data.phoneNumber || null,
        data.phoneNumberMasked || null,
        data.jid || null,
        data.lastConnectedAt || now,
        now,
        orgId
      ).run();

      await this.recordAuditLog(orgId, 'connected', data);
    } else if (eventType === 'disconnected') {
      await this.env.DB.prepare(`
        UPDATE whatsapp_sessions 
        SET status = 'disconnected', qr_code_raw = NULL, qr_expires_at = NULL, updated_at = ?
        WHERE organization_id = ?
      `).bind(now, orgId).run();

      await this.recordAuditLog(orgId, 'disconnected', data);
    } else if (eventType === 'qr_ready') {
      await this.env.DB.prepare(`
        UPDATE whatsapp_sessions 
        SET status = 'qr_ready', qr_code_raw = ?, qr_expires_at = ?, updated_at = ?
        WHERE organization_id = ?
      `).bind(
        data.qrCodeDataUrl || null,
        data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
        now,
        orgId
      ).run();
    } else if (eventType === 'order_request') {
      // Create conversation record if not exists
      const convId = `wc_${crypto.randomUUID()}`;
      await this.env.DB.prepare(`
        INSERT INTO whatsapp_conversations (
          id, organization_id, customer_phone, customer_name,
          last_message_text, last_message_at, requires_attention, attention_reason, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, 'New order request captured', ?, ?)
        ON CONFLICT(organization_id, customer_phone) DO UPDATE SET
          last_message_text = excluded.last_message_text,
          last_message_at = excluded.last_message_at,
          requires_attention = 1,
          attention_reason = 'New order request captured',
          updated_at = excluded.updated_at
      `).bind(convId, orgId, data.customerPhone, data.customerName, data.originalMessage, now, now, now).run();

      const conv = await this.env.DB.prepare(
        "SELECT id FROM whatsapp_conversations WHERE organization_id = ? AND customer_phone = ? LIMIT 1"
      ).bind(orgId, data.customerPhone).first();

      const orderReqId = `wor_${crypto.randomUUID()}`;
      await this.env.DB.prepare(`
        INSERT INTO whatsapp_order_requests (
          id, organization_id, conversation_id, customer_phone, customer_name,
          items_json, estimated_total_cents, notes, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_confirmation', ?, ?)
      `).bind(
        orderReqId,
        orgId,
        conv?.id || convId,
        data.customerPhone,
        data.customerName,
        JSON.stringify(data.orderItems || []),
        (data.estimatedTotal || 0) * 100,
        data.originalMessage || null,
        now,
        now
      ).run();

      // Dispatch Dashboard Notification for shopkeeper
      await this.createDashboardNotification(orgId, {
        title: `🛒 New WhatsApp Order Request from ${data.customerName || data.customerPhone}`,
        message: `Order request received for ${data.orderItems?.length || 1} item(s). Estimated total: ₹${data.estimatedTotal || 0}. Status: Pending Confirmation.`,
        link: '/whatsapp-assistant',
        type: 'order_request',
      });

      await this.recordAuditLog(orgId, 'order_captured', {
        orderRequestId: orderReqId,
        customerPhone: data.customerPhone,
        total: data.estimatedTotal
      });
    } else if (eventType === 'handover_triggered') {
      const convId = `wc_${crypto.randomUUID()}`;
      await this.env.DB.prepare(`
        INSERT INTO whatsapp_conversations (
          id, organization_id, customer_phone, customer_name,
          last_message_text, last_message_at, requires_attention, attention_reason, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
        ON CONFLICT(organization_id, customer_phone) DO UPDATE SET
          last_message_text = excluded.last_message_text,
          last_message_at = excluded.last_message_at,
          requires_attention = 1,
          attention_reason = excluded.attention_reason,
          updated_at = excluded.updated_at
      `).bind(convId, orgId, data.customerPhone, data.customerName, data.originalMessage, now, data.reason || 'Escalation', now, now).run();

      // Dispatch Dashboard Notification for shopkeeper
      await this.createDashboardNotification(orgId, {
        title: `⚠️ WhatsApp Customer Needs Attention: ${data.customerName || data.customerPhone}`,
        message: data.reason || 'Customer asked a question requiring manual shopkeeper attention.',
        link: '/whatsapp-assistant',
        type: 'handover',
      });

      await this.recordAuditLog(orgId, 'handover_triggered', data);
    }
  }

  /**
   * Creates a notification in the FeraSetu dashboard notification queue.
   */
  async createDashboardNotification(orgId, { title, message, link, type }) {
    try {
      const notifId = `notif_${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      await this.env.DB.prepare(`
        INSERT INTO notifications (id, organization_id, title, message, link, type, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?)
      `).bind(notifId, orgId, title, message, link || '/whatsapp-assistant', type || 'info', now).run();
    } catch (e) {
      // Table notifications might have slightly different schema in legacy migrations; fail-safe logging
      console.warn('[WhatsAppService] Notification insert notice:', e.message);
    }
  }
}
