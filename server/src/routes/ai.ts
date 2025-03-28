import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import IngestedRepository from '../models/IngestedRepository';
import { extractGitHubInfo } from '../utils/githubUtils';
import { logger } from '../utils/logger';

dotenv.config();

const router = express.Router();
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MAX_CONTENT_TOKENS = 90000; // Limiting content size to avoid token limits

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
 * Get repository content from IngestedRepository model
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
    
    // Extract content and metadata
    const repoContent = ingestedRepo.ingestData?.content || null;
    const repoMetadata = ingestedRepo.githubMetadata || null;
    
    return { 
      content: repoContent, 
      metadata: repoMetadata 
    };
  } catch (error) {
    logger.error(`Error fetching repository content: ${error.message}`);
    return { content: null, metadata: null };
  }
};

/**
 * Truncate content to avoid exceeding token limits
 */
const truncateContent = (content: string, maxLength: number = MAX_CONTENT_TOKENS): string => {
  if (!content || content.length <= maxLength) {
    return content;
  }
  
  // Simple truncation with a message
  return content.substring(0, maxLength) + 
    "\n\n[Content truncated due to length limitations. This is a portion of the full repository content.]";
};

// AI Insights endpoint
router.post('/insights', checkApiKey, async (req: express.Request, res: express.Response) => {
  try {
    const { repositoryUrl } = req.body;
    
    if (!repositoryUrl) {
      return res.status(400).json({ message: 'Repository URL is required' });
    }
    
    console.log(`Generating AI insights for repository: ${repositoryUrl}`);
    
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
      
      Provide detailed insights about:
      1. Code architecture and design patterns
      2. Code quality and potential improvements
      3. Best practices followed or missing
      4. Potential security concerns
      5. Overall strengths and weaknesses
      
      Format your response in markdown with clear sections and bullet points where appropriate.`;
    } else {
      // If no content available, use the original URL-only approach
      prompt = `Analyze this GitHub repository: ${repositoryUrl}. 
      Provide detailed insights about:
      1. Code architecture and design patterns
      2. Code quality and potential improvements
      3. Best practices followed or missing
      4. Potential security concerns
      5. Overall strengths and weaknesses
      
      Format your response in markdown with clear sections and bullet points where appropriate.
      
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
    );
    
    res.json({ insights: response.data.content[0].text });
  } catch (error: any) {
    console.error('Error generating AI insights:', error.response?.data || error.message);
    
    // Extract detailed error message if it exists
    const errorDetails = error.response?.data?.error;
    const detailedMessage = errorDetails?.message ? 
      `Error generating AI insights: ${errorDetails.message}` : 
      'Failed to generate AI insights';
    
    res.status(500).json({ 
      message: detailedMessage,
      error: error.response?.data?.error || error.message
    });
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
    );
    
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
    );
    
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

export default router;
