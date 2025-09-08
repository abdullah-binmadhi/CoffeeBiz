import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../services/database';
import { createError } from '../middleware/errorHandler';
import { format, subDays, getDay } from 'date-fns';
import { cacheMiddleware, CacheConfigs } from '../middleware/cache';
import { CacheKeys } from '../services/cache';

const router = Router();

// GET /api/traffic/hourly - Get hourly traffic patterns
router.get('/hourly', cacheMiddleware({
  ...CacheConfigs.traffic,
  keyGenerator: (req) => CacheKeys.traffic.hourly(
    req.query.startDate as string || subDays(new Date(), 7).toISOString().split('T')[0],
    req.query.endDate as string || new Date().toISOString().split('T')[0],
    req.query.dayOfWeek as string
  )
}), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, dayOfWeek } = req.query;
    
    const start = startDate ? new Date(startDate as string) : subDays(new Date(), 7);
    const end = endDate ? new Date(endDate as string) : new Date();

    let whereClause = 'WHERE transaction_date >= $1 AND transaction_date <= $2';
    const params = [start, end];

    if (dayOfWeek !== undefined) {
      whereClause += ' AND EXTRACT(DOW FROM transaction_date) = $3';
      params.push(dayOfWeek);
    }

    const hourlyQuery = `
      SELECT 
        EXTRACT(HOUR FROM transaction_datetime) as hour,
        COUNT(*) as transaction_count,
        SUM(amount) as revenue,
        COUNT(DISTINCT customer_id) as unique_customers,
        AVG(amount) as avg_transaction_value
      FROM transactions 
      ${whereClause}
      GROUP BY EXTRACT(HOUR FROM transaction_datetime)
      ORDER BY hour
    `;
    
    const result = await query(hourlyQuery, params);

    // Fill in missing hours with zero values
    const hourlyData = Array(24).fill(null).map((_, hour) => {
      const data = result.rows.find(row => parseInt(row.hour) === hour);
      return {
        hour,
        transactionCount: data ? parseInt(data.transaction_count) : 0,
        revenue: data ? parseFloat(data.revenue) : 0,
        uniqueCustomers: data ? parseInt(data.unique_customers) : 0,
        averageTransactionValue: data ? parseFloat(data.avg_transaction_value) : 0
      };
    });

    // Identify peak hours (top 3 hours by transaction count)
    const peakHours = [...hourlyData]
      .sort((a, b) => b.transactionCount - a.transactionCount)
      .slice(0, 3)
      .map(data => data.hour);

    res.json({
      hourlyStats: hourlyData,
      peakHours,
      summary: {
        totalTransactions: hourlyData.reduce((sum, data) => sum + data.transactionCount, 0),
        totalRevenue: hourlyData.reduce((sum, data) => sum + data.revenue, 0),
        busiestHour: hourlyData.reduce((max, data) => 
          data.transactionCount > max.transactionCount ? data : max
        ),
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

// GET /api/traffic/daily - Get daily traffic patterns
router.get('/daily', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate as string) : subDays(new Date(), 30);
    const end = endDate ? new Date(endDate as string) : new Date();

    const dailyQuery = `
      SELECT 
        transaction_date::date as date,
        EXTRACT(DOW FROM transaction_date) as day_of_week,
        COUNT(*) as transaction_count,
        SUM(amount) as revenue,
        COUNT(DISTINCT customer_id) as unique_customers,
        AVG(amount) as avg_transaction_value
      FROM transactions 
      WHERE transaction_date >= $1 AND transaction_date <= $2
      GROUP BY transaction_date::date, EXTRACT(DOW FROM transaction_date)
      ORDER BY date
    `;
    
    const result = await query(dailyQuery, [start, end]);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const dailyStats = result.rows.map(row => ({
      date: format(new Date(row.date), 'yyyy-MM-dd'),
      dayOfWeek: dayNames[parseInt(row.day_of_week)],
      dayOfWeekNumber: parseInt(row.day_of_week),
      transactionCount: parseInt(row.transaction_count),
      revenue: parseFloat(row.revenue),
      uniqueCustomers: parseInt(row.unique_customers),
      averageTransactionValue: parseFloat(row.avg_transaction_value)
    }));

    // Calculate day-of-week averages
    const dayOfWeekStats = dayNames.map((dayName, index) => {
      const dayData = dailyStats.filter(stat => stat.dayOfWeekNumber === index);
      const avgTransactions = dayData.length > 0 
        ? dayData.reduce((sum, stat) => sum + stat.transactionCount, 0) / dayData.length 
        : 0;
      const avgRevenue = dayData.length > 0 
        ? dayData.reduce((sum, stat) => sum + stat.revenue, 0) / dayData.length 
        : 0;
      
      return {
        dayOfWeek: dayName,
        dayOfWeekNumber: index,
        averageTransactions: Math.round(avgTransactions * 100) / 100,
        averageRevenue: Math.round(avgRevenue * 100) / 100,
        dataPoints: dayData.length
      };
    });

    res.json({
      dailyStats,
      dayOfWeekAverages: dayOfWeekStats,
      summary: {
        totalDays: dailyStats.length,
        averageDailyTransactions: dailyStats.length > 0 
          ? Math.round((dailyStats.reduce((sum, stat) => sum + stat.transactionCount, 0) / dailyStats.length) * 100) / 100
          : 0,
        averageDailyRevenue: dailyStats.length > 0 
          ? Math.round((dailyStats.reduce((sum, stat) => sum + stat.revenue, 0) / dailyStats.length) * 100) / 100
          : 0,
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

// GET /api/traffic/patterns - Get comprehensive traffic patterns
router.get('/patterns', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate as string) : subDays(new Date(), 30);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Get hourly patterns by day of week
    const patternsQuery = `
      SELECT 
        EXTRACT(DOW FROM transaction_date) as day_of_week,
        EXTRACT(HOUR FROM transaction_datetime) as hour,
        COUNT(*) as transaction_count,
        SUM(amount) as revenue,
        COUNT(DISTINCT customer_id) as unique_customers
      FROM transactions 
      WHERE transaction_date >= $1 AND transaction_date <= $2
      GROUP BY EXTRACT(DOW FROM transaction_date), EXTRACT(HOUR FROM transaction_datetime)
      ORDER BY day_of_week, hour
    `;
    
    const result = await query(patternsQuery, [start, end]);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Group data by day of week
    const weeklyPatterns = dayNames.map((dayName, dayIndex) => {
      const dayData = result.rows.filter(row => parseInt(row.day_of_week) === dayIndex);
      
      const hourlyData = Array(24).fill(null).map((_, hour) => {
        const hourData = dayData.find(row => parseInt(row.hour) === hour);
        return {
          hour,
          transactionCount: hourData ? parseInt(hourData.transaction_count) : 0,
          revenue: hourData ? parseFloat(hourData.revenue) : 0,
          uniqueCustomers: hourData ? parseInt(hourData.unique_customers) : 0
        };
      });

      const totalTransactions = hourlyData.reduce((sum, data) => sum + data.transactionCount, 0);
      const peakHour = hourlyData.reduce((max, data) => 
        data.transactionCount > max.transactionCount ? data : max
      );

      return {
        dayOfWeek: dayName,
        dayOfWeekNumber: dayIndex,
        hourlyData,
        totalTransactions,
        peakHour: peakHour.hour,
        peakHourTransactions: peakHour.transactionCount
      };
    });

    // Calculate staffing recommendations based on traffic patterns
    const staffingRecommendations = weeklyPatterns.map(day => {
      const highTrafficHours = day.hourlyData
        .filter(hour => hour.transactionCount > day.totalTransactions / 24 * 1.5) // 50% above average
        .map(hour => hour.hour);

      return {
        dayOfWeek: day.dayOfWeek,
        recommendedStaffHours: highTrafficHours,
        peakStaffingHour: day.peakHour,
        estimatedStaffNeeded: Math.max(1, Math.ceil(day.peakHourTransactions / 10)) // Rough estimate: 1 staff per 10 transactions
      };
    });

    res.json({
      weeklyPatterns,
      staffingRecommendations,
      summary: {
        totalTransactions: weeklyPatterns.reduce((sum, day) => sum + day.totalTransactions, 0),
        busiestDay: weeklyPatterns.reduce((max, day) => 
          day.totalTransactions > max.totalTransactions ? day : max
        ).dayOfWeek,
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

// GET /api/traffic/capacity - Get capacity utilization metrics
router.get('/capacity', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, maxCapacity = 50 } = req.query; // Default max capacity per hour
    
    const start = startDate ? new Date(startDate as string) : subDays(new Date(), 7);
    const end = endDate ? new Date(endDate as string) : new Date();

    const capacityQuery = `
      SELECT 
        DATE_TRUNC('hour', transaction_datetime) as hour_period,
        COUNT(*) as transaction_count,
        COUNT(DISTINCT customer_id) as unique_customers
      FROM transactions 
      WHERE transaction_date >= $1 AND transaction_date <= $2
      GROUP BY DATE_TRUNC('hour', transaction_datetime)
      ORDER BY hour_period
    `;
    
    const result = await query(capacityQuery, [start, end]);

    const maxCap = parseInt(maxCapacity as string);
    
    const capacityData = result.rows.map(row => {
      const utilization = (parseInt(row.transaction_count) / maxCap) * 100;
      return {
        period: format(new Date(row.hour_period), 'yyyy-MM-dd HH:00'),
        transactionCount: parseInt(row.transaction_count),
        uniqueCustomers: parseInt(row.unique_customers),
        capacityUtilization: Math.min(100, Math.round(utilization * 100) / 100),
        isOverCapacity: utilization > 100
      };
    });

    const overCapacityPeriods = capacityData.filter(data => data.isOverCapacity);
    const averageUtilization = capacityData.length > 0 
      ? capacityData.reduce((sum, data) => sum + data.capacityUtilization, 0) / capacityData.length
      : 0;

    res.json({
      capacityData,
      summary: {
        maxCapacity: maxCap,
        averageUtilization: Math.round(averageUtilization * 100) / 100,
        overCapacityPeriods: overCapacityPeriods.length,
        peakUtilization: Math.max(...capacityData.map(data => data.capacityUtilization)),
        recommendations: {
          increaseCapacity: overCapacityPeriods.length > capacityData.length * 0.1, // If >10% of periods are over capacity
          optimizeStaffing: averageUtilization < 60 // If average utilization is low
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

export { router as trafficRouter };