import Papa from 'papaparse';
import { 
  RawTransaction, 
  ProcessedTransaction, 
  ProductCategory,
  RevenueMetrics,
  ProductPerformance,
  Product,
  CategoryStats,
  TrafficAnalysis,
  HourlyStats,
  DailyPattern,
  CustomerInsights,
  DailyRevenue,
  PaymentMethodStats
} from '../types';

export class DataProcessor {
  private transactions: ProcessedTransaction[] = [];

  async loadCSVData(csvContent: string): Promise<ProcessedTransaction[]> {
    return new Promise((resolve, reject) => {
      Papa.parse<RawTransaction>(csvContent, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const processed = results.data.map(this.processTransaction);
            this.transactions = processed;
            resolve(processed);
          } catch (error) {
            reject(error);
          }
        },
        error: (error: any) => reject(error)
      });
    });
  }

  private processTransaction = (raw: RawTransaction): ProcessedTransaction => {
    return {
      id: `${raw.datetime}-${raw.coffee_name}`,
      date: new Date(raw.date),
      datetime: new Date(raw.datetime),
      paymentMethod: raw.cash_type,
      customerId: raw.card || undefined,
      amount: Number(raw.money),
      productName: raw.coffee_name,
      productCategory: this.categorizeProduct(raw.coffee_name)
    };
  };

  private categorizeProduct(productName: string): ProductCategory {
    const name = productName.toLowerCase();
    
    if (name.includes('espresso')) return ProductCategory.ESPRESSO;
    if (name.includes('latte')) return ProductCategory.LATTE;
    if (name.includes('americano')) return ProductCategory.AMERICANO;
    if (name.includes('hot chocolate') || name.includes('chocolate') || name.includes('cocoa')) 
      return ProductCategory.HOT_CHOCOLATE;
    if (name.includes('tea')) return ProductCategory.TEA;
    if (name.includes('whiskey') || name.includes('irish')) return ProductCategory.SPECIALTY;
    
    return ProductCategory.OTHER;
  }

  calculateRevenueMetrics(dateRange?: { start: Date; end: Date }): RevenueMetrics {
    const filteredTransactions = this.filterByDateRange(dateRange);
    
    const totalRevenue = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    const transactionCount = filteredTransactions.length;
    const averageTransactionValue = totalRevenue / transactionCount || 0;

    // Group by date for daily revenue
    const dailyRevenueMap = new Map<string, { revenue: number; transactions: number }>();
    
    filteredTransactions.forEach(transaction => {
      const dateKey = transaction.date.toISOString().split('T')[0];
      const existing = dailyRevenueMap.get(dateKey) || { revenue: 0, transactions: 0 };
      dailyRevenueMap.set(dateKey, {
        revenue: existing.revenue + transaction.amount,
        transactions: existing.transactions + 1
      });
    });

    const dailyRevenue: DailyRevenue[] = Array.from(dailyRevenueMap.entries())
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        transactions: data.transactions
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate growth rate (comparing first and last day)
    const growthRate = dailyRevenue.length > 1 
      ? ((dailyRevenue[dailyRevenue.length - 1].revenue - dailyRevenue[0].revenue) / dailyRevenue[0].revenue) * 100
      : 0;

    // Payment method breakdown
    const paymentMethodBreakdown: PaymentMethodStats = {
      cash: { count: 0, revenue: 0 },
      card: { count: 0, revenue: 0 }
    };

    filteredTransactions.forEach(transaction => {
      paymentMethodBreakdown[transaction.paymentMethod].count++;
      paymentMethodBreakdown[transaction.paymentMethod].revenue += transaction.amount;
    });

    return {
      totalRevenue,
      transactionCount,
      averageTransactionValue,
      dailyRevenue,
      growthRate,
      paymentMethodBreakdown
    };
  }

  calculateProductPerformance(): ProductPerformance {
    const productMap = new Map<string, Product>();
    const categoryMap = new Map<ProductCategory, CategoryStats>();

    // Process each transaction
    this.transactions.forEach(transaction => {
      // Update product stats
      const existing = productMap.get(transaction.productName) || {
        id: `product-${transaction.productName.toLowerCase().replace(/\s+/g, '-')}`,
        name: transaction.productName,
        category: transaction.productCategory,
        basePrice: transaction.amount,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        averagePrice: 0,
        totalSales: 0,
        totalRevenue: 0
      };

      existing.totalSales = (existing.totalSales || 0) + 1;
      existing.totalRevenue = (existing.totalRevenue || 0) + transaction.amount;
      existing.averagePrice = existing.totalRevenue / existing.totalSales;
      productMap.set(transaction.productName, existing);

      // Update category stats
      const categoryStats = categoryMap.get(transaction.productCategory) || {
        category: transaction.productCategory,
        revenue: 0,
        count: 0,
        averagePrice: 0,
        percentage: 0
      };

      categoryStats.count++;
      categoryStats.revenue += transaction.amount;
      categoryStats.averagePrice = categoryStats.revenue / categoryStats.count;
      categoryMap.set(transaction.productCategory, categoryStats);
    });

    // Calculate percentages for categories
    const totalRevenue = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.revenue, 0);
    categoryMap.forEach(category => {
      category.percentage = (category.revenue / totalRevenue) * 100;
    });

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0));

    const categoryPerformance = Array.from(categoryMap.values())
      .sort((a, b) => b.revenue - a.revenue);

    return {
      topProducts,
      categoryPerformance,
      totalProducts: productMap.size
    };
  }

  calculateTrafficAnalysis(): TrafficAnalysis {
    const hourlyMap = new Map<number, { revenue: number; transactions: number }>();
    const dailyMap = new Map<string, { revenue: number; transactions: number }>();

    this.transactions.forEach(transaction => {
      const hour = transaction.datetime.getHours();
      const dayOfWeek = transaction.datetime.toLocaleDateString('en-US', { weekday: 'long' });

      // Hourly stats
      const hourlyStats = hourlyMap.get(hour) || { revenue: 0, transactions: 0 };
      hourlyStats.revenue += transaction.amount;
      hourlyStats.transactions++;
      hourlyMap.set(hour, hourlyStats);

      // Daily stats
      const dailyStats = dailyMap.get(dayOfWeek) || { revenue: 0, transactions: 0 };
      dailyStats.revenue += transaction.amount;
      dailyStats.transactions++;
      dailyMap.set(dayOfWeek, dailyStats);
    });

    const hourlyStats: HourlyStats[] = Array.from(hourlyMap.entries())
      .map(([hour, stats]) => ({
        hour,
        revenue: stats.revenue,
        transactions: stats.transactions
      }))
      .sort((a, b) => a.hour - b.hour);

    // Find peak hours (top 3 hours by transaction count)
    const peakHours = hourlyStats
      .sort((a, b) => b.transactions - a.transactions)
      .slice(0, 3)
      .map(stat => stat.hour)
      .sort((a, b) => a - b);

    const dailyPatterns: DailyPattern[] = Array.from(dailyMap.entries())
      .map(([dayOfWeek, stats]) => ({
        dayOfWeek,
        revenue: stats.revenue,
        transactions: stats.transactions,
        averagePerHour: stats.revenue / 24 // Simplified calculation
      }));

    return {
      hourlyStats: hourlyStats.sort((a, b) => a.hour - b.hour),
      peakHours,
      dailyPatterns
    };
  }

  calculateCustomerInsights(): CustomerInsights {
    const customerMap = new Map<string, number>();
    let cashTransactions = 0;
    let cardTransactions = 0;

    this.transactions.forEach(transaction => {
      if (transaction.paymentMethod === 'cash') {
        cashTransactions++;
      } else {
        cardTransactions++;
        if (transaction.customerId) {
          const existing = customerMap.get(transaction.customerId) || 0;
          customerMap.set(transaction.customerId, existing + 1);
        }
      }
    });

    const totalCustomers = customerMap.size + cashTransactions; // Assume each cash transaction is unique customer
    const returningCustomers = Array.from(customerMap.values()).filter(count => count > 1).length;
    const newCustomers = totalCustomers - returningCustomers;
    
    const totalRevenue = this.transactions.reduce((sum, t) => sum + t.amount, 0);
    const averageSpendPerCustomer = totalRevenue / totalCustomers;

    const repeatCardUsers = Array.from(customerMap.values()).filter(count => count > 1).length;

    return {
      totalCustomers,
      returningCustomers,
      newCustomers,
      averageSpendPerCustomer,
      loyaltyStats: {
        cashCustomers: cashTransactions,
        cardCustomers: customerMap.size,
        repeatCardUsers
      }
    };
  }

  private filterByDateRange(dateRange?: { start: Date; end: Date }): ProcessedTransaction[] {
    if (!dateRange) return this.transactions;
    
    return this.transactions.filter(transaction => 
      transaction.date >= dateRange.start && transaction.date <= dateRange.end
    );
  }

  getTransactions(): ProcessedTransaction[] {
    return this.transactions;
  }
}