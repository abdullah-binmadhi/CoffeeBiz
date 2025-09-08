import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { getDatabase, closeDatabaseConnection } from '../../database/connection';
import { getCache, closeCacheConnection } from '../services/cache';

describe('Integration Tests - Caching and Performance', () => {
  beforeAll(async () => {
    // Wait for services to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    await closeDatabaseConnection();
    await closeCacheConnection();
  });

  describe('API Caching', () => {
    it('should cache revenue metrics responses', async () => {
      const endpoint = '/api/revenue/metrics';
      const queryParams = {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };

      // First request (cache miss)
      const response1 = await request(app)
        .get(endpoint)
        .query(queryParams)
        .expect(200);

      expect(response1.headers['x-cache']).toBe('MISS');

      // Second request (cache hit)
      const response2 = await request(app)
        .get(endpoint)
        .query(queryParams)
        .expect(200);

      expect(response2.headers['x-cache']).toBe('HIT');
      expect(response2.body).toEqual(response1.body);
    });

    it('should cache product performance responses', async () => {
      const endpoint = '/api/products/performance';
      const queryParams = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        limit: '10'
      };

      // First request (cache miss)
      const response1 = await request(app)
        .get(endpoint)
        .query(queryParams)
        .expect(200);

      expect(response1.headers['x-cache']).toBe('MISS');

      // Second request (cache hit)
      const response2 = await request(app)
        .get(endpoint)
        .query(queryParams)
        .expect(200);

      expect(response2.headers['x-cache']).toBe('HIT');
      expect(response2.body).toEqual(response1.body);
    });
  });

  describe('Performance Monitoring', () => {
    it('should provide performance metrics endpoint', async () => {
      const response = await request(app)
        .get('/api/performance/metrics')
        .expect(200);

      expect(response.body).toHaveProperty('cache');
      expect(response.body).toHaveProperty('application');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should provide cache health endpoint', async () => {
      const response = await request(app)
        .get('/api/performance/cache')
        .expect(200);

      expect(response.body).toHaveProperty('healthy');
      expect(response.body.healthy).toBe(true);
    });
  });

  describe('Health Checks', () => {
    it('should provide comprehensive health check', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('OK');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('cache');
    });
  });

  describe('Response Times', () => {
    it('should respond to revenue metrics within reasonable time', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/revenue/metrics')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        })
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000); // 5 seconds max for first request
    });

    it('should respond to cached requests very quickly', async () => {
      // Prime the cache
      await request(app)
        .get('/api/revenue/metrics')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        });

      // Test cached response time
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/revenue/metrics')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        })
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(500); // Cached responses should be very fast
      expect(response.headers['x-cache']).toBe('HIT');
    });
  });
});