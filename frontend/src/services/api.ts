import axios from 'axios';

const USE_LOCAL_STORAGE_API = import.meta.env.VITE_USE_LOCAL_STORAGE !== 'false';

interface LocalUser {
  id: string;
  email: string;
  password: string;
  name: string;
  phone?: string;
  business_name?: string;
  plan: 'free' | 'premium';
  preferred_language: string;
  subdomain?: string;
  custom_domain?: string;
  created_at: string;
}

interface LocalProduct {
  id: string;
  user_id: string;
  name: string;
  description?: string;
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

const now = () => new Date().toISOString();
const createId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

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
  const { password, ...safeUser } = user;
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

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

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

function localGet(url: string) {
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

    const summary = {
      total_revenue: totalRevenue,
      total_orders: totalOrders,
      avg_order_value: totalOrders ? Number((totalRevenue / totalOrders).toFixed(2)) : 0,
      top_product: products[0]?.name || '—',
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

async function localPost(url: string, payload: Record<string, unknown>) {
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
      password: await hashPassword(password),
      name,
      phone: payload.phone ? String(payload.phone) : undefined,
      business_name: businessName || undefined,
      plan: 'free',
      preferred_language: String(payload.preferredLanguage || 'en'),
      subdomain: generateSubdomain(businessName || name || 'my-store'),
      custom_domain: undefined,
      created_at: now(),
    };

    db.users.push(user);
    saveDb(db);
    return createResponse({ user: userPublicData(user), token: `local-${user.id}` }, 201);
  }

  if (path === '/auth/login') {
    const email = String(payload.email || '').trim().toLowerCase();
    const password = String(payload.password || '');
    const hashedPassword = await hashPassword(password);
    const user = db.users.find(u => u.email === email && u.password === hashedPassword);
    if (!user) throw createHttpError(401, 'Invalid email or password');
    return createResponse({ user: userPublicData(user), token: `local-${user.id}` });
  }

  if (path === '/products') {
    const userId = requireAuth();
    const product: LocalProduct = {
      id: createId(),
      user_id: userId,
      name: String(payload.name || ''),
      description: payload.description ? String(payload.description) : undefined,
      price: Number(payload.price || 0),
      sale_price: payload.sale_price === null || payload.sale_price === undefined ? null : Number(payload.sale_price),
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
    return createResponse({
      content: `Local mode is enabled. I saved your message locally: "${message.slice(0, 120)}"`,
      model: 'Local Mock AI',
    });
  }

  if (path === '/voice/text-to-speech') {
    return createResponse({ audio: null });
  }

  throw createHttpError(404, `Unknown POST endpoint: ${path}`);
}

function localPut(url: string, payload: Record<string, unknown>) {
  const { path } = splitUrl(url);
  const db = loadDb();
  const userId = requireAuth();

  if (path.startsWith('/products/')) {
    const id = path.split('/')[2];
    const product = db.products.find(p => p.id === id && p.user_id === userId);
    if (!product) throw createHttpError(404, 'Product not found');
    Object.assign(product, {
      name: String(payload.name || product.name),
      description: payload.description === undefined ? product.description : String(payload.description),
      price: Number(payload.price ?? product.price),
      sale_price: payload.sale_price === null || payload.sale_price === undefined ? null : Number(payload.sale_price),
      category: String(payload.category || product.category || 'Other'),
      stock_quantity: Number(payload.stock_quantity ?? product.stock_quantity),
      image_url: payload.image_url === undefined ? product.image_url : String(payload.image_url),
      is_active: payload.is_active !== false,
      updated_at: now(),
    });
    saveDb(db);
    return Promise.resolve(createResponse(product));
  }

  throw createHttpError(404, `Unknown PUT endpoint: ${path}`);
}

function localPatch(url: string, payload: Record<string, unknown>) {
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
    order.payment_status = String(payload.payment_status || order.payment_status || 'unpaid');
    order.updated_at = now();
    saveDb(db);
    return Promise.resolve(createResponse(order));
  }

  throw createHttpError(404, `Unknown PATCH endpoint: ${path}`);
}

function localDelete(url: string) {
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

const localApi = {
  get: (url: string) => localGet(url),
  post: (url: string, payload: Record<string, unknown>) => localPost(url, payload),
  put: (url: string, payload: Record<string, unknown>) => localPut(url, payload),
  patch: (url: string, payload: Record<string, unknown>) => localPatch(url, payload),
  delete: (url: string) => localDelete(url),
};

const api = USE_LOCAL_STORAGE_API ? localApi : remoteApi;

export default api;
