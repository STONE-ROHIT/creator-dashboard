import pool from '../config/db.js';

class Subscription {
  /**
   * Create subscription — starts as 'pending', awaiting payment
   */
  static async create(userId, contentId, subscriptionType = 'lifetime') {
    const result = await pool.query(
      `INSERT INTO subscriptions (user_id, content_id, subscription_type, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [userId, contentId, subscriptionType]
    );
    return result.rows[0];
  }

  /**
   * Find subscription by ID
   */
  static async findById(subscriptionId) {
    if (!subscriptionId) return undefined;
    const result = await pool.query(
      'SELECT * FROM subscriptions WHERE id = $1',
      [parseInt(subscriptionId)]
    );
    return result.rows[0];
  }

  /**
   * Find the one active subscription for (user, content)
   */
  static async findActive(userId, contentId) {
    if (!userId || !contentId) return undefined;
    const result = await pool.query(
      `SELECT * FROM subscriptions
       WHERE user_id = $1 AND content_id = $2 AND status = 'active'`,
      [userId, contentId]
    );
    return result.rows[0];
  }

  /**
   * Find subscription by Razorpay payment/order ID
   */
  static async findByPaymentId(paymentId) {
    if (!paymentId) return undefined;
    const result = await pool.query(
      'SELECT * FROM subscriptions WHERE payment_id = $1',
      [paymentId]
    );
    return result.rows[0];
  }

  /**
   * Find all subscriptions for a user — FIXED: aliases match frontend expectations
   *   content_title  (was: title)
   *   creator_display_name  (was: creator_name)
   */
  static async findByUserId(userId, statusFilter = null) {
    if (!userId) return [];

    let query = `
      SELECT
        s.*,
        c.title          AS content_title,
        c.price::float   AS price,
        c.is_free,
        cr.display_name  AS creator_display_name
      FROM subscriptions s
      JOIN content  c  ON s.content_id  = c.id
      JOIN creators cr ON c.creator_id  = cr.id
      WHERE s.user_id = $1
    `;
    const params = [userId];

    if (statusFilter) {
      query += ` AND s.status = $2`;
      params.push(statusFilter);
    }

    query += ` ORDER BY s.created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async findByUserIdAll(userId)    { return this.findByUserId(userId, null); }
  static async findByUserIdActive(userId) { return this.findByUserId(userId, 'active'); }
  static async findByUserIdPending(userId){ return this.findByUserId(userId, 'pending'); }

  /**
   * Activate subscription — called by webhook or dev bypass
   */
  static async activate(subscriptionId, paidAmount) {
    const result = await pool.query(
      `UPDATE subscriptions
       SET status = 'active', paid_amount = $1, paid_at = NOW()
       WHERE id = $2 AND status = 'pending'
       RETURNING *`,
      [paidAmount, subscriptionId]
    );
    if (!result.rows[0]) throw new Error('Subscription not found or not pending');
    return result.rows[0];
  }

  /**
   * Cancel subscription (soft-delete; immutable final state)
   */
  static async cancel(subscriptionId, userId) {
    const sub = await this.findById(subscriptionId);
    if (!sub) throw new Error('Subscription not found');
    if (sub.user_id !== parseInt(userId)) throw new Error('Unauthorized');

    const result = await pool.query(
      `UPDATE subscriptions
       SET status = 'cancelled', cancelled_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [subscriptionId]
    );
    return result.rows[0];
  }

  /**
   * Quick boolean check — does user have active access to content?
   */
  static async userHasAccess(userId, contentId) {
    const sub = await this.findActive(userId, contentId);
    return !!sub;
  }
}

export default Subscription;
