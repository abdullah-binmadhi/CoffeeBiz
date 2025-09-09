import { test, expect } from '@playwright/test';

test.describe('API Integration Tests', () => {
  const baseURL = 'http://localhost:3001';

  test('should return revenue metrics', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/revenue/metrics`, {
      params: {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      }
    });

    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('totalRevenue');
    expect(data).toHaveProperty('transactionCount');
    expect(data).toHaveProperty('averageTransactionValue');
    expect(data).toHaveProperty('uniqueCustomers');
    expect(data).toHaveProperty('dailyRevenue');
    
    // Validate data types
    expect(typeof data.totalRevenue).toBe('number');
    expect(typeof data.transactionCount).toBe('number');
    expect(Array.isArray(data.dailyRevenue)).toBe(true);
  });

  test('should return product performance data', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/products/performance`, {
      params: {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        limit: '10'
      }
    });

    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('topProducts');
    expect(data).toHaveProperty('categoryPerformance');
    expect(Array.isArray(data.topProducts)).toBe(true);
    expect(Array.isArray(data.categoryPerformance)).toBe(true);
    
    // Validate product structure
    if (data.topProducts.length > 0) {
      const product = data.topProducts[0];
      expect(product).toHaveProperty('name');
      expect(product).toHaveProperty('revenue');
      expect(product).toHaveProperty('totalQuantity');
    }
  });

  test('should return traffic analysis data', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/traffic/hourly`, {
      params: {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      }
    });

    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('hourlyStats');
    expect(data).toHaveProperty('peakHours');
    expect(Array.isArray(data.hourlyStats)).toBe(true);
    expect(Array.isArray(data.peakHours)).toBe(true);
    
    // Validate hourly stats structure
    expect(data.hourlyStats).toHaveLength(24); // 24 hours
    
    if (data.hourlyStats.length > 0) {
      const hourStat = data.hourlyStats[0];
      expect(hourStat).toHaveProperty('hour');
      expect(hourStat).toHaveProperty('transactionCount');
      expect(hourStat).toHaveProperty('revenue');
    }
  });

  test('should return customer insights', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/customers/insights`, {
      params: {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      }
    });

    expect(response.status()).toBe(200);
    
    const data = await response.json();
    // Structure depends on implementation, but should have customer data
    expect(typeof data).toBe('object');
  });

  test('should return inventory analysis', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/inventory/analysis`, {
      params: {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      }
    });

    expect(response.status()).toBe(200);
    
    const data = await response.json();
    // Structure depends on implementation, but should have inventory data
    expect(typeof data).toBe('object');
  });

  test('should handle invalid date ranges', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/revenue/metrics`, {
      params: {
        startDate: '2024-12-31',
        endDate: '2024-01-01' // End date before start date
      }
    });

    expect(response.status()).toBe(400);
    
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  test('should handle missing parameters', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/revenue/comparison`);
    // Should return 400 for missing required parameters
    expect(response.status()).toBe(400);
  });

  test('should return proper cache headers', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/revenue/metrics`, {
      params: {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      }
    });

    expect(response.status()).toBe(200);
    
    // Check for cache headers
    const cacheHeader = response.headers()['x-cache'];
    expect(cacheHeader).toBeDefined();
    expect(['HIT', 'MISS']).toContain(cacheHeader);
  });

  test('should respond within performance thresholds', async ({ request }) => {
    const startTime = Date.now();
    
    const response = await request.get(`${baseURL}/api/revenue/metrics`, {
      params: {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      }
    });

    const responseTime = Date.now() - startTime;
    
    expect(response.status()).toBe(200);
    expect(responseTime).toBeLessThan(3000); // Should respond within 3 seconds
  });

  test('should validate data consistency', async ({ request }) => {
    // Get revenue metrics
    const revenueResponse = await request.get(`${baseURL}/api/revenue/metrics`, {
      params: {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      }
    });

    const revenueData = await revenueResponse.json();

    // Get product performance for same period
    const productResponse = await request.get(`${baseURL}/api/products/performance`, {
      params: {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      }
    });

    const productData = await productResponse.json();

    // Validate that total revenue from products matches revenue metrics
    if (productData.topProducts && productData.topProducts.length > 0) {
      const totalProductRevenue = productData.topProducts.reduce(
        (sum: number, product: any) => sum + product.revenue, 
        0
      );
      
      // Should be reasonably close (allowing for rounding differences)
      expect(Math.abs(totalProductRevenue - revenueData.totalRevenue)).toBeLessThan(1);
    }
  });

  test('should handle concurrent requests', async ({ request }) => {
    const requests = Array(5).fill(null).map(() => 
      request.get(`${baseURL}/api/revenue/metrics`, {
        params: {
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        }
      })
    );

    const responses = await Promise.all(requests);
    
    // All requests should succeed
    responses.forEach(response => {
      expect(response.status()).toBe(200);
    });

    // All responses should have the same data
    const dataPromises = responses.map(response => response.json());
    const allData = await Promise.all(dataPromises);
    
    const firstResponse = allData[0];
    allData.forEach(data => {
      expect(data.totalRevenue).toBe(firstResponse.totalRevenue);
      expect(data.transactionCount).toBe(firstResponse.transactionCount);
    });
  });

  test('should provide health check endpoint', async ({ request }) => {
    const response = await request.get(`${baseURL}/health`);
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status');
    expect(data.status).toBe('OK');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('uptime');
  });

  test('should provide performance metrics endpoint', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/performance/metrics`);
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('cache');
    expect(data).toHaveProperty('application');
    expect(data).toHaveProperty('timestamp');
  });
});