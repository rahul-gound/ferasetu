import assert from 'node:assert/strict';
import * as jose from '../worker/node_modules/jose/dist/node/esm/index.js';
import worker, {
  assignTenantToShard,
  getShardForShop,
  getTenantDatabase,
  getTenantMediaStore,
  provisionNewShard,
} from '../worker/index.js';
import {
  SHARD_STATUS,
  getShopTargetPerShard,
  getAuthoritativeMediaQuota,
} from '../worker/sharding/config.js';
import {
  handleUploadIntent,
  handleCompleteUpload,
  handleDeleteMedia,
  handleGetMediaUsage,
  cleanupExpiredReservations,
} from '../worker/media/mediaService.js';

let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, err });
    console.error(`  ❌ ${name}:`, err.message);
  }
}

// In-memory control-plane D1 database
function createControlPlaneDb() {
  const tables = {
    users: [],
    organizations: [],
    organization_members: [],
    shops: [],
    shards: [],
    shard_locks: [],
    shop_storage: [],
    media_files: [],
    upload_reservations: [],
    products: [],
    orders: [],
  };

  return {
    tables,
    prepare(sql) {
      return {
        _sql: sql,
        _params: [],
        bind(...params) {
          this._params = params;
          return this;
        },
        async first(col) {
          const s = sql.toLowerCase().replace(/\s+/g, ' ');
          if (s.includes('from shops where id =')) {
            const row = tables.shops.find(x => x.id === this._params[0]);
            if (!row) return null;
            return col ? row[col] : { ...row };
          }
          if (s.includes('from shards where id =')) {
            const row = tables.shards.find(x => x.id === this._params[0]);
            if (!row) return null;
            return col ? row[col] : { ...row };
          }
          if (s.includes('from shards where market =') && s.includes("status = 'failed'")) {
            const row = tables.shards.find(x => x.market === this._params[0] && x.status === 'failed');
            if (!row) return null;
            return col ? row[col] : { ...row };
          }
          if (s.includes('from shards where market =') && s.includes("status = 'active'")) {
            const row = tables.shards.find(x => x.market === this._params[0] && x.status === 'active');
            if (!row) return null;
            return col ? row[col] : { ...row };
          }
          if (s.includes('from shop_storage where shop_id =')) {
            const row = tables.shop_storage.find(x => x.shop_id === this._params[0]);
            if (!row) return null;
            return col ? row[col] : { ...row };
          }
          if (s.includes('from upload_reservations where id =') && s.includes('shop_id =')) {
            const row = tables.upload_reservations.find(x => x.id === this._params[0] && x.shop_id === this._params[1]);
            if (!row) return null;
            return col ? row[col] : { ...row };
          }
          if (s.includes('from upload_reservations where id =')) {
            const row = tables.upload_reservations.find(x => x.id === this._params[0]);
            if (!row) return null;
            return col ? row[col] : { ...row };
          }
          if (s.includes('from media_files where id =') && s.includes('shop_id =')) {
            const row = tables.media_files.find(x => x.id === this._params[0] && x.shop_id === this._params[1]);
            if (!row) return null;
            return col ? row[col] : { ...row };
          }
          if (s.includes('select count(*) as count from media_files where shop_id =')) {
            const count = tables.media_files.filter(x => x.shop_id === this._params[0]).length;
            return { count };
          }
          return null;
        },
        async all() {
          const s = sql.toLowerCase().replace(/\s+/g, ' ');
          if (s.includes('from shards') && s.includes('where market = ?') && s.includes('status in')) {
            const market = this._params[0];
            const results = tables.shards
              .filter(x => x.market === market && (x.status === 'active' || x.status === 'warning'))
              .sort((a, b) => a.shop_count - b.shop_count);
            return { results };
          }
          if (s.includes('from shards where market = ? order by shard_key desc')) {
            const market = this._params[0];
            const results = tables.shards
              .filter(x => x.market === market)
              .sort((a, b) => b.shard_key.localeCompare(a.shard_key));
            return { results };
          }
          if (s.includes('from shards order by')) {
            return { results: [...tables.shards] };
          }
          if (s.includes('from upload_reservations') && s.includes('shop_id = ?') && s.includes("status = 'pending'") && s.includes('expires_at < ?')) {
            const [shopId, nowIso] = this._params;
            const results = tables.upload_reservations.filter(
              x => x.shop_id === shopId && x.status === 'pending' && x.expires_at < nowIso
            );
            return { results };
          }
          return { results: [] };
        },
        async run() {
          const s = sql.toLowerCase().replace(/\s+/g, ' ');
          // Shard lock acquisition
          if (s.includes('insert into shard_locks')) {
            const [market, locked_by, expires_at, created_at] = this._params;
            const existing = tables.shard_locks.find(x => x.market === market);
            if (existing) {
              if (new Date(existing.expires_at) < new Date()) {
                existing.locked_by = locked_by;
                existing.expires_at = expires_at;
                return { success: true };
              }
              throw new Error(`UNIQUE constraint failed: shard_locks.market`);
            }
            tables.shard_locks.push({ market, locked_by, expires_at, created_at });
            return { success: true };
          }
          // Shard lock release
          if (s.includes('delete from shard_locks where market = ? and locked_by = ?')) {
            const [market, locked_by] = this._params;
            const idx = tables.shard_locks.findIndex(x => x.market === market && x.locked_by === locked_by);
            if (idx >= 0) tables.shard_locks.splice(idx, 1);
            return { success: true };
          }
          if (s.includes('delete from shard_locks where market = ? and expires_at < ?')) {
            const [market, nowIso] = this._params;
            const idx = tables.shard_locks.findIndex(x => x.market === market && x.expires_at < nowIso);
            if (idx >= 0) tables.shard_locks.splice(idx, 1);
            return { success: true };
          }
          // Shard insertion
          if (s.includes('insert into shards')) {
            const [id, shard_key, market, d1_database_id, d1_database_name, r2_bucket_name, d1_size_checked_at, created_at, updated_at] = this._params;
            tables.shards.push({
              id,
              shard_key,
              market,
              d1_database_id,
              d1_database_name,
              r2_bucket_name,
              status: 'provisioning',
              shop_count: 0,
              d1_used_bytes: 0,
              d1_size_checked_at,
              r2_used_bytes: 0,
              created_at,
              updated_at,
            });
            return { success: true };
          }
          // Shard activation / status update
          if (s.includes('update shards set') && s.includes('d1_database_id = ?')) {
            const [d1_database_id, d1_database_name, r2_bucket_name, updated_at, id] = this._params;
            const row = tables.shards.find(x => x.id === id);
            if (row) {
              row.d1_database_id = d1_database_id;
              row.d1_database_name = d1_database_name;
              row.r2_bucket_name = r2_bucket_name;
              row.status = 'active';
              row.updated_at = updated_at;
            }
            return { success: true };
          }
          if (s.includes('update shards set status =') && (s.includes("'failed'") || this._params.includes('failed'))) {
            const updated_at = this._params[0];
            const id = this._params[this._params.length - 1];
            const row = tables.shards.find(x => x.id === id);
            if (row) {
              row.status = 'failed';
              row.updated_at = updated_at;
            }
            return { success: true };
          }
          if (s.includes('update shards set status = ?, updated_at = ? where id = ?')) {
            const [status, updated_at, id] = this._params;
            const row = tables.shards.find(x => x.id === id);
            if (row) {
              row.status = status;
              row.updated_at = updated_at;
            }
            return { success: true };
          }
          if (s.includes('update shards set shop_count = ?, status = ?, updated_at = ? where id = ?')) {
            const [shop_count, status, updated_at, id] = this._params;
            const row = tables.shards.find(x => x.id === id);
            if (row) {
              row.shop_count = shop_count;
              row.status = status;
              row.updated_at = updated_at;
            }
            return { success: true };
          }
          // Shop updates
          if (s.includes('update shops set shard_id = ?, updated_at = ? where id = ?')) {
            const [shard_id, updated_at, id] = this._params;
            const row = tables.shops.find(x => x.id === id);
            if (row) {
              row.shard_id = shard_id;
              row.updated_at = updated_at;
            }
            return { success: true };
          }
          // Shop storage insert/update
          if (s.includes('insert or ignore into shop_storage') || s.includes('insert into shop_storage')) {
            const [shop_id, quota_bytes, updated_at] = this._params;
            const existing = tables.shop_storage.find(x => x.shop_id === shop_id);
            if (!existing) {
              tables.shop_storage.push({ shop_id, quota_bytes, used_bytes: 0, reserved_bytes: 0, updated_at });
            }
            return { success: true };
          }
          if (s.includes('update shop_storage') && s.includes('set used_bytes = ?')) {
            const [usedBytes, shopId] = this._params;
            const row = tables.shop_storage.find(x => x.shop_id === shopId);
            if (row) {
              row.used_bytes = usedBytes;
            }
            return { success: true };
          }
          if (s.includes('update shop_storage') && s.includes('set reserved_bytes = reserved_bytes + ?')) {
            const [bytes, updated_at, shop_id] = this._params;
            const row = tables.shop_storage.find(x => x.shop_id === shop_id);
            if (row) {
              row.reserved_bytes = (row.reserved_bytes || 0) + bytes;
              row.updated_at = updated_at;
            }
            return { success: true };
          }
          if (s.includes('update shop_storage') && s.includes('set used_bytes = used_bytes + ?')) {
            const [actualSize, reservedBytes, updated_at, shop_id] = this._params;
            const row = tables.shop_storage.find(x => x.shop_id === shop_id);
            if (row) {
              row.used_bytes = (row.used_bytes || 0) + actualSize;
              row.reserved_bytes = Math.max(0, (row.reserved_bytes || 0) - reservedBytes);
              row.updated_at = updated_at;
            }
            return { success: true };
          }
          if (s.includes('update shop_storage') && s.includes('set used_bytes = max(0, used_bytes - ?)')) {
            const [freedBytes, updated_at, shop_id] = this._params;
            const row = tables.shop_storage.find(x => x.shop_id === shop_id);
            if (row) {
              row.used_bytes = Math.max(0, (row.used_bytes || 0) - freedBytes);
              row.updated_at = updated_at;
            }
            return { success: true };
          }
          if (s.includes('update shop_storage') && s.includes('set reserved_bytes = max(0, reserved_bytes - ?)')) {
            const shop_id = this._params[this._params.length - 1];
            const freedBytes = this._params[0];
            const row = tables.shop_storage.find(x => x.shop_id === shop_id);
            if (row) {
              row.reserved_bytes = Math.max(0, (row.reserved_bytes || 0) - freedBytes);
              if (this._params.length === 3) row.updated_at = this._params[1];
            }
            return { success: true };
          }
          // Upload reservation insert/update
          if (s.includes('insert into upload_reservations')) {
            const [id, shop_id, r2_key, reserved_bytes, expires_at] = this._params;
            tables.upload_reservations.push({
              id, shop_id, r2_key, reserved_bytes, expires_at, status: 'pending'
            });
            return { success: true };
          }
          if (s.includes('update upload_reservations set status =')) {
            const id = this._params[this._params.length - 1];
            const row = tables.upload_reservations.find(x => x.id === id);
            if (row) {
              if (s.includes("'expired'")) {
                row.status = 'expired';
              } else if (s.includes("'cancelled'")) {
                row.status = 'cancelled';
              } else if (s.includes("'completed'")) {
                row.status = 'completed';
              } else {
                row.status = this._params[0];
              }
            }
            return { success: true };
          }
          // Media files insert/delete
          if (s.includes('insert into media_files')) {
            const [id, shop_id, r2_key, size_bytes, content_type, created_at] = this._params;
            tables.media_files.push({ id, shop_id, r2_key, size_bytes, content_type, created_at });
            return { success: true };
          }
          if (s.includes('delete from media_files where id = ?')) {
            const id = this._params[0];
            const idx = tables.media_files.findIndex(x => x.id === id);
            if (idx >= 0) tables.media_files.splice(idx, 1);
            return { success: true };
          }
          return { success: true };
        }
      };
    }
  };
}

// Generate RSA key for WorkOS JWT validation in worker
const { privateKey, publicKey } = await jose.generateKeyPair('RS256');
const jwk = await jose.exportJWK(publicKey);
jwk.kid = 'test-workos-key-sharding';

async function createMerchantToken(userId, orgId = null, role = 'owner') {
  return await new jose.SignJWT({
    sub: userId,
    email: `${userId}@example.com`,
    name: `User ${userId}`,
    org_id: orgId,
    role: role,
  })
    .setProtectedHeader({ alg: 'RS256', kid: jwk.kid })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(privateKey);
}

// Create mock Cloudflare API fetcher
function createMockCloudflareApi(options = {}) {
  const calls = [];
  const mockFetcher = async (url, init = {}) => {
    const urlStr = String(url);
    const method = init.method || 'GET';
    const body = init.body ? JSON.parse(init.body) : {};
    const headers = init.headers || {};
    calls.push({ url: urlStr, method, body, headers });

    // D1 database creation
    if (urlStr.endsWith('/d1/database') && method === 'POST') {
      if (options.failD1) {
        return new Response(JSON.stringify({ success: false, errors: [{ message: 'Cloudflare D1 creation error: quota exceeded' }] }), { status: 400 });
      }
      return new Response(JSON.stringify({
        success: true,
        result: {
          uuid: `d1_${body.name}_${Math.random().toString(36).substring(2, 7)}`,
          name: body.name,
        }
      }), { status: 200 });
    }

    // R2 bucket creation
    if (urlStr.endsWith('/r2/buckets') && method === 'POST') {
      if (options.failR2) {
        return new Response(JSON.stringify({ success: false, errors: [{ message: 'Cloudflare R2 creation error: bucket conflict' }] }), { status: 409 });
      }
      return new Response(JSON.stringify({
        success: true,
        result: { name: body.name }
      }), { status: 200 });
    }

    // D1 schema initialization
    if (urlStr.includes('/d1/database/') && urlStr.endsWith('/query')) {
      return new Response(JSON.stringify({
        success: true,
        result: [{ success: true, results: [], meta: { changes: 1 } }]
      }), { status: 200 });
    }

    return new Response(JSON.stringify({ success: true, result: {} }), { status: 200 });
  };

  return { mockFetcher, calls };
}

console.log('\n🚀 Starting FeraSetu Horizontal Tenant Sharding Test Suite (19 Scenarios)\n');

// 1. First shop assignment
await test('Scenario 1: First shop assignment creates initial shard and assigns shop', async () => {
  const db = createControlPlaneDb();
  const { mockFetcher, calls } = createMockCloudflareApi();
  const env = {
    DB: db,
    CLOUDFLARE_ACCOUNT_ID: 'cf_acc_123',
    CLOUDFLARE_API_TOKEN: 'cf_token_secret',
    DEV_SHOP_TARGET_PER_SHARD: '3',
    CF_API_FETCHER: mockFetcher,
  };

  db.tables.shops.push({ id: 'shop_001', organization_id: 'shop_001', name: 'First Shop', store_slug: 'first-shop' });

  const shard = await assignTenantToShard('shop_001', 'IN', env);
  assert.ok(shard, 'Shard should be returned');
  assert.equal(shard.market, 'IN');
  assert.equal(shard.shard_key, 'fs-in-001');
  assert.equal(shard.status, 'active');
  assert.equal(shard.shop_count, 1);

  const shopInDb = await db.prepare("SELECT * FROM shops WHERE id = ?").bind('shop_001').first();
  assert.equal(shopInDb.shard_id, shard.id, 'Shop should have shard_id stored');

  // Verify Cloudflare D1 and R2 API were invoked
  const d1Call = calls.find(c => c.url.endsWith('/d1/database'));
  assert.ok(d1Call, 'Cloudflare D1 creation API should be called');
  assert.equal(d1Call.body.name, 'fs-in-001');

  const r2Call = calls.find(c => c.url.endsWith('/r2/buckets'));
  assert.ok(r2Call, 'Cloudflare R2 creation API should be called');
});

// 2. Normal shard assignment
await test('Scenario 2: Normal shard assignment routes to existing active shard with capacity', async () => {
  const db = createControlPlaneDb();
  const { mockFetcher, calls } = createMockCloudflareApi();
  const env = {
    DB: db,
    CLOUDFLARE_ACCOUNT_ID: 'cf_acc_123',
    CLOUDFLARE_API_TOKEN: 'cf_token_secret',
    DEV_SHOP_TARGET_PER_SHARD: '3',
    CF_API_FETCHER: mockFetcher,
  };

  db.tables.shops.push({ id: 'shop_001', organization_id: 'shop_001', name: 'First Shop', store_slug: 'first-shop' });
  db.tables.shops.push({ id: 'shop_002', organization_id: 'shop_002', name: 'Second Shop', store_slug: 'second-shop' });

  const shard1 = await assignTenantToShard('shop_001', 'IN', env);
  const callsCountBefore = calls.length;

  const shard2 = await assignTenantToShard('shop_002', 'IN', env);
  assert.equal(shard2.id, shard1.id, 'Second shop should reuse shard 1');
  assert.equal(shard2.shop_count, 2, 'Shop count should increment to 2');
  assert.equal(calls.length, callsCountBefore, 'No additional Cloudflare API calls should be made');
});

// 3. Shard becomes full at target capacity
await test('Scenario 3: Shard transitions to full when reaching configured target', async () => {
  const db = createControlPlaneDb();
  const { mockFetcher } = createMockCloudflareApi();
  const env = {
    DB: db,
    CLOUDFLARE_ACCOUNT_ID: 'cf_acc_123',
    CLOUDFLARE_API_TOKEN: 'cf_token_secret',
    DEV_SHOP_TARGET_PER_SHARD: '3',
    CF_API_FETCHER: mockFetcher,
  };

  db.tables.shops.push({ id: 'shop_001', organization_id: 'shop_001', name: 'Shop 1', store_slug: 's1' });
  db.tables.shops.push({ id: 'shop_002', organization_id: 'shop_002', name: 'Shop 2', store_slug: 's2' });
  db.tables.shops.push({ id: 'shop_003', organization_id: 'shop_003', name: 'Shop 3', store_slug: 's3' });

  await assignTenantToShard('shop_001', 'IN', env);
  await assignTenantToShard('shop_002', 'IN', env);
  const shard3 = await assignTenantToShard('shop_003', 'IN', env);

  assert.equal(shard3.shop_count, 3);
  assert.equal(shard3.status, 'full', 'Shard should be marked full at target 3');
});

// 4. Next shop causes new shard provisioning
await test('Scenario 4: Next shop automatically provisions shard fs-in-002 when fs-in-001 is full', async () => {
  const db = createControlPlaneDb();
  const { mockFetcher } = createMockCloudflareApi();
  const env = {
    DB: db,
    CLOUDFLARE_ACCOUNT_ID: 'cf_acc_123',
    CLOUDFLARE_API_TOKEN: 'cf_token_secret',
    DEV_SHOP_TARGET_PER_SHARD: '3',
    CF_API_FETCHER: mockFetcher,
  };

  db.tables.shops.push({ id: 'shop_001', organization_id: 'shop_001', name: 'Shop 1', store_slug: 's1' });
  db.tables.shops.push({ id: 'shop_002', organization_id: 'shop_002', name: 'Shop 2', store_slug: 's2' });
  db.tables.shops.push({ id: 'shop_003', organization_id: 'shop_003', name: 'Shop 3', store_slug: 's3' });
  db.tables.shops.push({ id: 'shop_004', organization_id: 'shop_004', name: 'Shop 4', store_slug: 's4' });

  await assignTenantToShard('shop_001', 'IN', env);
  await assignTenantToShard('shop_002', 'IN', env);
  await assignTenantToShard('shop_003', 'IN', env);

  const shard4 = await assignTenantToShard('shop_004', 'IN', env);
  assert.equal(shard4.shard_key, 'fs-in-002', 'Fourth shop should be assigned to fs-in-002');
  assert.equal(shard4.shop_count, 1, 'fs-in-002 shop count should be 1');
  assert.equal(shard4.status, 'active');
});

// 5. Two concurrent signups do not create duplicate shards
await test('Scenario 5: Concurrent provisioning requests acquire distributed lock and do not duplicate shards', async () => {
  const db = createControlPlaneDb();
  const { mockFetcher } = createMockCloudflareApi();
  const env = {
    DB: db,
    CLOUDFLARE_ACCOUNT_ID: 'cf_acc_123',
    CLOUDFLARE_API_TOKEN: 'cf_token_secret',
    DEV_SHOP_TARGET_PER_SHARD: '3',
    CF_API_FETCHER: mockFetcher,
  };

  db.tables.shops.push({ id: 'concurrent_1', organization_id: 'c1', name: 'C1', store_slug: 'c1' });
  db.tables.shops.push({ id: 'concurrent_2', organization_id: 'c2', name: 'C2', store_slug: 'c2' });

  // Execute concurrent provisioning with mock waitFn
  const [res1, res2] = await Promise.all([
    assignTenantToShard('concurrent_1', 'IN', env, { waitFn: (ms) => new Promise(r => setTimeout(r, 50)) }),
    assignTenantToShard('concurrent_2', 'IN', env, { waitFn: (ms) => new Promise(r => setTimeout(r, 50)) }),
  ]);

  const allShards = db.tables.shards;
  assert.equal(allShards.length, 1, 'Exactly one shard should be provisioned for both concurrent requests');
  assert.equal(allShards[0].shard_key, 'fs-in-001');
});

// 6. Failed D1 creation
await test('Scenario 6: Failed D1 creation sets shard status to failed and logs failure', async () => {
  const db = createControlPlaneDb();
  const { mockFetcher } = createMockCloudflareApi({ failD1: true });
  const env = {
    DB: db,
    CLOUDFLARE_ACCOUNT_ID: 'cf_acc_123',
    CLOUDFLARE_API_TOKEN: 'cf_token_secret',
    DEV_SHOP_TARGET_PER_SHARD: '3',
    CF_API_FETCHER: mockFetcher,
  };

  db.tables.shops.push({ id: 'fail_shop', organization_id: 'fs', name: 'Fail Shop', store_slug: 'fs' });

  await assert.rejects(
    async () => await assignTenantToShard('fail_shop', 'IN', env),
    /Cloudflare D1 creation error/
  );

  const shard = db.tables.shards[0];
  assert.ok(shard);
  assert.equal(shard.status, 'failed', 'Shard status must be failed');
});

// 7. Failed R2 creation
await test('Scenario 7: Failed R2 creation triggers cleanup and marks shard failed', async () => {
  const db = createControlPlaneDb();
  const { mockFetcher, calls } = createMockCloudflareApi({ failR2: true });
  const env = {
    DB: db,
    CLOUDFLARE_ACCOUNT_ID: 'cf_acc_123',
    CLOUDFLARE_API_TOKEN: 'cf_token_secret',
    DEV_SHOP_TARGET_PER_SHARD: '3',
    CF_API_FETCHER: mockFetcher,
  };

  db.tables.shops.push({ id: 'r2_fail_shop', organization_id: 'r2s', name: 'R2 Fail Shop', store_slug: 'r2s' });

  await assert.rejects(
    async () => await assignTenantToShard('r2_fail_shop', 'IN', env),
    /Cloudflare R2 creation error/
  );

  const shard = db.tables.shards[0];
  assert.ok(shard);
  assert.equal(shard.status, 'failed', 'Shard must be marked failed when R2 fails');

  // Verify cleanup delete call was made for the created D1
  const deleteCall = calls.find(c => c.method === 'DELETE' && c.url.includes('/d1/database/'));
  assert.ok(deleteCall, 'Cleanup DELETE should be issued for partially created D1');
});

// 8. Retry after provisioning failure
await test('Scenario 8: Retry after provisioning failure reuses failed shard record without duplicate keys', async () => {
  const db = createControlPlaneDb();
  // First attempt fails R2
  const { mockFetcher: failingFetcher } = createMockCloudflareApi({ failR2: true });
  const envFail = {
    DB: db,
    CLOUDFLARE_ACCOUNT_ID: 'cf_acc_123',
    CLOUDFLARE_API_TOKEN: 'cf_token_secret',
    DEV_SHOP_TARGET_PER_SHARD: '3',
    CF_API_FETCHER: failingFetcher,
  };

  db.tables.shops.push({ id: 'retry_shop', organization_id: 'rs', name: 'Retry Shop', store_slug: 'rs' });
  try { await assignTenantToShard('retry_shop', 'IN', envFail); } catch {}

  assert.equal(db.tables.shards.length, 1);
  assert.equal(db.tables.shards[0].status, 'failed');

  // Second attempt succeeds
  const { mockFetcher: successFetcher } = createMockCloudflareApi();
  const envSuccess = {
    ...envFail,
    CF_API_FETCHER: successFetcher,
  };

  const activeShard = await assignTenantToShard('retry_shop', 'IN', envSuccess);
  assert.equal(db.tables.shards.length, 1, 'Retry must not create duplicate shard records');
  assert.equal(activeShard.shard_key, 'fs-in-001');
  assert.equal(activeShard.status, 'active');
});

// 9. EU creates EU-jurisdiction resources
await test('Scenario 9: EU market creates D1 and R2 with EU jurisdiction parameter', async () => {
  const db = createControlPlaneDb();
  const { mockFetcher, calls } = createMockCloudflareApi();
  const env = {
    DB: db,
    CLOUDFLARE_ACCOUNT_ID: 'cf_acc_123',
    CLOUDFLARE_API_TOKEN: 'cf_token_secret',
    DEV_SHOP_TARGET_PER_SHARD: '3',
    CF_API_FETCHER: mockFetcher,
  };

  db.tables.shops.push({ id: 'eu_shop', organization_id: 'eu_s', name: 'EU Shop', store_slug: 'eu-s' });

  const shard = await assignTenantToShard('eu_shop', 'EU', env);
  assert.equal(shard.market, 'EU');
  assert.equal(shard.shard_key, 'fs-eu-001');

  const d1Call = calls.find(c => c.url.endsWith('/d1/database'));
  assert.equal(d1Call.body.jurisdiction, 'eu', 'EU D1 must have jurisdiction eu');

  const r2Call = calls.find(c => c.url.endsWith('/r2/buckets'));
  assert.equal(r2Call.headers['cf-r2-jurisdiction'], 'eu', 'EU R2 must have cf-r2-jurisdiction eu header');
});

// 10. US creates US-jurisdiction resources
await test('Scenario 10: US market creates D1 and R2 with US jurisdiction parameter', async () => {
  const db = createControlPlaneDb();
  const { mockFetcher, calls } = createMockCloudflareApi();
  const env = {
    DB: db,
    CLOUDFLARE_ACCOUNT_ID: 'cf_acc_123',
    CLOUDFLARE_API_TOKEN: 'cf_token_secret',
    DEV_SHOP_TARGET_PER_SHARD: '3',
    CF_API_FETCHER: mockFetcher,
  };

  db.tables.shops.push({ id: 'us_shop', organization_id: 'us_s', name: 'US Shop', store_slug: 'us-s' });

  const shard = await assignTenantToShard('us_shop', 'US', env);
  assert.equal(shard.market, 'US');
  assert.equal(shard.shard_key, 'fs-us-001');

  const d1Call = calls.find(c => c.url.endsWith('/d1/database'));
  assert.equal(d1Call.body.jurisdiction, 'us', 'US D1 must have jurisdiction us');

  const r2Call = calls.find(c => c.url.endsWith('/r2/buckets'));
  assert.equal(r2Call.headers['cf-r2-jurisdiction'], 'us', 'US R2 must have cf-r2-jurisdiction us header');
});

// 11. Merchant cannot access another merchant's media
await test('Scenario 11: Multi-tenant R2 isolation prevents merchant from accessing another merchant media', async () => {
  const db = createControlPlaneDb();
  const env = {
    DB: db,
    _mockR2Store: new Map(),
  };

  db.tables.shops.push({ id: 'shop_a', shard_id: 'shard_1' });
  db.tables.shops.push({ id: 'shop_b', shard_id: 'shard_1' });
  db.tables.shards.push({ id: 'shard_1', r2_bucket_name: 'ferasetu-fs-in-001' });

  const storeA = await getTenantMediaStore('shop_a', env);
  await storeA.put('shops/shop_a/products/img1.jpg', 'fake-image-bytes-a', { httpMetadata: { contentType: 'image/jpeg' } });

  // Merchant A can read own media
  const itemA = await storeA.get('shops/shop_a/products/img1.jpg');
  assert.ok(itemA, 'Merchant A should access own media');

  // Merchant B store attempting to read Merchant A's key throws error
  const storeB = await getTenantMediaStore('shop_b', env);
  await assert.rejects(
    async () => await storeB.get('shops/shop_a/products/img1.jpg'),
    /outside tenant boundary/
  );

  // Merchant B store attempting to delete Merchant A's key throws error
  await assert.rejects(
    async () => await storeB.delete('shops/shop_a/products/img1.jpg'),
    /outside tenant boundary/
  );
});

// 12. Starter/Free plan cannot exceed media quota
await test('Scenario 12: India Free plan rejects upload exceeding 500 MB quota', async () => {
  const db = createControlPlaneDb();
  const env = { DB: db };
  const orgContext = {
    organization: { id: 'shop_free', market: 'IN', plan: 'free' },
  };

  // Pre-seed storage at 490 MB used
  db.tables.shop_storage.push({
    shop_id: 'shop_free',
    quota_bytes: 500 * 1024 * 1024,
    used_bytes: 490 * 1024 * 1024,
    reserved_bytes: 0,
    updated_at: new Date().toISOString(),
  });

  // Attempt to reserve 15 MB (490 + 15 = 505 MB > 500 MB)
  const req = new Request('https://ferasetu.com/api/media/upload-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ size_bytes: 15 * 1024 * 1024, filename: 'catalog.pdf' }),
  });

  await assert.rejects(
    async () => await handleUploadIntent(req, env, orgContext),
    (err) => err.status === 413 && err.message.includes('quota exceeded')
  );
});

// 13. Frontend-modified plan is ignored
await test('Scenario 13: Client-provided plan in body is ignored in favor of server authoritative plan', async () => {
  const db = createControlPlaneDb();
  const env = { DB: db };
  // Merchant is Free in server context
  const orgContext = {
    organization: { id: 'shop_spoof', market: 'IN', plan: 'free' },
  };

  // Client requests with forged enterprise plan in body
  const req = new Request('https://ferasetu.com/api/media/upload-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      size_bytes: 10 * 1024 * 1024,
      filename: 'sample.jpg',
      plan: 'enterprise', // Malicious attempt to get 250 GB
      quota_bytes: 250 * 1024 * 1024 * 1024,
    }),
  });

  const res = await handleUploadIntent(req, env, orgContext);
  assert.ok(res.success);

  // Authoritative storage quota must remain 500 MB (Free)
  const storage = await db.prepare("SELECT * FROM shop_storage WHERE shop_id = ?").bind('shop_spoof').first();
  assert.equal(storage.quota_bytes, 500 * 1024 * 1024, 'Storage quota must strictly match server plan (500 MB)');
});

// 14. Forged shop ID is ignored
await test('Scenario 14: Client-provided shop_id in body is ignored in favor of authenticated shop', async () => {
  const db = createControlPlaneDb();
  const env = { DB: db };
  const orgContext = {
    organization: { id: 'legit_shop_id', market: 'IN', plan: 'free' },
  };

  const req = new Request('https://ferasetu.com/api/media/upload-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shop_id: 'victim_shop_id', // Malicious spoof
      size_bytes: 1024,
      filename: 'test.jpg',
    }),
  });

  const res = await handleUploadIntent(req, env, orgContext);
  assert.ok(res.r2_key.startsWith('shops/legit_shop_id/'), 'Generated R2 key must strictly use authenticated shop ID');
  assert.ok(!res.r2_key.includes('victim_shop_id'));
});

// 15. Forged shard ID is ignored
await test('Scenario 15: Forged shard ID in request headers or body is ignored', async () => {
  const db = createControlPlaneDb();
  const env = { DB: db };
  const orgContext = {
    organization: { id: 'merchant_shard_test', market: 'IN', plan: 'free' },
  };

  const req = new Request('https://ferasetu.com/api/media/upload-intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shard-Id': 'shard_fake_999',
    },
    body: JSON.stringify({
      shard_id: 'shard_fake_999',
      size_bytes: 2048,
    }),
  });

  const res = await handleUploadIntent(req, env, orgContext);
  assert.ok(res.success);
  assert.ok(!res.r2_key.includes('shard_fake_999'));
});

// 16. Concurrent upload reservation cannot exceed quota
await test('Scenario 16: Two concurrent upload reservations cannot together exceed plan quota', async () => {
  const db = createControlPlaneDb();
  const env = { DB: db };
  const orgContext = {
    organization: { id: 'concurrent_uploader', market: 'IN', plan: 'free' },
  };

  // Quota is 500 MB. First upload reserves 300 MB, second requests 300 MB concurrently.
  const req1 = new Request('https://ferasetu.com/api/media/upload-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ size_bytes: 20 * 1024 * 1024, filename: 'batch1.bin' }), // 20 MB
  });
  const res1 = await handleUploadIntent(req1, env, orgContext);
  assert.ok(res1.reservation_id);

  // Set used bytes to 490 MB
  const storage = await db.prepare("SELECT * FROM shop_storage WHERE shop_id = ?").bind('concurrent_uploader').first();
  await db.prepare("UPDATE shop_storage SET used_bytes = ? WHERE shop_id = ?")
    .bind(490 * 1024 * 1024, 'concurrent_uploader')
    .run();

  // Next reservation requests 5 MB. But reserved is 20 MB and used is 490 MB -> total 510 MB > 500 MB!
  const req2 = new Request('https://ferasetu.com/api/media/upload-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ size_bytes: 5 * 1024 * 1024, filename: 'batch2.bin' }),
  });

  await assert.rejects(
    async () => await handleUploadIntent(req2, env, orgContext),
    (err) => err.status === 413
  );
});

// 17. Deleting media releases quota
await test('Scenario 17: Deleting media reduces used_bytes and removes media registry row', async () => {
  const db = createControlPlaneDb();
  const env = {
    DB: db,
    _mockR2Store: new Map([
      ['ferasetu-media:shops/del_shop/products/test.jpg', { body: 'data', meta: { size: 500000 } }]
    ])
  };
  const orgContext = {
    organization: { id: 'del_shop', market: 'IN', plan: 'free' },
  };

  db.tables.shop_storage.push({
    shop_id: 'del_shop',
    quota_bytes: 500 * 1024 * 1024,
    used_bytes: 500000,
    reserved_bytes: 0,
    updated_at: new Date().toISOString(),
  });
  db.tables.media_files.push({
    id: 'media_to_delete',
    shop_id: 'del_shop',
    r2_key: 'shops/del_shop/products/test.jpg',
    size_bytes: 500000,
    content_type: 'image/jpeg',
    created_at: new Date().toISOString(),
  });

  const res = await handleDeleteMedia('media_to_delete', env, orgContext);
  assert.equal(res.success, true);
  assert.equal(res.freed_bytes, 500000);

  const storageAfter = await db.prepare("SELECT * FROM shop_storage WHERE shop_id = ?").bind('del_shop').first();
  assert.equal(storageAfter.used_bytes, 0, 'used_bytes should be reduced to 0');

  const fileAfter = await db.prepare("SELECT * FROM media_files WHERE id = ?").bind('media_to_delete').first();
  assert.equal(fileAfter, null, 'media_file row must be deleted');
});

// 18. Expired reservations are cleaned up
await test('Scenario 18: Expired reservations are cleaned up and release reserved capacity', async () => {
  const db = createControlPlaneDb();
  const pastIso = new Date(Date.now() - 3600 * 1000).toISOString();

  db.tables.shop_storage.push({
    shop_id: 'expired_shop',
    quota_bytes: 500 * 1024 * 1024,
    used_bytes: 0,
    reserved_bytes: 10 * 1024 * 1024, // 10 MB reserved
    updated_at: pastIso,
  });

  db.tables.upload_reservations.push({
    id: 'res_expired_1',
    shop_id: 'expired_shop',
    r2_key: 'shops/expired_shop/products/old.jpg',
    reserved_bytes: 10 * 1024 * 1024,
    expires_at: pastIso,
    status: 'pending',
  });

  const freed = await cleanupExpiredReservations(db, 'expired_shop');
  assert.equal(freed, 10 * 1024 * 1024, '10 MB should be freed');

  const storage = await db.prepare("SELECT * FROM shop_storage WHERE shop_id = ?").bind('expired_shop').first();
  assert.equal(storage.reserved_bytes, 0, 'reserved_bytes should be cleared');

  const res = await db.prepare("SELECT * FROM upload_reservations WHERE id = ?").bind('res_expired_1').first();
  assert.equal(res.status, 'expired', 'Reservation status must be updated to expired');
});

// 19. Shard migration/draining logic does not lose tenant data
await test('Scenario 19: Draining shard is bypassed for new tenants while preserving existing tenant data', async () => {
  const db = createControlPlaneDb();
  const { mockFetcher } = createMockCloudflareApi();
  const env = {
    DB: db,
    CLOUDFLARE_ACCOUNT_ID: 'cf_acc_123',
    CLOUDFLARE_API_TOKEN: 'cf_token_secret',
    DEV_SHOP_TARGET_PER_SHARD: '3',
    CF_API_FETCHER: mockFetcher,
  };

  // Pre-seed shard 1 in draining status with existing shop
  db.tables.shards.push({
    id: 'shard_draining',
    shard_key: 'fs-in-001',
    market: 'IN',
    d1_database_id: 'd1_drain',
    d1_database_name: 'fs-in-001',
    r2_bucket_name: 'ferasetu-fs-in-001',
    status: 'draining',
    shop_count: 2,
    d1_used_bytes: 1000,
    r2_used_bytes: 1000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  db.tables.shops.push({
    id: 'existing_shop_on_draining',
    organization_id: 'existing_org',
    shard_id: 'shard_draining',
    name: 'Existing Tenant',
    store_slug: 'existing-tenant',
  });

  // 1. Existing tenant retains access to its assigned draining shard
  const existingShard = await getShardForShop('existing_shop_on_draining', env);
  assert.equal(existingShard.id, 'shard_draining', 'Existing tenant data and shard mapping must be preserved');

  // 2. New tenant requests assignment: router must reject the draining shard and provision a new shard
  db.tables.shops.push({
    id: 'new_tenant_after_drain',
    organization_id: 'new_org',
    name: 'New Tenant',
    store_slug: 'new-tenant',
  });

  const newShard = await assignTenantToShard('new_tenant_after_drain', 'IN', env);
  assert.notEqual(newShard.id, 'shard_draining', 'New tenant must not be assigned to draining shard');
  assert.equal(newShard.shard_key, 'fs-in-002', 'New tenant should receive next active shard fs-in-002');
  assert.equal(newShard.status, 'active');
});

console.log('\n────────────────────────────────────────────────────────────');
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error('\n❌ Failures:');
  for (const f of failures) {
    console.error(`  - ${f.name}:`, f.err.stack || f.err);
  }
  process.exit(1);
} else {
  console.log('\n🌟 All 19 Horizontal Sharding & Media Quota scenarios passed successfully!\n');
}
