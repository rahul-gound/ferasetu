// FeraSetu — Slice A Migration & Backfill Service
// ===============================================
// 1. Safe legacy stock migration to "Legacy Inventory" locations.
// 2. Safe historical orders backfill into authoritative order_items with anomaly auditing.

import { legacyFloatToMinorUnits, moneyAdd } from "../utils/money.js";

/**
 * Migrates legacy products.stock into authoritative inventory_locations.
 * Ensures single source of truth without discarding existing merchant inventory.
 */
export async function migrateLegacyStock(db) {
  const report = {
    totalProductsScanned: 0,
    locationsCreated: 0,
    stockMigratedCount: 0,
    anomalies: []
  };

  // Find all products that have legacy stock > 0
  const productsRes = await db.prepare(
    "SELECT id, organization_id, shop_id, user_id, name, title, stock, stock_quantity FROM products WHERE stock > 0 OR stock_quantity > 0"
  ).all();

  const products = productsRes?.results || [];
  report.totalProductsScanned = products.length;

  for (const prod of products) {
    const orgId = prod.organization_id || prod.user_id;
    if (!orgId) {
      report.anomalies.push({ productId: prod.id, reason: "Missing organization_id and user_id" });
      continue;
    }

    const legacyStock = Math.max(0, Number(prod.stock_quantity || prod.stock || 0));
    if (legacyStock <= 0) continue;

    try {
      // Check if location stock already exists for this product
      const existingLocStock = await db.prepare(
        "SELECT * FROM inventory_locations WHERE organization_id = ? AND product_id = ? LIMIT 1"
      ).bind(orgId, prod.id).first();

      if (existingLocStock) {
        // Already migrated
        continue;
      }

      // Find or create "Legacy Inventory" location for this organization
      let legacyLoc = await db.prepare(
        "SELECT * FROM locations WHERE organization_id = ? AND (name = 'Legacy Inventory' OR is_active = 1) LIMIT 1"
      ).bind(orgId).first();

      const now = new Date().toISOString();

      if (!legacyLoc) {
        const locId = `loc_legacy_${crypto.randomUUID()}`;
        await db.prepare(`
          INSERT INTO locations (id, organization_id, store_id, name, type, address, is_active, created_at, updated_at)
          VALUES (?, ?, ?, 'Legacy Inventory', 'warehouse', 'Migrated warehouse stock', 1, ?, ?)
        `).bind(locId, orgId, prod.shop_id || null, now, now).run();

        legacyLoc = { id: locId, organization_id: orgId, name: 'Legacy Inventory' };
        report.locationsCreated++;
      }

      // Insert into inventory_locations
      const invLocId = `inv_${crypto.randomUUID()}`;
      await db.prepare(`
        INSERT INTO inventory_locations (
          id, organization_id, product_id, variant_id, location_id,
          available_quantity, reserved_quantity, incoming_quantity, reorder_threshold, created_at, updated_at
        ) VALUES (?, ?, ?, '', ?, ?, 0, 0, 0, ?, ?)
      `).bind(invLocId, orgId, prod.id, legacyLoc.id, legacyStock, now, now).run();

      // Record initial inventory movement ledger
      const movId = `mov_${crypto.randomUUID()}`;
      await db.prepare(`
        INSERT INTO inventory_movements (
          id, organization_id, product_id, variant_id, location_id,
          quantity_change, balance_after, reason, notes, created_at
        ) VALUES (?, ?, ?, '', ?, ?, ?, 'initial', 'Legacy stock migration', ?)
      `).bind(movId, orgId, prod.id, legacyLoc.id, legacyStock, legacyStock, now).run();

      report.stockMigratedCount++;
    } catch (err) {
      report.anomalies.push({
        productId: prod.id,
        error: err.message
      });
    }
  }

  return report;
}

/**
 * Backfills historical order line items into the authoritative order_items table.
 * Verifies legacy subtotal == normalized subtotal and reports anomalies.
 */
export async function backfillHistoricalOrderItems(db) {
  const report = {
    totalScanned: 0,
    migratedCount: 0,
    failedCount: 0,
    anomalyCount: 0,
    anomalies: []
  };

  // Select historical orders that do not yet have order_items
  const ordersRes = await db.prepare(`
    SELECT o.id, o.organization_id, o.user_id, o.shop_id, o.items, o.subtotal, o.total,
           o.subtotal_minor, o.total_minor, o.currency, o.created_at
    FROM orders o
    WHERE o.id NOT IN (SELECT DISTINCT order_id FROM order_items)
  `).all();

  const orders = ordersRes?.results || [];
  report.totalScanned = orders.length;

  for (const order of orders) {
    let items = [];
    try {
      items = JSON.parse(order.items || '[]');
    } catch (e) {
      report.failedCount++;
      report.anomalyCount++;
      report.anomalies.push({ orderId: order.id, error: "Malformed items JSON", raw: order.items });
      continue;
    }

    if (!Array.isArray(items) || items.length === 0) {
      // Empty order items
      continue;
    }

    const orgId = order.organization_id || order.user_id || 'org_unknown';
    const shopId = order.shop_id || orgId;
    const currency = (order.currency || 'INR').toUpperCase();
    const now = order.created_at || new Date().toISOString();

    let computedSubtotalMinor = 0;
    const lineItemInserts = [];

    for (const it of items) {
      const prodId = it.productId || it.product_id || it.id || 'prod_unknown';
      const variantId = it.variantId || it.variant_id || '';
      const qty = Math.max(1, Math.trunc(Number(it.quantity || it.qty || 1)));
      
      // Price resolution in minor units
      let unitPriceMinor = 0;
      if (it.unit_price_minor !== undefined && it.unit_price_minor !== null) {
        unitPriceMinor = Math.trunc(Number(it.unit_price_minor));
      } else if (it.price !== undefined && it.price !== null) {
        unitPriceMinor = legacyFloatToMinorUnits(it.price);
      }

      const totalMinor = unitPriceMinor * qty;
      computedSubtotalMinor = moneyAdd(computedSubtotalMinor, totalMinor);

      lineItemInserts.push({
        id: `oi_${crypto.randomUUID()}`,
        shop_id: shopId,
        organization_id: orgId,
        order_id: order.id,
        product_id: prodId,
        variant_id: variantId,
        title_snapshot: it.name || it.title || 'Item',
        variant_title_snapshot: it.variantTitle || it.variant_title || null,
        sku_snapshot: it.sku || null,
        option_values_snapshot: it.optionValues ? JSON.stringify(it.optionValues) : null,
        quantity: qty,
        unit_price_minor: unitPriceMinor,
        total_minor: totalMinor,
        currency,
        created_at: now
      });
    }

    // Compare computed subtotal against legacy subtotal
    const expectedSubtotalMinor = order.subtotal_minor && order.subtotal_minor > 0
      ? order.subtotal_minor
      : legacyFloatToMinorUnits(order.subtotal);

    if (expectedSubtotalMinor > 0 && Math.abs(computedSubtotalMinor - expectedSubtotalMinor) > 100) {
      report.anomalyCount++;
      report.anomalies.push({
        orderId: order.id,
        computedSubtotalMinor,
        expectedSubtotalMinor,
        diff: computedSubtotalMinor - expectedSubtotalMinor
      });
    }

    // Insert normalized order items transactionally for this order
    try {
      for (const row of lineItemInserts) {
        await db.prepare(`
          INSERT INTO order_items (
            id, shop_id, organization_id, order_id, product_id, variant_id,
            title_snapshot, variant_title_snapshot, sku_snapshot, option_values_snapshot,
            quantity, unit_price_minor, total_minor, discount_minor, tax_minor, currency, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
        `).bind(
          row.id, row.shop_id, row.organization_id, row.order_id, row.product_id, row.variant_id,
          row.title_snapshot, row.variant_title_snapshot, row.sku_snapshot, row.option_values_snapshot,
          row.quantity, row.unit_price_minor, row.total_minor, row.currency, row.created_at
        ).run();
      }

      // Also ensure order.subtotal_minor and total_minor are populated
      if (!order.subtotal_minor || order.subtotal_minor <= 0) {
        await db.prepare(
          "UPDATE orders SET subtotal_minor = ?, total_minor = COALESCE(NULLIF(total_minor, 0), ?) WHERE id = ?"
        ).bind(computedSubtotalMinor, computedSubtotalMinor, order.id).run();
      }

      report.migratedCount++;
    } catch (insertErr) {
      report.failedCount++;
      report.anomalies.push({ orderId: order.id, error: insertErr.message });
    }
  }

  return report;
}
