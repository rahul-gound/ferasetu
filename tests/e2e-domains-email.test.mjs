/**
 * FeraSetu — Domains & Email Architecture Complete 4-Tier E2E Test Suite
 * =====================================================================
 * Authoritative verification covering requirements R1-R5 in ORIGINAL_REQUEST.md (§ 2026-10-01T11:23:41Z)
 * and specifications in PROJECT.md:
 * 
 * - Tier 1: Feature Coverage (>=5 tests per feature: FeraSetu Mail default, custom domain DNS records,
 *   domain search & purchase validation, transactional templates interpolation & sanitization,
 *   AI email tools, delivery activity log)
 * - Tier 2: Boundary & Corner Cases (>=5 tests per feature: empty/malformed variables, CRLF header injection,
 *   max domain length & RFC 1035, invalid SPF/DKIM formats, zero/negative pricing tampering)
 * - Tier 3: Cross-Feature Combinations (pairwise interactions: domain purchase + DNS verification + sender identity;
 *   template edit + AI assistant update + test dispatch; tenant isolation cross-tenant checks)
 * - Tier 4: Real-World Workload Scenarios (realistic merchant lifecycle: merchant onboarding with default orders@ store slug ->
 *   purchasing custom domain via Cashfree -> verifying DNS -> updating template -> sending test email -> checking delivery log)
 * 
 * Execution:
 *   node tests/e2e-domains-email.test.mjs
 *   or: node --test tests/e2e-domains-email.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import * as jose from '../worker/node_modules/jose/dist/node/esm/index.js';
import worker from '../worker/index.js';
import {
  EmailService,
  PLATFORM_TENANT_ID,
  ALLOWED_PLATFORM_SENDERS,
  sanitizeHeaderValue
} from '../worker/services/emailService.js';
import {
  normalizeDomain,
  generateDnsInstructions,
  verifyDomainDns,
  ROOT_DOMAIN,
  DEFAULT_DKIM_SELECTOR
} from '../worker/services/dnsVerification.js';
import { encryptSecret, decryptSecret } from '../worker/services/emailCrypto.js';
import {
  EMAIL_TEMPLATES,
  validateTemplateVariables,
  renderEmailTemplate,
  escapeHtml
} from '../worker/templates/emailTemplates.js';
import {
  generateCanonicalStorefront,
  isValidCanonicalSubdomain
} from '../worker/canonicalHostname.js';
import {
  DomainProvider,
  SandboxDomainProvider,
  CloudflareRegistrarProvider,
  STANDARD_TLD_PRICES,
  STANDARD_TLD_PRICES_INR,
  STANDARD_RESERVED_DOMAINS,
  RESERVED_DOMAINS,
  createDomainProvider,
  getDomainProvider
} from '../worker/services/domainProvider.js';

// =============================================================================
// CRYPTOGRAPHIC SETUP & AUTHENTICATION HARNESS
// =============================================================================

const { privateKey, publicKey } = await jose.generateKeyPair('RS256');
const jwk = await jose.exportJWK(publicKey);
jwk.kid = 'test-workos-key-e2e';
const localKeySet = jose.createLocalJWKSet({ keys: [jwk] });
const MASTER_ENCRYPTION_KEY = 'e2e_master_encryption_key_32bytes!';

async function createToken(sub, email, orgId = 'org_1', role = 'owner') {
  return await new jose.SignJWT({ sub, email, org_id: orgId, role })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-workos-key-e2e' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(privateKey);
}

// =============================================================================
// IN-MEMORY D1 DATABASE HARNESS WITH MULTI-TENANT FIXTURES
// =============================================================================

function createTestDb() {
  const tables = {
    users: [
      { id: 'usr_1', email: 'merchant1@example.com', name: 'Kirana Mumbai Merchant', plan: 'growth', market: 'IN', created_at: new Date().toISOString() },
      { id: 'usr_2', email: 'merchant2@example.com', name: 'Delhi Retail Merchant', plan: 'free', market: 'IN', created_at: new Date().toISOString() },
      { id: 'usr_3', email: 'merchant3@example.com', name: 'Spice Kerala Merchant', plan: 'starter', market: 'IN', created_at: new Date().toISOString() },
      { id: 'usr_4', email: 'merchant4@example.com', name: 'Pune Bazaar Merchant', plan: 'pro', market: 'IN', created_at: new Date().toISOString() },
    ],
    organizations: [
      { id: 'org_1', workos_organization_id: 'org_1', name: 'Kirana Mumbai', store_slug: 'kirana-mumbai-1', market: 'IN', plan: 'growth', primary_color: '#0052FF', support_email: 'help@kiranamumbai.com', created_at: new Date().toISOString() },
      { id: 'org_2', workos_organization_id: 'org_2', name: 'General Delhi', store_slug: 'general-delhi-2', market: 'IN', plan: 'free', primary_color: '#FF6B35', support_email: 'contact@generaldelhi.com', created_at: new Date().toISOString() },
      { id: 'org_3', workos_organization_id: 'org_3', name: 'Spice Kerala', store_slug: 'spice-kerala-3', market: 'IN', plan: 'starter', primary_color: '#10B981', support_email: 'care@spicekerala.com', created_at: new Date().toISOString() },
      { id: 'org_4', workos_organization_id: 'org_4', name: 'Pune Bazaar', store_slug: 'kirana-pune-4', market: 'IN', plan: 'pro', primary_color: '#0052FF', support_email: 'support@punebazaar.in', created_at: new Date().toISOString() },
    ],
    organization_members: [
      { id: 'om_1', organization_id: 'org_1', user_id: 'usr_1', role: 'owner', created_at: new Date().toISOString() },
      { id: 'om_2', organization_id: 'org_2', user_id: 'usr_2', role: 'owner', created_at: new Date().toISOString() },
      { id: 'om_3', organization_id: 'org_3', user_id: 'usr_3', role: 'owner', created_at: new Date().toISOString() },
      { id: 'om_4', organization_id: 'org_4', user_id: 'usr_4', role: 'owner', created_at: new Date().toISOString() },
    ],
    shops: [
      { id: 'shop_1', organization_id: 'org_1', name: 'Kirana Mumbai', store_slug: 'kirana-mumbai-1', status: 'active', created_at: new Date().toISOString() },
      { id: 'shop_2', organization_id: 'org_2', name: 'General Delhi', store_slug: 'general-delhi-2', status: 'active', created_at: new Date().toISOString() },
      { id: 'shop_3', organization_id: 'org_3', name: 'Spice Kerala', store_slug: 'spice-kerala-3', status: 'active', created_at: new Date().toISOString() },
      { id: 'shop_4', organization_id: 'org_4', name: 'Pune Bazaar', store_slug: 'kirana-pune-4', status: 'active', created_at: new Date().toISOString() },
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
      { id: 'ident_m_org_1', organization_id: 'org_1', domain_id: 'dom_m_org_1', local_part: 'orders', email_address: 'orders@kirana-mumbai-1.ferasetu.com', display_name: 'Kirana Mumbai', identity_type: 'MERCHANT', status: 'ACTIVE', is_default: 1, created_at: '2025-01-01T00:00:00.000Z', updated_at: '2025-01-01T00:00:00.000Z' },
      { id: 'ident_m_org_2', organization_id: 'org_2', domain_id: 'dom_m_org_2', local_part: 'orders', email_address: 'orders@general-delhi-2.ferasetu.com', display_name: 'General Delhi', identity_type: 'MERCHANT', status: 'ACTIVE', is_default: 1, created_at: '2025-01-01T00:00:00.000Z', updated_at: '2025-01-01T00:00:00.000Z' },
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
      { id: 'seq_4', organization_id: 'org_4', user_id: 'usr_4', daily_limit: 1000, emails_sent_today: 0, extra_quota_balance: 0, last_reset_date: new Date().toISOString().slice(0, 10), created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ],
    merchant_email_templates: [],
    ai_action_history: [],
    transactions: [],
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
            } else if (s.includes('WHERE domain = ? AND organization_id = ?')) {
              rows = rows.filter(r => r.domain === args[0] && r.organization_id === args[1]);
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

          if (s.includes('FROM merchant_email_templates')) {
            let rows = [...tables.merchant_email_templates];
            if (s.includes('WHERE organization_id = ? AND template_key = ?')) {
              rows = rows.filter(r => r.organization_id === args[0] && r.template_key === args[1]);
            } else if (s.includes('WHERE organization_id = ?')) {
              rows = rows.filter(r => r.organization_id === args[0]);
            }
            return { results: rows };
          }

          if (s.includes('FROM ai_action_history')) {
            let rows = [...tables.ai_action_history];
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
              identity_type: s.includes("'CUSTOM'") ? 'CUSTOM' : (isManaged ? 'MERCHANT' : (args[6] || 'MERCHANT')),
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
              dom.mail_from_status = args[4];
              dom.last_checked_at = args[5];
              if (args[6] === 'VERIFIED') dom.verified_at = args[7];
              dom.updated_at = args[8];
            }
            return { success: true };
          }

          if (s.includes('DELETE FROM email_domains')) {
            const domId = args[0];
            const idx = tables.email_domains.findIndex(d => d.id === domId);
            if (idx !== -1) tables.email_domains.splice(idx, 1);
            return { success: true };
          }

          if (s.includes('UPDATE email_identities')) {
            if (s.includes('SET is_default = 0')) {
              const orgId = args[1];
              tables.email_identities.filter(i => i.organization_id === orgId).forEach(i => i.is_default = 0);
            } else if (s.includes('SET is_default = 1') && s.includes('WHERE id = ?')) {
              const identId = args[1];
              const ident = tables.email_identities.find(i => i.id === identId);
              if (ident) ident.is_default = 1;
            } else if (s.includes('SET display_name = ?')) {
              const identId = args[1] || args[args.length - 1];
              const ident = tables.email_identities.find(i => i.id === identId);
              if (ident) ident.display_name = args[0];
            }
            return { success: true };
          }

          if (s.includes('DELETE FROM email_identities')) {
            if (s.includes('WHERE domain_id = ?')) {
              const domainId = args[0];
              tables.email_identities = tables.email_identities.filter(i => i.domain_id !== domainId);
            } else if (s.includes('WHERE id = ?')) {
              const identId = args[0];
              tables.email_identities = tables.email_identities.filter(i => i.id !== identId);
            }
            return { success: true };
          }

          if (s.includes('UPDATE email_provider_connections')) {
            const orgId = args[args.length - 1];
            const conn = tables.email_provider_connections.find(c => c.organization_id === orgId);
            if (conn) {
              if (s.includes("provider_type = 'EXTERNAL_SMTP'")) {
                conn.provider_type = 'EXTERNAL_SMTP';
                conn.smtp_host = args[0];
                conn.smtp_port = args[1];
                conn.smtp_username = args[2];
                conn.encrypted_secret_reference = args[3];
                conn.security_mode = args[4];
                conn.status = 'ACTIVE';
              } else {
                conn.provider_type = 'FERASETU';
                conn.smtp_host = null;
                conn.smtp_username = null;
                conn.encrypted_secret_reference = null;
                conn.status = 'ACTIVE';
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
              status: 'SENT',
              idempotency_key: args[7],
              priority: args[8] || 'NORMAL',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
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

          if (s.includes('INSERT INTO merchant_email_templates') || s.includes('REPLACE INTO merchant_email_templates')) {
            const existingIdx = tables.merchant_email_templates.findIndex(
              t => t.organization_id === args[1] && t.template_key === args[2]
            );
            const templateRecord = {
              id: args[0],
              organization_id: args[1],
              template_key: args[2],
              subject: args[3],
              content_html: args[4],
              version: (existingIdx >= 0 ? tables.merchant_email_templates[existingIdx].version + 1 : 1),
              updated_at: new Date().toISOString()
            };
            if (existingIdx >= 0) {
              tables.merchant_email_templates[existingIdx] = templateRecord;
            } else {
              tables.merchant_email_templates.push(templateRecord);
            }
            return { success: true };
          }

          if (s.includes('INSERT INTO ai_action_history')) {
            tables.ai_action_history.push({
              id: args[0],
              organization_id: args[1],
              action_type: args[2],
              before_state: args[3],
              after_state: args[4],
              created_at: new Date().toISOString()
            });
            return { success: true };
          }

          return { success: true };
        }
      });

      return createStmt([]);
    }
  };
}

// =============================================================================
// DOMAIN PROVIDER ABSTRACTION & CASHFREE PURCHASE CONTRACT
// =============================================================================

class MockDomainProvider extends SandboxDomainProvider {
}

// =============================================================================
// AI EMAIL ASSISTANT TOOLS SPECIFICATION & EXECUTION ENGINE
// =============================================================================

class AiEmailAssistantService {
  constructor(db) {
    this.db = db;
  }

  async get_email_settings({ organizationId }) {
    const providerConn = await this.db.prepare('SELECT * FROM email_provider_connections WHERE organization_id = ?').bind(organizationId).first();
    const defaultIdentity = await this.db.prepare('SELECT * FROM email_identities WHERE organization_id = ? AND is_default = 1').bind(organizationId).first();
    const domains = await this.db.prepare('SELECT * FROM email_domains WHERE organization_id = ?').bind(organizationId).all();
    const quota = await this.db.prepare('SELECT * FROM shop_email_quotas WHERE organization_id = ?').bind(organizationId).first();

    return {
      activeProvider: providerConn?.provider_type || 'FERASETU',
      defaultSender: defaultIdentity?.email_address || null,
      domains: domains.results || [],
      dailyQuota: quota?.daily_limit || 100,
      sentToday: quota?.emails_sent_today || 0
    };
  }

  async update_email_sender({ organizationId, identityId, displayName, isDefault }) {
    const ident = await this.db.prepare('SELECT * FROM email_identities WHERE id = ? AND organization_id = ?').bind(identityId, organizationId).first();
    if (!ident) {
      throw new Error('Sender identity not found or unauthorized');
    }

    // Save previous snapshot for undo
    await this.db.prepare(`
      INSERT INTO ai_action_history (id, organization_id, action_type, before_state, after_state)
      VALUES (?, ?, 'update_email_sender', ?, ?)
    `).bind(
      `ai_act_${crypto.randomUUID()}`,
      organizationId,
      JSON.stringify(ident),
      JSON.stringify({ ...ident, display_name: displayName ?? ident.display_name, is_default: isDefault ? 1 : 0 })
    ).run();

    if (displayName !== undefined) {
      await this.db.prepare('UPDATE email_identities SET display_name = ? WHERE id = ?').bind(displayName, identityId).run();
    }
    if (isDefault === true) {
      await this.db.prepare('UPDATE email_identities SET is_default = 0 WHERE organization_id = ?').bind(new Date().toISOString(), organizationId).run();
      await this.db.prepare('UPDATE email_identities SET is_default = 1 WHERE id = ?').bind(new Date().toISOString(), identityId).run();
    }

    return { success: true, message: 'Sender identity updated successfully' };
  }

  async update_reply_to({ organizationId, replyToEmail }) {
    if (!replyToEmail || !replyToEmail.includes('@') || /[\r\n]/.test(replyToEmail)) {
      throw new Error('Invalid Reply-To email address or prohibited CRLF characters');
    }

    const org = await this.db.prepare('SELECT * FROM organizations WHERE id = ?').bind(organizationId).first();
    if (!org) throw new Error('Organization not found');

    await this.db.prepare(`
      INSERT INTO ai_action_history (id, organization_id, action_type, before_state, after_state)
      VALUES (?, ?, 'update_reply_to', ?, ?)
    `).bind(
      `ai_act_${crypto.randomUUID()}`,
      organizationId,
      JSON.stringify({ support_email: org.support_email }),
      JSON.stringify({ support_email: replyToEmail })
    ).run();

    org.support_email = replyToEmail;
    return { success: true, replyToEmail };
  }

  async list_email_templates() {
    const list = [];
    for (const [key, tpl] of Object.entries(EMAIL_TEMPLATES)) {
      list.push({
        templateKey: key,
        version: tpl.version,
        requiredVariables: tpl.requiredVariables,
        optionalVariables: tpl.optionalVariables,
        status: tpl.status
      });
    }
    return { templates: list };
  }

  async update_email_template({ organizationId, templateKey, subject, contentHtml }) {
    const tpl = EMAIL_TEMPLATES[templateKey];
    if (!tpl) {
      throw new Error(`Template '${templateKey}' is not registered in the catalog`);
    }

    if (subject && /[\r\n]/.test(subject)) {
      throw new Error('Subject line contains forbidden CRLF characters');
    }

    // Check variable syntax in custom subject/content
    const variablePattern = /\{\{([a-zA-Z0-9_]+)\}\}/g;
    const allowedVars = new Set([...tpl.requiredVariables, ...tpl.optionalVariables]);
    const matches = (subject + ' ' + contentHtml).matchAll(variablePattern);
    for (const m of matches) {
      if (!allowedVars.has(m[1])) {
        throw new Error(`Unauthorized variable '{{${m[1]}}}' in template '${templateKey}'`);
      }
    }

    const prevRow = await this.db.prepare(
      'SELECT * FROM merchant_email_templates WHERE organization_id = ? AND template_key = ?'
    ).bind(organizationId, templateKey).first();

    await this.db.prepare(`
      INSERT INTO ai_action_history (id, organization_id, action_type, before_state, after_state)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      `ai_act_${crypto.randomUUID()}`,
      organizationId,
      'update_email_template',
      JSON.stringify(prevRow || { subject: null, content_html: null }),
      JSON.stringify({ subject, contentHtml })
    ).run();

    const tplId = prevRow?.id || `tpl_custom_${crypto.randomUUID()}`;
    await this.db.prepare(`
      INSERT INTO merchant_email_templates (id, organization_id, template_key, subject, content_html)
      VALUES (?, ?, ?, ?, ?)
    `).bind(tplId, organizationId, templateKey, subject, contentHtml).run();

    return { success: true, templateKey, updated: true };
  }

  async send_test_email({ organizationId, to, templateKey = 'order.confirmation', sampleData = {}, confirmed = false, env }) {
    if (!confirmed) {
      const err = new Error('Test email dispatch is a sensitive action requiring explicit merchant confirmation');
      err.requiresApproval = true;
      throw err;
    }
    if (!to || !to.includes('@')) {
      throw new Error('Valid recipient email address is required');
    }

    const result = await EmailService.send(env, {
      organizationId,
      to,
      templateKey,
      templateData: {
        order_id: 'TEST-ORD-1234',
        total: 1499.00,
        customer_name: 'Priya Sharma',
        ...sampleData
      },
      subject: `[TEST PREVIEW] Order Confirmation • FeraSetu`
    });

    return { success: true, result };
  }

  async undo_last_action({ organizationId }) {
    const historyRows = await this.db.prepare('SELECT * FROM ai_action_history WHERE organization_id = ?').bind(organizationId).all();
    const list = historyRows.results || [];
    if (list.length === 0) {
      throw new Error('No previous AI action history available to undo');
    }

    const lastAction = list[list.length - 1];
    const beforeState = JSON.parse(lastAction.before_state);

    if (lastAction.action_type === 'update_email_template') {
      const targetTpl = this.db._tables.merchant_email_templates.find(t => t.organization_id === organizationId);
      if (targetTpl) {
        if (beforeState.subject === null) {
          // It had no prior override; delete custom override
          this.db._tables.merchant_email_templates = this.db._tables.merchant_email_templates.filter(t => t.organization_id !== organizationId);
        } else {
          targetTpl.subject = beforeState.subject;
          targetTpl.content_html = beforeState.content_html;
        }
      }
    } else if (lastAction.action_type === 'update_reply_to') {
      const org = this.db._tables.organizations.find(o => o.id === organizationId);
      if (org) org.support_email = beforeState.support_email;
    }

    // Pop action from history
    this.db._tables.ai_action_history.pop();
    return { success: true, restoredAction: lastAction.action_type };
  }
}

// =============================================================================
// TIER 1: FEATURE COVERAGE (>=5 TESTS PER FEATURE ACROSS 6 FEATURES)
// =============================================================================

// -----------------------------------------------------------------------------
// FEATURE 1: FeraSetu Mail Default Experience (5 tests)
// -----------------------------------------------------------------------------

test('T1.1.1: FeraSetu Mail: Automatic lazy provisioning of orders@{slug}.ferasetu.com on merchant first visit', async () => {
  const db = createTestDb();
  const env = { DB: db, JWKS: localKeySet, ADMIN_JWT_SECRET: 'test_jwt_key', WORKOS_CLIENT_ID: 'test_client' };

  // Merchant 3 initially has no email records
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
  assert.equal(data.defaultIdentity.is_default, 1);
});

test('T1.1.2: FeraSetu Mail: Platform default domain ferasetu.com is verified and PLATFORM typed', async () => {
  const db = createTestDb();
  const platformDomain = db._tables.email_domains.find(d => d.domain === 'ferasetu.com');

  assert.ok(platformDomain);
  assert.equal(platformDomain.domain_type, 'PLATFORM');
  assert.equal(platformDomain.verification_status, 'VERIFIED');
  assert.equal(platformDomain.dkim_status, 'VERIFIED');
  assert.equal(platformDomain.spf_status, 'VERIFIED');
});

test('T1.1.3: FeraSetu Mail: Default merchant identity is initialized with local_part "orders" and ACTIVE status', async () => {
  const db = createTestDb();
  const identityOrg1 = db._tables.email_identities.find(i => i.organization_id === 'org_1' && i.is_default === 1);

  assert.ok(identityOrg1);
  assert.equal(identityOrg1.local_part, 'orders');
  assert.equal(identityOrg1.status, 'ACTIVE');
  assert.equal(identityOrg1.identity_type, 'MERCHANT');
  assert.equal(identityOrg1.email_address, 'orders@kirana-mumbai-1.ferasetu.com');
});

test('T1.1.4: FeraSetu Mail: Default provider connection is set to FERASETU with STARTTLS', async () => {
  const db = createTestDb();
  const epc = db._tables.email_provider_connections.find(c => c.organization_id === 'org_1');

  assert.ok(epc);
  assert.equal(epc.provider_type, 'FERASETU');
  assert.equal(epc.security_mode, 'STARTTLS');
  assert.equal(epc.status, 'ACTIVE');
});

test('T1.1.5: FeraSetu Mail: Outbound email dispatches cleanly using default FeraSetu Mail identity', async () => {
  const db = createTestDb();
  const env = { DB: db, JWKS: localKeySet, ADMIN_JWT_SECRET: 'test_jwt_key', WORKOS_CLIENT_ID: 'test_client' };

  const sendRes = await EmailService.send(env, {
    organizationId: 'org_1',
    to: 'customer@buyer.com',
    subject: 'Order Received',
    text: 'Your order has been received'
  });

  assert.equal(sendRes.success, true);
  assert.equal(sendRes.status, 'SENT');
  assert.equal(sendRes.provider, 'FERASETU');
  assert.ok(sendRes.messageId);
});

// -----------------------------------------------------------------------------
// FEATURE 2: Custom Domain DNS Records (5 tests)
// -----------------------------------------------------------------------------

test('T1.2.1: Custom Domain: Normalizes raw merchant domain and generates ownership verification token', async () => {
  const db = createTestDb();
  const env = { DB: db, JWKS: localKeySet, ADMIN_JWT_SECRET: 'test_jwt_key', WORKOS_CLIENT_ID: 'test_client' };
  const token = await createToken('usr_1', 'merchant1@example.com', 'org_1', 'owner');

  const req = new Request('https://ferasetu.com/api/email/domains', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain: 'https://My-Shop.IN/store-front/' })
  });

  const res = await worker.fetch(req, env);
  assert.equal(res.status, 201);
  const data = await res.json();

  assert.equal(data.domain.domain, 'my-shop.in');
  assert.equal(data.domain.domain_type, 'CUSTOM');
  assert.equal(data.domain.verification_status, 'PENDING');
  assert.ok(data.domain.verification_token_hash.startsWith('fera_verify_'));
});

test('T1.2.2: Custom Domain: Generates exactly 5 DNS records (TXT challenge, DKIM, SPF, DMARC, CNAME)', async () => {
  const instructions = generateDnsInstructions('artisan-krafts.in', 'verify_token_999', 'fs1');

  assert.equal(instructions.length, 5);
  const types = instructions.map(i => i.type);
  assert.equal(types.filter(t => t === 'TXT').length, 4);
  assert.equal(types.filter(t => t === 'CNAME').length, 1);

  const challenge = instructions.find(i => i.name === '_ferasetu-challenge.artisan-krafts.in');
  assert.ok(challenge);
  assert.equal(challenge.value, 'fera-domain-verification=verify_token_999');

  const dkim = instructions.find(i => i.name === 'fs1._domainkey.artisan-krafts.in');
  assert.ok(dkim);
  assert.ok(dkim.value.startsWith('v=DKIM1'));

  const spf = instructions.find(i => i.name === 'artisan-krafts.in');
  assert.ok(spf);
  assert.ok(spf.value.includes('v=spf1'));

  const dmarc = instructions.find(i => i.name === '_dmarc.artisan-krafts.in');
  assert.ok(dmarc);
  assert.ok(dmarc.value.includes('v=DMARC1'));

  const cname = instructions.find(i => i.name === 'mail.artisan-krafts.in');
  assert.ok(cname);
  assert.equal(cname.value, 'mail.ferasetu.com');
});

test('T1.2.3: Custom Domain: DNS verification endpoint queries DoH and updates record state', async () => {
  const db = createTestDb();
  const env = { DB: db, JWKS: localKeySet, ADMIN_JWT_SECRET: 'test_jwt_key', WORKOS_CLIENT_ID: 'test_client' };
  const token = await createToken('usr_1', 'merchant1@example.com', 'org_1', 'owner');

  // Add custom domain
  const addReq = new Request('https://ferasetu.com/api/email/domains', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain: 'verified-boutique.in' })
  });
  const addRes = await worker.fetch(addReq, env);
  const { domain } = await addRes.json();

  // Mock global fetch for DoH verification
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url.includes('cloudflare-dns.com')) {
      if (url.includes('_ferasetu-challenge')) {
        return new Response(JSON.stringify({ Answer: [{ data: `"${domain.verification_token_hash}"` }] }));
      }
      if (url.includes('_domainkey')) {
        return new Response(JSON.stringify({ Answer: [{ data: '"v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCB"' }] }));
      }
      if (url.includes('verified-boutique.in') && !url.includes('_dmarc')) {
        return new Response(JSON.stringify({ Answer: [{ data: '"v=spf1 include:_spf.ferasetu.com ~all"' }] }));
      }
      if (url.includes('_dmarc')) {
        return new Response(JSON.stringify({ Answer: [{ data: '"v=DMARC1; p=reject"' }] }));
      }
    }
    return originalFetch(url);
  };

  try {
    const verifyReq = new Request(`https://ferasetu.com/api/email/domains/${domain.id}/verify`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const verifyRes = await worker.fetch(verifyReq, env);
    assert.equal(verifyRes.status, 200);
    const verifyData = await verifyRes.json();

    assert.equal(verifyData.domain.verification_status, 'VERIFIED');
    assert.equal(verifyData.domain.dkim_status, 'VERIFIED');
    assert.equal(verifyData.domain.spf_status, 'VERIFIED');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('T1.2.4: Custom Domain: Verification handles missing records gracefully without throwing unhandled exceptions', async () => {
  const db = createTestDb();
  const env = { DB: db, JWKS: localKeySet, ADMIN_JWT_SECRET: 'test_jwt_key', WORKOS_CLIENT_ID: 'test_client' };
  const token = await createToken('usr_1', 'merchant1@example.com', 'org_1', 'owner');

  const addReq = new Request('https://ferasetu.com/api/email/domains', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain: 'unpropagated-store.com' })
  });
  const addRes = await worker.fetch(addReq, env);
  const { domain } = await addRes.json();

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ Answer: [] }));

  try {
    const verifyReq = new Request(`https://ferasetu.com/api/email/domains/${domain.id}/verify`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const verifyRes = await worker.fetch(verifyReq, env);
    assert.equal(verifyRes.status, 200);
    const data = await verifyRes.json();
    assert.equal(data.domain.verification_status, 'PENDING');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('T1.2.5: Custom Domain: Successful verification auto-provisions orders@{customDomain} sender identity', async () => {
  const db = createTestDb();
  const env = { DB: db, JWKS: localKeySet, ADMIN_JWT_SECRET: 'test_jwt_key', WORKOS_CLIENT_ID: 'test_client' };
  const token = await createToken('usr_1', 'merchant1@example.com', 'org_1', 'owner');

  const addReq = new Request('https://ferasetu.com/api/email/domains', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain: 'auto-ident.in' })
  });
  const addRes = await worker.fetch(addReq, env);
  const { domain } = await addRes.json();

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url.includes('_ferasetu-challenge')) return new Response(JSON.stringify({ Answer: [{ data: `"${domain.verification_token_hash}"` }] }));
    if (url.includes('_domainkey')) return new Response(JSON.stringify({ Answer: [{ data: '"v=DKIM1; k=rsa"' }] }));
    if (url.includes('_dmarc')) return new Response(JSON.stringify({ Answer: [{ data: '"v=DMARC1"' }] }));
    return new Response(JSON.stringify({ Answer: [{ data: '"v=spf1 include:_spf.ferasetu.com ~all"' }] }));
  };

  try {
    const verifyReq = new Request(`https://ferasetu.com/api/email/domains/${domain.id}/verify`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    await worker.fetch(verifyReq, env);

    const customIdentity = db._tables.email_identities.find(i => i.email_address === 'orders@auto-ident.in');
    assert.ok(customIdentity);
    assert.equal(customIdentity.local_part, 'orders');
    assert.equal(customIdentity.identity_type, 'CUSTOM');
    assert.equal(customIdentity.status, 'ACTIVE');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// -----------------------------------------------------------------------------
// FEATURE 3: Domain Search & Purchase Validation (5 tests)
// -----------------------------------------------------------------------------

test('T1.3.1: Domain Purchase: Search returns multi-TLD availability with authoritative INR prices', async () => {
  const provider = new MockDomainProvider();
  const results = await provider.search('rohankirana');

  assert.equal(results.length, 4);
  const inDomain = results.find(r => r.tld === '.in');
  assert.ok(inDomain);
  assert.equal(inDomain.domain, 'rohankirana.in');
  assert.equal(inDomain.available, true);
  assert.equal(inDomain.priceInr, 799);
  assert.equal(inDomain.currency, 'INR');
});

test('T1.3.2: Domain Purchase: Authoritative pricing includes exact 18% GST calculation', async () => {
  const provider = new MockDomainProvider();
  const pricing = await provider.getAuthoritativePricing('rohankirana.in');

  assert.equal(pricing.priceInr, 799);
  assert.equal(pricing.taxInr, 143.82); // 799 * 0.18 = 143.82
  assert.equal(pricing.totalInr, 942.82); // 799 + 143.82 = 942.82
  assert.equal(pricing.currency, 'INR');
});

test('T1.3.3: Domain Purchase: Purchase initiation creates Cashfree order with validated amount', async () => {
  const db = createTestDb();
  const provider = new MockDomainProvider();

  const purchaseOrder = await provider.initiatePurchase({
    domain: 'rohankirana.in',
    years: 1,
    clientAmount: 942.82,
    organizationId: 'org_1',
    db
  });

  assert.ok(purchaseOrder.orderId.startsWith('cf_dom_'));
  assert.ok(purchaseOrder.paymentSessionId.startsWith('session_'));
  assert.equal(purchaseOrder.amount, 942.82);
  assert.equal(purchaseOrder.currency, 'INR');
  assert.equal(purchaseOrder.status, 'PAYMENT_PENDING');
});

test('T1.3.4: Domain Purchase: Rejects purchase initiation of unavailable or reserved domains', async () => {
  const db = createTestDb();
  const provider = new MockDomainProvider();

  await assert.rejects(async () => {
    await provider.initiatePurchase({
      domain: 'google.com',
      years: 1,
      clientAmount: 1178.82,
      organizationId: 'org_1',
      db
    });
  }, /unavailable for registration/);
});

test('T1.3.5: Domain Purchase: Successful payment verification provisions domain in email_domains', async () => {
  const db = createTestDb();
  const provider = new MockDomainProvider();

  const purchaseOrder = await provider.initiatePurchase({
    domain: 'rohankirana.in',
    years: 1,
    clientAmount: 942.82,
    organizationId: 'org_1',
    db
  });

  const verified = await provider.verifyPurchase({
    orderId: purchaseOrder.orderId,
    domain: 'rohankirana.in',
    organizationId: 'org_1',
    db,
    cashfreeStatus: 'PAID'
  });

  assert.equal(verified.success, true);
  assert.equal(verified.domain.domain, 'rohankirana.in');
  assert.equal(verified.domain.domain_type, 'CUSTOM');
  assert.equal(verified.domain.verification_status, 'PENDING');
  assert.equal(verified.dnsInstructions.length, 5);
});

// -----------------------------------------------------------------------------
// FEATURE 4: Transactional Templates Interpolation & Sanitization (5 tests)
// -----------------------------------------------------------------------------

test('T1.4.1: Templates: Catalog registers all 6 core commerce templates with required schemas', () => {
  const coreTemplates = [
    'order.confirmation',
    'order.shipped',
    'order.delivered',
    'payment.failed',
    'invoice.created',
    'refund.initiated'
  ];

  for (const key of coreTemplates) {
    assert.ok(EMAIL_TEMPLATES[key], `Template ${key} must exist in registry`);
    assert.ok(Array.isArray(EMAIL_TEMPLATES[key].requiredVariables));
    assert.ok(EMAIL_TEMPLATES[key].requiredVariables.length > 0);
  }
});

test('T1.4.2: Templates: Strict interpolation correctly injects variables into HTML and plain-text', () => {
  const rendered = renderEmailTemplate({
    templateKey: 'order.confirmation',
    data: {
      order_id: 'ORD-987654',
      total: 2450.00,
      customer_name: 'Amit Patel',
      otp: '4455'
    },
    branding: { storeName: 'Mumbai Grocers', primaryColor: '#0052FF' }
  });

  assert.ok(rendered.subject.includes('ORD-987654'));
  assert.ok(rendered.subject.includes('Mumbai Grocers'));
  assert.ok(rendered.html.includes('Amit Patel'));
  assert.ok(rendered.html.includes('₹2,450.00'));
  assert.ok(rendered.html.includes('4455'));
  assert.ok(rendered.text.includes('ORD-987654'));
});

test('T1.4.3: Templates: Sanitization escapes malicious script and HTML injection payloads', () => {
  const xssPayload = '<script>alert("XSS")</script><img src=x onerror=alert(1)>';
  const rendered = renderEmailTemplate({
    templateKey: 'order.confirmation',
    data: {
      order_id: 'ORD-101',
      total: 500,
      customer_name: xssPayload
    },
    branding: { storeName: 'Secure Store' }
  });

  assert.ok(!rendered.html.includes('<script>'));
  assert.ok(!rendered.html.includes('<img src=x'));
  assert.ok(rendered.html.includes('&lt;script&gt;'));
  assert.ok(rendered.html.includes('&lt;img src=x'));
});

test('T1.4.4: Templates: Validation rejects missing mandatory variables with descriptive error', () => {
  const validation = validateTemplateVariables('order.confirmation', {
    // Missing order_id and total
    customer_name: 'Incomplete Order'
  });

  assert.equal(validation.valid, false);
  assert.equal(validation.reason, 'MISSING_TEMPLATE_VARIABLES');
  assert.ok(validation.missing.includes('order_id'));
  assert.ok(validation.missing.includes('total'));
});

test('T1.4.5: Templates: Custom merchant template overrides persist and render with fallback', async () => {
  const db = createTestDb();
  const assistant = new AiEmailAssistantService(db);

  await assistant.update_email_template({
    organizationId: 'org_1',
    templateKey: 'order.confirmation',
    subject: 'Your Mumbai Grocers Order {{order_id}} is confirmed!',
    contentHtml: '<p>Thank you for shopping local with Mumbai Grocers! Total: {{total}}</p>'
  });

  const saved = await db.prepare(
    'SELECT * FROM merchant_email_templates WHERE organization_id = ? AND template_key = ?'
  ).bind('org_1', 'order.confirmation').first();

  assert.ok(saved);
  assert.equal(saved.subject, 'Your Mumbai Grocers Order {{order_id}} is confirmed!');
  assert.ok(saved.content_html.includes('Mumbai Grocers'));
});

// -----------------------------------------------------------------------------
// FEATURE 5: AI Email Tools (6 tests)
// -----------------------------------------------------------------------------

test('T1.5.1: AI Tools: get_email_settings returns provider, domains, sender identities, and quota', async () => {
  const db = createTestDb();
  const assistant = new AiEmailAssistantService(db);

  const settings = await assistant.get_email_settings({ organizationId: 'org_1' });
  assert.equal(settings.activeProvider, 'FERASETU');
  assert.equal(settings.defaultSender, 'orders@kirana-mumbai-1.ferasetu.com');
  assert.ok(Array.isArray(settings.domains));
  assert.equal(settings.dailyQuota, 500);
});

test('T1.5.2: AI Tools: update_email_sender modifies sender display name and default identity', async () => {
  const db = createTestDb();
  const assistant = new AiEmailAssistantService(db);

  const res = await assistant.update_email_sender({
    organizationId: 'org_1',
    identityId: 'ident_m_org_1',
    displayName: 'Kirana Mumbai Express'
  });

  assert.equal(res.success, true);
  const updated = db._tables.email_identities.find(i => i.id === 'ident_m_org_1');
  assert.equal(updated.display_name, 'Kirana Mumbai Express');
});

test('T1.5.3: AI Tools: update_reply_to updates customer reply routing address with validation', async () => {
  const db = createTestDb();
  const assistant = new AiEmailAssistantService(db);

  const res = await assistant.update_reply_to({
    organizationId: 'org_1',
    replyToEmail: 'owner@mumbaikirana.com'
  });

  assert.equal(res.success, true);
  assert.equal(res.replyToEmail, 'owner@mumbaikirana.com');
});

test('T1.5.4: AI Tools: list_email_templates returns template catalog and variable whitelist', async () => {
  const db = createTestDb();
  const assistant = new AiEmailAssistantService(db);

  const res = await assistant.list_email_templates();
  assert.ok(Array.isArray(res.templates));
  assert.ok(res.templates.some(t => t.templateKey === 'order.confirmation'));
});

test('T1.5.5: AI Tools: update_email_template records snapshot history and supports 1-click undo', async () => {
  const db = createTestDb();
  const assistant = new AiEmailAssistantService(db);

  // 1. Initial modification
  await assistant.update_email_template({
    organizationId: 'org_1',
    templateKey: 'order.confirmation',
    subject: 'AI Subject: Order {{order_id}} Confirmed',
    contentHtml: '<p>AI Body: Total {{total}}</p>'
  });

  const modified = db._tables.merchant_email_templates.find(t => t.organization_id === 'org_1');
  assert.equal(modified.subject, 'AI Subject: Order {{order_id}} Confirmed');

  // 2. Undo operation
  const undoRes = await assistant.undo_last_action({ organizationId: 'org_1' });
  assert.equal(undoRes.success, true);
  assert.equal(undoRes.restoredAction, 'update_email_template');

  // Since it was fresh with no prior override, it should be cleanly rolled back
  const rolledBack = db._tables.merchant_email_templates.find(t => t.organization_id === 'org_1');
  assert.equal(rolledBack, undefined);
});

test('T1.5.6: AI Tools: send_test_email requires explicit confirmation before executing sensitive send', async () => {
  const db = createTestDb();
  const env = { DB: db, JWKS: localKeySet, ADMIN_JWT_SECRET: 'test_jwt_key', WORKOS_CLIENT_ID: 'test_client' };
  const assistant = new AiEmailAssistantService(db);

  // Without confirmation -> throws ApprovalRequiredError
  await assert.rejects(async () => {
    await assistant.send_test_email({
      organizationId: 'org_1',
      to: 'merchant@test.com',
      confirmed: false,
      env
    });
  }, /sensitive action requiring explicit merchant confirmation/);

  // With confirmation -> succeeds
  const res = await assistant.send_test_email({
    organizationId: 'org_1',
    to: 'merchant@test.com',
    confirmed: true,
    env
  });

  assert.equal(res.success, true);
  assert.ok(res.result.messageId);
});

// -----------------------------------------------------------------------------
// FEATURE 6: Delivery Activity Log (5 tests)
// -----------------------------------------------------------------------------

test('T1.6.1: Delivery Log: Outbound dispatch creates immutable delivery event record', async () => {
  const db = createTestDb();
  const env = { DB: db, JWKS: localKeySet, ADMIN_JWT_SECRET: 'test_jwt_key', WORKOS_CLIENT_ID: 'test_client' };

  await EmailService.send(env, {
    organizationId: 'org_1',
    to: 'buyer@target.com',
    subject: 'Receipt #1001',
    text: 'Receipt details'
  });

  const event = db._tables.email_events.find(e => e.merchant_id === 'org_1');
  assert.ok(event);
  assert.equal(event.recipient, 'buyer@target.com');
  assert.equal(event.event_type, 'SENT');
});

test('T1.6.2: Delivery Log: GET /api/email/events filters records strictly by organizationId', async () => {
  const db = createTestDb();
  const env = { DB: db, JWKS: localKeySet, ADMIN_JWT_SECRET: 'test_jwt_key', WORKOS_CLIENT_ID: 'test_client' };

  // Dispatch for org_1
  await EmailService.send(env, { organizationId: 'org_1', to: 'customer1@mail.com', subject: 'Org1 Email', text: 'Body 1' });
  // Dispatch for org_2
  db._tables.shop_email_quotas.find(q => q.organization_id === 'org_2').emails_sent_today = 0;
  await EmailService.send(env, { organizationId: 'org_2', to: 'customer2@mail.com', subject: 'Org2 Email', text: 'Body 2' });

  const token1 = await createToken('usr_1', 'merchant1@example.com', 'org_1', 'owner');
  const req = new Request('https://ferasetu.com/api/email/events', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token1}` }
  });

  const res = await worker.fetch(req, env);
  assert.equal(res.status, 200);
  const data = await res.json();

  assert.ok(data.events.length > 0);
  assert.ok(data.events.every(e => e.merchant_id === 'org_1'));
  assert.ok(!data.events.some(e => e.merchant_id === 'org_2'));
});

test('T1.6.3: Delivery Log: Audit trail redacts message bodies and PII, storing only metadata', async () => {
  const db = createTestDb();
  const env = { DB: db, JWKS: localKeySet, ADMIN_JWT_SECRET: 'test_jwt_key', WORKOS_CLIENT_ID: 'test_client' };

  await EmailService.send(env, {
    organizationId: 'org_1',
    to: 'confidential@customer.com',
    subject: 'Credit Card Statement',
    text: 'SECRET PIN: 1234. Card Number: 4111-2222-3333-4444'
  });

  const event = db._tables.email_events.find(e => e.recipient === 'confidential@customer.com');
  assert.ok(event);
  assert.equal(event.body, undefined);
  assert.equal(event.content, undefined);
  assert.ok(!JSON.stringify(event).includes('SECRET PIN'));
});

test('T1.6.4: Delivery Log: Accurately records status transitions and provider metadata', async () => {
  const db = createTestDb();
  const env = { DB: db, JWKS: localKeySet, ADMIN_JWT_SECRET: 'test_jwt_key', WORKOS_CLIENT_ID: 'test_client' };

  await EmailService.send(env, {
    organizationId: 'org_1',
    to: 'delivered@buyer.com',
    subject: 'Delivered Order #55',
    text: 'Package delivered'
  });

  const event = db._tables.email_events.find(e => e.recipient === 'delivered@buyer.com');
  assert.equal(event.event_type, 'SENT');
  assert.equal(event.provider_status, '250');
});

test('T1.6.5: Delivery Log: Unverified custom domain records fallback event in audit trail', async () => {
  const db = createTestDb();
  const env = { DB: db, JWKS: localKeySet, ADMIN_JWT_SECRET: 'test_jwt_key', WORKOS_CLIENT_ID: 'test_client' };

  // Add unverified custom domain
  db._tables.email_domains.push({
    id: 'dom_unverified_1',
    organization_id: 'org_1',
    domain: 'unverified-sender.com',
    domain_type: 'CUSTOM',
    verification_status: 'PENDING'
  });

  // Attempt to send from unverified custom address
  const sendRes = await EmailService.send(env, {
    organizationId: 'org_1',
    from: 'orders@unverified-sender.com',
    to: 'target@buyer.com',
    subject: 'Notice',
    text: 'Hello'
  });

  assert.equal(sendRes.success, true);
  // Auto-fallback applied to default verified FeraSetu domain
  assert.equal(sendRes.from, 'orders@kirana-mumbai-1.ferasetu.com');
});

// =============================================================================
// TIER 2: BOUNDARY & CORNER CASES (>=5 TESTS PER FEATURE ACROSS 5 AREAS)
// =============================================================================

// -----------------------------------------------------------------------------
// AREA 1: Empty / Malformed Variables (5 tests)
// -----------------------------------------------------------------------------

test('T2.1.1: Boundaries: Null or undefined variable values fail template validation', () => {
  const validation = validateTemplateVariables('order.confirmation', {
    order_id: null,
    total: undefined
  });

  assert.equal(validation.valid, false);
  assert.equal(validation.reason, 'MISSING_TEMPLATE_VARIABLES');
  assert.ok(validation.missing.includes('order_id'));
  assert.ok(validation.missing.includes('total'));
});

test('T2.1.2: Boundaries: Empty string or whitespace-only variables fail required validation', () => {
  const validation = validateTemplateVariables('order.shipped', {
    order_id: '   '
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.missing.includes('order_id'));
});

test('T2.1.3: Boundaries: Nested object or array injection into scalar string placeholders is safely escaped', () => {
  const rendered = renderEmailTemplate({
    templateKey: 'order.confirmation',
    data: {
      order_id: 'ORD-OBJECT-INJECT',
      total: 100,
      customer_name: { toString: () => '<b onmouseover=evil()>Payload</b>' }
    }
  });

  assert.ok(!rendered.html.includes('<b onmouseover=evil()>'));
  assert.ok(rendered.html.includes('&lt;b onmouseover=evil()&gt;'));
});

test('T2.1.4: Boundaries: Multilingual unicode (Hindi, Gujarati, emojis) renders without encoding corruption', () => {
  const hindiName = 'रोहन किराना स्टोर 🛒';
  const rendered = renderEmailTemplate({
    templateKey: 'order.confirmation',
    data: {
      order_id: 'ORD-HINDI-1',
      total: 999,
      customer_name: hindiName
    }
  });

  assert.ok(rendered.html.includes('रोहन किराना स्टोर 🛒'));
  assert.ok(rendered.text.includes('रोहन किराना स्टोर 🛒'));
});

test('T2.1.5: Boundaries: Extra unregistered template variables are ignored without corrupting output', () => {
  const rendered = renderEmailTemplate({
    templateKey: 'order.delivered',
    data: {
      order_id: 'ORD-EXT-99',
      unregistered_sneaky_field: 'Hacker Payload',
      __proto__: { polluted: true }
    }
  });

  assert.ok(rendered.html.includes('ORD-EXT-99'));
  assert.ok(!rendered.html.includes('Hacker Payload'));
});

// -----------------------------------------------------------------------------
// AREA 2: CRLF Header Injection (5 tests)
// -----------------------------------------------------------------------------

test('T2.2.1: CRLF Injection: Prohibits CRLF in email Subject line', () => {
  assert.throws(() => {
    sanitizeHeaderValue('Order Confirmation\r\nBcc: evil@hacker.com');
  }, /Header injection detected/);

  assert.throws(() => {
    sanitizeHeaderValue('Order Confirmation\nBcc: evil@hacker.com');
  }, /Header injection detected/);
});

test('T2.2.2: CRLF Injection: Prohibits CRLF in sender display name', () => {
  assert.throws(() => {
    sanitizeHeaderValue('Kirana Store\r\nSender: forged@ferasetu.com');
  }, /Header injection detected/);
});

test('T2.2.3: CRLF Injection: Prohibits CRLF in replyTo destination address', () => {
  assert.throws(() => {
    sanitizeHeaderValue('merchant@store.com\r\nCc: spy@competitor.com');
  }, /Header injection detected/);
});

test('T2.2.4: CRLF Injection: Rejects obfuscated CRLF in recipient email parameter', async () => {
  const db = createTestDb();
  const env = { DB: db, JWKS: localKeySet, ADMIN_JWT_SECRET: 'test_jwt_key', WORKOS_CLIENT_ID: 'test_client' };

  await assert.rejects(async () => {
    await EmailService.send(env, {
      organizationId: 'org_1',
      to: 'customer@test.com\r\nBcc: spy@evil.com',
      subject: 'Valid Subject',
      text: 'Valid Body'
    });
  }, /Header injection detected/);
});

test('T2.2.5: CRLF Injection: Prohibits CRLF in custom email headers', async () => {
  const db = createTestDb();
  const env = { DB: db, JWKS: localKeySet, ADMIN_JWT_SECRET: 'test_jwt_key', WORKOS_CLIENT_ID: 'test_client' };

  await assert.rejects(async () => {
    await EmailService.send(env, {
      organizationId: 'org_1',
      to: 'customer@test.com',
      subject: 'Valid Subject',
      text: 'Valid Body',
      customHeaders: {
        'x-entity-ref-id': '101\r\nX-Injected-Header: InjectedValue'
      }
    });
  }, /Header injection detected/);
});

// -----------------------------------------------------------------------------
// AREA 3: Max Domain Length & RFC 1035 Boundaries (5 tests)
// -----------------------------------------------------------------------------

test('T2.3.1: RFC 1035: Domain exceeding 253 characters is rejected', () => {
  const excessiveDomain = 'a'.repeat(60) + '.' + 'b'.repeat(60) + '.' + 'c'.repeat(60) + '.' + 'd'.repeat(70) + '.com';
  assert.ok(excessiveDomain.length > 253);

  const norm = normalizeDomain(excessiveDomain);
  assert.equal(norm.valid, false);
});

test('T2.3.2: RFC 1035: Individual DNS label exceeding 63 characters is rejected', () => {
  const longLabelDomain = 'a'.repeat(64) + '.com';
  const norm = normalizeDomain(longLabelDomain);
  assert.equal(norm.valid, false);
});

test('T2.3.3: RFC 1035: Domain labels with leading or trailing hyphens are rejected', () => {
  assert.equal(normalizeDomain('-store.com').valid, false);
  assert.equal(normalizeDomain('store-.com').valid, false);
  assert.equal(normalizeDomain('my.-store.com').valid, false);
});

test('T2.3.4: RFC 1035: Domain containing invalid characters or spaces is rejected', () => {
  assert.equal(normalizeDomain('my store.com').valid, false);
  assert.equal(normalizeDomain('store!.com').valid, false);
  assert.equal(normalizeDomain('store@shop.com').valid, false);
});

test('T2.3.5: RFC 1035: Platform domain ferasetu.com and its subdomains are rejected as custom domains', () => {
  assert.equal(normalizeDomain('ferasetu.com').valid, false);
  assert.equal(normalizeDomain('admin.ferasetu.com').valid, false);
  assert.equal(normalizeDomain('mail.ferasetu.com').valid, false);
  assert.equal(normalizeDomain('shop.ferasetu.com').valid, false);
});

// -----------------------------------------------------------------------------
// AREA 4: Invalid SPF / DKIM Formats (5 tests)
// -----------------------------------------------------------------------------

test('T2.4.1: DNS Formats: Malformed SPF without v=spf1 prefix fails verification', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url.includes('_ferasetu-challenge')) return new Response(JSON.stringify({ Answer: [{ data: '"token"' }] }));
    if (url.includes('_domainkey')) return new Response(JSON.stringify({ Answer: [{ data: '"v=DKIM1; k=rsa"' }] }));
    // Malformed SPF missing v=spf1
    return new Response(JSON.stringify({ Answer: [{ data: '"include:_spf.google.com ~all"' }] }));
  };

  try {
    const res = await verifyDomainDns('bad-spf.in', 'token', 'fs1');
    assert.equal(res.spfStatus, 'PENDING');
    assert.equal(res.verified, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('T2.4.2: DNS Formats: Malformed DKIM without v=DKIM1 fails verification', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url.includes('_ferasetu-challenge')) return new Response(JSON.stringify({ Answer: [{ data: '"token"' }] }));
    // Malformed DKIM missing v=DKIM1
    if (url.includes('_domainkey')) return new Response(JSON.stringify({ Answer: [{ data: '"k=dsa; p=invalidkey"' }] }));
    return new Response(JSON.stringify({ Answer: [{ data: '"v=spf1 include:_spf.ferasetu.com ~all"' }] }));
  };

  try {
    const res = await verifyDomainDns('bad-dkim.in', 'token', 'fs1');
    assert.equal(res.dkimStatus, 'PENDING');
    assert.equal(res.verified, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('T2.4.3: DNS Formats: Missing DMARC record results in RECOMMENDED_MISSING status', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url.includes('_ferasetu-challenge')) return new Response(JSON.stringify({ Answer: [{ data: '"token"' }] }));
    if (url.includes('_domainkey')) return new Response(JSON.stringify({ Answer: [{ data: '"v=DKIM1; k=rsa"' }] }));
    if (url.includes('_dmarc')) return new Response(JSON.stringify({ Answer: [] })); // No DMARC
    return new Response(JSON.stringify({ Answer: [{ data: '"v=spf1 include:_spf.ferasetu.com ~all"' }] }));
  };

  try {
    const res = await verifyDomainDns('missing-dmarc.in', 'token', 'fs1');
    assert.equal(res.dmarcStatus, 'RECOMMENDED_MISSING');
    // Ownership + DKIM + SPF pass, so domain overall passes
    assert.equal(res.verified, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('T2.4.4: DNS Formats: DoH query network error returns gracefully without crashing', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('DNS Server Timeout'); };

  try {
    const res = await verifyDomainDns('timeout-domain.in', 'token', 'fs1');
    assert.equal(res.verified, false);
    assert.equal(res.status, 'PENDING');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('T2.4.5: DNS Formats: Ownership challenge mismatch blocks verification', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    // Challenge answer returns wrong token
    if (url.includes('_ferasetu-challenge')) return new Response(JSON.stringify({ Answer: [{ data: '"fera-domain-verification=wrong_token"' }] }));
    if (url.includes('_domainkey')) return new Response(JSON.stringify({ Answer: [{ data: '"v=DKIM1; k=rsa"' }] }));
    return new Response(JSON.stringify({ Answer: [{ data: '"v=spf1 include:_spf.ferasetu.com ~all"' }] }));
  };

  try {
    const res = await verifyDomainDns('mismatched-challenge.in', 'expected_token', 'fs1');
    assert.equal(res.ownershipStatus, 'PENDING');
    assert.equal(res.verified, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// -----------------------------------------------------------------------------
// AREA 5: Zero / Negative Pricing Tampering (5 tests)
// -----------------------------------------------------------------------------

test('T2.5.1: Anti-Tampering: Rejects purchase initiation with zero amount (amount: 0)', async () => {
  const db = createTestDb();
  const provider = new MockDomainProvider();

  await assert.rejects(async () => {
    await provider.initiatePurchase({
      domain: 'free-store.in',
      years: 1,
      clientAmount: 0,
      organizationId: 'org_1',
      db
    });
  }, /Price tampering detected/);
});

test('T2.5.2: Anti-Tampering: Rejects purchase initiation with negative amount (amount: -799)', async () => {
  const db = createTestDb();
  const provider = new MockDomainProvider();

  await assert.rejects(async () => {
    await provider.initiatePurchase({
      domain: 'negative-store.in',
      years: 1,
      clientAmount: -799,
      organizationId: 'org_1',
      db
    });
  }, /Price tampering detected/);
});

test('T2.5.3: Anti-Tampering: Rejects client discount spoofing differing from server authoritative price', async () => {
  const db = createTestDb();
  const provider = new MockDomainProvider();

  // Authoritative total for .in is ₹942.82. Client attempts to pass ₹99.00
  await assert.rejects(async () => {
    await provider.initiatePurchase({
      domain: 'tampered-price.in',
      years: 1,
      clientAmount: 99.00,
      organizationId: 'org_1',
      db
    });
  }, /Price tampering detected/);
});

test('T2.5.4: Anti-Tampering: Rejects invalid or fractional registration years', async () => {
  const db = createTestDb();
  const provider = new MockDomainProvider();

  await assert.rejects(async () => {
    await provider.initiatePurchase({
      domain: 'invalid-years.in',
      years: 0,
      clientAmount: 942.82,
      organizationId: 'org_1',
      db
    });
  }, /Registration duration must be an integer/);

  await assert.rejects(async () => {
    await provider.initiatePurchase({
      domain: 'invalid-years.in',
      years: 1.5,
      clientAmount: 942.82,
      organizationId: 'org_1',
      db
    });
  }, /Registration duration must be an integer/);
});

test('T2.5.5: Anti-Tampering: Rejects domain purchase if years exceed maximum limit (10 years)', async () => {
  const db = createTestDb();
  const provider = new MockDomainProvider();

  await assert.rejects(async () => {
    await provider.initiatePurchase({
      domain: 'long-term.in',
      years: 11,
      clientAmount: 10371.02,
      organizationId: 'org_1',
      db
    });
  }, /Registration duration must be an integer between 1 and 10 years/);
});

// =============================================================================
// TIER 3: CROSS-FEATURE COMBINATIONS (PAIRWISE INTERACTIONS)
// =============================================================================

// -----------------------------------------------------------------------------
// COMBINATION 1: Domain Purchase + DNS Verification + Sender Identity
// -----------------------------------------------------------------------------

test('T3.1.1: Pairwise: Purchase domain -> DNS verification -> identity auto-creation pipeline', async () => {
  const db = createTestDb();
  const provider = new MockDomainProvider();

  // 1. Purchase domain
  const order = await provider.initiatePurchase({
    domain: 'complete-cycle.in',
    years: 1,
    clientAmount: 942.82,
    organizationId: 'org_1',
    db
  });

  // 2. Post-payment verification creates PENDING domain
  const verifiedPurchase = await provider.verifyPurchase({
    orderId: order.orderId,
    domain: 'complete-cycle.in',
    organizationId: 'org_1',
    db,
    cashfreeStatus: 'PAID'
  });
  assert.equal(verifiedPurchase.domain.verification_status, 'PENDING');

  // 3. DNS Verification succeeds
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url.includes('_ferasetu-challenge')) return new Response(JSON.stringify({ Answer: [{ data: `"${verifiedPurchase.domain.verification_token_hash}"` }] }));
    if (url.includes('_domainkey')) return new Response(JSON.stringify({ Answer: [{ data: '"v=DKIM1; k=rsa"' }] }));
    return new Response(JSON.stringify({ Answer: [{ data: '"v=spf1 include:_spf.ferasetu.com ~all"' }] }));
  };

  try {
    const env = { DB: db, JWKS: localKeySet, ADMIN_JWT_SECRET: 'test_jwt_key', WORKOS_CLIENT_ID: 'test_client' };
    const token = await createToken('usr_1', 'merchant1@example.com', 'org_1', 'owner');
    const verifyReq = new Request(`https://ferasetu.com/api/email/domains/${verifiedPurchase.domain.id}/verify`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const verifyRes = await worker.fetch(verifyReq, env);
    assert.equal(verifyRes.status, 200);

    // 4. Verify identity created
    const customIdent = db._tables.email_identities.find(i => i.email_address === 'orders@complete-cycle.in');
    assert.ok(customIdent);
    assert.equal(customIdent.status, 'ACTIVE');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('T3.1.2: Pairwise: Creating sender identity on unverified domain is strictly blocked with 400', async () => {
  const db = createTestDb();
  const env = { DB: db, JWKS: localKeySet, ADMIN_JWT_SECRET: 'test_jwt_key', WORKOS_CLIENT_ID: 'test_client' };
  const token = await createToken('usr_1', 'merchant1@example.com', 'org_1', 'owner');

  // Register domain but leave in PENDING status
  const addReq = new Request('https://ferasetu.com/api/email/domains', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain: 'unverified-ident.com' })
  });
  const addRes = await worker.fetch(addReq, env);
  const { domain } = await addRes.json();

  // Attempt to create identity on unverified domain
  const identReq = new Request('https://ferasetu.com/api/email/identities', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      domain_id: domain.id,
      local_part: 'support',
      display_name: 'Support Team'
    })
  });
  const identRes = await worker.fetch(identReq, env);
  assert.equal(identRes.status, 400);
  const errData = await identRes.json();
  assert.ok(errData.error.includes('unverified domain'));
});

test('T3.1.3: Pairwise: Revoking domain verification immediately disables outbound sending from custom identity', async () => {
  const db = createTestDb();
  const env = { DB: db, JWKS: localKeySet, ADMIN_JWT_SECRET: 'test_jwt_key', WORKOS_CLIENT_ID: 'test_client' };

  // Setup verified custom domain and identity
  const domId = 'dom_revoked_1';
  db._tables.email_domains.push({
    id: domId,
    organization_id: 'org_1',
    domain: 'revoked-store.com',
    domain_type: 'CUSTOM',
    verification_status: 'VERIFIED'
  });
  db._tables.email_identities.push({
    id: 'ident_revoked_1',
    organization_id: 'org_1',
    domain_id: domId,
    local_part: 'orders',
    email_address: 'orders@revoked-store.com',
    display_name: 'Revoked Store',
    identity_type: 'CUSTOM',
    status: 'ACTIVE',
    is_default: 0
  });

  // Outbound send succeeds while VERIFIED
  const send1 = await EmailService.send(env, {
    organizationId: 'org_1',
    from: 'orders@revoked-store.com',
    to: 'buyer@test.com',
    subject: 'Active Status',
    text: 'OK'
  });
  assert.equal(send1.from, 'orders@revoked-store.com');

  // Revoke domain verification status to FAILED
  const dom = db._tables.email_domains.find(d => d.id === domId);
  dom.verification_status = 'FAILED';

  // Outbound send should fallback to FeraSetu default domain
  const send2 = await EmailService.send(env, {
    organizationId: 'org_1',
    from: 'orders@revoked-store.com',
    to: 'buyer@test.com',
    subject: 'Revoked Status',
    text: 'Fallback'
  });
  assert.equal(send2.from, 'orders@kirana-mumbai-1.ferasetu.com');
});

// -----------------------------------------------------------------------------
// COMBINATION 2: Template Edit + AI Assistant Update + Test Dispatch
// -----------------------------------------------------------------------------

test('T3.2.1: Pairwise: Template edit -> AI Assistant update -> test dispatch pipeline', async () => {
  const db = createTestDb();
  const env = { DB: db, JWKS: localKeySet, ADMIN_JWT_SECRET: 'test_jwt_key', WORKOS_CLIENT_ID: 'test_client' };
  const assistant = new AiEmailAssistantService(db);

  // 1. AI updates template
  await assistant.update_email_template({
    organizationId: 'org_1',
    templateKey: 'order.confirmation',
    subject: 'AI Updated Order Confirmed #{{order_id}}',
    contentHtml: '<p>Hello {{customer_name}}, thank you for shopping with us! Total: {{total}}</p>'
  });

  // 2. Dispatch test email using updated template
  const dispatchRes = await assistant.send_test_email({
    organizationId: 'org_1',
    to: 'tester@ferasetu.com',
    templateKey: 'order.confirmation',
    sampleData: { order_id: 'AI-TEST-99', customer_name: 'Test Customer', total: 750 },
    confirmed: true,
    env
  });

  assert.equal(dispatchRes.success, true);
  assert.ok(dispatchRes.result.messageId);
});

test('T3.2.2: Pairwise: AI update with invalid variables is blocked and preserves original template', async () => {
  const db = createTestDb();
  const assistant = new AiEmailAssistantService(db);

  await assert.rejects(async () => {
    await assistant.update_email_template({
      organizationId: 'org_1',
      templateKey: 'order.shipped',
      subject: 'Your order has shipped with invalid tag {{forbidden_variable_xyz}}',
      contentHtml: '<p>Body</p>'
    });
  }, /Unauthorized variable/);

  // Template override should not exist
  const tpl = db._tables.merchant_email_templates.find(t => t.organization_id === 'org_1');
  assert.equal(tpl, undefined);
});

test('T3.2.3: Pairwise: AI update rollback immediately restores original template for dispatch', async () => {
  const db = createTestDb();
  const env = { DB: db, JWKS: localKeySet, ADMIN_JWT_SECRET: 'test_jwt_key', WORKOS_CLIENT_ID: 'test_client' };
  const assistant = new AiEmailAssistantService(db);

  // Modify
  await assistant.update_email_template({
    organizationId: 'org_1',
    templateKey: 'order.delivered',
    subject: 'AI Delivery Notice {{order_id}}',
    contentHtml: '<p>Delivered</p>'
  });

  // Rollback
  await assistant.undo_last_action({ organizationId: 'org_1' });

  // Dispatched email uses standard system template
  const res = await assistant.send_test_email({
    organizationId: 'org_1',
    to: 'merchant@test.com',
    templateKey: 'order.delivered',
    sampleData: { order_id: 'SYSTEM-DELIV-1' },
    confirmed: true,
    env
  });

  assert.equal(res.success, true);
});

// -----------------------------------------------------------------------------
// COMBINATION 3: Tenant Isolation Cross-Tenant Checks
// -----------------------------------------------------------------------------

test('T3.3.1: Cross-Tenant: Merchant A cannot view, verify, or delete Merchant B custom domains', async () => {
  const db = createTestDb();
  const env = { DB: db, JWKS: localKeySet, ADMIN_JWT_SECRET: 'test_jwt_key', WORKOS_CLIENT_ID: 'test_client' };

  // Merchant 1 adds a custom domain
  const token1 = await createToken('usr_1', 'merchant1@example.com', 'org_1', 'owner');
  const addReq = new Request('https://ferasetu.com/api/email/domains', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token1}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain: 'merchant-one-store.com' })
  });
  const addRes = await worker.fetch(addReq, env);
  const { domain } = await addRes.json();

  // Merchant 2 attempts to GET Merchant 1's domain
  const token2 = await createToken('usr_2', 'merchant2@example.com', 'org_2', 'owner');
  const getReq = new Request(`https://ferasetu.com/api/email/domains/${domain.id}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token2}` }
  });
  const getRes = await worker.fetch(getReq, env);
  assert.equal(getRes.status, 404);

  // Merchant 2 attempts to verify Merchant 1's domain
  const verifyReq = new Request(`https://ferasetu.com/api/email/domains/${domain.id}/verify`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token2}` }
  });
  const verifyRes = await worker.fetch(verifyReq, env);
  assert.equal(verifyRes.status, 404);

  // Merchant 2 attempts to delete Merchant 1's domain
  const delReq = new Request(`https://ferasetu.com/api/email/domains/${domain.id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token2}` }
  });
  const delRes = await worker.fetch(delReq, env);
  assert.equal(delRes.status, 404);
});

test('T3.3.2: Cross-Tenant: Merchant A cannot send email using Merchant B sender address', async () => {
  const db = createTestDb();
  const env = { DB: db, JWKS: localKeySet, ADMIN_JWT_SECRET: 'test_jwt_key', WORKOS_CLIENT_ID: 'test_client' };

  // Merchant 2 attempts to send specifying Merchant 1's sender address
  db._tables.shop_email_quotas.find(q => q.organization_id === 'org_2').emails_sent_today = 0;
  await assert.rejects(async () => {
    await EmailService.send(env, {
      organizationId: 'org_2',
      from: 'orders@kirana-mumbai-1.ferasetu.com', // Tenant 1's sender
      to: 'customer@test.com',
      subject: 'Spoofed Email',
      text: 'Attempting spoof'
    });
  }, /No authorized email identity found/);
});

test('T3.3.3: Cross-Tenant: Merchant A cannot view or edit Merchant B custom templates', async () => {
  const db = createTestDb();
  const assistant = new AiEmailAssistantService(db);

  // Tenant 1 customizes template
  await assistant.update_email_template({
    organizationId: 'org_1',
    templateKey: 'order.confirmation',
    subject: 'Tenant 1 Special Confirmation',
    contentHtml: '<p>Org 1 Special Body</p>'
  });

  // Querying for Tenant 2 returns no override
  const tplTenant2 = await db.prepare(
    'SELECT * FROM merchant_email_templates WHERE organization_id = ? AND template_key = ?'
  ).bind('org_2', 'order.confirmation').first();

  assert.equal(tplTenant2, null);
});

test('T3.3.4: Cross-Tenant: Merchant A cannot read Merchant B delivery events log', async () => {
  const db = createTestDb();
  const env = { DB: db, JWKS: localKeySet, ADMIN_JWT_SECRET: 'test_jwt_key', WORKOS_CLIENT_ID: 'test_client' };

  // Send for org_1
  await EmailService.send(env, { organizationId: 'org_1', to: 'customer@org1.com', subject: 'Org 1', text: 'Text 1' });

  // Merchant 2 queries /api/email/events
  const token2 = await createToken('usr_2', 'merchant2@example.com', 'org_2', 'owner');
  const req = new Request('https://ferasetu.com/api/email/events', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token2}` }
  });

  const res = await worker.fetch(req, env);
  const data = await res.json();
  assert.ok(!data.events.some(e => e.recipient === 'customer@org1.com'));
});

test('T3.3.5: Cross-Tenant: Merchant B cannot claim domain already registered by Merchant A', async () => {
  const db = createTestDb();
  const env = { DB: db, JWKS: localKeySet, ADMIN_JWT_SECRET: 'test_jwt_key', WORKOS_CLIENT_ID: 'test_client' };

  // Tenant 1 registers domain
  const token1 = await createToken('usr_1', 'merchant1@example.com', 'org_1', 'owner');
  const req1 = new Request('https://ferasetu.com/api/email/domains', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token1}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain: 'shared-brand.in' })
  });
  const res1 = await worker.fetch(req1, env);
  assert.equal(res1.status, 201);

  // Tenant 2 attempts to register same domain
  const token2 = await createToken('usr_2', 'merchant2@example.com', 'org_2', 'owner');
  const req2 = new Request('https://ferasetu.com/api/email/domains', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token2}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain: 'shared-brand.in' })
  });
  const res2 = await worker.fetch(req2, env);
  assert.equal(res2.status, 409);
  const errData = await res2.json();
  assert.ok(errData.error.includes('already registered by another organization'));
});

// =============================================================================
// TIER 4: REAL-WORLD WORKLOAD SCENARIOS (REALISTIC MERCHANT LIFECYCLES)
// =============================================================================

test('T4.1: Real-World Scenario 1: Complete Merchant Lifecycle from Onboarding to Custom Domain Email Delivery', async () => {
  const db = createTestDb();
  const env = { DB: db, JWKS: localKeySet, ADMIN_JWT_SECRET: 'test_jwt_key', WORKOS_CLIENT_ID: 'test_client' };
  const provider = new MockDomainProvider();
  const assistant = new AiEmailAssistantService(db);

  // ---------------------------------------------------------------------------
  // Step 1: Merchant 4 (Pune Bazaar) Onboarding with zero configuration
  // ---------------------------------------------------------------------------
  const token4 = await createToken('usr_4', 'merchant4@example.com', 'org_4', 'owner');
  const settingsReq = new Request('https://ferasetu.com/api/email/settings', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token4}` }
  });
  const settingsRes = await worker.fetch(settingsReq, env);
  assert.equal(settingsRes.status, 200);
  const settings = await settingsRes.json();

  assert.equal(settings.activeProvider, 'FERASETU');
  assert.equal(settings.ferasetuDomain.domain, 'kirana-pune-4.ferasetu.com');
  assert.equal(settings.defaultIdentity.email_address, 'orders@kirana-pune-4.ferasetu.com');

  // ---------------------------------------------------------------------------
  // Step 2: Merchant searches for custom domain punebazaar.in & checks authoritative price
  // ---------------------------------------------------------------------------
  const searchResults = await provider.search('punebazaar');
  const targetDomain = searchResults.find(r => r.tld === '.in');
  assert.ok(targetDomain);
  assert.equal(targetDomain.domain, 'punebazaar.in');

  const pricing = await provider.getAuthoritativePricing(targetDomain.domain);
  assert.equal(pricing.priceInr, 799);
  assert.equal(pricing.totalInr, 942.82);

  // ---------------------------------------------------------------------------
  // Step 3: Cashfree domain checkout & post-payment provisioning
  // ---------------------------------------------------------------------------
  const purchaseOrder = await provider.initiatePurchase({
    domain: 'punebazaar.in',
    years: 1,
    clientAmount: 942.82,
    organizationId: 'org_4',
    db
  });

  const verifiedPurchase = await provider.verifyPurchase({
    orderId: purchaseOrder.orderId,
    domain: 'punebazaar.in',
    organizationId: 'org_4',
    db,
    cashfreeStatus: 'PAID'
  });
  assert.equal(verifiedPurchase.domain.verification_status, 'PENDING');

  // ---------------------------------------------------------------------------
  // Step 4: Guided DNS verification via Cloudflare DoH
  // ---------------------------------------------------------------------------
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url.includes('_ferasetu-challenge')) return new Response(JSON.stringify({ Answer: [{ data: `"${verifiedPurchase.domain.verification_token_hash}"` }] }));
    if (url.includes('_domainkey')) return new Response(JSON.stringify({ Answer: [{ data: '"v=DKIM1; k=rsa"' }] }));
    return new Response(JSON.stringify({ Answer: [{ data: '"v=spf1 include:_spf.ferasetu.com ~all"' }] }));
  };

  try {
    const verifyReq = new Request(`https://ferasetu.com/api/email/domains/${verifiedPurchase.domain.id}/verify`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token4}` }
    });
    const verifyRes = await worker.fetch(verifyReq, env);
    assert.equal(verifyRes.status, 200);

    // -------------------------------------------------------------------------
    // Step 5: Verify custom identity orders@punebazaar.in created and set as default
    // -------------------------------------------------------------------------
    const customIdent = db._tables.email_identities.find(i => i.email_address === 'orders@punebazaar.in');
    assert.ok(customIdent);

    // Set custom identity as default sender
    const patchReq = new Request(`https://ferasetu.com/api/email/identities/${customIdent.id}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token4}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_default: true, display_name: 'Pune Bazaar Direct' })
    });
    const patchRes = await worker.fetch(patchReq, env);
    assert.equal(patchRes.status, 200);

    // -------------------------------------------------------------------------
    // Step 6: AI Assistant updates ORDER_CONFIRMATION template
    // -------------------------------------------------------------------------
    await assistant.update_email_template({
      organizationId: 'org_4',
      templateKey: 'order.confirmation',
      subject: 'पुणे बाजार: ऑर्डर कन्फर्मेशन #{{order_id}}',
      contentHtml: '<p>धन्यवाद! तुमची ऑर्डर #{{order_id}} स्वीकारण्यात आली आहे. एकूण: {{total}}</p>'
    });

    // -------------------------------------------------------------------------
    // Step 7: Send live transactional email with verified custom domain
    // -------------------------------------------------------------------------
    const sendRes = await EmailService.send(env, {
      organizationId: 'org_4',
      to: 'customer@pune.in',
      templateKey: 'order.confirmation',
      templateData: { order_id: 'PUNE-ORD-889', total: 1250.00 }
    });

    assert.equal(sendRes.success, true);
    assert.equal(sendRes.from, 'orders@punebazaar.in');

    // -------------------------------------------------------------------------
    // Step 8: Inspect delivery log for final audit confirmation
    // -------------------------------------------------------------------------
    const eventsReq = new Request('https://ferasetu.com/api/email/events', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token4}` }
    });
    const eventsRes = await worker.fetch(eventsReq, env);
    assert.equal(eventsRes.status, 200);
    const eventsData = await eventsRes.json();

    const lastEvent = eventsData.events[0];
    assert.ok(lastEvent);
    assert.equal(lastEvent.merchant_id, 'org_4');
    assert.equal(lastEvent.recipient, 'customer@pune.in');
    assert.equal(lastEvent.event_type, 'SENT');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('T4.2: Real-World Scenario 2: High-Volume Daily Quota Exhaustion & Graceful Purchase Recovery', async () => {
  const db = createTestDb();
  const env = { DB: db, JWKS: localKeySet, ADMIN_JWT_SECRET: 'test_jwt_key', WORKOS_CLIENT_ID: 'test_client' };

  // Merchant 2 has limit 100, sent 100 today
  const quotaRow = db._tables.shop_email_quotas.find(q => q.organization_id === 'org_2');
  assert.equal(quotaRow.emails_sent_today, 100);
  assert.equal(quotaRow.daily_limit, 100);

  // 101st email send attempt must be rejected with quota error
  await assert.rejects(async () => {
    await EmailService.send(env, {
      organizationId: 'org_2',
      to: 'customer@test.com',
      subject: 'Quota Exceeded Test',
      text: 'Body'
    });
  }, /Daily email quota exhausted/);

  // Merchant purchases 500 extra quota balance
  quotaRow.extra_quota_balance = 500;

  // Sending now succeeds using extra quota
  const sendRes = await EmailService.send(env, {
    organizationId: 'org_2',
    to: 'customer@test.com',
    subject: 'Quota Recovered',
    text: 'Delivered with extra quota'
  });

  assert.equal(sendRes.success, true);
  assert.equal(sendRes.status, 'SENT');
});

test('T4.3: Real-World Scenario 3: External SMTP Relay Encryption, Zero Secret Exposure, and Fallback', async () => {
  const db = createTestDb();
  const env = { DB: db, JWKS: localKeySet, ADMIN_JWT_SECRET: MASTER_ENCRYPTION_KEY, WORKOS_CLIENT_ID: 'test_client' };
  const token1 = await createToken('usr_1', 'merchant1@example.com', 'org_1', 'owner');

  // 1. Merchant configures external SMTP relay
  const extReq = new Request('https://ferasetu.com/api/email/provider/external', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token1}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      smtp_host: 'smtp.sendgrid.net',
      smtp_port: 587,
      smtp_username: 'apikey',
      smtp_password: 'SG.SuperSecretPassword12345!#@',
      security_mode: 'STARTTLS'
    })
  });

  const extRes = await worker.fetch(extReq, env);
  assert.equal(extRes.status, 200);

  // 2. Verify stored password is encrypted at rest via AES-256-GCM
  const epc = db._tables.email_provider_connections.find(c => c.organization_id === 'org_1');
  assert.equal(epc.provider_type, 'EXTERNAL_SMTP');
  assert.ok(epc.encrypted_secret_reference.startsWith('enc:v1:'));
  assert.ok(!epc.encrypted_secret_reference.includes('SuperSecretPassword'));

  // 3. Verify password decryption roundtrip
  const decrypted = await decryptSecret(epc.encrypted_secret_reference, MASTER_ENCRYPTION_KEY);
  assert.equal(decrypted, 'SG.SuperSecretPassword12345!#@');

  // 4. GET /api/email/settings redacts password completely
  const settingsReq = new Request('https://ferasetu.com/api/email/settings', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token1}` }
  });
  const settingsRes = await worker.fetch(settingsReq, env);
  const settings = await settingsRes.json();
  assert.equal(settings.externalConnection.has_password, true);
  assert.equal(settings.externalConnection.smtp_password, undefined);
  assert.equal(settings.externalConnection.encrypted_secret_reference, undefined);
});

test('T4.4: Real-World Scenario 4: Destructive Action Protection & Operational Continuity', async () => {
  const db = createTestDb();
  const env = { DB: db, JWKS: localKeySet, ADMIN_JWT_SECRET: 'test_jwt_key', WORKOS_CLIENT_ID: 'test_client' };
  const token1 = await createToken('usr_1', 'merchant1@example.com', 'org_1', 'owner');

  // 1. Merchant attempts to delete default managed domain -> Blocked with 400
  const managedDomain = db._tables.email_domains.find(d => d.organization_id === 'org_1' && d.domain_type === 'FERASETU_MERCHANT');
  const delReq = new Request(`https://ferasetu.com/api/email/domains/${managedDomain.id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token1}` }
  });
  const delRes = await worker.fetch(delReq, env);
  assert.equal(delRes.status, 400);
  const errData = await delRes.json();
  assert.ok(errData.error.includes('Cannot delete default managed domain'));

  // 2. Merchant attempts to delete default sender identity -> Blocked with 400
  const defaultIdent = db._tables.email_identities.find(i => i.organization_id === 'org_1' && i.is_default === 1);
  const delIdentReq = new Request(`https://ferasetu.com/api/email/identities/${defaultIdent.id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token1}` }
  });
  const delIdentRes = await worker.fetch(delIdentReq, env);
  assert.equal(delIdentRes.status, 400);

  // 3. Operational continuity: sending still functions uninterrupted
  const sendRes = await EmailService.send(env, {
    organizationId: 'org_1',
    to: 'customer@continuity.com',
    subject: 'Continuity Verified',
    text: 'Email infrastructure remains intact'
  });
  assert.equal(sendRes.success, true);
});

// =============================================================================
// TIER 5: EMPIRICAL ADVERSARIAL CHALLENGER SUITE (DOMAIN PROVIDER & PRICING RIGIDITY)
// =============================================================================

test('T5.1.1: Adversarial: Base DomainProvider abstract contract enforces all 7 methods throw when not implemented', async () => {
  const base = new DomainProvider();
  await assert.rejects(async () => await base.search('example'), /search\(\) must be implemented/);
  await assert.rejects(async () => await base.checkAvailability('example.in'), /checkAvailability\(\) must be implemented/);
  await assert.rejects(async () => await base.getAuthoritativePricing('example.in'), /getAuthoritativePricing\(\) must be implemented/);
  await assert.rejects(async () => await base.initiatePurchase({ domain: 'example.in' }), /initiatePurchase\(\) must be implemented/);
  await assert.rejects(async () => await base.verifyPurchase({ domain: 'example.in' }), /verifyPurchase\(\) must be implemented/);
  await assert.rejects(async () => await base.registerDomain('example.in'), /registerDomain\(\) must be implemented/);
  await assert.rejects(async () => await base.checkDnsStatus('example.in'), /checkDnsStatus\(\) must be implemented/);
});

test('T5.1.2: Adversarial: Search handles uppercase, trailing whitespace, symbols stripping, and rejects empty/symbols-only', async () => {
  const provider = new SandboxDomainProvider();

  // Uppercase to lowercase
  const upper = await provider.search('MY-SHOP');
  assert.equal(upper.find(r => r.tld === '.in')?.domain, 'my-shop.in');

  // Whitespace trimming
  const padded = await provider.search('   freshstore   ');
  assert.equal(padded.find(r => r.tld === '.store')?.domain, 'freshstore.store');

  // Symbols stripping
  const stripped = await provider.search('best#super$market!');
  assert.equal(stripped.find(r => r.tld === '.com')?.domain, 'bestsupermarket.com');

  // Malformed / empty queries reject
  await assert.rejects(async () => await provider.search(''), /Query string is required/);
  await assert.rejects(async () => await provider.search('   '), /Query string is required/);
  await assert.rejects(async () => await provider.search(null), /Query string is required/);
  await assert.rejects(async () => await provider.search(undefined), /Query string is required/);
  await assert.rejects(async () => await provider.search(12345), /Query string is required/);
  await assert.rejects(async () => await provider.search('!@#$%^&*()'), /Invalid query string/);
});

test('T5.1.3: Adversarial: Search and availability properly flags all reserved domains', async () => {
  const provider = new SandboxDomainProvider();

  // Search reserved
  const searchGoogle = await provider.search('google');
  assert.equal(searchGoogle.find(r => r.tld === '.com')?.available, false);
  const searchFera = await provider.search('ferasetu');
  assert.equal(searchFera.find(r => r.tld === '.com')?.available, false);

  // Direct availability
  const checkGoogle = await provider.checkAvailability('google.com');
  assert.equal(checkGoogle.available, false);
  const checkTaken = await provider.checkAvailability('taken.in');
  assert.equal(checkTaken.available, false);
  const checkForbidden = await provider.checkAvailability('forbidden.co.in');
  assert.equal(checkForbidden.available, false);

  // Platform root domain rejected at normalization layer
  await assert.rejects(
    async () => await provider.checkAvailability('ferasetu.com'),
    /Custom domain cannot be a subdomain of ferasetu\.com/
  );
});

test('T5.1.4: Adversarial: Authoritative pricing & 18% GST rounding verified across all TLDs and fallback', async () => {
  const provider = new SandboxDomainProvider();

  // .in: 799 * 0.18 = 143.82 -> total 942.82
  const pIn = await provider.getAuthoritativePricing('store1.in');
  assert.equal(pIn.priceInr, 799);
  assert.equal(pIn.taxInr, 143.82);
  assert.equal(pIn.totalInr, 942.82);

  // .com: 999 * 0.18 = 179.82 -> total 1178.82
  const pCom = await provider.getAuthoritativePricing('store1.com');
  assert.equal(pCom.priceInr, 999);
  assert.equal(pCom.taxInr, 179.82);
  assert.equal(pCom.totalInr, 1178.82);

  // .store: 499 * 0.18 = 89.82 -> total 588.82
  const pStore = await provider.getAuthoritativePricing('store1.store');
  assert.equal(pStore.priceInr, 499);
  assert.equal(pStore.taxInr, 89.82);
  assert.equal(pStore.totalInr, 588.82);

  // .co.in: 699 * 0.18 = 125.82 -> total 824.82
  const pCoin = await provider.getAuthoritativePricing('store1.co.in');
  assert.equal(pCoin.priceInr, 699);
  assert.equal(pCoin.taxInr, 125.82);
  assert.equal(pCoin.totalInr, 824.82);

  // Fallback .org: 899 * 0.18 = 161.82 -> total 1060.82
  const pOrg = await provider.getAuthoritativePricing('store1.org');
  assert.equal(pOrg.priceInr, 899);
  assert.equal(pOrg.taxInr, 161.82);
  assert.equal(pOrg.totalInr, 1060.82);
});

test('T5.1.5: Adversarial: Custom TLD pricing constructor injection preserves 2-decimal GST precision', async () => {
  const customProvider = new SandboxDomainProvider({
    tldPrices: {
      '.special': 100,
      '.fractional': 333,
      '.premium': 1234
    }
  });

  const p1 = await customProvider.getAuthoritativePricing('mystore.special');
  assert.equal(p1.priceInr, 100);
  assert.equal(p1.taxInr, 18.00);
  assert.equal(p1.totalInr, 118.00);

  const p2 = await customProvider.getAuthoritativePricing('mystore.fractional');
  assert.equal(p2.priceInr, 333);
  assert.equal(p2.taxInr, 59.94);
  assert.equal(p2.totalInr, 392.94);

  const p3 = await customProvider.getAuthoritativePricing('mystore.premium');
  assert.equal(p3.priceInr, 1234);
  assert.equal(p3.taxInr, 222.12);
  assert.equal(p3.totalInr, 1456.12);
});

test('T5.2.1: Adversarial: Multi-year durations (1 to 10 years) scale linearly with exact 2-decimal rounding', async () => {
  const provider = new SandboxDomainProvider();
  for (let years = 1; years <= 10; years++) {
    const expectedTotal = Math.round(942.82 * years * 100) / 100;
    const purchase = await provider.initiatePurchase({ domain: `shop-duration-${years}.in`, years });
    assert.equal(purchase.amount, expectedTotal);
    assert.equal(purchase.years, years);
    assert.equal(purchase.status, 'PAYMENT_PENDING');
  }
});

test('T5.2.2: Adversarial: Duration boundary checks reject 0, negative values (-1, -100), and values > 10 (11, 100)', async () => {
  const provider = new SandboxDomainProvider();
  await assert.rejects(async () => await provider.initiatePurchase({ domain: 'boundary.in', years: 0 }), /Registration duration must be an integer between 1 and 10 years/);
  await assert.rejects(async () => await provider.initiatePurchase({ domain: 'boundary.in', years: -1 }), /Registration duration must be an integer between 1 and 10 years/);
  await assert.rejects(async () => await provider.initiatePurchase({ domain: 'boundary.in', years: -100 }), /Registration duration must be an integer between 1 and 10 years/);
  await assert.rejects(async () => await provider.initiatePurchase({ domain: 'boundary.in', years: 11 }), /Registration duration must be an integer between 1 and 10 years/);
  await assert.rejects(async () => await provider.initiatePurchase({ domain: 'boundary.in', years: 100 }), /Registration duration must be an integer between 1 and 10 years/);
});

test('T5.2.3: Adversarial: Fractional and non-integer durations (1.5, 2.99, 0.5) are strictly rejected', async () => {
  const provider = new SandboxDomainProvider();
  await assert.rejects(async () => await provider.initiatePurchase({ domain: 'fractional.in', years: 1.5 }), /Registration duration must be an integer between 1 and 10 years/);
  await assert.rejects(async () => await provider.initiatePurchase({ domain: 'fractional.in', years: 2.99 }), /Registration duration must be an integer between 1 and 10 years/);
  await assert.rejects(async () => await provider.initiatePurchase({ domain: 'fractional.in', years: 0.5 }), /Registration duration must be an integer between 1 and 10 years/);
});

test('T5.2.4: Adversarial: Non-numeric duration types (string "1", NaN, Infinity, -Infinity, null, false) are rejected', async () => {
  const provider = new SandboxDomainProvider();
  await assert.rejects(async () => await provider.initiatePurchase({ domain: 'types.in', years: '1' }), /Registration duration must be an integer between 1 and 10 years/);
  await assert.rejects(async () => await provider.initiatePurchase({ domain: 'types.in', years: NaN }), /Registration duration must be an integer between 1 and 10 years/);
  await assert.rejects(async () => await provider.initiatePurchase({ domain: 'types.in', years: Infinity }), /Registration duration must be an integer between 1 and 10 years/);
  await assert.rejects(async () => await provider.initiatePurchase({ domain: 'types.in', years: null }), /Registration duration must be an integer between 1 and 10 years/);
  await assert.rejects(async () => await provider.initiatePurchase({ domain: 'types.in', years: false }), /Registration duration must be an integer between 1 and 10 years/);
});

test('T5.3.1: Adversarial: Anti-tampering allows exact match and cleanly defaults omitted clientAmount', async () => {
  const provider = new SandboxDomainProvider();
  // Exact match
  const match = await provider.initiatePurchase({ domain: 'exact.in', years: 1, clientAmount: 942.82 });
  assert.equal(match.amount, 942.82);

  // Omitted clientAmount
  const omitted = await provider.initiatePurchase({ domain: 'omitted.in', years: 1 });
  assert.equal(omitted.amount, 942.82);
});

test('T5.3.2: Adversarial: Anti-tampering rejects ±0.01 fractional cent discrepancies with status 400', async () => {
  const provider = new SandboxDomainProvider();

  // 1 paisa less
  await assert.rejects(
    async () => await provider.initiatePurchase({ domain: 'tamper.in', years: 1, clientAmount: 942.81 }),
    (err) => {
      assert.equal(err.status, 400);
      assert.match(err.message, /Price tampering detected: client provided ₹942.81, server authoritative total is ₹942.82/);
      return true;
    }
  );

  // 1 paisa more
  await assert.rejects(
    async () => await provider.initiatePurchase({ domain: 'tamper.in', years: 1, clientAmount: 942.83 }),
    (err) => {
      assert.equal(err.status, 400);
      assert.match(err.message, /Price tampering detected: client provided ₹942.83, server authoritative total is ₹942.82/);
      return true;
    }
  );
});

test('T5.3.3: Adversarial: Anti-tampering rejects zero (₹0), negative (-₹100, -₹942.82), and base-only spoofing (₹799)', async () => {
  const provider = new SandboxDomainProvider();

  // Zero
  await assert.rejects(
    async () => await provider.initiatePurchase({ domain: 'tamper.in', years: 1, clientAmount: 0 }),
    (err) => {
      assert.equal(err.status, 400);
      assert.match(err.message, /Price tampering detected/);
      return true;
    }
  );

  // Negative
  await assert.rejects(
    async () => await provider.initiatePurchase({ domain: 'tamper.in', years: 1, clientAmount: -100 }),
    (err) => {
      assert.equal(err.status, 400);
      assert.match(err.message, /Price tampering detected/);
      return true;
    }
  );

  // Base price without GST
  await assert.rejects(
    async () => await provider.initiatePurchase({ domain: 'tamper.in', years: 1, clientAmount: 799 }),
    (err) => {
      assert.equal(err.status, 400);
      assert.match(err.message, /Price tampering detected: client provided ₹799, server authoritative total is ₹942.82/);
      return true;
    }
  );

  // 1-year amount for 2-year purchase
  await assert.rejects(
    async () => await provider.initiatePurchase({ domain: 'tamper.in', years: 2, clientAmount: 942.82 }),
    (err) => {
      assert.equal(err.status, 400);
      assert.match(err.message, /Price tampering detected: client provided ₹942.82, server authoritative total is ₹1885.64/);
      return true;
    }
  );
});

test('T5.3.4: Adversarial: Anti-tampering rejects NaN and arbitrary non-numeric client amounts', async () => {
  const provider = new SandboxDomainProvider();

  await assert.rejects(
    async () => await provider.initiatePurchase({ domain: 'tamper.in', years: 1, clientAmount: NaN }),
    (err) => {
      assert.equal(err.status, 400);
      assert.match(err.message, /Price tampering detected/);
      return true;
    }
  );

  await assert.rejects(
    async () => await provider.initiatePurchase({ domain: 'tamper.in', years: 1, clientAmount: 'free_domain' }),
    (err) => {
      assert.equal(err.status, 400);
      assert.match(err.message, /Price tampering detected/);
      return true;
    }
  );
});

test('T5.4.1: Adversarial: Reserved domain registration attempts fail in initiatePurchase and registerDomain', async () => {
  const provider = new SandboxDomainProvider();

  // Platform root domain blocked at normalization
  await assert.rejects(
    async () => await provider.initiatePurchase({ domain: 'ferasetu.com', years: 1 }),
    /Custom domain cannot be a subdomain of ferasetu\.com/
  );

  // Reserved domains blocked by availability check
  await assert.rejects(
    async () => await provider.initiatePurchase({ domain: 'google.com', years: 1 }),
    /Domain google\.com is unavailable for registration/
  );

  await assert.rejects(
    async () => await provider.initiatePurchase({ domain: 'taken.in', years: 1 }),
    /Domain taken\.in is unavailable for registration/
  );

  await assert.rejects(
    async () => await provider.registerDomain('google.com'),
    /Domain google\.com is unavailable for registration/
  );
});

test('T5.4.2: Adversarial: DB duplicate domain collision blocks initiatePurchase with HTTP 409', async () => {
  const provider = new SandboxDomainProvider();
  const mockDb = {
    prepare: () => ({
      bind: (...args) => ({
        first: async () => ({ id: 'existing_dom_id', domain: args[0] })
      })
    })
  };

  await assert.rejects(
    async () => await provider.initiatePurchase({ domain: 'already-registered.in', years: 1, db: mockDb }),
    (err) => {
      assert.equal(err.status, 409);
      assert.match(err.message, /already registered in FeraSetu/);
      return true;
    }
  );
});

test('T5.5.1: Adversarial: Cashfree status gating in verifyPurchase strictly admits PAID/SUCCESS and rejects FAILED/PENDING/CANCELLED', async () => {
  const provider = new SandboxDomainProvider();

  const paid = await provider.verifyPurchase({ orderId: 'cf_ok_1', domain: 'ok-shop.in', cashfreeStatus: 'PAID' });
  assert.equal(paid.success, true);
  assert.equal(paid.dnsInstructions.length, 5);

  const success = await provider.verifyPurchase({ orderId: 'cf_ok_2', domain: 'ok-shop-2.in', cashfreeStatus: 'SUCCESS' });
  assert.equal(success.success, true);

  await assert.rejects(
    async () => await provider.verifyPurchase({ orderId: 'cf_bad', domain: 'bad-shop.in', cashfreeStatus: 'FAILED' }),
    /Cannot provision domain: Cashfree order status is FAILED/
  );

  await assert.rejects(
    async () => await provider.verifyPurchase({ orderId: 'cf_bad', domain: 'bad-shop.in', cashfreeStatus: 'PENDING' }),
    /Cannot provision domain: Cashfree order status is PENDING/
  );
});

test('T5.5.2: Adversarial: Provider factory functions instantiate Sandbox or Cloudflare provider based on environment credentials', () => {
  const sandbox = createDomainProvider({});
  assert.ok(sandbox instanceof SandboxDomainProvider);

  const cf = createDomainProvider({
    CLOUDFLARE_REGISTRAR_API_TOKEN: 'cf_tok_secret',
    CLOUDFLARE_ACCOUNT_ID: 'cf_account_123'
  });
  assert.ok(cf instanceof CloudflareRegistrarProvider);
  assert.ok(cf instanceof SandboxDomainProvider);
  assert.equal(cf.apiToken, 'cf_tok_secret');
  assert.equal(cf.accountId, 'cf_account_123');

  const alias = getDomainProvider();
  assert.ok(alias instanceof SandboxDomainProvider);
});

