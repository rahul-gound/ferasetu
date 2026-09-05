// =============================================================================
// Fera AI — India Market Strategy
// Implements Sarvam Translate + GLM-5.3 Flash on Modal.
// CRITICAL OPTIMIZATION: Skips Sarvam completely if input is English.
// =============================================================================

import { BaseMarketStrategy } from './base.js';
import { callModalGlm } from '../providers/modalGlm.js';
import {
  translateInputToEnglish,
  translateResponseToUserLanguage,
} from '../providers/sarvamTranslate.js';

export class IndiaStrategy extends BaseMarketStrategy {
  constructor() {
    super('IN');
  }

  /**
   * Input translation is required ONLY when message is NOT English.
   */
  shouldTranslateInput(context) {
    return context.inputLanguage !== 'en';
  }

  /**
   * Output translation is required ONLY when target language is NOT English.
   */
  shouldTranslateResponseBack(context) {
    return context.inputLanguage !== 'en';
  }

  /**
   * Produce the structured routing decision for India.
   */
  resolveRouteDecision(context) {
    const isEnglish = context.inputLanguage === 'en';

    return {
      market: 'IN',
      subscriptionPlan: context.plan || 'free',
      inputLanguage: context.inputLanguage,
      conversationLanguage: context.conversationLanguage || context.inputLanguage,
      reasoningLanguage: 'en',
      translationRequired: !isEnglish,
      translator: isEnglish ? null : 'sarvam_translate',
      reasoningModel: 'glm-5.3-flash',
      provider: 'modal',
      fallbackPolicy: 'fail_on_input_degrade_on_output',
      task: context.task || 'general_chat',
    };
  }

  /**
   * Execute the India AI pipeline.
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

    let reasoningUserMessage = normalizedMessage;
    let translationInputChars = 0;
    let translationOutputChars = 0;
    let translationLatencyMs = 0;

    // 1. Translation Step (Skip if English)
    if (routeDecision.translationRequired) {
      const transStart = Date.now();
      const translationResult = await translateInputToEnglish({
        text: normalizedMessage,
        sourceLang: inputLanguage,
        config,
        requestId,
      });

      reasoningUserMessage = translationResult.translatedText;
      translationInputChars = translationResult.charactersCount;
      translationLatencyMs += Date.now() - transStart;
    }

    // 2. Format Messages for GLM-5.3 Flash reasoning
    // Keep structured shop context intact in English
    const historyBlock = (conversationHistory || [])
      .slice(-6)
      .map(m => `${m.role === 'user' ? 'SHOPKEEPER' : 'FERA AI'}: ${m.content}`)
      .join('\n');

    const promptContext = [
      `SHOP DATA:\n${shopContextLines}`,
      historyBlock ? `RECENT CONVERSATION:\n${historyBlock}` : '',
      `SHOPKEEPER (English Query): ${reasoningUserMessage}`,
    ].filter(Boolean).join('\n\n');

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: promptContext },
    ];

    // 3. Reasoning Step via GLM-5.3 Flash on Modal
    const reasoningResult = await callModalGlm({
      messages,
      config,
      requestId,
    });

    let finalResponseText = reasoningResult.content;
    let degraded = false;
    let translationBackFailed = false;

    // 4. Translate Response Back to User Language (if required)
    if (routeDecision.translationRequired && inputLanguage !== 'en') {
      const transBackStart = Date.now();
      const backResult = await translateResponseToUserLanguage({
        text: reasoningResult.content,
        targetLang: inputLanguage,
        config,
        requestId,
      });

      finalResponseText = backResult.translatedText;
      translationOutputChars = backResult.charactersCount;
      translationLatencyMs += Date.now() - transBackStart;
      degraded = backResult.degraded || false;
      translationBackFailed = backResult.translationBackFailed || false;
    }

    return {
      content: finalResponseText,
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
        used: routeDecision.translationRequired,
        inputCharacters: translationInputChars,
        outputCharacters: translationOutputChars,
        latencyMs: translationLatencyMs,
        degraded,
        translationBackFailed,
      },
      contextPayload: {
        originalUserMessage,
        normalizedMessage,
        reasoningMessage: reasoningUserMessage,
        inputLanguage,
        conversationLanguage,
      },
    };
  }
}
