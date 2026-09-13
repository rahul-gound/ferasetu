/**
 * FeraSetu Shard Provisioning Service
 *
 * Automates server-side provisioning of new horizontal shards:
 * - Cloudflare Management API for D1 database creation (with market jurisdiction)
 * - Cloudflare Management API for R2 bucket creation (with market jurisdiction)
 * - Schema initialization for tenant tables in the new D1
 * - Concurrency control via shard_locks
 * - Idempotency, safe retry, and failure cleanup
 */

import { SHARD_STATUS } from './config.js';
import { logShardingEvent } from './observability.js';

// Tenant D1 initialization schema
export const TENANT_D1_SCHEMA = `
  CREATE TABLE IF NOT EXISTS shops (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    store_slug TEXT UNIQUE NOT NULL,
    hostname TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_shops_org ON shops(organization_id);
  CREATE INDEX IF NOT EXISTS idx_shops_slug ON shops(store_slug);

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    organization_id TEXT,
    name TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_products_org ON products(organization_id);

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    organization_id TEXT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    items TEXT NOT NULL DEFAULT '[]',
    total REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_orders_org ON orders(organization_id);

  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_customers_org ON customers(organization_id);

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    order_id TEXT,
    invoice_number TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'issued',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    organization_id TEXT,
    provider TEXT NOT NULL DEFAULT 'razorpay',
    provider_order_id TEXT,
    provider_payment_id TEXT,
    amount REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'pending',
    plan TEXT NOT NULL,
    billing_cycle TEXT NOT NULL DEFAULT 'monthly',
    metadata TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS websites (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    organization_id TEXT,
    name TEXT NOT NULL,
    template TEXT NOT NULL DEFAULT 'default',
    config TEXT,
    sections TEXT,
    is_published INTEGER NOT NULL DEFAULT 0,
    theme TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    organization_id TEXT,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ticket_replies (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`;

/**
 * Acquire distributed lock for market provisioning in control plane.
 */
export async function acquireMarketLock(db, market, lockId, ttlSeconds = 60) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
  const nowIso = now.toISOString();

  // Clean up any stale expired lock
  try {
    await db.prepare("DELETE FROM shard_locks WHERE market = ? AND expires_at < ?")
      .bind(market, nowIso)
      .run();
  } catch {}

  // Attempt to acquire lock
  try {
    await db.prepare(`
      INSERT INTO shard_locks (market, locked_by, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(market, lockId, expiresAt, nowIso).run();
    return true;
  } catch (err) {
    // Lock already held by another request
    return false;
  }
}

/**
 * Release distributed lock.
 */
export async function releaseMarketLock(db, market, lockId) {
  try {
    await db.prepare("DELETE FROM shard_locks WHERE market = ? AND locked_by = ?")
      .bind(market, lockId)
      .run();
  } catch (err) {
    console.warn("[releaseMarketLock] Error releasing lock:", err);
  }
}

/**
 * Generates the next deterministic shard key for a market.
 */
export async function getNextShardKey(db, market) {
  const normMarket = market.toUpperCase();
  const prefix = `fs-${normMarket.toLowerCase()}-`;

  const rows = await db.prepare(
    "SELECT shard_key FROM shards WHERE market = ? ORDER BY shard_key DESC"
  ).bind(normMarket).all();

  const shardKeys = rows?.results || [];
  let maxSeq = 0;

  for (const row of shardKeys) {
    const key = row.shard_key || '';
    if (key.startsWith(prefix)) {
      const numPart = parseInt(key.slice(prefix.length), 10);
      if (!isNaN(numPart) && numPart > maxSeq) {
        maxSeq = numPart;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  const seqStr = String(nextSeq).padStart(3, '0');
  return `fs-${normMarket.toLowerCase()}-${seqStr}`;
}

/**
 * Calls Cloudflare Management API to create D1 Database with appropriate jurisdiction.
 */
export async function callCreateD1Database({ accountId, apiToken, databaseName, market, fetcher = fetch }) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database`;
  const body = { name: databaseName };

  if (market === 'EU') {
    body.jurisdiction = 'eu';
  } else if (market === 'US') {
    body.jurisdiction = 'us';
  }

  const res = await fetcher(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    const errMsg = data.errors?.[0]?.message || `Cloudflare D1 creation failed with HTTP ${res.status}`;
    throw new Error(errMsg);
  }

  return {
    databaseId: data.result?.uuid || data.result?.id,
    databaseName: data.result?.name || databaseName,
  };
}

/**
 * Calls Cloudflare Management API to create R2 Bucket with appropriate jurisdiction.
 */
export async function callCreateR2Bucket({ accountId, apiToken, bucketName, market, fetcher = fetch }) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets`;
  const headers = {
    'Authorization': `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  };

  const body = { name: bucketName };
  if (market === 'EU') {
    body.jurisdiction = 'eu';
    headers['cf-r2-jurisdiction'] = 'eu';
  } else if (market === 'US') {
    body.jurisdiction = 'us';
    headers['cf-r2-jurisdiction'] = 'us';
  }

  const res = await fetcher(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    const errMsg = data.errors?.[0]?.message || `Cloudflare R2 creation failed with HTTP ${res.status}`;
    throw new Error(errMsg);
  }

  return {
    bucketName: data.result?.name || bucketName,
  };
}

/**
 * Executes migration/schema statements on a newly created D1 database via HTTP Query API.
 */
export async function callInitializeD1Schema({ accountId, apiToken, databaseId, schemaSql, fetcher = fetch }) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
  const statements = schemaSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const sql of statements) {
    const res = await fetcher(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql, params: [] }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      const errMsg = data.errors?.[0]?.message || `D1 schema initialization failed for statement: ${sql}`;
      throw new Error(errMsg);
    }
  }

  return true;
}

/**
 * Cleans up partially provisioned Cloudflare resources on failure.
 */
export async function cleanupPartialResources({ accountId, apiToken, d1DatabaseId, r2BucketName, fetcher = fetch }) {
  if (d1DatabaseId) {
    try {
      await fetcher(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${d1DatabaseId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${apiToken}` },
      });
    } catch {}
  }
  if (r2BucketName) {
    try {
      await fetcher(`https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${r2BucketName}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${apiToken}` },
      });
    } catch {}
  }
}

/**
 * Orchestrates full provisioning of a new shard for the given market.
 */
export async function provisionNewShard(market, env, options = {}) {
  const normMarket = market.toUpperCase();
  const db = env.DB;
  const lockId = `lock_${crypto.randomUUID()}`;
  const fetcher = options.fetcher || env.CF_API_FETCHER || fetch;

  logShardingEvent('shard_provisioning_requested', { market: normMarket });

  // 1. Concurrency control: Acquire distributed lock
  const acquired = await acquireMarketLock(db, normMarket, lockId, 60);
  if (!acquired) {
    // Another request is actively provisioning for this market.
    // Wait briefly and check if a new active shard becomes available.
    for (let i = 0; i < 5; i++) {
      if (typeof options.waitFn === 'function') {
        await options.waitFn(500);
      }
      const activeShard = await db.prepare(
        "SELECT * FROM shards WHERE market = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1"
      ).bind(normMarket).first();

      if (activeShard) {
        return activeShard;
      }
    }
    throw new Error(`Provisioning lock currently held for market ${normMarket}. Please retry.`);
  }

  const shardId = `shard_${crypto.randomUUID()}`;
  let shardKey = '';
  let d1DatabaseId = '';
  let d1DatabaseName = '';
  let r2BucketName = '';

  try {
    // Check if there is an existing reusable failed shard record to retry
    const existingFailed = await db.prepare(
      "SELECT * FROM shards WHERE market = ? AND status = 'failed' ORDER BY created_at ASC LIMIT 1"
    ).bind(normMarket).first();

    if (existingFailed && options.allowRetryFailed !== false) {
      logShardingEvent('provisioning_retry', { market: normMarket, shard_id: existingFailed.id, shard_key: existingFailed.shard_key });
      shardKey = existingFailed.shard_key;
      d1DatabaseName = existingFailed.d1_database_name;
      r2BucketName = existingFailed.r2_bucket_name;
    } else {
      shardKey = await getNextShardKey(db, normMarket);
      d1DatabaseName = shardKey;
      r2BucketName = `ferasetu-${shardKey}`;
    }

    const now = new Date().toISOString();

    // 2. Insert/update shard in control plane as 'provisioning'
    if (existingFailed) {
      await db.prepare(`
        UPDATE shards SET status = 'provisioning', updated_at = ? WHERE id = ?
      `).bind(now, existingFailed.id).run();
    } else {
      await db.prepare(`
        INSERT INTO shards (
          id, shard_key, market, d1_database_id, d1_database_name, r2_bucket_name,
          status, shop_count, d1_used_bytes, d1_size_checked_at, r2_used_bytes,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'provisioning', 0, 0, ?, 0, ?, ?)
      `).bind(
        shardId, shardKey, normMarket, 'pending', d1DatabaseName, r2BucketName,
        now, now, now
      ).run();
    }

    const accountId = env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = env.CLOUDFLARE_API_TOKEN;

    // Check secrets availability
    if (!accountId || !apiToken) {
      throw new Error("Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN in worker environment");
    }

    // 3. Create Cloudflare D1 Database
    let d1Result;
    try {
      d1Result = await callCreateD1Database({
        accountId,
        apiToken,
        databaseName: d1DatabaseName,
        market: normMarket,
        fetcher,
      });
      d1DatabaseId = d1Result.databaseId;
      logShardingEvent('d1_creation_success', { market: normMarket, shard_key: shardKey, database_id: d1DatabaseId });
    } catch (d1Err) {
      logShardingEvent('d1_creation_failure', { market: normMarket, shard_key: shardKey, error: d1Err.message });
      throw d1Err;
    }

    // 4. Create Cloudflare R2 Bucket
    let r2Result;
    try {
      r2Result = await callCreateR2Bucket({
        accountId,
        apiToken,
        bucketName: r2BucketName,
        market: normMarket,
        fetcher,
      });
      logShardingEvent('r2_creation_success', { market: normMarket, shard_key: shardKey, bucket_name: r2BucketName });
    } catch (r2Err) {
      logShardingEvent('r2_creation_failure', { market: normMarket, shard_key: shardKey, error: r2Err.message });
      // Cleanup partially created D1 resource
      await cleanupPartialResources({ accountId, apiToken, d1DatabaseId, fetcher });
      throw r2Err;
    }

    // 5. Initialize tenant D1 schema
    await callInitializeD1Schema({
      accountId,
      apiToken,
      databaseId: d1DatabaseId,
      schemaSql: TENANT_D1_SCHEMA,
      fetcher,
    });

    // 6. Mark shard active
    const activeTime = new Date().toISOString();
    const effectiveShardId = existingFailed ? existingFailed.id : shardId;

    await db.prepare(`
      UPDATE shards SET
        d1_database_id = ?,
        d1_database_name = ?,
        r2_bucket_name = ?,
        status = 'active',
        updated_at = ?
      WHERE id = ?
    `).bind(d1DatabaseId, d1DatabaseName, r2BucketName, activeTime, effectiveShardId).run();

    logShardingEvent('shard_activated', {
      shard_id: effectiveShardId,
      shard_key: shardKey,
      market: normMarket,
      d1_database_id: d1DatabaseId,
      r2_bucket_name: r2BucketName,
    });

    const activeRecord = await db.prepare("SELECT * FROM shards WHERE id = ?").bind(effectiveShardId).first();
    return activeRecord;
  } catch (err) {
    logShardingEvent('provisioning_failure', { market: normMarket, shard_key: shardKey, error: err.message });
    const effectiveShardId = shardId;
    try {
      await db.prepare("UPDATE shards SET status = 'failed', updated_at = ? WHERE id = ?")
        .bind(new Date().toISOString(), effectiveShardId)
        .run();
    } catch {}
    throw err;
  } finally {
    await releaseMarketLock(db, normMarket, lockId);
  }
}
