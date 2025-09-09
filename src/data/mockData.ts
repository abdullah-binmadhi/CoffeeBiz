import { RevenueMetrics, ProductPerformance, TrafficAnalysis, CustomerInsights } from '../types';

// Mock revenue data
export const mockRevenueMetrics: RevenueMetrics = {
  totalRevenue: 125430.50,
  transactionCount: 3847,
  averageTransactionValue: 32.60,
  dailyRevenue: [
    { date: '2025-09-01', revenue: 4250.30, transactions: 132 },
    { date: '2025-09-02', revenue: 3890.75, transactions: 118 },
    { date: '2025-09-03', revenue: 4580.20, transactions: 145 },
    { date: '2025-09-04', revenue: 5120.85, transactions: 158 },
    { date: '2025-09-05', revenue: 4750.40, transactions: 142 },
    { date: '2025-09-06', revenue: 5890.60, transactions: 178 },
    { date: '2025-09-07', revenue: 6240.90, transactions: 195 },
    { date: '2025-09-08', revenue: 4320.75, transactions: 128 },
    { date: '2025-09-09', revenue: 3950.25, transactions: 115 }
  ],
  growthRate: 18.5,
  paymentMethodBreakdown: {
    card: { count: 2890, revenue: 94580.30 },
    cash: { count: 957, revenue: 30850.20 }
  }
};

// Mock product performance data
export const mockProductPerformance: ProductPerformance = {
  topProducts: [
    {
      id: '1',
      name: 'Cappuccino Large',
      category: 'latte',
      totalSales: 485,
      totalRevenue: 21825.00,
      averagePrice: 4.50,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2', 
      name: 'Americano Medium',
      category: 'americano',
      totalSales: 392,
      totalRevenue: 15680.00,
      averagePrice: 4.00,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '3',
      name: 'Latte Large',
      category: 'latte',
      totalSales: 358,
      totalRevenue: 17900.00,
      averagePrice: 5.00,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '4',
      name: 'Espresso Double',
      category: 'espresso',
      totalSales: 275,
      totalRevenue: 8250.00,
      averagePrice: 3.00,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '5',
      name: 'Hot Chocolate',
      category: 'hot_chocolate',
      totalSales: 198,
      totalRevenue: 8910.00,
      averagePrice: 4.50,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  categoryPerformance: [
    {
      category: 'latte',
      revenue: 39725.00,
      count: 843,
      averagePrice: 4.71,
      percentage: 31.7
    },
    {
      category: 'americano',
      revenue: 28340.00,
      count: 672,
      averagePrice: 4.22,
      percentage: 22.6
    },
    {
      category: 'espresso',
      revenue: 18750.00,
      count: 485,
      averagePrice: 3.87,
      percentage: 14.9
    },
    {
      category: 'hot_chocolate',
      revenue: 15890.00,
      count: 342,
      averagePrice: 4.65,
      percentage: 12.7
    },
    {
      category: 'tea',
      revenue: 12480.00,
      count: 398,
      averagePrice: 3.14,
      percentage: 9.9
    },
    {
      category: 'specialty',
      revenue: 10245.50,
      count: 107,
      averagePrice: 9.58,
      percentage: 8.2
    }
  ],
  totalProducts: 6
};

// Mock traffic analysis data
export const mockTrafficAnalysis: TrafficAnalysis = {
  hourlyStats: [
    { hour: 6, revenue: 890.50, transactions: 28 },
    { hour: 7, revenue: 2340.75, transactions: 72 },
    { hour: 8, revenue: 4580.20, transactions: 145 },
    { hour: 9, revenue: 3920.85, transactions: 118 },
    { hour: 10, revenue: 4750.40, transactions: 142 },
    { hour: 11, revenue: 3890.60, transactions: 115 },
    { hour: 12, revenue: 5240.90, transactions: 168 },
    { hour: 13, revenue: 4320.75, transactions: 128 },
    { hour: 14, revenue: 3650.25, transactions: 105 },
    { hour: 15, revenue: 4180.30, transactions: 125 },
    { hour: 16, revenue: 3540.85, transactions: 98 },
    { hour: 17, revenue: 2890.40, transactions: 85 },
    { hour: 18, revenue: 1950.75, transactions: 58 },
    { hour: 19, revenue: 1240.50, transactions: 35 }
  ],
  peakHours: [8, 12, 15],
  dailyPatterns: [
    {
      dayOfWeek: 'Monday',
      revenue: 4250.30,
      transactions: 132,
      averagePerHour: 16.5
    },
    {
      dayOfWeek: 'Tuesday', 
      revenue: 3890.75,
      transactions: 118,
      averagePerHour: 14.8
    },
    {
      dayOfWeek: 'Wednesday',
      revenue: 4580.20,
      transactions: 145,
      averagePerHour: 18.1
    },
    {
      dayOfWeek: 'Thursday',
      revenue: 5120.85,
      transactions: 158,
      averagePerHour: 19.8
    },
    {
      dayOfWeek: 'Friday',
      revenue: 5890.60,
      transactions: 178,
      averagePerHour: 22.3
    },
    {
      dayOfWeek: 'Saturday',
      revenue: 6240.90,
      transactions: 195,
      averagePerHour: 24.4
    },
    {
      dayOfWeek: 'Sunday',
      revenue: 4320.75,
      transactions: 128,
      averagePerHour: 16.0
    }
  ]
};

// Mock customer insights data
export const mockCustomerInsights: CustomerInsights = {
  totalCustomers: 2847,
  returningCustomers: 1958,
  newCustomers: 889,
  averageSpendPerCustomer: 44.08,
  loyaltyStats: {
    cashCustomers: 892,
    cardCustomers: 1955,
    repeatCardUsers: 1456
  }
};