import Content from '../models/Content.js';
import Creator from '../models/Creator.js';

// Upload new content
// Only creators can do this
export const uploadContent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, fileUrl, price } = req.body;
    
    // Validate inputs
    if (!title || title.length < 3) {
      return res.status(400).json({
        error: 'Title must be at least 3 characters'
      });
    }
    
    if (!fileUrl) {
      return res.status(400).json({
        error: 'File URL is required'
      });
    }
    
    if (!price || price < 0) {
      return res.status(400).json({
        error: 'Price must be a positive number'
      });
    }
    
    // Get creator profile for this user
    const creator = await Creator.findByUserId(userId);
    
    if (!creator) {
      return res.status(403).json({
        error: 'You must be a creator to upload content'
      });
    }
    
    // Create content
    const content = await Content.create(
      creator.id,
      title,
      description || '',
      fileUrl,
      price
    );
    
    res.status(201).json({
      message: 'Content uploaded successfully',
      content
    });
    
  } catch (err) {
    console.error('uploadContent error:', err);
    res.status(500).json({
      error: 'Server error'
    });
  }
};

// Get specific content
// Anyone can view if published
export const getContent = async (req, res) => {
  try {
    const contentId = req.params.id;
    
    const content = await Content.findWithCreatorInfo(contentId);
    
    if (!content) {
      return res.status(404).json({
        error: 'Content not found'
      });
    }
    
    // Increment view count
    await Content.incrementViews(contentId);
    
    res.json(content);
    
  } catch (err) {
    console.error('getContent error:', err);
    res.status(500).json({
      error: 'Server error'
    });
  }
};

// Get creator's own content
// Only creator can view their own unpublished content
export const getMyContent = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get creator profile
    const creator = await Creator.findByUserId(userId);
    
    if (!creator) {
      return res.status(403).json({
        error: 'You must be a creator'
      });
    }
    
    // Get all their content (including unpublished)
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

// Update content
// Only owner can update
export const updateContent = async (req, res) => {
  try {
    const contentId = req.params.id;
    const { title, description, price } = req.body;
    const userId = req.user.id;
    
    // Get content
    const content = await Content.findById(contentId);
    
    if (!content) {
      return res.status(404).json({
        error: 'Content not found'
      });
    }
    
    // Get creator and verify ownership
    const creator = await Creator.findById(content.creator_id);
    
    if (creator.user_id !== userId) {
      return res.status(403).json({
        error: 'You do not own this content'
      });
    }
    
    // Update
    const updated = await Content.update(
      contentId,
      title || content.title,
      description !== undefined ? description : content.description,
      price !== undefined ? price : content.price
    );
    
    res.json({
      message: 'Content updated',
      content: updated
    });
    
  } catch (err) {
    console.error('updateContent error:', err);
    res.status(500).json({
      error: 'Server error'
    });
  }
};

// Delete content
// Only owner can delete
export const deleteContent = async (req, res) => {
  try {
    const contentId = req.params.id;
    const userId = req.user.id;
    
    // Get content
    const content = await Content.findById(contentId);
    
    if (!content) {
      return res.status(404).json({
        error: 'Content not found'
      });
    }
    
    // Verify ownership
    const creator = await Creator.findById(content.creator_id);
    
    if (creator.user_id !== userId) {
      return res.status(403).json({
        error: 'You do not own this content'
      });
    }
    
    // Delete (soft delete)
    await Content.delete(contentId);
    
    res.json({
      message: 'Content deleted'
    });
    
  } catch (err) {
    console.error('deleteContent error:', err);
    res.status(500).json({
      error: 'Server error'
    });
  }
};

// Browse all published content
// Anyone can view
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