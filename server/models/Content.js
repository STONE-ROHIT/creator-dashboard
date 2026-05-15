import pool from '../config/db.js';

class Content {
  // Create new content
  static async create(creatorId, title, description, fileUrl, price) {
    const result = await pool.query(
      `INSERT INTO content (creator_id, title, description, file_url, price, status)
       VALUES ($1, $2, $3, $4, $5, 'published')
       RETURNING *`,
      [creatorId, title, description, fileUrl, price]
    );
    
    return result.rows[0];
  }

  // Find content by ID
  static async findById(contentId) {
    const result = await pool.query(
      'SELECT * FROM content WHERE id = $1',
      [contentId]
    );
    
    return result.rows[0];
  }

  // Get all content by a creator
  // Creator dashboard uses this to list their content
  static async findByCreatorId(creatorId, limit = 50) {
    const result = await pool.query(
      'SELECT * FROM content WHERE creator_id = $1 ORDER BY created_at DESC LIMIT $2',
      [creatorId, limit]
    );
    
    return result.rows;
  }

  // Get all published content from all creators
  // Browse page uses this
  static async findAllPublished(limit = 50, offset = 0) {
    const result = await pool.query(
      'SELECT * FROM content WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      ['published', limit, offset]
    );
    
    return result.rows;
  }

  // Get content with creator info
  // Browse page shows creator name with content
  static async findWithCreatorInfo(contentId) {
    const result = await pool.query(
      `SELECT 
        c.id,
        c.title,
        c.description,
        c.price,
        c.views_count,
        c.created_at,
        cr.id as creator_id,
        cr.display_name as creator_name
      FROM content c
      JOIN creators cr ON c.creator_id = cr.id
      WHERE c.id = $1 AND c.status = 'published'`,
      [contentId]
    );
    
    return result.rows[0];
  }

  // Update content
  // Only title, description, price can be updated
  static async update(contentId, title, description, price) {
    const result = await pool.query(
      'UPDATE content SET title = $1, description = $2, price = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
      [title, description, price, contentId]
    );
    
    return result.rows[0];
  }

  // Delete content
  // Soft delete: mark as archived instead of actually deleting
  // Why? So you keep records even after deletion
  static async delete(contentId) {
    const result = await pool.query(
      'UPDATE content SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      ['archived', contentId]
    );
    
    return result.rows[0];
  }

  // Increment view count
  // Called when someone views the content
  static async incrementViews(contentId) {
    const result = await pool.query(
      'UPDATE content SET views_count = views_count + 1 WHERE id = $1 RETURNING views_count',
      [contentId]
    );
    
    return result.rows[0];
  }
}

export default Content;