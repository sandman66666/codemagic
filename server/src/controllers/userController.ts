import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import Repository from '../models/Repository';
import Analysis from '../models/Analysis';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

/**
 * Get user profile with repository and analysis counts
 */
export const getUserProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    
    // Get user's repositories and analysis counts
    const repositories = await Repository.countDocuments({ owner: user._id });
    const analyses = await Analysis.countDocuments({ user: user._id });
    
    res.json({
      id: user._id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      repositories,
      analyses,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    const { displayName, email } = req.body;
    
    // Update fields that users are allowed to change
    if (displayName) user.displayName = displayName;
    if (email) user.email = email;
    
    await user.save();
    
    res.json({
      id: user._id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user statistics
 */
export const getUserStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    
    // Get total repositories count
    const repositoriesCount = await Repository.countDocuments({ owner: user._id });
    
    // Get total analyses count
    const analysesCount = await Analysis.countDocuments({ user: user._id });
    
    // Get completed analyses count
    const completedAnalysesCount = await Analysis.countDocuments({ 
      user: user._id,
      status: 'completed' 
    });
    
    // Get languages count from repositories
    const repositories = await Repository.find({ owner: user._id });
    const languages: { [key: string]: number } = {};
    
    repositories.forEach(repo => {
      if (repo.language) {
        languages[repo.language] = (languages[repo.language] || 0) + 1;
      }
    });
    
    // Get recent analyses
    const recentAnalyses = await Analysis.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('repository', 'name fullName');
    
    res.json({
      repositoriesCount,
      analysesCount,
      completedAnalysesCount,
      languages,
      recentAnalyses,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's favorite repositories
 */
export const getFavoriteRepositories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    
    // Fetch user with populated favorites
    const userWithFavorites = await User.findById(user._id).populate('favorites');
    
    // If favorites field doesn't exist or is empty, return an empty array
    if (!userWithFavorites || !userWithFavorites.favorites) {
      return res.json([]);
    }
    
    // Format repositories for response
    const repositories = userWithFavorites.favorites.map((repo: typeof Repository.prototype) => ({
      id: repo._id,
      name: repo.name,
      fullName: repo.fullName,
      description: repo.description,
      language: repo.language,
      stars: repo.stars,
      forks: repo.forks,
      url: repo.url,
    }));
    
    res.json(repositories);
  } catch (error) {
    next(error);
  }
};

/**
 * Add a repository to favorites
 * This is a placeholder implementation
 */
export const addRepositoryToFavorites = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    const { repositoryId } = req.params;
    
    // Check if repository exists
    const repository = await Repository.findById(repositoryId);
    if (!repository) {
      return next(new AppError('Repository not found', 404));
    }
    
    // In a real implementation, you would add the repository to a favorites collection or field
    res.json({ message: 'Repository added to favorites' });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a repository from favorites
 * This is a placeholder implementation
 */
export const removeRepositoryFromFavorites = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    const { repositoryId } = req.params;
    
    // In a real implementation, you would remove the repository from a favorites collection or field
    res.json({ message: 'Repository removed from favorites' });
  } catch (error) {
    next(error);
  }
};
