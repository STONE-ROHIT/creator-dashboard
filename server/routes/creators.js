import express from 'express';
import {
  becomeCreator,
  getCreator,
  getMyCreatorProfile,
  updateCreatorProfile
} from '../controllers/creatorController.js';
import { authenticate, requireCreator } from '../middleware/auth.js';
import { checkCreatorOwnership } from '../middleware/authorization.js';

const router = express.Router();

// POST /api/creators/become-creator
// Convert user to creator
router.post('/become-creator', authenticate, becomeCreator);

// GET /api/creators/me
// Get current user's creator profile
router.get('/me', authenticate, getMyCreatorProfile);

// GET /api/creators/:id
// Get any creator's public profile
router.get('/:id', getCreator);

// PUT /api/creators/:id
// Update creator profile (only owner)
router.put(
  '/:id',
  authenticate,
  checkCreatorOwnership,
  updateCreatorProfile
);

export default router;