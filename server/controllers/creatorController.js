import Creator from '../models/Creator.js';
import User from '../models/User.js';
import { generateToken } from '../utils/tokenGenerator.js';

/**
 * Convert subscriber to creator
 * 
 * IMPORTANT: This endpoint issues a NEW token with updated role
 * Client MUST use this new token for subsequent requests
 * 
 * Why new token?
 * - JWT tokens are immutable once signed
 * - Role stored in token (for stateless auth)
 * - When role changes, token must be reissued
 * - Otherwise old token still has 'subscriber' role
 * 
 * This is the immediate fix for the JWT staleness problem
 */
export const becomeCreator = async (req, res) => {
  try {
    const userId = req.user.id;
    const { displayName } = req.body;
    
    // Validate input
    if (!displayName || displayName.length < 3) {
      return res.status(400).json({
        error: 'Display name must be at least 3 characters'
      });
    }
    
    // Check if already a creator
    const existingCreator = await Creator.findByUserId(userId);
    if (existingCreator) {
      return res.status(409).json({
        error: 'You are already a creator'
      });
    }
    
    // Create creator profile
    const creator = await Creator.create(userId, displayName);
    
    // Update user role in database
    await User.updateRole(userId, 'creator');
    
    // CRITICAL: Generate NEW token with creator role
    // Without this, user's JWT still says 'subscriber'
    const newToken = generateToken(userId, 'creator');
    
    res.status(201).json({
      message: 'You are now a creator',
      creator,
      token: newToken,  // <-- Client MUST use this
      instructions: 'Use this new token in Authorization header for all requests'
    });
    
  } catch (err) {
    console.error('becomeCreator error:', err);
    res.status(500).json({
      error: 'Server error'
    });
  }
};

// Rest of controller unchanged...

export const getCreator = async (req, res) => {
  try {
    const creatorId = req.params.id;
    
    const creator = await Creator.findWithUserInfo(creatorId);
    
    if (!creator) {
      return res.status(404).json({
        error: 'Creator not found'
      });
    }
    
    res.json(creator);
    
  } catch (err) {
    console.error('getCreator error:', err);
    res.status(500).json({
      error: 'Server error'
    });
  }
};

export const getMyCreatorProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const creator = await Creator.findByUserId(userId);
    
    if (!creator) {
      return res.status(404).json({
        error: 'You are not a creator. Call /become-creator first.'
      });
    }
    
    res.json(creator);
    
  } catch (err) {
    console.error('getMyCreatorProfile error:', err);
    res.status(500).json({
      error: 'Server error'
    });
  }
};

export const updateCreatorProfile = async (req, res) => {
  try {
    const creatorId = req.creator.id;
    const { displayName, bio, bankAccount } = req.body;
    
    if (displayName && displayName.length < 3) {
      return res.status(400).json({
        error: 'Display name must be at least 3 characters'
      });
    }
    
    const creator = await Creator.update(
      creatorId,
      displayName || req.creator.display_name,
      bio || req.creator.bio,
      bankAccount || req.creator.bank_account
    );
    
    res.json({
      message: 'Creator profile updated',
      creator
    });
    
  } catch (err) {
    console.error('updateCreatorProfile error:', err);
    res.status(500).json({
      error: 'Server error'
    });
  }
};