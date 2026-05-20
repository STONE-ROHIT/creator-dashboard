import pool from '../config/db.js';

class Subscription {
  /**
   * Create subscription
   * 
   * Business rules:
   * - Only for paid content (is_free = false)
   * - Not for own content (creator can view without subscription)
   * - Status starts as 'pending' (not active until payment confirmed)
   * - Lifetime access (no expiry for MVP)
   * 
   * Unique constraint prevents:
   * - User subscribing twice to same content
   * - Duplicate subscriptions
   */
  static async create(userId, contentId, subscriptionType = 'lifetime') {
    try {
      const result = await pool.query(
        `INSERT INTO subscriptions (user_id, content_id, subscription_type, status)
         VALUES ($1, $2, $3, 'pending')
         RETURNING *`,
        [userId, contentId, subscriptionType]
      );

      return result.rows[0];
    } catch (err) {
      // Database unique constraint violation
      // (user_id, content_id) pair with status='active' already exists
      if (err.code === '23505') {
        throw new Error('Already subscribed to this content');
      }
      throw err;
    }
  }

  /**
   * Find subscription by ID
   */
  static async findById(subscriptionId) {
    if (!subscriptionId || typeof subscriptionId !== 'number') {
      return undefined;
    }

    const result = await pool.query(
      'SELECT * FROM subscriptions WHERE id = $1',
      [subscriptionId]
    );

    return result.rows[0];
  }

  /**
   * Find active subscription between user and content
   * 
   * CRITICAL: Only returns status='active' subscriptions
   * This is the source of truth for access control
   * Pending and cancelled subscriptions do NOT grant access
   */
  static async findActive(userId, contentId) {
    if (!userId || !contentId) {
      return undefined;
    }

    const result = await pool.query(
      `SELECT * FROM subscriptions
       WHERE user_id = $1 AND content_id = $2 AND status = 'active'`,
      [userId, contentId]
    );

    return result.rows[0]; // undefined if not found
  }

  /**
   * Find pending subscription by payment ID
   * Used by webhook to find subscription for a payment
   */
  static async findByPaymentId(paymentId) {
    if (!paymentId) {
      return undefined;
    }

    const result = await pool.query(
      'SELECT * FROM subscriptions WHERE payment_id = $1',
      [paymentId]
    );

    return result.rows[0];
  }

  /**
   * Activate subscription (called by webhook after payment confirmed)
   * 
   * Updates status to 'active' and records payment details
   * Only updates if currently in 'pending' state (safety check)
   */
  static async activate(subscriptionId, paidAmount) {
    if (!subscriptionId || typeof paidAmount !== 'number') {
      throw new Error('subscriptionId and paidAmount are required');
    }

    const result = await pool.query(
      `UPDATE subscriptions
       SET status = 'active', paid_amount = $1, paid_at = NOW()
       WHERE id = $2 AND status = 'pending'
       RETURNING *`,
      [paidAmount, subscriptionId]
    );

    if (!result.rows[0]) {
      throw new Error('Subscription not found or not in pending status');
    }

    return result.rows[0];
  }

  /**
   * Find all active subscriptions for a user
   * Used for "My Subscriptions" page
   */
  static async findByUserIdActive(userId) {
    const result = await pool.query(
      `SELECT s.*, c.title, c.price, c.is_free, cr.display_name as creator_name
       FROM subscriptions s
       JOIN content c ON s.content_id = c.id
       JOIN creators cr ON c.creator_id = cr.id
       WHERE s.user_id = $1 AND s.status = 'active'
       ORDER BY s.created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Find all active subscriptions to a piece of content
   * Useful for creator dashboard
   */
  static async findByContentIdActive(contentId) {
    const result = await pool.query(
      `SELECT s.*, u.email, u.username
       FROM subscriptions s
       JOIN users u ON s.user_id = u.id
       WHERE s.content_id = $1 AND s.status = 'active'`,
      [contentId]
    );

    return result.rows;
  }

  /**
   * Cancel subscription (soft delete)
   * 
   * Why soft delete?
   * - Preserves history for auditing
   * - Can track when users cancel
   * - Can calculate metrics (churn rate, etc.)
   * - Enables future recovery/retention features
   * 
   * Authorization:
   * - Only user who owns subscription can cancel it
   * - Verified here at model layer
   */
  static async cancel(subscriptionId, userId) {
    // Get subscription first
    const result = await pool.query(
      'SELECT * FROM subscriptions WHERE id = $1',
      [subscriptionId]
    );

    const subscription = result.rows[0];

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Verify user owns this subscription
    if (subscription.user_id !== userId) {
      throw new Error('Unauthorized - not your subscription');
    }

    // Mark as cancelled
    const updateResult = await pool.query(
      `UPDATE subscriptions 
       SET status = 'cancelled', cancelled_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [subscriptionId]
    );

    return updateResult.rows[0];
  }

  /**
   * Check if user has active subscription to content
   * Boolean helper for access control
   */
  static async userHasAccess(userId, contentId) {
    const subscription = await this.findActive(userId, contentId);
    return !!subscription;
  }
}

export default Subscription;