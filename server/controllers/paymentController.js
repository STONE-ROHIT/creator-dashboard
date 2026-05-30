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
 * Create Razorpay order for pending subscription
 * 
 * IMPORTANT: Subscription must already exist (created by POST /api/subscriptions)
 * This endpoint uses the existing pending subscription to create a payment order
 * 
 * Flow:
 * 1. Validate subscriptionId exists and is pending
 * 2. Verify subscription belongs to user
 * 3. Get content price for verification
 * 4. Create Razorpay order
 * 5. Update subscription with payment_id
 * 6. Return order details to frontend
 */
export const createPaymentOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subscriptionId } = req.body;

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

    // ===== FIND SUBSCRIPTION =====

    const subscription = await Subscription.findById(subscriptionId);

    if (!subscription) {
      return res.status(404).json({
        error: 'Subscription not found',
      });
    }

    // Verify ownership
    if (subscription.user_id !== userId) {
      return res.status(403).json({
        error: 'Unauthorized - subscription does not belong to you',
      });
    }

    // Verify status is pending (not already active or cancelled)
    if (subscription.status !== 'pending') {
      return res.status(400).json({
        error: `Subscription is ${subscription.status}. Only pending subscriptions can proceed to payment.`,
      });
    }

    // ===== GET CONTENT DETAILS =====

    const content = await Content.findById(subscription.content_id);

    if (!content) {
      return res.status(404).json({
        error: 'Content not found',
      });
    }

    // Validate price
    const contentPrice = parseFloat(content.price);
    if (!isValidPaymentAmount(contentPrice)) {
      return res.status(400).json({
        error: 'Content has invalid price',
      });
    }

    // ===== CREATE RAZORPAY ORDER =====

    try {
      const amountInPaise = rupeesToPaise(contentPrice);

      const razorpayOrder = await razorpayInstance.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `sub_${subscription.id}`,
        notes: {
          subscriptionId: subscription.id,
          contentId: subscription.content_id,
          userId: userId,
        },
      });

      // ===== STORE PAYMENT_ID =====

      await pool.query(
        'UPDATE subscriptions SET payment_id = $1 WHERE id = $2',
        [razorpayOrder.id, subscription.id]
      );

      // ===== RETURN SUCCESS =====

      return res.status(201).json({
        message: 'Payment order created successfully',
        order: {
          orderId: razorpayOrder.id,
          amount: contentPrice,
          amountDisplay: formatRupees(contentPrice),
          currency: 'INR',
          subscriptionId: subscription.id,
          contentTitle: content.title,
          keyId: process.env.RAZORPAY_KEY_ID,
        },
      });
    } catch (razorpayErr) {
      console.error('Razorpay error:', razorpayErr);

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
 * Razorpay webhook handler (called by Razorpay, not frontend)
 * 
 * Process:
 * 1. Verify webhook signature (proves it's from Razorpay)
 * 2. Extract payment details
 * 3. Find subscription by order ID
 * 4. Verify amount matches
 * 5. Activate subscription
 * 
 * Idempotency:
 * If webhook called twice, second call succeeds silently
 * (subscription already active, no re-activation)
 */
export const handlePaymentWebhook = async (req, res) => {
  try {
    // ===== VERIFY WEBHOOK SIGNATURE =====

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('RAZORPAY_WEBHOOK_SECRET not configured');
      return res.status(500).json({
        error: 'Webhook secret not configured',
      });
    }

    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      console.error('Missing X-Razorpay-Signature header');
      return res.status(401).json({
        error: 'Missing webhook signature',
      });
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      console.error(
        'No raw body available. Ensure server.js captures rawBody before JSON parsing.'
      );
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

    // ===== EXTRACT EVENT =====

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
      console.log(`Subscription ${subscription.id} already active (idempotent)`);
      return res.json({ status: 'ok' });
    }

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
 * Called by frontend to check if payment was successful
 * 
 * Returns:
 * - 200: Payment confirmed, subscription is active
 * - 202: Payment still processing, subscription still pending
 * - 404: Subscription not found
 * - 400: Subscription in invalid state
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