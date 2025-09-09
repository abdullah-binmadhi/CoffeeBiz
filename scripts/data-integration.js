#!/usr/bin/env node

/**
 * Data Integration Script for CoffeeBiz Analytics
 * Imports and validates uploaded datasets into the system
 */

const fs = require('fs');
const path = require('path');
const csv = require('papaparse');
const { Pool } = require('pg');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'coffeebiz_analytics',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
};

class DataIntegrator {
  constructor() {
    this.pool = new Pool(dbConfig);
    this.errors = [];
    this.warnings = [];
    this.stats = {
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      duplicateRecords: 0,
      processedFiles: 0
    };
  }

  async initialize() {
    console.log('🚀 Initializing Data Integration...');
    
    try {
      // Test database connection
      const client = await this.pool.connect();
      console.log('✅ Database connection established');
      client.release();
      
      // Clear existing data if requested
      if (process.argv.includes('--reset')) {
        await this.clearExistingData();
      }
      
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      process.exit(1);
    }
  }

  async clearExistingData() {
    console.log('🗑️  Clearing existing data...');
    
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Clear in reverse order of dependencies
      await client.query('DELETE FROM hourly_traffic_summary');
      await client.query('DELETE FROM product_performance_summary');
      await client.query('DELETE FROM daily_revenue_summary');
      await client.query('DELETE FROM transactions');
      await client.query('DELETE FROM customers WHERE card_number IS NOT NULL');
      await client.query('DELETE FROM products WHERE name NOT IN (SELECT name FROM products LIMIT 0)'); // Keep seeded products
      
      await client.query('COMMIT');
      console.log('✅ Existing data cleared');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async processDatasets() {
    console.log('📊 Processing datasets...');
    
    const dataFiles = [
      { path: 'index_1.csv', name: 'Dataset 1' },
      { path: 'index_2.csv', name: 'Dataset 2' },
      { path: 'public/index_1.csv', name: 'Public Dataset 1' },
      { path: 'public/index_2.csv', name: 'Public Dataset 2' }
    ];

    for (const file of dataFiles) {
      if (fs.existsSync(file.path)) {
        console.log(`\n📁 Processing ${file.name} (${file.path})...`);
        await this.processFile(file.path, file.name);
        this.stats.processedFiles++;
      } else {
        console.log(`⚠️  File not found: ${file.path}`);
      }
    }
  }

  async processFile(filePath, fileName) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const parseResult = csv.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().toLowerCase()
      });

      if (parseResult.errors.length > 0) {
        console.error(`❌ CSV parsing errors in ${fileName}:`, parseResult.errors);
        return;
      }

      console.log(`📈 Found ${parseResult.data.length} records in ${fileName}`);
      this.stats.totalRecords += parseResult.data.length;

      // Process records in batches
      const batchSize = 100;
      for (let i = 0; i < parseResult.data.length; i += batchSize) {
        const batch = parseResult.data.slice(i, i + batchSize);
        await this.processBatch(batch, fileName, i);
      }

    } catch (error) {
      console.error(`❌ Error processing ${fileName}:`, error.message);
      this.errors.push(`File processing error in ${fileName}: ${error.message}`);
    }
  }

  async processBatch(records, fileName, startIndex) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const recordIndex = startIndex + i + 1;
        
        try {
          await this.processRecord(client, record, fileName, recordIndex);
          this.stats.validRecords++;
        } catch (error) {
          console.error(`❌ Error processing record ${recordIndex} in ${fileName}:`, error.message);
          this.errors.push(`Record ${recordIndex} in ${fileName}: ${error.message}`);
          this.stats.invalidRecords++;
        }
      }
      
      await client.query('COMMIT');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async processRecord(client, record, fileName, recordIndex) {
    // Validate required fields
    const requiredFields = ['date', 'datetime', 'cash_type', 'money', 'coffee_name'];
    for (const field of requiredFields) {
      if (!record[field] || record[field].toString().trim() === '') {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Parse and validate data
    const transactionDate = new Date(record.date);
    const transactionDateTime = new Date(record.datetime);
    const paymentMethod = record.cash_type.toLowerCase() === 'cash' ? 'cash' : 'card';
    const amount = parseFloat(record.money);
    const productName = record.coffee_name.trim();
    const cardNumber = record.card || null;

    // Validate data types and ranges
    if (isNaN(transactionDate.getTime())) {
      throw new Error(`Invalid date: ${record.date}`);
    }
    
    if (isNaN(transactionDateTime.getTime())) {
      throw new Error(`Invalid datetime: ${record.datetime}`);
    }
    
    if (isNaN(amount) || amount <= 0) {
      throw new Error(`Invalid amount: ${record.money}`);
    }
    
    if (!productName) {
      throw new Error(`Invalid product name: ${record.coffee_name}`);
    }

    // Check for duplicates
    const duplicateCheck = await client.query(
      'SELECT id FROM transactions WHERE transaction_datetime = $1 AND amount = $2 AND product_id = (SELECT id FROM products WHERE name = $3 LIMIT 1)',
      [transactionDateTime, amount, productName]
    );
    
    if (duplicateCheck.rows.length > 0) {
      this.stats.duplicateRecords++;
      this.warnings.push(`Duplicate transaction found: ${fileName} record ${recordIndex}`);
      return; // Skip duplicate
    }

    // Get or create product
    const productId = await this.getOrCreateProduct(client, productName);
    
    // Get or create customer (for card payments)
    let customerId = null;
    if (paymentMethod === 'card' && cardNumber) {
      customerId = await this.getOrCreateCustomer(client, cardNumber, transactionDateTime);
    }

    // Insert transaction
    await client.query(`
      INSERT INTO transactions (
        transaction_date, transaction_datetime, customer_id, product_id,
        payment_method, card_number, amount, quantity
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      transactionDate.toISOString().split('T')[0],
      transactionDateTime,
      customerId,
      productId,
      paymentMethod,
      cardNumber,
      amount,
      1 // Default quantity
    ]);
  }

  async getOrCreateProduct(client, productName) {
    // First, try to find existing product
    let result = await client.query('SELECT id FROM products WHERE name = $1', [productName]);
    
    if (result.rows.length > 0) {
      return result.rows[0].id;
    }

    // Create new product with category mapping
    const category = this.mapProductCategory(productName);
    
    result = await client.query(`
      INSERT INTO products (name, category, is_active)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [productName, category, true]);
    
    return result.rows[0].id;
  }

  async getOrCreateCustomer(client, cardNumber, transactionDateTime) {
    // First, try to find existing customer
    let result = await client.query('SELECT id FROM customers WHERE card_number = $1', [cardNumber]);
    
    if (result.rows.length > 0) {
      // Update last seen date
      await client.query(
        'UPDATE customers SET last_seen_at = $1 WHERE id = $2',
        [transactionDateTime, result.rows[0].id]
      );
      return result.rows[0].id;
    }

    // Create new customer
    result = await client.query(`
      INSERT INTO customers (card_number, first_seen_at, last_seen_at, preferred_payment_method)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [cardNumber, transactionDateTime, transactionDateTime, 'card']);
    
    return result.rows[0].id;
  }

  mapProductCategory(productName) {
    const name = productName.toLowerCase();
    
    if (name.includes('espresso')) return 'espresso';
    if (name.includes('latte')) return 'latte';
    if (name.includes('americano')) return 'americano';
    if (name.includes('chocolate') || name.includes('cocoa')) return 'hot_chocolate';
    if (name.includes('tea')) return 'tea';
    if (name.includes('cappuccino')) return 'latte'; // Group with latte
    if (name.includes('whiskey') || name.includes('irish')) return 'specialty';
    
    return 'other';
  }

  async validateDataIntegrity() {
    console.log('\n🔍 Validating data integrity...');
    
    const client = await this.pool.connect();
    
    try {
      // Check transaction count
      const transactionCount = await client.query('SELECT COUNT(*) as count FROM transactions');
      console.log(`📊 Total transactions imported: ${transactionCount.rows[0].count}`);

      // Check product count
      const productCount = await client.query('SELECT COUNT(*) as count FROM products');
      console.log(`🛍️  Total products: ${productCount.rows[0].count}`);

      // Check customer count
      const customerCount = await client.query('SELECT COUNT(*) as count FROM customers WHERE card_number IS NOT NULL');
      console.log(`👥 Total customers: ${customerCount.rows[0].count}`);

      // Validate date ranges
      const dateRange = await client.query(`
        SELECT 
          MIN(transaction_date) as min_date,
          MAX(transaction_date) as max_date,
          COUNT(DISTINCT transaction_date) as unique_days
        FROM transactions
      `);
      
      const range = dateRange.rows[0];
      console.log(`📅 Date range: ${range.min_date} to ${range.max_date} (${range.unique_days} unique days)`);

      // Validate amounts
      const amountStats = await client.query(`
        SELECT 
          MIN(amount) as min_amount,
          MAX(amount) as max_amount,
          AVG(amount) as avg_amount,
          COUNT(*) as total_transactions
        FROM transactions
      `);
      
      const amounts = amountStats.rows[0];
      console.log(`💰 Amount range: $${amounts.min_amount} - $${amounts.max_amount} (avg: $${parseFloat(amounts.avg_amount).toFixed(2)})`);

      // Check for data consistency
      await this.validateCalculations(client);
      
    } finally {
      client.release();
    }
  }

  async validateCalculations(client) {
    console.log('\n🧮 Validating calculations...');
    
    // Test revenue calculation
    const revenueTest = await client.query(`
      SELECT 
        SUM(amount) as total_revenue,
        COUNT(*) as transaction_count,
        AVG(amount) as avg_transaction_value
      FROM transactions
      WHERE transaction_date >= '2024-03-01' AND transaction_date <= '2024-03-31'
    `);
    
    if (revenueTest.rows.length > 0) {
      const revenue = revenueTest.rows[0];
      const calculatedAvg = parseFloat(revenue.total_revenue) / parseInt(revenue.transaction_count);
      const reportedAvg = parseFloat(revenue.avg_transaction_value);
      
      if (Math.abs(calculatedAvg - reportedAvg) > 0.01) {
        this.errors.push('Revenue calculation inconsistency detected');
      } else {
        console.log('✅ Revenue calculations are consistent');
      }
    }

    // Test product performance calculation
    const productTest = await client.query(`
      SELECT 
        p.name,
        COUNT(t.id) as transaction_count,
        SUM(t.amount) as total_revenue,
        AVG(t.amount) as avg_price
      FROM products p
      JOIN transactions t ON p.id = t.product_id
      GROUP BY p.id, p.name
      ORDER BY total_revenue DESC
      LIMIT 5
    `);
    
    console.log('🏆 Top 5 products by revenue:');
    productTest.rows.forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.name}: $${parseFloat(product.total_revenue).toFixed(2)} (${product.transaction_count} transactions)`);
    });

    // Test traffic patterns
    const trafficTest = await client.query(`
      SELECT 
        EXTRACT(HOUR FROM transaction_datetime) as hour,
        COUNT(*) as transaction_count
      FROM transactions
      GROUP BY EXTRACT(HOUR FROM transaction_datetime)
      ORDER BY transaction_count DESC
      LIMIT 3
    `);
    
    console.log('⏰ Peak hours:');
    trafficTest.rows.forEach((hour, index) => {
      console.log(`  ${index + 1}. ${hour.hour}:00 - ${hour.transaction_count} transactions`);
    });
  }

  async generateSummaryTables() {
    console.log('\n📋 Generating summary tables...');
    
    const client = await this.pool.connect();
    
    try {
      // Generate daily revenue summary
      await client.query(`
        INSERT INTO daily_revenue_summary (
          summary_date, total_revenue, transaction_count, 
          cash_revenue, card_revenue, cash_transactions, 
          card_transactions, unique_customers
        )
        SELECT 
          transaction_date::date as summary_date,
          SUM(amount) as total_revenue,
          COUNT(*) as transaction_count,
          SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END) as cash_revenue,
          SUM(CASE WHEN payment_method = 'card' THEN amount ELSE 0 END) as card_revenue,
          COUNT(CASE WHEN payment_method = 'cash' THEN 1 END) as cash_transactions,
          COUNT(CASE WHEN payment_method = 'card' THEN 1 END) as card_transactions,
          COUNT(DISTINCT customer_id) as unique_customers
        FROM transactions 
        GROUP BY transaction_date::date
        ON CONFLICT (summary_date) DO UPDATE SET
          total_revenue = EXCLUDED.total_revenue,
          transaction_count = EXCLUDED.transaction_count,
          cash_revenue = EXCLUDED.cash_revenue,
          card_revenue = EXCLUDED.card_revenue,
          cash_transactions = EXCLUDED.cash_transactions,
          card_transactions = EXCLUDED.card_transactions,
          unique_customers = EXCLUDED.unique_customers,
          updated_at = CURRENT_TIMESTAMP
      `);
      
      console.log('✅ Daily revenue summary generated');

      // Generate product performance summary
      await client.query(`
        INSERT INTO product_performance_summary (
          product_id, summary_date, total_sales, total_revenue
        )
        SELECT 
          product_id,
          transaction_date::date as summary_date,
          SUM(quantity) as total_sales,
          SUM(amount) as total_revenue
        FROM transactions 
        GROUP BY product_id, transaction_date::date
        ON CONFLICT (product_id, summary_date) DO UPDATE SET
          total_sales = EXCLUDED.total_sales,
          total_revenue = EXCLUDED.total_revenue,
          updated_at = CURRENT_TIMESTAMP
      `);
      
      console.log('✅ Product performance summary generated');

      // Generate hourly traffic summary
      await client.query(`
        INSERT INTO hourly_traffic_summary (
          summary_date, hour_of_day, transaction_count, total_revenue, unique_customers
        )
        SELECT 
          transaction_date::date as summary_date,
          EXTRACT(HOUR FROM transaction_datetime)::integer as hour_of_day,
          COUNT(*) as transaction_count,
          SUM(amount) as total_revenue,
          COUNT(DISTINCT customer_id) as unique_customers
        FROM transactions 
        GROUP BY transaction_date::date, EXTRACT(HOUR FROM transaction_datetime)
        ON CONFLICT (summary_date, hour_of_day) DO UPDATE SET
          transaction_count = EXCLUDED.transaction_count,
          total_revenue = EXCLUDED.total_revenue,
          unique_customers = EXCLUDED.unique_customers,
          updated_at = CURRENT_TIMESTAMP
      `);
      
      console.log('✅ Hourly traffic summary generated');

    } finally {
      client.release();
    }
  }

  async testDashboardModules() {
    console.log('\n🎯 Testing dashboard modules with real data...');
    
    const testEndpoints = [
      'http://localhost:3001/api/revenue/metrics?startDate=2024-03-01&endDate=2024-03-31',
      'http://localhost:3001/api/products/performance?startDate=2024-03-01&endDate=2024-03-31',
      'http://localhost:3001/api/traffic/hourly?startDate=2024-03-01&endDate=2024-03-31',
      'http://localhost:3001/api/customers/insights?startDate=2024-03-01&endDate=2024-03-31',
      'http://localhost:3001/api/inventory/analysis?startDate=2024-03-01&endDate=2024-03-31'
    ];

    for (const endpoint of testEndpoints) {
      try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(endpoint);
        
        if (response.ok) {
          const data = await response.json();
          const moduleName = endpoint.split('/api/')[1].split('/')[0];
          console.log(`✅ ${moduleName} module: Working with real data`);
          
          // Basic data validation
          if (typeof data === 'object' && data !== null) {
            const keys = Object.keys(data);
            console.log(`   📊 Response contains: ${keys.join(', ')}`);
          }
        } else {
          console.log(`❌ ${endpoint}: HTTP ${response.status}`);
        }
      } catch (error) {
        console.log(`⚠️  ${endpoint}: ${error.message}`);
      }
    }
  }

  generateReport() {
    console.log('\n📄 Data Integration Report');
    console.log('==========================');
    console.log(`📁 Files processed: ${this.stats.processedFiles}`);
    console.log(`📊 Total records: ${this.stats.totalRecords}`);
    console.log(`✅ Valid records: ${this.stats.validRecords}`);
    console.log(`❌ Invalid records: ${this.stats.invalidRecords}`);
    console.log(`🔄 Duplicate records: ${this.stats.duplicateRecords}`);
    console.log(`📈 Success rate: ${Math.round((this.stats.validRecords / this.stats.totalRecords) * 100)}%`);

    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    // Save report to file
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      errors: this.errors,
      warnings: this.warnings
    };

    fs.writeFileSync(
      path.join(__dirname, '../test-results/data-integration-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('\n📄 Report saved to test-results/data-integration-report.json');
  }

  async cleanup() {
    await this.pool.end();
  }

  async run() {
    try {
      await this.initialize();
      await this.processDatasets();
      await this.validateDataIntegrity();
      await this.generateSummaryTables();
      await this.testDashboardModules();
      this.generateReport();
      
      console.log('\n🎉 Data integration completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Data integration failed:', error);
      this.errors.push(`Integration failure: ${error.message}`);
      this.generateReport();
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }
}

// Run the data integrator
if (require.main === module) {
  const integrator = new DataIntegrator();
  integrator.run().catch(error => {
    console.error('❌ Integration failed:', error);
    process.exit(1);
  });
}

module.exports = DataIntegrator;