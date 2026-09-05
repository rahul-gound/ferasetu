// =============================================================================
// Fera AI — USA Market Strategy
// Implements direct GLM-5.3 Flash on Modal.
// ZERO SARVAM CALLS. English is primary. Non-English queries are safely guarded.
// =============================================================================

import { BaseMarketStrategy } from './base.js';
import { callModalGlm } from '../providers/modalGlm.js';

export class USAStrategy extends BaseMarketStrategy {
  constructor() {
    super('US');
  }

  /**
   * Never translate input for US users via Sarvam.
   */
  shouldTranslateInput(context) {
    return false;
  }

  /**
   * Never translate response back for US users via Sarvam.
   */
  shouldTranslateResponseBack(context) {
    return false;
  }

  /**
   * Produce structured routing decision for USA.
   */
  resolveRouteDecision(context) {
    return {
      market: 'US',
      subscriptionPlan: context.plan || 'free',
      inputLanguage: context.inputLanguage || 'en',
      conversationLanguage: context.conversationLanguage || 'en',
      reasoningLanguage: 'en',
      translationRequired: false,
      translator: null,
      reasoningModel: 'glm-5.3-flash',
      provider: 'modal',
      fallbackPolicy: 'modal_retry_or_error',
      task: context.task || 'general_chat',
    };
  }

  /**
   * Execute the USA AI pipeline.
   */
  async execute({
    originalUserMessage,
    normalizedMessage,
    inputLanguage,
    conversationLanguage,
    shopContextLines,
    conversationHistory,
    systemPrompt,
    config,
    requestId,
    plan,
    task,
  }) {
    const routeDecision = this.resolveRouteDecision({
      inputLanguage,
      conversationLanguage,
      plan,
      task,
    });

    // Guard: Non-English input for US market is routed directly to native model capability
    // rather than falsely sending through an Indian translation pipeline.
    const historyBlock = (conversationHistory || [])
      .slice(-6)
      .map(m => `${m.role === 'user' ? 'MERCHANT' : 'FERA AI'}: ${m.content}`)
      .join('\n');

    const promptContext = [
      `STORE DATA:\n${shopContextLines}`,
      historyBlock ? `RECENT CONVERSATION:\n${historyBlock}` : '',
      `MERCHANT: ${normalizedMessage}`,
    ].filter(Boolean).join('\n\n');

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: promptContext },
    ];

    // Reasoning directly via GLM-5.3 Flash on Modal (no translation layer)
    const reasoningResult = await callModalGlm({
      messages,
      config,
      requestId,
    });

    return {
      content: reasoningResult.content,
      routingDecision: routeDecision,
      reasoning: {
        model: reasoningResult.model,
        provider: reasoningResult.provider,
        promptTokens: reasoningResult.promptTokens,
        completionTokens: reasoningResult.completionTokens,
        latencyMs: reasoningResult.latencyMs,
        fallbackUsed: reasoningResult.fallbackUsed,
      },
      translation: {
        used: false,
        inputCharacters: 0,
        outputCharacters: 0,
        latencyMs: 0,
        degraded: false,
        translationBackFailed: false,
      },
      contextPayload: {
        originalUserMessage,
        normalizedMessage,
        reasoningMessage: normalizedMessage,
        inputLanguage,
        conversationLanguage,
      },
    };
  }
}
