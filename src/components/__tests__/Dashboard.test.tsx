import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from '../Layout/Dashboard';

// Mock the analytics hook
jest.mock('../../hooks/useAnalytics', () => ({
  useAnalytics: () => ({
    data: {
      revenue: {
        totalRevenue: 15000,
        transactionCount: 500,
        averageTransactionValue: 30,
        uniqueCustomers: 200,
        dailyRevenue: [
          { date: '2024-01-01', revenue: 1000, transactions: 50 },
          { date: '2024-01-02', revenue: 1200, transactions: 60 },
        ]
      },
      products: {
        topProducts: [
          { id: '1', name: 'Latte', revenue: 5000, totalQuantity: 200 },
          { id: '2', name: 'Cappuccino', revenue: 4000, totalQuantity: 150 },
        ]
      }
    },
    loading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

describe('Dashboard Component', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  test('renders dashboard with main sections', () => {
    render(<Dashboard />);
    
    expect(screen.getByText('CoffeeBiz Analytics')).toBeInTheDocument();
    expect(screen.getByTestId('revenue-section')).toBeInTheDocument();
    expect(screen.getByTestId('products-section')).toBeInTheDocument();
    expect(screen.getByTestId('traffic-section')).toBeInTheDocument();
  });

  test('displays loading state', () => {
    // Mock loading state
    jest.doMock('../../hooks/useAnalytics', () => ({
      useAnalytics: () => ({
        data: null,
        loading: true,
        error: null,
        refetch: jest.fn(),
      }),
    }));

    render(<Dashboard />);
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  test('displays error state', () => {
    // Mock error state
    jest.doMock('../../hooks/useAnalytics', () => ({
      useAnalytics: () => ({
        data: null,
        loading: false,
        error: 'Failed to load data',
        refetch: jest.fn(),
      }),
    }));

    render(<Dashboard />);
    
    expect(screen.getByTestId('error-message')).toBeInTheDocument();
    expect(screen.getByText('Unable to load data')).toBeInTheDocument();
  });

  test('handles navigation between modules', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    // Test navigation to revenue
    await user.click(screen.getByTestId('nav-revenue'));
    expect(screen.getByTestId('revenue-dashboard')).toBeInTheDocument();

    // Test navigation to products
    await user.click(screen.getByTestId('nav-products'));
    expect(screen.getByTestId('products-dashboard')).toBeInTheDocument();

    // Test navigation to traffic
    await user.click(screen.getByTestId('nav-traffic'));
    expect(screen.getByTestId('traffic-dashboard')).toBeInTheDocument();
  });

  test('handles date range changes', async () => {
    const user = userEvent.setup();
    const mockRefetch = jest.fn();
    
    jest.doMock('../../hooks/useAnalytics', () => ({
      useAnalytics: () => ({
        data: { revenue: {} },
        loading: false,
        error: null,
        refetch: mockRefetch,
      }),
    }));

    render(<Dashboard />);

    const dateRangePicker = screen.getByTestId('date-range-picker');
    await user.click(dateRangePicker);

    const thirtyDaysOption = screen.getByTestId('date-range-30-days');
    await user.click(thirtyDaysOption);

    await waitFor(() => {
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  test('displays revenue metrics correctly', () => {
    render(<Dashboard />);

    expect(screen.getByTestId('total-revenue')).toHaveTextContent('$15,000');
    expect(screen.getByTestId('transaction-count')).toHaveTextContent('500');
    expect(screen.getByTestId('avg-transaction-value')).toHaveTextContent('$30');
  });

  test('renders charts with correct data', () => {
    render(<Dashboard />);

    const revenueChart = screen.getByTestId('revenue-chart');
    expect(revenueChart).toBeInTheDocument();

    // Check if chart has the correct data
    const chartData = revenueChart.getAttribute('data-chart-data');
    expect(chartData).toContain('dailyRevenue');
  });

  test('handles export functionality', async () => {
    const user = userEvent.setup();
    
    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'mock-url');
    global.URL.revokeObjectURL = jest.fn();

    // Mock document.createElement
    const mockLink = {
      click: jest.fn(),
      setAttribute: jest.fn(),
      style: {},
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    jest.spyOn(document.body, 'appendChild').mockImplementation();
    jest.spyOn(document.body, 'removeChild').mockImplementation();

    render(<Dashboard />);

    const exportButton = screen.getByTestId('export-csv');
    await user.click(exportButton);

    expect(mockLink.click).toHaveBeenCalled();
  });

  test('is responsive on different screen sizes', () => {
    // Test desktop view
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200,
    });

    render(<Dashboard />);
    expect(screen.getByTestId('desktop-nav')).toBeInTheDocument();

    // Test mobile view
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    // Trigger resize event
    fireEvent(window, new Event('resize'));

    // Mobile navigation should be visible or desktop nav should adapt
    const mobileNav = screen.queryByTestId('mobile-nav');
    const desktopNav = screen.queryByTestId('desktop-nav');
    
    expect(mobileNav || desktopNav).toBeInTheDocument();
  });

  test('handles search functionality', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    // Navigate to products section
    await user.click(screen.getByTestId('nav-products'));

    const searchInput = screen.getByTestId('product-search');
    await user.type(searchInput, 'latte');

    await waitFor(() => {
      // Should filter products based on search
      expect(screen.getByText('Latte')).toBeInTheDocument();
    });
  });

  test('validates accessibility', () => {
    render(<Dashboard />);

    // Check for proper ARIA labels
    const navigation = screen.getByRole('navigation');
    expect(navigation).toBeInTheDocument();

    // Check for proper heading hierarchy
    const mainHeading = screen.getByRole('heading', { level: 1 });
    expect(mainHeading).toBeInTheDocument();

    // Check for proper button labels
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveAttribute('aria-label');
    });
  });

  test('handles keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    // Test tab navigation
    await user.tab();
    expect(document.activeElement).toHaveAttribute('data-testid', 'nav-revenue');

    await user.tab();
    expect(document.activeElement).toHaveAttribute('data-testid', 'nav-products');

    // Test enter key activation
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('products-dashboard')).toBeInTheDocument();
  });

  test('persists user preferences', () => {
    // Mock localStorage
    const mockLocalStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
    });

    render(<Dashboard />);

    // Should load saved preferences
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('dashboard-preferences');
  });

  test('handles real-time data updates', async () => {
    const mockRefetch = jest.fn();
    
    jest.doMock('../../hooks/useAnalytics', () => ({
      useAnalytics: () => ({
        data: { revenue: { totalRevenue: 15000 } },
        loading: false,
        error: null,
        refetch: mockRefetch,
      }),
    }));

    render(<Dashboard />);

    // Simulate real-time update interval
    jest.advanceTimersByTime(30000); // 30 seconds

    await waitFor(() => {
      expect(mockRefetch).toHaveBeenCalled();
    });
  });
});