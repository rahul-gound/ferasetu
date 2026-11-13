// FeraSetu — Gift Cards Routes
// Cloudflare Worker Serverless Route Handler

function generateGiftCardCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  let code = 'FERA-';
  for (let block = 0; block < 3; block++) {
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(array[block * 4 + i] & 31);
    }
    if (block < 2) code += '-';
  }
  return code;
}

export async function handleGiftCardsRoutes(request, env, helpers) {
  const { json, errorResponse, requireOrgContext, readJsonBody, HttpError } = helpers;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const method = request.method.toUpperCase();

  // POST /api/gift-cards/simulate
  if (path === "/api/gift-cards/simulate" && method === "POST") {
    const body = await readJsonBody(request);
    const balance = Number(body.gift_card_balance || 1000);
    const total = Number(body.order_total || 700);

    const appliedFromGiftCard = Math.min(balance, total);
    const remainingGiftCardBalance = Math.max(0, balance - appliedFromGiftCard);
    const remainingOrderToPay = Math.max(0, total - appliedFromGiftCard);

    return json({
      success: true,
      simulation: {
        initial_card_balance: balance,
        order_total: total,
        applied_from_gift_card: appliedFromGiftCard,
        remaining_gift_card_balance: remainingGiftCardBalance,
        remaining_order_to_pay: remainingOrderToPay,
        currency: 'INR',
        explanation:
          total <= balance
            ? `The ₹${appliedFromGiftCard.toLocaleString('en-IN')} order is fully covered by the gift card. Remaining ₹${remainingGiftCardBalance.toLocaleString('en-IN')} stays on the card for a future purchase.`
            : `The ₹${appliedFromGiftCard.toLocaleString('en-IN')} gift card covers part of the order. The customer pays the remaining ₹${remainingOrderToPay.toLocaleString('en-IN')} using UPI, Card, or Cash on Delivery.`
      }
    }, 200, {}, request);
  }

  // POST /api/gift-cards/product
  if (path === "/api/gift-cards/product" && method === "POST") {
    const ctx = await requireOrgContext(request, env, 'staff');
    const body = await readJsonBody(request);

    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) {
      throw new HttpError("Gift card title is required", 400);
    }

    const denominations = Array.isArray(body.denominations)
      ? body.denominations.map(Number).filter(d => Number.isFinite(d) && d > 0)
      : [];

    if (denominations.length === 0) {
      throw new HttpError("At least one valid positive denomination is required", 400);
    }

    const productId = `prod_${crypto.randomUUID()}`;
    const defaultPrice = denominations[0];
    const effectiveImageUrl = body.image_url || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80';
    const metadata = JSON.stringify({
      is_gift_card: true,
      currency: body.currency || 'INR',
      cross_currency_redemption: Boolean(body.cross_currency_redemption),
      denominations,
      sales_channels: Array.isArray(body.sales_channels) ? body.sales_channels : ['online_store'],
      tags: Array.isArray(body.tags) ? body.tags : ['Gift Card', 'Digital'],
      product_type: body.product_type || 'Digital Gift Card',
      collection: body.collection || 'Gift Cards',
      seo: {
        title: body.seo_title || title,
        description: body.seo_description || body.description || ''
      },
      fulfilment: {
        delivery_type: 'digital_email',
        auto_issue_on_paid: true
      }
    });

    const now = new Date().toISOString();
    await env.DB.prepare(`
      INSERT INTO products (
        id, organization_id, user_id, name, description, cost_price, price, sale_price,
        category, stock_quantity, image_url, is_active, metadata, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?
      )
    `).bind(
      productId,
      ctx.organizationId,
      ctx.user.id,
      title,
      body.description ? String(body.description).trim() : 'Digital Gift Card redeemable at checkout.',
      null,
      defaultPrice,
      null,
      'Gift Cards',
      9999,
      effectiveImageUrl,
      body.is_active === false ? 0 : 1,
      metadata,
      now,
      now
    ).run();

    const createdProduct = await env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(productId).first();

    return json({
      success: true,
      message: "Digital gift card product created successfully in your store catalog",
      product: createdProduct
    }, 201, {}, request);
  }

  // POST /api/gift-cards/issue
  if (path === "/api/gift-cards/issue" && method === "POST") {
    const ctx = await requireOrgContext(request, env, 'staff');
    const body = await readJsonBody(request);

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new HttpError("Valid gift card amount is required", 400);
    }

    let expiresAt = null;
    if (body.expires_in_months && Number(body.expires_in_months) > 0) {
      const exp = new Date();
      exp.setMonth(exp.getMonth() + Number(body.expires_in_months));
      expiresAt = exp.toISOString();
    }

    const cardId = `gc_${crypto.randomUUID()}`;
    const code = generateGiftCardCode();
    const now = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO gift_cards (
        id, organization_id, user_id, code, initial_value, balance, currency,
        recipient_email, recipient_name, note, status, expires_at, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, 'active', ?, ?, ?
      )
    `).bind(
      cardId,
      ctx.organizationId,
      ctx.user.id,
      code,
      amount,
      amount,
      body.currency || 'INR',
      body.recipient_email ? String(body.recipient_email).trim() : null,
      body.recipient_name ? String(body.recipient_name).trim() : null,
      body.note ? String(body.note).trim() : null,
      expiresAt,
      now,
      now
    ).run();

    const issuedCard = await env.DB.prepare("SELECT * FROM gift_cards WHERE id = ?").bind(cardId).first();

    return json({
      success: true,
      message: "Gift card issued successfully with unique redemption code",
      card: issuedCard
    }, 201, {}, request);
  }

  // GET /api/gift-cards
  if (path === "/api/gift-cards" && method === "GET") {
    const ctx = await requireOrgContext(request, env, 'staff');

    // 1. Fetch gift card products
    let giftCardProducts = [];
    try {
      const allProducts = await env.DB.prepare(
        "SELECT * FROM products WHERE organization_id = ?"
      ).bind(ctx.organizationId).all();

      giftCardProducts = (allProducts?.results || []).filter(p => {
        if (p.category === 'Gift Cards' || p.category === 'Gift Card') return true;
        try {
          const meta = p.metadata ? JSON.parse(p.metadata) : null;
          return meta?.is_gift_card === true;
        } catch {
          return false;
        }
      });
    } catch (e) {
      console.warn("Error reading gift card products:", e?.message || e);
    }

    // 2. Fetch issued individual gift cards
    let issuedGiftCards = [];
    try {
      const issuedRes = await env.DB.prepare(
        "SELECT * FROM gift_cards WHERE organization_id = ? ORDER BY created_at DESC"
      ).bind(ctx.organizationId).all();
      issuedGiftCards = issuedRes?.results || [];
    } catch (e) {
      console.warn("Error reading issued gift cards:", e?.message || e);
    }

    // 3. Stats
    const totalIssuedValue = issuedGiftCards.reduce((acc, gc) => acc + (Number(gc.initial_value) || 0), 0);
    const outstandingBalance = issuedGiftCards.reduce((acc, gc) => acc + (Number(gc.balance) || 0), 0);
    const totalRedeemedValue = Math.max(0, totalIssuedValue - outstandingBalance);

    return json({
      success: true,
      products: giftCardProducts,
      issued_cards: issuedGiftCards,
      stats: {
        total_products: giftCardProducts.length,
        total_issued_cards: issuedGiftCards.length,
        total_issued_value: totalIssuedValue,
        outstanding_balance_obligation: outstandingBalance,
        total_redeemed_value: totalRedeemedValue,
        currency: 'INR'
      }
    }, 200, {}, request);
  }

  return null;
}
