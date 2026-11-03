import { EventEmitter } from 'node:events';
import path from 'node:path';
import fs from 'node:fs';
import { OutboundQueue } from './outboundQueue.js';
import { WhatsAppAiProcessor } from './aiProcessor.js';
import { encryptSessionData, decryptSessionData } from './crypto.js';

export class SessionManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.sessions = new Map();
    this.sockets = new Map();
    this.outboundQueues = new Map();
    this.storeContexts = new Map();
    this.processedMessageIds = new Set();
    this.storageDir = options.storageDir || path.resolve(process.cwd(), '.whatsapp_sessions');
    this.masterSecret = options.masterSecret || process.env.WHATSAPP_SESSION_SECRET || 'ferasetu-default-sec-phrase-256bit-min';
    this.workerApiUrl = options.workerApiUrl || process.env.WORKER_API_URL || 'http://localhost:8787';
    this.internalSecret = options.internalSecret || process.env.WHATSAPP_INTERNAL_SECRET || 'ferasetu-wa-internal-token';

    try {
      if (!fs.existsSync(this.storageDir)) {
        fs.mkdirSync(this.storageDir, { recursive: true });
      }
    } catch {}
  }

  /**
   * Masks a phone number (e.g. "+91 98765 •••••").
   *
   * @param {string} rawNumber
   * @returns {string}
   */
  maskPhoneNumber(rawNumber) {
    if (!rawNumber) return null;
    const cleaned = String(rawNumber).replace(/[^\d+]/g, '');
    if (cleaned.length <= 6) return cleaned;
    if (cleaned.startsWith('+91') && cleaned.length >= 12) {
      return `+91 ${cleaned.slice(3, 8)} •••••`;
    }
    const prefix = cleaned.slice(0, Math.max(3, cleaned.length - 5));
    return `${prefix} •••••`;
  }

  /**
   * Gets session info for an organization.
   *
   * @param {string} orgId
   * @returns {object}
   */
  getSessionInfo(orgId) {
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
   *
   * @param {string} orgId
   * @param {object} context
   */
  setStoreContext(orgId, context) {
    this.storeContexts.set(orgId, context);
  }

  /**
   * Generates QR Code data URL using qrcode package or fallback SVG.
   *
   * @param {string} payload
   * @returns {Promise<string>}
   */
  async generateQrDataUrl(payload) {
    try {
      const qrcodeModule = await import('qrcode');
      const QRCode = qrcodeModule.default || qrcodeModule;
      return await QRCode.toDataURL(payload, { width: 300, margin: 2 });
    } catch (e) {
      // Fallback base64 PNG/SVG data URI
      const encodedText = encodeURIComponent(payload);
      return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="%23f8fafc"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="16" fill="%230f172a">WhatsApp QR Code</text><text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%2364748b">Scan with Linked Devices</text></svg>`;
    }
  }

  /**
   * Starts connection procedure for an organization.
   *
   * @param {string} orgId
   * @param {{ mock?: boolean }} [options]
   * @returns {Promise<object>}
   */
  async startConnection(orgId, options = {}) {
    const session = this.getSessionInfo(orgId);
    session.status = 'preparing';
    this.emit('status_change', session);

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
            console.error('[SessionManager] Failed to dispatch outbound WhatsApp message:', sendErr);
          }
        }
      });
      this.outboundQueues.set(orgId, q);
    }

    // In test/mock mode or if mocked:
    if (options.mock || process.env.NODE_ENV === 'test' || process.env.WHATSAPP_MOCK_MODE === 'true') {
      return this.startMockConnection(orgId);
    }

    try {
      const baileys = await import('@whiskeysockets/baileys');
      const makeWASocket = baileys.default || baileys.makeWASocket;
      const { DisconnectReason, useMultiFileAuthState } = baileys;

      const orgSessionPath = path.join(this.storageDir, `org_${orgId}`);
      const { state, saveCreds } = await useMultiFileAuthState(orgSessionPath);

      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ['FeraSetu WhatsApp Assistant', 'Chrome', '1.0.0'],
      });

      this.sockets.set(orgId, sock);

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            session.status = 'qr_ready';
            session.qrCodeDataUrl = await this.generateQrDataUrl(qr);
            session.qrExpiresAt = Date.now() + 45000;
            this.emit('qr_ready', { orgId, qrDataUrl: session.qrCodeDataUrl, expiresAt: session.qrExpiresAt });
            this.notifyWorker({
              orgId,
              eventType: 'qr_ready',
              data: { qrCodeDataUrl: session.qrCodeDataUrl, expiresAt: session.qrExpiresAt }
            });
          } catch (qrErr) {
            console.error('[SessionManager] Failed to render QR Code:', qrErr);
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
          const statusCode = lastDisconnect?.error?.output?.statusCode;
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
            try {
              fs.rmSync(orgSessionPath, { recursive: true, force: true });
            } catch {}
          }
        }
      });

      sock.ev.on('messages.upsert', async (upsert) => {
        if (upsert.type !== 'notify') return;
        for (const msg of upsert.messages || []) {
          await this.handleIncomingMessage(orgId, msg);
        }
      });

      return session;
    } catch (err) {
      console.warn('[SessionManager] Initializing simulator mode for org:', orgId);
      return this.startMockConnection(orgId);
    }
  }

  /**
   * Handles incoming customer message through AI processor pipeline.
   *
   * @param {string} orgId
   * @param {object} msg
   */
  async handleIncomingMessage(orgId, msg) {
    const key = msg?.key;
    if (!key || key.fromMe) return;
    const remoteJid = key.remoteJid || '';
    if (!remoteJid || remoteJid.endsWith('@g.us') || remoteJid.includes('broadcast')) {
      return;
    }

    const messageId = key.id;
    if (messageId && this.processedMessageIds.has(messageId)) {
      return;
    }
    if (messageId) {
      this.processedMessageIds.add(messageId);
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

    const context = this.storeContexts.get(orgId) || {
      storeName: 'Our Store',
      currency: 'INR',
      currencySymbol: '₹',
      catalog: [],
      isAiRepliesEnabled: session.isAiRepliesEnabled,
      isAiPausedForChat: false,
    };

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

  setAiRepliesEnabled(orgId, enabled) {
    const session = this.getSessionInfo(orgId);
    session.isAiRepliesEnabled = enabled;
    const ctx = this.storeContexts.get(orgId);
    if (ctx) ctx.isAiRepliesEnabled = enabled;
    this.emit('status_change', session);
    return session;
  }

  setNotificationsEnabled(orgId, enabled) {
    const session = this.getSessionInfo(orgId);
    session.isNotificationsEnabled = enabled;
    this.emit('status_change', session);
    return session;
  }

  async disconnect(orgId) {
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
        console.warn('[SessionManager] Error during socket logout:', err);
      }
      this.sockets.delete(orgId);
    }

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

  async startMockConnection(orgId) {
    const session = this.getSessionInfo(orgId);
    session.status = 'qr_ready';
    const mockQrPayload = `2@mock-wa-qr-${orgId}-${Date.now()},${Math.random().toString(36).slice(2)},mock`;
    session.qrCodeDataUrl = await this.generateQrDataUrl(mockQrPayload);
    session.qrExpiresAt = Date.now() + 45000;

    const mockSocket = {
      user: { id: `919876543210:0@s.whatsapp.net` },
      sendMessage: async (jid, content) => {
        return { key: { id: `mock_out_${Date.now()}` } };
      },
      logout: async () => {},
      end: () => {}
    };
    this.sockets.set(orgId, mockSocket);

    this.emit('qr_ready', { orgId, qrDataUrl: session.qrCodeDataUrl, expiresAt: session.qrExpiresAt });
    return session;
  }

  simulateSuccessfulPairing(orgId, phone = '+91 98765 43210') {
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

  async notifyWorker(payload) {
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
    } catch {}
  }
}
