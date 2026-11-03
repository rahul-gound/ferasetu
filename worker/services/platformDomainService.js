/**
 * FeraSetu Central Platform Hostname Registry & Collision Guard
 * worker/services/platformDomainService.js
 *
 * Enforces:
 * 1. Strict separation of platform vs merchant hostnames.
 * 2. Database-level reservation preventing merchant takeover of platform names.
 * 3. Validation against collisions, duplicate assignments, and malformed hostnames.
 * 4. Safe detachment, reassignment, and TLS status tracking.
 */

import { BASE_DOMAINS, RESERVED_SUBDOMAINS } from "../storefront.js";

// Extended set of reserved platform names enforced at database level
export const CORE_PLATFORM_RESERVED_NAMES = new Set([
  ...Array.from(RESERVED_SUBDOMAINS),
  "help",
  "docs",
  "status",
  "developers",
  "devs",
  "portal",
  "system",
  "billing",
  "pay",
  "checkout",
  "dashboard",
  "id",
  "auth",
  "sso",
  "cdn",
  "media",
  "security",
  "statuspage",
  "insights",
  "telemetry"
]);

export class HostnameConflictError extends Error {
  constructor(message, code = "HOSTNAME_CONFLICT") {
    super(message);
    this.name = "HostnameConflictError";
    this.status = 409;
    this.code = code;
  }
}

/**
 * Normalizes a hostname to lowercase, trimmed, with trailing dot removed.
 */
export function normalizeHostname(hostname) {
  if (!hostname || typeof hostname !== "string") {
    throw new Error("Hostname must be a non-empty string");
  }
  return hostname.trim().toLowerCase().replace(/\.+$/, "");
}

/**
 * Extracts subdomain and root domain from a given hostname.
 */
export function parsePlatformHostname(rawHostname) {
  const normalized = normalizeHostname(rawHostname);
  for (const base of BASE_DOMAINS) {
    if (normalized === base) {
      return { isPlatformRoot: true, rootDomain: base, subdomain: null, normalized };
    }
    if (normalized.endsWith("." + base)) {
      const prefix = normalized.slice(0, -(base.length + 1));
      return { isPlatformRoot: false, rootDomain: base, subdomain: prefix, normalized };
    }
  }
  return { isPlatformRoot: false, rootDomain: null, subdomain: null, normalized };
}

/**
 * Validates whether a platform hostname is valid and available.
 */
export async function validatePlatformHostnameAvailability(db, rawHostname, currentSiteId = null) {
  const normalized = normalizeHostname(rawHostname);
  const parsed = parsePlatformHostname(normalized);

  // 1. Basic format validation
  const hostnameRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/;
  if (!hostnameRegex.test(normalized)) {
    throw new HostnameConflictError(
      `Invalid hostname format: '${normalized}'. Must contain only alphanumeric characters and hyphens.`,
      "INVALID_HOSTNAME_FORMAT"
    );
  }

  // 2. Prevent using apex domain directly as a platform site (ferasetu.com is the main SPA root)
  if (parsed.isPlatformRoot) {
    throw new HostnameConflictError(
      `Apex domain '${normalized}' is reserved for the primary FeraSetu platform root.`,
      "APEX_DOMAIN_RESERVED"
    );
  }

  if (!db) {
    return { available: true, normalized, parsed };
  }

  // 3. Check central platform_domains registry
  const existingDomain = await db.prepare(
    "SELECT hostname_id, site_id, ownership_type, provisioning_status FROM platform_domains WHERE normalized_hostname = ?"
  ).bind(normalized).first();

  if (existingDomain) {
    if (currentSiteId && existingDomain.site_id === currentSiteId) {
      // Already assigned to this exact site
      return { available: true, normalized, parsed, existingRecord: existingDomain };
    }
    throw new HostnameConflictError(
      `Hostname '${normalized}' is already registered to ${existingDomain.ownership_type} resource '${existingDomain.site_id || "system"}'.`,
      "HOSTNAME_ALREADY_ASSIGNED"
    );
  }

  // 4. Check merchant custom storefront domains (custom_storefront_domains)
  try {
    const merchantCustomDomain = await db.prepare(
      "SELECT id, shop_id FROM custom_storefront_domains WHERE domain = ?"
    ).bind(normalized).first();

    if (merchantCustomDomain) {
      throw new HostnameConflictError(
        `Hostname collision: '${normalized}' is currently registered by an active merchant shop. Takeovers are strictly prohibited.`,
        "MERCHANT_DOMAIN_COLLISION"
      );
    }
  } catch (err) {
    // If table doesn't exist yet, proceed
  }

  // 5. Check if another platform site already claims this as primary_hostname
  const otherSite = await db.prepare(
    "SELECT id, name FROM platform_sites WHERE primary_hostname = ? AND id != ?"
  ).bind(normalized, currentSiteId || "none").first();

  if (otherSite) {
    throw new HostnameConflictError(
      `Hostname '${normalized}' is already used by platform site '${otherSite.name}' (${otherSite.id}).`,
      "SITE_PRIMARY_HOSTNAME_CONFLICT"
    );
  }

  return { available: true, normalized, parsed };
}

/**
 * Checks if a requested merchant subdomain collides with a platform reserved name or domain.
 */
export async function isReservedAgainstMerchants(db, rawSubdomain) {
  const cleanSubdomain = rawSubdomain.trim().toLowerCase();

  // 1. In-memory reserved words
  if (CORE_PLATFORM_RESERVED_NAMES.has(cleanSubdomain)) {
    return {
      reserved: true,
      reason: `'${cleanSubdomain}' is a protected FeraSetu platform identifier.`
    };
  }

  if (!db) return { reserved: false };

  // 2. Database platform_domains check across all base domains
  for (const base of BASE_DOMAINS) {
    const testHostname = `${cleanSubdomain}.${base}`;
    try {
      const existing = await db.prepare(
        "SELECT hostname_id, ownership_type FROM platform_domains WHERE normalized_hostname = ?"
      ).bind(testHostname).first();

      if (existing) {
        return {
          reserved: true,
          reason: `'${cleanSubdomain}' is reserved in the central platform registry for platform property '${existing.hostname_id}'.`
        };
      }
    } catch {}
  }

  return { reserved: false };
}

/**
 * Registers and reserves a platform hostname in the central registry.
 */
export async function registerPlatformHostname(db, {
  siteId,
  rawHostname,
  provider = "CLOUDFLARE",
  resourceReference = null,
  routingTarget = null
}) {
  const { normalized } = await validatePlatformHostnameAvailability(db, rawHostname, siteId);
  const hostnameId = "phost_" + crypto.randomUUID();
  const now = new Date().toISOString();

  await db.prepare(`
    INSERT INTO platform_domains 
    (hostname_id, normalized_hostname, site_id, ownership_type, provider, resource_reference, verification_status, tls_status, provisioning_status, routing_target, created_at, updated_at)
    VALUES (?, ?, ?, 'platform', ?, ?, 'verified', 'active', 'active', ?, ?, ?)
    ON CONFLICT(normalized_hostname) DO UPDATE SET
      site_id = excluded.site_id,
      ownership_type = 'platform',
      provisioning_status = 'active',
      updated_at = excluded.updated_at
  `).bind(hostnameId, normalized, siteId, provider, resourceReference, routingTarget, now, now).run();

  return {
    hostnameId,
    normalizedHostname: normalized,
    siteId,
    ownershipType: "platform",
    provider,
    verificationStatus: "verified",
    tlsStatus: "active",
    provisioningStatus: "active"
  };
}

/**
 * Detaches a hostname from a platform site safely.
 */
export async function detachPlatformHostname(db, hostnameId, siteId) {
  if (!db) return { success: true };
  const existing = await db.prepare(
    "SELECT * FROM platform_domains WHERE hostname_id = ? AND site_id = ?"
  ).bind(hostnameId, siteId).first();

  if (!existing) {
    throw new Error("Hostname not found or does not belong to specified site.");
  }

  const now = new Date().toISOString();
  await db.prepare(`
    UPDATE platform_domains 
    SET site_id = NULL, provisioning_status = 'detached', updated_at = ?
    WHERE hostname_id = ?
  `).bind(now, hostnameId).run();

  return { success: true, detachedHostname: existing.normalized_hostname };
}
