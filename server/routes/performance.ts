import { Router, Request, Response, NextFunction } from 'express';
import { getCache } from '../services/cache';
import { getJobService } from '../services/jobs';
import { getDatabase } from '../../database/connection';
import { PerformanceMonitor } from '../middleware/performance';

const router = Router();

// GET /api/performance/metrics - Get performance metrics
router.get('/metrics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cache = getCache();
    const jobService = getJobService();
    const db = getDatabase();

    // Get cache statistics
    const cacheStats = await cache.getStats();
    const cacheHealth = await cache.healthCheck();

    // Get job queue statistics
    const jobStats = await jobService.getQueueStats();

    // Get database connection pool stats
    const dbStats = db.getPoolStats();

    // Get application performance metrics
    const appMetrics = PerformanceMonitor.getAllMetrics();

    // Get system memory usage
    const memoryUsage = process.memoryUsage();

    res.json({
      timestamp: new Date().toISOString(),
      cache: {
        healthy: cacheHealth,
        stats: cacheStats
      },
      jobs: jobStats,
      database: {
        connections: dbStats
      },
      application: {
        metrics: appMetrics,
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
          external: Math.round(memoryUsage.external / 1024 / 1024) // MB
        },
        uptime: process.uptime(),
        nodeVersion: process.version
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/performance/cache - Get cache-specific metrics
router.get('/cache', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cache = getCache();
    
    const health = await cache.healthCheck();
    const stats = await cache.getStats();

    res.json({
      healthy: health,
      stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/performance/cache/clear - Clear cache
router.post('/cache/clear', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cache = getCache();
    const { pattern } = req.body;

    let clearedCount = 0;
    
    if (pattern) {
      clearedCount = await cache.delPattern(pattern);
    } else {
      await cache.flushAll();
      clearedCount = -1; // Indicates full flush
    }

    res.json({
      success: true,
      clearedCount: clearedCount,
      pattern: pattern || 'all',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/performance/jobs - Get job queue metrics
router.get('/jobs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobService = getJobService();
    const stats = await jobService.getQueueStats();

    res.json({
      queues: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/performance/database - Get database performance metrics
router.get('/database', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    
    // Get connection pool stats
    const poolStats = db.getPoolStats();

    // Get database size information
    const sizeQuery = `
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `;
    
    const sizeResult = await db.query(sizeQuery);

    // Get index usage statistics
    const indexQuery = `
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch
      FROM pg_stat_user_indexes
      ORDER BY idx_scan DESC
      LIMIT 20
    `;
    
    const indexResult = await db.query(indexQuery);

    // Get slow query information (if available)
    const slowQueryQuery = `
      SELECT 
        query,
        calls,
        total_time,
        mean_time,
        rows
      FROM pg_stat_statements
      WHERE mean_time > 100
      ORDER BY mean_time DESC
      LIMIT 10
    `;
    
    let slowQueries = [];
    try {
      const slowQueryResult = await db.query(slowQueryQuery);
      slowQueries = slowQueryResult.rows;
    } catch (error) {
      // pg_stat_statements extension might not be enabled
      console.log('pg_stat_statements not available');
    }

    res.json({
      connections: poolStats,
      tableSizes: sizeResult.rows,
      indexUsage: indexResult.rows,
      slowQueries: slowQueries,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/performance/database/analyze - Analyze database performance
router.post('/database/analyze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    
    // Run ANALYZE on all tables
    await db.query('SELECT analyze_query_performance()');

    res.json({
      success: true,
      message: 'Database analysis completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/performance/materialized-views/refresh - Refresh materialized views
router.post('/materialized-views/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    
    // Refresh all materialized views
    await db.query('SELECT refresh_all_materialized_views()');

    res.json({
      success: true,
      message: 'Materialized views refreshed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/performance/response-times - Get response time metrics
router.get('/response-times', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const metrics = PerformanceMonitor.getAllMetrics();
    
    // Filter for response time metrics
    const responseTimeMetrics = Object.keys(metrics)
      .filter(key => key.includes('response_time'))
      .reduce((obj, key) => {
        obj[key] = metrics[key];
        return obj;
      }, {} as any);

    res.json({
      metrics: responseTimeMetrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/performance/response-times/clear - Clear response time metrics
router.post('/response-times/clear', async (req: Request, res: Response, next: NextFunction) => {
  try {
    PerformanceMonitor.clearMetrics();

    res.json({
      success: true,
      message: 'Response time metrics cleared',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export { router as performanceRouter };