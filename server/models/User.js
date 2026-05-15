import pool from '../config/db.js';
import bcrypt from 'bcryptjs';

class User {
  // Create a new user
  static async create(email, username, password) {
    // Hash the password - this takes time (10 rounds of hashing)
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert into database
    const result = await pool.query(
      'INSERT INTO users (email, username, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, email, username, role',
      [email, username, hashedPassword, 'subscriber']
    );
    
    // Return the created user (WITHOUT password)
    return result.rows[0];
  }

  // Find user by email
  static async findByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    return result.rows[0]; // Returns undefined if not found
  }

  // Find user by ID
  static async findById(id) {
    const result = await pool.query(
      'SELECT id, email, username, role FROM users WHERE id = $1',
      [id]
    );
    
    return result.rows[0];
  }

  // Verify password (compare plaintext with hash)
  static async verifyPassword(password, passwordHash) {
    return await bcrypt.compare(password, passwordHash);
  }

  // Update user role
  static async updateRole(userId, role) {
    const result = await pool.query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [role, userId]
    );
    
    return result.rows[0];
  }
}

export default User;