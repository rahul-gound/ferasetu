/**
 * FeraSetu QA Engine - Root Cause & Symptom Correlation Engine
 * ==============================================================
 * Connects isolated symptoms (UI click, network 500, console TypeError,
 * and stuck spinner) into ONE unified, actionable bug report.
 */

import { generateIssueFingerprint } from './fingerprinting.js';
import { diagnoseMediaFailure } from './b2Diagnostics.js';
import { SEVERITIES, CATEGORIES } from '../types.js';

/**
 * Correlates a UI interaction with observed network calls and console errors.
 * @param {Object} params
 * @param {string} params.route
 * @param {import('../types.js').QAElementIdentity} params.element
 * @param {string} params.actionType - 'click' | 'submit' | 'navigate'
 * @param {Array<{url: string, method: string, status: number, durationMs: number}>} params.networkEvents
 * @param {Array<{type: string, message: string, stack?: string}>} params.consoleEvents
 * @param {boolean} params.spinnerStuck - Did a loading spinner remain active without terminating?
 * @param {boolean} params.domChanged - Did meaningful DOM changes happen?
 * @param {string} params.correlationId - Unique ID for this action window
 * @returns {import('../types.js').QAIssue | null} Returns correlated issue if a real defect occurred
 */
export function correlateInteractionResult({
  route,
  element,
  actionType = 'click',
  networkEvents = [],
  consoleEvents = [],
  spinnerStuck = false,
  domChanged = false,
  correlationId,
}) {
  const failedRequests = networkEvents.filter((req) => req.status >= 400 || req.status === 0);
  const consoleErrors = consoleEvents.filter((c) => c.type === 'error');

  // Scenario 1: Critical API failure causing stuck spinner or UI hang
  if (failedRequests.length > 0) {
    const primaryFailedApi = failedRequests[0];
    const is5xx = primaryFailedApi.status >= 500;
    const severity = is5xx ? SEVERITIES.P1 : SEVERITIES.P2;

    const title = `${element.name || element.text || 'Action'} Failed: ${primaryFailedApi.method} ${primaryFailedApi.url} returned ${primaryFailedApi.status}`;
    const observedFacts = [
      `User clicked "${element.name || element.text || element.role}"`,
      `Request ${primaryFailedApi.method} ${primaryFailedApi.url} failed with HTTP ${primaryFailedApi.status}`,
    ];

    if (spinnerStuck) {
      observedFacts.push('UI remained stuck in an infinite loading/spinner state with no error toast shown');
    }

    if (consoleErrors.length > 0) {
      observedFacts.push(`Browser recorded console error: "${consoleErrors[0].message}"`);
    }

    const reproductionSteps = [
      `Navigate to ${route}`,
      `Locate ${element.role || 'button'} with name "${element.name || element.text}" (${element.selector})`,
      `Click the ${element.role || 'button'}`,
      `Observe network request: ${primaryFailedApi.method} ${primaryFailedApi.url} returns HTTP ${primaryFailedApi.status}`,
      spinnerStuck ? 'Observe UI: Loading spinner remains visible indefinitely' : 'Observe UI: Action fails to complete',
    ];

    const fingerprint = generateIssueFingerprint({
      category: CATEGORIES.API_FAILURE,
      title: `${primaryFailedApi.method} ${primaryFailedApi.url} ${primaryFailedApi.status}`,
      route,
      apiEndpoint: primaryFailedApi.url,
      httpStatus: primaryFailedApi.status,
      elementSelector: element.selector,
      componentName: element.componentName,
    });

    return {
      fingerprint,
      title,
      category: CATEGORIES.API_FAILURE,
      severity,
      status: 'open',
      regressionStatus: 'new',
      route,
      element,
      apiEndpoint: primaryFailedApi.url,
      httpStatus: primaryFailedApi.status,
      observedSummary: observedFacts.join('; '),
      userImpact: `Users are unable to complete the "${element.name || element.text || 'requested'}" action due to a server error.`,
      likelySubsystem: is5xx ? 'Worker Edge API / D1 Database' : 'API Request Validation',
      likelyCause: is5xx
        ? 'Uncaught exception in Cloudflare Worker route handler or D1 SQL execution error.'
        : 'Invalid payload structure or missing required authentication headers.',
      suggestedInvestigation: `Check Worker route handler for ${new URL(primaryFailedApi.url).pathname} and verify D1 bindings.`,
      reproductionSteps,
      evidence: {
        networkEntries: failedRequests,
        consoleEntries: consoleErrors,
        correlationId,
        elementCoordinates: element.boundingBox,
      },
      occurrencesCount: 1,
    };
  }

  // Scenario 2: Action caused unhandled JavaScript console error
  if (consoleErrors.length > 0) {
    const err = consoleErrors[0];
    const fingerprint = generateIssueFingerprint({
      category: CATEGORIES.CONSOLE_ERROR,
      title: err.message,
      route,
      elementSelector: element.selector,
      componentName: element.componentName,
    });

    return {
      fingerprint,
      title: `Uncaught Exception on Click: ${element.name || element.text || 'Button'}`,
      category: CATEGORIES.CONSOLE_ERROR,
      severity: SEVERITIES.P2,
      status: 'open',
      regressionStatus: 'new',
      route,
      element,
      observedSummary: `Clicking "${element.name || element.text}" triggered JavaScript exception: "${err.message}"`,
      userImpact: 'UI execution halted unexpectedly due to a client-side error.',
      likelySubsystem: 'Frontend React Component',
      likelyCause: 'Undefined property access or unhandled Promise rejection in click handler.',
      suggestedInvestigation: 'Inspect call stack in console error and add defensive checks.',
      reproductionSteps: [
        `Navigate to ${route}`,
        `Click "${element.name || element.text}"`,
        `Inspect console: Uncaught error "${err.message}"`,
      ],
      evidence: {
        consoleEntries: consoleErrors,
        networkEntries: networkEvents,
        correlationId,
      },
      occurrencesCount: 1,
    };
  }

  // Scenario 3: Potential Dead Button (no navigation, no modal, no DOM change, no network)
  if (!domChanged && networkEvents.length === 0 && !spinnerStuck) {
    // Note: Do not falsely mark tabs, toggles, or accordions as broken if they have valid states
    return null;
  }

  return null;
}

/**
 * Correlates broken media and B2/CDN status into one diagnostic issue.
 * @param {Object} params
 * @param {string} params.url
 * @param {number} params.status
 * @param {string} params.route
 * @param {string} [params.componentName]
 * @param {number} [params.naturalWidth]
 * @param {number} [params.naturalHeight]
 * @param {string} [params.selector]
 * @returns {import('../types.js').QAIssue}
 */
export function correlateMediaIssue({
  url,
  status = 0,
  route,
  componentName = 'ProductCard',
  naturalWidth = 0,
  naturalHeight = 0,
  selector = 'img',
}) {
  const diagnosis = diagnoseMediaFailure({
    url,
    status,
    componentName,
    naturalWidth,
    naturalHeight,
  });

  const isForbidden = status === 403;
  const severity = isForbidden ? SEVERITIES.P1 : (status === 404 ? SEVERITIES.P2 : SEVERITIES.P3);
  const title = `Media Failure: ${componentName} image returned HTTP ${status || 'Render Error'}`;

  const fingerprint = generateIssueFingerprint({
    category: CATEGORIES.IMAGE_FAILURE,
    title: `${url}_${status}`,
    route,
    componentName,
    elementSelector: selector,
  });

  return {
    fingerprint,
    title,
    category: CATEGORIES.IMAGE_FAILURE,
    severity,
    status: 'open',
    regressionStatus: 'new',
    route,
    element: {
      role: 'img',
      name: 'Product Media',
      text: '',
      selector,
      componentName,
    },
    observedSummary: `Image asset ${url} failed to load with HTTP status ${status} (naturalWidth: ${naturalWidth})`,
    userImpact: 'Customers or merchants cannot view product imagery, degrading store conversion.',
    likelySubsystem: diagnosis.likelySubsystem,
    likelyCause: diagnosis.likelyCause,
    suggestedInvestigation: diagnosis.suggestedInvestigation,
    reproductionSteps: [
      `Navigate to ${route}`,
      `Locate image rendered by component ${componentName} at selector "${selector}"`,
      `Inspect network request for ${url}`,
      `Observe response: HTTP ${status} from subsystem [${diagnosis.likelySubsystem}]`,
    ],
    evidence: {
      likelySubsystem: diagnosis.likelySubsystem,
      diagnosticTrace: diagnosis.diagnosticTrace,
      elementCoordinates: null,
    },
    occurrencesCount: 1,
  };
}
