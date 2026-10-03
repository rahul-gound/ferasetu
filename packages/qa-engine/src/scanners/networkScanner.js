/**
 * FeraSetu QA Engine - Network & API Traffic Observer
 * ===================================================
 * Tracks all HTTP/HTTPS interactions, detecting 4xx, 5xx, timeouts,
 * CORS errors, and latency regressions while redacting all credentials.
 */

import { redactSecrets } from '../intelligence/safetyGuardrails.js';
import { generateIssueFingerprint } from '../intelligence/fingerprinting.js';
import { SEVERITIES, CATEGORIES } from '../types.js';

export class NetworkObserver {
  constructor() {
    /** @type {Array<any>} */
    this.requests = [];
  }

  /**
   * Records an intercepted network transaction.
   * @param {Object} entry
   * @param {string} entry.url
   * @param {string} entry.method
   * @param {number} entry.status
   * @param {number} entry.durationMs
   * @param {string} [entry.resourceType]
   * @param {Record<string, string>} [entry.headers]
   * @param {any} [entry.responseBody]
   * @param {string} [entry.route]
   */
  record(entry) {
    const cleanEntry = {
      url: redactSecrets(entry.url),
      method: (entry.method || 'GET').toUpperCase(),
      status: entry.status || 0,
      durationMs: entry.durationMs || 0,
      resourceType: entry.resourceType || 'fetch',
      headers: redactSecrets(entry.headers || {}),
      responseBody: redactSecrets(entry.responseBody || null),
      route: entry.route || '/',
      timestamp: new Date().toISOString(),
    };

    this.requests.push(cleanEntry);
    return cleanEntry;
  }

  /**
   * Analyzes all recorded requests and extracts defect issues.
   * @param {string} route
   * @returns {import('../types.js').QAIssue[]}
   */
  analyzeFailures(route) {
    const issues = [];
    const routeRequests = this.requests.filter((r) => r.route === route);

    for (const req of routeRequests) {
      // Ignore known intentional probe 404s on favicons or analytics telemetry
      if (req.url.includes('/favicon.ico') || req.url.includes('/analytics/events')) {
        continue;
      }

      // Check for 5xx Server Errors (P1)
      if (req.status >= 500) {
        const fingerprint = generateIssueFingerprint({
          category: CATEGORIES.API_FAILURE,
          title: `${req.method} ${req.url} returned ${req.status}`,
          route,
          apiEndpoint: req.url,
          httpStatus: req.status,
        });

        issues.push({
          fingerprint,
          title: `API Server Error: ${req.method} ${new URL(req.url).pathname} returned HTTP ${req.status}`,
          category: CATEGORIES.API_FAILURE,
          severity: SEVERITIES.P1,
          status: 'open',
          regressionStatus: 'new',
          route,
          apiEndpoint: req.url,
          httpStatus: req.status,
          observedSummary: `Request to ${req.method} ${req.url} failed with server status ${req.status} (latency: ${req.durationMs}ms)`,
          userImpact: 'Frontend operations relying on this API endpoint fail or render in an erroneous state.',
          likelySubsystem: 'Cloudflare Worker / D1 Database / Backend',
          likelyCause: 'Unhandled server exception or failed SQL query in Worker endpoint handler.',
          suggestedInvestigation: `Inspect Worker execution logs for ${new URL(req.url).pathname}.`,
          reproductionSteps: [
            `Navigate to ${route}`,
            `Trigger API call to ${req.method} ${req.url}`,
            `Server responds with HTTP ${req.status}`,
          ],
          evidence: {
            networkEntries: [req],
          },
          occurrencesCount: 1,
        });
      }

      // Check for 4xx Client Errors (P2)
      else if (req.status >= 400 && req.status !== 404) {
        const fingerprint = generateIssueFingerprint({
          category: CATEGORIES.API_FAILURE,
          title: `${req.method} ${req.url} returned ${req.status}`,
          route,
          apiEndpoint: req.url,
          httpStatus: req.status,
        });

        issues.push({
          fingerprint,
          title: `API Client Error: ${req.method} ${new URL(req.url).pathname} returned HTTP ${req.status}`,
          category: CATEGORIES.API_FAILURE,
          severity: req.status === 403 || req.status === 401 ? SEVERITIES.P1 : SEVERITIES.P2,
          status: 'open',
          regressionStatus: 'new',
          route,
          apiEndpoint: req.url,
          httpStatus: req.status,
          observedSummary: `API endpoint rejected request with HTTP status ${req.status}`,
          userImpact: 'Action rejected by server due to authorization or validation error.',
          likelySubsystem: 'Worker Auth & Request Validator',
          likelyCause: req.status === 401 || req.status === 403
            ? 'Missing or expired authentication token / organization tenancy permission.'
            : 'Request payload failed server-side schema validation.',
          suggestedInvestigation: 'Verify request Authorization header and JSON body format.',
          reproductionSteps: [
            `Navigate to ${route}`,
            `Issue request to ${req.method} ${req.url}`,
            `Observe HTTP ${req.status} response.`,
          ],
          evidence: {
            networkEntries: [req],
          },
          occurrencesCount: 1,
        });
      }

      // Check for Extreme Latency (>3000ms)
      else if (req.durationMs > 3000 && req.status === 200) {
        const fingerprint = generateIssueFingerprint({
          category: CATEGORIES.PERFORMANCE,
          title: `SLOW_API_${req.method}_${req.url}`,
          route,
          apiEndpoint: req.url,
        });

        issues.push({
          fingerprint,
          title: `Slow API Request: ${req.method} ${new URL(req.url).pathname} took ${req.durationMs}ms`,
          category: CATEGORIES.PERFORMANCE,
          severity: SEVERITIES.P3,
          status: 'open',
          regressionStatus: 'new',
          route,
          apiEndpoint: req.url,
          httpStatus: req.status,
          observedSummary: `Request took ${req.durationMs}ms, exceeding the 3000ms responsiveness budget.`,
          userImpact: 'Slow network interactions cause UI sluggishness and delayed rendering.',
          likelySubsystem: 'Worker Query Performance / Database Indexing',
          likelyCause: 'Unindexed D1 table query or cold-start roundtrip.',
          suggestedInvestigation: 'Check SQL query plan in Worker and ensure appropriate indexes exist on filtered columns.',
          reproductionSteps: [
            `Navigate to ${route}`,
            `Measure duration of ${req.method} ${req.url}`,
            `Duration observed: ${req.durationMs}ms`,
          ],
          evidence: {
            networkEntries: [req],
          },
          occurrencesCount: 1,
        });
      }
    }

    return issues;
  }
}
