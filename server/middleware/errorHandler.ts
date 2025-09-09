import { Request, Response, NextFunction } from 'express';

export interface APIError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
  userMessage?: string;
}

export interface ErrorResponse {
  error: {
    message: string;
    userMessage: string;
    code: string;
    timestamp: string;
    path: string;
    requestId?: string;
    details?: any;
  };
}

// Enhanced error handler with user-friendly messages
export const errorHandler = (
  err: APIError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Generate unique request ID for tracking
  const requestId = req.headers['x-request-id'] || generateRequestId();

  // Log error details for debugging
  console.error('API Error:', {
    requestId,
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString(),
    body: req.body,
    query: req.query,
    params: req.params
  });

  const statusCode = err.statusCode || 500;
  const errorCode = err.code || getErrorCodeFromStatus(statusCode);
  const userMessage = err.userMessage || getUserFriendlyMessage(err, statusCode);

  // Don't expose internal error details in production
  const isProduction = process.env.NODE_ENV === 'production';
  const errorDetails = isProduction ? undefined : {
    stack: err.stack,
    details: err.details
  };

  const errorResponse: ErrorResponse = {
    error: {
      message: isProduction ? userMessage : err.message,
      userMessage,
      code: errorCode,
      timestamp: new Date().toISOString(),
      path: req.path,
      requestId: requestId as string,
      ...(errorDetails && { details: errorDetails })
    }
  };

  res.status(statusCode).json(errorResponse);
};

// Generate user-friendly error messages
function getUserFriendlyMessage(err: APIError, statusCode: number): string {
  // Database connection errors
  if (err.message.includes('connect ECONNREFUSED') || err.message.includes('database')) {
    return 'We\'re experiencing technical difficulties. Please try again in a few moments.';
  }

  // Cache/Redis errors
  if (err.message.includes('Redis') || err.message.includes('cache')) {
    return 'Some features may be slower than usual. The system is still functional.';
  }

  // Validation errors
  if (err.message.includes('validation') || err.message.includes('invalid')) {
    return 'Please check your input and try again.';
  }

  // Rate limiting
  if (err.message.includes('rate limit') || err.message.includes('too many requests')) {
    return 'You\'re making requests too quickly. Please wait a moment and try again.';
  }

  // Authentication/Authorization
  if (statusCode === 401) {
    return 'Please log in to access this feature.';
  }
  
  if (statusCode === 403) {
    return 'You don\'t have permission to access this resource.';
  }

  // Not found
  if (statusCode === 404) {
    return 'The requested resource was not found.';
  }

  // Bad request
  if (statusCode === 400) {
    return 'There was an issue with your request. Please check your input and try again.';
  }

  // Server errors
  if (statusCode >= 500) {
    return 'We\'re experiencing technical difficulties. Our team has been notified.';
  }

  return 'An unexpected error occurred. Please try again.';
}

// Get error code from HTTP status
function getErrorCodeFromStatus(statusCode: number): string {
  const statusCodes: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION_ERROR',
    429: 'RATE_LIMIT_EXCEEDED',
    500: 'INTERNAL_ERROR',
    502: 'BAD_GATEWAY',
    503: 'SERVICE_UNAVAILABLE',
    504: 'GATEWAY_TIMEOUT'
  };

  return statusCodes[statusCode] || 'UNKNOWN_ERROR';
}

// Generate unique request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create enhanced error with user-friendly message
export const createError = (
  message: string, 
  statusCode: number = 500, 
  code?: string,
  userMessage?: string,
  details?: any
): APIError => {
  const error = new Error(message) as APIError;
  error.statusCode = statusCode;
  error.code = code;
  error.userMessage = userMessage;
  error.details = details;
  return error;
};

// Async error wrapper for route handlers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Validation error handler
export const validationErrorHandler = (errors: any[]) => {
  const formattedErrors = errors.map(error => ({
    field: error.param || error.path,
    message: error.msg || error.message,
    value: error.value
  }));

  return createError(
    'Validation failed',
    422,
    'VALIDATION_ERROR',
    'Please check your input and correct any errors.',
    { validationErrors: formattedErrors }
  );
};

// Database error handler
export const handleDatabaseError = (error: any): APIError => {
  console.error('Database error:', error);

  // PostgreSQL specific error codes
  switch (error.code) {
    case '23505': // Unique violation
      return createError(
        'Duplicate entry',
        409,
        'DUPLICATE_ENTRY',
        'This record already exists.'
      );
    
    case '23503': // Foreign key violation
      return createError(
        'Invalid reference',
        400,
        'INVALID_REFERENCE',
        'The referenced item does not exist.'
      );
    
    case '23514': // Check constraint violation
      return createError(
        'Invalid data',
        400,
        'CONSTRAINT_VIOLATION',
        'The provided data does not meet requirements.'
      );
    
    case '42P01': // Undefined table
      return createError(
        'Resource not found',
        404,
        'RESOURCE_NOT_FOUND',
        'The requested resource is not available.'
      );
    
    default:
      return createError(
        'Database operation failed',
        500,
        'DATABASE_ERROR',
        'We\'re experiencing technical difficulties. Please try again.'
      );
  }
};

// Cache error handler
export const handleCacheError = (error: any): APIError => {
  console.error('Cache error:', error);
  
  return createError(
    'Cache operation failed',
    503,
    'CACHE_ERROR',
    'Some features may be slower than usual, but the system is still functional.',
    { cacheError: error.message }
  );
};

// Network/External service error handler
export const handleNetworkError = (error: any): APIError => {
  console.error('Network error:', error);
  
  if (error.code === 'ECONNREFUSED') {
    return createError(
      'Service unavailable',
      503,
      'SERVICE_UNAVAILABLE',
      'The service is temporarily unavailable. Please try again later.'
    );
  }
  
  if (error.code === 'ETIMEDOUT') {
    return createError(
      'Request timeout',
      504,
      'TIMEOUT',
      'The request took too long to complete. Please try again.'
    );
  }
  
  return createError(
    'Network error',
    502,
    'NETWORK_ERROR',
    'Unable to connect to external services. Please try again.'
  );
};