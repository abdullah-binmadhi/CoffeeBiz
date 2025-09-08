import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../services/database';
import { createError } from '../middleware/errorHandler';
import { format, subDays } from 'date-fns';
import { cacheMiddleware, CacheConfigs } from '../middleware/cache';
import { CacheKeys } from '../services/cache';

const router = Router();

// GET /api/products/performance - Get product performance metrics
router.get('/performance', cacheMiddleware({
  ...CacheConfigs.products,
  keyGenerator: (req) => CacheKeys.products.performance(
    req.query.startDate as string || subDays(new Date(), 30).toISOString().split('T')[0],
    req.query.endDate as string || new Date().toISOString().split('T')[0],
    parseInt(req.query.limit as string) || 10,
    req.query.sortBy as string || 'revenue'
  )
}), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, limit = 10, sortBy = 'revenue' } = req.query;
    
    const start = startDate ? new Date(startDate as string) : subDays(new Date(), 30);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Validate sort parameter
    const validSortFields = ['revenue', 'quantity', 'transactions', 'avg_price'];
    if (!validSortFields.includes(sortBy as string)) {
      throw createError('Invalid sort field', 400, 'INVALID_SORT_FIELD');
    }

    // Get product performance data
    const performanceQuery = `
      SELECT 
        p.id,
        p.name,
        p.category,
        SUM(t.amount) as revenue,
        SUM(t.quantity) as total_quantity,
        COUNT(t.id) as transaction_count,
        AVG(t.unit_price) as avg_price,
        (SUM(t.amount) / SUM(t.quantity)) as avg_revenue_per_unit
      FROM products p
      JOIN transactions t ON p.id = t.product_id
      WHERE t.transaction_date >= $1 AND t.transaction_date <= $2
      GROUP BY p.id, p.name, p.category
      ORDER BY ${sortBy === 'revenue' ? 'revenue' : 
                sortBy === 'quantity' ? 'total_quantity' : 
                sortBy === 'transactions' ? 'transaction_count' : 'avg_price'} DESC
      LIMIT $3
    `;
    
    const performanceResult = await query(performanceQuery, [start, end, limit]);

    // Get category performance
    const categoryQuery = `
      SELECT 
        p.category,
        SUM(t.amount) as revenue,
        SUM(t.quantity) as total_quantity,
        COUNT(t.id) as transaction_count,
        AVG(t.unit_price) as avg_price,
        COUNT(DISTINCT p.id) as product_count
      FROM products p
      JOIN transactions t ON p.id = t.product_id
      WHERE t.transaction_date >= $1 AND t.transaction_date <= $2
      GROUP BY p.category
      ORDER BY revenue DESC
    `;
    
    const categoryResult = await query(categoryQuery, [start, end]);

    // Calculate total revenue for percentage calculations
    const totalRevenue = categoryResult.rows.reduce((sum, row) => sum + parseFloat(row.revenue), 0);

    // Get worst performing products
    const worstPerformingQuery = `
      SELECT 
        p.id,
        p.name,
        p.category,
        SUM(t.amount) as revenue,
        SUM(t.quantity) as total_quantity,
        COUNT(t.id) as transaction_count
      FROM products p
      JOIN transactions t ON p.id = t.product_id
      WHERE t.transaction_date >= $1 AND t.transaction_date <= $2
      GROUP BY p.id, p.name, p.category
      ORDER BY revenue ASC
      LIMIT $3
    `;
    
    const worstResult = await query(worstPerformingQuery, [start, end, limit]);

    res.json({
      topProducts: performanceResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        category: row.category,
        revenue: parseFloat(row.revenue),
        totalQuantity: parseInt(row.total_quantity),
        transactionCount: parseInt(row.transaction_count),
        averagePrice: parseFloat(row.avg_price),
        averageRevenuePerUnit: parseFloat(row.avg_revenue_per_unit)
      })),
      bottomProducts: worstResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        category: row.category,
        revenue: parseFloat(row.revenue),
        totalQuantity: parseInt(row.total_quantity),
        transactionCount: parseInt(row.transaction_count)
      })),
      categoryPerformance: categoryResult.rows.map(row => ({
        category: row.category,
        revenue: parseFloat(row.revenue),
        totalQuantity: parseInt(row.total_quantity),
        transactionCount: parseInt(row.transaction_count),
        averagePrice: parseFloat(row.avg_price),
        productCount: parseInt(row.product_count),
        percentage: totalRevenue > 0 ? (parseFloat(row.revenue) / totalRevenue) * 100 : 0
      })),
      summary: {
        totalRevenue,
        totalProducts: performanceResult.rows.length,
        period: {
          start: format(start, 'yyyy-MM-dd'),
          end: format(end, 'yyyy-MM-dd')
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/products/trends - Get product performance trends over time
router.get('/trends', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, period = 'daily', limit = 30 } = req.query;
    
    if (!productId) {
      throw createError('Product ID is required', 400, 'MISSING_PRODUCT_ID');
    }

    let groupBy: string;
    let dateFormat: string;
    
    switch (period) {
      case 'weekly':
        groupBy = "DATE_TRUNC('week', transaction_date)";
        dateFormat = 'yyyy-MM-dd';
        break;
      case 'monthly':
        groupBy = "DATE_TRUNC('month', transaction_date)";
        dateFormat = 'yyyy-MM-01';
        break;
      default:
        groupBy = "transaction_date::date";
        dateFormat = 'yyyy-MM-dd';
    }

    const trendsQuery = `
      SELECT 
        ${groupBy} as period,
        SUM(amount) as revenue,
        SUM(quantity) as total_quantity,
        COUNT(*) as transaction_count,
        AVG(unit_price) as avg_price
      FROM transactions 
      WHERE product_id = $1 
        AND transaction_date >= CURRENT_DATE - INTERVAL '${limit} days'
      GROUP BY ${groupBy}
      ORDER BY period DESC
      LIMIT $2
    `;
    
    const result = await query(trendsQuery, [productId, limit]);

    // Get product details
    const productQuery = `
      SELECT id, name, category FROM products WHERE id = $1
    `;
    const productResult = await query(productQuery, [productId]);
    
    if (productResult.rows.length === 0) {
      throw createError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    res.json({
      product: productResult.rows[0],
      trends: result.rows.map(row => ({
        period: format(new Date(row.period), dateFormat),
        revenue: parseFloat(row.revenue),
        totalQuantity: parseInt(row.total_quantity),
        transactionCount: parseInt(row.transaction_count),
        averagePrice: parseFloat(row.avg_price)
      })),
      periodType: period
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/products/categories - Get all product categories with stats
router.get('/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate as string) : subDays(new Date(), 30);
    const end = endDate ? new Date(endDate as string) : new Date();

    const categoriesQuery = `
      SELECT 
        p.category,
        COUNT(DISTINCT p.id) as product_count,
        SUM(t.amount) as total_revenue,
        SUM(t.quantity) as total_quantity,
        COUNT(t.id) as transaction_count,
        AVG(t.unit_price) as avg_price,
        MIN(t.unit_price) as min_price,
        MAX(t.unit_price) as max_price
      FROM products p
      LEFT JOIN transactions t ON p.id = t.product_id 
        AND t.transaction_date >= $1 AND t.transaction_date <= $2
      GROUP BY p.category
      ORDER BY total_revenue DESC NULLS LAST
    `;
    
    const result = await query(categoriesQuery, [start, end]);

    res.json({
      categories: result.rows.map(row => ({
        category: row.category,
        productCount: parseInt(row.product_count),
        totalRevenue: parseFloat(row.total_revenue) || 0,
        totalQuantity: parseInt(row.total_quantity) || 0,
        transactionCount: parseInt(row.transaction_count) || 0,
        averagePrice: parseFloat(row.avg_price) || 0,
        priceRange: {
          min: parseFloat(row.min_price) || 0,
          max: parseFloat(row.max_price) || 0
        }
      })),
      period: {
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd')
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/products/seasonal - Get seasonal product performance
router.get('/seasonal', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const seasonalQuery = `
      SELECT 
        p.id,
        p.name,
        p.category,
        EXTRACT(MONTH FROM t.transaction_date) as month,
        SUM(t.amount) as revenue,
        SUM(t.quantity) as total_quantity,
        COUNT(t.id) as transaction_count
      FROM products p
      JOIN transactions t ON p.id = t.product_id
      WHERE EXTRACT(YEAR FROM t.transaction_date) = $1
      GROUP BY p.id, p.name, p.category, EXTRACT(MONTH FROM t.transaction_date)
      ORDER BY p.name, month
    `;
    
    const result = await query(seasonalQuery, [year]);

    // Group by product and create monthly breakdown
    const productSeasonalData = result.rows.reduce((acc, row) => {
      const productKey = `${row.id}-${row.name}`;
      if (!acc[productKey]) {
        acc[productKey] = {
          id: row.id,
          name: row.name,
          category: row.category,
          monthlyData: Array(12).fill(null).map((_, index) => ({
            month: index + 1,
            revenue: 0,
            totalQuantity: 0,
            transactionCount: 0
          }))
        };
      }
      
      const monthIndex = parseInt(row.month) - 1;
      acc[productKey].monthlyData[monthIndex] = {
        month: parseInt(row.month),
        revenue: parseFloat(row.revenue),
        totalQuantity: parseInt(row.total_quantity),
        transactionCount: parseInt(row.transaction_count)
      };
      
      return acc;
    }, {} as any);

    res.json({
      year: parseInt(year as string),
      products: Object.values(productSeasonalData),
      summary: {
        totalProducts: Object.keys(productSeasonalData).length,
        dataPoints: result.rows.length
      }
    });
  } catch (error) {
    next(error);
  }
});

export { router as productRouter };