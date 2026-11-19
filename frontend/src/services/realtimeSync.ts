/**
 * realtimeSync.ts — Client Realtime Synchronization Service
 * 
 * Manages WebSocket Hibernation subscriptions for:
 * 1. Public Storefront visitors (channel='storefront', audience='public')
 * 2. Authenticated Merchants (channel='dashboard', audience='merchant')
 * 
 * Features:
 * - Single persistent connection per view; disconnects on unmount
 * - Exponential backoff reconnection (1s -> 2s -> 4s -> max 30s)
 * - Automatic missed-event reconciliation on reconnect via /api/realtime/reconcile
 * - Event deduplication using sliding window of event_ids
 * - Zero UI blocking; integrates cleanly with @tanstack/react-query
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export interface RealtimeEvent {
  event_id: string;
  event_type: string;
  resource_id?: string;
  organization_id: string;
  audience: 'public' | 'merchant';
  timestamp: string;
  payload?: Record<string, any>;
}

export interface UseRealtimeSyncOptions {
  channel: 'storefront' | 'dashboard';
  shopName?: string | null;
  authToken?: string | null;
  enabled?: boolean;
  onEvent?: (event: RealtimeEvent) => void;
}

const MAX_SEEN_EVENTS = 200;

export function useRealtimeSync({
  channel,
  shopName,
  authToken,
  enabled = true,
  onEvent,
}: UseRealtimeSyncOptions) {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const reconnectAttemptsRef = useRef(0);
  const lastTimestampRef = useRef<string>(new Date().toISOString());
  const seenEventIdsRef = useRef<Set<string>>(new Set());

  // Keep latest callbacks in ref to avoid reconnecting on callback changes
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    if (channel === 'storefront' && !shopName) return;

    let isMounted = true;

    const buildWsUrl = () => {
      const isSecure = window.location.protocol === 'https:';
      const wsProto = isSecure ? 'wss:' : 'ws:';
      
      const apiEnv = import.meta.env.VITE_API_URL || '';
      let host = window.location.host;
      if (apiEnv && apiEnv.startsWith('http')) {
        try {
          host = new URL(apiEnv).host;
        } catch {}
      }

      const url = new URL(`${wsProto}//${host}/api/realtime/ws`);
      url.searchParams.set('channel', channel);

      if (channel === 'storefront' && shopName) {
        url.searchParams.set('shop', shopName);
      } else if (channel === 'dashboard') {
        const token = authToken || localStorage.getItem('token') || sessionStorage.getItem('token');
        if (token) {
          url.searchParams.set('token', token);
        }
      }

      return url.toString();
    };

    const reconcileMissedEvents = async () => {
      const since = lastTimestampRef.current;
      if (!since) return;

      try {
        const apiBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
        const reconcileUrl = new URL(`${apiBase}/realtime/reconcile`, window.location.origin);
        reconcileUrl.searchParams.set('channel', channel);
        reconcileUrl.searchParams.set('since', since);
        if (channel === 'storefront' && shopName) {
          reconcileUrl.searchParams.set('shop', shopName);
        }

        const headers: Record<string, string> = {};
        const token = authToken || localStorage.getItem('token');
        if (channel === 'dashboard' && token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(reconcileUrl.toString(), { headers });
        if (res.ok) {
          const body = await res.json();
          if (Array.isArray(body.events)) {
            for (const evt of body.events) {
              handleIncomingEvent(evt);
            }
          }
        }
      } catch (err) {
        console.warn('[RealtimeSync] Reconcile attempt notice:', err);
      }
    };

    const handleIncomingEvent = (event: RealtimeEvent) => {
      if (!event || !event.event_id) return;
      if (seenEventIdsRef.current.has(event.event_id)) return;

      // Deduplicate
      seenEventIdsRef.current.add(event.event_id);
      if (seenEventIdsRef.current.size > MAX_SEEN_EVENTS) {
        const first = seenEventIdsRef.current.values().next().value;
        if (first) seenEventIdsRef.current.delete(first);
      }

      if (event.timestamp) {
        lastTimestampRef.current = event.timestamp;
      }

      // 1. Invalidate React Query cache based on event type
      if (event.event_type.startsWith('product:')) {
        queryClient.invalidateQueries({ queryKey: ['products'] });
      } else if (event.event_type.startsWith('order:')) {
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['orders-intelligence'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-analytics'] });
      } else if (event.event_type.startsWith('inventory:')) {
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['inventory-locations'] });
      }

      // 2. Custom listener callback
      if (onEventRef.current) {
        onEventRef.current(event);
      }
    };

    const connect = () => {
      if (!isMounted) return;

      try {
        const url = buildWsUrl();
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) {
            ws.close();
            return;
          }
          reconnectAttemptsRef.current = 0;
          // After reconnecting, reconcile any missed events during disconnection
          reconcileMissedEvents();
        };

        ws.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.event_type === 'connection:ready') {
              return;
            }
            handleIncomingEvent(data);
          } catch {}
        };

        ws.onclose = () => {
          wsRef.current = null;
          if (!isMounted) return;

          // Exponential backoff reconnect: 1s, 2s, 4s, 8s, up to 30s
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        };

        ws.onerror = () => {
          try { ws.close(); } catch {}
        };
      } catch (err) {
        console.warn('[RealtimeSync] Connection initialization notice:', err);
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        try {
          wsRef.current.close(1000, 'Client unmounted');
        } catch {}
        wsRef.current = null;
      }
    };
  }, [channel, shopName, authToken, enabled, queryClient]);
}
