import express from 'express';
import {
  uploadContent,
  getContent,
  getMyContent,
  updateContent,
  deleteContent,
  browseContent
} from '../controllers/contentController.js';
import { authenticate, requireCreator } from '../middleware/auth.js';

const router = express.Router();

// POST /api/content
// Upload new content (creators only)
router.post('/', authenticate, requireCreator, uploadContent);

// GET /api/content/my
// Get current user's content
router.get('/my', authenticate, requireCreator, getMyContent);

// GET /api/content/browse
// Browse all published content
router.get('/browse', browseContent);

// GET /api/content/:id
// Get specific content
router.get('/:id', getContent);

// PUT /api/content/:id
// Update content (owner only)
router.put('/:id', authenticate, requireCreator, updateContent);

// DELETE /api/content/:id
// Delete content (owner only)
router.delete('/:id', authenticate, requireCreator, deleteContent);

export default router;