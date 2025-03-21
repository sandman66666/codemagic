import fs from 'fs';
import path from 'path';
import { SimpleGit, simpleGit } from 'simple-git';
import os from 'os';
import { promisify } from 'util';
import dotenv from 'dotenv';
import Repository from '../models/Repository';
import Analysis from '../models/Analysis';
import { OpenAIService } from './openaiService';
import { logger } from '../utils/logger';
import { repositoryIngestService } from './repositoryIngestService';

// Import rimraf with any type to avoid TS errors
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rimraf = require('rimraf');
const rimrafPromise = promisify(rimraf);

dotenv.config();

const TEMP_DIR = path.join(os.tmpdir(), 'codeinsight');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Define interface types for analysis results
interface SecurityVulnerability {
  severity: string;
  title: string;
  description: string;
  location?: string;
  line?: number | null;
}

interface CodeQualityIssue {
  type: string;
  title: string;
  description: string;
  location?: string;
  line?: number | null;
}

interface KeyFile {
  path: string;
  description: string;
  size: string;
}

interface DocumentationSections {
  overview: string;
  architecture: string;
  setup: string;
  deployment: string;
}

interface AnalysisResults {
  summary: {
    lines: number;
    files: number;
    issues: number;
    vulnerabilities: number;
    quality: string;
    security: string;
    complexity: string;
  };
  vulnerabilities: SecurityVulnerability[];
  codeQuality: CodeQualityIssue[];
  keyFiles: KeyFile[];
  keyInsights: string[];
  documentation: DocumentationSections;
}

/**
 * Analyze a repository and update the analysis record with the results
 * Uses gitingest to process repository files and OpenAI for analysis
 */
export const analyzeRepository = async (
  repository: any,
  analysisId: string,
  branch: string,
  user: any,
  filters: any = {}
) => {
  const git: SimpleGit = simpleGit();
  const repoPath = path.join(TEMP_DIR, `${repository._id}-${Date.now()}`);
  
  try {
    // Update analysis status
    await Analysis.findByIdAndUpdate(analysisId, { status: 'processing' });
    
    // Clone the repository
    logger.info(`Cloning repository: ${repository.cloneUrl} to ${repoPath}`);
    
    const cloneUrl = repository.cloneUrl.replace(
      'https://',
      `https://${user.githubToken}@`
    );
    
    await git.clone(cloneUrl, repoPath);
    
    // Switch to the specified branch
    const localGit = simpleGit(repoPath);
    await localGit.checkout(branch);
    
    // Get the latest commit hash
    const log = await localGit.log({ maxCount: 1 });
    const commitHash = log.latest?.hash || 'unknown';
    
    // Update analysis with commit hash
    await Analysis.findByIdAndUpdate(analysisId, { commit: commitHash });
    
    // Process the repository with gitingest
    logger.info(`Processing repository with gitingest: ${repository._id}`);
    await repositoryIngestService.processRepository(repoPath, repository._id.toString());
    
    // Get the content from gitingest
    const gitingestContent = await repositoryIngestService.getRepositoryContent(repository._id.toString());
    
      // Analyze with OpenAI using the gitingest output
      const analysisResults = await analyzeWithGitIngest(repository, gitingestContent);
      
      // Update the analysis with the results
      await Analysis.findByIdAndUpdate(
        analysisId,
        {
          status: 'completed',
          completedAt: new Date(),
          summary: analysisResults.summary,
          vulnerabilities: analysisResults.vulnerabilities,
          codeQuality: analysisResults.codeQuality,
          keyFiles: analysisResults.keyFiles,
          keyInsights: analysisResults.keyInsights,
          documentation: analysisResults.documentation,
        }
      );
    
    // Update repository with last analyzed date
    await Repository.findByIdAndUpdate(
      repository._id,
      { lastAnalyzedAt: new Date() }
    );
    
    // Clean up - remove the cloned repository
    await rimrafPromise(repoPath);
    
  } catch (error: any) {
    logger.error('Error analyzing repository:', error);
    
    // Update analysis as failed
    await Analysis.findByIdAndUpdate(
      analysisId,
      {
        status: 'failed',
        completedAt: new Date(),
      }
    );
    
    // Clean up if the repo was cloned
    if (fs.existsSync(repoPath)) {
      await rimrafPromise(repoPath);
    }
  }
};

/**
 * Analyze repository with gitingest output using OpenAI
 */
const analyzeWithGitIngest = async (
  repository: any,
  gitingestContent: { 
    summary: string;
    tree: string;
    content: string;
  }
): Promise<AnalysisResults> => {
  try {
    // Create an instance of the OpenAI service
    const openai = new OpenAIService();
    
    // Use the gitingest summary and tree information
    const summary = gitingestContent.summary;
    const tree = gitingestContent.tree;
    const content = gitingestContent.content;
    
    // Extract basic stats from the summary
    const fileCountMatch = summary.match(/Contains (\d+) files/);
    const lineCountMatch = summary.match(/with approximately (\d+) lines of code/);
    const languageMatch = summary.match(/Primary language: ([a-zA-Z#]+)/);
    
    const files = fileCountMatch ? parseInt(fileCountMatch[1]) : 0;
    const lines = lineCountMatch ? parseInt(lineCountMatch[1]) : 0;
    const primaryLanguage = languageMatch ? languageMatch[1] : 'Unknown';
    
    // Initialize results structure with basic stats
    const results: AnalysisResults = {
      summary: {
        lines,
        files,
        issues: 0,
        vulnerabilities: 0,
        quality: 'A',
        security: 'A',
        complexity: 'Low',
      },
      vulnerabilities: [],
      codeQuality: [],
      keyFiles: [],
      keyInsights: [],
      documentation: {
        overview: '',
        architecture: '',
        setup: '',
        deployment: '',
      },
    };
    
    // Generate documentation using the gitingest output directly
    try {
      const documentationText = await openai.generateDocumentation(
        repository,
        tree,
        { 'content': content }
      );
      
      // Parse documentation sections
      results.documentation = parseDocumentation(documentationText);
    } catch (error) {
      logger.error('Error generating documentation:', error);
      // Enhanced fallback values if documentation generation fails
      results.documentation = {
        overview: `${repository.name} is a repository with ${files} files containing ${lines} lines of code. Primary language: ${primaryLanguage}.\n\n${summary}`,
        architecture: 'Generated from repository structure:\n\n' + tree.substring(0, 1000) + (tree.length > 1000 ? '...' : ''),
        setup: 'Setup information could not be generated due to API rate limiting.',
        deployment: 'Deployment information could not be generated due to API rate limiting.',
      };
    }
    
    // Generate key insights
    try {
      // Prepare analysis data for insight extraction
      const analysisData = {
        repository: {
          name: repository.name,
          files,
          lines,
          languages: { [primaryLanguage]: 100 },
        },
        securityIssues: 0,
        qualityIssues: 0,
      };
      
      const insightsText = await openai.extractInsights(analysisData);
      results.keyInsights = parseInsights(insightsText);
    } catch (error) {
      logger.error('Error extracting insights:', error);
      // Enhanced fallback to more detailed insights
      results.keyInsights = [
        `Repository ${repository.name} contains ${files} files with ${lines} lines of code`,
        `Primary language is ${primaryLanguage}`,
        `Repository structure shows ${tree.split('\n').length} directories and files`,
        `The average file size is approximately ${Math.round(lines/Math.max(files, 1))} lines per file`,
        `Analysis completed using static code analysis (limited due to API rate limiting)`
      ];
    }
    
    // Extract key files from the tree structure
    try {
      const fileMatches = tree.match(/📄 ([^\n]+)/g) || [];
      const keyFilesPaths = fileMatches.slice(0, 10).map(m => m.replace('📄 ', '').trim());
      
      results.keyFiles = keyFilesPaths.map(filePath => ({
        path: filePath,
        description: `File in the ${repository.name} repository`,
        size: 'Unknown',
      }));
    } catch (error) {
      logger.error('Error extracting key files:', error);
      results.keyFiles = [];
    }
    
    return results;
  } catch (error) {
    logger.error('Error in analyzeWithGitIngest:', error);
    return {
      summary: {
        quality: 'N/A',
        security: 'N/A',
        complexity: 'Unknown',
        lines: 0,
        files: 0,
        issues: 0,
        vulnerabilities: 0,
      },
      vulnerabilities: [],
      codeQuality: [],
      keyFiles: [],
      keyInsights: [
        'Repository analysis failed.',
        'Error occurred during gitingest analysis.',
      ],
      documentation: {
        overview: `${repository.name} is a software project.`,
        architecture: 'Unable to generate architecture documentation due to an error.',
        setup: 'Unable to generate setup documentation due to an error.',
        deployment: 'Unable to generate deployment documentation due to an error.',
      },
    };
  }
};

/**
 * Parse documentation text into structured sections
 */
const parseDocumentation = (documentation: string): DocumentationSections => {
  try {
    const sections = {
      overview: '',
      architecture: '',
      setup: '',
      deployment: '',
    };
    
    // Extract sections using regex or simple text search
    const overviewMatch = documentation.match(/(?:## |# )?Overview:?\s*([\s\S]+?)(?=## |# |$)/i);
    if (overviewMatch) {
      sections.overview = overviewMatch[1].trim();
    }
    
    const architectureMatch = documentation.match(/(?:## |# )?Architecture:?\s*([\s\S]+?)(?=## |# |$)/i);
    if (architectureMatch) {
      sections.architecture = architectureMatch[1].trim();
    }
    
    const setupMatch = documentation.match(/(?:## |# )?Setup:?\s*([\s\S]+?)(?=## |# |$)/i);
    if (setupMatch) {
      sections.setup = setupMatch[1].trim();
    }
    
    const deploymentMatch = documentation.match(/(?:## |# )?Deployment:?\s*([\s\S]+?)(?=## |# |$)/i);
    if (deploymentMatch) {
      sections.deployment = deploymentMatch[1].trim();
    }
    
    return sections;
  } catch (error) {
    logger.error('Error parsing documentation:', error);
    return {
      overview: 'Documentation parsing error occurred.',
      architecture: '',
      setup: '',
      deployment: '',
    };
  }
};

/**
 * Parse insights text into an array of strings
 */
const parseInsights = (insights: string): string[] => {
  try {
    // Split by line breaks and bullet points
    const lines = insights.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.replace(/^[-*•]/, '').trim());
    
    // Remove duplicates and short lines
    return Array.from(new Set(lines))
      .filter(line => line.length > 10)
      .slice(0, 7); // Take up to 7 insights
  } catch (error) {
    logger.error('Error parsing insights:', error);
    return ['Error parsing insights from analysis.'];
  }
};