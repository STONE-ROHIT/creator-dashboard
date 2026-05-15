import Content from '../models/Content.js';
import Creator from '../models/Creator.js';

// Check if user owns this content
// Use when user tries to edit/delete content
export const checkContentOwnership = async (req, res, next) => {
  try {
    const contentId = req.params.id;
    const userId = req.user.id;
    
    // Get content from database
    const content = await Content.findById(contentId);
    
    if (!content) {
      return res.status(404).json({
        error: 'Content not found'
      });
    }
    
    // Get creator profile for this user
    const creator = await Creator.findByUserId(userId);
    
    if (!creator) {
      return res.status(403).json({
        error: 'You must be a creator to manage content'
      });
    }
    
    // Check if content belongs to this creator
    if (content.creator_id !== creator.id) {
      return res.status(403).json({
        error: 'You do not own this content'
      });
    }
    
    // All checks passed, attach content and creator to request
    req.content = content;
    req.creator = creator;
    
    next();
    
  } catch (err) {
    console.error('Authorization error:', err);
    res.status(500).json({
      error: 'Server error'
    });
  }
};

// Check if user is the creator of a specific creator profile
export const checkCreatorOwnership = async (req, res, next) => {
  try {
    const creatorId = req.params.id;
    const userId = req.user.id;
    
    // Get creator
    const creator = await Creator.findById(creatorId);
    
    if (!creator) {
      return res.status(404).json({
        error: 'Creator not found'
      });
    }
    
    // Check if this user is the creator
    if (creator.user_id !== userId) {
      return res.status(403).json({
        error: 'You do not have permission to modify this creator profile'
      });
    }
    
    req.creator = creator;
    next();
    
  } catch (err) {
    console.error('Authorization error:', err);
    res.status(500).json({
      error: 'Server error'
    });
  }
};