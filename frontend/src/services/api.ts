import axios from 'axios';
import { getWorkOSToken, clearCachedToken, notifyUnauthorized } from './authBridge';
import { generateCanonicalStorefront } from '../utils/canonicalHostname';

const USE_LOCAL_STORAGE_API = import.meta.env?.VITE_USE_LOCAL_STORAGE === 'true';

interface LocalUser {
  id: string;
  email: string;
  password?: string;
  password_hash?: string;
  password_salt?: string;
  name: string;
  phone?: string;
  business_name?: string;
  plan: 'free' | 'premium' | 'trial' | 'basic' | 'standard' | 'business' | 'pro' | 'beta' | 'starter';
  market?: 'IN' | 'US' | 'EU' | 'OTHER';
  trial_started_at?: string;
  trial_ends_at?: string;
  cancel_at_period_end?: number | boolean;
  preferred_language: string;
  subdomain?: string;
  hostname?: string;
  city?: string;
  district?: string;
  state?: string;
  custom_domain?: string;
  plan_expires_at?: string;
  ai_credits_balance?: number;
  ai_credits_monthly_limit?: number;
  ai_credits_used_month?: number;
  ai_credits_reset_at?: string;
  storage_used_bytes?: number;
  storage_limit_bytes?: number;
  created_at: string;
}

interface LocalProduct {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  cost_price?: number;
  price: number;
  sale_price?: number | null;
  category: string;
  stock_quantity: number;
  image_url?: string;
  is_active: boolean;
  status?: string;
  sku?: string;
  barcode?: string;
  options?: any[];
  variants?: any[];
  created_at: string;
  updated_at: string;
}

interface LocalOrder {
  id: string;
  user_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address?: string;
  items: Array<{ product_id: string; product_name: string; quantity: number; price: number }>;
  total: number;
  delivery_type: 'delivery' | 'pickup';
  status: string;
  payment_status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface LocalWebsite {
  id: string;
  user_id: string;
  name: string;
  template: string;
  theme?: any;
  sections: unknown[];
  config: Record<string, unknown>;
  is_published: 0 | 1;
  created_at: string;
  updated_at: string;
}

interface LocalSurveySubmission {
  id: string;
  user_id: string;
  answers_json: string;
  feedback: string;
  contact?: string;
  ai_summary_json?: string;
  created_at: string;
}

interface LocalDb {
  users: LocalUser[];
  products: LocalProduct[];
  orders: LocalOrder[];
  websites: LocalWebsite[];
  survey_submissions: LocalSurveySubmission[];
}

const LOCAL_DB_KEY = 'fera_local_db_v1';
const LOCAL_OTP_KEY = 'fera_local_otp_v1';
const MAX_MESSAGE_PREVIEW_LENGTH = 120;
const LOCAL_PAYMENT_PROVIDER_KEY = 'local_mock';
const SURVEY_QUESTIONS = [
  { id: 'usage_frequency', question: 'How often do you use FeraSetu in a typical week?' },
  { id: 'main_goal', question: 'What is your main goal with FeraSetu right now?' },
  { id: 'biggest_pain', question: 'What is the biggest pain point you face while using the product?' },
  { id: 'missing_feature', question: 'Which feature do you feel is missing today?' },
  { id: 'upgrade_reason', question: 'What would make you upgrade to a paid plan later?' },
  { id: 'urgency', question: 'How urgent are these improvements for your business? (high/medium/low)' },
  { id: 'willingness_to_pay', question: 'After beta, would you pay for this plan if your key needs are solved? (yes/maybe/no)' }
];

const now = () => new Date().toISOString();
const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in (crypto as any)) {
    return (crypto as any).randomUUID();
  }
  if (typeof crypto !== 'undefined' && 'getRandomValues' in (crypto as any)) {
    const bytes = new Uint8Array(16);
    (crypto as any).getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
};

const secureRandomDigits = (count: number): string => {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in (crypto as any)) {
    const array = new Uint32Array(count);
    (crypto as any).getRandomValues(array);
    return Array.from(array, n => (n % 10).toString()).join('');
  }
  return Math.floor(Math.pow(10, count - 1) + Math.random() * 9 * Math.pow(10, count - 1)).toString();
};

const parseSalePrice = (value: unknown): number | null =>
  value === null || value === undefined || value === '' ? null : Number(value);

const createResponse = <T>(data: T, status = 200) => ({
  data,
  status,
  statusText: status === 201 ? 'Created' : 'OK',
  headers: {},
  config: {},
});

const createHttpError = (status: number, message: string) => {
  const error = new Error(message) as Error & {
    response: { status: number; data: { message: string } };
  };
  error.response = { status, data: { message } };
  return error;
};

function loadDb(): LocalDb {
  const raw = localStorage.getItem(LOCAL_DB_KEY);
  if (!raw) {
    return { users: [], products: [], orders: [], websites: [], survey_submissions: [] };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<LocalDb>;
    return {
      users: parsed.users || [],
      products: parsed.products || [],
      orders: parsed.orders || [],
      websites: parsed.websites || [],
      survey_submissions: parsed.survey_submissions || [],
    };
  } catch {
    return { users: [], products: [], orders: [], websites: [], survey_submissions: [] };
  }
}

function saveDb(db: LocalDb): void {
  localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(db));
}

function getCurrentUserId(): string | null {
  try {
    const rawUser = localStorage.getItem('fera_user');
    if (!rawUser) return null;
    const parsed = JSON.parse(rawUser) as { id?: string };
    return parsed.id || null;
  } catch {
    return null;
  }
}

function userPublicData(user: LocalUser) {
  const { password, password_hash, password_salt, ...safeUser } = user;
  return {
    ...safeUser,
    hostname: safeUser.hostname || (safeUser.subdomain ? `${safeUser.subdomain}.ferasetu.com` : undefined),
  };
}

function generateSubdomain(value: string): string {
  return value
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    salt: encoder.encode(salt),
    iterations: 100000,
    hash: 'SHA-256',
  }, keyMaterial, 256);
  return Array.from(new Uint8Array(bits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const createSalt = () => createId().slice(0, 32);

function splitUrl(url: string): { path: string; query: URLSearchParams } {
  const parsed = new URL(url, 'http://local.test');
  return { path: parsed.pathname, query: parsed.searchParams };
}

function requireAuth(): string {
  const userId = getCurrentUserId();
  if (!userId) throw createHttpError(401, 'Unauthorized');
  return userId;
}

function getPeriodDays(period: string): number {
  switch (period) {
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    case '1y': return 365;
    default: return 30;
  }
}

function buildRevenueChart(orders: LocalOrder[], days = 30): Array<{ date: string; revenue: number; orders: number }> {
  const buckets = new Map<string, { date: string; revenue: number; orders: number }>();
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    buckets.set(date, { date: date.slice(5), revenue: 0, orders: 0 });
  }

  orders.forEach(order => {
    const key = order.created_at.slice(0, 10);
    const existing = buckets.get(key);
    if (!existing) return;
    existing.revenue += order.total || 0;
    existing.orders += 1;
  });

  return Array.from(buckets.values());
}

async function localGet(url: string) {
  const { path, query } = splitUrl(url);
  const db = loadDb();

  if (path === '/users/me') {
    const userId = getCurrentUserId();
    if (!userId) {
      return Promise.resolve(createResponse({ needs_init: true, user: { name: 'New User', email: '' } }));
    }
    const user = db.users.find(u => u.id === userId);
    if (!user) {
      return Promise.resolve(createResponse({ needs_init: true, user: { name: 'New User', email: '' } }));
    }
    return Promise.resolve(createResponse({ needs_init: false, user: userPublicData(user) }));
  }

  if (path === '/products') {
    const userId = requireAuth();
    const products = db.products.filter(p => p.user_id === userId);
    return Promise.resolve(createResponse({ products }));
  }

  if (path === '/gift-cards') {
    const userId = requireAuth();
    const products = db.products.filter(p => p.user_id === userId && (p.category === 'Gift Cards' || (p as any).is_gift_card));
    const rawCards = localStorage.getItem('fera_local_issued_gift_cards_v1') || '[]';
    let issued_cards: any[] = [];
    try { issued_cards = JSON.parse(rawCards); } catch { issued_cards = []; }
    issued_cards = issued_cards.filter((card: any) => card.user_id === userId);
    const total_issued_value = issued_cards.reduce((acc: number, c: any) => acc + (Number(c.initial_value) || 0), 0);
    const outstanding = issued_cards.reduce((acc: number, c: any) => acc + (Number(c.balance) || 0), 0);
    const redeemed = Math.max(0, total_issued_value - outstanding);

    return Promise.resolve(createResponse({
      success: true,
      products,
      issued_cards,
      stats: {
        total_products: products.length,
        total_issued_cards: issued_cards.length,
        total_issued_value,
        outstanding_balance_obligation: outstanding,
        total_redeemed_value: redeemed,
        currency: 'INR',
      }
    }));
  }

  if (path === '/customers/segments') {
    const raw = localStorage.getItem('fera_local_customer_segments_v1') || '[]';
    let segments: any[] = [];
    try { segments = JSON.parse(raw); } catch { segments = []; }
    return Promise.resolve(createResponse({
      success: true,
      segments,
      templates: [
        {
          id: 'subscribers-no-orders',
          name: 'Email subscribers who haven’t purchased yet',
          description: 'Subscribed to emails but 0 completed orders. Perfect for first-purchase welcome discount.',
          query_type: 'template',
          conjunction: 'AND',
          rules: [
            { field: 'orders_count', operator: 'equals', value: 0 },
            { field: 'email_subscribed', operator: 'equals', value: true }
          ]
        },
        {
          id: 'repeat-customers',
          name: 'Repeat loyal buyers',
          description: 'Customers with 2 or more orders placed.',
          query_type: 'template',
          conjunction: 'AND',
          rules: [
            { field: 'orders_count', operator: 'greater_than_or_equal', value: 2 }
          ]
        },
        {
          id: 'high-value-spenders',
          name: 'High lifetime value (VIP)',
          description: 'Shoppers who have spent ₹2,500 or more in your shop.',
          query_type: 'template',
          conjunction: 'AND',
          rules: [
            { field: 'total_spent', operator: 'greater_than_or_equal', value: 2500 }
          ]
        }
      ]
    }));
  }

  if (path === '/transfers/locations') {
    const raw = localStorage.getItem('fera_local_inventory_locations_v1');
    let locations = [
      { id: 'loc-wh-1', name: 'Main Warehouse (Central Godown)', type: 'warehouse', address: 'Plot 42, Industrial Area', city: 'Delhi', is_default: 1 },
      { id: 'loc-st-1', name: 'Primary Retail Dukaan (Front Store)', type: 'store', address: 'Shop 12, Main Market', city: 'Delhi', is_default: 0 },
      { id: 'loc-sp-1', name: 'Regional Wholesale Supplier', type: 'supplier', address: 'APMC Market Yard', city: 'Karnal', is_default: 0 },
      { id: 'loc-hb-1', name: 'Express Delivery Hub', type: 'hub', address: 'Ring Road Depot', city: 'Gurugram', is_default: 0 },
    ];
    if (raw) {
      try { locations = JSON.parse(raw); } catch {}
    } else {
      localStorage.setItem('fera_local_inventory_locations_v1', JSON.stringify(locations));
    }
    return Promise.resolve(createResponse({ success: true, locations }));
  }

  if (path === '/transfers') {
    const raw = localStorage.getItem('fera_local_inventory_transfers_v1') || '[]';
    let transfers: any[] = [];
    try { transfers = JSON.parse(raw); } catch { transfers = []; }
    const stats = {
      total_transfers: transfers.length,
      in_transit: transfers.filter((t: any) => t.status === 'in_transit').length,
      drafts: transfers.filter((t: any) => t.status === 'draft').length,
      completed: transfers.filter((t: any) => t.status === 'completed' || t.status === 'received').length,
      total_units_in_transit: transfers
        .filter((t: any) => t.status === 'in_transit')
        .reduce((sum: number, t: any) => sum + (Number(t.total_units) || 0), 0),
    };
    return Promise.resolve(createResponse({ success: true, transfers, stats }));
  }

  if (path.startsWith('/transfers/')) {
    const id = path.replace('/transfers/', '');
    const raw = localStorage.getItem('fera_local_inventory_transfers_v1') || '[]';
    let transfers: any[] = [];
    try { transfers = JSON.parse(raw); } catch { transfers = []; }
    const found = transfers.find((t: any) => t.id === id);
    if (!found) throw createHttpError(404, 'Transfer not found');
    return Promise.resolve(createResponse({ success: true, transfer: found }));
  }

  if (path === '/orders') {
    const userId = requireAuth();
    const orders = db.orders
      .filter(o => o.user_id === userId)
      .map(o => ({ ...o, items_count: o.items?.length || 0 }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return Promise.resolve(createResponse({ orders }));
  }

  if (path === '/orders/intelligence') {
    const userId = requireAuth();
    const orders = db.orders.filter(o => o.user_id === userId);
    const userProducts = db.products.filter(p => p.user_id === userId);
    const productCostMap = {};
    for (const p of userProducts) {
      if (p.cost_price != null) productCostMap[p.id] = Number(p.cost_price);
    }
    const customerMap = new Map();
    let totalRevenue = 0;
    let totalGrossProfit = 0;
    let totalCancelledCount = 0;
    let totalCancelledValue = 0;
    const analyzedOrders = [];
    for (const ord of orders) {
      const isCancelled = ord.status === 'cancelled';
      const orderTotal = Number(ord.total) || 0;
      let orderCost = 0;
      let totalUnits = 0;
      for (const it of (ord.items || [])) {
        const qty = Number(it.quantity || 1);
        totalUnits += qty;
        const unitCost = productCostMap[it.product_id] ?? (Number(it.price || 0) * 0.65);
        orderCost += unitCost * qty;
      }
      const orderProfit = Math.round((orderTotal - orderCost) * 100) / 100;
      const marginPercent = orderTotal > 0 ? Math.round((orderProfit / orderTotal) * 100) : 0;
      const isLoss = isCancelled || orderProfit <= 0;
      if (!isCancelled) {
        totalRevenue += orderTotal;
        totalGrossProfit += orderProfit;
      } else {
        totalCancelledCount++;
        totalCancelledValue += orderTotal;
      }
      const riskFlags = [];
      let riskScore = 10;
      const phoneDigits = (ord.customer_phone || '').replace(/\D/g, '');
      if (phoneDigits && /^(\d)\1{6,}$/.test(phoneDigits)) {
        riskFlags.push('Suspicious phone number pattern (repeated digits)');
        riskScore += 45;
      }
      if (totalUnits >= 15) {
        riskFlags.push(`Abnormally high cart volume ( units)`);
        riskScore += 30;
      }
      if (ord.delivery_type === 'delivery' && ord.payment_status === 'unpaid' && orderTotal >= 5000) {
        riskFlags.push('High-value Cash on Delivery (> ₹5,000) unverified COD risk');
        riskScore += 35;
      }
      const riskLevel = riskScore >= 60 ? 'high' : (riskScore >= 35 ? 'medium' : 'safe');
      analyzedOrders.push({
        id: ord.id,
        customer_name: ord.customer_name,
        customer_phone: ord.customer_phone,
        total: orderTotal,
        order_cost: orderCost,
        gross_profit: orderProfit,
        margin_percent: marginPercent,
        is_profitable: !isCancelled && orderProfit > 0,
        is_loss: isLoss,
        status: ord.status,
        payment_status: ord.payment_status,
        created_at: ord.created_at,
        risk_score: Math.min(100, riskScore),
        risk_level: riskLevel,
        risk_flags: riskFlags,
        items_count: ord.items?.length || 0,
        units_count: totalUnits
      });
      const custKey = ord.customer_phone || ord.customer_name || 'unknown';
      let c = customerMap.get(custKey);
      if (!c) {
        c = {
          id: `cust_`,
          name: ord.customer_name,
          phone: ord.customer_phone,
          total_orders: 0,
          completed_orders: 0,
          cancelled_orders: 0,
          total_spent: 0,
          total_profit: 0,
          average_order_value: 0,
          cancellation_rate: 0,
          is_profitable: true,
          is_loss: false,
          ai_risk: 'safe',
          risk_flags: []
        };
        customerMap.set(custKey, c);
      }
      c.total_orders++;
      if (isCancelled) {
        c.cancelled_orders++;
      } else {
        c.completed_orders++;
        c.total_spent += orderTotal;
        c.total_profit += orderProfit;
      }
    }
    const customersList = Array.from(customerMap.values()).map(c => {
      const cancelRate = c.total_orders > 0 ? (c.cancelled_orders / c.total_orders) : 0;
      const isSuspicious = c.cancelled_orders >= 2 && cancelRate >= 0.5;
      return {
        ...c,
        total_spent: Math.round(c.total_spent * 100) / 100,
        total_profit: Math.round(c.total_profit * 100) / 100,
        average_order_value: c.completed_orders > 0 ? Math.round(c.total_spent / c.completed_orders) : 0,
        cancellation_rate: Math.round(cancelRate * 100),
        is_profitable: c.total_profit > 0,
        is_loss: isSuspicious || c.total_profit <= 0,
        ai_risk: isSuspicious ? 'suspicious' : 'safe',
        risk_flags: isSuspicious ? ['High cancellation rate'] : []
      };
    });
    const topBuyers = [...customersList].sort((a, b) => b.total_spent - a.total_spent).slice(0, 10);
    const profitableCustomers = [...customersList].filter(c => c.is_profitable).sort((a, b) => b.total_profit - a.total_profit).slice(0, 10);
    const lossCustomers = [...customersList].filter(c => c.is_loss).sort((a, b) => a.total_profit - b.total_profit);
    const profitableOrders = analyzedOrders.filter(o => o.is_profitable).sort((a, b) => b.gross_profit - a.gross_profit).slice(0, 10);
    const lossOrders = analyzedOrders.filter(o => o.is_loss).sort((a, b) => a.gross_profit - b.gross_profit).slice(0, 10);
    const suspiciousOrders = analyzedOrders.filter(o => o.risk_level === 'high' || o.risk_level === 'medium').sort((a, b) => b.risk_score - a.risk_score);
    const overallMargin = totalRevenue > 0 ? Math.round((totalGrossProfit / totalRevenue) * 100) : 0;
    return Promise.resolve(createResponse({
      success: true,
      summary: {
        total_orders: orders.length,
        total_revenue: Math.round(totalRevenue * 100) / 100,
        total_estimated_profit: Math.round(totalGrossProfit * 100) / 100,
        overall_margin_percent: overallMargin,
        total_cancelled_orders: totalCancelledCount,
        total_cancelled_value: Math.round(totalCancelledValue * 100) / 100,
        top_buyer: topBuyers.length > 0 && topBuyers[0].total_spent > 0 ? topBuyers[0] : null,
        profitable_customers_count: profitableCustomers.length,
        loss_customers_count: lossCustomers.length,
        suspicious_orders_count: suspiciousOrders.length
      },
      top_buyers: topBuyers,
      profitable_customers: profitableCustomers,
      loss_customers: lossCustomers,
      profitable_orders: profitableOrders,
      loss_orders: lossOrders,
      suspicious_orders: suspiciousOrders
    }));
  }

  if (path === '/website') {
    const userId = requireAuth();
    const website = db.websites.find(w => w.user_id === userId);
    if (!website) throw createHttpError(404, 'Website not found');
    return Promise.resolve(createResponse(website));
  }

  if (path === '/website/settings') {
    const userId = requireAuth();
    const website = db.websites.find(w => w.user_id === userId);
    const user = db.users.find(u => u.id === userId);
    const slug = user?.subdomain || 'store';
    const defaults = {
      show_on_google: true,
      show_on_bing: true,
      search_engine_indexing: true,
      auto_sitemap: true,
      show_on_local_maps: true,
      show_business_hours: true,
      meta_title: website?.name || user?.business_name || user?.name || 'Online Store',
      meta_description: 'Welcome to our official online store. Explore our full catalog with 0% platform markup, fast local delivery, and direct WhatsApp ordering.',
      keywords: 'online store, kirana, fresh products, fast delivery, local retail',
      social_share_image: '',
      canonical_url: `https://${slug}.ferasetu.com`,
      maintenance_mode: false,
      require_customer_login: false,
      google_analytics_id: '',
      facebook_pixel_id: '',
    };
    const saved = ((website?.config as any)?.seo || (website?.config as any)?.settings || {});
    return Promise.resolve(createResponse({
      success: true,
      settings: { ...defaults, ...saved },
      website_id: website?.id || null,
      is_published: website ? Boolean(website.is_published) : false,
      store_url: `https://${slug}.ferasetu.com`,
    }));
  }

  if (path === '/builder/draft') {
    const userId = requireAuth();
    const website = db.websites.find(w => w.user_id === userId);
    if (!website) {
      return Promise.resolve(createResponse({ draft: null, version: 1, exists: false }));
    }
    const draft = {
      name: website.name,
      template: website.template || 'market',
      activePageId: 'page_home',
      pages: [
        {
          id: 'page_home',
          name: 'Home',
          slug: '/',
          title: website.name,
          nodes: website.sections || [],
        },
      ],
      theme: website.theme || { id: website.template || 'market' },
      config: website.config || {},
      tokens: {
        colors: { primary: '#0F172A', secondary: '#16A34A', background: '#ffffff', text: '#111827' },
        typography: { fontFamily: 'sans', headingFont: 'sans', baseFontSize: 16 },
      },
      workflows: [],
    };
    return Promise.resolve(createResponse({ draft, version: 1, exists: true, updated_at: website.updated_at }));
  }

  if (path === '/builder/connections') {
    return Promise.resolve(createResponse({ connections: [] }));
  }

  if (path === '/builder/versions') {
    return Promise.resolve(createResponse({ versions: [] }));
  }

  if (path === '/website/templates') {
    const templates = [
      {
        id: 'grocery',
        name: 'Grocery Store',
        description: 'Clean layout for kirana and grocery shops.',
        category: 'Retail',
        primaryColor: '#2E7D32',
        accentColor: '#FF6B35',
        emoji: '🛒',
        defaultSections: [
          { id: 'navbar-1', type: 'navbar', config: { shopName: 'My Store' } },
          { id: 'hero-1', type: 'hero', config: { headline: 'Fresh items delivered fast' } },
          { id: 'products-1', type: 'productGrid', config: { title: 'Our Products', columns: 3 } },
          { id: 'contact-1', type: 'contact', config: { phone: '+91 98765 43210' } },
          { id: 'footer-1', type: 'footer', config: { shopName: 'My Store' } },
        ],
      },
      {
        id: 'general',
        name: 'General Store',
        description: 'Simple all-purpose layout for local shops.',
        category: 'Business',
        primaryColor: '#004E89',
        accentColor: '#FF6B35',
        emoji: '🏪',
        defaultSections: [
          { id: 'navbar-1', type: 'navbar', config: { shopName: 'My Store' } },
          { id: 'hero-1', type: 'hero', config: { headline: 'Everything you need in one place' } },
          { id: 'banner-1', type: 'banner', config: { text: 'Best quality, best service' } },
          { id: 'products-1', type: 'productGrid', config: { title: 'Featured Products', columns: 3 } },
          { id: 'footer-1', type: 'footer', config: { shopName: 'My Store' } },
        ],
      },
      {
        id: 'fashion',
        name: 'Fashion Boutique',
        description: 'Modern design for clothing and fashion stores.',
        category: 'Retail',
        primaryColor: '#8B5CF6',
        accentColor: '#EC4899',
        emoji: '👗',
        defaultSections: [
          { id: 'navbar-1', type: 'navbar', config: { shopName: 'My Store' } },
          { id: 'hero-1', type: 'hero', config: { headline: 'Discover Your Style' } },
          { id: 'products-1', type: 'productGrid', config: { title: 'Latest Collection', columns: 4 } },
          { id: 'banner-1', type: 'banner', config: { text: 'Exclusive Offers Now Live!' } },
          { id: 'contact-1', type: 'contact', config: { phone: '+91 98765 43210' } },
          { id: 'footer-1', type: 'footer', config: { shopName: 'My Store' } },
        ],
      },
      {
        id: 'electronics',
        name: 'Electronics Store',
        description: 'Professional layout for tech and gadget retailers.',
        category: 'Tech',
        primaryColor: '#1F2937',
        accentColor: '#3B82F6',
        emoji: '📱',
        defaultSections: [
          { id: 'navbar-1', type: 'navbar', config: { shopName: 'My Store' } },
          { id: 'hero-1', type: 'hero', config: { headline: 'Latest Tech at Best Prices' } },
          { id: 'products-1', type: 'productGrid', config: { title: 'Featured Tech', columns: 3 } },
          { id: 'banner-1', type: 'banner', config: { text: 'Fast Delivery & Warranty' } },
          { id: 'contact-1', type: 'contact', config: { phone: '+91 98765 43210' } },
          { id: 'footer-1', type: 'footer', config: { shopName: 'My Store' } },
        ],
      },
      {
        id: 'restaurant',
        name: 'Restaurant & Food',
        description: 'Appetizing design for food businesses and restaurants.',
        category: 'Food & Beverage',
        primaryColor: '#DC2626',
        accentColor: '#F59E0B',
        emoji: '🍕',
        defaultSections: [
          { id: 'navbar-1', type: 'navbar', config: { shopName: 'My Store' } },
          { id: 'hero-1', type: 'hero', config: { headline: 'Delicious Food Delivered' } },
          { id: 'products-1', type: 'productGrid', config: { title: 'Our Specialties', columns: 3 } },
          { id: 'banner-1', type: 'banner', config: { text: 'Order Now, Enjoy Later!' } },
          { id: 'contact-1', type: 'contact', config: { phone: '+91 98765 43210' } },
          { id: 'footer-1', type: 'footer', config: { shopName: 'My Store' } },
        ],
      },
      {
        id: 'services',
        name: 'Services & Salon',
        description: 'Elegant design for service-based businesses.',
        category: 'Services',
        primaryColor: '#E91E63',
        accentColor: '#673AB7',
        emoji: '✂️',
        defaultSections: [
          { id: 'navbar-1', type: 'navbar', config: { shopName: 'My Store' } },
          { id: 'hero-1', type: 'hero', config: { headline: 'Your Trusted Service Partner' } },
          { id: 'products-1', type: 'productGrid', config: { title: 'Our Services', columns: 3 } },
          { id: 'banner-1', type: 'banner', config: { text: 'Book Your Appointment Today' } },
          { id: 'contact-1', type: 'contact', config: { phone: '+91 98765 43210' } },
          { id: 'footer-1', type: 'footer', config: { shopName: 'My Store' } },
        ],
      },
      {
        id: 'photography',
        name: 'Photography Portfolio',
        description: 'Showcase design for photographers and creative studios.',
        category: 'Creative',
        primaryColor: '#1A1A1A',
        accentColor: '#FFD700',
        emoji: '📸',
        defaultSections: [
          { id: 'navbar-1', type: 'navbar', config: { shopName: 'My Store' } },
          { id: 'hero-1', type: 'hero', config: { headline: 'Capturing Life\'s Beautiful Moments' } },
          { id: 'products-1', type: 'productGrid', config: { title: 'Portfolio', columns: 4 } },
          { id: 'banner-1', type: 'banner', config: { text: 'Professional Photography Services' } },
          { id: 'contact-1', type: 'contact', config: { phone: '+91 98765 43210' } },
          { id: 'footer-1', type: 'footer', config: { shopName: 'My Store' } },
        ],
      },
      {
        id: 'blog',
        name: 'Blog & Magazine',
        description: 'Content-focused design for blogs and digital publications.',
        category: 'Content',
        primaryColor: '#5B21B6',
        accentColor: '#06B6D4',
        emoji: '📰',
        defaultSections: [
          { id: 'navbar-1', type: 'navbar', config: { shopName: 'My Store' } },
          { id: 'hero-1', type: 'hero', config: { headline: 'Read Our Latest Stories' } },
          { id: 'products-1', type: 'productGrid', config: { title: 'Featured Articles', columns: 2 } },
          { id: 'banner-1', type: 'banner', config: { text: 'Subscribe for Updates' } },
          { id: 'contact-1', type: 'contact', config: { phone: '+91 98765 43210' } },
          { id: 'footer-1', type: 'footer', config: { shopName: 'My Store' } },
        ],
      },
    ];
    return Promise.resolve(createResponse({ templates }));
  }

  if (path === '/analytics/dashboard') {
    const userId = requireAuth();
    const products = db.products.filter(p => p.user_id === userId);
    const orders = db.orders.filter(o => o.user_id === userId);
    const deliveredOrders = orders.filter(o => o.status === 'delivered' || o.status === 'confirmed');
    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => ['pending', 'confirmed', 'preparing', 'out_for_delivery'].includes(o.status)).length;
    const lowStockCount = products.filter(p => p.stock_quantity <= 5).length;
    const productSales = new Map<string, number>();

    orders.forEach(order => {
      (order.items || []).forEach(item => {
        const current = productSales.get(item.product_name) || 0;
        productSales.set(item.product_name, current + (item.quantity || 0));
      });
    });

    const topProduct = [...productSales.entries()]
      .sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

    const summary = {
      total_revenue: totalRevenue,
      total_orders: totalOrders,
      avg_order_value: totalOrders ? Number((totalRevenue / totalOrders).toFixed(2)) : 0,
      top_product: topProduct,
      conversion_rate: 0,
    };

    const todayStr = new Date().toISOString().slice(0, 10);
    const sortedByTotal = orders.slice().sort((a, b) => (b.total || 0) - (a.total || 0));
    const todayOrders = orders.filter(o => o.created_at && o.created_at.startsWith(todayStr));
    const todayTopOrder = todayOrders.sort((a, b) => (b.total || 0) - (a.total || 0))[0] || null;
    const allTimeTopOrder = sortedByTotal[0] || null;

    const distinctBuyers = new Set(orders.map(o => o.customer_phone || o.customer_name).filter(Boolean)).size;
    const totalDifferentCustomers = distinctBuyers;

    const realTopOrderToday = todayTopOrder ? {
      id: todayTopOrder.id,
      customer_name: todayTopOrder.customer_name,
      customer_phone: todayTopOrder.customer_phone,
      total: todayTopOrder.total,
      created_at: todayTopOrder.created_at,
      ip_address: (todayTopOrder as any).ip_address || '',
      items_count: todayTopOrder.items?.length || 1,
      status: todayTopOrder.status || 'delivered',
    } : (allTimeTopOrder ? {
      id: allTimeTopOrder.id,
      customer_name: allTimeTopOrder.customer_name,
      customer_phone: allTimeTopOrder.customer_phone,
      total: allTimeTopOrder.total,
      created_at: allTimeTopOrder.created_at,
      ip_address: (allTimeTopOrder as any).ip_address || '',
      items_count: allTimeTopOrder.items?.length || 1,
      status: allTimeTopOrder.status || 'delivered',
      is_historical: true,
    } : null);

    const realVisitorsCount = Math.max(orders.length, distinctBuyers);

    return Promise.resolve(createResponse({
      stats: {
        total_revenue: totalRevenue,
        total_orders: totalOrders,
        different_customers: totalDifferentCustomers,
        total_visitors: realVisitorsCount,
        unique_visitors: distinctBuyers,
        customer_logins_total: distinctBuyers,
        customer_logins_today: todayOrders.length,
        today_orders_count: todayOrders.length,
        pending_orders: pendingOrders,
        low_stock_count: lowStockCount,
        revenue_change: 0,
        orders_change: 0,
      },
      summary,
      top_order_today: realTopOrderToday,
      all_time_top_order: allTimeTopOrder,
      most_frequent_visitor: null,
      top_visitors: [],
      customer_logins: {
        total: distinctBuyers,
        today: todayOrders.length,
        recent: [],
      },
      visitors: {
        total_visitors: realVisitorsCount,
        unique_visitors: distinctBuyers,
        unique_sessions: distinctBuyers,
        different_customers_count: totalDifferentCustomers,
        most_frequent_visitor: null,
        top_visitors: [],
        geography: [],
        referrers: []
      },
      revenue_chart: buildRevenueChart(orders, 30),
      recent_orders: orders
        .slice()
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 5)
        .map(order => ({
          id: order.id,
          customer_name: order.customer_name,
          total: order.total,
          status: order.status,
          created_at: order.created_at,
          items_count: order.items?.length || 0,
        })),
    }));
  }

  if (path === '/analytics/sales') {
    const userId = requireAuth();
    const period = query.get('period') || '30d';
    const orders = db.orders.filter(o => o.user_id === userId);
    const days = getPeriodDays(period);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const recentOrders = orders.filter(o => new Date(o.created_at).getTime() >= cutoff);
    const userProducts = db.products.filter(p => p.user_id === userId);
    const productById = new Map(userProducts.map(p => [p.id, p]));
    const categoryMap = new Map<string, { name: string; value: number; revenue: number }>();

    recentOrders.forEach(order => {
      (order.items || []).forEach(item => {
        const category = productById.get(item.product_id)?.category || 'Other';
        const current = categoryMap.get(category) || { name: category, value: 0, revenue: 0 };
        current.value += item.quantity || 0;
        current.revenue += (item.quantity || 0) * (item.price || 0);
        categoryMap.set(category, current);
      });
    });

    const todayStr = new Date().toISOString().slice(0, 10);
    const sortedByTotal = orders.slice().sort((a, b) => (b.total || 0) - (a.total || 0));
    const todayOrders = orders.filter(o => o.created_at && o.created_at.startsWith(todayStr));
    const todayTopOrder = todayOrders.sort((a, b) => (b.total || 0) - (a.total || 0))[0] || null;
    const allTimeTopOrder = sortedByTotal[0] || null;

    const mockTopOrderToday = todayTopOrder ? {
      id: todayTopOrder.id,
      customer_name: todayTopOrder.customer_name,
      customer_phone: todayTopOrder.customer_phone,
      total: todayTopOrder.total,
      created_at: todayTopOrder.created_at,
      ip_address: (todayTopOrder as any).ip_address || '103.21.244.15',
      items_count: todayTopOrder.items?.length || 1,
      status: todayTopOrder.status || 'delivered',
    } : (allTimeTopOrder ? {
      id: allTimeTopOrder.id,
      customer_name: allTimeTopOrder.customer_name,
      customer_phone: allTimeTopOrder.customer_phone,
      total: allTimeTopOrder.total,
      created_at: allTimeTopOrder.created_at,
      ip_address: (allTimeTopOrder as any).ip_address || '103.21.244.15',
      items_count: allTimeTopOrder.items?.length || 1,
      status: allTimeTopOrder.status || 'delivered',
      is_historical: true,
    } : {
      id: 'ord_big_1',
      customer_name: 'Virendra Singh',
      customer_phone: '+91 98112 43210',
      total: 5850,
      created_at: new Date().toISOString(),
      ip_address: '103.21.244.15',
      items_count: 5,
      status: 'confirmed',
    });

    const mockMostFrequentVisitor = {
      identifier: 'visitor_viren_98',
      display_name: 'Pooja Verma (Frequent Shopper)',
      visit_count: 18,
      ip_address: '157.34.120.89',
      location: 'South Delhi, Delhi, India',
      device: 'Mobile (Android)',
      last_visited_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    };

    const mockTopVisitors = [
      mockMostFrequentVisitor,
      {
        identifier: 'visitor_amit_12',
        display_name: 'Amit Patel',
        visit_count: 12,
        ip_address: '49.36.182.204',
        location: 'Ahmedabad, Gujarat, India',
        device: 'Desktop (Chrome)',
        last_visited_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      },
      {
        identifier: 'visitor_neha_44',
        display_name: 'Neha Saxena',
        visit_count: 9,
        ip_address: '103.21.244.15',
        location: 'Bengaluru, Karnataka, India',
        device: 'Mobile (iPhone)',
        last_visited_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      },
      {
        identifier: 'visitor_sunil_55',
        display_name: 'Sunil Rao',
        visit_count: 7,
        ip_address: '182.73.190.62',
        location: 'Mumbai, Maharashtra, India',
        device: 'Mobile (Android)',
        last_visited_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      }
    ];

    const customerLogins = {
      total: 38,
      today: 11,
      recent: [
        { id: 'sess_1', customer_name: 'Pooja Verma', customer_phone: '+91 98201 11223', ip_address: '157.34.120.89', created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
        { id: 'sess_2', customer_name: 'Amit Patel', customer_phone: '+91 98450 44556', ip_address: '49.36.182.204', created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString() },
        { id: 'sess_3', customer_name: 'Neha Saxena', customer_phone: '+91 97110 99887', ip_address: '103.21.244.15', created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
        { id: 'sess_4', customer_name: 'Sunil Rao', customer_phone: '+91 98220 55443', ip_address: '182.73.190.62', created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString() },
      ]
    };

    return Promise.resolve(createResponse({
      sales: buildRevenueChart(recentOrders, days),
      category_breakdown: Array.from(categoryMap.values()),
      different_customers: 18,
      most_frequent_visitor: mockMostFrequentVisitor,
      top_visitors: mockTopVisitors,
      top_order_today: mockTopOrderToday,
      all_time_top_order: allTimeTopOrder,
      customer_logins: customerLogins,
      visitors: {
        total_visitors: 142,
        unique_visitors: 96,
        unique_sessions: 96,
        different_customers_count: 18,
        most_frequent_visitor: mockMostFrequentVisitor,
        top_visitors: mockTopVisitors,
      }
    }));
  }

  if (path === '/analytics/predict') {
    return Promise.resolve(createResponse({
      next_week_revenue: 0,
      next_month_revenue: 0,
      trend: 'stable',
      recommendations: ['Add more products and complete orders to unlock prediction insights.'],
      confidence: 0,
    }));
  }

  if (path === '/survey/questions') {
    requireAuth();
    return Promise.resolve(createResponse({ questions: SURVEY_QUESTIONS }));
  }

  if (path === '/survey/submissions') {
    const userId = requireAuth();
    const submissions = db.survey_submissions
      .filter((item) => item.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return Promise.resolve(createResponse({ submissions }));
  }

  if (path === '/auth/public/platform-stats') {
    return Promise.resolve(createResponse({
      totalUsers: db.users.length,
      totalOrders: db.orders.length,
      totalProducts: db.products.length,
      totalRevenue: db.orders.reduce((sum, o) => sum + (o.total || 0), 0),
      activeUsers: db.users.length,
      citiesCount: 0,
      languagesCount: 22,
      uptime: '99.9'
    }));
  }

  if (path === '/survey/submissions/export') {
    const userId = requireAuth();
    const submissions = db.survey_submissions
      .filter((item) => item.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const header = 'created_at,feedback,contact,summary\n';
    const body = submissions
      .map((row) => [row.created_at, row.feedback, row.contact || '', row.ai_summary_json || ''].map(escapeCsv).join(','))
      .join('\n');
    return Promise.resolve(createResponse({ csv: `${header}${body}` }));
  }

  if (path === '/settings/smtp') {
    requireAuth();
    const stored = localStorage.getItem('fera_local_smtp');
    const settings = stored ? JSON.parse(stored) : null;
    if (settings) {
      return Promise.resolve(createResponse({ configured: true, settings: { ...settings, password: undefined }, defaults: { host: '', port: 587, ssl: false, tls: true } }));
    }
    return Promise.resolve(createResponse({
      configured: false,
      settings: {
        provider: 'custom', host: '', port: 587, username: '', sender_name: '',
        sender_email: '', reply_to_email: '', ssl_enabled: false, tls_enabled: true,
        otp_enabled: true, otp_length: 6, otp_expiry_minutes: 10, otp_resend_cooldown: 60,
        otp_max_attempts: 5, otp_subject: 'Verify your email • FeraSetu', otp_body_template: '',
        is_active: false, has_password: false,
      },
      defaults: { host: '', port: 587, ssl: false, tls: true },
    }));
  }

  if (path === '/settings/smtp/provider-defaults') {
    requireAuth();
    return Promise.resolve(createResponse({ host: '', port: 587, ssl: false, tls: true }));
  }

  if (path === '/pricing/founding-offer') {
    return Promise.resolve(createResponse({
      enabled: false,
      slotsTotal: 50,
      slotsUsed: 0,
      slotsRemaining: null,
      plan: 'growth',
      months: 3,
    }));
  }

  if (path === '/announcements' || path.startsWith('/announcements')) {
    return Promise.resolve(createResponse({
      success: true,
      announcements: [
        {
          id: 'ann_builder',
          title: 'Visual Storefront Builder is live',
          content: 'Design your online shop directly from your phone or computer. Arrange product displays, customize your banner, and adjust store colors with instant live previews.',
          category: 'feature',
          badge_label: 'New Feature',
          action_url: '/website-builder',
          action_label: 'Open Store Builder',
          target_plan: 'all',
          is_pinned: 1,
          is_active: 1,
          created_at: new Date().toISOString(),
        },
        {
          id: 'ann_whatsapp',
          title: 'WhatsApp 1-Click checkout for your customers',
          content: 'Customers can now tap one button on your web storefront to send their full order with delivery details directly to your WhatsApp. Keep your personal customer connection with zero intermediaries.',
          category: 'feature',
          badge_label: 'Top Feature',
          action_url: '/orders',
          action_label: 'View Orders',
          target_plan: 'all',
          is_pinned: 0,
          is_active: 1,
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'ann_zero_commission',
          title: 'A note from FeraSetu: 0% marketplace commission always',
          content: 'FeraSetu was built to protect local shopkeepers. We never take a percentage of your sales. 100% of customer payments go directly to your UPI or bank account.',
          category: 'message',
          badge_label: 'From FeraSetu',
          action_url: '/dashboard',
          action_label: 'Go to Dashboard',
          target_plan: 'all',
          is_pinned: 1,
          is_active: 1,
          created_at: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: 'ann_languages',
          title: 'Run your shop in your customer’s native language',
          content: 'Your storefront now supports 48 Indic languages including Hindi, Marathi, Tamil, Telugu, Bengali, Gujarati, Kannada, and Punjabi. Buyers can shop comfortably in their preferred language.',
          category: 'update',
          badge_label: 'Platform Update',
          action_url: '/products',
          action_label: 'View Products',
          target_plan: 'all',
          is_pinned: 0,
          is_active: 1,
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 'ann_ai_copy',
          title: 'Fera AI drafts product titles & details in seconds',
          content: 'Add new items to your catalog in seconds. Take a quick photo or type a short item name, and Fera AI generates ready-to-sell titles, descriptions, and regional tags.',
          category: 'feature',
          badge_label: 'Fera AI',
          action_url: '/ferasetu-ai',
          action_label: 'Try Fera AI',
          target_plan: 'all',
          is_pinned: 0,
          is_active: 1,
          created_at: new Date(Date.now() - 172800000).toISOString(),
        },
        {
          id: 'ann_custom_domains',
          title: 'Connect your own custom shop web address',
          content: 'You can now link your own custom domain (e.g., yourstore.com or yourbrand.in) to your FeraSetu shop with automatic HTTPS encryption and mail-safe DNS record protection.',
          category: 'update',
          badge_label: 'Domain Upgrade',
          action_url: '/settings/email',
          action_label: 'Manage Domains',
          target_plan: 'all',
          is_pinned: 0,
          is_active: 1,
          created_at: new Date(Date.now() - 259200000).toISOString(),
        },
      ]
    }));
  }

  if (path === '/email/settings') {
    requireAuth();
    const storedDomains = JSON.parse(localStorage.getItem('fera_local_email_domains') || '[]');
    const customDomain = storedDomains.find((d: any) => d.domain_type === 'CUSTOM') || null;
    const activeProvider = localStorage.getItem('fera_local_email_provider') || 'FERASETU';
    const extConnRaw = localStorage.getItem('fera_local_external_smtp');
    const extConn = extConnRaw ? JSON.parse(extConnRaw) : null;
    const user = db.users.find(u => u.id === getCurrentUserId());
    const slug = user?.subdomain || 'store-1';

    return Promise.resolve(createResponse({
      activeProvider,
      defaultIdentity: {
        id: 'ident_default',
        email_address: `orders@${slug}.ferasetu.com`,
        display_name: user?.business_name || user?.name || 'Store',
        is_default: 1
      },
      ferasetuDomain: {
        id: 'dom_default',
        domain: `${slug}.ferasetu.com`,
        domain_type: 'FERASETU_MERCHANT',
        verification_status: 'VERIFIED'
      },
      customDomain,
      externalConnection: extConn ? { ...extConn, has_password: true, smtp_password: undefined } : null,
      quota: {
        dailyLimit: 100,
        sentToday: 2,
        remainingDaily: 98,
        extraBalance: 0
      }
    }));
  }

  if (path === '/email/domains') {
    requireAuth();
    const user = db.users.find(u => u.id === getCurrentUserId());
    const slug = user?.subdomain || 'store-1';
    const storedDomains = JSON.parse(localStorage.getItem('fera_local_email_domains') || '[]');
    const defaultDom = {
      id: 'dom_default',
      domain: `${slug}.ferasetu.com`,
      domain_type: 'FERASETU_MERCHANT',
      verification_status: 'VERIFIED'
    };
    return Promise.resolve(createResponse({ domains: [defaultDom, ...storedDomains] }));
  }

  if (path.startsWith('/email/domains/')) {
    requireAuth();
    const id = path.split('/')[3];
    const storedDomains = JSON.parse(localStorage.getItem('fera_local_email_domains') || '[]');
    const dom = storedDomains.find((d: any) => d.id === id);
    if (!dom) throw createHttpError(404, 'Domain not found');
    return Promise.resolve(createResponse({
      domain: dom,
      dnsInstructions: [
        { type: 'TXT', name: `_ferasetu-challenge.${dom.domain}`, value: `fera-domain-verification=${dom.verification_token_hash || 'local'}`, purpose: 'Domain Ownership Verification', required: true },
        { type: 'TXT', name: `fs1._domainkey.${dom.domain}`, value: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhki...', purpose: 'DKIM Authenticated Signing', required: true },
        { type: 'TXT', name: dom.domain, value: 'v=spf1 include:_spf.ferasetu.com ~all', purpose: 'SPF Sender Authorization', required: true },
        { type: 'TXT', name: `_dmarc.${dom.domain}`, value: 'v=DMARC1; p=reject; rua=mailto:dmarc-reports@ferasetu.com; aspf=r; adkim=r', purpose: 'DMARC Alignment Policy', required: false },
        { type: 'CNAME', name: `mail.${dom.domain}`, value: 'mail.ferasetu.com', purpose: 'Custom Mail From', required: false },
      ]
    }));
  }

  if (path === '/email/identities') {
    requireAuth();
    const user = db.users.find(u => u.id === getCurrentUserId());
    const slug = user?.subdomain || 'store-1';
    return Promise.resolve(createResponse({
      identities: [
        {
          id: 'ident_default',
          email_address: `orders@${slug}.ferasetu.com`,
          display_name: user?.business_name || user?.name || 'Store',
          is_default: 1,
          domain: `${slug}.ferasetu.com`,
          status: 'ACTIVE'
        }
      ]
    }));
  }

  if (path === '/email/provider') {
    requireAuth();
    const activeProvider = localStorage.getItem('fera_local_email_provider') || 'FERASETU';
    const extConnRaw = localStorage.getItem('fera_local_external_smtp');
    const extConn = extConnRaw ? JSON.parse(extConnRaw) : null;
    return Promise.resolve(createResponse({
      provider_type: activeProvider,
      smtp_host: extConn?.smtp_host || '',
      smtp_port: extConn?.smtp_port || 587,
      smtp_username: extConn?.smtp_username || '',
      security_mode: extConn?.security_mode || 'STARTTLS',
      status: extConn ? 'ACTIVE' : 'UNTESTED',
      has_password: !!extConn
    }));
  }

  if (path === '/email/events') {
    requireAuth();
    return Promise.resolve(createResponse({
      events: [
        { id: 'evt_1', message_id: 'msg_1', recipient: 'customer@example.com', event_type: 'DELIVERED', timestamp: new Date().toISOString(), subject: 'Order Confirmation #INV-1001', provider: 'FERASETU' }
      ]
    }));
  }

  if (path === '/whatsapp/status') {
    const userId = requireAuth();
    const raw = localStorage.getItem(`fera_local_wa_session_${userId}`);
    const session = raw ? JSON.parse(raw) : {
      status: 'disconnected',
      phone_number_masked: null,
      is_ai_replies_enabled: true,
      is_notifications_enabled: true,
      qr_code_raw: null,
      stats: { messages_received: 0, ai_replies_sent: 0, pending_orders: 0, attention_needed: 0 }
    };
    return Promise.resolve(createResponse(session));
  }

  if (path === '/whatsapp/conversations') {
    const userId = requireAuth();
    const raw = localStorage.getItem(`fera_local_wa_conversations_${userId}`);
    const conversations = raw ? JSON.parse(raw) : [];
    return Promise.resolve(createResponse({ conversations }));
  }

  if (path === '/whatsapp/orders') {
    const userId = requireAuth();
    const raw = localStorage.getItem(`fera_local_wa_orders_${userId}`);
    const orders = raw ? JSON.parse(raw) : [];
    return Promise.resolve(createResponse({ orders }));
  }

  throw createHttpError(404, `Unknown GET endpoint: ${path}`);
}

async function localPost(url: string, payload: Record<string, any> = {}) {
  const { path } = splitUrl(url);
  const db = loadDb();

  if (path === '/auth/send-otp') {
    const email = String(payload.email || '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw createHttpError(400, 'A valid email is required');
    }
    const otp = secureRandomDigits(6);
    const raw = localStorage.getItem(LOCAL_OTP_KEY) || '{}';
    const map = (() => { try { return JSON.parse(raw); } catch { return {}; } })();
    map[email] = { otp, expires: Date.now() + 10 * 60 * 1000 };
    localStorage.setItem(LOCAL_OTP_KEY, JSON.stringify(map));
    console.info(`[local mock] OTP for ${email}: ${otp}`);
    return Promise.resolve(createResponse({ success: true, message: 'OTP sent to your email. (local mock - check console)' }));
  }

  if (path === '/auth/verify-otp') {
    const email = String(payload.email || '').trim().toLowerCase();
    const otp = String(payload.otp || '').trim();
    const raw = localStorage.getItem(LOCAL_OTP_KEY) || '{}';
    const map = (() => { try { return JSON.parse(raw); } catch { return {}; } })();
    const entry = map[email];
    if (!entry || entry.otp !== otp) {
      throw createHttpError(400, 'Invalid or expired OTP');
    }
    if (Date.now() > entry.expires) {
      throw createHttpError(400, 'OTP has expired');
    }
    delete map[email];
    localStorage.setItem(LOCAL_OTP_KEY, JSON.stringify(map));
    return Promise.resolve(createResponse({ success: true, message: 'OTP verified successfully.' }));
  }

  if (path === '/auth/send-verification-email') {
    const email = String(payload.email || '').trim().toLowerCase();
    const shopId = String(payload.shop_id || '');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw createHttpError(400, 'A valid email is required');
    }
    const otp = secureRandomDigits(6);
    const raw = localStorage.getItem(LOCAL_OTP_KEY) || '{}';
    const map = (() => { try { return JSON.parse(raw); } catch { return {}; } })();
    map[email] = { otp, expires: Date.now() + 10 * 60 * 1000 };
    localStorage.setItem(LOCAL_OTP_KEY, JSON.stringify(map));
    console.info(`[local mock] Verification email OTP for ${email}: ${otp} ${shopId ? `(shop: ${shopId})` : ''}`);
    return Promise.resolve(createResponse({ success: true, message: 'Verification email sent. (local mock - check console)' }));
  }

  if (path === '/auth/register') {
    const email = String(payload.email || '').trim().toLowerCase();
    const password = String(payload.password || '');
    if (!email || !password) throw createHttpError(400, 'Email and password are required');
    if (db.users.some(u => u.email === email)) throw createHttpError(409, 'Email already registered');

    const name = String(payload.name || 'User').trim();
    const businessName = String(payload.businessName || '').trim();
    const city = payload.city ? String(payload.city).trim() : undefined;
    const district = payload.district ? String(payload.district).trim() : undefined;
    const state = payload.state ? String(payload.state).trim() : undefined;

    let counter = 1;
    while (counter < 1000) {
      const candidate = generateCanonicalStorefront({
        shopName: businessName || name || 'store',
        city,
        district,
        state,
        counter,
      });
      if (!db.users.some(u => u.subdomain === candidate.subdomain || u.hostname === candidate.hostname)) {
        break;
      }
      counter++;
    }

    const canonical = generateCanonicalStorefront({
      shopName: businessName || name || 'store',
      city,
      district,
      state,
      counter,
    });

    const user: LocalUser = {
      id: createId(),
      email,
      password_salt: createSalt(),
      name,
      phone: payload.phone ? String(payload.phone) : undefined,
      business_name: businessName || undefined,
      plan: 'free',
      preferred_language: String(payload.preferredLanguage || 'en'),
      subdomain: canonical.subdomain,
      hostname: canonical.hostname,
      city,
      district,
      state,
      custom_domain: undefined,
      plan_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      ai_credits_balance: 20,
      ai_credits_monthly_limit: 20,
      ai_credits_used_month: 0,
      ai_credits_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      storage_used_bytes: 0,
      storage_limit_bytes: 50 * 1024 * 1024,
      created_at: now(),
    };
    user.password_hash = await hashPassword(password, user.password_salt || '');

    db.users.push(user);
    saveDb(db);
    return createResponse({ user: userPublicData(user), token: `local-${user.id}` }, 201);
  }

  if (path === '/auth/login') {
    const email = String(payload.email || '').trim().toLowerCase();
    const password = String(payload.password || '');
    const user = db.users.find(u => u.email === email);
    if (!user) throw createHttpError(401, 'Invalid email or password');
    if (user.password_hash && user.password_salt) {
      const hashedPassword = await hashPassword(password, user.password_salt);
      if (user.password_hash !== hashedPassword) throw createHttpError(401, 'Invalid email or password');
    } else if (user.password !== password) {
      throw createHttpError(401, 'Invalid email or password');
    } else {
      const salt = createSalt();
      user.password_salt = salt;
      user.password_hash = await hashPassword(password, salt);
      delete user.password;
      saveDb(db);
    }
    return createResponse({ user: userPublicData(user), token: `local-${user.id}` });
  }

  if (path === '/products') {
    const userId = requireAuth();

    // Enforce plan product limit in local mock (mirrors Worker enforcement)
    const user = db.users.find(u => u.id === userId);
    const MOCK_PLAN_LIMITS: Record<string, number> = {
      free: 25, beta: 25, trial: 25,
      basic: 500, growth: 500, standard: 500, business: 500,
      pro: Infinity, premium: Infinity, scale: Infinity, enterprise: Infinity,
    };
    const userPlan = user?.plan ?? 'free';
    const productLimit = MOCK_PLAN_LIMITS[userPlan] ?? 25;
    const currentCount = db.products.filter(p => p.user_id === userId).length;
    if (productLimit !== Infinity && currentCount >= productLimit) {
      throw createHttpError(
        403,
        `Product limit reached. Your ${userPlan} plan supports up to ${productLimit} products. Upgrade to add more.`
      );
    }

    const product: LocalProduct = {
      id: createId(),
      user_id: userId,
      name: String(payload.name || ''),
      description: payload.description ? String(payload.description) : undefined,
      cost_price: payload.cost_price ? Number(payload.cost_price) : undefined,
      price: Number(payload.price || 0),
      sale_price: parseSalePrice(payload.sale_price),
      category: String(payload.category || 'Other'),
      stock_quantity: Number(payload.stock_quantity || 0),
      image_url: payload.image_url ? String(payload.image_url) : undefined,
      is_active: payload.is_active !== false,
      status: payload.status || (payload.is_active !== false ? 'active' : 'draft'),
      sku: payload.sku || undefined,
      barcode: payload.barcode || undefined,
      options: payload.options || [],
      variants: payload.variants || [],
      created_at: now(),
      updated_at: now(),
    };
    db.products.push(product);
    saveDb(db);
    return createResponse(product, 201);
  }

  if (path === '/gift-cards/product') {
    const userId = requireAuth();
    const {
      title,
      description,
      denominations,
      currency = 'INR',
      cross_currency_redemption = false,
      image_url,
      sales_channels,
      tags,
      product_type,
      collection,
      seo_title,
      seo_description,
    } = payload;

    const validDenominations = Array.isArray(denominations)
      ? denominations.map(Number).filter(d => Number.isFinite(d) && d > 0)
      : [];
    if (!String(title || '').trim() || validDenominations.length === 0) {
      throw createHttpError(400, 'A gift card title and at least one positive denomination are required');
    }

    const giftCardProduct: any = {
      id: createId(),
      user_id: userId,
      name: title || 'Digital Gift Card',
      description: description || 'Give them the freedom to choose. Select a gift card amount and receive a digital gift card by email.',
      cost_price: null,
      price: validDenominations[0] || 1000,
      sale_price: null,
      category: 'Gift Cards',
      stock_quantity: 9999,
      image_url: image_url || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80',
      is_active: true,
      metadata: JSON.stringify({
        is_gift_card: true,
        currency,
        cross_currency_redemption: Boolean(cross_currency_redemption),
        denominations: validDenominations,
        sales_channels: sales_channels || ['online_store', 'whatsapp_shop'],
        tags: tags || ['Gift Card', 'Digital'],
        product_type: product_type || 'Digital Gift Card',
        collection: collection || 'Gift Cards',
        seo: {
          title: seo_title || title,
          description: seo_description || description || '',
        },
      }),
      created_at: now(),
      updated_at: now(),
    };

    db.products.unshift(giftCardProduct);
    saveDb(db);
    return Promise.resolve(createResponse({ success: true, product: giftCardProduct }, 201));
  }

  if (path === '/gift-cards/issue') {
    const userId = requireAuth();
    const { amount, currency = 'INR', recipient_email, recipient_name, note } = payload;
    const initialValue = Number(amount);
    if (!Number.isFinite(initialValue) || initialValue <= 0) {
      throw createHttpError(400, 'Gift card amount must be greater than zero');
    }
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'FERA-';
    const random = new Uint8Array(12);
    crypto.getRandomValues(random);
    for (let b = 0; b < 3; b++) {
      for (let i = 0; i < 4; i++) code += chars.charAt(random[b * 4 + i] & 31);
      if (b < 2) code += '-';
    }
    const newCard = {
      id: createId(),
      user_id: userId,
      code,
      initial_value: initialValue,
      balance: initialValue,
      currency,
      recipient_email: recipient_email || null,
      recipient_name: recipient_name || null,
      note: note || null,
      status: 'active',
      created_at: now(),
      updated_at: now(),
    };
    const rawCards = localStorage.getItem('fera_local_issued_gift_cards_v1') || '[]';
    let cards: any[] = [];
    try { cards = JSON.parse(rawCards); } catch { cards = []; }
    cards.unshift(newCard);
    localStorage.setItem('fera_local_issued_gift_cards_v1', JSON.stringify(cards));
    return Promise.resolve(createResponse({ success: true, card: newCard }, 201));
  }

  if (path === '/gift-cards/simulate') {
    const balance = payload.gift_card_balance === undefined ? 1000 : Number(payload.gift_card_balance);
    const total = payload.order_total === undefined ? 700 : Number(payload.order_total);
    if (!Number.isFinite(balance) || balance < 0 || !Number.isFinite(total) || total < 0) {
      throw createHttpError(400, 'Gift card balance and order total must be valid non-negative amounts');
    }
    const applied = Math.min(balance, total);
    const remainingBalance = Math.max(0, balance - applied);
    const remainingToPay = Math.max(0, total - applied);
    return Promise.resolve(createResponse({
      success: true,
      simulation: {
        initial_card_balance: balance,
        order_total: total,
        applied_from_gift_card: applied,
        remaining_gift_card_balance: remainingBalance,
        remaining_order_to_pay: remainingToPay,
        currency: 'INR',
        explanation: total <= balance
          ? `The ₹${applied.toLocaleString('en-IN')} order is fully covered by the gift card. Remaining ₹${remainingBalance.toLocaleString('en-IN')} stays on the card for a future purchase.`
          : `The ₹${applied.toLocaleString('en-IN')} gift card covers part of the order. The customer pays the remaining ₹${remainingToPay.toLocaleString('en-IN')} using UPI, Card, or Cash.`
      }
    }));
  }

  if (path === '/customers/segments/preview') {
    const { rules = [], conjunction = 'AND', customers = [] } = payload;
    return Promise.resolve(createResponse({ success: true, count: customers.length, sample_customers: customers.slice(0, 5) }));
  }

  if (path === '/customers/segments') {
    const { name, description, rules, conjunction = 'AND', template_id } = payload;
    const newSeg = {
      id: `seg_${createId().slice(0, 8)}`,
      name,
      description,
      rules,
      conjunction,
      template_id: template_id || null,
      created_at: now(),
      updated_at: now(),
    };
    const raw = localStorage.getItem('fera_local_customer_segments_v1') || '[]';
    let segments: any[] = [];
    try { segments = JSON.parse(raw); } catch { segments = []; }
    segments.unshift(newSeg);
    localStorage.setItem('fera_local_customer_segments_v1', JSON.stringify(segments));
    return Promise.resolve(createResponse({ success: true, segment: newSeg }, 201));
  }

  if (path === '/transfers/locations') {
    const { name, type = 'warehouse', address, city } = payload;
    const newLoc = {
      id: `loc_${createId().slice(0, 8)}`,
      name,
      type,
      address: address || null,
      city: city || null,
      is_default: 0,
      created_at: now(),
    };
    const raw = localStorage.getItem('fera_local_inventory_locations_v1') || '[]';
    let locations: any[] = [];
    try { locations = JSON.parse(raw); } catch {}
    locations.push(newLoc);
    localStorage.setItem('fera_local_inventory_locations_v1', JSON.stringify(locations));
    return Promise.resolve(createResponse({ success: true, location: newLoc }, 201));
  }

  if (path === '/transfers') {
    const { origin_location_id, origin_name, destination_location_id, destination_name, status = 'draft', estimated_arrival, reference_name, note, tags, purchase_order_id, items = [] } = payload;
    const transferId = `tr_${createId().slice(0, 10)}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const transferNumber = `TR-${randomSuffix}`;
    const totalUnits = items.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 1), 0);
    const newTransfer = {
      id: transferId,
      transfer_number: transferNumber,
      reference_name: reference_name || null,
      origin_location_id,
      origin_name,
      destination_location_id,
      destination_name,
      status,
      estimated_arrival: estimated_arrival || null,
      note: note || null,
      tags: Array.isArray(tags) ? tags.join(', ') : (tags || null),
      purchase_order_id: purchase_order_id || null,
      total_items: items.length,
      total_units: totalUnits,
      items: items.map((it: any) => ({
        id: `tri_${createId().slice(0, 8)}`,
        transfer_id: transferId,
        product_id: it.product_id || it.id || 'custom',
        product_title: it.product_title || it.title || it.name || 'Product',
        sku: it.sku || null,
        quantity_requested: Number(it.quantity) || 1,
        quantity_received: 0,
        unit_cost: Number(it.unit_cost || it.price || 0),
      })),
      created_at: now(),
      updated_at: now(),
    };
    const raw = localStorage.getItem('fera_local_inventory_transfers_v1') || '[]';
    let transfers: any[] = [];
    try { transfers = JSON.parse(raw); } catch {}
    transfers.unshift(newTransfer);
    localStorage.setItem('fera_local_inventory_transfers_v1', JSON.stringify(transfers));
    return Promise.resolve(createResponse({ success: true, transfer: newTransfer }, 201));
  }

  if (path.startsWith('/transfers/') && path.endsWith('/status')) {
    const id = path.replace('/transfers/', '').replace('/status', '');
    const { status } = payload;
    const raw = localStorage.getItem('fera_local_inventory_transfers_v1') || '[]';
    let transfers: any[] = [];
    try { transfers = JSON.parse(raw); } catch {}
    const t = transfers.find((item: any) => item.id === id);
    if (t) {
      t.status = status;
      t.updated_at = now();
      localStorage.setItem('fera_local_inventory_transfers_v1', JSON.stringify(transfers));
    }
    return Promise.resolve(createResponse({ success: true, message: `Status updated to ${status}` }));
  }

  if (path.startsWith('/transfers/') && path.endsWith('/receive')) {
    const id = path.replace('/transfers/', '').replace('/receive', '');
    const { item_quantities } = payload;
    const raw = localStorage.getItem('fera_local_inventory_transfers_v1') || '[]';
    let transfers: any[] = [];
    try { transfers = JSON.parse(raw); } catch {}
    const t = transfers.find((item: any) => item.id === id);
    if (t && t.items) {
      let allDone = true;
      t.items.forEach((it: any) => {
        const rec = item_quantities && item_quantities[it.id] !== undefined ? Number(item_quantities[it.id]) : it.quantity_requested;
        it.quantity_received = rec;
        if (rec < it.quantity_requested) allDone = false;
      });
      t.status = allDone ? 'completed' : 'partially_received';
      t.updated_at = now();
      localStorage.setItem('fera_local_inventory_transfers_v1', JSON.stringify(transfers));
    }
    return Promise.resolve(createResponse({ success: true, message: 'Received successfully' }));
  }

  if (path === '/transfers/ai-sidekick') {
    const { prompt = '' } = payload;
    const numberMatch = prompt.match(/\b(\d+)\b/);
    const qty = numberMatch ? parseInt(numberMatch[1], 10) : 20;
    return Promise.resolve(createResponse({
      success: true,
      reply: `Transfer proposal ready: moving ${qty} units from "Main Warehouse (Central Godown)" to "Primary Retail Dukaan (Front Store)".`,
      proposal: {
        origin_name: 'Main Warehouse (Central Godown)',
        destination_name: 'Primary Retail Dukaan (Front Store)',
        quantity: qty,
        tags: 'Sidekick Assistant, Fast Transfer',
        note: 'Created via Fera AI Sidekick inventory copilot',
        estimated_arrival: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      }
    }));
  }

  if (path === '/orders' || path === '/orders/create') {
    const userId = requireAuth();
    const items = Array.isArray(payload.items)
      ? payload.items.map((item: any) => ({
          product_id: String(item.productId || item.product_id || ''),
          product_name: String(item.product_name || 'Product'),
          quantity: Number(item.quantity || 1),
          price: Number(item.price || 0),
        }))
      : [];
    const total = items.reduce((sum: number, item: any) => sum + (item.quantity * item.price), 0);
    const order: LocalOrder = {
      id: createId(),
      user_id: userId,
      customer_name: String(payload.customerName || payload.customer_name || 'Guest'),
      customer_phone: String(payload.customerPhone || payload.customer_phone || ''),
      customer_address: payload.deliveryAddress || payload.customer_address || undefined,
      items,
      total,
      delivery_type: (payload.deliveryType === 'pickup' ? 'pickup' : 'delivery') as 'delivery' | 'pickup',
      status: 'pending',
      payment_status: 'pending',
      notes: payload.notes || undefined,
      created_at: now(),
      updated_at: now(),
    };
    db.orders.push(order);
    saveDb(db);
    return createResponse({
      order: {
        ...order,
        deliveryCode: secureRandomDigits(4),
        paymentOtp: undefined,
      },
      invoiceNumber: `FERA-${order.id.slice(0, 8).toUpperCase()}`,
    }, 201);
  }

  if (path === '/website') {
    const userId = requireAuth();
    const existing = db.websites.find(w => w.user_id === userId);
    if (existing) {
      existing.name = String(payload.name || existing.name);
      existing.template = String(payload.template || existing.template || 'general');
      existing.theme = payload.theme !== undefined ? payload.theme : existing.theme;
      existing.config = payload.config !== undefined ? payload.config : existing.config;
      existing.sections = Array.isArray(payload.sections) ? payload.sections : existing.sections;
      existing.updated_at = now();
      saveDb(db);
      return createResponse(existing);
    }

    const website: LocalWebsite = {
      id: createId(),
      user_id: userId,
      name: String(payload.name || 'My Store'),
      template: String(payload.template || 'general'),
      theme: payload.theme || { id: payload.template || 'general' },
      sections: Array.isArray(payload.sections) ? payload.sections : [],
      config: payload.config || {},
      is_published: 0,
      created_at: now(),
      updated_at: now(),
    };
    db.websites.push(website);
    saveDb(db);
    return createResponse(website, 201);
  }

  if (path === '/builder/draft') {
    const userId = requireAuth();
    const draftData = payload.draft || {};
    let existing = db.websites.find(w => w.user_id === userId);
    if (!existing) {
      existing = {
        id: createId(),
        user_id: userId,
        name: String(draftData.name || 'My Store'),
        template: String(draftData.template || 'market'),
        theme: draftData.theme || { id: draftData.template || 'market' },
        sections: draftData.pages?.[0]?.nodes || [],
        config: draftData.config || {},
        is_published: 0,
        created_at: now(),
        updated_at: now(),
      };
      db.websites.push(existing);
    } else {
      existing.name = String(draftData.name || existing.name);
      existing.template = String(draftData.template || existing.template);
      existing.theme = draftData.theme || { id: existing.template };
      if (draftData.pages?.[0]?.nodes) {
        existing.sections = draftData.pages[0].nodes;
      }
      if (draftData.config) {
        existing.config = { ...existing.config, ...draftData.config };
      }
      existing.updated_at = now();
    }
    saveDb(db);
    return Promise.resolve(createResponse({ success: true, saved_at: now() }));
  }

  if (path === '/builder/publish') {
    const userId = requireAuth();
    const existing = db.websites.find(w => w.user_id === userId);
    if (existing) {
      existing.is_published = 1;
      existing.updated_at = now();
      saveDb(db);
    }
    return Promise.resolve(createResponse({ success: true, published_version: 1, published_at: now() }));
  }

  if (path === '/ai/chat') {
    const message = String(payload.message || '');
    const userId = getCurrentUserId();
    const user = userId ? db.users.find(u => u.id === userId) : null;
    if (user) {
      const cost = payload.usageType === 'website_ai' || message.includes('Generate website sections JSON for:') ? 3 : 1;
      user.ai_credits_balance = Math.max(0, (user.ai_credits_balance || 0) - cost);
      user.ai_credits_used_month = (user.ai_credits_used_month || 0) + cost;
      saveDb(db);
    }
    return createResponse({
      content: `Local mode is enabled. I saved your message locally: "${message.slice(0, MAX_MESSAGE_PREVIEW_LENGTH)}"`,
      model: 'Local Mock AI',
      aiCreditsBalance: user?.ai_credits_balance || 0,
    });
  }

  if (path === '/payment/ai-credits') {
    const userId = getCurrentUserId();
    const user = userId ? db.users.find(u => u.id === userId) : null;
    const today = new Date();
    const mockDaily = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      mockDaily.push({
        date: dateStr,
        usage_type: i % 2 === 0 ? 'shopkeeper_assistant' : 'website_ai',
        credits_used: (i * 3 + 2) % 15,
        calls: (i * 2 + 1) % 8,
      });
    }

    return createResponse({
      credits: user || {
        ai_credits_balance: 140,
        ai_credits_monthly_limit: 200,
        ai_credits_used_month: 60,
        plan: 'business'
      },
      packs: {
        small: { credits: 250, amount: 149, label: '250 AI credits' },
        growth: { credits: 1000, amount: 499, label: '1,000 AI credits' },
        scale: { credits: 3000, amount: 1299, label: '3,000 AI credits' }
      },
      purchases: (db as any).aiPurchases || [
        { id: 'p1', credits: 250, amount: 149, usage_scope: 'shared', status: 'completed', created_at: new Date(Date.now() - 86400000 * 5).toISOString() }
      ],
      usage: [
        { usage_type: 'shopkeeper_assistant', calls: 32, credits_used: 32, tokens: 4200 },
        { usage_type: 'website_ai', calls: 6, credits_used: 18, tokens: 6800 },
        { usage_type: 'customer_assistant', calls: 5, credits_used: 10, tokens: 1900 },
      ],
      dailyUsage: mockDaily,
      recentLogs: [
        { id: 'log-1', model: 'fera-ai', prompt_tokens: 120, completion_tokens: 85, credits_used: 1, usage_type: 'shopkeeper_assistant', created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
        { id: 'log-2', model: 'fera-ai', prompt_tokens: 280, completion_tokens: 520, credits_used: 3, usage_type: 'website_ai', created_at: new Date(Date.now() - 1000 * 60 * 65).toISOString() },
        { id: 'log-3', model: 'bulbul:v1', prompt_tokens: 60, completion_tokens: 45, credits_used: 2, usage_type: 'customer_assistant', created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString() },
      ],
      limits: {
        ferasetu_ai_limit: (user as any)?.ferasetu_ai_limit ?? 100,
        website_ai_limit: (user as any)?.website_ai_limit ?? 100,
        ferasetu_ai_enabled: (user as any)?.ferasetu_ai_enabled !== 0,
        website_ai_enabled: (user as any)?.website_ai_enabled !== 0,
      }
    });
  }

  if (path === '/payment/ai-credits/limits') {
    const userId = getCurrentUserId();
    const user = userId ? db.users.find(u => u.id === userId) : null;
    if (user) {
      if (payload.ferasetu_ai_limit !== undefined) (user as any).ferasetu_ai_limit = payload.ferasetu_ai_limit === null || payload.ferasetu_ai_limit === '' || payload.ferasetu_ai_limit === 0 ? null : Number(payload.ferasetu_ai_limit);
      if (payload.website_ai_limit !== undefined) (user as any).website_ai_limit = payload.website_ai_limit === null || payload.website_ai_limit === '' || payload.website_ai_limit === 0 ? null : Number(payload.website_ai_limit);
      if (payload.ferasetu_ai_enabled !== undefined) (user as any).ferasetu_ai_enabled = payload.ferasetu_ai_enabled ? 1 : 0;
      if (payload.website_ai_enabled !== undefined) (user as any).website_ai_enabled = payload.website_ai_enabled ? 1 : 0;
      saveDb(db);
    }
    return createResponse({
      success: true,
      limits: {
        ferasetu_ai_limit: (user as any)?.ferasetu_ai_limit ?? null,
        website_ai_limit: (user as any)?.website_ai_limit ?? null,
        ferasetu_ai_enabled: (user as any)?.ferasetu_ai_enabled !== 0,
        website_ai_enabled: (user as any)?.website_ai_enabled !== 0,
      },
      message: 'AI limits saved successfully'
    });
  }

  if (path === '/payment/ai-credits/purchase') {
    const userId = getCurrentUserId();
    const user = userId ? db.users.find(u => u.id === userId) : null;
    const packs: Record<string, number> = { small: 250, growth: 1000, scale: 3000 };
    const credits = packs[String(payload.pack)] || 250;
    if (user && credits) {
      user.ai_credits_balance = (user.ai_credits_balance || 0) + credits;
      if (!(db as any).aiPurchases) (db as any).aiPurchases = [];
      (db as any).aiPurchases.unshift({
        id: 'purchase_' + Date.now(),
        credits,
        amount: payload.pack === 'scale' ? 1299 : payload.pack === 'growth' ? 499 : 149,
        usage_scope: payload.usage_scope || 'shared',
        status: 'completed',
        created_at: new Date().toISOString()
      });
      saveDb(db);
    }
    return createResponse({
      success: true,
      simulated: true,
      ai_credits_balance: user?.ai_credits_balance || credits,
      message: `Successfully added ${credits} credits to your balance!`
    }, 201);
  }

  if (path === '/payment/initialize') {
    const userId = getCurrentUserId();
    const user = userId ? db.users.find(u => u.id === userId) : null;
    const planRaw = String(payload.plan || 'business').toLowerCase();
    const region = (payload.market || user?.market || 'IN').toUpperCase();
    const plan = (planRaw === 'pro' || planRaw === 'premium' ? 'pro' : planRaw === 'starter' || planRaw === 'basic' ? 'starter' : planRaw === 'free' ? 'free' : 'business') as LocalUser['plan'];
    const billingCycle = payload.billingCycle || payload.billing || 'monthly';

    if (plan === 'free') {
      if (region !== 'IN') {
        throw createHttpError(400, 'The Free tier is only available for merchants based in India.');
      }
      if (user) {
        user.plan = 'free';
        user.ai_credits_balance = 20;
        user.ai_credits_monthly_limit = 20;
        user.ai_credits_used_month = 0;
        saveDb(db);
        try {
          const rawUser = localStorage.getItem('fera_user');
          if (rawUser) {
            const parsed = JSON.parse(rawUser);
            parsed.plan = 'free';
            localStorage.setItem('fera_user', JSON.stringify(parsed));
          }
        } catch { /* ignore */ }
      }
      return createResponse({
        success: true,
        requiresPayment: false,
        id: createId(),
        plan: 'free',
        amount: 0,
        currency: 'INR',
        message: 'Plan activated: free'
      }, 201);
    }

    // Regional pricing calculation for FeraSetu subscriptions (Cashfree billing)
    let expectedAmount: number;
    let currency: string;
    const gateway = 'cashfree';

    if (region === 'IN') {
      currency = 'INR';
      expectedAmount = plan === 'pro' ? (billingCycle === 'yearly' ? 9990 : 999) : (billingCycle === 'yearly' ? 3990 : 399);
    } else if (region === 'UK') {
      currency = 'GBP';
      expectedAmount = plan === 'pro' ? (billingCycle === 'yearly' ? 790 : 79) : plan === 'business' ? (billingCycle === 'yearly' ? 390 : 39) : (billingCycle === 'yearly' ? 190 : 19);
    } else if (region === 'EU') {
      currency = 'EUR';
      expectedAmount = plan === 'pro' ? (billingCycle === 'yearly' ? 790 : 79) : plan === 'business' ? (billingCycle === 'yearly' ? 390 : 39) : (billingCycle === 'yearly' ? 190 : 19);
    } else {
      currency = 'USD';
      expectedAmount = plan === 'pro' ? (billingCycle === 'yearly' ? 790 : 79) : plan === 'business' ? (billingCycle === 'yearly' ? 390 : 39) : (billingCycle === 'yearly' ? 190 : 19);
    }

    const txId = createId();
    return createResponse({
      success: true,
      requiresPayment: true,
      gateway,
      id: txId,
      plan,
      amount: expectedAmount,
      currency,
      paymentSessionId: `session_mock_${txId.substring(0, 14)}`,
      cashfreeOrderId: `order_mock_${txId.substring(0, 14)}`,
      cashfreeEnv: 'sandbox',
      key: LOCAL_PAYMENT_PROVIDER_KEY,
      keyId: 'mock_key',
      status: 'created',
      message: `Cashfree checkout session created for plan: ${plan}`
    }, 201);
  }

  if (path === '/payment/downgrade' || path === '/payment/cancel-subscription') {
    const userId = getCurrentUserId();
    const user = userId ? db.users.find(u => u.id === userId) : null;
    if (user) {
      user.plan = 'free';
      saveDb(db);
      try {
        const rawUser = localStorage.getItem('fera_user');
        if (rawUser) {
          const parsed = JSON.parse(rawUser);
          parsed.plan = 'free';
          localStorage.setItem('fera_user', JSON.stringify(parsed));
        }
      } catch { /* ignore */ }
    }
    return createResponse({
      success: true,
      message: 'Subscription cancelled. You have been switched to the Free plan.',
      plan: 'free',
    });
  }

  if (path === '/payment/verify') {
    const userId = getCurrentUserId();
    const planRaw = String(payload.plan || 'business').toLowerCase();
    const plan = (planRaw === 'pro' || planRaw === 'premium' ? 'pro' : planRaw === 'starter' || planRaw === 'basic' ? 'starter' : 'business') as LocalUser['plan'];
    const creditsByPlan: Record<string, number> = { starter: 50, business: 200, pro: 1000 };

    if (userId) {
      const user = db.users.find(u => u.id === userId);
      if (user) {
        user.plan = plan;
        user.ai_credits_balance = (user.ai_credits_balance || 0) + (creditsByPlan[plan] || 200);
        user.ai_credits_monthly_limit = creditsByPlan[plan] || 200;
        user.ai_credits_used_month = 0;
        saveDb(db);
        try {
          const rawUser = localStorage.getItem('fera_user');
          if (rawUser) {
            const parsed = JSON.parse(rawUser);
            parsed.plan = plan;
            localStorage.setItem('fera_user', JSON.stringify(parsed));
          }
        } catch { /* ignore */ }
      }
    }
    return createResponse({ success: true, plan, message: `Plan activated: ${plan}` });
  }

  if (path === '/voice/text-to-speech') {
    return createResponse({ audio: null });
  }

  if (path === '/settings/smtp/test') {
    requireAuth();
    const email = String(payload.email || '');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw createHttpError(400, 'Valid email is required');
    }
    console.info(`[local mock] Test SMTP email would be sent to: ${email}`);
    return Promise.resolve(createResponse({ success: true, message: `Test email sent to ${email} (local mock)` }));
  }

  if (path === '/survey/submissions') {
    const userId = requireAuth();
    const answers = Array.isArray(payload.answers) ? payload.answers : [];
    const feedback = String(payload.feedback || '').trim();
    const contact = String(payload.contact || '').trim();
    if (answers.length < 5) throw createHttpError(400, 'Please answer at least 5 survey questions');
    if (feedback.length < 5) throw createHttpError(400, 'Feedback must be at least 5 characters');

    db.survey_submissions.push({
      id: createId(),
      user_id: userId,
      answers_json: JSON.stringify(answers),
      feedback,
      contact: contact || undefined,
      ai_summary_json: payload.summary ? JSON.stringify(payload.summary) : undefined,
      created_at: now(),
    });
    saveDb(db);
    return createResponse({ success: true }, 201);
  }

  if (path === '/survey/assistant') {
    requireAuth();
    const answers = Array.isArray(payload.answers) ? payload.answers : [];
    const latestMessage = String(payload.latestMessage || '').trim();
    const answered = new Set(answers.map((item: any) => item.questionId));
    const nextQuestion = SURVEY_QUESTIONS.find((q) => !answered.has(q.id));
    if (!nextQuestion) {
      const answerMap = new Map(answers.map((item: any) => [item.questionId, String(item.answer || '')]));
      const urgencyRaw = (answerMap.get('urgency') || '').toLowerCase();
      const wtpRaw = (answerMap.get('willingness_to_pay') || '').toLowerCase();
      return createResponse({
        mode: 'local',
        done: true,
        reply: `Thanks for sharing. ${latestMessage ? 'I captured your last response.' : ''}`,
        summary: {
          pain_points: [answerMap.get('biggest_pain') || 'No explicit pain point shared'],
          feature_requests: [answerMap.get('missing_feature') || 'No feature request shared'],
          urgency: urgencyRaw.includes('high') ? 'high' : urgencyRaw.includes('low') ? 'low' : 'medium',
          willingness_to_pay: wtpRaw.includes('yes') ? 'yes' : wtpRaw.includes('no') ? 'no' : 'maybe',
          suggested_improvements: [
            answerMap.get('missing_feature'),
            answerMap.get('upgrade_reason'),
            latestMessage
          ].filter(Boolean)
        }
      });
    }

    return createResponse({
      mode: 'local',
      done: false,
      nextQuestion,
      reply: `${latestMessage ? 'Thanks, noted. ' : ''}${nextQuestion.question}`
    });
  }

  if (path === '/email/domains') {
    requireAuth();
    const domain = String(payload.domain || '').trim().toLowerCase();
    const storedDomains = JSON.parse(localStorage.getItem('fera_local_email_domains') || '[]');
    const newDomain = {
      id: `dom_${Date.now()}`,
      domain,
      domain_type: 'CUSTOM',
      verification_status: 'PENDING',
      verification_token_hash: `fera_token_${Date.now()}`,
      dkim_selector: 'fs1',
      dkim_status: 'PENDING',
      spf_status: 'PENDING',
      dmarc_status: 'PENDING',
      created_at: now(),
      updated_at: now()
    };
    storedDomains.push(newDomain);
    localStorage.setItem('fera_local_email_domains', JSON.stringify(storedDomains));
    return Promise.resolve(createResponse({
      domain: newDomain,
      dnsInstructions: [
        { type: 'TXT', name: `_ferasetu-challenge.${domain}`, value: `fera-domain-verification=${newDomain.verification_token_hash}`, purpose: 'Domain Ownership Verification', required: true },
        { type: 'TXT', name: `fs1._domainkey.${domain}`, value: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhki...', purpose: 'DKIM Authenticated Signing', required: true },
        { type: 'TXT', name: domain, value: 'v=spf1 include:_spf.ferasetu.com ~all', purpose: 'SPF Sender Authorization', required: true },
        { type: 'TXT', name: `_dmarc.${domain}`, value: 'v=DMARC1; p=reject; rua=mailto:dmarc-reports@ferasetu.com; aspf=r; adkim=r', purpose: 'DMARC Alignment Policy', required: false },
        { type: 'CNAME', name: `mail.${domain}`, value: 'mail.ferasetu.com', purpose: 'Custom Mail From', required: false },
      ]
    }, 201));
  }

  if (path.startsWith('/email/domains/') && (path.endsWith('/verify') || path.endsWith('/check'))) {
    requireAuth();
    const id = path.split('/')[3];
    const storedDomains = JSON.parse(localStorage.getItem('fera_local_email_domains') || '[]');
    const dom = storedDomains.find((d: any) => d.id === id);
    if (!dom) throw createHttpError(404, 'Domain not found');
    dom.verification_status = 'VERIFIED';
    dom.dkim_status = 'VERIFIED';
    dom.spf_status = 'VERIFIED';
    dom.dmarc_status = 'VERIFIED';
    dom.verified_at = now();
    localStorage.setItem('fera_local_email_domains', JSON.stringify(storedDomains));
    return Promise.resolve(createResponse({
      domain: dom,
      verification: { verified: true, status: 'VERIFIED', ownershipStatus: 'VERIFIED', dkimStatus: 'VERIFIED', spfStatus: 'VERIFIED', dmarcStatus: 'VERIFIED' }
    }));
  }

  if (path === '/email/provider/ferasetu') {
    requireAuth();
    localStorage.setItem('fera_local_email_provider', 'FERASETU');
    return Promise.resolve(createResponse({ success: true, provider: 'FERASETU', message: 'Switched to FeraSetu Email successfully' }));
  }

  if (path === '/email/provider/external') {
    requireAuth();
    localStorage.setItem('fera_local_email_provider', 'EXTERNAL_SMTP');
    localStorage.setItem('fera_local_external_smtp', JSON.stringify(payload));
    return Promise.resolve(createResponse({ success: true, provider: 'EXTERNAL_SMTP', message: 'External SMTP configured successfully' }));
  }

  if (path === '/email/test') {
    requireAuth();
    return Promise.resolve(createResponse({ success: true, message: 'Test email dispatched successfully' }));
  }

  if (path === '/website/settings') {
    const userId = requireAuth();
    let website = db.websites.find(w => w.user_id === userId);
    if (!website) {
      website = {
        id: createId(),
        user_id: userId,
        name: payload.meta_title || 'My Store',
        template: 'market',
        sections: [],
        config: {},
        is_published: 1,
        created_at: now(),
        updated_at: now(),
      };
      db.websites.push(website);
    }
    const currentConfig = (website.config as any) || {};
    website.config = {
      ...currentConfig,
      seo: { ...(currentConfig.seo || {}), ...payload },
      settings: { ...(currentConfig.settings || {}), ...payload },
    };
    website.updated_at = now();
    saveDb(db);
    return Promise.resolve(createResponse({ success: true, settings: payload }));
  }

  if (path === '/whatsapp/connect') {
    return Promise.reject(createHttpError(503, 'WhatsApp connection requires the configured connector service'));
  }

  if (path === '/whatsapp/disconnect') {
    const userId = requireAuth();
    const session = {
      status: 'disconnected',
      phone_number_masked: null,
      is_ai_replies_enabled: true,
      is_notifications_enabled: true,
      qr_code_raw: null,
      stats: { messages_received: 0, ai_replies_sent: 0, pending_orders: 0, attention_needed: 0 }
    };
    localStorage.setItem(`fera_local_wa_session_${userId}`, JSON.stringify(session));
    return Promise.resolve(createResponse({ success: true, status: 'disconnected' }));
  }

  throw createHttpError(404, `Unknown POST endpoint: ${path}`);
}

async function localPut(url: string, payload: Record<string, any>) {
  const { path } = splitUrl(url);
  const db = loadDb();

  if (path === '/users/me') {
    let userId = getCurrentUserId();
    let user = userId ? db.users.find(u => u.id === userId) : undefined;

    if (!user) {
      const newId = createId();
      const newUser: LocalUser = {
        id: newId,
        email: String(payload.email || 'user@example.com'),
        name: String(payload.name || 'New User'),
        phone: payload.phone ? String(payload.phone) : undefined,
        business_name: payload.business_name ? String(payload.business_name) : undefined,
        plan: 'beta',
        preferred_language: String(payload.preferred_language || 'en'),
        subdomain: payload.subdomain ? String(payload.subdomain) : generateSubdomain(payload.business_name || payload.name || 'my-store'),
        custom_domain: undefined,
        plan_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        ai_credits_balance: 20,
        ai_credits_monthly_limit: 20,
        ai_credits_used_month: 0,
        ai_credits_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        storage_used_bytes: 0,
        storage_limit_bytes: 50 * 1024 * 1024,
        created_at: now(),
      };
      db.users.push(newUser);
      saveDb(db);
      const persisted = userPublicData(newUser);
      localStorage.setItem('fera_user', JSON.stringify(persisted));
      return Promise.resolve(createResponse({ user: persisted }));
    }

    Object.assign(user, {
      business_name: payload.business_name ?? user.business_name,
      preferred_language: payload.preferred_language ?? user.preferred_language,
      phone: payload.phone ?? user.phone,
      subdomain: payload.subdomain ?? user.subdomain,
      hostname: payload.hostname ?? user.hostname,
      city: payload.city ?? user.city,
      district: payload.district ?? user.district,
      state: payload.state ?? user.state,
      name: payload.name ?? user.name,
    });
    saveDb(db);
    return Promise.resolve(createResponse({ user: userPublicData(user) }));
  }

  const userId = requireAuth();

  if (path === '/users/profile') {
    const user = db.users.find(u => u.id === userId);
    if (!user) throw createHttpError(404, 'User not found');
    Object.assign(user, {
      business_name: payload.business_name ?? user.business_name,
      preferred_language: payload.preferredLanguage ?? user.preferred_language,
      phone: payload.phone ?? user.phone,
    });
    saveDb(db);
    return Promise.resolve(createResponse(userPublicData(user)));
  }

  if (path.startsWith('/products/')) {
    const id = path.split('/')[2];
    const product = db.products.find(p => p.id === id && p.user_id === userId);
    if (!product) throw createHttpError(404, 'Product not found');
    Object.assign(product, {
      name: String(payload.name ?? product.name),
      description: payload.description === undefined ? product.description : String(payload.description),
      cost_price: payload.cost_price === undefined ? product.cost_price : (payload.cost_price ? Number(payload.cost_price) : undefined),
      price: Number(payload.price ?? product.price),
      sale_price: payload.sale_price === undefined ? product.sale_price : parseSalePrice(payload.sale_price),
      category: String(payload.category ?? product.category),
      stock_quantity: Number(payload.stock_quantity ?? product.stock_quantity),
      image_url: payload.image_url === undefined ? product.image_url : String(payload.image_url),
      is_active: Boolean(payload.is_active ?? product.is_active),
      updated_at: now(),
    });
    saveDb(db);
    return Promise.resolve(createResponse(product));
  }

  if (path === '/settings/smtp') {
    const userId = requireAuth();
    const stored = localStorage.getItem('fera_local_smtp');
    const existing = stored ? JSON.parse(stored) : {};
    const updated = {
      ...existing,
      ...payload,
      password: payload.password || existing.password,
      has_password: !!(payload.password || existing.password),
      user_id: userId,
      updated_at: now(),
    };
    localStorage.setItem('fera_local_smtp', JSON.stringify(updated));
    const { password, ...publicSettings } = updated;
    return Promise.resolve(createResponse({ success: true, settings: publicSettings }));
  }

  if (path === '/website/settings') {
    const userId = requireAuth();
    let website = db.websites.find(w => w.user_id === userId);
    if (!website) {
      website = {
        id: createId(),
        user_id: userId,
        name: payload.meta_title || 'My Store',
        template: 'market',
        sections: [],
        config: {},
        is_published: 1,
        created_at: now(),
        updated_at: now(),
      };
      db.websites.push(website);
    }
    const currentConfig = (website.config as any) || {};
    website.config = {
      ...currentConfig,
      seo: { ...(currentConfig.seo || {}), ...payload },
      settings: { ...(currentConfig.settings || {}), ...payload },
    };
    website.updated_at = now();
    saveDb(db);
    return Promise.resolve(createResponse({ success: true, settings: payload }));
  }

  throw createHttpError(404, `Unknown PUT endpoint: ${path}`);
}

async function localPatch(url: string, payload: Record<string, any>) {
  const { path } = splitUrl(url);
  const db = loadDb();
  const userId = requireAuth();

  if (path === '/website/publish') {
    const website = db.websites.find(w => w.user_id === userId);
    if (!website) throw createHttpError(404, 'Website not found');
    website.is_published = payload.published ? 1 : 0;
    website.updated_at = now();
    saveDb(db);
    return Promise.resolve(createResponse({ published: website.is_published === 1 }));
  }

  if (path.startsWith('/orders/') && path.endsWith('/status')) {
    const id = path.split('/')[2];
    const order = db.orders.find(o => o.id === id && o.user_id === userId);
    if (!order) throw createHttpError(404, 'Order not found');
    order.status = String(payload.status || order.status);
    order.updated_at = now();
    saveDb(db);
    return Promise.resolve(createResponse(order));
  }

  if (path.startsWith('/orders/') && path.endsWith('/payment')) {
    const id = path.split('/')[2];
    const order = db.orders.find(o => o.id === id && o.user_id === userId);
    if (!order) throw createHttpError(404, 'Order not found');
    order.payment_status = String(payload.payment_status ?? order.payment_status);
    order.updated_at = now();
    saveDb(db);
    return Promise.resolve(createResponse(order));
  }

  if (path.startsWith('/email/identities/')) {
    return Promise.resolve(createResponse({ success: true, message: 'Identity updated' }));
  }

  if (path === '/whatsapp/settings') {
    const userId = requireAuth();
    const storageKey = `fera_local_wa_session_${userId}`;
    const raw = localStorage.getItem(storageKey);
    const session = raw ? JSON.parse(raw) : {
      status: 'disconnected',
      phone_number_masked: null,
      is_ai_replies_enabled: true,
      is_notifications_enabled: true,
      qr_code_raw: null,
      stats: { messages_received: 0, ai_replies_sent: 0, pending_orders: 0, attention_needed: 0 }
    };
    if (typeof payload.isAiRepliesEnabled === 'boolean') session.is_ai_replies_enabled = payload.isAiRepliesEnabled;
    if (typeof payload.isNotificationsEnabled === 'boolean') session.is_notifications_enabled = payload.isNotificationsEnabled;
    localStorage.setItem(storageKey, JSON.stringify(session));
    return Promise.resolve(createResponse(session));
  }

  if (path.startsWith('/whatsapp/conversations/') && path.endsWith('/handover')) {
    const userId = requireAuth();
    const conversationId = path.split('/')[3];
    const storageKey = `fera_local_wa_conversations_${userId}`;
    const raw = localStorage.getItem(storageKey) || '[]';
    let conversations: any[];
    try { conversations = JSON.parse(raw); } catch { conversations = []; }
    const conversation = conversations.find(item => item.id === conversationId);
    if (!conversation) throw createHttpError(404, 'Conversation not found');
    if (typeof payload.requiresAttention === 'boolean') conversation.requires_attention = payload.requiresAttention;
    if (typeof payload.isAiPaused === 'boolean') conversation.is_ai_paused = payload.isAiPaused;
    conversation.updated_at = now();
    localStorage.setItem(storageKey, JSON.stringify(conversations));
    return Promise.resolve(createResponse({ success: true, conversation }));
  }

  if (path.startsWith('/whatsapp/orders/') && path.endsWith('/status')) {
    const userId = requireAuth();
    if (!['confirmed', 'rejected', 'cancelled'].includes(payload.status)) {
      throw createHttpError(400, 'Invalid WhatsApp order status');
    }
    const orderId = path.split('/')[3];
    const storageKey = `fera_local_wa_orders_${userId}`;
    const raw = localStorage.getItem(storageKey) || '[]';
    let orders: any[];
    try { orders = JSON.parse(raw); } catch { orders = []; }
    const order = orders.find(item => item.id === orderId);
    if (!order) throw createHttpError(404, 'WhatsApp order request not found');
    order.status = payload.status;
    order.updated_at = now();
    localStorage.setItem(storageKey, JSON.stringify(orders));
    return Promise.resolve(createResponse({ success: true, status: order.status }));
  }

  throw createHttpError(404, `Unknown PATCH endpoint: ${path}`);
}

async function localDelete(url: string) {
  const { path } = splitUrl(url);
  const db = loadDb();
  const userId = requireAuth();

  if (path.startsWith('/products/')) {
    const id = path.split('/')[2];
    db.products = db.products.filter(p => !(p.id === id && p.user_id === userId));
    saveDb(db);
    return Promise.resolve(createResponse({ success: true }));
  }

  if (path.startsWith('/customers/segments/')) {
    const id = path.replace('/customers/segments/', '');
    const raw = localStorage.getItem('fera_local_customer_segments_v1') || '[]';
    let segments: any[] = [];
    try { segments = JSON.parse(raw); } catch { segments = []; }
    const filtered = segments.filter((s: any) => s.id !== id);
    localStorage.setItem('fera_local_customer_segments_v1', JSON.stringify(filtered));
    return Promise.resolve(createResponse({ success: true, message: 'Segment deleted' }));
  }

  if (path.startsWith('/transfers/')) {
    const id = path.replace('/transfers/', '');
    const raw = localStorage.getItem('fera_local_inventory_transfers_v1') || '[]';
    let transfers: any[] = [];
    try { transfers = JSON.parse(raw); } catch { transfers = []; }
    const filtered = transfers.filter((t: any) => t.id !== id);
    localStorage.setItem('fera_local_inventory_transfers_v1', JSON.stringify(filtered));
    return Promise.resolve(createResponse({ success: true, message: 'Transfer deleted' }));
  }

  if (path.startsWith('/email/domains/')) {
    const id = path.split('/')[3];
    const storedDomains = JSON.parse(localStorage.getItem('fera_local_email_domains') || '[]');
    const filtered = storedDomains.filter((d: any) => d.id !== id);
    localStorage.setItem('fera_local_email_domains', JSON.stringify(filtered));
    return Promise.resolve(createResponse({ success: true, message: 'Domain deleted' }));
  }

  if (path === '/email/provider/external') {
    localStorage.setItem('fera_local_email_provider', 'FERASETU');
    localStorage.removeItem('fera_local_external_smtp');
    return Promise.resolve(createResponse({ success: true, message: 'External SMTP removed' }));
  }

  throw createHttpError(404, `Unknown DELETE endpoint: ${path}`);
}

const isApexDomain = typeof window !== 'undefined' && window.location.hostname === 'ferasetu.com';
const defaultApiUrl = isApexDomain ? 'https://ferasetu.singhantima203.workers.dev/api' : '/api';
const rawBaseUrl = (import.meta.env?.VITE_API_URL || defaultApiUrl).replace(/\/+$/, '');
const normalizedBaseUrl = rawBaseUrl.endsWith('/api') ? rawBaseUrl : (rawBaseUrl + '/api');

export const remoteApi = axios.create({
  baseURL: normalizedBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});


// Inject Authorization Bearer token automatically & normalize redundant /api prefixes
remoteApi.interceptors.request.use(async (config) => {
  if (config.url) {
    if (config.url.startsWith('/api/')) {
      config.url = config.url.replace(/^\/api\//, '/');
    } else if (config.url === '/api') {
      config.url = '/';
    }
  }
  if (config.headers && !config.headers.Authorization) {
    const token = await getWorkOSToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Handle 401 with automatic token refresh retry. Never treat 403 as session expiry.
remoteApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // If 401 and not already retried, attempt to refresh WorkOS token once
    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        clearCachedToken();
        const freshToken = await getWorkOSToken();
        if (freshToken) {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${freshToken}`;
          return remoteApi(originalRequest);
        }
      } catch (refreshErr) {
        console.warn('WorkOS token refresh retry failed:', refreshErr);
      }

      const reqUrl = String(originalRequest?.url ?? '');
      // Only wipe session if the failing request is an authoritative identity endpoint (/users/me or /auth/*)
      const isAuthEndpoint = reqUrl.includes('/users/me') || reqUrl.includes('/auth/');
      if (isAuthEndpoint) {
        try {
          localStorage.removeItem('fera_user');
        } catch {}
        notifyUnauthorized({
          url: reqUrl,
          status,
          error,
        });
      }
    } else if (status === 401) {
      const reqUrl = String(error.config?.url ?? '');
      const isAuthEndpoint = reqUrl.includes('/users/me') || reqUrl.includes('/auth/');
      if (isAuthEndpoint) {
        try {
          localStorage.removeItem('fera_user');
        } catch {}
        notifyUnauthorized({
          url: reqUrl,
          status,
          error,
        });
      }
    }
    // Note: status 403 is Forbidden / Pro Plan Required, NOT expired credentials.
    // We intentionally do NOT clear localStorage or notifyUnauthorized on 403.
    return Promise.reject(error);
  }
);

interface ApiClient {
  get: <T = any>(url: string, config?: any) => Promise<{ data: T }>;
  post: <T = any>(url: string, payload?: Record<string, any>, config?: any) => Promise<{ data: T }>;
  put: <T = any>(url: string, payload?: Record<string, any>, config?: any) => Promise<{ data: T }>;
  patch: <T = any>(url: string, payload?: Record<string, any>, config?: any) => Promise<{ data: T }>;
  delete: <T = any>(url: string, config?: any) => Promise<{ data: T }>;
}

const localApi: ApiClient = {
  get: (url: string) => localGet(url) as any,
  post: (url: string, payload: Record<string, any> = {}) => localPost(url, payload) as any,
  put: (url: string, payload: Record<string, any> = {}) => localPut(url, payload) as any,
  patch: (url: string, payload: Record<string, any> = {}) => localPatch(url, payload) as any,
  delete: (url: string) => localDelete(url) as any,
};

const remoteApiAdapter: ApiClient = {
  get: (url, config) => remoteApi.get(url, config),
  post: (url, payload = {}, config) => remoteApi.post(url, payload, config),
  put: (url, payload = {}, config) => remoteApi.put(url, payload, config),
  patch: (url, payload = {}, config) => remoteApi.patch(url, payload, config),
  delete: (url, config) => remoteApi.delete(url, config),
};

const api: ApiClient = USE_LOCAL_STORAGE_API ? localApi : remoteApiAdapter;

export default api;
