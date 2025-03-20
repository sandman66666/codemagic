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
import { OpenAIService } from './openaiService';

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
 * Check if a file is likely binary
 */
const isBinaryFile = (filePath: string, content: Buffer): boolean => {
  // Common binary file extensions
  const binaryExtensions = [
    '.exe', '.dll', '.so', '.dylib', '.obj', '.o', 
    '.bin', '.dat', '.db', '.sqlite', '.jpg', '.jpeg', 
    '.png', '.gif', '.bmp', '.ico', '.tif', '.tiff',
    '.zip', '.tar', '.gz', '.7z', '.rar', '.pdf',
    '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.class', '.pyc', '.pyo'
  ];

  // Check by extension first (quick check)
  const ext = path.extname(filePath).toLowerCase();
  if (binaryExtensions.includes(ext)) {
    return true;
  }

  // Check for null bytes (common in binary files)
  // Examine first 1KB of file to detect binary content
  const bytesToCheck = Math.min(content.length, 1024);
  for (let i = 0; i < bytesToCheck; i++) {
    if (content[i] === 0) {
      return true;
    }
  }

  // Check for high concentration of non-printable/control characters
  let nonPrintableCount = 0;
  for (let i = 0; i < bytesToCheck; i++) {
    // Check for non-printable ASCII characters except common whitespace
    if ((content[i] < 32 || content[i] > 126) && 
        ![9, 10, 13].includes(content[i])) { // Tab, LF, CR are allowed
      nonPrintableCount++;
    }
  }
  
  // If more than 10% of characters are non-printable, consider it binary
  return (nonPrintableCount / bytesToCheck) > 0.1;
};

/**
 * Get a list of file extensions for text-based source code
 */
const getTextFileExtensions = (): string[] => {
  return [
    // Programming languages
    '.js', '.jsx', '.ts', '.tsx', '.py', '.rb', '.java', '.c', '.cpp', '.h', '.hpp', 
    '.cs', '.go', '.php', '.pl', '.swift', '.kt', '.rs', '.scala', '.sh', '.bash',
    '.ps1', '.groovy', '.lua', '.r', '.m', '.mm', '.coffee', '.dart', '.erl', '.ex',
    
    // Web/markup
    '.html', '.htm', '.xhtml', '.css', '.scss', '.sass', '.less', '.svg', '.xml',
    
    // Data/config
    '.json', '.yml', '.yaml', '.toml', '.ini', '.conf', '.config', '.properties',
    '.md', '.markdown', '.rst', '.txt', '.csv', '.tsv', '.env',
    
    // Other text formats
    '.graphql', '.sql', '.proto', '.gradle', '.dockerfile', '.terraformrc', '.tf',
    '.lock', '.prisma'
  ];
};

/**
 * Apply filters to repository files
 */
const getFilteredFiles = async (repoPath: string, filters: any): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const allFiles: string[] = [];
    
    // Normalize the repository path to use as a reference for validation
    const normalizedRepoPath = path.normalize(repoPath);
    
    // Get list of valid text file extensions
    const textFileExtensions = getTextFileExtensions();
    
    const processDirectory = (dir: string, baseDir: string = '') => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.join(baseDir, entry.name);
          
          // Skip .git directory entirely and any hidden directories
          if (entry.isDirectory() && (
              entry.name === '.git' || 
              entry.name.startsWith('.')
          )) {
            console.log(`Skipping Git or hidden directory: ${entry.name}`);
            continue;
          }
          
          // Normalize the full path to resolve any '..' components
          const normalizedFullPath = path.normalize(fullPath);
          
          // Verify the path is within the repository boundaries
          if (!normalizedFullPath.startsWith(normalizedRepoPath)) {
            console.warn(`Skipping file outside repository boundary: ${normalizedFullPath}`);
            continue;
          }
          
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
            // Skip symlinks to directories to prevent following links outside the repo
            if (entry.isSymbolicLink()) {
              console.warn(`Skipping symbolic link to directory: ${fullPath}`);
              continue;
            }
            processDirectory(fullPath, relativePath);
          } else {
            // Skip symlinks to files
            if (entry.isSymbolicLink()) {
              console.warn(`Skipping symbolic link to file: ${fullPath}`);
              continue;
            }
            
            // Skip files with unrecognized extensions (not text-based source code)
            const fileExt = path.extname(entry.name).toLowerCase();
            if (!textFileExtensions.includes(fileExt)) {
              console.log(`Skipping non-source file: ${relativePath}`);
              continue;
            }
            
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
      } catch (error) {
        console.error(`Error processing directory ${dir}:`, error);
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
  const normalizedRepoPath = path.normalize(repoPath);
  
  for (const file of files) {
    try {
      const filePath = path.join(repoPath, file);
      const normalizedFilePath = path.normalize(filePath);
      
      // Ensure the file is within repository boundaries
      if (!normalizedFilePath.startsWith(normalizedRepoPath)) {
        console.warn(`Skipping file outside repository boundary: ${normalizedFilePath}`);
        continue;
      }
      
      // Skip files in .git directory or hidden directories
      if (file.includes('/.git/') || /\/\.[^/]+\//.test(file)) {
        console.log(`Skipping Git or hidden file: ${file}`);
        continue;
      }
      
      // Check if file exists and is not a symlink
      const stats = fs.lstatSync(normalizedFilePath);
      if (stats.isSymbolicLink()) {
        console.warn(`Skipping symbolic link: ${normalizedFilePath}`);
        continue;
      }
      
      // Read file as buffer first to check if it's binary
      const fileBuffer = fs.readFileSync(normalizedFilePath);
      
      // Skip binary files
      if (isBinaryFile(file, fileBuffer)) {
        console.log(`Skipping binary file: ${file}`);
        continue;
      }
      
      try {
        // Try to decode as UTF-8
        const content = fileBuffer.toString('utf8');
        
        // Check if the content contains unprintable characters or looks corrupted
        if (content.includes('\uFFFD') || /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(content)) {
          console.warn(`Skipping file with invalid encoding: ${file}`);
          continue;
        }
        
        fileContents[file] = content;
      } catch (error) {
        console.warn(`Encoding error reading file ${file}:`, error);
      }
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
 * Identify which files are most important to analyze
 * Since we can't analyze all files due to token limits, pick the most representative ones
 */
const identifyKeyFiles = (
  fileContents: { [key: string]: string },
  stats: any
): string[] => {
  // Start with an empty result array
  const keyFiles: string[] = [];
  const MAX_FILES = 10; // Maximum number of files to analyze in detail
  
  // Score each file based on various heuristics
  const scoredFiles = Object.keys(fileContents).map(filePath => {
    const content = fileContents[filePath];
    const extension = path.extname(filePath).toLowerCase();
    let score = 0;
    
    // Prioritize main entry points
    if (
      filePath.includes('index') || 
      filePath.includes('main') || 
      filePath.includes('app')
    ) {
      score += 50;
    }
    
    // Prioritize configuration files
    if (
      filePath.includes('config') || 
      extension === '.json' || 
      extension === '.yaml' || 
      extension === '.yml'
    ) {
      score += 40;
    }
    
    // Prioritize files with many imports (likely core files)
    const importCount = (content.match(/import /g) || []).length;
    score += importCount * 5;
    
    // Prioritize larger files (but not too large)
    const lines = content.split('\n').length;
    if (lines > 100 && lines < 1000) {
      score += 30;
    }
    
    // Penalize test files slightly
    if (filePath.includes('test') || filePath.includes('spec')) {
      score -= 20;
    }
    
    return { filePath, score };
  });
  
  // Sort by score and take the top MAX_FILES
  scoredFiles.sort((a, b) => b.score - a.score);
  const selectedFiles = scoredFiles.slice(0, MAX_FILES).map(f => f.filePath);
  
  return selectedFiles;
};

/**
 * Parse security vulnerabilities from OpenAI analysis
 */
const parseSecurityIssues = (analysis: string, filePath: string): any[] => {
  try {
    const issues = [];
    
    // Extract vulnerability descriptions using regex
    const vulnerabilityRegex = /(?:Vulnerability|Security Issue|Security Concern)(?:\s*\d*\s*)?:\s*(.+?)(?:\n|$)/gi;
    let match;
    
    while ((match = vulnerabilityRegex.exec(analysis)) !== null) {
      const title = match[1].trim();
      
      // Try to extract severity
      let severity = 'Medium'; // Default
      if (title.toLowerCase().includes('critical') || title.toLowerCase().includes('high')) {
        severity = 'High';
      } else if (title.toLowerCase().includes('low')) {
        severity = 'Low';
      }
      
      // Extract description - take the paragraph following the title
      const descriptionStart = match.index + match[0].length;
      const nextParagraphEnd = analysis.indexOf('\n\n', descriptionStart);
      const description = analysis.substring(
        descriptionStart, 
        nextParagraphEnd > 0 ? nextParagraphEnd : descriptionStart + 200
      ).trim();
      
      // Try to extract line number if mentioned
      const lineMatch = description.match(/line (\d+)/i);
      const line = lineMatch ? parseInt(lineMatch[1]) : null;
      
      issues.push({
        severity,
        title,
        description: description || 'Security vulnerability detected by analysis.',
        location: filePath,
        line: line || null,
      });
    }
    
    // If no structured vulnerabilities found but text mentions security issues
    if (issues.length === 0 && 
        (analysis.toLowerCase().includes('vulnerability') || 
         analysis.toLowerCase().includes('security issue'))) {
      issues.push({
        severity: 'Medium',
        title: 'Potential security issue',
        description: 'The analysis detected potential security concerns in this file.',
        location: filePath,
        line: null,
      });
    }
    
    return issues;
  } catch (error) {
    console.error('Error parsing security issues:', error);
    return [];
  }
};

/**
 * Parse code quality issues from OpenAI analysis
 */
const parseQualityIssues = (analysis: string, filePath: string): any[] => {
  try {
    const issues = [];
    
    // Extract code quality issues using regex
    const issueRegex = /(?:Issue|Problem|Improvement|Suggestion|Warning)(?:\s*\d*\s*)?:\s*(.+?)(?:\n|$)/gi;
    let match;
    
    while ((match = issueRegex.exec(analysis)) !== null) {
      const title = match[1].trim();
      
      // Determine issue type
      let type = 'Improvement';
      if (title.toLowerCase().includes('warning') || title.toLowerCase().includes('potential problem')) {
        type = 'Warning';
      } else if (title.toLowerCase().includes('error') || title.toLowerCase().includes('critical')) {
        type = 'Error';
      }
      
      // Extract description - take the paragraph following the title
      const descriptionStart = match.index + match[0].length;
      const nextParagraphEnd = analysis.indexOf('\n\n', descriptionStart);
      const description = analysis.substring(
        descriptionStart, 
        nextParagraphEnd > 0 ? nextParagraphEnd : descriptionStart + 200
      ).trim();
      
      // Try to extract line number if mentioned
      const lineMatch = description.match(/line (\d+)/i);
      const line = lineMatch ? parseInt(lineMatch[1]) : null;
      
      issues.push({
        type,
        title,
        description: description || 'Code quality issue detected by analysis.',
        location: filePath,
        line: line || null,
      });
    }
    
    return issues;
  } catch (error) {
    console.error('Error parsing quality issues:', error);
    return [];
  }
};

/**
 * Generate a text representation of the file structure
 */
const generateFileStructure = (filePaths: string[]): string => {
  const structure: { [key: string]: any } = {};
  
  // Build a tree structure from file paths
  filePaths.forEach(filePath => {
    const parts = filePath.split('/');
    let current = structure;
    
    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        // It's a file
        current[part] = null;
      } else {
        // It's a directory
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    });
  });
  
  // Convert tree structure to string
  const stringifyStructure = (obj: any, indent = 0): string => {
    let result = '';
    
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      result += ' '.repeat(indent) + (value === null ? '📄 ' : '📁 ') + key + '\n';
      
      if (value !== null) {
        result += stringifyStructure(value, indent + 2);
      }
    });
    
    return result;
  };
  
  return stringifyStructure(structure);
};

/**
 * Extract representative code snippets from files
 */
const extractRepresentativeSnippets = (
  fileContents: { [key: string]: string }
): { [key: string]: string } => {
  const snippets: { [key: string]: string } = {};
  const MAX_SNIPPET_LENGTH = 2000;
  const MAX_TOTAL_SNIPPETS = 10;
  
  // Sort files by importance (similar to identifyKeyFiles)
  const scoredFiles = Object.keys(fileContents).map(filePath => {
    const content = fileContents[filePath];
    let score = 0;
    
    // Various scoring criteria
    if (filePath.includes('index') || filePath.includes('main')) score += 50;
    if (filePath.includes('config')) score += 40;
    const importCount = (content.match(/import /g) || []).length;
    score += importCount * 5;
    
    return { filePath, score };
  });
  
  // Sort by score and take the top files
  scoredFiles.sort((a, b) => b.score - a.score);
  const selectedFiles = scoredFiles.slice(0, MAX_TOTAL_SNIPPETS).map(f => f.filePath);
  
  // For each selected file, extract a representative snippet
  selectedFiles.forEach(filePath => {
    const content = fileContents[filePath];
    
    if (content.length <= MAX_SNIPPET_LENGTH) {
      // If file is small enough, use the whole content
      snippets[filePath] = content;
    } else {
      // For larger files, extract important parts
      let snippet = '';
      
      // Try to extract imports/includes
      const importMatches = content.match(/import .+?;/g) || [];
      snippet += importMatches.join('\n') + '\n\n';
      
      // Try to extract class/function definitions
      const defMatches = content.match(
        /(class|function|const|interface|type|struct) .+?{/g
      ) || [];
      
      // For each definition, add some context
      defMatches.forEach(def => {
        const defStart = content.indexOf(def);
        if (defStart >= 0) {
          // Extract the definition and some lines after it
          const contextEnd = content.indexOf('\n\n', defStart + def.length);
          const contextSnippet = content.substring(
            defStart,
            contextEnd > 0 ? contextEnd : defStart + 500
          );
          
          if (snippet.length + contextSnippet.length <= MAX_SNIPPET_LENGTH) {
            snippet += contextSnippet + '\n\n';
          }
        }
      });
      
      // If still space, add the beginning of the file
      if (snippet.length < MAX_SNIPPET_LENGTH) {
        const remainingLength = MAX_SNIPPET_LENGTH - snippet.length;
        snippet += '// Beginning of file:\n' + content.substring(0, remainingLength);
      }
      
      snippets[filePath] = snippet;
    }
  });
  
  return snippets;
};

/**
 * Parse documentation text into structured sections
 */
const parseDocumentation = (documentation: string): any => {
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
    console.error('Error parsing documentation:', error);
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
    console.error('Error parsing insights:', error);
    return ['Error parsing insights from analysis.'];
  }
};

/**
 * Generate a description for a file based on its content
 */
const getFileDescription = (filePath: string, content: string): string => {
  const fileName = path.basename(filePath);
  const extension = path.extname(filePath).toLowerCase();
  
  // Check if it's a specific type of file
  if (fileName === 'package.json') {
    return 'Project dependencies and configuration';
  } else if (fileName.includes('config')) {
    return 'Configuration file for the project';
  } else if (fileName.includes('index')) {
    return 'Entry point module';
  } else if (fileName.includes('test') || fileName.includes('spec')) {
    return 'Test file';
  }
  
  // Determine by extension
  if (extension === '.js' || extension === '.ts') {
    if (content.includes('class') || content.includes('interface')) {
      return 'Contains class definitions and business logic';
    } else if (content.includes('function') || content.includes('=>')) {
      return 'Contains utility functions';
    } else {
      return 'JavaScript/TypeScript module';
    }
  } else if (extension === '.jsx' || extension === '.tsx') {
    return 'React component';
  } else if (extension === '.css' || extension === '.scss') {
    return 'Stylesheet';
  } else if (extension === '.html') {
    return 'HTML template';
  } else if (extension === '.md') {
    return 'Documentation file';
  }
  
  return `File in the project`;
};

/**
 * Calculate a quality score based on issues
 */
const calculateQualityScore = (issues: any[]): string => {
  if (issues.length === 0) return 'A+';
  
  // Count issues by severity
  const errorCount = issues.filter(i => i.type === 'Error').length;
  const warningCount = issues.filter(i => i.type === 'Warning').length;
  const improvementCount = issues.filter(i => i.type === 'Improvement').length;
  
  // Calculate score (errors are worse than warnings)
  const score = 100 - (errorCount * 15 + warningCount * 5 + improvementCount * 1);
  
  // Convert to letter grade
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 67) return 'D+';
  if (score >= 63) return 'D';
  if (score >= 60) return 'D-';
  return 'F';
};

/**
 * Calculate a security score based on vulnerabilities
 */
const calculateSecurityScore = (vulnerabilities: any[]): string => {
  if (vulnerabilities.length === 0) return 'A+';
  
  // Count vulnerabilities by severity
  const highCount = vulnerabilities.filter(v => v.severity === 'High').length;
  const mediumCount = vulnerabilities.filter(v => v.severity === 'Medium').length;
  const lowCount = vulnerabilities.filter(v => v.severity === 'Low').length;
  
  // Calculate score (high severity vulnerabilities are much worse)
  const score = 100 - (highCount * 30 + mediumCount * 10 + lowCount * 3);
  
  // Convert to letter grade
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 67) return 'D+';
  if (score >= 63) return 'D';
  if (score >= 60) return 'D-';
  return 'F';
};

/**
 * Determine complexity based on code metrics
 */
const determineComplexity = (fileContents: { [key: string]: string }, stats: any): string => {
  // Calculate average lines per file
  const averageLinesPerFile = stats.lines / stats.files;
  
  // Count complexity indicators
  let totalComplexityScore = 0;
  let filesAnalyzed = 0;
  
  Object.values(fileContents).forEach(content => {
    let fileComplexity = 0;
    
    // Count nested blocks
    const nestLevel = Math.max(
      ...content.split('\n').map(line => {
        const indentation = line.search(/\S/);
        return indentation > 0 ? indentation / 2 : 0; // Assuming 2 spaces per level
      })
    );
    
    // Count conditionals
    const ifCount = (content.match(/if\s*\(/g) || []).length;
    const switchCount = (content.match(/switch\s*\(/g) || []).length;
    const ternaryCount = (content.match(/\?.*:/g) || []).length;
    
    // Count loops
    const loopCount = (
      (content.match(/for\s*\(/g) || []).length +
      (content.match(/while\s*\(/g) || []).length +
      (content.match(/forEach/g) || []).length +
      (content.match(/map\s*\(/g) || []).length
    );
    
    // Count function definitions
    const functionCount = (
      (content.match(/function\s+\w+\s*\(/g) || []).length +
      (content.match(/\w+\s*=\s*function\s*\(/g) || []).length +
      (content.match(/\w+\s*=\s*\(.*\)\s*=>/g) || []).length
    );
    
    fileComplexity = nestLevel * 2 + ifCount + switchCount * 2 + ternaryCount + 
                      loopCount * 2 + functionCount;
    
    totalComplexityScore += fileComplexity;
    filesAnalyzed++;
  });
  
  // Calculate average complexity
  const averageComplexity = filesAnalyzed > 0 ? totalComplexityScore / filesAnalyzed : 0;
  
  // Determine complexity label
  if (averageLinesPerFile > 200 || averageComplexity > 50) {
    return 'High';
  } else if (averageLinesPerFile > 100 || averageComplexity > 25) {
    return 'Medium';
  } else {
    return 'Low';
  }
};

/**
 * Analyze code with OpenAI API
 */
const analyzeWithOpenAI = async (
  repository: any,
  fileContents: { [key: string]: string },
  stats: any
) => {
  try {
    // Create an instance of the OpenAI service
    const openai = new OpenAIService();
    
    // Initialize results structure with basic stats
    const results: {
      summary: {
        lines: number;
        files: number;
        issues: number;
        vulnerabilities: number;
        quality: string;
        security: string;
        complexity: string;
      };
      vulnerabilities: any[];
      codeQuality: any[];
      keyFiles: any[];
      keyInsights: string[];
      documentation: {
        overview: string;
        architecture: string;
        setup: string;
        deployment: string;
      };
    } = {
      summary: {
        lines: stats.lines,
        files: stats.files,
        issues: 0,
        vulnerabilities: 0,
        quality: '',
        security: '',
        complexity: '',
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
    
    // Select key files for detailed analysis
    const keyFilePaths = identifyKeyFiles(fileContents, stats);
    
    // Analyze each key file
    const securityIssues = [];
    const qualityIssues = [];
    
    for (const filePath of keyFilePaths) {
      const fileContent = fileContents[filePath];
      
      // Security analysis
      try {
        const securityAnalysis = await openai.analyzeCode(fileContent, { 
          focusArea: 'security',
          maxTokens: 1000
        });
        
        const parsedSecurityIssues = parseSecurityIssues(securityAnalysis, filePath);
        securityIssues.push(...parsedSecurityIssues);
      } catch (error) {
        console.error(`Error analyzing security for ${filePath}:`, error);
      }
      
      // Code quality analysis
      try {
        const qualityAnalysis = await openai.analyzeCode(fileContent, { 
          focusArea: 'quality',
          maxTokens: 1000
        });
        
        const parsedQualityIssues = parseQualityIssues(qualityAnalysis, filePath);
        qualityIssues.push(...parsedQualityIssues);
      } catch (error) {
        console.error(`Error analyzing code quality for ${filePath}:`, error);
      }
    }
    
    // Set vulnerabilities and code quality issues
    results.vulnerabilities = securityIssues;
    results.codeQuality = qualityIssues;
    results.summary.issues = qualityIssues.length;
    results.summary.vulnerabilities = securityIssues.length;
    
    // Generate documentation
    try {
      const fileStructure = generateFileStructure(Object.keys(fileContents));
      const representativeSnippets = extractRepresentativeSnippets(fileContents);
      
      const documentationText = await openai.generateDocumentation(
        repository,
        fileStructure,
        representativeSnippets
      );
      
      results.documentation = parseDocumentation(documentationText);
    } catch (error) {
      console.error('Error generating documentation:', error);
      // Use fallback values if documentation generation fails
      results.documentation = {
        overview: `${repository.name} is a software project with ${stats.files} files.`,
        architecture: 'Unable to generate architecture documentation.',
        setup: 'Unable to generate setup documentation.',
        deployment: 'Unable to generate deployment documentation.',
      };
    }
    
    // Generate key insights
    try {
      // Prepare analysis data for insight extraction
      const analysisData = {
        repository: {
          name: repository.name,
          files: stats.files,
          lines: stats.lines,
          languages: stats.languages,
        },
        securityIssues: securityIssues.length,
        qualityIssues: qualityIssues.length,
      };
      
      const insightsText = await openai.extractInsights(analysisData);
      results.keyInsights = parseInsights(insightsText);
    } catch (error) {
      console.error('Error extracting insights:', error);
      // Fallback to basic insights
      const languages = stats.languages as Record<string, number>;
      const sortedLanguages = Object.entries(languages)
        .sort((a, b) => (b[1] as number) - (a[1] as number));
      const primaryLanguage = sortedLanguages.length > 0 ? sortedLanguages[0][0] : 'Unknown';
      
      results.keyInsights = [
        `Repository contains ${stats.files} files with ${stats.lines} lines of code`,
        `Primary language is ${primaryLanguage}`,
      ];
    }
    
    // Identify and add key files
    results.keyFiles = keyFilePaths.map(filePath => ({
      path: filePath,
      description: getFileDescription(filePath, fileContents[filePath]),
      size: `${(fileContents[filePath].length / 1024).toFixed(1)} KB`,
    }));
    
    // Calculate summary scores
    results.summary.quality = calculateQualityScore(qualityIssues);
    results.summary.security = calculateSecurityScore(securityIssues);
    results.summary.complexity = determineComplexity(fileContents, stats);
    
    return results;
  } catch (error) {
    console.error('Error in analyzeWithOpenAI:', error);
    
    // Process languages for primaryLanguage calculation
    const languages = stats.languages as Record<string, number>;
    const sortedLanguages = Object.entries(languages)
      .sort((a, b) => (b[1] as number) - (a[1] as number));
    const primaryLanguage = sortedLanguages.length > 0 ? sortedLanguages[0][0] : 'Unknown';
    
    // Return basic results with error information
    return {
      summary: {
        quality: 'N/A',
        security: 'N/A',
        complexity: 'Unknown',
        lines: stats.lines,
        files: stats.files,
        issues: 0,
        vulnerabilities: 0,
      },
      vulnerabilities: [],
      codeQuality: [],
      keyFiles: Object.keys(fileContents).slice(0, 5).map(file => ({
        path: file,
        description: `File in the ${repository.name} repository`,
        size: `${(fileContents[file].length / 1024).toFixed(1)} KB`,
      })),
      keyInsights: [
        `Repository contains ${stats.files} files with ${stats.lines} lines of code`,
        `Primary language is ${primaryLanguage}`,
        'Error occurred during AI analysis.',
      ],
      documentation: {
        overview: `${repository.name} is a software project with ${stats.files} files.`,
        architecture: 'Unable to generate architecture documentation due to an error.',
        setup: 'Unable to generate setup documentation due to an error.',
        deployment: 'Unable to generate deployment documentation due to an error.',
      },
    };
  }
};
