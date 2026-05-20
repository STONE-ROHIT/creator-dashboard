import express from 'express';
import {
  createPaymentOrder,
  handlePaymentWebhook,
  verifyPayment,
} from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/payments/create-order
 * 
 * Create Razorpay order for subscription
 * 
 * Auth: Required (authenticate middleware)
 * Body: { contentId: number }
 * Response: { orderId, amount, subscriptionId, keyId, ... }
 */
router.post('/create-order', authenticate, createPaymentOrder);

/**
 * POST /api/payments/webhook
 * 
 * Razorpay webhook (called by Razorpay, not by frontend)
 * 
 * Auth: None (webhook signature verification instead)
 * Headers: X-Razorpay-Signature
 * Body: { event, payload, ... }
 * Response: { status: 'ok' }
 */
router.post('/webhook', handlePaymentWebhook);

/**
 * POST /api/payments/verify
 * 
 * Verify payment status (called by frontend after checkout)
 * 
 * Auth: Required (authenticate middleware)
 * Body: { subscriptionId: number }
 * Response: { subscription, ... }
 */
router.post('/verify', authenticate, verifyPayment);

export default router;