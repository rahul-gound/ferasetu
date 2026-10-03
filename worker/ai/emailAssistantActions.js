/**
 * FeraSetu AI — Structured Email Assistant Actions Engine
 * =======================================================
 * Translates merchant natural language intents into validated, atomic operations:
 * - get_email_settings
 * - update_email_sender
 * - update_reply_to
 * - list_email_templates
 * - update_email_template
 * - send_test_email (requires explicit merchant confirmation)
 * - undo_last_action
 *
 * Enforces strict multi-tenant isolation, variable whitelisting,
 * zero secret leakage, audit snapshot history, and 1-click rollback.
 */

import { EMAIL_TEMPLATES } from '../templates/emailTemplates.js';
import { EmailService } from '../services/emailService.js';

export const SUPPORTED_EMAIL_ACTIONS = [
  'get_email_settings',
  'update_email_sender',
  'update_reply_to',
  'list_email_templates',
  'update_email_template',
  'send_test_email',
  'undo_last_action'
];

export class AiEmailAssistantService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Retrieves high-level email settings without exposing secrets.
   */
  async get_email_settings({ organizationId }) {
    const providerConn = await this.db.prepare(
      'SELECT provider_type, status, smtp_host, smtp_port, smtp_username FROM email_provider_connections WHERE organization_id = ?'
    ).bind(organizationId).first();

    const defaultIdentity = await this.db.prepare(
      'SELECT id, local_part, email_address, display_name FROM email_identities WHERE organization_id = ? AND is_default = 1'
    ).bind(organizationId).first();

    const domains = await this.db.prepare(
      'SELECT id, domain, domain_type, verification_status, dkim_status, spf_status, dmarc_status FROM email_domains WHERE organization_id = ?'
    ).bind(organizationId).all();

    const quota = await this.db.prepare(
      'SELECT daily_limit, emails_sent_today FROM shop_email_quotas WHERE organization_id = ?'
    ).bind(organizationId).first();

    const org = await this.db.prepare(
      'SELECT support_email FROM organizations WHERE id = ?'
    ).bind(organizationId).first();

    return {
      activeProvider: providerConn?.provider_type || 'FERASETU',
      defaultSender: defaultIdentity?.email_address || null,
      replyTo: org?.support_email || null,
      domains: domains?.results || [],
      dailyQuota: quota?.daily_limit || 100,
      sentToday: quota?.emails_sent_today || 0
    };
  }

  /**
   * Updates sender display name or default status with history recording.
   */
  async update_email_sender({ organizationId, identityId, displayName, isDefault }) {
    const ident = await this.db.prepare(
      'SELECT * FROM email_identities WHERE id = ? AND organization_id = ?'
    ).bind(identityId, organizationId).first();

    if (!ident) {
      throw new Error('Sender identity not found or unauthorized');
    }

    if (displayName && /[\r\n]/.test(displayName)) {
      throw new Error('Display name contains forbidden CRLF characters');
    }

    // Save previous snapshot for undo
    const actionId = `ai_act_${crypto.randomUUID()}`;
    await this.db.prepare(`
      INSERT INTO ai_action_history (id, organization_id, action_type, before_state, after_state)
      VALUES (?, ?, 'update_email_sender', ?, ?)
    `).bind(
      actionId,
      organizationId,
      JSON.stringify(ident),
      JSON.stringify({ ...ident, display_name: displayName ?? ident.display_name, is_default: isDefault ? 1 : 0 })
    ).run();

    const now = new Date().toISOString();
    if (displayName !== undefined) {
      await this.db.prepare(
        'UPDATE email_identities SET display_name = ?, updated_at = ? WHERE id = ?'
      ).bind(displayName, now, identityId).run();
    }

    if (isDefault === true) {
      await this.db.prepare(
        'UPDATE email_identities SET is_default = 0, updated_at = ? WHERE organization_id = ?'
      ).bind(now, organizationId).run();
      await this.db.prepare(
        'UPDATE email_identities SET is_default = 1, updated_at = ? WHERE id = ?'
      ).bind(now, identityId).run();
    }

    return { success: true, message: 'Sender identity updated successfully' };
  }

  /**
   * Updates customer Reply-To address with validation and audit logging.
   */
  async update_reply_to({ organizationId, replyToEmail }) {
    if (!replyToEmail || !replyToEmail.includes('@') || /[\r\n]/.test(replyToEmail)) {
      throw new Error('Invalid Reply-To email address or prohibited CRLF characters');
    }

    const org = await this.db.prepare(
      'SELECT id, support_email FROM organizations WHERE id = ?'
    ).bind(organizationId).first();

    if (!org) throw new Error('Organization not found');

    const actionId = `ai_act_${crypto.randomUUID()}`;
    await this.db.prepare(`
      INSERT INTO ai_action_history (id, organization_id, action_type, before_state, after_state)
      VALUES (?, ?, 'update_reply_to', ?, ?)
    `).bind(
      actionId,
      organizationId,
      JSON.stringify({ support_email: org.support_email }),
      JSON.stringify({ support_email: replyToEmail })
    ).run();

    await this.db.prepare(
      'UPDATE organizations SET support_email = ? WHERE id = ?'
    ).bind(replyToEmail, organizationId).run();

    return { success: true, replyToEmail };
  }

  /**
   * Lists all registered email templates with variable schemas.
   */
  async list_email_templates({ organizationId = null } = {}) {
    let customOverrides = new Map();
    if (organizationId) {
      const rows = await this.db.prepare(
        'SELECT * FROM merchant_email_templates WHERE organization_id = ?'
      ).bind(organizationId).all();
      for (const row of rows?.results || []) {
        customOverrides.set(row.template_key, row);
      }
    }

    const list = [];
    for (const [key, tpl] of Object.entries(EMAIL_TEMPLATES)) {
      const custom = customOverrides.get(key);
      list.push({
        templateKey: key,
        version: custom?.version || tpl.version,
        requiredVariables: tpl.requiredVariables,
        optionalVariables: tpl.optionalVariables,
        status: tpl.status,
        isCustomized: Boolean(custom),
        customSubject: custom?.subject || null,
        updatedAt: custom?.updated_at || null
      });
    }

    return { templates: list };
  }

  /**
   * Updates or creates a custom merchant email template override.
   */
  async update_email_template({ organizationId, templateKey, subject, contentHtml }) {
    const tpl = EMAIL_TEMPLATES[templateKey];
    if (!tpl) {
      throw new Error(`Template '${templateKey}' is not registered in the catalog`);
    }

    if (subject && /[\r\n]/.test(subject)) {
      throw new Error('Subject line contains forbidden CRLF characters');
    }

    // Check variable syntax in custom subject and content
    const variablePattern = /\{\{([a-zA-Z0-9_]+)\}\}/g;
    const allowedVars = new Set([...tpl.requiredVariables, ...tpl.optionalVariables]);
    const matches = ((subject || '') + ' ' + (contentHtml || '')).matchAll(variablePattern);
    for (const m of matches) {
      if (!allowedVars.has(m[1])) {
        throw new Error(`Unauthorized variable '{{${m[1]}}}' in template '${templateKey}'`);
      }
    }

    const prevRow = await this.db.prepare(
      'SELECT * FROM merchant_email_templates WHERE organization_id = ? AND template_key = ?'
    ).bind(organizationId, templateKey).first();

    const actionId = `ai_act_${crypto.randomUUID()}`;
    await this.db.prepare(`
      INSERT INTO ai_action_history (id, organization_id, action_type, before_state, after_state)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      actionId,
      organizationId,
      'update_email_template',
      JSON.stringify(prevRow || { subject: null, content_html: null }),
      JSON.stringify({ subject, contentHtml })
    ).run();

    const tplId = prevRow?.id || `tpl_custom_${crypto.randomUUID()}`;
    const newVersion = (prevRow?.version || 0) + 1;
    const now = new Date().toISOString();

    await this.db.prepare(`
      INSERT INTO merchant_email_templates (id, organization_id, template_key, subject, content_html, version, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(organization_id, template_key) DO UPDATE SET
        subject = excluded.subject,
        content_html = excluded.content_html,
        version = merchant_email_templates.version + 1,
        updated_at = excluded.updated_at
    `).bind(tplId, organizationId, templateKey, subject, contentHtml, newVersion, now).run();

    return { success: true, templateKey, updated: true, version: newVersion };
  }

  /**
   * Sends a test transactional email, requiring explicit merchant approval.
   */
  async send_test_email({ organizationId, to, templateKey = 'order.confirmation', sampleData = {}, confirmed = false, env }) {
    if (!confirmed) {
      const err = new Error('Test email dispatch is a sensitive action requiring explicit merchant confirmation');
      err.requiresApproval = true;
      throw err;
    }

    if (!to || !to.includes('@') || /[\r\n]/.test(to)) {
      throw new Error('Valid recipient email address is required');
    }

    const result = await EmailService.send(env, {
      organizationId,
      to,
      templateKey,
      templateData: {
        order_id: 'TEST-ORD-1234',
        total: 1499.00,
        customer_name: 'Priya Sharma',
        ...sampleData
      },
      subject: `[TEST PREVIEW] Order Confirmation • FeraSetu`
    });

    return { success: true, result };
  }

  /**
   * Rolls back the last AI action for this merchant.
   */
  async undo_last_action({ organizationId }) {
    const historyRows = await this.db.prepare(
      'SELECT * FROM ai_action_history WHERE organization_id = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(organizationId).all();

    const list = historyRows?.results || [];
    if (list.length === 0) {
      throw new Error('No previous AI action history available to undo');
    }

    const lastAction = list[0];
    const beforeState = JSON.parse(lastAction.before_state);

    if (lastAction.action_type === 'update_email_template') {
      const afterState = JSON.parse(lastAction.after_state);
      if (beforeState.subject === null && !beforeState.content_html) {
        // No prior override existed; delete the custom override
        await this.db.prepare(
          'DELETE FROM merchant_email_templates WHERE organization_id = ?'
        ).bind(organizationId).run();
      } else {
        await this.db.prepare(`
          UPDATE merchant_email_templates 
          SET subject = ?, content_html = ?, updated_at = ?
          WHERE organization_id = ?
        `).bind(beforeState.subject, beforeState.content_html, new Date().toISOString(), organizationId).run();
      }
    } else if (lastAction.action_type === 'update_reply_to') {
      await this.db.prepare(
        'UPDATE organizations SET support_email = ? WHERE id = ?'
      ).bind(beforeState.support_email, organizationId).run();
    } else if (lastAction.action_type === 'update_email_sender') {
      await this.db.prepare(
        'UPDATE email_identities SET display_name = ?, is_default = ? WHERE id = ?'
      ).bind(beforeState.display_name, beforeState.is_default, beforeState.id).run();
    }

    // Delete the consumed action history row
    await this.db.prepare('DELETE FROM ai_action_history WHERE id = ?').bind(lastAction.id).run();

    return {
      success: true,
      undoneAction: lastAction.action_type,
      message: `Successfully rolled back ${lastAction.action_type}`
    };
  }
}
