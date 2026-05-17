import Content from '../models/Content.js';
import Creator from '../models/Creator.js';

/**
 * Upload new content
 * Creator only
 */
export const uploadContent = async (req, res) => {
  try {
    const creatorId = req.user.id; // From JWT
    const { title, description, fileUrl, price } = req.body;

    // Get creator profile (needed to link content)
    const creator = await Creator.findByUserId(creatorId);
    if (!creator) {
      return res.status(400).json({
        error: 'You must become a creator first'
      });
    }

    // Create content
    // Model handles validation and is_free auto-set
    const content = await Content.create(creatorId, title, description, fileUrl, price);

    res.status(201).json({
      message: 'Content uploaded successfully',
      content
    });

  } catch (err) {
    // Handle validation errors
    if (err.message.includes('must be')) {
      return res.status(400).json({
        error: err.message
      });
    }

    console.error('uploadContent error:', err);
    res.status(500).json({
      error: 'Server error'
    });
  }
};

/**
 * Get specific content
 * Access control already verified by middleware
 */
export const getContent = async (req, res) => {
  try {
    // Content already fetched and access verified by middleware
    const content = req.content;

    // Increment view count
    await Content.incrementViews(content.id);

    res.json(content);

  } catch (err) {
    console.error('getContent error:', err);
    res.status(500).json({
      error: 'Server error'
    });
  }
};

/**
 * Get creator's own content
 * Creator only
 */
export const getMyContent = async (req, res) => {
  try {
    const creatorId = req.user.id;

    const creator = await Creator.findByUserId(creatorId);
    if (!creator) {
      return res.status(404).json({
        error: 'You are not a creator'
      });
    }

    const content = await Content.findByCreatorId(creator.id);

    res.json({
      creator_id: creator.id,
      content_count: content.length,
      content
    });

  } catch (err) {
    console.error('getMyContent error:', err);
    res.status(500).json({
      error: 'Server error'
    });
  }
};

/**
 * Update content
 * Creator only, ownership verified by middleware
 */
export const updateContent = async (req, res) => {
  try {
    const { id: contentId } = req.params;
    const creatorId = req.user.id;
    const { title, description, fileUrl, price } = req.body;

    // Model verifies ownership
    const content = await Content.update(
      contentId,
      creatorId,
      title,
      description,
      fileUrl,
      price
    );

    res.json({
      message: 'Content updated',
      content
    });

  } catch (err) {
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({
        error: err.message
      });
    }

    if (err.message.includes('must be')) {
      return res.status(400).json({
        error: err.message
      });
    }

    console.error('updateContent error:', err);
    res.status(500).json({
      error: 'Server error'
    });
  }
};

/**
 * Delete content (soft delete)
 * Creator only, ownership verified by middleware
 */
export const deleteContent = async (req, res) => {
  try {
    const { id: contentId } = req.params;
    const creatorId = req.user.id;

    // Model verifies ownership
    const content = await Content.delete(contentId, creatorId);

    res.json({
      message: 'Content deleted',
      content
    });

  } catch (err) {
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({
        error: err.message
      });
    }

    console.error('deleteContent error:', err);
    res.status(500).json({
      error: 'Server error'
    });
  }
};

/**
 * Browse all published content
 * Public endpoint, no auth required
 */
export const browseContent = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const content = await Content.findAllPublished(limit, offset);

    res.json({
      page,
      limit,
      content_count: content.length,
      content
    });

  } catch (err) {
    console.error('browseContent error:', err);
    res.status(500).json({
      error: 'Server error'
    });
  }
};