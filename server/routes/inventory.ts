import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../services/database';
import { createError } from '../middleware/errorHandler';
import { format, subDays, subWeeks, addDays } from 'date-fns';

const router = Router();

// GET /api/inventory/demand-forecast - Get demand forecasting for products
router.get('/demand-forecast', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, days = 30, forecastDays = 7 } = req.query;
    
    const lookbackDays = parseInt(days as string);
    const forecastPeriod = parseInt(forecastDays as string);
    const start = subDays(new Date(), lookbackDays);
    const end = new Date();

    let whereClause = 'WHERE transaction_date >= $1 AND transaction_date <= $2';
    const params = [start, end];

    if (productId) {
      whereClause += ' AND product_id = $3';
      params.push(productId);
    }

    // Get historical demand data
    const demandQuery = `
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.category,
        transaction_date::date as date,
        SUM(t.quantity) as daily_demand,
        COUNT(*) as transaction_count,
        AVG(t.quantity) as avg_quantity_per_transaction
      FROM products p
      JOIN transactions t ON p.id = t.product_id
      ${whereClause}
      GROUP BY p.id, p.name, p.category, transaction_date::date
      ORDER BY p.name, date
    `;
    
    const demandResult = await query(demandQuery, params);

    // Group by product and calculate forecasts
    const productDemand = demandResult.rows.reduce((acc, row) => {
      const productKey = row.product_id;
      if (!acc[productKey]) {
        acc[productKey] = {
          productId: row.product_id,
          productName: row.product_name,
          category: row.category,
          historicalData: [],
          totalDemand: 0,
          averageDailyDemand: 0,
          forecast: []
        };
      }
      
      const dailyDemand = parseInt(row.daily_demand);
      acc[productKey].historicalData.push({
        date: format(new Date(row.date), 'yyyy-MM-dd'),
        demand: dailyDemand,
        transactionCount: parseInt(row.transaction_count),
        averageQuantityPerTransaction: parseFloat(row.avg_quantity_per_transaction)
      });
      acc[productKey].totalDemand += dailyDemand;
      
      return acc;
    }, {} as any);

    // Calculate forecasts using simple moving average
    Object.keys(productDemand).forEach(productKey => {
      const product = productDemand[productKey];
      const historicalDemands = product.historicalData.map((d: any) => d.demand);
      
      if (historicalDemands.length > 0) {
        product.averageDailyDemand = product.totalDemand / historicalDemands.length;
        
        // Simple moving average forecast (using last 7 days if available)
        const recentDemands = historicalDemands.slice(-7);
        const movingAverage = recentDemands.reduce((sum: number, demand: number) => sum + demand, 0) / recentDemands.length;
        
        // Generate forecast for next N days
        for (let i = 1; i <= forecastPeriod; i++) {
          const forecastDate = addDays(end, i);
          product.forecast.push({
            date: format(forecastDate, 'yyyy-MM-dd'),
            predictedDemand: Math.round(movingAverage),
            confidence: recentDemands.length >= 7 ? 'high' : recentDemands.length >= 3 ? 'medium' : 'low'
          });
        }
      }
    });

    res.json({
      products: Object.values(productDemand),
      summary: {
        totalProducts: Object.keys(productDemand).length,
        forecastPeriod: forecastPeriod,
        historicalPeriod: lookbackDays,
        generatedAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss')
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/inventory/stock-optimization - Get stock level optimization recommendations
router.get('/stock-optimization', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, minDays = 7 } = req.query;
    
    const analysisStart = subDays(new Date(), parseInt(minDays as string));
    
    let whereClause = 'WHERE t.transaction_date >= $1';
    const params = [analysisStart];

    if (category) {
      whereClause += ' AND p.category = $2';
      params.push(category);
    }

    // Calculate stock optimization metrics
    const optimizationQuery = `
      WITH product_stats AS (
        SELECT 
          p.id as product_id,
          p.name as product_name,
          p.category,
          COUNT(DISTINCT t.transaction_date::date) as active_days,
          SUM(t.quantity) as total_sold,
          AVG(t.quantity) as avg_daily_sales,
          STDDEV(t.quantity) as sales_volatility,
          MAX(t.quantity) as max_daily_sales,
          MIN(t.quantity) as min_daily_sales
        FROM products p
        JOIN transactions t ON p.id = t.product_id
        ${whereClause}
        GROUP BY p.id, p.name, p.category
        HAVING COUNT(DISTINCT t.transaction_date::date) >= 3
      )
      SELECT 
        product_id,
        product_name,
        category,
        active_days,
        total_sold,
        avg_daily_sales,
        COALESCE(sales_volatility, 0) as sales_volatility,
        max_daily_sales,
        min_daily_sales,
        -- Safety stock calculation (avg + 2 * stddev for 95% service level)
        CEIL(avg_daily_sales + (2 * COALESCE(sales_volatility, avg_daily_sales * 0.2))) as recommended_safety_stock,
        -- Reorder point (safety stock + lead time demand, assuming 2 day lead time)
        CEIL((avg_daily_sales * 2) + (avg_daily_sales + (2 * COALESCE(sales_volatility, avg_daily_sales * 0.2)))) as reorder_point,
        -- Economic order quantity (simplified, assuming holding cost = 20% of item cost)
        CEIL(SQRT((2 * total_sold * 10) / (avg_daily_sales * 0.2))) as economic_order_quantity
      FROM product_stats
      ORDER BY total_sold DESC
    `;
    
    const optimizationResult = await query(optimizationQuery, params);

    // Categorize products by optimization priority
    const recommendations = optimizationResult.rows.map(row => {
      const avgSales = parseFloat(row.avg_daily_sales);
      const volatility = parseFloat(row.sales_volatility);
      const volatilityRatio = avgSales > 0 ? volatility / avgSales : 0;
      
      let priority: string;
      let recommendation: string;
      
      if (avgSales > 10 && volatilityRatio > 0.5) {
        priority = 'high';
        recommendation = 'High-volume, high-variability product. Maintain higher safety stock and monitor closely.';
      } else if (avgSales > 10) {
        priority = 'high';
        recommendation = 'High-volume, stable product. Optimize for cost efficiency with regular reorders.';
      } else if (volatilityRatio > 0.8) {
        priority = 'medium';
        recommendation = 'Unpredictable demand. Consider demand smoothing strategies or promotional activities.';
      } else if (avgSales < 1) {
        priority = 'low';
        recommendation = 'Low-demand product. Consider reducing stock levels or discontinuing.';
      } else {
        priority = 'medium';
        recommendation = 'Moderate demand. Standard inventory management practices apply.';
      }

      return {
        productId: row.product_id,
        productName: row.product_name,
        category: row.category,
        activeDays: parseInt(row.active_days),
        totalSold: parseInt(row.total_sold),
        averageDailySales: Math.round(avgSales * 100) / 100,
        salesVolatility: Math.round(volatility * 100) / 100,
        volatilityRatio: Math.round(volatilityRatio * 100) / 100,
        maxDailySales: parseInt(row.max_daily_sales),
        minDailySales: parseInt(row.min_daily_sales),
        recommendedSafetyStock: parseInt(row.recommended_safety_stock),
        reorderPoint: parseInt(row.reorder_point),
        economicOrderQuantity: parseInt(row.economic_order_quantity),
        priority,
        recommendation
      };
    });

    // Group by category for summary
    const categoryStats = recommendations.reduce((acc, product) => {
      if (!acc[product.category]) {
        acc[product.category] = {
          category: product.category,
          productCount: 0,
          totalSold: 0,
          averageSales: 0,
          highPriorityProducts: 0
        };
      }
      
      acc[product.category].productCount++;
      acc[product.category].totalSold += product.totalSold;
      if (product.priority === 'high') {
        acc[product.category].highPriorityProducts++;
      }
      
      return acc;
    }, {} as any);

    // Calculate category averages
    Object.keys(categoryStats).forEach(category => {
      const stats = categoryStats[category];
      stats.averageSales = stats.productCount > 0 ? stats.totalSold / stats.productCount : 0;
    });

    res.json({
      recommendations,
      categoryStats: Object.values(categoryStats),
      summary: {
        totalProducts: recommendations.length,
        highPriorityProducts: recommendations.filter(r => r.priority === 'high').length,
        mediumPriorityProducts: recommendations.filter(r => r.priority === 'medium').length,
        lowPriorityProducts: recommendations.filter(r => r.priority === 'low').length,
        analysisDate: format(new Date(), 'yyyy-MM-dd'),
        analysisPeriod: parseInt(minDays as string)
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/inventory/waste-analysis - Get waste reduction insights
router.get('/waste-analysis', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, category } = req.query;
    
    const start = startDate ? new Date(startDate as string) : subWeeks(new Date(), 4);
    const end = endDate ? new Date(endDate as string) : new Date();

    let whereClause = 'WHERE t.transaction_date >= $1 AND t.transaction_date <= $2';
    const params = [start, end];

    if (category) {
      whereClause += ' AND p.category = $3';
      params.push(category);
    }

    // Analyze sales patterns to identify potential waste
    const wasteAnalysisQuery = `
      WITH daily_sales AS (
        SELECT 
          p.id as product_id,
          p.name as product_name,
          p.category,
          t.transaction_date::date as date,
          SUM(t.quantity) as daily_quantity,
          COUNT(*) as transaction_count
        FROM products p
        JOIN transactions t ON p.id = t.product_id
        ${whereClause}
        GROUP BY p.id, p.name, p.category, t.transaction_date::date
      ),
      product_patterns AS (
        SELECT 
          product_id,
          product_name,
          category,
          COUNT(*) as active_days,
          AVG(daily_quantity) as avg_daily_sales,
          STDDEV(daily_quantity) as sales_stddev,
          MAX(daily_quantity) as max_daily_sales,
          MIN(daily_quantity) as min_daily_sales,
          -- Count days with zero sales (potential waste indicators)
          COUNT(*) - COUNT(daily_quantity) as zero_sales_days,
          -- Count days with very low sales (< 25% of average)
          COUNT(CASE WHEN daily_quantity < (AVG(daily_quantity) * 0.25) THEN 1 END) as low_sales_days
        FROM daily_sales
        GROUP BY product_id, product_name, category
      )
      SELECT 
        product_id,
        product_name,
        category,
        active_days,
        avg_daily_sales,
        COALESCE(sales_stddev, 0) as sales_stddev,
        max_daily_sales,
        min_daily_sales,
        zero_sales_days,
        low_sales_days,
        -- Waste risk score (higher = more risk)
        CASE 
          WHEN avg_daily_sales < 1 THEN 'high'
          WHEN (COALESCE(sales_stddev, 0) / NULLIF(avg_daily_sales, 0)) > 1 THEN 'high'
          WHEN low_sales_days > (active_days * 0.3) THEN 'medium'
          ELSE 'low'
        END as waste_risk
      FROM product_patterns
      ORDER BY 
        CASE 
          WHEN avg_daily_sales < 1 THEN 3
          WHEN (COALESCE(sales_stddev, 0) / NULLIF(avg_daily_sales, 0)) > 1 THEN 3
          WHEN low_sales_days > (active_days * 0.3) THEN 2
          ELSE 1
        END DESC,
        avg_daily_sales ASC
    `;
    
    const wasteResult = await query(wasteAnalysisQuery, params);

    // Generate waste reduction recommendations
    const wasteAnalysis = wasteResult.rows.map(row => {
      const avgSales = parseFloat(row.avg_daily_sales);
      const stddev = parseFloat(row.sales_stddev);
      const variabilityRatio = avgSales > 0 ? stddev / avgSales : 0;
      const lowSalesRatio = parseInt(row.active_days) > 0 ? parseInt(row.low_sales_days) / parseInt(row.active_days) : 0;

      let recommendations: string[] = [];
      
      if (avgSales < 0.5) {
        recommendations.push('Consider discontinuing this product due to very low demand');
      } else if (avgSales < 2) {
        recommendations.push('Reduce order quantities and frequency');
        recommendations.push('Consider promotional activities to increase demand');
      }
      
      if (variabilityRatio > 1) {
        recommendations.push('High demand variability - implement just-in-time ordering');
        recommendations.push('Monitor daily sales closely and adjust orders accordingly');
      }
      
      if (lowSalesRatio > 0.3) {
        recommendations.push('Frequent low-sales days detected - review product placement and marketing');
      }
      
      if (recommendations.length === 0) {
        recommendations.push('Product shows stable demand pattern - maintain current inventory levels');
      }

      return {
        productId: row.product_id,
        productName: row.product_name,
        category: row.category,
        activeDays: parseInt(row.active_days),
        averageDailySales: Math.round(avgSales * 100) / 100,
        salesStandardDeviation: Math.round(stddev * 100) / 100,
        variabilityRatio: Math.round(variabilityRatio * 100) / 100,
        maxDailySales: parseInt(row.max_daily_sales),
        minDailySales: parseInt(row.min_daily_sales),
        zeroSalesDays: parseInt(row.zero_sales_days),
        lowSalesDays: parseInt(row.low_sales_days),
        lowSalesRatio: Math.round(lowSalesRatio * 100) / 100,
        wasteRisk: row.waste_risk,
        recommendations
      };
    });

    // Calculate category-level waste insights
    const categoryInsights = wasteAnalysis.reduce((acc, product) => {
      if (!acc[product.category]) {
        acc[product.category] = {
          category: product.category,
          totalProducts: 0,
          highRiskProducts: 0,
          mediumRiskProducts: 0,
          lowRiskProducts: 0,
          averageSales: 0,
          totalSales: 0
        };
      }
      
      acc[product.category].totalProducts++;
      acc[product.category].totalSales += product.averageDailySales;
      
      switch (product.wasteRisk) {
        case 'high':
          acc[product.category].highRiskProducts++;
          break;
        case 'medium':
          acc[product.category].mediumRiskProducts++;
          break;
        case 'low':
          acc[product.category].lowRiskProducts++;
          break;
      }
      
      return acc;
    }, {} as any);

    // Calculate category averages
    Object.keys(categoryInsights).forEach(category => {
      const insights = categoryInsights[category];
      insights.averageSales = insights.totalProducts > 0 ? insights.totalSales / insights.totalProducts : 0;
      insights.averageSales = Math.round(insights.averageSales * 100) / 100;
      delete insights.totalSales;
    });

    res.json({
      wasteAnalysis,
      categoryInsights: Object.values(categoryInsights),
      summary: {
        totalProducts: wasteAnalysis.length,
        highRiskProducts: wasteAnalysis.filter(p => p.wasteRisk === 'high').length,
        mediumRiskProducts: wasteAnalysis.filter(p => p.wasteRisk === 'medium').length,
        lowRiskProducts: wasteAnalysis.filter(p => p.wasteRisk === 'low').length,
        period: {
          start: format(start, 'yyyy-MM-dd'),
          end: format(end, 'yyyy-MM-dd')
        },
        analysisDate: format(new Date(), 'yyyy-MM-dd')
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/inventory/supplier-performance - Get supplier performance metrics (simulated)
router.get('/supplier-performance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate as string) : subDays(new Date(), 30);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Since we don't have actual supplier data, we'll simulate based on product categories
    const supplierQuery = `
      SELECT 
        p.category,
        COUNT(DISTINCT p.id) as products_supplied,
        SUM(t.quantity) as total_quantity_sold,
        SUM(t.amount) as total_revenue,
        AVG(t.unit_price) as avg_unit_price,
        COUNT(DISTINCT t.transaction_date::date) as active_days
      FROM products p
      JOIN transactions t ON p.id = t.product_id
      WHERE t.transaction_date >= $1 AND t.transaction_date <= $2
      GROUP BY p.category
      ORDER BY total_revenue DESC
    `;
    
    const supplierResult = await query(supplierQuery, [start, end]);

    // Simulate supplier performance metrics
    const supplierPerformance = supplierResult.rows.map((row, index) => {
      const totalRevenue = parseFloat(row.total_revenue);
      const totalQuantity = parseInt(row.total_quantity_sold);
      const activeDays = parseInt(row.active_days);
      
      // Simulate performance metrics (in a real system, these would come from actual supplier data)
      const deliveryReliability = 85 + Math.random() * 15; // 85-100%
      const qualityScore = 80 + Math.random() * 20; // 80-100%
      const costEfficiency = 70 + Math.random() * 30; // 70-100%
      const responseTime = 1 + Math.random() * 4; // 1-5 days
      
      return {
        supplierId: `SUP-${row.category.toUpperCase()}`,
        supplierName: `${row.category.charAt(0).toUpperCase() + row.category.slice(1)} Supplier Co.`,
        category: row.category,
        productsSupplied: parseInt(row.products_supplied),
        totalQuantitySold: totalQuantity,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        averageUnitPrice: Math.round(parseFloat(row.avg_unit_price) * 100) / 100,
        activeDays,
        performanceMetrics: {
          deliveryReliability: Math.round(deliveryReliability * 100) / 100,
          qualityScore: Math.round(qualityScore * 100) / 100,
          costEfficiency: Math.round(costEfficiency * 100) / 100,
          averageResponseTime: Math.round(responseTime * 100) / 100
        },
        overallScore: Math.round(((deliveryReliability + qualityScore + costEfficiency) / 3) * 100) / 100,
        recommendations: generateSupplierRecommendations(deliveryReliability, qualityScore, costEfficiency, totalRevenue)
      };
    });

    res.json({
      suppliers: supplierPerformance,
      summary: {
        totalSuppliers: supplierPerformance.length,
        topPerformer: supplierPerformance.reduce((max, supplier) => 
          supplier.overallScore > max.overallScore ? supplier : max
        ),
        averageScore: supplierPerformance.length > 0 
          ? Math.round((supplierPerformance.reduce((sum, s) => sum + s.overallScore, 0) / supplierPerformance.length) * 100) / 100
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

// Helper function to generate supplier recommendations
function generateSupplierRecommendations(delivery: number, quality: number, cost: number, revenue: number): string[] {
  const recommendations: string[] = [];
  
  if (delivery < 90) {
    recommendations.push('Improve delivery reliability - consider backup suppliers');
  }
  
  if (quality < 85) {
    recommendations.push('Address quality issues - implement quality control measures');
  }
  
  if (cost < 80) {
    recommendations.push('Negotiate better pricing or find more cost-effective alternatives');
  }
  
  if (revenue > 1000 && delivery > 95 && quality > 90) {
    recommendations.push('Excellent performance - consider expanding partnership');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Performance is satisfactory - maintain current relationship');
  }
  
  return recommendations;
}

export { router as inventoryRouter };