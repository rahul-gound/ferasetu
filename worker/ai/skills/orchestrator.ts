// =============================================================================
// Fera AI — CEO Orchestrator
// The single entry point. Understands intent, selects minimum required skills,
// coordinates them, and returns one unified response to the shopkeeper.
// =============================================================================

import type { RouterFn, SkillInput, SkillResult, ShopContext } from './shared.js';
import { buildContextBlock, stripThinkTags, emptySkillResult } from './shared.js';
import type { RouterRequest } from '../router.js';

export interface OrchestratorRequest {
  message: string;
  language: string;
  shopContext: ShopContext;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  routerFn: RouterFn;
  maxSkillCalls?: number;
}

export interface OrchestratorResponse {
  content: string;
  skillsUsed: string[];
  hasProposedActions: boolean;
  proposedActions: Array<{
    id: string;
    toolName: string;
    riskLevel: string;
    preview: string;
    requiresApproval: boolean;
    input: Record<string, unknown>;
  }>;
  requestId: string;
  totalLatencyMs: number;
}

interface IntentClassification {
  primaryIntent:
    | 'inventory_check'
    | 'sales_analysis'
    | 'marketing_campaign'
    | 'content_creation'
    | 'translation'
    | 'business_advice'
    | 'support_query'
    | 'analytics_review'
    | 'automation_setup'
    | 'general_chat';
  requiredSkills: string[];
  riskLevel: 'read_only' | 'reversible_write' | 'sensitive';
  language: string;
  isComplex: boolean;
}

// Classify intent from user message without calling AI (deterministic fast path)
function classifyIntent(message: string, language: string): IntentClassification {
  const msg = message.toLowerCase();

  // Inventory signals
  if (/stock|inventory|low stock|out of stock|reorder|stok|माल|स्टॉक/.test(msg)) {
    return { primaryIntent: 'inventory_check', requiredSkills: ['inventory'], riskLevel: 'read_only', language, isComplex: false };
  }

  // Sales / revenue signals
  if (/sale|revenue|profit|order|earning|bikri|कमाई|बिक्री|आमदनी/.test(msg) && /today|week|month|aaj|इस हफ्ते/.test(msg)) {
    return { primaryIntent: 'sales_analysis', requiredSkills: ['analytics', 'sales'], riskLevel: 'read_only', language, isComplex: false };
  }

  // Translation signals
  if (/translat|hindi mein|gujarati mein|anuvad|अनुवाद|ترجمہ/.test(msg)) {
    return { primaryIntent: 'translation', requiredSkills: ['translation'], riskLevel: 'read_only', language, isComplex: false };
  }

  // Marketing / campaign signals
  if (/campaign|whatsapp|festival|diwali|offer|discount|promote|promo/.test(msg)) {
    return { primaryIntent: 'marketing_campaign', requiredSkills: ['inventory', 'marketing', 'content'], riskLevel: 'reversible_write', language, isComplex: true };
  }

  // Content / product description signals
  if (/description|product desc|improve listing|write about|generate content|seo/.test(msg)) {
    return { primaryIntent: 'content_creation', requiredSkills: ['content'], riskLevel: 'read_only', language, isComplex: false };
  }

  // Analytics signals
  if (/analytics|chart|trend|why did|compare|performance|data|graph/.test(msg)) {
    return { primaryIntent: 'analytics_review', requiredSkills: ['analytics'], riskLevel: 'read_only', language, isComplex: false };
  }

  // Business coaching
  if (/what should i do|suggest|advice|recommend|today|help me grow|kya karna chahiye/.test(msg)) {
    return { primaryIntent: 'business_advice', requiredSkills: ['business_coach', 'analytics', 'inventory'], riskLevel: 'read_only', language, isComplex: false };
  }

  // Default: general
  return { primaryIntent: 'general_chat', requiredSkills: ['business_coach'], riskLevel: 'read_only', language, isComplex: false };
}

export async function runOrchestrator(req: OrchestratorRequest): Promise<OrchestratorResponse> {
  const startMs = Date.now();
  const requestId = crypto.randomUUID();
  const maxSkills = req.maxSkillCalls ?? 3;

  // Step 1: Classify intent (deterministic — no AI call)
  const intent = classifyIntent(req.message, req.language);
  const skillsToRun = intent.requiredSkills.slice(0, maxSkills);

  // Step 2: Build the system prompt with shop context
  const contextBlock = buildContextBlock(req.shopContext);
  const historyBlock = req.conversationHistory
    .slice(-6) // last 3 exchanges
    .map(m => `${m.role === 'user' ? 'SHOPKEEPER' : 'FERA AI'}: ${m.content}`)
    .join('\n');

  const systemPrompt = buildOrchestratorSystemPrompt(req.shopContext.language);

  const userPromptParts = [
    `SHOP CONTEXT:\n${contextBlock}`,
    historyBlock ? `RECENT CONVERSATION:\n${historyBlock}` : '',
    `SHOPKEEPER SAYS: ${req.message}`,
    `SKILLS ACTIVATED: ${skillsToRun.join(', ')}`,
    `RESPOND IN: ${getLanguageName(req.language)}`,
  ].filter(Boolean);

  // Step 3: Call AI once (CEO orchestrator synthesis)
  const aiRequest: RouterRequest = {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPromptParts.join('\n\n') },
    ],
    temperature: 0.4,
    maxTokens: 1024,
    language: req.language,
    taskType: intent.isComplex ? 'complex' : 'simple',
    taskHint: intent.primaryIntent === 'translation' ? 'translation' : 'simple_qa',
    callingSkill: 'ceo_orchestrator',
  };

  const aiResponse = await req.routerFn(aiRequest);
  const content = stripThinkTags(aiResponse.content);

  return {
    content,
    skillsUsed: skillsToRun,
    hasProposedActions: false,
    proposedActions: [],
    requestId,
    totalLatencyMs: Date.now() - startMs,
  };
}

function buildOrchestratorSystemPrompt(language: string): string {
  const langName = getLanguageName(language);
  return `You are Fera AI, a business assistant for Indian shopkeepers on FeraSetu.

Your personality:
- Warm, practical, and direct — like a trusted business advisor
- You speak simply, avoid jargon, and respect the shopkeeper's time
- You always answer: What happened? Why? What to do next? Can you do it for them?
- You respond in ${langName} when the shopkeeper uses it
- You use Indian context (₹ for currency, Indian festivals, Indian customer habits)

Rules:
- NEVER invent sales numbers, stock levels, or customer data
- NEVER promise specific revenue increases
- ALWAYS say "I noticed" or "it appears" not "it is proven" for insights
- NEVER ask for confirmation before answering read-only questions
- For actions that change data, always describe what you plan to do and ask for approval
- Keep responses concise — shopkeepers are busy
- Prefer bullet points and simple language
- Maximum 3 recommendations per response
- End with one clear next action

You have these capabilities (do not mention these names to the user):
- Inventory analysis
- Sales analysis  
- Marketing campaign creation
- Product content generation
- Business coaching
- Analytics explanation
- Translation between Indian languages
- Automation suggestions`;
}

function getLanguageName(code: string): string {
  const map: Record<string, string> = {
    hi: 'Hindi',
    en: 'English',
    gu: 'Gujarati',
    mr: 'Marathi',
    ta: 'Tamil',
    te: 'Telugu',
    kn: 'Kannada',
    bn: 'Bengali',
    pa: 'Punjabi',
    ur: 'Urdu',
  };
  return map[code] ?? 'English';
}
