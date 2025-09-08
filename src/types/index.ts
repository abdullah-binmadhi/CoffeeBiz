// Core data types based on the CSV structure
export interface RawTransaction {
  date: string;
  datetime: string;
  cash_type: 'cash' | 'card';
  card?: string;
  money: number;
  coffee_name: string;
}

export interface ProcessedTransaction {
  id: string;
  date: Date;
  datetime: Date;
  paymentMethod: 'cash' | 'card';
  customerId?: string;
  amount: number;
  productName: string;
  productCategory: ProductCategory;
}

export enum ProductCategory {
  ESPRESSO = 'espresso',
  LATTE = 'latte',
  AMERICANO = 'americano',
  HOT_CHOCOLATE = 'hot_chocolate',
  TEA = 'tea',
  SPECIALTY = 'specialty',
  OTHER = 'other'
}

export interface Product {
  name: string;
  category: ProductCategory;
  averagePrice: number;
  totalSales: number;
  totalRevenue: number;
}

export interface RevenueMetrics {
  totalRevenue: number;
  transactionCount: number;
  averageTransactionValue: number;
  dailyRevenue: DailyRevenue[];
  growthRate: number;
  paymentMethodBreakdown: PaymentMethodStats;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  transactions: number;
}

export interface PaymentMethodStats {
  cash: { count: number; revenue: number };
  card: { count: number; revenue: number };
}

export interface ProductPerformance {
  topProducts: Product[];
  categoryPerformance: CategoryStats[];
  totalProducts: number;
}

export interface CategoryStats {
  category: ProductCategory;
  revenue: number;
  count: number;
  averagePrice: number;
  percentage: number;
}

export interface HourlyStats {
  hour: number;
  revenue: number;
  transactions: number;
}

export interface TrafficAnalysis {
  hourlyStats: HourlyStats[];
  peakHours: number[];
  dailyPatterns: DailyPattern[];
}

export interface DailyPattern {
  dayOfWeek: string;
  revenue: number;
  transactions: number;
  averagePerHour: number;
}

export interface CustomerInsights {
  totalCustomers: number;
  returningCustomers: number;
  newCustomers: number;
  averageSpendPerCustomer: number;
  loyaltyStats: LoyaltyStats;
}

export interface LoyaltyStats {
  cashCustomers: number;
  cardCustomers: number;
  repeatCardUsers: number;
}