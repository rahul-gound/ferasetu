// FeraSetu — Authoritative Product/Variant Price Resolver
// ========================================================
// Canonical rule:
// - Zero active variants: products.price_minor is authoritative.
// - One or more active variants: variant selection is required and product_variants.price_minor is authoritative.
// - Archived/draft variants do not force variant selection.
// - Rejects draft/archived products and variants.

export async function resolveSellablePrice(db, { shopId, productId, variantId }) {
  if (!shopId || !productId) {
    const err = new Error("shopId and productId are required to resolve sellable price");
    err.code = "INVALID_PRICE_RESOLUTION_ARGS";
    err.status = 400;
    throw err;
  }

  // 1. Fetch product record scoped to shop / org
  const product = await db.prepare(
    `SELECT id, shop_id, organization_id, name, title, status, currency,
            price_minor, compare_at_price_minor, cost_price_minor, price, sale_price,
            is_inventory_tracked, stock, stock_quantity
     FROM products 
     WHERE id = ? AND (shop_id = ? OR organization_id = ?)`
  ).bind(productId, shopId, shopId).first();

  if (!product) {
    const err = new Error(`Product not found in shop (${productId})`);
    err.code = "PRODUCT_NOT_FOUND";
    err.status = 404;
    throw err;
  }

  // Product status verification: only 'active' products are sellable
  const prodStatus = (product.status || 'active').toLowerCase();
  if (prodStatus !== 'active') {
    const err = new Error(`Product "${product.title || product.name}" is not active (${prodStatus})`);
    err.code = "PRODUCT_NOT_ACTIVE";
    err.status = 400;
    throw err;
  }

  // Authoritative currency
  const currency = (product.currency || 'INR').toUpperCase();

  // Fallback price_minor from legacy price if price_minor is unpopulated
  let productPriceMinor = product.price_minor;
  if (!productPriceMinor || productPriceMinor <= 0) {
    const legacyPrice = product.sale_price !== undefined && product.sale_price !== null && Number(product.sale_price) > 0
      ? Number(product.sale_price)
      : Number(product.price || 0);
    productPriceMinor = Math.round(legacyPrice * 100);
  }

  // 2. Fetch ACTIVE variants for this product
  let activeVariants = [];
  try {
    const varRes = await db.prepare(
      `SELECT id, shop_id, organization_id, product_id, title, option_signature,
              sku, barcode, sku_normalized, barcode_normalized, currency,
              price_minor, compare_at_price_minor, cost_price_minor, status
       FROM product_variants 
       WHERE product_id = ? AND (shop_id = ? OR organization_id = ?) AND status = 'active'`
    ).bind(productId, shopId, shopId).all();
    activeVariants = varRes?.results || [];
  } catch (e) {
    // If product_variants table is not yet queried or empty
    activeVariants = [];
  }

  const hasActiveVariants = activeVariants.length > 0;

  // Case A: Product has one or more active variants -> variant selection is strictly required
  if (hasActiveVariants) {
    if (!variantId) {
      const err = new Error(`Variant selection is required for product "${product.title || product.name}"`);
      err.code = "VARIANT_SELECTION_REQUIRED";
      err.status = 400;
      throw err;
    }

    const selectedVariant = activeVariants.find(v => v.id === variantId);
    if (!selectedVariant) {
      const err = new Error(`Selected variant "${variantId}" is invalid or inactive for product "${product.title || product.name}"`);
      err.code = "INVALID_VARIANT";
      err.status = 400;
      throw err;
    }

    return {
      currency: (selectedVariant.currency || currency).toUpperCase(),
      price_minor: Number(selectedVariant.price_minor),
      compare_at_price_minor: selectedVariant.compare_at_price_minor ? Number(selectedVariant.compare_at_price_minor) : null,
      cost_price_minor: selectedVariant.cost_price_minor ? Number(selectedVariant.cost_price_minor) : null,
      is_variant: true,
      variant: selectedVariant,
      product
    };
  }

  // Case B: Zero active variants -> products.price_minor is authoritative
  if (variantId) {
    // Variant ID was provided but no active variants exist for this product
    const err = new Error(`Product "${product.title || product.name}" does not have active variants`);
    err.code = "PRODUCT_HAS_NO_VARIANTS";
    err.status = 400;
    throw err;
  }

  return {
    currency,
    price_minor: Number(productPriceMinor),
    compare_at_price_minor: product.compare_at_price_minor ? Number(product.compare_at_price_minor) : null,
    cost_price_minor: product.cost_price_minor ? Number(product.cost_price_minor) : null,
    is_variant: false,
    variant: null,
    product
  };
}
