import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import { SessionManager } from './sessionManager.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3005;
const internalSecret = process.env.WHATSAPP_INTERNAL_SECRET || 'ferasetu-wa-internal-token';

app.use(express.json());

export const sessionManager = new SessionManager({
  storageDir: process.env.WHATSAPP_STORAGE_DIR,
  masterSecret: process.env.WHATSAPP_SESSION_SECRET,
  workerApiUrl: process.env.WORKER_API_URL,
  internalSecret,
});

/**
 * Authentication middleware for internal service-to-service communication.
 */
function requireInternalAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers['x-fera-internal-secret'] || req.headers['authorization']?.replace('Bearer ', '');
  if (!token || token !== internalSecret) {
    return res.status(401).json({ error: 'Unauthorized internal service request' });
  }
  next();
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'fera-whatsapp-service',
    timestamp: new Date().toISOString()
  });
});

// Start connection & generate QR
app.post('/sessions/:orgId/connect', requireInternalAuth, async (req, res) => {
  try {
    const { orgId } = req.params;
    const session = await sessionManager.startConnection(orgId, { mock: req.body?.mock });
    res.json(session);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to start connection' });
  }
});

// Get session status
app.get('/sessions/:orgId/status', requireInternalAuth, (req, res) => {
  const { orgId } = req.params;
  const session = sessionManager.getSessionInfo(orgId);
  res.json(session);
});

// Update store catalog context
app.post('/sessions/:orgId/context', requireInternalAuth, (req, res) => {
  const { orgId } = req.params;
  const { storeName, currency, currencySymbol, catalog } = req.body;
  const session = sessionManager.getSessionInfo(orgId);
  sessionManager.setStoreContext(orgId, {
    storeName: storeName || 'Our Shop',
    currency: currency || 'INR',
    currencySymbol: currencySymbol || '₹',
    catalog: Array.isArray(catalog) ? catalog : [],
    isAiRepliesEnabled: session.isAiRepliesEnabled,
    isAiPausedForChat: false,
  });
  res.json({ success: true, message: 'Catalog context synced' });
});

// Update settings (AI replies toggle, notification toggle)
app.patch('/sessions/:orgId/settings', requireInternalAuth, (req, res) => {
  const { orgId } = req.params;
  const { isAiRepliesEnabled, isNotificationsEnabled } = req.body;
  let session = sessionManager.getSessionInfo(orgId);
  if (typeof isAiRepliesEnabled === 'boolean') {
    session = sessionManager.setAiRepliesEnabled(orgId, isAiRepliesEnabled);
  }
  if (typeof isNotificationsEnabled === 'boolean') {
    session = sessionManager.setNotificationsEnabled(orgId, isNotificationsEnabled);
  }
  res.json(session);
});

// Emergency Disconnect
app.post('/sessions/:orgId/disconnect', requireInternalAuth, async (req, res) => {
  try {
    const { orgId } = req.params;
    const session = await sessionManager.disconnect(orgId);
    res.json(session);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to disconnect session' });
  }
});

// Test helper: simulate successful pairing
app.post('/sessions/:orgId/simulate-pair', requireInternalAuth, (req, res) => {
  const { orgId } = req.params;
  const phone = req.body?.phoneNumber || '+91 98765 43210';
  const session = sessionManager.simulateSuccessfulPairing(orgId, phone);
  res.json(session);
});

// Test helper: simulate incoming customer message
app.post('/sessions/:orgId/simulate-message', requireInternalAuth, async (req, res) => {
  const { orgId } = req.params;
  const { text, customerPhone, customerName } = req.body;
  const phone = customerPhone || '+919123456789';
  const jid = `${phone.replace(/[^\d]/g, '')}@s.whatsapp.net`;

  await sessionManager.handleIncomingMessage(orgId, {
    key: { id: `sim_${Date.now()}`, remoteJid: jid, fromMe: false },
    message: { conversation: text },
    pushName: customerName || 'Customer',
  });

  res.json({ success: true, message: 'Message dispatched to AI processor' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`[FeraSetu WhatsApp Service] Persistent connector running on port ${port}`);
  });
}

export default app;
