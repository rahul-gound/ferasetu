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
  const bucketName = shard?.r2_bucket_name || env.MEDIA_BUCKET_NAME || 'ferasetu-media';

  const tenantPrefix = `shops/${shopId}/`;

  function validateTenantKey(key) {
    if (!key || typeof key !== 'string') {
      throw new Error("Invalid media key");
    }
    if (!key.startsWith(tenantPrefix)) {
      throw new Error(`Unauthorized: Key '${key}' is outside tenant boundary '${tenantPrefix}'`);
    }
  }

  // If native Worker R2 binding is available and matches
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

  // Supported HTTP / S3 client for dynamic buckets or testing fallback
  const fetcher = env.CF_API_FETCHER || fetch;
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = env.CLOUDFLARE_API_TOKEN;

  return {
    bucketName,
    shopId,
    async put(key, body, options = {}) {
      validateTenantKey(key);
      // If simulated or test store
      if (env._mockR2Store) {
        const size = typeof body === 'string' ? body.length : (body?.byteLength || body?.size || 1024);
        const meta = {
          size,
          httpMetadata: { contentType: options?.httpMetadata?.contentType || 'application/octet-stream' },
          uploaded: new Date(),
        };
        env._mockR2Store.set(`${bucketName}:${key}`, { body, meta });
        return meta;
      }

      const res = await fetcher(`https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucketName}/objects/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': options?.httpMetadata?.contentType || 'application/octet-stream',
        },
        body,
      });
      return await res.json();
    },
    async get(key) {
      validateTenantKey(key);
      if (env._mockR2Store) {
        const item = env._mockR2Store.get(`${bucketName}:${key}`);
        if (!item) return null;
        return {
          body: item.body,
          size: item.meta.size,
          httpMetadata: item.meta.httpMetadata,
        };
      }
      const res = await fetcher(`https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucketName}/objects/${encodeURIComponent(key)}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiToken}` },
      });
      if (res.status === 404) return null;
      return {
        body: await res.arrayBuffer(),
        size: parseInt(res.headers.get('content-length') || '0', 10),
      };
    },
    async head(key) {
      validateTenantKey(key);
      if (env._mockR2Store) {
        const item = env._mockR2Store.get(`${bucketName}:${key}`);
        if (!item) return null;
        return item.meta;
      }
      const res = await fetcher(`https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucketName}/objects/${encodeURIComponent(key)}`, {
        method: 'HEAD',
        headers: { 'Authorization': `Bearer ${apiToken}` },
      });
      if (res.status === 404) return null;
      return {
        size: parseInt(res.headers.get('content-length') || '0', 10),
        httpMetadata: { contentType: res.headers.get('content-type') },
      };
    },
    async delete(key) {
      validateTenantKey(key);
      if (env._mockR2Store) {
        env._mockR2Store.delete(`${bucketName}:${key}`);
        return true;
      }
      await fetcher(`https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucketName}/objects/${encodeURIComponent(key)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${apiToken}` },
      });
      return true;
    },
  };
}
