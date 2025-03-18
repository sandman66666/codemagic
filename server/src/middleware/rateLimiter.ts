import { Request, Response, NextFunction } from 'express';
import { redisService } from '../services/redisService';
import { AppError } from './errorHandler';
import { logger } from '../utils/logger';

interface RateLimitOptions {
  windowMs: number;   // Time window in milliseconds
  max: number;        // Maximum number of requests in the time window
  message?: string;   // Custom message for rate limit exceeded
  keyGenerator?: (req: Request) => string;  // Function to generate rate limit key
}

/**
 * Rate limiting middleware to prevent abuse of API endpoints
 */
export const rateLimiter = (options: RateLimitOptions) => {
  const windowMs = options.windowMs || 60 * 1000; // Default: 1 minute
  const max = options.max || 100; // Default: 100 requests per window
  const message = options.message || 'Too many requests, please try again later.';
  
  // Default key generator uses IP address
  const defaultKeyGenerator = (req: Request): string => {
    const ip = req.ip || 
               req.headers['x-forwarded-for'] || 
               req.socket.remoteAddress || 
               'unknown';
    return `rate-limit:${ip}`;
  };
  
  const keyGenerator = options.keyGenerator || defaultKeyGenerator;
  
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = keyGenerator(req);
      const ttlSeconds = Math.ceil(windowMs / 1000);
      
      // Increment the counter
      const count = await redisService.increment(key, ttlSeconds);
      
      // Set remaining and reset headers
      const remaining = Math.max(0, max - count);
      const resetTime = new Date(Date.now() + ttlSeconds * 1000);
      
      res.setHeader('X-RateLimit-Limit', max.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime.getTime() / 1000).toString());
      
      // If count exceeds max, reject the request
      if (count > max) {
        logger.warn(`Rate limit exceeded for ${key}`);
        throw new AppError(message, 429);
      }
      
      next();
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }
      
      // If Redis is down, still allow the request to proceed
      logger.error('Rate limiter error:', error);
      next();
    }
  };
};
