import pool from '../config/db.js';

class Content {
  /**
   * Create new content
   * 
   * Validation:
   * - title: required, min 3 chars
   * - description: required, min 10 chars
   * - fileUrl: required, valid URL
   * - price: required, >= 0
   * - is_free: auto-set based on price (price=0 → is_free=true)
   * 
   * Security:
   * - Only creator_id from JWT is trusted
   */
  static async create(creatorId, title, description, fileUrl, price) {
    // Validate inputs
    if (!title || title.trim().length < 3) {
      throw new Error('Title must be at least 3 characters');
    }

    if (!description || description.trim().length < 10) {
      throw new Error('Description must be at least 10 characters');
    }

    if (!fileUrl || !this.isValidUrl(fileUrl)) {
      throw new Error('Invalid file URL');
    }

    if (price === null || price === undefined || isNaN(price)) {
      throw new Error('Price is required and must be a number');
    }

    // Convert to number
    const numPrice = parseFloat(price);

    if (numPrice < 0) {
      throw new Error('Price cannot be negative');
    }

    // AUTO-SET is_free based on price
    const isFree = numPrice === 0;

    try {
      const result = await pool.query(
        `INSERT INTO content (creator_id, title, description, file_url, price, is_free, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'published')
         RETURNING *`,
        [creatorId, title, description, fileUrl, numPrice, isFree]
      );

      return result.rows[0];
    } catch (err) {
      throw err;
    }
  }

  /**
   * Find content by ID
   */
  static async findById(contentId) {
    const result = await pool.query(
      'SELECT * FROM content WHERE id = $1',
      [contentId]
    );

    return result.rows[0];
  }

  /**
   * Find all content by creator
   */
  static async findByCreatorId(creatorId) {
    const result = await pool.query(
      'SELECT * FROM content WHERE creator_id = $1 ORDER BY created_at DESC',
      [creatorId]
    );

    return result.rows;
  }

  /**
   * Find all published content (for browsing)
   * UPDATED: Cast price to float to ensure number type (not string)
   * Only shows non-archived content
   */
  static async findAllPublished(limit = 20, offset = 0) {
    const result = await pool.query(
      `SELECT c.id, c.creator_id, c.title, c.description, c.file_url, 
              c.price::float as price, c.is_free, c.views_count, c.status, 
              c.created_at, cr.display_name as creator_name
       FROM content c
       JOIN creators cr ON c.creator_id = cr.id
       WHERE c.status = 'published'
       ORDER BY c.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows;
  }

  /**
   * Update content
   * Creator can update their own content
   */
  static async update(contentId, creatorId, title, description, fileUrl, price) {
    // Verify creator owns this content
    const content = await this.findById(contentId);
    if (!content) {
      throw new Error('Content not found');
    }

    if (content.creator_id !== creatorId) {
      throw new Error('Unauthorized - not your content');
    }

    // Validate new fields (same rules as create)
    if (title && title.trim().length < 3) {
      throw new Error('Title must be at least 3 characters');
    }

    if (description && description.trim().length < 10) {
      throw new Error('Description must be at least 10 characters');
    }

    if (fileUrl && !this.isValidUrl(fileUrl)) {
      throw new Error('Invalid file URL');
    }

    if (price !== null && price !== undefined) {
      const numPrice = parseFloat(price);
      if (numPrice < 0) {
        throw new Error('Price cannot be negative');
      }
    }

    // Use existing values if not provided
    const finalTitle = title || content.title;
    const finalDescription = description || content.description;
    const finalFileUrl = fileUrl || content.file_url;
    const finalPrice = price !== null && price !== undefined ? parseFloat(price) : content.price;
    const finalIsFree = finalPrice === 0;

    const result = await pool.query(
      `UPDATE content 
       SET title = $1, description = $2, file_url = $3, price = $4, is_free = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [finalTitle, finalDescription, finalFileUrl, finalPrice, finalIsFree, contentId]
    );

    return result.rows[0];
  }

  /**
   * Delete content (soft delete)
   * Mark as archived instead of hard delete
   */
  static async delete(contentId, creatorId) {
    // Verify creator owns this content
    const content = await this.findById(contentId);
    if (!content) {
      throw new Error('Content not found');
    }

    if (content.creator_id !== creatorId) {
      throw new Error('Unauthorized - not your content');
    }

    const result = await pool.query(
      `UPDATE content SET status = 'archived', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [contentId]
    );

    return result.rows[0];
  }

  /**
   * Increment view count
   * Called when user views content
   */
  static async incrementViews(contentId) {
    await pool.query(
      'UPDATE content SET views_count = views_count + 1 WHERE id = $1',
      [contentId]
    );
  }

  /**
   * Helper: Validate URL format
   */
  static isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

export default Content;