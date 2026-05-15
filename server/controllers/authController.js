import User from '../models/User.js';
import { generateToken } from '../utils/tokenGenerator.js';
import { validateEmail, validatePassword } from '../utils/validators.js';

// Register a new user
export const register = async (req, res) => {
  try {
    const { email, username, password, passwordConfirm } = req.body;
    
    // Validate inputs
    if (!email || !username || !password || !passwordConfirm) {
      return res.status(400).json({
        error: 'All fields are required'
      });
    }
    
    if (password !== passwordConfirm) {
      return res.status(400).json({
        error: 'Passwords do not match'
      });
    }
    
    if (!validateEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }
    
    if (!validatePassword(password)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters'
      });
    }
    
    // Check if user exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: 'Email already registered'
      });
    }
    
    // Create user
    const user = await User.create(email, username, password);
    
    res.status(201).json({
      message: 'User registered successfully',
      user,
    });
    
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({
      error: 'Server error during registration'
    });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }
    
    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }
    
    // Verify password
    const isPasswordValid = await User.verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }
    
    // CHANGED: Use centralized token generator
    const token = generateToken(user.id, user.role);
    
    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      }
    });
    
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      error: 'Server error during login'
    });
  }
};