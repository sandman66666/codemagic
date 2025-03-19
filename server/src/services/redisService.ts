import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false';

class RedisService {
  private client: RedisClientType | null = null;
  private isConnected: boolean = false;
  private fallbackMode: boolean = false;
  private fallbackStorage: Map<string, { value: string, expiry?: number }> = new Map();

  constructor() {
    if (!REDIS_ENABLED) {
      logger.info('Redis disabled by configuration, using fallback mode');
      this.fallbackMode = true;
      return;
    }

    try {
      this.client = createClient({
        url: REDIS_URL,
      });

      this.client.on('error', (err) => {
        if (!this.fallbackMode) {
          logger.error('Redis Error:', err);
          logger.info('Switching to fallback mode due to Redis connection issues');
          this.fallbackMode = true;
        }
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis connected');
        this.isConnected = true;
        this.fallbackMode = false;
      });
    } catch (error) {
      logger.error('Error initializing Redis client:', error);
      logger.info('Switching to fallback mode');
      this.fallbackMode = true;
    }
  }

  async connect(): Promise<void> {
    if (this.fallbackMode) {
      return; // No need to connect in fallback mode
    }
    
    if (!this.isConnected && this.client) {
      try {
        await this.client.connect();
      } catch (error) {
        logger.error('Redis connection error:', error);
        logger.info('Switching to fallback mode');
        this.fallbackMode = true;
        // Don't rethrow the error - use fallback mode instead
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.fallbackMode) {
      return; // No need to disconnect in fallback mode
    }
    
    if (this.isConnected && this.client) {
      try {
        await this.client.disconnect();
        this.isConnected = false;
      } catch (error) {
        logger.error('Redis disconnect error:', error);
        // Don't rethrow the error
      }
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.fallbackMode) {
      const item = this.fallbackStorage.get(key);
      if (!item) return null;
      
      // Check if the item has expired
      if (item.expiry && item.expiry < Date.now()) {
        this.fallbackStorage.delete(key);
        return null;
      }
      
      return item.value;
    }
    
    try {
      if (!this.isConnected && this.client) await this.connect();
      if (this.fallbackMode || !this.client) {
        return this.get(key); // Recursive call will use fallback mode
      }
      return await this.client.get(key);
    } catch (error) {
      logger.error(`Redis get error for key ${key}:`, error);
      this.fallbackMode = true; // Switch to fallback mode on error
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    if (this.fallbackMode) {
      const expiry = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : undefined;
      this.fallbackStorage.set(key, { value, expiry });
      return true;
    }
    
    try {
      if (!this.isConnected && this.client) await this.connect();
      if (this.fallbackMode || !this.client) {
        return this.set(key, value, ttlSeconds); // Recursive call will use fallback mode
      }
      
      if (ttlSeconds) {
        await this.client.set(key, value, { EX: ttlSeconds });
      } else {
        await this.client.set(key, value);
      }
      
      return true;
    } catch (error) {
      logger.error(`Redis set error for key ${key}:`, error);
      this.fallbackMode = true; // Switch to fallback mode on error
      return this.set(key, value, ttlSeconds); // Retry in fallback mode
    }
  }

  async delete(key: string): Promise<boolean> {
    if (this.fallbackMode) {
      return this.fallbackStorage.delete(key);
    }
    
    try {
      if (!this.isConnected && this.client) await this.connect();
      if (this.fallbackMode || !this.client) {
        return this.delete(key); // Recursive call will use fallback mode
      }
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Redis delete error for key ${key}:`, error);
      this.fallbackMode = true; // Switch to fallback mode on error
      return this.delete(key); // Retry in fallback mode
    }
  }

  async increment(key: string, ttlSeconds?: number): Promise<number> {
    if (this.fallbackMode) {
      const item = this.fallbackStorage.get(key);
      let value = 1;
      
      if (item) {
        // Check if the item has expired
        if (item.expiry && item.expiry < Date.now()) {
          value = 1;
        } else {
          value = parseInt(item.value) + 1;
        }
      }
      
      const expiry = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : undefined;
      this.fallbackStorage.set(key, { value: value.toString(), expiry });
      return value;
    }
    
    try {
      if (!this.isConnected && this.client) await this.connect();
      if (this.fallbackMode || !this.client) {
        return this.increment(key, ttlSeconds); // Recursive call will use fallback mode
      }
      
      const value = await this.client.incr(key);
      
      if (ttlSeconds && value === 1) {
        await this.client.expire(key, ttlSeconds);
      }
      
      return value;
    } catch (error) {
      logger.error(`Redis increment error for key ${key}:`, error);
      this.fallbackMode = true; // Switch to fallback mode on error
      return this.increment(key, ttlSeconds); // Retry in fallback mode
    }
  }

  async exists(key: string): Promise<boolean> {
    if (this.fallbackMode) {
      const item = this.fallbackStorage.get(key);
      if (!item) return false;
      
      // Check if the item has expired
      if (item.expiry && item.expiry < Date.now()) {
        this.fallbackStorage.delete(key);
        return false;
      }
      
      return true;
    }
    
    try {
      if (!this.isConnected && this.client) await this.connect();
      if (this.fallbackMode || !this.client) {
        return this.exists(key); // Recursive call will use fallback mode
      }
      
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Redis exists error for key ${key}:`, error);
      this.fallbackMode = true; // Switch to fallback mode on error
      return this.exists(key); // Retry in fallback mode
    }
  }
}

// Export a singleton instance
export const redisService = new RedisService();
