import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

/**
 * Configuration class for centralized access to environment variables
 * and application settings
 */
class Config {
  // Server configuration
  readonly PORT: number = parseInt(process.env.PORT || '5000', 10);
  readonly NODE_ENV: string = process.env.NODE_ENV || 'development';
  
  // MongoDB configuration
  readonly MONGO_URI: string = process.env.MONGO_URI || 'mongodb://localhost:27017/codeinsight';
  
  // JWT configuration
  readonly JWT_SECRET: string = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
  readonly JWT_EXPIRATION: string = process.env.JWT_EXPIRATION || '1d';
  
  // GitHub OAuth configuration
  readonly GITHUB_CLIENT_ID: string = process.env.GITHUB_CLIENT_ID || '';
  readonly GITHUB_CLIENT_SECRET: string = process.env.GITHUB_CLIENT_SECRET || '';
  readonly GITHUB_CALLBACK_URL: string = process.env.GITHUB_CALLBACK_URL || '/api/auth/github/callback';
  
  // OpenAI configuration
  readonly OPENAI_API_KEY: string = process.env.OPENAI_API_KEY || '';
  
  // Redis configuration
  readonly REDIS_URL: string = process.env.REDIS_URL || 'redis://localhost:6379';
  
  // Client URL for redirects
  readonly CLIENT_URL: string = process.env.CLIENT_URL || 'http://localhost:3000';
  
  // Temporary directory for cloning repositories
  readonly TEMP_DIR: string = process.env.TEMP_DIR || path.join(process.cwd(), 'tmp');
  
  // Rate limiting configuration
  readonly RATE_LIMIT_WINDOW_MS: number = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
  readonly RATE_LIMIT_MAX_REQUESTS: number = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);
  
  // Logging configuration
  readonly LOG_LEVEL: string = process.env.LOG_LEVEL || (this.NODE_ENV === 'production' ? 'info' : 'debug');
  readonly LOG_DIR: string = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
  
  // CORS configuration
  readonly CORS_ORIGIN: string = process.env.CORS_ORIGIN || '*';
  
  /**
   * Check if required environment variables are set
   */
  validate(): boolean {
    const requiredVars = [
      'JWT_SECRET',
      'GITHUB_CLIENT_ID',
      'GITHUB_CLIENT_SECRET',
    ];
    
    const missingVars = requiredVars.filter(varName => !this[varName as keyof Config]);
    
    if (missingVars.length > 0) {
      console.warn(`Missing required environment variables: ${missingVars.join(', ')}`);
      return false;
    }
    
    return true;
  }
  
  /**
   * Log configuration for debugging
   */
  logConfig(): void {
    if (this.NODE_ENV !== 'production') {
      console.log('Server Configuration:');
      console.log(`- Environment: ${this.NODE_ENV}`);
      console.log(`- Port: ${this.PORT}`);
      console.log(`- MongoDB URI: ${this.MONGO_URI}`);
      console.log(`- Redis URL: ${this.REDIS_URL}`);
      console.log(`- GitHub OAuth: ${this.GITHUB_CLIENT_ID ? 'Configured' : 'Not configured'}`);
      console.log(`- OpenAI API: ${this.OPENAI_API_KEY ? 'Configured' : 'Not configured'}`);
      console.log(`- Client URL: ${this.CLIENT_URL}`);
    }
  }
}

// Export a singleton instance
export const config = new Config();
