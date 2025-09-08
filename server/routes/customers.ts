import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../services/database';
import { createError } from '../middleware/errorHandler';
import { format, subDays, subMonths } from 'date-fns';

const router = Router();

// GET /api/customers/insights - Get comprehensive customer insights
router.get('/insights', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate as string) : subDays(new Date(), 30);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Get basic customer metrics
    const customerMetricsQuery = `
      SELECT 
        COUNT(DISTINCT customer_id) as total_customers,
        COUNT(DISTINCT CASE WHEN customer_id IS NOT NULL THEN customer_id END) as identified_customers,
        AVG(amount) as avg_spend_per_transaction,
        SUM(amount) / COUNT(DISTINCT customer_id) as avg_spend_per_customer
      FROM transactions 
      WHERE transaction_date >= $1 AND transaction_date <= $2
        AND customer_id IS NOT NULL
    `;
    
    const metricsResult = await query(customerMetricsQuery, [start, end]);
    const metrics = metricsResult.rows[0];

    // Get customer lifetime value data
    const lifetimeValueQuery = `
      SELECT 
        customer_id,
        COUNT(*) as visit_count,
        SUM(amount) as total_spent,
        AVG(amount) as avg_transaction_value,
        MIN(transaction_date) as first_visit,
        MAX(transaction_date) as last_visit,
        EXTRACT(DAYS FROM (MAX(transaction_date) - MIN(transaction_date))) as customer_lifespan_days
      FROM transactions 
      WHERE customer_id IS NOT NULL
        AND transaction_date >= $1 AND transaction_date <= $2
      GROUP BY customer_id
      HAVING COUNT(*) > 0
      ORDER BY total_spent DESC
    `;
    
    const lifetimeResult = await query(lifetimeValueQuery, [start, end]);

    // Calculate customer segments
    const customerSegments = {
      highValue: lifetimeResult.rows.filter(c => parseFloat(c.total_spent) > 100).length,
      mediumValue: lifetimeResult.rows.filter(c => parseFloat(c.total_spent) >= 50 && parseFloat(c.total_spent) <= 100).length,
      lowValue: lifetimeResult.rows.filter(c => parseFloat(c.total_spent) < 50).length,
      frequent: lifetimeResult.rows.filter(c => parseInt(c.visit_count) >= 10).length,
      occasional: lifetimeResult.rows.filter(c => parseInt(c.visit_count) >= 3 && parseInt(c.visit_count) < 10).length,
      oneTime: lifetimeResult.rows.filter(c => parseInt(c.visit_count) === 1).length
    };

    // Get new vs returning customers for the period
    const newVsReturningQuery = `
      WITH customer_first_visit AS (
        SELECT 
          customer_id,
          MIN(transaction_date) as first_visit_date
        FROM transactions 
        WHERE customer_id IS NOT NULL
        GROUP BY customer_id
      )
      SELECT 
        COUNT(DISTINCT CASE WHEN cfv.first_visit_date >= $1 THEN t.customer_id END) as new_customers,
        COUNT(DISTINCT CASE WHEN cfv.first_visit_date < $1 THEN t.customer_id END) as returning_customers
      FROM transactions t
      JOIN customer_first_visit cfv ON t.customer_id = cfv.customer_id
      WHERE t.transaction_date >= $1 AND t.transaction_date <= $2
        AND t.customer_id IS NOT NULL
    `;
    
    const newVsReturningResult = await query(newVsReturningQuery, [start, end]);
    const newVsReturning = newVsReturningResult.rows[0];

    res.json({
      totalCustomers: parseInt(metrics.total_customers) || 0,
      identifiedCustomers: parseInt(metrics.identified_customers) || 0,
      averageSpendPerTransaction: parseFloat(metrics.avg_spend_per_transaction) || 0,
      averageSpendPerCustomer: parseFloat(metrics.avg_spend_per_customer) || 0,
      newCustomers: parseInt(newVsReturning.new_customers) || 0,
      returningCustomers: parseInt(newVsReturning.returning_customers) || 0,
      customerSegments,
      topCustomers: lifetimeResult.rows.slice(0, 10).map(row => ({
        customerId: row.customer_id,
        visitCount: parseInt(row.visit_count),
        totalSpent: parseFloat(row.total_spent),
        averageTransactionValue: parseFloat(row.avg_transaction_value),
        firstVisit: format(new Date(row.first_visit), 'yyyy-MM-dd'),
        lastVisit: format(new Date(row.last_visit), 'yyyy-MM-dd'),
        lifespanDays: parseInt(row.customer_lifespan_days) || 0
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

// GET /api/customers/retention - Get customer retention analysis
router.get('/retention', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { months = 6 } = req.query;
    const monthsBack = parseInt(months as string);
    
    // Calculate retention rates for each month
    const retentionQuery = `
      WITH monthly_customers AS (
        SELECT 
          DATE_TRUNC('month', transaction_date) as month,
          customer_id
        FROM transactions 
        WHERE customer_id IS NOT NULL
          AND transaction_date >= CURRENT_DATE - INTERVAL '${monthsBack + 1} months'
        GROUP BY DATE_TRUNC('month', transaction_date), customer_id
      ),
      retention_analysis AS (
        SELECT 
          mc1.month as base_month,
          COUNT(DISTINCT mc1.customer_id) as base_customers,
          COUNT(DISTINCT mc2.customer_id) as retained_customers
        FROM monthly_customers mc1
        LEFT JOIN monthly_customers mc2 ON mc1.customer_id = mc2.customer_id 
          AND mc2.month = mc1.month + INTERVAL '1 month'
        WHERE mc1.month < DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY mc1.month
      )
      SELECT 
        base_month,
        base_customers,
        retained_customers,
        CASE 
          WHEN base_customers > 0 THEN (retained_customers::float / base_customers::float) * 100
          ELSE 0 
        END as retention_rate
      FROM retention_analysis
      ORDER BY base_month DESC
      LIMIT $1
    `;
    
    const retentionResult = await query(retentionQuery, [monthsBack]);

    // Calculate average retention rate
    const avgRetentionRate = retentionResult.rows.length > 0
      ? retentionResult.rows.reduce((sum, row) => sum + parseFloat(row.retention_rate), 0) / retentionResult.rows.length
      : 0;

    // Get cohort analysis (simplified)
    const cohortQuery = `
      WITH customer_cohorts AS (
        SELECT 
          customer_id,
          DATE_TRUNC('month', MIN(transaction_date)) as cohort_month,
          DATE_TRUNC('month', transaction_date) as transaction_month
        FROM transactions 
        WHERE customer_id IS NOT NULL
          AND transaction_date >= CURRENT_DATE - INTERVAL '${monthsBack} months'
        GROUP BY customer_id, DATE_TRUNC('month', transaction_date)
      )
      SELECT 
        cohort_month,
        COUNT(DISTINCT customer_id) as cohort_size,
        transaction_month,
        COUNT(DISTINCT customer_id) as active_customers,
        EXTRACT(MONTH FROM AGE(transaction_month, cohort_month)) as months_since_first_purchase
      FROM customer_cohorts
      GROUP BY cohort_month, transaction_month
      ORDER BY cohort_month, transaction_month
    `;
    
    const cohortResult = await query(cohortQuery);

    res.json({
      monthlyRetention: retentionResult.rows.map(row => ({
        month: format(new Date(row.base_month), 'yyyy-MM'),
        baseCustomers: parseInt(row.base_customers),
        retainedCustomers: parseInt(row.retained_customers),
        retentionRate: Math.round(parseFloat(row.retention_rate) * 100) / 100
      })),
      averageRetentionRate: Math.round(avgRetentionRate * 100) / 100,
      cohortData: cohortResult.rows.map(row => ({
        cohortMonth: format(new Date(row.cohort_month), 'yyyy-MM'),
        cohortSize: parseInt(row.cohort_size),
        transactionMonth: format(new Date(row.transaction_month), 'yyyy-MM'),
        activeCustomers: parseInt(row.active_customers),
        monthsSinceFirstPurchase: parseInt(row.months_since_first_purchase),
        retentionRate: parseInt(row.cohort_size) > 0 
          ? Math.round((parseInt(row.active_customers) / parseInt(row.cohort_size)) * 10000) / 100
          : 0
      }))
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/customers/loyalty - Get loyalty program effectiveness
router.get('/loyalty', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate as string) : subDays(new Date(), 30);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Analyze payment method as proxy for loyalty (card users are more trackable)
    const loyaltyQuery = `
      SELECT 
        payment_method,
        COUNT(DISTINCT customer_id) as unique_customers,
        COUNT(*) as total_transactions,
        SUM(amount) as total_revenue,
        AVG(amount) as avg_transaction_value
      FROM transactions 
      WHERE transaction_date >= $1 AND transaction_date <= $2
        AND customer_id IS NOT NULL
      GROUP BY payment_method
    `;
    
    const loyaltyResult = await query(loyaltyQuery, [start, end]);

    // Get repeat customer analysis
    const repeatCustomerQuery = `
      SELECT 
        customer_id,
        COUNT(*) as visit_count,
        SUM(amount) as total_spent,
        payment_method
      FROM transactions 
      WHERE transaction_date >= $1 AND transaction_date <= $2
        AND customer_id IS NOT NULL
      GROUP BY customer_id, payment_method
      HAVING COUNT(*) > 1
    `;
    
    const repeatResult = await query(repeatCustomerQuery, [start, end]);

    // Calculate loyalty metrics
    const loyaltyStats = loyaltyResult.rows.reduce((acc, row) => {
      acc[row.payment_method] = {
        uniqueCustomers: parseInt(row.unique_customers),
        totalTransactions: parseInt(row.total_transactions),
        totalRevenue: parseFloat(row.total_revenue),
        averageTransactionValue: parseFloat(row.avg_transaction_value),
        repeatCustomers: repeatResult.rows.filter(r => r.payment_method === row.payment_method).length
      };
      return acc;
    }, {} as any);

    // Calculate overall loyalty metrics
    const totalCustomers = loyaltyResult.rows.reduce((sum, row) => sum + parseInt(row.unique_customers), 0);
    const totalRepeatCustomers = repeatResult.rows.length;
    const loyaltyRate = totalCustomers > 0 ? (totalRepeatCustomers / totalCustomers) * 100 : 0;

    // Get frequency distribution
    const frequencyQuery = `
      SELECT 
        visit_count,
        COUNT(*) as customer_count
      FROM (
        SELECT 
          customer_id,
          COUNT(*) as visit_count
        FROM transactions 
        WHERE transaction_date >= $1 AND transaction_date <= $2
          AND customer_id IS NOT NULL
        GROUP BY customer_id
      ) customer_visits
      GROUP BY visit_count
      ORDER BY visit_count
    `;
    
    const frequencyResult = await query(frequencyQuery, [start, end]);

    res.json({
      loyaltyStats,
      overallMetrics: {
        totalCustomers,
        repeatCustomers: totalRepeatCustomers,
        loyaltyRate: Math.round(loyaltyRate * 100) / 100,
        oneTimeCustomers: totalCustomers - totalRepeatCustomers
      },
      visitFrequencyDistribution: frequencyResult.rows.map(row => ({
        visitCount: parseInt(row.visit_count),
        customerCount: parseInt(row.customer_count),
        percentage: totalCustomers > 0 
          ? Math.round((parseInt(row.customer_count) / totalCustomers) * 10000) / 100
          : 0
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

// GET /api/customers/segments - Get customer segmentation analysis
router.get('/segments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate as string) : subMonths(new Date(), 3);
    const end = endDate ? new Date(endDate as string) : new Date();

    // RFM Analysis (Recency, Frequency, Monetary)
    const rfmQuery = `
      WITH customer_rfm AS (
        SELECT 
          customer_id,
          EXTRACT(DAYS FROM (CURRENT_DATE - MAX(transaction_date))) as recency_days,
          COUNT(*) as frequency,
          SUM(amount) as monetary_value,
          AVG(amount) as avg_order_value
        FROM transactions 
        WHERE customer_id IS NOT NULL
          AND transaction_date >= $1 AND transaction_date <= $2
        GROUP BY customer_id
      ),
      rfm_scores AS (
        SELECT 
          customer_id,
          recency_days,
          frequency,
          monetary_value,
          avg_order_value,
          CASE 
            WHEN recency_days <= 7 THEN 5
            WHEN recency_days <= 14 THEN 4
            WHEN recency_days <= 30 THEN 3
            WHEN recency_days <= 60 THEN 2
            ELSE 1
          END as recency_score,
          CASE 
            WHEN frequency >= 20 THEN 5
            WHEN frequency >= 10 THEN 4
            WHEN frequency >= 5 THEN 3
            WHEN frequency >= 2 THEN 2
            ELSE 1
          END as frequency_score,
          CASE 
            WHEN monetary_value >= 200 THEN 5
            WHEN monetary_value >= 100 THEN 4
            WHEN monetary_value >= 50 THEN 3
            WHEN monetary_value >= 20 THEN 2
            ELSE 1
          END as monetary_score
        FROM customer_rfm
      )
      SELECT 
        customer_id,
        recency_days,
        frequency,
        monetary_value,
        avg_order_value,
        recency_score,
        frequency_score,
        monetary_score,
        (recency_score + frequency_score + monetary_score) as total_score,
        CASE 
          WHEN (recency_score + frequency_score + monetary_score) >= 13 THEN 'Champions'
          WHEN (recency_score + frequency_score + monetary_score) >= 10 THEN 'Loyal Customers'
          WHEN (recency_score + frequency_score + monetary_score) >= 7 THEN 'Potential Loyalists'
          WHEN (recency_score + frequency_score + monetary_score) >= 5 THEN 'New Customers'
          ELSE 'At Risk'
        END as segment
      FROM rfm_scores
      ORDER BY total_score DESC
    `;
    
    const rfmResult = await query(rfmQuery, [start, end]);

    // Group customers by segment
    const segments = rfmResult.rows.reduce((acc, customer) => {
      const segment = customer.segment;
      if (!acc[segment]) {
        acc[segment] = {
          name: segment,
          customers: [],
          count: 0,
          totalValue: 0,
          averageValue: 0,
          averageFrequency: 0,
          averageRecency: 0
        };
      }
      
      acc[segment].customers.push({
        customerId: customer.customer_id,
        recencyDays: parseInt(customer.recency_days),
        frequency: parseInt(customer.frequency),
        monetaryValue: parseFloat(customer.monetary_value),
        averageOrderValue: parseFloat(customer.avg_order_value),
        totalScore: parseInt(customer.total_score)
      });
      
      acc[segment].count++;
      acc[segment].totalValue += parseFloat(customer.monetary_value);
      
      return acc;
    }, {} as any);

    // Calculate segment averages
    Object.keys(segments).forEach(segmentName => {
      const segment = segments[segmentName];
      segment.averageValue = segment.count > 0 ? segment.totalValue / segment.count : 0;
      segment.averageFrequency = segment.count > 0 
        ? segment.customers.reduce((sum: number, c: any) => sum + c.frequency, 0) / segment.count 
        : 0;
      segment.averageRecency = segment.count > 0 
        ? segment.customers.reduce((sum: number, c: any) => sum + c.recencyDays, 0) / segment.count 
        : 0;
      
      // Keep only top 5 customers per segment for response size
      segment.topCustomers = segment.customers
        .sort((a: any, b: any) => b.totalScore - a.totalScore)
        .slice(0, 5);
      delete segment.customers; // Remove full customer list to reduce response size
    });

    const totalCustomers = rfmResult.rows.length;

    res.json({
      segments: Object.values(segments).map((segment: any) => ({
        ...segment,
        percentage: totalCustomers > 0 ? Math.round((segment.count / totalCustomers) * 10000) / 100 : 0,
        averageValue: Math.round(segment.averageValue * 100) / 100,
        averageFrequency: Math.round(segment.averageFrequency * 100) / 100,
        averageRecency: Math.round(segment.averageRecency * 100) / 100
      })),
      summary: {
        totalCustomers,
        analysisDate: format(new Date(), 'yyyy-MM-dd'),
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

export { router as customerRouter };