// FeraSetu Pro — Restricted SDK Namespace (ferasetu.*)
// =============================================================================
// Exposes only approved platform APIs.
// Executes strictly through platform services with tenant isolation.
// No raw D1 handles, no secrets, no arbitrary network.
// =============================================================================

import { FeraRuntimeError } from './feraRuntime.js';

export function createFeraSDK({
  tenantId,
  env,
  authContext = {}, // { customer, user, role: 'customer' | 'merchant' | 'guest' }
  quotaTracker = null,
}) {
  if (!tenantId) {
    throw new FeraRuntimeError("Tenant context is required to initialize FeraSetu SDK", "TENANT_REQUIRED");
  }

  const db = env?.DB;

  return {
    // -------------------------------------------------------------------------
    // 1. ferasetu.auth
    // -------------------------------------------------------------------------
    auth: {
      currentUser: () => {
        if (authContext.customer) {
          return {
            id: authContext.customer.id,
            email: authContext.customer.email,
            name: authContext.customer.name || "",
            role: "customer",
          };
        }
        if (authContext.user) {
          return {
            id: authContext.user.$id || authContext.user.id,
            email: authContext.user.email,
            name: authContext.user.name || "",
            role: "merchant",
          };
        }
        return null;
      },

      isAuthenticated: () => {
        return Boolean(authContext.customer?.id || authContext.user?.$id || authContext.user?.id);
      },

      requireAuth: () => {
        const isAuthed = Boolean(authContext.customer?.id || authContext.user?.$id || authContext.user?.id);
        if (!isAuthed) {
          throw new FeraRuntimeError("Authentication required for this operation", "UNAUTHENTICATED");
        }
        return true;
      },

      getCustomer: async (id) => {
        if (!id || !db) return null;
        // Strict IDOR protection: Customers can only view their own profile
        if (authContext.role === 'customer' && authContext.customer?.id !== id) {
          throw new FeraRuntimeError("Unauthorized: Cannot access other customer profile", "FORBIDDEN");
        }
        try {
          const row = await db.prepare(
            "SELECT id, organization_id, email, name, phone, address, created_at FROM customers WHERE id = ? AND organization_id = ?"
          ).bind(id, tenantId).first();
          return row || null;
        } catch {
          return null;
        }
      },
    },

    // -------------------------------------------------------------------------
    // 2. ferasetu.products
    // -------------------------------------------------------------------------
    products: {
      list: async (filter = {}) => {
        if (!db) return [];
        const limit = Math.min(Math.max(Number(filter.limit) || 20, 1), 100);
        const category = filter.category ? String(filter.category).trim() : null;
        const search = filter.search ? `%${String(filter.search).trim().toLowerCase()}%` : null;
        const featured = Boolean(filter.featured);

        let query = `
          SELECT id, user_id, organization_id, name, description, price, sale_price,
                 category, stock_quantity, image_url, is_active, sku, barcode, created_at
          FROM products
          WHERE (organization_id = ? OR user_id = ?) AND is_active = 1
        `;
        const params = [tenantId, tenantId];

        if (category) {
          query += " AND LOWER(category) = LOWER(?)";
          params.push(category);
        }
        if (search) {
          query += " AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ?)";
          params.push(search, search);
        }

        query += " ORDER BY created_at DESC LIMIT ?";
        params.push(limit);

        try {
          const res = await db.prepare(query).bind(...params).all();
          return res.results || [];
        } catch (err) {
          console.warn("[ferasetu.products.list] error:", err?.message);
          return [];
        }
      },

      get: async (idOrSlug) => {
        if (!idOrSlug || !db) return null;
        try {
          // Check by ID or SKU
          const row = await db.prepare(`
            SELECT id, user_id, organization_id, name, description, price, sale_price,
                   category, stock_quantity, image_url, is_active, sku, barcode, created_at
            FROM products
            WHERE (id = ? OR sku = ? OR LOWER(name) = LOWER(?))
              AND (organization_id = ? OR user_id = ?)
            LIMIT 1
          `).bind(idOrSlug, idOrSlug, idOrSlug, tenantId, tenantId).first();
          return row || null;
        } catch {
          return null;
        }
      },
    },

    // -------------------------------------------------------------------------
    // 3. ferasetu.orders
    // -------------------------------------------------------------------------
    orders: {
      get: async (orderId) => {
        if (!orderId || !db) return null;
        try {
          const order = await db.prepare(`
            SELECT id, user_id, organization_id, customer_id, customer_name, customer_phone,
                   customer_address, items, total, delivery_type, status, payment_status,
                   notes, created_at, updated_at
            FROM orders
            WHERE id = ? AND (organization_id = ? OR user_id = ?)
          `).bind(orderId, tenantId, tenantId).first();

          if (!order) return null;

          // Strict IDOR protection: Customers can only access their own order
          if (authContext.role === 'customer') {
            if (!authContext.customer?.id || order.customer_id !== authContext.customer.id) {
              throw new FeraRuntimeError("Unauthorized: You do not have access to this order", "FORBIDDEN");
            }
          }

          if (typeof order.items === 'string') {
            try { order.items = JSON.parse(order.items); } catch {}
          }
          return order;
        } catch (err) {
          if (err instanceof FeraRuntimeError) throw err;
          return null;
        }
      },

      list: async (filter = {}) => {
        if (!db) return [];
        const limit = Math.min(Math.max(Number(filter.limit) || 20, 1), 50);

        let query = `
          SELECT id, user_id, organization_id, customer_id, customer_name, customer_phone,
                 total, delivery_type, status, payment_status, created_at
          FROM orders
          WHERE (organization_id = ? OR user_id = ?)
        `;
        const params = [tenantId, tenantId];

        // Customer can only list their own orders
        if (authContext.role === 'customer') {
          if (!authContext.customer?.id) return [];
          query += " AND customer_id = ?";
          params.push(authContext.customer.id);
        } else if (filter.customerId) {
          query += " AND customer_id = ?";
          params.push(filter.customerId);
        }

        query += " ORDER BY created_at DESC LIMIT ?";
        params.push(limit);

        try {
          const res = await db.prepare(query).bind(...params).all();
          return res.results || [];
        } catch {
          return [];
        }
      },

      create: async (orderInput) => {
        if (!db) throw new FeraRuntimeError("Database unavailable", "DATABASE_ERROR");
        if (!orderInput || typeof orderInput !== 'object') {
          throw new FeraRuntimeError("Invalid order data", "INVALID_INPUT");
        }

        const items = Array.isArray(orderInput.items) ? orderInput.items : [];
        if (items.length === 0) {
          throw new FeraRuntimeError("Order must contain at least one item", "INVALID_ITEMS");
        }

        const customer = orderInput.customer || authContext.customer || {};
        const customerId = authContext.customer?.id || customer.id || null;
        const customerName = customer.name || orderInput.customer_name || "Guest Customer";
        const customerPhone = customer.phone || orderInput.customer_phone || "";
        const customerAddress = customer.address || orderInput.customer_address || "";

        let total = Number(orderInput.total) || 0;
        if (total <= 0) {
          total = items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
        }

        const orderId = `ord_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
        const now = new Date().toISOString();
        const deliveryType = orderInput.delivery_type === 'pickup' ? 'pickup' : 'delivery';
        const notes = orderInput.notes ? String(orderInput.notes).slice(0, 500) : "";

        await db.prepare(`
          INSERT INTO orders (
            id, user_id, organization_id, customer_id, customer_name, customer_phone,
            customer_address, items, total, delivery_type, status, payment_status, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', ?, ?, ?)
        `).bind(
          orderId, tenantId, tenantId, customerId, customerName, customerPhone,
          customerAddress, JSON.stringify(items), total, deliveryType, notes, now, now
        ).run();

        return {
          id: orderId,
          total,
          status: 'pending',
          payment_status: 'pending',
          customer_name: customerName,
          items_count: items.length,
          created_at: now,
        };
      },
    },

    // -------------------------------------------------------------------------
    // 4. ferasetu.customers
    // -------------------------------------------------------------------------
    customers: {
      get: async (id) => {
        if (!id || !db) return null;
        if (authContext.role === 'customer' && authContext.customer?.id !== id) {
          throw new FeraRuntimeError("Unauthorized customer access", "FORBIDDEN");
        }
        try {
          return await db.prepare(
            "SELECT id, name, email, phone, address, created_at FROM customers WHERE id = ? AND organization_id = ?"
          ).bind(id, tenantId).first();
        } catch {
          return null;
        }
      },

      update: async (id, data) => {
        if (!id || !data || !db) throw new FeraRuntimeError("Invalid customer update input", "INVALID_INPUT");
        if (authContext.role === 'customer' && authContext.customer?.id !== id) {
          throw new FeraRuntimeError("Unauthorized customer update", "FORBIDDEN");
        }
        const name = data.name !== undefined ? String(data.name).trim() : null;
        const phone = data.phone !== undefined ? String(data.phone).trim() : null;
        const address = data.address !== undefined ? String(data.address).trim() : null;
        const now = new Date().toISOString();

        await db.prepare(`
          UPDATE customers
          SET name = COALESCE(?, name),
              phone = COALESCE(?, phone),
              address = COALESCE(?, address),
              updated_at = ?
          WHERE id = ? AND organization_id = ?
        `).bind(name, phone, address, now, id, tenantId).run();

        return { success: true, updated_at: now };
      },

      createInquiry: async (inquiryData) => {
        if (!inquiryData || typeof inquiryData !== 'object') {
          throw new FeraRuntimeError("Invalid inquiry data", "INVALID_INPUT");
        }
        const inquiryId = `inq_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
        const storageKey = `inquiry:${inquiryId}`;
        const payload = {
          id: inquiryId,
          tenant_id: tenantId,
          product_id: inquiryData.product_id || null,
          quantity: Number(inquiryData.quantity) || 1,
          name: inquiryData.name || authContext.customer?.name || "Anonymous",
          email: inquiryData.email || authContext.customer?.email || "",
          message: String(inquiryData.message || "").slice(0, 2000),
          created_at: new Date().toISOString(),
        };

        if (db) {
          const valStr = JSON.stringify(payload);
          await db.prepare(`
            INSERT OR REPLACE INTO site_storage (id, tenant_id, key, value, bytes_size, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).bind(
            `stor_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`,
            tenantId, storageKey, valStr, valStr.length, payload.created_at, payload.created_at
          ).run();
        }

        return { success: true, inquiry_id: inquiryId };
      },
    },

    // -------------------------------------------------------------------------
    // 5. ferasetu.pages
    // -------------------------------------------------------------------------
    pages: {
      list: async () => {
        if (!db) return [];
        try {
          const res = await db.prepare(`
            SELECT id, slug, title, type, status, parent_id, is_homepage, auth_required, order_index, created_at, updated_at
            FROM site_pages
            WHERE tenant_id = ? AND status = 'published'
            ORDER BY order_index ASC, created_at ASC
          `).bind(tenantId).all();
          return res.results || [];
        } catch {
          return [];
        }
      },

      get: async (slugOrId) => {
        if (!slugOrId || !db) return null;
        try {
          const page = await db.prepare(`
            SELECT id, slug, title, type, content, status, parent_id, is_homepage, auth_required, seo_title, seo_description
            FROM site_pages
            WHERE tenant_id = ? AND (slug = ? OR id = ?)
            LIMIT 1
          `).bind(tenantId, slugOrId, slugOrId).first();

          if (!page) return null;
          if (typeof page.content === 'string') {
            try { page.content = JSON.parse(page.content); } catch {}
          }
          return page;
        } catch {
          return null;
        }
      },
    },

    // -------------------------------------------------------------------------
    // 6. ferasetu.routes
    // -------------------------------------------------------------------------
    routes: {
      list: async () => {
        if (!db) return [];
        try {
          const res = await db.prepare(
            "SELECT id, path_pattern, page_id, access_level, function_binding, status FROM site_routes WHERE tenant_id = ?"
          ).bind(tenantId).all();
          return res.results || [];
        } catch {
          return [];
        }
      },

      match: async (path) => {
        if (!path || !db) return null;
        try {
          const routes = await db.prepare(
            "SELECT * FROM site_routes WHERE tenant_id = ? AND status = 'published'"
          ).bind(tenantId).all();

          const list = routes.results || [];
          for (const r of list) {
            // Static match
            if (r.path_pattern === path) {
              return { matched: true, route: r, params: {} };
            }
            // Dynamic parameter match e.g. /products/:slug
            if (r.path_pattern.includes(':')) {
              const patternParts = r.path_pattern.split('/');
              const pathParts = path.split('/');
              if (patternParts.length === pathParts.length) {
                const params = {};
                let matches = true;
                for (let i = 0; i < patternParts.length; i++) {
                  if (patternParts[i].startsWith(':')) {
                    params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
                  } else if (patternParts[i] !== pathParts[i]) {
                    matches = false;
                    break;
                  }
                }
                if (matches) {
                  return { matched: true, route: r, params };
                }
              }
            }
          }
          return null;
        } catch {
          return null;
        }
      },
    },

    // -------------------------------------------------------------------------
    // 7. ferasetu.email
    // -------------------------------------------------------------------------
    email: {
      send: async (emailData) => {
        if (!emailData || typeof emailData !== 'object') {
          throw new FeraRuntimeError("Invalid email parameters", "INVALID_INPUT");
        }
        const to = emailData.to || emailData.data?.email;
        const subject = emailData.subject || `Notification from store`;
        const template = emailData.template || "generic";
        const contentData = emailData.data || {};

        // Use mailer service if configured
        const brevoKey = env?.BREVO_API_KEY || env?.SMTP_API_KEY;
        if (brevoKey && to) {
          try {
            await fetch("https://api.brevo.com/v3/smtp/email", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "api-key": brevoKey,
              },
              body: JSON.stringify({
                to: [{ email: to }],
                subject,
                htmlContent: `<h3>${subject}</h3><p>Template: ${template}</p><pre>${JSON.stringify(contentData, null, 2)}</pre>`,
                sender: { email: "noreply@ferasetu.com", name: "FeraSetu Notification" },
              }),
            });
          } catch (mErr) {
            console.warn("[ferasetu.email.send] Brevo dispatch note:", mErr?.message);
          }
        }

        return {
          sent: true,
          to: to || "admin",
          template,
          timestamp: new Date().toISOString(),
        };
      },
    },

    // -------------------------------------------------------------------------
    // 8. ferasetu.storage (Tenant-Isolated Key-Value Store)
    // -------------------------------------------------------------------------
    storage: {
      get: async (key) => {
        if (!key || !db) return null;
        try {
          const row = await db.prepare(
            "SELECT value FROM site_storage WHERE tenant_id = ? AND key = ?"
          ).bind(tenantId, String(key)).first();

          if (!row || row.value === undefined) return null;
          try {
            return JSON.parse(row.value);
          } catch {
            return row.value;
          }
        } catch {
          return null;
        }
      },

      set: async (key, value) => {
        if (!key || !db) throw new FeraRuntimeError("Key and database required", "INVALID_INPUT");
        const valStr = typeof value === 'string' ? value : JSON.stringify(value);
        const bytesSize = valStr.length;

        // Quota check
        if (bytesSize > 65536) {
          throw new FeraRuntimeError("Storage value exceeds 64 KB per key limit", "STORAGE_KEY_LIMIT");
        }

        const now = new Date().toISOString();
        const id = `stor_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;

        await db.prepare(`
          INSERT INTO site_storage (id, tenant_id, key, value, bytes_size, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(tenant_id, key) DO UPDATE SET
            value = excluded.value,
            bytes_size = excluded.bytes_size,
            updated_at = excluded.updated_at
        `).bind(id, tenantId, String(key), valStr, bytesSize, now, now).run();

        return true;
      },

      delete: async (key) => {
        if (!key || !db) return false;
        try {
          await db.prepare(
            "DELETE FROM site_storage WHERE tenant_id = ? AND key = ?"
          ).bind(tenantId, String(key)).run();
          return true;
        } catch {
          return false;
        }
      },
    },

    // -------------------------------------------------------------------------
    // 9. ferasetu.analytics
    // -------------------------------------------------------------------------
    analytics: {
      track: async (eventName, payload = {}) => {
        if (!eventName || !db) return false;
        try {
          const logId = `log_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
          await db.prepare(`
            INSERT INTO site_execution_logs (id, tenant_id, function_name, event_type, details, status_code, created_at)
            VALUES (?, ?, ?, 'analytics_track', ?, 200, ?)
          `).bind(
            logId, tenantId, String(eventName), JSON.stringify(payload).slice(0, 1000), new Date().toISOString()
          ).run();
          return true;
        } catch {
          return false;
        }
      },
    },
  };
}
