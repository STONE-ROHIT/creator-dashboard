import Subscription from '../models/Subscription.js';
import Content from '../models/Content.js';

/**
 * Subscribe user to content
 * Creates pending subscription (awaiting payment)
 */
export const subscribeToContent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { contentId } = req.body;

    if (!contentId) {
      return res.status(400).json({
        error: 'contentId is required'
      });
    }

    // Verify content exists
    const content = await Content.findById(contentId);
    if (!content) {
      return res.status(404).json({
        error: 'Content not found'
      });
    }

    // Check if free
    if (content.is_free) {
      return res.status(400).json({
        error: 'This content is free. No subscription needed.'
      });
    }

    // Check if creator
    if (content.creator_id === userId) {
      return res.status(400).json({
        error: 'You cannot subscribe to your own content'
      });
    }

    // Create subscription (status: 'pending')
    const subscription = await Subscription.create(userId, contentId);

    res.status(201).json({
      message: 'Successfully subscribed',
      subscription
    });

  } catch (err) {
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
 * Get user's subscriptions (all status)
 * Returns both active and pending
 */
export const getUserSubscriptions = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all subscriptions (active, pending, cancelled)
    const subscriptions = await Subscription.findByUserIdAll(userId);

    // Separate by status
    const active = subscriptions.filter(s => s.status === 'active');
    const pending = subscriptions.filter(s => s.status === 'pending');
    const cancelled = subscriptions.filter(s => s.status === 'cancelled');

    res.json({
      subscriptions,
      summary: {
        total: subscriptions.length,
        active: active.length,
        pending: pending.length,
        cancelled: cancelled.length
      }
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

/**
 * NEW: Activate subscription (for dev testing)
 * 
 * DEVELOPMENT ONLY
 * Allows manually activating pending subscriptions without payment
 * Used for testing before Razorpay integration
 * 
 * In production, only webhook activates subscriptions
 */
export const activateSubscriptionForTesting = async (req, res) => {
  try {
    // Security: Only in development
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        error: 'This endpoint is only available in development'
      });
    }

    const { subscriptionId } = req.params;
    const userId = req.user.id;

    if (!subscriptionId) {
      return res.status(400).json({
        error: 'subscriptionId is required'
      });
    }

    // Verify subscription exists and belongs to user
    const subscription = await Subscription.findById(subscriptionId);

    if (!subscription) {
      return res.status(404).json({
        error: 'Subscription not found'
      });
    }

    if (subscription.user_id !== userId) {
      return res.status(403).json({
        error: 'Unauthorized'
      });
    }

    if (subscription.status !== 'pending') {
      return res.status(400).json({
        error: `Subscription is already ${subscription.status}`
      });
    }

    // Get content to get price
    const content = await Content.findById(subscription.content_id);
    if (!content) {
      return res.status(404).json({
        error: 'Content not found'
      });
    }

    // Activate subscription
    const paidAmount = parseFloat(content.price);
    const activated = await Subscription.activate(subscriptionId, paidAmount);

    res.json({
      message: 'Subscription activated (dev testing)',
      subscription: activated,
      warning: 'This was activated manually for testing. In production, only webhooks activate subscriptions.'
    });

  } catch (err) {
    console.error('activateSubscriptionForTesting error:', err);
    res.status(500).json({
      error: 'Server error'
    });
  }
};