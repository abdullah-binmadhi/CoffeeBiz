import { 
  CustomerValidator, 
  ProductValidator, 
  TransactionValidator, 
  ValidationUtils 
} from '../validators';
import { ProductCategory, PaymentMethod } from '../../types';

describe('CustomerValidator', () => {
  const validCustomer = {
    firstSeenAt: new Date('2024-01-01'),
    lastSeenAt: new Date('2024-01-15'),
    totalVisits: 5,
    totalSpent: 125.50,
    preferredPaymentMethod: 'card' as PaymentMethod,
    cardNumber: '1234567890123456'
  };

  describe('validate', () => {
    it('should validate a correct customer', () => {
      const result = CustomerValidator.validate(validCustomer);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require firstSeenAt', () => {
      const customer = { ...validCustomer, firstSeenAt: undefined as any };
      const result = CustomerValidator.validate(customer);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'firstSeenAt',
        message: 'First seen date is required'
      });
    });

    it('should require lastSeenAt', () => {
      const customer = { ...validCustomer, lastSeenAt: undefined as any };
      const result = CustomerValidator.validate(customer);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lastSeenAt',
        message: 'Last seen date is required'
      });
    });

    it('should validate date order', () => {
      const customer = {
        ...validCustomer,
        firstSeenAt: new Date('2024-01-15'),
        lastSeenAt: new Date('2024-01-01')
      };
      const result = CustomerValidator.validate(customer);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lastSeenAt',
        message: 'Last seen date cannot be before first seen date'
      });
    });

    it('should validate total visits is positive', () => {
      const customer = { ...validCustomer, totalVisits: 0 };
      const result = CustomerValidator.validate(customer);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'totalVisits',
        message: 'Total visits must be at least 1',
        value: 0
      });
    });

    it('should validate total spent is not negative', () => {
      const customer = { ...validCustomer, totalSpent: -10 };
      const result = CustomerValidator.validate(customer);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'totalSpent',
        message: 'Total spent cannot be negative',
        value: -10
      });
    });

    it('should require card number for card customers', () => {
      const customer = {
        ...validCustomer,
        preferredPaymentMethod: 'card' as PaymentMethod,
        cardNumber: undefined
      };
      const result = CustomerValidator.validate(customer);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'cardNumber',
        message: 'Card number is required for card customers'
      });
    });

    it('should validate card number format', () => {
      const customer = { ...validCustomer, cardNumber: 'invalid' };
      const result = CustomerValidator.validate(customer);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'cardNumber',
        message: 'Invalid card number format',
        value: 'invalid'
      });
    });
  });

  describe('validateForCreation', () => {
    it('should require all creation fields', () => {
      const customer = {
        firstSeenAt: new Date('2024-01-01'),
        lastSeenAt: new Date('2024-01-15')
        // Missing totalVisits and totalSpent
      };
      const result = CustomerValidator.validateForCreation(customer as any);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'totalVisits',
        message: 'Total visits is required'
      });
      expect(result.errors).toContainEqual({
        field: 'totalSpent',
        message: 'Total spent is required'
      });
    });
  });
});

describe('ProductValidator', () => {
  const validProduct = {
    name: 'Espresso',
    category: ProductCategory.ESPRESSO,
    basePrice: 3.50,
    isActive: true
  };

  describe('validate', () => {
    it('should validate a correct product', () => {
      const result = ProductValidator.validate(validProduct);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require product name', () => {
      const product = { ...validProduct, name: '' };
      const result = ProductValidator.validate(product);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'name',
        message: 'Product name is required'
      });
    });

    it('should validate name length', () => {
      const product = { ...validProduct, name: 'a'.repeat(256) };
      const result = ProductValidator.validate(product);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'name',
        message: 'Product name cannot exceed 255 characters',
        value: 'a'.repeat(256)
      });
    });

    it('should require valid category', () => {
      const product = { ...validProduct, category: 'invalid' as any };
      const result = ProductValidator.validate(product);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'category',
        message: 'Invalid product category',
        value: 'invalid'
      });
    });

    it('should validate base price is not negative', () => {
      const product = { ...validProduct, basePrice: -1 };
      const result = ProductValidator.validate(product);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'basePrice',
        message: 'Base price cannot be negative',
        value: -1
      });
    });
  });
});

describe('TransactionValidator', () => {
  const validTransaction = {
    transactionDate: new Date('2024-01-01'),
    transactionDatetime: new Date('2024-01-01T10:30:00Z'),
    productId: '123e4567-e89b-12d3-a456-426614174000',
    paymentMethod: 'card' as PaymentMethod,
    cardNumber: '1234567890123456',
    amount: 4.50,
    quantity: 1
  };

  describe('validate', () => {
    it('should validate a correct transaction', () => {
      const result = TransactionValidator.validate(validTransaction);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require transaction date', () => {
      const transaction = { ...validTransaction, transactionDate: undefined as any };
      const result = TransactionValidator.validate(transaction);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'transactionDate',
        message: 'Transaction date is required'
      });
    });

    it('should require transaction datetime', () => {
      const transaction = { ...validTransaction, transactionDatetime: undefined as any };
      const result = TransactionValidator.validate(transaction);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'transactionDatetime',
        message: 'Transaction datetime is required'
      });
    });

    it('should validate date consistency', () => {
      const transaction = {
        ...validTransaction,
        transactionDate: new Date('2024-01-01'),
        transactionDatetime: new Date('2024-01-02T10:30:00Z')
      };
      const result = TransactionValidator.validate(transaction);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'transactionDate',
        message: 'Transaction date must match the date part of transaction datetime'
      });
    });

    it('should require product ID', () => {
      const transaction = { ...validTransaction, productId: undefined as any };
      const result = TransactionValidator.validate(transaction);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'productId',
        message: 'Product ID is required'
      });
    });

    it('should validate payment method', () => {
      const transaction = { ...validTransaction, paymentMethod: 'invalid' as any };
      const result = TransactionValidator.validate(transaction);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'paymentMethod',
        message: 'Payment method must be either "cash" or "card"',
        value: 'invalid'
      });
    });

    it('should require card number for card payments', () => {
      const transaction = {
        ...validTransaction,
        paymentMethod: 'card' as PaymentMethod,
        cardNumber: undefined
      };
      const result = TransactionValidator.validate(transaction);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'cardNumber',
        message: 'Card number is required for card payments'
      });
    });

    it('should not allow card number for cash payments', () => {
      const transaction = {
        ...validTransaction,
        paymentMethod: 'cash' as PaymentMethod,
        cardNumber: '1234567890123456'
      };
      const result = TransactionValidator.validate(transaction);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'cardNumber',
        message: 'Card number should not be provided for cash payments'
      });
    });

    it('should validate amount is positive', () => {
      const transaction = { ...validTransaction, amount: 0 };
      const result = TransactionValidator.validate(transaction);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'amount',
        message: 'Amount must be greater than 0',
        value: 0
      });
    });

    it('should validate quantity is positive', () => {
      const transaction = { ...validTransaction, quantity: 0 };
      const result = TransactionValidator.validate(transaction);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'quantity',
        message: 'Quantity must be greater than 0',
        value: 0
      });
    });
  });
});

describe('ValidationUtils', () => {
  describe('isValidUUID', () => {
    it('should validate correct UUIDs', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        '550e8400-e29b-41d4-a716-446655440000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      ];

      validUUIDs.forEach(uuid => {
        expect(ValidationUtils.isValidUUID(uuid)).toBe(true);
      });
    });

    it('should reject invalid UUIDs', () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '123e4567-e89b-12d3-a456',
        '123e4567-e89b-12d3-a456-426614174000-extra',
        ''
      ];

      invalidUUIDs.forEach(uuid => {
        expect(ValidationUtils.isValidUUID(uuid)).toBe(false);
      });
    });
  });

  describe('isValidDate', () => {
    it('should validate correct dates', () => {
      expect(ValidationUtils.isValidDate(new Date())).toBe(true);
      expect(ValidationUtils.isValidDate(new Date('2024-01-01'))).toBe(true);
    });

    it('should reject invalid dates', () => {
      expect(ValidationUtils.isValidDate(new Date('invalid'))).toBe(false);
      expect(ValidationUtils.isValidDate('2024-01-01')).toBe(false);
      expect(ValidationUtils.isValidDate(null)).toBe(false);
    });
  });

  describe('isValidPaymentMethod', () => {
    it('should validate correct payment methods', () => {
      expect(ValidationUtils.isValidPaymentMethod('cash')).toBe(true);
      expect(ValidationUtils.isValidPaymentMethod('card')).toBe(true);
    });

    it('should reject invalid payment methods', () => {
      expect(ValidationUtils.isValidPaymentMethod('credit')).toBe(false);
      expect(ValidationUtils.isValidPaymentMethod('debit')).toBe(false);
      expect(ValidationUtils.isValidPaymentMethod('')).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should trim and normalize whitespace', () => {
      expect(ValidationUtils.sanitizeString('  hello   world  ')).toBe('hello world');
      expect(ValidationUtils.sanitizeString('hello\n\tworld')).toBe('hello world');
    });
  });

  describe('formatCurrency', () => {
    it('should format currency correctly', () => {
      expect(ValidationUtils.formatCurrency(4.50)).toBe('$4.50');
      expect(ValidationUtils.formatCurrency(1234.56)).toBe('$1,234.56');
    });
  });
});