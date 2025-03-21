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

// Import rimraf with any type to avoid TS errors
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rimraf = require('rimraf');
const rimrafPromise = promisify(rimraf);

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
    
    // Process the repository with gitingest
    // We need to use the repository ID format that's created when cloned
    // This typically includes the MongoDB ID and a timestamp
    const repoFolders = fs.readdirSync(repositoryIngestService.tempDir);
    const repoId = (repository._id as Types.ObjectId).toString();
    const repoFolder = repoFolders.find(folder => folder.startsWith(repoId));
    
    if (!repoFolder) {
      return next(new AppError('Repository not found in temp directory. It may need to be analyzed first.', 404));
    }
    
    const result = await repositoryIngestService.processRepository(repoFolder, repoId);
    
    res.json({
      success: true,
      message: 'Repository processed with gitingest',
      result
    });
  } catch (error) {
    next(error);
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
    
    // Generate a unique ID for this repository processing
    const processingId = uuidv4();
    const repoPath = path.join(repositoryIngestService.tempDir, `public-${processingId}`);
    
    // Process the repository with gitingest directly using the URL
    logger.info(`Processing public repository with gitingest: ${repositoryUrl}`);
    
    // Pass URL directly to gitingest through our service
    const result = await repositoryIngestService.processRepository(repositoryUrl, processingId);
    
    // Get the repository content
    const content = await repositoryIngestService.getRepositoryContent(processingId);
    
    res.json({
      success: true,
      message: 'Repository processed with gitingest',
      processingId,
      content
    });
  } catch (error) {
    logger.error(`Error processing public repository: ${error}`);
    next(error);
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
