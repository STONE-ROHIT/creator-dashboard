import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import creatorRoutes from './routes/creators.js';
import contentRoutes from './routes/content.js';
import subscriptionRoutes from './routes/subscriptions.js';
import paymentRoutes from './routes/payments.js';

dotenv.config();

const app = express();

// ===== MIDDLEWARE ORDER IS CRITICAL =====
// 1. Raw body capture (for webhook signature verification)
// 2. JSON parsing
// 3. CORS
// 4. Routes

// STEP 1: Capture raw body BEFORE parsing
// This middleware captures req.rawBody before express.json() parses it
// CRITICAL for webhook signature verification
app.use((req, res, buf, encoding) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
}, express.json());

// STEP 2: CORS (allow requests from frontend)
app.use(cors());

// STEP 3: Routes
app.use('/api/auth', authRoutes);
app.use('/api/creators', creatorRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);

// STEP 4: Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// STEP 5: 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// STEP 6: Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
});