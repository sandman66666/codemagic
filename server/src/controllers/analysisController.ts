import { Request, Response, NextFunction } from 'express';
import { Document, Types } from 'mongoose';
import Repository from '../models/Repository';
import Analysis from '../models/Analysis';
import IngestedRepository from '../models/IngestedRepository';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { analyzeRepository } from '../services/analyzeRepository';
import { redisService } from '../services/redisService';
import { repositoryIngestService } from '../services/repositoryIngestService';
import { fetchGitHubRepoMetadata } from '../utils/githubUtils';
import fs from 'fs';
import path from 'path';
import { SimpleGit, simpleGit } from 'simple-git';
import { v4 as uuidv4 } from 'uuid';
import { promisify } from 'util';
import { exec } from 'child_process';

// Import rimraf with any type to avoid TS errors
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rimraf = require('rimraf');
const rimrafPromise = promisify(rimraf);
const execPromise = promisify(exec);

/**
 * Get all analyses for the authenticated user
 */
export const getUserAnalyses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    const analyses = await Analysis.find({ user: user._id })
      .populate('repository', 'name fullName')
      .sort({ createdAt: -1 });
    
    res.json(analyses);
  } catch (error) {
    next(error);
  }
};

/**
  // Start a new analysis
 */
export const startAnalysis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { repositoryId, branch, filters } = req.body;
    
    if (!repositoryId || !branch) {
      return next(new AppError('Repository ID and branch are required', 400));
    }
    
    const user = req.user as any;
    const repository = await Repository.findById(repositoryId);
    
    if (!repository) {
      return next(new AppError('Repository not found', 404));
    }
    
    // Check if user is the owner
    if (repository.owner.toString() !== user._id.toString()) {
      return next(new AppError('Not authorized', 403));
    }
    
    // Check if analysis already in progress
    const existingAnalysis = await Analysis.findOne({
      repository: repository._id,
      user: user._id,
      branch,
      status: { $in: ['pending', 'processing'] }
    });
    
    if (existingAnalysis) {
      return next(new AppError('Analysis already in progress for this repository and branch', 409));
    }
    
    // Create a new analysis entry
    const analysis = new Analysis({
      repository: repository._id,
      user: user._id,
      branch,
      status: 'pending',
      commit: 'fetching...',
    });
    
    await analysis.save();
    
    // Start analysis in the background using gitingest
    analyzeRepository(
      repository as any, 
      (analysis._id as Types.ObjectId).toString(), 
      branch, 
      user, 
      filters
    )
      .catch(err => logger.error('Analysis error:', err));
    
    res.status(201).json(analysis);
  } catch (error) {
    next(error);
  }
};

/**
 * Process a repository with gitingest
 */
export const processRepositoryWithGitIngest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { repositoryId } = req.params;
    
    if (!repositoryId) {
      return next(new AppError('Repository ID is required', 400));
    }
    
    const user = req.user as any;
    const repository = await Repository.findById(repositoryId);
    
    if (!repository) {
      return next(new AppError('Repository not found', 404));
    }
    
    // Check if user is the owner
    if (repository.owner.toString() !== user._id.toString()) {
      return next(new AppError('Not authorized', 403));
    }
    
    logger.info(`[INGEST] Processing repository with gitingest: ${repository.name} (${repositoryId})`);
    
    const repoId = (repository._id as Types.ObjectId).toString();
    let repoPath: string = '';
    let temporaryRepoCreated = false;
    
    try {
      // Check if Python/gitingest is installed before proceeding
      try {
        await execPromise('python -c "import gitingest"');
      } catch (pythonError) {
        logger.error(`Python/gitingest check failed: ${pythonError}`);
        // Instead of failing silently, return a detailed error to the client
        return next(new AppError('Python or gitingest library is not available. Please ensure Python and gitingest are properly installed.', 500));
      }
      
      // First check if the repository already exists in temp directory
      let repoFolders = [];
      try {
        repoFolders = fs.readdirSync(repositoryIngestService.tempDir);
      } catch (readError) {
        logger.error(`Error reading temp directory: ${readError}`);
        await fs.promises.mkdir(repositoryIngestService.tempDir, { recursive: true });
        logger.info(`Created temp directory: ${repositoryIngestService.tempDir}`);
        repoFolders = [];
      }
      
      const repoFolder = repoFolders.find(folder => folder.startsWith(repoId));
      
      if (repoFolder) {
        // Repository folder exists, use it
        repoPath = path.join(repositoryIngestService.tempDir, repoFolder);
        logger.info(`Using existing repository folder: ${repoPath}`);
      } else {
        // Repository folder doesn't exist, clone it
        temporaryRepoCreated = true;
        repoPath = path.join(repositoryIngestService.tempDir, `${repoId}-${Date.now()}`);
        logger.info(`Cloning repository to temporary folder: ${repoPath}`);
        
        try {
          // Clone the repository (similar to analyzeRepository)
          const git: SimpleGit = simpleGit();
          const cloneUrl = repository.cloneUrl.replace(
            'https://',
            `https://${user.githubToken}@`
          );
          
          await git.clone(cloneUrl, repoPath);
          
          // Check out the default branch
          const localGit = simpleGit(repoPath);
          await localGit.checkout(repository.defaultBranch || 'main');
        } catch (gitError) {
          logger.error(`Git clone error: ${gitError}`);
          return next(new AppError(`Failed to clone repository: ${gitError.message}`, 500));
        }
      }
      
      // Process the repository with gitingest using the path
      try {
        logger.info(`[INGEST] Starting gitingest processing for: ${repository.name} (${repositoryId})`);
        const result = await repositoryIngestService.processRepository(repoPath, repoId);
        logger.info(`[INGEST] gitingest processing completed successfully for: ${repository.name} (${repositoryId})`);
        
        // Get repository content
        logger.info(`[INGEST] Fetching repository content for: ${repository.name} (${repositoryId})`);
        const content = await repositoryIngestService.getRepositoryContent(repoId);
        
        // Properly handle content based on actual type
        const contentInfo = (() => {
          if (typeof content === 'string') {
            return `string of length ${(content as string).length}`;
          } else if (content && typeof content === 'object') {
            return `object with keys: ${Object.keys(content as object).join(', ')}`;
          } else {
            return 'undefined or null';
          }
        })();
        
        logger.info(`[INGEST] Repository content fetched successfully: ${repository.name} (${repositoryId}), content: ${contentInfo}`);
        
        try {
          // Fetch GitHub metadata
          logger.info(`[INGEST] Fetching GitHub metadata for: ${repository.cloneUrl}`);
          const githubMetadata = await fetchGitHubRepoMetadata(
            repository.cloneUrl, 
            user.githubToken
          );
          
          if (githubMetadata) {
            logger.info(`[INGEST] GitHub metadata fetched successfully for: ${repository.name}`);
          } else {
            logger.warn(`[INGEST] Could not fetch GitHub metadata for: ${repository.name}`);
          }
          
          // Save repository and ingest data to IngestedRepository model
          logger.info(`[INGEST] Saving to IngestedRepository for: ${repository.name} (${repositoryId})`);
          
          // Create IngestedRepository document with flattened structure
          const ingestedRepository = new IngestedRepository({
            repository: repositoryId,
            repositoryUrl: repository.cloneUrl,
            user: user._id,
            processingId: repoId,
            ingestData: {
              // If content is an object with nested fields, extract them
              content: typeof content === 'object' && content?.content ? content.content : content,
              summary: typeof content === 'object' && content?.summary ? content.summary : null,
              fileTree: typeof content === 'object' && content?.tree ? content.tree : null,
              stats: result.stats || null,
              metadata: result.metadata || null
            },
            // Add GitHub metadata if available
            githubMetadata: githubMetadata || undefined,
            isPublic: githubMetadata ? !githubMetadata.isPrivate : true
          });
          
          // Save to database
          const savedRepo = await ingestedRepository.save();
          logger.info(`[INGEST] Successfully saved to IngestedRepository: ${repository.name} (${repositoryId}), document ID: ${savedRepo._id}`);
          
          // Clean up temporary repo if we created one
          if (temporaryRepoCreated) {
            try {
              await rimrafPromise(repoPath);
              logger.info(`[INGEST] Cleaned up temporary repository folder: ${repoPath}`);
            } catch (cleanupError) {
              logger.warn(`Failed to clean up temporary repository, but processing succeeded: ${cleanupError}`);
            }
          }
          
          res.json({
            success: true,
            message: 'Repository processed with gitingest',
            result,
            ingestedRepositoryId: savedRepo._id // Return the ID of the saved document
          });
        } catch (saveError) {
          logger.error(`[INGEST] Error saving to IngestedRepository: ${saveError.message}`);
          logger.error(`[INGEST] Error details:`, saveError);
          
          // Still return success to the client, but log the error
          res.json({
            success: true,
            message: 'Repository processed with gitingest, but data was not saved to database',
            result,
            error: saveError.message
          });
        }
      } catch (processError) {
        logger.error(`Repository processing error: ${processError}`);
        
        // Clean up temporary repo if we created one and an error occurred
        if (temporaryRepoCreated && repoPath && fs.existsSync(repoPath)) {
          try {
            await rimrafPromise(repoPath);
          } catch (cleanupError) {
            logger.warn(`Failed to clean up temporary repository after error: ${cleanupError}`);
          }
        }
        
        // Return a more detailed error response to the client
        return next(new AppError(`Repository processing failed: ${processError.message}`, 500));
      }
    } catch (error) {
      // Clean up temporary repo if we created one and an error occurred
      if (temporaryRepoCreated && repoPath && fs.existsSync(repoPath)) {
        try {
          await rimrafPromise(repoPath);
        } catch (cleanupError) {
          logger.warn(`Failed to clean up temporary repository after error: ${cleanupError}`);
        }
      }
      
      logger.error(`Error in processRepositoryWithGitIngest: ${error}`);
      next(new AppError(`Repository processing failed: ${error.message}`, 500));
    }
  } catch (error) {
    logger.error(`Error processing repository with gitingest: ${error}`);
    next(new AppError(`Repository processing failed: ${error.message}`, 500));
  }
};

/**
 * Get ingested repository content
 */
export const getIngestedRepositoryContent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { repositoryId, contentType } = req.params;
    
    if (!repositoryId) {
      return next(new AppError('Repository ID is required', 400));
    }
    
    const user = req.user as any;
    const repository = await Repository.findById(repositoryId);
    
    if (!repository) {
      return next(new AppError('Repository not found', 404));
    }
    
    // Check if user is the owner
    if (repository.owner.toString() !== user._id.toString()) {
      return next(new AppError('Not authorized', 403));
    }
    
    // Check if repository has been processed
    const repoId = (repository._id as Types.ObjectId).toString();
    if (!repositoryIngestService.isRepositoryProcessed(repoId)) {
      return next(new AppError('Repository has not been processed with gitingest', 404));
    }
    
    // Get the repository content
    const content = await repositoryIngestService.getRepositoryContent(repoId);
    
    // Return specific content type if requested
    if (contentType === 'summary') {
      res.send(content.summary);
    } else if (contentType === 'tree') {
      res.send(content.tree);
    } else if (contentType === 'content') {
      res.send(content.content);
    } else {
      // Return all content
      res.json(content);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Check if repository has been processed with gitingest
 */
export const checkRepositoryProcessed = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { repositoryId } = req.params;
    
    if (!repositoryId) {
      return next(new AppError('Repository ID is required', 400));
    }
    
    const user = req.user as any;
    const repository = await Repository.findById(repositoryId);
    
    if (!repository) {
      return next(new AppError('Repository not found', 404));
    }
    
    // Check if user is the owner
    if (repository.owner.toString() !== user._id.toString()) {
      return next(new AppError('Not authorized', 403));
    }
    
    // Check if repository has been processed with gitingest
    const repoId = (repository._id as Types.ObjectId).toString();
    const processed = repositoryIngestService.isRepositoryProcessed(repoId);
    
    res.json({ processed });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific analysis by ID
 */
export const getAnalysisById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const analysis = await Analysis.findById(req.params.id)
      .populate('repository', 'name fullName githubId url');
    
    if (!analysis) {
      return next(new AppError('Analysis not found', 404));
    }
    
    // Check if user is the owner
    const user = req.user as any;
    if (analysis.user.toString() !== user._id.toString()) {
      return next(new AppError('Not authorized', 403));
    }
    
    res.json(analysis);
  } catch (error) {
    next(error);
  }
};

/**
 * Get the status of an analysis
 */
export const getAnalysisStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const analysis = await Analysis.findById(req.params.id).select('status startedAt completedAt user');
    
    if (!analysis) {
      return next(new AppError('Analysis not found', 404));
    }
    
    // Check if user is the owner (with safe null checking)
    const user = req.user as any;
    
    // Skip ownership check if user or user._id is undefined (likely in development)
    if (!user || !user._id) {
      logger.warn('User object or user._id is undefined in getAnalysisStatus');
    } else if (analysis.user && analysis.user.toString() !== user._id.toString()) {
      return next(new AppError('Not authorized', 403));
    }
    
    res.json(analysis);
  } catch (error) {
    logger.error('Error in getAnalysisStatus:', error);
    next(error);
  }
};

/**
 * Delete an analysis
 */
export const deleteAnalysis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const analysis = await Analysis.findById(req.params.id);
    
    if (!analysis) {
      return next(new AppError('Analysis not found', 404));
    }
    
    // Check if user is the owner
    const user = req.user as any;
    if (analysis.user.toString() !== user._id.toString()) {
      return next(new AppError('Not authorized', 403));
    }
    
    await Analysis.deleteOne({ _id: analysis._id });
    
    res.json({ message: 'Analysis deleted' });
  } catch (error) {
    next(error);
  }
};

/**
 * Compare multiple analyses
 */
export const compareAnalyses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { analysisIds } = req.body;
    const user = req.user as any;
    
    // Fetch all analyses and check ownership
    const analyses = await Analysis.find({
      _id: { $in: analysisIds },
      user: user._id,
      status: 'completed'
    }).populate('repository', 'name fullName');
    
    if (analyses.length !== analysisIds.length) {
      return next(new AppError('One or more analyses not found or not completed', 404));
    }
    
    // Prepare comparison results
    const comparison = {
      analyses: analyses.map(analysis => ({
        id: analysis._id,
        repository: {
          id: analysis.repository._id,
          name: (analysis.repository as any).name,
          fullName: (analysis.repository as any).fullName,
        },
        branch: analysis.branch,
        commit: analysis.commit,
        completedAt: analysis.completedAt,
        summary: analysis.summary,
      })),
      comparisonDate: new Date(),
    };
    
    res.json(comparison);
  } catch (error) {
    next(error);
  }
};

/**
 * Process a public repository with gitingest without authentication
 */
export const processPublicRepositoryWithGitIngest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { repositoryUrl } = req.body;
    
    if (!repositoryUrl) {
      return next(new AppError('Repository URL is required', 400));
    }
    
    // Validate GitHub URL format
    const githubUrlRegex = /^https:\/\/github\.com\/[^\/]+\/[^\/]+/;
    if (!githubUrlRegex.test(repositoryUrl)) {
      return next(new AppError('Invalid GitHub repository URL', 400));
    }
    
    // Check if Python/gitingest is installed before proceeding
    try {
      await execPromise('python -c "import gitingest"');
    } catch (pythonError) {
      logger.error(`Python/gitingest check failed: ${pythonError}`);
      return next(new AppError('Python or gitingest library is not available. Please ensure Python and gitingest are properly installed.', 500));
    }
    
    // Generate a unique ID for this repository processing
    const processingId = uuidv4();
    const repoPath = path.join(repositoryIngestService.tempDir, `public-${processingId}`);
    
    // Process the repository with gitingest directly using the URL
    logger.info(`[INGEST] Processing public repository with gitingest: ${repositoryUrl}, processingId: ${processingId}`);
    
    try {
      // Pass URL directly to gitingest through our service
      logger.info(`[INGEST] Starting gitingest processing for public repo: ${repositoryUrl}`);
      const result = await repositoryIngestService.processRepository(repositoryUrl, processingId);
      logger.info(`[INGEST] gitingest processing completed successfully for public repo: ${repositoryUrl}`);
      
      try {
        // Get the repository content
        logger.info(`[INGEST] Fetching repository content for public repo: ${repositoryUrl}`);
        const content = await repositoryIngestService.getRepositoryContent(processingId);
        
        // Properly handle content based on actual type
        const contentInfo = (() => {
          if (typeof content === 'string') {
            return `string of length ${(content as string).length}`;
          } else if (content && typeof content === 'object') {
            return `object with keys: ${Object.keys(content as object).join(', ')}`;
          } else {
            return 'undefined or null';
          }
        })();
        
        logger.info(`[INGEST] Repository content fetched successfully for public repo: ${repositoryUrl}, content: ${contentInfo}`);
        
        try {
          // Fetch GitHub metadata
          logger.info(`[INGEST] Fetching GitHub metadata for public repo: ${repositoryUrl}`);
          // For public repos, we don't have a token, so we use the public API
          const githubMetadata = await fetchGitHubRepoMetadata(repositoryUrl);
          
          if (githubMetadata) {
            logger.info(`[INGEST] GitHub metadata fetched successfully for public repo: ${repositoryUrl}`);
          } else {
            logger.warn(`[INGEST] Could not fetch GitHub metadata for public repo: ${repositoryUrl}`);
          }
          
          // Save repository and ingest data to IngestedRepository model
          logger.info(`[INGEST] Saving to IngestedRepository for public repo: ${repositoryUrl}`);
          
          // Create IngestedRepository document with flattened structure
          const ingestedRepository = new IngestedRepository({
            repositoryUrl,
            user: (req.user as any)?._id || null, // Optional: store user if authenticated
            processingId,
            ingestData: {
              // If content is an object with nested fields, extract them
              content: typeof content === 'object' && content?.content ? content.content : content,
              summary: typeof content === 'object' && content?.summary ? content.summary : null,
              fileTree: typeof content === 'object' && content?.tree ? content.tree : null,
              stats: result.stats || null,
              metadata: result.metadata || null
            },
            // Add GitHub metadata if available
            githubMetadata: githubMetadata || undefined,
            isPublic: githubMetadata ? !githubMetadata.isPrivate : true
          });
          
          // Save to database
          const savedRepo = await ingestedRepository.save();
          logger.info(`[INGEST] Successfully saved to IngestedRepository for public repo: ${repositoryUrl}, document ID: ${savedRepo._id}`);
          
          res.json({
            success: true,
            message: 'Repository processed with gitingest',
            processingId,
            content,
            ingestedRepositoryId: savedRepo._id // Return the ID of the saved document
          });
        } catch (saveError) {
          logger.error(`[INGEST] Error saving to IngestedRepository for public repo: ${saveError.message}`);
          logger.error(`[INGEST] Error details:`, saveError);
          
          // Still return success but with an error message about saving
          res.json({
            success: true,
            message: 'Repository processed with gitingest, but data was not saved to database',
            processingId,
            content,
            error: saveError.message
          });
        }
      } catch (contentError) {
        logger.error(`Error getting repository content: ${contentError}`);
        res.status(206).json({
          success: true,
          message: 'Repository processed with gitingest, but content retrieval failed',
          processingId,
          result,
          error: contentError.message
        });
      }
    } catch (processError) {
      logger.error(`Error processing public repository: ${processError}`);
      return next(new AppError(`Repository processing failed: ${processError.message}`, 500));
    }
  } catch (error) {
    logger.error(`Error processing public repository: ${error}`);
    next(new AppError(`Repository processing failed: ${error.message}`, 500));
  }
};

/**
 * Format analysis result for API response
 */
const formatAnalysisResult = (analysis: typeof Analysis.prototype): any => {
  return {
    id: analysis._id,
    repository: analysis.repository,
    branch: analysis.branch,
    status: analysis.status,
    summary: analysis.summary,
    insights: analysis.insights,
    vulnerabilities: analysis.vulnerabilities,
    codeQuality: analysis.codeQuality,
    createdAt: analysis.createdAt,
    updatedAt: analysis.updatedAt,
  };
};
