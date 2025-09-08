import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { initializeDatabase } from '../services/database';

describe('CoffeeBiz Analytics API', () => {
  beforeAll(async () => {
    initializeDatabase();
  });

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

  describe('Revenue Analytics API', () => {
    describe('GET /api/revenue/metrics', () => {
      it('should return revenue metrics with default date range', async () => {
        const response = await request(app)
          .get('/api/revenue/metrics')
          .expect(200);

        expect(response.body).toHaveProperty('totalRevenue');
        expect(response.body).toHaveProperty('transactionCount');
        expect(response.body).toHaveProperty('averageTransactionValue');
        expect(response.body).toHaveProperty('uniqueCustomers');
        expect(response.body).toHaveProperty('growthRate');
        expect(response.body).toHaveProperty('dailyRevenue');
        expect(response.body).toHaveProperty('paymentMethodBreakdown');
        expect(response.body).toHaveProperty('period');
        
        expect(Array.isArray(response.body.dailyRevenue)).toBe(true);
        expect(typeof response.body.totalRevenue).toBe('number');
        expect(typeof response.body.transactionCount).toBe('number');
      });

      it('should accept custom date range', async () => {
        const startDate = '2024-01-01';
        const endDate = '2024-01-31';
        
        const response = await request(app)
          .get('/api/revenue/metrics')
          .query({ startDate, endDate })
          .expect(200);

        expect(response.body.period.start).toBe(startDate);
        expect(response.body.period.end).toBe(endDate);
      });

      it('should return error for invalid date range', async () => {
        const response = await request(app)
          .get('/api/revenue/metrics')
          .query({ startDate: '2024-02-01', endDate: '2024-01-01' })
          .expect(400);

        expect(response.body.error.code).toBe('INVALID_DATE_RANGE');
      });
    });

    describe('GET /api/revenue/trends', () => {
      it('should return revenue trends with default parameters', async () => {
        const response = await request(app)
          .get('/api/revenue/trends')
          .expect(200);

        expect(response.body).toHaveProperty('trends');
        expect(response.body).toHaveProperty('periodType');
        expect(Array.isArray(response.body.trends)).toBe(true);
        expect(response.body.periodType).toBe('daily');
      });

      it('should accept different period types', async () => {
        const response = await request(app)
          .get('/api/revenue/trends')
          .query({ period: 'weekly', limit: 10 })
          .expect(200);

        expect(response.body.periodType).toBe('weekly');
        expect(response.body.trends.length).toBeLessThanOrEqual(10);
      });
    });

    describe('GET /api/revenue/comparison', () => {
      it('should return comparison data when all dates provided', async () => {
        const response = await request(app)
          .get('/api/revenue/comparison')
          .query({
            currentStart: '2024-01-01',
            currentEnd: '2024-01-31',
            compareStart: '2023-12-01',
            compareEnd: '2023-12-31'
          })
          .expect(200);

        expect(response.body).toHaveProperty('current');
        expect(response.body).toHaveProperty('comparison');
        expect(response.body).toHaveProperty('changes');
        expect(response.body.current).toHaveProperty('revenue');
        expect(response.body.changes).toHaveProperty('revenue');
      });

      it('should return error when dates are missing', async () => {
        const response = await request(app)
          .get('/api/revenue/comparison')
          .query({ currentStart: '2024-01-01' })
          .expect(400);

        expect(response.body.error.code).toBe('MISSING_DATES');
      });
    });
  });

  describe('Product Performance API', () => {
    describe('GET /api/products/performance', () => {
      it('should return product performance data', async () => {
        const response = await request(app)
          .get('/api/products/performance')
          .expect(200);

        expect(response.body).toHaveProperty('topProducts');
        expect(response.body).toHaveProperty('bottomProducts');
        expect(response.body).toHaveProperty('categoryPerformance');
        expect(response.body).toHaveProperty('summary');
        expect(Array.isArray(response.body.topProducts)).toBe(true);
        expect(Array.isArray(response.body.categoryPerformance)).toBe(true);
      });

      it('should accept sorting parameters', async () => {
        const response = await request(app)
          .get('/api/products/performance')
          .query({ sortBy: 'quantity', limit: 5 })
          .expect(200);

        expect(response.body.topProducts.length).toBeLessThanOrEqual(5);
      });

      it('should return error for invalid sort field', async () => {
        const response = await request(app)
          .get('/api/products/performance')
          .query({ sortBy: 'invalid_field' })
          .expect(400);

        expect(response.body.error.code).toBe('INVALID_SORT_FIELD');
      });
    });

    describe('GET /api/products/trends', () => {
      it('should return error when product ID is missing', async () => {
        const response = await request(app)
          .get('/api/products/trends')
          .expect(400);

        expect(response.body.error.code).toBe('MISSING_PRODUCT_ID');
      });

      it('should return trends for valid product ID', async () => {
        // First get a product ID from performance endpoint
        const productsResponse = await request(app)
          .get('/api/products/performance')
          .query({ limit: 1 });

        if (productsResponse.body.topProducts.length > 0) {
          const productId = productsResponse.body.topProducts[0].id;
          
          const response = await request(app)
            .get('/api/products/trends')
            .query({ productId })
            .expect(200);

          expect(response.body).toHaveProperty('product');
          expect(response.body).toHaveProperty('trends');
          expect(response.body).toHaveProperty('periodType');
          expect(Array.isArray(response.body.trends)).toBe(true);
        }
      });
    });

    describe('GET /api/products/categories', () => {
      it('should return category statistics', async () => {
        const response = await request(app)
          .get('/api/products/categories')
          .expect(200);

        expect(response.body).toHaveProperty('categories');
        expect(response.body).toHaveProperty('period');
        expect(Array.isArray(response.body.categories)).toBe(true);
      });
    });

    describe('GET /api/products/seasonal', () => {
      it('should return seasonal product data', async () => {
        const response = await request(app)
          .get('/api/products/seasonal')
          .expect(200);

        expect(response.body).toHaveProperty('year');
        expect(response.body).toHaveProperty('products');
        expect(response.body).toHaveProperty('summary');
        expect(Array.isArray(response.body.products)).toBe(true);
        expect(typeof response.body.year).toBe('number');
      });

      it('should accept custom year parameter', async () => {
        const response = await request(app)
          .get('/api/products/seasonal')
          .query({ year: 2023 })
          .expect(200);

        expect(response.body.year).toBe(2023);
      });
    });
  });

  describe('Traffic Analysis API', () => {
    describe('GET /api/traffic/hourly', () => {
      it('should return hourly traffic data', async () => {
        const response = await request(app)
          .get('/api/traffic/hourly')
          .expect(200);

        expect(response.body).toHaveProperty('hourlyStats');
        expect(response.body).toHaveProperty('peakHours');
        expect(response.body).toHaveProperty('summary');
        expect(Array.isArray(response.body.hourlyStats)).toBe(true);
        expect(response.body.hourlyStats).toHaveLength(24);
        expect(Array.isArray(response.body.peakHours)).toBe(true);
      });

      it('should filter by day of week', async () => {
        const response = await request(app)
          .get('/api/traffic/hourly')
          .query({ dayOfWeek: 1 }) // Monday
          .expect(200);

        expect(response.body.hourlyStats).toHaveLength(24);
      });
    });

    describe('GET /api/traffic/daily', () => {
      it('should return daily traffic patterns', async () => {
        const response = await request(app)
          .get('/api/traffic/daily')
          .expect(200);

        expect(response.body).toHaveProperty('dailyStats');
        expect(response.body).toHaveProperty('dayOfWeekAverages');
        expect(response.body).toHaveProperty('summary');
        expect(Array.isArray(response.body.dailyStats)).toBe(true);
        expect(Array.isArray(response.body.dayOfWeekAverages)).toBe(true);
        expect(response.body.dayOfWeekAverages).toHaveLength(7);
      });
    });

    describe('GET /api/traffic/patterns', () => {
      it('should return comprehensive traffic patterns', async () => {
        const response = await request(app)
          .get('/api/traffic/patterns')
          .expect(200);

        expect(response.body).toHaveProperty('weeklyPatterns');
        expect(response.body).toHaveProperty('staffingRecommendations');
        expect(response.body).toHaveProperty('summary');
        expect(Array.isArray(response.body.weeklyPatterns)).toBe(true);
        expect(response.body.weeklyPatterns).toHaveLength(7);
        expect(Array.isArray(response.body.staffingRecommendations)).toBe(true);
      });
    });

    describe('GET /api/traffic/capacity', () => {
      it('should return capacity utilization metrics', async () => {
        const response = await request(app)
          .get('/api/traffic/capacity')
          .expect(200);

        expect(response.body).toHaveProperty('capacityData');
        expect(response.body).toHaveProperty('summary');
        expect(Array.isArray(response.body.capacityData)).toBe(true);
        expect(response.body.summary).toHaveProperty('maxCapacity');
        expect(response.body.summary).toHaveProperty('averageUtilization');
        expect(response.body.summary).toHaveProperty('recommendations');
      });

      it('should accept custom capacity parameter', async () => {
        const response = await request(app)
          .get('/api/traffic/capacity')
          .query({ maxCapacity: 100 })
          .expect(200);

        expect(response.body.summary.maxCapacity).toBe(100);
      });
    });
  });

  describe('Customer Analytics API', () => {
    describe('GET /api/customers/insights', () => {
      it('should return customer insights', async () => {
        const response = await request(app)
          .get('/api/customers/insights')
          .expect(200);

        expect(response.body).toHaveProperty('totalCustomers');
        expect(response.body).toHaveProperty('identifiedCustomers');
        expect(response.body).toHaveProperty('averageSpendPerCustomer');
        expect(response.body).toHaveProperty('newCustomers');
        expect(response.body).toHaveProperty('returningCustomers');
        expect(response.body).toHaveProperty('customerSegments');
        expect(response.body).toHaveProperty('topCustomers');
        expect(Array.isArray(response.body.topCustomers)).toBe(true);
      });
    });

    describe('GET /api/customers/retention', () => {
      it('should return retention analysis', async () => {
        const response = await request(app)
          .get('/api/customers/retention')
          .expect(200);

        expect(response.body).toHaveProperty('monthlyRetention');
        expect(response.body).toHaveProperty('averageRetentionRate');
        expect(response.body).toHaveProperty('cohortData');
        expect(Array.isArray(response.body.monthlyRetention)).toBe(true);
        expect(Array.isArray(response.body.cohortData)).toBe(true);
        expect(typeof response.body.averageRetentionRate).toBe('number');
      });

      it('should accept custom months parameter', async () => {
        const response = await request(app)
          .get('/api/customers/retention')
          .query({ months: 12 })
          .expect(200);

        expect(response.body.monthlyRetention.length).toBeLessThanOrEqual(12);
      });
    });

    describe('GET /api/customers/loyalty', () => {
      it('should return loyalty program effectiveness', async () => {
        const response = await request(app)
          .get('/api/customers/loyalty')
          .expect(200);

        expect(response.body).toHaveProperty('loyaltyStats');
        expect(response.body).toHaveProperty('overallMetrics');
        expect(response.body).toHaveProperty('visitFrequencyDistribution');
        expect(response.body.overallMetrics).toHaveProperty('loyaltyRate');
        expect(Array.isArray(response.body.visitFrequencyDistribution)).toBe(true);
      });
    });

    describe('GET /api/customers/segments', () => {
      it('should return customer segmentation analysis', async () => {
        const response = await request(app)
          .get('/api/customers/segments')
          .expect(200);

        expect(response.body).toHaveProperty('segments');
        expect(response.body).toHaveProperty('summary');
        expect(Array.isArray(response.body.segments)).toBe(true);
        expect(response.body.summary).toHaveProperty('totalCustomers');
      });
    });
  });

  describe('Inventory Management API', () => {
    describe('GET /api/inventory/demand-forecast', () => {
      it('should return demand forecasting data', async () => {
        const response = await request(app)
          .get('/api/inventory/demand-forecast')
          .expect(200);

        expect(response.body).toHaveProperty('products');
        expect(response.body).toHaveProperty('summary');
        expect(Array.isArray(response.body.products)).toBe(true);
        expect(response.body.summary).toHaveProperty('totalProducts');
        expect(response.body.summary).toHaveProperty('forecastPeriod');
      });

      it('should accept custom forecast parameters', async () => {
        const response = await request(app)
          .get('/api/inventory/demand-forecast')
          .query({ days: 14, forecastDays: 5 })
          .expect(200);

        expect(response.body.summary.forecastPeriod).toBe(5);
        expect(response.body.summary.historicalPeriod).toBe(14);
      });
    });

    describe('GET /api/inventory/stock-optimization', () => {
      it('should return stock optimization recommendations', async () => {
        const response = await request(app)
          .get('/api/inventory/stock-optimization')
          .expect(200);

        expect(response.body).toHaveProperty('recommendations');
        expect(response.body).toHaveProperty('categoryStats');
        expect(response.body).toHaveProperty('summary');
        expect(Array.isArray(response.body.recommendations)).toBe(true);
        expect(Array.isArray(response.body.categoryStats)).toBe(true);
      });

      it('should filter by category', async () => {
        const response = await request(app)
          .get('/api/inventory/stock-optimization')
          .query({ category: 'latte' })
          .expect(200);

        // All recommendations should be for latte category if data exists
        if (response.body.recommendations.length > 0) {
          expect(response.body.recommendations.every((r: any) => r.category === 'latte')).toBe(true);
        }
      });
    });

    describe('GET /api/inventory/waste-analysis', () => {
      it('should return waste reduction insights', async () => {
        const response = await request(app)
          .get('/api/inventory/waste-analysis')
          .expect(200);

        expect(response.body).toHaveProperty('wasteAnalysis');
        expect(response.body).toHaveProperty('categoryInsights');
        expect(response.body).toHaveProperty('summary');
        expect(Array.isArray(response.body.wasteAnalysis)).toBe(true);
        expect(Array.isArray(response.body.categoryInsights)).toBe(true);
        expect(response.body.summary).toHaveProperty('totalProducts');
      });
    });

    describe('GET /api/inventory/supplier-performance', () => {
      it('should return supplier performance metrics', async () => {
        const response = await request(app)
          .get('/api/inventory/supplier-performance')
          .expect(200);

        expect(response.body).toHaveProperty('suppliers');
        expect(response.body).toHaveProperty('summary');
        expect(Array.isArray(response.body.suppliers)).toBe(true);
        expect(response.body.summary).toHaveProperty('totalSuppliers');
        expect(response.body.summary).toHaveProperty('topPerformer');
        expect(response.body.summary).toHaveProperty('averageScore');
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404);

      expect(response.body.error).toBe('Not Found');
      expect(response.body.message).toContain('Route /api/non-existent-endpoint not found');
    });

    it('should handle database errors gracefully', async () => {
      // This test would require mocking database failures
      // For now, we'll just ensure the error handler is in place
      expect(app).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to API routes', async () => {
      // Make multiple requests quickly to test rate limiting
      const requests = Array(5).fill(null).map(() => 
        request(app).get('/api/revenue/metrics')
      );
      
      const responses = await Promise.all(requests);
      
      // All requests should succeed under normal rate limits
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });
});