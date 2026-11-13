// FeraSetu — Customer Segments Routes
// Cloudflare Worker Serverless Route Handler

export const PRESET_SEGMENT_TEMPLATES = [
  {
    id: 'email_subscribers_no_purchase',
    name: "Email subscribers who haven't purchased yet",
    description: "Subscribed to email marketing with 0 orders. Best for welcome discounts and first-purchase encouragement.",
    conjunction: 'AND',
    rules: [
      { field: 'orders_count', operator: 'equals', value: 0 },
      { field: 'email_subscribed', operator: 'equals', value: true }
    ]
  },
  {
    id: 'haven_not_bought',
    name: "Customers who haven't bought",
    description: "All contacts with 0 orders placed. When one buys, they automatically leave the segment.",
    conjunction: 'AND',
    rules: [
      { field: 'orders_count', operator: 'equals', value: 0 }
    ]
  },
  {
    id: 'first_time_buyers',
    name: "First-time buyers",
    description: "Placed exactly 1 order. Perfect for asking for reviews or offering second-order perks.",
    conjunction: 'AND',
    rules: [
      { field: 'orders_count', operator: 'equals', value: 1 }
    ]
  },
  {
    id: 'repeat_buyers',
    name: "Repeat buyers",
    description: "Customers who ordered 2 or more times. Your most loyal regulars.",
    conjunction: 'AND',
    rules: [
      { field: 'orders_count', operator: 'greater_than_or_equal', value: 2 }
    ]
  }
];

export function evaluateCustomerAgainstRule(customer, rule) {
  if (rule.field === 'orders_count') {
    const customerVal = Number(customer.total_orders || customer.orders_count || 0);
    const target = Number(rule.value);
    switch (rule.operator) {
      case 'equals': return customerVal === target;
      case 'not_equals': return customerVal !== target;
      case 'greater_than': return customerVal > target;
      case 'less_than': return customerVal < target;
      case 'greater_than_or_equal': return customerVal >= target;
      case 'less_than_or_equal': return customerVal <= target;
      default: return true;
    }
  }

  if (rule.field === 'total_spent') {
    const customerVal = Number(customer.total_spent || 0);
    const target = Number(rule.value);
    switch (rule.operator) {
      case 'equals': return customerVal === target;
      case 'not_equals': return customerVal !== target;
      case 'greater_than': return customerVal > target;
      case 'less_than': return customerVal < target;
      case 'greater_than_or_equal': return customerVal >= target;
      case 'less_than_or_equal': return customerVal <= target;
      default: return true;
    }
  }

  if (rule.field === 'email_subscribed') {
    const isSub = Boolean(customer.email && customer.email.length > 3);
    return isSub === Boolean(rule.value);
  }

  if (rule.field === 'account_type') {
    return rule.value === 'registered' ? Boolean(customer.has_password) : !customer.has_password;
  }

  if (rule.field === 'city') {
    const addr = String(customer.address || customer.city || '').toLowerCase();
    const target = String(rule.value || '').toLowerCase();
    return addr.includes(target);
  }

  return true;
}

export function filterCustomersBySegment(customers, rules, conjunction = 'AND') {
  if (!rules || rules.length === 0) return customers;
  return customers.filter(customer => {
    if (conjunction === 'OR') {
      return rules.some(r => evaluateCustomerAgainstRule(customer, r));
    }
    return rules.every(r => evaluateCustomerAgainstRule(customer, r));
  });
}

export async function fetchEnrichedCustomersForOrg(env, organizationId) {
  let customers = [];
  try {
    const custRes = await env.DB.prepare(
      "SELECT id, organization_id, name, phone, address, created_at, updated_at FROM customers WHERE organization_id = ? ORDER BY created_at DESC"
    ).bind(organizationId).all();
    customers = custRes?.results || [];
  } catch {
    customers = [];
  }

  let orders = [];
  try {
    const ordRes = await env.DB.prepare(
      "SELECT id, customer_id, customer_name, customer_phone, delivery_address, total, status, created_at FROM orders WHERE organization_id = ?"
    ).bind(organizationId).all();
    orders = ordRes?.results || [];
  } catch {
    orders = [];
  }

  const orderStatsByCustId = new Map();
  const orderStatsByPhone = new Map();

  for (const ord of orders) {
    const tot = Number(ord.total) || 0;
    if (ord.customer_id) {
      const cur = orderStatsByCustId.get(ord.customer_id) || { count: 0, spent: 0 };
      cur.count += 1;
      cur.spent += tot;
      orderStatsByCustId.set(ord.customer_id, cur);
    }
    if (ord.customer_phone) {
      const cur = orderStatsByPhone.get(ord.customer_phone) || { count: 0, spent: 0 };
      cur.count += 1;
      cur.spent += tot;
      orderStatsByPhone.set(ord.customer_phone, cur);
    }
  }

  return customers.map(c => {
    const statsId = orderStatsByCustId.get(c.id);
    const statsPhone = orderStatsByPhone.get(c.phone);
    const total_orders = (statsId?.count || 0) + (statsPhone?.count || 0);
    const total_spent = (statsId?.spent || 0) + (statsPhone?.spent || 0);
    return {
      ...c,
      total_orders,
      total_spent,
      orders_count: total_orders,
    };
  });
}

export async function handleCustomerSegmentsRoutes(request, env, helpers) {
  const { json, errorResponse, requireOrgContext, readJsonBody, HttpError } = helpers;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const method = request.method.toUpperCase();

  // POST /api/customers/segments/preview
  if (path === "/api/customers/segments/preview" && method === "POST") {
    const ctx = await requireOrgContext(request, env, 'staff');
    const body = await readJsonBody(request);
    const rules = Array.isArray(body.rules) ? body.rules : [];
    const conjunction = body.conjunction === 'OR' ? 'OR' : 'AND';

    const enrichedCustomers = await fetchEnrichedCustomersForOrg(env, ctx.organizationId);
    const matching = filterCustomersBySegment(enrichedCustomers, rules, conjunction);

    const totalCount = enrichedCustomers.length;
    const matchedCount = matching.length;
    const percentage = totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 0;

    return json({
      success: true,
      total_customers: totalCount,
      matched_count: matchedCount,
      percentage,
      matching_sample: matching.slice(0, 50)
    }, 200, {}, request);
  }

  // GET /api/customers/segments or POST /api/customers/segments
  if (path === "/api/customers/segments") {
    const ctx = await requireOrgContext(request, env, 'staff');

    if (method === "GET") {
      let segments = [];
      try {
        const segRes = await env.DB.prepare(
          "SELECT * FROM customer_segments WHERE organization_id = ? ORDER BY created_at DESC"
        ).bind(ctx.organizationId).all();
        segments = segRes?.results || [];
      } catch (err) {
        console.warn("Error reading customer segments:", err?.message || err);
        segments = [];
      }

      const formatted = segments.map(s => {
        let rules = [];
        try {
          rules = JSON.parse(s.rules_json || '[]');
        } catch {
          rules = [];
        }
        return {
          id: s.id,
          name: s.name,
          description: s.description,
          query_type: s.query_type,
          template_id: s.template_id,
          rules,
          conjunction: s.conjunction || 'AND',
          created_at: s.created_at,
          updated_at: s.updated_at
        };
      });

      return json({
        success: true,
        segments: formatted,
        templates: PRESET_SEGMENT_TEMPLATES
      }, 200, {}, request);
    }

    if (method === "POST") {
      const body = await readJsonBody(request);
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name) {
        throw new HttpError("Segment name is required", 400);
      }

      const id = `seg_${crypto.randomUUID()}`;
      const description = typeof body.description === 'string' ? body.description.trim() : null;
      const query_type = body.query_type || 'custom';
      const template_id = body.template_id || null;
      const rules = Array.isArray(body.rules) ? body.rules : [];
      const conjunction = body.conjunction === 'OR' ? 'OR' : 'AND';
      const rules_json = JSON.stringify(rules);
      const now = new Date().toISOString();

      await env.DB.prepare(`
        INSERT INTO customer_segments (
          id, organization_id, name, description, query_type, template_id, rules_json, conjunction, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id, ctx.organizationId, name, description, query_type, template_id, rules_json, conjunction, now, now
      ).run();

      return json({
        success: true,
        message: "Customer segment created successfully",
        segment: {
          id,
          name,
          description,
          query_type,
          template_id,
          rules,
          conjunction,
          created_at: now,
          updated_at: now
        }
      }, 201, {}, request);
    }

    return errorResponse("Method not allowed", 405, undefined, request);
  }

  // DELETE /api/customers/segments/:id or GET /api/customers/segments/:id
  if (path.startsWith("/api/customers/segments/")) {
    const ctx = await requireOrgContext(request, env, 'staff');
    const segId = path.slice("/api/customers/segments/".length);

    if (method === "DELETE") {
      const result = await env.DB.prepare(
        "DELETE FROM customer_segments WHERE id = ? AND organization_id = ?"
      ).bind(segId, ctx.organizationId).run();

      return json({ success: true, message: "Segment deleted successfully" }, 200, {}, request);
    }

    if (method === "GET") {
      const segment = await env.DB.prepare(
        "SELECT * FROM customer_segments WHERE id = ? AND organization_id = ?"
      ).bind(segId, ctx.organizationId).first();

      if (!segment) {
        throw new HttpError("Segment not found", 404);
      }

      let rules = [];
      try { rules = JSON.parse(segment.rules_json || '[]'); } catch { rules = []; }

      const enrichedCustomers = await fetchEnrichedCustomersForOrg(env, ctx.organizationId);
      const matched = filterCustomersBySegment(enrichedCustomers, rules, segment.conjunction || 'AND');

      return json({
        success: true,
        segment: {
          ...segment,
          rules,
          customer_count: matched.length
        },
        matching_customers: matched
      }, 200, {}, request);
    }

    return errorResponse("Method not allowed", 405, undefined, request);
  }

  return null;
}
