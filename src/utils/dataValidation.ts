// Data validation utilities for CoffeeBiz Analytics

export interface RevenueData {
  totalRevenue: number;
  transactionCount: number;
  averageTransactionValue: number;
  uniqueCustomers: number;
  dailyRevenue: Array<{
    date: string;
    revenue: number;
    transactions: number;
    uniqueCustomers?: number;
  }>;
  growthRate?: number;
  paymentMethodBreakdown?: Record<string, any>;
}

export interface ProductData {
  topProducts: Array<{
    id: string;
    name: string;
    category?: string;
    revenue: number;
    totalQuantity: number;
    transactionCount?: number;
    averagePrice?: number;
  }>;
  categoryPerformance: Array<{
    category: string;
    revenue: number;
    totalQuantity: number;
    transactionCount?: number;
    productCount?: number;
    percentage?: number;
  }>;
  bottomProducts?: Array<any>;
  summary?: any;
}

export interface TrafficData {
  hourlyStats: Array<{
    hour: number;
    transactionCount: number;
    revenue: number;
    uniqueCustomers: number;
    averageTransactionValue?: number;
  }>;
  peakHours: number[];
  summary: {
    totalTransactions: number;
    totalRevenue: number;
    busiestHour: number;
    period?: {
      start: string;
      end: string;
    };
  };
}

// Validation functions
export function validateRevenueData(data: any): data is RevenueData {
  if (!data || typeof data !== 'object') return false;

  // Check required numeric fields
  const requiredNumbers = ['totalRevenue', 'transactionCount', 'averageTransactionValue', 'uniqueCustomers'];
  for (const field of requiredNumbers) {
    if (typeof data[field] !== 'number' || data[field] < 0) {
      return false;
    }
  }

  // Validate daily revenue array
  if (!Array.isArray(data.dailyRevenue)) return false;
  
  for (const day of data.dailyRevenue) {
    if (!day.date || !isValidDate(day.date)) return false;
    if (typeof day.revenue !== 'number' || day.revenue < 0) return false;
    if (typeof day.transactions !== 'number' || day.transactions < 0) return false;
  }

  // Validate calculation consistency
  const calculatedAvg = data.totalRevenue / data.transactionCount;
  if (Math.abs(data.averageTransactionValue - calculatedAvg) > 0.01) {
    return false;
  }

  return true;
}

export function validateProductData(data: any): data is ProductData {
  if (!data || typeof data !== 'object') return false;

  // Validate top products array
  if (!Array.isArray(data.topProducts)) return false;
  
  const productIds = new Set<string>();
  for (const product of data.topProducts) {
    if (!product.id || typeof product.id !== 'string') return false;
    if (productIds.has(product.id)) return false; // Check for duplicates
    productIds.add(product.id);
    
    if (!product.name || typeof product.name !== 'string' || product.name.trim() === '') return false;
    if (typeof product.revenue !== 'number' || product.revenue < 0) return false;
    if (typeof product.totalQuantity !== 'number' || product.totalQuantity < 0) return false;
  }

  // Validate category performance array
  if (!Array.isArray(data.categoryPerformance)) return false;
  
  for (const category of data.categoryPerformance) {
    if (!category.category || typeof category.category !== 'string') return false;
    if (typeof category.revenue !== 'number' || category.revenue < 0) return false;
    if (typeof category.totalQuantity !== 'number' || category.totalQuantity < 0) return false;
  }

  return true;
}

export function validateTrafficData(data: any): data is TrafficData {
  if (!data || typeof data !== 'object') return false;

  // Validate hourly stats array
  if (!Array.isArray(data.hourlyStats)) return false;
  if (data.hourlyStats.length !== 24) return false; // Should have 24 hours
  
  for (const hourStat of data.hourlyStats) {
    if (typeof hourStat.hour !== 'number' || hourStat.hour < 0 || hourStat.hour > 23) return false;
    if (typeof hourStat.transactionCount !== 'number' || hourStat.transactionCount < 0) return false;
    if (typeof hourStat.revenue !== 'number' || hourStat.revenue < 0) return false;
    if (typeof hourStat.uniqueCustomers !== 'number' || hourStat.uniqueCustomers < 0) return false;
  }

  // Validate peak hours array
  if (!Array.isArray(data.peakHours)) return false;
  for (const hour of data.peakHours) {
    if (typeof hour !== 'number' || hour < 0 || hour > 23) return false;
  }

  // Validate summary object
  if (!data.summary || typeof data.summary !== 'object') return false;
  if (typeof data.summary.totalTransactions !== 'number' || data.summary.totalTransactions < 0) return false;
  if (typeof data.summary.totalRevenue !== 'number' || data.summary.totalRevenue < 0) return false;
  if (typeof data.summary.busiestHour !== 'number' || data.summary.busiestHour < 0 || data.summary.busiestHour > 23) return false;

  return true;
}

export function validateDateRange(startDate: string, endDate: string, maxDays: number = 365): boolean {
  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) return false;

  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  // Check if dates are valid
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;

  // Check if start date is before or equal to end date
  if (start > end) return false;

  // Check if dates are not in the future
  if (start > now || end > now) return false;

  // Check if date range is within maximum allowed days
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff > maxDays) return false;

  return true;
}

export function isValidDate(dateString: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;

  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

// Data sanitization functions
export function sanitizeString(input: any): string {
  if (input === null || input === undefined) return '';
  
  return String(input)
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>'"&]/g, '') // Remove potentially dangerous characters
    .trim();
}

export function sanitizeNumber(input: any, defaultValue: number = 0): number {
  if (input === null || input === undefined) return defaultValue;
  
  const num = Number(input);
  return isNaN(num) ? defaultValue : num;
}

export function validateNumericRange(value: number, min: number, max: number): boolean {
  return typeof value === 'number' && !isNaN(value) && value >= min && value <= max;
}

// Data consistency validation
export function validateDataConsistency(revenueData: RevenueData, productData?: ProductData, trafficData?: TrafficData): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate revenue calculation consistency
  const calculatedAvg = revenueData.totalRevenue / revenueData.transactionCount;
  if (Math.abs(revenueData.averageTransactionValue - calculatedAvg) > 0.01) {
    errors.push('Average transaction value does not match calculated value');
  }

  // Validate daily revenue totals
  const dailyRevenueTotal = revenueData.dailyRevenue.reduce((sum, day) => sum + day.revenue, 0);
  const dailyTransactionTotal = revenueData.dailyRevenue.reduce((sum, day) => sum + day.transactions, 0);
  
  if (Math.abs(dailyRevenueTotal - revenueData.totalRevenue) > 0.01) {
    errors.push('Daily revenue total does not match total revenue');
  }
  
  if (dailyTransactionTotal !== revenueData.transactionCount) {
    errors.push('Daily transaction total does not match total transaction count');
  }

  // Validate product data consistency if provided
  if (productData) {
    // Check for duplicate product IDs
    const productIds = productData.topProducts.map(p => p.id);
    const uniqueIds = new Set(productIds);
    if (productIds.length !== uniqueIds.size) {
      errors.push('Duplicate product IDs found');
    }

    // Validate category totals
    const categoryTotals = productData.topProducts.reduce((acc, product) => {
      if (product.category) {
        acc[product.category] = (acc[product.category] || 0) + product.revenue;
      }
      return acc;
    }, {} as Record<string, number>);

    productData.categoryPerformance.forEach(category => {
      const calculatedTotal = categoryTotals[category.category] || 0;
      if (Math.abs(calculatedTotal - category.revenue) > 0.01) {
        errors.push(`Category ${category.category} revenue mismatch`);
      }
    });
  }

  // Validate traffic data consistency if provided
  if (trafficData) {
    // Validate peak hours exist in hourly stats
    const hourlyHours = new Set(trafficData.hourlyStats.map(stat => stat.hour));
    trafficData.peakHours.forEach(peakHour => {
      if (!hourlyHours.has(peakHour)) {
        errors.push(`Peak hour ${peakHour} not found in hourly stats`);
      }
    });

    // Validate summary totals
    const calculatedTransactions = trafficData.hourlyStats.reduce((sum, stat) => sum + stat.transactionCount, 0);
    const calculatedRevenue = trafficData.hourlyStats.reduce((sum, stat) => sum + stat.revenue, 0);
    
    if (calculatedTransactions !== trafficData.summary.totalTransactions) {
      errors.push('Traffic summary transaction count mismatch');
    }
    
    if (Math.abs(calculatedRevenue - trafficData.summary.totalRevenue) > 0.01) {
      errors.push('Traffic summary revenue mismatch');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Input validation for forms
export function validateFormInput(field: string, value: any, rules: ValidationRule[]): {
  isValid: boolean;
  error?: string;
} {
  for (const rule of rules) {
    const result = rule.validate(value);
    if (!result.isValid) {
      return { isValid: false, error: result.error };
    }
  }
  
  return { isValid: true };
}

export interface ValidationRule {
  validate: (value: any) => { isValid: boolean; error?: string };
}

export const ValidationRules = {
  required: (): ValidationRule => ({
    validate: (value: any) => ({
      isValid: value !== null && value !== undefined && value !== '',
      error: 'This field is required'
    })
  }),
  
  minLength: (min: number): ValidationRule => ({
    validate: (value: any) => ({
      isValid: typeof value === 'string' && value.length >= min,
      error: `Minimum length is ${min} characters`
    })
  }),
  
  maxLength: (max: number): ValidationRule => ({
    validate: (value: any) => ({
      isValid: typeof value === 'string' && value.length <= max,
      error: `Maximum length is ${max} characters`
    })
  }),
  
  isNumber: (): ValidationRule => ({
    validate: (value: any) => ({
      isValid: typeof value === 'number' && !isNaN(value),
      error: 'Must be a valid number'
    })
  }),
  
  min: (minimum: number): ValidationRule => ({
    validate: (value: any) => ({
      isValid: typeof value === 'number' && value >= minimum,
      error: `Minimum value is ${minimum}`
    })
  }),
  
  max: (maximum: number): ValidationRule => ({
    validate: (value: any) => ({
      isValid: typeof value === 'number' && value <= maximum,
      error: `Maximum value is ${maximum}`
    })
  }),
  
  isDate: (): ValidationRule => ({
    validate: (value: any) => ({
      isValid: isValidDate(value),
      error: 'Must be a valid date (YYYY-MM-DD)'
    })
  }),
  
  email: (): ValidationRule => ({
    validate: (value: any) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return {
        isValid: typeof value === 'string' && emailRegex.test(value),
        error: 'Must be a valid email address'
      };
    }
  })
};