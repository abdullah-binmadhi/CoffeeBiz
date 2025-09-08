#!/usr/bin/env ts-node

import { DatabaseConnection, MigrationRunner } from './connection';
import { ProductCategory } from '../src/types';

// Database setup and initialization script
async function setupDatabase() {
  console.log('🚀 Starting database setup...');
  
  const db = new DatabaseConnection();
  
  try {
    // Test connection
    console.log('📡 Testing database connection...');
    const isConnected = await db.testConnection();
    
    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }

    // Run migrations
    console.log('📦 Running database migrations...');
    const migrationRunner = new MigrationRunner(db);
    await migrationRunner.runMigrations();

    // Seed initial data
    console.log('🌱 Seeding initial data...');
    await seedInitialData(db);

    console.log('✅ Database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Seed initial data
async function seedInitialData(db: DatabaseConnection) {
  // Check if products already exist
  const existingProducts = await db.query('SELECT COUNT(*) as count FROM products');
  
  if (parseInt(existingProducts.rows[0].count) > 0) {
    console.log('Products already exist, skipping seed data');
    return;
  }

  // Insert initial products based on common coffee shop items
  const initialProducts = [
    { name: 'Espresso', category: ProductCategory.ESPRESSO, basePrice: 2.50 },
    { name: 'Double Espresso', category: ProductCategory.ESPRESSO, basePrice: 3.50 },
    { name: 'Americano', category: ProductCategory.AMERICANO, basePrice: 3.00 },
    { name: 'Long Black', category: ProductCategory.AMERICANO, basePrice: 3.25 },
    { name: 'Latte', category: ProductCategory.LATTE, basePrice: 4.50 },
    { name: 'Cappuccino', category: ProductCategory.LATTE, basePrice: 4.00 },
    { name: 'Flat White', category: ProductCategory.LATTE, basePrice: 4.25 },
    { name: 'Mocha', category: ProductCategory.SPECIALTY, basePrice: 5.00 },
    { name: 'Hot Chocolate', category: ProductCategory.HOT_CHOCOLATE, basePrice: 3.75 },
    { name: 'Chai Latte', category: ProductCategory.TEA, basePrice: 4.25 },
    { name: 'Green Tea', category: ProductCategory.TEA, basePrice: 2.75 },
    { name: 'English Breakfast Tea', category: ProductCategory.TEA, basePrice: 2.75 },
    { name: 'Iced Coffee', category: ProductCategory.SPECIALTY, basePrice: 4.00 },
    { name: 'Frappuccino', category: ProductCategory.SPECIALTY, basePrice: 5.50 },
    { name: 'Macchiato', category: ProductCategory.ESPRESSO, basePrice: 4.75 }
  ];

  console.log(`Inserting ${initialProducts.length} initial products...`);

  for (const product of initialProducts) {
    await db.query(
      `INSERT INTO products (name, category, base_price, is_active) 
       VALUES ($1, $2, $3, $4)`,
      [product.name, product.category, product.basePrice, true]
    );
  }

  console.log('✅ Initial products seeded successfully');
}

// Utility function to reset database (for development)
async function resetDatabase() {
  console.log('⚠️  Resetting database...');
  
  const db = new DatabaseConnection();
  
  try {
    // Drop all tables in reverse order of dependencies
    const dropQueries = [
      'DROP TABLE IF EXISTS hourly_traffic_summary CASCADE',
      'DROP TABLE IF EXISTS product_performance_summary CASCADE',
      'DROP TABLE IF EXISTS daily_revenue_summary CASCADE',
      'DROP TABLE IF EXISTS transactions CASCADE',
      'DROP TABLE IF EXISTS products CASCADE',
      'DROP TABLE IF EXISTS customers CASCADE',
      'DROP TABLE IF EXISTS migrations CASCADE',
      'DROP TYPE IF EXISTS product_category CASCADE',
      'DROP TYPE IF EXISTS payment_method CASCADE',
      'DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE'
    ];

    for (const query of dropQueries) {
      try {
        await db.query(query);
      } catch (error) {
        // Ignore errors for non-existent objects
        console.log(`Skipping: ${query.split(' ')[2]}`);
      }
    }

    console.log('✅ Database reset completed');
    
    // Run setup again
    await setupDatabase();
    
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Optimize database performance
async function optimizeDatabase() {
  console.log('⚡ Optimizing database performance...');
  
  const db = new DatabaseConnection();
  
  try {
    // Run the performance optimization migration
    console.log('📦 Running performance optimization migration...');
    const migrationRunner = new MigrationRunner(db);
    await migrationRunner.runMigrations();

    // Refresh materialized views
    console.log('🔄 Refreshing materialized views...');
    await db.query('SELECT refresh_all_materialized_views()');

    // Analyze tables for query optimization
    console.log('📊 Analyzing tables for query optimization...');
    await db.query('SELECT analyze_query_performance()');

    console.log('✅ Database optimization completed successfully!');
    
  } catch (error) {
    console.error('❌ Database optimization failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'setup':
    setupDatabase();
    break;
  case 'reset':
    resetDatabase();
    break;
  case 'migrate':
    (async () => {
      const db = new DatabaseConnection();
      try {
        const migrationRunner = new MigrationRunner(db);
        await migrationRunner.runMigrations();
        console.log('✅ Migrations completed');
      } finally {
        await db.close();
      }
    })();
    break;
  case 'optimize':
    optimizeDatabase();
    break;
  default:
    console.log('Usage: ts-node setup.ts [setup|reset|migrate|optimize]');
    console.log('  setup    - Initialize database with migrations and seed data');
    console.log('  reset    - Drop all tables and reinitialize database');
    console.log('  migrate  - Run pending migrations only');
    console.log('  optimize - Run performance optimizations and refresh views');
    process.exit(1);
}

export { setupDatabase, resetDatabase, seedInitialData };