import { Request, Response, NextFunction } from 'express';
import { getCache } from '../services/cache';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  keyGenerator?: (req: Request) => string;
  skipCache?: (req: Request) => boolean;
  varyBy?: string[]; // Query parameters to include in cache key
}

// Cache middleware factory
export function cacheMiddleware(options: CacheOptions = {}) {
  const cache = getCache();
  
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip caching if specified
      if (options.skipCache && options.skipCache(req)) {
        return next();
      }

      // Generate cache key
      const cacheKey = options.keyGenerator 
        ? options.keyGenerator(req)
        : generateDefaultCacheKey(req, options.varyBy);

      // Try to get from cache
      const cachedData = await cache.get(cacheKey);
      
      if (cachedData) {
        // Add cache headers
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
          'Cache-Control': `public, max-age=${options.ttl || 300}`
        });
        
        return res.json(cachedData);
      }

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache the response
      res.json = function(data: any) {
        // Cache the response data
        cache.set(cacheKey, data, options.ttl).catch(error => {
          console.error('Failed to cache response:', error);
        });

        // Add cache headers
        res.set({
          'X-Cache': 'MISS',
          'X-Cache-Key': cacheKey,
          'Cache-Control': `public, max-age=${options.ttl || 300}`
        });

        // Call original json method
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      // Continue without caching on error
      next();
    }
  };
}

// Generate default cache key from request
function generateDefaultCacheKey(req: Request, varyBy?: string[]): string {
  const baseKey = `${req.method}:${req.route?.path || req.path}`;
  
  if (!varyBy || varyBy.length === 0) {
    return baseKey;
  }

  // Include specified query parameters in cache key
  const params = varyBy
    .map(param => `${param}=${req.query[param] || ''}`)
    .join('&');

  return `${baseKey}:${params}`;
}

// Cache invalidation middleware
export function cacheInvalidationMiddleware(patterns: string[]) {
  const cache = getCache();
  
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original methods
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    // Override response methods to invalidate cache on successful operations
    const invalidateCache = async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          for (const pattern of patterns) {
            await cache.delPattern(pattern);
          }
        } catch (error) {
          console.error('Cache invalidation error:', error);
        }
      }
    };

    res.json = function(data: any) {
      invalidateCache();
      return originalJson(data);
    };

    res.send = function(data: any) {
      invalidateCache();
      return originalSend(data);
    };

    next();
  };
}

// Specific cache configurations for different endpoints
export const CacheConfigs = {
  // Revenue data - cache for 5 minutes
  revenue: {
    ttl: 300,
    varyBy: ['startDate', 'endDate', 'period']
  },

  // Product performance - cache for 10 minutes
  products: {
    ttl: 600,
    varyBy: ['startDate', 'endDate', 'limit', 'sortBy']
  },

  // Traffic patterns - cache for 15 minutes
  traffic: {
    ttl: 900,
    varyBy: ['startDate', 'endDate', 'dayOfWeek', 'maxCapacity']
  },

  // Customer insights - cache for 20 minutes
  customers: {
    ttl: 1200,
    varyBy: ['startDate', 'endDate']
  },

  // Inventory analysis - cache for 30 minutes
  inventory: {
    ttl: 1800,
    varyBy: ['startDate', 'endDate', 'productId']
  },

  // Long-term data (seasonal, yearly) - cache for 1 hour
  longTerm: {
    ttl: 3600,
    varyBy: ['year']
  }
};

// Cache warming functions
export class CacheWarmer {
  private cache = getCache();

  // Warm up revenue cache with common date ranges
  async warmRevenueCache() {
    const commonRanges = [
      { days: 7, period: 'daily' },
      { days: 30, period: 'daily' },
      { days: 90, period: 'weekly' },
      { days: 365, period: 'monthly' }
    ];

    for (const range of commonRanges) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - range.days);

      // This would typically call the actual data fetching function
      // For now, we'll just create placeholder cache entries
      const cacheKey = `revenue:metrics:${startDate.toISOString().split('T')[0]}:${endDate.toISOString().split('T')[0]}:${range.period}`;
      
      console.log(`Warming cache for: ${cacheKey}`);
      // In a real implementation, you'd fetch and cache the actual data here
    }
  }

  // Warm up product performance cache
  async warmProductCache() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const cacheKey = `products:performance:${startDate.toISOString().split('T')[0]}:${endDate.toISOString().split('T')[0]}:10:revenue`;
    
    console.log(`Warming cache for: ${cacheKey}`);
    // In a real implementation, you'd fetch and cache the actual data here
  }

  // Schedule cache warming
  scheduleWarmup() {
    // Warm cache every hour
    setInterval(() => {
      this.warmRevenueCache().catch(console.error);
      this.warmProductCache().catch(console.error);
    }, 60 * 60 * 1000); // 1 hour

    // Initial warmup
    setTimeout(() => {
      this.warmRevenueCache().catch(console.error);
      this.warmProductCache().catch(console.error);
    }, 5000); // 5 seconds after startup
  }
}

// Cache health check
export async function cacheHealthCheck(): Promise<{
  status: 'healthy' | 'unhealthy';
  details: any;
}> {
  const cache = getCache();
  
  try {
    const isHealthy = await cache.healthCheck();
    const stats = await cache.getStats();
    
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      details: {
        connected: isHealthy,
        stats: stats
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}