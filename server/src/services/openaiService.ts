import axios from 'axios';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Queue for managing API requests
interface QueuedRequest {
  execute: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

/**
 * Service for interacting with OpenAI API for code analysis
 */
export class OpenAIService {
  private apiKey: string;
  // Retry configuration
  private MAX_RETRIES = 5; // Increased from 3 to 5 retries
  private INITIAL_RETRY_DELAY = 5000; // Increased from 2000ms to 5000ms
  private MAX_RETRY_DELAY = 60000; // Cap maximum retry delay at 60 seconds
  
  // Request queue management
  private requestQueue: QueuedRequest[] = [];
  private isProcessingQueue = false;
  private MIN_REQUEST_INTERVAL = 1000; // Minimum time between requests (1 second)
  private lastRequestTime = 0;
  
  constructor(apiKey: string = OPENAI_API_KEY || '') {
    this.apiKey = apiKey;
    
    if (!this.apiKey) {
      console.warn('OpenAI API key is not set. Code analysis functionality will be limited.');
    }
  }
  
  /**
   * Add a request to the queue and process it when ready
   * @param operation Name of the operation for logging
   * @param executeRequest Function that executes the actual request
   * @returns Promise that resolves with the request result
   */
  private queueRequest<T>(operation: string, executeRequest: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      // Add request to queue
      this.requestQueue.push({
        execute: async () => {
          try {
            return await executeRequest();
          } catch (error) {
            throw error;
          }
        },
        resolve,
        reject
      });
      
      // Start processing queue if not already running
      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    });
  }
  
  /**
   * Process requests in the queue with rate limiting
   */
  private async processQueue() {
    if (this.isProcessingQueue) return;
    
    this.isProcessingQueue = true;
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()!;
      
      try {
        // Ensure we wait enough time between requests
        const now = Date.now();
        const timeElapsed = now - this.lastRequestTime;
        
        if (timeElapsed < this.MIN_REQUEST_INTERVAL) {
          await new Promise(resolve => setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeElapsed));
        }
        
        // Execute the request
        this.lastRequestTime = Date.now();
        const result = await request.execute();
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
    }
    
    this.isProcessingQueue = false;
  }
  
  /**
   * Helper method to make OpenAI API requests with retry logic for rate limiting
   * @param payload Request payload
   * @param operation Name of the operation (for logging)
   * @returns Response data
   */
  private async makeOpenAIRequest(payload: any, operation: string): Promise<string> {
    return this.queueRequest(operation, () => this.executeRequest(payload, operation));
  }
  
  /**
   * Execute an OpenAI API request with retry logic
   * @param payload Request payload
   * @param operation Name of the operation (for logging)
   * @param retries Current retry count
   * @returns Response data
   */
  private async executeRequest(payload: any, operation: string, retries = 0): Promise<string> {
    try {
      if (!this.apiKey) {
        throw new Error('OpenAI API key is not set');
      }
      
      const response = await axios.post(
        OPENAI_API_URL,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );
      
      return response.data.choices[0].message.content;
    } catch (error: any) {
      // Handle rate limiting errors (HTTP 429)
      if (error.response && error.response.status === 429 && retries < this.MAX_RETRIES) {
        // Calculate exponential backoff delay, but cap it at maximum delay
        const delay = Math.min(
          this.INITIAL_RETRY_DELAY * Math.pow(2, retries),
          this.MAX_RETRY_DELAY
        );
        
        logger.warn(`Rate limit exceeded for ${operation}. Retrying in ${delay}ms (attempt ${retries + 1}/${this.MAX_RETRIES})`);
        
        // Wait for the calculated delay
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry the request with incremented retry count
        return this.executeRequest(payload, operation, retries + 1);
      }
      
      // Extract error message safely
      let errorMessage = 'Unknown error';
      try {
        if (error.response && error.response.data) {
          errorMessage = JSON.stringify(error.response.data);
        } else if (error.message) {
          errorMessage = error.message;
        }
      } catch (e) {
        errorMessage = 'Error parsing error message';
      }
      
      // Log detailed error information
      logger.error(`Error in OpenAI ${operation}: ${errorMessage}`);
      
      // Log the exact error object with all details for debugging
      if (error.response) {
        logger.error('OpenAI API Error Details:', {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers,
          data: error.response.data,
          config: {
            url: error.response.config?.url,
            method: error.response.config?.method,
            headers: error.response.config?.headers,
            // Omit the actual request data for security
          }
        });
      } else {
        // For network errors or other non-response errors
        logger.error('OpenAI Request Error:', error);
      }
      
      // Re-throw the error (preserving existing behavior)
      throw new Error(`${operation} error: ${errorMessage}`);
    }
  }
  
  /**
   * Analyze code with OpenAI
   * @param code Code content to analyze
   * @param options Analysis options
   */
  async analyzeCode(code: string, options: { 
    focusArea?: 'security' | 'quality' | 'documentation' | 'all';
    maxTokens?: number; 
  } = {}) {
    const focusArea = options.focusArea || 'all';
    const maxTokens = options.maxTokens || 1000;
    
    // Prepare the system message based on the focus area
    let systemMessage = 'You are a senior software engineer with expertise in code analysis.';
    
    if (focusArea === 'security') {
      systemMessage += ' Focus on identifying security vulnerabilities, potential exploits, and security best practices.';
    } else if (focusArea === 'quality') {
      systemMessage += ' Focus on code quality, readability, maintainability, and performance.';
    } else if (focusArea === 'documentation') {
      systemMessage += ' Focus on documenting the code, explaining its architecture, and describing key functions.';
    } else {
      systemMessage += ' Provide a comprehensive analysis of the code, covering security, quality, architecture, and documentation.';
    }
    
    const payload = {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: systemMessage,
        },
        {
          role: 'user',
          content: `Please analyze the following code:\n\n${code}`,
        },
      ],
      max_tokens: maxTokens,
      temperature: 0.2,
    };
    
    return this.makeOpenAIRequest(payload, 'code analysis');
  }
  
  /**
   * Generate documentation for repository
   * @param repoInfo Repository information
   * @param fileStructure Repository file structure
   * @param codeSnippets Key code snippets
   */
  async generateDocumentation(
    repoInfo: any,
    fileStructure: string,
    codeSnippets: { [key: string]: string }
  ) {
    try {
      // Prepare the prompt for documentation generation
      const codeSnippetsText = Object.entries(codeSnippets)
        .map(([file, content]) => `===== ${file} =====\n${content}\n`)
        .join('\n');
      
      const prompt = `
Repository: ${repoInfo.name}
Description: ${repoInfo.description || 'No description provided'}
Language: ${repoInfo.language || 'Unknown'}

File Structure:
${fileStructure}

Key Code Snippets:
${codeSnippetsText}

Based on the above information, please generate comprehensive documentation for this repository including:
1. Overview of the project
2. Architecture description
3. Setup instructions
4. Usage examples
5. API documentation (if applicable)
6. Deployment guide
`;
      
      const payload = {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a technical documentation expert who specializes in creating clear, concise, and comprehensive documentation for software projects.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      };
      
      return this.makeOpenAIRequest(payload, 'documentation generation');
    } catch (error: any) {
      // Provide basic documentation on failure
      logger.error(`Documentation generation failed, using fallback: ${error.message}`);
      return `## Repository Documentation

### Overview
This is a code repository named ${repoInfo.name}.

### Setup Instructions
Please refer to any README files in the repository for setup instructions.

*Note: Complete documentation could not be generated due to API limits.*`;
    }
  }
  
  /**
   * Extract key insights from repository analysis
   * @param analysisResults Analysis results from code analysis
   */
  async extractInsights(analysisResults: any) {
    try {
      // Convert analysis results to string representation
      const analysisText = JSON.stringify(analysisResults, null, 2);
      
      const payload = {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a software analysis expert who can distill complex code analysis results into key insights and actionable recommendations.',
          },
          {
            role: 'user',
            content: `Based on the following code analysis results, please extract the 5-7 most important insights and provide actionable recommendations:\n\n${analysisText}`,
          },
        ],
        max_tokens: 1000,
        temperature: 0.3,
      };
      
      return this.makeOpenAIRequest(payload, 'insight extraction');
    } catch (error: any) {
      // Provide basic insights on failure
      logger.error(`Insight extraction failed, using fallback: ${error.message}`);
      return [
        `This repository contains code written primarily in ${analysisResults.repository?.languages?.['primary'] || 'various languages'}.`,
        'Review the repository structure to understand the key components.',
        'Check for documentation to learn how to use and deploy this code.'
      ].join('\n\n');
    }
  }
}