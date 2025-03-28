import express from 'express';
import passport from 'passport';
import { 
  getUserProfile,
  updateUserProfile,
  getUserStats,
  getFavoriteRepositories,
  addRepositoryToFavorites,
  removeRepositoryFromFavorites,
  getRecentIngestedRepositories
} from '../controllers/userController';
import { validate } from '../middleware/validation';
import { rateLimiter } from '../middleware/rateLimiter';
import { 
  updateProfileValidator,
  favoriteRepositoryValidator
} from '../validators/userValidators';

const router = express.Router();
const auth = passport.authenticate('jwt', { session: false });

// Rate limiter for user routes
const userRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
});

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, getUserProfile);

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put(
  '/profile', 
  auth, 
  validate(updateProfileValidator),
  updateUserProfile
);

// @route   GET /api/users/stats
// @desc    Get user statistics
// @access  Private
router.get('/stats', auth, getUserStats);

// @route   GET /api/users/favorites
// @desc    Get user's favorite repositories
// @access  Private
router.get('/favorites', auth, getFavoriteRepositories);

// @route   GET /api/users/recent-repositories
// @desc    Get user's recently ingested repositories
// @access  Private
router.get('/recent-repositories', auth, getRecentIngestedRepositories);

// @route   POST /api/users/favorites/:repositoryId
// @desc    Add a repository to favorites
// @access  Private
router.post(
  '/favorites/:repositoryId', 
  auth, 
  validate(favoriteRepositoryValidator),
  addRepositoryToFavorites
);

// @route   DELETE /api/users/favorites/:repositoryId
// @desc    Remove a repository from favorites
// @access  Private
router.delete(
  '/favorites/:repositoryId', 
  auth, 
  validate(favoriteRepositoryValidator),
  removeRepositoryFromFavorites
);

export default router;
