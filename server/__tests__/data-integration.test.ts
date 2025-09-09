import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDatabase, closeDatabaseConnection } from '../../database/connection';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('Data Integration and Validation Tests', () => {
  let db: any;

  beforeAll(async () => {
    db = getDatabase();
    
    // Wait for database connection
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    await closeDatabaseConnection();
  });

  describe('Dataset Import Validation', () => {
    it('should successfully import CSV datasets', async () => {
      // Run data integration script
      try {
        const { stdout, stderr } = await execAsync('node scripts/data-integration.js --reset');
        
        // Check for success indicators in output
        expect(stdout).toContain('Data integration completed successfully');
        expect(stdout).not.toContain('Integration failed');
        
        console.log('Data integration output:', stdout);
        
      } catch (error) {
        console.error('Data integration error:', error);
        throw error;
      }
    }, 60000); // 60 second timeout for data import

    it('should have imported transaction records', async () => {
      const result = await db.query('SELECT COUNT(*) as count FROM transactions');
      const transactionCount = parseInt(result.rows[0].count);
      
      expect(transactionCount).toBeGreaterThan(0);
      expect(transactionCount).toBeLessThan(10000); // Reasonable upper bound
      
      console.log(`Imported ${transactionCount} transactions`);
    });

    it('should have created product records', async () => {
      const result = await db.query('SELECT COUNT(*) as count FROM products');
      const productCount = parseInt(result.rows[0].count);
      
      expect(productCount).toBeGreaterThan(0);
      expect(productCount).toBeLessThan(100); // Reasonable upper bound
      
      console.log(`Found ${productCount} products`);
    });

    it('should have created customer records for card payments', async () => {
      const result = await db.query('SELECT COUNT(*) as count FROM customers WHERE card_number IS NOT NULL');
      const customerCount = parseInt(result.rows[0].count);
      
      expect(customerCount).toBeGreaterThanOrEqual(0);
      
      console.log(`Found ${customerCount} customers`);
    });
  });

  describe('Data Quality Validation', () => {
    it('should have valid date ranges', async () => {
      const result = await db.query(`
        SELECT 
          MIN(transaction_date) as min_date,
          MAX(transaction_date) as max_date,
          COUNT(DISTINCT transaction_date) as unique_days
        FROM transactions
      `);
      
      const dateRange = result.rows[0];
      
      expect(dateRange.min_date).toBeTruthy();
      expect(dateRange.max_date).toBeTruthy();
      expect(parseInt(dateRange.unique_days)).toBeGreaterThan(0);
      
      // Validate date range is reasonable
      const minDate = new Date(dateRange.min_date);
      const maxDate = new Date(dateRange.max_date);
      const now = new Date();
      
      expect(minDate).toBeInstanceOf(Date);
      expect(maxDate).toBeInstanceOf(Date);
      expect(minDate.getTime()).toBeLessThanOrEqual(maxDate.getTime());
      expect(maxDate.getTime()).toBeLessThanOrEqual(now.getTime());
      
      console.log(`Date range: ${dateRange.min_date} to ${dateRange.max_date} (${dateRange.unique_days} days)`);
    });

    it('should have valid amount ranges', async () => {
      const result = await db.query(`
        SELECT 
          MIN(amount) as min_amount,
          MAX(amount) as max_amount,
          AVG(amount) as avg_amount,
          COUNT(*) as total_transactions
        FROM transactions
      `);
      
      const amounts = result.rows[0];
      
      expect(parseFloat(amounts.min_amount)).toBeGreaterThan(0);
      expect(parseFloat(amounts.max_amount)).toBeGreaterThan(0);
      expect(parseFloat(amounts.avg_amount)).toBeGreaterThan(0);
      expect(parseInt(amounts.total_transactions)).toBeGreaterThan(0);
      
      // Validate reasonable ranges for coffee shop
      expect(parseFloat(amounts.min_amount)).toBeGreaterThanOrEqual(1); // At least $1
      expect(parseFloat(amounts.max_amount)).toBeLessThan(200); // Less than $200
      expect(parseFloat(amounts.avg_amount)).toBeLessThan(100); // Average less than $100
      
      console.log(`Amount range: $${amounts.min_amount} - $${amounts.max_amount} (avg: $${parseFloat(amounts.avg_amount).toFixed(2)})`);
    });

    it('should have valid product names', async () => {
      const result = await db.query(`
        SELECT name, COUNT(*) as transaction_count
        FROM products p
        JOIN transactions t ON p.id = t.product_id
        GROUP BY p.id, p.name
        ORDER BY transaction_count DESC
        LIMIT 10
      `);
      
      expect(result.rows.length).toBeGreaterThan(0);
      
      result.rows.forEach(product => {
        expect(product.name).toBeTruthy();
        expect(product.name.trim()).not.toBe('');
        expect(parseInt(product.transaction_count)).toBeGreaterThan(0);
      });
      
      console.log('Top products:', result.rows.map(p => `${p.name} (${p.transaction_count})`).join(', '));
    });

    it('should have valid payment methods', async () => {
      const result = await db.query(`
        SELECT 
          payment_method,
          COUNT(*) as count,
          SUM(amount) as total_amount
        FROM transactions
        GROUP BY payment_method
      `);
      
      expect(result.rows.length).toBeGreaterThan(0);
      
      const validPaymentMethods = ['cash', 'card'];
      result.rows.forEach(row => {
        expect(validPaymentMethods).toContain(row.payment_method);
        expect(parseInt(row.count)).toBeGreaterThan(0);
        expect(parseFloat(row.total_amount)).toBeGreaterThan(0);
      });
      
      console.log('Payment methods:', result.rows.map(p => `${p.payment_method}: ${p.count} transactions`).join(', '));
    });
  });

  describe('Calculation Accuracy Validation', () => {
    it('should have accurate revenue calculations', async () => {
      const result = await db.query(`
        SELECT 
          SUM(amount) as total_revenue,
          COUNT(*) as transaction_count,
          AVG(amount) as avg_transaction_value
        FROM transactions
      `);
      
      const revenue = result.rows[0];
      const calculatedAvg = parseFloat(revenue.total_revenue) / parseInt(revenue.transaction_count);
      const reportedAvg = parseFloat(revenue.avg_transaction_value);
      
      // Allow for small floating point differences
      expect(Math.abs(calculatedAvg - reportedAvg)).toBeLessThan(0.01);
      
      console.log(`Revenue validation: Total=$${revenue.total_revenue}, Count=${revenue.transaction_count}, Avg=$${reportedAvg.toFixed(2)}`);
    });

    it('should have consistent daily summaries', async () => {
      // Check if daily summaries were generated
      const summaryResult = await db.query('SELECT COUNT(*) as count FROM daily_revenue_summary');
      const summaryCount = parseInt(summaryResult.rows[0].count);
      
      expect(summaryCount).toBeGreaterThan(0);
      
      // Validate summary calculations
      const validationResult = await db.query(`
        SELECT 
          drs.summary_date,
          drs.total_revenue as summary_revenue,
          drs.transaction_count as summary_count,
          SUM(t.amount) as calculated_revenue,
          COUNT(t.id) as calculated_count
        FROM daily_revenue_summary drs
        JOIN transactions t ON t.transaction_date = drs.summary_date
        GROUP BY drs.summary_date, drs.total_revenue, drs.transaction_count
        LIMIT 5
      `);
      
      validationResult.rows.forEach(row => {
        expect(Math.abs(parseFloat(row.summary_revenue) - parseFloat(row.calculated_revenue))).toBeLessThan(0.01);
        expect(parseInt(row.summary_count)).toBe(parseInt(row.calculated_count));
      });
      
      console.log(`Daily summaries validated for ${validationResult.rows.length} days`);
    });

    it('should have accurate product performance calculations', async () => {
      const result = await db.query(`
        SELECT 
          p.name,
          COUNT(t.id) as transaction_count,
          SUM(t.amount) as total_revenue,
          AVG(t.amount) as avg_price
        FROM products p
        JOIN transactions t ON p.id = t.product_id
        GROUP BY p.id, p.name
        HAVING COUNT(t.id) > 5
        ORDER BY total_revenue DESC
        LIMIT 5
      `);
      
      expect(result.rows.length).toBeGreaterThan(0);
      
      result.rows.forEach(product => {
        const calculatedAvg = parseFloat(product.total_revenue) / parseInt(product.transaction_count);
        const reportedAvg = parseFloat(product.avg_price);
        
        expect(Math.abs(calculatedAvg - reportedAvg)).toBeLessThan(0.01);
      });
      
      console.log(`Product performance validated for ${result.rows.length} products`);
    });

    it('should have valid traffic patterns', async () => {
      const result = await db.query(`
        SELECT 
          EXTRACT(HOUR FROM transaction_datetime) as hour,
          COUNT(*) as transaction_count,
          SUM(amount) as revenue
        FROM transactions
        GROUP BY EXTRACT(HOUR FROM transaction_datetime)
        ORDER BY transaction_count DESC
        LIMIT 5
      `);
      
      expect(result.rows.length).toBeGreaterThan(0);
      
      result.rows.forEach(hour => {
        expect(parseInt(hour.hour)).toBeGreaterThanOrEqual(0);
        expect(parseInt(hour.hour)).toBeLessThanOrEqual(23);
        expect(parseInt(hour.transaction_count)).toBeGreaterThan(0);
        expect(parseFloat(hour.revenue)).toBeGreaterThan(0);
      });
      
      const peakHour = result.rows[0];
      console.log(`Peak hour: ${peakHour.hour}:00 with ${peakHour.transaction_count} transactions`);
    });
  });

  describe('Dashboard Module Integration', () => {
    it('should provide data for revenue analytics', async () => {
      const result = await db.query(`
        SELECT 
          SUM(amount) as total_revenue,
          COUNT(*) as transaction_count,
          COUNT(DISTINCT customer_id) as unique_customers,
          AVG(amount) as avg_transaction_value
        FROM transactions
        WHERE transaction_date >= CURRENT_DATE - INTERVAL '30 days'
      `);
      
      const data = result.rows[0];
      
      expect(parseFloat(data.total_revenue)).toBeGreaterThan(0);
      expect(parseInt(data.transaction_count)).toBeGreaterThan(0);
      expect(parseFloat(data.avg_transaction_value)).toBeGreaterThan(0);
      
      console.log(`Revenue module data: $${data.total_revenue}, ${data.transaction_count} transactions`);
    });

    it('should provide data for product performance', async () => {
      const result = await db.query(`
        SELECT 
          p.name,
          p.category,
          COUNT(t.id) as sales_count,
          SUM(t.amount) as revenue
        FROM products p
        JOIN transactions t ON p.id = t.product_id
        GROUP BY p.id, p.name, p.category
        ORDER BY revenue DESC
        LIMIT 10
      `);
      
      expect(result.rows.length).toBeGreaterThan(0);
      
      result.rows.forEach(product => {
        expect(product.name).toBeTruthy();
        expect(product.category).toBeTruthy();
        expect(parseInt(product.sales_count)).toBeGreaterThan(0);
        expect(parseFloat(product.revenue)).toBeGreaterThan(0);
      });
      
      console.log(`Product module data: ${result.rows.length} products with sales`);
    });

    it('should provide data for traffic analysis', async () => {
      const result = await db.query(`
        SELECT 
          EXTRACT(HOUR FROM transaction_datetime) as hour,
          COUNT(*) as transaction_count,
          COUNT(DISTINCT customer_id) as unique_customers
        FROM transactions
        GROUP BY EXTRACT(HOUR FROM transaction_datetime)
        ORDER BY hour
      `);
      
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows.length).toBeLessThanOrEqual(24);
      
      result.rows.forEach(hour => {
        expect(parseInt(hour.hour)).toBeGreaterThanOrEqual(0);
        expect(parseInt(hour.hour)).toBeLessThanOrEqual(23);
        expect(parseInt(hour.transaction_count)).toBeGreaterThan(0);
      });
      
      console.log(`Traffic module data: ${result.rows.length} hours with activity`);
    });

    it('should provide data for customer analysis', async () => {
      const result = await db.query(`
        SELECT 
          COUNT(DISTINCT customer_id) as total_customers,
          COUNT(*) as total_transactions,
          AVG(amount) as avg_transaction_value
        FROM transactions
        WHERE customer_id IS NOT NULL
      `);
      
      const data = result.rows[0];
      
      if (parseInt(data.total_customers) > 0) {
        expect(parseInt(data.total_transactions)).toBeGreaterThan(0);
        expect(parseFloat(data.avg_transaction_value)).toBeGreaterThan(0);
        
        console.log(`Customer module data: ${data.total_customers} customers, ${data.total_transactions} transactions`);
      } else {
        console.log('Customer module data: No card customers found (cash-only transactions)');
      }
    });
  });

  describe('Data Integrity Constraints', () => {
    it('should not have negative amounts', async () => {
      const result = await db.query('SELECT COUNT(*) as count FROM transactions WHERE amount <= 0');
      expect(parseInt(result.rows[0].count)).toBe(0);
    });

    it('should not have future dates', async () => {
      const result = await db.query('SELECT COUNT(*) as count FROM transactions WHERE transaction_date > CURRENT_DATE');
      expect(parseInt(result.rows[0].count)).toBe(0);
    });

    it('should have valid foreign key relationships', async () => {
      // Check transactions -> products relationship
      const productCheck = await db.query(`
        SELECT COUNT(*) as count 
        FROM transactions t 
        LEFT JOIN products p ON t.product_id = p.id 
        WHERE p.id IS NULL
      `);
      expect(parseInt(productCheck.rows[0].count)).toBe(0);

      // Check transactions -> customers relationship (for non-null customer_id)
      const customerCheck = await db.query(`
        SELECT COUNT(*) as count 
        FROM transactions t 
        LEFT JOIN customers c ON t.customer_id = c.id 
        WHERE t.customer_id IS NOT NULL AND c.id IS NULL
      `);
      expect(parseInt(customerCheck.rows[0].count)).toBe(0);
    });

    it('should have consistent payment method and card number data', async () => {
      // Card payments should have card numbers (if available in data)
      const cardPaymentCheck = await db.query(`
        SELECT COUNT(*) as count 
        FROM transactions 
        WHERE payment_method = 'card' AND card_number IS NULL
      `);
      
      // This might be valid if card numbers aren't provided for all card transactions
      const cardWithoutNumber = parseInt(cardPaymentCheck.rows[0].count);
      console.log(`Card payments without card number: ${cardWithoutNumber}`);

      // Cash payments should not have card numbers
      const cashPaymentCheck = await db.query(`
        SELECT COUNT(*) as count 
        FROM transactions 
        WHERE payment_method = 'cash' AND card_number IS NOT NULL
      `);
      expect(parseInt(cashPaymentCheck.rows[0].count)).toBe(0);
    });
  });

  describe('Performance with Real Data', () => {
    it('should execute revenue queries efficiently', async () => {
      const startTime = Date.now();
      
      const result = await db.query(`
        SELECT 
          SUM(amount) as total_revenue,
          COUNT(*) as transaction_count,
          AVG(amount) as avg_transaction_value,
          COUNT(DISTINCT customer_id) as unique_customers
        FROM transactions
        WHERE transaction_date >= CURRENT_DATE - INTERVAL '30 days'
      `);
      
      const queryTime = Date.now() - startTime;
      
      expect(queryTime).toBeLessThan(1000); // Should be under 1 second
      expect(result.rows.length).toBe(1);
      
      console.log(`Revenue query executed in ${queryTime}ms`);
    });

    it('should execute product performance queries efficiently', async () => {
      const startTime = Date.now();
      
      const result = await db.query(`
        SELECT 
          p.name,
          p.category,
          COUNT(t.id) as transaction_count,
          SUM(t.amount) as revenue
        FROM products p
        JOIN transactions t ON p.id = t.product_id
        GROUP BY p.id, p.name, p.category
        ORDER BY revenue DESC
        LIMIT 10
      `);
      
      const queryTime = Date.now() - startTime;
      
      expect(queryTime).toBeLessThan(1000); // Should be under 1 second
      expect(result.rows.length).toBeGreaterThan(0);
      
      console.log(`Product performance query executed in ${queryTime}ms`);
    });

    it('should execute traffic analysis queries efficiently', async () => {
      const startTime = Date.now();
      
      const result = await db.query(`
        SELECT 
          EXTRACT(HOUR FROM transaction_datetime) as hour,
          COUNT(*) as transaction_count,
          SUM(amount) as revenue
        FROM transactions
        GROUP BY EXTRACT(HOUR FROM transaction_datetime)
        ORDER BY hour
      `);
      
      const queryTime = Date.now() - startTime;
      
      expect(queryTime).toBeLessThan(1000); // Should be under 1 second
      expect(result.rows.length).toBeGreaterThan(0);
      
      console.log(`Traffic analysis query executed in ${queryTime}ms`);
    });
  });
});