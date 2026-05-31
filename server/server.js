import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes         from './routes/auth.js';
import creatorRoutes      from './routes/creators.js';
import contentRoutes      from './routes/content.js';
import subscriptionRoutes from './routes/subscriptions.js';
import paymentRoutes      from './routes/payments.js';

dotenv.config();

const app = express();

// ── Middleware ──────────────────────────────────────────────────
// CRITICAL: capture raw body BEFORE json parsing for webhook signature verification
app.use(
  express.json({
    verify: (req, _res, buf, encoding) => {
      if (buf?.length) {
        req.rawBody = buf.toString(encoding || 'utf8');
      }
    },
  })
);

// CORS — allow configured origin in prod, all origins in dev
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : '*';

app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Routes ──────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/creators',      creatorRoutes);
app.use('/api/content',       contentRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments',      paymentRoutes);

// ── Health check (used by Railway/Render) ──────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
});

// ── 404 ────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── Start ───────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});