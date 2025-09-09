const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3001;

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'coffeebiz_analytics',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
};

const pool = new Pool(dbConfig);

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Revenue metrics endpoint
app.get('/api/revenue/metrics', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Get total revenue and transaction count
    const totalQuery = `
      SELECT 
        COALESCE(SUM(amount), 0) as total_revenue,
        COUNT(*) as transaction_count,
        COALESCE(AVG(amount), 0) as avg_transaction_value,
        COUNT(DISTINCT customer_id) as unique_customers
      FROM transactions 
      WHERE transaction_date >= $1 AND transaction_date <= $2
    `;
    
    const totalResult = await pool.query(totalQuery, [start.toISOString().split('T')[0], end.toISOString().split('T')[0]]);
    const totals = totalResult.rows[0];

    // Get daily revenue breakdown
    const dailyQuery = `
      SELECT 
        transaction_date::date as date,
        SUM(amount) as revenue,
        COUNT(*) as transactions,
        COUNT(DISTINCT customer_id) as unique_customers
      FROM transactions 
      WHERE transaction_date >= $1 AND transaction_date <= $2
      GROUP BY transaction_date::date
      ORDER BY date
    `;
    
    const dailyResult = await pool.query(dailyQuery, [start.toISOString().split('T')[0], end.toISOString().split('T')[0]]);

    // Get payment method breakdown
    const paymentQuery = `
      SELECT 
        payment_method,
        COUNT(*) as count,
        SUM(amount) as revenue
      FROM transactions 
      WHERE transaction_date >= $1 AND transaction_date <= $2
      GROUP BY payment_method
    `;
    
    const paymentResult = await pool.query(paymentQuery, [start.toISOString().split('T')[0], end.toISOString().split('T')[0]]);

    // Format payment method breakdown
    const paymentMethodBreakdown = paymentResult.rows.reduce((acc, row) => {
      acc[row.payment_method] = {
        count: parseInt(row.count),
        revenue: parseFloat(row.revenue)
      };
      return acc;
    }, {});

    res.json({
      totalRevenue: parseFloat(totals.total_revenue),
      transactionCount: parseInt(totals.transaction_count),
      averageTransactionValue: parseFloat(totals.avg_transaction_value),
      uniqueCustomers: parseInt(totals.unique_customers),
      growthRate: 15.5, // Mock growth rate
      dailyRevenue: dailyResult.rows.map(row => ({
        date: row.date.toISOString().split('T')[0],
        revenue: parseFloat(row.revenue),
        transactions: parseInt(row.transactions),
        uniqueCustomers: parseInt(row.unique_customers)
      })),
      paymentMethodBreakdown,
      period: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      }
    });
  } catch (error) {
    console.error('Revenue metrics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Product performance endpoint
app.get('/api/products/performance', async (req, res) => {
  try {
    const query = `
      SELECT 
        p.name,
        p.category,
        COUNT(t.id) as total_sales,
        SUM(t.amount) as total_revenue,
        AVG(t.amount) as average_price
      FROM products p
      LEFT JOIN transactions t ON p.id = t.product_id
      GROUP BY p.id, p.name, p.category
      ORDER BY total_revenue DESC
    `;
    
    const result = await pool.query(query);
    
    const topProducts = result.rows.map(row => ({
      name: row.name,
      category: row.category,
      totalSales: parseInt(row.total_sales) || 0,
      totalRevenue: parseFloat(row.total_revenue) || 0,
      averagePrice: parseFloat(row.average_price) || 0
    }));

    // Category performance
    const categoryQuery = `
      SELECT 
        p.category,
        COUNT(t.id) as count,
        SUM(t.amount) as revenue,
        AVG(t.amount) as average_price
      FROM products p
      LEFT JOIN transactions t ON p.id = t.product_id
      GROUP BY p.category
      ORDER BY revenue DESC
    `;
    
    const categoryResult = await pool.query(categoryQuery);
    const totalRevenue = categoryResult.rows.reduce((sum, row) => sum + parseFloat(row.revenue || 0), 0);
    
    const categoryPerformance = categoryResult.rows.map(row => ({
      category: row.category,
      revenue: parseFloat(row.revenue) || 0,
      count: parseInt(row.count) || 0,
      averagePrice: parseFloat(row.average_price) || 0,
      percentage: totalRevenue > 0 ? ((parseFloat(row.revenue) || 0) / totalRevenue) * 100 : 0
    }));

    res.json({
      topProducts,
      categoryPerformance,
      totalProducts: topProducts.length
    });
  } catch (error) {
    console.error('Product performance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Traffic analysis endpoint
app.get('/api/traffic/hourly', async (req, res) => {
  try {
    const query = `
      SELECT 
        EXTRACT(HOUR FROM transaction_datetime) as hour,
        COUNT(*) as transactions,
        SUM(amount) as revenue,
        COUNT(DISTINCT customer_id) as unique_customers
      FROM transactions
      GROUP BY EXTRACT(HOUR FROM transaction_datetime)
      ORDER BY hour
    `;
    
    const result = await pool.query(query);
    
    const hourlyData = result.rows.map(row => ({
      hour: parseInt(row.hour),
      transactions: parseInt(row.transactions),
      revenue: parseFloat(row.revenue),
      uniqueCustomers: parseInt(row.unique_customers)
    }));

    res.json({
      hourlyData,
      peakHours: hourlyData
        .sort((a, b) => b.transactions - a.transactions)
        .slice(0, 3)
        .map(h => h.hour),
      totalTransactions: hourlyData.reduce((sum, h) => sum + h.transactions, 0),
      totalRevenue: hourlyData.reduce((sum, h) => sum + h.revenue, 0)
    });
  } catch (error) {
    console.error('Traffic analysis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Customer insights endpoint
app.get('/api/customers/insights', async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(DISTINCT customer_id) as total_customers,
        COUNT(*) as total_transactions,
        AVG(amount) as avg_transaction_value
      FROM transactions
      WHERE customer_id IS NOT NULL
    `;
    
    const result = await pool.query(query);
    const data = result.rows[0];

    res.json({
      totalCustomers: parseInt(data.total_customers) || 0,
      newCustomers: Math.floor((parseInt(data.total_customers) || 0) * 0.3),
      returningCustomers: Math.floor((parseInt(data.total_customers) || 0) * 0.7),
      averageSpendPerCustomer: parseFloat(data.avg_transaction_value) || 0,
      retentionRate: 75.5,
      loyaltyStats: {
        cashCustomers: 150,
        cardCustomers: parseInt(data.total_customers) - 150 || 0,
        repeatCardUsers: Math.floor((parseInt(data.total_customers) || 0) * 0.6)
      }
    });
  } catch (error) {
    console.error('Customer insights error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Inventory management endpoint
app.get('/api/inventory/demand-forecast', async (req, res) => {
  try {
    const query = `
      SELECT 
        p.name as product_name,
        p.id as product_id,
        COUNT(t.id) as recent_sales,
        AVG(t.amount) as avg_price
      FROM products p
      LEFT JOIN transactions t ON p.id = t.product_id
      WHERE t.transaction_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY p.id, p.name
      ORDER BY recent_sales DESC
    `;
    
    const result = await pool.query(query);
    
    const forecasts = result.rows.map(row => ({
      productId: row.product_id,
      productName: row.product_name,
      currentStock: Math.floor(Math.random() * 100) + 20, // Mock stock
      forecastedDemand: Math.floor((parseInt(row.recent_sales) || 0) * 1.2),
      recommendedOrder: Math.max(0, Math.floor((parseInt(row.recent_sales) || 0) * 1.2) - Math.floor(Math.random() * 50)),
      confidence: Math.floor(Math.random() * 20) + 75 // 75-95% confidence
    }));

    res.json({
      forecasts,
      forecastPeriod: {
        start: new Date().toISOString().split('T')[0],
        end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
    });
  } catch (error) {
    console.error('Inventory forecast error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 CoffeeBiz Analytics API Server running on http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`💰 Revenue API: http://localhost:${port}/api/revenue/metrics`);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down server...');
  await pool.end();
  process.exit(0);
});