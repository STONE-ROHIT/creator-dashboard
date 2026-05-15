import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { validateEmail, validatePassword } from '../utils/validators.js';

// Generate JWT token
// Why separate function? Because we'll use it in both register and login
const generateToken = (userId, role) => {
  // Create token with user's ID and role
  const token = jwt.sign(
    { id: userId, role },          // Payload (what's inside the token)
    process.env.JWT_SECRET,        // Secret (only server knows this)
    { expiresIn: '1h' }            // Options (token valid for 1 hour)
  );
  
  return token;
};

// Register a new user
export const register = async (req, res) => {
  try {
    // Step 1: Get data from request body
    const { email, username, password, passwordConfirm } = req.body;
    
    // Step 2: Validate inputs (prevent garbage data)
    if (!email || !username || !password || !passwordConfirm) {
      return res.status(400).json({
        error: 'All fields are required'
      });
    }
    
    // Check if passwords match
    if (password !== passwordConfirm) {
      return res.status(400).json({
        error: 'Passwords do not match'
      });
    }
    
    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }
    
    // Validate password strength
    if (!validatePassword(password)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters'
      });
    }
    
    // Step 3: Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: 'Email already registered'
      });
    }
    
    // Step 4: Create user in database
    const user = await User.create(email, username, password);
    
    // Step 5: Return success
    res.status(201).json({
      message: 'User registered successfully',
      user,
      // Note: We don't send token on register, only on login
      // Why? It's a design choice. Some apps do, some don't.
    });
    
  } catch (err) {
    // Database errors, unexpected errors
    console.error('Register error:', err);
    res.status(500).json({
      error: 'Server error during registration'
    });
  }
};

// Login an existing user
export const login = async (req, res) => {
  try {
    // Step 1: Get email and password from request
    const { email, password } = req.body;
    
    // Step 2: Validate inputs
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }
    
    // Step 3: Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      // Don't tell attacker if email exists or not
      // Say "invalid credentials" for both wrong email AND wrong password
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }
    
    // Step 4: Verify password
    const isPasswordValid = await User.verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }
    
    // Step 5: Generate JWT token
    const token = generateToken(user.id, user.role);
    
    // Step 6: Return success with token
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