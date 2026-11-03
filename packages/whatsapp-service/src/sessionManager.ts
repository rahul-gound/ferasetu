import { EventEmitter } from 'node:events';
import path from 'node:path';
import fs from 'node:fs';
import QRCode from 'qrcode';
import pino from 'pino';
import { OutboundQueue } from './outboundQueue.js';
import { WhatsAppAiProcessor, StoreContext, CatalogProduct } from './aiProcessor.js';
import { encryptSessionData, decryptSessionData } from './crypto.js';

export interface SessionInfo {
  orgId: string;
  status: 'disconnected' | 'preparing' | 'qr_ready' | 'connecting' | 'connected' | 'interrupted' | 'logged_out' | 'expired';
  qrCodeDataUrl: string | null;
  qrExpiresAt: number | null;
  phoneNumber: string | null;
  phoneNumberMasked: string | null;
  jid: string | null;
  isAiRepliesEnabled: boolean;
  isNotificationsEnabled: boolean;
  lastConnectedAt: string | null;
  lastActivityAt: string | null;
  stats: {
    messagesReceived: number;
    aiRepliesSent: number;
    pendingOrdersCount: number;
    attentionNeededCount: number;
  };
}

export interface WebhookNotificationPayload {
  orgId: string;
  eventType: 'qr_ready' | 'connected' | 'disconnected' | 'order_request' | 'handover_triggered' | 'message_received';
  data: Record<string, any>;
}

export class SessionManager extends EventEmitter {
  private sessions = new Map<string, SessionInfo>();
  private sockets = new Map<string, any>();
  private outboundQueues = new Map<string, OutboundQueue>();
  private storeContexts = new Map<string, StoreContext>();
  private processedMessageIds = new Set<string>();
  private storageDir: string;
  private masterSecret: string;
  private workerApiUrl: string;
  private internalSecret: string;
  private logger = pino({ level: 'info' });

  constructor(options?: {
    storageDir?: string;
    masterSecret?: string;
    workerApiUrl?: string;
    internalSecret?: string;
  }) {
    super();
    this.storageDir = options?.storageDir || path.resolve(process.cwd(), '.whatsapp_sessions');
    this.masterSecret = options?.masterSecret || process.env.WHATSAPP_SESSION_SECRET || 'ferasetu-default-sec-phrase-256bit-min';
    this.workerApiUrl = options?.workerApiUrl || process.env.WORKER_API_URL || 'http://localhost:8787';
    this.internalSecret = options?.internalSecret || process.env.WHATSAPP_INTERNAL_SECRET || 'ferasetu-wa-internal-token';

    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  /**
   * Masks a phone number (e.g. "+91 98765 •••••").
   */
  public maskPhoneNumber(rawNumber: string): string {
    const cleaned = rawNumber.replace(/[^\d+]/g, '');
    if (cleaned.length <= 6) return cleaned;
    const prefix = cleaned.slice(0, cleaned.length - 5);
    return `${prefix} •••••`;
  }

  /**
   * Gets session info for an organization.
   */
  public getSessionInfo(orgId: string): SessionInfo {
    let session = this.sessions.get(orgId);
    if (!session) {
      session = {
        orgId,
        status: 'disconnected',
        qrCodeDataUrl: null,
        qrExpiresAt: null,
        phoneNumber: null,
        phoneNumberMasked: null,
        jid: null,
        isAiRepliesEnabled: true,
        isNotificationsEnabled: true,
        lastConnectedAt: null,
        lastActivityAt: null,
        stats: {
          messagesReceived: 0,
          aiRepliesSent: 0,
          pendingOrdersCount: 0,
          attentionNeededCount: 0,
        },
      };
      this.sessions.set(orgId, session);
    }
    return session;
  }

  /**
   * Updates store catalog context for an organization.
   */
  public setStoreContext(orgId: string, context: StoreContext): void {
    this.storeContexts.set(orgId, context);
  }

  /**
   * Initializes / starts connection procedure for an organization.
   */
  public async startConnection(orgId: string, options?: { mock?: boolean }): Promise<SessionInfo> {
    const session = this.getSessionInfo(orgId);
    session.status = 'preparing';
    this.emit('status_change', session);

    // If already connected, return existing session
    if (session.status === 'connected' && this.sockets.has(orgId)) {
      return session;
    }

    // Set up outbound queue if not present
    if (!this.outboundQueues.has(orgId)) {
      const q = new OutboundQueue();
      q.on('dispatch', async (job) => {
        const sock = this.sockets.get(orgId);
        if (sock) {
          try {
            if (typeof sock.sendMessage === 'function') {
              await sock.sendMessage(job.remoteJid, { text: job.text });
            }
            session.stats.aiRepliesSent += 1;
            session.lastActivityAt = new Date().toISOString();
            this.emit('reply_sent', { orgId, remoteJid: job.remoteJid, text: job.text });
          } catch (sendErr) {
            this.logger.error({ err: sendErr, orgId }, 'Failed to dispatch outbound WhatsApp message');
          }
        }
      });
      this.outboundQueues.set(orgId, q);
    }

    // In non-interactive test/mock mode or if mocked:
    if (options?.mock || process.env.NODE_ENV === 'test' || process.env.WHATSAPP_MOCK_MODE === 'true') {
      return this.startMockConnection(orgId);
    }

    try {
      // Dynamic import of Baileys
      const baileys = await import('@whiskeysockets/baileys');
      const makeWASocket = baileys.default || baileys.makeWASocket;
      const { DisconnectReason, useMultiFileAuthState } = baileys;

      const orgSessionPath = path.join(this.storageDir, `org_${orgId}`);
      const { state, saveCreds } = await useMultiFileAuthState(orgSessionPath);

      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: this.logger.child({ orgId }) as any,
        browser: ['FeraSetu WhatsApp Assistant', 'Chrome', '1.0.0'],
      });

      this.sockets.set(orgId, sock);

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            session.status = 'qr_ready';
            session.qrCodeDataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
            session.qrExpiresAt = Date.now() + 45000; // 45 seconds TTL
            this.emit('qr_ready', { orgId, qrDataUrl: session.qrCodeDataUrl, expiresAt: session.qrExpiresAt });
            this.notifyWorker({
              orgId,
              eventType: 'qr_ready',
              data: { qrCodeDataUrl: session.qrCodeDataUrl, expiresAt: session.qrExpiresAt }
            });
          } catch (qrErr) {
            this.logger.error({ err: qrErr }, 'Failed to render QR Code');
          }
        }

        if (connection === 'connecting') {
          session.status = 'connecting';
          this.emit('status_change', session);
        }

        if (connection === 'open') {
          session.status = 'connected';
          session.qrCodeDataUrl = null;
          session.qrExpiresAt = null;
          session.lastConnectedAt = new Date().toISOString();

          const rawUser = sock.user?.id || '';
          const cleanedPhone = rawUser.split(':')[0] || rawUser.split('@')[0];
          session.phoneNumber = `+${cleanedPhone.replace(/[^\d]/g, '')}`;
          session.phoneNumberMasked = this.maskPhoneNumber(session.phoneNumber);
          session.jid = sock.user?.id || null;

          this.emit('connected', session);
          this.notifyWorker({
            orgId,
            eventType: 'connected',
            data: {
              phoneNumber: session.phoneNumber,
              phoneNumberMasked: session.phoneNumberMasked,
              jid: session.jid,
              lastConnectedAt: session.lastConnectedAt
            }
          });
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          if (shouldReconnect) {
            session.status = 'interrupted';
            this.emit('status_change', session);
            setTimeout(() => this.startConnection(orgId), 3000);
          } else {
            session.status = 'logged_out';
            this.sockets.delete(orgId);
            this.emit('status_change', session);
            this.notifyWorker({
              orgId,
              eventType: 'disconnected',
              data: { reason: 'logged_out' }
            });
            // Clean up credentials
            try {
              fs.rmSync(orgSessionPath, { recursive: true, force: true });
            } catch {}
          }
        }
      });

      // Handle incoming messages
      sock.ev.on('messages.upsert', async (upsert: any) => {
        if (upsert.type !== 'notify') return;
        for (const msg of upsert.messages || []) {
          await this.handleIncomingMessage(orgId, msg);
        }
      });

      return session;
    } catch (err) {
      this.logger.error({ err, orgId }, 'Failed to initialize Baileys socket. Falling back to simulator mode.');
      return this.startMockConnection(orgId);
    }
  }

  /**
   * Handles incoming customer message through the AI processor pipeline.
   */
  public async handleIncomingMessage(orgId: string, msg: any): Promise<void> {
    const key = msg.key;
    if (!key || key.fromMe) return; // Ignore own messages
    const remoteJid = key.remoteJid || '';
    if (!remoteJid || remoteJid.endsWith('@g.us') || remoteJid.includes('broadcast')) {
      return; // Ignore groups and broadcast updates
    }

    const messageId = key.id;
    if (messageId && this.processedMessageIds.has(messageId)) {
      return; // Duplicate / idempotency guard
    }
    if (messageId) {
      this.processedMessageIds.add(messageId);
      // Prune after 1000 messages
      if (this.processedMessageIds.size > 2000) {
        const arr = Array.from(this.processedMessageIds);
        this.processedMessageIds = new Set(arr.slice(1000));
      }
    }

    const messageText = msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      '';

    if (!messageText.trim()) return;

    const session = this.getSessionInfo(orgId);
    session.stats.messagesReceived += 1;
    session.lastActivityAt = new Date().toISOString();

    const customerPhone = `+${remoteJid.replace(/[^\d]/g, '')}`;
    const customerName = msg.pushName || customerPhone;

    // Load store context (default fallback if not explicitly set)
    const context: StoreContext = this.storeContexts.get(orgId) || {
      storeName: 'Our Store',
      currency: 'INR',
      currencySymbol: '₹',
      catalog: [],
      isAiRepliesEnabled: session.isAiRepliesEnabled,
      isAiPausedForChat: false,
    };

    // Process through WhatsApp AI Grounding Engine
    const aiResult = await WhatsAppAiProcessor.processMessage(messageText, context);

    if (aiResult.isOrderRequest && aiResult.orderItems) {
      session.stats.pendingOrdersCount += 1;
      this.notifyWorker({
        orgId,
        eventType: 'order_request',
        data: {
          customerPhone,
          customerName,
          orderItems: aiResult.orderItems,
          estimatedTotal: aiResult.estimatedTotal,
          originalMessage: messageText,
        }
      });
    }

    if (aiResult.requiresAttention) {
      session.stats.attentionNeededCount += 1;
      this.notifyWorker({
        orgId,
        eventType: 'handover_triggered',
        data: {
          customerPhone,
          customerName,
          reason: aiResult.attentionReason,
          originalMessage: messageText,
        }
      });
    }

    // Enqueue response to outbound queue
    if (aiResult.replyText && session.isAiRepliesEnabled) {
      const queue = this.outboundQueues.get(orgId);
      if (queue) {
        queue.enqueue(orgId, remoteJid, aiResult.replyText);
      }
    }

    this.emit('message_processed', {
      orgId,
      customerPhone,
      customerName,
      messageText,
      replyText: aiResult.replyText,
      intent: aiResult.intent,
      requiresAttention: aiResult.requiresAttention,
    });
  }

  /**
   * Sets AI Replies toggle (Pause / Resume).
   */
  public setAiRepliesEnabled(orgId: string, enabled: boolean): SessionInfo {
    const session = this.getSessionInfo(orgId);
    session.isAiRepliesEnabled = enabled;
    const ctx = this.storeContexts.get(orgId);
    if (ctx) ctx.isAiRepliesEnabled = enabled;
    this.emit('status_change', session);
    return session;
  }

  /**
   * Sets Order Notifications toggle.
   */
  public setNotificationsEnabled(orgId: string, enabled: boolean): SessionInfo {
    const session = this.getSessionInfo(orgId);
    session.isNotificationsEnabled = enabled;
    this.emit('status_change', session);
    return session;
  }

  /**
   * Emergency Disconnect.
   */
  public async disconnect(orgId: string): Promise<SessionInfo> {
    const session = this.getSessionInfo(orgId);
    const sock = this.sockets.get(orgId);

    if (sock) {
      try {
        if (typeof sock.logout === 'function') {
          await sock.logout();
        } else if (typeof sock.end === 'function') {
          sock.end();
        }
      } catch (err) {
        this.logger.warn({ err, orgId }, 'Error during socket logout');
      }
      this.sockets.delete(orgId);
    }

    // Clean up session files
    const orgSessionPath = path.join(this.storageDir, `org_${orgId}`);
    try {
      if (fs.existsSync(orgSessionPath)) {
        fs.rmSync(orgSessionPath, { recursive: true, force: true });
      }
    } catch {}

    session.status = 'disconnected';
    session.qrCodeDataUrl = null;
    session.qrExpiresAt = null;
    session.phoneNumber = null;
    session.phoneNumberMasked = null;
    session.jid = null;

    this.emit('disconnected', session);
    this.notifyWorker({
      orgId,
      eventType: 'disconnected',
      data: { manual: true }
    });

    return session;
  }

  /**
   * Mock / Simulator Connection for automated tests & local development.
   */
  private async startMockConnection(orgId: string): Promise<SessionInfo> {
    const session = this.getSessionInfo(orgId);
    session.status = 'qr_ready';
    const mockQrPayload = `2@mock-wa-qr-${orgId}-${Date.now()},${Math.random().toString(36).slice(2)},mock`;
    session.qrCodeDataUrl = await QRCode.toDataURL(mockQrPayload, { width: 300, margin: 2 });
    session.qrExpiresAt = Date.now() + 45000;

    // Create a mock socket
    const mockSocket = {
      user: { id: `919876543210:0@s.whatsapp.net` },
      sendMessage: async (jid: string, content: any) => {
        this.logger.info({ jid, content }, 'Mock WhatsApp message sent');
        return { key: { id: `mock_out_${Date.now()}` } };
      },
      logout: async () => {
        this.logger.info({ orgId }, 'Mock socket logged out');
      },
      end: () => {}
    };
    this.sockets.set(orgId, mockSocket);

    this.emit('qr_ready', { orgId, qrDataUrl: session.qrCodeDataUrl, expiresAt: session.qrExpiresAt });
    return session;
  }

  /**
   * Simulates scan/pair for test suites.
   */
  public simulateSuccessfulPairing(orgId: string, phone = '+91 98765 43210'): SessionInfo {
    const session = this.getSessionInfo(orgId);
    session.status = 'connected';
    session.qrCodeDataUrl = null;
    session.qrExpiresAt = null;
    session.phoneNumber = phone;
    session.phoneNumberMasked = this.maskPhoneNumber(phone);
    session.jid = `${phone.replace(/[^\d]/g, '')}@s.whatsapp.net`;
    session.lastConnectedAt = new Date().toISOString();

    this.emit('connected', session);
    this.notifyWorker({
      orgId,
      eventType: 'connected',
      data: {
        phoneNumber: session.phoneNumber,
        phoneNumberMasked: session.phoneNumberMasked,
        jid: session.jid,
        lastConnectedAt: session.lastConnectedAt,
      }
    });

    return session;
  }

  /**
   * Dispatches authenticated notification to Cloudflare Worker.
   */
  private async notifyWorker(payload: WebhookNotificationPayload): Promise<void> {
    if (!this.workerApiUrl) return;
    try {
      const endpoint = `${this.workerApiUrl.replace(/\/+$/, '')}/api/whatsapp/webhook`;
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Fera-Internal-Secret': this.internalSecret,
        },
        body: JSON.stringify(payload),
      });
    } catch (notifyErr) {
      // Worker might not be running in isolated unit tests; fail gracefully
      this.logger.debug({ err: notifyErr }, 'Worker webhook notification skipped');
    }
  }
}
