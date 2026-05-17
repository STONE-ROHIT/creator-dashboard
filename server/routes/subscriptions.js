import express from 'express';
import {
  subscribeToContent,
  getUserSubscriptions,
  cancelSubscription
} from '../controllers/subscriptionController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// POST /api/subscriptions - Subscribe to content
router.post('/', authenticate, subscribeToContent);

// GET /api/subscriptions - Get user's subscriptions
router.get('/', authenticate, getUserSubscriptions);

// DELETE /api/subscriptions/:subscriptionId - Cancel subscription
router.delete('/:subscriptionId', authenticate, cancelSubscription);

export default router;