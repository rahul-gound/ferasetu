/**
 * FeraSetu Production Email Settings & Domain Management Routes
 * Authenticated REST APIs for multi-tenant domains, sender identities,
 * external SMTP provider connections, and transactional email testing.
 */

import { requireOrgContext, HttpError } from '../index.js';
import { normalizeDomain, generateDnsInstructions, verifyDomainDns } from '../services/dnsVerification.js';
import { encryptSecret } from '../services/emailCrypto.js';
import { testSmtpConnection } from '../services/externalSmtpClient.js';
import { EmailService, ensureMerchantEmailProvisioning } from '../services/emailService.js';

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError("Invalid JSON body", 400);
  }
}

function json(data, status = 200, headers = {}, request = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Robots-Tag": "noindex, nofollow",
      ...headers
    }
  });
}

/**
 * Main dispatch handler for /api/email/* routes.
 */
export async function handleEmailRoutes(request, env) {
  const url = new URL(request.url);
  const method = request.method;
  const rawPath = url.pathname;
  let path = rawPath.replace(/\/+$/, "") || "/";
  if (!path.startsWith("/api/")) {
    path = "/api" + path;
  }

  // 1. Health check (lightweight probe)
  if (path === "/api/email/health" && method === "GET") {
    return json({
      status: "HEALTHY",
      service: "ferasetu-email-router",
      timestamp: new Date().toISOString()
    }, 200, {}, request);
  }

  // 2. All subsequent endpoints require authenticated merchant organization context
  const ctx = await requireOrgContext(request, env, 'staff');
  const orgId = ctx.organizationId;
  const storeSlug = ctx.organization?.store_slug || ctx.organizationId;
  const orgName = ctx.organization?.name || 'Store';

  // ---------------------------------------------------------------------------
  // GET /api/email/settings
  // ---------------------------------------------------------------------------
  if (path === "/api/email/settings" && method === "GET") {
    let providerConn = await env.DB.prepare(
      "SELECT * FROM email_provider_connections WHERE organization_id = ?"
    ).bind(orgId).first();

    let defaultIdentity = await env.DB.prepare(
      "SELECT * FROM email_identities WHERE organization_id = ? AND is_default = 1"
    ).bind(orgId).first();

    let ferasetuDomain = await env.DB.prepare(
      "SELECT * FROM email_domains WHERE organization_id = ? AND domain_type = 'FERASETU_MERCHANT'"
    ).bind(orgId).first();

    // Lazy on-demand provisioning if merchant has no default domain/identity yet
    if (!ferasetuDomain || !defaultIdentity || !providerConn) {
      await ensureMerchantEmailProvisioning(env.DB, orgId, storeSlug, orgName);
      ferasetuDomain = await env.DB.prepare(
        "SELECT * FROM email_domains WHERE organization_id = ? AND domain_type = 'FERASETU_MERCHANT'"
      ).bind(orgId).first();
      defaultIdentity = await env.DB.prepare(
        "SELECT * FROM email_identities WHERE organization_id = ? AND is_default = 1"
      ).bind(orgId).first();
      providerConn = await env.DB.prepare(
        "SELECT * FROM email_provider_connections WHERE organization_id = ?"
      ).bind(orgId).first();
    }

    const activeProvider = providerConn?.provider_type || 'FERASETU';

    const customDomain = await env.DB.prepare(
      "SELECT * FROM email_domains WHERE organization_id = ? AND domain_type = 'CUSTOM' ORDER BY created_at DESC"
    ).bind(orgId).first();

    const quotaRow = await env.DB.prepare(
      "SELECT * FROM shop_email_quotas WHERE organization_id = ?"
    ).bind(orgId).first();

    const dailyLimit = Number(quotaRow?.daily_limit || 100);
    const sentToday = Number(quotaRow?.emails_sent_today || 0);
    const extraBalance = Number(quotaRow?.extra_quota_balance || 0);

    return json({
      activeProvider,
      defaultIdentity,
      ferasetuDomain,
      customDomain,
      externalConnection: providerConn ? {
        smtp_host: providerConn.smtp_host || '',
        smtp_port: providerConn.smtp_port || 587,
        smtp_username: providerConn.smtp_username || '',
        security_mode: providerConn.security_mode || 'STARTTLS',
        status: providerConn.status || 'UNTESTED',
        has_password: !!providerConn.encrypted_secret_reference,
        created_at: providerConn.created_at,
        updated_at: providerConn.updated_at
      } : null,
      quota: {
        dailyLimit,
        sentToday,
        remainingDaily: Math.max(0, dailyLimit - sentToday),
        extraBalance
      }
    }, 200, {}, request);
  }

  // ---------------------------------------------------------------------------
  // GET & POST /api/email/domains
  // ---------------------------------------------------------------------------
  if (path === "/api/email/domains") {
    if (method === "GET") {
      const rows = await env.DB.prepare(
        "SELECT * FROM email_domains WHERE organization_id = ? ORDER BY created_at DESC"
      ).bind(orgId).all();

      return json({ domains: rows.results || [] }, 200, {}, request);
    }

    if (method === "POST") {
      const body = await readJsonBody(request);
      const normalized = normalizeDomain(body.domain);
      if (!normalized.valid) {
        throw new HttpError(normalized.error, 422);
      }

      // Check if domain is already claimed by any merchant
      const existing = await env.DB.prepare(
        "SELECT id, organization_id, verification_status FROM email_domains WHERE domain = ?"
      ).bind(normalized.domain).first();

      if (existing) {
        if (existing.organization_id !== orgId) {
          throw new HttpError("This domain is already registered by another organization.", 409);
        }
        // Already owned by this merchant; return existing instructions
        const instructions = generateDnsInstructions(normalized.domain, existing.verification_token_hash || 'fera-verify');
        return json({ domain: existing, dnsInstructions: instructions }, 200, {}, request);
      }

      const domainId = `dom_c_${crypto.randomUUID()}`;
      const token = `fera_verify_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
      const now = new Date().toISOString();
      const selector = "fs1";

      await env.DB.prepare(`
        INSERT INTO email_domains (
          id, organization_id, domain, domain_type, verification_status,
          ownership_verification_method, verification_token_hash, dkim_selector,
          dkim_status, spf_status, dmarc_status, mail_from_status, provider,
          created_at, updated_at
        ) VALUES (?, ?, ?, 'CUSTOM', 'PENDING', 'DNS_TXT', ?, ?, 'PENDING', 'PENDING', 'PENDING', 'PENDING', 'FERASETU', ?, ?)
      `).bind(domainId, orgId, normalized.domain, token, selector, now, now).run();

      const createdRow = await env.DB.prepare("SELECT * FROM email_domains WHERE id = ?").bind(domainId).first();
      const instructions = generateDnsInstructions(normalized.domain, token, selector);

      return json({ domain: createdRow, dnsInstructions: instructions }, 201, {}, request);
    }

    throw new HttpError("Method not allowed", 405);
  }

  // ---------------------------------------------------------------------------
  // /api/email/domains/:id
  // ---------------------------------------------------------------------------
  if (path.startsWith("/api/email/domains/")) {
    const parts = path.split("/");
    const domainId = parts[4];
    const subAction = parts[5]; // e.g. "verify" or "check"

    const domainRow = await env.DB.prepare(
      "SELECT * FROM email_domains WHERE id = ? AND organization_id = ?"
    ).bind(domainId, orgId).first();

    if (!domainRow) {
      throw new HttpError("Domain not found or unauthorized", 404);
    }

    // Verify / Check action
    if ((subAction === "verify" || subAction === "check") && method === "POST") {
      const verification = await verifyDomainDns(domainRow.domain, domainRow.verification_token_hash, domainRow.dkim_selector);
      const now = new Date().toISOString();

      await env.DB.prepare(`
        UPDATE email_domains
        SET verification_status = ?, dkim_status = ?, spf_status = ?,
            dmarc_status = ?, mail_from_status = ?, last_checked_at = ?,
            verified_at = CASE WHEN ? = 'VERIFIED' THEN ? ELSE verified_at END,
            updated_at = ?
        WHERE id = ?
      `).bind(
        verification.status, verification.dkimStatus, verification.spfStatus,
        verification.dmarcStatus, verification.mailFromStatus, now,
        verification.status, now, now, domainId
      ).run();

      // If domain successfully verified, ensure default custom identity orders@{domain} exists
      if (verification.status === "VERIFIED") {
        const customEmail = `orders@${domainRow.domain}`;
        const existingIdent = await env.DB.prepare(
          "SELECT id FROM email_identities WHERE email_address = ?"
        ).bind(customEmail).first();

        if (!existingIdent) {
          const identId = `ident_c_${crypto.randomUUID()}`;
          await env.DB.prepare(`
            INSERT INTO email_identities (
              id, organization_id, domain_id, local_part, email_address,
              display_name, identity_type, status, is_default, created_at, updated_at
            ) VALUES (?, ?, ?, 'orders', ?, ?, 'CUSTOM', 'ACTIVE', 0, ?, ?)
          `).bind(identId, orgId, domainId, customEmail, orgName, now, now).run();
        }
      }

      const updated = await env.DB.prepare("SELECT * FROM email_domains WHERE id = ?").bind(domainId).first();
      const instructions = generateDnsInstructions(domainRow.domain, domainRow.verification_token_hash, domainRow.dkim_selector);

      return json({
        domain: updated,
        verification,
        dnsInstructions: instructions
      }, 200, {}, request);
    }

    // GET single domain details
    if (!subAction && method === "GET") {
      const instructions = generateDnsInstructions(domainRow.domain, domainRow.verification_token_hash, domainRow.dkim_selector);
      return json({ domain: domainRow, dnsInstructions: instructions }, 200, {}, request);
    }

    // DELETE custom domain
    if (!subAction && method === "DELETE") {
      if (domainRow.domain_type === "FERASETU_MERCHANT" || domainRow.domain_type === "PLATFORM") {
        throw new HttpError("Cannot delete default managed domain", 400);
      }

      // If the default identity was using this domain, switch default back to FeraSetu domain
      const defaultIdent = await env.DB.prepare(
        "SELECT * FROM email_identities WHERE organization_id = ? AND domain_id = ? AND is_default = 1"
      ).bind(orgId, domainId).first();

      if (defaultIdent) {
        await env.DB.prepare(`
          UPDATE email_identities
          SET is_default = 1
          WHERE organization_id = ? AND identity_type = 'MERCHANT'
        `).bind(orgId).run();
      }

      await env.DB.prepare("DELETE FROM email_identities WHERE domain_id = ?").bind(domainId).run();
      await env.DB.prepare("DELETE FROM email_domains WHERE id = ?").bind(domainId).run();

      return json({ success: true, message: "Custom domain removed successfully" }, 200, {}, request);
    }

    throw new HttpError("Method not allowed", 405);
  }

  // ---------------------------------------------------------------------------
  // GET & POST /api/email/identities
  // ---------------------------------------------------------------------------
  if (path === "/api/email/identities") {
    if (method === "GET") {
      const rows = await env.DB.prepare(`
        SELECT ei.*, ed.domain, ed.verification_status, ed.domain_type
        FROM email_identities ei
        JOIN email_domains ed ON ei.domain_id = ed.id
        WHERE ei.organization_id = ?
        ORDER BY ei.is_default DESC, ei.created_at ASC
      `).bind(orgId).all();

      return json({ identities: rows.results || [] }, 200, {}, request);
    }

    if (method === "POST") {
      const body = await readJsonBody(request);
      const { domain_id, local_part, display_name } = body;

      if (!domain_id || !local_part) {
        throw new HttpError("domain_id and local_part are required", 422);
      }

      const cleanLocal = String(local_part).trim().toLowerCase();
      if (!/^[a-z0-9._-]+$/.test(cleanLocal)) {
        throw new HttpError("Invalid local part format (e.g. orders, support, hello)", 422);
      }

      const domainRow = await env.DB.prepare(
        "SELECT * FROM email_domains WHERE id = ? AND organization_id = ?"
      ).bind(domain_id, orgId).first();

      if (!domainRow) {
        throw new HttpError("Domain not found or unauthorized", 404);
      }

      if (domainRow.verification_status !== "VERIFIED") {
        throw new HttpError("Cannot create sender identity for unverified domain", 400);
      }

      const emailAddress = `${cleanLocal}@${domainRow.domain}`;
      const existing = await env.DB.prepare(
        "SELECT id FROM email_identities WHERE email_address = ?"
      ).bind(emailAddress).first();

      if (existing) {
        throw new HttpError("Email identity already exists", 409);
      }

      const identId = `ident_${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      const identityType = domainRow.domain_type === "FERASETU_MERCHANT" ? "MERCHANT" : "CUSTOM";

      await env.DB.prepare(`
        INSERT INTO email_identities (
          id, organization_id, domain_id, local_part, email_address,
          display_name, identity_type, status, is_default, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 0, ?, ?)
      `).bind(identId, orgId, domain_id, cleanLocal, emailAddress, display_name || orgName, identityType, now, now).run();

      const created = await env.DB.prepare("SELECT * FROM email_identities WHERE id = ?").bind(identId).first();
      return json({ identity: created }, 201, {}, request);
    }

    throw new HttpError("Method not allowed", 405);
  }

  // ---------------------------------------------------------------------------
  // PATCH & DELETE /api/email/identities/:id
  // ---------------------------------------------------------------------------
  if (path.startsWith("/api/email/identities/")) {
    const identId = path.split("/")[4];
    const identRow = await env.DB.prepare(
      "SELECT * FROM email_identities WHERE id = ? AND organization_id = ?"
    ).bind(identId, orgId).first();

    if (!identRow) {
      throw new HttpError("Identity not found or unauthorized", 404);
    }

    if (method === "PATCH") {
      const body = await readJsonBody(request);
      const now = new Date().toISOString();

      if (body.is_default === true) {
        // Clear previous default
        await env.DB.prepare(
          "UPDATE email_identities SET is_default = 0, updated_at = ? WHERE organization_id = ?"
        ).bind(now, orgId).run();

        await env.DB.prepare(
          "UPDATE email_identities SET is_default = 1, updated_at = ? WHERE id = ?"
        ).bind(now, identId).run();
      }

      if (body.display_name !== undefined) {
        await env.DB.prepare(
          "UPDATE email_identities SET display_name = ?, updated_at = ? WHERE id = ?"
        ).bind(String(body.display_name).trim(), now, identId).run();
      }

      const updated = await env.DB.prepare("SELECT * FROM email_identities WHERE id = ?").bind(identId).first();
      return json({ identity: updated }, 200, {}, request);
    }

    if (method === "DELETE") {
      if (identRow.is_default) {
        throw new HttpError("Cannot delete default sender identity. Set another default first.", 400);
      }
      await env.DB.prepare("DELETE FROM email_identities WHERE id = ?").bind(identId).run();
      return json({ success: true, message: "Identity deleted successfully" }, 200, {}, request);
    }

    throw new HttpError("Method not allowed", 405);
  }

  // ---------------------------------------------------------------------------
  // /api/email/provider endpoints
  // ---------------------------------------------------------------------------
  if (path === "/api/email/provider") {
    if (method === "GET") {
      const conn = await env.DB.prepare(
        "SELECT * FROM email_provider_connections WHERE organization_id = ?"
      ).bind(orgId).first();

      return json({
        provider_type: conn?.provider_type || 'FERASETU',
        smtp_host: conn?.smtp_host || '',
        smtp_port: conn?.smtp_port || 587,
        smtp_username: conn?.smtp_username || '',
        security_mode: conn?.security_mode || 'STARTTLS',
        status: conn?.status || 'ACTIVE',
        has_password: !!conn?.encrypted_secret_reference
      }, 200, {}, request);
    }
    throw new HttpError("Method not allowed", 405);
  }

  if (path === "/api/email/provider/ferasetu" && method === "POST") {
    const now = new Date().toISOString();
    await env.DB.prepare(`
      UPDATE email_provider_connections
      SET provider_type = 'FERASETU', status = 'ACTIVE', updated_at = ?
      WHERE organization_id = ?
    `).bind(now, orgId).run();

    return json({ success: true, provider: 'FERASETU', message: "Switched to FeraSetu Email successfully" }, 200, {}, request);
  }

  if (path === "/api/email/provider/external") {
    if (method === "POST") {
      const body = await readJsonBody(request);
      const host = String(body.smtp_host || '').trim();
      const port = Number(body.smtp_port) || 587;
      const username = String(body.smtp_username || '').trim();
      const password = typeof body.smtp_password === 'string' ? body.smtp_password : '';
      const securityMode = body.security_mode === 'SSL_TLS' ? 'SSL_TLS' : 'STARTTLS';

      const existingConn = await env.DB.prepare(
        "SELECT * FROM email_provider_connections WHERE organization_id = ?"
      ).bind(orgId).first();

      const finalPassword = password || (existingConn ? 'existing_reused' : '');
      if (!finalPassword) {
        throw new HttpError("SMTP password is required", 422);
      }

      // Test connection before saving if password is newly provided
      if (password) {
        const testRes = await testSmtpConnection({
          host,
          port,
          username,
          password,
          securityMode
        });

        if (!testRes.success) {
          throw new HttpError(`SMTP connection test failed: ${testRes.error}`, 400);
        }
      }

      const masterKey = env?.ENCRYPTION_SECRET || env?.ADMIN_JWT_SECRET;
      const encryptedSecret = password ? await encryptSecret(password, masterKey) : existingConn?.encrypted_secret_reference;
      const now = new Date().toISOString();

      if (existingConn) {
        await env.DB.prepare(`
          UPDATE email_provider_connections
          SET provider_type = 'EXTERNAL_SMTP', smtp_host = ?, smtp_port = ?,
              smtp_username = ?, encrypted_secret_reference = ?, security_mode = ?,
              status = 'ACTIVE', updated_at = ?
          WHERE organization_id = ?
        `).bind(host, port, username, encryptedSecret, securityMode, now, orgId).run();
      } else {
        const connId = `epc_${crypto.randomUUID()}`;
        await env.DB.prepare(`
          INSERT INTO email_provider_connections (
            id, organization_id, provider_type, smtp_host, smtp_port,
            smtp_username, encrypted_secret_reference, security_mode,
            status, created_at, updated_at
          ) VALUES (?, ?, 'EXTERNAL_SMTP', ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
        `).bind(connId, orgId, host, port, username, encryptedSecret, securityMode, now, now).run();
      }

      return json({
        success: true,
        provider: 'EXTERNAL_SMTP',
        message: "External SMTP verified and configured successfully"
      }, 200, {}, request);
    }

    if (method === "DELETE") {
      const now = new Date().toISOString();
      await env.DB.prepare(`
        UPDATE email_provider_connections
        SET provider_type = 'FERASETU', smtp_host = null, smtp_username = null,
            encrypted_secret_reference = null, status = 'ACTIVE', updated_at = ?
        WHERE organization_id = ?
      `).bind(now, orgId).run();

      return json({ success: true, message: "External SMTP removed. Reverted to FeraSetu Email." }, 200, {}, request);
    }

    throw new HttpError("Method not allowed", 405);
  }

  // ---------------------------------------------------------------------------
  // POST /api/email/send
  // Unified email dispatch endpoint for backend services
  // ---------------------------------------------------------------------------
  if (path === "/api/email/send" && method === "POST") {
    const body = await readJsonBody(request);
    
    // Validate required fields
    const to = String(body.to || '').trim();
    if (!to || !to.includes('@')) {
      throw new HttpError("Valid recipient email (to) is required", 422);
    }
    if (!body.templateKey && !body.subject) {
      throw new HttpError("Either templateKey or raw subject/html/text must be provided", 422);
    }

    try {
      const result = await EmailService.send(env, {
        organizationId: orgId,
        to,
        templateKey: body.templateKey || null,
        templateData: body.templateData || {},
        locale: body.locale || 'en',
        subject: body.subject || null,
        html: body.html || null,
        text: body.text || null,
        replyTo: body.replyTo || null,
        idempotencyKey: body.idempotencyKey || null,
        priority: body.priority || 'NORMAL',
        customHeaders: body.customHeaders || {},
        storeSlug: body.storeSlug || storeSlug,
        orgName: body.orgName || orgName
      });

      return json({ success: true, message: "Email dispatched successfully", result }, 200, {}, request);
    } catch (sendErr) {
      throw new HttpError(`Email dispatch failed: ${sendErr?.message || sendErr}`, 500);
    }
  }

  // ---------------------------------------------------------------------------
  // POST /api/email/test
  // ---------------------------------------------------------------------------
  if (path === "/api/email/test" && method === "POST") {
    const body = await readJsonBody(request);
    const to = String(body.to || '').trim();
    if (!to || !to.includes('@')) {
      throw new HttpError("Valid recipient email address is required for test email", 422);
    }

    try {
      const result = await EmailService.send(env, {
        organizationId: orgId,
        to,
        subject: body.subject || `Test Email from ${orgName} • FeraSetu`,
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #0052FF;">FeraSetu Email Test Successful!</h2>
            <p>This email confirms that your store <strong>${escapeHtml(orgName)}</strong> is properly configured to send email notifications.</p>
            <div style="background-color: #f8fafc; padding: 12px 16px; border-radius: 8px; margin: 16px 0; font-size: 13px; color: #475569;">
              <div>Timestamp: ${new Date().toUTCString()}</div>
              <div>Store Slug: ${escapeHtml(storeSlug)}</div>
            </div>
            <p style="font-size: 12px; color: #94a3b8;">Sent via FeraSetu Production Email Infrastructure</p>
          </div>`,
        text: `FeraSetu Email Test Successful! Sent from ${orgName} at ${new Date().toISOString()}`
      });

      return json({ success: true, message: "Test email dispatched successfully", result }, 200, {}, request);
    } catch (sendErr) {
      throw new HttpError(`Test email failed: ${sendErr?.message || sendErr}`, 500);
    }
  }

  // ---------------------------------------------------------------------------
  // GET /api/email/events
  // ---------------------------------------------------------------------------
  if (path === "/api/email/events" && method === "GET") {
    const rows = await env.DB.prepare(`
      SELECT ee.*, em.subject, em.provider, em.to_address
      FROM email_events ee
      JOIN email_messages em ON ee.message_id = em.id
      WHERE ee.merchant_id = ?
      ORDER BY ee.timestamp DESC
      LIMIT 50
    `).bind(orgId).all();

    return json({ events: rows.results || [] }, 200, {}, request);
  }

  throw new HttpError(`Unknown email endpoint: ${path}`, 404);
}
