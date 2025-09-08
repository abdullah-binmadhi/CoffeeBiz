import { Customer, Product, Transaction, PaymentMethod, ProductCategory } from '../types';

// Validation error types
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Customer validation
export class CustomerValidator {
  static validate(customer: Partial<Customer>): ValidationResult {
    const errors: ValidationError[] = [];

    // Required fields
    if (!customer.firstSeenAt) {
      errors.push({ field: 'firstSeenAt', message: 'First seen date is required' });
    }

    if (!customer.lastSeenAt) {
      errors.push({ field: 'lastSeenAt', message: 'Last seen date is required' });
    }

    // Date validation
    if (customer.firstSeenAt && customer.lastSeenAt) {
      if (customer.firstSeenAt > customer.lastSeenAt) {
        errors.push({ 
          field: 'lastSeenAt', 
          message: 'Last seen date cannot be before first seen date' 
        });
      }
    }

    // Total visits validation
    if (customer.totalVisits !== undefined && customer.totalVisits < 1) {
      errors.push({ 
        field: 'totalVisits', 
        message: 'Total visits must be at least 1',
        value: customer.totalVisits 
      });
    }

    // Total spent validation
    if (customer.totalSpent !== undefined && customer.totalSpent < 0) {
      errors.push({ 
        field: 'totalSpent', 
        message: 'Total spent cannot be negative',
        value: customer.totalSpent 
      });
    }

    // Card number validation for card customers
    if (customer.preferredPaymentMethod === 'card' && !customer.cardNumber) {
      errors.push({ 
        field: 'cardNumber', 
        message: 'Card number is required for card customers' 
      });
    }

    // Card number format validation
    if (customer.cardNumber) {
      const cardNumberRegex = /^[0-9]{4,19}$/;
      if (!cardNumberRegex.test(customer.cardNumber.replace(/\s/g, ''))) {
        errors.push({ 
          field: 'cardNumber', 
          message: 'Invalid card number format',
          value: customer.cardNumber 
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateForCreation(customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): ValidationResult {
    const errors: ValidationError[] = [];

    // All required fields for creation
    if (!customer.firstSeenAt) {
      errors.push({ field: 'firstSeenAt', message: 'First seen date is required' });
    }

    if (!customer.lastSeenAt) {
      errors.push({ field: 'lastSeenAt', message: 'Last seen date is required' });
    }

    if (customer.totalVisits === undefined) {
      errors.push({ field: 'totalVisits', message: 'Total visits is required' });
    }

    if (customer.totalSpent === undefined) {
      errors.push({ field: 'totalSpent', message: 'Total spent is required' });
    }

    // Run standard validation
    const standardValidation = this.validate(customer);
    errors.push(...standardValidation.errors);

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Product validation
export class ProductValidator {
  static validate(product: Partial<Product>): ValidationResult {
    const errors: ValidationError[] = [];

    // Name validation
    if (!product.name || product.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Product name is required' });
    } else if (product.name.length > 255) {
      errors.push({ 
        field: 'name', 
        message: 'Product name cannot exceed 255 characters',
        value: product.name 
      });
    }

    // Category validation
    if (!product.category) {
      errors.push({ field: 'category', message: 'Product category is required' });
    } else if (!Object.values(ProductCategory).includes(product.category)) {
      errors.push({ 
        field: 'category', 
        message: 'Invalid product category',
        value: product.category 
      });
    }

    // Base price validation
    if (product.basePrice !== undefined && product.basePrice < 0) {
      errors.push({ 
        field: 'basePrice', 
        message: 'Base price cannot be negative',
        value: product.basePrice 
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateForCreation(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'averagePrice' | 'totalSales' | 'totalRevenue'>): ValidationResult {
    const errors: ValidationError[] = [];

    // Required fields for creation
    if (!product.name) {
      errors.push({ field: 'name', message: 'Product name is required' });
    }

    if (!product.category) {
      errors.push({ field: 'category', message: 'Product category is required' });
    }

    if (product.isActive === undefined) {
      errors.push({ field: 'isActive', message: 'Active status is required' });
    }

    // Run standard validation
    const standardValidation = this.validate(product);
    errors.push(...standardValidation.errors);

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Transaction validation
export class TransactionValidator {
  static validate(transaction: Partial<Transaction>): ValidationResult {
    const errors: ValidationError[] = [];

    // Date validation
    if (!transaction.transactionDate) {
      errors.push({ field: 'transactionDate', message: 'Transaction date is required' });
    }

    if (!transaction.transactionDatetime) {
      errors.push({ field: 'transactionDatetime', message: 'Transaction datetime is required' });
    }

    // Date consistency validation
    if (transaction.transactionDate && transaction.transactionDatetime) {
      const dateOnly = new Date(transaction.transactionDate);
      const datetimeDate = new Date(transaction.transactionDatetime);
      
      if (dateOnly.toDateString() !== datetimeDate.toDateString()) {
        errors.push({ 
          field: 'transactionDate', 
          message: 'Transaction date must match the date part of transaction datetime' 
        });
      }
    }

    // Product validation
    if (!transaction.productId) {
      errors.push({ field: 'productId', message: 'Product ID is required' });
    }

    // Payment method validation
    if (!transaction.paymentMethod) {
      errors.push({ field: 'paymentMethod', message: 'Payment method is required' });
    } else if (!['cash', 'card'].includes(transaction.paymentMethod)) {
      errors.push({ 
        field: 'paymentMethod', 
        message: 'Payment method must be either "cash" or "card"',
        value: transaction.paymentMethod 
      });
    }

    // Card number validation for card payments
    if (transaction.paymentMethod === 'card' && !transaction.cardNumber) {
      errors.push({ 
        field: 'cardNumber', 
        message: 'Card number is required for card payments' 
      });
    }

    if (transaction.paymentMethod === 'cash' && transaction.cardNumber) {
      errors.push({ 
        field: 'cardNumber', 
        message: 'Card number should not be provided for cash payments' 
      });
    }

    // Amount validation
    if (!transaction.amount || transaction.amount <= 0) {
      errors.push({ 
        field: 'amount', 
        message: 'Amount must be greater than 0',
        value: transaction.amount 
      });
    }

    // Quantity validation
    if (!transaction.quantity || transaction.quantity <= 0) {
      errors.push({ 
        field: 'quantity', 
        message: 'Quantity must be greater than 0',
        value: transaction.quantity 
      });
    }

    // Unit price consistency (if provided)
    if (transaction.amount && transaction.quantity && transaction.unitPrice) {
      const expectedUnitPrice = transaction.amount / transaction.quantity;
      const tolerance = 0.01; // Allow for small rounding differences
      
      if (Math.abs(transaction.unitPrice - expectedUnitPrice) > tolerance) {
        errors.push({ 
          field: 'unitPrice', 
          message: 'Unit price does not match amount divided by quantity',
          value: transaction.unitPrice 
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateForCreation(transaction: Omit<Transaction, 'id' | 'createdAt' | 'unitPrice' | 'customer' | 'product'>): ValidationResult {
    const errors: ValidationError[] = [];

    // All required fields for creation
    if (!transaction.transactionDate) {
      errors.push({ field: 'transactionDate', message: 'Transaction date is required' });
    }

    if (!transaction.transactionDatetime) {
      errors.push({ field: 'transactionDatetime', message: 'Transaction datetime is required' });
    }

    if (!transaction.productId) {
      errors.push({ field: 'productId', message: 'Product ID is required' });
    }

    if (!transaction.paymentMethod) {
      errors.push({ field: 'paymentMethod', message: 'Payment method is required' });
    }

    if (!transaction.amount) {
      errors.push({ field: 'amount', message: 'Amount is required' });
    }

    if (!transaction.quantity) {
      errors.push({ field: 'quantity', message: 'Quantity is required' });
    }

    // Run standard validation
    const standardValidation = this.validate(transaction);
    errors.push(...standardValidation.errors);

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Utility functions for common validations
export class ValidationUtils {
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  static isValidDate(date: any): boolean {
    return date instanceof Date && !isNaN(date.getTime());
  }

  static isValidPaymentMethod(method: any): method is PaymentMethod {
    return typeof method === 'string' && ['cash', 'card'].includes(method);
  }

  static isValidProductCategory(category: any): category is ProductCategory {
    return typeof category === 'string' && Object.values(ProductCategory).includes(category as ProductCategory);
  }

  static sanitizeString(input: string): string {
    return input.trim().replace(/\s+/g, ' ');
  }

  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
}