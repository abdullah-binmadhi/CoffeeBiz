const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'coffeebiz_analytics',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
};

async function setupDatabase() {
  console.log('🚀 Starting database setup...');
  
  // First connect to postgres database to create our database
  const adminPool = new Pool({
    ...dbConfig,
    database: 'postgres'
  });

  try {
    // Create database if it doesn't exist
    await adminPool.query(`CREATE DATABASE ${dbConfig.database}`);
    console.log(`✅ Database '${dbConfig.database}' created`);
  } catch (error) {
    if (error.code === '42P04') {
      console.log(`✅ Database '${dbConfig.database}' already exists`);
    } else {
      console.error('❌ Error creating database:', error.message);
    }
  }
  
  await adminPool.end();

  // Now connect to our database
  const pool = new Pool(dbConfig);

  try {
    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schema);
      console.log('✅ Database schema created');
    }

    // Load sample data
    console.log('📊 Loading sample data...');
    
    // Insert sample products
    const products = [
      { name: 'Espresso', category: 'espresso', price: 2.50 },
      { name: 'Americano', category: 'americano', price: 3.00 },
      { name: 'Latte', category: 'latte', price: 4.50 },
      { name: 'Cappuccino', category: 'latte', price: 4.00 },
      { name: 'Hot Chocolate', category: 'hot_chocolate', price: 3.50 },
      { name: 'Tea', category: 'tea', price: 2.00 }
    ];

    for (const product of products) {
      try {
        await pool.query(
          'INSERT INTO products (name, category, base_price) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING',
          [product.name, product.category, product.price]
        );
      } catch (err) {
        console.log(`Product ${product.name} already exists or error:`, err.message);
      }
    }

    // Generate sample transactions
    console.log('📈 Generating sample transactions...');
    
    const productResult = await pool.query('SELECT id, name, base_price FROM products');
    const productList = productResult.rows;
    
    if (productList.length > 0) {
      // Generate 100 sample transactions
      for (let i = 0; i < 100; i++) {
        const product = productList[Math.floor(Math.random() * productList.length)];
        const paymentMethod = Math.random() > 0.3 ? 'card' : 'cash';
        const amount = product.base_price + (Math.random() * 2 - 1); // ±$1 variation
        const transactionDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Last 30 days
        
        try {
          await pool.query(
            'INSERT INTO transactions (transaction_date, transaction_datetime, product_id, payment_method, amount, quantity) VALUES ($1, $2, $3, $4, $5, $6)',
            [transactionDate.toISOString().split('T')[0], transactionDate, product.id, paymentMethod, amount.toFixed(2), 1]
          );
        } catch (err) {
          // Ignore duplicate errors
        }
      }
    }

    console.log('✅ Sample data loaded successfully');
    console.log('🎉 Database setup complete!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  setupDatabase().catch(console.error);
}

module.exports = { setupDatabase };