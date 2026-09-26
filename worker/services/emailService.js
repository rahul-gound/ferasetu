/**
 * FeraSetu Unified Email Service
 * Central abstraction for transactional and platform email dispatch.
 * Handles tenancy isolation, identity resolution, quota enforcement,
 * header injection defense, idempotency, and dispatch via FeraSetu Postfix or External SMTP.
 */

import { decryptSecret } from './emailCrypto.js';
import { sendViaExternalSmtp } from './externalSmtpClient.js';
import { checkAndConsumeEmailQuota } from '../index.js';
import {
  renderEmailTemplate,
  validateTemplateVariables,
  EMAIL_TEMPLATES
} from '../templates/emailTemplates.js';

export const PLATFORM_TENANT_ID = 'ferasetu-platform';
export const PLATFORM_DOMAIN = 'ferasetu.com';

export const ALLOWED_PLATFORM_SENDERS = new Set([
  'no-reply@ferasetu.com',
  'support@ferasetu.com',
  'billing@ferasetu.com',
]);

const SAFE_HEADER_ALLOWLIST = new Set([
  'x-entity-ref-id',
  'x-auto-response-suppress',
  'list-unsubscribe',
  'feedback-id',
  'precedence',
]);

/**
 * Validates header strings against CRLF injection attacks.
 */
export function sanitizeHeaderValue(val) {
  if (typeof val !== 'string') return '';
  if (/[\r\n]/.test(val)) {
    throw new Error('Header injection detected: prohibited CRLF characters in email field');
  }
  return val.trim();
}

/**
 * EmailTransport Abstraction (RFC 5321 Transport Layer)
 * Provides clean decoupled interface for outbound email delivery transports.
 */
export class EmailTransport {
  async send(envelope, context) {
    throw new Error('EmailTransport.send must be implemented by subclass');
  }
}

export class FeraSetuPostfixTransport extends EmailTransport {
  // Routes to Modal.com in-container Postfix MTA on 127.0.0.1:25
}

export class ExternalSMTPTransport extends EmailTransport {
  // Routes to merchant-configured external SMTP via cloudflare:sockets TCP
}

// Future-compatible stubs (Not instantiated now, clean interfaces ready for scale)
export class DedicatedPlatformTransport extends EmailTransport {
  // Future: Dedicated platform IP pool / MTA
}

export class DedicatedMerchantTransport extends EmailTransport {
  // Future: Dedicated merchant IP pool / MTA
}

/**
 * SMTP Failure Classification
 * Categorizes failures for retry decisions
 */
export const SmtpFailureCategory = {
  TRANSIENT: 'TRANSIENT',
  PERMANENT: 'PERMANENT',
  POLICY: 'POLICY',
  AUTHENTICATION: 'AUTHENTICATION',
  RATE_LIMIT: 'RATE_LIMIT',
  DNS: 'DNS',
  UNKNOWN: 'UNKNOWN',
};

/**
 * Classifies an SMTP error into a failure category for retry logic
 */
export function classifySmtpFailure(error, providerResponse) {
  const message = (error?.message || error?.details || error?.toString() || '').toLowerCase();
  const status = providerResponse?.status;
  const body = (providerResponse?.body || '').toLowerCase();

  // Authentication failures - never retry
  if (
    status === 401 || status === 403 ||
    message.includes('authentication failed') ||
    message.includes('invalid credentials') ||
    message.includes('access denied') ||
    message.includes('unauthorized') ||
    body.includes('authentication failed') ||
    body.includes('invalid api key') ||
    body.includes('unauthorized sender')
  ) {
    return SmtpFailureCategory.AUTHENTICATION;
  }

  // Rate limiting - transient but with backoff
  if (
    status === 429 ||
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('throttl') ||
    body.includes('rate limit') ||
    body.includes('throttl')
  ) {
    return SmtpFailureCategory.RATE_LIMIT;
  }

  // DNS failures - transient
  if (
    message.includes('dns') ||
    message.includes('name resolution') ||
    message.includes('getaddrinfo') ||
    message.includes('enotfound') ||
    message.includes('host not found') ||
    body.includes('dns')
  ) {
    return SmtpFailureCategory.DNS;
  }

  // Permanent failures - invalid recipient, hard bounce, etc.
  if (
    status === 550 || status === 551 || status === 552 || status === 553 || status === 554 ||
    message.includes('invalid recipient') ||
    message.includes('user unknown') ||
    message.includes('mailbox unavailable') ||
    message.includes('no such user') ||
    message.includes('recipient rejected') ||
    message.includes('address rejected') ||
    message.includes('domain does not exist') ||
    body.includes('550') ||
    body.includes('user unknown') ||
    body.includes('no such user')
  ) {
    return SmtpFailureCategory.PERMANENT;
  }

  // Policy failures - spam, content, etc. - could be permanent or transient
  if (
    status === 554 ||
    message.includes('policy') ||
    message.includes('spam') ||
    message.includes('blocked') ||
    message.includes('rejected by policy') ||
    body.includes('policy') ||
    body.includes('spam')
  ) {
    return SmtpFailureCategory.POLICY;
  }

  // Transient failures - temporary issues that should retry
  if (
    status === 421 || status === 450 || status === 451 || status === 452 ||
    message.includes('temporary') ||
    message.includes('try again') ||
    message.includes('service unavailable') ||
    message.includes('queue overload') ||
    message.includes('connection timeout') ||
    message.includes('connection refused') ||
    message.includes('network') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    body.includes('temporary') ||
    body.includes('try again') ||
    body.includes('service unavailable')
  ) {
    return SmtpFailureCategory.TRANSIENT;
  }

  // Default to unknown - treat as transient for safety
  return SmtpFailureCategory.UNKNOWN;
}

/**
 * Determines if a failure category should trigger a retry
 */
export function shouldRetry(category) {
  return category === SmtpFailureCategory.TRANSIENT ||
         category === SmtpFailureCategory.RATE_LIMIT ||
         category === SmtpFailureCategory.DNS ||
         category === SmtpFailureCategory.UNKNOWN;
}

/**
 * Exponential backoff with jitter for retry delays
 * @param attempt - Current attempt number (0-indexed)
 * @param baseDelayMs - Base delay in milliseconds (default: 1000ms)
 * @param maxDelayMs - Maximum delay cap (default: 60000ms = 1 minute)
 * @returns Delay in milliseconds
 */
export function calculateBackoffDelay(
  attempt,
  baseDelayMs = 1000,
  maxDelayMs = 60000
) {
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);
  // Add jitter: ±25% of the delay
  const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.floor(cappedDelay + jitter);
}

/**
 * Maximum retry attempts per failure category
 */
export const MAX_RETRIES_BY_CATEGORY = {
  [SmtpFailureCategory.TRANSIENT]: 5,
  [SmtpFailureCategory.RATE_LIMIT]: 3,
  [SmtpFailureCategory.DNS]: 3,
  [SmtpFailureCategory.UNKNOWN]: 3,
  [SmtpFailureCategory.PERMANENT]: 0,
  [SmtpFailureCategory.POLICY]: 0,
  [SmtpFailureCategory.AUTHENTICATION]: 0,
};

/**
 * HTML Escaping helper.
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
}

/**
 * Builds merchant branding object from database records.
 */
async function buildMerchantBranding(db, organizationId) {
  const org = await db.prepare(
    "SELECT name, logo_url, primary_color, secondary_color, store_url, support_email FROM organizations WHERE id = ?"
  ).bind(organizationId).first();

  const shop = await db.prepare(
    "SELECT name, logo_url, primary_color, secondary_color, store_url FROM shops WHERE organization_id = ? LIMIT 1"
  ).bind(organizationId).first();

  return {
    storeName: shop?.name || org?.name || 'Online Store',
    logoUrl: shop?.logo_url || org?.logo_url || null,
    primaryColor: shop?.primary_color || org?.primary_color || null,
    secondaryColor: shop?.secondary_color || org?.secondary_color || null,
    storeUrl: shop?.store_url || org?.store_url || `https://${organizationId}.ferasetu.com`,
    supportEmail: org?.support_email || null,
  };
}

/**
 * Determines the effective sender for merchant emails with safe fallback.
 * Returns { from, fallbackApplied, fallbackReason }
 */
async function resolveMerchantSender(db, organizationId, storeSlug, orgName) {
  // 1. Check for custom domain
  const customDomain = await db.prepare(
    "SELECT * FROM email_domains WHERE organization_id = ? AND domain_type = 'CUSTOM' AND verification_status = 'VERIFIED' ORDER BY created_at DESC LIMIT 1"
  ).bind(organizationId).first();

  if (customDomain) {
    const customIdentity = await db.prepare(
      "SELECT * FROM email_identities WHERE domain_id = ? AND organization_id = ? AND is_default = 1 AND status = 'ACTIVE'"
    ).bind(customDomain.id, organizationId).first();

    if (customIdentity) {
      return { from: customIdentity.email_address, fallbackApplied: false };
    }
  }

  // 2. Ensure FeraSetu managed domain exists and get default identity
  await ensureMerchantEmailProvisioning(db, organizationId, storeSlug, orgName);

  const ferasetuDomain = await db.prepare(
    "SELECT * FROM email_domains WHERE organization_id = ? AND domain_type = 'FERASETU_MERCHANT'"
  ).bind(organizationId).first();

  const defaultIdentity = await db.prepare(
    "SELECT * FROM email_identities WHERE organization_id = ? AND is_default = 1 AND status = 'ACTIVE'"
  ).bind(organizationId).first();

  if (defaultIdentity) {
    return { from: defaultIdentity.email_address, fallbackApplied: customDomain ? true : false, fallbackReason: customDomain ? 'CUSTOM_DOMAIN_UNVERIFIED' : null };
  }

  // Fallback to auto-generated
  const autoFrom = `orders@${storeSlug}.ferasetu.com`;
  return { from: autoFrom, fallbackApplied: true, fallbackReason: 'AUTO_PROVISIONED' };
}

/**
 * Ensures a merchant has a default FeraSetu-managed domain, identity, and provider connection.
 */
export async function ensureMerchantEmailProvisioning(db, organizationId, storeSlug, orgName = 'Store') {
  if (!organizationId || !storeSlug) return null;

  const now = new Date().toISOString();
  const slug = String(storeSlug).trim().toLowerCase();
  const merchantDomain = `${slug}.${PLATFORM_DOMAIN}`;
  const defaultSenderEmail = `orders@${merchantDomain}`;

  // 1. Check or create email_domains record
  let domainRow = await db.prepare(
    "SELECT * FROM email_domains WHERE organization_id = ? AND domain_type = 'FERASETU_MERCHANT'"
  ).bind(organizationId).first();

  if (!domainRow) {
    const domainId = `dom_m_${organizationId}`;
    try {
      await db.prepare(`
        INSERT INTO email_domains (
          id, organization_id, domain, domain_type, verification_status,
          ownership_verification_method, verification_token_hash, dkim_selector,
          dkim_status, spf_status, dmarc_status, mail_from_status, provider,
          created_at, updated_at, verified_at, last_checked_at
        ) VALUES (?, ?, ?, 'FERASETU_MERCHANT', 'VERIFIED', 'AUTOMATIC_MANAGED', 'ferasetu_managed_token', 'fs1', 'VERIFIED', 'VERIFIED', 'VERIFIED', 'VERIFIED', 'FERASETU', ?, ?, ?, ?)
      `).bind(domainId, organizationId, merchantDomain, now, now, now, now).run();

      domainRow = { id: domainId, domain: merchantDomain, verification_status: 'VERIFIED' };
    } catch (err) {
      domainRow = await db.prepare("SELECT * FROM email_domains WHERE domain = ?").bind(merchantDomain).first();
    }
  }

  // 2. Check or create email_identities record
  let identityRow = await db.prepare(
    "SELECT * FROM email_identities WHERE organization_id = ? AND is_default = 1"
  ).bind(organizationId).first();

  if (!identityRow && domainRow) {
    const identityId = `ident_m_${organizationId}`;
    try {
      await db.prepare(`
        INSERT INTO email_identities (
          id, organization_id, domain_id, local_part, email_address,
          display_name, identity_type, status, is_default, created_at, updated_at
        ) VALUES (?, ?, ?, 'orders', ?, ?, 'MERCHANT', 'ACTIVE', 1, ?, ?)
      `).bind(identityId, organizationId, domainRow.id, defaultSenderEmail, orgName, now, now).run();

      identityRow = { id: identityId, email_address: defaultSenderEmail, is_default: 1 };
    } catch (err) {
      identityRow = await db.prepare("SELECT * FROM email_identities WHERE email_address = ?").bind(defaultSenderEmail).first();
    }
  }

  // 3. Ensure default email_provider_connections record
  let providerRow = await db.prepare(
    "SELECT * FROM email_provider_connections WHERE organization_id = ?"
  ).bind(organizationId).first();

  if (!providerRow) {
    const providerId = `epc_${organizationId}`;
    try {
      await db.prepare(`
        INSERT INTO email_provider_connections (
          id, organization_id, provider_type, security_mode, status, created_at, updated_at
        ) VALUES (?, ?, 'FERASETU', 'STARTTLS', 'ACTIVE', ?, ?)
      `).bind(providerId, organizationId, now, now).run();
    } catch {}
  }

  return { domainRow, identityRow };
}

/**
 * Core internal dispatch method used by all facade methods.
 */
async function dispatchEmail(env, options) {
  const {
    organizationId = null,
    senderIdentityId = null,
    from = null,
    to,
    replyTo = null,
    subject: optSubject,
    html: optHtml,
    text: optText,
    templateKey = null,
    templateData = {},
    locale = 'en',
    branding = {},
    isPlatform = false,
    idempotencyKey = null,
    priority = 'NORMAL',
    customHeaders = {},
    storeSlug = null,
    orgName = null,
    logFallbackEvent = false
  } = options;

  if (!to || typeof to !== 'string' || !to.includes('@')) {
    throw new Error('Valid recipient email (to) is required');
  }

  const cleanTo = sanitizeHeaderValue(to.toLowerCase());
  if (from) sanitizeHeaderValue(from);
  if (replyTo) sanitizeHeaderValue(replyTo);
  if (optSubject) sanitizeHeaderValue(optSubject);
  if (customHeaders && typeof customHeaders === 'object') {
    for (const [k, v] of Object.entries(customHeaders)) {
      sanitizeHeaderValue(String(k));
      sanitizeHeaderValue(String(v));
    }
  }

  // Validate template variables if templateKey provided
  if (templateKey) {
    const validation = validateTemplateVariables(templateKey, templateData);
    if (!validation.valid) {
      throw new Error(validation.message);
    }
  }

  // 1. Check idempotency if key provided
  if (idempotencyKey) {
    const existing = await env.DB.prepare(
      "SELECT * FROM email_messages WHERE idempotency_key = ? AND (merchant_id = ? OR (merchant_id IS NULL AND ? = 1))"
    ).bind(idempotencyKey, organizationId, isPlatform ? 1 : 0).first();

    if (existing) {
      return {
        success: true,
        messageId: existing.id,
        status: existing.status,
        duplicate: true,
        details: 'Idempotency key matched existing dispatched message'
      };
    }
  }

  // 2. Resolve Sender Identity and Provider Connection
  let resolvedFrom = '';
  let resolvedIdentityId = senderIdentityId;
  let resolvedProvider = 'FERASETU';
  let externalConnection = null;
  let fallbackApplied = false;
  let fallbackReason = null;

  if (isPlatform) {
    // Platform tenant path
    if (from) {
      const cleanFrom = sanitizeHeaderValue(from.toLowerCase());
      let isAllowed = ALLOWED_PLATFORM_SENDERS.has(cleanFrom);
      if (!isAllowed && env?.DB) {
        try {
          const dbSender = await env.DB.prepare(
            "SELECT id FROM email_identities WHERE email_address = ? AND identity_type = 'PLATFORM' AND status = 'ACTIVE'"
          ).bind(cleanFrom).first();
          if (dbSender) isAllowed = true;
        } catch {}
      }
      if (!isAllowed) {
        throw new Error(`Unauthorized platform sender: ${cleanFrom}. Allowed senders: ${Array.from(ALLOWED_PLATFORM_SENDERS).join(', ')}`);
      }
      resolvedFrom = cleanFrom;
    } else {
      resolvedFrom = 'no-reply@ferasetu.com';
    }

    const platformIdent = await env.DB.prepare(
      "SELECT id FROM email_identities WHERE email_address = ? AND identity_type = 'PLATFORM'"
    ).bind(resolvedFrom).first();
    resolvedIdentityId = platformIdent?.id || 'ident_platform_noreply';
  } else {
    // Merchant tenant path
    // A. Check provider connection
    const connRow = await env.DB.prepare(
      "SELECT * FROM email_provider_connections WHERE organization_id = ?"
    ).bind(organizationId).first();

    if (connRow && connRow.provider_type === 'EXTERNAL_SMTP') {
      resolvedProvider = 'EXTERNAL_SMTP';
      externalConnection = connRow;
    }

    // B. Resolve merchant identity
    let identRow = null;
    if (resolvedIdentityId) {
      identRow = await env.DB.prepare(`
        SELECT ei.*, ed.verification_status 
        FROM email_identities ei
        JOIN email_domains ed ON ei.domain_id = ed.id
        WHERE ei.id = ? AND ei.organization_id = ?
      `).bind(resolvedIdentityId, organizationId).first();
    } else if (from) {
      const cleanFrom = sanitizeHeaderValue(from.toLowerCase());
      identRow = await env.DB.prepare(`
        SELECT ei.*, ed.verification_status 
        FROM email_identities ei
        JOIN email_domains ed ON ei.domain_id = ed.id
        WHERE ei.email_address = ? AND ei.organization_id = ?
      `).bind(cleanFrom, organizationId).first();
    } else {
      // Use the safe sender resolution with fallback logic
      const effectiveSlug = storeSlug || organizationId;
      const effectiveOrgName = orgName || branding?.storeName || 'Store';
      const senderRes = await resolveMerchantSender(env.DB, organizationId, effectiveSlug, effectiveOrgName);
      resolvedFrom = senderRes.from;
      fallbackApplied = senderRes.fallbackApplied;
      fallbackReason = senderRes.fallbackReason;

      const finalIdent = await env.DB.prepare(`
        SELECT ei.*, ed.verification_status 
        FROM email_identities ei
        JOIN email_domains ed ON ei.domain_id = ed.id
        WHERE ei.email_address = ? AND ei.organization_id = ?
      `).bind(resolvedFrom, organizationId).first();

      if (finalIdent) {
        resolvedIdentityId = finalIdent.id;
      }
    }

    if (!identRow && !from && !resolvedIdentityId && !resolvedFrom) {
      await ensureMerchantEmailProvisioning(env.DB, organizationId, organizationId, 'Store');
      identRow = await env.DB.prepare(`
        SELECT ei.*, ed.verification_status 
        FROM email_identities ei
        JOIN email_domains ed ON ei.domain_id = ed.id
        WHERE ei.organization_id = ? AND ei.is_default = 1
      `).bind(organizationId).first();
    }

    if (!identRow && !resolvedFrom) {
      throw new Error(`No authorized email identity found for merchant ${organizationId}. Please complete email settings.`);
    }

    if (identRow && identRow.verification_status !== 'VERIFIED') {
      throw new Error(`Cannot send from domain ${identRow.email_address}: Domain verification status is ${identRow.verification_status}`);
    }

    if (identRow) {
      resolvedFrom = identRow.email_address;
      resolvedIdentityId = identRow.id;
    }

    // C. Quota enforcement for merchants (Platform never consumes merchant quota)
    const quotaRes = await checkAndConsumeEmailQuota(env.DB, organizationId);
    if (!quotaRes.allowed) {
      throw new Error(`Daily email quota exhausted (${quotaRes.sentToday}/${quotaRes.dailyLimit}). Upgrade plan or purchase extra quota.`);
    }
  }

  // 3. Render content or templates
  let finalSubject = optSubject || '';
  let finalHtml = optHtml || '';
  let finalText = optText || '';

  if (templateKey) {
    const rendered = renderEmailTemplate({
      templateKey,
      locale,
      data: templateData,
      branding,
      isPlatform
    });
    finalSubject = optSubject || rendered.subject;
    finalHtml = optHtml || rendered.html;
    finalText = optText || rendered.text;
  } else if (optSubject || optHtml || optText) {
    // Raw content provided
    finalSubject = optSubject;
    finalHtml = optHtml;
    finalText = optText;
  } else {
    throw new Error('Either templateKey or raw content (subject/html/text) must be provided');
  }

  finalSubject = sanitizeHeaderValue(finalSubject);
  const cleanReplyTo = replyTo ? sanitizeHeaderValue(replyTo) : null;

  // Filter safe custom headers
  const safeHeaders = {};
  if (customHeaders && typeof customHeaders === 'object') {
    for (const [k, v] of Object.entries(customHeaders)) {
      const lowerK = k.toLowerCase().trim();
      if (SAFE_HEADER_ALLOWLIST.has(lowerK)) {
        safeHeaders[k] = sanitizeHeaderValue(String(v));
      }
    }
  }

  const messageId = `msg_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  // 4. Record pending message in email_messages
  try {
    await env.DB.prepare(`
      INSERT INTO email_messages (
        id, merchant_id, sender_identity_id, provider, to_address,
        reply_to, subject, status, idempotency_key, priority, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?)
    `).bind(
      messageId, organizationId, resolvedIdentityId, resolvedProvider,
      cleanTo, cleanReplyTo, finalSubject, idempotencyKey, priority, now, now
    ).run();
  } catch (insertErr) {
    console.warn("[EmailService] Message record insert note:", insertErr?.message);
  }

  // 5. Dispatch delivery with retry logic
  let deliveryResult = { success: false, status: 'FAILED' };
  let lastError = null;

  // Retry configuration
  const maxRetries = 5;
  let attempt = 0;

  async function attemptDelivery() {
    if (resolvedProvider === 'EXTERNAL_SMTP' && externalConnection) {
      // Decrypt external SMTP password
      const masterKey = env?.ENCRYPTION_SECRET || env?.ADMIN_JWT_SECRET;
      const decryptedPassword = await decryptSecret(externalConnection.encrypted_secret_reference, masterKey);

      return await sendViaExternalSmtp({
        connection: {
          ...externalConnection,
          password: decryptedPassword
        },
        message: {
          from: resolvedFrom,
          to: cleanTo,
          replyTo: cleanReplyTo,
          subject: finalSubject,
          html: finalHtml,
          text: finalText
        }
      });
    } else {
      // Dispatch via FeraSetu SMTP Infrastructure (Modal Postfix gateway)
      const smtpUrl = env?.FERASETU_SMTP_SERVICE_URL || 'https://singhantima203--ferasetu-smtp-web-gateway.modal.run';
      const smtpKey = env?.FERASETU_SMTP_API_KEY || '';

      if (smtpKey && smtpUrl) {
        try {
          const res = await fetch(`${smtpUrl.replace(/\/+$/, '')}/v1/email/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${smtpKey}`
            },
            body: JSON.stringify({
              scope: isPlatform ? 'PLATFORM' : 'MERCHANT',
              tenantId: isPlatform ? PLATFORM_TENANT_ID : organizationId,
              merchantId: isPlatform ? undefined : organizationId,
              from: resolvedFrom,
              to: cleanTo,
              subject: finalSubject,
              html: finalHtml,
              text: finalText,
              replyTo: cleanReplyTo,
              priority: priority || 'NORMAL',
              idempotencyKey: idempotencyKey || messageId,
              customHeaders: safeHeaders
            })
          });

          if (res.ok) {
            const respData = await res.json();
            return {
              success: true,
              messageId: respData.messageId || messageId,
              status: respData.status || 'SENT',
              provider: 'FERASETU'
            };
          } else {
            const errText = await res.text();
            console.error('[EmailService] FeraSetu SMTP error:', res.status, errText);
            // Classify the failure for retry decision
            const category = classifySmtpFailure(
              new Error(errText),
              { status: res.status, body: errText }
            );
            return {
              success: false,
              status: 'FAILED',
              details: `FeraSetu SMTP [${res.status}]: ${errText}`,
              _retryCategory: category
            };
          }
        } catch (fetchErr) {
          console.warn('[EmailService] Network error to FeraSetu SMTP gateway:', fetchErr?.message);
          // Network errors are transient
          const category = classifySmtpFailure(fetchErr);
          return {
            success: false,
            status: 'FAILED',
            details: `Network error: ${fetchErr?.message}`,
            _retryCategory: category
          };
        }
      } else {
        // No SMTP key configured (dev / test mode)
        return {
          success: true,
          messageId,
          status: 'SENT',
          provider: 'FERASETU',
          details: 'Delivered via local simulation'
        };
      }
    }
  }

  // Retry loop
  while (attempt <= maxRetries) {
    const result = await attemptDelivery();
    
    if (result.success) {
      deliveryResult = result;
      break;
    }

    // Check if we should retry
    const category = result._retryCategory || classifySmtpFailure(new Error(result.details || 'Unknown error'));
    const shouldRetryCategory = shouldRetry(category);
    const maxRetriesForCategory = MAX_RETRIES_BY_CATEGORY[category] ?? maxRetries;

    if (!shouldRetryCategory || attempt >= maxRetriesForCategory) {
      deliveryResult = result;
      lastError = new Error(result.details || 'Delivery failed');
      break;
    }

    attempt++;
    const delay = calculateBackoffDelay(attempt - 1);
    console.log(`[EmailService] Delivery failed (attempt ${attempt}/${maxRetriesForCategory}), retrying in ${delay}ms. Category: ${category}`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // If all retries exhausted, mark for dead-letter queue
  if (!deliveryResult.success && attempt > 0) {
    console.error(`[EmailService] All retry attempts exhausted for message ${messageId}. Category: ${classifySmtpFailure(lastError)}`);
    // Could enqueue to DLQ here if Cloudflare Queues is configured
  }

  // 6. Update message status and log event
  const finalStatus = deliveryResult.success ? (deliveryResult.status || 'SENT') : 'FAILED';
  const updatedNow = new Date().toISOString();

  try {
    await env.DB.prepare(
      "UPDATE email_messages SET status = ?, updated_at = ? WHERE id = ?"
    ).bind(finalStatus, updatedNow, messageId).run();

    const eventId = `evt_${crypto.randomUUID()}`;
    await env.DB.prepare(`
      INSERT INTO email_events (
        id, message_id, merchant_id, event_type, provider_status,
        recipient, timestamp, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      eventId, messageId, organizationId, finalStatus,
      deliveryResult.details || finalStatus, cleanTo, updatedNow,
      JSON.stringify({ from: resolvedFrom, provider: resolvedProvider, priority, fallbackApplied, fallbackReason })
    ).run();

    // Log fallback event if applicable
    if (logFallbackEvent && fallbackApplied) {
      const fallbackEventId = `evt_${crypto.randomUUID()}`;
      await env.DB.prepare(`
        INSERT INTO email_events (
          id, message_id, merchant_id, event_type, provider_status,
          recipient, timestamp, metadata
        ) VALUES (?, ?, ?, 'DOMAIN_FALLBACK_APPLIED', ?, ?, ?, ?)
      `).bind(
        fallbackEventId, messageId, organizationId,
        fallbackReason || 'UNKNOWN', cleanTo, updatedNow,
        JSON.stringify({ from: resolvedFrom, fallbackReason })
      ).run();
    }
  } catch (logErr) {
    console.warn("[EmailService] Logging update notice:", logErr?.message);
  }

  return {
    success: deliveryResult.success,
    messageId,
    status: finalStatus,
    from: resolvedFrom,
    to: cleanTo,
    provider: resolvedProvider,
    fallbackApplied,
    fallbackReason
  };
}

/**
 * Renders built-in transactional templates for legacy send() caller compatibility.
 */
function renderTemplate(templateName, data = {}) {
  switch (templateName) {
    case 'ORDER_OTP': {
      const { otp, customerName, brandName, orderId, invoiceNumber, total, items = [] } = data;
      const safeBrand = escapeHtml(brandName || 'FeraSetu Store');
      const safeCustomer = escapeHtml(customerName || 'Customer');
      const subject = `Order Verification Code: ${otp} • ${safeBrand}`;

      const itemListHtml = items.map(item => `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #334155; font-size: 14px;">
            ${escapeHtml(item.name || item.title || 'Product')}
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; text-align: center; color: #64748b; font-size: 14px;">
            x${item.quantity || 1}
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 700; color: #0f172a; font-size: 14px;">
            ₹${Number(item.total || (item.price * (item.quantity || 1)) || 0).toLocaleString('en-IN')}
          </td>
        </tr>
      `).join('');

      const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
    <div style="background: #0052FF; color: #ffffff; padding: 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 20px; font-weight: 800;">${safeBrand}</h1>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #e0e7ff;">Order Verification Code</p>
    </div>
    <div style="padding: 32px 24px;">
      <p style="font-size: 15px; color: #334155; margin-top: 0;">Hello <strong>${safeCustomer}</strong>,</p>
      <p style="font-size: 14px; color: #64748b;">Thank you for your order! Please share this single-use code upon delivery/pickup:</p>
      <div style="background: #eff6ff; border: 2px dashed #93c5fd; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
        <div style="font-size: 36px; font-weight: 900; letter-spacing: 6px; color: #0052FF; font-family: monospace;">${otp}</div>
        <p style="margin: 6px 0 0 0; font-size: 12px; color: #ef4444; font-weight: 600;">Valid for 15 minutes</p>
      </div>
      <div style="font-size: 13px; color: #64748b; margin-bottom: 8px;">Order: <strong>${escapeHtml(orderId)}</strong> | Invoice: <strong>${escapeHtml(invoiceNumber)}</strong></div>
      <table style="width: 100%; border-collapse: collapse; margin-top: 12px;"><tbody>${itemListHtml}</tbody></table>
      <div style="margin-top: 16px; padding-top: 12px; border-top: 2px solid #0052FF; text-align: right; font-size: 16px; font-weight: 900; color: #0f172a;">
        Total: ₹${Number(total || 0).toLocaleString('en-IN')}
      </div>
    </div>
    <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 24px; text-align: center; font-size: 11px; color: #94a3b8;">
      Powered by FeraSetu Email Infrastructure
    </div>
  </div>
</body>
</html>`;

      const text = `Hello ${customerName || 'Customer'},\nYour order verification code for ${brandName || 'FeraSetu Store'} is: ${otp}\nOrder: ${orderId}\nTotal: ₹${total}`;
      return { subject, html, text };
    }

    case 'PASSWORD_RESET': {
      const { resetUrl, customerName } = data;
      const subject = 'Reset your FeraSetu account password';
      const html = `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #0052FF;">Reset Your Password</h2>
          <p>Hello ${escapeHtml(customerName || 'User')},</p>
          <p>We received a request to reset your password. Click the button below to proceed:</p>
          <p><a href="${escapeHtml(resetUrl)}" style="background: #0052FF; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Reset Password</a></p>
          <p style="color: #64748b; font-size: 12px;">If you did not request this, please ignore this email.</p>
        </div>`;
      const text = `Reset your password by following this link: ${resetUrl}`;
      return { subject, html, text };
    }

    default:
      if (EMAIL_TEMPLATES && EMAIL_TEMPLATES[templateName]) {
        return renderEmailTemplate({
          templateKey: templateName,
          locale: data.locale || 'en',
          data,
          branding: data.branding || {},
          isPlatform: false
        });
      }
      return {
        subject: data.subject || 'FeraSetu Notification',
        html: data.html || `<p>${escapeHtml(data.text || '')}</p>`,
        text: data.text || ''
      };
  }
}

/**
 * Central Email Service dispatcher - legacy method for backward compatibility.
 */
export class EmailService {
  /**
   * Dispatches an email transactionally (legacy API).
   */
  static async send(env, options) {
    const {
      organizationId = null,
      senderIdentityId = null,
      from = null,
      to,
      replyTo = null,
      subject: optSubject,
      html: optHtml,
      text: optText,
      template = null,
      data = {},
      idempotencyKey = null,
      priority = 'NORMAL',
      customHeaders = {}
    } = options;

    if (!to || typeof to !== 'string' || !to.includes('@')) {
      throw new Error('Valid recipient email (to) is required');
    }

    const cleanTo = sanitizeHeaderValue(to.toLowerCase());
    if (from) sanitizeHeaderValue(from);
    if (replyTo) sanitizeHeaderValue(replyTo);
    if (optSubject) sanitizeHeaderValue(optSubject);
    if (customHeaders && typeof customHeaders === 'object') {
      for (const [k, v] of Object.entries(customHeaders)) {
        sanitizeHeaderValue(String(k));
        sanitizeHeaderValue(String(v));
      }
    }

    const isPlatform = !organizationId || organizationId === PLATFORM_TENANT_ID;

    // 1. Check idempotency if key provided
    if (idempotencyKey) {
      const existing = await env.DB.prepare(
        "SELECT * FROM email_messages WHERE idempotency_key = ? AND (merchant_id = ? OR (merchant_id IS NULL AND ? = 1))"
      ).bind(idempotencyKey, organizationId, isPlatform ? 1 : 0).first();

      if (existing) {
        return {
          success: true,
          messageId: existing.id,
          status: existing.status,
          duplicate: true,
          details: 'Idempotency key matched existing dispatched message'
        };
      }
    }

    // 2. Resolve Sender Identity and Provider Connection
    let resolvedFrom = '';
    let resolvedIdentityId = senderIdentityId;
    let resolvedProvider = 'FERASETU';
    let externalConnection = null;

    if (isPlatform) {
      // Platform tenant path
      if (from) {
        const cleanFrom = sanitizeHeaderValue(from.toLowerCase());
        let isAllowed = ALLOWED_PLATFORM_SENDERS.has(cleanFrom);
        if (!isAllowed && env?.DB) {
          try {
            const dbSender = await env.DB.prepare(
              "SELECT id FROM email_identities WHERE email_address = ? AND identity_type = 'PLATFORM' AND status = 'ACTIVE'"
            ).bind(cleanFrom).first();
            if (dbSender) isAllowed = true;
          } catch {}
        }
        if (!isAllowed) {
          throw new Error(`Unauthorized platform sender: ${cleanFrom}. Allowed senders: ${Array.from(ALLOWED_PLATFORM_SENDERS).join(', ')}`);
        }
        resolvedFrom = cleanFrom;
      } else {
        resolvedFrom = 'no-reply@ferasetu.com';
      }

      const platformIdent = await env.DB.prepare(
        "SELECT id FROM email_identities WHERE email_address = ? AND identity_type = 'PLATFORM'"
      ).bind(resolvedFrom).first();
      resolvedIdentityId = platformIdent?.id || 'ident_platform_noreply';
    } else {
      // Merchant tenant path
      // A. Check provider connection
      const connRow = await env.DB.prepare(
        "SELECT * FROM email_provider_connections WHERE organization_id = ?"
      ).bind(organizationId).first();

      if (connRow && connRow.provider_type === 'EXTERNAL_SMTP') {
        resolvedProvider = 'EXTERNAL_SMTP';
        externalConnection = connRow;
      }

      // B. Resolve merchant identity
      let identRow = null;
      if (resolvedIdentityId) {
        identRow = await env.DB.prepare(`
          SELECT ei.*, ed.verification_status 
          FROM email_identities ei
          JOIN email_domains ed ON ei.domain_id = ed.id
          WHERE ei.id = ? AND ei.organization_id = ?
        `).bind(resolvedIdentityId, organizationId).first();
      } else if (from) {
        const cleanFrom = sanitizeHeaderValue(from.toLowerCase());
        identRow = await env.DB.prepare(`
          SELECT ei.*, ed.verification_status 
          FROM email_identities ei
          JOIN email_domains ed ON ei.domain_id = ed.id
          WHERE ei.email_address = ? AND ei.organization_id = ?
        `).bind(cleanFrom, organizationId).first();
      } else {
        // Pick default verified identity
        identRow = await env.DB.prepare(`
          SELECT ei.*, ed.verification_status 
          FROM email_identities ei
          JOIN email_domains ed ON ei.domain_id = ed.id
          WHERE ei.organization_id = ? AND ei.is_default = 1
        `).bind(organizationId).first();
      }

      if (!identRow && !from && !resolvedIdentityId) {
        await ensureMerchantEmailProvisioning(env.DB, organizationId, organizationId, 'Store');
        identRow = await env.DB.prepare(`
          SELECT ei.*, ed.verification_status 
          FROM email_identities ei
          JOIN email_domains ed ON ei.domain_id = ed.id
          WHERE ei.organization_id = ? AND ei.is_default = 1
        `).bind(organizationId).first();
      }

      if (!identRow) {
        throw new Error(`No authorized email identity found for merchant ${organizationId}. Please complete email settings.`);
      }

      if (identRow.verification_status !== 'VERIFIED') {
        throw new Error(`Cannot send from domain ${identRow.email_address}: Domain verification status is ${identRow.verification_status}`);
      }

      resolvedFrom = identRow.email_address;
      resolvedIdentityId = identRow.id;

      // C. Quota enforcement for merchants (Platform never consumes merchant quota)
      const quotaRes = await checkAndConsumeEmailQuota(env.DB, organizationId);
      if (!quotaRes.allowed) {
        throw new Error(`Daily email quota exhausted (${quotaRes.sentToday}/${quotaRes.dailyLimit}). Upgrade plan or purchase extra quota.`);
      }
    }

    // 3. Render content or templates
    let finalSubject = optSubject || '';
    let finalHtml = optHtml || '';
    let finalText = optText || '';

    if (template) {
      const rendered = renderTemplate(template, data);
      finalSubject = optSubject || rendered.subject;
      finalHtml = optHtml || rendered.html;
      finalText = optText || rendered.text;
    }

    finalSubject = sanitizeHeaderValue(finalSubject);
    const cleanReplyTo = replyTo ? sanitizeHeaderValue(replyTo) : null;

    // Filter safe custom headers
    const safeHeaders = {};
    if (customHeaders && typeof customHeaders === 'object') {
      for (const [k, v] of Object.entries(customHeaders)) {
        const lowerK = k.toLowerCase().trim();
        if (SAFE_HEADER_ALLOWLIST.has(lowerK)) {
          safeHeaders[k] = sanitizeHeaderValue(String(v));
        }
      }
    }

    const messageId = `msg_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    // 4. Record pending message in email_messages
    try {
      await env.DB.prepare(`
        INSERT INTO email_messages (
          id, merchant_id, sender_identity_id, provider, to_address,
          reply_to, subject, status, idempotency_key, priority, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?)
      `).bind(
        messageId, organizationId, resolvedIdentityId, resolvedProvider,
        cleanTo, cleanReplyTo, finalSubject, idempotencyKey, priority, now, now
      ).run();
    } catch (insertErr) {
      console.warn("[EmailService] Message record insert note:", insertErr?.message);
    }

    // 5. Dispatch delivery
    let deliveryResult = { success: false, status: 'FAILED' };

    if (resolvedProvider === 'EXTERNAL_SMTP' && externalConnection) {
      // Decrypt external SMTP password
      const masterKey = env?.ENCRYPTION_SECRET || env?.ADMIN_JWT_SECRET;
      const decryptedPassword = await decryptSecret(externalConnection.encrypted_secret_reference, masterKey);

      deliveryResult = await sendViaExternalSmtp({
        connection: {
          ...externalConnection,
          password: decryptedPassword
        },
        message: {
          from: resolvedFrom,
          to: cleanTo,
          replyTo: cleanReplyTo,
          subject: finalSubject,
          html: finalHtml,
          text: finalText
        }
      });
    } else {
      // Dispatch via FeraSetu SMTP Infrastructure (Modal Postfix gateway)
      const smtpUrl = env?.FERASETU_SMTP_SERVICE_URL || 'https://singhantima203--ferasetu-smtp-web-gateway.modal.run';
      const smtpKey = env?.FERASETU_SMTP_API_KEY || '';

      if (smtpKey && smtpUrl) {
        try {
          const res = await fetch(`${smtpUrl.replace(/\/+$/, '')}/v1/email/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${smtpKey}`
            },
            body: JSON.stringify({
              scope: isPlatform ? 'PLATFORM' : 'MERCHANT',
              tenantId: isPlatform ? PLATFORM_TENANT_ID : organizationId,
              merchantId: isPlatform ? undefined : organizationId,
              from: resolvedFrom,
              to: cleanTo,
              subject: finalSubject,
              html: finalHtml,
              text: finalText,
              replyTo: cleanReplyTo,
              priority: priority || 'NORMAL',
              idempotencyKey: idempotencyKey || messageId,
              customHeaders: safeHeaders
            })
          });

          if (res.ok) {
            const respData = await res.json();
            deliveryResult = {
              success: true,
              messageId: respData.messageId || messageId,
              status: respData.status || 'SENT',
              provider: 'FERASETU'
            };
          } else {
            const errText = await res.text();
            console.error('[EmailService] FeraSetu SMTP error:', res.status, errText);
            deliveryResult = {
              success: false,
              status: 'FAILED',
              details: `FeraSetu SMTP [${res.status}]: ${errText}`
            };
          }
        } catch (fetchErr) {
          console.warn('[EmailService] Network error to FeraSetu SMTP gateway:', fetchErr?.message);
          // Fallback simulation in dev/offline
          deliveryResult = {
            success: true,
            messageId,
            status: 'SENT',
            provider: 'FERASETU',
            details: 'Delivered via simulated fallback (gateway unreachable)'
          };
        }
      } else {
        // No SMTP key configured (dev / test mode)
        deliveryResult = {
          success: true,
          messageId,
          status: 'SENT',
          provider: 'FERASETU',
          details: 'Delivered via local simulation'
        };
      }
    }

    // 6. Update message status and log event
    const finalStatus = deliveryResult.success ? (deliveryResult.status || 'SENT') : 'FAILED';
    const updatedNow = new Date().toISOString();

    try {
      await env.DB.prepare(
        "UPDATE email_messages SET status = ?, updated_at = ? WHERE id = ?"
      ).bind(finalStatus, updatedNow, messageId).run();

      const eventId = `evt_${crypto.randomUUID()}`;
      await env.DB.prepare(`
        INSERT INTO email_events (
          id, message_id, merchant_id, event_type, provider_status,
          recipient, timestamp, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        eventId, messageId, organizationId, finalStatus,
        deliveryResult.details || finalStatus, cleanTo, updatedNow,
        JSON.stringify({ from: resolvedFrom, provider: resolvedProvider, priority })
      ).run();
    } catch (logErr) {
      console.warn("[EmailService] Logging update notice:", logErr?.message);
    }

    return {
      success: deliveryResult.success,
      messageId,
      status: finalStatus,
      from: resolvedFrom,
      to: cleanTo,
      provider: resolvedProvider
    };
  }

  /**
   * Send platform email (system emails from FeraSetu).
   * Uses platform sender identities, bypasses merchant quota.
   */
  static async sendPlatformEmail(env, {
    event,
    to,
    templateKey,
    locale = 'en',
    data = {},
    idempotencyKey = null,
    priority = 'NORMAL',
    from = null,
    replyTo = null
  }) {
    // Map event to template key if not provided
    const resolvedTemplateKey = templateKey || event;
    
    // Generate deterministic idempotency key if not provided
    const finalIdempotencyKey = idempotencyKey || `${event}:${to}:${JSON.stringify(data)}`.slice(0, 128);
    
    // Platform branding
    const branding = {
      storeName: 'FeraSetu',
      logoUrl: null,
      primaryColor: '#0052FF',
      secondaryColor: '#64748b',
      storeUrl: 'https://ferasetu.com',
      supportEmail: 'support@ferasetu.com'
    };

    return dispatchEmail(env, {
      organizationId: PLATFORM_TENANT_ID,
      to,
      templateKey: resolvedTemplateKey,
      templateData: data,
      locale,
      branding,
      isPlatform: true,
      idempotencyKey: finalIdempotencyKey,
      priority,
      from,
      replyTo,
      logFallbackEvent: false
    });
  }

  /**
   * Send merchant email (merchant-to-merchant / internal notices).
   * Resolves merchant provider and sender identity, checks merchant quota.
   */
  static async sendMerchantEmail(env, {
    organizationId,
    to,
    templateKey,
    locale = 'en',
    data = {},
    idempotencyKey = null,
    priority = 'NORMAL',
    replyTo = null,
    storeSlug = null,
    orgName = 'Store'
  }) {
    const finalIdempotencyKey = idempotencyKey || `merchant_${templateKey}:${to}:${Date.now()}`.slice(0, 128);
    
    // Build merchant branding
    const branding = await buildMerchantBranding(env.DB, organizationId);

    return dispatchEmail(env, {
      organizationId,
      to,
      templateKey,
      templateData: data,
      locale,
      branding,
      isPlatform: false,
      idempotencyKey: finalIdempotencyKey,
      priority,
      replyTo,
      storeSlug,
      orgName,
      logFallbackEvent: true
    });
  }

  /**
   * Send customer email (customer-facing transactional mail).
   * Injects merchant store branding, resolves merchant identity with safe fallback.
   * Customer NEVER sees or accesses merchant SMTP credentials.
   */
  static async sendCustomerEmail(env, {
    organizationId,
    customerEmail,
    templateKey,
    locale = 'en',
    data = {},
    idempotencyKey = null,
    priority = 'NORMAL',
    replyTo = null,
    storeSlug = null,
    orgName = 'Store'
  }) {
    const finalIdempotencyKey = idempotencyKey || `customer_${templateKey}:${customerEmail}:${Date.now()}`.slice(0, 128);
    
    // Build merchant branding
    const branding = await buildMerchantBranding(env.DB, organizationId);

    return dispatchEmail(env, {
      organizationId,
      to: customerEmail,
      templateKey,
      templateData: data,
      locale,
      branding,
      isPlatform: false,
      idempotencyKey: finalIdempotencyKey,
      priority,
      replyTo,
      storeSlug,
      orgName,
      logFallbackEvent: true
    });
  }
}