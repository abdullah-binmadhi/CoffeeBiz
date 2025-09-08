// Database entity types
export interface Customer {
  id: string;
  cardNumber?: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  totalVisits: number;
  totalSpent: number;
  preferredPaymentMethod?: PaymentMethod;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  basePrice?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Computed fields for analytics
  averagePrice?: number;
  totalSales?: number;
  totalRevenue?: number;
}

export interface Transaction {
  id: string;
  transactionDate: Date;
  transactionDatetime: Date;
  customerId?: string;
  productId: string;
  paymentMethod: PaymentMethod;
  cardNumber?: string;
  amount: number;
  quantity: number;
  unitPrice: number;
  createdAt: Date;
  // Relations
  customer?: Customer;
  product?: Product;
}

export interface DailyRevenueSummary {
  summaryDate: Date;
  totalRevenue: number;
  transactionCount: number;
  cashRevenue: number;
  cardRevenue: number;
  cashTransactions: number;
  cardTransactions: number;
  averageTransactionValue: number;
  uniqueCustomers: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductPerformanceSummary {
  productId: string;
  summaryDate: Date;
  totalSales: number;
  totalRevenue: number;
  averagePrice: number;
  createdAt: Date;
  updatedAt: Date;
  product?: Product;
}

export interface HourlyTrafficSummary {
  summaryDate: Date;
  hourOfDay: number;
  transactionCount: number;
  totalRevenue: number;
  uniqueCustomers: number;
  createdAt: Date;
  updatedAt: Date;
}

// Enums
export type PaymentMethod = 'cash' | 'card';

export enum ProductCategory {
  ESPRESSO = 'espresso',
  LATTE = 'latte',
  AMERICANO = 'americano',
  HOT_CHOCOLATE = 'hot_chocolate',
  TEA = 'tea',
  SPECIALTY = 'specialty',
  OTHER = 'other'
}

// Legacy types for CSV processing (keeping for backward compatibility)
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
  paymentMethod: PaymentMethod;
  customerId?: string;
  amount: number;
  productName: string;
  productCategory: ProductCategory;
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