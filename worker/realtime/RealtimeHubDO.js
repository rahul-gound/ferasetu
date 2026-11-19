/**
 * RealtimeHubDO — Cloudflare Durable Object for Real-Time Synchronization
 * 
 * Uses the Cloudflare WebSocket Hibernation API:
 * - Durable Objects sleep at 0 CPU cost when idle.
 * - Woken automatically on incoming messages or publication calls.
 * - Uses WebSocket tags for audience isolation (audience:merchant vs audience:public).
 * - Bulletproof tenant isolation: 1 Durable Object instance per organization_id.
 */

export class RealtimeHubDO {
  constructor(ctx, env) {
    this.ctx = ctx; // DurableObjectState
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);

    // 1. Internal publish endpoint: Worker forwards D1 mutation events here
    if (url.pathname === "/publish" && request.method === "POST") {
      try {
        const event = await request.json();
        const audience = event.audience || "merchant"; // 'public' | 'merchant' | 'all'

        let sockets = [];
        if (audience === "public" || audience === "all") {
          // Public-safe events (e.g. stock/price change) reach both public storefront visitors and merchant dashboard
          sockets = this.ctx.getWebSockets();
        } else {
          // Sensitive merchant events (orders, sales, inventory transfer) strictly reach authenticated merchant sessions
          sockets = this.ctx.getWebSockets("audience:merchant");
        }

        const payloadStr = JSON.stringify({
          event_id: event.event_id,
          event_type: event.event_type,
          resource_id: event.resource_id,
          organization_id: event.organization_id,
          audience: event.audience,
          timestamp: event.timestamp || new Date().toISOString(),
          payload: event.payload || {},
        });

        let delivered = 0;
        for (const ws of sockets) {
          try {
            ws.send(payloadStr);
            delivered++;
          } catch (err) {
            try { ws.close(1011, "Failed to deliver event"); } catch {}
          }
        }

        return new Response(JSON.stringify({ ok: true, delivered, total_sockets: sockets.length }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: err?.message || "Publish error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 2. WebSocket upgrade endpoint
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader && upgradeHeader.toLowerCase() === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      const audience = url.searchParams.get("audience") === "merchant" ? "merchant" : "public";
      const tags = [`audience:${audience}`];
      
      const userId = url.searchParams.get("userId");
      if (userId && audience === "merchant") {
        tags.push(`user:${userId}`);
      }

      // Cloudflare WebSocket Hibernation API: accepts socket with tags
      this.ctx.acceptWebSocket(server, tags);

      // Send initial connection handshake ACK
      try {
        server.send(JSON.stringify({
          event_type: "connection:ready",
          audience,
          timestamp: new Date().toISOString()
        }));
      } catch {}

      let res;
      try {
        res = new Response(null, {
          status: 101,
          webSocket: client
        });
      } catch {
        res = new Response(null, { status: 200 });
        Object.defineProperty(res, 'status', { value: 101 });
        Object.defineProperty(res, 'webSocket', { value: client });
      }

      return res;
    }

    // 3. Diagnostics and telemetry status
    if (url.pathname === "/stats" && request.method === "GET") {
      const publicSockets = this.ctx.getWebSockets("audience:public").length;
      const merchantSockets = this.ctx.getWebSockets("audience:merchant").length;
      return new Response(JSON.stringify({
        status: "active",
        hibernation: true,
        connections: {
          public: publicSockets,
          merchant: merchantSockets,
          total: publicSockets + merchantSockets
        }
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response("Not found", { status: 404 });
  }

  // Hibernation API lifecycle hooks
  async webSocketMessage(ws, message) {
    if (typeof message === "string" && message === "ping") {
      try { ws.send("pong"); } catch {}
    }
  }

  async webSocketClose(ws, code, reason, wasClean) {
    // Cloudflare cleans up hibernated sockets automatically.
  }

  async webSocketError(ws, error) {
    try { ws.close(1011, "WebSocket error"); } catch {}
  }
}
