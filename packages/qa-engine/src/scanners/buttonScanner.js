/**
 * FeraSetu QA Engine - Intelligent Button & Interactive Element Scanner
 * ======================================================================
 * Tests every discoverable interactive button with a pre/post observation
 * engine, distinguishing valid UI-state changes from dead or broken interactions.
 */

import { correlateInteractionResult } from '../intelligence/correlationEngine.js';
import { generateIssueFingerprint } from '../intelligence/fingerprinting.js';
import { SEVERITIES, CATEGORIES } from '../types.js';

/**
 * Extracts a stable, resilient locator for an interactive element following
 * strict seniority priority:
 * 1. data-testid
 * 2. Accessible role + accessible name
 * 3. Stable semantic attributes (name, aria-label, type)
 * 4. Unique CSS selector
 * 5. Fallback DOM selector
 *
 * @param {HTMLElement | any} el
 * @returns {import('../types.js').QAElementIdentity}
 */
export function extractElementIdentity(el) {
  const role = el.getAttribute?.('role') || el.tagName?.toLowerCase() || 'button';
  const testId = el.getAttribute?.('data-testid') || el.getAttribute?.('data-qa') || null;
  const name = (
    el.getAttribute?.('aria-label') ||
    el.getAttribute?.('title') ||
    el.innerText ||
    el.textContent ||
    ''
  ).trim();

  let stableSelector = '';
  if (testId) {
    stableSelector = `[data-testid="${testId}"]`;
  } else if (name && role) {
    stableSelector = `${role}[aria-label="${name}"], ${role}:has-text("${name}")`;
  } else if (el.id) {
    stableSelector = `#${el.id}`;
  } else if (el.className) {
    const primaryClass = String(el.className).split(' ')[0];
    stableSelector = primaryClass ? `${el.tagName?.toLowerCase()}.${primaryClass}` : `${el.tagName?.toLowerCase()}`;
  } else {
    stableSelector = el.tagName?.toLowerCase() || 'button';
  }

  return {
    role,
    name: name.slice(0, 100),
    text: (el.innerText || el.textContent || '').trim().slice(0, 100),
    selector: stableSelector,
    stableSelector,
    testId,
    componentName: el.getAttribute?.('data-component') || 'UnknownComponent',
    boundingBox: el.getBoundingClientRect ? el.getBoundingClientRect() : { x: 0, y: 0, width: 0, height: 0 },
  };
}

/**
 * Observes the outcome of a button click and detects exact failure mechanisms.
 * @param {Object} params
 * @param {string} params.route - Route where interaction occurred
 * @param {import('../types.js').QAElementIdentity} params.element - Element identity
 * @param {import('../types.js').QAObservedState} params.before - State before interaction
 * @param {import('../types.js').QAObservedState} params.after - State after interaction
 * @param {Array<{url: string, method: string, status: number, durationMs: number}>} params.networkRequests - Intercepted requests
 * @param {Array<{type: string, message: string}>} params.consoleLogs - Intercepted console events
 * @param {boolean} [params.intercepted] - Was the click intercepted by an overlay?
 * @param {string} params.correlationId - Correlation ID
 * @returns {import('../types.js').QAIssue | null} Returns defect issue if failure detected
 */
export function analyzeButtonInteraction({
  route,
  element,
  before,
  after,
  networkRequests = [],
  consoleLogs = [],
  intercepted = false,
  correlationId,
}) {
  // Check 1: Click intercepted by an invisible or modal overlay
  if (intercepted) {
    const fingerprint = generateIssueFingerprint({
      category: CATEGORIES.BUTTON_FAILURE,
      title: `CLICK_INTERCEPTED_${element.selector}`,
      route,
      elementSelector: element.selector,
    });

    return {
      fingerprint,
      title: `Click Intercepted: Button "${element.name || element.text}" blocked by overlay`,
      category: CATEGORIES.BUTTON_FAILURE,
      severity: SEVERITIES.P1,
      status: 'open',
      regressionStatus: 'new',
      route,
      element,
      observedSummary: `Pointer click on "${element.name || element.text}" (${element.selector}) was intercepted by another DOM element or overlay.`,
      userImpact: 'Users cannot click this button because an element or modal backdrop covers it.',
      likelySubsystem: 'UI Layout / CSS Z-Index',
      likelyCause: 'An invisible backdrop, fixed header, or high z-index overlay is covering the button hit area.',
      suggestedInvestigation: 'Inspect DOM tree at element coordinates and check z-index stacking context.',
      reproductionSteps: [
        `Navigate to ${route}`,
        `Attempt to click "${element.name || element.text}" at ${element.selector}`,
        `Click event is intercepted by an overlapping element.`,
      ],
      evidence: {
        correlationId,
        elementCoordinates: element.boundingBox,
      },
      occurrencesCount: 1,
    };
  }

  // Check 2: API Failure triggered by click (e.g. POST /api/products returns 500)
  const apiIssue = correlateInteractionResult({
    route,
    element,
    actionType: 'click',
    networkEvents: networkRequests,
    consoleEvents: consoleLogs,
    spinnerStuck: after.isLoading,
    domChanged: before.domHash !== after.domHash,
    correlationId,
  });

  if (apiIssue) {
    return apiIssue;
  }

  // Check 3: Infinite loading spinner state
  if (after.isLoading && !before.isLoading) {
    const fingerprint = generateIssueFingerprint({
      category: CATEGORIES.INFINITE_LOADING,
      title: `INFINITE_SPINNER_${element.selector}`,
      route,
      elementSelector: element.selector,
    });

    return {
      fingerprint,
      title: `Infinite Loading State: Button "${element.name || element.text}" spinner never resolved`,
      category: CATEGORIES.INFINITE_LOADING,
      severity: SEVERITIES.P1,
      status: 'open',
      regressionStatus: 'new',
      route,
      element,
      observedSummary: `Clicking "${element.name || element.text}" placed the button or view into a loading spinner that did not resolve within timeout.`,
      userImpact: 'User is left waiting on an infinite spinner with no visual feedback or error recovery option.',
      likelySubsystem: 'Frontend Async State Management',
      likelyCause: 'An asynchronous promise did not catch an error, or the finally() block failed to reset isLoading to false.',
      suggestedInvestigation: 'Check async handler in component and ensure finally { setIsLoading(false); } is called.',
      reproductionSteps: [
        `Navigate to ${route}`,
        `Click "${element.name || element.text}"`,
        `Observe spinner activates but never terminates.`,
      ],
      evidence: {
        correlationId,
        elementCoordinates: element.boundingBox,
        networkEntries: networkRequests,
      },
      occurrencesCount: 1,
    };
  }

  // Check 4: Potential Dead Button (No observable state change)
  const urlChanged = before.url !== after.url;
  const dialogOpened = after.dialogCount > before.dialogCount;
  const domChanged = before.domHash !== after.domHash;
  const toastAppeared = Boolean(after.toastText && after.toastText !== before.toastText);
  const hadNetwork = networkRequests.length > 0;

  const hadMeaningfulOutcome = urlChanged || dialogOpened || domChanged || toastAppeared || hadNetwork;

  if (!hadMeaningfulOutcome) {
    // Only flag if element looks like a primary action rather than a purely decorative span
    const isInteractiveRole = element.role === 'button' || element.role === 'a' || element.selector.includes('button');
    if (isInteractiveRole && element.name) {
      const fingerprint = generateIssueFingerprint({
        category: CATEGORIES.BUTTON_FAILURE,
        title: `POTENTIAL_DEAD_INTERACTION_${element.selector}`,
        route,
        elementSelector: element.selector,
      });

      return {
        fingerprint,
        title: `Potential Dead Interaction: "${element.name || element.text}" did not produce observable change`,
        category: CATEGORIES.BUTTON_FAILURE,
        severity: SEVERITIES.P3, // Gentle severity: not P0
        status: 'open',
        regressionStatus: 'new',
        route,
        element,
        observedSummary: `Clicking "${element.name || element.text}" produced no URL navigation, dialog, toast, DOM mutation, or network activity.`,
        userImpact: 'User clicking this element may perceive the application as unresponsive.',
        likelySubsystem: 'UI Event Binding',
        likelyCause: 'Button onClick handler is either unassigned, missing state dispatch, or no-op.',
        suggestedInvestigation: 'Check if this button is intended to open a dropdown or if the handler is yet to be wired.',
        reproductionSteps: [
          `Navigate to ${route}`,
          `Click "${element.name || element.text}" (${element.selector})`,
          `No URL change, modal, toast, or network request occurs.`,
        ],
        evidence: {
          correlationId,
          elementCoordinates: element.boundingBox,
        },
        occurrencesCount: 1,
      };
    }
  }

  return null;
}
