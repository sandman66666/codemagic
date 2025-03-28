import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import IngestedRepository from '../models/IngestedRepository';
import AIInsight from '../models/AIInsight';
import { extractGitHubInfo } from '../utils/githubUtils';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';
import { RepositoryIngestService } from '../services/repositoryIngestService';

dotenv.config();

const router = express.Router();
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MAX_CONTENT_TOKENS = 90000; // Limiting content size to avoid token limits

// Initialize the repository ingest service
const repositoryIngestService = new RepositoryIngestService();

// Middleware to check if API key is configured
const checkApiKey = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ 
      message: 'Claude API key is not configured. Please add ANTHROPIC_API_KEY to your .env file.' 
    });
  }
  next();
};

/**
 * Helper function to truncate content to a specific length
 */
const truncateContent = (content: string | null, maxLength = 80000): string => {
  if (!content) return 'Repository content unavailable';
  if (content.length <= maxLength) return content;
  
  return content.substring(0, maxLength) + 
    "\n\n[Content truncated due to length limitations. This is a portion of the full repository content.]";
};

/**
 * Fetch repository content from the ingested repository or the files
 */
const getRepositoryContent = async (repositoryUrl: string): Promise<{ content: string | null, metadata: any }> => {
  try {
    // Normalize repository URL to handle potential differences in format
    const repoInfo = extractGitHubInfo(repositoryUrl);
    if (!repoInfo) {
      logger.warn(`Could not extract owner/repo from URL: ${repositoryUrl}`);
      return { content: null, metadata: null };
    }
    
    const fullName = `${repoInfo.owner}/${repoInfo.repo}`;
    
    // Try to find by full repository name in githubMetadata
    let ingestedRepo = await IngestedRepository.findOne({
      'githubMetadata.fullName': fullName
    }).sort({ createdAt: -1 }).lean();
    
    // If not found, try to find by repositoryUrl
    if (!ingestedRepo) {
      // Try with and without .git suffix
      const urlsToTry = [
        repositoryUrl,
        repositoryUrl.endsWith('.git') ? repositoryUrl.slice(0, -4) : `${repositoryUrl}.git`
      ];
      
      ingestedRepo = await IngestedRepository.findOne({
        repositoryUrl: { $in: urlsToTry }
      }).sort({ createdAt: -1 }).lean();
    }
    
    if (!ingestedRepo) {
      logger.warn(`No ingested repository found for: ${repositoryUrl}`);
      return { content: null, metadata: null };
    }
    
    logger.info(`Found ingested repository for: ${repositoryUrl}, ID: ${ingestedRepo._id}`);
    
    // Use the repository ingest service to get the full content from the files
    try {
      const repoId = ingestedRepo._id.toString();
      const fullContent = await repositoryIngestService.getRepositoryContent(repoId);
      
      // Log content size to debug
      logger.info(`Content size from files for ${repositoryUrl}: ${fullContent.content.length} characters`);
      logger.info(`Content sample: ${fullContent.content.substring(0, 200)}...`);
      
      return { 
        content: fullContent.content,
        metadata: ingestedRepo.githubMetadata || null
      };
    } catch (contentError) {
      // If we can't read from files, fall back to the content in the database
      logger.warn(`Failed to read content from files: ${contentError.message}`);
      logger.warn(`Falling back to database content for ${repositoryUrl}`);
      
      const dbContent = ingestedRepo.ingestData?.content || null;
      
      // Log the fallback content size
      logger.info(`Fallback content size for ${repositoryUrl}: ${dbContent ? dbContent.length : 0} characters`);
      if (dbContent) {
        logger.info(`Fallback content sample: ${dbContent.substring(0, 200)}...`);
      }
      
      return { 
        content: dbContent,
        metadata: ingestedRepo.githubMetadata || null 
      };
    }
  } catch (error) {
    logger.error(`Error fetching repository content: ${error.message}`);
    return { content: null, metadata: null };
  }
};

// AI Insights endpoint
router.post('/insights', async (req: express.Request, res: express.Response) => {
  try {
    const { repositoryUrl, forceRegenerate = false } = req.body;
    
    if (!repositoryUrl) {
      return res.status(400).json({ message: 'Repository URL is required' });
    }
    
    if (!ANTHROPIC_API_KEY) {
      return res.status(500).json({ message: 'Anthropic API key is not configured' });
    }
    
    // Get user ID from session - proper way to extract authenticated user
    const user = (req as any).user || null;
    const userId = user ? user._id.toString() : null;
    
    logger.info(`Generating insights for repo ${repositoryUrl} for user: ${userId || 'anonymous'}`);
    
    // Normalize repository URL
    const githubInfo = extractGitHubInfo(repositoryUrl);
    
    if (!githubInfo) {
      logger.warn(`Could not extract owner/repo from URL: ${repositoryUrl}`);
      return res.status(400).json({ message: 'Invalid repository URL' });
    }
    
    const normalizedRepoUrl = `${githubInfo.owner}/${githubInfo.repo}`;
    
    // Check for existing insights if not forcing regeneration
    if (!forceRegenerate) {
      // Check if insights already exist for this repository
      const query: any = { repositoryUrl: normalizedRepoUrl };
      if (userId) {
        query.userId = userId;
      }
      
      const existingInsight = await AIInsight.findOne(query).sort({ createdAt: -1 });
      
      if (existingInsight) {
        logger.info(`Found existing insights for ${normalizedRepoUrl}, returning cached results`);
        return res.json({
          _id: existingInsight._id,
          insights: existingInsight.insights,
          createdAt: existingInsight.createdAt,
          cached: true
        });
      }
    }
    
    // Retrieve repository content
    try {
      const { content, metadata } = await getRepositoryContent(repositoryUrl);
      
      // Truncate content if too long
      const truncatedContent = truncateContent(content, 100000);
      
      // Format the message for Claude
      const message = `
      This is a GitHub repository with the following content. Please analyze it and provide insights about:
      
      1. The overall architecture and design patterns
      2. Code organization and structure
      3. Potential issues or areas for improvement
      4. Any security concerns
      5. Best practices that are followed or missing
      
      Format your response in markdown, with appropriate headings and sections.
      
      Repository: ${normalizedRepoUrl}
      
      REPOSITORY CONTENT:
      ${truncatedContent}
      `;
      
      // Call Claude API
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-opus-20240229',
          max_tokens: 4000,
          messages: [{ role: 'user', content: message }]
        },
        {
          headers: {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          }
        }
      ).catch(error => {
        // Capture and log the detailed API error
        const apiError = error.response?.data?.error || error.message;
        logger.error(`Claude API Error: ${JSON.stringify(apiError)}`);
        
        // Throw a clear error that will propagate to the client
        throw new Error(`AI analysis failed: ${error.response?.data?.error?.message || 'Claude API returned an error'}`);
      });
      
      if (!response.data || !response.data.content || !response.data.content[0]?.text) {
        throw new Error('Claude API returned an invalid response format');
      }
      
      const insightText = response.data.content[0].text;
      
      // Create the insight object
      const insightData: any = {
        repositoryUrl: normalizedRepoUrl,
        insights: insightText
      };
      
      // Only set userId if we have a valid user
      if (userId) {
        insightData.userId = userId;
      }
      
      const insight = new AIInsight(insightData);
      
      await insight.save();
      logger.info(`Successfully saved insights for ${normalizedRepoUrl}${userId ? ' with user: ' + userId : ''}`);
      
      return res.json({
        _id: insight._id,
        insights: insightText,
        createdAt: insight.createdAt,
        cached: false
      });
      
    } catch (error: any) {
      logger.error('Error retrieving repository content:', error);
      return res.status(500).json({ message: 'Error retrieving repository content' });
    }
    
  } catch (error: any) {
    logger.error('Error generating AI insights:', error);
    return res.status(500).json({ message: 'Failed to generate AI insights' });
  }
});

// Extract Core Elements endpoint
router.post('/core-elements', checkApiKey, async (req: express.Request, res: express.Response) => {
  try {
    const { repositoryUrl } = req.body;
    
    if (!repositoryUrl) {
      return res.status(400).json({ message: 'Repository URL is required' });
    }
    
    console.log(`Extracting core elements for repository: ${repositoryUrl}`);
    
    // Get repository content from database
    const { content, metadata } = await getRepositoryContent(repositoryUrl);
    
    let prompt = '';
    
    if (content) {
      // If we have the content, use it
      const truncatedContent = truncateContent(content);
      prompt = `Analyze this GitHub repository with URL: ${repositoryUrl}
      
      The repository content is provided below:
      \`\`\`
      ${truncatedContent}
      \`\`\`
      
      Extract and explain the core algorithms and key elements from this codebase.
      Focus on:
      1. The most important algorithms and data structures
      2. Key architectural components and how they interact
      3. Critical business logic implementations
      4. Any unique or innovative approaches used
      
      Format your response in markdown with code snippets where relevant.`;
    } else {
      // If no content available, use the original URL-only approach
      prompt = `Analyze this GitHub repository: ${repositoryUrl}.
      Extract and explain the core algorithms and key elements from this codebase.
      Focus on:
      1. The most important algorithms and data structures
      2. Key architectural components and how they interact
      3. Critical business logic implementations
      4. Any unique or innovative approaches used
      
      Format your response in markdown with code snippets where relevant.
      
      Note: I couldn't access the full repository content, so base your analysis on what you know about this repository.`;
    }
    
    // Add metadata if available
    if (metadata) {
      prompt += `\n\nAdditional repository information:
      - Owner: ${metadata.ownerName}
      - Repository Name: ${metadata.repoName}
      - Default Branch: ${metadata.defaultBranch}
      - Stars: ${metadata.stars}
      - Forks: ${metadata.forks}
      - Description: ${metadata.description}
      - Latest Commit: ${metadata.commitHash} - "${metadata.commitMessage}"`;
    }
    
    // Call Claude API
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      }
    ).catch(error => {
      // Capture and log the detailed API error
      const apiError = error.response?.data?.error || error.message;
      logger.error(`Claude API Error: ${JSON.stringify(apiError)}`);
      
      // Throw a clear error that will propagate to the client
      throw new Error(`AI analysis failed: ${error.response?.data?.error?.message || 'Claude API returned an error'}`);
    });
    
    if (!response.data || !response.data.content || !response.data.content[0]?.text) {
      throw new Error('Claude API returned an invalid response format');
    }
    
    res.json({ elements: response.data.content[0].text });
  } catch (error: any) {
    console.error('Error extracting core elements:', error.response?.data || error.message);
    
    // Extract detailed error message if it exists
    const errorDetails = error.response?.data?.error;
    const detailedMessage = errorDetails?.message ? 
      `Error extracting core elements: ${errorDetails.message}` : 
      'Failed to extract core elements';
    
    res.status(500).json({ 
      message: detailedMessage,
      error: error.response?.data?.error || error.message
    });
  }
});

// iOS App Conversion endpoint
router.post('/ios-app', checkApiKey, async (req: express.Request, res: express.Response) => {
  try {
    const { repositoryUrl } = req.body;
    
    if (!repositoryUrl) {
      return res.status(400).json({ message: 'Repository URL is required' });
    }
    
    console.log(`Generating iOS app conversion for repository: ${repositoryUrl}`);
    
    // Get repository content from database
    const { content, metadata } = await getRepositoryContent(repositoryUrl);
    
    let prompt = '';
    
    if (content) {
      // If we have the content, use it
      const truncatedContent = truncateContent(content);
      prompt = `Analyze this web application GitHub repository with URL: ${repositoryUrl}
      
      The repository content is provided below:
      \`\`\`
      ${truncatedContent}
      \`\`\`
      
      Create a detailed plan for converting this web application to a native iOS app.
      Include:
      1. Overall architecture recommendation (UIKit vs SwiftUI)
      2. Key screens/views that need to be implemented
      3. Data models and storage approach
      4. API integration strategy
      5. Recommended third-party libraries
      6. Implementation challenges and solutions
      
      Format your response in markdown with clear sections and examples where appropriate.`;
    } else {
      // If no content available, use the original URL-only approach
      prompt = `Analyze this web application GitHub repository: ${repositoryUrl}.
      Create a detailed plan for converting this web application to a native iOS app.
      Include:
      1. Overall architecture recommendation (UIKit vs SwiftUI)
      2. Key screens/views that need to be implemented
      3. Data models and storage approach
      4. API integration strategy
      5. Recommended third-party libraries
      6. Implementation challenges and solutions
      
      Format your response in markdown with clear sections and examples where appropriate.
      
      Note: I couldn't access the full repository content, so base your analysis on what you know about this repository.`;
    }
    
    // Add metadata if available
    if (metadata) {
      prompt += `\n\nAdditional repository information:
      - Owner: ${metadata.ownerName}
      - Repository Name: ${metadata.repoName}
      - Default Branch: ${metadata.defaultBranch}
      - Stars: ${metadata.stars}
      - Forks: ${metadata.forks}
      - Description: ${metadata.description}
      - Latest Commit: ${metadata.commitHash} - "${metadata.commitMessage}"`;
    }
    
    // Call Claude API
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      }
    ).catch(error => {
      // Capture and log the detailed API error
      const apiError = error.response?.data?.error || error.message;
      logger.error(`Claude API Error: ${JSON.stringify(apiError)}`);
      
      // Throw a clear error that will propagate to the client
      throw new Error(`AI analysis failed: ${error.response?.data?.error?.message || 'Claude API returned an error'}`);
    });
    
    if (!response.data || !response.data.content || !response.data.content[0]?.text) {
      throw new Error('Claude API returned an invalid response format');
    }
    
    res.json({ iosApp: response.data.content[0].text });
  } catch (error: any) {
    console.error('Error generating iOS app conversion:', error.response?.data || error.message);
    
    // Extract detailed error message if it exists
    const errorDetails = error.response?.data?.error;
    const detailedMessage = errorDetails?.message ? 
      `Error generating iOS app conversion: ${errorDetails.message}` : 
      'Failed to generate iOS app conversion';
    
    res.status(500).json({ 
      message: detailedMessage,
      error: error.response?.data?.error || error.message
    });
  }
});

// Endpoint to get AI insights history for a repository
router.get('/insights/history', async (req: express.Request, res: express.Response) => {
  try {
    const { repositoryUrl } = req.query;
    console.log("Insights history requested for:", repositoryUrl);
    
    if (!repositoryUrl || typeof repositoryUrl !== 'string') {
      console.log("Missing or invalid repositoryUrl in request");
      return res.status(400).json({ message: 'Repository URL is required' });
    }
    
    const githubInfo = extractGitHubInfo(repositoryUrl);
    
    if (!githubInfo) {
      logger.warn(`Could not extract owner/repo from URL: ${repositoryUrl}`);
      return res.status(400).json({ message: 'Invalid repository URL' });
    }
    
    const normalizedRepoUrl = `${githubInfo.owner}/${githubInfo.repo}`;
    console.log("Normalized repository URL:", normalizedRepoUrl);
    
    // Fetch all insights for this repository, ordered by most recent first
    const insights = await AIInsight.find({ 
      repositoryUrl: normalizedRepoUrl 
    })
    .sort({ createdAt: -1 })
    .limit(10); // Limit to 10 most recent insights
    
    console.log(`Found ${insights.length} insights for ${normalizedRepoUrl}`);
    
    // If no insights found, return empty array with success true
    return res.json({ 
      success: true, 
      insights 
    });
  } catch (error) {
    console.error('Error fetching AI insights history:', error);
    return res.status(500).json({ message: 'Failed to fetch insights history' });
  }
});

export default router;
