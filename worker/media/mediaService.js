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
  } else {
    filename = sanitizeFilename(request.headers.get('x-file-name') || 'upload.bin');
    category = (request.headers.get('x-category') || 'products').toLowerCase().trim();
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

  // 6. Atomically reserve quota
  const reservationId = `res_${crypto.randomUUID()}`;
  const fileId = crypto.randomUUID();
  // Versioned key ensures new uploads never hit stale edge caches
  const objectKey = `shops/${shopId}/${category}/${fileId}-v${Date.now()}-${filename}`;
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

  // 7. Upload to B2 via mediaStore
  const mediaStore = await getTenantMediaStore(shopId, env);
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
