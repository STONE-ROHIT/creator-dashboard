import jwt from 'jsonwebtoken';

// Middleware that checks if request has valid JWT token
// If token is valid, adds user info to req.user
// If token is missing or invalid, returns 401

export const authenticate = (req, res, next) => {
  try {
    // Extract token from Authorization header
    // Format: "Bearer eyJhbGciOi..."
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided'
      });
    }
    
    // Get token part (remove "Bearer " prefix)
    const token = authHeader.substring(7); // Skip "Bearer "
    
    // Verify token signature
    // If signature is invalid, this throws error
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Token is valid, attach user info to request
    // Now controller can access req.user.id, req.user.role
    req.user = decoded;
    
    next();
    
  } catch (err) {
    // Token is invalid or expired
    console.error('Auth error:', err.message);
    return res.status(401).json({
      error: 'Invalid or expired token'
    });
  }
};

// Middleware that checks if user is a creator
// Use after authenticate middleware
export const requireCreator = async (req, res, next) => {
  try {
    // User must be authenticated first
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated'
      });
    }
    
    // User must have 'creator' role
    if (req.user.role !== 'creator') {
      return res.status(403).json({
        error: 'Only creators can access this'
      });
    }
    
    next();
    
  } catch (err) {
    res.status(500).json({
      error: 'Server error'
    });
  }
};