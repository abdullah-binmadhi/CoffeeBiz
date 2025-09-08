import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../services/database';
import { createError } from '../middleware/errorHandler';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

const router = Router();

// GET /api/revenue/metrics - Get revenue metrics with date range
router.get('/metrics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, period = 'daily' } = req.query;
    
    const start = startDate ? new Date(startDate as string) : subDays(new Date(), 30);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Validate date range
    if (start > end) {
      throw createError('Start date cannot be after end date', 400, 'INVALID_DATE_RANGE');
    }

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
    
    const totalResult = await query(totalQuery, [start, end]);
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
    
    const dailyResult = await query(dailyQuery, [start, end]);

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
    
    const paymentResult = await query(paymentQuery, [start, end]);

    // Calculate growth rate (compare with previous period)
    const periodDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const previousStart = subDays(start, periodDays);
    const previousEnd = subDays(end, periodDays);

    const previousQuery = `
      SELECT COALESCE(SUM(amount), 0) as previous_revenue
      FROM transactions 
      WHERE transaction_date >= $1 AND transaction_date <= $2
    `;
    
    const previousResult = await query(previousQuery, [previousStart, previousEnd]);
    const previousRevenue = parseFloat(previousResult.rows[0].previous_revenue) || 0;
    const currentRevenue = parseFloat(totals.total_revenue) || 0;
    const growthRate = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    // Format payment method breakdown
    const paymentMethodBreakdown = paymentResult.rows.reduce((acc, row) => {
      acc[row.payment_method] = {
        count: parseInt(row.count),
        revenue: parseFloat(row.revenue)
      };
      return acc;
    }, {} as any);

    res.json({
      totalRevenue: parseFloat(totals.total_revenue),
      transactionCount: parseInt(totals.transaction_count),
      averageTransactionValue: parseFloat(totals.avg_transaction_value),
      uniqueCustomers: parseInt(totals.unique_customers),
      growthRate: Math.round(growthRate * 100) / 100,
      dailyRevenue: dailyResult.rows.map(row => ({
        date: format(new Date(row.date), 'yyyy-MM-dd'),
        revenue: parseFloat(row.revenue),
        transactions: parseInt(row.transactions),
        uniqueCustomers: parseInt(row.unique_customers)
      })),
      paymentMethodBreakdown,
      period: {
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd')
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/revenue/trends - Get revenue trends by period
router.get('/trends', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period = 'daily', limit = 30 } = req.query;
    
    let groupBy: string;
    let dateFormat: string;
    
    switch (period) {
      case 'hourly':
        groupBy = "DATE_TRUNC('hour', transaction_datetime)";
        dateFormat = 'yyyy-MM-dd HH:00';
        break;
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
        COUNT(*) as transactions,
        AVG(amount) as avg_transaction_value,
        COUNT(DISTINCT customer_id) as unique_customers
      FROM transactions 
      WHERE transaction_date >= CURRENT_DATE - INTERVAL '${limit} days'
      GROUP BY ${groupBy}
      ORDER BY period DESC
      LIMIT $1
    `;
    
    const result = await query(trendsQuery, [limit]);

    res.json({
      trends: result.rows.map(row => ({
        period: format(new Date(row.period), dateFormat),
        revenue: parseFloat(row.revenue),
        transactions: parseInt(row.transactions),
        averageTransactionValue: parseFloat(row.avg_transaction_value),
        uniqueCustomers: parseInt(row.unique_customers)
      })),
      periodType: period
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/revenue/comparison - Compare revenue across different periods
router.get('/comparison', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentStart, currentEnd, compareStart, compareEnd } = req.query;
    
    if (!currentStart || !currentEnd || !compareStart || !compareEnd) {
      throw createError('All date parameters are required for comparison', 400, 'MISSING_DATES');
    }

    const currentPeriodQuery = `
      SELECT 
        SUM(amount) as revenue,
        COUNT(*) as transactions,
        AVG(amount) as avg_transaction_value,
        COUNT(DISTINCT customer_id) as unique_customers
      FROM transactions 
      WHERE transaction_date >= $1 AND transaction_date <= $2
    `;

    const [currentResult, compareResult] = await Promise.all([
      query(currentPeriodQuery, [currentStart, currentEnd]),
      query(currentPeriodQuery, [compareStart, compareEnd])
    ]);

    const current = currentResult.rows[0];
    const compare = compareResult.rows[0];

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    res.json({
      current: {
        revenue: parseFloat(current.revenue) || 0,
        transactions: parseInt(current.transactions) || 0,
        averageTransactionValue: parseFloat(current.avg_transaction_value) || 0,
        uniqueCustomers: parseInt(current.unique_customers) || 0
      },
      comparison: {
        revenue: parseFloat(compare.revenue) || 0,
        transactions: parseInt(compare.transactions) || 0,
        averageTransactionValue: parseFloat(compare.avg_transaction_value) || 0,
        uniqueCustomers: parseInt(compare.unique_customers) || 0
      },
      changes: {
        revenue: calculateChange(parseFloat(current.revenue) || 0, parseFloat(compare.revenue) || 0),
        transactions: calculateChange(parseInt(current.transactions) || 0, parseInt(compare.transactions) || 0),
        averageTransactionValue: calculateChange(parseFloat(current.avg_transaction_value) || 0, parseFloat(compare.avg_transaction_value) || 0),
        uniqueCustomers: calculateChange(parseInt(current.unique_customers) || 0, parseInt(compare.unique_customers) || 0)
      }
    });
  } catch (error) {
    next(error);
  }
});

export { router as revenueRouter };