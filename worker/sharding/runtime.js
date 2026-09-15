/**
 * FeraSetu Runtime Shard Database & Media Access Layer
 *
 * Implements clean runtime abstractions:
 * - getTenantDatabase(shopId, env)
 * - getTenantMediaStore(shopId, env)
 *
 * Resolves Cloudflare's platform limitation where dynamically created D1 databases
 * do not have static Worker bindings, by utilizing the official Cloudflare D1
 * HTTP Database Query API behind a transparent, compatible D1 client interface.
 */

import { getShardForShop } from './router.js';
import { B2Client } from '../media/b2Client.js';

class DynamicD1QueryError extends Error {
  constructor(message, status = 500, details) {
    super(message);
    this.name = 'DynamicD1QueryError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Creates a D1-compatible client wrapper that executes queries via Cloudflare D1 HTTP API.
 */
export function createDynamicD1Client({ accountId, apiToken, databaseId, fetcher = fetch }) {
  const queryUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  async function executeSingle(sql, params = []) {
    const res = await fetcher(queryUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql, params }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      const errMsg = data.errors?.[0]?.message || `Cloudflare D1 HTTP query failed with HTTP ${res.status}`;
      throw new DynamicD1QueryError(errMsg, res.status, data.errors);
    }

    // Cloudflare D1 API returns result as an array of query results
    const firstResult = Array.isArray(data.result) ? data.result[0] : data.result;
    return {
      results: firstResult?.results || [],
      success: firstResult?.success ?? true,
      meta: firstResult?.meta || {},
    };
  }

  return {
    databaseId,
    prepare(sql) {
      return {
        _sql: sql,
        _params: [],
        bind(...params) {
          this._params = params;
          return this;
        },
        async first(col) {
          const res = await executeSingle(this._sql, this._params);
          const row = res.results?.[0] || null;
          if (!row) return null;
          return col ? row[col] : row;
        },
        async all() {
          const res = await executeSingle(this._sql, this._params);
          return {
            results: res.results,
            success: res.success,
            meta: res.meta,
          };
        },
        async run() {
          const res = await executeSingle(this._sql, this._params);
          return {
            success: res.success,
            meta: res.meta,
          };
        },
      };
    },
    async batch(statements) {
      const results = [];
      for (const stmt of statements) {
        results.push(await stmt.all());
      }
      return results;
    },
    async exec(sql) {
      const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
      let lastMeta = {};
      for (const s of statements) {
        const res = await executeSingle(s, []);
        lastMeta = res.meta;
      }
      return { count: statements.length, duration: lastMeta.duration || 0 };
    },
  };
}

/**
 * Returns a D1 database interface for the given shopId.
 * Directly routes to static env.DB if it's the primary database,
 * or wraps dynamic Cloudflare D1 HTTP API for provisioned shards.
 */
export async function getTenantDatabase(shopId, env) {
  const shard = await getShardForShop(shopId, env);

  // If shop is mapped to primary control plane or static binding matches
  if (!shard || shard.d1_database_id === 'primary' || shard.d1_database_id === env.DB_ID || !env.CLOUDFLARE_API_TOKEN) {
    return env.DB;
  }

  // Dynamic D1 client using HTTP query API
  return createDynamicD1Client({
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    apiToken: env.CLOUDFLARE_API_TOKEN,
    databaseId: shard.d1_database_id,
    fetcher: env.CF_API_FETCHER || fetch,
  });
}

/**
 * Returns an R2 media store scoped strictly to the given shop.
 * Enforces server-side tenant isolation guardrails so cross-tenant object access is denied.
 */
export async function getTenantMediaStore(shopId, env) {
  const shard = await getShardForShop(shopId, env);
  const bucketName = shard?.r2_bucket_name || env.B2_BUCKET || env.B2_BUCKET_NAME || env.MEDIA_BUCKET_NAME || 'ferasetu-media-prod';
  const applicationKeyId = env.B2_APPLICATION_KEY_ID || env.B2_KEY_ID;
  const applicationKey = env.B2_APPLICATION_KEY || env.B2_APP_KEY || env.B2_SECRET_KEY;
  const endpoint = env.B2_ENDPOINT || 'https://s3.eu-central-003.backblazeb2.com';
  const region = env.B2_REGION || 'eu-central-003';

  const tenantPrefix = `shops/${shopId}/`;

  function validateTenantKey(key) {
    if (!key || typeof key !== 'string') {
      throw new Error("Invalid media key");
    }
    if (!key.startsWith(tenantPrefix)) {
      throw new Error(`Unauthorized: Key '${key}' is outside tenant boundary '${tenantPrefix}'`);
    }
  }

  // 1. Explicit test mock store (allowed for testing / CI)
  const mockStore = env._mockB2Store || env._mockR2Store;
  if (mockStore) {
    return {
      bucketName,
      shopId,
      async put(key, body, options = {}) {
        validateTenantKey(key);
        const size = typeof body === 'string' ? body.length : (body?.byteLength || body?.size || 1024);
        const meta = {
          size,
          httpMetadata: { contentType: options?.contentType || options?.httpMetadata?.contentType || 'application/octet-stream' },
          uploaded: new Date(),
        };
        mockStore.set(`${bucketName}:${key}`, { body, meta });
        return meta;
      },
      async get(key, options = {}) {
        validateTenantKey(key);
        const item = mockStore.get(`${bucketName}:${key}`);
        if (!item) return null;
        return {
          body: item.body,
          size: item.meta.size,
          httpMetadata: item.meta.httpMetadata,
        };
      },
      async head(key) {
        validateTenantKey(key);
        const item = mockStore.get(`${bucketName}:${key}`);
        if (!item) return null;
        return item.meta;
      },
      async delete(key) {
        validateTenantKey(key);
        mockStore.delete(`${bucketName}:${key}`);
        return true;
      },
    };
  }

  // 2. Backblaze B2 S3-compatible media store (Production)
  if (applicationKeyId && applicationKey) {
    const b2Client = new B2Client({
      endpoint,
      bucketName,
      applicationKeyId,
      applicationKey,
      region,
      fetcher: env.B2_FETCHER || fetch,
    });

    return {
      bucketName,
      shopId,
      async put(key, body, options = {}) {
        validateTenantKey(key);
        const contentType = options?.contentType || options?.httpMetadata?.contentType || 'application/octet-stream';
        const contentLength = options?.contentLength ?? (typeof body === 'string' ? body.length : (body?.byteLength || body?.size));
        const res = await b2Client.putObject(key, body, {
          contentType,
          contentLength,
          payloadSha256: options?.payloadSha256,
        });
        return {
          size: contentLength,
          httpMetadata: { contentType },
          uploaded: new Date(),
          etag: res.etag,
        };
      },
      async get(key, options = {}) {
        validateTenantKey(key);
        const res = await b2Client.getObject(key, options);
        if (res.status === 404) return null;
        if (!res.ok && res.status !== 206) {
          throw new Error(`B2 getObject failed with status ${res.status}`);
        }
        return {
          body: res.body,
          size: parseInt(res.headers.get('content-length') || '0', 10),
          httpMetadata: { contentType: res.headers.get('content-type') },
          etag: res.headers.get('etag'),
          lastModified: res.headers.get('last-modified'),
          status: res.status,
          headers: res.headers,
        };
      },
      async head(key) {
        validateTenantKey(key);
        const meta = await b2Client.headObject(key);
        if (!meta) return null;
        return {
          size: meta.size,
          httpMetadata: { contentType: meta.contentType },
          etag: meta.etag,
          lastModified: meta.lastModified,
          acceptRanges: meta.acceptRanges,
        };
      },
      async delete(key) {
        validateTenantKey(key);
        return await b2Client.deleteObject(key);
      },
    };
  }

  // 3. Native Worker R2 binding fallback if present
  const nativeBucket = env.MEDIA_BUCKET || env.R2;
  if (nativeBucket && typeof nativeBucket.get === 'function') {
    return {
      bucketName,
      shopId,
      async put(key, body, options = {}) {
        validateTenantKey(key);
        return await nativeBucket.put(key, body, options);
      },
      async get(key) {
        validateTenantKey(key);
        return await nativeBucket.get(key);
      },
      async head(key) {
        validateTenantKey(key);
        return await nativeBucket.head(key);
      },
      async delete(key) {
        validateTenantKey(key);
        return await nativeBucket.delete(key);
      },
    };
  }

  // 4. Production guardrail: fail loudly if storage configuration is missing
  throw new Error(
    "Media storage configuration error: Backblaze B2 credentials (B2_ENDPOINT, B2_BUCKET_NAME, B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY) are missing."
  );
}

