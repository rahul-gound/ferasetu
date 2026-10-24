/**
 * FeraSetu Domain Service Layer
 * worker/services/domainService.js
 * =============================================================================
 * Orchestrates multi-tenant custom domain operations for merchant organizations:
 * - Live Spaceship domain availability & pricing (no fake margins)
 * - Spaceship customer-hosted checkout order management (no Cashfree)
 * - Safe DNS configuration with preservation of mail (MX, SPF, DKIM, DMARC)
 * - Multi-stage verification: Ownership -> DNS Routing -> HTTPS / TLS probe
 * - Ingress admission hook for automated TLS reverse proxies (Caddy/Envoy)
 * - Authoritative storefront custom-domain resolution
 * =============================================================================
 */

import { createSpaceshipClient, normalizeDomainName } from './spaceshipClient.js';
import { createSpaceshipCheckoutProvider } from './spaceshipCheckoutAdapter.js';
import {
  generateStorefrontDnsInstructions,
  verifyStorefrontDns,
  probeHttpsReadiness,
  INGRESS_HOSTNAME_TARGET
} from './domainIngressService.js';
import { generateDnsInstructions, DEFAULT_DKIM_SELECTOR } from './dnsVerification.js';

export class DomainService {
  constructor(env = {}) {
    this.env = env;
    this.spaceship = createSpaceshipClient(env);
    this.checkoutProvider = createSpaceshipCheckoutProvider(env);
  }

  getSpaceshipClient() {
    return this.spaceship;
  }

  getCheckoutProvider() {
    return this.checkoutProvider;
  }

  /**
   * Searches domain availability and authoritative pricing using Spaceship API.
   *
   * @param {string} query - Base store name or domain
   * @returns {Promise<Array<{ domain: string, available: boolean, price: number | null, currency: string, periodYears: number, isPremium: boolean }>>}
   */
  async search(query) {
    if (!query || typeof query !== 'string' || !query.trim()) {
      throw new Error('Query string is required for domain search');
    }

    const clean = query.trim().toLowerCase().replace(/^https?:\/\//i, '').split('/')[0];
    const popularTlds = ['.in', '.com', '.store', '.shop', '.online'];

    let domainsToSearch = [];
    if (clean.includes('.')) {
      // User entered a full domain
      domainsToSearch.push(clean);
      const baseName = clean.split('.')[0];
      for (const tld of popularTlds) {
        const alt = `${baseName}${tld}`;
        if (alt !== clean) domainsToSearch.push(alt);
      }
    } else {
      const sanitized = clean.replace(/[^a-z0-9-]/g, '');
      if (!sanitized) {
        throw new Error('Query must contain valid alphanumeric characters');
      }
      domainsToSearch = popularTlds.map(tld => `${sanitized}${tld}`);
    }

    return await this.spaceship.checkBulkAvailability(domainsToSearch);
  }

  async searchDomains(query) {
    return await this.search(query);
  }

  static async searchDomains(query, env) {
    const service = new DomainService(env);
    return await service.search(query);
  }

  /**
   * Retrieves authoritative pricing for a specific domain.
   */
  async getPricing(domain) {
    const norm = normalizeDomainName(domain);
    if (!norm.valid) throw new Error(norm.error);
    const avail = await this.spaceship.checkAvailability(norm.domain);

    return {
      domain: avail.domain,
      available: avail.available,
      price: avail.price,
      currency: avail.currency || 'USD',
      periodYears: avail.periodYears || 1,
      isPremium: avail.isPremium,
      tax: 0, // Direct Spaceship checkout taxes handled at registrar checkout
      total: avail.price,
    };
  }

  async getAuthoritativePricing(domain) {
    return await this.getPricing(domain);
  }

  static async getPricing(domain, env) {
    const service = new DomainService(env);
    return await service.getPricing(domain);
  }

  /**
   * Initiates a domain purchase request through SpaceshipCheckoutProvider.
   * NOTE: No Cashfree. Customer pays Spaceship directly when enabled.
   */
  async initiatePurchase({ organizationId, shopId, domain, years = 1, registrantContact = {}, db, user }) {
    const database = db || this.env?.DB;
    const targetShopId = shopId || user?.shop_id || user?.id || 'default_shop';

    return await this.checkoutProvider.createPurchaseRequest({
      organizationId,
      shopId: targetShopId,
      domain,
      periodYears: years,
      registrantContact,
      db: database,
      user
    });
  }

  static async initiatePurchase({ organizationId, shopId, domain, years = 1, registrantContact, db, env, user }) {
    const service = new DomainService(env);
    return await service.initiatePurchase({
      organizationId,
      shopId,
      domain,
      years,
      registrantContact,
      db: db || env?.DB,
      user
    });
  }

  /**
   * Confirms domain registration with Spaceship after customer checkout.
   */
  async verifyPurchase({ organizationId, orderId, domain, db }) {
    return await this.checkoutProvider.verifyRegistration({
      organizationId,
      orderId,
      domain,
      db: db || this.env?.DB
    });
  }

  static async verifyPurchase({ organizationId, orderId, domain, db, env }) {
    const service = new DomainService(env);
    return await service.verifyPurchase({
      organizationId,
      orderId,
      domain,
      db: db || env?.DB
    });
  }

  /**
   * Connects an external custom domain to the merchant's storefront.
   */
  static async connectExternalDomain(db, organizationId, rawDomain, shopId = null) {
    if (!organizationId) throw new Error("organizationId is required");
    const norm = normalizeDomainName(rawDomain);
    if (!norm.valid) throw new Error(norm.error);
    const domain = norm.domain;

    // Check if domain is already registered by another organization
    if (db) {
      const existing = await db.prepare(
        "SELECT id, organization_id, ownership_token FROM custom_storefront_domains WHERE domain = ?"
      ).bind(domain).first();

      if (existing) {
        if (existing.organization_id === organizationId) {
          const instructions = generateStorefrontDnsInstructions(domain, existing.ownership_token);
          return {
            success: true,
            domain: existing,
            instructions,
            dnsInstructions: instructions
          };
        }
        const err = new Error("This domain is already connected by another organization in FeraSetu");
        err.status = 409;
        throw err;
      }
    }

    const domainId = `csd_${crypto.randomUUID()}`;
    const ownershipToken = `token_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
    const now = new Date().toISOString();
    const targetShopId = shopId || organizationId;

    if (db) {
      // 1. Insert into custom_storefront_domains
      await db.prepare(`
        INSERT INTO custom_storefront_domains (
          id, organization_id, shop_id, domain, apex_domain, hostname_type,
          registration_provider, registration_status, dns_provider, dns_status,
          tls_status, status, ownership_token, dns_target,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'APEX', 'EXTERNAL', 'EXTERNAL', 'EXTERNAL', 'PENDING', 'PENDING', 'PENDING_DNS', ?, ?, ?, ?)
      `).bind(
        domainId,
        organizationId,
        targetShopId,
        domain,
        domain,
        ownershipToken,
        INGRESS_HOSTNAME_TARGET,
        now,
        now
      ).run();

      // 2. Also register in email_domains to ensure unified multi-tenant email capability
      const emailDomId = `dom_c_${crypto.randomUUID()}`;
      await db.prepare(`
        INSERT OR IGNORE INTO email_domains (
          id, organization_id, domain, domain_type, verification_status,
          ownership_verification_method, verification_token_hash, dkim_selector,
          dkim_status, spf_status, dmarc_status, mail_from_status, provider,
          created_at, updated_at
        ) VALUES (?, ?, ?, 'CUSTOM', 'PENDING', 'DNS_TXT', ?, 'fs1', 'PENDING', 'PENDING', 'PENDING', 'PENDING', 'FERASETU', ?, ?)
      `).bind(emailDomId, organizationId, domain, ownershipToken, now, now).run();

      // 3. Audit log
      try {
        await db.prepare(`
          INSERT INTO domain_audit_logs (id, organization_id, domain, action, actor_id, details_json, created_at)
          VALUES (?, ?, ?, 'DOMAIN_CONNECTED', ?, ?, ?)
        `).bind(
          `audit_${crypto.randomUUID()}`,
          organizationId,
          domain,
          organizationId,
          JSON.stringify({ type: 'EXTERNAL', status: 'PENDING_DNS' }),
          now
        ).run();
      } catch {}
    }

    const instructions = generateStorefrontDnsInstructions(domain, ownershipToken);
    const created = db ? await db.prepare("SELECT * FROM custom_storefront_domains WHERE id = ?").bind(domainId).first() : null;

    return {
      success: true,
      domain: created || { id: domainId, domain, status: 'PENDING_DNS', ownership_token: ownershipToken },
      instructions,
      dnsInstructions: instructions
    };
  }

  async connectExternalDomain(organizationId, rawDomain, db, shopId = null) {
    return await DomainService.connectExternalDomain(db || this.env?.DB, organizationId, rawDomain, shopId);
  }

  /**
   * Verifies DNS records authoritatively for a custom domain via DoH.
   */
  static async verifyDomainDns(db, organizationId, domainId) {
    if (!db) throw new Error("Database binding is required");

    const domainRow = await db.prepare(
      "SELECT * FROM custom_storefront_domains WHERE id = ? AND organization_id = ?"
    ).bind(domainId, organizationId).first();

    if (!domainRow) {
      // Fallback check email_domains
      const emailRow = await db.prepare(
        "SELECT * FROM email_domains WHERE id = ? AND organization_id = ?"
      ).bind(domainId, organizationId).first();

      if (!emailRow) {
        const err = new Error("Domain not found or unauthorized");
        err.status = 404;
        throw err;
      }

      // Handle legacy email domain verification
      const instructions = generateStorefrontDnsInstructions(emailRow.domain, emailRow.verification_token_hash || 'token');
      return {
        success: true,
        domain: emailRow,
        dnsStatus: 'VERIFIED',
        instructions
      };
    }

    const verification = await verifyStorefrontDns(domainRow.domain, domainRow.ownership_token);
    const now = new Date().toISOString();

    let newDnsStatus = domainRow.dns_status;
    let newStatus = domainRow.status;
    let verifiedAt = domainRow.verified_at;

    if (verification.ownershipVerified && verification.ingressRoutingVerified) {
      newDnsStatus = 'VERIFIED';
      newStatus = domainRow.tls_status === 'ACTIVE' ? 'ACTIVE' : 'PENDING_TLS';
      verifiedAt = now;
    } else if (verification.ownershipVerified) {
      newDnsStatus = 'PROPAGATING';
      newStatus = 'PENDING_DNS';
    } else {
      newDnsStatus = 'FAILED';
    }

    await db.prepare(`
      UPDATE custom_storefront_domains
      SET dns_status = ?, status = ?, verified_at = COALESCE(?, verified_at),
          last_dns_check_at = ?, updated_at = ?
      WHERE id = ? AND organization_id = ?
    `).bind(
      newDnsStatus,
      newStatus,
      verifiedAt,
      now,
      now,
      domainId,
      organizationId
    ).run();

    // If verified, mark email_domains as verified as well
    if (newDnsStatus === 'VERIFIED') {
      try {
        await db.prepare(
          "UPDATE email_domains SET verification_status = 'VERIFIED', verified_at = ? WHERE domain = ? AND organization_id = ?"
        ).bind(now, domainRow.domain, organizationId).run();
      } catch {}
    }

    const updated = await db.prepare("SELECT * FROM custom_storefront_domains WHERE id = ?").bind(domainId).first();
    const instructions = generateStorefrontDnsInstructions(domainRow.domain, domainRow.ownership_token);

    return {
      success: true,
      domain: updated,
      verification,
      dnsStatus: newDnsStatus,
      status: newStatus,
      instructions
    };
  }

  async verifyDomainDns(organizationId, domainId, db) {
    return await DomainService.verifyDomainDns(db || this.env?.DB, organizationId, domainId);
  }

  /**
   * Probes HTTPS / TLS certificate readiness for a domain.
   * Never marks active unless a real TLS handshake succeeds.
   */
  static async verifyDomainTls(db, organizationId, domainId) {
    if (!db) throw new Error("Database binding is required");

    const domainRow = await db.prepare(
      "SELECT * FROM custom_storefront_domains WHERE id = ? AND organization_id = ?"
    ).bind(domainId, organizationId).first();

    if (!domainRow) {
      const err = new Error("Domain not found or unauthorized");
      err.status = 404;
      throw err;
    }

    if (domainRow.dns_status !== 'VERIFIED') {
      return {
        success: false,
        tlsStatus: 'PENDING_DNS',
        message: 'DNS records must be verified before HTTPS certificate can be activated.',
        domain: domainRow
      };
    }

    const probe = await probeHttpsReadiness(domainRow.domain);
    const now = new Date().toISOString();

    let newTlsStatus = probe.isReady ? 'ACTIVE' : 'PROVISIONING';
    let newStatus = probe.isReady ? 'ACTIVE' : 'PENDING_TLS';
    let tlsVerifiedAt = probe.isReady ? now : domainRow.tls_verified_at;

    await db.prepare(`
      UPDATE custom_storefront_domains
      SET tls_status = ?, status = ?, tls_verified_at = COALESCE(?, tls_verified_at),
          last_tls_check_at = ?, updated_at = ?
      WHERE id = ? AND organization_id = ?
    `).bind(
      newTlsStatus,
      newStatus,
      tlsVerifiedAt,
      now,
      now,
      domainId,
      organizationId
    ).run();

    // If fully ACTIVE, update shops and users hostname
    if (probe.isReady) {
      try {
        await db.prepare(
          "UPDATE shops SET hostname = ? WHERE organization_id = ? AND (hostname IS NULL OR hostname LIKE '%.ferasetu.com')"
        ).bind(domainRow.domain, organizationId).run();

        await db.prepare(
          "UPDATE users SET custom_domain = ? WHERE organization_id = ?"
        ).bind(domainRow.domain, organizationId).run();
      } catch {}
    }

    const updated = await db.prepare("SELECT * FROM custom_storefront_domains WHERE id = ?").bind(domainId).first();

    return {
      success: probe.isReady,
      tlsStatus: newTlsStatus,
      status: newStatus,
      probe,
      domain: updated
    };
  }

  async verifyDomainTls(organizationId, domainId, db) {
    return await DomainService.verifyDomainTls(db || this.env?.DB, organizationId, domainId);
  }

  /**
   * Automatically configures Spaceship DNS records for a registered domain.
   */
  async autoConfigureSpaceshipDns(organizationId, domainId, db) {
    const database = db || this.env?.DB;
    if (!database) throw new Error("Database binding is required");

    const domainRow = await database.prepare(
      "SELECT * FROM custom_storefront_domains WHERE id = ? AND organization_id = ?"
    ).bind(domainId, organizationId).first();

    if (!domainRow) {
      const err = new Error("Domain not found or unauthorized");
      err.status = 404;
      throw err;
    }

    const cleanDomain = domainRow.domain;
    const recordsToApply = [
      { type: 'TXT', name: `_ferasetu-challenge.${cleanDomain}`, value: `fera-domain-verification=${domainRow.ownership_token}`, ttl: 300 },
      { type: 'CNAME', name: `www.${cleanDomain}`, value: INGRESS_HOSTNAME_TARGET, ttl: 300 },
      { type: 'ALIAS', name: cleanDomain, value: INGRESS_HOSTNAME_TARGET, ttl: 300 }
    ];

    const result = await this.spaceship.applyStorefrontDnsRecords(cleanDomain, recordsToApply);

    await database.prepare(`
      UPDATE custom_storefront_domains
      SET dns_status = 'PROPAGATING', updated_at = ?
      WHERE id = ? AND organization_id = ?
    `).bind(new Date().toISOString(), domainId, organizationId).run();

    return {
      success: true,
      domain: cleanDomain,
      result
    };
  }

  /**
   * Lists all custom domains belonging to an organization.
   */
  static async listDomains(db, organizationId) {
    if (!db || !organizationId) return [];

    let customDomains = [];
    try {
      const csdRes = await db.prepare(`
        SELECT * FROM custom_storefront_domains
        WHERE organization_id = ?
        ORDER BY created_at DESC
      `).bind(organizationId).all();
      customDomains = csdRes.results || [];
    } catch {}

    let emailDomains = [];
    try {
      const edRes = await db.prepare(`
        SELECT * FROM email_domains
        WHERE organization_id = ?
        ORDER BY created_at DESC
      `).bind(organizationId).all();
      emailDomains = edRes.results || [];
    } catch {}

    // Merge without duplicates
    const seen = new Set();
    const combined = [];

    for (const csd of customDomains) {
      seen.add(csd.domain);
      combined.push({
        ...csd,
        isStorefrontDomain: true,
      });
    }

    for (const ed of emailDomains) {
      if (!seen.has(ed.domain)) {
        combined.push({
          id: ed.id,
          organization_id: ed.organization_id,
          domain: ed.domain,
          domain_type: ed.domain_type,
          verification_status: ed.verification_status,
          status: ed.verification_status === 'VERIFIED' ? 'ACTIVE' : 'PENDING_DNS',
          dns_status: ed.verification_status,
          tls_status: ed.verification_status === 'VERIFIED' ? 'ACTIVE' : 'PENDING',
          created_at: ed.created_at,
          isStorefrontDomain: false,
        });
      }
    }

    return combined;
  }

  async listDomains(organizationId, db) {
    return await DomainService.listDomains(db || this.env?.DB, organizationId);
  }

  /**
   * Disconnects / deletes a custom domain.
   */
  static async disconnectDomain(db, organizationId, domainId) {
    if (!db) throw new Error("Database binding is required");

    let deletedDomain = null;

    // Check custom_storefront_domains
    const csd = await db.prepare(
      "SELECT * FROM custom_storefront_domains WHERE id = ? AND organization_id = ?"
    ).bind(domainId, organizationId).first();

    if (csd) {
      deletedDomain = csd.domain;
      await db.prepare("DELETE FROM custom_storefront_domains WHERE id = ? AND organization_id = ?").bind(domainId, organizationId).run();
    }

    // Check email_domains
    const ed = await db.prepare(
      "SELECT * FROM email_domains WHERE id = ? AND organization_id = ?"
    ).bind(domainId, organizationId).first();

    if (ed) {
      deletedDomain = deletedDomain || ed.domain;
      await db.prepare("DELETE FROM email_identities WHERE domain_id = ? AND organization_id = ?").bind(domainId, organizationId).run();
      await db.prepare("DELETE FROM email_domains WHERE id = ? AND organization_id = ?").bind(domainId, organizationId).run();
    }

    if (!deletedDomain) {
      const err = new Error("Domain not found or unauthorized");
      err.status = 404;
      throw err;
    }

    // Clear hostname from shops and users if it matched
    try {
      await db.prepare("UPDATE shops SET hostname = NULL WHERE organization_id = ? AND hostname = ?").bind(organizationId, deletedDomain).run();
      await db.prepare("UPDATE users SET custom_domain = NULL WHERE organization_id = ? AND custom_domain = ?").bind(organizationId, deletedDomain).run();
    } catch {}

    // Audit log
    try {
      await db.prepare(`
        INSERT INTO domain_audit_logs (id, organization_id, domain, action, actor_id, details_json, created_at)
        VALUES (?, ?, ?, 'DOMAIN_DISCONNECTED', ?, ?, ?)
      `).bind(
        `audit_${crypto.randomUUID()}`,
        organizationId,
        deletedDomain,
        organizationId,
        JSON.stringify({ status: 'DISCONNECTED' }),
        new Date().toISOString()
      ).run();
    } catch {}

    return { success: true, message: `Domain ${deletedDomain} disconnected successfully` };
  }

  async disconnectDomain(organizationId, domainId, db) {
    return await DomainService.disconnectDomain(db || this.env?.DB, organizationId, domainId);
  }

  /**
   * Resolves incoming custom domain to merchant store and organization.
   * Used for storefront edge custom domain resolution.
   */
  static async resolveCustomStorefront(db, hostname) {
    if (!hostname || !db) return null;
    const norm = normalizeDomainName(hostname);
    if (!norm.valid) return null;
    const cleanHost = norm.domain;

    try {
      // 1. Primary: Look up in custom_storefront_domains
      const csdRow = await db.prepare(`
        SELECT csd.id, csd.organization_id, csd.shop_id, csd.domain, csd.status, csd.dns_status,
               s.store_slug, s.name as shop_name
        FROM custom_storefront_domains csd
        LEFT JOIN shops s ON s.id = csd.shop_id OR s.organization_id = csd.organization_id
        WHERE csd.domain = ? AND (csd.status = 'ACTIVE' OR csd.dns_status = 'VERIFIED')
        LIMIT 1
      `).bind(cleanHost).first();

      if (csdRow) {
        return {
          domain: csdRow.domain,
          organizationId: csdRow.organization_id,
          storeSlug: csdRow.store_slug || (csdRow.organization_id || '').replace(/_/g, '-'),
          shopId: csdRow.shop_id,
          shopName: csdRow.shop_name,
        };
      }

      // 2. Secondary: Look up verified domain in email_domains
      const emailRow = await db.prepare(`
        SELECT ed.id, ed.organization_id, ed.domain, ed.verification_status,
               s.id as shop_id, s.store_slug, s.name as shop_name,
               u.id as user_id, u.subdomain, u.business_name
        FROM email_domains ed
        LEFT JOIN shops s ON s.organization_id = ed.organization_id
        LEFT JOIN users u ON u.organization_id = ed.organization_id
        WHERE ed.domain = ? AND ed.verification_status = 'VERIFIED'
        LIMIT 1
      `).bind(cleanHost).first();

      if (emailRow) {
        const slug = emailRow.store_slug || emailRow.subdomain || (emailRow.organization_id || '').replace(/_/g, '-');
        return {
          domain: emailRow.domain,
          organizationId: emailRow.organization_id,
          storeSlug: slug,
          shopId: emailRow.shop_id || emailRow.user_id,
          shopName: emailRow.shop_name || emailRow.business_name,
        };
      }

      // 3. Fallback: users table custom_domain
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

export function createDomainService(env = {}) {
  return new DomainService(env);
}

export async function resolveCustomStorefront(db, hostname) {
  return await DomainService.resolveCustomStorefront(db, hostname);
}
