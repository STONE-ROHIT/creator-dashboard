import Content from '../models/Content.js';
import Creator from '../models/Creator.js';
import jwt from 'jsonwebtoken';

/**
 * POST /api/content
 * Upload new content — creator only
 *
 * FIXED: Pass creator.id (creators.id) to Content.create, not req.user.id (users.id)
 * The FK constraint on content.creator_id → creators.id requires the creators table PK
 */
export const uploadContent = async (req, res) => {
  try {
    const userId = req.user.id;  // users.id from JWT
    const { title, description, fileUrl, price } = req.body;

    // Get creator profile — we need creator.id (creators.id), not user.id
    const creator = await Creator.findByUserId(userId);
    if (!creator) {
      return res.status(400).json({ error: 'You must become a creator first' });
    }

    // FIXED: Pass creator.id (FK → creators.id), not userId (users.id)
    const content = await Content.create(creator.id, title, description, fileUrl, price);

    return res.status(201).json({
      message: 'Content uploaded successfully',
      content,
    });
  } catch (err) {
    if (err.message.includes('must be') || err.message.includes('Invalid')) {
      return res.status(400).json({ error: err.message });
    }
    console.error('uploadContent error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * GET /api/content/:id
 * Returns full content — access already verified by checkContentAccess middleware
 */
export const getContent = async (req, res) => {
  try {
    return res.json(req.content);
  } catch (err) {
    console.error('getContent error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * POST /api/content/:id/view
 * Record a view — creator self-views are excluded from count
 */
export const recordContentView = async (req, res) => {
  try {
    const contentId = req.params.id;

    const content = await Content.findById(contentId);
    if (!content) return res.status(404).json({ error: 'Content not found' });

    // Extract userId from optional token
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.substring(7), process.env.JWT_SECRET);
        userId = decoded.id;
      } catch { /* invalid token — treat as anonymous */ }
    }

    // FIXED: Use content.creator_user_id for creator bypass check
    if (userId && content.creator_user_id === userId) {
      return res.json({ message: 'View not counted (self-view)', views_count: content.views_count });
    }

    await Content.incrementViews(contentId);
    return res.json({ message: 'View recorded', views_count: content.views_count + 1 });
  } catch (err) {
    console.error('recordContentView error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * GET /api/content/my
 * Get all content for the logged-in creator
 */
export const getMyContent = async (req, res) => {
  try {
    const userId = req.user.id;

    const creator = await Creator.findByUserId(userId);
    if (!creator) return res.status(404).json({ error: 'Creator profile not found' });

    const content = await Content.findByCreatorId(creator.id);

    return res.json({
      creator_id: creator.id,
      content_count: content.length,
      content,
    });
  } catch (err) {
    console.error('getMyContent error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * PUT /api/content/:id
 * Update content — ownership verified by middleware
 */
export const updateContent = async (req, res) => {
  try {
    const contentId = req.params.id;
    const userId = req.user.id;
    const { title, description, fileUrl, price } = req.body;

    const creator = await Creator.findByUserId(userId);
    if (!creator) return res.status(403).json({ error: 'Creator profile not found' });

    const content = await Content.update(contentId, creator.id, title, description, fileUrl, price);

    return res.json({ message: 'Content updated', content });
  } catch (err) {
    if (err.message.includes('Unauthorized')) return res.status(403).json({ error: err.message });
    if (err.message.includes('must be') || err.message.includes('Invalid')) {
      return res.status(400).json({ error: err.message });
    }
    console.error('updateContent error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * DELETE /api/content/:id
 * Soft-delete (archive) — ownership verified by middleware
 */
export const deleteContent = async (req, res) => {
  try {
    const contentId = req.params.id;
    const userId = req.user.id;

    const creator = await Creator.findByUserId(userId);
    if (!creator) return res.status(403).json({ error: 'Creator profile not found' });

    const content = await Content.delete(contentId, creator.id);
    return res.json({ message: 'Content deleted', content });
  } catch (err) {
    if (err.message.includes('Unauthorized')) return res.status(403).json({ error: err.message });
    console.error('deleteContent error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * GET /api/content/browse
 * Public — paginated list of all published content
 */
export const browseContent = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page) || 1);
    const limit  = 20;
    const offset = (page - 1) * limit;

    const content = await Content.findAllPublished(limit, offset);

    return res.json({ page, limit, content_count: content.length, content });
  } catch (err) {
    console.error('browseContent error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};