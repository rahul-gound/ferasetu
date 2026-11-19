/**
 * realtimeService.js — Realtime Synchronization, Transactional Outbox & Reconciliation Engine
 * 
 * Guarantees:
 * 1. Transactional Outbox: Events are logged in D1 before or alongside mutations.
 * 2. Idempotent Delivery: Unique event_id generated per event.
 * 3. Fail-Soft Publishing: If DO is unconfigured or transiently fails, D1 mutation succeeds
 *    and events can be reconciled via /api/realtime/reconcile.
 * 4. Audience Segregation: Public storefronts only receive 'public' events; private orders/metrics
 *    stay strictly within 'merchant' audience.
 */

export async function publishRealtimeEvent(env, ctx, {
  organizationId,
  eventType,
  resourceId = null,
  audience = 'merchant',
  payload = {},
}) {
  if (!organizationId) {
    console.warn("[realtimeService] Cannot publish event without organizationId");
    return null;
  }

  const eventId = `evt_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  // 1. Transactional Outbox: Record in D1
  if (env?.DB) {
    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS realtime_events (
          id TEXT PRIMARY KEY,
          organization_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          resource_id TEXT,
          payload_json TEXT NOT NULL DEFAULT '{}',
          audience TEXT NOT NULL DEFAULT 'merchant',
          created_at TEXT NOT NULL,
          published_at TEXT
        )
      `).run();

      await env.DB.prepare(`
        INSERT INTO realtime_events (id, organization_id, event_type, resource_id, payload_json, audience, created_at, published_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
      `).bind(
        eventId,
        organizationId,
        eventType,
        resourceId || '',
        JSON.stringify(payload || {}),
        audience,
        now
      ).run();
    } catch (outboxErr) {
      console.warn("[realtimeService] Transactional outbox logging warning:", outboxErr?.message || outboxErr);
    }
  }

  const eventData = {
    event_id: eventId,
    event_type: eventType,
    resource_id: resourceId,
    organization_id: organizationId,
    audience,
    timestamp: now,
    payload,
  };

  // 2. Publish to Durable Object (if namespace bound)
  const dispatchToHub = async () => {
    if (!env?.REALTIME_HUB) {
      return { delivered: 0, reason: "REALTIME_HUB binding not present" };
    }

    try {
      const doId = env.REALTIME_HUB.idFromName(organizationId);
      const stub = env.REALTIME_HUB.get(doId);
      const res = await stub.fetch("https://realtime-hub/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });

      if (res.ok) {
        // Mark published in D1 outbox
        if (env?.DB) {
          try {
            await env.DB.prepare("UPDATE realtime_events SET published_at = ? WHERE id = ?")
              .bind(new Date().toISOString(), eventId)
              .run();
          } catch {}
        }
        return await res.json();
      }
    } catch (publishErr) {
      console.warn("[realtimeService] Failed to publish event to DO:", publishErr?.message || publishErr);
    }
    return { delivered: 0, error: "Publish failed" };
  };

  if (ctx && typeof ctx.waitUntil === 'function') {
    ctx.waitUntil(dispatchToHub());
  } else {
    await dispatchToHub();
  }

  return eventData;
}

/**
 * Fetch missed events for a client reconnecting after a network outage
 */
export async function getMissedEvents(db, organizationId, sinceTimestamp, audience = 'public') {
  if (!db || !organizationId || !sinceTimestamp) return [];

  try {
    const rows = await db.prepare(`
      SELECT * FROM realtime_events
      WHERE organization_id = ?
        AND created_at > ?
        AND (audience = 'public' OR ? = 'merchant')
      ORDER BY created_at ASC
      LIMIT 100
    `).bind(organizationId, sinceTimestamp, audience).all();

    return (rows?.results || []).map(r => ({
      event_id: r.id,
      event_type: r.event_type,
      resource_id: r.resource_id,
      organization_id: r.organization_id,
      audience: r.audience,
      timestamp: r.created_at,
      payload: safeJsonParse(r.payload_json, {}),
    }));
  } catch (err) {
    console.warn("[realtimeService] Failed to fetch missed events:", err?.message || err);
    return [];
  }
}

function safeJsonParse(str, fallback = {}) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}
