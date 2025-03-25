import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Middleware to check if API key is configured
const checkApiKey = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ 
      message: 'Claude API key is not configured. Please add ANTHROPIC_API_KEY to your .env file.' 
    });
  }
  next();
};

// AI Insights endpoint
router.post('/insights', checkApiKey, async (req: express.Request, res: express.Response) => {
  try {
    const { repositoryUrl } = req.body;
    
    if (!repositoryUrl) {
      return res.status(400).json({ message: 'Repository URL is required' });
    }
    
    console.log(`Generating AI insights for repository: ${repositoryUrl}`);
    
    // Call Claude API
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: `Analyze this GitHub repository: ${repositoryUrl}. 
            Provide detailed insights about:
            1. Code architecture and design patterns
            2. Code quality and potential improvements
            3. Best practices followed or missing
            4. Potential security concerns
            5. Overall strengths and weaknesses
            
            Format your response in markdown with clear sections and bullet points where appropriate.`
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
    
    // Call Claude API
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: `Analyze this GitHub repository: ${repositoryUrl}.
            Extract and explain the core algorithms and key elements from this codebase.
            Focus on:
            1. The most important algorithms and data structures
            2. Key architectural components and how they interact
            3. Critical business logic implementations
            4. Any unique or innovative approaches used
            
            Format your response in markdown with code snippets where relevant.`
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
    
    // Call Claude API
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: `Analyze this web application GitHub repository: ${repositoryUrl}.
            Create a detailed plan for converting this web application to a native iOS app.
            Include:
            1. Overall architecture recommendation (UIKit vs SwiftUI)
            2. Key screens/views that need to be implemented
            3. Data models and storage approach
            4. API integration strategy
            5. Recommended third-party libraries
            6. Implementation challenges and solutions
            
            Format your response in markdown with clear sections and examples where appropriate.`
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
