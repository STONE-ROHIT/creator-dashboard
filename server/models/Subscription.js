import pool from '../config/db.js';

class Subscription {
  /**
   * Create subscription
   * Status starts as 'pending' (awaiting payment)
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
   * ONLY 'active' subscriptions grant access
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

    return result.rows[0];
  }

  /**
   * Find pending subscription by payment ID
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
   * UPDATED: Find all subscriptions for a user (active AND pending)
   * Shows what user is currently subscribed to
   */
  static async findByUserId(userId, statusFilter = null) {
    if (!userId) {
      return [];
    }

    let query = `SELECT s.*, c.title, c.price, c.is_free, cr.display_name as creator_name
                 FROM subscriptions s
                 JOIN content c ON s.content_id = c.id
                 JOIN creators cr ON c.creator_id = cr.id
                 WHERE s.user_id = $1`;

    const params = [userId];

    // Filter by status if provided
    if (statusFilter) {
      query += ` AND s.status = $2`;
      params.push(statusFilter);
    }

    query += ` ORDER BY s.created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Find all active subscriptions for a user
   * Convenience method (formerly findByUserIdActive)
   */
  static async findByUserIdActive(userId) {
    return this.findByUserId(userId, 'active');
  }

  /**
   * Find all pending subscriptions for a user
   * New method for pending display
   */
  static async findByUserIdPending(userId) {
    return this.findByUserId(userId, 'pending');
  }

  /**
   * Find all subscriptions (both active and pending)
   * For user dashboard display
   */
  static async findByUserIdAll(userId) {
    return this.findByUserId(userId, null);
  }

  /**
   * Activate subscription (called by webhook or dev skip)
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
   * Cancel subscription (soft delete)
   */
  static async cancel(subscriptionId, userId) {
    const result = await pool.query(
      'SELECT * FROM subscriptions WHERE id = $1',
      [subscriptionId]
    );

    const subscription = result.rows[0];

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.user_id !== userId) {
      throw new Error('Unauthorized - not your subscription');
    }

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
   */
  static async userHasAccess(userId, contentId) {
    const subscription = await this.findActive(userId, contentId);
    return !!subscription;
  }
}

export default Subscription;