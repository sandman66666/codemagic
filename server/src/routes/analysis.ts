import express from 'express';
import passport from 'passport';
import { 
  getUserAnalyses,
  startAnalysis,
  getAnalysisById,
  getAnalysisStatus,
  deleteAnalysis,
  compareAnalyses,
  processRepositoryWithGitIngest,
  getIngestedRepositoryContent,
  processPublicRepositoryWithGitIngest
} from '../controllers/analysisController';
import { validate } from '../middleware/validation';
import { rateLimiter } from '../middleware/rateLimiter';
import { 
  analysisIdValidator,
  startAnalysisValidator,
  compareAnalysesValidator
} from '../validators/analysisValidators';

const router = express.Router();
const auth = passport.authenticate('jwt', { session: false });

// Standard rate limiter for analysis routes
const analysisRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
});

// Stricter rate limiter for starting new analyses (resource intensive)
// Use a more lenient limit in development mode
const isDevelopment = process.env.NODE_ENV !== 'production';
const startAnalysisRateLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDevelopment ? 1000 : 10, // Higher limit in development mode
  message: 'Too many analysis requests, please try again later',
});

// Public rate limiter for public repository processing
const publicRepoRateLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDevelopment ? 50 : 5, // Stricter limit for public endpoint
  message: 'Too many analysis requests, please try again later',
});

// @route   POST /api/analyses
// @desc    Start a new analysis (root endpoint for client compatibility)
// @access  Private
router.post(
  '/', 
  auth, 
  startAnalysisRateLimiter,
  validate(startAnalysisValidator),
  startAnalysis
);

// @route   GET /api/analysis
// @desc    Get all analyses for the authenticated user
// @access  Private
router.get('/', auth, getUserAnalyses);

// @route   POST /api/analysis/start
// @desc    Start a new analysis
// @access  Private
router.post(
  '/start', 
  auth, 
  startAnalysisRateLimiter,
  validate(startAnalysisValidator),
  startAnalysis
);

// @route   GET /api/analysis/:id
// @desc    Get a specific analysis by ID
// @access  Private
router.get(
  '/:id', 
  auth, 
  validate(analysisIdValidator),
  getAnalysisById
);

// @route   GET /api/analysis/:id/status
// @desc    Get the status of an analysis
// @access  Private
router.get(
  '/:id/status', 
  auth, 
  validate(analysisIdValidator),
  getAnalysisStatus
);

// @route   DELETE /api/analysis/:id
// @desc    Delete an analysis
// @access  Private
router.delete(
  '/:id', 
  auth, 
  validate(analysisIdValidator),
  deleteAnalysis
);

// @route   POST /api/analysis/compare
// @desc    Compare multiple analyses
// @access  Private
router.post(
  '/compare', 
  auth, 
  analysisRateLimiter,
  validate(compareAnalysesValidator),
  compareAnalyses
);
// @route   POST /api/analysis/repository/:repositoryId/ingest
// @desc    Process a repository with gitingest
// @access  Private
router.post(
  '/repository/:repositoryId/ingest',
  auth,
  processRepositoryWithGitIngest
);

// @route   GET /api/analysis/repository/:repositoryId/ingest/:contentType?
// @desc    Get ingested repository content (summary, tree, or content)
// @access  Private
router.get(
  '/repository/:repositoryId/ingest/:contentType?',
  auth,
  getIngestedRepositoryContent
);

// @route   POST /api/analysis/public/ingest
// @desc    Process a public repository with gitingest without authentication
// @access  Public
router.post(
  '/public/ingest',
  publicRepoRateLimiter,
  processPublicRepositoryWithGitIngest
);

export default router;
