import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorMessage from '../ErrorMessage';
import { ErrorHandler, ErrorType } from '../../../utils/errorHandler';

describe('ErrorMessage', () => {
  it('renders basic error message', () => {
    render(<ErrorMessage message="Test error message" />);
    
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('renders error with retry button', () => {
    const mockRetry = jest.fn();
    render(<ErrorMessage message="Test error" onRetry={mockRetry} />);
    
    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('renders error with dismiss button', () => {
    const mockDismiss = jest.fn();
    render(<ErrorMessage message="Test error" onDismiss={mockDismiss} />);
    
    const dismissButton = screen.getByText('Dismiss');
    expect(dismissButton).toBeInTheDocument();
    
    fireEvent.click(dismissButton);
    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders AppError with specific error type', () => {
    const networkError = ErrorHandler.createError(
      ErrorType.NETWORK_ERROR,
      'Network failed',
      'Connection error occurred'
    );
    
    render(<ErrorMessage error={networkError} />);
    
    expect(screen.getByText('Connection Error')).toBeInTheDocument();
    expect(screen.getByText('Connection error occurred')).toBeInTheDocument();
  });

  it('shows timestamp for AppError', () => {
    const error = ErrorHandler.createError(
      ErrorType.DATA_VALIDATION_ERROR,
      'Validation failed'
    );
    
    render(<ErrorMessage error={error} />);
    
    expect(screen.getByText(/Occurred at/)).toBeInTheDocument();
  });

  it('does not show retry button for non-retryable errors', () => {
    const error = ErrorHandler.createError(
      ErrorType.UNKNOWN_ERROR,
      'Unknown error',
      undefined,
      undefined,
      false,
      false
    );
    
    const mockRetry = jest.fn();
    render(<ErrorMessage error={error} onRetry={mockRetry} />);
    
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
  });

  it('renders warning variant', () => {
    render(<ErrorMessage message="Warning message" variant="warning" />);
    
    const container = screen.getByText('Warning message').closest('div');
    expect(container).toHaveClass('bg-yellow-50', 'border-yellow-200');
  });

  it('renders info variant', () => {
    render(<ErrorMessage message="Info message" variant="info" />);
    
    const container = screen.getByText('Info message').closest('div');
    expect(container).toHaveClass('bg-blue-50', 'border-blue-200');
  });
});