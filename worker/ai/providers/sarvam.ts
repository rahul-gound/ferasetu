// =============================================================================
// Fera AI — Sarvam Provider Adapter
// Implements the internal AIProvider contract for Sarvam AI models.
// Never import this directly in business logic; go through the router.
// =============================================================================

export type SarvamModel = 'sarvam-m' | 'sarvam-2-105b';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIRequest {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  language?: string;
  taskType?: 'simple' | 'complex';
  cacheKey?: string;
}

export interface AIResponse {
  content: string;
  provider: 'sarvam';
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
  };
  requestId: string;
  latencyMs: number;
  cacheHit: boolean;
}

/** Cost per 1,000 tokens in USD (approximate). */
const MODEL_COSTS: Record<SarvamModel, { input: number; output: number }> = {
  'sarvam-m': { input: 0.0003, output: 0.0006 },
  'sarvam-2-105b': { input: 0.001, output: 0.002 },
};

function estimateCostUsd(
  model: SarvamModel,
  promptTokens: number,
  completionTokens: number
): number {
  const cost = MODEL_COSTS[model] ?? MODEL_COSTS['sarvam-m'];
  return (
    (promptTokens / 1000) * cost.input +
    (completionTokens / 1000) * cost.output
  );
}

export class SarvamProviderError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly providerError?: unknown
  ) {
    super(message);
    this.name = 'SarvamProviderError';
  }
}

export async function callSarvam(
  request: AIRequest,
  apiKey: string,
  model: SarvamModel = 'sarvam-m',
  baseUrl = 'https://api.sarvam.ai/v1'
): Promise<AIResponse> {
  const requestId = crypto.randomUUID();
  const startMs = Date.now();

  if (!apiKey || apiKey.length < 10) {
    throw new SarvamProviderError('Sarvam API key is not configured', 503);
  }

  const timeout = model === 'sarvam-2-105b' ? 90_000 : 30_000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-Request-ID': requestId,
      },
      body: JSON.stringify({
        model,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? (model === 'sarvam-2-105b' ? 4096 : 2048),
      }),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new SarvamProviderError(`Sarvam request timed out after ${timeout}ms`, 504);
    }
    throw new SarvamProviderError(`Sarvam network error: ${err.message}`, 503, err);
  }

  clearTimeout(timer);
  const latencyMs = Date.now() - startMs;

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new SarvamProviderError(
      `Sarvam returned ${response.status}`,
      response.status,
      body
    );
  }

  const data = await response.json() as any;
  const content: string = data?.choices?.[0]?.message?.content ?? '';
  const promptTokens: number = data?.usage?.prompt_tokens ?? 0;
  const completionTokens: number = data?.usage?.completion_tokens ?? 0;

  return {
    content,
    provider: 'sarvam',
    model,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      estimatedCostUsd: estimateCostUsd(model, promptTokens, completionTokens),
    },
    requestId,
    latencyMs,
    cacheHit: false,
  };
}

/**
 * Select the appropriate Sarvam model for a task.
 * - Indian-language tasks → sarvam-m (optimised for Indic)
 * - Complex reasoning → sarvam-2-105b
 */
export function selectSarvamModel(taskType: 'simple' | 'complex'): SarvamModel {
  return taskType === 'complex' ? 'sarvam-2-105b' : 'sarvam-m';
}

/**
 * Fallback response used in development or when Sarvam is unavailable.
 * Never return fake business data from this.
 */
export function buildFallbackResponse(requestId: string, latencyMs: number): AIResponse {
  return {
    content:
      'Namaste! I am Fera AI. I am having a little trouble right now — please try again in a moment. 🙏',
    provider: 'sarvam',
    model: 'sarvam-m-fallback',
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUsd: 0 },
    requestId,
    latencyMs,
    cacheHit: false,
  };
}
