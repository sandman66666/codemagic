import { Request, Response, NextFunction } from 'express';
import passport from 'passport';

/**
 * Authentication middleware for protected routes
 */
export const auth = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('jwt', { session: false }, (err: any, user: any, info: any) => {
    if (err) {
      return next(err);
    }
    
    if (!user) {
      return res.status(401).json({
        message: 'Authentication failed. Token is invalid or expired.',
      });
    }
    
    req.user = user;
    next();
  })(req, res, next);
};

/**
 * Check if the user is an admin
 */
export const adminOnly = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && (req.user as any).isAdmin) {
    return next();
  }
  
  return res.status(403).json({
    message: 'Access denied. Admin privileges required.',
  });
};
