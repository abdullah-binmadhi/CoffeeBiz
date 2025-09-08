import Bull, { Queue, Job, JobOptions } from 'bull';
import { getCache } from './cache';
import { query } from './database';

// Job types
export enum JobType {
  REFRESH_ANALYTICS_CACHE = 'refresh_analytics_cache',
  CALCULATE_DAILY_SUMMARY = 'calculate_daily_summary',
  GENERATE_REPORT = 'generate_report',
  CLEANUP_OLD_DATA = 'cleanup_old_data',
  UPDATE_PRODUCT_PERFORMANCE = 'update_product_performance',
  CALCULATE_CUSTOMER_METRICS = 'calculate_customer_metrics'
}

// Job data interfaces
export interface RefreshCacheJobData {
  cacheKeys: string[];
  forceRefresh?: boolean;
}

export interface DailySummaryJobData {
  date: string;
  recalculate?: boolean;
}

export interface ReportJobData {
  reportType: 'revenue' | 'products' | 'traffic' | 'customers' | 'inventory';
  startDate: string;
  endDate: string;
  format: 'pdf' | 'excel' | 'csv';
  userId?: string;
}

export interface CleanupJobData {
  olderThanDays: number;
  dataTypes: string[];
}

// Job queue configuration
const queueConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_JOB_DB || '1'), // Use different DB for jobs
  },
  defaultJobOptions: {
    removeOnComplete: 10, // Keep last 10 completed jobs
    removeOnFail: 50,     // Keep last 50 failed jobs
    attempts: 3,          // Retry failed jobs 3 times
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  } as JobOptions,
};

export class JobService {
  private queues: Map<string, Queue> = new Map();
  private cache = getCache();

  constructor() {
    this.initializeQueues();
    this.setupJobProcessors();
  }

  private initializeQueues() {
    // Create different queues for different priorities
    const queueConfigs = [
      { name: 'high-priority', concurrency: 5 },
      { name: 'normal-priority', concurrency: 3 },
      { name: 'low-priority', concurrency: 1 },
    ];

    queueConfigs.forEach(config => {
      const queue = new Bull(config.name, queueConfig);
      
      // Queue event handlers
      queue.on('completed', (job: Job) => {
        console.log(`✅ Job ${job.id} completed: ${job.data.type}`);
      });

      queue.on('failed', (job: Job, err: Error) => {
        console.error(`❌ Job ${job.id} failed: ${job.data.type}`, err.message);
      });

      queue.on('stalled', (job: Job) => {
        console.warn(`⚠️ Job ${job.id} stalled: ${job.data.type}`);
      });

      this.queues.set(config.name, queue);
    });
  }

  private setupJobProcessors() {
    // High priority queue processors
    const highPriorityQueue = this.queues.get('high-priority')!;
    highPriorityQueue.process(JobType.REFRESH_ANALYTICS_CACHE, 5, this.processRefreshCache.bind(this));
    highPriorityQueue.process(JobType.CALCULATE_DAILY_SUMMARY, 3, this.processDailySummary.bind(this));

    // Normal priority queue processors
    const normalPriorityQueue = this.queues.get('normal-priority')!;
    normalPriorityQueue.process(JobType.UPDATE_PRODUCT_PERFORMANCE, 2, this.processProductPerformance.bind(this));
    normalPriorityQueue.process(JobType.CALCULATE_CUSTOMER_METRICS, 2, this.processCustomerMetrics.bind(this));

    // Low priority queue processors
    const lowPriorityQueue = this.queues.get('low-priority')!;
    lowPriorityQueue.process(JobType.GENERATE_REPORT, 1, this.processGenerateReport.bind(this));
    lowPriorityQueue.process(JobType.CLEANUP_OLD_DATA, 1, this.processCleanupData.bind(this));
  }

  // Add job to queue
  async addJob(
    jobType: JobType,
    data: any,
    options: {
      priority?: 'high' | 'normal' | 'low';
      delay?: number;
      repeat?: Bull.RepeatOptions;
    } = {}
  ): Promise<Job> {
    const queueName = `${options.priority || 'normal'}-priority`;
    const queue = this.queues.get(queueName)!;

    const jobOptions: JobOptions = {
      ...queueConfig.defaultJobOptions,
      delay: options.delay,
      repeat: options.repeat,
    };

    return await queue.add(jobType, { type: jobType, ...data }, jobOptions);
  }

  // Job processors
  private async processRefreshCache(job: Job<RefreshCacheJobData>): Promise<void> {
    const { cacheKeys, forceRefresh } = job.data;
    
    job.progress(0);
    
    for (let i = 0; i < cacheKeys.length; i++) {
      const key = cacheKeys[i];
      
      if (forceRefresh) {
        await this.cache.del(key);
      }
      
      // Here you would typically call the appropriate data fetching function
      // and cache the result. For now, we'll just log the operation.
      console.log(`Refreshing cache for key: ${key}`);
      
      job.progress(Math.round(((i + 1) / cacheKeys.length) * 100));
    }
  }

  private async processDailySummary(job: Job<DailySummaryJobData>): Promise<void> {
    const { date, recalculate } = job.data;
    
    job.progress(10);

    // Check if summary already exists
    const existingQuery = `
      SELECT COUNT(*) as count FROM daily_revenue_summary 
      WHERE summary_date = $1
    `;
    const existingResult = await query(existingQuery, [date]);
    
    if (existingResult.rows[0].count > 0 && !recalculate) {
      console.log(`Daily summary for ${date} already exists, skipping`);
      return;
    }

    job.progress(30);

    // Calculate daily metrics
    const metricsQuery = `
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
      WHERE transaction_date::date = $1
      GROUP BY transaction_date::date
    `;

    const metricsResult = await query(metricsQuery, [date]);
    
    if (metricsResult.rows.length === 0) {
      console.log(`No transactions found for ${date}`);
      return;
    }

    job.progress(70);

    const metrics = metricsResult.rows[0];

    // Upsert daily summary
    const upsertQuery = `
      INSERT INTO daily_revenue_summary (
        summary_date, total_revenue, transaction_count, 
        cash_revenue, card_revenue, cash_transactions, 
        card_transactions, unique_customers
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (summary_date) 
      DO UPDATE SET 
        total_revenue = EXCLUDED.total_revenue,
        transaction_count = EXCLUDED.transaction_count,
        cash_revenue = EXCLUDED.cash_revenue,
        card_revenue = EXCLUDED.card_revenue,
        cash_transactions = EXCLUDED.cash_transactions,
        card_transactions = EXCLUDED.card_transactions,
        unique_customers = EXCLUDED.unique_customers,
        updated_at = CURRENT_TIMESTAMP
    `;

    await query(upsertQuery, [
      metrics.summary_date,
      metrics.total_revenue,
      metrics.transaction_count,
      metrics.cash_revenue,
      metrics.card_revenue,
      metrics.cash_transactions,
      metrics.card_transactions,
      metrics.unique_customers
    ]);

    job.progress(100);
    console.log(`Daily summary calculated for ${date}`);
  }

  private async processProductPerformance(job: Job): Promise<void> {
    job.progress(10);

    // Calculate product performance summaries for yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    const performanceQuery = `
      INSERT INTO product_performance_summary (
        product_id, summary_date, total_sales, total_revenue
      )
      SELECT 
        product_id,
        $1::date as summary_date,
        SUM(quantity) as total_sales,
        SUM(amount) as total_revenue
      FROM transactions 
      WHERE transaction_date::date = $1
      GROUP BY product_id
      ON CONFLICT (product_id, summary_date)
      DO UPDATE SET 
        total_sales = EXCLUDED.total_sales,
        total_revenue = EXCLUDED.total_revenue,
        updated_at = CURRENT_TIMESTAMP
    `;

    await query(performanceQuery, [dateStr]);
    
    job.progress(100);
    console.log(`Product performance calculated for ${dateStr}`);
  }

  private async processCustomerMetrics(job: Job): Promise<void> {
    job.progress(10);

    // Update customer metrics
    const updateQuery = `
      UPDATE customers 
      SET 
        total_visits = subquery.visit_count,
        total_spent = subquery.total_amount,
        last_seen_at = subquery.last_transaction,
        updated_at = CURRENT_TIMESTAMP
      FROM (
        SELECT 
          customer_id,
          COUNT(*) as visit_count,
          SUM(amount) as total_amount,
          MAX(transaction_datetime) as last_transaction
        FROM transactions 
        WHERE customer_id IS NOT NULL
        GROUP BY customer_id
      ) as subquery
      WHERE customers.id = subquery.customer_id
    `;

    await query(updateQuery);
    
    job.progress(100);
    console.log('Customer metrics updated');
  }

  private async processGenerateReport(job: Job<ReportJobData>): Promise<void> {
    const { reportType, startDate, endDate, format } = job.data;
    
    job.progress(10);
    
    // This is a placeholder for report generation
    // In a real implementation, you would generate the actual report
    console.log(`Generating ${format} report for ${reportType} from ${startDate} to ${endDate}`);
    
    // Simulate report generation time
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    job.progress(100);
    console.log(`Report generated: ${reportType}.${format}`);
  }

  private async processCleanupData(job: Job<CleanupJobData>): Promise<void> {
    const { olderThanDays, dataTypes } = job.data;
    
    job.progress(10);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    for (const dataType of dataTypes) {
      switch (dataType) {
        case 'old_cache_entries':
          // Clean up old cache entries (this would be handled by Redis TTL)
          console.log('Cleaning up old cache entries');
          break;
        case 'completed_jobs':
          // Clean up old completed jobs
          for (const queue of this.queues.values()) {
            await queue.clean(olderThanDays * 24 * 60 * 60 * 1000, 'completed');
          }
          break;
        default:
          console.log(`Unknown data type for cleanup: ${dataType}`);
      }
    }
    
    job.progress(100);
    console.log(`Cleanup completed for data older than ${olderThanDays} days`);
  }

  // Schedule recurring jobs
  async scheduleRecurringJobs(): Promise<void> {
    // Daily summary calculation - run every day at 1 AM
    await this.addJob(
      JobType.CALCULATE_DAILY_SUMMARY,
      { date: new Date().toISOString().split('T')[0] },
      {
        priority: 'high',
        repeat: { cron: '0 1 * * *' } // Daily at 1 AM
      }
    );

    // Product performance update - run every day at 2 AM
    await this.addJob(
      JobType.UPDATE_PRODUCT_PERFORMANCE,
      {},
      {
        priority: 'normal',
        repeat: { cron: '0 2 * * *' } // Daily at 2 AM
      }
    );

    // Customer metrics update - run every day at 3 AM
    await this.addJob(
      JobType.CALCULATE_CUSTOMER_METRICS,
      {},
      {
        priority: 'normal',
        repeat: { cron: '0 3 * * *' } // Daily at 3 AM
      }
    );

    // Cache refresh - run every hour
    await this.addJob(
      JobType.REFRESH_ANALYTICS_CACHE,
      { cacheKeys: ['revenue:*', 'products:*'], forceRefresh: false },
      {
        priority: 'high',
        repeat: { cron: '0 * * * *' } // Every hour
      }
    );

    // Weekly cleanup - run every Sunday at 4 AM
    await this.addJob(
      JobType.CLEANUP_OLD_DATA,
      { olderThanDays: 30, dataTypes: ['completed_jobs', 'old_cache_entries'] },
      {
        priority: 'low',
        repeat: { cron: '0 4 * * 0' } // Weekly on Sunday at 4 AM
      }
    );

    console.log('✅ Recurring jobs scheduled');
  }

  // Get queue statistics
  async getQueueStats(): Promise<any> {
    const stats: any = {};
    
    for (const [name, queue] of this.queues) {
      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const completed = await queue.getCompleted();
      const failed = await queue.getFailed();
      
      stats[name] = {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length
      };
    }
    
    return stats;
  }

  // Clean up all queues
  async cleanup(): Promise<void> {
    for (const queue of this.queues.values()) {
      await queue.close();
    }
  }
}

// Singleton instance
let jobServiceInstance: JobService | null = null;

export function getJobService(): JobService {
  if (!jobServiceInstance) {
    jobServiceInstance = new JobService();
  }
  return jobServiceInstance;
}

export async function closeJobService(): Promise<void> {
  if (jobServiceInstance) {
    await jobServiceInstance.cleanup();
    jobServiceInstance = null;
  }
}