// =============================================================================
// Fera AI — Market Strategy Base Interface
// Standard contract for market-specific routing and execution strategies.
// =============================================================================

export class BaseMarketStrategy {
  /**
   * @param {string} marketCode - 'IN' | 'US' | 'EU'
   */
  constructor(marketCode) {
    this.marketCode = marketCode;
  }

  /**
   * Determine if input translation is required.
   * @param {object} context
   * @returns {boolean}
   */
  shouldTranslateInput(context) {
    throw new Error('shouldTranslateInput must be implemented by strategy subclass');
  }

  /**
   * Determine if output translation is required.
   * @param {object} context
   * @returns {boolean}
   */
  shouldTranslateResponseBack(context) {
    throw new Error('shouldTranslateResponseBack must be implemented by strategy subclass');
  }

  /**
   * Produce the structured routing decision.
   * @param {object} context
   * @returns {object}
   */
  resolveRouteDecision(context) {
    throw new Error('resolveRouteDecision must be implemented by strategy subclass');
  }

  /**
   * Execute the end-to-end routing pipeline.
   * @param {object} params
   * @returns {Promise<object>}
   */
  async execute(params) {
    throw new Error('execute must be implemented by strategy subclass');
  }
}
