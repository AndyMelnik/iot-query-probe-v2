import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import { authRouter } from './routes/auth.js';
import { queryRouter } from './routes/query.js';
import { exportRouter } from './routes/export.js';
import { reportRouter } from './routes/report.js';
import { authMiddleware } from './middleware/auth.js';
import { csrfMiddleware, csrfTokenRoute } from './middleware/csrf.js';
import { sessionMiddleware } from './middleware/session.js';
import { securityHeaders } from './middleware/security.js';
import { requestLogger, auditLog } from './lib/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (for render.com / load balancers)
app.set('trust proxy', 1);

// Security headers (CSP, frame-ancestors for Navixy)
securityHeaders(app);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// CORS: allow Navixy and same origin
const allowedOrigins = (process.env.CORS_ORIGINS || 'https://*.navixy.com').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const ok = allowedOrigins.some(o => o === origin || (o.startsWith('*') && new RegExp('^' + o.replace(/\*/g, '.*') + '$').test(origin)));
    cb(null, ok ? origin : false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));

// Rate limiting
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { success: false, error: 'Too many requests' },
}));

// Request logging
app.use(requestLogger);

// Session (server-side store; in-memory or Redis)
app.use(sessionMiddleware);

// Auth routes (no JWT required)
app.post('/api/auth/login', authRouter);

// CSRF token for state-changing requests (cookies used for session)
app.get('/api/csrf-token', csrfTokenRoute);
app.use(csrfMiddleware);

// Protected API
app.use('/api/query', authMiddleware, queryRouter);
app.use('/api/export', authMiddleware, exportRouter);
app.use('/api/report', authMiddleware, reportRouter);

// Health (no auth)
app.get('/health', (req, res) => res.json({ ok: true }));

// Serve static frontend (production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// 404
app.use((req, res) => res.status(404).json({ success: false, error: 'Not found' }));

// Error handler
app.use((err, req, res, next) => {
  auditLog('error', { path: req.path, message: err.message });
  res.status(err.status || 500).json({ success: false, error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(JSON.stringify({ event: 'server_start', port: PORT }));
});
