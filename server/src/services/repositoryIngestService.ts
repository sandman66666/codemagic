import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { logger } from '../utils/logger';

/**
 * Service for ingesting repositories using the gitingest Python library
 * This service interfaces with the repository-ingest.py script to provide
 * repository analysis optimized for LLMs
 */
export class RepositoryIngestService {
  private pythonScript: string;
  public tempDir: string;

  constructor() {
    // Determine the correct path to the Python script based on environment
    if (process.env.NODE_ENV === 'production') {
      // In Heroku, check different possible locations for the script
      const productionPaths = [
        // In the app root directory
        path.join(process.cwd(), 'repository-ingest.py'),
        // At the same level as server directory
        path.join(process.cwd(), '..', 'repository-ingest.py'),
        // Directly in /app directory (Heroku's root)
        '/app/repository-ingest.py'
      ];
      
      // Find the first path that exists
      const existingPath = productionPaths.find(p => fs.existsSync(p));
      if (existingPath) {
        this.pythonScript = existingPath;
        logger.info(`Found Python script at: ${this.pythonScript}`);
      } else {
        // Default to app root if none found (and log an error)
        this.pythonScript = path.join(process.cwd(), 'repository-ingest.py');
        logger.error(`Python script not found at any expected locations: ${productionPaths.join(', ')}`);
      }
    } else {
      // Development environment - script is in project root, one level up from server
      this.pythonScript = path.join(process.cwd(), '..', 'repository-ingest.py');
    }
    
    // Configure the temp directory to work across environments
    const configTempDir = process.env.TEMP_DIR;
    if (configTempDir && configTempDir !== './tmp') {
      this.tempDir = path.resolve(configTempDir);
    } else if (process.env.NODE_ENV === 'production') {
      // In Heroku (production), use the /tmp directory which is writable
      this.tempDir = path.join('/tmp', 'codeinsight');
    } else {
      // In development, use os.tmpdir()
      this.tempDir = path.join(os.tmpdir(), 'codeinsight');
    }
    
    // Ensure the temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      try {
        fs.mkdirSync(this.tempDir, { recursive: true });
        logger.info(`Created temp directory: ${this.tempDir}`);
      } catch (error) {
        logger.error(`Failed to create temp directory: ${error}`);
      }
    }
    
    // Ensure the script exists
    if (!fs.existsSync(this.pythonScript)) {
      logger.error(`Python script not found: ${this.pythonScript}`);
    }
  }

  /**
   * Process a repository using gitingest
   * @param repoPath Path to repository or repository ID in temp directory
   * @param repoId Optional identifier for the repository
   * @returns Promise resolving to file paths and metadata
   */
  async processRepository(repoPath: string, repoId?: string): Promise<any> {
    try {
      logger.info(`Processing repository with gitingest: ${repoPath}`);
      
      // Determine if repoPath is a full path or just an ID
      let fullRepoPath = repoPath;
      if (!repoPath.includes(path.sep) && !repoPath.startsWith('http')) {
        // Assume it's a repository ID in the temp directory
        fullRepoPath = path.join(this.tempDir, repoPath);
      }
      
      return new Promise((resolve, reject) => {
        // Build command arguments
        const args = ['--repo', fullRepoPath];
        
        // Add optional repo ID if provided
        if (repoId) {
          args.push('--repo-id', repoId);
        }
        
        // Execute the Python script
        const pythonProcess = spawn('python', [this.pythonScript, ...args]);
        
        let stdout = '';
        let stderr = '';
        
        pythonProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        pythonProcess.on('close', (code) => {
          if (code !== 0) {
            logger.error(`Python script exited with code ${code}: ${stderr}`);
            reject(new Error(`Repository ingestion failed: ${stderr}`));
            return;
          }
          
          // Parse output files from the metadata file
          try {
            const metadataPath = path.join(this.tempDir, `${repoId || path.basename(repoPath)}_metadata.json`);
            if (fs.existsSync(metadataPath)) {
              const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
              resolve(metadata);
            } else {
              // If metadata file not found, construct basic response
              resolve({
                processed: true,
                message: stdout,
                files: {
                  summary: path.join(this.tempDir, `${repoId || path.basename(repoPath)}_summary.txt`),
                  tree: path.join(this.tempDir, `${repoId || path.basename(repoPath)}_tree.txt`),
                  content: path.join(this.tempDir, `${repoId || path.basename(repoPath)}_content.txt`),
                }
              });
            }
          } catch (err) {
            logger.error(`Error parsing metadata: ${err}`);
            reject(err);
          }
        });
      });
    } catch (error) {
      logger.error(`Error processing repository: ${error}`);
      throw error;
    }
  }

  /**
   * Process the latest repository in the temp directory
   * @returns Promise resolving to file paths and metadata
   */
  async processLatestRepository(): Promise<any> {
    try {
      logger.info('Processing latest repository with gitingest');
      
      return new Promise((resolve, reject) => {
        // Execute the Python script with --latest flag
        const pythonProcess = spawn('python', [this.pythonScript, '--latest']);
        
        let stdout = '';
        let stderr = '';
        
        pythonProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        pythonProcess.on('close', (code) => {
          if (code !== 0) {
            logger.error(`Python script exited with code ${code}: ${stderr}`);
            reject(new Error(`Repository ingestion failed: ${stderr}`));
            return;
          }
          
          // Parse out the metadata file path from stdout
          const metadataMatch = stdout.match(/metadata_file: (.+)/);
          if (metadataMatch && fs.existsSync(metadataMatch[1])) {
            try {
              const metadata = JSON.parse(fs.readFileSync(metadataMatch[1], 'utf8'));
              resolve(metadata);
            } catch (err) {
              logger.error(`Error parsing metadata: ${err}`);
              reject(err);
            }
          } else {
            // Return basic info if metadata file not found
            resolve({
              processed: true,
              message: stdout
            });
          }
        });
      });
    } catch (error) {
      logger.error(`Error processing latest repository: ${error}`);
      throw error;
    }
  }

  /**
   * Get the ingested content for a repository
   * @param repoId Repository identifier
   * @returns Object containing summary, tree, and content
   */
  async getRepositoryContent(repoId: string): Promise<{
    summary: string;
    tree: string;
    content: string;
  }> {
    try {
      const summaryPath = path.join(this.tempDir, `${repoId}_summary.txt`);
      const treePath = path.join(this.tempDir, `${repoId}_tree.txt`);
      const contentPath = path.join(this.tempDir, `${repoId}_content.txt`);
      
      // Check if files exist with detailed logging
      const missingFiles = [];
      if (!fs.existsSync(summaryPath)) missingFiles.push('summary');
      if (!fs.existsSync(treePath)) missingFiles.push('tree');
      if (!fs.existsSync(contentPath)) missingFiles.push('content');
      
      if (missingFiles.length > 0) {
        // List the temp directory contents for debugging
        let dirContents = [];
        try {
          dirContents = fs.readdirSync(this.tempDir);
          logger.info(`Temp directory (${this.tempDir}) contents: ${dirContents.join(', ')}`);
        } catch (err) {
          logger.error(`Failed to read temp directory contents: ${err}`);
        }
        
        throw new Error(
          `Ingested content not found for repository: ${repoId}. ` +
          `Missing files: ${missingFiles.join(', ')}. ` +
          `Temp directory path: ${this.tempDir}`
        );
      }
      
      // Read file contents
      const summary = fs.readFileSync(summaryPath, 'utf8');
      const tree = fs.readFileSync(treePath, 'utf8');
      const content = fs.readFileSync(contentPath, 'utf8');
      
      return { summary, tree, content };
    } catch (error) {
      logger.error(`Error getting repository content: ${error}`);
      throw error;
    }
  }

  /**
   * Check if a repository has been processed by gitingest
   * @param repoId Repository identifier
   * @returns True if the repository has been processed
   */
  isRepositoryProcessed(repoId: string): boolean {
    const metadataPath = path.join(this.tempDir, `${repoId}_metadata.json`);
    return fs.existsSync(metadataPath);
  }
}

// Export a singleton instance
export const repositoryIngestService = new RepositoryIngestService();