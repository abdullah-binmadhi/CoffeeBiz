import Redis from 'ioredis';

export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  ttl?: number; // Default TTL in seconds
}

export class CacheService {
  private redis: Redis;
  private defaultTTL: number;
  private keyPrefix: string;

  constructor(config: CacheConfig) {
    this.redis = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db || 0,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.defaultTTL = config.ttl || 300; // 5 minutes default
    this.keyPrefix = config.keyPrefix || 'coffeebiz:';

    // Handle Redis connection events
    this.redis.on('connect', () => {
      console.log('✅ Redis connected');
    });

    this.redis.on('error', (error) => {
      console.error('❌ Redis connection error:', error);
    });

    this.redis.on('ready', () => {
      console.log('🚀 Redis ready for operations');
    });
  }

  private getKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  // Get cached data
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(this.getKey(key));
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Set cached data with TTL
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const serializedValue = JSON.stringify(value);
      const expiration = ttl || this.defaultTTL;
      
      await this.redis.setex(this.getKey(key), expiration, serializedValue);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  // Delete cached data
  async del(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(this.getKey(key));
      return result > 0;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  // Delete multiple keys by pattern
  async delPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(this.getKey(pattern));
      if (keys.length === 0) return 0;
      
      const result = await this.redis.del(...keys);
      return result;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return 0;
    }
  }

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(this.getKey(key));
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  // Get TTL for a key
  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(this.getKey(key));
    } catch (error) {
      console.error('Cache TTL error:', error);
      return -1;
    }
  }

  // Increment a counter
  async incr(key: string, ttl?: number): Promise<number> {
    try {
      const fullKey = this.getKey(key);
      const result = await this.redis.incr(fullKey);
      
      if (result === 1 && ttl) {
        await this.redis.expire(fullKey, ttl);
      }
      
      return result;
    } catch (error) {
      console.error('Cache increment error:', error);
      return 0;
    }
  }

  // Set multiple keys at once
  async mset(keyValuePairs: Record<string, any>, ttl?: number): Promise<boolean> {
    try {
      const pipeline = this.redis.pipeline();
      const expiration = ttl || this.defaultTTL;

      Object.entries(keyValuePairs).forEach(([key, value]) => {
        const fullKey = this.getKey(key);
        const serializedValue = JSON.stringify(value);
        pipeline.setex(fullKey, expiration, serializedValue);
      });

      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Cache mset error:', error);
      return false;
    }
  }

  // Get multiple keys at once
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const fullKeys = keys.map(key => this.getKey(key));
      const results = await this.redis.mget(...fullKeys);
      
      return results.map(result => 
        result ? JSON.parse(result) : null
      );
    } catch (error) {
      console.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  // Cache with automatic refresh
  async getOrSet<T>(
    key: string, 
    fetchFunction: () => Promise<T>, 
    ttl?: number
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      // If not in cache, fetch the data
      const data = await fetchFunction();
      
      // Store in cache
      await this.set(key, data, ttl);
      
      return data;
    } catch (error) {
      console.error('Cache getOrSet error:', error);
      // If cache fails, still return the fetched data
      return await fetchFunction();
    }
  }

  // Flush all cache
  async flushAll(): Promise<boolean> {
    try {
      await this.redis.flushdb();
      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }

  // Get cache statistics
  async getStats(): Promise<any> {
    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      return {
        memory: info,
        keyspace: keyspace,
        connected: this.redis.status === 'ready'
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return null;
    }
  }

  // Close Redis connection
  async close(): Promise<void> {
    await this.redis.quit();
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Cache health check failed:', error);
      return false;
    }
  }
}

// Cache key generators for different data types
export class CacheKeys {
  static revenue = {
    metrics: (startDate: string, endDate: string, period?: string) => 
      `revenue:metrics:${startDate}:${endDate}:${period || 'daily'}`,
    trends: (period: string, limit: number) => 
      `revenue:trends:${period}:${limit}`,
    comparison: (currentStart: string, currentEnd: string, compareStart: string, compareEnd: string) =>
      `revenue:comparison:${currentStart}:${currentEnd}:${compareStart}:${compareEnd}`
  };

  static products = {
    performance: (startDate: string, endDate: string, limit: number, sortBy: string) =>
      `products:performance:${startDate}:${endDate}:${limit}:${sortBy}`,
    trends: (productId: string, period: string, limit: number) =>
      `products:trends:${productId}:${period}:${limit}`,
    categories: (startDate: string, endDate: string) =>
      `products:categories:${startDate}:${endDate}`,
    seasonal: (year: number) =>
      `products:seasonal:${year}`
  };

  static traffic = {
    hourly: (startDate: string, endDate: string, dayOfWeek?: string) =>
      `traffic:hourly:${startDate}:${endDate}:${dayOfWeek || 'all'}`,
    daily: (startDate: string, endDate: string) =>
      `traffic:daily:${startDate}:${endDate}`,
    patterns: (startDate: string, endDate: string) =>
      `traffic:patterns:${startDate}:${endDate}`,
    capacity: (startDate: string, endDate: string, maxCapacity: number) =>
      `traffic:capacity:${startDate}:${endDate}:${maxCapacity}`
  };

  static customers = {
    insights: (startDate: string, endDate: string) =>
      `customers:insights:${startDate}:${endDate}`,
    retention: (startDate: string, endDate: string) =>
      `customers:retention:${startDate}:${endDate}`,
    segments: (startDate: string, endDate: string) =>
      `customers:segments:${startDate}:${endDate}`
  };

  static inventory = {
    analysis: (startDate: string, endDate: string) =>
      `inventory:analysis:${startDate}:${endDate}`,
    forecasting: (productId: string, days: number) =>
      `inventory:forecasting:${productId}:${days}`
  };
}

// Singleton cache instance
let cacheInstance: CacheService | null = null;

export function getCache(): CacheService {
  if (!cacheInstance) {
    const config: CacheConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'coffeebiz:',
      ttl: parseInt(process.env.REDIS_DEFAULT_TTL || '300') // 5 minutes
    };

    cacheInstance = new CacheService(config);
  }

  return cacheInstance;
}

export async function closeCacheConnection(): Promise<void> {
  if (cacheInstance) {
    await cacheInstance.close();
    cacheInstance = null;
  }
}