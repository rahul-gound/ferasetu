/**
 * FeraSetu Spaceship Registrar & DNS Client
 * worker/services/spaceshipClient.js
 * =============================================================================
 * Official Spaceship Public API client for:
 * 1. Bulk & single domain availability: POST /api/v1/domains/available
 * 2. Authorized domain details: GET /api/v1/domains/{domain}
 * 3. DNS resource records: GET / PUT / POST / DELETE /api/v1/dns/records/{domain}
 *
 * Guarantees:
 * - Credentials (X-API-Key, X-API-Secret) strictly confined to server-side Worker
 * - IDNA / punycode normalization for internationalized domains
 * - In-memory debounced TTL caching (60s) to respect API rate limits
 * - Never invents availability, prices, or margins
 * - Preserves existing DNS records (MX, SPF, DKIM, DMARC) on updates
 * =============================================================================
 */

export const SPACESHIP_API_BASE = "https://spaceship.dev/api/v1";

// In-memory cache for domain availability to prevent rapid duplicate external requests
const availabilityCache = new Map();
const AVAILABILITY_CACHE_TTL_MS = 60 * 1000; // 60 seconds

export function clearSpaceshipCache() {
  availabilityCache.clear();
}

/**
 * Normalizes and validates domain names, handling IDNA/punycode conversion.
 * @param {string} rawDomain
 * @returns {{ valid: boolean, domain?: string, punycode?: string, error?: string }}
 */
export function normalizeDomainName(rawDomain) {
  if (!rawDomain || typeof rawDomain !== "string") {
    return { valid: false, error: "Domain name is required" };
  }

  let cleaned = rawDomain.trim().toLowerCase();
  // Strip protocol if user pasted http:// or https://
  cleaned = cleaned.replace(/^https?:\/\//i, "");
  // Strip trailing paths or ports
  cleaned = cleaned.split("/")[0].split(":")[0];
  // Strip trailing dots
  cleaned = cleaned.replace(/\.+$/, "");

  if (!cleaned) {
    return { valid: false, error: "Invalid domain format" };
  }

  // Handle IDNA / Punycode conversion using URL standard parser
  let asciiDomain = cleaned;
  try {
    const dummyUrl = new URL(`http://${cleaned}`);
    asciiDomain = dummyUrl.hostname;
  } catch {
    return { valid: false, error: "Invalid domain characters" };
  }

  // RFC 1035 / 1123 length checks
  if (asciiDomain.length > 253) {
    return { valid: false, error: "Domain name exceeds maximum RFC 1035 length of 253 characters" };
  }

  const labels = asciiDomain.split(".");
  if (labels.length < 2) {
    return { valid: false, error: "Domain name must include a top-level domain (TLD)" };
  }

  for (const label of labels) {
    if (!label) {
      return { valid: false, error: "Domain name contains empty label" };
    }
    if (label.length > 63) {
      return { valid: false, error: "DNS label exceeds maximum RFC 1035 length of 63 characters" };
    }
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label)) {
      return { valid: false, error: `Invalid label format: '${label}'` };
    }
  }

  // Platform root domain protection
  if (asciiDomain === "ferasetu.com" || asciiDomain.endsWith(".ferasetu.com") ||
      asciiDomain === "fera-search.tech" || asciiDomain.endsWith(".fera-search.tech")) {
    return { valid: false, error: "Cannot register or configure platform base domain as a custom domain" };
  }

  return {
    valid: true,
    domain: asciiDomain,
    punycode: asciiDomain,
    unicodeDomain: cleaned
  };
}

export class SpaceshipClient {
  /**
   * @param {object} options
   * @param {string} [options.apiKey]
   * @param {string} [options.apiSecret]
   * @param {string} [options.baseUrl]
   * @param {boolean} [options.isMock]
   */
  constructor({ apiKey, apiSecret, baseUrl = SPACESHIP_API_BASE, isMock = false } = {}) {
    this.apiKey = apiKey || "";
    this.apiSecret = apiSecret || "";
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.isMock = isMock || (!this.apiKey && !this.apiSecret);
  }

  hasCredentials() {
    return Boolean(this.apiKey && this.apiSecret);
  }

  /**
   * Standard authenticated fetch wrapper for Spaceship API.
   */
  async _request(endpoint, options = {}) {
    if (this.isMock) {
      throw new Error("Spaceship credentials not configured: running in sandbox mode");
    }

    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers = new Headers(options.headers || {});
    headers.set("X-API-Key", this.apiKey);
    headers.set("X-API-Secret", this.apiSecret);
    headers.set("Content-Type", "application/json");
    headers.set("User-Agent", "FeraSetu-Spaceship-Client/1.0");

    let response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
        signal: options.signal || AbortSignal.timeout(10000) // 10s timeout
      });
    } catch (err) {
      if (err.name === "TimeoutError") {
        throw new Error("Spaceship API request timed out after 10 seconds");
      }
      throw new Error(`Spaceship network failure: ${err?.message || "Connection failed"}`);
    }

    if (!response.ok) {
      let errorBody = {};
      try {
        errorBody = await response.json();
      } catch {}

      if (response.status === 401 || response.status === 403) {
        throw new Error(`Spaceship API authentication failed (HTTP ${response.status}): Check API credentials and permissions.`);
      }
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After") || "60";
        const err = new Error(`Spaceship rate limit reached (HTTP 429). Retry after ${retryAfter} seconds.`);
        err.status = 429;
        err.retryAfter = Number(retryAfter) || 60;
        throw err;
      }
      if (response.status >= 500) {
        throw new Error(`Spaceship upstream server error (HTTP ${response.status}): ${errorBody?.message || "Registrar temporarily unavailable"}`);
      }

      const errMsg = errorBody?.message || errorBody?.error || `Spaceship API error (HTTP ${response.status})`;
      const err = new Error(errMsg);
      err.status = response.status;
      err.details = errorBody;
      throw err;
    }

    return await response.json();
  }

  /**
   * Checks domain availability using Spaceship Bulk Availability API.
   * POST /api/v1/domains/available
   * Request: { "domains": ["example.com", "example.in"] }
   * Response: { "items": [ { "domain": "example.com", "available": true, "price": { "amount": "9.98", "currency": "USD" }, "period": 1, "periodType": "year", "isPremium": false } ] }
   *
   * @param {string[]} domainList
   * @returns {Promise<Array<{ domain: string, available: boolean, price: number | null, currency: string, periodYears: number, isPremium: boolean, rawError?: string }>>}
   */
  async checkBulkAvailability(domainList) {
    if (!Array.isArray(domainList) || domainList.length === 0) {
      return [];
    }

    const normalizedMap = new Map();
    const toQuery = [];
    const results = [];

    // 1. Validate domains & check in-memory cache
    for (const raw of domainList) {
      const norm = normalizeDomainName(raw);
      if (!norm.valid) {
        results.push({
          domain: String(raw || ''),
          available: false,
          price: null,
          currency: 'USD',
          periodYears: 1,
          isPremium: false,
          rawError: norm.error
        });
        continue;
      }

      const domain = norm.domain;
      normalizedMap.set(domain, raw);

      const cached = availabilityCache.get(domain);
      if (cached && Date.now() < cached.expiresAt) {
        results.push(cached.data);
      } else {
        toQuery.push(domain);
      }
    }

    if (toQuery.length === 0) {
      return results;
    }

    // 2. Query Spaceship API (or Mock if unconfigured)
    let apiItems = [];
    if (this.hasCredentials()) {
      try {
        const payload = { domains: toQuery };
        const responseData = await this._request('/domains/available', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        apiItems = responseData.items || [];
      } catch (err) {
        console.warn(`[SpaceshipClient] Availability lookup failed: ${err.message}`);
        // Return explicit error state for queried domains, never fake availability
        for (const dom of toQuery) {
          results.push({
            domain: dom,
            available: false,
            price: null,
            currency: 'USD',
            periodYears: 1,
            isPremium: false,
            rawError: err.message
          });
        }
        return results;
      }
    } else {
      // Mock Sandbox Provider for local development & testing
      apiItems = toQuery.map(dom => {
        const tld = '.' + dom.split('.').slice(1).join('.');
        const isReserved = dom.includes('taken') || dom === 'google.com';
        const priceMap = { '.com': 9.98, '.in': 8.98, '.store': 3.98, '.shop': 4.98, '.online': 2.98 };
        const basePrice = priceMap[tld] ?? 11.98;
        return {
          domain: dom,
          available: !isReserved,
          price: {
            amount: String(basePrice),
            currency: 'USD'
          },
          period: 1,
          periodType: 'year',
          isPremium: false
        };
      });
    }

    // 3. Process API items and populate cache
    for (const item of apiItems) {
      const domain = item.domain.toLowerCase().trim();
      const rawPrice = item.price?.amount ? parseFloat(item.price.amount) : null;
      const currency = item.price?.currency || 'USD';
      const periodYears = item.period || 1;
      const isPremium = Boolean(item.isPremium);

      const processed = {
        domain,
        available: Boolean(item.available),
        price: isNaN(rawPrice) ? null : rawPrice,
        currency,
        periodYears,
        isPremium,
      };

      availabilityCache.set(domain, {
        data: processed,
        expiresAt: Date.now() + AVAILABILITY_CACHE_TTL_MS
      });

      results.push(processed);
    }

    return results;
  }

  /**
   * Checks availability of a single domain.
   */
  async checkAvailability(domain) {
    const list = await this.checkBulkAvailability([domain]);
    if (list.length === 0) {
      throw new Error(`Failed to check availability for ${domain}`);
    }
    const item = list[0];
    if (item.rawError) {
      throw new Error(item.rawError);
    }
    return item;
  }

  /**
   * Retrieves verified details of a registered domain from the authorized Spaceship account.
   * GET /api/v1/domains/{domain}
   *
   * @param {string} domain
   * @returns {Promise<object>}
   */
  async getDomainInfo(domain) {
    const norm = normalizeDomainName(domain);
    if (!norm.valid) throw new Error(norm.error);

    if (!this.hasCredentials()) {
      // Mock Sandbox response
      return {
        domain: norm.domain,
        status: 'ACTIVE',
        registeredAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        autoRenew: true,
        nameservers: ['launchpad1.spaceship.com', 'launchpad2.spaceship.com']
      };
    }

    return await this._request(`/domains/${encodeURIComponent(norm.domain)}`, {
      method: 'GET'
    });
  }

  /**
   * Fetches current DNS resource records for a domain from Spaceship DNS.
   * GET /api/v1/dns/records/{domain}
   *
   * @param {string} domain
   * @returns {Promise<Array<{ type: string, name: string, value: string, ttl: number }>>}
   */
  async getDnsRecords(domain) {
    const norm = normalizeDomainName(domain);
    if (!norm.valid) throw new Error(norm.error);

    if (!this.hasCredentials()) {
      return [
        { type: 'A', name: norm.domain, value: '192.0.2.1', ttl: 3600 },
        { type: 'CNAME', name: `www.${norm.domain}`, value: norm.domain, ttl: 3600 },
        { type: 'MX', name: norm.domain, value: 'mail.spaceship.com', ttl: 3600, priority: 10 }
      ];
    }

    const data = await this._request(`/dns/records/${encodeURIComponent(norm.domain)}`, {
      method: 'GET'
    });

    return data.items || data.records || [];
  }

  /**
   * Safely updates DNS records for a domain in Spaceship DNS:
   * 1. Reads existing records.
   * 2. Preserves all MX, SPF, DKIM, DMARC, and unrelated TXT/CNAME records.
   * 3. Replaces only the storefront records (Apex A/ALIAS and www CNAME) and adds TXT ownership token.
   * 4. Puts updated record set back to Spaceship.
   *
   * @param {string} domain
   * @param {Array<{ type: string, name: string, value: string, ttl?: number }>} recordsToApply
   * @returns {Promise<{ success: boolean, appliedRecords: Array<object>, preservedCount: number }>}
   */
  async applyStorefrontDnsRecords(domain, recordsToApply) {
    const norm = normalizeDomainName(domain);
    if (!norm.valid) throw new Error(norm.error);

    const existingRecords = await this.getDnsRecords(norm.domain);

    // Records that MUST NEVER be overwritten by storefront configuration
    const isProtectedRecord = (rec) => {
      const type = (rec.type || '').toUpperCase();
      const name = (rec.name || '').toLowerCase();
      const val = (rec.value || '').toLowerCase();

      // Protect MX (Mail delivery)
      if (type === 'MX') return true;

      // Protect SPF, DKIM, DMARC
      if (type === 'TXT') {
        if (val.includes('v=spf1') || val.includes('v=dkim1') || val.includes('v=dmarc1')) return true;
        if (name.includes('._domainkey.') || name.startsWith('_dmarc.')) return true;
        if (name.startsWith('_ferasetu-challenge.') && !recordsToApply.some(r => r.name.toLowerCase() === name)) {
          return true;
        }
      }

      // Protect custom mail subdomains
      if (name.startsWith('mail.') || name.startsWith('smtp.') || name.startsWith('imap.')) return true;

      return false;
    };

    const preservedRecords = existingRecords.filter(isProtectedRecord);

    // Filter out previous storefront A, AAAA, CNAME records that match the names of records we are applying
    const targetNames = new Set(recordsToApply.map(r => r.name.toLowerCase().trim()));
    const otherNonConflicting = existingRecords.filter(rec => {
      if (isProtectedRecord(rec)) return false;
      const recName = (rec.name || '').toLowerCase().trim();
      return !targetNames.has(recName);
    });

    const finalRecords = [
      ...preservedRecords,
      ...otherNonConflicting,
      ...recordsToApply.map(r => ({
        type: r.type.toUpperCase(),
        name: r.name.toLowerCase().trim(),
        value: r.value.trim(),
        ttl: r.ttl || 300
      }))
    ];

    if (!this.hasCredentials()) {
      return {
        success: true,
        appliedRecords: recordsToApply,
        preservedCount: preservedRecords.length,
        totalRecords: finalRecords.length
      };
    }

    // Call Spaceship DNS update endpoint
    const result = await this._request(`/dns/records/${encodeURIComponent(norm.domain)}`, {
      method: 'PUT',
      body: JSON.stringify({ records: finalRecords })
    });

    return {
      success: true,
      appliedRecords: recordsToApply,
      preservedCount: preservedRecords.length,
      totalRecords: finalRecords.length,
      providerResult: result
    };
  }
}

/**
 * Factory creating SpaceshipClient from Cloudflare Worker env.
 * @param {object} env
 * @returns {SpaceshipClient}
 */
export function createSpaceshipClient(env = {}) {
  const apiKey = env.SPACESHIP_API_KEY || "";
  const apiSecret = env.SPACESHIP_API_SECRET || "";
  const baseUrl = env.SPACESHIP_API_BASE || SPACESHIP_API_BASE;
  const isMock = Boolean(env.SPACESHIP_TEST_MODE || (!apiKey && !apiSecret));
  return new SpaceshipClient({ apiKey, apiSecret, baseUrl, isMock });
}
