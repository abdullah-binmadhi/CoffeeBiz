import { renderHook, waitFor } from '@testing-library/react';
import { useAnalytics } from '../useAnalytics';
import { DataService } from '../../services/dataService';

// Mock the DataService
jest.mock('../../services/dataService');
const MockedDataService = DataService as jest.MockedClass<typeof DataService>;

describe('useAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with loading state', () => {
    const { result } = renderHook(() => useAnalytics());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.revenueMetrics).toBeNull();
  });

  it('handles successful data loading', async () => {
    const mockDataService = {
      loadDatasets: jest.fn().mockResolvedValue(undefined),
      getDataProcessor: jest.fn().mockReturnValue({
        getTransactions: jest.fn().mockReturnValue([]),
        calculateRevenueMetrics: jest.fn().mockReturnValue({
          totalRevenue: 1000,
          transactionCount: 10,
          averageTransactionValue: 100,
          growthRate: 5.5,
          dailyRevenue: [],
          paymentMethodBreakdown: { cash: { revenue: 500, count: 5 }, card: { revenue: 500, count: 5 } }
        }),
        calculateProductPerformance: jest.fn().mockReturnValue({
          topProducts: [],
          categoryBreakdown: {},
          totalProducts: 0
        }),
        calculateTrafficAnalysis: jest.fn().mockReturnValue({
          peakHours: [],
          hourlyStats: [],
          dailyPatterns: {}
        }),
        calculateCustomerInsights: jest.fn().mockReturnValue({
          paymentMethodPreferences: {},
          averageTransactionValue: 100,
          customerSegments: []
        })
      }),
      validateData: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
      isDataLoaded: jest.fn().mockReturnValue(true)
    };

    MockedDataService.mockImplementation(() => mockDataService as any);

    const { result } = renderHook(() => useAnalytics());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.revenueMetrics).toBeDefined();
    expect(result.current.revenueMetrics?.totalRevenue).toBe(1000);
  });

  it('handles data loading errors', async () => {
    const mockDataService = {
      loadDatasets: jest.fn().mockRejectedValue(new Error('Network error')),
      getDataProcessor: jest.fn(),
      validateData: jest.fn(),
      isDataLoaded: jest.fn().mockReturnValue(false)
    };

    MockedDataService.mockImplementation(() => mockDataService as any);

    const { result } = renderHook(() => useAnalytics());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.type).toBe('NETWORK_ERROR');
  });

  it('handles data validation errors', async () => {
    const mockDataService = {
      loadDatasets: jest.fn().mockResolvedValue(undefined),
      getDataProcessor: jest.fn().mockReturnValue({
        getTransactions: jest.fn().mockReturnValue([])
      }),
      validateData: jest.fn().mockReturnValue({ 
        isValid: false, 
        errors: ['Invalid data format'] 
      }),
      isDataLoaded: jest.fn().mockReturnValue(false)
    };

    MockedDataService.mockImplementation(() => mockDataService as any);

    const { result } = renderHook(() => useAnalytics());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toContain('Data validation failed');
  });

  it('handles export when no data is loaded', async () => {
    const mockDataService = {
      loadDatasets: jest.fn().mockRejectedValue(new Error('Load failed')),
      isDataLoaded: jest.fn().mockReturnValue(false)
    };

    MockedDataService.mockImplementation(() => mockDataService as any);

    const { result } = renderHook(() => useAnalytics());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Try to export data when no data is loaded
    await result.current.exportData('revenue');

    expect(result.current.error?.type).toBe('EXPORT_ERROR');
  });

  it('clears error when clearError is called', async () => {
    const mockDataService = {
      loadDatasets: jest.fn().mockRejectedValue(new Error('Test error')),
      isDataLoaded: jest.fn().mockReturnValue(false)
    };

    MockedDataService.mockImplementation(() => mockDataService as any);

    const { result } = renderHook(() => useAnalytics());

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    result.current.clearError();

    expect(result.current.error).toBeNull();
  });
});