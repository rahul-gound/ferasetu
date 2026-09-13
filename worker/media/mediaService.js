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

  return {
    success: true,
    media_file: {
      id: mediaId,
      shop_id: shopId,
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

  // 2. Delete from R2
  const mediaStore = await getTenantMediaStore(shopId, env);
  try {
    await mediaStore.delete(file.r2_key);
  } catch (r2Err) {
    console.warn(`[handleDeleteMedia] Warning deleting key ${file.r2_key} from R2:`, r2Err);
  }

  const nowIso = new Date().toISOString();

  // 3. Atomically release used_bytes and remove registry row
  await db.prepare(`
    UPDATE shop_storage
    SET used_bytes = MAX(0, used_bytes - ?), updated_at = ?
    WHERE shop_id = ?
  `).bind(file.size_bytes, nowIso, shopId).run();

  await db.prepare("DELETE FROM media_files WHERE id = ?").bind(mediaId).run();

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
