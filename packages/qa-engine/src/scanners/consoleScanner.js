/**
 * FeraSetu QA Engine - Console Error & JavaScript Exception Observer
 * ==================================================================
 * Captures, normalizes, deduplicates, and correlates console errors,
 * unhandled promise rejections, and uncaught exceptions.
 */

import { generateIssueFingerprint, normalizeMessage } from '../intelligence/fingerprinting.js';
import { redactSecrets } from '../intelligence/safetyGuardrails.js';
import { SEVERITIES, CATEGORIES } from '../types.js';

export class ConsoleObserver {
  constructor() {
    /** @type {Array<any>} */
    this.entries = [];
  }

  /**
   * Records a console or window error event.
   * @param {Object} entry
   * @param {'error' | 'warn' | 'exception'} entry.type
   * @param {string} entry.message
   * @param {string} [entry.stack]
   * @param {string} [entry.route]
   */
  record(entry) {
    const cleanEntry = {
      type: entry.type || 'error',
      message: redactSecrets(entry.message || 'Unknown Console Event'),
      stack: redactSecrets(entry.stack || ''),
      route: entry.route || '/',
      timestamp: new Date().toISOString(),
    };

    this.entries.push(cleanEntry);
    return cleanEntry;
  }

  /**
   * Groups and creates issues for observed errors.
   * @param {string} route
   * @returns {import('../types.js').QAIssue[]}
   */
  analyzeErrors(route) {
    const issues = [];
    const errorMap = new Map();

    const routeErrors = this.entries.filter(
      (e) => e.route === route && (e.type === 'error' || e.type === 'exception')
    );

    for (const err of routeErrors) {
      // Ignore known benign third-party or browser extensions noise if any
      if (err.message.includes('chrome-extension') || err.message.includes('statsig')) {
        continue;
      }

      const normalized = normalizeMessage(err.message);
      if (errorMap.has(normalized)) {
        const item = errorMap.get(normalized);
        item.occurrencesCount++;
        continue;
      }

      const fingerprint = generateIssueFingerprint({
        category: CATEGORIES.CONSOLE_ERROR,
        title: normalized,
        route,
      });

      const issue = {
        fingerprint,
        title: `Console Error on ${route}: ${err.message.slice(0, 100)}`,
        category: CATEGORIES.CONSOLE_ERROR,
        severity: err.type === 'exception' ? SEVERITIES.P1 : SEVERITIES.P2,
        status: 'open',
        regressionStatus: 'new',
        route,
        observedSummary: `Browser recorded uncaught console ${err.type}: "${err.message}"`,
        userImpact: 'JavaScript error may break UI state or prevent users from interacting with features on this page.',
        likelySubsystem: 'Frontend React Runtime',
        likelyCause: 'Unhandled null reference, missing prop, or failed promise rejection.',
        suggestedInvestigation: 'Review call stack below to identify component and line number.',
        reproductionSteps: [
          `Navigate to ${route}`,
          `Observe console output`,
          `Error logged: "${err.message}"`,
        ],
        evidence: {
          consoleEntries: [err],
        },
        occurrencesCount: 1,
      };

      errorMap.set(normalized, issue);
      issues.push(issue);
    }

    return issues;
  }
}
