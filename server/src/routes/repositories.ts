import express from 'express';
import passport from 'passport';
import { 
  getUserRepositories,
  getGitHubRepositories,
  syncRepositories,
  getRepositoryById,
  fetchRepositoryBranches
} from '../controllers/repositoryController';
import { validate } from '../middleware/validation';
import { rateLimiter } from '../middleware/rateLimiter';
import { 
  repositoryIdValidator,
  syncRepositoriesValidator 
} from '../validators/repositoryValidators';

const router = express.Router();
const auth = passport.authenticate('jwt', { session: false });

// Standard rate limiter for repository routes
const repoRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
});

// @route   GET /api/repositories
// @desc    Get user's repositories from our database
// @access  Private
router.get('/', auth, getUserRepositories);

// @route   GET /api/repositories/github
// @desc    Get user's repositories from GitHub API
// @access  Private
router.get('/github', auth, repoRateLimiter, getGitHubRepositories);

// @route   POST /api/repositories/sync
// @desc    Sync GitHub repositories to our database
// @access  Private
router.post(
  '/sync', 
  auth, 
  repoRateLimiter,
  validate(syncRepositoriesValidator),
  syncRepositories
);

// @route   GET /api/repositories/:id
// @desc    Get a repository by ID
// @access  Private
router.get(
  '/:id', 
  auth, 
  validate(repositoryIdValidator),
  getRepositoryById
);

// @route   GET /api/repositories/:id/branches
// @desc    Get branches for a repository
// @access  Private
router.get(
  '/:id/branches', 
  auth, 
  validate(repositoryIdValidator),
  repoRateLimiter,
  fetchRepositoryBranches
);

export default router;
