// =============================================================================
// FeraSetu Shared Types
// Used by: frontend, worker (edge-api), ai-service, packages
// =============================================================================

// ---------------------------------------------------------------------------
// Core identifiers
// ---------------------------------------------------------------------------

export type TenantId = string;
export type UserId = string;
export type SkillName =
  | 'ceo_orchestrator'
  | 'sales'
  | 'marketing'
  | 'inventory'
  | 'finance'
  | 'design'
  | 'content'
  | 'support'
  | 'seo'
  | 'analytics'
  | 'security'
  | 'shopping_assistant'
  | 'translation'
  | 'automation'
  | 'voice'
  | 'business_coach';

export type RiskLevel = 'read_only' | 'reversible_write' | 'sensitive';

export type AIProvider = 'sarvam' | 'deepseek' | 'openai' | 'anthropic' | 'fallback';

export type UserPlan = 'free' | 'business' | 'pro' | 'beta';

// ---------------------------------------------------------------------------
// AI Provider Interface (provider-agnostic contract)
// ---------------------------------------------------------------------------

export interface AIRequest {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  language?: string;
  taskType?: 'simple' | 'complex';
  systemPrompt?: string;
  /** Opaque cache key for response caching */
  cacheKey?: string;
}

export interface StructuredAIRequest<T> extends AIRequest {
  /** Zod schema or JSON Schema description used for validation */
  outputSchema: unknown;
  /** Human-readable name for the schema */
  schemaName: string;
  defaultValue?: T;
}

export interface AIResponse {
  content: string;
  provider: AIProvider;
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

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ---------------------------------------------------------------------------
// Tool Registry
// ---------------------------------------------------------------------------

export interface ToolDefinition {
  name: string;
  description: string;
  riskLevel: RiskLevel;
  skill: SkillName;
  /** JSON Schema for input */
  inputSchema: Record<string, unknown>;
  requiresApproval: boolean;
  requiresConfirmation: boolean;
  isIdempotent: boolean;
  maxRetries: number;
}

// ---------------------------------------------------------------------------
// Proposed Action (output from skills)
// ---------------------------------------------------------------------------

export interface ProposedAction {
  toolName: string;
  riskLevel: RiskLevel;
  input: Record<string, unknown>;
  /** Human-readable summary of what will happen */
  preview: string;
  /** Whether the action can be reverted */
  reversible: boolean;
  requiresApproval: boolean;
  /** Estimated records / resources affected */
  affectedRecords?: Array<{ type: string; id: string; label: string }>;
}

// ---------------------------------------------------------------------------
// Skill Result (structured output from every skill)
// ---------------------------------------------------------------------------

export interface SkillFinding {
  title: string;
  explanation: string;
  confidence: number; // 0–1
  evidence: Array<{
    sourceType: 'order' | 'product' | 'campaign' | 'customer' | 'analytics' | 'audit_log' | 'memory';
    sourceId: string;
    label?: string;
  }>;
}

export interface SkillRecommendation {
  title: string;
  reason: string;
  expectedImpact?: string;
  priority: 'low' | 'medium' | 'high';
  action?: ProposedAction;
}

export interface SkillResult {
  skill: SkillName;
  summary: string;
  findings: SkillFinding[];
  recommendations: SkillRecommendation[];
  warnings: string[];
  /** Structured content blocks for rendering (optional) */
  contentBlocks?: ContentBlock[];
  /** Whether the skill wants to ask the user something */
  clarificationNeeded?: string;
  executionTimeMs?: number;
}

// ---------------------------------------------------------------------------
// Content Blocks (for rich frontend rendering)
// ---------------------------------------------------------------------------

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'markdown'; markdown: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'action_preview'; action: ProposedAction }
  | { type: 'approval_request'; approvalId: string; summary: string; actions: ProposedAction[] }
  | { type: 'campaign_preview'; campaign: CampaignPreview }
  | { type: 'product_list'; products: ProductSummary[] }
  | { type: 'metric'; label: string; value: string; change?: string; changeType?: 'positive' | 'negative' | 'neutral' }
  | { type: 'suggestion_chips'; chips: Array<{ label: string; message: string }> };

// ---------------------------------------------------------------------------
// Orchestrator Request / Response
// ---------------------------------------------------------------------------

export interface OrchestratorRequest {
  requestId: string;
  tenantId: TenantId;
  userId: UserId;
  userPlan: UserPlan;
  message: string;
  language: string;
  conversationId: string;
  conversationHistory: ChatMessage[];
  shopContext: ShopContext;
  preferredSkills?: SkillName[];
  /** Approval token when resuming an approval flow */
  approvalToken?: string;
  voiceInput?: boolean;
}

export interface OrchestratorResponse {
  requestId: string;
  conversationId: string;
  /** The final user-visible message */
  reply: string;
  contentBlocks: ContentBlock[];
  /** Any pending approvals that the frontend must present */
  pendingApproval?: ApprovalRequest;
  /** Skills that were invoked */
  skillsUsed: SkillName[];
  /** Actions that were executed */
  actionsExecuted: ExecutedAction[];
  /** Usage metrics */
  usage: OrchestratorUsage;
  language: string;
  /** Suggested follow-up chips */
  suggestedFollowUps: string[];
}

export interface OrchestratorUsage {
  totalTokens: number;
  estimatedCostUsd: number;
  skillCallCount: number;
  modelCallCount: number;
  latencyMs: number;
  provider: AIProvider;
  cacheHits: number;
}

// ---------------------------------------------------------------------------
// Approval System
// ---------------------------------------------------------------------------

export interface ApprovalRequest {
  approvalId: string;
  requestId: string;
  conversationId: string;
  tenantId: TenantId;
  userId: UserId;
  summary: string;
  actions: ProposedAction[];
  /** ISO timestamp when this approval expires */
  expiresAt: string;
  riskLevel: RiskLevel;
  /** Whether all-or-nothing or can be partially approved */
  requiresAllActions: boolean;
  createdAt: string;
}

export interface ApprovalDecision {
  approvalId: string;
  decision: 'confirm' | 'reject';
  userId: UserId;
  tenantId: TenantId;
  /** Partial approval: specific action indices to approve */
  approvedActionIndices?: number[];
  decisionAt: string;
}

export interface ExecutedAction {
  toolName: string;
  input: Record<string, unknown>;
  result: 'success' | 'failed' | 'skipped';
  error?: string;
  executedAt: string;
}

// ---------------------------------------------------------------------------
// Shop Context (shared memory, never sent in full to the model)
// ---------------------------------------------------------------------------

export interface ShopContext {
  tenantId: TenantId;
  shopName: string;
  businessCategory: string;
  language: string;
  currency: string;
  timeZone: string;
  plan: UserPlan;

  // Derived summaries (not raw DB dumps)
  productSummary: {
    totalProducts: number;
    activeProducts: number;
    lowStockCount: number;
    outOfStockCount: number;
    categories: string[];
    topProducts: ProductSummary[];
  };

  orderSummary: {
    todayOrders: number;
    todayRevenue: number;
    weekOrders: number;
    weekRevenue: number;
    pendingOrders: number;
    recentOrders: OrderSummary[];
  };

  /** Previous recommendations and their outcomes */
  recentRecommendations: Array<{
    id: string;
    summary: string;
    outcome?: 'accepted' | 'rejected' | 'pending';
    createdAt: string;
  }>;

  /** Business goals the shopkeeper has set */
  businessGoals: string[];

  /** Short-term conversation facts (current session only) */
  sessionFacts: Record<string, string>;
}

export interface ProductSummary {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  isLowStock: boolean;
  weeklySales?: number;
}

export interface OrderSummary {
  id: string;
  customerName: string;
  total: number;
  status: string;
  createdAt: string;
  itemCount: number;
}

// ---------------------------------------------------------------------------
// Campaign Preview
// ---------------------------------------------------------------------------

export interface CampaignPreview {
  id: string;
  name: string;
  type: 'whatsapp' | 'social_post' | 'banner' | 'email';
  message?: string;
  bannerBrief?: string;
  targetSegment?: string;
  scheduledFor?: string;
  estimatedReach?: number;
}

// ---------------------------------------------------------------------------
// Automation
// ---------------------------------------------------------------------------

export type AutomationTrigger =
  | 'order_delivered'
  | 'stock_low'
  | 'cart_abandoned'
  | 'weekly_summary'
  | 'first_order'
  | 'manual';

export interface AutomationWorkflow {
  id: string;
  tenantId: TenantId;
  name: string;
  description: string;
  trigger: AutomationTrigger;
  triggerConfig: Record<string, unknown>;
  conditions: Array<{ field: string; operator: string; value: unknown }>;
  actions: AutomationAction[];
  isEnabled: boolean;
  requiresApproval: boolean;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  runCount: number;
  failCount: number;
}

export interface AutomationAction {
  type: 'send_message' | 'create_coupon' | 'alert_owner' | 'generate_summary' | 'update_inventory';
  config: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// AI Usage Tracking
// ---------------------------------------------------------------------------

export interface AIUsageRecord {
  id: string;
  tenantId: TenantId;
  userId: UserId;
  requestId: string;
  conversationId: string;
  skill: SkillName | 'orchestrator';
  provider: AIProvider;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;
  success: boolean;
  cacheHit: boolean;
  fallbackUsed: boolean;
  workflow?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Audit Log
// ---------------------------------------------------------------------------

export interface AuditLogEntry {
  id: string;
  tenantId: TenantId;
  userId: UserId;
  action: string;
  resourceType: string;
  resourceId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  performedBy: 'user' | 'ai' | 'system' | 'admin';
  approvalId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Plan Entitlements & Configuration
// ---------------------------------------------------------------------------

export type PlanId = 'free' | 'business' | 'pro';

export interface PlanPrice {
  monthly: number;        // INR per month
  yearly: number;         // INR per year (≈ 10 months price = 2 months free)
  yearlyPerMonth: number; // effective monthly rate when billed annually
}

export interface PlanLimits {
  products: number;          // max products (Infinity = unlimited)
  aiCreditsPerMonth: number; // AI messages/credits per month
  storageBytes: number;      // media/invoice storage in bytes
  customDomain: boolean;     // custom domain connection
  advancedAnalytics: boolean;// profit tracking & advanced reports
  staffAccounts: number;     // number of staff/collaborator logins
  removeBranding: boolean;   // remove FeraSetu branding from store
  prioritySupport: boolean;  // priority WhatsApp & phone support
}

export interface PlanFeature {
  label: string;
  included: boolean;
  note?: string;
}

export interface PlanDefinition {
  id: PlanId;
  displayName: string;
  tagline: string;
  outcome: string;
  price: PlanPrice;
  limits: PlanLimits;
  features: PlanFeature[];
  highlighted?: boolean;
  badge?: string;
  ctaText: string;
  ctaHref: string;
}

export const PLAN_PRICES: Record<PlanId, PlanPrice> = {
  free: { monthly: 0, yearly: 0, yearlyPerMonth: 0 },
  business: { monthly: 399, yearly: 3990, yearlyPerMonth: 332 },
  pro: { monthly: 999, yearly: 9990, yearlyPerMonth: 832 },
};

export const BUSINESS_PRICE_VARIANTS: Record<string, PlanPrice> = {
  variant_299: { monthly: 299, yearly: 2990, yearlyPerMonth: 249 },
  control_399: { monthly: 399, yearly: 3990, yearlyPerMonth: 332 },
  variant_499: { monthly: 499, yearly: 4990, yearlyPerMonth: 416 },
};

export const LEGACY_PLAN_MAP: Record<string, PlanId> = {
  free: 'free',
  beta: 'free',
  trial: 'free',
  business: 'business',
  growth: 'business',
  basic: 'business',
  starter: 'business',
  standard: 'business',
  pro: 'pro',
  premium: 'pro',
  scale: 'pro',
  enterprise: 'pro',
};

export function normalizePlanId(plan: string | undefined | null): PlanId {
  if (!plan) return 'free';
  const clean = String(plan).toLowerCase().trim();
  return LEGACY_PLAN_MAP[clean] ?? 'free';
}

export function getBusinessPlanPrice(variant?: string | null): PlanPrice {
  if (!variant) return PLAN_PRICES.business;
  const key = variant.toLowerCase().trim();
  if (key === 'variant_299' || key === '299' || key === 'v299') return BUSINESS_PRICE_VARIANTS.variant_299;
  if (key === 'variant_499' || key === '499' || key === 'v499') return BUSINESS_PRICE_VARIANTS.variant_499;
  if (key === 'control_399' || key === '399' || key === 'v399') return BUSINESS_PRICE_VARIANTS.control_399;
  return BUSINESS_PRICE_VARIANTS[key] ?? PLAN_PRICES.business;
}

export function getPlanPricing(
  planId: string | undefined | null,
  billing?: 'monthly' | 'yearly',
  variant?: string | null
): PlanPrice {
  const normalized = normalizePlanId(planId);
  if (normalized === 'business' && variant) {
    return getBusinessPlanPrice(variant);
  }
  return PLAN_PRICES[normalized] ?? PLAN_PRICES.free;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    products: 25,
    aiCreditsPerMonth: 20,
    storageBytes: 50 * 1024 * 1024,
    customDomain: false,
    advancedAnalytics: false,
    staffAccounts: 1,
    removeBranding: false,
    prioritySupport: false,
  },
  business: {
    products: 500,
    aiCreditsPerMonth: 200,
    storageBytes: 1 * 1024 * 1024 * 1024,
    customDomain: true,
    advancedAnalytics: true,
    staffAccounts: 2,
    removeBranding: true,
    prioritySupport: true,
  },
  pro: {
    products: Infinity,
    aiCreditsPerMonth: 1000,
    storageBytes: 5 * 1024 * 1024 * 1024,
    customDomain: true,
    advancedAnalytics: true,
    staffAccounts: 5,
    removeBranding: true,
    prioritySupport: true,
  },
};

export function getPlanLimits(planId: string | undefined | null): PlanLimits {
  const normalized = normalizePlanId(planId);
  return PLAN_LIMITS[normalized] ?? PLAN_LIMITS.free;
}

export function canUseFeature(
  planId: string | undefined | null,
  feature: keyof PlanLimits
): boolean {
  const limits = getPlanLimits(planId);
  const value = limits[feature];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  return false;
}

export interface PlanEntitlement {
  plan: UserPlan;
  monthlyAIRequests: number;
  monthlyTokens: number;
  allowedSkills: SkillName[];
  maxProducts: number;
  maxAutomations: number;
  voiceEnabled: boolean;
  shoppingAssistantEnabled: boolean;
  advancedAnalytics: boolean;
  priorityProcessing: boolean;
}

export const PLAN_ENTITLEMENTS: Record<UserPlan, PlanEntitlement> = {
  free: {
    plan: 'free',
    monthlyAIRequests: 20,
    monthlyTokens: 50_000,
    allowedSkills: ['content', 'translation', 'business_coach'],
    maxProducts: 25,
    maxAutomations: 0,
    voiceEnabled: false,
    shoppingAssistantEnabled: false,
    advancedAnalytics: false,
    priorityProcessing: false,
  },
  business: {
    plan: 'business',
    monthlyAIRequests: 200,
    monthlyTokens: 1_000_000,
    allowedSkills: [
      'content', 'translation', 'marketing', 'inventory', 'support',
      'business_coach', 'analytics', 'sales', 'finance', 'design',
      'seo', 'security', 'shopping_assistant', 'automation',
    ],
    maxProducts: 500,
    maxAutomations: 10,
    voiceEnabled: false,
    shoppingAssistantEnabled: true,
    advancedAnalytics: true,
    priorityProcessing: true,
  },
  pro: {
    plan: 'pro',
    monthlyAIRequests: 1000,
    monthlyTokens: 5_000_000,
    allowedSkills: [
      'content', 'translation', 'marketing', 'inventory', 'support',
      'business_coach', 'analytics', 'sales', 'finance', 'design',
      'seo', 'security', 'shopping_assistant', 'automation', 'voice',
    ],
    maxProducts: Infinity,
    maxAutomations: 50,
    voiceEnabled: true,
    shoppingAssistantEnabled: true,
    advancedAnalytics: true,
    priorityProcessing: true,
  },
  beta: {
    plan: 'beta',
    monthlyAIRequests: 20,
    monthlyTokens: 50_000,
    allowedSkills: [
      'content', 'translation', 'business_coach',
    ],
    maxProducts: 25,
    maxAutomations: 0,
    voiceEnabled: false,
    shoppingAssistantEnabled: false,
    advancedAnalytics: false,
    priorityProcessing: false,
  },
};

// ---------------------------------------------------------------------------
// API Contract (Edge → AI Service)
// ---------------------------------------------------------------------------

export interface EdgeToAIRequest {
  requestId: string;
  tenantId: TenantId;
  userId: UserId;
  userPlan: UserPlan;
  message: string;
  language: string;
  conversationId: string;
  recentHistory: ChatMessage[];
  shopContextSummary: ShopContext;
  voiceInput?: boolean;
}

export interface EdgeToAIResponse {
  requestId: string;
  conversationId: string;
  reply: string;
  contentBlocks: ContentBlock[];
  pendingApproval?: ApprovalRequest;
  skillsUsed: SkillName[];
  actionsExecuted: ExecutedAction[];
  usage: OrchestratorUsage;
  language: string;
  suggestedFollowUps: string[];
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type FeraErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'TENANT_MISMATCH'
  | 'PLAN_LIMIT_EXCEEDED'
  | 'SKILL_NOT_AVAILABLE'
  | 'APPROVAL_EXPIRED'
  | 'APPROVAL_NOT_FOUND'
  | 'PROVIDER_UNAVAILABLE'
  | 'INVALID_AI_OUTPUT'
  | 'TOOL_EXECUTION_FAILED'
  | 'RATE_LIMITED'
  | 'INVALID_REQUEST';

export interface FeraError {
  code: FeraErrorCode;
  message: string;
  requestId?: string;
  details?: unknown;
}
