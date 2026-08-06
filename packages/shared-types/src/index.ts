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

export type UserPlan = 'free' | 'starter' | 'business' | 'beta';

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
// Plan Entitlements
// ---------------------------------------------------------------------------

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
    maxProducts: 10,
    maxAutomations: 0,
    voiceEnabled: false,
    shoppingAssistantEnabled: false,
    advancedAnalytics: false,
    priorityProcessing: false,
  },
  starter: {
    plan: 'starter',
    monthlyAIRequests: 200,
    monthlyTokens: 500_000,
    allowedSkills: ['content', 'translation', 'marketing', 'inventory', 'support', 'business_coach', 'analytics'],
    maxProducts: 100,
    maxAutomations: 3,
    voiceEnabled: false,
    shoppingAssistantEnabled: false,
    advancedAnalytics: false,
    priorityProcessing: false,
  },
  business: {
    plan: 'business',
    monthlyAIRequests: 2000,
    monthlyTokens: 5_000_000,
    allowedSkills: [
      'content', 'translation', 'marketing', 'inventory', 'support',
      'business_coach', 'analytics', 'sales', 'finance', 'design',
      'seo', 'security', 'shopping_assistant', 'automation', 'voice',
    ],
    maxProducts: 5000,
    maxAutomations: 50,
    voiceEnabled: true,
    shoppingAssistantEnabled: true,
    advancedAnalytics: true,
    priorityProcessing: true,
  },
  beta: {
    plan: 'beta',
    monthlyAIRequests: 100,
    monthlyTokens: 250_000,
    allowedSkills: [
      'content', 'translation', 'marketing', 'inventory', 'business_coach', 'analytics', 'support',
    ],
    maxProducts: 100,
    maxAutomations: 5,
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
