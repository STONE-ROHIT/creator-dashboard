import jwt from 'jsonwebtoken';
import Content from '../models/Content.js';
import Subscription from '../models/Subscription.js';

/**
 * Check content access
 * 
 * CRITICAL: 403 responses MUST include full content metadata
 * So frontend can show locked preview
 */
export const checkContentAccess = async (req, res, next) => {
  try {
    const { id: contentId } = req.params;

    let userId = null;
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (err) {
        return res.status(401).json({
          error: 'Invalid or expired token'
        });
      }
    }

    // Get content
    const content = await Content.findById(contentId);

    if (!content) {
      return res.status(404).json({
        error: 'Content not found'
      });
    }

    // ===== ACCESS CONTROL HIERARCHY =====

    // Level 1: FREE CONTENT (everyone)
    if (content.is_free) {
      req.content = content;
      return next();
    }

    // Level 2: PAID CONTENT REQUIRES AUTH
    if (!userId) {
      return res.status(401).json({
        error: 'Login required to view paid content'
      });
    }

    // Level 3: CREATOR BYPASS
    if (content.creator_id === userId) {
      req.content = content;
      return next();
    }

    // Level 4: SUBSCRIPTION CHECK
    const subscription = await Subscription.findActive(userId, contentId);

    if (!subscription) {
      // ✅ CRITICAL: Return FULL content metadata on 403
      // Frontend needs this to show locked preview
      return res.status(403).json({
        error: 'Must subscribe to view this content',
        locked: true,
        content: {
          id: content.id,
          creator_id: content.creator_id,
          title: content.title,
          description: content.description,
          file_url: content.file_url,
          price: parseFloat(content.price),  // ✅ Ensure number
          is_free: content.is_free,
          views_count: content.views_count,
          created_at: content.created_at
        }
      });
    }

    // User has subscription
    req.content = content;
    req.subscription = subscription;
    next();

  } catch (err) {
    console.error('contentAccess middleware error:', err);
    res.status(500).json({
      error: 'Server error'
    });
  }
};

/**
 * Check content ownership
 */
export const checkContentOwnership = async (req, res, next) => {
  try {
    const { id: contentId } = req.params;
    const userId = req.user.id;

    const content = await Content.findById(contentId);

    if (!content) {
      return res.status(404).json({
        error: 'Content not found'
      });
    }

    if (content.creator_id !== userId) {
      return res.status(403).json({
        error: 'Only content creator can modify'
      });
    }

    req.content = content;
    next();

  } catch (err) {
    console.error('contentOwnership check error:', err);
    res.status(500).json({
      error: 'Server error'
    });
  }
};