import express from 'express';
import { register, login } from '../controllers/authController.js';

const router = express.Router();

// POST /api/auth/register
// Body: { email, username, password, passwordConfirm }
router.post('/register', register);

// POST /api/auth/login
// Body: { email, password }
router.post('/login', login);

export default router;