// =============================================================================
// Fera AI — Shared Skill Types and Helpers
// =============================================================================

import type { RouterRequest, AIResponse } from '../router.js';

// Re-export common skill types so each skill only imports from one place
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

export interface SkillFinding {
  title: string;
  explanation: string;
  confidence: number;
  evidence: Array<{
    sourceType: string;
    sourceId: string;
    label?: string;
  }>;
}

export interface ProposedAction {
  toolName: string;
  riskLevel: RiskLevel;
  input: Record<string, unknown>;
  preview: string;
  reversible: boolean;
  requiresApproval: boolean;
  affectedRecords?: Array<{ type: string; id: string; label: string }>;
}

export interface SkillRecommendation {
  title: string;
  reason: string;
  expectedImpact?: string;
  priority: 'low' | 'medium' | 'high';
  action?: ProposedAction;
}

export interface ContentBlock {
  type: string;
  [key: string]: unknown;
}

export interface SkillResult {
  skill: SkillName;
  summary: string;
  findings: SkillFinding[];
  recommendations: SkillRecommendation[];
  warnings: string[];
  contentBlocks?: ContentBlock[];
  clarificationNeeded?: string;
  executionTimeMs?: number;
}

export interface ShopContext {
  tenantId: string;
  shopName: string;
  businessCategory: string;
  language: string;
  currency: string;
  timeZone: string;
  plan: string;
  productSummary: {
    totalProducts: number;
    activeProducts: number;
    lowStockCount: number;
    outOfStockCount: number;
    categories: string[];
    topProducts: Array<{
      id: string;
      name: string;
      price: number;
      stock: number;
      category: string;
      isLowStock: boolean;
      weeklySales?: number;
    }>;
  };
  orderSummary: {
    todayOrders: number;
    todayRevenue: number;
    weekOrders: number;
    weekRevenue: number;
    pendingOrders: number;
    recentOrders: Array<{
      id: string;
      customerName: string;
      total: number;
      status: string;
      createdAt: string;
      itemCount: number;
    }>;
  };
  recentRecommendations: Array<{
    id: string;
    summary: string;
    outcome?: 'accepted' | 'rejected' | 'pending';
    createdAt: string;
  }>;
  businessGoals: string[];
  sessionFacts: Record<string, string>;
}

export interface SkillInput {
  message: string;
  language: string;
  shopContext: ShopContext;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  extraContext?: string;
}

export type RouterFn = (req: RouterRequest) => Promise<AIResponse>;

/**
 * Build a minimal context block for the AI prompt.
 * Never dumps the full database — only aggregated summaries.
 */
export function buildContextBlock(ctx: ShopContext): string {
  const { productSummary: ps, orderSummary: os } = ctx;
  return `
SHOP: ${ctx.shopName} (${ctx.businessCategory})
LANGUAGE: ${ctx.language} | PLAN: ${ctx.plan}
PRODUCTS: ${ps.totalProducts} total, ${ps.activeProducts} active, ${ps.lowStockCount} low stock, ${ps.outOfStockCount} out of stock
TOP PRODUCTS: ${ps.topProducts.slice(0, 5).map(p => `${p.name} ₹${p.price} (stock: ${p.stock})`).join(', ')}
ORDERS TODAY: ${os.todayOrders} orders, ₹${os.todayRevenue} revenue
ORDERS THIS WEEK: ${os.weekOrders} orders, ₹${os.weekRevenue} revenue
PENDING ORDERS: ${os.pendingOrders}
CATEGORIES: ${ps.categories.join(', ')}
`.trim();
}

/** Strip <think>...</think> tags from model output */
export function stripThinkTags(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

/** Build an empty (no-op) skill result for graceful degradation */
export function emptySkillResult(skill: SkillName, summary: string): SkillResult {
  return { skill, summary, findings: [], recommendations: [], warnings: [] };
}
