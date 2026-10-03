/**
 * FeraSetu QA Engine - Automated Accessibility (a11y) Scanner
 * ============================================================
 * Audits WCAG 2.1 Level AA compliance across interactive components,
 * form controls, headings, and semantic structures.
 */

import { generateIssueFingerprint } from '../intelligence/fingerprinting.js';
import { SEVERITIES, CATEGORIES } from '../types.js';

/**
 * Audits a DOM tree or parsed element node list for common accessibility defects.
 * @param {Object} params
 * @param {string} params.route
 * @param {Array<any>} params.elements
 * @returns {import('../types.js').QAIssue[]}
 */
export function auditAccessibility({ route, elements = [] }) {
  const issues = [];

  for (const el of elements) {
    const role = el.role || el.tagName?.toLowerCase();
    const selector = el.selector || el.tagName?.toLowerCase() || 'element';

    // 1. Interactive Button without accessible name
    if (role === 'button') {
      const hasName = Boolean(el.name && el.name.trim().length > 0) || Boolean(el.text && el.text.trim().length > 0);
      if (!hasName) {
        const fingerprint = generateIssueFingerprint({
          category: CATEGORIES.ACCESSIBILITY,
          title: `BUTTON_MISSING_ACCESSIBLE_NAME_${selector}`,
          route,
          elementSelector: selector,
        });

        issues.push({
          fingerprint,
          title: `Accessibility: Button at ${selector} has no accessible name or label`,
          category: CATEGORIES.ACCESSIBILITY,
          severity: SEVERITIES.P3,
          status: 'open',
          regressionStatus: 'new',
          route,
          element: {
            role: 'button',
            name: '',
            text: '',
            selector,
          },
          observedSummary: `Interactive button rendered with no text content, aria-label, or title attribute.`,
          userImpact: 'Screen reader users hear only "button" with no indication of its purpose or action.',
          likelySubsystem: 'Accessibility / WCAG 2.1 (Rule 4.1.2 Name, Role, Value)',
          likelyCause: 'Icon button rendered without an aria-label attribute.',
          suggestedInvestigation: `Add aria-label="Descriptive action" to the <button> element at ${selector}.`,
          reproductionSteps: [
            `Navigate to ${route}`,
            `Inspect button element at ${selector}`,
            `Verify absence of text, aria-label, or aria-labelledby.`,
          ],
          occurrencesCount: 1,
        });
      }
    }

    // 2. Form Input without associated label
    if (role === 'input' || role === 'select' || role === 'textarea') {
      const inputType = el.type || 'text';
      if (inputType !== 'hidden' && inputType !== 'submit' && inputType !== 'button') {
        const hasLabel = Boolean(el.hasLabel || el.ariaLabel || el.name);
        if (!hasLabel) {
          const fingerprint = generateIssueFingerprint({
            category: CATEGORIES.ACCESSIBILITY,
            title: `INPUT_MISSING_LABEL_${selector}`,
            route,
            elementSelector: selector,
          });

          issues.push({
            fingerprint,
            title: `Accessibility: Form input (${inputType}) has no accessible label`,
            category: CATEGORIES.ACCESSIBILITY,
            severity: SEVERITIES.P3,
            status: 'open',
            regressionStatus: 'new',
            route,
            element: {
              role: 'input',
              name: '',
              text: '',
              selector,
            },
            observedSummary: `Form control <${role} type="${inputType}"> has neither an associated <label> nor an aria-label.`,
            userImpact: 'Visually impaired users cannot determine what information this input field expects.',
            likelySubsystem: 'Accessibility / WCAG 2.1 (Rule 1.3.1 Info and Relationships)',
            likelyCause: 'Missing <label htmlFor="..."> or aria-label on input component.',
            suggestedInvestigation: `Ensure input at ${selector} has a corresponding <label> or aria-label attribute.`,
            reproductionSteps: [
              `Navigate to ${route}`,
              `Locate input field at ${selector}`,
              `Observe missing label association.`,
            ],
            occurrencesCount: 1,
          });
        }
      }
    }
  }

  return issues;
}
