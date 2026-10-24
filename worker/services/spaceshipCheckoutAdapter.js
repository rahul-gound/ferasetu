/**
 * FeraSetu Spaceship Checkout Adapter
 * worker/services/spaceshipCheckoutAdapter.js
 * =============================================================================
 * Implements the safe Spaceship customer checkout flow:
 * 1. Checks live domain availability & pricing via Spaceship API.
 * 2. Creates durable, tenant-scoped internal domain_orders record.
 * 3. Enforces disabled-by-default feature flag (ENABLE_SPACESHIP_CHECKOUT) until
 *    Spaceship approves a direct customer payment-link/reseller arrangement.
 * 4. Never calls account-billed registration endpoint as a customer checkout fallback.
 * 5. Idempotently verifies actual registrar registration on customer return.
 * 6. Automatically configures Spaceship DNS upon verified registration.
 * =============================================================================
 */

import { normalizeDomainName, createSpaceshipClient } from './spaceshipClient.js';
import { generateStorefrontDnsInstructions, INGRESS_HOSTNAME_TARGET } from './domainIngressService.js';

export class SpaceshipCheckoutProvider {
  /**
   * @param {object} env
   */
  constructor(env = {}) {
    this.env = env;
    this.spaceship = createSpaceshipClient(env);
    // Feature flag: disabled by default until provider checkout confirmation
    this.checkoutEnabled = Boolean(env.ENABLE_SPACESHIP_CHECKOUT === "true" || env.ENABLE_SPACESHIP_CHECKOUT === true);
  }

  isCheckoutEnabled() {
    return this.checkoutEnabled;
  }

  /**
   * Initiates a domain purchase intent.
   *
   * @param {object} params
   * @param {string} params.organizationId
   * @param {string} params.shopId
   * @param {string} params.domain
   * @param {number} [params.periodYears=1]
   * @param {object} [params.registrantContact]
   * @param {object} params.db
   * @param {object} params.user
   */
  async createPurchaseRequest({ organizationId, shopId, domain, periodYears = 1, registrantContact = {}, db, user }) {
    if (!organizationId) throw new Error("organizationId is required");
    if (!shopId) throw new Error("shopId is required");

    const norm = normalizeDomainName(domain);
    if (!norm.valid) throw new Error(norm.error);
    const cleanDomain = norm.domain;

    if (!Number.isInteger(periodYears) || periodYears < 1 || periodYears > 10) {
      throw new Error("Registration duration must be an integer between 1 and 10 years");
    }

    // 1. Authoritative check with Spaceship API
    const avail = await this.spaceship.checkAvailability(cleanDomain);
    if (!avail.available) {
      const err = new Error(`Domain ${cleanDomain} is no longer available for registration`);
      err.status = 409;
      throw err;
    }

    if (avail.price === null || avail.price === undefined) {
      const err = new Error(`Spaceship did not return authoritative pricing for ${cleanDomain}`);
      err.status = 422;
      throw err;
    }

    // 2. Prevent duplicate claims across tenants
    if (db) {
      const existing = await db.prepare(
        "SELECT organization_id FROM custom_storefront_domains WHERE domain = ?"
      ).bind(cleanDomain).first();

      if (existing && existing.organization_id !== organizationId) {
        const err = new Error("This domain is already registered by another organization in FeraSetu");
        err.status = 409;
        throw err;
      }
    }

    const orderId = `ord_dom_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const quotedPrice = avail.price * periodYears;
    const currency = avail.currency || 'USD';
    const now = new Date().toISOString();

    // 3. Create durable domain_orders record
    if (db) {
      try {
        await db.prepare(`
          INSERT INTO domain_orders (
            id, organization_id, shop_id, domain, provider, status,
            quoted_price, currency, period_years, checkout_url,
            provider_ref, registrant_contact_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, 'SPACESHIP', ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          orderId,
          organizationId,
          shopId,
          cleanDomain,
          this.checkoutEnabled ? 'CHECKOUT_PENDING' : 'QUOTED',
          quotedPrice,
          currency,
          periodYears,
          null, // checkout_url populated only when provider supports live link
          null,
          JSON.stringify(registrantContact || { email: user?.email }),
          now,
          now
        ).run();
      } catch (dbErr) {
        console.warn("[SpaceshipCheckout] Order persistence notice:", dbErr?.message);
      }
    }

    // 4. Feature flag guard: Do not pretend a fake checkout exists
    if (!this.checkoutEnabled) {
      return {
        orderId,
        domain: cleanDomain,
        quotedPrice,
        currency,
        periodYears,
        checkoutEnabled: false,
        status: 'QUOTED_PENDING_PROVIDER',
        message: 'Spaceship direct customer-checkout integration is awaiting provider commercial confirmation. No charges were made.',
        dnsInstructions: generateStorefrontDnsInstructions(cleanDomain, `token_${orderId}`)
      };
    }

    // If live checkout enabled (requires Spaceship partner checkout endpoint)
    const checkoutUrl = `https://www.spaceship.com/cart/?domain=${encodeURIComponent(cleanDomain)}&ref=ferasetu&order=${orderId}`;

    if (db) {
      await db.prepare("UPDATE domain_orders SET checkout_url = ? WHERE id = ?").bind(checkoutUrl, orderId).run();
    }

    return {
      orderId,
      domain: cleanDomain,
      quotedPrice,
      currency,
      periodYears,
      checkoutEnabled: true,
      checkoutUrl,
      status: 'CHECKOUT_PENDING',
      dnsInstructions: generateStorefrontDnsInstructions(cleanDomain, `token_${orderId}`)
    };
  }

  /**
   * Verifies registration after customer completes checkout at Spaceship.
   * Idempotent & tenant-isolated.
   *
   * @param {object} params
   * @param {string} params.organizationId
   * @param {string} params.orderId
   * @param {string} params.domain
   * @param {object} params.db
   */
  async verifyRegistration({ organizationId, orderId, domain, db }) {
    if (!organizationId) throw new Error("organizationId is required");
    const norm = normalizeDomainName(domain);
    if (!norm.valid) throw new Error(norm.error);
    const cleanDomain = norm.domain;

    let order = null;
    if (db && orderId) {
      order = await db.prepare(
        "SELECT * FROM domain_orders WHERE id = ? AND organization_id = ?"
      ).bind(orderId, organizationId).first();

      if (!order) {
        const err = new Error("Domain order not found or unauthorized");
        err.status = 404;
        throw err;
      }
    }

    // 1. Authoritative verification with Spaceship API: Does the domain exist and is it active?
    let domainInfo;
    try {
      domainInfo = await this.spaceship.getDomainInfo(cleanDomain);
    } catch (apiErr) {
      return {
        verified: false,
        status: 'REGISTRATION_PENDING',
        domain: cleanDomain,
        message: `Spaceship registration is not yet confirmed: ${apiErr.message}`
      };
    }

    const isRegistered = domainInfo && (domainInfo.status === 'ACTIVE' || domainInfo.status === 'registered');

    if (!isRegistered) {
      return {
        verified: false,
        status: 'REGISTRATION_PENDING',
        domain: cleanDomain,
        message: `Domain ${cleanDomain} registration status with Spaceship is ${domainInfo?.status || 'PENDING'}.`
      };
    }

    const now = new Date().toISOString();
    const shopId = order?.shop_id || 'default_shop';
    const ownershipToken = `token_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;

    // 2. Provision or update custom_storefront_domains in D1
    let domainRecord = null;
    if (db) {
      const existingDomain = await db.prepare(
        "SELECT * FROM custom_storefront_domains WHERE domain = ?"
      ).bind(cleanDomain).first();

      if (existingDomain && existingDomain.organization_id !== organizationId) {
        const err = new Error("Domain is claimed by another merchant");
        err.status = 409;
        throw err;
      }

      if (!existingDomain) {
        const domainId = `csd_${crypto.randomUUID()}`;
        await db.prepare(`
          INSERT INTO custom_storefront_domains (
            id, organization_id, shop_id, domain, apex_domain, hostname_type,
            registration_provider, registration_status, dns_provider, dns_status,
            tls_status, status, ownership_token, dns_target,
            verified_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'APEX', 'SPACESHIP', 'REGISTERED', 'SPACESHIP', 'CONFIGURING', 'PENDING', 'PENDING_DNS', ?, ?, ?, ?, ?)
        `).bind(
          domainId,
          organizationId,
          shopId,
          cleanDomain,
          cleanDomain,
          ownershipToken,
          INGRESS_HOSTNAME_TARGET,
          now,
          now,
          now
        ).run();

        domainRecord = await db.prepare("SELECT * FROM custom_storefront_domains WHERE id = ?").bind(domainId).first();
      } else {
        await db.prepare(`
          UPDATE custom_storefront_domains
          SET registration_status = 'REGISTERED', dns_status = 'CONFIGURING', updated_at = ?
          WHERE id = ? AND organization_id = ?
        `).bind(now, existingDomain.id, organizationId).run();

        domainRecord = await db.prepare("SELECT * FROM custom_storefront_domains WHERE id = ?").bind(existingDomain.id).first();
      }

      // Update order status to COMPLETED
      if (orderId) {
        await db.prepare(`
          UPDATE domain_orders SET status = 'COMPLETED', updated_at = ? WHERE id = ? AND organization_id = ?
        `).bind(now, orderId, organizationId).run();
      }

      // Record audit log
      try {
        await db.prepare(`
          INSERT INTO domain_audit_logs (id, organization_id, domain, action, actor_id, details_json, created_at)
          VALUES (?, ?, ?, 'DOMAIN_REGISTERED', ?, ?, ?)
        `).bind(
          `audit_${crypto.randomUUID()}`,
          organizationId,
          cleanDomain,
          orderId || 'system',
          JSON.stringify({ provider: 'SPACESHIP', status: 'REGISTERED' }),
          now
        ).run();
      } catch {}
    }

    // 3. Automatically apply Storefront DNS records to Spaceship DNS (Zero Merchant Friction)
    let dnsApplied = false;
    let preservedDnsCount = 0;
    try {
      const recordsToApply = [
        { type: 'TXT', name: `_ferasetu-challenge.${cleanDomain}`, value: `fera-domain-verification=${ownershipToken}`, ttl: 300 },
        { type: 'CNAME', name: `www.${cleanDomain}`, value: INGRESS_HOSTNAME_TARGET, ttl: 300 },
        { type: 'ALIAS', name: cleanDomain, value: INGRESS_HOSTNAME_TARGET, ttl: 300 }
      ];

      const dnsRes = await this.spaceship.applyStorefrontDnsRecords(cleanDomain, recordsToApply);
      dnsApplied = dnsRes.success;
      preservedDnsCount = dnsRes.preservedCount || 0;

      if (db && domainRecord) {
        await db.prepare(`
          UPDATE custom_storefront_domains
          SET dns_status = 'PROPAGATING', updated_at = ?
          WHERE id = ?
        `).bind(new Date().toISOString(), domainRecord.id).run();
      }
    } catch (dnsErr) {
      console.warn(`[SpaceshipCheckout] Auto-DNS application warning for ${cleanDomain}:`, dnsErr.message);
    }

    const instructions = generateStorefrontDnsInstructions(cleanDomain, ownershipToken);

    return {
      verified: true,
      status: 'REGISTERED',
      domain: cleanDomain,
      domainRecord,
      dnsApplied,
      preservedDnsCount,
      instructions
    };
  }
}

export function createSpaceshipCheckoutProvider(env = {}) {
  return new SpaceshipCheckoutProvider(env);
}
