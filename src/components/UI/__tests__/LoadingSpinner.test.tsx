import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoadingSpinner, { SkeletonLoader, CardSkeleton } from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders default spinner', () => {
    render(<LoadingSpinner />);
    
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('h-8', 'w-8');
  });

  it('renders different sizes', () => {
    const { rerender } = render(<LoadingSpinner size="sm" />);
    expect(document.querySelector('.animate-spin')).toHaveClass('h-4', 'w-4');
    
    rerender(<LoadingSpinner size="lg" />);
    expect(document.querySelector('.animate-spin')).toHaveClass('h-12', 'w-12');
    
    rerender(<LoadingSpinner size="xl" />);
    expect(document.querySelector('.animate-spin')).toHaveClass('h-16', 'w-16');
  });

  it('renders with message', () => {
    render(<LoadingSpinner message="Loading data..." />);
    
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('renders dots variant', () => {
    render(<LoadingSpinner variant="dots" />);
    
    const dots = document.querySelectorAll('.animate-bounce');
    expect(dots).toHaveLength(3);
  });

  it('renders pulse variant', () => {
    render(<LoadingSpinner variant="pulse" />);
    
    const pulse = document.querySelector('.animate-pulse');
    expect(pulse).toBeInTheDocument();
  });

  it('renders skeleton variant', () => {
    render(<LoadingSpinner variant="skeleton" />);
    
    const skeletonLines = document.querySelectorAll('.bg-gray-300');
    expect(skeletonLines.length).toBeGreaterThan(0);
  });

  it('renders fullscreen overlay', () => {
    render(<LoadingSpinner fullScreen />);
    
    const overlay = document.querySelector('.fixed.inset-0');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveClass('bg-white', 'bg-opacity-75');
  });
});

describe('SkeletonLoader', () => {
  it('renders default number of lines', () => {
    render(<SkeletonLoader />);
    
    const lines = document.querySelectorAll('.bg-gray-300');
    expect(lines).toHaveLength(3);
  });

  it('renders custom number of lines', () => {
    render(<SkeletonLoader lines={5} />);
    
    const lines = document.querySelectorAll('.bg-gray-300');
    expect(lines).toHaveLength(5);
  });

  it('applies custom height', () => {
    render(<SkeletonLoader height="h-6" />);
    
    const lines = document.querySelectorAll('.h-6');
    expect(lines.length).toBeGreaterThan(0);
  });
});

describe('CardSkeleton', () => {
  it('renders card skeleton structure', () => {
    render(<CardSkeleton />);
    
    const card = document.querySelector('.bg-white.rounded-lg.shadow');
    expect(card).toBeInTheDocument();
    
    const animatedElements = document.querySelectorAll('.animate-pulse');
    expect(animatedElements.length).toBeGreaterThan(0);
  });

  it('applies custom className', () => {
    render(<CardSkeleton className="custom-class" />);
    
    const card = document.querySelector('.custom-class');
    expect(card).toBeInTheDocument();
  });
});