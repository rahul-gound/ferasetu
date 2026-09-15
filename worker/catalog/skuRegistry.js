// FeraSetu — Shop-Level SKU and Barcode Registry
// ===============================================
// Enforces normalized uniqueness per shop across BOTH products and variants.

export function normalizeSku(sku) {
  if (!sku || typeof sku !== 'string') return null;
  const s = sku.trim().toUpperCase();
  return s.length > 0 ? s : null;
}

export function normalizeBarcode(barcode) {
  if (!barcode || typeof barcode !== 'string') return null;
  const b = barcode.trim();
  return b.length > 0 ? b : null;
}

/**
 * Registers a normalized SKU in the shop-wide registry.
 * Rejects if the SKU is already assigned to a different product or variant in this shop.
 */
export async function registerShopSku(db, { shopId, sku, productId, variantId = '' }) {
  const norm = normalizeSku(sku);
  if (!norm) return null;

  const existing = await db.prepare(
    "SELECT * FROM shop_skus WHERE shop_id = ? AND sku_normalized = ?"
  ).bind(shopId, norm).first();

  if (existing) {
    if (existing.product_id === productId && (existing.variant_id || '') === (variantId || '')) {
      return norm; // Already registered for this exact item
    }
    const err = new Error(`SKU "${sku}" is already in use by another product or variant in this shop.`);
    err.code = "DUPLICATE_SKU";
    err.status = 409;
    throw err;
  }

  const id = `sku_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  await db.prepare(
    "INSERT INTO shop_skus (id, shop_id, sku_normalized, product_id, variant_id, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(id, shopId, norm, productId, variantId || '', now).run();

  return norm;
}

/**
 * Registers a normalized barcode in the shop-wide registry.
 * Rejects if the barcode is already assigned to a different product or variant in this shop.
 */
export async function registerShopBarcode(db, { shopId, barcode, productId, variantId = '' }) {
  const norm = normalizeBarcode(barcode);
  if (!norm) return null;

  const existing = await db.prepare(
    "SELECT * FROM shop_barcodes WHERE shop_id = ? AND barcode_normalized = ?"
  ).bind(shopId, norm).first();

  if (existing) {
    if (existing.product_id === productId && (existing.variant_id || '') === (variantId || '')) {
      return norm;
    }
    const err = new Error(`Barcode "${barcode}" is already in use by another product or variant in this shop.`);
    err.code = "DUPLICATE_BARCODE";
    err.status = 409;
    throw err;
  }

  const id = `bar_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  await db.prepare(
    "INSERT INTO shop_barcodes (id, shop_id, barcode_normalized, product_id, variant_id, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(id, shopId, norm, productId, variantId || '', now).run();

  return norm;
}

/**
 * Generates a deterministic option signature from an object or array of option key-values.
 * Example: { "Size": "M", "Color": "Black" } -> "color:black|size:m"
 */
export function generateOptionSignature(options) {
  if (!options) return "";
  let entries = [];
  if (Array.isArray(options)) {
    entries = options.map(opt => [
      String(opt.name || opt.key || '').trim().toLowerCase(),
      String(opt.value || '').trim().toLowerCase()
    ]);
  } else if (typeof options === 'object') {
    entries = Object.entries(options).map(([k, v]) => [
      String(k).trim().toLowerCase(),
      String(v).trim().toLowerCase()
    ]);
  }
  // Filter empty keys and sort alphabetically
  entries = entries.filter(([k]) => k.length > 0);
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  return entries.map(([k, v]) => `${k}:${v}`).join('|');
}
