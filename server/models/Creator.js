import pool from '../config/db.js';

class Creator {
  // Create creator profile for a user
  // Called when user decides to become a creator
  static async create(userId, displayName) {
    const result = await pool.query(
      'INSERT INTO creators (user_id, display_name) VALUES ($1, $2) RETURNING id, user_id, display_name, bio, total_earnings, created_at',
      [userId, displayName]
    );
    
    return result.rows[0];
  }

  // Find creator by user ID
  // (Users can have 0 or 1 creator profile)
  static async findByUserId(userId) {
    const result = await pool.query(
      'SELECT * FROM creators WHERE user_id = $1',
      [userId]
    );
    
    return result.rows[0];
  }

  // Find creator by creator ID
  static async findById(creatorId) {
    const result = await pool.query(
      'SELECT * FROM creators WHERE id = $1',
      [creatorId]
    );
    
    return result.rows[0];
  }

  // Get creator profile with user info
  // Useful for displaying creator on browse page
  static async findWithUserInfo(creatorId) {
    const result = await pool.query(
      `SELECT 
        c.id,
        c.user_id,
        c.display_name,
        c.bio,
        c.total_earnings,
        u.username,
        u.email
      FROM creators c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = $1`,
      [creatorId]
    );
    
    return result.rows[0];
  }

  // Update creator profile
  static async update(creatorId, displayName, bio, bankAccount) {
    const result = await pool.query(
      'UPDATE creators SET display_name = $1, bio = $2, bank_account = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
      [displayName, bio, bankAccount, creatorId]
    );
    
    return result.rows[0];
  }
}

export default Creator;