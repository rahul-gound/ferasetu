/**
 * realtimeRoutes.js — WebSocket Ingress & Reconciliation Endpoints
 */

import { HttpError } from '../index.js';
import { getMissedEvents } from './realtimeService.js';

export async function handleRealtimeWebSocketUpgrade(request, env, ctx, {
  resolveStorefrontTenant,
  requireOrgContext,
  getAuthenticatedUser,
}) {
  const url = new URL(request.url);
  const channel = url.searchParams.get("channel") || "storefront";

  if (!env?.REALTIME_HUB) {
    throw new HttpError("Realtime WebSocket service is not configured (missing REALTIME_HUB binding)", 503);
  }

  let organizationId = null;
  let audience = "public";
  let userId = null;

  if (channel === "storefront") {
    const shopSlugOrId = url.searchParams.get("shop") || url.searchParams.get("store") || null;
    const resolved = await resolveStorefrontTenant(request, env, shopSlugOrId);

    if (!resolved?.organizationId) {
      throw new HttpError("Could not resolve storefront organization for real-time subscription", 404);
    }

    organizationId = resolved.organizationId;
    audience = "public";
  } else if (channel === "dashboard") {
    // Authenticated merchant connection
    // Standard browser WebSocket cannot send custom headers directly, so support ?token= query param
    let authReq = request;
    const queryToken = url.searchParams.get("token");
    if (queryToken && !request.headers.get("Authorization")) {
      const headers = new Headers(request.headers);
      headers.set("Authorization", `Bearer ${queryToken}`);
      authReq = new Request(request.url, {
        method: request.method,
        headers,
      });
    }

    const orgCtx = await requireOrgContext(authReq, env, 'staff');
    if (!orgCtx?.organizationId) {
      throw new HttpError("Unauthorized: Invalid organization context", 401);
    }

    organizationId = orgCtx.organizationId;
    audience = "merchant";
    userId = orgCtx.userId;
  } else {
    throw new HttpError(`Unsupported real-time channel: ${channel}`, 400);
  }

  // Obtain Durable Object stub for this specific organization
  const doId = env.REALTIME_HUB.idFromName(organizationId);
  const stub = env.REALTIME_HUB.get(doId);

  // Forward upgrade request to Durable Object with verified parameters
  const forwardUrl = new URL("https://realtime-hub/ws");
  forwardUrl.searchParams.set("audience", audience);
  if (userId) forwardUrl.searchParams.set("userId", userId);

  const forwardHeaders = new Headers(request.headers);
  forwardHeaders.set("Upgrade", "websocket");

  return stub.fetch(forwardUrl.toString(), {
    method: "GET",
    headers: forwardHeaders,
  });
}

export async function handleRealtimeReconcile(request, env, ctx, {
  resolveStorefrontTenant,
  requireOrgContext,
}) {
  const url = new URL(request.url);
  const since = url.searchParams.get("since");
  const channel = url.searchParams.get("channel") || "storefront";

  if (!since) {
    throw new HttpError("`since` timestamp parameter is required", 400);
  }

  let organizationId = null;
  let audience = "public";

  if (channel === "storefront") {
    const shopSlugOrId = url.searchParams.get("shop") || null;
    const resolved = await resolveStorefrontTenant(request, env, shopSlugOrId);
    if (!resolved?.organizationId) {
      throw new HttpError("Storefront not found", 404);
    }
    organizationId = resolved.organizationId;
    audience = "public";
  } else if (channel === "dashboard") {
    const orgCtx = await requireOrgContext(request, env, 'staff');
    if (!orgCtx?.organizationId) {
      throw new HttpError("Unauthorized", 401);
    }
    organizationId = orgCtx.organizationId;
    audience = "merchant";
  } else {
    throw new HttpError(`Unsupported channel: ${channel}`, 400);
  }

  const events = await getMissedEvents(env.DB, organizationId, since, audience);

  return new Response(JSON.stringify({
    ok: true,
    channel,
    organization_id: organizationId,
    since,
    events,
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, private",
    },
  });
}
