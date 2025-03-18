import fs from 'fs';
import path from 'path';
import { SimpleGit, simpleGit } from 'simple-git';
import axios from 'axios';
import os from 'os';
import { promisify } from 'util';
import rimraf from 'rimraf';
import dotenv from 'dotenv';
import Repository from '../models/Repository';
import Analysis from '../models/Analysis';

dotenv.config();

const rimrafPromise = promisify(rimraf);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TEMP_DIR = path.join(os.tmpdir(), 'codeinsight');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Analyze a repository and update the analysis record with the results
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
    console.log(`Cloning repository: ${repository.cloneUrl} to ${repoPath}`);
    
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
    
    // Apply filters to exclude certain files
    const filesToAnalyze = await getFilteredFiles(repoPath, filters);
    
    // Read contents of each file
    const fileContents = await readFiles(repoPath, filesToAnalyze);
    
    // Calculate basic repository stats
    const stats = calculateRepositoryStats(fileContents);
    
    // Analyze code with OpenAI (this will be implemented when API keys are added)
    const analysisResults = await analyzeWithOpenAI(repository, fileContents, stats);
    
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
    console.error('Error analyzing repository:', error);
    
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
 * Apply filters to repository files
 */
const getFilteredFiles = async (repoPath: string, filters: any): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const allFiles: string[] = [];
    
    const processDirectory = (dir: string, baseDir: string = '') => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(baseDir, entry.name);
        
        // Skip node_modules unless specifically included
        if (entry.name === 'node_modules' && !filters.includeNodeModules) {
          continue;
        }
        
        // Skip test files unless specifically included
        if ((entry.name.includes('test') || entry.name.includes('spec')) && !filters.includeTests) {
          continue;
        }
        
        // Skip documentation files unless specifically included
        if ((entry.name === 'docs' || entry.name.endsWith('.md')) && !filters.includeDocumentation) {
          continue;
        }
        
        if (entry.isDirectory()) {
          processDirectory(fullPath, relativePath);
        } else {
          // Skip files larger than maxFileSize
          if (filters.maxFileSize) {
            const stats = fs.statSync(fullPath);
            const fileSizeInMB = stats.size / (1024 * 1024);
            if (fileSizeInMB > parseFloat(filters.maxFileSize)) {
              continue;
            }
          }
          
          allFiles.push(relativePath);
        }
      }
    };
    
    try {
      processDirectory(repoPath);
      resolve(allFiles);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Read content of each file
 */
const readFiles = async (repoPath: string, files: string[]): Promise<{ [key: string]: string }> => {
  const fileContents: { [key: string]: string } = {};
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(repoPath, file), 'utf8');
      fileContents[file] = content;
    } catch (error) {
      console.warn(`Error reading file ${file}:`, error);
    }
  }
  
  return fileContents;
};

/**
 * Calculate repository statistics
 */
const calculateRepositoryStats = (fileContents: { [key: string]: string }) => {
  let totalLines = 0;
  const languageCounts: { [key: string]: number } = {};
  
  Object.entries(fileContents).forEach(([file, content]) => {
    const lines = content.split('\n').length;
    totalLines += lines;
    
    const extension = path.extname(file).toLowerCase();
    const language = getLanguageFromExtension(extension);
    
    if (language) {
      languageCounts[language] = (languageCounts[language] || 0) + lines;
    }
  });
  
  // Calculate percentages
  const languages: { [key: string]: number } = {};
  Object.entries(languageCounts).forEach(([language, count]) => {
    languages[language] = Math.round((count / totalLines) * 100);
  });
  
  return {
    files: Object.keys(fileContents).length,
    lines: totalLines,
    languages,
  };
};

/**
 * Map file extensions to programming languages
 */
const getLanguageFromExtension = (extension: string): string | null => {
  const extensionMap: { [key: string]: string } = {
    '.js': 'JavaScript',
    '.jsx': 'JavaScript',
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript',
    '.py': 'Python',
    '.rb': 'Ruby',
    '.java': 'Java',
    '.c': 'C',
    '.cpp': 'C++',
    '.cs': 'C#',
    '.go': 'Go',
    '.php': 'PHP',
    '.html': 'HTML',
    '.css': 'CSS',
    '.scss': 'SCSS',
    '.json': 'JSON',
    '.md': 'Markdown',
    '.sql': 'SQL',
    '.sh': 'Shell',
    '.bat': 'Batch',
    '.ps1': 'PowerShell',
  };
  
  return extensionMap[extension] || null;
};

/**
 * Analyze code with OpenAI API
 * This is a placeholder implementation that will be completed once API keys are provided
 */
const analyzeWithOpenAI = async (
  repository: any,
  fileContents: { [key: string]: string },
  stats: any
) => {
  // Placeholder for actual OpenAI implementation
  // In a real implementation, we would:
  // 1. Prepare the code for analysis
  // 2. Send chunks to OpenAI API with appropriate prompts
  // 3. Process and consolidate the responses
  
  // For now, return mock data
  return {
    summary: {
      quality: 'B+',
      security: 'A-',
      complexity: 'Medium',
      lines: stats.lines,
      files: stats.files,
      issues: Math.floor(Math.random() * 30),
      vulnerabilities: Math.floor(Math.random() * 5),
    },
    vulnerabilities: [
      {
        severity: 'High',
        title: 'Example security vulnerability',
        description: 'This is an example vulnerability that would be detected by the AI.',
        location: 'src/main.ts',
        line: 42,
      },
    ],
    codeQuality: [
      {
        type: 'Improvement',
        title: 'Code organization suggestion',
        description: 'Consider refactoring this component for better maintainability.',
        location: 'src/components/example.ts',
        line: 24,
      },
    ],
    keyFiles: Object.keys(fileContents).slice(0, 5).map(file => ({
      path: file,
      description: `Example file in the ${repository.name} repository`,
      size: `${(fileContents[file].length / 1024).toFixed(1)} KB`,
    })),
    keyInsights: [
      `Repository contains ${stats.files} files with ${stats.lines} lines of code`,
      `Primary language is ${Object.entries(stats.languages).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown'}`,
      'Example code insight that would be generated by AI',
    ],
    documentation: {
      overview: `${repository.name} is a software project with ${stats.files} files.`,
      architecture: 'The architecture section would contain AI-generated insights about the codebase structure.',
      setup: 'Setup instructions would be derived from analyzing configuration files.',
      deployment: 'Deployment information would be based on analyzing CI/CD and config files.',
    },
  };
};
