import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import Repository from '../models/Repository';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { getRepository } from '../utils/github';
import { redisService } from '../services/redisService';

/**
 * Get all repositories for the authenticated user
 */
export const getUserRepositories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    const repositories = await Repository.find({ owner: user._id }).sort({ updatedAt: -1 });
    
    res.json(repositories);
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch repositories from GitHub API
 */
export const getGitHubRepositories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    const githubToken = user.githubToken;
    
    // Check if we have cached results
    const cacheKey = `github:repos:${user._id}`;
    const cachedRepos = await redisService.get(cacheKey);
    
    if (cachedRepos) {
      return res.json(JSON.parse(cachedRepos));
    }
    
    // Fetch repositories from GitHub API
    const response = await axios.get('https://api.github.com/user/repos', {
      headers: {
        Authorization: `token ${githubToken}`,
      },
      params: {
        sort: 'updated',
        per_page: 100,
      },
    });
    
    const repositories = response.data;
    
    // Cache the results for 5 minutes
    await redisService.set(cacheKey, JSON.stringify(repositories), 300);
    
    res.json(repositories);
  } catch (error: any) {
    logger.error('Error fetching GitHub repositories:', error);
    
    if (error.response?.status === 401) {
      return next(new AppError('GitHub authentication token expired or invalid', 401));
    }
    
    next(error);
  }
};

/**
 * Sync GitHub repositories to database
 */
export const syncRepositories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    const githubToken = user.githubToken;
    const force = req.body.force || false;
    
    // Fetch repositories from GitHub API
    const response = await axios.get('https://api.github.com/user/repos', {
      headers: {
        Authorization: `token ${githubToken}`,
      },
      params: {
        sort: 'updated',
        per_page: 100,
      },
    });
    
    const githubRepos = response.data;
    const savedRepos = [];
    
    // Upsert repositories to the database
    for (const repo of githubRepos) {
      const repoData = {
        owner: user._id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description || '',
        githubId: repo.id.toString(),
        isPrivate: repo.private,
        language: repo.language || 'Unknown',
        url: repo.html_url,
        cloneUrl: repo.clone_url,
        defaultBranch: repo.default_branch,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        size: repo.size,
      };
      
      // Find if repo already exists in our db
      const existingRepo = await Repository.findOne({
        owner: user._id,
        githubId: repo.id.toString(),
      });
      
      if (existingRepo) {
        // Only update if forced or repository has been updated
        if (force || new Date(repo.updated_at) > existingRepo.updatedAt) {
          const updatedRepo = await Repository.findByIdAndUpdate(
            existingRepo._id,
            repoData,
            { new: true }
          );
          savedRepos.push(updatedRepo);
        } else {
          savedRepos.push(existingRepo);
        }
      } else {
        // Create new repo
        const newRepo = new Repository(repoData);
        await newRepo.save();
        savedRepos.push(newRepo);
      }
    }
    
    // Update the cache
    const cacheKey = `github:repos:${user._id}`;
    await redisService.set(cacheKey, JSON.stringify(githubRepos), 300);
    
    res.json(savedRepos);
  } catch (error: any) {
    logger.error('Error syncing repositories:', error);
    
    if (error.response?.status === 401) {
      return next(new AppError('GitHub authentication token expired or invalid', 401));
    }
    
    next(error);
  }
};

/**
 * Get a repository by ID
 */
export const getRepositoryById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repository = await Repository.findById(req.params.id);
    
    if (!repository) {
      return next(new AppError('Repository not found', 404));
    }
    
    // Check if user is the owner
    const user = req.user as any;
    if (repository.owner.toString() !== user._id.toString()) {
      return next(new AppError('Not authorized', 403));
    }
    
    res.json(repository);
  } catch (error) {
    next(error);
  }
};

/**
 * Get branches for a repository
 */
export const fetchRepositoryBranches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repository = await Repository.findById(req.params.id);
    
    if (!repository) {
      return next(new AppError('Repository not found', 404));
    }
    
    // Check if user is the owner
    const user = req.user as any;
    if (repository.owner.toString() !== user._id.toString()) {
      return next(new AppError('Not authorized', 403));
    }
    
    // Check cache first
    const cacheKey = `github:branches:${repository._id}`;
    const cachedBranches = await redisService.get(cacheKey);
    
    if (cachedBranches) {
      return res.json(JSON.parse(cachedBranches));
    }
    
    // Fetch branches from GitHub API
    const [owner, repo] = repository.fullName.split('/');
    const response = await axios.get(`https://api.github.com/repos/${repository.fullName}/branches`, {
      headers: {
        Authorization: `token ${user.githubToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    
    // Cache the results for 1 hour
    await redisService.set(cacheKey, JSON.stringify(response.data), 3600);
    
    res.json(response.data);
  } catch (error: any) {
    logger.error('Error fetching repository branches:', error);
    
    if (error.response?.status === 401) {
      return next(new AppError('GitHub authentication token expired or invalid', 401));
    } else if (error.response?.status === 404) {
      return next(new AppError('Repository not found on GitHub', 404));
    }
    
    next(error);
  }
};
