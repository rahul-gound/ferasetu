import dotenv from 'dotenv';
import path from 'path';
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
import { errorHandler } from './middleware/errorHandler';
import { createRateLimiter } from './middleware/rateLimiter';
import fs from 'fs';

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

// Security middleware — relaxed CSP in production to allow the React app
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: IS_PRODUCTION ? false : undefined,
}));

// CORS — in production the frontend is served from the same origin, so this mostly covers API-only access
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      IS_PRODUCTION ||
      origin === frontendUrl ||
      origin.endsWith('.replit.app') ||
      origin.endsWith('.repl.co') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      return callback(null, true);
    }
    console.warn(`⚠️ CORS blocked: ${origin}`);
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
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

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

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

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

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
