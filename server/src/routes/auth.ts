import express from 'express';
import passport from 'passport';
import { githubCallback, getCurrentUser, logout } from '../controllers/authController';
import { validate } from '../middleware/validation';
import { rateLimiter } from '../middleware/rateLimiter';
import { config } from '../config/config';

const router = express.Router();

// Rate limiter for authentication routes
const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many authentication attempts, please try again later',
});

// @route   GET /api/auth/github
// @desc    Authenticate with GitHub
// @access  Public
router.get(
  '/github',
  authRateLimiter,
  passport.authenticate('github', { scope: ['user:email', 'repo'] })
);

// @route   GET /api/auth/github/callback
// @desc    GitHub auth callback
// @access  Public
router.get(
  '/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: '/login' }),
  githubCallback
);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get(
  '/me',
  passport.authenticate('jwt', { session: false }),
  getCurrentUser
);

// @route   POST /api/auth/logout
// @desc    Logout user (client-side only, just for completeness)
// @access  Public
router.post('/logout', logout);

export default router;
