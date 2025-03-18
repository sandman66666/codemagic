import { Request, Response, NextFunction } from 'express';
import Repository from '../models/Repository';
import Analysis from '../models/Analysis';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { analyzeRepository } from '../services/analyzeRepository';
import { redisService } from '../services/redisService';

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
 * Start a new analysis
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
    
    // Start analysis in the background
    analyzeRepository(repository, analysis._id.toString(), branch, user, filters)
      .catch(err => logger.error('Analysis error:', err));
    
    res.status(201).json(analysis);
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
    const analysis = await Analysis.findById(req.params.id).select('status startedAt completedAt');
    
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
          name: analysis.repository.name,
          fullName: analysis.repository.fullName,
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
