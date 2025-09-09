import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
  });

  it('renders with custom message', () => {
    render(<LoadingSpinner message="Loading data..." />);
    
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<LoadingSpinner size="sm" />);
    let spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('h-4', 'w-4');

    rerender(<LoadingSpinner size="md" />);
    spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('h-8', 'w-8');

    rerender(<LoadingSpinner size="lg" />);
    spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('h-12', 'w-12');

    rerender(<LoadingSpinner size="xl" />);
    spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('h-16', 'w-16');
  });

  it('applies correct color classes', () => {
    const { rerender } = render(<LoadingSpinner color="primary" />);
    let spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('border-coffee-600');

    rerender(<LoadingSpinner color="secondary" />);
    spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('border-gray-600');

    rerender(<LoadingSpinner color="white" />);
    spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('border-white');
  });

  it('renders overlay when enabled', () => {
    render(<LoadingSpinner overlay={true} message="Loading..." />);
    
    // Find the overlay container (the outermost div with fixed positioning)
    const overlayContainer = document.querySelector('.fixed.inset-0');
    expect(overlayContainer).toBeInTheDocument();
    expect(overlayContainer).toHaveClass('fixed', 'inset-0', 'bg-black', 'bg-opacity-50');
    
    // Verify the message is still rendered inside
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<LoadingSpinner className="custom-class" />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('custom-class');
  });

  it('applies correct text color for white spinner', () => {
    render(<LoadingSpinner color="white" message="Loading..." />);
    
    const message = screen.getByText('Loading...');
    expect(message).toHaveClass('text-white');
  });

  it('applies correct text size based on spinner size', () => {
    const { rerender } = render(<LoadingSpinner size="sm" message="Loading..." />);
    let message = screen.getByText('Loading...');
    expect(message).toHaveClass('text-xs');

    rerender(<LoadingSpinner size="xl" message="Loading..." />);
    message = screen.getByText('Loading...');
    expect(message).toHaveClass('text-lg');
  });
});