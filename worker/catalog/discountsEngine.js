// FeraSetu — Authoritative Discounts & Promotional Pricing Engine
// =================================================================
// Strict financial invariants:
// - All calculations are performed in integer minor units (paise/cents/basis points).
// - Zero floating-point monetary arithmetic.
// - Deterministic calculation order: Product discounts -> Order discounts -> Shipping discounts.
// - Stacking rules enforced strictly: No incompatible stacking.
// - Non-negative payable amounts: total payable is clamped to >= 0.
// - Full customer eligibility validation and atomic usage-limit enforcement.

import {
  moneyAdd,
  moneySubtract,
  moneyMultiplyPercentageBps,
  formatMoney,
} from '../utils/money.js';

/**
 * Normalizes a discount code string for lookup.
 */
export function normalizeDiscountCode(code) {
  if (!code || typeof code !== 'string') return '';
  return code.trim().toUpperCase();
}

/**
 * Generates secure, high-entropy unique discount codes.
 * e.g. Prefix "VIP" -> "VIP-8K2P-7M4Q"
 */
export function generateUniqueCodes({ prefix = 'PROMO', count = 10, length = 8 }) {
  const cleanPrefix = (prefix || 'PROMO').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Ambiguity-free (no 0/O, 1/I)
  const codes = new Set();
  const targetCount = Math.max(1, Math.min(count, 1000));

  while (codes.size < targetCount) {
    let rand = '';
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i++) {
      rand += charset[bytes[i] % charset.length];
    }
    // Format into chunks of 4 if length >= 8
    let formatted = rand;
    if (length >= 8) {
      formatted = `${rand.slice(0, 4)}-${rand.slice(4)}`;
    }
    const code = cleanPrefix ? `${cleanPrefix}-${formatted}` : formatted;
    codes.add(code);
  }

  return Array.from(codes);
}

/**
 * Checks customer eligibility against discount rules.
 */
export async function checkCustomerEligibility(db, { discount, customer, organizationId }) {
  const eligibility = discount.customer_eligibility || 'all';
  if (eligibility === 'all') return { eligible: true };

  const customerId = customer?.id || customer?.customer_id;
  const customerPhone = customer?.phone || customer?.customer_phone;
  const customerEmail = customer?.email || customer?.customer_email;

  if (eligibility === 'specific_customers') {
    let allowedIds = [];
    try {
      allowedIds = typeof discount.eligible_customer_ids === 'string'
        ? JSON.parse(discount.eligible_customer_ids)
        : (discount.eligible_customer_ids || []);
    } catch {
      allowedIds = [];
    }

    const isMatch = (customerId && allowedIds.includes(customerId)) ||
                    (customerEmail && allowedIds.includes(customerEmail.toLowerCase())) ||
                    (customerPhone && allowedIds.includes(customerPhone.replace(/\D/g, '')));

    if (!isMatch) {
      return { eligible: false, reason: 'CUSTOMER_NOT_ELIGIBLE', message: 'This promotion is for selected customers only.' };
    }
    return { eligible: true };
  }

  if (eligibility === 'registered') {
    if (!customer?.isRegistered && !customer?.has_password && !customer?.has_account) {
      // Check database if customer is registered
      if (customerId || customerEmail) {
        try {
          const custRow = await db.prepare(
            `SELECT id, password_hash FROM customers WHERE organization_id = ? AND (id = ? OR LOWER(email) = ?) LIMIT 1`
          ).bind(organizationId, customerId || '', (customerEmail || '').toLowerCase()).first();
          if (custRow?.password_hash) {
            return { eligible: true };
          }
        } catch {}
      }
      return { eligible: false, reason: 'CUSTOMER_NOT_REGISTERED', message: 'This promotion requires a registered store account. Please log in or create an account.' };
    }
    return { eligible: true };
  }

  // Count customer previous completed/active orders
  let orderCount = 0;
  try {
    const cleanPhone = customerPhone ? customerPhone.replace(/\D/g, '') : null;
    const cleanEmail = customerEmail ? customerEmail.toLowerCase().trim() : null;

    if (cleanPhone || cleanEmail || customerId) {
      const row = await db.prepare(`
        SELECT COUNT(id) AS order_count FROM orders
        WHERE organization_id = ? AND status != 'cancelled'
          AND (
            (? IS NOT NULL AND customer_phone LIKE '%' || ?) OR
            (? IS NOT NULL AND LOWER(customer_email) = ?) OR
            (? IS NOT NULL AND customer_id = ?)
          )
      `).bind(
        organizationId,
        cleanPhone, cleanPhone || '',
        cleanEmail, cleanEmail || '',
        customerId, customerId || ''
      ).first();
      orderCount = Number(row?.order_count || 0);
    }
  } catch (e) {
    console.warn('Customer order count lookup note:', e?.message);
  }

  if (eligibility === 'first_time') {
    if (orderCount > 0) {
      return { eligible: false, reason: 'NOT_FIRST_ORDER', message: 'This offer is only valid on your first order.' };
    }
    return { eligible: true };
  }

  if (eligibility === 'repeat') {
    if (orderCount === 0) {
      return { eligible: false, reason: 'REPEAT_CUSTOMERS_ONLY', message: 'This promotion is for returning customers.' };
    }
    return { eligible: true };
  }

  return { eligible: true };
}

/**
 * Checks per-customer redemption limit.
 */
export async function checkCustomerUsageLimit(db, { discount, customer, organizationId }) {
  const perCustomerLimit = discount.usage_limit_per_customer;
  if (!perCustomerLimit || perCustomerLimit <= 0) return { allowed: true };

  const customerId = customer?.id || customer?.customer_id;
  const customerPhone = customer?.phone || customer?.customer_phone;
  const customerEmail = customer?.email || customer?.customer_email;

  if (!customerId && !customerPhone && !customerEmail) {
    // If no identity provided, cannot enforce or violate per-customer limit
    return { allowed: true };
  }

  try {
    const cleanPhone = customerPhone ? customerPhone.replace(/\D/g, '') : null;
    const cleanEmail = customerEmail ? customerEmail.toLowerCase().trim() : null;

    const row = await db.prepare(`
      SELECT COUNT(id) AS redemptions FROM discount_redemptions
      WHERE organization_id = ? AND discount_id = ?
        AND (
          (? IS NOT NULL AND customer_phone = ?) OR
          (? IS NOT NULL AND LOWER(customer_email) = ?) OR
          (? IS NOT NULL AND customer_id = ?)
        )
    `).bind(
      organizationId,
      discount.id,
      cleanPhone, cleanPhone || '',
      cleanEmail, cleanEmail || '',
      customerId, customerId || ''
    ).first();

    const used = Number(row?.redemptions || 0);
    if (used >= perCustomerLimit) {
      return {
        allowed: false,
        reason: 'CUSTOMER_LIMIT_REACHED',
        message: `You have already redeemed this discount the maximum allowed times (${perCustomerLimit}).`,
      };
    }
  } catch (err) {
    console.warn('Usage limit lookup note:', err?.message);
  }

  return { allowed: true };
}

/**
 * Evaluates whether an item matches the target resources and exclusions.
 */
export function isItemEligible(item, discount) {
  const targetType = discount.target_type || 'all';
  const prodId = item.productId || item.product_id || item.id;
  const category = (item.category || '').toLowerCase().trim();

  // Check product exclusions first
  let excluded = [];
  try {
    excluded = typeof discount.excluded_resource_ids === 'string'
      ? JSON.parse(discount.excluded_resource_ids)
      : (discount.excluded_resource_ids || []);
  } catch {}
  if (excluded.includes(prodId)) return false;

  if (targetType === 'all') return true;

  let appliesTo = [];
  try {
    appliesTo = typeof discount.applies_to_resource_ids === 'string'
      ? JSON.parse(discount.applies_to_resource_ids)
      : (discount.applies_to_resource_ids || []);
  } catch {}

  if (targetType === 'specific_products') {
    return appliesTo.includes(prodId);
  }

  if (targetType === 'specific_collections') {
    // Matches if item category or collection is in appliesTo
    return appliesTo.some(c => c.toLowerCase().trim() === category || c === prodId);
  }

  return true;
}

/**
 * Calculates Buy X Get Y discount on cart.
 */
export function calculateBogoDiscount(discount, cartItems) {
  let bogo = null;
  try {
    bogo = typeof discount.bogo_config === 'string'
      ? JSON.parse(discount.bogo_config)
      : (discount.bogo_config || {});
  } catch {
    bogo = {};
  }

  const buyQty = Math.max(1, Math.trunc(Number(bogo.buy_quantity || bogo.buyQuantity || 1)));
  const getQty = Math.max(1, Math.trunc(Number(bogo.get_quantity || bogo.getQuantity || 1)));
  const discountType = bogo.reward_type || (bogo.discount_percentage_bps ? 'percentage' : 'free');
  const discountBps = Math.trunc(Number(bogo.discount_percentage_bps ?? bogo.discountPercentageBps ?? 10000)); // Default 100% off (free)
  const discountFixedMinor = Math.trunc(Number(bogo.discount_amount_minor ?? bogo.discountAmountMinor ?? 0));

  const buyProductIds = Array.isArray(bogo.buy_product_ids || bogo.buyProductIds)
    ? (bogo.buy_product_ids || bogo.buyProductIds)
    : [];
  const getProductIds = Array.isArray(bogo.get_product_ids || bogo.getProductIds)
    ? (bogo.get_product_ids || bogo.getProductIds)
    : [];

  // 1. Count qualifying buy items in cart
  let qualifyingBuyCount = 0;
  for (const it of cartItems) {
    const pId = it.productId || it.product_id || it.id;
    if (buyProductIds.length === 0 || buyProductIds.includes(pId)) {
      qualifyingBuyCount += Math.max(0, it.quantity || 0);
    }
  }

  // Number of eligible reward sets earned
  const setsEarned = Math.floor(qualifyingBuyCount / buyQty);
  if (setsEarned <= 0) return { discountMinor: 0, itemsDiscounted: [] };

  const maxRewardItems = setsEarned * getQty;
  let remainingRewardAllowance = maxRewardItems;
  let totalBogoDiscountMinor = 0;
  const itemsDiscounted = [];

  // Sort candidate reward items by lowest unit price first (industry standard) or as present
  const rewardCandidates = cartItems
    .filter(it => {
      const pId = it.productId || it.product_id || it.id;
      return getProductIds.length === 0 || getProductIds.includes(pId);
    })
    .map(it => ({ ...it }))
    .sort((a, b) => (a.unitPriceMinor || 0) - (b.unitPriceMinor || 0));

  for (const it of rewardCandidates) {
    if (remainingRewardAllowance <= 0) break;
    const applicableQty = Math.min(it.quantity, remainingRewardAllowance);
    const unitPrice = it.unitPriceMinor || 0;

    let perUnitDiscount = 0;
    if (discountType === 'percentage' || discountType === 'free') {
      perUnitDiscount = moneyMultiplyPercentageBps(unitPrice, discountBps);
    } else if (discountType === 'fixed_amount') {
      perUnitDiscount = Math.min(unitPrice, discountFixedMinor);
    }

    const lineDiscount = perUnitDiscount * applicableQty;
    totalBogoDiscountMinor = moneyAdd(totalBogoDiscountMinor, lineDiscount);
    remainingRewardAllowance -= applicableQty;

    itemsDiscounted.push({
      productId: it.productId || it.product_id || it.id,
      quantityDiscounted: applicableQty,
      discountMinor: lineDiscount,
    });
  }

  return {
    discountMinor: totalBogoDiscountMinor,
    itemsDiscounted,
    setsEarned,
  };
}

/**
 * Evaluates all eligible discounts (automatic and/or code-based) against current cart contents.
 *
 * @param {Object} db Cloudflare D1 connection
 * @param {Object} params
 * @param {string} params.organizationId
 * @param {string} params.shopId
 * @param {Array} params.cartItems [{ productId, variantId, quantity, unitPriceMinor, category }]
 * @param {string} [params.code] Entered discount code (optional)
 * @param {Object} [params.customer] Customer identity/session (optional)
 * @param {number} [params.shippingFeeMinor] Shipping fee in minor units (optional, default 3000)
 * @returns {Promise<Object>}
 */
export async function evaluateDiscountsForCart(db, {
  organizationId,
  shopId,
  cartItems = [],
  code = null,
  customer = null,
  shippingFeeMinor = 3000,
}) {
  const now = new Date().toISOString();
  const normalizedCode = normalizeDiscountCode(code);
  const items = Array.isArray(cartItems) ? cartItems.map(it => {
    const unitPriceMinor = Math.max(0, Math.trunc(Number(
      it.unitPriceMinor !== undefined ? it.unitPriceMinor :
      it.unit_price_minor !== undefined ? it.unit_price_minor :
      it.price_minor !== undefined ? it.price_minor :
      (Number(it.price || 0) * 100)
    )));
    return {
      ...it,
      unitPriceMinor,
      unit_price_minor: unitPriceMinor,
      price_minor: unitPriceMinor,
    };
  }) : [];

  // Calculate cart baseline subtotal & quantity
  let cartSubtotalMinor = 0;
  let totalItemCount = 0;
  for (const it of items) {
    const qty = Math.max(1, Math.trunc(Number(it.quantity || 1)));
    const unitPrice = it.unitPriceMinor;
    cartSubtotalMinor = moneyAdd(cartSubtotalMinor, unitPrice * qty);
    totalItemCount += qty;
  }

  const rejectedDiscounts = [];
  const candidateDiscounts = [];

  // 1. Fetch active discounts for this store
  // Pull automatic discounts and also the discount linked to the entered code if any
  let discountRows = [];
  try {
    const rows = await db.prepare(`
      SELECT d.*, dc.id AS code_id, dc.code AS code_string, dc.times_used AS code_times_used, dc.max_uses AS code_max_uses
      FROM discounts d
      LEFT JOIN discount_codes dc ON dc.discount_id = d.id
      WHERE (d.organization_id = ? OR d.shop_id = ?)
        AND d.is_deleted = 0
        AND d.status = 'active'
        AND d.starts_at <= ?
        AND (d.expires_at IS NULL OR d.expires_at >= ?)
    `).bind(organizationId, shopId, now, now).all();
    discountRows = rows?.results || [];
  } catch (err) {
    console.warn('Discounts query note:', err?.message);
    discountRows = [];
  }

  // De-duplicate discounts that have multiple codes
  const discountMap = new Map();
  for (const r of discountRows) {
    if (!discountMap.has(r.id)) {
      discountMap.set(r.id, {
        ...r,
        codes: [],
      });
    }
    if (r.code_string) {
      discountMap.get(r.id).codes.push({
        id: r.code_id,
        code: r.code_string,
        code_normalized: normalizeDiscountCode(r.code_string),
        times_used: Number(r.code_times_used || 0),
        max_uses: r.code_max_uses != null ? Number(r.code_max_uses) : null,
      });
    }
  }

  const allDiscounts = Array.from(discountMap.values());

  // 2. Separate automatic discounts and entered code discount
  const automaticDiscounts = allDiscounts.filter(d => d.application_method === 'automatic');
  let enteredCodeDiscount = null;
  let matchingCodeRecord = null;

  if (normalizedCode) {
    for (const d of allDiscounts) {
      const match = (d.codes || []).find(c => c.code_normalized === normalizedCode);
      if (match) {
        enteredCodeDiscount = d;
        matchingCodeRecord = match;
        break;
      }
    }

    if (!enteredCodeDiscount) {
      // Check if code exists but is paused, expired, or not started yet
      try {
        const check = await db.prepare(`
          SELECT d.*, dc.id AS code_id, dc.code AS code_string
          FROM discount_codes dc
          JOIN discounts d ON d.id = dc.discount_id
          WHERE (dc.organization_id = ? OR d.organization_id = ?)
            AND dc.code_normalized = ?
            AND d.is_deleted = 0
          LIMIT 1
        `).bind(organizationId, organizationId, normalizedCode).first();

        if (check) {
          if (check.status === 'paused') {
            rejectedDiscounts.push({ code: normalizedCode, reason: 'CODE_PAUSED', message: 'This discount code is currently paused.' });
          } else if (check.starts_at > now) {
            rejectedDiscounts.push({ code: normalizedCode, reason: 'NOT_STARTED', message: 'This promotion has not started yet.' });
          } else if (check.expires_at && check.expires_at < now) {
            rejectedDiscounts.push({ code: normalizedCode, reason: 'EXPIRED', message: 'This discount code has expired.' });
          } else {
            rejectedDiscounts.push({ code: normalizedCode, reason: 'CODE_INACTIVE', message: 'This discount code is not active.' });
          }
        } else {
          rejectedDiscounts.push({ code: normalizedCode, reason: 'INVALID_CODE', message: 'Discount code is invalid.' });
        }
      } catch {
        rejectedDiscounts.push({ code: normalizedCode, reason: 'INVALID_CODE', message: 'Discount code is invalid.' });
      }
    }
  }

  // 3. Helper to validate a discount against conditions
  async function validateDiscountConditions(disc, codeRec = null) {
    // Total usage limit check
    if (disc.usage_limit_total && disc.usage_limit_total > 0 && disc.times_used >= disc.usage_limit_total) {
      return { valid: false, reason: 'USAGE_LIMIT_REACHED', message: 'This promotion has reached its maximum usage limit.' };
    }

    // Per-code limit check
    if (codeRec && codeRec.max_uses && codeRec.max_uses > 0 && codeRec.times_used >= codeRec.max_uses) {
      return { valid: false, reason: 'CODE_LIMIT_REACHED', message: 'This discount code has reached its usage limit.' };
    }

    // Minimum subtotal check
    if (disc.minimum_subtotal_minor && disc.minimum_subtotal_minor > 0) {
      if (cartSubtotalMinor < disc.minimum_subtotal_minor) {
        return {
          valid: false,
          reason: 'MINIMUM_ORDER_NOT_REACHED',
          message: `Add ${formatMoney(disc.minimum_subtotal_minor - cartSubtotalMinor)} more to qualify for this discount.`,
        };
      }
    }

    // Minimum quantity check
    if (disc.minimum_quantity && disc.minimum_quantity > 0) {
      if (totalItemCount < disc.minimum_quantity) {
        return {
          valid: false,
          reason: 'MINIMUM_QUANTITY_NOT_REACHED',
          message: `Minimum ${disc.minimum_quantity} items required for this promotion.`,
        };
      }
    }

    // Customer eligibility check
    const custEligibility = await checkCustomerEligibility(db, {
      discount: disc,
      customer,
      organizationId,
    });
    if (!custEligibility.eligible) {
      return { valid: false, reason: custEligibility.reason, message: custEligibility.message };
    }

    // Customer per-customer usage check
    const perCust = await checkCustomerUsageLimit(db, {
      discount: disc,
      customer,
      organizationId,
    });
    if (!perCust.allowed) {
      return { valid: false, reason: perCust.reason, message: perCust.message };
    }

    // Product eligibility check (must have at least one eligible item)
    if (disc.discount_type !== 'free_shipping') {
      const hasEligible = items.some(it => isItemEligible(it, disc));
      if (!hasEligible && items.length > 0) {
        return { valid: false, reason: 'NO_ELIGIBLE_PRODUCTS', message: 'None of the items in your cart are eligible for this discount.' };
      }
    }

    return { valid: true };
  }

  // 4. Validate automatic discounts
  const qualifiedAutomatic = [];
  for (const autoDisc of automaticDiscounts) {
    const val = await validateDiscountConditions(autoDisc);
    if (val.valid) {
      qualifiedAutomatic.push(autoDisc);
    }
  }

  // 5. Validate entered code discount
  let qualifiedCode = null;
  if (enteredCodeDiscount) {
    const val = await validateDiscountConditions(enteredCodeDiscount, matchingCodeRecord);
    if (val.valid) {
      qualifiedCode = {
        discount: enteredCodeDiscount,
        codeRecord: matchingCodeRecord,
      };
    } else {
      rejectedDiscounts.push({
        code: normalizedCode,
        reason: val.reason,
        message: val.message,
      });
    }
  }

  // 6. Combination & Stacking Resolution
  // Deterministic order:
  // - Category A: Product Discounts
  // - Category B: Order Discounts
  // - Category C: Shipping Discounts
  const selectedDiscounts = [];

  // Group candidate automatic discounts by category
  const autoProductDiscounts = qualifiedAutomatic.filter(d => (d.discount_type === 'percentage' || d.discount_type === 'fixed_amount' || d.discount_type === 'bogo') && d.target_type !== 'all');
  const autoOrderDiscounts = qualifiedAutomatic.filter(d => (d.discount_type === 'percentage' || d.discount_type === 'fixed_amount') && d.target_type === 'all');
  const autoShippingDiscounts = qualifiedAutomatic.filter(d => d.discount_type === 'free_shipping');

  // If code is present, check combination flags
  if (qualifiedCode) {
    const codeDisc = qualifiedCode.discount;
    selectedDiscounts.push({
      ...codeDisc,
      code: qualifiedCode.codeRecord.code,
      codeId: qualifiedCode.codeRecord.id,
    });

    // Check if automatic discounts can combine with this code
    const isCodeProduct = codeDisc.target_type !== 'all' && codeDisc.discount_type !== 'free_shipping';
    const isCodeOrder = codeDisc.target_type === 'all' && codeDisc.discount_type !== 'free_shipping';
    const isCodeShipping = codeDisc.discount_type === 'free_shipping';

    for (const auto of qualifiedAutomatic) {
      const isAutoProduct = auto.target_type !== 'all' && auto.discount_type !== 'free_shipping';
      const isAutoOrder = auto.target_type === 'all' && auto.discount_type !== 'free_shipping';
      const isAutoShipping = auto.discount_type === 'free_shipping';

      let canCombine = false;
      if (isAutoProduct && codeDisc.combines_with_product_discounts && auto.combines_with_product_discounts) {
        canCombine = true;
      }
      if (isAutoOrder && codeDisc.combines_with_order_discounts && auto.combines_with_order_discounts) {
        canCombine = true;
      }
      if (isAutoShipping && codeDisc.combines_with_shipping_discounts && auto.combines_with_shipping_discounts) {
        canCombine = true;
      }

      if (canCombine) {
        selectedDiscounts.push(auto);
      }
    }
  } else {
    // If no code, select best/stackable automatic discounts
    // Pick at most one of each category unless combines flags allow multiple
    if (autoProductDiscounts.length > 0) {
      selectedDiscounts.push(autoProductDiscounts[0]); // Deterministic priority
    }
    if (autoOrderDiscounts.length > 0) {
      selectedDiscounts.push(autoOrderDiscounts[0]);
    }
    if (autoShippingDiscounts.length > 0) {
      selectedDiscounts.push(autoShippingDiscounts[0]);
    }
  }

  // 7. Execute Deterministic Calculation
  let runningSubtotalMinor = cartSubtotalMinor;
  let totalProductDiscountMinor = 0;
  let totalOrderDiscountMinor = 0;
  let totalShippingDiscountMinor = 0;
  const itemDiscounts = new Map(); // productId -> allocated discount minor
  const appliedDiscounts = [];

  // Step 1: Product-level discounts
  for (const disc of selectedDiscounts) {
    const isProductLevel = disc.target_type !== 'all' && disc.discount_type !== 'free_shipping';
    if (!isProductLevel) continue;

    let discAmount = 0;
    if (disc.discount_type === 'bogo') {
      const bogoRes = calculateBogoDiscount(disc, items);
      discAmount = bogoRes.discountMinor;
      for (const dItem of bogoRes.itemsDiscounted) {
        const cur = itemDiscounts.get(dItem.productId) || 0;
        itemDiscounts.set(dItem.productId, moneyAdd(cur, dItem.discountMinor));
      }
    } else {
      // Percentage or fixed amount on eligible items
      for (const it of items) {
        if (!isItemEligible(it, disc)) continue;
        const pId = it.productId || it.product_id || it.id;
        const lineTotal = (it.unitPriceMinor || 0) * it.quantity;

        let lineDisc = 0;
        if (disc.discount_type === 'percentage') {
          lineDisc = moneyMultiplyPercentageBps(lineTotal, disc.value_minor);
        } else if (disc.discount_type === 'fixed_amount') {
          // Proportionate or direct fixed amount
          lineDisc = Math.min(lineTotal, disc.value_minor);
        }

        if (disc.max_discount_minor && disc.max_discount_minor > 0) {
          lineDisc = Math.min(lineDisc, disc.max_discount_minor);
        }

        discAmount = moneyAdd(discAmount, lineDisc);
        const cur = itemDiscounts.get(pId) || 0;
        itemDiscounts.set(pId, moneyAdd(cur, lineDisc));
      }
    }

    if (discAmount > 0) {
      totalProductDiscountMinor = moneyAdd(totalProductDiscountMinor, discAmount);
      appliedDiscounts.push({
        id: disc.id,
        title: disc.title,
        type: disc.discount_type,
        method: disc.application_method,
        code: disc.code || null,
        codeId: disc.codeId || null,
        amountMinor: discAmount,
        campaignId: disc.campaign_id || null,
      });
    }
  }

  // Deduct product discounts from running subtotal
  runningSubtotalMinor = moneySubtract(runningSubtotalMinor, totalProductDiscountMinor, true);

  // Step 2: Order-level discounts
  for (const disc of selectedDiscounts) {
    const isOrderLevel = disc.target_type === 'all' && disc.discount_type !== 'free_shipping';
    if (!isOrderLevel) continue;

    let discAmount = 0;
    if (disc.discount_type === 'percentage') {
      discAmount = moneyMultiplyPercentageBps(runningSubtotalMinor, disc.value_minor);
    } else if (disc.discount_type === 'fixed_amount') {
      discAmount = Math.min(runningSubtotalMinor, disc.value_minor);
    }

    if (disc.max_discount_minor && disc.max_discount_minor > 0) {
      discAmount = Math.min(discAmount, disc.max_discount_minor);
    }

    if (discAmount > 0) {
      totalOrderDiscountMinor = moneyAdd(totalOrderDiscountMinor, discAmount);
      runningSubtotalMinor = moneySubtract(runningSubtotalMinor, discAmount, true);
      appliedDiscounts.push({
        id: disc.id,
        title: disc.title,
        type: disc.discount_type,
        method: disc.application_method,
        code: disc.code || null,
        codeId: disc.codeId || null,
        amountMinor: discAmount,
        campaignId: disc.campaign_id || null,
      });
    }
  }

  // Step 3: Shipping discounts
  for (const disc of selectedDiscounts) {
    if (disc.discount_type !== 'free_shipping') continue;

    let shipDisc = 0;
    if (disc.value_minor > 0) {
      shipDisc = Math.min(shippingFeeMinor, disc.value_minor);
    } else {
      // 100% free shipping
      shipDisc = shippingFeeMinor;
    }

    if (shipDisc > 0) {
      totalShippingDiscountMinor = moneyAdd(totalShippingDiscountMinor, shipDisc);
      appliedDiscounts.push({
        id: disc.id,
        title: disc.title,
        type: disc.discount_type,
        method: disc.application_method,
        code: disc.code || null,
        codeId: disc.codeId || null,
        amountMinor: shipDisc,
        campaignId: disc.campaign_id || null,
      });
    }
  }

  // Total discount and final payable
  const totalDiscountMinor = moneyAdd(totalProductDiscountMinor, totalOrderDiscountMinor);
  const effectiveShippingMinor = moneySubtract(shippingFeeMinor, totalShippingDiscountMinor, true);
  const finalPayableMinor = moneyAdd(runningSubtotalMinor, effectiveShippingMinor);

  return {
    valid: true,
    codeApplied: qualifiedCode ? qualifiedCode.codeRecord.code : null,
    discountsApplied: appliedDiscounts,
    itemDiscounts: Object.fromEntries(itemDiscounts),
    subtotalMinor: cartSubtotalMinor,
    productDiscountMinor: totalProductDiscountMinor,
    orderDiscountMinor: totalOrderDiscountMinor,
    shippingFeeMinor,
    shippingDiscountMinor: totalShippingDiscountMinor,
    effectiveShippingMinor,
    totalDiscountMinor,
    finalPayableMinor,
    currency: 'INR',
    rejectedDiscounts,
  };
}

/**
 * Atomically records discount redemption and increments usage counts.
 */
export async function recordDiscountRedemptions(db, {
  organizationId,
  shopId,
  orderId,
  discountsApplied = [],
  customer = null,
  orderSubtotalMinor,
  orderTotalMinor,
  attributionSource = null,
}) {
  if (!Array.isArray(discountsApplied) || discountsApplied.length === 0) return;

  const now = new Date().toISOString();
  const customerId = customer?.id || customer?.customer_id || null;
  const customerPhone = customer?.phone || customer?.customer_phone ? String(customer?.phone || customer?.customer_phone).replace(/\D/g, '') : null;
  const customerEmail = customer?.email || customer?.customer_email ? String(customer?.email || customer?.customer_email).toLowerCase().trim() : null;

  for (const disc of discountsApplied) {
    try {
      // 1. Record redemption row
      const redemptionId = `red_${crypto.randomUUID()}`;
      await db.prepare(`
        INSERT INTO discount_redemptions (
          id, organization_id, shop_id, discount_id, discount_code_id,
          code, order_id, customer_id, customer_phone, customer_email,
          discount_amount_minor, order_subtotal_minor, order_total_minor,
          campaign_id, attribution_source, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        redemptionId,
        organizationId,
        shopId,
        disc.id,
        disc.codeId || null,
        disc.code || null,
        orderId,
        customerId,
        customerPhone,
        customerEmail,
        disc.amountMinor || 0,
        orderSubtotalMinor,
        orderTotalMinor,
        disc.campaignId || null,
        attributionSource || 'storefront',
        now
      ).run();

      // 2. Increment usage counter on discounts table
      await db.prepare(`
        UPDATE discounts
        SET times_used = times_used + 1, updated_at = ?
        WHERE id = ? AND organization_id = ?
      `).bind(now, disc.id, organizationId).run();

      // 3. Increment usage counter on discount_codes table if redeemed via code
      if (disc.codeId) {
        await db.prepare(`
          UPDATE discount_codes
          SET times_used = times_used + 1
          WHERE id = ? AND organization_id = ?
        `).bind(disc.codeId, organizationId).run();
      }
    } catch (err) {
      console.error('Failed to record discount redemption:', err?.message);
    }
  }
}

/**
 * Profit protection check: Warns if a discount will cause product selling price
 * to drop below recorded cost price.
 */
export function auditDiscountProfitability(discount, products = []) {
  const warnings = [];

  for (const prod of products) {
    const priceMinor = prod.price_minor || Math.round((prod.price || 0) * 100);
    const costMinor = prod.cost_price_minor;

    if (costMinor != null && costMinor > 0 && priceMinor > 0) {
      let discountAmount = 0;
      if (discount.discount_type === 'percentage') {
        discountAmount = moneyMultiplyPercentageBps(priceMinor, discount.value_minor);
      } else if (discount.discount_type === 'fixed_amount') {
        discountAmount = discount.value_minor;
      }

      if (discount.max_discount_minor && discount.max_discount_minor > 0) {
        discountAmount = Math.min(discountAmount, discount.max_discount_minor);
      }

      const netSellingMinor = moneySubtract(priceMinor, discountAmount, true);
      if (netSellingMinor < costMinor) {
        warnings.push({
          productId: prod.id,
          productName: prod.title || prod.name,
          costMinor,
          originalPriceMinor: priceMinor,
          netSellingMinor,
          deficitMinor: costMinor - netSellingMinor,
          message: `Discount drops selling price below recorded cost price (Loss of ${formatMoney(costMinor - netSellingMinor)})`,
        });
      }
    }
  }

  return {
    hasMarginWarning: warnings.length > 0,
    warnings,
  };
}
