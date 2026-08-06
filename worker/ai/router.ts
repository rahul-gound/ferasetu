// =============================================================================
// Fera AI — AI Provider Router
// Selects the right provider per task. Business logic never calls a provider
// directly — it always goes through this router.
// =============================================================================

import {
  callSarvam,
  SarvamProviderError,
  buildFallbackResponse,
  selectSarvamModel,
  type AIRequest,
  type AIResponse,
  type ChatMessage,
} from './providers/sarvam.js';

export type { AIRequest, AIResponse, ChatMessage };

export interface RouterConfig {
  sarvamApiKey: string;
  sarvamBaseUrl?: string;
  isDevelopment?: boolean;
  /** Per-request cost ceiling in USD (hard limit) */
  maxCostPerRequestUsd?: number;
}

export interface RouterRequest extends AIRequest {
  /** Hint to the router about what kind of task this is */
  taskHint?:
    | 'indian_language'
    | 'translation'
    | 'complex_analysis'
    | 'product_description'
    | 'simple_qa';
  /** The calling skill, for logging */
  callingSkill?: string;
}

/**
 * Route a request to the best available provider.
 * Currently wraps Sarvam only; adding DeepSeek or another provider means
 * adding a case here — zero changes to business logic.
 */
export async function routeAIRequest(
  request: RouterRequest,
  config: RouterConfig
): Promise<AIResponse> {
  // Routing decision
  const taskType = inferTaskType(request);
  const model = selectSarvamModel(taskType);

  // Attempt primary provider with up to 2 retries
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await callSarvam(
        request,
        config.sarvamApiKey,
        model,
        config.sarvamBaseUrl
      );
      return response;
    } catch (err) {
      lastError = err;

      // Rate-limit or auth errors → do not retry
      if (err instanceof SarvamProviderError && (err.statusCode === 401 || err.statusCode === 429)) {
        break;
      }

      // Exponential backoff: 500ms, 1000ms
      if (attempt < 2) {
        await sleep(500 * Math.pow(2, attempt));
      }
    }
  }

  // Fallback response — never crashes the worker
  if (config.isDevelopment) {
    console.warn('[ai-router] Sarvam failed, returning fallback:', lastError);
    return buildFallbackResponse(crypto.randomUUID(), 0);
  }

  // In production, surface the error so the edge can return a graceful message
  throw lastError;
}

/**
 * Generate a structured JSON output from the AI.
 * The result is validated against the provided type guard before returning.
 * Falls back to defaultValue if parsing fails.
 */
export async function generateStructured<T>(
  request: RouterRequest,
  config: RouterConfig,
  validate: (raw: unknown) => T | null,
  defaultValue: T
): Promise<{ data: T; raw: AIResponse }> {
  const raw = await routeAIRequest(request, config);

  // Try to extract JSON from the response
  const parsed = extractJson(raw.content);
  const validated = parsed !== null ? validate(parsed) : null;

  return {
    data: validated ?? defaultValue,
    raw,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function inferTaskType(request: RouterRequest): 'simple' | 'complex' {
  if (request.taskType) return request.taskType;

  switch (request.taskHint) {
    case 'complex_analysis':
      return 'complex';
    case 'indian_language':
    case 'translation':
    case 'product_description':
    case 'simple_qa':
    default:
      return 'simple';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract the first JSON object or array from a text response.
 * Handles markdown code fences (```json ... ```) and bare JSON.
 */
export function extractJson(text: string): unknown {
  // Try markdown code fence first
  const fenceMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/i);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // fall through
    }
  }

  // Try first {...} block
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      return JSON.parse(braceMatch[0]);
    } catch {
      // fall through
    }
  }

  // Try first [...] block
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {
      // fall through
    }
  }

  return null;
}
