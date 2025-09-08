export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  DATA_VALIDATION_ERROR = 'DATA_VALIDATION_ERROR',
  CALCULATION_ERROR = 'CALCULATION_ERROR',
  EXPORT_ERROR = 'EXPORT_ERROR',
  IMPORT_ERROR = 'IMPORT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface AppError {
  type: ErrorType;
  message: string;
  userMessage: string;
  details?: any;
  timestamp: Date;
  recoverable: boolean;
  retryable: boolean;
}

export class ErrorHandler {
  static createError(
    type: ErrorType,
    message: string,
    userMessage?: string,
    details?: any,
    recoverable: boolean = true,
    retryable: boolean = true
  ): AppError {
    return {
      type,
      message,
      userMessage: userMessage || this.getDefaultUserMessage(type),
      details,
      timestamp: new Date(),
      recoverable,
      retryable
    };
  }

  static getDefaultUserMessage(type: ErrorType): string {
    switch (type) {
      case ErrorType.NETWORK_ERROR:
        return 'Unable to connect to the server. Please check your internet connection and try again.';
      case ErrorType.DATA_VALIDATION_ERROR:
        return 'The data appears to be invalid or corrupted. Please check your data files.';
      case ErrorType.CALCULATION_ERROR:
        return 'There was an error calculating your analytics. This might be due to insufficient data.';
      case ErrorType.EXPORT_ERROR:
        return 'Failed to export your data. Please try again or contact support if the problem persists.';
      case ErrorType.IMPORT_ERROR:
        return 'Failed to import your data. Please ensure your files are in the correct format.';
      default:
        return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
    }
  }

  static handleError(error: unknown): AppError {
    console.error('Error occurred:', error);

    if (error instanceof Error) {
      // Network errors
      if (error.message.includes('fetch') || error.message.includes('network')) {
        return this.createError(
          ErrorType.NETWORK_ERROR,
          error.message,
          undefined,
          error
        );
      }

      // Data validation errors
      if (error.message.includes('validation') || error.message.includes('invalid')) {
        return this.createError(
          ErrorType.DATA_VALIDATION_ERROR,
          error.message,
          undefined,
          error
        );
      }

      // Calculation errors
      if (error.message.includes('calculation') || error.message.includes('NaN')) {
        return this.createError(
          ErrorType.CALCULATION_ERROR,
          error.message,
          undefined,
          error
        );
      }

      // Export errors
      if (error.message.includes('export') || error.message.includes('download')) {
        return this.createError(
          ErrorType.EXPORT_ERROR,
          error.message,
          undefined,
          error
        );
      }

      // Import errors
      if (error.message.includes('import') || error.message.includes('CSV') || error.message.includes('load')) {
        return this.createError(
          ErrorType.IMPORT_ERROR,
          error.message,
          undefined,
          error
        );
      }
    }

    // Unknown error
    return this.createError(
      ErrorType.UNKNOWN_ERROR,
      error instanceof Error ? error.message : 'Unknown error occurred',
      undefined,
      error,
      false,
      false
    );
  }

  static shouldRetry(error: AppError, attemptCount: number = 0): boolean {
    if (!error.retryable || attemptCount >= 3) {
      return false;
    }

    // Only retry network errors and some calculation errors
    return error.type === ErrorType.NETWORK_ERROR || 
           (error.type === ErrorType.CALCULATION_ERROR && attemptCount < 2);
  }

  static getRetryDelay(attemptCount: number): number {
    // Exponential backoff: 1s, 2s, 4s
    return Math.min(1000 * Math.pow(2, attemptCount), 4000);
  }
}

// Input validation utilities
export class InputValidator {
  static validateDateRange(startDate: Date, endDate: Date): { isValid: boolean; error?: string } {
    if (!startDate || !endDate) {
      return { isValid: false, error: 'Both start and end dates are required' };
    }

    if (startDate > endDate) {
      return { isValid: false, error: 'Start date must be before end date' };
    }

    const now = new Date();
    if (startDate > now) {
      return { isValid: false, error: 'Start date cannot be in the future' };
    }

    // Check if date range is too large (more than 2 years)
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(now.getFullYear() - 2);
    
    if (startDate < twoYearsAgo) {
      return { isValid: false, error: 'Date range cannot exceed 2 years' };
    }

    return { isValid: true };
  }

  static sanitizeString(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // Remove HTML tags and potentially dangerous characters
    return input
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>'"&]/g, '') // Remove potentially dangerous characters
      .trim()
      .substring(0, 255); // Limit length
  }

  static validateNumber(value: any, min?: number, max?: number): { isValid: boolean; error?: string } {
    const num = Number(value);
    
    if (isNaN(num)) {
      return { isValid: false, error: 'Value must be a valid number' };
    }

    if (min !== undefined && num < min) {
      return { isValid: false, error: `Value must be at least ${min}` };
    }

    if (max !== undefined && num > max) {
      return { isValid: false, error: `Value must be at most ${max}` };
    }

    return { isValid: true };
  }

  static validateEmail(email: string): { isValid: boolean; error?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email || !emailRegex.test(email)) {
      return { isValid: false, error: 'Please enter a valid email address' };
    }

    return { isValid: true };
  }
}