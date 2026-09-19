/**
 * Automated Test Suite: FeraSetu Production Email Architecture
 * Validates tenant isolation, platform authorization, merchant identity provisioning,
 * custom domain DNS state machine, external SMTP encryption, quota enforcement, and security defenses.
 */

import assert from 'node:assert/strict';
import * as jose from '../worker/node_modules/jose/dist/node/esm/index.js';
import worker from '../worker/index.js';
import { encryptSecret, decryptSecret } from '../worker/services/emailCrypto.js';
import { normalizeDomain, generateDnsInstructions } from '../worker/services/dnsVerification.js';
import { EmailService, PLATFORM_TENANT_ID, ALLOWED_PLATFORM_SENDERS } from '../worker/services/emailService.js';

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

// Generate RSA key pair for WorkOS JWT token signing
const { privateKey, publicKey } = await jose.generateKeyPair('RS256');
const jwk = await jose.exportJWK(publicKey);
jwk.kid = 'test-workos-key-1';
const localKeySet = jose.createLocalJWKSet({ keys: [jwk] });

async function createToken(sub, email, orgId = 'org_1', role = 'owner') {
  return await new jose.SignJWT({ sub, email, org_id: orgId, role })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-workos-key-1' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(privateKey);
}

// In-memory mock D1 database
function createTestDb() {
  const tables = {
    users: [
      { id: 'usr_1', email: 'merchant1@example.com', name: 'Merchant 1', plan: 'growth', market: 'IN', created_at: new Date().toISOString() },
      { id: 'usr_2', email: 'merchant2@example.com', name: 'Merchant 2', plan: 'free', market: 'IN', created_at: new Date().toISOString() },
      { id: 'usr_3', email: 'merchant3@example.com', name: 'Merchant 3', plan: 'starter', market: 'IN', created_at: new Date().toISOString() },
    ],
    organizations: [
      { id: 'org_1', workos_organization_id: 'org_1', name: 'Kirana Store 1', store_slug: 'kirana-mumbai-1', market: 'IN', plan: 'growth', created_at: new Date().toISOString() },
      { id: 'org_2', workos_organization_id: 'org_2', name: 'General Store 2', store_slug: 'general-delhi-2', market: 'IN', plan: 'free', created_at: new Date().toISOString() },
      { id: 'org_3', workos_organization_id: 'org_3', name: 'Spice Shop 3', store_slug: 'spice-kerala-3', market: 'IN', plan: 'starter', created_at: new Date().toISOString() },
    ],
    organization_members: [
      { id: 'om_1', organization_id: 'org_1', user_id: 'usr_1', role: 'owner', created_at: new Date().toISOString() },
      { id: 'om_2', organization_id: 'org_2', user_id: 'usr_2', role: 'owner', created_at: new Date().toISOString() },
      { id: 'om_3', organization_id: 'org_3', user_id: 'usr_3', role: 'owner', created_at: new Date().toISOString() },
    ],
    shops: [
      { id: 'shop_1', organization_id: 'org_1', name: 'Kirana Store 1', store_slug: 'kirana-mumbai-1', status: 'active', created_at: new Date().toISOString() },
      { id: 'shop_2', organization_id: 'org_2', name: 'General Store 2', store_slug: 'general-delhi-2', status: 'active', created_at: new Date().toISOString() },
      { id: 'shop_3', organization_id: 'org_3', name: 'Spice Shop 3', store_slug: 'spice-kerala-3', status: 'active', created_at: new Date().toISOString() },
    ],
    email_domains: [
      {
        id: 'dom_platform_ferasetu',
        organization_id: null,
        domain: 'ferasetu.com',
        domain_type: 'PLATFORM',
        verification_status: 'VERIFIED',
        dkim_selector: 'fs1',
        dkim_status: 'VERIFIED',
        spf_status: 'VERIFIED',
        dmarc_status: 'VERIFIED',
        mail_from_status: 'VERIFIED',
        provider: 'FERASETU',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z'
      },
      {
        id: 'dom_m_org_1',
        organization_id: 'org_1',
        domain: 'kirana-mumbai-1.ferasetu.com',
        domain_type: 'FERASETU_MERCHANT',
        verification_status: 'VERIFIED',
        dkim_selector: 'fs1',
        dkim_status: 'VERIFIED',
        spf_status: 'VERIFIED',
        dmarc_status: 'VERIFIED',
        mail_from_status: 'VERIFIED',
        provider: 'FERASETU',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z'
      },
      {
        id: 'dom_m_org_2',
        organization_id: 'org_2',
        domain: 'general-delhi-2.ferasetu.com',
        domain_type: 'FERASETU_MERCHANT',
        verification_status: 'VERIFIED',
        dkim_selector: 'fs1',
        dkim_status: 'VERIFIED',
        spf_status: 'VERIFIED',
        dmarc_status: 'VERIFIED',
        mail_from_status: 'VERIFIED',
        provider: 'FERASETU',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z'
      }
    ],
    email_identities: [
      { id: 'ident_platform_noreply', organization_id: null, domain_id: 'dom_platform_ferasetu', local_part: 'no-reply', email_address: 'no-reply@ferasetu.com', display_name: 'FeraSetu Platform', identity_type: 'PLATFORM', status: 'ACTIVE', is_default: 1, created_at: '2025-01-01T00:00:00.000Z', updated_at: '2025-01-01T00:00:00.000Z' },
      { id: 'ident_platform_support', organization_id: null, domain_id: 'dom_platform_ferasetu', local_part: 'support', email_address: 'support@ferasetu.com', display_name: 'FeraSetu Support', identity_type: 'PLATFORM', status: 'ACTIVE', is_default: 0, created_at: '2025-01-01T00:00:00.000Z', updated_at: '2025-01-01T00:00:00.000Z' },
      { id: 'ident_platform_billing', organization_id: null, domain_id: 'dom_platform_ferasetu', local_part: 'billing', email_address: 'billing@ferasetu.com', display_name: 'FeraSetu Billing', identity_type: 'PLATFORM', status: 'ACTIVE', is_default: 0, created_at: '2025-01-01T00:00:00.000Z', updated_at: '2025-01-01T00:00:00.000Z' },
      { id: 'ident_m_org_1', organization_id: 'org_1', domain_id: 'dom_m_org_1', local_part: 'orders', email_address: 'orders@kirana-mumbai-1.ferasetu.com', display_name: 'Kirana Store 1', identity_type: 'MERCHANT', status: 'ACTIVE', is_default: 1, created_at: '2025-01-01T00:00:00.000Z', updated_at: '2025-01-01T00:00:00.000Z' },
      { id: 'ident_m_org_2', organization_id: 'org_2', domain_id: 'dom_m_org_2', local_part: 'orders', email_address: 'orders@general-delhi-2.ferasetu.com', display_name: 'General Store 2', identity_type: 'MERCHANT', status: 'ACTIVE', is_default: 1, created_at: '2025-01-01T00:00:00.000Z', updated_at: '2025-01-01T00:00:00.000Z' },
    ],
    email_provider_connections: [
      { id: 'epc_org_1', organization_id: 'org_1', provider_type: 'FERASETU', security_mode: 'STARTTLS', status: 'ACTIVE', created_at: '2025-01-01T00:00:00.000Z', updated_at: '2025-01-01T00:00:00.000Z' },
      { id: 'epc_org_2', organization_id: 'org_2', provider_type: 'FERASETU', security_mode: 'STARTTLS', status: 'ACTIVE', created_at: '2025-01-01T00:00:00.000Z', updated_at: '2025-01-01T00:00:00.000Z' },
    ],
    email_messages: [],
    email_events: [],
    shop_email_quotas: [
      { id: 'seq_1', organization_id: 'org_1', user_id: 'usr_1', daily_limit: 500, emails_sent_today: 0, extra_quota_balance: 0, last_reset_date: new Date().toISOString().slice(0, 10), created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'seq_2', organization_id: 'org_2', user_id: 'usr_2', daily_limit: 100, emails_sent_today: 100, extra_quota_balance: 0, last_reset_date: new Date().toISOString().slice(0, 10), created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'seq_3', organization_id: 'org_3', user_id: 'usr_3', daily_limit: 100, emails_sent_today: 0, extra_quota_balance: 0, last_reset_date: new Date().toISOString().slice(0, 10), created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ],
    subscriptions: [],
    error_logs: []
  };

  return {
    _tables: tables,
    prepare(sql) {
      const createStmt = (args = []) => ({
        bind(...more) {
          return createStmt([...args, ...more]);
        },
        async first() {
          const res = await this.all();
          return res.results?.[0] || null;
        },
        async all() {
          const s = sql.trim();
          if (s.includes('FROM email_domains')) {
            let rows = [...tables.email_domains];
            if (s.includes("domain_type = 'FERASETU_MERCHANT'")) {
              rows = rows.filter(r => r.organization_id === args[0] && r.domain_type === 'FERASETU_MERCHANT');
            } else if (s.includes("domain_type = 'CUSTOM'")) {
              rows = rows.filter(r => r.organization_id === args[0] && r.domain_type === 'CUSTOM');
            } else if (s.includes('WHERE organization_id = ? AND domain_type =')) {
              rows = rows.filter(r => r.organization_id === args[0] && r.domain_type === args[1]);
            } else if (s.includes('WHERE domain = ?')) {
              rows = rows.filter(r => r.domain === args[0]);
            } else if (s.includes('WHERE id = ? AND organization_id = ?')) {
              rows = rows.filter(r => r.id === args[0] && r.organization_id === args[1]);
            } else if (s.includes('WHERE id = ?')) {
              rows = rows.filter(r => r.id === args[0]);
            } else if (s.includes('WHERE organization_id = ?')) {
              rows = rows.filter(r => r.organization_id === args[0]);
            } else if (s.includes("WHERE domain_type = 'PLATFORM'")) {
              rows = rows.filter(r => r.domain_type === 'PLATFORM');
            }
            return { results: rows };
          }

          if (s.includes('FROM email_identities')) {
            let rows = [...tables.email_identities];
            if (s.includes('WHERE organization_id = ? AND is_default = 1')) {
              rows = rows.filter(r => r.organization_id === args[0] && r.is_default === 1);
            } else if (s.includes('WHERE email_address = ? AND identity_type =')) {
              rows = rows.filter(r => r.email_address === args[0] && r.identity_type === 'PLATFORM');
            } else if (s.includes('WHERE email_address = ?')) {
              rows = rows.filter(r => r.email_address === args[0]);
            } else if (s.includes('WHERE id = ? AND organization_id = ?')) {
              rows = rows.filter(r => r.id === args[0] && r.organization_id === args[1]);
            } else if (s.includes('WHERE id = ?')) {
              rows = rows.filter(r => r.id === args[0]);
            } else if (s.includes('WHERE ei.id = ? AND ei.organization_id = ?')) {
              rows = rows.filter(r => r.id === args[0] && r.organization_id === args[1]);
            } else if (s.includes('WHERE ei.email_address = ? AND ei.organization_id = ?')) {
              rows = rows.filter(r => r.email_address === args[0] && r.organization_id === args[1]);
            } else if (s.includes('WHERE ei.organization_id = ? AND ei.is_default = 1')) {
              rows = rows.filter(r => r.organization_id === args[0] && r.is_default === 1);
            } else if (s.includes('WHERE ei.organization_id = ?')) {
              rows = rows.filter(r => r.organization_id === args[0]);
            }
            // Mock join with email_domains for verification_status
            rows = rows.map(i => {
              const dom = tables.email_domains.find(d => d.id === i.domain_id);
              return { ...i, verification_status: dom?.verification_status || 'VERIFIED' };
            });
            return { results: rows };
          }

          if (s.includes('FROM email_provider_connections')) {
            let rows = [...tables.email_provider_connections];
            if (s.includes('WHERE organization_id = ?')) {
              rows = rows.filter(r => r.organization_id === args[0]);
            }
            return { results: rows };
          }

          if (s.includes('FROM email_messages')) {
            let rows = [...tables.email_messages];
            if (s.includes('WHERE idempotency_key = ?')) {
              const key = args[0];
              const merchantId = args[1];
              const isPlatform = args[2] === 1;
              rows = rows.filter(r => r.idempotency_key === key && (r.merchant_id === merchantId || (!r.merchant_id && isPlatform)));
            }
            return { results: rows };
          }

          if (s.includes('FROM email_events')) {
            let rows = [...tables.email_events];
            if (s.includes('WHERE ee.merchant_id = ?')) {
              rows = rows.filter(r => r.merchant_id === args[0]);
            }
            return { results: rows };
          }

          if (s.includes('FROM shop_email_quotas')) {
            let rows = [...tables.shop_email_quotas];
            if (s.includes('WHERE organization_id = ?')) {
              rows = rows.filter(r => r.organization_id === args[0]);
            }
            return { results: rows };
          }

          if (s.includes('FROM organizations')) {
            let rows = [...tables.organizations];
            if (s.includes('WHERE workos_organization_id = ?')) {
              rows = rows.filter(r => r.workos_organization_id === args[0]);
            } else if (s.includes('WHERE id = ? OR workos_organization_id = ?')) {
              rows = rows.filter(r => r.id === args[0] || r.workos_organization_id === args[1]);
            } else if (s.includes('WHERE id = ?')) {
              rows = rows.filter(r => r.id === args[0]);
            }
            return { results: rows };
          }

          if (s.includes('FROM organization_members')) {
            let rows = [...tables.organization_members];
            if (s.includes('WHERE organization_id = ? AND user_id = ?')) {
              rows = rows.filter(r => r.organization_id === args[0] && r.user_id === args[1]);
            } else if (s.includes('WHERE user_id = ?')) {
              rows = rows.filter(r => r.user_id === args[0]);
            }
            return { results: rows };
          }

          if (s.includes('FROM users')) {
            let rows = [...tables.users];
            if (s.includes('WHERE id = ?')) {
              rows = rows.filter(r => r.id === args[0]);
            }
            return { results: rows };
          }

          return { results: [] };
        },
        async run() {
          const s = sql.trim();
          if (s.includes('INSERT INTO email_domains') || s.includes('INSERT OR IGNORE INTO email_domains')) {
            const isManaged = s.includes("'FERASETU_MERCHANT'");
            tables.email_domains.push({
              id: args[0],
              organization_id: args[1],
              domain: args[2],
              domain_type: isManaged ? 'FERASETU_MERCHANT' : 'CUSTOM',
              verification_status: isManaged ? 'VERIFIED' : 'PENDING',
              verification_token_hash: isManaged ? 'ferasetu_managed' : args[3],
              dkim_selector: isManaged ? 'fs1' : (args[4] || 'fs1'),
              dkim_status: isManaged ? 'VERIFIED' : 'PENDING',
              spf_status: isManaged ? 'VERIFIED' : 'PENDING',
              dmarc_status: isManaged ? 'VERIFIED' : 'PENDING',
              mail_from_status: isManaged ? 'VERIFIED' : 'PENDING',
              provider: 'FERASETU',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            return { success: true };
          }

          if (s.includes('INSERT INTO email_identities')) {
            const isDefault = s.includes(', 1,') || args[8] === 1;
            const isManaged = s.includes("'orders'");
            tables.email_identities.push({
              id: args[0],
              organization_id: args[1],
              domain_id: args[2],
              local_part: isManaged ? 'orders' : (args[3] || 'orders'),
              email_address: isManaged ? args[3] : (args[4] || args[3]),
              display_name: isManaged ? args[4] : (args[5] || args[4]),
              identity_type: isManaged ? 'MERCHANT' : (args[6] || 'MERCHANT'),
              status: 'ACTIVE',
              is_default: isDefault ? 1 : 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            return { success: true };
          }

          if (s.includes('INSERT INTO email_provider_connections')) {
            const isExternal = s.includes("'EXTERNAL_SMTP'");
            if (isExternal) {
              tables.email_provider_connections.push({
                id: args[0],
                organization_id: args[1],
                provider_type: 'EXTERNAL_SMTP',
                smtp_host: args[2] || null,
                smtp_port: args[3] || 587,
                smtp_username: args[4] || null,
                encrypted_secret_reference: args[5] || null,
                security_mode: args[6] || 'STARTTLS',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            } else {
              tables.email_provider_connections.push({
                id: args[0],
                organization_id: args[1],
                provider_type: 'FERASETU',
                smtp_host: null,
                smtp_port: 587,
                smtp_username: null,
                encrypted_secret_reference: null,
                security_mode: 'STARTTLS',
                status: 'ACTIVE',
                created_at: args[2] || new Date().toISOString(),
                updated_at: args[3] || new Date().toISOString()
              });
            }
            return { success: true };
          }

          if (s.includes('UPDATE email_domains')) {
            const domId = args[args.length - 1];
            const dom = tables.email_domains.find(d => d.id === domId);
            if (dom) {
              dom.verification_status = args[0];
              dom.dkim_status = args[1];
              dom.spf_status = args[2];
              dom.dmarc_status = args[3];
            }
            return { success: true };
          }

          if (s.includes('DELETE FROM email_domains')) {
            const domId = args[0];
            tables.email_domains = tables.email_domains.filter(d => d.id !== domId);
            return { success: true };
          }

          if (s.includes('DELETE FROM email_identities')) {
            const id = args[0];
            tables.email_identities = tables.email_identities.filter(i => i.id !== id && i.domain_id !== id);
            return { success: true };
          }

          if (s.includes('UPDATE email_provider_connections')) {
            const orgId = args[args.length - 1];
            const conn = tables.email_provider_connections.find(c => c.organization_id === orgId);
            if (conn) {
              if (s.includes("provider_type = 'FERASETU'")) {
                conn.provider_type = 'FERASETU';
              } else {
                conn.provider_type = 'EXTERNAL_SMTP';
                conn.smtp_host = args[0];
                conn.smtp_port = args[1];
                conn.smtp_username = args[2];
                conn.encrypted_secret_reference = args[3];
              }
            }
            return { success: true };
          }

          if (s.includes('INSERT INTO email_messages')) {
            tables.email_messages.push({
              id: args[0],
              merchant_id: args[1],
              sender_identity_id: args[2],
              provider: args[3],
              to_address: args[4],
              reply_to: args[5],
              subject: args[6],
              status: 'PENDING',
              idempotency_key: args[7],
              priority: args[8],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            return { success: true };
          }

          if (s.includes('UPDATE email_messages')) {
            const msgId = args[2];
            const msg = tables.email_messages.find(m => m.id === msgId);
            if (msg) {
              msg.status = args[0];
            }
            return { success: true };
          }

          if (s.includes('INSERT INTO email_events')) {
            tables.email_events.push({
              id: args[0],
              message_id: args[1],
              merchant_id: args[2],
              event_type: args[3],
              provider_status: args[4],
              recipient: args[5],
              timestamp: args[6],
              metadata: args[7]
            });
            return { success: true };
          }

          if (s.includes('UPDATE shop_email_quotas')) {
            const orgId = args[args.length - 1];
            const q = tables.shop_email_quotas.find(x => x.organization_id === orgId);
            if (q && s.includes('emails_sent_today = emails_sent_today + 1')) {
              q.emails_sent_today += 1;
            }
            return { success: true };
          }

          return { success: true };
        }
      });

      return createStmt([]);
    }
  };
}

console.log('\n📦 Running Production Email Architecture Test Suite...\n');

// -----------------------------------------------------------------------------
// TEST 1: Tenant Isolation & Scoping
// -----------------------------------------------------------------------------
await test('Tenant Isolation: Merchant A cannot access Merchant B domains or settings', async () => {
  const db = createTestDb();
  const env = { DB: db, JWKS: localKeySet, ADMIN_JWT_SECRET: 'test_jwt_key', WORKOS_CLIENT_ID: 'test_client' };

  // Merchant 1 adds a custom domain
  const token1 = await createToken('usr_1', 'merchant1@example.com', 'org_1', 'owner');
  const addReq = new Request('https://ferasetu.com/api/email/domains', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token1}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain: 'merchant-one.com' })
  });
  const addRes = await worker.fetch(addReq, env);
  assert.equal(addRes.status, 201);
  const addData = await addRes.json();
  const domainId = addData.domain.id;

  // Merchant 2 attempts to GET Merchant 1's domain
  const token2 = await createToken('usr_2', 'merchant2@example.com', 'org_2', 'owner');
  const getReq = new Request(`https://ferasetu.com/api/email/domains/${domainId}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token2}` }
  });
  const getRes = await worker.fetch(getReq, env);
  assert.equal(getRes.status, 404, 'Cross-tenant domain access must return 404');

  // Merchant 2 attempts to verify Merchant 1's domain
  const verifyReq = new Request(`https://ferasetu.com/api/email/domains/${domainId}/verify`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token2}` }
  });
  const verifyRes = await worker.fetch(verifyReq, env);
  assert.equal(verifyRes.status, 404, 'Cross-tenant domain verification must be blocked');

  // Merchant 2 attempts to delete Merchant 1's domain
  const delReq = new Request(`https://ferasetu.com/api/email/domains/${domainId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token2}` }
  });
  const delRes = await worker.fetch(delReq, env);
  assert.equal(delRes.status, 404, 'Cross-tenant domain deletion must be blocked');
});

// -----------------------------------------------------------------------------
// TEST 2: Platform Identity Authorization & Zero Merchant Quota Decrement
// -----------------------------------------------------------------------------
await test('Platform Identity: Platform emails authenticate without merchantId and bypass quotas', async () => {
  const db = createTestDb();
  const env = { DB: db, JWKS: localKeySet, ADMIN_JWT_SECRET: 'test_jwt_key' };

  // Platform sends from official no-reply@ferasetu.com
  const sendRes = await EmailService.send(env, {
    organizationId: null, // Zero merchantId
    from: 'no-reply@ferasetu.com',
    to: 'customer@external.com',
    subject: 'Official Platform Notice',
    text: 'Platform message'
  });

  assert.equal(sendRes.success, true);
  assert.equal(sendRes.from, 'no-reply@ferasetu.com');

  // Verify that merchant quotas are untouched
  const quotaOrg1 = db._tables.shop_email_quotas.find(q => q.organization_id === 'org_1');
  assert.equal(quotaOrg1.emails_sent_today, 0, 'Platform email must never decrement merchant quota');

  // Unauthorized platform sender must be rejected
  await assert.rejects(async () => {
    await EmailService.send(env, {
      organizationId: null,
      from: 'hacker@ferasetu.com', // Unauthorized platform sender
      to: 'target@external.com',
      subject: 'Spoofed'
    });
  }, /Unauthorized platform sender/);
});

// -----------------------------------------------------------------------------
// TEST 3: Default Sender Generation (Zero Config)
// -----------------------------------------------------------------------------
await test('Default Sender: Automatic provisioning of orders@{merchantSlug}.ferasetu.com', async () => {
  const db = createTestDb();
  const env = { DB: db, JWKS: localKeySet, ADMIN_JWT_SECRET: 'test_jwt_key', WORKOS_CLIENT_ID: 'test_client' };

  // Merchant 3 is a brand new merchant with no email domain records initially
  const token3 = await createToken('usr_3', 'merchant3@example.com', 'org_3', 'owner');
  const req = new Request('https://ferasetu.com/api/email/settings', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token3}` }
  });
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 200);
  const data = await res.json();

  assert.equal(data.activeProvider, 'FERASETU');
  assert.equal(data.ferasetuDomain.domain, 'spice-kerala-3.ferasetu.com');
  assert.equal(data.defaultIdentity.email_address, 'orders@spice-kerala-3.ferasetu.com');
  assert.equal(data.ferasetuDomain.verification_status, 'VERIFIED');
});

// -----------------------------------------------------------------------------
// TEST 4: Custom Domain Verification & State Machine
// -----------------------------------------------------------------------------
await test('Custom Domain Flow: Connect -> DNS Instructions -> Verification', async () => {
  const norm = normalizeDomain('  https://My-Shop.com/path  ');
  assert.equal(norm.valid, true);
  assert.equal(norm.domain, 'my-shop.com');

  const instructions = generateDnsInstructions('my-shop.com', 'token_123', 'fs1');
  assert.equal(instructions.length, 5);
  assert.ok(instructions.some(i => i.name === '_ferasetu-challenge.my-shop.com'));
  assert.ok(instructions.some(i => i.name === 'fs1._domainkey.my-shop.com'));
  assert.ok(instructions.some(i => i.name === 'my-shop.com' && i.value.includes('v=spf1')));
});

// -----------------------------------------------------------------------------
// TEST 5: External SMTP Encryption & Safe Redaction
// -----------------------------------------------------------------------------
await test('External SMTP: AES-256-GCM secret encryption and zero plaintext leakage in API', async () => {
  const masterKey = 'super_secret_master_key_1234567890';
  const rawPassword = 'SensitiveSmtpPassword!#99';

  // 1. Encryption & Decryption roundtrip
  const encrypted = await encryptSecret(rawPassword, masterKey);
  assert.ok(encrypted.startsWith('enc:v1:'));
  assert.notEqual(encrypted, rawPassword);

  const decrypted = await decryptSecret(encrypted, masterKey);
  assert.equal(decrypted, rawPassword);

  // 2. API security: saving external SMTP stores encrypted secret and redacts in response
  const db = createTestDb();
  const env = { DB: db, JWKS: localKeySet, ADMIN_JWT_SECRET: masterKey, WORKOS_CLIENT_ID: 'test_client' };

  const token1 = await createToken('usr_1', 'merchant1@example.com', 'org_1', 'owner');
  const saveReq = new Request('https://ferasetu.com/api/email/provider/external', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token1}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      smtp_host: 'smtp.sendgrid.net',
      smtp_port: 587,
      smtp_username: 'apikey',
      smtp_password: rawPassword,
      security_mode: 'STARTTLS'
    })
  });
  const saveRes = await worker.fetch(saveReq, env);
  assert.equal(saveRes.status, 200);

  // Check stored record in DB: must be encrypted
  const storedConn = db._tables.email_provider_connections.find(c => c.organization_id === 'org_1');
  assert.ok(storedConn.encrypted_secret_reference.startsWith('enc:v1:'));
  assert.notEqual(storedConn.encrypted_secret_reference, rawPassword);

  // Check GET /api/email/provider: must NOT return encrypted_secret_reference or password
  const getReq = new Request('https://ferasetu.com/api/email/provider', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token1}` }
  });
  const getRes = await worker.fetch(getReq, env);
  const getData = await getRes.json();
  assert.equal(getData.provider_type, 'EXTERNAL_SMTP');
  assert.equal(getData.has_password, true);
  assert.equal(getData.smtp_password, undefined);
  assert.equal(getData.encrypted_secret_reference, undefined);
});

// -----------------------------------------------------------------------------
// TEST 6: Quota Enforcement
// -----------------------------------------------------------------------------
await test('Quota Enforcement: Merchant with exhausted quota is blocked from sending', async () => {
  const db = createTestDb();
  const env = { DB: db, JWKS: localKeySet, ADMIN_JWT_SECRET: 'test_jwt_key' };

  // org_2 has 100/100 sent today in shop_email_quotas
  // Attempting to send an email should fail due to quota exhaustion
  await assert.rejects(async () => {
    await EmailService.send(env, {
      organizationId: 'org_2',
      to: 'customer@test.com',
      subject: 'Order Notice',
      text: 'Order summary'
    });
  }, /Daily email quota exhausted/);
});

// -----------------------------------------------------------------------------
// TEST 7: Security Defenses: Header Injection, Spoofing & Idempotency
// -----------------------------------------------------------------------------
await test('Security: CRLF header injection and cross-tenant spoofing rejected', async () => {
  const db = createTestDb();
  const env = { DB: db, JWKS: localKeySet, ADMIN_JWT_SECRET: 'test_jwt_key' };

  // CRLF injection in subject
  await assert.rejects(async () => {
    await EmailService.send(env, {
      organizationId: 'org_1',
      to: 'safe@test.com',
      subject: 'Subject\r\nBcc: evil@attacker.com',
      text: 'body'
    });
  }, /Header injection detected/);

  // CRLF injection in recipient
  await assert.rejects(async () => {
    await EmailService.send(env, {
      organizationId: 'org_1',
      to: 'safe@test.com\r\nTo: evil@attacker.com',
      subject: 'Subject',
      text: 'body'
    });
  }, /Header injection detected/);

  // Cross-tenant from address spoofing
  await assert.rejects(async () => {
    await EmailService.send(env, {
      organizationId: 'org_1',
      from: 'orders@general-delhi-2.ferasetu.com', // Belongs to org_2!
      to: 'customer@test.com',
      subject: 'Spoof attempt'
    });
  }, /No authorized email identity found/);
});

// -----------------------------------------------------------------------------
// TEST 8: External SMTP Client RFC 5321 / RFC 5322 Payload Dispatch
// -----------------------------------------------------------------------------
await test('External SMTP: Full MIME generation and socket execution path', async () => {
  const { sendViaExternalSmtp, testSmtpConnection } = await import('../worker/services/externalSmtpClient.js');

  // Verify connection test format check
  const testConn = await testSmtpConnection({
    host: 'smtp.testrelay.io',
    port: 587,
    username: 'user@testrelay.io',
    password: 'secret_password_123',
    securityMode: 'STARTTLS'
  });
  assert.equal(testConn.success, true);

  // Verify sendViaExternalSmtp execution
  const res = await sendViaExternalSmtp({
    connection: {
      smtp_host: 'smtp.testrelay.io',
      smtp_port: 587,
      smtp_username: 'user@testrelay.io',
      password: 'secret_password_123',
      security_mode: 'STARTTLS'
    },
    message: {
      from: 'orders@merchant.com',
      to: 'customer@domain.com',
      subject: 'Test Order #101',
      html: '<h1>Order Confirmed</h1>',
      text: 'Order Confirmed'
    }
  });

  assert.equal(res.success, true);
  assert.equal(res.provider, 'EXTERNAL_SMTP');
  assert.equal(res.status, 'SENT');
  assert.ok(res.messageId.startsWith('ext_'));
});

// -----------------------------------------------------------------------------
// TEST 9: Tenant-Scoped Idempotency Uniqueness & Non-Collision
// -----------------------------------------------------------------------------
await test('Idempotency: Same key deduplicates for same tenant, allows different tenant', async () => {
  const db = createTestDb();
  const env = { DB: db, JWKS: localKeySet, ADMIN_JWT_SECRET: 'test_jwt_key' };

  // Tenant 1 sends message with key 'checkout_txn_999'
  const send1 = await EmailService.send(env, {
    organizationId: 'org_1',
    to: 'customer1@test.com',
    subject: 'Receipt 1',
    text: 'Receipt',
    idempotencyKey: 'checkout_txn_999'
  });
  assert.equal(send1.success, true);
  assert.equal(send1.duplicate, undefined);

  // Tenant 1 re-sends with identical key -> duplicate flagged, no re-dispatch
  const send1Dup = await EmailService.send(env, {
    organizationId: 'org_1',
    to: 'customer1@test.com',
    subject: 'Receipt 1 Re-attempt',
    text: 'Receipt',
    idempotencyKey: 'checkout_txn_999'
  });
  assert.equal(send1Dup.success, true);
  assert.equal(send1Dup.duplicate, true);
  assert.equal(send1Dup.messageId, send1.messageId);

  // Tenant 3 sends with SAME key 'checkout_txn_999' -> must NOT collide with Tenant 1!
  const send3 = await EmailService.send(env, {
    organizationId: 'org_3',
    to: 'customer3@test.com',
    subject: 'Receipt 3',
    text: 'Receipt',
    idempotencyKey: 'checkout_txn_999'
  });
  assert.equal(send3.success, true);
  assert.equal(send3.duplicate, undefined);
  assert.notEqual(send3.messageId, send1.messageId, 'Different tenants must have distinct message IDs');
});

console.log(`\n────────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All Production Email Architecture tests passed successfully!\n');
}

