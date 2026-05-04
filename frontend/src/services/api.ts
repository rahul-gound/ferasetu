import axios from 'axios';

const USE_LOCAL_STORAGE_API = import.meta.env.VITE_USE_LOCAL_STORAGE !== 'false';

interface LocalUser {
  id: string;
  email: string;
  password?: string;
  password_hash?: string;
  password_salt?: string;
  name: string;
  phone?: string;
  business_name?: string;
  plan: 'free' | 'premium' | 'trial' | 'basic' | 'standard' | 'pro';
  preferred_language: string;
  subdomain?: string;
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
  sections: unknown[];
  config: Record<string, unknown>;
  is_published: 0 | 1;
  created_at: string;
  updated_at: string;
}

interface LocalDb {
  users: LocalUser[];
  products: LocalProduct[];
  orders: LocalOrder[];
  websites: LocalWebsite[];
}

const LOCAL_DB_KEY = 'fera_local_db_v1';
const MAX_MESSAGE_PREVIEW_LENGTH = 120;

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
    return { users: [], products: [], orders: [], websites: [] };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<LocalDb>;
    return {
      users: parsed.users || [],
      products: parsed.products || [],
      orders: parsed.orders || [],
      websites: parsed.websites || [],
    };
  } catch {
    return { users: [], products: [], orders: [], websites: [] };
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
  return safeUser;
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

  if (path === '/products') {
    const userId = requireAuth();
    const products = db.products.filter(p => p.user_id === userId);
    return Promise.resolve(createResponse({ products }));
  }

  if (path === '/orders') {
    const userId = requireAuth();
    const orders = db.orders
      .filter(o => o.user_id === userId)
      .map(o => ({ ...o, items_count: o.items?.length || 0 }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return Promise.resolve(createResponse({ orders }));
  }

  if (path === '/website') {
    const userId = requireAuth();
    const website = db.websites.find(w => w.user_id === userId);
    if (!website) throw createHttpError(404, 'Website not found');
    return Promise.resolve(createResponse(website));
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

    return Promise.resolve(createResponse({
      stats: {
        total_revenue: totalRevenue,
        total_orders: totalOrders,
        pending_orders: pendingOrders,
        low_stock_count: lowStockCount,
        revenue_change: 0,
        orders_change: 0,
      },
      summary,
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

    return Promise.resolve(createResponse({
      sales: buildRevenueChart(recentOrders, days),
      category_breakdown: Array.from(categoryMap.values()),
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

  throw createHttpError(404, `Unknown GET endpoint: ${path}`);
}

async function localPost(url: string, payload: Record<string, any>) {
  const { path } = splitUrl(url);
  const db = loadDb();

  if (path === '/auth/register') {
    const email = String(payload.email || '').trim().toLowerCase();
    const password = String(payload.password || '');
    if (!email || !password) throw createHttpError(400, 'Email and password are required');
    if (db.users.some(u => u.email === email)) throw createHttpError(409, 'Email already registered');

    const name = String(payload.name || 'User').trim();
    const businessName = String(payload.businessName || '').trim();
    const user: LocalUser = {
      id: createId(),
      email,
      password_salt: createSalt(),
      name,
      phone: payload.phone ? String(payload.phone) : undefined,
      business_name: businessName || undefined,
      plan: 'trial',
      preferred_language: String(payload.preferredLanguage || 'en'),
      subdomain: generateSubdomain(businessName || name || 'my-store'),
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
      created_at: now(),
      updated_at: now(),
    };
    db.products.push(product);
    saveDb(db);
    return createResponse(product, 201);
  }

  if (path === '/website') {
    const userId = requireAuth();
    const existing = db.websites.find(w => w.user_id === userId);
    if (existing) {
      existing.name = String(payload.name || existing.name);
      existing.template = String(payload.template || existing.template || 'general');
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
      sections: Array.isArray(payload.sections) ? payload.sections : [],
      config: {},
      is_published: 0,
      created_at: now(),
      updated_at: now(),
    };
    db.websites.push(website);
    saveDb(db);
    return createResponse(website, 201);
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
    return createResponse({
      credits: user || { ai_credits_balance: 0, ai_credits_monthly_limit: 0, ai_credits_used_month: 0 },
      packs: {
        small: { credits: 250, amount: 149, label: '250 AI credits' },
        growth: { credits: 1000, amount: 499, label: '1,000 AI credits' },
        scale: { credits: 3000, amount: 1299, label: '3,000 AI credits' }
      },
      purchases: [],
      usage: []
    });
  }

  if (path === '/payment/ai-credits/purchase') {
    const userId = getCurrentUserId();
    const user = userId ? db.users.find(u => u.id === userId) : null;
    const packs: Record<string, number> = { small: 250, growth: 1000, scale: 3000 };
    const credits = packs[String(payload.pack)] || 0;
    if (user && credits) {
      user.ai_credits_balance = (user.ai_credits_balance || 0) + credits;
      saveDb(db);
    }
    return createResponse({ success: true, ai_credits_balance: user?.ai_credits_balance || 0 }, 201);
  }

  if (path === '/payment/initialize') {
    const userId = getCurrentUserId();
    const user = userId ? db.users.find(u => u.id === userId) : null;
    const plan = String(payload.plan || 'basic') as LocalUser['plan'];
    const creditsByPlan: Record<string, number> = { basic: 100, standard: 500, pro: 2000, premium: 500 };
    if (user) {
      user.plan = plan;
      user.ai_credits_balance = (user.ai_credits_balance || 0) + (creditsByPlan[plan] || 0);
      user.ai_credits_monthly_limit = creditsByPlan[plan] || user.ai_credits_monthly_limit || 20;
      user.ai_credits_used_month = 0;
      saveDb(db);
    }
    return createResponse({
      success: true,
      id: createId(),
      plan,
      providerOrderId: `order_${createId().substring(0, 14)}`,
      amount: Number(payload.amount || 0),
      currency: 'INR',
      key: 'rzp_test_local_mock'
    }, 201);
  }

  if (path === '/payment/verify') {
    const userId = getCurrentUserId();
    if (userId) {
      const user = db.users.find(u => u.id === userId);
      if (user) {
        user.plan = 'premium';
        saveDb(db);
      }
    }
    return createResponse({ success: true, message: 'Plan upgraded successfully' });
  }

  if (path === '/voice/text-to-speech') {
    return createResponse({ audio: null });
  }

  throw createHttpError(404, `Unknown POST endpoint: ${path}`);
}

async function localPut(url: string, payload: Record<string, any>) {
  const { path } = splitUrl(url);
  const db = loadDb();
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

  throw createHttpError(404, `Unknown DELETE endpoint: ${path}`);
}

const remoteApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' }
});

// Attach auth token to all requests
remoteApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('fera_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
remoteApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('fera_token');
      localStorage.removeItem('fera_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

interface ApiClient {
  get: <T = any>(url: string) => Promise<{ data: T }>;
  post: <T = any>(url: string, payload: Record<string, any>) => Promise<{ data: T }>;
  put: <T = any>(url: string, payload: Record<string, any>) => Promise<{ data: T }>;
  patch: <T = any>(url: string, payload: Record<string, any>) => Promise<{ data: T }>;
  delete: <T = any>(url: string) => Promise<{ data: T }>;
}

const localApi: ApiClient = {
  get: (url: string) => localGet(url) as any,
  post: (url: string, payload: Record<string, any>) => localPost(url, payload) as any,
  put: (url: string, payload: Record<string, any>) => localPut(url, payload) as any,
  patch: (url: string, payload: Record<string, any>) => localPatch(url, payload) as any,
  delete: (url: string) => localDelete(url) as any,
};

const remoteApiAdapter: ApiClient = {
  get: (url) => remoteApi.get(url),
  post: (url, payload) => remoteApi.post(url, payload),
  put: (url, payload) => remoteApi.put(url, payload),
  patch: (url, payload) => remoteApi.patch(url, payload),
  delete: (url) => remoteApi.delete(url),
};

const api: ApiClient = USE_LOCAL_STORAGE_API ? localApi : remoteApiAdapter;

export default api;
