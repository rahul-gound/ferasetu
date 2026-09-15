/**
 * FeraSetu Media Storage & Upload Security Service
 *
 * Implements plan-based server-side media quotas, atomic capacity reservations,
 * R2 tenant scoping, and upload verification.
 * The frontend is never trusted for shop IDs, plans, quotas, or reported file sizes.
 */

import {
  getAuthoritativeMediaQuota,
  getMaxUploadFileSizeBytes,
  getReservationTtlSeconds,
} from '../sharding/config.js';
import { logShardingEvent } from '../sharding/observability.js';
import { getTenantMediaStore } from '../sharding/runtime.js';

class HttpError extends Error {
  constructor(message, status = 400, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/**
 * Sanitizes filenames to alphanumeric characters, dashes, and periods.
 */
function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') return 'file.bin';
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
}

/**
 * Cleans up expired reservations and releases their reserved bytes in shop_storage.
 */
export async function cleanupExpiredReservations(db, shopId) {
  const nowIso = new Date().toISOString();

  // Find pending reservations past their expiration
  const expiredRows = await db.prepare(`
    SELECT id, reserved_bytes FROM upload_reservations
    WHERE shop_id = ? AND status = 'pending' AND expires_at < ?
  `).bind(shopId, nowIso).all();

  const expiredList = expiredRows?.results || [];
  if (expiredList.length === 0) return 0;

  let totalFreedBytes = 0;
  for (const item of expiredList) {
    totalFreedBytes += item.reserved_bytes;
    await db.prepare(`
      UPDATE upload_reservations SET status = 'expired' WHERE id = ?
    `).bind(item.id).run();
  }

  if (totalFreedBytes > 0) {
    await db.prepare(`
      UPDATE shop_storage
      SET reserved_bytes = MAX(0, reserved_bytes - ?), updated_at = ?
      WHERE shop_id = ?
    `).bind(totalFreedBytes, nowIso, shopId).run();

    logShardingEvent('upload_reservation_released', {
      shop_id: shopId,
      freed_bytes: totalFreedBytes,
      reason: 'expired',
    });
  }

  return totalFreedBytes;
}

/**
 * Retrieves or initializes authoritative storage record for a shop.
 */
export async function getOrCreateShopStorage(db, shopId, market, plan, env) {
  const quotaBytes = getAuthoritativeMediaQuota(market, plan, env);
  const nowIso = new Date().toISOString();

  let storage = await db.prepare("SELECT * FROM shop_storage WHERE shop_id = ?").bind(shopId).first();

  if (!storage) {
    await db.prepare(`
      INSERT INTO shop_storage (shop_id, quota_bytes, used_bytes, reserved_bytes, updated_at)
      VALUES (?, ?, 0, 0, ?)
    `).bind(shopId, quotaBytes, nowIso).run();

    storage = {
      shop_id: shopId,
      quota_bytes: quotaBytes,
      used_bytes: 0,
      reserved_bytes: 0,
      updated_at: nowIso,
    };
  } else if (storage.quota_bytes !== quotaBytes) {
    // Keep quota synced with current plan and market
    await db.prepare("UPDATE shop_storage SET quota_bytes = ?, updated_at = ? WHERE shop_id = ?")
      .bind(quotaBytes, nowIso, shopId)
      .run();
    storage.quota_bytes = quotaBytes;
  }

  return storage;
}

/**
 * POST /api/media/upload-intent
 */
export async function handleUploadIntent(request, env, orgContext) {
  const db = env.DB;
  const shopId = orgContext.organization.id;
  const market = orgContext.organization.market || 'IN';
  const plan = orgContext.organization.plan || 'free';

  let body;
  try {
    body = await request.json();
  } catch {
    throw new HttpError("Invalid JSON body", 400);
  }

  const requestedSize = parseInt(body.size_bytes, 10);
  if (isNaN(requestedSize) || requestedSize <= 0) {
    throw new HttpError("Invalid size_bytes: must be a positive integer", 400);
  }

  const maxFileSize = getMaxUploadFileSizeBytes(env);
  if (requestedSize > maxFileSize) {
    throw new HttpError(`File size (${requestedSize} bytes) exceeds maximum limit of ${maxFileSize} bytes (25 MB)`, 400);
  }

  const cleanFilename = sanitizeFilename(body.filename || 'upload.bin');
  const category = (typeof body.category === 'string' && ['products', 'logos', 'invoices', 'banners'].includes(body.category.toLowerCase()))
    ? body.category.toLowerCase()
    : 'products';

  // 1. Clean up stale expired reservations
  await cleanupExpiredReservations(db, shopId);

  // 2. Load authoritative storage usage
  const storage = await getOrCreateShopStorage(db, shopId, market, plan, env);
  const availableBytes = storage.quota_bytes - (storage.used_bytes + storage.reserved_bytes);

  // 3. Reject if quota would be exceeded
  if (requestedSize > availableBytes) {
    logShardingEvent('upload_rejected_quota', {
      shop_id: shopId,
      market,
      plan,
      quota_bytes: storage.quota_bytes,
      used_bytes: storage.used_bytes,
      reserved_bytes: storage.reserved_bytes,
      available_bytes: availableBytes,
      requested_bytes: requestedSize,
    });

    throw new HttpError("Media storage quota exceeded", 413, {
      quota_bytes: storage.quota_bytes,
      used_bytes: storage.used_bytes,
      reserved_bytes: storage.reserved_bytes,
      available_bytes: Math.max(0, availableBytes),
      requested_bytes: requestedSize,
    });
  }

  // 4. Create reservation
  const reservationId = `res_${crypto.randomUUID()}`;
  const fileId = crypto.randomUUID();
  const r2Key = `shops/${shopId}/${category}/${fileId}-${cleanFilename}`;
  const ttlSeconds = getReservationTtlSeconds(env);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  const nowIso = new Date().toISOString();

  await db.prepare(`
    INSERT INTO upload_reservations (id, shop_id, r2_key, reserved_bytes, expires_at, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `).bind(reservationId, shopId, r2Key, requestedSize, expiresAt).run();

  // Atomically reserve capacity in shop_storage
  await db.prepare(`
    UPDATE shop_storage
    SET reserved_bytes = reserved_bytes + ?, updated_at = ?
    WHERE shop_id = ?
  `).bind(requestedSize, nowIso, shopId).run();

  logShardingEvent('upload_reservation_created', {
    reservation_id: reservationId,
    shop_id: shopId,
    r2_key: r2Key,
    reserved_bytes: requestedSize,
    expires_at: expiresAt,
  });

  return {
    success: true,
    reservation_id: reservationId,
    r2_key: r2Key,
    max_size_bytes: requestedSize,
    expires_at: expiresAt,
    upload_token: `ut_${crypto.randomUUID()}`,
  };
}

/**
 * POST /api/media/complete
 */
export async function handleCompleteUpload(request, env, orgContext) {
  const db = env.DB;
  const shopId = orgContext.organization.id;

  let body;
  try {
    body = await request.json();
  } catch {
    throw new HttpError("Invalid JSON body", 400);
  }

  const reservationId = body.reservation_id;
  if (!reservationId || typeof reservationId !== 'string') {
    throw new HttpError("Missing reservation_id", 400);
  }

  // 1. Verify reservation exists, belongs to this shop, and is pending
  const reservation = await db.prepare(`
    SELECT * FROM upload_reservations WHERE id = ? AND shop_id = ?
  `).bind(reservationId, shopId).first();

  if (!reservation) {
    throw new HttpError("Reservation not found or unauthorized", 404);
  }

  if (reservation.status !== 'pending') {
    throw new HttpError(`Reservation cannot be completed (status: ${reservation.status})`, 400);
  }

  const now = new Date();
  if (new Date(reservation.expires_at) < now) {
    await db.prepare("UPDATE upload_reservations SET status = 'expired' WHERE id = ?").bind(reservationId).run();
    await db.prepare("UPDATE shop_storage SET reserved_bytes = MAX(0, reserved_bytes - ?) WHERE shop_id = ?")
      .bind(reservation.reserved_bytes, shopId).run();
    throw new HttpError("Upload reservation has expired", 400);
  }

  // 2. Authoritative object verification from R2 media store
  const mediaStore = await getTenantMediaStore(shopId, env);
  const r2Meta = await mediaStore.head(reservation.r2_key);

  if (!r2Meta) {
    throw new HttpError("Object not found in R2 storage. Please upload the file before completing.", 404);
  }

  const actualSize = r2Meta.size ?? reservation.reserved_bytes;
  const contentType = r2Meta.httpMetadata?.contentType || body.content_type || 'application/octet-stream';

  // 3. Verify actual size does not exceed reservation or total quota
  const storage = await db.prepare("SELECT * FROM shop_storage WHERE shop_id = ?").bind(shopId).first();
  const currentNetUsed = (storage?.used_bytes || 0) - reservation.reserved_bytes + actualSize;

  if (storage && currentNetUsed > storage.quota_bytes) {
    // Delete the violating object from R2
    await mediaStore.delete(reservation.r2_key);
    await db.prepare("UPDATE upload_reservations SET status = 'cancelled' WHERE id = ?").bind(reservationId).run();
    await db.prepare("UPDATE shop_storage SET reserved_bytes = MAX(0, reserved_bytes - ?) WHERE shop_id = ?")
      .bind(reservation.reserved_bytes, shopId).run();
    throw new HttpError("Uploaded file exceeds total storage quota", 413);
  }

  const nowIso = now.toISOString();
  const mediaId = `media_${crypto.randomUUID()}`;

  // 4. Atomically commit storage usage and release reservation
  await db.prepare(`
    UPDATE shop_storage
    SET used_bytes = used_bytes + ?,
        reserved_bytes = MAX(0, reserved_bytes - ?),
        updated_at = ?
    WHERE shop_id = ?
  `).bind(actualSize, reservation.reserved_bytes, nowIso, shopId).run();

  await db.prepare("UPDATE upload_reservations SET status = 'completed' WHERE id = ?")
    .bind(reservationId)
    .run();

  await db.prepare(`
    INSERT INTO media_files (id, shop_id, r2_key, size_bytes, content_type, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(mediaId, shopId, reservation.r2_key, actualSize, contentType, nowIso).run();

  const cdnBase = (env.CDN_BASE_URL || 'https://cdn.ferasetu.com').replace(/\/+$/, '');
  const mediaUrl = `${cdnBase}/${reservation.r2_key}`;

  return {
    success: true,
    media_file: {
      id: mediaId,
      shop_id: shopId,
      media_key: reservation.r2_key,
      url: mediaUrl,
      r2_key: reservation.r2_key,
      size_bytes: actualSize,
      content_type: contentType,
      created_at: nowIso,
    },
  };
}

/**
 * DELETE /api/media/:id
 */
/**
 * Inspects buffer magic bytes to verify actual image file signature.
 * Prevents spoofed Content-Type, HTML/script injection, and executable uploads.
 */
/**
 * Inspects buffer magic bytes to verify actual image file signature.
 * Prevents spoofed Content-Type, HTML/script injection, and executable uploads.
 */
export function validateImageMagicBytes(arrayBuffer, declaredMime, category = 'products', filename = '') {
  const bytes = new Uint8Array(arrayBuffer);
  if (!bytes || bytes.length === 0) {
    throw new HttpError("Empty file buffer", 400);
  }

  // 1. Strict rejection of dangerous executables and scripts across ALL categories
  const isExe = bytes.length >= 2 && bytes[0] === 0x4D && bytes[1] === 0x5A; // MZ header
  const isElf = bytes.length >= 4 && bytes[0] === 0x7F && bytes[1] === 0x45 && bytes[2] === 0x4C && bytes[3] === 0x46; // \x7fELF
  const isShebang = bytes.length >= 2 && bytes[0] === 0x23 && bytes[1] === 0x21; // #!

  if (isExe || isElf || isShebang) {
    throw new HttpError("Executable uploads are strictly prohibited", 400);
  }

  // Reject HTML / script injection in non-SVG uploads
  if (declaredMime !== 'image/svg+xml' && declaredMime !== 'application/pdf' && bytes.length >= 6) {
    const sampleLen = Math.min(bytes.length, 1024);
    const sample = new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(0, sampleLen)).toLowerCase();
    if (sample.includes('<script') || sample.includes('<html') || sample.includes('<?php')) {
      throw new HttpError("Active scripts and HTML uploads are strictly prohibited", 400);
    }
  }

  // 2. Magic byte detection
  // JPEG: FF D8 FF
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPng = bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
    bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A;

  // GIF: 47 49 46 38
  const isGif = bytes.length >= 4 &&
    bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38;

  // WebP: RIFF (bytes 0-3) and WEBP (bytes 8-11)
  const isWebp = bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;

  // ICO: 00 00 01 00
  const isIco = bytes.length >= 4 &&
    bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x01 && bytes[3] === 0x00;

  // SVG: check XML/SVG header and enforce strict sanitization
  let isSvg = false;
  const isSvgMime = declaredMime === 'image/svg+xml' || filename.toLowerCase().endsWith('.svg');
  if (isSvgMime) {
    const textSample = new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(0, Math.min(bytes.length, 4096))).toLowerCase().trim();
    if (textSample.includes('<svg') || textSample.includes('<?xml')) {
      const fullText = new TextDecoder('utf-8', { fatal: false }).decode(bytes).toLowerCase();
      if (
        fullText.includes('<script') ||
        fullText.includes('javascript:') ||
        fullText.includes('onload=') ||
        fullText.includes('onerror=') ||
        fullText.includes('<iframe') ||
        fullText.includes('<object') ||
        fullText.includes('<embed') ||
        fullText.includes('<foreignobject')
      ) {
        throw new HttpError("SVG contains potentially malicious active content or scripts", 400);
      }
      isSvg = true;
    }
  }

  // Video / Audio / PDF magic bytes
  const isMp4 = bytes.length >= 8 &&
    (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70);
  const isPdf = bytes.length >= 4 &&
    bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  const isMp3 = (bytes.length >= 3 && bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0) ||
    (bytes.length >= 3 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33);

  let detectedMime = null;
  if (isJpeg) detectedMime = 'image/jpeg';
  else if (isPng) detectedMime = 'image/png';
  else if (isWebp) detectedMime = 'image/webp';
  else if (isGif) detectedMime = 'image/gif';
  else if (isIco) detectedMime = 'image/x-icon';
  else if (isSvg) detectedMime = 'image/svg+xml';
  else if (isMp4) detectedMime = 'video/mp4';
  else if (isPdf) detectedMime = 'application/pdf';
  else if (isMp3) detectedMime = 'audio/mpeg';

  // 3. Category-specific strict policies
  if (category === 'logos') {
    if (!isJpeg && !isPng && !isWebp && !isGif) {
      throw new HttpError("Logos must be valid PNG, JPEG, WebP, or GIF images", 400);
    }
    if (bytes.length > 5 * 1024 * 1024) {
      throw new HttpError("Logo file size exceeds 5MB limit", 413);
    }
    return detectedMime;
  }

  const isFavicon = category === 'theme' && (filename.toLowerCase().includes('favicon') || declaredMime === 'image/x-icon' || declaredMime === 'image/vnd.microsoft.icon');
  if (isFavicon) {
    if (!isIco && !isPng) {
      throw new HttpError("Favicons must be PNG or ICO format", 400);
    }
    if (bytes.length > 1024 * 1024) {
      throw new HttpError("Favicon file size exceeds 1MB limit", 413);
    }
    return detectedMime;
  }

  return detectedMime || declaredMime;
}

/**
 * Infers file extension from MIME type or fallback filename.
 */
export function getExtensionForMime(mimeType, fallbackFilename = '') {
  const mimeMap = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'image/x-icon': 'ico',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'application/pdf': 'pdf',
  };
  if (mimeType && mimeMap[mimeType.toLowerCase()]) {
    return mimeMap[mimeType.toLowerCase()];
  }
  const parts = (fallbackFilename || '').split('.');
  if (parts.length > 1) {
    const ext = parts.pop().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (ext) return ext;
  }
  return 'bin';
}

/**
 * POST /api/media/upload
 * Direct authenticated upload pipeline through the Worker to Backblaze B2.
 */
export async function handleDirectUpload(request, env, orgContext) {
  const db = env.DB;
  const shopId = orgContext.organization.id;
  const market = orgContext.organization.market || 'IN';
  const plan = orgContext.organization.plan || 'free';

  const contentTypeHeader = request.headers.get('content-type') || '';
  let fileData = null;
  let filename = 'upload.bin';
  let category = 'products';
  let mimeType = 'application/octet-stream';
  let fileSize = 0;
  let productId = null;

  if (contentTypeHeader.includes('multipart/form-data')) {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      throw new HttpError("Missing file in multipart form data", 400);
    }
    filename = sanitizeFilename(file.name || 'upload.bin');
    mimeType = file.type || 'application/octet-stream';
    fileSize = file.size;
    fileData = await file.arrayBuffer();

    const formCategory = formData.get('category');
    if (typeof formCategory === 'string' && formCategory.trim()) {
      category = formCategory.toLowerCase().trim();
    }
    const formProductId = formData.get('productId') || formData.get('product_id');
    if (typeof formProductId === 'string' && formProductId.trim()) {
      productId = formProductId.trim();
    }
  } else {
    filename = sanitizeFilename(request.headers.get('x-file-name') || 'upload.bin');
    category = (request.headers.get('x-category') || 'products').toLowerCase().trim();
    const headerProdId = request.headers.get('x-product-id');
    if (headerProdId && typeof headerProdId === 'string' && headerProdId.trim()) {
      productId = headerProdId.trim();
    }
    mimeType = contentTypeHeader.split(';')[0].trim() || 'application/octet-stream';
    fileData = await request.arrayBuffer();
    fileSize = fileData.byteLength;
  }

  // 1. Validate MIME type allowlist
  const allowedMimes = new Set([
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/x-icon',
    'video/mp4', 'video/webm',
    'audio/mpeg', 'audio/wav',
    'application/pdf',
  ]);

  if (!allowedMimes.has(mimeType.toLowerCase())) {
    throw new HttpError(`Unsupported media type: ${mimeType}`, 400);
  }

  // 1b. Deep inspection of magic bytes & anti-malware verification
  mimeType = validateImageMagicBytes(fileData, mimeType, category, filename);

  // 2. Validate category (deny by default, restrict to known types)
  const allowedCategories = new Set(['products', 'logos', 'banners', 'theme', 'invoices', 'customers', 'exports', 'documents']);
  if (!allowedCategories.has(category)) {
    category = 'products';
  }

  // 3. Validate file size
  if (!fileSize || fileSize <= 0) {
    throw new HttpError("File is empty", 400);
  }

  const maxFileSize = getMaxUploadFileSizeBytes(env);
  if (fileSize > maxFileSize) {
    throw new HttpError(`File size (${fileSize} bytes) exceeds maximum limit of ${maxFileSize} bytes`, 413);
  }

  // 4. Clean up stale expired reservations
  await cleanupExpiredReservations(db, shopId);

  // 5. Load authoritative storage usage and check quota
  const storage = await getOrCreateShopStorage(db, shopId, market, plan, env);
  const availableBytes = storage.quota_bytes - (storage.used_bytes + storage.reserved_bytes);

  if (fileSize > availableBytes) {
    logShardingEvent('upload_rejected_quota', {
      shop_id: shopId,
      market,
      plan,
      quota_bytes: storage.quota_bytes,
      used_bytes: storage.used_bytes,
      reserved_bytes: storage.reserved_bytes,
      available_bytes: availableBytes,
      requested_bytes: fileSize,
    });
    throw new HttpError("Media storage quota exceeded", 413, {
      quota_bytes: storage.quota_bytes,
      used_bytes: storage.used_bytes,
      available_bytes: Math.max(0, availableBytes),
      requested_bytes: fileSize,
    });
  }

  // 6. Atomically reserve quota & construct canonical object key
  const reservationId = `res_${crypto.randomUUID()}`;
  const fileId = crypto.randomUUID();
  const ext = getExtensionForMime(mimeType, filename);

  let objectKey;
  if (category === 'products') {
    if (productId && /^[a-zA-Z0-9_-]+$/.test(productId)) {
      objectKey = `shops/${shopId}/products/${productId}/${fileId}.${ext}`;
    } else {
      objectKey = `shops/${shopId}/products/pending/${fileId}.${ext}`;
    }
  } else {
    objectKey = `shops/${shopId}/${category}/${fileId}.${ext}`;
  }

  const nowIso = new Date().toISOString();
  const ttlSeconds = getReservationTtlSeconds(env);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  await db.prepare(`
    INSERT INTO upload_reservations (id, shop_id, r2_key, reserved_bytes, expires_at, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `).bind(reservationId, shopId, objectKey, fileSize, expiresAt).run();

  await db.prepare(`
    UPDATE shop_storage
    SET reserved_bytes = reserved_bytes + ?, updated_at = ?
    WHERE shop_id = ?
  `).bind(fileSize, nowIso, shopId).run();

  // 7. Upload to B2 via mediaStore (fail fast on config error, no silent fallback)
  let mediaStore;
  try {
    mediaStore = await getTenantMediaStore(shopId, env);
  } catch (configErr) {
    await db.prepare("UPDATE upload_reservations SET status = 'cancelled' WHERE id = ?").bind(reservationId).run();
    await db.prepare(`
      UPDATE shop_storage
      SET reserved_bytes = MAX(0, reserved_bytes - ?), updated_at = ?
      WHERE shop_id = ?
    `).bind(fileSize, new Date().toISOString(), shopId).run();

    logShardingEvent('upload_storage_config_error', {
      shop_id: shopId,
      error: configErr.message,
    });
    throw new HttpError("Storage backend configuration error", 500);
  }

  try {
    await mediaStore.put(objectKey, fileData, {
      contentType: mimeType,
      contentLength: fileSize,
    });
  } catch (uploadErr) {
    // Release quota reservation on upload failure!
    await db.prepare("UPDATE upload_reservations SET status = 'cancelled' WHERE id = ?").bind(reservationId).run();
    await db.prepare(`
      UPDATE shop_storage
      SET reserved_bytes = MAX(0, reserved_bytes - ?), updated_at = ?
      WHERE shop_id = ?
    `).bind(fileSize, new Date().toISOString(), shopId).run();

    logShardingEvent('upload_failed', {
      shop_id: shopId,
      object_key: objectKey,
      error: uploadErr.message,
    });
    throw new HttpError("Failed to store media object in storage backend", 502);
  }

  // 8. Commit storage accounting and insert media record
  const mediaId = `media_${crypto.randomUUID()}`;
  await db.prepare(`
    UPDATE shop_storage
    SET used_bytes = used_bytes + ?,
        reserved_bytes = MAX(0, reserved_bytes - ?),
        updated_at = ?
    WHERE shop_id = ?
  `).bind(fileSize, fileSize, nowIso, shopId).run();

  await db.prepare("UPDATE upload_reservations SET status = 'completed' WHERE id = ?").bind(reservationId).run();

  await db.prepare(`
    INSERT INTO media_files (id, shop_id, r2_key, size_bytes, content_type, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(mediaId, shopId, objectKey, fileSize, mimeType, nowIso).run();

  const cdnBase = (env.CDN_BASE_URL || 'https://cdn.ferasetu.com').replace(/\/+$/, '');
  const mediaUrl = `${cdnBase}/${objectKey}`;

  console.log(`[MEDIA_EVENT] PRODUCT_IMAGE_UPLOAD_SUCCESS=true provider=b2 key=${objectKey}`);

  return {
    success: true,
    media_file: {
      id: mediaId,
      shop_id: shopId,
      media_key: objectKey,
      url: mediaUrl,
      r2_key: objectKey,
      size_bytes: fileSize,
      content_type: mimeType,
      created_at: nowIso,
    },
  };
}

/**
 * DELETE /api/media/:id
 * Failure-safe deletion with storage accounting rollback and edge cache invalidation.
 */
export async function handleDeleteMedia(mediaId, env, orgContext) {
  const db = env.DB;
  const shopId = orgContext.organization.id;

  if (!mediaId) {
    throw new HttpError("Missing media ID", 400);
  }

  // 1. Verify file exists and belongs to shop
  const file = await db.prepare(`
    SELECT * FROM media_files WHERE id = ? AND shop_id = ?
  `).bind(mediaId, shopId).first();

  if (!file) {
    throw new HttpError("Media file not found or unauthorized", 404);
  }

  // 2. Delete from B2 / media store first
  const mediaStore = await getTenantMediaStore(shopId, env);
  try {
    await mediaStore.delete(file.r2_key);
  } catch (storageErr) {
    console.error(`[handleDeleteMedia] Error deleting key ${file.r2_key} from storage:`, storageErr);
    // If upstream B2 delete fails, do NOT pretend it succeeded and do not decrement storage
    throw new HttpError("Failed to delete media object from storage backend. Safe to retry.", 502);
  }

  const nowIso = new Date().toISOString();

  // 3. Atomically release used_bytes and remove registry row
  await db.prepare(`
    UPDATE shop_storage
    SET used_bytes = MAX(0, used_bytes - ?), updated_at = ?
    WHERE shop_id = ?
  `).bind(file.size_bytes, nowIso, shopId).run();

  await db.prepare("DELETE FROM media_files WHERE id = ?").bind(mediaId).run();

  // 4. Invalidate Cloudflare Edge Cache for this exact media key
  const cache = typeof caches !== 'undefined' && caches.default ? caches.default : null;
  if (cache) {
    const cdnBase = (env.CDN_BASE_URL || 'https://cdn.ferasetu.com').replace(/\/+$/, '');
    const canonicalCdnUrl = `${cdnBase}/${file.r2_key}`;
    try {
      await cache.delete(new Request(canonicalCdnUrl, { method: 'GET' }));
    } catch (cacheErr) {
      console.warn('[handleDeleteMedia] Cache purge warning:', cacheErr);
    }
  }

  return {
    success: true,
    message: "Media file deleted successfully",
    freed_bytes: file.size_bytes,
  };
}

/**
 * GET /api/media/usage
 */
export async function handleGetMediaUsage(env, orgContext) {
  const db = env.DB;
  const shopId = orgContext.organization.id;
  const market = orgContext.organization.market || 'IN';
  const plan = orgContext.organization.plan || 'free';

  // Clean stale reservations
  await cleanupExpiredReservations(db, shopId);

  const storage = await getOrCreateShopStorage(db, shopId, market, plan, env);
  const availableBytes = Math.max(0, storage.quota_bytes - (storage.used_bytes + storage.reserved_bytes));

  const countRow = await db.prepare("SELECT COUNT(*) as count FROM media_files WHERE shop_id = ?").bind(shopId).first();

  return {
    shop_id: shopId,
    market,
    plan,
    quota_bytes: storage.quota_bytes,
    used_bytes: storage.used_bytes,
    reserved_bytes: storage.reserved_bytes,
    available_bytes: availableBytes,
    usage_percent: storage.quota_bytes > 0 ? ((storage.used_bytes / storage.quota_bytes) * 100).toFixed(2) : '0.00',
    total_files: countRow?.count || 0,
  };
}
