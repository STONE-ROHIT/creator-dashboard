import pool from '../config/db.js';
import Subscription from '../models/Subscription.js';
import Content from '../models/Content.js';
import razorpayInstance from '../utils/razorpay.js';
import { verifyWebhookSignature } from '../utils/webhookVerifier.js';
import {
  rupeesToPaise,
  formatRupees,
  verifyPaymentAmount,
  isValidPaymentAmount,
} from '../utils/amountConverter.js';

/**
 * POST /api/payments/create-order
 * 
 * Create Razorpay order for subscription
 * 
 * Flow:
 * 1. Validate content exists and is paid
 * 2. Check user is not creator
 * 3. Check no active subscription exists
 * 4. Create pending subscription
 * 5. Create Razorpay order
 * 6. Store payment_id in subscription
 * 7. Return order details to frontend
 */
export const createPaymentOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { contentId } = req.body;

    // ===== VALIDATION =====

    // Validate input exists
    if (!contentId) {
      return res.status(400).json({
        error: 'contentId is required',
      });
    }

    // Validate contentId is number
    if (typeof contentId !== 'number') {
      return res.status(400).json({
        error: 'contentId must be a number',
      });
    }

    // ===== DATABASE QUERIES =====

    // Query content from database
    const content = await Content.findById(contentId);
    if (!content) {
      return res.status(404).json({
        error: 'Content not found',
      });
    }

    // Check if content is free
    if (content.is_free) {
      return res.status(400).json({
        error: 'This content is free. No payment required.',
      });
    }

    // Validate content price (convert string to number if needed)
    const contentPrice = parseFloat(content.price);
    if (!isValidPaymentAmount(contentPrice)) {
    return res.status(400).json({
        error: 'Content has invalid price',
    });
    }

    // Check user is not creator
    if (content.creator_id === userId) {
      return res.status(400).json({
        error: 'You cannot subscribe to your own content',
      });
    }

    // Check no active subscription exists
    const existingSubscription = await Subscription.findActive(userId, contentId);
    if (existingSubscription) {
      return res.status(409).json({
        error: 'You already have an active subscription to this content',
      });
    }

    // ===== CREATE SUBSCRIPTION =====

    let subscription;
    try {
      subscription = await Subscription.create(userId, contentId);
    } catch (err) {
      console.error('Subscription creation error:', err);
      return res.status(400).json({
        error: err.message || 'Failed to create subscription',
      });
    }

    // ===== CREATE RAZORPAY ORDER =====

    try {
      // Convert rupees to paise for Razorpay
      const amountInPaise = rupeesToPaise(contentPrice);

      // Create order
      const razorpayOrder = await razorpayInstance.orders.create({
        amount: amountInPaise, // In paise
        currency: 'INR',
        receipt: `sub_${subscription.id}`,
        notes: {
          subscriptionId: subscription.id,
          contentId: contentId,
          userId: userId,
        },
      });

      // Store payment_id in subscription
      await pool.query(
        'UPDATE subscriptions SET payment_id = $1 WHERE id = $2',
        [razorpayOrder.id, subscription.id]
      );

      // ===== RETURN SUCCESS =====

      return res.status(201).json({
        message: 'Payment order created successfully',
        order: {
          orderId: razorpayOrder.id,
          amount: contentPrice, // In rupees (human-readable)
          amountDisplay: formatRupees(contentPrice),
          currency: 'INR',
          subscriptionId: subscription.id,
          contentTitle: content.title,
          keyId: process.env.RAZORPAY_KEY_ID, // Public key for frontend
        },
      });
    } catch (razorpayErr) {
      console.error('Razorpay error:', razorpayErr);

      // Cleanup: delete pending subscription
      await pool.query(
        'DELETE FROM subscriptions WHERE id = $1',
        [subscription.id]
      );

      return res.status(500).json({
        error: 'Failed to create payment order',
      });
    }
  } catch (err) {
    console.error('createPaymentOrder error:', err);
    return res.status(500).json({
      error: 'Server error',
    });
  }
};

/**
 * POST /api/payments/webhook
 * 
 * Razorpay webhook handler
 * 
 * Called by Razorpay when payment is authorized
 * 
 * Security checks:
 * 1. Verify webhook signature (proves it's from Razorpay)
 * 2. Verify payment amount matches expected
 * 3. Verify subscription exists and is pending
 * 
 * Idempotency:
 * If called twice with same payment, second call succeeds silently
 */
export const handlePaymentWebhook = async (req, res) => {
  try {
    // ===== GET WEBHOOK SECRET =====

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('RAZORPAY_WEBHOOK_SECRET not configured');
      return res.status(500).json({
        error: 'Webhook secret not configured',
      });
    }

    // ===== EXTRACT SIGNATURE =====

    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      console.error('Missing X-Razorpay-Signature header');
      return res.status(401).json({
        error: 'Missing webhook signature',
      });
    }

    // ===== VERIFY SIGNATURE =====

    const rawBody = req.rawBody;
    if (!rawBody) {
      console.error('No raw body available for signature verification');
      return res.status(401).json({
        error: 'Cannot verify webhook',
      });
    }

    const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return res.status(401).json({
        error: 'Invalid webhook signature',
      });
    }

    // ===== EXTRACT EVENT DETAILS =====

    const { event, payload } = req.body;

    // Only process payment.authorized events
    if (event !== 'payment.authorized') {
      console.log(`Ignoring event: ${event}`);
      return res.json({ status: 'ok' });
    }

    const paymentEntity = payload.payment.entity;
    const orderId = paymentEntity.order_id;
    const paymentAmount = paymentEntity.amount; // In paise

    console.log(`Processing payment: ${paymentEntity.id} for order: ${orderId}`);

    // ===== FIND SUBSCRIPTION =====

    const subResult = await pool.query(
      `SELECT s.*, c.price as content_price_rupees
       FROM subscriptions s
       JOIN content c ON s.content_id = c.id
       WHERE s.payment_id = $1`,
      [orderId]
    );

    if (!subResult.rows[0]) {
      console.error(`No subscription found for order: ${orderId}`);
      return res.status(404).json({
        error: 'Subscription not found',
      });
    }

    const subscription = subResult.rows[0];

    // ===== VERIFY AMOUNT =====

    const amountMatches = verifyPaymentAmount(
      subscription.content_price_rupees,
      paymentAmount
    );

    if (!amountMatches) {
      console.error(
        `Amount mismatch for subscription ${subscription.id}: ` +
        `received ${paymentAmount}p, expected ${subscription.content_price_rupees * 100}p`
      );
      return res.status(400).json({
        error: 'Payment amount mismatch',
      });
    }

    // ===== IDEMPOTENCY CHECK =====

    if (subscription.status === 'active') {
      // Already processed this payment
      console.log(`Subscription ${subscription.id} already active (idempotent)`);
      return res.json({ status: 'ok' });
    }

    // ===== VERIFY STATUS =====

    if (subscription.status !== 'pending') {
      console.error(
        `Subscription ${subscription.id} in unexpected status: ${subscription.status}`
      );
      return res.status(400).json({
        error: 'Subscription not in pending status',
      });
    }

    // ===== ACTIVATE SUBSCRIPTION =====

    const paidAmount = paymentAmount / 100; // Convert paise to rupees

    const updateResult = await pool.query(
      `UPDATE subscriptions
       SET status = 'active', paid_amount = $1, paid_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [paidAmount, subscription.id]
    );

    if (!updateResult.rows[0]) {
      throw new Error('Failed to update subscription');
    }

    console.log(
      `Subscription ${subscription.id} activated by payment ${paymentEntity.id} ` +
      `(${formatRupees(paidAmount)})`
    );

    // ===== RETURN SUCCESS =====

    return res.json({ status: 'ok' });
  } catch (err) {
    console.error('handlePaymentWebhook error:', err);
    return res.status(500).json({
      error: 'Server error',
    });
  }
};

/**
 * POST /api/payments/verify
 * 
 * Verify payment status
 * 
 * Called by frontend after user returns from Razorpay checkout
 * Returns subscription status (pending/active)
 */
export const verifyPayment = async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    const userId = req.user.id;

    // ===== VALIDATION =====

    if (!subscriptionId) {
      return res.status(400).json({
        error: 'subscriptionId is required',
      });
    }

    if (typeof subscriptionId !== 'number') {
      return res.status(400).json({
        error: 'subscriptionId must be a number',
      });
    }

    // ===== QUERY SUBSCRIPTION =====

    const subResult = await pool.query(
      'SELECT * FROM subscriptions WHERE id = $1 AND user_id = $2',
      [subscriptionId, userId]
    );

    if (!subResult.rows[0]) {
      return res.status(404).json({
        error: 'Subscription not found',
      });
    }

    const subscription = subResult.rows[0];

    // ===== RETURN STATUS =====

    if (subscription.status === 'active') {
      return res.status(200).json({
        message: 'Payment confirmed',
        subscription: {
          ...subscription,
          paid_amount_display: subscription.paid_amount
            ? formatRupees(subscription.paid_amount)
            : null,
        },
      });
    }

    if (subscription.status === 'pending') {
      return res.status(202).json({
        message: 'Payment processing - please wait',
        subscription,
      });
    }

    // Cancelled or other status
    return res.status(400).json({
      error: 'Invalid subscription status',
      status: subscription.status,
    });
  } catch (err) {
    console.error('verifyPayment error:', err);
    return res.status(500).json({
      error: 'Server error',
    });
  }
};