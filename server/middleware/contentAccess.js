import jwt from 'jsonwebtoken';
import Content from '../models/Content.js';
import Subscription from '../models/Subscription.js';

/**
 * CRITICAL MIDDLEWARE: Determine if user can access content
 * 
 * Access hierarchy (in order):
 * 1. Free content (is_free=true) → anyone can view
 * 2. Paid content + not authenticated → 401
 * 3. Paid content + creator → creator always sees own
 * 4. Paid content + subscriber → check active subscription
 * 5. Else → 403 (has access to paid but no subscription)
 * 
 * Why this order?
 * - Check free first (cheapest, no DB queries)
 * - Reject unauth early (avoid pointless subscription check)
 * - Creator check (should pass to allowed access)
 * - Subscription check (most expensive, last)
 * 
 * Security:
 * - User ID extracted from JWT (can't be faked)
 * - Content verified in database (can't be tampered)
 * - Subscription status explicitly checked (not implicit)
 */
export const checkContentAccess = async (req, res, next) => {
  try {
    const { id: contentId } = req.params;

    // Extract user ID from JWT if present
    let userId = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (err) {
        // Invalid or expired token
        return res.status(401).json({
          error: 'Invalid or expired token'
        });
      }
    }

    // Get content from database
    const content = await Content.findById(contentId);

    if (!content) {
      return res.status(404).json({
        error: 'Content not found'
      });
    }

    // ===== ACCESS CONTROL HIERARCHY =====

    // Level 1: FREE CONTENT
    // Anyone (authenticated or not) can view free content
    // This is the KEY FIX: is_free=true is source of truth
    if (content.is_free) {
      req.content = content;
      return next();
    }

    // Level 2: PAID CONTENT REQUIRES AUTHENTICATION
    // Paid content is not publicly accessible
    if (!userId) {
      return res.status(401).json({
        error: 'Login required to view paid content'
      });
    }

    // Level 3: CREATOR CAN VIEW OWN CONTENT
    // Creator doesn't need subscription to view their own content
    // This is an implicit right of ownership
    if (content.creator_id === userId) {
      req.content = content;
      return next();
    }

    // Level 4: SUBSCRIBER CHECK
    // For paid content by someone else, must have active subscription
    // This is the most critical security check
    const subscription = await Subscription.findActive(userId, contentId);

    if (!subscription) {
      return res.status(403).json({
        error: 'Must subscribe to view this content',
        content_price: content.price
      });
    }

    // User has subscription, can view
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
 * Used for edit/delete operations
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