import pool from '../config/db.js';

class Content {
  /**
   * Create new content
   *
   * @param {number} creatorProfileId - creators.id (NOT users.id)
   */
  static async create(creatorProfileId, title, description, fileUrl, price) {
    if (!title || title.trim().length < 3) {
      throw new Error('Title must be at least 3 characters');
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      throw new Error('Price must be 0 or a positive number');
    }

    // fileUrl is optional — empty string stored as NULL
    const finalUrl = fileUrl && fileUrl.trim() ? fileUrl.trim() : null;
    if (finalUrl && !this.isValidUrl(finalUrl)) {
      throw new Error('Invalid URL format for file URL');
    }

    // Auto-set is_free based on price
    const isFree = numPrice === 0;

    const result = await pool.query(
      `INSERT INTO content (creator_id, title, description, file_url, price, is_free, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'published')
       RETURNING *`,
      [creatorProfileId, title.trim(), description?.trim() || null, finalUrl, numPrice, isFree]
    );

    return result.rows[0];
  }

  /**
   * Find content by ID — FIXED: includes creator display_name, bio, and creator_user_id
   * creator_user_id is used by contentAccess middleware to check creator bypass
   */
  static async findById(contentId) {
    const result = await pool.query(
      `SELECT
         c.id,
         c.creator_id,
         c.title,
         c.description,
         c.file_url,
         c.price::float          AS price,
         c.is_free,
         c.views_count,
         c.status,
         c.created_at,
         c.updated_at,
         cr.display_name         AS creator_display_name,
         cr.bio                  AS creator_bio,
         cr.user_id              AS creator_user_id
       FROM content c
       JOIN creators cr ON c.creator_id = cr.id
       WHERE c.id = $1 AND c.status = 'published'`,
      [contentId]
    );

    return result.rows[0];
  }

  /**
   * Find all content by creator profile
   */
  static async findByCreatorId(creatorProfileId) {
    const result = await pool.query(
      `SELECT
         id, creator_id, title, description, file_url,
         price::float AS price, is_free, views_count, status,
         created_at, updated_at
       FROM content
       WHERE creator_id = $1
       ORDER BY created_at DESC`,
      [creatorProfileId]
    );
    return result.rows;
  }

  /**
   * Browse all published content — FIXED: uses creator_display_name (consistent alias)
   */
  static async findAllPublished(limit = 20, offset = 0) {
    const result = await pool.query(
      `SELECT
         c.id,
         c.creator_id,
         c.title,
         c.description,
         c.file_url,
         c.price::float          AS price,
         c.is_free,
         c.views_count,
         c.status,
         c.created_at,
         cr.display_name         AS creator_display_name
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
   * Update content — ownership already verified by middleware
   * @param {number} contentId
   * @param {number} creatorProfileId - creators.id for ownership check
   */
  static async update(contentId, creatorProfileId, title, description, fileUrl, price) {
    const content = await this.findById(contentId);
    if (!content) throw new Error('Content not found');
    if (content.creator_id !== creatorProfileId) throw new Error('Unauthorized');

    if (title && title.trim().length < 3) throw new Error('Title must be at least 3 characters');

    const finalUrl = fileUrl !== undefined
      ? (fileUrl && fileUrl.trim() ? fileUrl.trim() : null)
      : content.file_url;

    if (finalUrl && !this.isValidUrl(finalUrl)) throw new Error('Invalid URL format');

    const finalTitle       = title?.trim()       || content.title;
    const finalDescription = description?.trim() ?? content.description;
    const finalPrice       = price !== undefined && price !== null
      ? parseFloat(price)
      : parseFloat(content.price);
    const finalIsFree      = finalPrice === 0;

    const result = await pool.query(
      `UPDATE content
       SET title = $1, description = $2, file_url = $3, price = $4, is_free = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [finalTitle, finalDescription, finalUrl, finalPrice, finalIsFree, contentId]
    );

    return result.rows[0];
  }

  /**
   * Soft-delete content (archive) — ownership already verified by middleware
   */
  static async delete(contentId, creatorProfileId) {
    const content = await this.findById(contentId);
    if (!content) throw new Error('Content not found');
    if (content.creator_id !== creatorProfileId) throw new Error('Unauthorized');

    const result = await pool.query(
      `UPDATE content SET status = 'archived', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [contentId]
    );
    return result.rows[0];
  }

  /**
   * Increment view count (called from recordContentView controller)
   */
  static async incrementViews(contentId) {
    await pool.query(
      'UPDATE content SET views_count = views_count + 1 WHERE id = $1',
      [contentId]
    );
  }

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
