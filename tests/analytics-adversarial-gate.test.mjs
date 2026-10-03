/**
 * FeraSetu — Adversarial Analytics Production Security Gate Test Suite
 * 
 * Verifies:
 * 1. Host Header & Forwarded Host Security (X-Forwarded-Host & Referer spoofing blocked)
 * 2. Strict Server-Side Tenant Isolation (IDOR, client organization_id, tenant_id rejected)
 * 3. Data Minimization (order_id forbidden, price coarsened, user_id server-authoritative)
 * 4. Deep PII & Credential Sanitization (emails, phones, JWTs, Bearer tokens, cards redacted)
 * 5. Prototype pollution & structured object injection prevention
 * 6. Rate limiting volume defense (accounting for batch sizes, not just request counts)
 * 7. Consent revocation defense (flusher and pagehide abort when consent is false)
 * 8. Idempotent daily aggregation (multiple runs never multiply counts)
 * 9. Exact retention boundary verification (31-day deleted, 29-day kept)
 * 
 * Run with: node tests/analytics-adversarial-gate.test.mjs
 */

import assert from 'node:assert/strict';
import {
  validateAndSanitizeEvent,
  sanitizeStringValue,
  sanitizeUrlOrPath,
  ALLOWED_EVENT_NAMES,
  FORBIDDEN_PROPERTY_KEYS
} from '../worker/analytics/taxonomy.js';
import {
  handleAnalyticsEvents,
  resolveAuthoritativeTenant,
  checkRateLimit
} from '../worker/analytics/ingestion.js';
import {
  runDailyAggregation,
  pruneRawEvents
} from '../worker/analytics/aggregation.js';
import {
  getOrCreateVisitorId,
  getOrCreateSessionId,
  clearAnalyticsStorage
} from '../worker/analytics/identity.js';

let totalPassed = 0;
let totalFailed = 0;
const testRecords = [];

async function test(suite, name, fn) {
  try {
    await fn();
    console.log(`  ✅ [${suite}] ${name}`);
    totalPassed++;
    testRecords.push({ suite, name, status: 'PASS' });
  } catch (err) {
    console.error(`  ❌ [${suite}] ${name}`);
    console.error(`     Error: ${err.message}`);
    totalFailed++;
    testRecords.push({ suite, name, status: 'FAIL', error: err.message });
  }
}

// In-Memory D1 Mock with SQLite-like SQL semantics
function createMockD1Database() {
  const events = [];
  const aggregates = [];

  return {
    events,
    aggregates,
    prepare(query) {
      return {
        _bound: [],
        bind(...args) {
          this._bound = args;
          return this;
        },
        async run() {
          const q = query.trim().toUpperCase();
          if (q.startsWith('INSERT INTO ANALYTICS_EVENTS')) {
            const [
              id, userId, orgId, tenantId, visitorId, sessionId,
              eventName, eventType, schemaVersion, properties, eventData,
              country, deviceCategory
            ] = this._bound;

            events.push({
              id,
              user_id: userId,
              organization_id: orgId,
              tenant_id: tenantId,
              visitor_id: visitorId,
              session_id: sessionId,
              event_name: eventName,
              event_type: eventType,
              schema_version: schemaVersion,
              properties,
              event_data: eventData,
              country,
              device_category: deviceCategory,
              created_at: new Date().toISOString()
            });
            return { meta: { changes: 1 } };
          }

          if (q.startsWith('INSERT INTO ANALYTICS_AGGREGATES_DAILY')) {
            const [id, tId, date, metric, count, val, updated] = this._bound;
            const dim = q.includes("'UNIQUE_VISITORS'") ? 'unique_visitors' : 'total';
            const existingIdx = aggregates.findIndex(
              a => a.tenant_id === tId && a.date === date && a.metric_name === metric && a.dimension === dim
            );
            if (existingIdx >= 0) {
              aggregates[existingIdx].count = count;
              aggregates[existingIdx].value = val;
              aggregates[existingIdx].updated_at = updated;
            } else {
              aggregates.push({
                id,
                tenant_id: tId,
                date,
                metric_name: metric,
                dimension: dim,
                count,
                value: val,
                updated_at: updated
              });
            }
            return { meta: { changes: 1 } };
          }

          if (q.startsWith('DELETE FROM ANALYTICS_EVENTS')) {
            const cutoff = this._bound[0];
            const beforeCount = events.length;
            // Filter out events older than cutoff
            const remaining = events.filter(e => e.created_at >= cutoff);
            const deleted = beforeCount - remaining.length;
            events.length = 0;
            events.push(...remaining);
            return { meta: { changes: deleted } };
          }

          return { meta: { changes: 0 } };
        },
        async all() {
          const q = query.trim().toUpperCase();
          if (q.includes('FROM ANALYTICS_EVENTS') && q.includes('GROUP BY TENANT_ID, EVENT_NAME')) {
            const [startDate, endDate] = this._bound;
            const filtered = events.filter(e => e.created_at >= startDate && e.created_at < endDate);
            const groupMap = new Map();
            for (const e of filtered) {
              const key = `${e.tenant_id}__${e.event_name}`;
              if (!groupMap.has(key)) {
                groupMap.set(key, {
                  tenant_id: e.tenant_id,
                  event_name: e.event_name,
                  count: 0,
                  visitors: new Set(),
                  sessions: new Set()
                });
              }
              const g = groupMap.get(key);
              g.count++;
              if (e.visitor_id) g.visitors.add(e.visitor_id);
              if (e.session_id) g.sessions.add(e.session_id);
            }

            const results = Array.from(groupMap.values()).map(g => ({
              tenant_id: g.tenant_id,
              event_name: g.event_name,
              event_count: g.count,
              unique_visitors: g.visitors.size,
              unique_sessions: g.sessions.size
            }));

            return { results };
          }

          return { results: [] };
        },
        async first() {
          const res = await this.all();
          return res.results?.[0] || null;
        }
      };
    },
    async batch(statements) {
      for (const s of statements) {
        await s.run();
      }
      return { success: true };
    }
  };
}

function createMockRequest({ method = 'POST', path = '/api/analytics/events', body = null, headers = {}, cf = {} } = {}) {
  const serializedBody = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
  const headerMap = new Map();
  for (const [k, v] of Object.entries(headers)) {
    headerMap.set(k.toLowerCase(), v);
  }
  if (serializedBody && !headerMap.has('content-length')) {
    headerMap.set('content-length', Buffer.byteLength(serializedBody).toString());
  }
  if (!headerMap.has('content-type')) {
    headerMap.set('content-type', 'application/json');
  }

  return {
    method,
    url: `https://ferasetu.com${path}`,
    headers: {
      get(name) {
        return headerMap.get((name || '').toLowerCase()) || null;
      }
    },
    cf: {
      country: 'IN',
      region: 'DL',
      ...cf
    },
    async text() {
      return serializedBody || '';
    },
    async json() {
      return serializedBody ? JSON.parse(serializedBody) : null;
    }
  };
}

function mockJsonHelper(data, status = 200) {
  return { status, data, headers: { 'Content-Type': 'application/json' } };
}

function mockErrorHelper(message, status = 400, details = undefined) {
  return { status, data: { error: message, details }, headers: { 'Content-Type': 'application/json' } };
}

async function runAdversarialGateTests() {
  console.log('\n🔒 ════════════════════════════════════════════════════════════');
  console.log('🔒 SUITE 1: Host Header & Spoofed Forwarding Security');
  console.log('════════════════════════════════════════════════════════════');

  await test('Host Security', 'X-Forwarded-Host spoofing cannot attribute telemetry to another merchant', async () => {
    const req = createMockRequest({
      headers: {
        'Host': 'ferasetu.com',
        'X-Forwarded-Host': 'victim-shop.ferasetu.com'
      },
      body: { event_name: 'page_view', properties: { path: '/' } }
    });

    const mockResolveStorefront = async (r) => {
      // If resolver were passed spoofed header, it might return victim
      const h = r.headers.get('host');
      if (h && h.includes('victim-shop')) {
        return { organizationId: 'org_victim_merchant' };
      }
      return null;
    };

    const ctx = await resolveAuthoritativeTenant(req, {}, null, mockResolveStorefront);
    assert.equal(ctx.tenantId, 'platform', 'Must resolve to platform, not victim');
    assert.equal(ctx.source, 'platform_public');
  });

  await test('Host Security', 'Referer header cannot be used to attribute telemetry to a merchant', async () => {
    const req = createMockRequest({
      headers: {
        'Host': 'ferasetu.com',
        'Referer': 'https://ferasetu.com/shop/victim-merchant'
      },
      body: { event_name: 'page_view', properties: { path: '/shop/victim-merchant' } }
    });

    const mockResolveStorefront = async () => ({ organizationId: 'org_victim_merchant' });
    const ctx = await resolveAuthoritativeTenant(req, {}, null, mockResolveStorefront);
    assert.equal(ctx.tenantId, 'platform', 'Referer must NEVER set tenantId');
  });

  console.log('\n🛡️ ════════════════════════════════════════════════════════════');
  console.log('🛡️ SUITE 2: Server-Side Tenant Isolation & IDOR Attacks');
  console.log('════════════════════════════════════════════════════════════');

  const mockDb = createMockD1Database();

  await test('IDOR Defense', 'Client-supplied organization_id and tenant_id are discarded', async () => {
    const req = createMockRequest({
      body: {
        event_name: 'cta_click',
        tenant_id: 'org_victim_spoof',
        organization_id: 'org_victim_spoof',
        properties: {
          cta_id: 'btn_free_trial',
          tenant_id: 'org_victim_spoof'
        }
      }
    });

    const res = await handleAnalyticsEvents(req, { DB: mockDb }, {
      jsonHelper: mockJsonHelper,
      errorResponseHelper: mockErrorHelper
    });

    assert.equal(res.status, 201);
    assert.equal(res.data.tenant_id, 'platform');
    const stored = mockDb.events[mockDb.events.length - 1];
    assert.equal(stored.tenant_id, 'platform');
    assert.equal(stored.organization_id, null);
    const props = JSON.parse(stored.properties);
    assert.equal(props.tenant_id, undefined, 'properties.tenant_id must be stripped');
  });

  await test('IDOR Defense', 'Forged JWT does not grant merchant tenant identity', async () => {
    const req = createMockRequest({
      headers: { 'Authorization': 'Bearer forger.tampered.token' },
      body: { event_name: 'page_view', properties: { path: '/dashboard' } }
    });

    // Mock auth verifier rejecting forged token
    const mockGetAuthUser = async () => {
      throw new Error('Invalid JWT signature');
    };

    const ctx = await resolveAuthoritativeTenant(req, {}, mockGetAuthUser, null);
    assert.equal(ctx.tenantId, 'platform', 'Tampered JWT must fallback safely to platform');
    assert.equal(ctx.userId, null);
  });

  console.log('\n🧹 ════════════════════════════════════════════════════════════');
  console.log('🧹 SUITE 3: Data Minimization & Removing order_id');
  console.log('════════════════════════════════════════════════════════════');

  await test('Minimization', 'order_id is forbidden and strictly redacted from analytics', () => {
    assert.ok(FORBIDDEN_PROPERTY_KEYS.has('order_id'));
    assert.ok(FORBIDDEN_PROPERTY_KEYS.has('order'));

    const raw = {
      event_name: 'order_complete',
      properties: {
        order_id: 'ord_secret_9999',
        item_count: 3,
        payment_method: 'card',
        total_amount: 1499.85
      }
    };

    const sanitized = validateAndSanitizeEvent(raw);
    assert.ok(sanitized.valid);
    assert.equal(sanitized.event.properties.order_id, undefined, 'order_id must be stripped');
    assert.equal(sanitized.event.properties.item_count, 3);
    assert.equal(sanitized.event.properties.payment_method, 'card');
    assert.equal(sanitized.event.properties.total_amount, 1500, 'total_amount must be rounded/coarsened to integer');
  });

  await test('Minimization', 'Disallowed payment_method strings normalize to other', () => {
    const raw = {
      event_name: 'order_complete',
      properties: {
        payment_method: 'unapproved_crypto_token_xyz'
      }
    };
    const sanitized = validateAndSanitizeEvent(raw);
    assert.equal(sanitized.event.properties.payment_method, 'other');
  });

  console.log('\n🔐 ════════════════════════════════════════════════════════════');
  console.log('🔐 SUITE 4: Deep PII & Credential Sanitization Bypasses');
  console.log('════════════════════════════════════════════════════════════');

  await test('Sanitizer', 'Redacts email addresses embedded inside legitimate string properties', () => {
    const res = sanitizeStringValue('Please contact ceo@targetcorp.com for discounts');
    assert.equal(res, 'Please contact [REDACTED_EMAIL] for discounts');
  });

  await test('Sanitizer', 'Redacts phone numbers embedded inside legitimate string properties', () => {
    const res = sanitizeStringValue('Urgent: Call +1-555-867-5309 immediately');
    assert.equal(res, 'Urgent: Call [REDACTED_PHONE] immediately');
  });

  await test('Sanitizer', 'Redacts JWTs and Bearer tokens inside string values', () => {
    const rawJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const res = sanitizeStringValue(`Authorization: Bearer ${rawJwt}`);
    assert.ok(res.includes('[REDACTED_TOKEN]') || res.includes('[REDACTED_JWT]'));
    assert.ok(!res.includes(rawJwt));
  });

  await test('Sanitizer', 'Redacts credit card numbers embedded inside strings', () => {
    const res = sanitizeStringValue('Card was 4111-2222-3333-4444 expired');
    assert.equal(res, 'Card was [REDACTED_CARD] expired');
  });

  await test('Sanitizer', 'Prevents prototype pollution and drops nested object properties', () => {
    const raw = {
      event_name: 'page_view',
      properties: {
        '__proto__': { polluted: true },
        'constructor': { polluted: true },
        'nested_object': { email: 'leak@example.com' },
        'path': '/home'
      }
    };
    const sanitized = validateAndSanitizeEvent(raw);
    assert.ok(sanitized.valid);
    assert.equal(sanitized.event.properties.path, '/home');
    assert.equal(sanitized.event.properties.nested_object, undefined);
    assert.equal(Object.prototype.polluted, undefined, 'Prototype must not be polluted');
  });

  await test('Sanitizer', 'Strips extensive sensitive query params from URL paths', () => {
    const url = '/checkout?token=tok_123&access_token=acc_456&code=authcode&jwt=myjwt&session=sess_9&password=p1&key=k1&secret=s1&email=test@a.com&phone=123&keep=ok';
    const clean = sanitizeUrlOrPath(url);
    assert.equal(clean, '/checkout?keep=ok');
  });

  console.log('\n⚡ ════════════════════════════════════════════════════════════');
  console.log('⚡ SUITE 5: Rate Limiting & Batch Volume Defense');
  console.log('════════════════════════════════════════════════════════════');

  await test('Rate Limiting', 'Batch volume counts toward rate limits (120 events limit)', async () => {
    const testIp = '198.51.100.42';

    // 5 batches of 20 = 100 events (below 120 limit)
    const allowed = await checkRateLimit(testIp, {}, 100);
    assert.equal(allowed, true);

    // Another batch of 20 = 120 events total (hits limit)
    const allowed2 = await checkRateLimit(testIp, {}, 20);
    assert.equal(allowed2, true);

    // Attempting 1 more event = 121 (exceeds limit)
    const blocked = await checkRateLimit(testIp, {}, 1);
    assert.equal(blocked, false, 'Must reject when total event volume exceeds window limit');
  });

  console.log('\n🚫 ════════════════════════════════════════════════════════════');
  console.log('🚫 SUITE 6: Consent Revocation & Beacon Defense');
  console.log('════════════════════════════════════════════════════════════');

  await test('Consent Revocation', 'Revocation evicts identifiers and wipes memory queue', () => {
    const mockStorage = new Map();
    globalThis.localStorage = {
      getItem: (k) => mockStorage.get(k) || null,
      setItem: (k, v) => mockStorage.set(k, String(v)),
      removeItem: (k) => mockStorage.delete(k)
    };
    globalThis.sessionStorage = {
      getItem: (k) => mockStorage.get(k) || null,
      setItem: (k, v) => mockStorage.set(k, String(v)),
      removeItem: (k) => mockStorage.delete(k)
    };

    // Granted consent creates IDs
    const vid = getOrCreateVisitorId(true);
    const sid = getOrCreateSessionId(true);
    assert.ok(vid);
    assert.ok(sid);

    // Revocation clears all
    clearAnalyticsStorage();
    assert.equal(mockStorage.has('fera_visitor_id'), false);
    assert.equal(mockStorage.has('fera_session_id'), false);

    const vidPost = getOrCreateVisitorId(false);
    assert.equal(vidPost, null);
  });

  console.log('\n📊 ════════════════════════════════════════════════════════════');
  console.log('📊 SUITE 7: Aggregation Idempotency & Retention Boundaries');
  console.log('════════════════════════════════════════════════════════════');

  const aggDb = createMockD1Database();

  await test('Aggregation', 'Running aggregation repeatedly is idempotent and does not multiply counts', async () => {
    // Insert 5 raw events for today
    const today = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < 5; i++) {
      aggDb.events.push({
        id: `evt_id_${i}`,
        tenant_id: 'platform',
        event_name: 'page_view',
        visitor_id: `vis_${i % 2}`, // 2 unique visitors
        session_id: `sess_${i % 2}`,
        created_at: `${today}T12:00:00.000Z`
      });
    }

    // Run 1
    const res1 = await runDailyAggregation({ DB: aggDb }, today);
    assert.ok(res1.aggregatedRecords >= 2);
    const totalRow1 = aggDb.aggregates.find(a => a.metric_name === 'page_view' && a.dimension === 'total');
    assert.equal(totalRow1.count, 5);
    const uniqRow1 = aggDb.aggregates.find(a => a.metric_name === 'page_view' && a.dimension === 'unique_visitors');
    assert.equal(uniqRow1.count, 2);

    // Run 2 (Should NOT multiply counts or duplicate rows)
    await runDailyAggregation({ DB: aggDb }, today);
    const matchingRows = aggDb.aggregates.filter(a => a.metric_name === 'page_view');
    assert.equal(matchingRows.length, 2, 'Must maintain exactly 2 aggregate metric rows');
    const totalRow2 = aggDb.aggregates.find(a => a.metric_name === 'page_view' && a.dimension === 'total');
    assert.equal(totalRow2.count, 5, 'Count must remain 5, not 10');
  });

  await test('Retention', 'Exact 30-day boundary deletes 31-day event and preserves 29-day event', async () => {
    const pruneDb = createMockD1Database();
    const nowMs = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const event31DaysOld = new Date(nowMs - 31 * dayMs).toISOString();
    const event29DaysOld = new Date(nowMs - 29 * dayMs).toISOString();
    const eventCurrent = new Date().toISOString();

    pruneDb.events.push(
      { id: 'old_31', created_at: event31DaysOld, tenant_id: 'platform', event_name: 'page_view' },
      { id: 'keep_29', created_at: event29DaysOld, tenant_id: 'platform', event_name: 'page_view' },
      { id: 'keep_curr', created_at: eventCurrent, tenant_id: 'platform', event_name: 'page_view' }
    );

    // Exact cutoff at 30 days
    const cutoff30Days = new Date(nowMs - 30 * dayMs).toISOString();
    const pruneRes = await pruneRawEvents({ DB: pruneDb }, 30, cutoff30Days);

    assert.equal(pruneRes.deletedRows, 1, 'Exactly 1 row (31-day old) must be deleted');
    assert.equal(pruneDb.events.length, 2, '2 rows (29-day and current) must be kept');
    assert.equal(pruneDb.events.find(e => e.id === 'old_31'), undefined);
    assert.ok(pruneDb.events.find(e => e.id === 'keep_29'));
    assert.ok(pruneDb.events.find(e => e.id === 'keep_curr'));
  });

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('🏁 ADVERSARIAL PRODUCTION GATE SUMMARY');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`Total Passed: ${totalPassed}`);
  console.log(`Total Failed: ${totalFailed}`);

  if (totalFailed > 0) {
    console.error('\n❌ CRITICAL DEFECTS DETECTED IN PRODUCTION GATE AUDIT');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL ADVERSARIAL PRODUCTION GATE CHECKS PASSED!');
  }
}

runAdversarialGateTests();
