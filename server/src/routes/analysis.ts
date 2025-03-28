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
  checkRepositoryProcessed,
  processPublicRepositoryWithGitIngest
} from '../controllers/analysisController';
import { validate } from '../middleware/validation';
import { rateLimiter } from '../middleware/rateLimiter';
import { 
  analysisIdValidator,
  startAnalysisValidator,
  compareAnalysesValidator
} from '../validators/analysisValidators';
import IngestedRepository from '../models/IngestedRepository';
import { logger } from '../utils/logger';

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

// @route   GET /api/analysis/repository/:repositoryId/processed
// @desc    Check if repository has been processed with gitingest
// @access  Private
router.get(
  '/repository/:repositoryId/processed',
  auth,
  checkRepositoryProcessed
);

// @route   POST /api/analysis/public/ingest
// @desc    Process a public repository with gitingest without authentication
// @access  Public
router.post(
  '/public/ingest',
  publicRepoRateLimiter,
  processPublicRepositoryWithGitIngest
);

// @route   GET /api/analysis/test-ingested-repo
// @desc    Test endpoint to verify IngestedRepository model is working
// @access  Public - explicitly no authentication
router.get('/test-ingested-repo', async (req, res) => {
  logger.info('[TEST] Accessing test-ingested-repo endpoint');
  try {
    // Create a test record
    const testRepo = new IngestedRepository({
      repositoryUrl: 'https://github.com/test/repo',
      processingId: `test-${Date.now()}`,
      ingestData: {
        content: 'Test content',
        summary: 'Test summary',
      },
      isPublic: true
    });
    
    // Try to save it
    const savedRepo = await testRepo.save();
    
    // Find all IngestedRepository records
    const allRepos = await IngestedRepository.find({}).lean();
    
    logger.info(`[TEST] Test save successful. Record ID: ${savedRepo._id}`);
    logger.info(`[TEST] Found ${allRepos.length} records in IngestedRepository collection`);
    
    res.json({
      success: true,
      savedRepoId: savedRepo._id,
      message: 'Test repository saved successfully',
      totalCount: allRepos.length,
      allRepos: allRepos
    });
  } catch (error) {
    logger.error('[TEST] Error in test endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// @route   GET /api/analysis/ingested-repositories
// @desc    Get all ingested repositories
// @access  Public
router.get('/ingested-repositories', async (req, res) => {
  try {
    const ingestedRepos = await IngestedRepository.find({})
      .select('_id repositoryUrl processingId user isPublic createdAt')
      .sort({ createdAt: -1 })
      .lean();
    
    logger.info(`Retrieved ${ingestedRepos.length} ingested repositories`);
    
    res.json({
      success: true,
      count: ingestedRepos.length,
      repositories: ingestedRepos
    });
  } catch (error) {
    logger.error('Error retrieving ingested repositories:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   GET /api/analysis/ingested-repositories/:id
// @desc    Get a specific ingested repository by ID
// @access  Public
router.get('/ingested-repositories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Repository ID is required' 
      });
    }
    
    const ingestedRepo = await IngestedRepository.findById(id).lean();
    
    if (!ingestedRepo) {
      return res.status(404).json({ 
        success: false, 
        message: 'Repository not found' 
      });
    }
    
    logger.info(`Retrieved ingested repository with ID: ${id}`);
    
    res.json({
      success: true,
      repository: ingestedRepo
    });
  } catch (error) {
    logger.error(`Error retrieving ingested repository: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
