import { useState, useEffect, useCallback } from 'react';
import { DataService } from '../services/dataService';
import { 
  RevenueMetrics, 
  ProductPerformance, 
  TrafficAnalysis, 
  CustomerInsights 
} from '../types';
import { useToast } from './useToast';
import { ErrorHandler, ErrorType, AppError } from '../utils/errorHandler';

export const useAnalytics = () => {
  const [dataService] = useState(() => new DataService());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics | null>(null);
  const [productPerformance, setProductPerformance] = useState<ProductPerformance | null>(null);
  const [trafficAnalysis, setTrafficAnalysis] = useState<TrafficAnalysis | null>(null);
  const [customerInsights, setCustomerInsights] = useState<CustomerInsights | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { showSuccess, showError, toasts, removeToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async (isRetry = false) => {
    try {
      setIsLoading(true);
      if (!isRetry) {
        setError(null);
        setRetryCount(0);
      }

      // Load datasets
      await dataService.loadDatasets();
      
      // Get data processor
      const processor = dataService.getDataProcessor();
      
      // Validate data
      const transactions = processor.getTransactions();
      const validation = dataService.validateData(transactions);
      
      if (!validation.isValid) {
        const validationError = ErrorHandler.createError(
          ErrorType.DATA_VALIDATION_ERROR,
          `Data validation failed: ${validation.errors.join(', ')}`,
          'The loaded data contains errors. Please check your data files and try again.',
          { validationErrors: validation.errors }
        );
        throw validationError;
      }

      // Calculate all metrics
      const [revenue, products, traffic, customers] = await Promise.all([
        Promise.resolve(processor.calculateRevenueMetrics()),
        Promise.resolve(processor.calculateProductPerformance()),
        Promise.resolve(processor.calculateTrafficAnalysis()),
        Promise.resolve(processor.calculateCustomerInsights())
      ]);

      setRevenueMetrics(revenue);
      setProductPerformance(products);
      setTrafficAnalysis(traffic);
      setCustomerInsights(customers);
      setError(null);
      setRetryCount(0);

      if (isRetry) {
        showSuccess('Data loaded successfully!');
      }

    } catch (err) {
      const appError = err instanceof Error && 'type' in err && 'userMessage' in err && 'timestamp' in err && 'recoverable' in err && 'retryable' in err
        ? err as AppError 
        : ErrorHandler.handleError(err);
      
      setError(appError);
      console.error('Analytics loading error:', err);
      
      // Show user-friendly error message
      showError(appError.userMessage);
      
      // Auto-retry for retryable errors
      if (ErrorHandler.shouldRetry(appError, retryCount)) {
        const delay = ErrorHandler.getRetryDelay(retryCount);
        setRetryCount(prev => prev + 1);
        
        setTimeout(() => {
          console.log(`Auto-retrying data load (attempt ${retryCount + 1})`);
          loadData(true);
        }, delay);
      }
    } finally {
      setIsLoading(false);
    }
  }, [dataService, retryCount, showSuccess, showError]);

  const refreshData = useCallback(() => {
    setRetryCount(0);
    loadData(false);
  }, [loadData]);

  const exportData = useCallback(async (dataType: 'revenue' | 'products' | 'traffic' | 'customers') => {
    if (!dataService.isDataLoaded()) {
      const loadingError = ErrorHandler.createError(
        ErrorType.EXPORT_ERROR,
        'Data not loaded',
        'Please wait for data to load before exporting',
        undefined,
        true,
        false
      );
      setError(loadingError);
      showError(loadingError.userMessage);
      return;
    }

    try {
      const processor = dataService.getDataProcessor();
      let data: any[] = [];
      let filename = '';

      switch (dataType) {
        case 'revenue':
          if (revenueMetrics) {
            data = revenueMetrics.dailyRevenue.map(d => ({
              date: d.date,
              revenue: d.revenue,
              transactions: d.transactions,
              averageTransactionValue: d.revenue / d.transactions
            }));
            filename = 'revenue_analysis.csv';
          }
          break;
        
        case 'products':
          if (productPerformance) {
            data = productPerformance.topProducts.map(p => ({
              productName: p.name,
              category: p.category,
              totalSales: p.totalSales,
              totalRevenue: p.totalRevenue,
              averagePrice: p.averagePrice
            }));
            filename = 'product_performance.csv';
          }
          break;
        
        case 'traffic':
          if (trafficAnalysis) {
            data = trafficAnalysis.hourlyStats.map(h => ({
              hour: h.hour,
              revenue: h.revenue,
              transactions: h.transactions,
              averagePerTransaction: h.revenue / h.transactions
            }));
            filename = 'traffic_analysis.csv';
          }
          break;
        
        case 'customers':
          data = processor.getTransactions().map(t => ({
            date: t.date.toISOString().split('T')[0],
            paymentMethod: t.paymentMethod,
            amount: t.amount,
            productName: t.productName,
            category: t.productCategory
          }));
          filename = 'customer_transactions.csv';
          break;
      }

      if (data.length === 0) {
        const noDataError = ErrorHandler.createError(
          ErrorType.EXPORT_ERROR,
          `No ${dataType} data available`,
          `No ${dataType} data is available for export. Please ensure data is loaded and try again.`,
          { dataType },
          true,
          false
        );
        setError(noDataError);
        showError(noDataError.userMessage);
        return;
      }

      await dataService.exportToCSV(data, filename);
      
      // Show success notification
      showSuccess(`${dataType.charAt(0).toUpperCase() + dataType.slice(1)} data exported successfully!`);
      
    } catch (err) {
      const exportError = ErrorHandler.createError(
        ErrorType.EXPORT_ERROR,
        err instanceof Error ? err.message : 'Export failed',
        'Failed to export data. Please try again or contact support if the problem persists.',
        { dataType, error: err }
      );
      setError(exportError);
      showError(exportError.userMessage);
      console.error('Export error:', err);
    }
  }, [dataService, revenueMetrics, productPerformance, trafficAnalysis, showSuccess, showError]);

  return {
    isLoading,
    error,
    revenueMetrics,
    productPerformance,
    trafficAnalysis,
    customerInsights,
    refreshData,
    exportData,
    toasts,
    removeToast
  };
};