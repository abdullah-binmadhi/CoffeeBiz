import { ErrorHandler, ErrorType, InputValidator } from '../errorHandler';

describe('ErrorHandler', () => {
  describe('createError', () => {
    it('should create an error with all properties', () => {
      const error = ErrorHandler.createError(
        ErrorType.NETWORK_ERROR,
        'Network failed',
        'Custom user message',
        { code: 500 },
        true,
        true
      );

      expect(error.type).toBe(ErrorType.NETWORK_ERROR);
      expect(error.message).toBe('Network failed');
      expect(error.userMessage).toBe('Custom user message');
      expect(error.details).toEqual({ code: 500 });
      expect(error.recoverable).toBe(true);
      expect(error.retryable).toBe(true);
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should use default user message when not provided', () => {
      const error = ErrorHandler.createError(
        ErrorType.DATA_VALIDATION_ERROR,
        'Validation failed'
      );

      expect(error.userMessage).toBe('The data appears to be invalid or corrupted. Please check your data files.');
    });
  });

  describe('getDefaultUserMessage', () => {
    it('should return appropriate messages for each error type', () => {
      expect(ErrorHandler.getDefaultUserMessage(ErrorType.NETWORK_ERROR))
        .toContain('Unable to connect to the server');
      
      expect(ErrorHandler.getDefaultUserMessage(ErrorType.DATA_VALIDATION_ERROR))
        .toContain('data appears to be invalid');
      
      expect(ErrorHandler.getDefaultUserMessage(ErrorType.CALCULATION_ERROR))
        .toContain('error calculating');
      
      expect(ErrorHandler.getDefaultUserMessage(ErrorType.EXPORT_ERROR))
        .toContain('Failed to export');
      
      expect(ErrorHandler.getDefaultUserMessage(ErrorType.IMPORT_ERROR))
        .toContain('Failed to import');
      
      expect(ErrorHandler.getDefaultUserMessage(ErrorType.UNKNOWN_ERROR))
        .toContain('unexpected error');
    });
  });

  describe('handleError', () => {
    it('should handle network errors', () => {
      const networkError = new Error('fetch failed');
      const appError = ErrorHandler.handleError(networkError);

      expect(appError.type).toBe(ErrorType.NETWORK_ERROR);
      expect(appError.message).toBe('fetch failed');
    });

    it('should handle validation errors', () => {
      const validationError = new Error('validation failed');
      const appError = ErrorHandler.handleError(validationError);

      expect(appError.type).toBe(ErrorType.DATA_VALIDATION_ERROR);
    });

    it('should handle calculation errors', () => {
      const calcError = new Error('calculation resulted in NaN');
      const appError = ErrorHandler.handleError(calcError);

      expect(appError.type).toBe(ErrorType.CALCULATION_ERROR);
    });

    it('should handle export errors', () => {
      const exportError = new Error('export failed');
      const appError = ErrorHandler.handleError(exportError);

      expect(appError.type).toBe(ErrorType.EXPORT_ERROR);
    });

    it('should handle import errors', () => {
      const importError = new Error('CSV load failed');
      const appError = ErrorHandler.handleError(importError);

      expect(appError.type).toBe(ErrorType.IMPORT_ERROR);
    });

    it('should handle unknown errors', () => {
      const unknownError = new Error('something weird happened');
      const appError = ErrorHandler.handleError(unknownError);

      expect(appError.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(appError.recoverable).toBe(false);
      expect(appError.retryable).toBe(false);
    });

    it('should handle non-Error objects', () => {
      const appError = ErrorHandler.handleError('string error');

      expect(appError.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(appError.message).toBe('Unknown error occurred');
    });
  });

  describe('shouldRetry', () => {
    it('should allow retry for network errors', () => {
      const error = ErrorHandler.createError(ErrorType.NETWORK_ERROR, 'Network failed');
      expect(ErrorHandler.shouldRetry(error, 0)).toBe(true);
      expect(ErrorHandler.shouldRetry(error, 1)).toBe(true);
      expect(ErrorHandler.shouldRetry(error, 2)).toBe(true);
      expect(ErrorHandler.shouldRetry(error, 3)).toBe(false);
    });

    it('should allow limited retry for calculation errors', () => {
      const error = ErrorHandler.createError(ErrorType.CALCULATION_ERROR, 'Calc failed');
      expect(ErrorHandler.shouldRetry(error, 0)).toBe(true);
      expect(ErrorHandler.shouldRetry(error, 1)).toBe(true);
      expect(ErrorHandler.shouldRetry(error, 2)).toBe(false);
    });

    it('should not retry non-retryable errors', () => {
      const error = ErrorHandler.createError(
        ErrorType.DATA_VALIDATION_ERROR, 
        'Validation failed',
        undefined,
        undefined,
        true,
        false
      );
      expect(ErrorHandler.shouldRetry(error, 0)).toBe(false);
    });

    it('should not retry after max attempts', () => {
      const error = ErrorHandler.createError(ErrorType.NETWORK_ERROR, 'Network failed');
      expect(ErrorHandler.shouldRetry(error, 3)).toBe(false);
    });
  });

  describe('getRetryDelay', () => {
    it('should implement exponential backoff', () => {
      expect(ErrorHandler.getRetryDelay(0)).toBe(1000);
      expect(ErrorHandler.getRetryDelay(1)).toBe(2000);
      expect(ErrorHandler.getRetryDelay(2)).toBe(4000);
      expect(ErrorHandler.getRetryDelay(3)).toBe(4000); // Capped at 4000
    });
  });
});

describe('InputValidator', () => {
  describe('validateDateRange', () => {
    it('should validate correct date ranges', () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 6); // 6 months ago
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() - 1); // 1 month ago
      const result = InputValidator.validateDateRange(startDate, endDate);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject when start date is after end date', () => {
      const startDate = new Date('2023-12-31');
      const endDate = new Date('2023-01-01');
      const result = InputValidator.validateDateRange(startDate, endDate);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Start date must be before end date');
    });

    it('should reject future start dates', () => {
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() + 1);
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 2);
      
      const result = InputValidator.validateDateRange(startDate, endDate);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Start date cannot be in the future');
    });

    it('should reject date ranges older than 2 years', () => {
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 3);
      const endDate = new Date();
      
      const result = InputValidator.validateDateRange(startDate, endDate);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Date range cannot exceed 2 years');
    });

    it('should reject missing dates', () => {
      const result = InputValidator.validateDateRange(null as any, new Date());

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Both start and end dates are required');
    });
  });

  describe('sanitizeString', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello World';
      const result = InputValidator.sanitizeString(input);

      expect(result).toBe('alert(xss)Hello World');
    });

    it('should remove dangerous characters', () => {
      const input = 'Hello<>&\'"World';
      const result = InputValidator.sanitizeString(input);

      expect(result).toBe('HelloWorld');
    });

    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      const result = InputValidator.sanitizeString(input);

      expect(result).toBe('Hello World');
    });

    it('should limit length to 255 characters', () => {
      const input = 'a'.repeat(300);
      const result = InputValidator.sanitizeString(input);

      expect(result.length).toBe(255);
    });

    it('should handle non-string inputs', () => {
      expect(InputValidator.sanitizeString(null as any)).toBe('');
      expect(InputValidator.sanitizeString(undefined as any)).toBe('');
      expect(InputValidator.sanitizeString(123 as any)).toBe('');
    });
  });

  describe('validateNumber', () => {
    it('should validate valid numbers', () => {
      const result = InputValidator.validateNumber(42);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate numbers with min/max constraints', () => {
      const result = InputValidator.validateNumber(50, 10, 100);

      expect(result.isValid).toBe(true);
    });

    it('should reject non-numbers', () => {
      const result = InputValidator.validateNumber('not a number');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Value must be a valid number');
    });

    it('should reject numbers below minimum', () => {
      const result = InputValidator.validateNumber(5, 10);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Value must be at least 10');
    });

    it('should reject numbers above maximum', () => {
      const result = InputValidator.validateNumber(150, undefined, 100);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Value must be at most 100');
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org'
      ];

      validEmails.forEach(email => {
        const result = InputValidator.validateEmail(email);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
        ''
      ];

      invalidEmails.forEach(email => {
        const result = InputValidator.validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Please enter a valid email address');
      });
    });
  });
});