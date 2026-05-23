import express from 'express';
import {
  uploadContent,
  getContent,
  getMyContent,
  updateContent,
  deleteContent,
  browseContent,
  recordContentView
} from '../controllers/contentController.js';
import { authenticate, requireCreator } from '../middleware/auth.js';
import { checkContentAccess, checkContentOwnership } from '../middleware/contentAccess.js';

const router = express.Router();

// POST /api/content - Upload content (creator only)
router.post('/', authenticate, requireCreator, uploadContent);

// GET /api/content/my - Get own content (creator only)
// Specific routes BEFORE generic routes
router.get('/my', authenticate, requireCreator, getMyContent);

// GET /api/content/browse - Browse all published content (public)
router.get('/browse', browseContent);

// GET /api/content/:id - Get specific content with access check
// No view increment here (side effects removed)
router.get('/:id', checkContentAccess, getContent);

// POST /api/content/:id/view - Record view
// NEW: Separate endpoint for analytics
// Auth optional (unauthenticated views count too)
router.post('/:id/view', recordContentView);

// PUT /api/content/:id - Update content (owner only)
router.put('/:id', authenticate, requireCreator, checkContentOwnership, updateContent);

// DELETE /api/content/:id - Delete content (owner only)
router.delete('/:id', authenticate, requireCreator, checkContentOwnership, deleteContent);

export default router;