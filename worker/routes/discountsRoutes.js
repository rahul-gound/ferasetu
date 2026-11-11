/**
 * FeraSetu Promotional Pricing & Discounts Engine REST API Routes
 * worker/routes/discountsRoutes.js
 * =============================================================================
 * Handles:
 * Merchant Endpoints (requires requireOrgContext(request, env, 'staff')):
 * - GET    /api/discounts                    (List discounts with filters & tab counts)
 * - POST   /api/discounts                    (Create discount + initial code)
 * - GET    /api/discounts/analytics          (Aggregated metrics & performance stats)
 * - GET    /api/discounts/:id                (Get single discount with redemptions)
 * - PUT    /api/discounts/:id                (Update discount configuration)
 * - PATCH  /api/discounts/:id/status         (Pause, resume, or expire discount)
 * - DELETE /api/discounts/:id                (Archive/delete discount)
 * - POST   /api/discounts/:id/generate-codes (Generate bulk unique discount codes)
 * - GET    /api/discounts/:id/codes          (List/export codes for discount)
 *
 * Storefront Endpoints (Public):
 * - POST   /api/storefront/discounts/validate (Validate code & return calculation breakdown)
 * - POST   /api/storefront/discounts/evaluate (Evaluate automatic + code discounts on cart)
 * - GET    /api/storefront/discounts/shareable/:code (Preview promotion from shareable link)
 * =============================================================================
 */

import {
  requireOrgContext,
  HttpError,
  getCorsHeaders,
  resolveStorefrontTenant,
  ensureDiscountsTables,
} from '../index.js';
import {
  evaluateDiscountsForCart,
  generateUniqueCodes,
  auditDiscountProfitability,
  normalizeDiscountCode,
} from '../catalog/discountsEngine.js';
import { formatMoney } from '../utils/money.js';

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError("Invalid JSON body", 400);
  }
}

function json(data, status = 200, headers = {}, request = null) {
  const corsHeaders = getCorsHeaders(request);
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
      "X-Robots-Tag": "noindex, nofollow",
      ...corsHeaders,
      ...headers,
    },
  });
}

/**
 * Main router for discounts endpoints.
 */
export async function handleDiscountsRoutes(path, method, request, env) {
  const reqPath = path.startsWith('/api') ? path : `/api${path}`;
  await ensureDiscountsTables(env.DB);

  try {
    // ---------------------------------------------------------------------------
    // PUBLIC STOREFRONT ENDPOINTS
    // ---------------------------------------------------------------------------

    // 1. Validate discount code on current cart
    if (reqPath === '/api/storefront/discounts/validate' && method === 'POST') {
      const body = await readJson(request);
      const { shopId, code, items = [], shippingFeeMinor = 3000, customer = null } = body;
      if (!shopId) throw new HttpError("shopId is required", 400);
      if (!code) throw new HttpError("Discount code is required", 400);

      const tenant = await resolveStorefrontTenant(request, env, shopId);
      if (!tenant.organizationId) {
        return json({
          success: false,
          error: "Discount code is invalid or not applicable to your order.",
          code: "STORE_NOT_FOUND",
        }, 422, {}, request);
      }

      const result = await evaluateDiscountsForCart(env.DB, {
        organizationId: tenant.organizationId,
        shopId: tenant.shopId || tenant.organizationId,
        cartItems: items,
        code,
        customer,
        shippingFeeMinor,
      });

      if (result.rejectedDiscounts && result.rejectedDiscounts.length > 0 && !result.codeApplied) {
        const err = result.rejectedDiscounts[0];
        return json({
          success: false,
          error: err.message,
          code: err.reason,
          details: err,
        }, 422, {}, request);
      }

      return json({
        success: true,
        calculation: result,
      }, 200, {}, request);
    }

    // 2. Evaluate all eligible automatic + code discounts on cart
    if (reqPath === '/api/storefront/discounts/evaluate' && method === 'POST') {
      const body = await readJson(request);
      const { shopId, code = null, items = [], shippingFeeMinor = 3000, customer = null } = body;
      if (!shopId) throw new HttpError("shopId is required", 400);

      const tenant = await resolveStorefrontTenant(request, env, shopId);
      if (!tenant.organizationId) {
        return json({
          success: true,
          calculation: {
            valid: true,
            totalDiscountMinor: 0,
            productDiscountMinor: 0,
            orderDiscountMinor: 0,
            shippingDiscountMinor: 0,
            effectiveShippingMinor: shippingFeeMinor || 3000,
            finalPayableMinor: (items || []).reduce((sum, i) => sum + (i.unitPriceMinor || 0) * (i.quantity || 1), 0) + (shippingFeeMinor || 3000),
            discountsApplied: [],
            itemDiscounts: {},
            codeApplied: null,
          }
        }, 200, {}, request);
      }

      const result = await evaluateDiscountsForCart(env.DB, {
        organizationId: tenant.organizationId,
        shopId: tenant.shopId || tenant.organizationId,
        cartItems: items,
        code,
        customer,
        shippingFeeMinor,
      });

      return json({
        success: true,
        calculation: result,
      }, 200, {}, request);
    }

  // 3. Shareable discount link resolution (e.g. /discount/WELCOME10)
  if (reqPath.startsWith('/api/storefront/discounts/shareable/') && method === 'GET') {
    const rawCode = reqPath.slice('/api/storefront/discounts/shareable/'.length);
    const normalized = normalizeDiscountCode(rawCode);
    const url = new URL(request.url);
    const shopId = url.searchParams.get('shopId') || url.searchParams.get('shop');

    if (!shopId) throw new HttpError("shopId query param is required", 400);
    const tenant = await resolveStorefrontTenant(request, env, shopId);
    if (!tenant.organizationId) throw new HttpError("Storefront not found", 404);

    const now = new Date().toISOString();
    const row = await env.DB.prepare(`
      SELECT d.id, d.title, d.description, d.discount_type, d.value_minor, d.target_type,
             d.status, d.starts_at, d.expires_at, d.minimum_subtotal_minor, d.max_discount_minor,
             dc.code
      FROM discount_codes dc
      JOIN discounts d ON d.id = dc.discount_id
      WHERE (dc.organization_id = ? OR d.organization_id = ?)
        AND dc.code_normalized = ?
        AND d.is_deleted = 0
      LIMIT 1
    `).bind(tenant.organizationId, tenant.organizationId, normalized).first();

    if (!row) {
      return json({
        success: false,
        error: "Promotion not found",
        code: "PROMOTION_NOT_FOUND",
      }, 404, {}, request);
    }

    if (row.status !== 'active' || row.starts_at > now || (row.expires_at && row.expires_at < now)) {
      return json({
        success: false,
        error: "This promotion is no longer active",
        code: "PROMOTION_INACTIVE",
      }, 410, {}, request);
    }

    let summary = '';
    if (row.discount_type === 'percentage') {
      summary = `${(row.value_minor / 100).toFixed(0)}% off`;
    } else if (row.discount_type === 'fixed_amount') {
      summary = `${formatMoney(row.value_minor)} off`;
    } else if (row.discount_type === 'free_shipping') {
      summary = 'Free Shipping';
    } else if (row.discount_type === 'bogo') {
      summary = 'Buy X Get Y Free';
    }

    return json({
      success: true,
      promotion: {
        id: row.id,
        code: row.code,
        title: row.title,
        description: row.description,
        summary,
        discountType: row.discount_type,
        minimumSubtotalMinor: row.minimum_subtotal_minor,
        expiresAt: row.expires_at,
      },
    }, 200, {}, request);
  }

  // ---------------------------------------------------------------------------
  // AUTHENTICATED MERCHANT DASHBOARD ENDPOINTS
  // ---------------------------------------------------------------------------

  // A. Discount Analytics Overview
  if (reqPath === '/api/discounts/analytics' && method === 'GET') {
    const orgContext = await requireOrgContext(request, env, 'staff');
    const orgId = orgContext.organizationId;
    const now = new Date().toISOString();

    // Counts by status
    const statusCounts = await env.DB.prepare(`
      SELECT
        COUNT(CASE WHEN status = 'active' AND starts_at <= ? AND (expires_at IS NULL OR expires_at >= ?) THEN 1 END) AS active_count,
        COUNT(CASE WHEN status = 'scheduled' OR starts_at > ? THEN 1 END) AS scheduled_count,
        COUNT(CASE WHEN status = 'expired' OR (expires_at IS NOT NULL AND expires_at < ?) THEN 1 END) AS expired_count,
        COUNT(*) AS total_count
      FROM discounts
      WHERE organization_id = ? AND is_deleted = 0
    `).bind(now, now, now, now, orgId).first();

    // Redemptions & Financial Totals
    const redStats = await env.DB.prepare(`
      SELECT
        COUNT(id) AS total_redemptions,
        COUNT(DISTINCT order_id) AS orders_using_discounts,
        COALESCE(SUM(discount_amount_minor), 0) AS total_discount_given_minor,
        COALESCE(SUM(order_total_minor), 0) AS total_discounted_orders_volume_minor,
        COALESCE(SUM(order_subtotal_minor), 0) AS gross_order_value_minor
      FROM discount_redemptions
      WHERE organization_id = ?
    `).bind(orgId).first();

    const totalRedemptions = Number(redStats?.total_redemptions || 0);
    const totalDiscountMinor = Number(redStats?.total_discount_given_minor || 0);
    const avgDiscountPerOrderMinor = totalRedemptions > 0 ? Math.round(totalDiscountMinor / totalRedemptions) : 0;

    // Top redeemed discount
    const topDiscount = await env.DB.prepare(`
      SELECT d.id, d.title, d.discount_type, d.application_method,
             COUNT(dr.id) AS redemptions_count,
             COALESCE(SUM(dr.discount_amount_minor), 0) AS total_saved_minor
      FROM discount_redemptions dr
      JOIN discounts d ON d.id = dr.discount_id
      WHERE dr.organization_id = ?
      GROUP BY d.id
      ORDER BY redemptions_count DESC
      LIMIT 1
    `).bind(orgId).first();

    // Upcoming expirations (next 14 days)
    const upcomingExp = await env.DB.prepare(`
      SELECT id, title, discount_type, expires_at, application_method
      FROM discounts
      WHERE organization_id = ? AND is_deleted = 0
        AND status = 'active'
        AND expires_at IS NOT NULL
        AND expires_at >= ?
      ORDER BY expires_at ASC
      LIMIT 5
    `).bind(orgId, now).all();

    // Recent 10 redemptions
    const recentRedemptions = await env.DB.prepare(`
      SELECT dr.*, d.title AS discount_title
      FROM discount_redemptions dr
      JOIN discounts d ON d.id = dr.discount_id
      WHERE dr.organization_id = ?
      ORDER BY dr.created_at DESC
      LIMIT 10
    `).bind(orgId).all();

    return json({
      success: true,
      analytics: {
        activeDiscounts: Number(statusCounts?.active_count || 0),
        scheduledDiscounts: Number(statusCounts?.scheduled_count || 0),
        expiredDiscounts: Number(statusCounts?.expired_count || 0),
        totalDiscounts: Number(statusCounts?.total_count || 0),
        totalRedemptions,
        ordersUsingDiscounts: Number(redStats?.orders_using_discounts || 0),
        totalDiscountValueMinor: totalDiscountMinor,
        totalDiscountValueFormatted: formatMoney(totalDiscountMinor),
        discountedOrdersRevenueMinor: Number(redStats?.total_discounted_orders_volume_minor || 0),
        discountedOrdersRevenueFormatted: formatMoney(Number(redStats?.total_discounted_orders_volume_minor || 0)),
        grossOrderValueMinor: Number(redStats?.gross_order_value_minor || 0),
        grossOrderValueFormatted: formatMoney(Number(redStats?.gross_order_value_minor || 0)),
        avgDiscountPerOrderMinor,
        avgDiscountPerOrderFormatted: formatMoney(avgDiscountPerOrderMinor),
        topDiscount: topDiscount ? {
          ...topDiscount,
          totalSavedFormatted: formatMoney(topDiscount.total_saved_minor),
        } : null,
        upcomingExpirations: upcomingExp?.results || [],
        recentRedemptions: (recentRedemptions?.results || []).map(r => ({
          ...r,
          discountAmountFormatted: formatMoney(r.discount_amount_minor),
          orderTotalFormatted: formatMoney(r.order_total_minor),
        })),
      },
    }, 200, {}, request);
  }

  // B. List Discounts
  if (reqPath === '/api/discounts' && method === 'GET') {
    const orgContext = await requireOrgContext(request, env, 'staff');
    const orgId = orgContext.organizationId;
    const url = new URL(request.url);
    const tab = url.searchParams.get('tab') || 'all'; // all, codes, automatic, scheduled, expired
    const query = (url.searchParams.get('q') || '').trim().toLowerCase();
    const now = new Date().toISOString();

    let sql = `
      SELECT d.*,
             (SELECT code FROM discount_codes WHERE discount_id = d.id AND is_primary = 1 LIMIT 1) AS primary_code,
             (SELECT COUNT(*) FROM discount_codes WHERE discount_id = d.id) AS total_codes_count
      FROM discounts d
      WHERE d.organization_id = ? AND d.is_deleted = 0
    `;
    const params = [orgId];

    if (tab === 'codes') {
      sql += ` AND d.application_method = 'code'`;
    } else if (tab === 'automatic') {
      sql += ` AND d.application_method = 'automatic'`;
    } else if (tab === 'scheduled') {
      sql += ` AND (d.status = 'scheduled' OR d.starts_at > ?)`;
      params.push(now);
    } else if (tab === 'expired') {
      sql += ` AND (d.status = 'expired' OR (d.expires_at IS NOT NULL AND d.expires_at < ?))`;
      params.push(now);
    }

    if (query) {
      sql += ` AND (LOWER(d.title) LIKE ? OR LOWER(d.description) LIKE ? OR EXISTS (
        SELECT 1 FROM discount_codes dc WHERE dc.discount_id = d.id AND LOWER(dc.code) LIKE ?
      ))`;
      const q = `%${query}%`;
      params.push(q, q, q);
    }

    sql += ` ORDER BY d.created_at DESC`;

    const rows = await env.DB.prepare(sql).bind(...params).all();
    const discounts = (rows?.results || []).map(d => ({
      ...d,
      value_formatted: d.discount_type === 'percentage'
        ? `${(d.value_minor / 100).toFixed(0)}%`
        : formatMoney(d.value_minor),
      combines_with_product_discounts: Boolean(d.combines_with_product_discounts),
      combines_with_order_discounts: Boolean(d.combines_with_order_discounts),
      combines_with_shipping_discounts: Boolean(d.combines_with_shipping_discounts),
      is_expired: d.expires_at ? d.expires_at < now : false,
      is_scheduled: d.starts_at > now,
    }));

    return json({
      success: true,
      discounts,
      tab,
    }, 200, {}, request);
  }

  // C. Create Discount
  if (reqPath === '/api/discounts' && method === 'POST') {
    const orgContext = await requireOrgContext(request, env, 'staff');
    const orgId = orgContext.organizationId;
    const shopId = orgContext.shopId || orgId;
    const body = await readJson(request);

    const {
      title,
      description = '',
      discount_type, // 'percentage', 'fixed_amount', 'bogo', 'free_shipping'
      value_minor = 0, // basis points for percentage (e.g. 1000 = 10%) or paise for fixed
      target_type = 'all', // 'all', 'specific_products', 'specific_collections'
      applies_to_resource_ids = [],
      excluded_resource_ids = [],
      application_method = 'code', // 'code', 'automatic'
      code = null, // required if application_method === 'code'
      starts_at = new Date().toISOString(),
      expires_at = null,
      minimum_subtotal_minor = 0,
      minimum_quantity = 0,
      usage_limit_total = null,
      usage_limit_per_customer = null,
      combines_with_product_discounts = false,
      combines_with_order_discounts = false,
      combines_with_shipping_discounts = false,
      customer_eligibility = 'all', // 'all', 'first_time', 'repeat', 'registered', 'specific_customers'
      eligible_customer_ids = [],
      bogo_config = null,
      campaign_id = null,
      max_discount_minor = null,
    } = body;

    if (!title || !title.trim()) {
      throw new HttpError("Title is required", 400);
    }
    if (!['percentage', 'fixed_amount', 'bogo', 'free_shipping'].includes(discount_type)) {
      throw new HttpError("Valid discount_type is required", 400);
    }
    if (application_method === 'code' && (!code || !String(code).trim())) {
      throw new HttpError("Discount code is required for code-based discounts", 400);
    }

    const discountId = `disc_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const cleanStartsAt = starts_at || now;
    const initialStatus = cleanStartsAt > now ? 'scheduled' : 'active';

    // Check code uniqueness if code application method
    let primaryCodeNormalized = null;
    if (application_method === 'code') {
      primaryCodeNormalized = normalizeDiscountCode(code);
      const existing = await env.DB.prepare(
        "SELECT id FROM discount_codes WHERE organization_id = ? AND code_normalized = ? LIMIT 1"
      ).bind(orgId, primaryCodeNormalized).first();
      if (existing) {
        throw new HttpError(`Discount code "${primaryCodeNormalized}" already exists in your store.`, 409, {
          code: 'CODE_ALREADY_EXISTS',
        });
      }
    }

    // Profit margin warning check
    let marginAudit = { hasMarginWarning: false, warnings: [] };
    try {
      const prodRows = await env.DB.prepare(
        "SELECT id, title, name, price, price_minor, cost_price_minor FROM products WHERE organization_id = ? AND is_active = 1 LIMIT 50"
      ).bind(orgId).all();
      marginAudit = auditDiscountProfitability(
        { discount_type, value_minor, max_discount_minor },
        prodRows?.results || []
      );
    } catch (e) {
      console.warn("Margin audit check note:", e?.message);
    }

    // Insert discount
    await env.DB.prepare(`
      INSERT INTO discounts (
        id, organization_id, shop_id, title, description, discount_type,
        value_minor, target_type, applies_to_resource_ids, excluded_resource_ids,
        application_method, status, starts_at, expires_at, minimum_subtotal_minor,
        minimum_quantity, usage_limit_total, usage_limit_per_customer, times_used,
        combines_with_product_discounts, combines_with_order_discounts, combines_with_shipping_discounts,
        customer_eligibility, eligible_customer_ids, bogo_config, campaign_id,
        max_discount_minor, is_deleted, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, 0,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, 0, ?, ?
      )
    `).bind(
      discountId, orgId, shopId, title.trim(), description.trim() || null, discount_type,
      Math.trunc(Number(value_minor || 0)), target_type,
      JSON.stringify(applies_to_resource_ids || []),
      JSON.stringify(excluded_resource_ids || []),
      application_method, initialStatus, cleanStartsAt, expires_at || null,
      Math.trunc(Number(minimum_subtotal_minor || 0)),
      Math.trunc(Number(minimum_quantity || 0)),
      usage_limit_total ? Math.trunc(Number(usage_limit_total)) : null,
      usage_limit_per_customer ? Math.trunc(Number(usage_limit_per_customer)) : null,
      combines_with_product_discounts ? 1 : 0,
      combines_with_order_discounts ? 1 : 0,
      combines_with_shipping_discounts ? 1 : 0,
      customer_eligibility,
      JSON.stringify(eligible_customer_ids || []),
      bogo_config ? JSON.stringify(bogo_config) : null,
      campaign_id || null,
      max_discount_minor ? Math.trunc(Number(max_discount_minor)) : null,
      now, now
    ).run();

    // Insert primary code if applicable
    let codeId = null;
    if (application_method === 'code' && primaryCodeNormalized) {
      codeId = `dc_${crypto.randomUUID()}`;
      await env.DB.prepare(`
        INSERT INTO discount_codes (
          id, organization_id, discount_id, code, code_normalized,
          times_used, max_uses, is_primary, created_at
        ) VALUES (?, ?, ?, ?, ?, 0, ?, 1, ?)
      `).bind(
        codeId, orgId, discountId, code.trim().toUpperCase(), primaryCodeNormalized,
        usage_limit_total ? Math.trunc(Number(usage_limit_total)) : null,
        now
      ).run();
    }

    return json({
      success: true,
      discountId,
      codeId,
      code: primaryCodeNormalized,
      marginWarnings: marginAudit.warnings,
      message: "Discount created successfully.",
    }, 201, {}, request);
  }

  // D. Bulk Unique Code Generation
  if (reqPath.includes('/generate-codes') && method === 'POST') {
    const orgContext = await requireOrgContext(request, env, 'staff');
    const orgId = orgContext.organizationId;
    const discountId = reqPath.split('/')[3];
    const body = await readJson(request);
    const { prefix = 'VIP', count = 10, maxUsesPerCode = 1 } = body;

    const discount = await env.DB.prepare(
      "SELECT id, application_method FROM discounts WHERE id = ? AND organization_id = ? AND is_deleted = 0"
    ).bind(discountId, orgId).first();

    if (!discount) throw new HttpError("Discount not found", 404);
    if (discount.application_method !== 'code') {
      throw new HttpError("Cannot generate codes for an automatic discount", 400);
    }

    const generated = generateUniqueCodes({ prefix, count: Number(count) || 10 });
    const now = new Date().toISOString();
    const insertedCodes = [];

    const CHUNK_SIZE = 50;
    for (let i = 0; i < generated.length; i += CHUNK_SIZE) {
      const chunk = generated.slice(i, i + CHUNK_SIZE);
      const batchStmts = [];
      const chunkData = [];

      for (const code of chunk) {
        const codeId = `dc_${crypto.randomUUID()}`;
        const codeNormalized = normalizeDiscountCode(code);
        batchStmts.push(
          env.DB.prepare(`
            INSERT INTO discount_codes (
              id, organization_id, discount_id, code, code_normalized,
              times_used, max_uses, is_primary, created_at
            ) VALUES (?, ?, ?, ?, ?, 0, ?, 0, ?)
          `).bind(codeId, orgId, discountId, code, codeNormalized, maxUsesPerCode, now)
        );
        chunkData.push({ id: codeId, code, codeNormalized });
      }

      if (typeof env.DB.batch === 'function') {
        try {
          await env.DB.batch(batchStmts);
          chunkData.forEach(item => {
            insertedCodes.push({ id: item.id, code: item.code, maxUses: maxUsesPerCode });
          });
        } catch (err) {
          // Fallback to sequential inserts if batch fails (e.g. unique constraint collision)
          for (const item of chunkData) {
            try {
              await env.DB.prepare(`
                INSERT INTO discount_codes (
                  id, organization_id, discount_id, code, code_normalized,
                  times_used, max_uses, is_primary, created_at
                ) VALUES (?, ?, ?, ?, ?, 0, ?, 0, ?)
              `).bind(item.id, orgId, discountId, item.code, item.codeNormalized, maxUsesPerCode, now).run();
              insertedCodes.push({ id: item.id, code: item.code, maxUses: maxUsesPerCode });
            } catch (innerErr) {
              console.warn("Bulk code collision skipped:", item.code);
            }
          }
        }
      } else {
        // Fallback for mock environments without batch()
        for (const item of chunkData) {
          try {
            await env.DB.prepare(`
              INSERT INTO discount_codes (
                id, organization_id, discount_id, code, code_normalized,
                times_used, max_uses, is_primary, created_at
              ) VALUES (?, ?, ?, ?, ?, 0, ?, 0, ?)
            `).bind(item.id, orgId, discountId, item.code, item.codeNormalized, maxUsesPerCode, now).run();
            insertedCodes.push({ id: item.id, code: item.code, maxUses: maxUsesPerCode });
          } catch (innerErr) {
            console.warn("Bulk code collision skipped:", item.code);
          }
        }
      }
    }

    return json({
      success: true,
      countGenerated: insertedCodes.length,
      codes: insertedCodes,
    }, 201, {}, request);
  }

  // E. List Codes for Discount
  if (reqPath.endsWith('/codes') && method === 'GET') {
    const orgContext = await requireOrgContext(request, env, 'staff');
    const orgId = orgContext.organizationId;
    const discountId = reqPath.split('/')[3];

    const codes = await env.DB.prepare(`
      SELECT id, code, times_used, max_uses, is_primary, created_at
      FROM discount_codes
      WHERE discount_id = ? AND organization_id = ?
      ORDER BY is_primary DESC, created_at DESC
    `).bind(discountId, orgId).all();

    return json({
      success: true,
      codes: codes?.results || [],
    }, 200, {}, request);
  }

  // F. Toggle Discount Status (Pause / Resume / Expire)
  if (reqPath.endsWith('/status') && method === 'PATCH') {
    const orgContext = await requireOrgContext(request, env, 'staff');
    const orgId = orgContext.organizationId;
    const discountId = reqPath.split('/')[3];
    const body = await readJson(request);
    const { status } = body;

    if (!['active', 'paused', 'expired'].includes(status)) {
      throw new HttpError("Invalid status value", 400);
    }

    const now = new Date().toISOString();
    await env.DB.prepare(`
      UPDATE discounts
      SET status = ?, updated_at = ?
      WHERE id = ? AND organization_id = ?
    `).bind(status, now, discountId, orgId).run();

    return json({ success: true, status }, 200, {}, request);
  }

  // G. Get Single Discount Details
  if (reqPath.startsWith('/api/discounts/') && method === 'GET') {
    const orgContext = await requireOrgContext(request, env, 'staff');
    const orgId = orgContext.organizationId;
    const discountId = reqPath.slice('/api/discounts/'.length);

    const discount = await env.DB.prepare(`
      SELECT d.*,
             (SELECT code FROM discount_codes WHERE discount_id = d.id AND is_primary = 1 LIMIT 1) AS primary_code
      FROM discounts d
      WHERE d.id = ? AND d.organization_id = ? AND d.is_deleted = 0
    `).bind(discountId, orgId).first();

    if (!discount) throw new HttpError("Discount not found", 404);

    const codes = await env.DB.prepare(`
      SELECT id, code, times_used, max_uses, is_primary, created_at
      FROM discount_codes
      WHERE discount_id = ? AND organization_id = ?
      ORDER BY is_primary DESC LIMIT 100
    `).bind(discountId, orgId).all();

    const redemptions = await env.DB.prepare(`
      SELECT id, order_id, customer_email, customer_phone, discount_amount_minor, order_total_minor, created_at
      FROM discount_redemptions
      WHERE discount_id = ? AND organization_id = ?
      ORDER BY created_at DESC LIMIT 50
    `).bind(discountId, orgId).all();

    return json({
      success: true,
      discount: {
        ...discount,
        applies_to_resource_ids: JSON.parse(discount.applies_to_resource_ids || '[]'),
        excluded_resource_ids: JSON.parse(discount.excluded_resource_ids || '[]'),
        eligible_customer_ids: JSON.parse(discount.eligible_customer_ids || '[]'),
        bogo_config: discount.bogo_config ? JSON.parse(discount.bogo_config) : null,
      },
      codes: codes?.results || [],
      recentRedemptions: (redemptions?.results || []).map(r => ({
        ...r,
        discountAmountFormatted: formatMoney(r.discount_amount_minor),
        orderTotalFormatted: formatMoney(r.order_total_minor),
      })),
    }, 200, {}, request);
  }

  // H. Update Single Discount
  if (reqPath.startsWith('/api/discounts/') && method === 'PUT') {
    const orgContext = await requireOrgContext(request, env, 'staff');
    const orgId = orgContext.organizationId;
    const discountId = reqPath.slice('/api/discounts/'.length);
    const body = await readJson(request);

    const existing = await env.DB.prepare(
      "SELECT id FROM discounts WHERE id = ? AND organization_id = ? AND is_deleted = 0"
    ).bind(discountId, orgId).first();
    if (!existing) throw new HttpError("Discount not found", 404);

    const now = new Date().toISOString();
    const {
      title,
      description,
      value_minor,
      target_type,
      applies_to_resource_ids,
      excluded_resource_ids,
      starts_at,
      expires_at,
      minimum_subtotal_minor,
      minimum_quantity,
      usage_limit_total,
      usage_limit_per_customer,
      combines_with_product_discounts,
      combines_with_order_discounts,
      combines_with_shipping_discounts,
      customer_eligibility,
      eligible_customer_ids,
      bogo_config,
      campaign_id,
      max_discount_minor,
    } = body;

    await env.DB.prepare(`
      UPDATE discounts SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        value_minor = COALESCE(?, value_minor),
        target_type = COALESCE(?, target_type),
        applies_to_resource_ids = COALESCE(?, applies_to_resource_ids),
        excluded_resource_ids = COALESCE(?, excluded_resource_ids),
        starts_at = COALESCE(?, starts_at),
        expires_at = ?,
        minimum_subtotal_minor = COALESCE(?, minimum_subtotal_minor),
        minimum_quantity = COALESCE(?, minimum_quantity),
        usage_limit_total = ?,
        usage_limit_per_customer = ?,
        combines_with_product_discounts = COALESCE(?, combines_with_product_discounts),
        combines_with_order_discounts = COALESCE(?, combines_with_order_discounts),
        combines_with_shipping_discounts = COALESCE(?, combines_with_shipping_discounts),
        customer_eligibility = COALESCE(?, customer_eligibility),
        eligible_customer_ids = COALESCE(?, eligible_customer_ids),
        bogo_config = COALESCE(?, bogo_config),
        campaign_id = COALESCE(?, campaign_id),
        max_discount_minor = ?,
        updated_at = ?
      WHERE id = ? AND organization_id = ?
    `).bind(
      title || null,
      description !== undefined ? description : null,
      value_minor !== undefined ? Math.trunc(Number(value_minor)) : null,
      target_type || null,
      applies_to_resource_ids ? JSON.stringify(applies_to_resource_ids) : null,
      excluded_resource_ids ? JSON.stringify(excluded_resource_ids) : null,
      starts_at || null,
      expires_at !== undefined ? expires_at : null,
      minimum_subtotal_minor !== undefined ? Math.trunc(Number(minimum_subtotal_minor)) : null,
      minimum_quantity !== undefined ? Math.trunc(Number(minimum_quantity)) : null,
      usage_limit_total !== undefined ? (usage_limit_total ? Math.trunc(Number(usage_limit_total)) : null) : null,
      usage_limit_per_customer !== undefined ? (usage_limit_per_customer ? Math.trunc(Number(usage_limit_per_customer)) : null) : null,
      combines_with_product_discounts !== undefined ? (combines_with_product_discounts ? 1 : 0) : null,
      combines_with_order_discounts !== undefined ? (combines_with_order_discounts ? 1 : 0) : null,
      combines_with_shipping_discounts !== undefined ? (combines_with_shipping_discounts ? 1 : 0) : null,
      customer_eligibility || null,
      eligible_customer_ids ? JSON.stringify(eligible_customer_ids) : null,
      bogo_config ? JSON.stringify(bogo_config) : null,
      campaign_id !== undefined ? campaign_id : null,
      max_discount_minor !== undefined ? (max_discount_minor ? Math.trunc(Number(max_discount_minor)) : null) : null,
      now,
      discountId,
      orgId
    ).run();

    return json({ success: true, message: "Discount updated successfully." }, 200, {}, request);
  }

  // I. Delete Single Discount (Soft delete)
  if (reqPath.startsWith('/api/discounts/') && method === 'DELETE') {
    const orgContext = await requireOrgContext(request, env, 'staff');
    const orgId = orgContext.organizationId;
    const discountId = reqPath.slice('/api/discounts/'.length);

    const now = new Date().toISOString();
    await env.DB.prepare(`
      UPDATE discounts
      SET is_deleted = 1, status = 'expired', updated_at = ?
      WHERE id = ? AND organization_id = ?
    `).bind(now, discountId, orgId).run();

    return json({ success: true, message: "Discount archived." }, 200, {}, request);
  }

  return null;
  } catch (err) {
    if (err instanceof HttpError) {
      return json({
        success: false,
        error: err.message,
        code: err.data?.code,
      }, err.statusCode || 400, {}, request);
    }
    console.error("[Discounts Route Handler Catch]", err?.message || err);
    return json({
      success: false,
      error: err?.message || "Failed to process discount request"
    }, 500, {}, request);
  }
}
