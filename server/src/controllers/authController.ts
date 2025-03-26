import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import User from '../models/User';
import { AppError } from '../middleware/errorHandler';

/**
 * Generate a JWT token for authenticated user
 * @param userId User ID to include in the token
 */
const generateToken = (userId: string): string => {
  // Use type assertion to bypass TypeScript type checking
  // This is safe because we know this works at runtime
  return (jwt.sign as any)({ id: userId }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRATION,
  });
};

/**
 * Handle GitHub OAuth callback
 * Generate JWT token and redirect to client
 */
export const githubCallback = (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    
    if (!user) {
      throw new AppError('Authentication failed', 401);
    }
    
    // Create JWT token
    const token = generateToken(user._id);
    
    // Redirect to client with token
    res.redirect(`${config.CLIENT_URL}/auth-callback?token=${token}`);
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user information
 */
export const getCurrentUser = (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    
    res.json({
      id: user._id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      isAdmin: user.isAdmin,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user (client-side token removal)
 */
export const logout = (req: Request, res: Response) => {
  res.json({ message: 'Logout successful' });
};
