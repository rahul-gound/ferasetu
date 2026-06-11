// FeraSetu — Cloudflare Worker API
// =================================
// A self-contained shopkeeper/store backend that runs natively on Cloudflare
// Workers. It is intentionally separate from the Express app in ../backend
// (that one depends on sync MySQL/SQLite, nodemailer SMTP, multer uploads and
// node-cron, none of which run on Workers).
//
// Storage: Cloudflare D1 (binding `DB`, configured in wrangler.toml).
// Tables are created lazily on first request, so no manual migration is needed.
//
// Routes implemented:
//   GET  /              -> service info
//   GET  /api/health    -> health check
//   GET  /api/products  -> list products
//   POST /api/products  -> create a product
//   GET  /api/orders    -> list orders
//   POST /api/orders    -> create an order
//
// Everything else returns a JSON 404. Unexpected errors return a JSON 500.

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
// Public API: allow any origin. Tighten `Access-Control-Allow-Origin` to your
// frontend domain (e.g. "https://fera-search.tech") if you want to lock it down.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept",
  "Access-Control-Max-Age": "86400",
};

// JSON response helper — always attaches CORS headers.
function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

function errorResponse(message, status = 400, details) {
  const body = { error: message };
  if (details !== undefined) body.details = details;
  return json(body, status);
}

// ---------------------------------------------------------------------------
// Schema — created once per database (idempotent).
// ---------------------------------------------------------------------------
let schemaReady = false;

async function ensureSchema(db) {
  if (schemaReady) return;
  // D1 batch runs these atomically. IF NOT EXISTS makes it safe to repeat.
  await db.batch([
    db.prepare(
      `CREATE TABLE IF NOT EXISTS products (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        price       REAL NOT NULL DEFAULT 0,
        stock       INTEGER NOT NULL DEFAULT 0,
        description TEXT,
        created_at  TEXT NOT NULL
      )`
    ),
    db.prepare(
      `CREATE TABLE IF NOT EXISTS orders (
        id            TEXT PRIMARY KEY,
        customer_name TEXT NOT NULL,
        items         TEXT NOT NULL DEFAULT '[]',
        total         REAL NOT NULL DEFAULT 0,
        status        TEXT NOT NULL DEFAULT 'pending',
        created_at    TEXT NOT NULL
      )`
    ),
  ]);
  schemaReady = true;
}

// ---------------------------------------------------------------------------
// Body parsing
// ---------------------------------------------------------------------------
async function readJsonBody(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new HttpError("Content-Type must be application/json", 415);
  }
  try {
    return await request.json();
  } catch {
    throw new HttpError("Invalid JSON body", 400);
  }
}

// Typed error so route handlers can throw a status + message cleanly.
class HttpError extends Error {
  constructor(message, status = 400, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------
async function listProducts(env) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM products ORDER BY created_at DESC"
  ).all();
  return json({ products: results ?? [] });
}

async function createProduct(request, env) {
  const body = await readJsonBody(request);

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) throw new HttpError("`name` is required", 422);

  const price = Number(body.price ?? 0);
  if (!Number.isFinite(price) || price < 0) {
    throw new HttpError("`price` must be a non-negative number", 422);
  }

  const stock = Number.isFinite(Number(body.stock)) ? Math.trunc(Number(body.stock)) : 0;
  const description = typeof body.description === "string" ? body.description : null;

  const product = {
    id: crypto.randomUUID(),
    name,
    price,
    stock,
    description,
    created_at: new Date().toISOString(),
  };

  await env.DB.prepare(
    `INSERT INTO products (id, name, price, stock, description, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(product.id, product.name, product.price, product.stock, product.description, product.created_at)
    .run();

  return json({ product }, 201);
}

async function listOrders(env) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM orders ORDER BY created_at DESC"
  ).all();
  // `items` is stored as JSON text — parse it back for the client.
  const orders = (results ?? []).map((o) => ({
    ...o,
    items: safeParseArray(o.items),
  }));
  return json({ orders });
}

async function createOrder(request, env) {
  const body = await readJsonBody(request);

  const customerName = typeof body.customer_name === "string" ? body.customer_name.trim() : "";
  if (!customerName) throw new HttpError("`customer_name` is required", 422);

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) throw new HttpError("`items` must be a non-empty array", 422);

  // total: use provided value if valid, else sum item.price * item.qty.
  let total = Number(body.total);
  if (!Number.isFinite(total) || total < 0) {
    total = items.reduce((sum, it) => {
      const p = Number(it?.price) || 0;
      const q = Number(it?.qty ?? it?.quantity) || 0;
      return sum + p * q;
    }, 0);
  }

  const status = typeof body.status === "string" && body.status.trim() ? body.status.trim() : "pending";

  const order = {
    id: crypto.randomUUID(),
    customer_name: customerName,
    items,
    total,
    status,
    created_at: new Date().toISOString(),
  };

  await env.DB.prepare(
    `INSERT INTO orders (id, customer_name, items, total, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(order.id, order.customer_name, JSON.stringify(order.items), order.total, order.status, order.created_at)
    .run();

  return json({ order }, 201);
}

function safeParseArray(value) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/"; // strip trailing slashes
  const method = request.method.toUpperCase();

  if (path === "/" && method === "GET") {
    return json({
      service: "FeraSetu Worker API",
      status: "running",
      endpoints: [
        "GET /api/health",
        "GET /api/products",
        "POST /api/products",
        "GET /api/orders",
        "POST /api/orders",
      ],
    });
  }

  if (path === "/api/health" && method === "GET") {
    return json({ status: "ok", timestamp: new Date().toISOString(), version: "1.0.0" });
  }

  if (path === "/api/products") {
    if (method === "GET") return listProducts(env);
    if (method === "POST") return createProduct(request, env);
    throw new HttpError("Method not allowed", 405);
  }

  if (path === "/api/orders") {
    if (method === "GET") return listOrders(env);
    if (method === "POST") return createOrder(request, env);
    throw new HttpError("Method not allowed", 405);
  }

  return errorResponse(`Not found: ${method} ${path}`, 404);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
export default {
  async fetch(request, env, ctx) {
    // CORS preflight — answer before doing any work.
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    try {
      if (!env.DB) {
        // D1 binding missing — usually wrangler.toml database_id not set.
        return errorResponse(
          "Database not configured. Set the D1 `database_id` in wrangler.toml and redeploy.",
          503
        );
      }

      await ensureSchema(env.DB);
      return await route(request, env);
    } catch (err) {
      if (err instanceof HttpError) {
        return errorResponse(err.message, err.status, err.details);
      }
      // Unexpected — log for `wrangler tail`, return a generic JSON 500.
      console.error("Unhandled worker error:", err && err.stack ? err.stack : err);
      return errorResponse("Internal server error", 500);
    }
  },
};
