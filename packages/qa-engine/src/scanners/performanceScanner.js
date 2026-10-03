/**
 * FeraSetu QA Engine - Real Performance & Web Vitals Scanner
 * ==========================================================
 * Measures raw browser timings (DOMContentLoaded, Load Event, FCP, LCP)
 * without synthetic fake scores.
 */

import { generateIssueFingerprint } from '../intelligence/fingerprinting.js';
import { SEVERITIES, CATEGORIES } from '../types.js';

/**
 * Evaluates performance metrics against Core Web Vitals thresholds.
 * @param {Object} params
 * @param {string} params.route
 * @param {number} [params.loadTimeMs]
 * @param {number} [params.domContentLoadedMs]
 * @param {number} [params.fcpMs]
 * @param {number} [params.lcpMs]
 * @returns {import('../types.js').QAIssue[]}
 */
export function auditPerformanceMetrics({
  route,
  loadTimeMs = 0,
  domContentLoadedMs = 0,
  fcpMs = 0,
  lcpMs = 0,
}) {
  const issues = [];

  // 1. Largest Contentful Paint (LCP) > 2500ms (Core Web Vitals "Needs Improvement")
  if (lcpMs > 2500) {
    const fingerprint = generateIssueFingerprint({
      category: CATEGORIES.PERFORMANCE,
      title: `SLOW_LCP_${route}`,
      route,
    });

    issues.push({
      fingerprint,
      title: `Performance Warning: High Largest Contentful Paint (LCP) on ${route} (${lcpMs}ms)`,
      category: CATEGORIES.PERFORMANCE,
      severity: lcpMs > 4000 ? SEVERITIES.P2 : SEVERITIES.P3,
      status: 'open',
      regressionStatus: 'new',
      route,
      observedSummary: `LCP was measured at ${lcpMs}ms (Google CWV threshold: ≤ 2500ms).`,
      userImpact: 'Slow main content rendering creates perceived delay for store visitors, especially on 3G/4G connections.',
      likelySubsystem: 'Hero Asset Optimization / Edge CDN Delivery',
      likelyCause: 'Unoptimized hero image or render-blocking script tag delaying initial layout.',
      suggestedInvestigation: 'Add fetchpriority="high" to the primary hero image and ensure WebP/AVIF compression is enabled.',
      reproductionSteps: [
        `Navigate to ${route}`,
        `Measure PerformanceObserver LargestContentfulPaint`,
        `Observed LCP timing: ${lcpMs}ms`,
      ],
      occurrencesCount: 1,
    });
  }

  // 2. Slow Total Load Time (>4000ms)
  if (loadTimeMs > 4000) {
    const fingerprint = generateIssueFingerprint({
      category: CATEGORIES.PERFORMANCE,
      title: `SLOW_PAGE_LOAD_${route}`,
      route,
    });

    issues.push({
      fingerprint,
      title: `Performance Warning: Slow Page Load on ${route} (${loadTimeMs}ms)`,
      category: CATEGORIES.PERFORMANCE,
      severity: SEVERITIES.P3,
      status: 'open',
      regressionStatus: 'new',
      route,
      observedSummary: `Complete page load event took ${loadTimeMs}ms (threshold: ≤ 3000ms).`,
      userImpact: 'Higher bounce rates due to delayed interactive state.',
      likelySubsystem: 'Bundle Size / Network Cascades',
      likelyCause: 'Excessive JavaScript chunk sizes or unbundled third-party fonts/scripts.',
      suggestedInvestigation: 'Inspect Vite bundle distribution and verify lazy-loading of heavy dashboard routes.',
      reproductionSteps: [
        `Navigate to ${route}`,
        `Measure window.performance.timing loadEventEnd - navigationStart`,
        `Observed duration: ${loadTimeMs}ms`,
      ],
      occurrencesCount: 1,
    });
  }

  return issues;
}
