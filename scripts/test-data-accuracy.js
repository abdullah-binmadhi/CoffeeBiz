#!/usr/bin/env node

/**
 * Data Accuracy Validation Script
 * Compares API responses with known test data to validate calculations
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const TEST_DATA_PATH = path.join(__dirname, '../test-data');

// Known test data for validation
const EXPECTED_RESULTS = {
  revenue: {
    totalRevenue: 15000,
    transactionCount: 500,
    averageTransactionValue: 30,
    uniqueCustomers: 200
  },
  products: {
    topProductsCount: 10,
    categoriesCount: 5
  },
  traffic: {
    hourlyStatsCount: 24,
    peakHoursCount: 3
  }
};

class DataAccuracyValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = 0;
    this.total = 0;
  }

  async validateRevenueData() {
    console.log('🔍 Validating revenue data accuracy...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/revenue/metrics?startDate=2024-01-01&endDate=2024-01-31`);
      const data = await response.json();

      this.validateField('Revenue Total Revenue', data.totalRevenue, EXPECTED_RESULTS.revenue.totalRevenue, 'number');
      this.validateField('Revenue Transaction Count', data.transactionCount, EXPECTED_RESULTS.revenue.transactionCount, 'number');
      this.validateField('Revenue Average Transaction Value', data.averageTransactionValue, EXPECTED_RESULTS.revenue.averageTransactionValue, 'number');
      this.validateField('Revenue Unique Customers', data.uniqueCustomers, EXPECTED_RESULTS.revenue.uniqueCustomers, 'number');

      // Validate calculation consistency
      const calculatedAvg = data.totalRevenue / data.transactionCount;
      if (Math.abs(data.averageTransactionValue - calculatedAvg) > 0.01) {
        this.addError('Revenue average transaction value calculation is inconsistent');
      } else {
        this.passed++;
      }
      this.total++;

      // Validate daily revenue array
      if (!Array.isArray(data.dailyRevenue)) {
        this.addError('Daily revenue should be an array');
      } else if (data.dailyRevenue.length === 0) {
        this.addWarning('Daily revenue array is empty');
      } else {
        this.passed++;
      }
      this.total++;

      console.log('✅ Revenue data validation completed');
    } catch (error) {
      this.addError(`Revenue data validation failed: ${error.message}`);
    }
  }

  async validateProductData() {
    console.log('🔍 Validating product data accuracy...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/products/performance?startDate=2024-01-01&endDate=2024-01-31&limit=10`);
      const data = await response.json();

      // Validate structure
      if (!Array.isArray(data.topProducts)) {
        this.addError('Top products should be an array');
      } else {
        this.validateField('Top Products Count', data.topProducts.length, EXPECTED_RESULTS.products.topProductsCount, 'number', '<=');
        
        // Validate product structure
        data.topProducts.forEach((product, index) => {
          if (!product.id || !product.name) {
            this.addError(`Product ${index} missing required fields (id, name)`);
          }
          if (typeof product.revenue !== 'number' || product.revenue < 0) {
            this.addError(`Product ${index} has invalid revenue`);
          }
        });
        this.passed++;
      }
      this.total++;

      // Validate category performance
      if (!Array.isArray(data.categoryPerformance)) {
        this.addError('Category performance should be an array');
      } else {
        this.passed++;
      }
      this.total++;

      console.log('✅ Product data validation completed');
    } catch (error) {
      this.addError(`Product data validation failed: ${error.message}`);
    }
  }

  async validateTrafficData() {
    console.log('🔍 Validating traffic data accuracy...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/traffic/hourly?startDate=2024-01-01&endDate=2024-01-31`);
      const data = await response.json();

      // Validate hourly stats
      this.validateField('Hourly Stats Count', data.hourlyStats.length, EXPECTED_RESULTS.traffic.hourlyStatsCount, 'number');
      
      // Validate hour values
      data.hourlyStats.forEach((stat, index) => {
        if (stat.hour < 0 || stat.hour > 23) {
          this.addError(`Invalid hour value at index ${index}: ${stat.hour}`);
        }
        if (typeof stat.transactionCount !== 'number' || stat.transactionCount < 0) {
          this.addError(`Invalid transaction count at hour ${stat.hour}`);
        }
      });

      // Validate peak hours
      if (!Array.isArray(data.peakHours)) {
        this.addError('Peak hours should be an array');
      } else {
        this.validateField('Peak Hours Count', data.peakHours.length, EXPECTED_RESULTS.traffic.peakHoursCount, 'number', '<=');
        
        // Validate peak hours are within valid range
        data.peakHours.forEach(hour => {
          if (hour < 0 || hour > 23) {
            this.addError(`Invalid peak hour: ${hour}`);
          }
        });
        this.passed++;
      }
      this.total++;

      console.log('✅ Traffic data validation completed');
    } catch (error) {
      this.addError(`Traffic data validation failed: ${error.message}`);
    }
  }

  async validateDataConsistency() {
    console.log('🔍 Validating cross-module data consistency...');
    
    try {
      // Get data from multiple endpoints
      const [revenueResponse, productResponse, trafficResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/revenue/metrics?startDate=2024-01-01&endDate=2024-01-31`),
        fetch(`${API_BASE_URL}/api/products/performance?startDate=2024-01-01&endDate=2024-01-31`),
        fetch(`${API_BASE_URL}/api/traffic/hourly?startDate=2024-01-01&endDate=2024-01-31`)
      ]);

      const revenueData = await revenueResponse.json();
      const productData = await productResponse.json();
      const trafficData = await trafficResponse.json();

      // Validate revenue consistency across modules
      const productTotalRevenue = productData.topProducts?.reduce((sum, product) => sum + product.revenue, 0) || 0;
      const trafficTotalRevenue = trafficData.summary?.totalRevenue || 0;

      if (Math.abs(revenueData.totalRevenue - trafficTotalRevenue) > 1) {
        this.addWarning('Revenue totals between revenue and traffic modules differ significantly');
      } else {
        this.passed++;
      }
      this.total++;

      // Validate transaction count consistency
      const trafficTotalTransactions = trafficData.summary?.totalTransactions || 0;
      if (Math.abs(revenueData.transactionCount - trafficTotalTransactions) > 1) {
        this.addWarning('Transaction counts between revenue and traffic modules differ significantly');
      } else {
        this.passed++;
      }
      this.total++;

      console.log('✅ Data consistency validation completed');
    } catch (error) {
      this.addError(`Data consistency validation failed: ${error.message}`);
    }
  }

  async validatePerformance() {
    console.log('🔍 Validating API performance...');
    
    const endpoints = [
      '/api/revenue/metrics?startDate=2024-01-01&endDate=2024-01-31',
      '/api/products/performance?startDate=2024-01-01&endDate=2024-01-31',
      '/api/traffic/hourly?startDate=2024-01-01&endDate=2024-01-31'
    ];

    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        const responseTime = Date.now() - startTime;

        if (response.status !== 200) {
          this.addError(`Endpoint ${endpoint} returned status ${response.status}`);
        } else if (responseTime > 3000) {
          this.addError(`Endpoint ${endpoint} took ${responseTime}ms (exceeds 3s threshold)`);
        } else {
          this.passed++;
        }
        this.total++;

        console.log(`  ${endpoint}: ${responseTime}ms`);
      } catch (error) {
        this.addError(`Performance test failed for ${endpoint}: ${error.message}`);
      }
    }

    console.log('✅ Performance validation completed');
  }

  validateField(fieldName, actual, expected, type, operator = '===') {
    this.total++;
    
    if (type === 'number') {
      if (typeof actual !== 'number') {
        this.addError(`${fieldName}: Expected number, got ${typeof actual}`);
        return;
      }
      
      switch (operator) {
        case '===':
          if (actual === expected) this.passed++;
          else this.addError(`${fieldName}: Expected ${expected}, got ${actual}`);
          break;
        case '<=':
          if (actual <= expected) this.passed++;
          else this.addError(`${fieldName}: Expected <= ${expected}, got ${actual}`);
          break;
        case '>=':
          if (actual >= expected) this.passed++;
          else this.addError(`${fieldName}: Expected >= ${expected}, got ${actual}`);
          break;
      }
    } else if (type === 'string') {
      if (typeof actual !== 'string') {
        this.addError(`${fieldName}: Expected string, got ${typeof actual}`);
      } else if (actual === expected) {
        this.passed++;
      } else {
        this.addError(`${fieldName}: Expected "${expected}", got "${actual}"`);
      }
    }
  }

  addError(message) {
    this.errors.push(message);
    console.error(`❌ ${message}`);
  }

  addWarning(message) {
    this.warnings.push(message);
    console.warn(`⚠️  ${message}`);
  }

  async run() {
    console.log('🚀 Starting data accuracy validation...\n');

    await this.validateRevenueData();
    await this.validateProductData();
    await this.validateTrafficData();
    await this.validateDataConsistency();
    await this.validatePerformance();

    this.generateReport();
  }

  generateReport() {
    console.log('\n📊 Data Accuracy Validation Report');
    console.log('=====================================');
    console.log(`✅ Passed: ${this.passed}/${this.total} (${Math.round((this.passed / this.total) * 100)}%)`);
    console.log(`❌ Errors: ${this.errors.length}`);
    console.log(`⚠️  Warnings: ${this.warnings.length}`);

    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    // Generate JSON report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.total,
        passed: this.passed,
        failed: this.total - this.passed,
        successRate: Math.round((this.passed / this.total) * 100)
      },
      errors: this.errors,
      warnings: this.warnings
    };

    fs.writeFileSync(
      path.join(__dirname, '../test-results/data-accuracy-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('\n📄 Report saved to test-results/data-accuracy-report.json');

    // Exit with error code if there are failures
    if (this.errors.length > 0) {
      process.exit(1);
    }
  }
}

// Run the validator
if (require.main === module) {
  const validator = new DataAccuracyValidator();
  validator.run().catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
}

module.exports = DataAccuracyValidator;