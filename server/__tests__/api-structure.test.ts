import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../index';

describe('CoffeeBiz Analytics API Structure', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('API Route Structure', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404);

      expect(response.body.error).toBe('Not Found');
      expect(response.body.message).toContain('Route /api/non-existent-endpoint not found');
    });

    it('should have revenue analytics endpoints', async () => {
      // These will return 500 due to database connection, but routes exist
      const endpoints = [
        '/api/revenue/metrics',
        '/api/revenue/trends',
        '/api/revenue/comparison'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        // Should not be 404 (route exists) but will be 500 (database error) or 400 (validation error)
        expect(response.status).not.toBe(404);
      }
    });

    it('should have product performance endpoints', async () => {
      const endpoints = [
        '/api/products/performance',
        '/api/products/categories',
        '/api/products/seasonal'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        expect(response.status).not.toBe(404);
      }
    });

    it('should have traffic analysis endpoints', async () => {
      const endpoints = [
        '/api/traffic/hourly',
        '/api/traffic/daily',
        '/api/traffic/patterns',
        '/api/traffic/capacity'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        expect(response.status).not.toBe(404);
      }
    });

    it('should have customer analytics endpoints', async () => {
      const endpoints = [
        '/api/customers/insights',
        '/api/customers/retention',
        '/api/customers/loyalty',
        '/api/customers/segments'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        expect(response.status).not.toBe(404);
      }
    });

    it('should have inventory management endpoints', async () => {
      const endpoints = [
        '/api/inventory/demand-forecast',
        '/api/inventory/stock-optimization',
        '/api/inventory/waste-analysis',
        '/api/inventory/supplier-performance'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        expect(response.status).not.toBe(404);
      }
    });
  });

  describe('Error Handling', () => {
    it('should return proper error format for database errors', async () => {
      const response = await request(app)
        .get('/api/revenue/metrics')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('timestamp');
      expect(response.body.error).toHaveProperty('path');
    });

    it('should validate required parameters', async () => {
      const response = await request(app)
        .get('/api/products/trends')
        .expect(400);

      expect(response.body.error.code).toBe('MISSING_PRODUCT_ID');
    });

    it('should validate date ranges', async () => {
      const response = await request(app)
        .get('/api/revenue/metrics')
        .query({ startDate: '2024-02-01', endDate: '2024-01-01' })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_DATE_RANGE');
    });

    it('should validate sort fields', async () => {
      const response = await request(app)
        .get('/api/products/performance')
        .query({ sortBy: 'invalid_field' })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_SORT_FIELD');
    });

    it('should require all comparison dates', async () => {
      const response = await request(app)
        .get('/api/revenue/comparison')
        .query({ currentStart: '2024-01-01' })
        .expect(400);

      expect(response.body.error.code).toBe('MISSING_DATES');
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app).get('/health');
      
      // Check for common security headers (helmet middleware)
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
    });
  });

  describe('CORS Configuration', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/revenue/metrics')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');
      
      expect(response.status).toBe(204);
    });
  });
});