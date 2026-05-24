import express from 'express';
import {
  subscribeToContent,
  getUserSubscriptions,
  cancelSubscription,
  activateSubscriptionForTesting
} from '../controllers/subscriptionController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/subscriptions - Subscribe to content
 * Creates pending subscription (awaiting payment)
 */
router.post('/', authenticate, subscribeToContent);

/**
 * GET /api/subscriptions - Get user's subscriptions
 * Returns all (active, pending, cancelled)
 */
router.get('/', authenticate, getUserSubscriptions);

/**
 * DELETE /api/subscriptions/:subscriptionId - Cancel subscription
 */
router.delete('/:subscriptionId', authenticate, cancelSubscription);

/**
 * POST /api/subscriptions/:subscriptionId/activate-testing
 * DEVELOPMENT ONLY
 * Manually activate pending subscription for testing
 * Used before payment integration is complete
 */
router.post('/:subscriptionId/activate-testing', authenticate, activateSubscriptionForTesting);

export default router;