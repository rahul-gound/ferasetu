/**
 * FeraSetu Domain Service Layer
 * =============================================================================
 * Orchestrates multi-tenant domain operations for merchant organizations:
 * - Domain search & availability
 * - Server-side authoritative pricing (+18% GST rounding)
 * - Cashfree payment order creation & anti-tampering validation
 * - Payment verification & D1 domain provisioning
 * - DNS instructions generation & DoH verification
 * - Disconnect / deletion with strict tenant isolation
 * - Storefront edge custom domain resolution
 * =============================================================================
 */

import { createDomainProvider, getDomainProvider } from './domainProvider.js';
import { normalizeDomain, generateDnsInstructions, verifyDomainDns, DEFAULT_DKIM_SELECTOR } from './dnsVerification.js';
import { createCashfreeService, getCashfreeCredentials } from './cashfreeService.js';

export class DomainService {
  constructor(env = {}) {
    this.env = env;
    this.provider = getDomainProvider(env);
    this.cashfree = createCashfreeService(env);
  }

  getProvider() {
    return this.provider;
  }

  /**
   * Searches domain suggestions and availability.
   */
  async search(query) {
    return await this.provider.search(query);
  }

  async searchDomains(query) {
    return await this.search(query);
  }

  static async searchDomains(query, env) {
    const provider = getDomainProvider(env);
    return await provider.search(query);
  }

  /**
   * Retrieves authoritative pricing for a domain.
   */
  async getPricing(domain) {
    return await this.provider.getAuthoritativePricing(domain);
  }

  async getAuthoritativePricing(domain) {
    return await this.getPricing(domain);
  }

  static async getPricing(domain, env) {
    const provider = getDomainProvider(env);
    return await provider.getAuthoritativePricing(domain);
  }

  /**
   * Checks domain availability.
   */
  async checkAvailability(domain) {
    return await this.provider.checkAvailability(domain);
  }

  static async checkAvailability(domain, env) {
    const provider = getDomainProvider(env);
    return await provider.checkAvailability(domain);
  }

  /**
   * Initiates domain purchase with server-authoritative price validation.
   */
  async initiatePurchase({ organizationId, domain, years = 1, clientAmount, db, customerDetails = {}, user }) {
    const database = db || this.env?.DB;
    
    // 1. Authoritative price & availability validation via DomainProvider
    const purchaseIntent = await this.provider.initiatePurchase({
      domain,
      years,
      clientAmount,
      organizationId,
      db: database
    });

    // 2. If Cashfree credentials exist, create official payment order
    let cashfreeSessionId = purchaseIntent.paymentSessionId;
    let cfOrderId = purchaseIntent.orderId;

    try {
      const creds = this.cashfree.getCredentials();
      if (creds.isValid) {
        const cfOrder = await this.cashfree.createOrder({
          orderId: cfOrderId,
          orderAmount: purchaseIntent.amount,
          orderCurrency: 'INR',
          customerDetails: {
            customer_id: organizationId || user?.id || 'merchant',
            customer_email: customerDetails.email || user?.email || 'billing@ferasetu.com',
            customer_phone: customerDetails.phone || user?.phone || '9999999999',
          },
          orderMeta: {
            return_url: `https://ferasetu.com/settings/email?tab=domains&order_id=${cfOrderId}`,
          },
          orderNote: `Domain registration for ${purchaseIntent.domain} (${years} yr)`
        });
        if (cfOrder?.payment_session_id) {
          cashfreeSessionId = cfOrder.payment_session_id;
        }
      }
    } catch (cfErr) {
      console.warn('[DomainService] Cashfree order init fallback:', cfErr?.message);
    }

    // 3. Persist pending transaction in transactions table if available
    if (database && organizationId) {
      try {
        const now = new Date().toISOString();
        await database.prepare(`
          INSERT INTO transactions (
            id, user_id, organization_id, provider, provider_order_id,
            amount, currency, status, plan, billing_cycle, metadata, created_at, updated_at
          ) VALUES (?, ?, ?, 'cashfree', ?, ?, 'INR', 'pending', 'domain_purchase', 'yearly', ?, ?, ?)
        `).bind(
          `tx_${crypto.randomUUID()}`,
          user?.id || organizationId,
          organizationId,
          cfOrderId,
          purchaseIntent.amount,
          JSON.stringify({ domain: purchaseIntent.domain, years }),
          now,
          now
        ).run();
      } catch (txErr) {
        // Non-blocking transaction logging warning
        console.warn('[DomainService] Transaction record insert warning:', txErr?.message);
      }
    }

    return {
      orderId: cfOrderId,
      paymentSessionId: cashfreeSessionId,
      amount: purchaseIntent.amount,
      currency: 'INR',
      domain: purchaseIntent.domain,
      years,
      status: 'PAYMENT_PENDING'
    };
  }

  static async initiatePurchase({ organizationId, domain, years = 1, clientAmount, db, env, user, customerDetails }) {
    const service = new DomainService(env);
    return await service.initiatePurchase({
      organizationId,
      domain,
      years,
      clientAmount,
      db: db || env?.DB,
      user,
      customerDetails
    });
  }

  /**
   * Verifies domain purchase payment and provisions the domain.
   */
  async verifyPurchase({ organizationId, orderId, domain, db, cashfreeStatus }) {
    const database = db || this.env?.DB;
    let effectiveStatus = cashfreeStatus;

    if (!effectiveStatus) {
      const creds = this.cashfree.getCredentials();
      if (creds.isValid) {
        try {
          const cfData = await this.cashfree.getOrderStatus(orderId);
          effectiveStatus = cfData.order_status === 'PAID' ? 'PAID' : cfData.order_status;
        } catch {
          effectiveStatus = 'FAILED';
        }
      } else {
        effectiveStatus = 'PAID';
      }
    }

    // Update transaction record if DB available
    if (database && (effectiveStatus === 'PAID' || effectiveStatus === 'SUCCESS')) {
      try {
        const now = new Date().toISOString();
        await database.prepare(`
          UPDATE transactions SET status = 'completed', updated_at = ? WHERE provider_order_id = ?
        `).bind(now, orderId).run();
      } catch (txErr) {
        console.warn('[DomainService] Transaction update warning:', txErr?.message);
      }
    }

    return await this.provider.verifyPurchase({
      orderId,
      domain,
      organizationId,
      db: database,
      cashfreeStatus: effectiveStatus
    });
  }

  static async verifyPurchase({ organizationId, orderId, domain, db, env, cashfreeStatus = 'PAID' }) {
    const service = new DomainService(env);
    return await service.verifyPurchase({
      organizationId,
      orderId,
      domain,
      db: db || env?.DB,
      cashfreeStatus
    });
  }

  /**
   * Lists all domains belonging to an organization.
   */
  static async listDomains(db, organizationId) {
    if (!db || !organizationId) return [];
    const domains = await db.prepare(`
      SELECT * FROM email_domains
      WHERE organization_id = ?
      ORDER BY created_at DESC
    `).bind(organizationId).all();

    return domains.results || [];
  }

  async listDomains(organizationId, db) {
    return await DomainService.listDomains(db || this.env?.DB, organizationId);
  }

  /**
   * Connects an external custom domain.
   */
  static async connectExternalDomain(db, organizationId, rawDomain) {
    const norm = normalizeDomain(rawDomain);
    if (!norm.valid) {
      throw new Error(norm.error);
    }
    const domain = norm.domain;

    // Check if domain is already registered anywhere
    const existing = await db.prepare('SELECT * FROM email_domains WHERE domain = ?').bind(domain).first();
    if (existing) {
      if (existing.organization_id === organizationId) {
        const instructions = generateDnsInstructions(domain, existing.verification_token_hash, existing.dkim_selector);
        return {
          success: true,
          domain: existing,
          dnsInstructions: instructions,
          instructions
        };
      }
      const err = new Error('This domain is already registered by another organization');
      err.status = 409;
      throw err;
    }

    const domainId = `dom_c_${crypto.randomUUID()}`;
    const token = `fera_verify_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
    const selector = DEFAULT_DKIM_SELECTOR;
    const now = new Date().toISOString();

    await db.prepare(`
      INSERT INTO email_domains (
        id, organization_id, domain, domain_type, verification_status,
        ownership_verification_method, verification_token_hash, dkim_selector,
        dkim_status, spf_status, dmarc_status, mail_from_status, provider,
        created_at, updated_at
      ) VALUES (?, ?, ?, 'CUSTOM', 'PENDING', 'DNS_TXT', ?, ?, 'PENDING', 'PENDING', 'PENDING', 'PENDING', 'FERASETU', ?, ?)
    `).bind(domainId, organizationId, domain, token, selector, now, now).run();

    const instructions = generateDnsInstructions(domain, token, selector);
    const created = await db.prepare('SELECT * FROM email_domains WHERE id = ?').bind(domainId).first();

    return {
      success: true,
      domain: created,
      dnsInstructions: instructions,
      instructions
    };
  }

  async connectExternalDomain(organizationId, rawDomain, db) {
    return await DomainService.connectExternalDomain(db || this.env?.DB, organizationId, rawDomain);
  }

  /**
   * Triggers DNS verification for a domain.
   */
  static async verifyDomain(db, organizationId, domainId) {
    const domainRow = await db.prepare(`
      SELECT * FROM email_domains WHERE id = ? AND organization_id = ?
    `).bind(domainId, organizationId).first();

    if (!domainRow) {
      const err = new Error('Domain not found or unauthorized');
      err.status = 404;
      throw err;
    }

    const verification = await verifyDomainDns(
      domainRow.domain,
      domainRow.verification_token_hash,
      domainRow.dkim_selector
    );

    const now = new Date().toISOString();
    const verifiedAt = verification.status === 'VERIFIED' ? now : null;

    await db.prepare(`
      UPDATE email_domains
      SET verification_status = ?, dkim_status = ?, spf_status = ?,
          dmarc_status = ?, mail_from_status = ?, last_checked_at = ?,
          verified_at = COALESCE(?, verified_at), updated_at = ?
      WHERE id = ? AND organization_id = ?
    `).bind(
      verification.status,
      verification.dkimStatus || verification.dkim,
      verification.spfStatus || verification.spf,
      verification.dmarcStatus || verification.dmarc,
      verification.mailFromStatus || verification.mailFrom,
      now,
      verifiedAt,
      now,
      domainId,
      organizationId
    ).run();

    // Auto-create orders@{domain} sender identity when domain becomes verified
    if (verification.status === 'VERIFIED') {
      const customEmail = `orders@${domainRow.domain}`;
      const existingIdent = await db.prepare(
        'SELECT id FROM email_identities WHERE email_address = ?'
      ).bind(customEmail).first();

      if (!existingIdent) {
        const identId = `ident_c_${crypto.randomUUID()}`;
        await db.prepare(`
          INSERT INTO email_identities (
            id, organization_id, domain_id, local_part, email_address,
            display_name, identity_type, status, is_default, created_at, updated_at
          ) VALUES (?, ?, ?, 'orders', ?, 'Store Orders', 'CUSTOM', 'ACTIVE', 0, ?, ?)
        `).bind(identId, organizationId, domainId, customEmail, now, now).run();
      }
    }

    const updated = await db.prepare('SELECT * FROM email_domains WHERE id = ?').bind(domainId).first();
    const instructions = generateDnsInstructions(domainRow.domain, domainRow.verification_token_hash, domainRow.dkim_selector);

    return {
      success: true,
      domain: updated,
      verification,
      dnsInstructions: instructions,
      instructions
    };
  }

  async verifyDomain(organizationId, domainId, db) {
    return await DomainService.verifyDomain(db || this.env?.DB, organizationId, domainId);
  }

  /**
   * Disconnects / deletes a custom domain.
   */
  static async disconnectDomain(db, organizationId, domainId) {
    const domain = await db.prepare(`
      SELECT * FROM email_domains WHERE id = ? AND organization_id = ?
    `).bind(domainId, organizationId).first();

    if (!domain) {
      const err = new Error('Domain not found or unauthorized');
      err.status = 404;
      throw err;
    }

    if (domain.domain_type === 'FERASETU_MERCHANT' || domain.domain_type === 'PLATFORM') {
      const err = new Error('Cannot disconnect platform or default FeraSetu subdomain');
      err.status = 400;
      throw err;
    }

    // Cascade delete associated identities
    await db.prepare('DELETE FROM email_identities WHERE domain_id = ? AND organization_id = ?').bind(domainId, organizationId).run();
    await db.prepare('DELETE FROM email_domains WHERE id = ? AND organization_id = ?').bind(domainId, organizationId).run();

    return { success: true, message: `Domain ${domain.domain} disconnected successfully` };
  }

  async disconnectDomain(organizationId, domainId, db) {
    return await DomainService.disconnectDomain(db || this.env?.DB, organizationId, domainId);
  }

  /**
   * Resolves incoming verified custom domain in D1 to merchant store and organization.
   * Used for storefront edge custom domain resolution.
   *
   * @param {object} db - D1 Database binding
   * @param {string} hostname - Incoming request hostname
   * @returns {Promise<{ domain: string, organizationId: string, storeSlug: string, shopId?: string, shopName?: string } | null>}
   */
  static async resolveCustomStorefront(db, hostname) {
    if (!hostname || !db) return null;
    const cleanHost = hostname.toLowerCase().trim();

    try {
      // 1. Primary: Look up verified domain in email_domains
      const row = await db.prepare(
        "SELECT id, organization_id, domain, verification_status FROM email_domains WHERE domain = ? AND verification_status = 'VERIFIED'"
      ).bind(cleanHost).first();

      if (row) {
        // Query associated shop
        const shop = await db.prepare(
          "SELECT id, store_slug, organization_id, name FROM shops WHERE organization_id = ? AND status = 'active'"
        ).bind(row.organization_id).first();

        const fallbackShop = !shop ? await db.prepare(
          "SELECT id, store_slug, organization_id, name FROM shops WHERE organization_id = ? LIMIT 1"
        ).bind(row.organization_id).first() : null;

        const user = (!shop && !fallbackShop) ? await db.prepare(
          "SELECT id, subdomain, business_name FROM users WHERE organization_id = ? LIMIT 1"
        ).bind(row.organization_id).first() : null;

        const effectiveShop = shop || fallbackShop;
        const storeSlug = effectiveShop?.store_slug || user?.subdomain || (row.organization_id || '').replace(/_/g, '-');

        return {
          domain: row.domain,
          organizationId: row.organization_id,
          storeSlug,
          shopId: effectiveShop?.id || user?.id,
          shopName: effectiveShop?.name || user?.business_name,
        };
      }

      // 2. Fallback: Look up custom domain in users table
      const userRow = await db.prepare(
        "SELECT id, organization_id, subdomain, business_name FROM users WHERE LOWER(custom_domain) = ? LIMIT 1"
      ).bind(cleanHost).first();

      if (userRow) {
        return {
          domain: cleanHost,
          organizationId: userRow.organization_id || userRow.id,
          storeSlug: userRow.subdomain || (userRow.organization_id || userRow.id || '').replace(/_/g, '-'),
          shopId: userRow.id,
          shopName: userRow.business_name,
        };
      }
    } catch (err) {
      console.warn('[DomainService] resolveCustomStorefront error:', err?.message);
    }

    return null;
  }

  async resolveCustomStorefront(db, hostname) {
    return await DomainService.resolveCustomStorefront(db || this.env?.DB, hostname);
  }
}

/**
 * Factory function creating canonical DomainService.
 * @param {object} env
 * @returns {DomainService}
 */
export function createDomainService(env = {}) {
  return new DomainService(env);
}

/**
 * Convenience standalone resolver for edge storefront routing.
 */
export async function resolveCustomStorefront(db, hostname) {
  return await DomainService.resolveCustomStorefront(db, hostname);
}
