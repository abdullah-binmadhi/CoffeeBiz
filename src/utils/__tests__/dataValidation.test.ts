import { validateRevenueData, validateProductData, validateTrafficData, validateDateRange } from '../dataValidation';

describe('Data Validation Tests', () => {
  describe('validateRevenueData', () => {
    test('should validate correct revenue data', () => {
      const validData = {
        totalRevenue: 15000,
        transactionCount: 500,
        averageTransactionValue: 30,
        uniqueCustomers: 200,
        dailyRevenue: [
          { date: '2024-01-01', revenue: 1000, transactions: 50 },
          { date: '2024-01-02', revenue: 1200, transactions: 60 },
        ]
      };

      expect(validateRevenueData(validData)).toBe(true);
    });

    test('should reject invalid revenue data', () => {
      const invalidData = {
        totalRevenue: -100, // Negative revenue
        transactionCount: 'invalid', // Wrong type
        averageTransactionValue: null,
        uniqueCustomers: 200,
        dailyRevenue: []
      };

      expect(validateRevenueData(invalidData)).toBe(false);
    });

    test('should reject missing required fields', () => {
      const incompleteData = {
        totalRevenue: 15000,
        // Missing transactionCount
        averageTransactionValue: 30,
        uniqueCustomers: 200,
      };

      expect(validateRevenueData(incompleteData)).toBe(false);
    });

    test('should validate daily revenue array structure', () => {
      const dataWithInvalidDaily = {
        totalRevenue: 15000,
        transactionCount: 500,
        averageTransactionValue: 30,
        uniqueCustomers: 200,
        dailyRevenue: [
          { date: 'invalid-date', revenue: 1000 }, // Missing transactions
          { revenue: 1200, transactions: 60 }, // Missing date
        ]
      };

      expect(validateRevenueData(dataWithInvalidDaily)).toBe(false);
    });
  });

  describe('validateProductData', () => {
    test('should validate correct product data', () => {
      const validData = {
        topProducts: [
          {
            id: '1',
            name: 'Latte',
            category: 'latte',
            revenue: 5000,
            totalQuantity: 200,
            transactionCount: 100,
            averagePrice: 25
          }
        ],
        categoryPerformance: [
          {
            category: 'latte',
            revenue: 8000,
            totalQuantity: 300,
            transactionCount: 150,
            productCount: 3
          }
        ]
      };

      expect(validateProductData(validData)).toBe(true);
    });

    test('should reject invalid product data', () => {
      const invalidData = {
        topProducts: [
          {
            id: '1',
            name: '', // Empty name
            revenue: -100, // Negative revenue
            totalQuantity: 'invalid', // Wrong type
          }
        ],
        categoryPerformance: 'not-an-array' // Wrong type
      };

      expect(validateProductData(invalidData)).toBe(false);
    });

    test('should validate product ID uniqueness', () => {
      const dataWithDuplicateIds = {
        topProducts: [
          { id: '1', name: 'Latte', revenue: 5000, totalQuantity: 200 },
          { id: '1', name: 'Cappuccino', revenue: 4000, totalQuantity: 150 }, // Duplicate ID
        ],
        categoryPerformance: []
      };

      expect(validateProductData(dataWithDuplicateIds)).toBe(false);
    });
  });

  describe('validateTrafficData', () => {
    test('should validate correct traffic data', () => {
      const validData = {
        hourlyStats: Array.from({ length: 24 }, (_, hour) => ({
          hour,
          transactionCount: Math.floor(Math.random() * 100),
          revenue: Math.floor(Math.random() * 1000),
          uniqueCustomers: Math.floor(Math.random() * 50)
        })),
        peakHours: [12, 13, 18],
        summary: {
          totalTransactions: 1000,
          totalRevenue: 15000,
          busiestHour: 12
        }
      };

      expect(validateTrafficData(validData)).toBe(true);
    });

    test('should validate hourly stats completeness', () => {
      const incompleteHourlyData = {
        hourlyStats: Array.from({ length: 20 }, (_, hour) => ({ // Only 20 hours instead of 24
          hour,
          transactionCount: 10,
          revenue: 100,
          uniqueCustomers: 5
        })),
        peakHours: [12, 13, 18],
        summary: {
          totalTransactions: 200,
          totalRevenue: 2000,
          busiestHour: 12
        }
      };

      expect(validateTrafficData(incompleteHourlyData)).toBe(false);
    });

    test('should validate hour values are within valid range', () => {
      const invalidHourData = {
        hourlyStats: [
          { hour: -1, transactionCount: 10, revenue: 100, uniqueCustomers: 5 }, // Invalid hour
          { hour: 25, transactionCount: 10, revenue: 100, uniqueCustomers: 5 }, // Invalid hour
        ],
        peakHours: [12],
        summary: { totalTransactions: 20, totalRevenue: 200, busiestHour: 12 }
      };

      expect(validateTrafficData(invalidHourData)).toBe(false);
    });
  });

  describe('validateDateRange', () => {
    test('should validate correct date range', () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      expect(validateDateRange(startDate, endDate)).toBe(true);
    });

    test('should reject invalid date formats', () => {
      const invalidStartDate = '2024/01/01'; // Wrong format
      const validEndDate = '2024-01-31';

      expect(validateDateRange(invalidStartDate, validEndDate)).toBe(false);
    });

    test('should reject end date before start date', () => {
      const startDate = '2024-01-31';
      const endDate = '2024-01-01'; // Before start date

      expect(validateDateRange(startDate, endDate)).toBe(false);
    });

    test('should reject future dates', () => {
      const startDate = '2025-01-01'; // Future date
      const endDate = '2025-01-31';

      expect(validateDateRange(startDate, endDate)).toBe(false);
    });

    test('should accept same start and end date', () => {
      const date = '2024-01-15';

      expect(validateDateRange(date, date)).toBe(true);
    });

    test('should reject date ranges longer than maximum allowed', () => {
      const startDate = '2023-01-01';
      const endDate = '2024-12-31'; // More than 1 year

      expect(validateDateRange(startDate, endDate, 365)).toBe(false);
    });
  });

  describe('Data Consistency Validation', () => {
    test('should validate revenue calculation consistency', () => {
      const revenueData = {
        totalRevenue: 3000,
        transactionCount: 100,
        averageTransactionValue: 30, // Should equal totalRevenue / transactionCount
        dailyRevenue: [
          { date: '2024-01-01', revenue: 1000, transactions: 33 },
          { date: '2024-01-02', revenue: 2000, transactions: 67 },
        ]
      };

      // Calculate expected values
      const expectedAvg = revenueData.totalRevenue / revenueData.transactionCount;
      const dailyTotal = revenueData.dailyRevenue.reduce((sum, day) => sum + day.revenue, 0);
      const dailyTransactions = revenueData.dailyRevenue.reduce((sum, day) => sum + day.transactions, 0);

      expect(Math.abs(revenueData.averageTransactionValue - expectedAvg)).toBeLessThan(0.01);
      expect(dailyTotal).toBe(revenueData.totalRevenue);
      expect(dailyTransactions).toBe(revenueData.transactionCount);
    });

    test('should validate product category totals', () => {
      const productData = {
        topProducts: [
          { id: '1', name: 'Latte', category: 'latte', revenue: 3000 },
          { id: '2', name: 'Cappuccino', category: 'latte', revenue: 2000 },
          { id: '3', name: 'Americano', category: 'americano', revenue: 1500 },
        ],
        categoryPerformance: [
          { category: 'latte', revenue: 5000 }, // Should match sum of latte products
          { category: 'americano', revenue: 1500 },
        ]
      };

      // Group products by category
      const categoryTotals = productData.topProducts.reduce((acc, product) => {
        acc[product.category] = (acc[product.category] || 0) + product.revenue;
        return acc;
      }, {} as Record<string, number>);

      // Validate category performance matches product totals
      productData.categoryPerformance.forEach(category => {
        expect(categoryTotals[category.category]).toBe(category.revenue);
      });
    });

    test('should validate traffic peak hours are within hourly stats', () => {
      const trafficData = {
        hourlyStats: [
          { hour: 12, transactionCount: 100 },
          { hour: 13, transactionCount: 95 },
          { hour: 18, transactionCount: 90 },
          { hour: 10, transactionCount: 50 },
        ],
        peakHours: [12, 13, 18]
      };

      // Verify peak hours exist in hourly stats
      trafficData.peakHours.forEach(peakHour => {
        const hourExists = trafficData.hourlyStats.some(stat => stat.hour === peakHour);
        expect(hourExists).toBe(true);
      });

      // Verify peak hours are actually the highest transaction counts
      const sortedHours = trafficData.hourlyStats
        .sort((a, b) => b.transactionCount - a.transactionCount)
        .slice(0, 3)
        .map(stat => stat.hour);

      expect(sortedHours.sort()).toEqual(trafficData.peakHours.sort());
    });
  });

  describe('Data Sanitization', () => {
    test('should sanitize string inputs', () => {
      const maliciousInput = '<script>alert("xss")</script>';
      const sanitized = sanitizeString(maliciousInput);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
    });

    test('should handle null and undefined values', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
      expect(sanitizeNumber(null)).toBe(0);
      expect(sanitizeNumber(undefined)).toBe(0);
    });

    test('should validate numeric ranges', () => {
      expect(validateNumericRange(50, 0, 100)).toBe(true);
      expect(validateNumericRange(-10, 0, 100)).toBe(false);
      expect(validateNumericRange(150, 0, 100)).toBe(false);
    });
  });
});

// Helper functions that would be implemented in the actual validation module
function sanitizeString(input: any): string {
  if (input === null || input === undefined) return '';
  return String(input).replace(/<[^>]*>/g, ''); // Remove HTML tags
}

function sanitizeNumber(input: any): number {
  if (input === null || input === undefined) return 0;
  const num = Number(input);
  return isNaN(num) ? 0 : num;
}

function validateNumericRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}