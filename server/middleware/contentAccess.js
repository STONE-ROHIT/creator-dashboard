import jwt from 'jsonwebtoken';
import Content from '../models/Content.js';
import Subscription from '../models/Subscription.js';

/**
 * contentAccess middleware
 *
 * Determines whether the requesting user can view the content.
 * On 403 (locked), returns full content metadata so the frontend
 * can render a locked-preview + subscribe CTA.
 *
 * Access hierarchy:
 *   1. Free content           → everyone passes
 *   2. Paid + not logged in   → 401
 *   3. Paid + creator bypass  → FIXED: compares creator_user_id from JOIN (not creator_id)
 *   4. Paid + active sub      → passes
 *   5. Paid + no active sub   → 403 with full content metadata
 */
export const checkContentAccess = async (req, res, next) => {
  try {
    const contentId = req.params.id;

    // --- Extract user from JWT (optional — public content doesn't require auth) ---
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id; // users.id
      } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
    }

    // --- Load content (includes creator_user_id via JOIN in model) ---
    const content = await Content.findById(contentId);
    if (!content) return res.status(404).json({ error: 'Content not found' });

    // 1. Free content — anyone can view
    if (content.is_free) {
      req.content = content;
      return next();
    }

    // 2. Paid + unauthenticated
    if (!userId) {
      return res.status(401).json({ error: 'Login required to view paid content' });
    }

    // 3. FIXED: Creator bypass — content.creator_user_id is users.id (from JOIN in Content.findById)
    //    Previously compared content.creator_id (creators.id) vs userId (users.id) — wrong spaces!
    if (content.creator_user_id === userId) {
      req.content = content;
      return next();
    }

    // 4. Active subscription check
    const subscription = await Subscription.findActive(userId, contentId);
    if (subscription) {
      req.content = content;
      req.subscription = subscription;
      return next();
    }

    // 5. Locked — return full content metadata for the locked preview UI
    return res.status(403).json({
      error: 'Subscribe to access this content',
      locked: true,
      content: {
        id:                   content.id,
        creator_id:           content.creator_id,
        title:                content.title,
        description:          content.description,
        file_url:             content.file_url,
        price:                content.price,   // already cast to float in model
        is_free:              content.is_free,
        views_count:          content.views_count,
        created_at:           content.created_at,
        creator_display_name: content.creator_display_name,
        creator_bio:          content.creator_bio,
      },
    });
  } catch (err) {
    console.error('contentAccess error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * checkContentOwnership — used on PUT/DELETE routes
 * Verifies the authenticated user's creator profile owns the content.
 */
export const checkContentOwnership = async (req, res, next) => {
  try {
    const contentId = req.params.id;
    const content = await Content.findById(contentId);

    if (!content) return res.status(404).json({ error: 'Content not found' });

    // content.creator_user_id = the creator's users.id (from JOIN in Content.findById)
    if (content.creator_user_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this content' });
    }

    req.content = content;
    next();
  } catch (err) {
    console.error('contentOwnership error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
