/**
 * FeraSetu QA Engine - Multi-Tenant & Security Isolation Scanner
 * ===============================================================
 * Performs safe, non-destructive isolation audits verifying that tenant
 * boundaries are strictly enforced and no secrets or cross-tenant data leak.
 */

import { generateIssueFingerprint } from '../intelligence/fingerprinting.js';
import { SEVERITIES, CATEGORIES } from '../types.js';

/**
 * Validates that data received in Tenant A's context does not contain
 * entities owned by Tenant B.
 * @param {Object} params
 * @param {string} params.tenantAId - The active test tenant ID
 * @param {string} params.tenantBId - Another known tenant ID
 * @param {Array<any>} params.returnedItems - Array of entity objects returned by an API
 * @param {string} params.route - Route or API endpoint tested
 * @returns {import('../types.js').QAIssue | null}
 */
export function auditTenantIsolation({
  tenantAId,
  tenantBId,
  returnedItems = [],
  route,
}) {
  if (!Array.isArray(returnedItems) || returnedItems.length === 0) {
    return null;
  }

  for (const item of returnedItems) {
    const itemTenant = item.shop_id || item.organization_id || item.tenant_id;
    if (itemTenant && itemTenant === tenantBId && itemTenant !== tenantAId) {
      const fingerprint = generateIssueFingerprint({
        category: CATEGORIES.SECURITY,
        title: `TENANT_ISOLATION_LEAK_${route}`,
        route,
        apiEndpoint: route,
      });

      return {
        fingerprint,
        title: `CRITICAL SECURITY: Cross-Tenant Data Leakage Detected on ${route}`,
        category: CATEGORIES.SECURITY,
        severity: SEVERITIES.P0,
        status: 'open',
        regressionStatus: 'new',
        route,
        observedSummary: `Request under tenant '${tenantAId}' returned record [id: ${item.id}] belonging to tenant '${tenantBId}'.`,
        userImpact: 'Severe security breach: merchants could view other merchants\' confidential store data.',
        likelySubsystem: 'Worker Multi-Tenancy Middleware / D1 Query Filtering',
        likelyCause: 'SQL query missing "WHERE organization_id = ?" or "WHERE shop_id = ?" clause in Worker route handler.',
        suggestedInvestigation: 'Audit the D1 SELECT query in Worker handler and ensure tenant filtering parameter is strictly bound.',
        reproductionSteps: [
          `Authenticate as tenant ${tenantAId}`,
          `Execute GET ${route}`,
          `Inspect response items: Record ${item.id} has owner ${tenantBId}`,
        ],
        evidence: {
          leakedEntityId: item.id,
          expectedTenant: tenantAId,
          observedTenant: tenantBId,
        },
        occurrencesCount: 1,
      };
    }
  }

  return null;
}

/**
 * Audits HTML source for leaked secrets or private environment variables.
 * @param {Object} params
 * @param {string} params.route
 * @param {string} params.htmlContent
 * @returns {import('../types.js').QAIssue[]}
 */
export function auditPublicSourceLeakage({ route, htmlContent = '' }) {
  const issues = [];
  const dangerousPatterns = [
    { pattern: /B2_APPLICATION_KEY(?:_ID)?\s*[:=]\s*["'][a-zA-Z0-9_\-\.]+["']/i, name: 'B2 Storage Key' },
    { pattern: /WORKOS_API_KEY\s*[:=]\s*["']sk_[a-zA-Z0-9_\-\.]+["']/i, name: 'WorkOS Secret API Key' },
    { pattern: /JWT_SECRET\s*[:=]\s*["'][a-zA-Z0-9_\-\.]+["']/i, name: 'Platform JWT Secret' },
    { pattern: /ADMIN_PASSWORD_HASH\s*[:=]\s*["'][a-zA-Z0-9_\-\.\$\/]+["']/i, name: 'Admin Password Hash' },
  ];

  for (const { pattern, name } of dangerousPatterns) {
    if (pattern.test(htmlContent)) {
      const fingerprint = generateIssueFingerprint({
        category: CATEGORIES.SECURITY,
        title: `SECRET_LEAK_${name}`,
        route,
      });

      issues.push({
        fingerprint,
        title: `CRITICAL SECURITY: ${name} exposed in public frontend bundle`,
        category: CATEGORIES.SECURITY,
        severity: SEVERITIES.P0,
        status: 'open',
        regressionStatus: 'new',
        route,
        observedSummary: `Frontend HTML/bundle at ${route} contains exposed server secret: ${name}.`,
        userImpact: 'Attackers could extract credentials and compromise the platform infrastructure.',
        likelySubsystem: 'Vite Build / Frontend Environment Bundling',
        likelyCause: 'Server secret prefixed with VITE_ or imported directly in client code.',
        suggestedInvestigation: `Remove ${name} from frontend source and ensure it is only accessible within Cloudflare Worker secrets.`,
        reproductionSteps: [
          `Navigate to ${route}`,
          `Inspect page source or network bundle`,
          `Observe presence of ${name}`,
        ],
        occurrencesCount: 1,
      });
    }
  }

  return issues;
}
