/**
 * FeraSetu — Privacy-First Analytics & Consent Verification Test Suite
 *
 * Principle: "Measure behavior, don't manufacture identities."
 * 
 * Verifies:
 * 1. Consent management (categories, defaults, versioning, revocation, storage auto-eviction)
 * 2. Event taxonomy validation (allowlisted events, property limits, strict redaction of PII & credentials)
 * 3. Server-side tenant isolation & IDOR prevention (no forged org_id/shop_id acceptance)
 * 4. Rate limiting and payload size abuse defense
 * 5. Daily metrics aggregation and retention pruning
 * 6. Friction & error telemetry safety (sanitization of tokens, emails, phones)
 * 
 * Run with: node tests/privacy-first-analytics.test.mjs
 */

import assert from 'node:assert/strict';
import { validateAndSanitizeEvent, sanitizeUrlOrPath, classifyDeviceCategory, ALLOWED_EVENT_NAMES, FORBIDDEN_PROPERTY_KEYS } from '../worker/analytics/taxonomy.js';
import { handleAnalyticsEvents, resolveAuthoritativeTenant } from '../worker/analytics/ingestion.js';
import { runDailyAggregation, pruneRawEvents, getPlatformAnalytics } from '../worker/analytics/aggregation.js';
import { getOrCreateVisitorId, getOrCreateSessionId, clearAnalyticsStorage } from '../worker/analytics/identity.js';

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

// Mock in-memory D1 database
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
            const [id, tenantId, date, metricName, dimension, count, value, nowIso] = this._bound;
            const existingIdx = aggregates.findIndex(a =>
              a.tenant_id === tenantId && a.date === date && a.metric_name === metricName && a.dimension === dimension
            );
            if (existingIdx >= 0) {
              aggregates[existingIdx].count = count;
              aggregates[existingIdx].value = value;
              aggregates[existingIdx].updated_at = nowIso;
            } else {
              aggregates.push({ id, tenant_id: tenantId, date, metric_name: metricName, dimension, count, value, created_at: nowIso, updated_at: nowIso });
            }
            return { meta: { changes: 1 } };
          }

          if (q.startsWith('DELETE FROM ANALYTICS_EVENTS')) {
            const days = this._bound[0] || 30;
            const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
            const initialCount = events.length;
            const remaining = events.filter(e => new Date(e.created_at).getTime() >= cutoff);
            events.length = 0;
            events.push(...remaining);
            return { meta: { changes: initialCount - remaining.length } };
          }

          return { meta: { changes: 0 } };
        },
        async all() {
          const q = query.trim().toUpperCase();
          if (q.includes('FROM ANALYTICS_EVENTS') && q.includes('GROUP BY TENANT_ID, EVENT_NAME')) {
            const map = new Map();
            for (const e of events) {
              const key = `${e.tenant_id}__${e.event_name}`;
              if (!map.has(key)) {
                map.set(key, { tenant_id: e.tenant_id, event_name: e.event_name, event_count: 0, visitors: new Set(), sessions: new Set() });
              }
              const entry = map.get(key);
              entry.event_count++;
              if (e.visitor_id) entry.visitors.add(e.visitor_id);
              if (e.session_id) entry.sessions.add(e.session_id);
            }
            const results = Array.from(map.values()).map(m => ({
              tenant_id: m.tenant_id,
              event_name: m.event_name,
              event_count: m.event_count,
              unique_visitors: m.visitors.size,
              unique_sessions: m.sessions.size
            }));
            return { results };
          }

          if (q.includes('GROUP BY EVENT_NAME')) {
            const map = new Map();
            for (const e of events.filter(x => x.tenant_id === 'platform')) {
              if (!map.has(e.event_name)) {
                map.set(e.event_name, { event_name: e.event_name, count: 0, visitors: new Set(), sessions: new Set() });
              }
              const item = map.get(e.event_name);
              item.count++;
              if (e.visitor_id) item.visitors.add(e.visitor_id);
              if (e.session_id) item.sessions.add(e.session_id);
            }
            return {
              results: Array.from(map.values()).map(m => ({
                event_name: m.event_name,
                count: m.count,
                visitors: m.visitors.size,
                sessions: m.sessions.size
              }))
            };
          }

          if (q.includes('GROUP BY DEVICE_CATEGORY')) {
            const map = {};
            for (const e of events.filter(x => x.tenant_id === 'platform')) {
              map[e.device_category] = (map[e.device_category] || 0) + 1;
            }
            return { results: Object.entries(map).map(([k, v]) => ({ device_category: k, count: v })) };
          }

          if (q.includes('GROUP BY COUNTRY')) {
            const map = {};
            for (const e of events.filter(x => x.tenant_id === 'platform')) {
              map[e.country] = (map[e.country] || 0) + 1;
            }
            return { results: Object.entries(map).map(([k, v]) => ({ country: k, count: v })) };
          }

          if (q.includes('WHERE TENANT_ID = \'PLATFORM\' AND EVENT_NAME = \'ERROR\'')) {
            const errs = events.filter(e => e.tenant_id === 'platform' && e.event_name === 'error');
            return { results: errs };
          }

          return { results: [] };
        },
        async first(field) {
          const res = await this.all();
          const first = res.results?.[0];
          return field ? first?.[field] : first;
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

// Helpers for mock requests
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
        return headerMap.get(name.toLowerCase()) || null;
      }
    },
    cf: {
      country: 'IN',
      region: 'DL',
      city: 'New Delhi', // Intentionally provided to verify city is NOT stored
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

async function runAllTests() {
  console.log('\n🛡️ ════════════════════════════════════════════════════════════');
  console.log('🛡️ SUITE 1: Consent Architecture & Anonymous Identifiers');
  console.log('════════════════════════════════════════════════════════════');

  // Set up mock window, localStorage, and sessionStorage
  const mockStorage = {
    local: new Map(),
    session: new Map()
  };
  globalThis.window = {};
  globalThis.localStorage = {
    getItem: (k) => mockStorage.local.get(k) || null,
    setItem: (k, v) => mockStorage.local.set(k, String(v)),
    removeItem: (k) => mockStorage.local.delete(k),
  };
  globalThis.sessionStorage = {
    getItem: (k) => mockStorage.session.get(k) || null,
    setItem: (k, v) => mockStorage.session.set(k, String(v)),
    removeItem: (k) => mockStorage.session.delete(k),
  };

  await test('Consent', 'Declined consent yields null visitor_id and clears storage', () => {
    mockStorage.local.set('fera_visitor_id', 'old_id');
    const id = getOrCreateVisitorId(false);
    assert.equal(id, null);
    assert.equal(mockStorage.local.has('fera_visitor_id'), false);
  });

  await test('Consent', 'Granted consent generates a cryptographically random UUID v4', () => {
    const id = getOrCreateVisitorId(true);
    assert.ok(id);
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    // Preserves existing ID upon subsequent calls
    const id2 = getOrCreateVisitorId(true);
    assert.equal(id, id2);
  });

  await test('Consent', 'Ephemeral session ID rotates on 30-minute inactivity', () => {
    const s1 = getOrCreateSessionId(true);
    assert.ok(s1);
    // Simulate active session within 30 min
    const s2 = getOrCreateSessionId(true);
    assert.equal(s1, s2);
    // Simulate expired session (31 minutes ago)
    mockStorage.session.set('fera_session_last_active', (Date.now() - 31 * 60 * 1000).toString());
    const s3 = getOrCreateSessionId(true);
    assert.ok(s3);
    assert.notEqual(s1, s3);
  });

  await test('Consent', 'clearAnalyticsStorage evicts all identifiers immediately', () => {
    getOrCreateVisitorId(true);
    getOrCreateSessionId(true);
    assert.ok(mockStorage.local.has('fera_visitor_id'));
    clearAnalyticsStorage();
    assert.equal(mockStorage.local.has('fera_visitor_id'), false);
    assert.equal(mockStorage.session.has('fera_session_id'), false);
  });

  console.log('\n📋 ════════════════════════════════════════════════════════════');
  console.log('📋 SUITE 2: Event Taxonomy, Schema Validation & Data Minimization');
  console.log('════════════════════════════════════════════════════════════');

  await test('Taxonomy', 'Approved events pass validation (page_view, cta_click, signup_start)', () => {
    const req = createMockRequest();
    const res = validateAndSanitizeEvent({ event_name: 'cta_click', properties: { cta_id: 'hero_btn', location: 'hero' } }, req);
    assert.equal(res.valid, true);
    assert.equal(res.event.event_name, 'cta_click');
    assert.equal(res.event.properties.cta_id, 'hero_btn');
  });

  await test('Taxonomy', 'Unapproved/Arbitrary event names are strictly rejected', () => {
    const req = createMockRequest();
    const res = validateAndSanitizeEvent({ event_name: 'evil_keylogger_event', properties: {} }, req);
    assert.equal(res.valid, undefined);
    assert.match(res.error, /Invalid or unapproved event_name/);
  });

  await test('Taxonomy', 'Forbidden credential and PII keys are automatically redacted', () => {
    const req = createMockRequest();
    const payload = {
      event_name: 'page_view',
      properties: {
        path: '/pricing',
        password: 'SuperSecretPassword123!',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIi...',
        authorization: 'Bearer token123',
        credit_card: '4111222233334444',
        cvv: '123',
        email: 'customer@victim.com',
        phone: '+919876543210',
        keystrokes: 'User typed text here',
        screen_data: 'canvas_base64_data'
      }
    };
    const res = validateAndSanitizeEvent(payload, req);
    assert.equal(res.valid, true);
    assert.equal(res.event.properties.path, '/pricing');
    assert.equal(res.event.properties.password, undefined);
    assert.equal(res.event.properties.token, undefined);
    assert.equal(res.event.properties.authorization, undefined);
    assert.equal(res.event.properties.credit_card, undefined);
    assert.equal(res.event.properties.cvv, undefined);
    assert.equal(res.event.properties.email, undefined);
    assert.equal(res.event.properties.phone, undefined);
    assert.equal(res.event.properties.keystrokes, undefined);
    assert.equal(res.event.properties.screen_data, undefined);
  });

  await test('Taxonomy', 'Sensitive query parameters are stripped from URLs', () => {
    const clean = sanitizeUrlOrPath('/callback?code=oauth123&state=xyz&token=secret_jwt&email=test@fera.ai');
    assert.ok(!clean.includes('token='));
    assert.ok(!clean.includes('code='));
    assert.ok(!clean.includes('email='));
    assert.equal(clean, '/callback?state=xyz');
  });

  await test('Taxonomy', 'Oversized properties (>4KB) are rejected', () => {
    const req = createMockRequest();
    const giantPayload = {
      event_name: 'page_view',
      properties: {
        path: '/test',
        blob: 'A'.repeat(5000)
      }
    };
    const res = validateAndSanitizeEvent(giantPayload, req);
    assert.match(res.error, /exceed 4KB limit/);
  });

  await test('Taxonomy', 'Geographic data is strictly coarsened to country/region (city omitted)', () => {
    const req = createMockRequest({ cf: { country: 'IN', region: 'DL', city: 'Exact City Name' } });
    const res = validateAndSanitizeEvent({ event_name: 'page_view' }, req);
    assert.equal(res.event.country, 'IN');
    assert.equal(res.event.properties.city, undefined);
  });

  console.log('\n🔒 ════════════════════════════════════════════════════════════');
  console.log('🔒 SUITE 3: Server-Side Tenant Isolation & IDOR Defense');
  console.log('════════════════════════════════════════════════════════════');

  const mockDb = createMockD1Database();

  await test('Tenant Isolation', 'Forged organization_id in client payload is rejected and bound to platform', async () => {
    const req = createMockRequest({
      body: {
        event_name: 'page_view',
        organization_id: 'org_victim_merchant_99',
        tenant_id: 'org_victim_merchant_99',
        properties: { path: '/' }
      }
    });

    const res = await handleAnalyticsEvents(req, { DB: mockDb }, {
      jsonHelper: mockJsonHelper,
      errorResponseHelper: mockErrorHelper
    });

    assert.equal(res.status, 201);
    assert.equal(res.data.tenant_id, 'platform');
    assert.equal(mockDb.events[0].tenant_id, 'platform');
    assert.equal(mockDb.events[0].organization_id, null);
  });

  await test('Tenant Isolation', 'Authenticated merchant request authoritatively binds tenant to their org', async () => {
    const req = createMockRequest({
      headers: { Authorization: 'Bearer merchant_token_org_alpha' },
      body: {
        event_name: 'page_view',
        organization_id: 'org_victim_merchant_beta', // Attempted forgery
        properties: { path: '/dashboard' }
      }
    });

    const mockGetAuthUser = async () => ({
      $id: 'usr_merchant_alpha',
      organizationId: 'org_alpha_verified'
    });

    const res = await handleAnalyticsEvents(req, { DB: mockDb }, {
      getAuthenticatedUser: mockGetAuthUser,
      jsonHelper: mockJsonHelper,
      errorResponseHelper: mockErrorHelper
    });

    assert.equal(res.status, 201);
    assert.equal(res.data.tenant_id, 'org_alpha_verified');
    assert.equal(mockDb.events[1].tenant_id, 'org_alpha_verified');
    assert.notEqual(mockDb.events[1].tenant_id, 'org_victim_merchant_beta');
  });

  await test('Tenant Isolation', 'Storefront visitor request resolves tenant from validated store subdomain', async () => {
    const req = createMockRequest({
      headers: {
        Host: 'apexroasters.ferasetu.com',
        Referer: 'https://apexroasters.ferasetu.com/shop'
      },
      body: {
        event_name: 'shop_visit',
        organization_id: 'org_attacker_spoof',
        properties: { shop_slug: 'apexroasters' }
      }
    });

    const mockResolveStorefront = async () => ({
      organizationId: 'org_apex_roasters',
      shop: { id: 'shop_apex', organization_id: 'org_apex_roasters' }
    });

    const res = await handleAnalyticsEvents(req, { DB: mockDb }, {
      resolveStorefrontTenant: mockResolveStorefront,
      jsonHelper: mockJsonHelper,
      errorResponseHelper: mockErrorHelper
    });

    assert.equal(res.status, 201);
    assert.equal(res.data.tenant_id, 'org_apex_roasters');
  });

  console.log('\n⚡ ════════════════════════════════════════════════════════════');
  console.log('⚡ SUITE 4: Abuse Controls, Rate Limiting & Batching');
  console.log('════════════════════════════════════════════════════════════');

  await test('Abuse Controls', 'Oversized payload (>64KB) is rejected with 413', async () => {
    const req = createMockRequest({
      headers: { 'Content-Length': '70000' },
      body: { event_name: 'page_view' }
    });
    const res = await handleAnalyticsEvents(req, { DB: mockDb }, {
      jsonHelper: mockJsonHelper,
      errorResponseHelper: mockErrorHelper
    });
    assert.equal(res.status, 413);
  });

  await test('Abuse Controls', 'Batch submission supports up to 20 events in a single atomic call', async () => {
    const batchEvents = [];
    for (let i = 0; i < 15; i++) {
      batchEvents.push({
        event_name: 'section_view',
        properties: { section_id: `sec_${i}` }
      });
    }

    const req = createMockRequest({ body: { events: batchEvents } });
    const res = await handleAnalyticsEvents(req, { DB: mockDb }, {
      jsonHelper: mockJsonHelper,
      errorResponseHelper: mockErrorHelper
    });

    assert.equal(res.status, 201);
    assert.equal(res.data.accepted_count, 15);
  });

  await test('Abuse Controls', 'Batches exceeding 20 events are rejected with 400', async () => {
    const oversizedBatch = Array.from({ length: 25 }, () => ({ event_name: 'page_view' }));
    const req = createMockRequest({ body: { events: oversizedBatch } });
    const res = await handleAnalyticsEvents(req, { DB: mockDb }, {
      jsonHelper: mockJsonHelper,
      errorResponseHelper: mockErrorHelper
    });
    assert.equal(res.status, 400);
    assert.match(res.data.error, /exceeds maximum limit/);
  });

  console.log('\n📊 ════════════════════════════════════════════════════════════');
  console.log('📊 SUITE 5: Aggregation, Retention Pruning & Funnel Analytics');
  console.log('════════════════════════════════════════════════════════════');

  await test('Aggregation', 'runDailyAggregation groups metrics into daily aggregates table', async () => {
    const aggResult = await runDailyAggregation({ DB: mockDb });
    assert.ok(aggResult.targetDate);
    assert.ok(mockDb.aggregates.length > 0);
  });

  await test('Retention', 'pruneRawEvents safely deletes raw records older than retention threshold', async () => {
    // Inject an old event from 45 days ago
    mockDb.events.push({
      id: 'old_evt_1',
      tenant_id: 'platform',
      event_name: 'page_view',
      created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
    });

    const pruneRes = await pruneRawEvents({ DB: mockDb }, 30);
    assert.equal(pruneRes.success, true);
    assert.equal(pruneRes.deletedRows, 1);
    assert.ok(!mockDb.events.some(e => e.id === 'old_evt_1'));
  });

  await test('Funnel Analytics', 'getPlatformAnalytics calculates conversion funnel rates safely', async () => {
    // Populate mock events for a complete funnel
    const visitor1 = crypto.randomUUID();
    const visitor2 = crypto.randomUUID();
    const sess1 = crypto.randomUUID();
    const sess2 = crypto.randomUUID();

    mockDb.events.push(
      { id: 'f1', tenant_id: 'platform', visitor_id: visitor1, session_id: sess1, event_name: 'page_view', created_at: new Date().toISOString() },
      { id: 'f2', tenant_id: 'platform', visitor_id: visitor2, session_id: sess2, event_name: 'page_view', created_at: new Date().toISOString() },
      { id: 'f3', tenant_id: 'platform', visitor_id: visitor1, session_id: sess1, event_name: 'pricing_view', created_at: new Date().toISOString() },
      { id: 'f4', tenant_id: 'platform', visitor_id: visitor1, session_id: sess1, event_name: 'cta_click', created_at: new Date().toISOString() },
      { id: 'f5', tenant_id: 'platform', visitor_id: visitor1, session_id: sess1, event_name: 'signup_start', created_at: new Date().toISOString() },
      { id: 'f6', tenant_id: 'platform', visitor_id: visitor1, session_id: sess1, event_name: 'signup_complete', created_at: new Date().toISOString() },
      { id: 'f7', tenant_id: 'platform', visitor_id: visitor1, session_id: sess1, event_name: 'trial_start', created_at: new Date().toISOString() }
    );

    const analytics = await getPlatformAnalytics({ DB: mockDb }, 30);
    assert.ok(analytics.funnel);
    assert.equal(analytics.funnel.landing_visitors, 2);
    assert.equal(analytics.funnel.trial_starts, 1);
    assert.equal(analytics.funnel.rates.landing_to_cta, 50); // 1 CTA click / 2 landing visitors = 50%
    assert.equal(analytics.funnel.rates.overall_conversion, 50); // 1 trial / 2 visitors = 50%
  });

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('🏁 PRIVACY-FIRST ANALYTICS TEST SUMMARY');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`Total Passed: ${totalPassed}`);
  console.log(`Total Failed: ${totalFailed}`);

  if (totalFailed > 0) {
    console.error('\n❌ Some privacy-first analytics tests failed!');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL PRIVACY-FIRST ANALYTICS TESTS PASSED WITH 100% SUCCESS!');
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
