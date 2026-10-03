/**
 * FeraSetu QA Engine - Type Definitions
 * =====================================
 */

/**
 * @typedef {'smoke' | 'full' | 'ui' | 'api' | 'assets' | 'security' | 'accessibility' | 'performance' | 'regression'} QAScanMode
 * @typedef {'P0' | 'P1' | 'P2' | 'P3' | 'INFO'} QASeverity
 * @typedef {'BUTTON_FAILURE' | 'IMAGE_FAILURE' | 'API_FAILURE' | 'CONSOLE_ERROR' | 'NETWORK_FAILURE' | 'ACCESSIBILITY' | 'SECURITY' | 'PERFORMANCE' | 'BLANK_SCREEN' | 'INFINITE_LOADING' | 'DEAD_LINK'} QACategory
 * @typedef {'open' | 'investigating' | 'resolved' | 'ignored'} QAIssueStatus
 * @typedef {'new' | 'returning' | 'resolved' | 'unchanged'} QARegressionStatus
 */

/**
 * @typedef {Object} QAElementIdentity
 * @property {string} role
 * @property {string} name
 * @property {string} text
 * @property {string} selector
 * @property {string} [stableSelector]
 * @property {string} [testId]
 * @property {string} [componentName]
 * @property {Object} [boundingBox]
 * @property {number} [boundingBox.x]
 * @property {number} [boundingBox.y]
 * @property {number} [boundingBox.width]
 * @property {number} [boundingBox.height]
 * @property {string[]} [domAncestry]
 */

/**
 * @typedef {Object} QAObservedState
 * @property {string} url
 * @property {string} domHash
 * @property {number} dialogCount
 * @property {number} networkCount
 * @property {number} consoleErrorCount
 * @property {boolean} isLoading
 * @property {string} pageTitle
 * @property {string} [toastText]
 */

/**
 * @typedef {Object} QAFailureEvidence
 * @property {string} [screenshotUrl]
 * @property {string} [screenshotBase64]
 * @property {string} [domSnippet]
 * @property {Array<{url: string, method: string, status: number, durationMs: number}>} [networkEntries]
 * @property {Array<{type: string, message: string, stack?: string}>} [consoleEntries]
 * @property {Object} [elementCoordinates]
 * @property {string} [playwrightTraceUrl]
 * @property {string} [correlationId]
 * @property {string} [likelySubsystem]
 */

/**
 * @typedef {Object} QAIssue
 * @property {string} [id]
 * @property {string} fingerprint
 * @property {string} title
 * @property {QACategory} category
 * @property {QASeverity} severity
 * @property {QAIssueStatus} status
 * @property {QARegressionStatus} regressionStatus
 * @property {string} route
 * @property {QAElementIdentity} [element]
 * @property {string} [apiEndpoint]
 * @property {number} [httpStatus]
 * @property {string} observedSummary
 * @property {string} [userImpact]
 * @property {string} [likelySubsystem]
 * @property {string} [likelyCause]
 * @property {string} [suggestedInvestigation]
 * @property {string[]} [reproductionSteps]
 * @property {QAFailureEvidence} [evidence]
 * @property {number} occurrencesCount
 * @property {string} [firstDetectedAt]
 * @property {string} [lastDetectedAt]
 */

/**
 * @typedef {Object} QARunConfig
 * @property {string} runId
 * @property {QAScanMode} mode
 * @property {string} targetUrl
 * @property {string} environment
 * @property {string[]} [selectedScanners]
 * @property {string} [routeFilter]
 * @property {{width: number, height: number}} [viewport]
 * @property {boolean} [headless]
 * @property {boolean} [destructiveAllowed]
 * @property {string} [adminToken]
 * @property {string} [apiBaseUrl]
 */

export const SEVERITIES = {
  P0: 'P0', // Catastrophic / complete app crash
  P1: 'P1', // Critical business flow broken (Checkout, create product, auth)
  P2: 'P2', // Important feature degraded or broken (Filter, search, broken image)
  P3: 'P3', // Minor visual / quality defect (Missing alt text, accessible name)
  INFO: 'INFO', // Diagnostic observation
};

export const CATEGORIES = {
  BUTTON_FAILURE: 'BUTTON_FAILURE',
  IMAGE_FAILURE: 'IMAGE_FAILURE',
  API_FAILURE: 'API_FAILURE',
  CONSOLE_ERROR: 'CONSOLE_ERROR',
  NETWORK_FAILURE: 'NETWORK_FAILURE',
  ACCESSIBILITY: 'ACCESSIBILITY',
  SECURITY: 'SECURITY',
  PERFORMANCE: 'PERFORMANCE',
  BLANK_SCREEN: 'BLANK_SCREEN',
  INFINITE_LOADING: 'INFINITE_LOADING',
  DEAD_LINK: 'DEAD_LINK',
};
