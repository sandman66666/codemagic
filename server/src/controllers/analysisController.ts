import { Request, Response, NextFunction } from 'express';
import { Document, Types } from 'mongoose';
import Repository from '../models/Repository';
import Analysis from '../models/Analysis';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { analyzeRepository } from '../services/analyzeRepository';
import { redisService } from '../services/redisService';
import { repositoryIngestService } from '../services/repositoryIngestService';
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
    
    logger.info(`Processing repository with gitingest: ${repository.name} (${repositoryId})`);
    
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
        const result = await repositoryIngestService.processRepository(repoPath, repoId);
        
        // Clean up temporary repo if we created one
        if (temporaryRepoCreated) {
          try {
            await rimrafPromise(repoPath);
          } catch (cleanupError) {
            logger.warn(`Failed to clean up temporary repository, but processing succeeded: ${cleanupError}`);
          }
        }
        
        res.json({
          success: true,
          message: 'Repository processed with gitingest',
          result
        });
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
    logger.info(`Processing public repository with gitingest: ${repositoryUrl}`);
    
    try {
      // Pass URL directly to gitingest through our service
      const result = await repositoryIngestService.processRepository(repositoryUrl, processingId);
      
      try {
        // Get the repository content
        const content = await repositoryIngestService.getRepositoryContent(processingId);
        
        res.json({
          success: true,
          message: 'Repository processed with gitingest',
          processingId,
          content
        });
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
