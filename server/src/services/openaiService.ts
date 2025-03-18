import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Service for interacting with OpenAI API for code analysis
 */
export class OpenAIService {
  private apiKey: string;
  
  constructor(apiKey: string = OPENAI_API_KEY || '') {
    this.apiKey = apiKey;
    
    if (!this.apiKey) {
      console.warn('OpenAI API key is not set. Code analysis functionality will be limited.');
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
    try {
      if (!this.apiKey) {
        throw new Error('OpenAI API key is not set');
      }
      
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
      
      const response = await axios.post(
        OPENAI_API_URL,
        {
          model: 'gpt-4',
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
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );
      
      return response.data.choices[0].message.content;
    } catch (error: any) {
      console.error('Error calling OpenAI API:', error.message);
      throw new Error(`OpenAI API error: ${error.message}`);
    }
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
      if (!this.apiKey) {
        throw new Error('OpenAI API key is not set');
      }
      
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
      
      const response = await axios.post(
        OPENAI_API_URL,
        {
          model: 'gpt-4',
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
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );
      
      return response.data.choices[0].message.content;
    } catch (error: any) {
      console.error('Error generating documentation:', error.message);
      throw new Error(`Documentation generation error: ${error.message}`);
    }
  }
  
  /**
   * Extract key insights from repository analysis
   * @param analysisResults Analysis results from code analysis
   */
  async extractInsights(analysisResults: any) {
    try {
      if (!this.apiKey) {
        throw new Error('OpenAI API key is not set');
      }
      
      // Convert analysis results to string representation
      const analysisText = JSON.stringify(analysisResults, null, 2);
      
      const response = await axios.post(
        OPENAI_API_URL,
        {
          model: 'gpt-4',
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
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );
      
      return response.data.choices[0].message.content;
    } catch (error: any) {
      console.error('Error extracting insights:', error.message);
      throw new Error(`Insight extraction error: ${error.message}`);
    }
  }
}
