// FeraSetu — Inventory Transfers & Stock Routing Routes
// Cloudflare Worker Serverless Route Handler

const DEFAULT_LOCATIONS = [
  { name: 'Main Warehouse (Central Godown)', type: 'warehouse', address: 'Plot 42, Industrial Area', city: 'Delhi', is_default: 1 },
  { name: 'Primary Retail Dukaan (Front Store)', type: 'store', address: 'Shop 12, Main Market', city: 'Delhi', is_default: 0 },
  { name: 'Regional Wholesale Supplier', type: 'supplier', address: 'APMC Market Yard', city: 'Karnal', is_default: 0 },
  { name: 'Express Delivery Hub', type: 'hub', address: 'Ring Road Depot', city: 'Gurugram', is_default: 0 },
];

export async function ensureLocationsSeeded(db, orgId) {
  if (!db || !orgId) return;
  try {
    const row = await db.prepare("SELECT COUNT(*) as count FROM locations WHERE organization_id = ?").bind(orgId).first();
    if (!row || Number(row.count) === 0) {
      for (const loc of DEFAULT_LOCATIONS) {
        const id = `loc_${crypto.randomUUID().slice(0, 8)}`;
        await db.prepare(`
          INSERT INTO locations (id, organization_id, name, type, address, city, is_default, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
        `).bind(id, orgId, loc.name, loc.type, loc.address, loc.city, loc.is_default).run();
      }
    }
  } catch (err) {
    console.warn("ensureLocationsSeeded notice:", err?.message || err);
  }
}

export async function handleTransfersRoutes(request, env, helpers) {
  const { json, errorResponse, requireOrgContext, readJsonBody, HttpError } = helpers;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const method = request.method.toUpperCase();

  // 1. GET /api/transfers/locations or POST /api/transfers/locations
  if (path === "/api/transfers/locations") {
    const ctx = await requireOrgContext(request, env, 'staff');

    if (method === "GET") {
      await ensureLocationsSeeded(env.DB, ctx.organizationId);
      const rows = await env.DB.prepare(
        "SELECT id, organization_id, name, type, address, city, is_default FROM locations WHERE organization_id = ? AND is_active = 1 ORDER BY is_default DESC, name ASC"
      ).bind(ctx.organizationId).all();

      return json({ success: true, locations: rows?.results || [] }, 200, {}, request);
    }

    if (method === "POST") {
      const body = await readJsonBody(request);
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name) {
        throw new HttpError("Location name is required", 400);
      }

      const id = `loc_${crypto.randomUUID().slice(0, 8)}`;
      const type = body.type || 'warehouse';
      const address = body.address || null;
      const city = body.city || null;
      const now = new Date().toISOString();

      await env.DB.prepare(`
        INSERT INTO locations (id, organization_id, name, type, address, city, is_default, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, 1, ?, ?)
      `).bind(id, ctx.organizationId, name, type, address, city, now, now).run();

      return json({
        success: true,
        location: { id, organization_id: ctx.organizationId, name, type, address, city, is_default: 0 }
      }, 201, {}, request);
    }

    return errorResponse("Method not allowed", 405, undefined, request);
  }

  // 2. POST /api/transfers/ai-sidekick
  if (path === "/api/transfers/ai-sidekick" && method === "POST") {
    await requireOrgContext(request, env, 'staff');
    const body = await readJsonBody(request);
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) {
      throw new HttpError("Prompt is required", 400);
    }

    const lower = prompt.toLowerCase();
    let suggestedOrigin = 'Main Warehouse (Central Godown)';
    let suggestedDestination = 'Primary Retail Dukaan (Front Store)';
    let suggestedUnits = 20;
    let suggestedTags = ['Sidekick Assistant'];
    let suggestedNotes = 'Created with Fera AI Sidekick';
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    const suggestedArrival = futureDate.toISOString().slice(0, 10);

    if (lower.includes('supplier')) {
      suggestedOrigin = 'Regional Wholesale Supplier';
      suggestedTags.push('Supplier Restock');
    }
    if (lower.includes('diwali') || lower.includes('festival') || lower.includes('rush')) {
      suggestedTags.push('Festival Rush');
      suggestedNotes = 'Priority restock for upcoming holiday rush';
    }
    if (lower.includes('express') || lower.includes('urgent')) {
      suggestedTags.push('Urgent');
    }

    const numberMatch = prompt.match(/\b(\d+)\b/);
    if (numberMatch) {
      suggestedUnits = parseInt(numberMatch[1], 10);
    }

    return json({
      success: true,
      reply: `I've prepared a transfer proposal for you: moving ${suggestedUnits} units from "${suggestedOrigin}" to "${suggestedDestination}".`,
      proposal: {
        origin_name: suggestedOrigin,
        destination_name: suggestedDestination,
        quantity: suggestedUnits,
        tags: suggestedTags.join(', '),
        note: suggestedNotes,
        estimated_arrival: suggestedArrival,
      }
    }, 200, {}, request);
  }

  // 3. GET /api/transfers or POST /api/transfers
  if (path === "/api/transfers") {
    const ctx = await requireOrgContext(request, env, 'staff');

    if (method === "GET") {
      let transfers = [];
      try {
        const trRes = await env.DB.prepare(
          "SELECT * FROM inventory_transfers WHERE organization_id = ? ORDER BY created_at DESC"
        ).bind(ctx.organizationId).all();
        transfers = trRes?.results || [];
      } catch (err) {
        console.warn("Error reading inventory transfers:", err?.message || err);
        transfers = [];
      }

      const stats = {
        total_transfers: transfers.length,
        in_transit: transfers.filter(t => t.status === 'in_transit').length,
        drafts: transfers.filter(t => t.status === 'draft').length,
        completed: transfers.filter(t => t.status === 'completed' || t.status === 'received').length,
        total_units_in_transit: transfers
          .filter(t => t.status === 'in_transit')
          .reduce((sum, t) => sum + (Number(t.total_units) || 0), 0)
      };

      return json({ success: true, transfers, stats }, 200, {}, request);
    }

    if (method === "POST") {
      const body = await readJsonBody(request);
      const {
        origin_location_id,
        origin_name,
        destination_location_id,
        destination_name,
        status = 'draft',
        estimated_arrival,
        reference_name,
        note,
        tags,
        purchase_order_id,
        items
      } = body;

      if (!origin_location_id || !origin_name) {
        throw new HttpError("Origin location is required", 400);
      }
      if (!destination_location_id || !destination_name) {
        throw new HttpError("Destination location is required", 400);
      }
      if (origin_location_id === destination_location_id) {
        throw new HttpError("Origin and destination locations must be different", 400);
      }
      if (!Array.isArray(items) || items.length === 0) {
        throw new HttpError("At least one product item is required for transfer", 400);
      }

      const transferId = `tr_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const transferNumber = `TR-${randomSuffix}`;
      const totalItems = items.length;
      const totalUnits = items.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);
      const tagsString = Array.isArray(tags) ? tags.join(', ') : (tags || null);
      const now = new Date().toISOString();

      await env.DB.prepare(`
        INSERT INTO inventory_transfers (
          id, organization_id, user_id, transfer_number, reference_name,
          origin_location_id, origin_name,
          destination_location_id, destination_name,
          status, estimated_arrival, note, tags, purchase_order_id,
          total_items, total_units, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        transferId,
        ctx.organizationId,
        ctx.user.id,
        transferNumber,
        reference_name || null,
        origin_location_id,
        origin_name,
        destination_location_id,
        destination_name,
        status,
        estimated_arrival || null,
        note || null,
        tagsString,
        purchase_order_id || null,
        totalItems,
        totalUnits,
        now,
        now
      ).run();

      for (const item of items) {
        const itemId = `tri_${crypto.randomUUID().slice(0, 8)}`;
        await env.DB.prepare(`
          INSERT INTO inventory_transfer_items (
            id, transfer_id, product_id, product_title, sku, quantity_requested, quantity_received, unit_cost
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          itemId,
          transferId,
          item.product_id || item.id || 'custom',
          item.product_title || item.title || item.name || 'Product',
          item.sku || null,
          Number(item.quantity) || 1,
          0,
          Number(item.unit_cost || item.price || 0)
        ).run();
      }

      return json({
        success: true,
        transfer: {
          id: transferId,
          organization_id: ctx.organizationId,
          transfer_number: transferNumber,
          reference_name,
          origin_location_id,
          origin_name,
          destination_location_id,
          destination_name,
          status,
          estimated_arrival,
          note,
          tags: tagsString,
          purchase_order_id,
          total_items: totalItems,
          total_units: totalUnits,
          items
        }
      }, 201, {}, request);
    }

    return errorResponse("Method not allowed", 405, undefined, request);
  }

  // 4. Sub-routes under /api/transfers/:id
  if (path.startsWith("/api/transfers/")) {
    const ctx = await requireOrgContext(request, env, 'staff');
    const sub = path.slice("/api/transfers/".length);

    // POST /api/transfers/:id/receive
    if (sub.endsWith("/receive") && method === "POST") {
      const transferId = sub.slice(0, -"/receive".length);
      const body = await readJsonBody(request);
      const item_quantities = body.item_quantities || {};

      const transfer = await env.DB.prepare(
        "SELECT * FROM inventory_transfers WHERE id = ? AND organization_id = ?"
      ).bind(transferId, ctx.organizationId).first();

      if (!transfer) {
        throw new HttpError("Transfer not found", 404);
      }

      const itemsRes = await env.DB.prepare(
        "SELECT * FROM inventory_transfer_items WHERE transfer_id = ?"
      ).bind(transferId).all();
      const items = itemsRes?.results || [];

      let allCompleted = true;
      for (const it of items) {
        const received = item_quantities[it.id] !== undefined
          ? Number(item_quantities[it.id])
          : it.quantity_requested;

        await env.DB.prepare(
          "UPDATE inventory_transfer_items SET quantity_received = ? WHERE id = ?"
        ).bind(received, it.id).run();

        if (received < it.quantity_requested) {
          allCompleted = false;
        }
      }

      const newStatus = allCompleted ? 'completed' : 'partially_received';
      await env.DB.prepare(
        "UPDATE inventory_transfers SET status = ?, updated_at = datetime('now') WHERE id = ?"
      ).bind(newStatus, transferId).run();

      return json({ success: true, status: newStatus, message: "Inventory received successfully" }, 200, {}, request);
    }

    // POST /api/transfers/:id/status
    if (sub.endsWith("/status") && method === "POST") {
      const transferId = sub.slice(0, -"/status".length);
      const body = await readJsonBody(request);
      const { status } = body;
      const validStatuses = ['draft', 'in_transit', 'partially_received', 'received', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        throw new HttpError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
      }

      await env.DB.prepare(
        "UPDATE inventory_transfers SET status = ?, updated_at = datetime('now') WHERE id = ? AND organization_id = ?"
      ).bind(status, transferId, ctx.organizationId).run();

      return json({ success: true, message: `Transfer status updated to ${status}` }, 200, {}, request);
    }

    // GET /api/transfers/:id
    if (method === "GET") {
      const transferId = sub;
      const transfer = await env.DB.prepare(
        "SELECT * FROM inventory_transfers WHERE id = ? AND organization_id = ?"
      ).bind(transferId, ctx.organizationId).first();

      if (!transfer) {
        throw new HttpError("Transfer not found", 404);
      }

      const itemsRes = await env.DB.prepare(
        "SELECT * FROM inventory_transfer_items WHERE transfer_id = ?"
      ).bind(transferId).all();

      return json({
        success: true,
        transfer: {
          ...transfer,
          items: itemsRes?.results || []
        }
      }, 200, {}, request);
    }

    // DELETE /api/transfers/:id
    if (method === "DELETE") {
      const transferId = sub;
      await env.DB.prepare("DELETE FROM inventory_transfer_items WHERE transfer_id = ?").bind(transferId).run();
      await env.DB.prepare("DELETE FROM inventory_transfers WHERE id = ? AND organization_id = ?").bind(transferId, ctx.organizationId).run();

      return json({ success: true, message: "Transfer deleted successfully" }, 200, {}, request);
    }

    return errorResponse("Method not allowed", 405, undefined, request);
  }

  return null;
}
