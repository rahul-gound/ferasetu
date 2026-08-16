import dotenv from 'dotenv';
import path from 'path';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: false });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { initializeDatabase } from './models/database';
import { verifyMailService } from './services/mailService';
import authRoutes from './routes/auth';
import aiRoutes from './routes/ai';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import analyticsRoutes from './routes/analytics';
import websiteRoutes from './routes/website';
import voiceRoutes from './routes/voice';
import paymentRoutes from './routes/payment';
import adminRoutes from './routes/admin';
import ticketRoutes from './routes/tickets';
import surveyRoutes from './routes/survey';
import sitemapRoutes from './routes/sitemap';
import settingsRoutes from './routes/settings';
import usersRoutes from './routes/users';
import { errorHandler } from './middleware/errorHandler';
import { createRateLimiter } from './middleware/rateLimiter';
import fs from 'fs';

// Extend Express Request for CSRF token
declare global {
  namespace Express {
    interface Request {
      csrfToken?: string;
    }
  }
}

process.on('uncaughtException', (err) => {
  console.error('🔥 FATAL UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const app = express();
const PORT = process.env.PORT || (IS_PRODUCTION ? 5000 : 3001);
const HOST = process.env.HOST || (IS_PRODUCTION ? '0.0.0.0' : '127.0.0.1');

console.log(`📊 Loaded FRONTEND_URL: ${process.env.FRONTEND_URL}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

app.set('trust proxy', 1);

// Security middleware — strict CSP in production
const cspDirectives: Record<string, string[]> = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", "data:", "https:"],
  connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:5173'],
  fontSrc: ["'self'"],
  objectSrc: ["'none'"],
  frameAncestors: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
};

if (IS_PRODUCTION) {
  cspDirectives.upgradeInsecureRequests = [];
}

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-origin' },
  contentSecurityPolicy: IS_PRODUCTION ? { directives: cspDirectives } : false,
  hsts: IS_PRODUCTION ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// Permissions Policy (Feature Policy) - separate middleware for helmet 7+
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  next();
});

// CORS — strict allowlist
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const ALLOWED_ORIGINS = [
  frontendUrl,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.fera-search.tech')) {
      return callback(null, true);
    }
    console.warn(`⚠️ CORS blocked: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-CSRF-Token'],
}));

// Logging — quieter in production
app.use(morgan(IS_PRODUCTION ? 'combined' : 'dev'));

if (!IS_PRODUCTION) {
  app.use((req, _res, next) => {
    console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Cookie parser for CSRF
app.use(cookieParser());

// CSRF protection - double-submit cookie pattern
const csrfTokens = new Map<string, { token: string; expires: number }>();
const CSRF_TOKEN_TTL = 24 * 60 * 60 * 1000; // 24 hours

app.use((req, res, next) => {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  // Skip CSRF for webhook endpoints
  if (req.path.startsWith('/api/payment/webhook') || req.path.startsWith('/api/auth/webhook')) {
    return next();
  }
  
  const token = req.headers['x-csrf-token'] as string || (req.body as any)?._csrf;
  const cookieToken = req.cookies?.csrf_token;
  
  if (!token || !cookieToken || token !== cookieToken) {
    return res.status(403).json({ error: 'Invalid CSRF token', code: 'CSRF_INVALID' });
  }
  
  // Verify token not expired
  const stored = csrfTokens.get(cookieToken);
  if (!stored || stored.expires < Date.now()) {
    return res.status(403).json({ error: 'CSRF token expired', code: 'CSRF_EXPIRED' });
  }
  
  next();
});

// Issue CSRF token on login/auth endpoints
app.use('/api/auth/login', (req, res, next) => {
  const token = crypto.randomBytes(32).toString('hex');
  csrfTokens.set(token, { token, expires: Date.now() + CSRF_TOKEN_TTL });
  res.cookie('csrf_token', token, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'lax',
    maxAge: CSRF_TOKEN_TTL,
  });
  req.csrfToken = token;
  next();
});

// Periodic cleanup of expired CSRF tokens
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of csrfTokens.entries()) {
    if (value.expires < now) csrfTokens.delete(key);
  }
}, 60 * 60 * 1000); // Every hour

// Static uploads with path traversal protection
const uploadDir = path.join(__dirname, '..', 'uploads');
app.use('/uploads', (req, res, next) => {
  const requestedPath = path.join(uploadDir, req.path);
  const resolved = path.resolve(requestedPath);
  if (!resolved.startsWith(path.resolve(uploadDir))) {
    return res.status(403).send('Forbidden');
  }
  next();
}, express.static(uploadDir, { fallthrough: false }));

// API rate limiting
app.use('/api/', createRateLimiter(100, 15));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/website', websiteRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/survey', surveyRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', usersRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// Sitemap — served before SPA catch-all
app.get('/sitemap.xml', sitemapRoutes);

// Serve frontend in production
if (IS_PRODUCTION) {
  const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
  if (fs.existsSync(frontendDist)) {
    console.log(`📦 Serving frontend from: ${frontendDist}`);
    app.use(express.static(frontendDist));
    // SPA fallback — all non-API routes serve index.html
    app.get('*', (_req, res) => {
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  } else {
    console.warn('⚠️ Frontend dist not found. Run `npm run build` in frontend/');
    app.get('/', (_req, res) => {
      res.json({ message: 'FeraSetu API is running', env: process.env.NODE_ENV });
    });
  }
} else {
  app.get('/', (_req, res) => {
    res.json({ message: 'FeraSetu API is running', env: process.env.NODE_ENV });
  });
}

// Error handler
app.use(errorHandler);

// Start
initializeDatabase().then(async () => {
  await verifyMailService();
  app.listen(Number(PORT), HOST, () => {
    console.log(`🚀 FeraSetu running on http://${HOST}:${PORT}`);
    if (IS_PRODUCTION) {
      console.log(`🌐 Serving frontend + API on port ${PORT}`);
    }
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

export default app;
