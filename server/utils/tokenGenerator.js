import jwt from 'jsonwebtoken';

/**
 * Generate JWT token with user claims
 * 
 * Token payload contains:
 * - id: user database ID
 * - role: user role (subscriber or creator)
 * 
 * Token is signed with JWT_SECRET
 * Token expires in 1 hour
 * 
 * Why role in token?
 * - Avoids database query on every request (stateless)
 * - Fast authorization checks
 * - Scalable (no session storage)
 * 
 * Problem: Role becomes stale until token expiry
 * Solution: Issue new token when role changes
 * 
 * Future (Week 5): Refresh tokens will solve this more elegantly
 */
export const generateToken = (userId, role) => {
  if (!userId || !role) {
    throw new Error('userId and role are required for token generation');
  }

  // Validate role
  if (!['subscriber', 'creator'].includes(role)) {
    throw new Error(`Invalid role: ${role}. Must be 'subscriber' or 'creator'`);
  }

  try {
    const token = jwt.sign(
      {
        id: userId,
        role: role,
        iat: Math.floor(Date.now() / 1000), // Issued at (for debugging)
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '1h',
        algorithm: 'HS256',
      }
    );

    return token;
  } catch (err) {
    console.error('Token generation error:', err);
    throw new Error('Failed to generate token');
  }
};

/**
 * Verify and decode JWT token
 * Returns decoded payload if valid
 * Throws error if invalid or expired
 */
export const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (err) {
    throw new Error(`Token verification failed: ${err.message}`);
  }
};

/**
 * Decode token without verification
 * Useful for debugging/logging what's in the token
 * DO NOT USE FOR SECURITY DECISIONS
 */
export const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (err) {
    return null;
  }
};