import Subscription from '../models/Subscription.js';
import Content from '../models/Content.js';

/**
 * Subscribe user to content
 * 
 * Business rule checks (in order):
 * 1. Content must exist
 * 2. Content must be paid (is_free = false)
 * 3. User must not be creator
 * 4. Unique constraint: can't subscribe twice
 */
export const subscribeToContent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { contentId } = req.body;

    // Validate input
    if (!contentId) {
      return res.status(400).json({
        error: 'contentId is required'
      });
    }

    // 1. Verify content exists
    const content = await Content.findById(contentId);
    if (!content) {
      return res.status(404).json({
        error: 'Content not found'
      });
    }

    // 2. Check if content is free
    // Free content doesn't require subscription
    if (content.is_free) {
      return res.status(400).json({
        error: 'This content is free. No subscription needed.'
      });
    }

    // 3. Check if user is creator
    // Creator already has access, no subscription needed
    if (content.creator_id === userId) {
      return res.status(400).json({
        error: 'You cannot subscribe to your own content'
      });
    }

    // 4. Create subscription
    // Unique constraint prevents duplicates
    const subscription = await Subscription.create(userId, contentId);

    res.status(201).json({
      message: 'Successfully subscribed',
      subscription
    });

  } catch (err) {
    // Handle unique constraint violation
    if (err.message.includes('Already subscribed')) {
      return res.status(409).json({
        error: 'You are already subscribed to this content'
      });
    }

    console.error('subscribeToContent error:', err);
    res.status(500).json({
      error: 'Server error'
    });
  }
};

/**
 * Get user's subscriptions
 * Only shows active subscriptions
 */
export const getUserSubscriptions = async (req, res) => {
  try {
    const userId = req.user.id;

    const subscriptions = await Subscription.findByUserIdActive(userId);

    res.json({
      subscription_count: subscriptions.length,
      subscriptions
    });

  } catch (err) {
    console.error('getUserSubscriptions error:', err);
    res.status(500).json({
      error: 'Server error'
    });
  }
};

/**
 * Cancel subscription
 * User loses access to content
 */
export const cancelSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const userId = req.user.id;

    if (!subscriptionId) {
      return res.status(400).json({
        error: 'subscriptionId is required'
      });
    }

    // Model verifies user owns subscription
    const subscription = await Subscription.cancel(subscriptionId, userId);

    res.json({
      message: 'Subscription cancelled',
      subscription
    });

  } catch (err) {
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({
        error: 'Cannot cancel subscription you don\'t own'
      });
    }

    if (err.message.includes('not found')) {
      return res.status(404).json({
        error: 'Subscription not found'
      });
    }

    console.error('cancelSubscription error:', err);
    res.status(500).json({
      error: 'Server error'
    });
  }
};