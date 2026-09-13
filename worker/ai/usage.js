// =============================================================================
// FeraSetu AI — Usage & Cost Tracking Metadata Generator
// Calculates token usage, translation character metrics, and estimated USD cost.
// STRICT PRIVACY: Never logs raw user prompts or customer PII.
// =============================================================================

import { REASONING_MODELS, TRANSLATION_CAPABILITIES } from './capabilities.js';

/**
 * Generate structured usage & cost telemetry metadata.
 *
 * @param {object} params
 * @returns {object}
 */
export function buildUsageMetadata({
  requestId,
  userId,
  market,
  plan,
  inputLanguage,
  reasoningModel,
  provider,
  promptTokens = 0,
  completionTokens = 0,
  translationUsed = false,
  translationInputCharacters = 0,
  translationOutputCharacters = 0,
  latencyMs = 0,
  status = 'success',
  fallbackUsed = false,
}) {
  const modelPricing = REASONING_MODELS.glm53Flash.pricingUsdPer1kTokens;
  const translationPricing = TRANSLATION_CAPABILITIES.sarvamTranslate.pricingUsdPer1kChars;

  const reasoningCostUsd =
    (promptTokens / 1000) * modelPricing.input +
    (completionTokens / 1000) * modelPricing.output;

  const totalTranslationChars = translationInputCharacters + translationOutputCharacters;
  const translationCostUsd = translationUsed
    ? (totalTranslationChars / 1000) * translationPricing
    : 0;

  const estimatedCostUsd = Number((reasoningCostUsd + translationCostUsd).toFixed(6));

  return {
    requestId,
    userId,
    market,
    plan,
    inputLanguage,
    translationUsed,
    translationInputCharacters,
    translationOutputCharacters,
    reasoningModel,
    provider,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    estimatedCostUsd,
    latencyMs,
    status,
    fallbackUsed,
    timestamp: new Date().toISOString(),
  };
}
