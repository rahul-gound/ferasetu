/**
 * FeraSetu QA Engine - Comprehensive Image & Media Scanner
 * ========================================================
 * Inspects all <img>, <picture>, <source>, SVG icons, avatars, and
 * product images with full Backblaze B2 & CDN Gateway intelligence.
 */

import { correlateMediaIssue } from '../intelligence/correlationEngine.js';
import { generateIssueFingerprint } from '../intelligence/fingerprinting.js';
import { SEVERITIES, CATEGORIES } from '../types.js';

/**
 * Inspects an image element record and evaluates its health.
 * @param {Object} params
 * @param {string} params.route - Route where image is located
 * @param {string} params.src - Image source URL
 * @param {string} [params.currentSrc] - Active source from srcset/picture
 * @param {number} params.naturalWidth - Rendered width
 * @param {number} params.naturalHeight - Rendered height
 * @param {number} [params.httpStatus] - Observed HTTP response status
 * @param {string} [params.alt] - Accessible alt text
 * @param {string} [params.selector] - DOM CSS selector
 * @param {string} [params.componentName] - Enclosing component name (e.g. ProductCard)
 * @returns {import('../types.js').QAIssue[]} Discovered defects
 */
export function auditImageElement({
  route,
  src,
  currentSrc,
  naturalWidth = 0,
  naturalHeight = 0,
  httpStatus = 200,
  alt = '',
  selector = 'img',
  componentName = 'MediaElement',
}) {
  const issues = [];
  const activeUrl = currentSrc || src;

  // 1. Missing or empty src attribute
  if (!activeUrl || activeUrl.trim() === '') {
    const fingerprint = generateIssueFingerprint({
      category: CATEGORIES.IMAGE_FAILURE,
      title: 'EMPTY_IMAGE_SRC',
      route,
      elementSelector: selector,
      componentName,
    });

    issues.push({
      fingerprint,
      title: `Broken Image: Empty src attribute on ${componentName}`,
      category: CATEGORIES.IMAGE_FAILURE,
      severity: SEVERITIES.P2,
      status: 'open',
      regressionStatus: 'new',
      route,
      element: {
        role: 'img',
        name: alt || 'Image',
        text: '',
        selector,
        componentName,
      },
      observedSummary: `Image rendered with empty or missing src attribute at ${selector}`,
      userImpact: 'Renders a blank or broken placeholder icon in the user interface.',
      likelySubsystem: 'Frontend Template Rendering',
      likelyCause: 'Component rendered before image URL was populated from API, or image property is null.',
      suggestedInvestigation: `Check ${componentName} props and provide a fallback image placeholder.`,
      reproductionSteps: [
        `Navigate to ${route}`,
        `Inspect element ${selector}`,
        `Observe src attribute is empty.`,
      ],
      occurrencesCount: 1,
    });
    return issues;
  }

  // 2. HTTP Network Failure or Render Failure (403, 404, 500, naturalWidth = 0)
  const isFailedHttp = httpStatus >= 400;
  const isZeroDimension = naturalWidth === 0 || naturalHeight === 0;

  if (isFailedHttp || isZeroDimension) {
    const mediaIssue = correlateMediaIssue({
      url: activeUrl,
      status: httpStatus,
      route,
      componentName,
      naturalWidth,
      naturalHeight,
      selector,
    });
    issues.push(mediaIssue);
  }

  // 3. Accessibility defect: Missing alt text on meaningful image
  if (typeof alt !== 'string' || alt.trim() === '') {
    // Only report if it is a product, logo, or informative image rather than purely decorative
    const isInformative = selector.includes('product') || selector.includes('avatar') || selector.includes('logo');
    if (isInformative) {
      const fingerprint = generateIssueFingerprint({
        category: CATEGORIES.ACCESSIBILITY,
        title: `MISSING_ALT_${selector}`,
        route,
        elementSelector: selector,
        componentName,
      });

      issues.push({
        fingerprint,
        title: `Accessibility: Missing alt attribute on ${componentName} image`,
        category: CATEGORIES.ACCESSIBILITY,
        severity: SEVERITIES.P3,
        status: 'open',
        regressionStatus: 'new',
        route,
        element: {
          role: 'img',
          name: '',
          text: '',
          selector,
          componentName,
        },
        observedSummary: `Image ${activeUrl} has no alt attribute or empty alt text.`,
        userImpact: 'Screen reader users cannot understand the visual content of this product image or logo.',
        likelySubsystem: 'Accessibility / WCAG 2.1 (Rule 1.1.1 Non-text Content)',
        likelyCause: 'Missing alt prop on <img> or ProductCard component.',
        suggestedInvestigation: `Pass a descriptive alt prop such as alt={product.name} in ${componentName}.`,
        reproductionSteps: [
          `Navigate to ${route}`,
          `Inspect <img> at ${selector}`,
          `Observe missing or empty alt attribute.`,
        ],
        occurrencesCount: 1,
      });
    }
  }

  return issues;
}
