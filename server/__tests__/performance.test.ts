import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { getDatabase, closeDatabaseConnection } from '../../database/connection';
import { getCache, closeCacheConnection } from '../services/cache';
import { getJobService, closeJobService } from '../services/jobs';

describe('Performance Tests', () => {
  let db: any;
  let cache: any;
  let jobService: any;

  beforeAll(async () => {
    // Initialize services
    db = getDatabase();
    cache = getCache();
    jobService = getJobService();

    // Wait for connections to be established
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    // Clean up connections
    await closeDatabaseConnection();
    await closeCacheConnection();
    await closeJobService();
  });

  describe('API Response Times', () => {
    const PERFORMANCE_THRESHOLD = 3000; // 3 seconds in milliseconds

    it('should load revenue metrics within 3 seconds', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/revenue/metrics')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        })
        .expect(200);

      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLD);
      expect(response.body).toHaveProperty('totalRevenue');
      
      console.log(`Revenue metrics response time: ${responseTime}ms`);
    });

    it('should load product performance within 3 seconds', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/products/performance')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          limit: 20
        })
        .expect(200);

      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLD);
      expect(response.body).toHaveProperty('topProducts');
      
      console.log(`Product performance response time: ${responseTime}ms`);
    });

    it('should load traffic patterns within 3 seconds', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/traffic/patterns')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        })
        .expect(200);

      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLD);
      expect(response.body).toHaveProperty('weeklyPatterns');
      
      console.log(`Traffic patterns response time: ${responseTime}ms`);
    });

    it('should load customer insights within 3 seconds', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/customers/insights')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        })
        .expect(200);

      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLD);
      
      console.log(`Customer insights response time: ${responseTime}ms`);
    });

    it('should load inventory analysis within 3 seconds', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/inventory/analysis')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        })
        .expect(200);

      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLD);
      
      console.log(`Inventory analysis response time: ${responseTime}ms`);
    });
  });

  describe('Cache Performance', () => {
    it('should serve cached responses faster than database queries', async () => {
      const endpoint = '/api/revenue/metrics';
      const queryParams = {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };

      // First request (cache miss)
      const startTime1 = Date.now();
      const response1 = await request(app)
        .get(endpoint)
        .query(queryParams)
        .expect(200);
      const responseTime1 = Date.now() - startTime1;

      // Second request (cache hit)
      const startTime2 = Date.now();
      const response2 = await request(app)
        .get(endpoint)
        .query(queryParams)
        .expect(200);
      const responseTime2 = Date.now() - startTime2;

      // Cache hit should be significantly faster
      expect(responseTime2).toBeLessThan(responseTime1);
      expect(response2.headers['x-cache']).toBe('HIT');
      
      console.log(`Cache miss: ${responseTime1}ms, Cache hit: ${responseTime2}ms`);
    });

    it('should handle cache operations efficiently', async () => {
      const testKey = 'performance-test-key';
      const testData = { test: 'data', timestamp: Date.now() };

      // Test cache set performance
      const setStartTime = Date.now();
      await cache.set(testKey, testData);
      const setTime = Date.now() - setStartTime;

      // Test cache get performance
      const getStartTime = Date.now();
      const cachedData = await cache.get(testKey);
      const getTime = Date.now() - getStartTime;

      expect(setTime).toBeLessThan(100); // Should be under 100ms
      expect(getTime).toBeLessThan(50);  // Should be under 50ms
      expect(cachedData).toEqual(testData);

      // Cleanup
      await cache.del(testKey);
      
      console.log(`Cache set: ${setTime}ms, Cache get: ${getTime}ms`);
    });
  });

  describe('Database Query Performance', () => {
    it('should execute complex revenue queries efficiently', async () => {
      const startTime = Date.now();
      
      const result = await db.query(`
        SELECT 
          SUM(amount) as total_revenue,
          COUNT(*) as transaction_count,
          COUNT(DISTINCT customer_id) as unique_customers,
          AVG(amount) as avg_transaction_value
        FROM transactions 
        WHERE transaction_date >= $1 AND transaction_date <= $2
      `, ['2024-01-01', '2024-01-31']);

      const queryTime = Date.now() - startTime;
      
      expect(queryTime).toBeLessThan(1000); // Should be under 1 second
      expect(result.rows).toHaveLength(1);
      
      console.log(`Complex revenue query time: ${queryTime}ms`);
    });

    it('should execute product performance queries efficiently', async () => {
      const startTime = Date.now();
      
      const result = await db.query(`
        SELECT 
          p.name,
          p.category,
          SUM(t.amount) as revenue,
          COUNT(t.id) as transaction_count
        FROM products p
        JOIN transactions t ON p.id = t.product_id
        WHERE t.transaction_date >= $1 AND t.transaction_date <= $2
        GROUP BY p.id, p.name, p.category
        ORDER BY revenue DESC
        LIMIT 10
      `, ['2024-01-01', '2024-01-31']);

      const queryTime = Date.now() - startTime;
      
      expect(queryTime).toBeLessThan(1000); // Should be under 1 second
      
      console.log(`Product performance query time: ${queryTime}ms`);
    });

    it('should execute hourly traffic queries efficiently', async () => {
      const startTime = Date.now();
      
      const result = await db.query(`
        SELECT 
          EXTRACT(HOUR FROM transaction_datetime) as hour,
          COUNT(*) as transaction_count,
          SUM(amount) as revenue
        FROM transactions 
        WHERE transaction_date >= $1 AND transaction_date <= $2
        GROUP BY EXTRACT(HOUR FROM transaction_datetime)
        ORDER BY hour
      `, ['2024-01-01', '2024-01-31']);

      const queryTime = Date.now() - startTime;
      
      expect(queryTime).toBeLessThan(1000); // Should be under 1 second
      
      console.log(`Hourly traffic query time: ${queryTime}ms`);
    });
  });

  describe('Concurrent Request Performance', () => {
    it('should handle multiple concurrent requests efficiently', async () => {
      const concurrentRequests = 10;
      const requests = [];

      const startTime = Date.now();

      // Create multiple concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(
          request(app)
            .get('/api/revenue/metrics')
            .query({
              startDate: '2024-01-01',
              endDate: '2024-01-31'
            })
        );
      }

      // Wait for all requests to complete
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Average time per request should be reasonable
      const avgTimePerRequest = totalTime / concurrentRequests;
      expect(avgTimePerRequest).toBeLessThan(5000); // 5 seconds average

      console.log(`${concurrentRequests} concurrent requests completed in ${totalTime}ms (avg: ${avgTimePerRequest}ms per request)`);
    });
  });

  describe('Memory Usage', () => {
    it('should not have significant memory leaks during operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform multiple operations
      for (let i = 0; i < 50; i++) {
        await request(app)
          .get('/api/revenue/metrics')
          .query({
            startDate: '2024-01-01',
            endDate: '2024-01-31'
          });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      
      console.log(`Memory increase after 50 requests: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
    });
  });

  describe('Background Job Performance', () => {
    it('should process jobs efficiently', async () => {
      const startTime = Date.now();
      
      // Add a test job
      const job = await jobService.addJob('REFRESH_ANALYTICS_CACHE', {
        cacheKeys: ['test:key1', 'test:key2'],
        forceRefresh: true
      });

      // Wait for job to complete (with timeout)
      let jobCompleted = false;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout

      while (!jobCompleted && attempts < maxAttempts) {
        const jobStatus = await job.getState();
        if (jobStatus === 'completed' || jobStatus === 'failed') {
          jobCompleted = true;
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }
      }

      const processingTime = Date.now() - startTime;
      
      expect(jobCompleted).toBe(true);
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
      
      console.log(`Background job processing time: ${processingTime}ms`);
    });
  });

  describe('Health Checks', () => {
    it('should respond to health checks quickly', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/health')
        .expect(200);

      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(500); // Should be under 500ms
      expect(response.body.status).toBe('OK');
      
      console.log(`Health check response time: ${responseTime}ms`);
    });

    it('should check cache health efficiently', async () => {
      const startTime = Date.now();
      
      const isHealthy = await cache.healthCheck();
      
      const checkTime = Date.now() - startTime;
      
      expect(checkTime).toBeLessThan(100); // Should be under 100ms
      expect(isHealthy).toBe(true);
      
      console.log(`Cache health check time: ${checkTime}ms`);
    });
  });
});

import { PerformanceMonitor } from '../middleware/performance';