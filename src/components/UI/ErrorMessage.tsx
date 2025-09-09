import React from 'react';
import { AppError, ErrorType } from '../../utils/errorHandler';

interface ErrorMessageProps {
  message?: string;
  error?: AppError;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  variant?: 'error' | 'warning' | 'info';
  showTimestamp?: boolean;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  message,
  error,
  onRetry, 
  onDismiss,
  className = '',
  variant = 'error',
  showTimestamp = false
}) => {
  // Use AppError if provided, otherwise create from message
  const displayError = error || {
    type: ErrorType.UNKNOWN_ERROR,
    message: message || 'An error occurred',
    userMessage: message || 'An error occurred',
    timestamp: new Date(),
    recoverable: true,
    retryable: !!onRetry
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return {
          container: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-400',
          title: 'text-yellow-800',
          text: 'text-yellow-700',
          button: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800'
        };
      case 'info':
        return {
          container: 'bg-blue-50 border-blue-200',
          icon: 'text-blue-400',
          title: 'text-blue-800',
          text: 'text-blue-700',
          button: 'bg-blue-100 hover:bg-blue-200 text-blue-800'
        };
      default:
        return {
          container: 'bg-red-50 border-red-200',
          icon: 'text-red-400',
          title: 'text-red-800',
          text: 'text-red-700',
          button: 'bg-red-100 hover:bg-red-200 text-red-800'
        };
    }
  };

  const getErrorTitle = () => {
    if (error) {
      switch (error.type) {
        case ErrorType.NETWORK_ERROR:
          return 'Connection Error';
        case ErrorType.DATA_VALIDATION_ERROR:
          return 'Data Validation Error';
        case ErrorType.CALCULATION_ERROR:
          return 'Calculation Error';
        case ErrorType.EXPORT_ERROR:
          return 'Export Error';
        case ErrorType.IMPORT_ERROR:
          return 'Import Error';
        default:
          return 'Error';
      }
    }
    return variant === 'warning' ? 'Warning' : variant === 'info' ? 'Information' : 'Error';
  };

  const getIcon = () => {
    switch (variant) {
      case 'warning':
        return (
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'info':
        return (
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const styles = getVariantStyles();
  const shouldShowRetry = onRetry && (!error || error.retryable);

  return (
    <div className={`${styles.container} border rounded-lg p-6 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <div className={styles.icon}>
            {getIcon()}
          </div>
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${styles.title}`}>
            {getErrorTitle()}
          </h3>
          <div className={`mt-2 text-sm ${styles.text}`}>
            <p>{displayError.userMessage}</p>
            {showTimestamp && error && (
              <p className="mt-1 text-xs opacity-75">
                Occurred at {error.timestamp.toLocaleString()}
              </p>
            )}
          </div>
          <div className="mt-4 flex space-x-3">
            {shouldShowRetry && (
              <button
                onClick={onRetry}
                className={`${styles.button} px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200`}
              >
                Try Again
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
        {onDismiss && (
          <div className="ml-auto pl-3">
            <button
              onClick={onDismiss}
              className={`${styles.icon} hover:opacity-75 transition-opacity`}
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;