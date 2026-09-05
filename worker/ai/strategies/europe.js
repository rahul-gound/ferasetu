// =============================================================================
// Fera AI — Europe Market Strategy (Architecture Reserved)
// Reserved extension point for European expansion.
// Explicitly returns structured 'not_configured' without fake translation.
// =============================================================================

import { BaseMarketStrategy } from './base.js';

export class EuropeStrategy extends BaseMarketStrategy {
  constructor() {
    super('EU');
  }

  shouldTranslateInput(context) {
    return false;
  }

  shouldTranslateResponseBack(context) {
    return false;
  }

  resolveRouteDecision(context) {
    return {
      market: 'EU',
      subscriptionPlan: context.plan || 'free',
      inputLanguage: context.inputLanguage || 'en',
      conversationLanguage: context.conversationLanguage || 'en',
      reasoningLanguage: 'en',
      translationRequired: false,
      translator: null,
      reasoningModel: null,
      provider: null,
      fallbackPolicy: 'none',
      status: 'not_configured',
      task: context.task || 'general_chat',
    };
  }

  async execute({ requestId, plan, inputLanguage, task }) {
    const routeDecision = this.resolveRouteDecision({ plan, inputLanguage, task });

    return {
      content: "Fera AI services for the European market are currently scheduled for release in an upcoming update. We apologize for the inconvenience.",
      routingDecision: routeDecision,
      reasoning: {
        model: 'none',
        provider: 'none',
        promptTokens: 0,
        completionTokens: 0,
        latencyMs: 0,
        fallbackUsed: false,
      },
      translation: {
        used: false,
        inputCharacters: 0,
        outputCharacters: 0,
        latencyMs: 0,
        degraded: false,
        translationBackFailed: false,
      },
      status: 'not_configured',
      error: 'European AI market strategy is reserved and not yet active in this region.',
    };
  }
}
